"""Athena smoke checks for published Gold Coast data lake snapshots."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import time
from typing import Any


CRITICAL_CORE_TABLES = (
    "contacts_latest",
    "opportunities_latest",
    "opportunity_stage_history",
    "messages",
    "calls",
    "call_recordings",
)
CRITICAL_REPORTING_TABLES = (
    "lead_response",
    "rep_activity_daily",
)
CRITICAL_CURATED_TABLES = CRITICAL_CORE_TABLES + CRITICAL_REPORTING_TABLES
DUPLICATE_KEY_CHECKS = (
    ("core", "contacts_latest", "contact_id"),
    ("core", "opportunities_latest", "opportunity_id"),
    ("core", "messages", "message_id"),
    ("core", "calls", "call_message_id"),
    ("core", "call_recordings", "message_id"),
    ("core", "opportunity_stage_history", "transition_key"),
)
DEFAULT_FRESHNESS_MAX_AGE_MINUTES = 120
DEFAULT_ATHENA_TIMEOUT_SECONDS = 120
DEFAULT_ATHENA_POLL_INTERVAL_SECONDS = 2.0


@dataclass
class AthenaQueryError(RuntimeError):
    query_execution_id: str | None
    state: str
    reason: str

    def __str__(self) -> str:
        query = f" query_execution_id={self.query_execution_id}" if self.query_execution_id else ""
        return f"Athena query {self.state.lower()}{query}: {self.reason}"


def run_athena_smoke_checks(
    *,
    run_id: str,
    snapshot_date: str,
    database: str | None,
    reporting_database: str | None = None,
    workgroup: str | None,
    output_location: str | None,
    table_counts: dict[str, Any] | None = None,
    max_age_minutes: int = DEFAULT_FRESHNESS_MAX_AGE_MINUTES,
    client: Any | None = None,
    now: datetime | None = None,
    timeout_seconds: int = DEFAULT_ATHENA_TIMEOUT_SECONDS,
    poll_interval_seconds: float = DEFAULT_ATHENA_POLL_INTERVAL_SECONDS,
) -> list[dict[str, Any]]:
    """Run freshness and row-availability checks against the current curated partition."""

    checked_at = isoformat(now or utc_now())
    queried_tables = qualified_table_names(database, reporting_database)
    query_execution_ids: list[str] = []
    base_check: dict[str, Any] = {
        "check_name": "athena_curated_snapshot",
        "name": "athena_curated_snapshot",
        "status": "not_run",
        "checked_at": checked_at,
        "queried_tables": queried_tables,
        "query_execution_ids": query_execution_ids,
        "freshness_result": {"status": "not_run", "query_execution_id": None},
        "row_availability_result": {
            "status": "not_run",
            "table_counts": {},
            "missing_tables": queried_tables,
            "failed_tables": [],
            "query_execution_id": None,
        },
        "duplicate_result": {
            "status": "not_run",
            "failed_checks": [],
            "checks": {},
            "query_execution_id": None,
        },
        "error": None,
    }

    not_run_reason = smoke_not_run_reason(
        database=database,
        reporting_database=reporting_database,
        workgroup=workgroup,
        output_location=output_location,
        table_counts=table_counts or {},
    )
    if not_run_reason:
        base_check["error"] = not_run_reason
        return [base_check]

    try:
        athena_client = client or build_athena_client()
        freshness_query_id, freshness_rows = execute_athena_query(
            freshness_sql(
                database=str(database),
                reporting_database=str(reporting_database),
                run_id=run_id,
                snapshot_date=snapshot_date,
                max_age_minutes=max_age_minutes,
            ),
            database=str(database),
            workgroup=str(workgroup),
            output_location=str(output_location),
            client=athena_client,
            timeout_seconds=timeout_seconds,
            poll_interval_seconds=poll_interval_seconds,
        )
        query_execution_ids.append(freshness_query_id)
        freshness_result = parse_freshness_result(freshness_rows, freshness_query_id)
        base_check["freshness_result"] = freshness_result

        row_query_id, row_rows = execute_athena_query(
            row_availability_sql(
                database=str(database),
                reporting_database=str(reporting_database),
                run_id=run_id,
                snapshot_date=snapshot_date,
            ),
            database=str(database),
            workgroup=str(workgroup),
            output_location=str(output_location),
            client=athena_client,
            timeout_seconds=timeout_seconds,
            poll_interval_seconds=poll_interval_seconds,
        )
        query_execution_ids.append(row_query_id)
        row_result = parse_row_availability_result(row_rows, row_query_id)
        base_check["row_availability_result"] = row_result

        duplicate_query_id, duplicate_rows = execute_athena_query(
            duplicate_check_sql(
                database=str(database),
                reporting_database=str(reporting_database),
            ),
            database=str(database),
            workgroup=str(workgroup),
            output_location=str(output_location),
            client=athena_client,
            timeout_seconds=timeout_seconds,
            poll_interval_seconds=poll_interval_seconds,
        )
        query_execution_ids.append(duplicate_query_id)
        duplicate_result = parse_duplicate_result(duplicate_rows, duplicate_query_id)
        base_check["duplicate_result"] = duplicate_result

        status = (
            "passed"
            if freshness_result["status"] == "passed"
            and row_result["status"] == "passed"
            and duplicate_result["status"] == "passed"
            else "failed"
        )
        base_check.update(
            {
                "status": status,
            }
        )
    except AthenaQueryError as exc:
        if exc.query_execution_id:
            query_execution_ids.append(exc.query_execution_id)
        base_check.update({"status": "failed", "error": str(exc)})
    except Exception as exc:  # noqa: BLE001
        base_check.update({"status": "failed", "error": f"{exc.__class__.__name__}: {exc}"})

    return [base_check]


def smoke_not_run_reason(
    *,
    database: str | None,
    reporting_database: str | None,
    workgroup: str | None,
    output_location: str | None,
    table_counts: dict[str, Any],
) -> str | None:
    if not database:
        return "Athena smoke checks not_run: missing Glue/Athena database"
    if not reporting_database:
        return "Athena smoke checks not_run: missing reporting Glue/Athena database"
    if not workgroup:
        return "Athena smoke checks not_run: missing Athena workgroup"
    if not output_location:
        return "Athena smoke checks not_run: missing Athena output location"
    if not table_counts:
        return "Athena smoke checks not_run: missing curated table counts"
    return None


def build_athena_client() -> Any:
    try:
        import boto3  # type: ignore
    except ImportError as exc:  # pragma: no cover - runtime packaging guard
        raise RuntimeError("boto3 is required for Athena smoke checks") from exc
    return boto3.client("athena")


def default_athena_output_location(s3_bucket: str | None, s3_prefix: str | None = "") -> str | None:
    if not s3_bucket:
        return None
    prefix = (s3_prefix or "").strip("/")
    parts = [part for part in (prefix, "athena-results/ghl/smoke") if part]
    suffix = "/".join(parts)
    return f"s3://{s3_bucket}/{suffix}/"


def execute_athena_query(
    query: str,
    *,
    database: str,
    workgroup: str,
    output_location: str,
    client: Any,
    timeout_seconds: int = DEFAULT_ATHENA_TIMEOUT_SECONDS,
    poll_interval_seconds: float = DEFAULT_ATHENA_POLL_INTERVAL_SECONDS,
) -> tuple[str, list[dict[str, str | None]]]:
    response = client.start_query_execution(
        QueryString=query,
        QueryExecutionContext={"Database": database},
        ResultConfiguration={"OutputLocation": output_location},
        WorkGroup=workgroup,
    )
    query_execution_id = str(response["QueryExecutionId"])
    deadline = time.monotonic() + timeout_seconds

    while True:
        execution = client.get_query_execution(QueryExecutionId=query_execution_id)["QueryExecution"]
        status = execution.get("Status", {})
        state = str(status.get("State") or "UNKNOWN")
        if state == "SUCCEEDED":
            return query_execution_id, get_query_rows(client, query_execution_id)
        if state in {"FAILED", "CANCELLED"}:
            raise AthenaQueryError(query_execution_id, state, str(status.get("StateChangeReason") or "unknown"))
        if time.monotonic() >= deadline:
            raise AthenaQueryError(query_execution_id, "TIMEOUT", f"exceeded {timeout_seconds} seconds")
        time.sleep(poll_interval_seconds)


def get_query_rows(client: Any, query_execution_id: str) -> list[dict[str, str | None]]:
    raw_rows: list[dict[str, Any]] = []
    next_token = None
    while True:
        request: dict[str, Any] = {"QueryExecutionId": query_execution_id}
        if next_token:
            request["NextToken"] = next_token
        response = client.get_query_results(**request)
        raw_rows.extend(response.get("ResultSet", {}).get("Rows", []))
        next_token = response.get("NextToken")
        if not next_token:
            break

    if not raw_rows:
        return []
    headers = [cell.get("VarCharValue", "") for cell in raw_rows[0].get("Data", [])]
    parsed_rows = []
    for raw_row in raw_rows[1:]:
        cells = raw_row.get("Data", [])
        parsed_rows.append(
            {
                header: cells[index].get("VarCharValue") if index < len(cells) else None
                for index, header in enumerate(headers)
            }
        )
    return parsed_rows


def parse_freshness_result(rows: list[dict[str, str | None]], query_execution_id: str) -> dict[str, Any]:
    row = rows[0] if rows else {}
    status = row.get("status") or "failed"
    return {
        "status": normalize_check_status(status),
        "snapshot_at": row.get("snapshot_at"),
        "age_minutes": as_float(row.get("age_minutes")),
        "max_age_minutes": as_int(row.get("max_age_minutes")),
        "query_execution_id": query_execution_id,
    }


def parse_row_availability_result(rows: list[dict[str, str | None]], query_execution_id: str) -> dict[str, Any]:
    table_counts: dict[str, int] = {}
    missing_tables: list[str] = []
    failed_tables: list[str] = []

    for row in rows:
        table_name = str(row.get("table_name") or "")
        if not table_name:
            continue
        row_count = as_int(row.get("row_count")) or 0
        table_counts[table_name] = row_count
        status = normalize_check_status(row.get("status"))
        if status != "passed":
            failed_tables.append(table_name)
        if row_count < (as_int(row.get("min_rows")) or 1):
            missing_tables.append(table_name)

    status = "passed" if rows and not failed_tables and not missing_tables else "failed"
    return {
        "status": status,
        "table_counts": table_counts,
        "missing_tables": sorted(set(missing_tables)),
        "failed_tables": sorted(set(failed_tables)),
        "query_execution_id": query_execution_id,
    }


def parse_duplicate_result(rows: list[dict[str, str | None]], query_execution_id: str) -> dict[str, Any]:
    checks: dict[str, dict[str, Any]] = {}
    failed_checks: list[str] = []
    for row in rows:
        check_name = str(row.get("check_name") or "")
        if not check_name:
            continue
        duplicate_count = as_int(row.get("duplicate_count")) or 0
        null_key_count = as_int(row.get("null_key_count")) or 0
        status = normalize_check_status(row.get("status"))
        checks[check_name] = {
            "table_name": row.get("table_name"),
            "key_column": row.get("key_column"),
            "duplicate_count": duplicate_count,
            "null_key_count": null_key_count,
            "status": status,
        }
        if status != "passed" or duplicate_count or null_key_count:
            failed_checks.append(check_name)

    expected_checks = {f"{table}.{key}" for _, table, key in DUPLICATE_KEY_CHECKS}
    observed_checks = set(checks)
    failed_checks.extend(sorted(expected_checks - observed_checks))
    status = "passed" if not failed_checks and expected_checks == observed_checks else "failed"
    return {
        "status": status,
        "failed_checks": sorted(set(failed_checks)),
        "checks": checks,
        "query_execution_id": query_execution_id,
    }


def freshness_sql(
    *,
    database: str,
    reporting_database: str,
    run_id: str,
    snapshot_date: str,
    max_age_minutes: int,
) -> str:
    contacts = qualified_table(database, "contacts_latest")
    return f"""
SELECT
    CAST(max(snapshot_at) AS varchar) AS snapshot_at,
    CAST(date_diff('minute', max(snapshot_at), CAST(current_timestamp AS timestamp)) AS integer) AS age_minutes,
    {int(max_age_minutes)} AS max_age_minutes,
    CASE
        WHEN max(snapshot_at) IS NOT NULL
         AND max(snapshot_at) >= CAST(current_timestamp AS timestamp) - INTERVAL '{int(max_age_minutes)}' MINUTE
        THEN 'passed'
        ELSE 'failed'
    END AS status
FROM {contacts}
""".strip()


def row_availability_sql(*, database: str, reporting_database: str, run_id: str, snapshot_date: str) -> str:
    expected = [
        (database, table)
        for table in CRITICAL_CORE_TABLES
    ] + [
        (reporting_database, table)
        for table in CRITICAL_REPORTING_TABLES
    ]
    expected_values = ",\n        ".join(
        f"({sql_string(db + '.' + table)}, 1)" for db, table in expected
    )
    observed_queries = "\n\n    UNION ALL\n    ".join(
        (
            f"SELECT {sql_string(db + '.' + table)} AS table_name, count(*) AS row_count\n"
            f"    FROM {qualified_table(db, table)}"
        )
        for db, table in expected
    )
    return f"""
WITH expected(table_name, min_rows) AS (
    VALUES
        {expected_values}
),
observed AS (
    {observed_queries}
)
SELECT
    e.table_name,
    coalesce(o.row_count, 0) AS row_count,
    e.min_rows,
    CASE WHEN coalesce(o.row_count, 0) >= e.min_rows THEN 'passed' ELSE 'failed' END AS status
FROM expected e
LEFT JOIN observed o ON e.table_name = o.table_name
ORDER BY e.table_name
""".strip()


def duplicate_check_sql(*, database: str, reporting_database: str) -> str:
    queries = []
    for group, table, key in DUPLICATE_KEY_CHECKS:
        db = reporting_database if group == "reporting" else database
        table_name = f"{table}.{key}"
        qualified = qualified_table(db, table)
        key_name = quote_identifier(key)
        queries.append(
            f"""
SELECT
    {sql_string(table_name)} AS check_name,
    {sql_string(db + '.' + table)} AS table_name,
    {sql_string(key)} AS key_column,
    CAST(sum(CASE WHEN key_count > 1 THEN key_count - 1 ELSE 0 END) AS bigint) AS duplicate_count,
    CAST(max(null_key_count) AS bigint) AS null_key_count,
    CASE
        WHEN sum(CASE WHEN key_count > 1 THEN key_count - 1 ELSE 0 END) = 0
         AND max(null_key_count) = 0
        THEN 'passed'
        ELSE 'failed'
    END AS status
FROM (
    SELECT {key_name} AS stable_id, count(*) AS key_count, 0 AS null_key_count
    FROM {qualified}
    WHERE {key_name} IS NOT NULL
    GROUP BY {key_name}
    UNION ALL
    SELECT '__null_keys__' AS stable_id, 0 AS key_count, count(*) AS null_key_count
    FROM {qualified}
    WHERE {key_name} IS NULL
) keyed
""".strip()
        )
    return "\nUNION ALL\n".join(queries)


def qualified_table_names(database: str | None, reporting_database: str | None) -> list[str]:
    core = [f"{database}.{table}" for table in CRITICAL_CORE_TABLES] if database else list(CRITICAL_CORE_TABLES)
    reporting = (
        [f"{reporting_database}.{table}" for table in CRITICAL_REPORTING_TABLES]
        if reporting_database
        else list(CRITICAL_REPORTING_TABLES)
    )
    return core + reporting


def qualified_table(database: str, table: str) -> str:
    return f'{quote_identifier(database)}.{quote_identifier(table)}'


def quote_identifier(value: str) -> str:
    return f'"{value.replace(chr(34), chr(34) + chr(34))}"'


def sql_string(value: str) -> str:
    return "'" + str(value).replace("'", "''") + "'"


def normalize_check_status(value: Any) -> str:
    status = str(value or "").strip().lower()
    if status in {"passed", "pass"}:
        return "passed"
    if status in {"failed", "fail"}:
        return "failed"
    if status == "not_run":
        return "not_run"
    return "failed"


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def isoformat(moment: datetime) -> str:
    return moment.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def as_int(value: Any) -> int | None:
    if value in (None, ""):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def as_float(value: Any) -> float | None:
    if value in (None, ""):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None
