"""Raw GHL refresh phase for the Gold Coast data-lake batch runner."""

from __future__ import annotations

from dataclasses import dataclass, field
import os
from pathlib import Path
from typing import Any

from .batch import BatchRunContext, Phase
from .client import GHLClient
from .config import load_ghl_config
from .extractor import ExtractOptions, GHLRawExtractor, make_s3_uploader, normalize_entities
from .storage import LocalRunStorage, S3Uploader


DEFAULT_RAW_REFRESH_ENTITIES = [
    "contacts",
    "pipelines",
    "opportunities",
    "conversations",
    "messages",
    "call-details",
]


@dataclass
class RawRefreshConfig:
    env_file: str | Path | None = None
    api_version: str | None = None
    base_url: str | None = None
    entities: list[str] = field(default_factory=lambda: list(DEFAULT_RAW_REFRESH_ENTITIES))
    page_limit: int = 100
    max_items: int | None = None
    max_pages: int | None = None
    local_only: bool = False
    s3_bucket: str | None = None
    s3_prefix: str = ""
    pipeline_ids: list[str] = field(default_factory=list)
    conversation_ids: list[str] = field(default_factory=list)
    message_ids: list[str] = field(default_factory=list)
    download_recordings: bool = False
    max_recordings: int = 100000
    recording_max_bytes: int = 100 * 1024 * 1024
    timeout_seconds: float = 30.0
    max_retries: int = 4
    request_interval_seconds: float = 0.0
    max_consecutive_call_detail_errors: int = 10


def build_ghl_raw_refresh_phase(config: RawRefreshConfig) -> Phase:
    def phase(context: BatchRunContext) -> dict[str, Any]:
        return run_ghl_raw_refresh(context, config)

    return phase


def run_ghl_raw_refresh(
    context: BatchRunContext,
    config: RawRefreshConfig,
    *,
    client: GHLClient | Any | None = None,
    location_id: str | None = None,
    s3_uploader: S3Uploader | Any | None = None,
) -> dict[str, Any]:
    if client is None:
        env_file = config.env_file or os.environ.get("GHL_ENV_FILE")
        ghl_config = load_ghl_config(env_file, api_version=config.api_version, base_url=config.base_url)
        client = GHLClient(
            ghl_config,
            timeout_seconds=config.timeout_seconds,
            max_retries=config.max_retries,
        )
        location_id = ghl_config.location_id
    elif not location_id:
        raise ValueError("location_id is required when a test client is injected")

    entities = normalize_entities(config.entities)
    if config.local_only and config.download_recordings:
        raise ValueError("--extractor-dry-run cannot be combined with --download-recordings")
    if not config.local_only and not config.s3_bucket and s3_uploader is None:
        raise ValueError("Provide --s3-bucket for raw refresh output, or use --extractor-dry-run for local-only runs.")
    uploader = s3_uploader or make_s3_uploader(config.s3_bucket, config.s3_prefix, dry_run=config.local_only)
    storage = LocalRunStorage(context.output_dir, run_id=context.run_id, s3_uploader=uploader)
    options = ExtractOptions(
        page_limit=config.page_limit,
        max_items=config.max_items,
        max_pages=config.max_pages,
        dry_run=config.local_only,
        pipeline_ids=config.pipeline_ids,
        conversation_ids=config.conversation_ids,
        message_ids=config.message_ids,
        download_recordings=config.download_recordings,
        max_recordings=config.max_recordings,
        recording_max_bytes=config.recording_max_bytes,
        request_interval_seconds=config.request_interval_seconds,
        max_consecutive_call_detail_errors=config.max_consecutive_call_detail_errors,
    )
    extractor = GHLRawExtractor(
        client,
        storage,
        location_id=str(location_id),
        s3_uploader=uploader,
        options=options,
    )
    try:
        manifest = extractor.run(entities)
    finally:
        storage.close()
    summary = manifest["summary"]
    return {
        "manifest_path": manifest.get("manifest_path"),
        "manifest_key": manifest.get("manifest_key"),
        "manifest_s3_uri": manifest.get("manifest_s3_uri"),
        "entity_counts": summary.get("entity_counts", {}),
        "entity_pages": summary.get("entity_pages", {}),
        "entity_error_counts": summary.get("entity_error_counts", {}),
        "entity_errors": summary.get("entity_errors", {}),
        "recordings": summarize_recordings(
            manifest.get("recordings", []),
            int(summary.get("recording_attempts") or 0),
        ),
        "files": summarize_files(manifest.get("files", {})),
        "checkpoints": summarize_checkpoints(manifest.get("checkpoints", {})),
    }


def summarize_recordings(recordings: list[dict[str, Any]], attempts: int) -> dict[str, int]:
    counts = {
        "attempted": attempts,
        "archived": 0,
        "skipped_existing": 0,
        "unavailable": 0,
    }
    for recording in recordings:
        status = recording.get("archival_status")
        if status == "skipped_existing":
            counts["skipped_existing"] += 1
        elif status == "unavailable":
            counts["unavailable"] += 1
        elif recording.get("object_key") or recording.get("s3_uri"):
            counts["archived"] += 1
    return counts


def summarize_files(files: dict[str, Any]) -> dict[str, dict[str, Any]]:
    summary: dict[str, dict[str, Any]] = {}
    for entity, payload in sorted(files.items()):
        if not isinstance(payload, dict):
            continue
        summary[str(entity)] = {
            "object_key": payload.get("object_key"),
            "s3_uri": payload.get("s3_uri"),
            "records": payload.get("records", 0),
        }
    return summary


def summarize_checkpoints(checkpoints: dict[str, Any]) -> dict[str, dict[str, Any]]:
    summary: dict[str, dict[str, Any]] = {}
    for entity, payload in sorted(checkpoints.items()):
        if not isinstance(payload, dict):
            continue
        summary[str(entity)] = {
            "key": payload.get("key"),
            "s3_uri": payload.get("s3_uri"),
        }
    return summary
