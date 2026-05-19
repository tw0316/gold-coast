"""Curated GHL table transforms, Parquet writes, and Glue table registration."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import json
from pathlib import Path
from typing import Any, Iterable


DEFAULT_MANIFEST_S3_URI = "s3://gcoffers-data-lake/manifests/ghl/run=20260518T080441Z.json"
DEFAULT_CURATED_BUCKET = "gcoffers-data-lake"
DEFAULT_CURATED_PREFIX = "curated/ghl"
DEFAULT_GLUE_DATABASE = "gold_coast"
DEFAULT_SNAPSHOT_DATE = "2026-05-18"

TABLE_ORDER = [
    "contacts",
    "opportunities",
    "messages",
    "calls",
    "call_recordings",
    "mart_lead_response",
    "mart_rep_activity_daily",
]


@dataclass(frozen=True)
class ColumnSpec:
    name: str
    logical_type: str
    glue_type: str


@dataclass(frozen=True)
class S3Uri:
    bucket: str
    key: str


@dataclass(frozen=True)
class TableData:
    name: str
    columns: list[ColumnSpec]
    rows: list[dict[str, Any]]


@dataclass(frozen=True)
class WrittenTable:
    name: str
    row_count: int
    s3_uri: str | None
    s3_key: str | None
    byte_count: int
    object_count: int
    local_path: str


@dataclass(frozen=True)
class GlueTableResult:
    name: str
    table_location: str
    partition_location: str
    action: str


SCHEMAS: dict[str, list[ColumnSpec]] = {
    "contacts": [
        ColumnSpec("contact_id", "string", "string"),
        ColumnSpec("location_id", "string", "string"),
        ColumnSpec("contact_name", "string", "string"),
        ColumnSpec("first_name", "string", "string"),
        ColumnSpec("last_name", "string", "string"),
        ColumnSpec("phone", "string", "string"),
        ColumnSpec("email", "string", "string"),
        ColumnSpec("source", "string", "string"),
        ColumnSpec("assigned_to_user_id", "string", "string"),
        ColumnSpec("contact_type", "string", "string"),
        ColumnSpec("city", "string", "string"),
        ColumnSpec("state", "string", "string"),
        ColumnSpec("postal_code", "string", "string"),
        ColumnSpec("country", "string", "string"),
        ColumnSpec("tags_json", "string", "string"),
        ColumnSpec("custom_fields_json", "string", "string"),
        ColumnSpec("attributions_json", "string", "string"),
        ColumnSpec("date_added", "timestamp", "timestamp"),
        ColumnSpec("date_updated", "timestamp", "timestamp"),
        ColumnSpec("raw_json", "string", "string"),
    ],
    "opportunities": [
        ColumnSpec("opportunity_id", "string", "string"),
        ColumnSpec("contact_id", "string", "string"),
        ColumnSpec("location_id", "string", "string"),
        ColumnSpec("opportunity_name", "string", "string"),
        ColumnSpec("pipeline_id", "string", "string"),
        ColumnSpec("pipeline_name", "string", "string"),
        ColumnSpec("pipeline_stage_id", "string", "string"),
        ColumnSpec("pipeline_stage_name", "string", "string"),
        ColumnSpec("pipeline_stage_position", "bigint", "bigint"),
        ColumnSpec("status", "string", "string"),
        ColumnSpec("source", "string", "string"),
        ColumnSpec("assigned_to_user_id", "string", "string"),
        ColumnSpec("monetary_value", "double", "double"),
        ColumnSpec("effective_probability", "double", "double"),
        ColumnSpec("created_at", "timestamp", "timestamp"),
        ColumnSpec("updated_at", "timestamp", "timestamp"),
        ColumnSpec("last_stage_change_at", "timestamp", "timestamp"),
        ColumnSpec("last_status_change_at", "timestamp", "timestamp"),
        ColumnSpec("contact_name", "string", "string"),
        ColumnSpec("contact_phone", "string", "string"),
        ColumnSpec("contact_email", "string", "string"),
        ColumnSpec("custom_fields_json", "string", "string"),
        ColumnSpec("attributions_json", "string", "string"),
        ColumnSpec("raw_json", "string", "string"),
    ],
    "messages": [
        ColumnSpec("message_id", "string", "string"),
        ColumnSpec("conversation_id", "string", "string"),
        ColumnSpec("contact_id", "string", "string"),
        ColumnSpec("location_id", "string", "string"),
        ColumnSpec("message_type", "string", "string"),
        ColumnSpec("direction", "string", "string"),
        ColumnSpec("status", "string", "string"),
        ColumnSpec("body", "string", "string"),
        ColumnSpec("from_phone", "string", "string"),
        ColumnSpec("to_phone", "string", "string"),
        ColumnSpec("content_type", "string", "string"),
        ColumnSpec("actor_user_id", "string", "string"),
        ColumnSpec("source", "string", "string"),
        ColumnSpec("date_added", "timestamp", "timestamp"),
        ColumnSpec("date_updated", "timestamp", "timestamp"),
        ColumnSpec("attachments_json", "string", "string"),
        ColumnSpec("activity_json", "string", "string"),
        ColumnSpec("meta_json", "string", "string"),
        ColumnSpec("error_json", "string", "string"),
        ColumnSpec("raw_json", "string", "string"),
    ],
    "calls": [
        ColumnSpec("call_message_id", "string", "string"),
        ColumnSpec("conversation_id", "string", "string"),
        ColumnSpec("contact_id", "string", "string"),
        ColumnSpec("location_id", "string", "string"),
        ColumnSpec("actor_user_id", "string", "string"),
        ColumnSpec("direction", "string", "string"),
        ColumnSpec("status", "string", "string"),
        ColumnSpec("call_status", "string", "string"),
        ColumnSpec("duration_seconds", "double", "double"),
        ColumnSpec("from_phone", "string", "string"),
        ColumnSpec("to_phone", "string", "string"),
        ColumnSpec("source", "string", "string"),
        ColumnSpec("alt_id", "string", "string"),
        ColumnSpec("has_recording", "boolean", "boolean"),
        ColumnSpec("recording_s3_uri", "string", "string"),
        ColumnSpec("recording_object_key", "string", "string"),
        ColumnSpec("recording_content_type", "string", "string"),
        ColumnSpec("recording_byte_count", "bigint", "bigint"),
        ColumnSpec("recording_sha256", "string", "string"),
        ColumnSpec("recording_archival_status", "string", "string"),
        ColumnSpec("recording_unavailable_reason", "string", "string"),
        ColumnSpec("date_added", "timestamp", "timestamp"),
        ColumnSpec("date_updated", "timestamp", "timestamp"),
        ColumnSpec("raw_json", "string", "string"),
    ],
    "call_recordings": [
        ColumnSpec("message_id", "string", "string"),
        ColumnSpec("archival_status", "string", "string"),
        ColumnSpec("s3_uri", "string", "string"),
        ColumnSpec("object_key", "string", "string"),
        ColumnSpec("content_type", "string", "string"),
        ColumnSpec("byte_count", "bigint", "bigint"),
        ColumnSpec("sha256", "string", "string"),
        ColumnSpec("unavailable_reason", "string", "string"),
        ColumnSpec("archived_at", "timestamp", "timestamp"),
        ColumnSpec("endpoint", "string", "string"),
    ],
    "mart_lead_response": [
        ColumnSpec("opportunity_id", "string", "string"),
        ColumnSpec("contact_id", "string", "string"),
        ColumnSpec("assigned_to_user_id", "string", "string"),
        ColumnSpec("pipeline_stage_name", "string", "string"),
        ColumnSpec("opportunity_status", "string", "string"),
        ColumnSpec("lead_created_at", "timestamp", "timestamp"),
        ColumnSpec("first_outbound_call_at", "timestamp", "timestamp"),
        ColumnSpec("first_outbound_call_user_id", "string", "string"),
        ColumnSpec("minutes_to_first_outbound_call", "double", "double"),
        ColumnSpec("first_completed_call_at", "timestamp", "timestamp"),
        ColumnSpec("minutes_to_first_completed_call", "double", "double"),
        ColumnSpec("first_outbound_message_at", "timestamp", "timestamp"),
        ColumnSpec("first_outbound_message_type", "string", "string"),
        ColumnSpec("minutes_to_first_outbound_message", "double", "double"),
        ColumnSpec("first_response_at", "timestamp", "timestamp"),
        ColumnSpec("minutes_to_first_response", "double", "double"),
        ColumnSpec("call_count", "bigint", "bigint"),
        ColumnSpec("completed_call_count", "bigint", "bigint"),
        ColumnSpec("message_count", "bigint", "bigint"),
        ColumnSpec("outbound_activity_count", "bigint", "bigint"),
        ColumnSpec("inbound_activity_count", "bigint", "bigint"),
        ColumnSpec("has_contact_attempt", "boolean", "boolean"),
        ColumnSpec("has_completed_call", "boolean", "boolean"),
    ],
    "mart_rep_activity_daily": [
        ColumnSpec("activity_date", "string", "string"),
        ColumnSpec("actor_user_id", "string", "string"),
        ColumnSpec("calls_total", "bigint", "bigint"),
        ColumnSpec("calls_outbound", "bigint", "bigint"),
        ColumnSpec("calls_inbound", "bigint", "bigint"),
        ColumnSpec("calls_completed", "bigint", "bigint"),
        ColumnSpec("call_duration_seconds", "double", "double"),
        ColumnSpec("messages_total", "bigint", "bigint"),
        ColumnSpec("messages_outbound", "bigint", "bigint"),
        ColumnSpec("messages_inbound", "bigint", "bigint"),
        ColumnSpec("sms_messages", "bigint", "bigint"),
        ColumnSpec("email_messages", "bigint", "bigint"),
        ColumnSpec("facebook_messages", "bigint", "bigint"),
        ColumnSpec("instagram_messages", "bigint", "bigint"),
        ColumnSpec("unique_contacts_touched", "bigint", "bigint"),
        ColumnSpec("first_activity_at", "timestamp", "timestamp"),
        ColumnSpec("last_activity_at", "timestamp", "timestamp"),
    ],
}


def parse_s3_uri(uri: str) -> S3Uri:
    if not uri.startswith("s3://"):
        raise ValueError(f"not an S3 URI: {uri}")
    rest = uri[len("s3://") :]
    bucket, sep, key = rest.partition("/")
    if not bucket or not sep or not key:
        raise ValueError(f"S3 URI must include bucket and key: {uri}")
    return S3Uri(bucket=bucket, key=key)


def load_json_uri(uri: str) -> Any:
    if uri.startswith("s3://"):
        s3_uri = parse_s3_uri(uri)
        import boto3  # type: ignore

        body = boto3.client("s3").get_object(Bucket=s3_uri.bucket, Key=s3_uri.key)["Body"].read()
        return json.loads(body.decode("utf-8"))
    return json.loads(Path(uri).read_text(encoding="utf-8"))


def load_jsonl_uri(uri: str) -> list[dict[str, Any]]:
    if uri.startswith("s3://"):
        s3_uri = parse_s3_uri(uri)
        import boto3  # type: ignore

        body = boto3.client("s3").get_object(Bucket=s3_uri.bucket, Key=s3_uri.key)["Body"].read()
        lines = body.decode("utf-8").splitlines()
    else:
        lines = Path(uri).read_text(encoding="utf-8").splitlines()
    return [json.loads(line) for line in lines if line.strip()]


def load_manifest_and_raw(manifest_uri: str) -> tuple[dict[str, Any], dict[str, list[dict[str, Any]]]]:
    manifest = load_json_uri(manifest_uri)
    raw: dict[str, list[dict[str, Any]]] = {}
    for entity, payload in manifest.get("files", {}).items():
        source_uri = payload.get("s3_uri") or payload.get("local_path")
        if not source_uri:
            continue
        raw[entity] = [line.get("record", line) for line in load_jsonl_uri(str(source_uri))]
    return manifest, raw


def build_curated_tables(
    raw: dict[str, list[dict[str, Any]]],
    manifest: dict[str, Any],
) -> dict[str, TableData]:
    stage_lookup = build_stage_lookup(raw.get("pipelines", []))
    recording_lookup = build_recording_lookup(manifest.get("recordings", []))

    contacts = build_contacts(raw.get("contacts", []))
    opportunities = build_opportunities(raw.get("opportunities", []), stage_lookup)
    messages = build_messages(raw.get("messages", []))
    calls = build_calls(raw.get("call_message_details", []), recording_lookup)
    call_recordings = build_call_recordings(manifest.get("recordings", []))
    lead_response = build_mart_lead_response(opportunities, messages, calls)
    rep_activity = build_mart_rep_activity_daily(messages, calls)

    rows_by_table = {
        "contacts": contacts,
        "opportunities": opportunities,
        "messages": messages,
        "calls": calls,
        "call_recordings": call_recordings,
        "mart_lead_response": lead_response,
        "mart_rep_activity_daily": rep_activity,
    }
    return {
        name: TableData(name=name, columns=SCHEMAS[name], rows=rows_by_table[name])
        for name in TABLE_ORDER
    }


def build_stage_lookup(pipelines: Iterable[dict[str, Any]]) -> dict[tuple[str | None, str | None], dict[str, Any]]:
    lookup: dict[tuple[str | None, str | None], dict[str, Any]] = {}
    for pipeline in pipelines:
        pipeline_id = as_str(pipeline.get("id"))
        pipeline_name = as_str(pipeline.get("name"))
        for stage in pipeline.get("stages") or []:
            stage_id = as_str(stage.get("id"))
            value = {
                "pipeline_id": pipeline_id,
                "pipeline_name": pipeline_name,
                "stage_id": stage_id,
                "stage_name": as_str(stage.get("name")),
                "stage_position": as_int(stage.get("position")),
            }
            lookup[(pipeline_id, stage_id)] = value
            lookup[(None, stage_id)] = value
    return lookup


def build_recording_lookup(recordings: Iterable[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    return {str(item["message_id"]): item for item in recordings if item.get("message_id")}


def build_contacts(records: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    rows = []
    for record in records:
        rows.append(
            {
                "contact_id": as_str(record.get("id")),
                "location_id": as_str(record.get("locationId")),
                "contact_name": as_str(record.get("contactName")),
                "first_name": as_str(record.get("firstName") or record.get("firstNameRaw")),
                "last_name": as_str(record.get("lastName") or record.get("lastNameRaw")),
                "phone": as_str(record.get("phone")),
                "email": as_str(record.get("email")),
                "source": as_str(record.get("source")),
                "assigned_to_user_id": as_str(record.get("assignedTo")),
                "contact_type": as_str(record.get("type")),
                "city": as_str(record.get("city")),
                "state": as_str(record.get("state")),
                "postal_code": as_str(record.get("postalCode")),
                "country": as_str(record.get("country")),
                "tags_json": json_blob(record.get("tags")),
                "custom_fields_json": json_blob(record.get("customFields")),
                "attributions_json": json_blob(record.get("attributions")),
                "date_added": parse_timestamp(record.get("dateAdded")),
                "date_updated": parse_timestamp(record.get("dateUpdated")),
                "raw_json": json_blob(record),
            }
        )
    return sorted(rows, key=lambda row: row.get("date_added") or datetime.min)


def build_opportunities(
    records: Iterable[dict[str, Any]],
    stage_lookup: dict[tuple[str | None, str | None], dict[str, Any]],
) -> list[dict[str, Any]]:
    rows = []
    for record in records:
        pipeline_id = as_str(record.get("pipelineId"))
        stage_id = as_str(record.get("pipelineStageId") or record.get("pipelineStageUId"))
        stage = stage_lookup.get((pipeline_id, stage_id)) or stage_lookup.get((None, stage_id)) or {}
        contact = record.get("contact") if isinstance(record.get("contact"), dict) else {}
        rows.append(
            {
                "opportunity_id": as_str(record.get("id")),
                "contact_id": as_str(record.get("contactId") or contact.get("id")),
                "location_id": as_str(record.get("locationId")),
                "opportunity_name": as_str(record.get("name")),
                "pipeline_id": pipeline_id,
                "pipeline_name": as_str(stage.get("pipeline_name")),
                "pipeline_stage_id": stage_id,
                "pipeline_stage_name": as_str(stage.get("stage_name")),
                "pipeline_stage_position": as_int(stage.get("stage_position")),
                "status": as_str(record.get("status")),
                "source": as_str(record.get("source")),
                "assigned_to_user_id": as_str(record.get("assignedTo")),
                "monetary_value": as_float(record.get("monetaryValue")),
                "effective_probability": as_float(record.get("effectiveProbability")),
                "created_at": parse_timestamp(record.get("createdAt")),
                "updated_at": parse_timestamp(record.get("updatedAt")),
                "last_stage_change_at": parse_timestamp(record.get("lastStageChangeAt")),
                "last_status_change_at": parse_timestamp(record.get("lastStatusChangeAt")),
                "contact_name": as_str(contact.get("name")),
                "contact_phone": as_str(contact.get("phone")),
                "contact_email": as_str(contact.get("email")),
                "custom_fields_json": json_blob(record.get("customFields")),
                "attributions_json": json_blob(record.get("attributions")),
                "raw_json": json_blob(record),
            }
        )
    return sorted(rows, key=lambda row: row.get("created_at") or datetime.min)


def build_messages(records: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    rows = []
    for record in records:
        rows.append(
            {
                "message_id": as_str(record.get("id") or record.get("messageId")),
                "conversation_id": as_str(record.get("conversationId")),
                "contact_id": as_str(record.get("contactId")),
                "location_id": as_str(record.get("locationId")),
                "message_type": as_str(record.get("messageType")),
                "direction": as_str(record.get("direction")),
                "status": as_str(record.get("status")),
                "body": as_str(record.get("body")),
                "from_phone": as_str(record.get("from")),
                "to_phone": as_str(record.get("to")),
                "content_type": as_str(record.get("contentType")),
                "actor_user_id": as_str(record.get("userId")),
                "source": as_str(record.get("source")),
                "date_added": parse_timestamp(record.get("dateAdded")),
                "date_updated": parse_timestamp(record.get("dateUpdated")),
                "attachments_json": json_blob(record.get("attachments")),
                "activity_json": json_blob(record.get("activity")),
                "meta_json": json_blob(record.get("meta")),
                "error_json": json_blob(record.get("error")),
                "raw_json": json_blob(record),
            }
        )
    return sorted(rows, key=lambda row: row.get("date_added") or datetime.min)


def build_calls(
    records: Iterable[dict[str, Any]],
    recording_lookup: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    rows = []
    for record in records:
        message_id = as_str(record.get("id") or record.get("messageId"))
        recording = recording_lookup.get(message_id or "") or {}
        meta_call = nested_dict(record, "meta", "call")
        archival_status = as_str(recording.get("archival_status")) or ("archived" if recording.get("s3_uri") else None)
        rows.append(
            {
                "call_message_id": message_id,
                "conversation_id": as_str(record.get("conversationId")),
                "contact_id": as_str(record.get("contactId")),
                "location_id": as_str(record.get("locationId")),
                "actor_user_id": as_str(record.get("userId")),
                "direction": as_str(record.get("direction")),
                "status": as_str(record.get("status")),
                "call_status": as_str(meta_call.get("status")),
                "duration_seconds": as_float(meta_call.get("duration")),
                "from_phone": as_str(record.get("from")),
                "to_phone": as_str(record.get("to")),
                "source": as_str(record.get("source")),
                "alt_id": as_str(record.get("altId")),
                "has_recording": bool(recording.get("s3_uri")),
                "recording_s3_uri": as_str(recording.get("s3_uri")),
                "recording_object_key": as_str(recording.get("object_key")),
                "recording_content_type": as_str(recording.get("content_type")),
                "recording_byte_count": as_int(recording.get("byte_count")),
                "recording_sha256": as_str(recording.get("sha256")),
                "recording_archival_status": archival_status,
                "recording_unavailable_reason": as_str(recording.get("reason")),
                "date_added": parse_timestamp(record.get("dateAdded")),
                "date_updated": parse_timestamp(record.get("dateUpdated")),
                "raw_json": json_blob(record),
            }
        )
    return sorted(rows, key=lambda row: row.get("date_added") or datetime.min)


def build_call_recordings(recordings: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    rows = []
    for record in recordings:
        status = as_str(record.get("archival_status")) or ("archived" if record.get("s3_uri") else None)
        rows.append(
            {
                "message_id": as_str(record.get("message_id")),
                "archival_status": status,
                "s3_uri": as_str(record.get("s3_uri")),
                "object_key": as_str(record.get("object_key")),
                "content_type": as_str(record.get("content_type")),
                "byte_count": as_int(record.get("byte_count")),
                "sha256": as_str(record.get("sha256")),
                "unavailable_reason": as_str(record.get("reason")),
                "archived_at": parse_timestamp(record.get("archived_at")),
                "endpoint": as_str(record.get("endpoint")),
            }
        )
    return sorted(rows, key=lambda row: (row.get("message_id") or ""))


def build_mart_lead_response(
    opportunities: list[dict[str, Any]],
    messages: list[dict[str, Any]],
    calls: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    messages_by_contact = group_by(messages, "contact_id")
    calls_by_contact = group_by(calls, "contact_id")
    rows = []
    for opportunity in opportunities:
        contact_id = opportunity.get("contact_id")
        created_at = opportunity.get("created_at")
        contact_messages = [
            item
            for item in messages_by_contact.get(contact_id, [])
            if item.get("message_type") != "TYPE_CALL" and on_or_after(item.get("date_added"), created_at)
        ]
        contact_calls = [
            item for item in calls_by_contact.get(contact_id, []) if on_or_after(item.get("date_added"), created_at)
        ]
        outbound_messages = [
            item for item in contact_messages if lower(item.get("direction")) == "outbound" and item.get("date_added")
        ]
        outbound_calls = [
            item for item in contact_calls if lower(item.get("direction")) == "outbound" and item.get("date_added")
        ]
        completed_calls = [
            item
            for item in contact_calls
            if lower(item.get("status")) == "completed" or lower(item.get("call_status")) == "completed"
        ]

        first_outbound_call = first_by_time(outbound_calls)
        first_completed_call = first_by_time(completed_calls)
        first_outbound_message = first_by_time(outbound_messages)
        first_response = first_by_time(
            [item for item in (first_outbound_call, first_outbound_message) if item is not None]
        )
        outbound_activity_count = sum(1 for item in contact_calls + contact_messages if lower(item.get("direction")) == "outbound")
        inbound_activity_count = sum(1 for item in contact_calls + contact_messages if lower(item.get("direction")) == "inbound")

        rows.append(
            {
                "opportunity_id": opportunity.get("opportunity_id"),
                "contact_id": contact_id,
                "assigned_to_user_id": opportunity.get("assigned_to_user_id"),
                "pipeline_stage_name": opportunity.get("pipeline_stage_name"),
                "opportunity_status": opportunity.get("status"),
                "lead_created_at": created_at,
                "first_outbound_call_at": value_at(first_outbound_call, "date_added"),
                "first_outbound_call_user_id": value_at(first_outbound_call, "actor_user_id"),
                "minutes_to_first_outbound_call": minutes_between(created_at, value_at(first_outbound_call, "date_added")),
                "first_completed_call_at": value_at(first_completed_call, "date_added"),
                "minutes_to_first_completed_call": minutes_between(created_at, value_at(first_completed_call, "date_added")),
                "first_outbound_message_at": value_at(first_outbound_message, "date_added"),
                "first_outbound_message_type": value_at(first_outbound_message, "message_type"),
                "minutes_to_first_outbound_message": minutes_between(created_at, value_at(first_outbound_message, "date_added")),
                "first_response_at": value_at(first_response, "date_added"),
                "minutes_to_first_response": minutes_between(created_at, value_at(first_response, "date_added")),
                "call_count": len(contact_calls),
                "completed_call_count": len(completed_calls),
                "message_count": len(contact_messages),
                "outbound_activity_count": outbound_activity_count,
                "inbound_activity_count": inbound_activity_count,
                "has_contact_attempt": bool(outbound_calls or outbound_messages),
                "has_completed_call": bool(completed_calls),
            }
        )
    return sorted(rows, key=lambda row: row.get("lead_created_at") or datetime.min)


def build_mart_rep_activity_daily(
    messages: list[dict[str, Any]],
    calls: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    buckets: dict[tuple[str, str], dict[str, Any]] = {}

    for call in calls:
        event_at = call.get("date_added")
        activity_date = date_key(event_at)
        if not activity_date:
            continue
        actor = call.get("actor_user_id") or "unknown"
        bucket = activity_bucket(buckets, activity_date, actor)
        bucket["calls_total"] += 1
        bucket["calls_outbound"] += 1 if lower(call.get("direction")) == "outbound" else 0
        bucket["calls_inbound"] += 1 if lower(call.get("direction")) == "inbound" else 0
        bucket["calls_completed"] += 1 if lower(call.get("status")) == "completed" or lower(call.get("call_status")) == "completed" else 0
        bucket["call_duration_seconds"] += call.get("duration_seconds") or 0
        remember_contact(bucket, call.get("contact_id"))
        remember_time(bucket, event_at)

    for message in messages:
        if message.get("message_type") == "TYPE_CALL":
            continue
        event_at = message.get("date_added")
        activity_date = date_key(event_at)
        if not activity_date:
            continue
        actor = message.get("actor_user_id") or "unknown"
        bucket = activity_bucket(buckets, activity_date, actor)
        bucket["messages_total"] += 1
        bucket["messages_outbound"] += 1 if lower(message.get("direction")) == "outbound" else 0
        bucket["messages_inbound"] += 1 if lower(message.get("direction")) == "inbound" else 0
        message_type = message.get("message_type")
        bucket["sms_messages"] += 1 if message_type in {"TYPE_SMS", "TYPE_SMS_REACTION"} else 0
        bucket["email_messages"] += 1 if message_type == "TYPE_EMAIL" else 0
        bucket["facebook_messages"] += 1 if message_type == "TYPE_FACEBOOK" else 0
        bucket["instagram_messages"] += 1 if message_type == "TYPE_INSTAGRAM" else 0
        remember_contact(bucket, message.get("contact_id"))
        remember_time(bucket, event_at)

    rows = []
    for bucket in buckets.values():
        contacts = bucket.pop("_contacts")
        rows.append({**bucket, "unique_contacts_touched": len(contacts)})
    return sorted(rows, key=lambda row: (row["activity_date"], row["actor_user_id"]))


def write_curated_tables(
    tables: dict[str, TableData],
    *,
    snapshot_date: str,
    local_output_dir: str | Path,
    s3_bucket: str | None = None,
    s3_prefix: str = DEFAULT_CURATED_PREFIX,
) -> list[WrittenTable]:
    output_dir = Path(local_output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    s3_client = None
    if s3_bucket:
        import boto3  # type: ignore

        s3_client = boto3.client("s3")

    written: list[WrittenTable] = []
    for table_name in TABLE_ORDER:
        table = tables[table_name]
        local_dir = output_dir / table_name / f"snapshot_date={snapshot_date}"
        local_dir.mkdir(parents=True, exist_ok=True)
        local_path = local_dir / "part-00000.parquet"
        write_parquet(table, local_path)
        byte_count = local_path.stat().st_size
        key = None
        uri = None
        if s3_client and s3_bucket:
            key = f"{s3_prefix.strip('/')}/{table_name}/snapshot_date={snapshot_date}/part-00000.parquet"
            s3_client.upload_file(
                str(local_path),
                s3_bucket,
                key,
                ExtraArgs={
                    "ServerSideEncryption": "AES256",
                    "ContentType": "application/octet-stream",
                },
            )
            uri = f"s3://{s3_bucket}/{key}"
        written.append(
            WrittenTable(
                name=table_name,
                row_count=len(table.rows),
                s3_uri=uri,
                s3_key=key,
                byte_count=byte_count,
                object_count=1,
                local_path=str(local_path),
            )
        )
    return written


def write_parquet(table: TableData, path: str | Path) -> None:
    pa, pq = import_pyarrow()
    arrays = []
    for column in table.columns:
        values = [row.get(column.name) for row in table.rows]
        arrays.append(pa.array(values, type=arrow_type(pa, column.logical_type)))
    arrow_table = pa.Table.from_arrays(arrays, names=[column.name for column in table.columns])
    pq.write_table(arrow_table, path, compression="snappy")


def create_or_update_glue_tables(
    *,
    database_name: str,
    s3_bucket: str,
    s3_prefix: str,
    snapshot_date: str,
) -> list[GlueTableResult]:
    import boto3  # type: ignore
    from botocore.exceptions import ClientError  # type: ignore

    glue = boto3.client("glue")
    results: list[GlueTableResult] = []
    for table_name in TABLE_ORDER:
        table_location = f"s3://{s3_bucket}/{s3_prefix.strip('/')}/{table_name}/"
        partition_location = f"{table_location}snapshot_date={snapshot_date}/"
        table_input = glue_table_input(table_name, table_location)
        try:
            glue.get_table(DatabaseName=database_name, Name=table_name)
            glue.update_table(DatabaseName=database_name, TableInput=table_input)
            action = "updated"
        except ClientError as exc:
            if exc.response.get("Error", {}).get("Code") != "EntityNotFoundException":
                raise
            glue.create_table(DatabaseName=database_name, TableInput=table_input)
            action = "created"

        partition_input = {
            "Values": [snapshot_date],
            "StorageDescriptor": storage_descriptor(table_name, partition_location),
            "Parameters": {"classification": "parquet"},
        }
        try:
            glue.get_partition(
                DatabaseName=database_name,
                TableName=table_name,
                PartitionValues=[snapshot_date],
            )
            glue.update_partition(
                DatabaseName=database_name,
                TableName=table_name,
                PartitionValueList=[snapshot_date],
                PartitionInput=partition_input,
            )
        except ClientError as exc:
            if exc.response.get("Error", {}).get("Code") != "EntityNotFoundException":
                raise
            glue.create_partition(
                DatabaseName=database_name,
                TableName=table_name,
                PartitionInput=partition_input,
            )
        results.append(
            GlueTableResult(
                name=table_name,
                table_location=table_location,
                partition_location=partition_location,
                action=action,
            )
        )
    return results


def glue_table_input(table_name: str, location: str) -> dict[str, Any]:
    return {
        "Name": table_name,
        "Description": f"Gold Coast GHL curated {table_name} table.",
        "TableType": "EXTERNAL_TABLE",
        "Parameters": {
            "EXTERNAL": "TRUE",
            "classification": "parquet",
            "parquet.compression": "SNAPPY",
        },
        "PartitionKeys": [{"Name": "snapshot_date", "Type": "string"}],
        "StorageDescriptor": storage_descriptor(table_name, location),
    }


def storage_descriptor(table_name: str, location: str) -> dict[str, Any]:
    return {
        "Columns": [{"Name": column.name, "Type": column.glue_type} for column in SCHEMAS[table_name]],
        "Location": location,
        "InputFormat": "org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat",
        "OutputFormat": "org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat",
        "Compressed": True,
        "SerdeInfo": {
            "SerializationLibrary": "org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe",
            "Parameters": {"serialization.format": "1"},
        },
    }


def table_counts(tables: dict[str, TableData]) -> dict[str, int]:
    return {name: len(tables[name].rows) for name in TABLE_ORDER}


def written_summary(written: Iterable[WrittenTable]) -> list[dict[str, Any]]:
    return [
        {
            "table": item.name,
            "row_count": item.row_count,
            "s3_uri": item.s3_uri,
            "s3_key": item.s3_key,
            "object_count": item.object_count,
            "byte_count": item.byte_count,
            "local_path": item.local_path,
        }
        for item in written
    ]


def glue_summary(results: Iterable[GlueTableResult]) -> list[dict[str, str]]:
    return [
        {
            "table": item.name,
            "action": item.action,
            "table_location": item.table_location,
            "partition_location": item.partition_location,
        }
        for item in results
    ]


def import_pyarrow() -> tuple[Any, Any]:
    try:
        import pyarrow as pa  # type: ignore
        import pyarrow.parquet as pq  # type: ignore
    except ImportError as exc:
        raise RuntimeError("pyarrow is required to write curated Parquet tables") from exc
    return pa, pq


def arrow_type(pa: Any, logical_type: str) -> Any:
    if logical_type == "string":
        return pa.string()
    if logical_type == "bigint":
        return pa.int64()
    if logical_type == "double":
        return pa.float64()
    if logical_type == "boolean":
        return pa.bool_()
    if logical_type == "timestamp":
        return pa.timestamp("us")
    raise ValueError(f"unsupported logical type: {logical_type}")


def json_blob(value: Any) -> str | None:
    if value is None:
        return None
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), default=str)


def parse_timestamp(value: Any) -> datetime | None:
    if value in (None, ""):
        return None
    if isinstance(value, datetime):
        dt = value
    elif isinstance(value, (int, float)):
        number = float(value)
        seconds = number / 1000.0 if number > 10_000_000_000 else number
        dt = datetime.fromtimestamp(seconds, tz=timezone.utc)
    elif isinstance(value, str):
        raw = value.strip()
        if not raw:
            return None
        if raw.endswith("Z"):
            raw = f"{raw[:-1]}+00:00"
        try:
            dt = datetime.fromisoformat(raw)
        except ValueError:
            return None
    else:
        return None
    if dt.tzinfo is None:
        return dt
    return dt.astimezone(timezone.utc).replace(tzinfo=None)


def as_str(value: Any) -> str | None:
    if value in (None, ""):
        return None
    return str(value)


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


def nested_dict(record: dict[str, Any], *keys: str) -> dict[str, Any]:
    current: Any = record
    for key in keys:
        if not isinstance(current, dict):
            return {}
        current = current.get(key)
    return current if isinstance(current, dict) else {}


def group_by(rows: Iterable[dict[str, Any]], key: str) -> dict[Any, list[dict[str, Any]]]:
    grouped: dict[Any, list[dict[str, Any]]] = {}
    for row in rows:
        grouped.setdefault(row.get(key), []).append(row)
    return grouped


def first_by_time(rows: Iterable[dict[str, Any] | None]) -> dict[str, Any] | None:
    candidates = [row for row in rows if row and row.get("date_added")]
    if not candidates:
        return None
    return min(candidates, key=lambda row: row["date_added"])


def value_at(row: dict[str, Any] | None, key: str) -> Any:
    return row.get(key) if row else None


def on_or_after(event_at: Any, start_at: Any) -> bool:
    if event_at is None:
        return False
    if start_at is None:
        return True
    return event_at >= start_at


def minutes_between(start_at: Any, end_at: Any) -> float | None:
    if start_at is None or end_at is None:
        return None
    return round((end_at - start_at).total_seconds() / 60.0, 2)


def lower(value: Any) -> str:
    return str(value or "").lower()


def date_key(value: Any) -> str | None:
    if not isinstance(value, datetime):
        return None
    return value.date().isoformat()


def activity_bucket(
    buckets: dict[tuple[str, str], dict[str, Any]],
    activity_date: str,
    actor: str,
) -> dict[str, Any]:
    key = (activity_date, actor)
    if key not in buckets:
        buckets[key] = {
            "activity_date": activity_date,
            "actor_user_id": actor,
            "calls_total": 0,
            "calls_outbound": 0,
            "calls_inbound": 0,
            "calls_completed": 0,
            "call_duration_seconds": 0.0,
            "messages_total": 0,
            "messages_outbound": 0,
            "messages_inbound": 0,
            "sms_messages": 0,
            "email_messages": 0,
            "facebook_messages": 0,
            "instagram_messages": 0,
            "first_activity_at": None,
            "last_activity_at": None,
            "_contacts": set(),
        }
    return buckets[key]


def remember_contact(bucket: dict[str, Any], contact_id: Any) -> None:
    if contact_id:
        bucket["_contacts"].add(contact_id)


def remember_time(bucket: dict[str, Any], event_at: Any) -> None:
    if event_at is None:
        return
    first = bucket.get("first_activity_at")
    last = bucket.get("last_activity_at")
    bucket["first_activity_at"] = event_at if first is None or event_at < first else first
    bucket["last_activity_at"] = event_at if last is None or event_at > last else last


def run_curated_build(
    *,
    manifest_uri: str = DEFAULT_MANIFEST_S3_URI,
    snapshot_date: str = DEFAULT_SNAPSHOT_DATE,
    local_output_dir: str | Path = "data/curated",
    s3_bucket: str | None = DEFAULT_CURATED_BUCKET,
    s3_prefix: str = DEFAULT_CURATED_PREFIX,
    glue_database: str | None = DEFAULT_GLUE_DATABASE,
) -> dict[str, Any]:
    manifest, raw = load_manifest_and_raw(manifest_uri)
    tables = build_curated_tables(raw, manifest)
    written = write_curated_tables(
        tables,
        snapshot_date=snapshot_date,
        local_output_dir=local_output_dir,
        s3_bucket=s3_bucket,
        s3_prefix=s3_prefix,
    )
    glue_results: list[GlueTableResult] = []
    if glue_database and s3_bucket:
        glue_results = create_or_update_glue_tables(
            database_name=glue_database,
            s3_bucket=s3_bucket,
            s3_prefix=s3_prefix,
            snapshot_date=snapshot_date,
        )
    return {
        "manifest_uri": manifest_uri,
        "run_id": manifest.get("run_id"),
        "snapshot_date": snapshot_date,
        "table_counts": table_counts(tables),
        "written": written_summary(written),
        "glue": glue_summary(glue_results),
    }
