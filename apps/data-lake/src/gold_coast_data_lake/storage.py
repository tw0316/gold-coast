"""Local JSONL, manifest, checkpoint, and optional S3 upload helpers."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import json
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Any


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def format_run_id(moment: datetime | None = None) -> str:
    moment = moment or utc_now()
    return moment.strftime("%Y%m%dT%H%M%SZ")


def raw_object_key(entity: str, run_id: str, ingest_date: str) -> str:
    return f"raw/ghl/entity={entity}/ingest_date={ingest_date}/run={run_id}.jsonl"


def checkpoint_object_key(entity: str) -> str:
    return f"checkpoints/ghl/entity={entity}.json"


def manifest_object_key(run_id: str) -> str:
    return f"manifests/ghl/run={run_id}.json"


def recording_object_prefix(message_id: str) -> str:
    safe_message_id = "".join(ch for ch in message_id if ch.isalnum() or ch in {"-", "_"})
    return f"recordings/ghl/message_id={safe_message_id}"


def recording_object_key(message_id: str, ingest_date: str, extension: str) -> str:
    return f"{recording_object_prefix(message_id)}{extension}"


@dataclass
class EntityFile:
    entity: str
    path: Path
    key: str
    count: int = 0
    s3_uri: str | None = None
    _handle: Any | None = None


class S3Uploader:
    def __init__(self, bucket: str, prefix: str = "") -> None:
        try:
            import boto3  # type: ignore
        except ImportError as exc:
            raise RuntimeError("boto3 is required for S3 upload; install it or omit --s3-bucket") from exc
        self.bucket = bucket
        self.prefix = prefix.strip("/")
        self.client = boto3.client("s3")

    def key(self, relative_key: str) -> str:
        relative_key = relative_key.lstrip("/")
        if not self.prefix:
            return relative_key
        return f"{self.prefix}/{relative_key}"

    def uri(self, relative_key: str) -> str:
        return f"s3://{self.bucket}/{self.key(relative_key)}"

    def find_key_by_prefix(self, relative_prefix: str) -> str | None:
        response = self.client.list_objects_v2(
            Bucket=self.bucket,
            Prefix=self.key(relative_prefix),
            MaxKeys=1,
        )
        contents = response.get("Contents") or []
        if not contents:
            return None
        key = str(contents[0]["Key"])
        if self.prefix and key.startswith(f"{self.prefix}/"):
            return key[len(self.prefix) + 1 :]
        return key

    def upload_file(self, path: Path, relative_key: str, *, content_type: str | None = None) -> str:
        extra_args: dict[str, str] = {"ServerSideEncryption": "AES256"}
        if content_type:
            extra_args["ContentType"] = content_type
        self.client.upload_file(str(path), self.bucket, self.key(relative_key), ExtraArgs=extra_args)
        return self.uri(relative_key)


class LocalRunStorage:
    def __init__(
        self,
        output_dir: str | Path,
        *,
        run_id: str | None = None,
        s3_uploader: S3Uploader | None = None,
    ) -> None:
        self.output_dir = Path(output_dir)
        self.run_id = run_id or format_run_id()
        self.started_at = utc_now()
        self.ingest_date = self.started_at.date().isoformat()
        self.s3_uploader = s3_uploader
        self.files: dict[str, EntityFile] = {}
        self.recordings: list[dict[str, Any]] = []
        self.checkpoints: dict[str, dict[str, Any]] = {}

    def write_record(
        self,
        entity: str,
        *,
        endpoint: str,
        request_params: dict[str, Any],
        page_number: int,
        record_index: int,
        record: Any,
    ) -> None:
        entity_file = self._entity_file(entity)
        envelope = {
            "_ingest": {
                "source": "ghl",
                "entity": entity,
                "run_id": self.run_id,
                "ingest_date": self.ingest_date,
                "fetched_at": utc_now().isoformat(),
                "endpoint": endpoint,
                "request_params": request_params,
                "page_number": page_number,
                "record_index": record_index,
            },
            "record": record,
        }
        entity_file._handle.write(json.dumps(envelope, ensure_ascii=False, separators=(",", ":")) + "\n")
        entity_file.count += 1

    def checkpoint(
        self,
        entity: str,
        *,
        endpoint: str,
        request_params: dict[str, Any],
        page_number: int,
        records_seen: int,
    ) -> None:
        payload = {
            "source": "ghl",
            "entity": entity,
            "run_id": self.run_id,
            "updated_at": utc_now().isoformat(),
            "endpoint": endpoint,
            "request_params": request_params,
            "last_successful_page": page_number,
            "records_seen": records_seen,
        }
        key = checkpoint_object_key(entity)
        path = self.output_dir / key
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")
        self.checkpoints[entity] = {"path": str(path), "key": key}
        if self.s3_uploader:
            self.checkpoints[entity]["s3_uri"] = self.s3_uploader.upload_file(
                path,
                key,
                content_type="application/json",
            )

    def add_recording(self, metadata: dict[str, Any]) -> None:
        self.recordings.append(metadata)

    def temp_recording_path(self, suffix: str) -> Path:
        tmp_dir = self.output_dir / "tmp" / "recordings"
        tmp_dir.mkdir(parents=True, exist_ok=True)
        handle = NamedTemporaryFile(prefix="ghl-recording-", suffix=suffix, dir=tmp_dir, delete=False)
        handle.close()
        return Path(handle.name)

    def finalize(self, summary: dict[str, Any]) -> dict[str, Any]:
        for entity_file in self.files.values():
            if entity_file._handle:
                entity_file._handle.close()
                entity_file._handle = None
            if self.s3_uploader and entity_file.s3_uri is None:
                entity_file.s3_uri = self.s3_uploader.upload_file(
                    entity_file.path,
                    entity_file.key,
                    content_type="application/x-ndjson",
                )

        finished_at = utc_now()
        files_payload = {
            entity: {
                "local_path": str(entity_file.path),
                "object_key": entity_file.key,
                "s3_uri": entity_file.s3_uri,
                "records": entity_file.count,
            }
            for entity, entity_file in sorted(self.files.items())
        }
        manifest = {
            "source": "ghl",
            "run_id": self.run_id,
            "started_at": self.started_at.isoformat(),
            "finished_at": finished_at.isoformat(),
            "ingest_date": self.ingest_date,
            "summary": summary,
            "files": files_payload,
            "checkpoints": self.checkpoints,
            "recordings": self.recordings,
        }
        key = manifest_object_key(self.run_id)
        path = self.output_dir / key
        path.parent.mkdir(parents=True, exist_ok=True)
        manifest["manifest_path"] = str(path)
        manifest["manifest_key"] = key
        if self.s3_uploader:
            manifest["manifest_s3_uri"] = self.s3_uploader.uri(key)
        path.write_text(json.dumps(manifest, indent=2, sort_keys=True), encoding="utf-8")
        if self.s3_uploader:
            self.s3_uploader.upload_file(path, key, content_type="application/json")
        return manifest

    def _entity_file(self, entity: str) -> EntityFile:
        if entity in self.files:
            return self.files[entity]
        key = raw_object_key(entity, self.run_id, self.ingest_date)
        path = self.output_dir / key
        path.parent.mkdir(parents=True, exist_ok=True)
        handle = path.open("a", encoding="utf-8")
        entity_file = EntityFile(entity=entity, path=path, key=key, _handle=handle)
        self.files[entity] = entity_file
        return entity_file
