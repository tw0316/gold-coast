# V1.1 Smoke SQL Patch Evidence

## Changed files

- `sql/data-lake/smoke/004_v1_1_duplicate_source_ids.sql`
- `.jks/v1-1-smoke-sql-patch-evidence.md`

## Summary

- Added the missing `gold_coast.opportunity_stage_history.transition_key` duplicate/null-key check to the checked-in V1.1 smoke SQL.
- Kept the checked-in SQL aligned with the core `DUPLICATE_KEY_CHECKS` entries in `apps/data-lake/src/gold_coast_data_lake/smoke.py`.
- Owner follow-up extended both runtime and checked-in smoke coverage to reporting mart grains:
  - `gold_coast_reporting.lead_response.opportunity_id`
  - `gold_coast_reporting.rep_activity_daily(activity_date, actor_user_id)`

## Checks run

- Passed: `rg -n "DUPLICATE_KEY_CHECKS|opportunity_stage_history|transition_key" apps/data-lake/src/gold_coast_data_lake/smoke.py sql/data-lake/smoke/004_v1_1_duplicate_source_ids.sql`
- Passed: `git diff --check -- sql/data-lake/smoke/004_v1_1_duplicate_source_ids.sql`
- Passed: `awk '/[ \\t]$/ { print FILENAME ":" FNR ": trailing whitespace"; bad=1 } END { exit bad }' .jks/v1-1-smoke-sql-patch-evidence.md`
- Passed: `PYTHONPATH=apps/data-lake/src /tmp/gold-coast-data-lake-test-venv/bin/python -m pytest apps/data-lake/tests`, 53 passed.
- Passed: checked-in Athena smoke query `sql/data-lake/smoke/004_v1_1_duplicate_source_ids.sql`, query `5beb0092-457d-4e84-b7e0-44d5372db2ef`, including reporting mart grain checks.

## Guardrails

- No AWS, GHL, deploy, S3 purge, schedule, commit, or push commands were run.
