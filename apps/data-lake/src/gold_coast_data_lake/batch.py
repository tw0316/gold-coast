"""Batch refresh runner foundation for the Gold Coast data lake."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
import json
from pathlib import Path
import re
from typing import Any, Callable, Iterable

from .storage import S3Uploader, format_run_id


RUN_STATUS_HISTORY_DIR = "runs"
LATEST_SUCCESS_STATUS_FILE = "latest-success.json"
LATEST_FAILURE_STATUS_FILE = "latest-failure.json"
RUN_STATUS_S3_PREFIX = "run-status/ghl"
DEFAULT_LATEST_POINTER_ENTITIES = (
    "contacts",
    "pipelines",
    "opportunities",
    "conversations",
    "messages",
    "call_message_details",
)
LATEST_POINTER_ENTITY_ALIASES = {
    "all": "all",
    "contacts": "contacts",
    "pipelines": "pipelines",
    "pipeline-stages": "pipelines",
    "pipeline_stages": "pipelines",
    "opportunities": "opportunities",
    "conversations": "conversations",
    "messages": "messages",
    "call-details": "call_message_details",
    "call_details": "call_message_details",
    "call-message-details": "call_message_details",
    "call_message_details": "call_message_details",
}

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


def atomic_write_json_line(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = path.with_name(f".{path.name}.tmp")
    tmp_path.write_text(json.dumps(payload, sort_keys=True, separators=(",", ":")) + "\n", encoding="utf-8")
    tmp_path.replace(path)


def historical_run_status_path(status_dir: str | Path, run_id: str) -> Path:
    return Path(status_dir) / RUN_STATUS_HISTORY_DIR / f"run={run_id}" / "status.json"


def latest_success_status_path(status_dir: str | Path) -> Path:
    return Path(status_dir) / LATEST_SUCCESS_STATUS_FILE


def latest_failure_status_path(status_dir: str | Path) -> Path:
    return Path(status_dir) / LATEST_FAILURE_STATUS_FILE


def historical_run_status_key(run_id: str) -> str:
    return f"{RUN_STATUS_S3_PREFIX}/{RUN_STATUS_HISTORY_DIR}/run={run_id}/status.json"


def latest_success_status_key() -> str:
    return f"{RUN_STATUS_S3_PREFIX}/{LATEST_SUCCESS_STATUS_FILE}"


def latest_failure_status_key() -> str:
    return f"{RUN_STATUS_S3_PREFIX}/{LATEST_FAILURE_STATUS_FILE}"


def run_status_log_key(run_id: str) -> str:
    return f"{RUN_STATUS_S3_PREFIX}/logs/run={run_id}.jsonl"


def optional_status_text(value: Any) -> str | None:
    if value is None or value == "":
        return None
    cleaned = sanitize(value)
    if cleaned is None:
        return None
    if isinstance(cleaned, str):
        return cleaned
    return json.dumps(cleaned, sort_keys=True, separators=(",", ":"))


def latest_pointer_skip_reason(
    *,
    dry_run: bool,
    source_environment: str,
    metadata: dict[str, Any],
    status: str,
    phase_summary: dict[str, Any],
) -> str | None:
    if dry_run:
        return "dry_run"
    if source_environment.lower() not in {"production", "prod"}:
        return "non_production_environment"
    if metadata.get("extractor_dry_run"):
        return "extractor_dry_run"
    if metadata.get("skip_curated"):
        return "skip_curated"
    if metadata.get("max_items") is not None:
        return "max_items"
    if metadata.get("max_pages") is not None:
        return "max_pages"
    if has_filter(metadata, "pipeline_ids", "pipeline_id"):
        return "pipeline_filter"
    if has_filter(metadata, "conversation_ids", "conversation_id"):
        return "conversation_filter"
    if has_filter(metadata, "message_ids", "message_id"):
        return "message_filter"

    entities = normalize_latest_pointer_entities(metadata.get("entities"))
    default_entities = normalize_latest_pointer_entities(metadata.get("default_entities"))
    if default_entities is None:
        default_entities = list(DEFAULT_LATEST_POINTER_ENTITIES)
    if entities is None:
        return "missing_entities_metadata"
    if entities != default_entities:
        return "entity_subset"

    if status == "succeeded":
        if not phase_summary["manifest_s3_uri"]:
            return "missing_manifest_s3_uri"
        if not phase_summary["curated_tables"]:
            return "missing_curated_tables"
    return None


def normalize_latest_pointer_entities(value: Any) -> list[str] | None:
    if value is None:
        return None
    if isinstance(value, str):
        raw_items: Iterable[Any] = [value]
    elif isinstance(value, Iterable):
        raw_items = value
    else:
        return None

    normalized: list[str] = []
    for item in raw_items:
        key = str(item).strip().lower()
        if not key:
            continue
        alias = LATEST_POINTER_ENTITY_ALIASES.get(key, key)
        if alias == "all":
            for default_item in DEFAULT_LATEST_POINTER_ENTITIES:
                if default_item not in normalized:
                    normalized.append(default_item)
            continue
        if alias not in normalized:
            normalized.append(alias)
    return normalized


def has_filter(metadata: dict[str, Any], *keys: str) -> bool:
    for key in keys:
        value = metadata.get(key)
        if value is None or value is False or value == "":
            continue
        if isinstance(value, (list, tuple, set, dict)) and not value:
            continue
        return True
    return False


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
    provider: str = "local_ttl_file"

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


@dataclass
class DynamoDbTtlLock:
    table_name: str
    lock_name: str = "ghl-refresh"
    ttl_seconds: int = 45 * 60
    client: Any | None = None
    provider: str = "dynamodb_ttl"

    def __post_init__(self) -> None:
        if self.client is None:
            try:
                import boto3  # type: ignore
            except ImportError as exc:  # pragma: no cover - exercised in container/runtime packaging
                raise RuntimeError("boto3 is required for DynamoDB locking") from exc
            self.client = boto3.client("dynamodb")

    def acquire(self, run_id: str, *, now: datetime | None = None) -> bool:
        current_time = now or utc_now()
        expires_at = current_time + timedelta(seconds=self.ttl_seconds)
        try:
            self.client.put_item(
                TableName=self.table_name,
                Item={
                    "lock_name": {"S": self.lock_name},
                    "owner_run_id": {"S": run_id},
                    "state": {"S": "active"},
                    "started_at": {"S": isoformat(current_time)},
                    "expires_at": {"S": isoformat(expires_at)},
                    "expires_at_epoch": {"N": str(int(expires_at.timestamp()))},
                    "ttl_seconds": {"N": str(self.ttl_seconds)},
                },
                ConditionExpression=(
                    "attribute_not_exists(lock_name) OR expires_at_epoch < :now_epoch OR #state <> :active"
                ),
                ExpressionAttributeNames={"#state": "state"},
                ExpressionAttributeValues={
                    ":now_epoch": {"N": str(int(current_time.timestamp()))},
                    ":active": {"S": "active"},
                },
            )
        except Exception as exc:  # noqa: BLE001
            if is_conditional_check_failed(exc):
                return False
            raise
        return True

    def release(self, run_id: str, *, now: datetime | None = None) -> None:
        try:
            self.client.update_item(
                TableName=self.table_name,
                Key={"lock_name": {"S": self.lock_name}},
                UpdateExpression="SET #state = :released, released_at = :released_at",
                ConditionExpression="owner_run_id = :run_id",
                ExpressionAttributeNames={"#state": "state"},
                ExpressionAttributeValues={
                    ":released": {"S": "released"},
                    ":released_at": {"S": isoformat(now or utc_now())},
                    ":run_id": {"S": run_id},
                },
            )
        except Exception as exc:  # noqa: BLE001
            if is_conditional_check_failed(exc):
                return
            raise


def is_conditional_check_failed(exc: Exception) -> bool:
    if exc.__class__.__name__ == "ConditionalCheckFailedException":
        return True
    response = getattr(exc, "response", None)
    if isinstance(response, dict):
        return response.get("Error", {}).get("Code") == "ConditionalCheckFailedException"
    return False


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
        status_uploader: S3Uploader | None = None,
        now: Callable[[], datetime] = utc_now,
    ) -> None:
        self.status_dir = Path(status_dir)
        self.output_dir = Path(output_dir)
        self.lock = lock or LocalTtlLock(self.status_dir / "locks" / "ghl-refresh.lock")
        self.phases = list(phases or [])
        self.alert_callback = alert_callback
        self.status_uploader = status_uploader
        self.now = now

    def run(
        self,
        *,
        run_id: str | None = None,
        source_environment: str = "production",
        dry_run: bool = True,
        metadata: dict[str, Any] | None = None,
        image_tag: str | None = None,
        cloudwatch_log_url: str | None = None,
    ) -> dict[str, Any]:
        started_at = self.now()
        run_id = run_id or format_run_id(started_at)
        run_metadata = metadata or {}
        status_image_tag = image_tag if image_tag is not None else run_metadata.get("image_tag")
        status_cloudwatch_log_url = cloudwatch_log_url
        if status_cloudwatch_log_url is None:
            status_cloudwatch_log_url = run_metadata.get("cloudwatch_log_url") or run_metadata.get(
                "cloudwatch_log_stream_link"
            )
        context = BatchRunContext(
            run_id=run_id,
            source="ghl",
            source_environment=source_environment,
            dry_run=dry_run,
            status_dir=self.status_dir,
            output_dir=self.output_dir,
            started_at=started_at,
            metadata=run_metadata,
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

            log.write("run_started", {"run_id": run_id, "dry_run": dry_run, "metadata": run_metadata})
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
        pointer_skip_reason = latest_pointer_skip_reason(
            dry_run=dry_run,
            source_environment=source_environment,
            metadata=run_metadata,
            status=status,
            phase_summary=phase_summary,
        )
        pointer_publish_target = None
        if pointer_skip_reason is None:
            pointer_publish_target = LATEST_SUCCESS_STATUS_FILE if status == "succeeded" else LATEST_FAILURE_STATUS_FILE
        payload = {
            "run_id": run_id,
            "status": status,
            "source": "ghl",
            "source_environment": source_environment,
            "image_tag": optional_status_text(status_image_tag),
            "cloudwatch_log_url": optional_status_text(status_cloudwatch_log_url),
            "dry_run": dry_run,
            "started_at": isoformat(started_at),
            "completed_at": isoformat(completed_at),
            "duration_seconds": duration_seconds,
            "lock": {
                "provider": getattr(self.lock, "provider", self.lock.__class__.__name__),
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
            "log_path": self._log_location(run_id, log.path, dry_run=dry_run),
            "latest_pointers_published": pointer_publish_target is not None,
            "latest_pointer_publish_target": pointer_publish_target,
            "latest_pointer_skip_reason": pointer_skip_reason,
            "alert_status": "skipped",
            "metadata": sanitize(run_metadata),
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
        status_uploader = None if payload.get("dry_run") else self.status_uploader
        run_path = historical_run_status_path(self.status_dir, str(payload["run_id"]))
        atomic_write_json_line(run_path, sanitize(payload))
        if status_uploader:
            status_uploader.upload_file(
                run_path,
                historical_run_status_key(str(payload["run_id"])),
                content_type="application/json",
            )
        if payload["status"] == "succeeded" and payload.get("latest_pointers_published"):
            latest_path = latest_success_status_path(self.status_dir)
            atomic_write_json(latest_path, sanitize(payload))
            if status_uploader:
                status_uploader.upload_file(
                    latest_path,
                    latest_success_status_key(),
                    content_type="application/json",
                )
        elif payload["status"] == "failed" and payload.get("latest_pointers_published"):
            latest_path = latest_failure_status_path(self.status_dir)
            atomic_write_json(latest_path, sanitize(payload))
            if status_uploader:
                status_uploader.upload_file(
                    latest_path,
                    latest_failure_status_key(),
                    content_type="application/json",
                )
        if status_uploader:
            status_uploader.upload_file(
                self.status_dir / "logs" / f"run={payload['run_id']}.jsonl",
                run_status_log_key(str(payload["run_id"])),
                content_type="application/x-ndjson",
            )

    def _log_location(self, run_id: str, local_path: Path, *, dry_run: bool) -> str:
        if self.status_uploader and not dry_run:
            return self.status_uploader.uri(run_status_log_key(run_id))
        return str(local_path)


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
