"""Manual entrypoint for the Gold Coast GHL batch refresh runner."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import sys

from gold_coast_data_lake.alerts import AlertConfig, alert_callback
from gold_coast_data_lake.batch import BatchRefreshRunner
from gold_coast_data_lake.extractor import ENTITY_ALIASES
from gold_coast_data_lake.raw_refresh import DEFAULT_RAW_REFRESH_ENTITIES, RawRefreshConfig, build_ghl_raw_refresh_phase
from gold_coast_data_lake.storage import S3Uploader


PROJECT_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_ENV_FILE = os.environ.get("GHL_ENV_FILE")
DEFAULT_ALERT_MODE = os.environ.get("ALERT_MODE", "off")
DEFAULT_SUCCESS_ALERT_UNTIL = os.environ.get("SUCCESS_ALERT_UNTIL")
DEFAULT_CLOUDWATCH_LOG_URL = os.environ.get("CLOUDWATCH_LOG_URL")


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run the Gold Coast GHL batch refresh.")
    parser.add_argument("--run-id", default=None)
    parser.add_argument("--source-environment", default="production")
    parser.add_argument("--status-dir", default=str(PROJECT_ROOT / "data" / "run-status" / "ghl"))
    parser.add_argument("--output-dir", default=str(PROJECT_ROOT / "data" / "extracts"))
    parser.add_argument(
        "--env-file",
        default=DEFAULT_ENV_FILE,
        help="Path to production GHL credentials env file. May also be supplied through GHL_ENV_FILE.",
    )
    parser.add_argument("--api-version", default=None, help="Override LeadConnector Version header.")
    parser.add_argument("--base-url", default=None, help="Override GHL base URL.")
    parser.add_argument(
        "--entities",
        nargs="+",
        default=list(DEFAULT_RAW_REFRESH_ENTITIES),
        choices=sorted(ENTITY_ALIASES),
        help="Entities to extract. Defaults to the full core-source refresh set.",
    )
    parser.add_argument("--page-limit", type=int, default=100, help="Requested records per API page.")
    parser.add_argument("--max-items", type=int, default=None, help="Max records per entity for bounded operator runs.")
    parser.add_argument("--max-pages", type=int, default=None, help="Max pages per entity for bounded operator runs.")
    parser.add_argument(
        "--extractor-dry-run",
        action="store_true",
        help="Run GHL GET extraction locally without S3 uploads or recording downloads.",
    )
    parser.add_argument("--s3-bucket", default=None, help="Optional S3 bucket for raw/checkpoint/manifest uploads.")
    parser.add_argument("--s3-prefix", default="", help="Optional S3 prefix under the bucket.")
    parser.add_argument(
        "--status-s3-bucket",
        default=None,
        help="Optional S3 bucket for run-status artifacts. Defaults to --s3-bucket for execute-mode non-dry-run runs.",
    )
    parser.add_argument(
        "--status-s3-prefix",
        default=None,
        help="Optional S3 prefix for run-status artifacts. Defaults to --s3-prefix.",
    )
    parser.add_argument("--pipeline-id", action="append", default=[], help="Limit opportunity extraction to pipeline ID.")
    parser.add_argument("--conversation-id", action="append", default=[], help="Limit message extraction to conversation ID.")
    parser.add_argument("--message-id", action="append", default=[], help="Limit call detail extraction to message ID.")
    parser.add_argument(
        "--download-recordings",
        action="store_true",
        help="Download call recordings and upload them to encrypted S3 objects. Requires --s3-bucket.",
    )
    parser.add_argument("--max-recordings", type=int, default=100000, help="Bound recording archival attempts.")
    parser.add_argument("--recording-max-bytes", type=int, default=100 * 1024 * 1024)
    parser.add_argument("--timeout-seconds", type=float, default=30.0)
    parser.add_argument("--max-retries", type=int, default=4)
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Run production raw-refresh phases. Requires GHL config from --env-file or process env.",
    )
    parser.add_argument(
        "--alert-mode",
        default=DEFAULT_ALERT_MODE,
        choices=["off", "failure-only", "success-and-failure", "launch-window"],
        help="Slack alert policy. Webhook URL is read only from SLACK_WEBHOOK_URL.",
    )
    parser.add_argument("--success-alert-until", default=DEFAULT_SUCCESS_ALERT_UNTIL)
    parser.add_argument("--cloudwatch-log-url", default=DEFAULT_CLOUDWATCH_LOG_URL)
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    phases = []
    status_uploader = build_status_uploader(args)
    if args.execute:
        raw_config = RawRefreshConfig(
            env_file=args.env_file,
            api_version=args.api_version,
            base_url=args.base_url,
            entities=args.entities,
            page_limit=args.page_limit,
            max_items=args.max_items,
            max_pages=args.max_pages,
            local_only=args.extractor_dry_run,
            s3_bucket=args.s3_bucket,
            s3_prefix=args.s3_prefix,
            pipeline_ids=args.pipeline_id,
            conversation_ids=args.conversation_id,
            message_ids=args.message_id,
            download_recordings=args.download_recordings,
            max_recordings=args.max_recordings,
            recording_max_bytes=args.recording_max_bytes,
            timeout_seconds=args.timeout_seconds,
            max_retries=args.max_retries,
        )
        phases.append(("raw_refresh", build_ghl_raw_refresh_phase(raw_config)))

    runner = BatchRefreshRunner(
        status_dir=args.status_dir,
        output_dir=args.output_dir,
        phases=phases,
        status_uploader=status_uploader,
        alert_callback=None
        if args.alert_mode == "off"
        else alert_callback(
            AlertConfig(
                webhook_url=os.environ.get("SLACK_WEBHOOK_URL"),
                mode=args.alert_mode,
                success_alert_until=args.success_alert_until,
                cloudwatch_log_url=args.cloudwatch_log_url,
            )
        ),
    )
    result = runner.run(
        run_id=args.run_id,
        source_environment=args.source_environment,
        dry_run=not args.execute,
        metadata={
            "entrypoint": "gold_coast_data_lake.jobs.ghl_batch_refresh",
            "entities": args.entities,
            "extractor_dry_run": args.extractor_dry_run,
            "download_recordings": args.download_recordings,
        },
    )
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0 if result["status"] == "succeeded" else 1


def build_status_uploader(args: argparse.Namespace) -> S3Uploader | None:
    bucket = args.status_s3_bucket
    if bucket is None and args.execute and args.s3_bucket and not args.extractor_dry_run:
        bucket = args.s3_bucket
    if bucket is None:
        return None
    prefix = args.status_s3_prefix if args.status_s3_prefix is not None else args.s3_prefix
    return S3Uploader(bucket, prefix)


if __name__ == "__main__":
    raise SystemExit(main())
