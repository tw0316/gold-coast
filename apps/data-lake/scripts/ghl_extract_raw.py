#!/usr/bin/env python3
"""CLI for the Gold Coast read-only GHL raw extractor."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = PROJECT_ROOT / "src"
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from gold_coast_data_lake.client import GHLClient
from gold_coast_data_lake.config import load_ghl_config
from gold_coast_data_lake.extractor import (
    ENTITY_ALIASES,
    ExtractOptions,
    GHLRawExtractor,
    make_s3_uploader,
    normalize_entities,
)
from gold_coast_data_lake.storage import LocalRunStorage


DEFAULT_ENV_FILE = os.environ.get("GHL_ENV_FILE")


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Extract raw GHL data with GET-only API calls.")
    parser.add_argument(
        "--env-file",
        default=DEFAULT_ENV_FILE,
        help="Path to credentials env file. May also be supplied through GHL_ENV_FILE.",
    )
    parser.add_argument("--api-version", default=None, help="Override LeadConnector Version header.")
    parser.add_argument("--base-url", default=None, help="Override GHL base URL.")
    parser.add_argument("--output-dir", default=str(PROJECT_ROOT / "data" / "extracts"), help="Local staging dir.")
    parser.add_argument(
        "--entities",
        nargs="+",
        default=["contacts", "pipelines", "opportunities", "conversations", "messages", "call-details"],
        choices=sorted(ENTITY_ALIASES),
        help="Entities to extract. Use all for the MVP set.",
    )
    parser.add_argument("--page-limit", type=int, default=100, help="Requested records per API page.")
    parser.add_argument("--max-items", type=int, default=None, help="Max records per entity for bounded runs.")
    parser.add_argument("--max-pages", type=int, default=None, help="Max pages per entity for bounded runs.")
    parser.add_argument("--dry-run", action="store_true", help="Disable S3 uploads and recording downloads.")
    parser.add_argument("--smoke", action="store_true", help="Safe smoke mode: low limits, dry-run, no recordings.")
    parser.add_argument("--s3-bucket", default=None, help="Optional S3 bucket for raw/checkpoint/manifest uploads.")
    parser.add_argument("--s3-prefix", default="", help="Optional S3 prefix under the bucket.")
    parser.add_argument("--pipeline-id", action="append", default=[], help="Limit opportunity extraction to pipeline ID.")
    parser.add_argument("--conversation-id", action="append", default=[], help="Limit message extraction to conversation ID.")
    parser.add_argument("--message-id", action="append", default=[], help="Limit call detail extraction to message ID.")
    parser.add_argument(
        "--download-recordings",
        action="store_true",
        help="Download call recordings and upload them to encrypted S3 objects. Requires --s3-bucket.",
    )
    parser.add_argument("--max-recordings", type=int, default=1, help="Bound recording archival attempts.")
    parser.add_argument("--recording-max-bytes", type=int, default=100 * 1024 * 1024)
    parser.add_argument("--timeout-seconds", type=float, default=30.0)
    parser.add_argument("--max-retries", type=int, default=4)
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])

    if args.smoke:
        args.dry_run = True
        args.download_recordings = False
        args.page_limit = min(args.page_limit, 2)
        args.max_items = min(args.max_items, 2) if args.max_items is not None else 2
        args.max_pages = min(args.max_pages, 1) if args.max_pages is not None else 1

    entities = normalize_entities(args.entities)
    if not args.env_file:
        raise SystemExit("Provide --env-file or set GHL_ENV_FILE for local extraction runs.")

    config = load_ghl_config(args.env_file, api_version=args.api_version, base_url=args.base_url)
    s3_uploader = make_s3_uploader(args.s3_bucket, args.s3_prefix, dry_run=args.dry_run)
    client = GHLClient(config, timeout_seconds=args.timeout_seconds, max_retries=args.max_retries)
    storage = LocalRunStorage(args.output_dir, s3_uploader=s3_uploader)
    options = ExtractOptions(
        page_limit=args.page_limit,
        max_items=args.max_items,
        max_pages=args.max_pages,
        dry_run=args.dry_run,
        pipeline_ids=args.pipeline_id,
        conversation_ids=args.conversation_id,
        message_ids=args.message_id,
        download_recordings=args.download_recordings,
        max_recordings=args.max_recordings,
        recording_max_bytes=args.recording_max_bytes,
    )
    extractor = GHLRawExtractor(
        client,
        storage,
        location_id=config.location_id,
        s3_uploader=s3_uploader,
        options=options,
    )
    manifest = extractor.run(entities)

    public_summary = {
        "run_id": manifest["run_id"],
        "dry_run": args.dry_run,
        "manifest_path": manifest["manifest_path"],
        "manifest_s3_uri": manifest.get("manifest_s3_uri"),
        "entity_counts": manifest["summary"]["entity_counts"],
        "entity_pages": manifest["summary"]["entity_pages"],
        "recording_attempts": manifest["summary"]["recording_attempts"],
    }
    print(json.dumps(public_summary, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
