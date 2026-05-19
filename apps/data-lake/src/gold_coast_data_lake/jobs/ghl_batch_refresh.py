"""Manual entrypoint for the Gold Coast GHL batch refresh runner."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

from gold_coast_data_lake.batch import BatchRefreshRunner


PROJECT_ROOT = Path(__file__).resolve().parents[3]


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run the Gold Coast GHL batch refresh.")
    parser.add_argument("--run-id", default=None)
    parser.add_argument("--source-environment", default="production")
    parser.add_argument("--status-dir", default=str(PROJECT_ROOT / "data" / "run-status" / "ghl"))
    parser.add_argument("--output-dir", default=str(PROJECT_ROOT / "data" / "extracts"))
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Run production phases. Not implemented until the extraction orchestration slice.",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    runner = BatchRefreshRunner(
        status_dir=args.status_dir,
        output_dir=args.output_dir,
    )
    result = runner.run(
        run_id=args.run_id,
        source_environment=args.source_environment,
        dry_run=not args.execute,
        metadata={"entrypoint": "gold_coast_data_lake.jobs.ghl_batch_refresh"},
    )
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0 if result["status"] == "succeeded" else 1


if __name__ == "__main__":
    raise SystemExit(main())
