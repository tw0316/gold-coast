#!/usr/bin/env python3
"""Build Gold Coast data lake GHL-source Parquet tables and Glue partitions."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = PROJECT_ROOT / "src"
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from gold_coast_data_lake.curated import (
    DEFAULT_CURATED_BUCKET,
    DEFAULT_CURATED_PREFIX,
    DEFAULT_GLUE_DATABASE,
    DEFAULT_MANIFEST_S3_URI,
    DEFAULT_REPORTING_GLUE_DATABASE,
    DEFAULT_SNAPSHOT_DATE,
    run_curated_build,
)


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build curated GHL Parquet tables from verified raw S3 backfill.")
    parser.add_argument("--manifest-uri", default=DEFAULT_MANIFEST_S3_URI)
    parser.add_argument("--snapshot-date", default=DEFAULT_SNAPSHOT_DATE)
    parser.add_argument("--local-output-dir", default=str(PROJECT_ROOT / "data" / "curated"))
    parser.add_argument("--s3-bucket", default=DEFAULT_CURATED_BUCKET)
    parser.add_argument("--s3-prefix", default=DEFAULT_CURATED_PREFIX)
    parser.add_argument("--glue-database", default=DEFAULT_GLUE_DATABASE)
    parser.add_argument("--reporting-glue-database", default=DEFAULT_REPORTING_GLUE_DATABASE)
    parser.add_argument("--daily-snapshot-prefix", default="snapshots/ghl/daily")
    parser.add_argument("--no-s3", action="store_true", help="Write local Parquet only.")
    parser.add_argument("--no-glue", action="store_true", help="Skip Glue table updates.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    s3_bucket = None if args.no_s3 else args.s3_bucket
    glue_database = None if args.no_glue else args.glue_database
    if args.no_s3:
        glue_database = None

    summary = run_curated_build(
        manifest_uri=args.manifest_uri,
        snapshot_date=args.snapshot_date,
        local_output_dir=args.local_output_dir,
        s3_bucket=s3_bucket,
        s3_prefix=args.s3_prefix,
        glue_database=glue_database,
        reporting_glue_database=args.reporting_glue_database,
        daily_snapshot_prefix=args.daily_snapshot_prefix,
    )
    print(json.dumps(summary, indent=2, sort_keys=True, default=str))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
