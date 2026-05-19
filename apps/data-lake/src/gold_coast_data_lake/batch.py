"""Batch refresh runner foundation for the Gold Coast data lake."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
import json
from pathlib import Path
import re
from typing import Any, Callable, Iterable

from .storage import format_run_id


SENSITIVE_KEY_PARTS = (
    "api_key",
    "apikey",
    "authorization",
    "password",
    "secret",
    "token",
    "webhook",
    "presigned",
    "recording_url",
    "audio_url",
    "body",
    "phone",
    "email",
)
EMAIL_RE = re.compile(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", re.IGNORECASE)
PHONE_RE = re.compile(r"\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b")


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def isoformat(moment: datetime) -> str:
    return moment.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def parse_timestamp(value: str | None) -> datetime | None:
    if not value:
        return None
    normalized = value[:-1] + "+00:00" if value.endswith("Z") else value
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def sanitize(value: Any) -> Any:
    if isinstance(value, dict):
        clean: dict[str, Any] = {}
        for key, item in value.items():
            lowered = str(key).lower()
            if any(part in lowered for part in SENSITIVE_KEY_PARTS):
                clean[str(key)] = "[redacted]"
            else:
                clean[str(key)] = sanitize(item)
        return clean
    if isinstance(value, list):
        return [sanitize(item) for item in value]
    if isinstance(value, tuple):
        return [sanitize(item) for item in value]
    if isinstance(value, str):
        lowered = value.lower()
        if (
            "hooks.slack.com/" in lowered
            or "authorization:" in lowered
            or "bearer " in lowered
            or "x-api-key" in lowered
            or "api_key" in lowered
            or "access_token" in lowered
            or "webhook" in lowered
            or EMAIL_RE.search(value)
            or PHONE_RE.search(value)
            or looks_like_raw_payload(value)
        ):
            return "[redacted]"
        return value
    return value


def looks_like_raw_payload(value: str) -> bool:
    return (("{" in value and "}" in value) or ("[" in value and "]" in value)) and ":" in value


def atomic_write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = path.with_name(f".{path.name}.tmp")
    tmp_path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    tmp_path.replace(path)


@dataclass
class BatchRunContext:
    run_id: str
    source: str
    source_environment: str
    dry_run: bool
    status_dir: Path
    output_dir: Path
    started_at: datetime
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class LocalTtlLock:
    path: Path
    ttl_seconds: int = 45 * 60

    def acquire(self, run_id: str, *, now: datetime | None = None) -> bool:
        current_time = now or utc_now()
        if self.path.exists():
            current = self._read()
            expires_at = parse_timestamp(current.get("expires_at"))
            if current.get("state") == "active" and expires_at and expires_at > current_time:
                return False

        payload = {
            "owner_run_id": run_id,
            "state": "active",
            "started_at": isoformat(current_time),
            "expires_at": isoformat(current_time + timedelta(seconds=self.ttl_seconds)),
            "ttl_seconds": self.ttl_seconds,
        }
        atomic_write_json(self.path, payload)
        return True

    def release(self, run_id: str, *, now: datetime | None = None) -> None:
        if not self.path.exists():
            return
        current = self._read()
        if current.get("owner_run_id") != run_id:
            return
        current["state"] = "released"
        current["released_at"] = isoformat(now or utc_now())
        atomic_write_json(self.path, current)

    def _read(self) -> dict[str, Any]:
        try:
            return json.loads(self.path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return {}


Phase = Callable[[BatchRunContext], dict[str, Any] | None]
AlertCallback = Callable[[dict[str, Any]], str]


def summarize_phase_results(phase_results: list[dict[str, Any]]) -> dict[str, Any]:
    summary: dict[str, Any] = {
        "manifest_s3_uri": None,
        "entity_counts": {},
        "recordings": {
            "attempted": 0,
            "archived": 0,
            "skipped_existing": 0,
            "unavailable": 0,
        },
        "curated_tables": {},
        "smoke_checks": [],
    }
    for phase_result in phase_results:
        result = phase_result.get("result")
        if not isinstance(result, dict):
            continue
        if result.get("manifest_s3_uri"):
            summary["manifest_s3_uri"] = result["manifest_s3_uri"]
        entity_counts = result.get("entity_counts")
        if isinstance(entity_counts, dict):
            summary["entity_counts"].update(entity_counts)
        recording_counts = result.get("recordings")
        if isinstance(recording_counts, dict):
            for key in summary["recordings"]:
                value = recording_counts.get(key)
                if isinstance(value, int):
                    summary["recordings"][key] += value
        curated_tables = result.get("curated_tables")
        if isinstance(curated_tables, dict):
            summary["curated_tables"].update(curated_tables)
        smoke_checks = result.get("smoke_checks")
        if isinstance(smoke_checks, list):
            summary["smoke_checks"].extend(smoke_checks)
    return summary


class BatchRefreshRunner:
    def __init__(
        self,
        *,
        status_dir: str | Path,
        output_dir: str | Path,
        lock: LocalTtlLock | None = None,
        phases: Iterable[tuple[str, Phase]] | None = None,
        alert_callback: AlertCallback | None = None,
        now: Callable[[], datetime] = utc_now,
    ) -> None:
        self.status_dir = Path(status_dir)
        self.output_dir = Path(output_dir)
        self.lock = lock or LocalTtlLock(self.status_dir / "locks" / "ghl-refresh.lock")
        self.phases = list(phases or [])
        self.alert_callback = alert_callback
        self.now = now

    def run(
        self,
        *,
        run_id: str | None = None,
        source_environment: str = "production",
        dry_run: bool = True,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        started_at = self.now()
        run_id = run_id or format_run_id(started_at)
        context = BatchRunContext(
            run_id=run_id,
            source="ghl",
            source_environment=source_environment,
            dry_run=dry_run,
            status_dir=self.status_dir,
            output_dir=self.output_dir,
            started_at=started_at,
            metadata=metadata or {},
        )

        log = RunLogger(self.status_dir / "logs" / f"run={run_id}.jsonl")
        phase_results: list[dict[str, Any]] = []
        status = "succeeded"
        error: dict[str, str] | None = None
        lock_acquired = False

        try:
            lock_acquired = self.lock.acquire(run_id, now=started_at)
            if not lock_acquired:
                raise RuntimeError("another GHL batch refresh run is active")

            log.write("run_started", {"run_id": run_id, "dry_run": dry_run, "metadata": metadata or {}})
            if dry_run:
                phase_results.append({"name": "dry_run_validation", "status": "succeeded"})
                log.write("phase_succeeded", phase_results[-1])
            else:
                if not self.phases:
                    raise NotImplementedError("production batch phases are not implemented in this slice")
                for name, phase in self.phases:
                    log.write("phase_started", {"name": name})
                    result = phase(context) or {}
                    phase_result = {"name": name, "status": "succeeded", "result": sanitize(result)}
                    phase_results.append(phase_result)
                    log.write("phase_succeeded", phase_result)
        except Exception as exc:  # noqa: BLE001
            status = "failed"
            error = {"class": exc.__class__.__name__, "message": str(exc)}
            log.write("run_failed", {"error": error})
        finally:
            completed_at = self.now()
            if lock_acquired:
                self.lock.release(run_id, now=completed_at)

        duration_seconds = max(0.0, (completed_at - started_at).total_seconds())
        phase_summary = summarize_phase_results(phase_results)
        payload = {
            "run_id": run_id,
            "status": status,
            "source": "ghl",
            "source_environment": source_environment,
            "dry_run": dry_run,
            "started_at": isoformat(started_at),
            "completed_at": isoformat(completed_at),
            "duration_seconds": duration_seconds,
            "lock": {
                "provider": "local_ttl_file",
                "ttl_seconds": self.lock.ttl_seconds,
                "acquired": lock_acquired,
            },
            "manifest_s3_uri": phase_summary["manifest_s3_uri"],
            "snapshot_date": completed_at.date().isoformat(),
            "snapshot_at": isoformat(completed_at),
            "entity_counts": phase_summary["entity_counts"],
            "recordings": phase_summary["recordings"],
            "curated_tables": phase_summary["curated_tables"],
            "smoke_checks": phase_summary["smoke_checks"],
            "phases": phase_results,
            "log_path": str(log.path),
            "alert_status": "skipped",
            "metadata": sanitize(metadata or {}),
            "error": sanitize(error) if error else None,
        }
        if self.alert_callback:
            try:
                payload["alert_status"] = self.alert_callback(sanitize(payload))
            except Exception as exc:  # noqa: BLE001
                payload["alert_status"] = "failed"
                payload["alert_error"] = sanitize({"class": exc.__class__.__name__, "message": str(exc)})
        log.write("run_completed", {"run_id": run_id, "status": status, "duration_seconds": duration_seconds})
        self._write_status(payload)
        return payload

    def _write_status(self, payload: dict[str, Any]) -> None:
        run_path = self.status_dir / f"run={payload['run_id']}.json"
        atomic_write_json(run_path, sanitize(payload))
        if payload["status"] == "succeeded":
            atomic_write_json(self.status_dir / "latest-success.json", sanitize(payload))
        elif payload["status"] == "failed":
            atomic_write_json(self.status_dir / "latest-failure.json", sanitize(payload))


class RunLogger:
    def __init__(self, path: Path) -> None:
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def write(self, event: str, details: dict[str, Any] | None = None) -> None:
        payload = {
            "at": isoformat(utc_now()),
            "event": event,
            "details": sanitize(details or {}),
        }
        with self.path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(payload, sort_keys=True) + "\n")
