"""Read-only raw GHL extraction orchestration."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Iterable
from urllib.parse import parse_qsl, urlparse

from .client import GHLAPIError, GHLClient, extension_for_content_type
from .storage import LocalRunStorage, S3Uploader, recording_object_key


ENTITY_CONTACTS = "contacts"
ENTITY_PIPELINES = "pipelines"
ENTITY_OPPORTUNITIES = "opportunities"
ENTITY_CONVERSATIONS = "conversations"
ENTITY_MESSAGES = "messages"
ENTITY_CALL_DETAILS = "call_message_details"

ENTITY_ORDER = [
    ENTITY_CONTACTS,
    ENTITY_PIPELINES,
    ENTITY_OPPORTUNITIES,
    ENTITY_CONVERSATIONS,
    ENTITY_MESSAGES,
    ENTITY_CALL_DETAILS,
]

ENTITY_ALIASES = {
    "all": "all",
    "contacts": ENTITY_CONTACTS,
    "pipelines": ENTITY_PIPELINES,
    "pipeline-stages": ENTITY_PIPELINES,
    "pipeline_stages": ENTITY_PIPELINES,
    "opportunities": ENTITY_OPPORTUNITIES,
    "conversations": ENTITY_CONVERSATIONS,
    "messages": ENTITY_MESSAGES,
    "call-details": ENTITY_CALL_DETAILS,
    "call_details": ENTITY_CALL_DETAILS,
    "call-message-details": ENTITY_CALL_DETAILS,
    "call_message_details": ENTITY_CALL_DETAILS,
}


@dataclass
class ExtractOptions:
    page_limit: int = 100
    max_items: int | None = None
    max_pages: int | None = None
    dry_run: bool = False
    pipeline_ids: list[str] = field(default_factory=list)
    conversation_ids: list[str] = field(default_factory=list)
    message_ids: list[str] = field(default_factory=list)
    download_recordings: bool = False
    max_recordings: int = 1
    recording_max_bytes: int = 100 * 1024 * 1024


class GHLRawExtractor:
    def __init__(
        self,
        client: GHLClient,
        storage: LocalRunStorage,
        *,
        location_id: str,
        s3_uploader: S3Uploader | None = None,
        options: ExtractOptions | None = None,
    ) -> None:
        self.client = client
        self.storage = storage
        self.location_id = location_id
        self.s3_uploader = s3_uploader
        self.options = options or ExtractOptions()
        self.counts: dict[str, int] = {entity: 0 for entity in ENTITY_ORDER}
        self.pages: dict[str, int] = {entity: 0 for entity in ENTITY_ORDER}
        self.discovered_pipeline_ids: list[str] = []
        self.discovered_conversation_ids: list[str] = []
        self.discovered_call_message_ids: list[str] = []
        self.recording_attempts = 0

        if self.options.download_recordings and not self.s3_uploader:
            raise ValueError("recording downloads require --s3-bucket so audio is stored only as encrypted S3 objects")
        if self.options.dry_run and self.options.download_recordings:
            raise ValueError("--dry-run cannot be combined with --download-recordings")

    def run(self, entities: Iterable[str]) -> dict[str, Any]:
        normalized = normalize_entities(list(entities))
        for entity in normalized:
            if entity == ENTITY_CONTACTS:
                self.extract_contacts()
            elif entity == ENTITY_PIPELINES:
                self.extract_pipelines()
            elif entity == ENTITY_OPPORTUNITIES:
                self.extract_opportunities()
            elif entity == ENTITY_CONVERSATIONS:
                self.extract_conversations()
            elif entity == ENTITY_MESSAGES:
                self.extract_messages()
            elif entity == ENTITY_CALL_DETAILS:
                self.extract_call_message_details()
            else:
                raise ValueError(f"unsupported entity: {entity}")

        summary = {
            "dry_run": self.options.dry_run,
            "page_limit": self.options.page_limit,
            "max_items": self.options.max_items,
            "max_pages": self.options.max_pages,
            "download_recordings": self.options.download_recordings,
            "entity_counts": {entity: self.counts.get(entity, 0) for entity in normalized},
            "entity_pages": {entity: self.pages.get(entity, 0) for entity in normalized},
            "recording_attempts": self.recording_attempts,
        }
        return self.storage.finalize(summary)

    def extract_contacts(self) -> None:
        self._extract_paginated(
            ENTITY_CONTACTS,
            "/contacts/",
            {"locationId": self.location_id},
            item_keys=("contacts",),
        )

    def extract_pipelines(self) -> None:
        if self._limit_reached(ENTITY_PIPELINES):
            return
        endpoint = "/opportunities/pipelines"
        params = {"locationId": self.location_id}
        payload = self.client.get_json(endpoint, params)
        items = extract_items(payload, ("pipelines", "data"))
        if not items and payload:
            items = [payload]
        for index, item in enumerate(items):
            if self._limit_reached(ENTITY_PIPELINES):
                break
            self.storage.write_record(
                ENTITY_PIPELINES,
                endpoint=endpoint,
                request_params=params,
                page_number=1,
                record_index=index,
                record=item,
            )
            self.counts[ENTITY_PIPELINES] += 1
            pipeline_id = first_present(item, ("id", "pipelineId", "_id"))
            if pipeline_id and str(pipeline_id) not in self.discovered_pipeline_ids:
                self.discovered_pipeline_ids.append(str(pipeline_id))
        self.pages[ENTITY_PIPELINES] = max(self.pages[ENTITY_PIPELINES], 1)
        self.storage.checkpoint(
            ENTITY_PIPELINES,
            endpoint=endpoint,
            request_params=params,
            page_number=1,
            records_seen=self.counts[ENTITY_PIPELINES],
        )

    def extract_opportunities(self) -> None:
        pipeline_ids = self.options.pipeline_ids or self._ensure_pipeline_ids()
        if not pipeline_ids:
            self._extract_paginated(
                ENTITY_OPPORTUNITIES,
                "/opportunities/search",
                {"location_id": self.location_id},
                item_keys=("opportunities", "data"),
            )
            return
        for pipeline_id in pipeline_ids:
            if self._limit_reached(ENTITY_OPPORTUNITIES):
                break
            self._extract_paginated(
                ENTITY_OPPORTUNITIES,
                "/opportunities/search",
                {"location_id": self.location_id, "pipeline_id": pipeline_id},
                item_keys=("opportunities", "data"),
            )

    def extract_conversations(self) -> None:
        endpoint = "/conversations/search"
        base_params = {
            "locationId": self.location_id,
            "sortBy": "last_message_date",
            "sort": "desc",
            "limit": self.options.page_limit,
        }
        params = dict(base_params)
        seen_ids: set[str] = set()

        while not self._limit_reached(ENTITY_CONVERSATIONS):
            if self.options.max_pages is not None and self.pages[ENTITY_CONVERSATIONS] >= self.options.max_pages:
                break

            self.pages[ENTITY_CONVERSATIONS] += 1
            payload = self.client.get_json(endpoint, params)
            items = extract_items(payload, ("conversations", "data"))

            if not items:
                self.storage.checkpoint(
                    ENTITY_CONVERSATIONS,
                    endpoint=endpoint,
                    request_params=params,
                    page_number=self.pages[ENTITY_CONVERSATIONS],
                    records_seen=self.counts[ENTITY_CONVERSATIONS],
                )
                break

            new_records = 0
            for index, item in enumerate(items):
                if self._limit_reached(ENTITY_CONVERSATIONS):
                    break
                conversation_id = first_present(item, ("id", "conversationId", "_id"))
                if conversation_id and str(conversation_id) in seen_ids:
                    continue
                if conversation_id:
                    seen_ids.add(str(conversation_id))
                self.storage.write_record(
                    ENTITY_CONVERSATIONS,
                    endpoint=endpoint,
                    request_params=params,
                    page_number=self.pages[ENTITY_CONVERSATIONS],
                    record_index=index,
                    record=item,
                )
                self.counts[ENTITY_CONVERSATIONS] += 1
                new_records += 1
                self._remember_conversation(item)

            self.storage.checkpoint(
                ENTITY_CONVERSATIONS,
                endpoint=endpoint,
                request_params=params,
                page_number=self.pages[ENTITY_CONVERSATIONS],
                records_seen=self.counts[ENTITY_CONVERSATIONS],
            )

            total = first_present_nested(payload, ("total", "count"))
            if isinstance(total, int) and self.counts[ENTITY_CONVERSATIONS] >= total:
                break
            if len(items) < self.options.page_limit:
                break

            last_item = items[-1]
            last_message_date = first_present(last_item, ("lastMessageDate", "dateUpdated", "dateAdded"))
            if not last_message_date or new_records == 0:
                break
            params = {
                **base_params,
                "startAfterDate": last_message_date,
            }
            last_conversation_id = first_present(last_item, ("id", "conversationId", "_id"))
            if last_conversation_id:
                params["startAfterId"] = last_conversation_id

    def extract_messages(self) -> None:
        conversation_ids = self.options.conversation_ids or self._ensure_conversation_ids()
        for conversation_id in conversation_ids:
            if self._limit_reached(ENTITY_MESSAGES):
                break
            self._extract_paginated(
                ENTITY_MESSAGES,
                f"/conversations/{conversation_id}/messages",
                {"limit": self.options.page_limit},
                item_keys=("messages", "data"),
                on_item=self._remember_call_message,
            )

    def extract_call_message_details(self) -> None:
        message_ids = self.options.message_ids or self._ensure_call_message_ids()
        for message_id in message_ids:
            if self._limit_reached(ENTITY_CALL_DETAILS):
                break
            endpoint = f"/conversations/messages/{message_id}"
            payload = self.client.get_json(endpoint, None)
            record = extract_detail_record(payload)
            self.storage.write_record(
                ENTITY_CALL_DETAILS,
                endpoint=endpoint,
                request_params={},
                page_number=1,
                record_index=0,
                record=record,
            )
            self.counts[ENTITY_CALL_DETAILS] += 1
            self.pages[ENTITY_CALL_DETAILS] += 1
            self.storage.checkpoint(
                ENTITY_CALL_DETAILS,
                endpoint=endpoint,
                request_params={"messageId": message_id},
                page_number=self.pages[ENTITY_CALL_DETAILS],
                records_seen=self.counts[ENTITY_CALL_DETAILS],
            )
            if self.options.download_recordings:
                self.archive_recording(str(message_id))

    def archive_recording(self, message_id: str) -> None:
        if self.recording_attempts >= self.options.max_recordings:
            return
        if not self.s3_uploader:
            raise ValueError("recording archive requires S3 uploader")

        self.recording_attempts += 1
        endpoint = f"/conversations/messages/{message_id}/locations/{self.location_id}/recording"
        temp_path = self.storage.temp_recording_path(".bin")
        try:
            try:
                result = self.client.download_to_file(
                    endpoint,
                    temp_path,
                    max_bytes=self.options.recording_max_bytes,
                )
            except GHLAPIError as exc:
                if is_missing_recording_error(exc):
                    self.storage.add_recording(
                        {
                            "message_id": message_id,
                            "endpoint": endpoint,
                            "archival_status": "unavailable",
                            "reason": "message_does_not_have_recording",
                            "archived_at": self.storage.started_at.isoformat(),
                        }
                    )
                    return
                raise
            extension = extension_for_content_type(result.content_type)
            key = recording_object_key(message_id, self.storage.ingest_date, extension)
            if temp_path.suffix != extension:
                renamed = temp_path.with_suffix(extension)
                temp_path.rename(renamed)
                temp_path = renamed
            s3_uri = self.s3_uploader.upload_file(
                temp_path,
                key,
                content_type=result.content_type or "application/octet-stream",
            )
            self.storage.add_recording(
                {
                    "message_id": message_id,
                    "endpoint": endpoint,
                    "object_key": key,
                    "s3_uri": s3_uri,
                    "content_type": result.content_type,
                    "byte_count": result.byte_count,
                    "sha256": result.sha256,
                    "archived_at": self.storage.started_at.isoformat(),
                }
            )
        finally:
            try:
                temp_path.unlink(missing_ok=True)
            except OSError:
                pass

    def _extract_paginated(
        self,
        entity: str,
        endpoint: str,
        base_params: dict[str, Any],
        *,
        item_keys: tuple[str, ...],
        on_item: Any | None = None,
    ) -> None:
        params = dict(base_params)
        params.setdefault("limit", self.options.page_limit)

        while not self._limit_reached(entity):
            if self.options.max_pages is not None and self.pages[entity] >= self.options.max_pages:
                break

            self.pages[entity] += 1
            payload = self.client.get_json(endpoint, params)
            items = extract_items(payload, item_keys)

            if not items:
                self.storage.checkpoint(
                    entity,
                    endpoint=endpoint,
                    request_params=params,
                    page_number=self.pages[entity],
                    records_seen=self.counts[entity],
                )
                break

            for index, item in enumerate(items):
                if self._limit_reached(entity):
                    break
                self.storage.write_record(
                    entity,
                    endpoint=endpoint,
                    request_params=params,
                    page_number=self.pages[entity],
                    record_index=index,
                    record=item,
                )
                self.counts[entity] += 1
                if on_item:
                    on_item(item)

            self.storage.checkpoint(
                entity,
                endpoint=endpoint,
                request_params=params,
                page_number=self.pages[entity],
                records_seen=self.counts[entity],
            )

            next_params = next_page_params(payload, params, len(items), self.options.page_limit)
            if not next_params or next_params == params:
                break
            params = next_params

    def _ensure_pipeline_ids(self) -> list[str]:
        if not self.discovered_pipeline_ids and self.counts[ENTITY_PIPELINES] == 0:
            self.extract_pipelines()
        return self.discovered_pipeline_ids

    def _ensure_conversation_ids(self) -> list[str]:
        if not self.discovered_conversation_ids and self.counts[ENTITY_CONVERSATIONS] == 0:
            self.extract_conversations()
        return self.discovered_conversation_ids

    def _ensure_call_message_ids(self) -> list[str]:
        if not self.discovered_call_message_ids and self.counts[ENTITY_MESSAGES] == 0:
            self.extract_messages()
        return self.discovered_call_message_ids

    def _remember_conversation(self, item: dict[str, Any]) -> None:
        conversation_id = first_present(item, ("id", "conversationId", "_id"))
        if conversation_id and str(conversation_id) not in self.discovered_conversation_ids:
            self.discovered_conversation_ids.append(str(conversation_id))

    def _remember_call_message(self, item: dict[str, Any]) -> None:
        message_type = str(
            first_present(item, ("messageType", "type", "lastMessageType", "sourceType")) or ""
        ).upper()
        if "CALL" not in message_type:
            return
        message_id = first_present(item, ("id", "messageId", "_id"))
        if message_id and str(message_id) not in self.discovered_call_message_ids:
            self.discovered_call_message_ids.append(str(message_id))

    def _limit_reached(self, entity: str) -> bool:
        return self.options.max_items is not None and self.counts[entity] >= self.options.max_items


def normalize_entities(entities: list[str]) -> list[str]:
    if not entities:
        return list(ENTITY_ORDER)
    normalized: list[str] = []
    for entity in entities:
        key = entity.strip().lower()
        if key not in ENTITY_ALIASES:
            raise ValueError(f"unknown entity '{entity}'. Valid entities: {', '.join(sorted(ENTITY_ALIASES))}")
        alias = ENTITY_ALIASES[key]
        if alias == "all":
            for item in ENTITY_ORDER:
                if item not in normalized:
                    normalized.append(item)
            continue
        if alias not in normalized:
            normalized.append(alias)
    return normalized


def extract_items(payload: Any, item_keys: tuple[str, ...]) -> list[Any]:
    if isinstance(payload, list):
        return payload
    if not isinstance(payload, dict):
        return []

    for key in item_keys:
        value = payload.get(key)
        if isinstance(value, list):
            return value
        if isinstance(value, dict):
            nested = extract_items(value, item_keys + ("items", "records", "results"))
            if nested:
                return nested

    for wrapper_key in ("data", "meta"):
        value = payload.get(wrapper_key)
        if isinstance(value, dict):
            nested = extract_items(value, item_keys)
            if nested:
                return nested
    return []


def next_page_params(
    payload: Any,
    current_params: dict[str, Any],
    item_count: int,
    page_limit: int,
) -> dict[str, Any] | None:
    if item_count <= 0 or item_count < page_limit:
        return None
    if not isinstance(payload, dict):
        return _offset_params(current_params, page_limit)

    next_url = first_present_nested(payload, ("nextPageUrl", "nextUrl", "next"))
    if isinstance(next_url, str) and next_url.startswith("http"):
        parsed = urlparse(next_url)
        query = dict(parse_qsl(parsed.query))
        return {**current_params, **query} if query else None

    for key in ("nextPageToken", "nextCursor", "cursor", "nextCursorId", "lastMessageId"):
        value = first_present_nested(payload, (key,))
        if value:
            params = dict(current_params)
            params[key] = value
            params.pop("skip", None)
            return params

    next_page = first_present_nested(payload, ("nextPage",))
    if next_page:
        params = dict(current_params)
        params["page"] = next_page
        params.pop("skip", None)
        return params

    total = first_present_nested(payload, ("total", "count"))
    skip = int(current_params.get("skip") or 0)
    if isinstance(total, int) and skip + item_count >= total:
        return None
    return _offset_params(current_params, page_limit)


def _offset_params(current_params: dict[str, Any], page_limit: int) -> dict[str, Any]:
    params = dict(current_params)
    params["skip"] = int(params.get("skip") or 0) + page_limit
    return params


def first_present(item: Any, keys: tuple[str, ...]) -> Any | None:
    if not isinstance(item, dict):
        return None
    for key in keys:
        if key in item and item[key] not in (None, ""):
            return item[key]
    return None


def first_present_nested(payload: Any, keys: tuple[str, ...]) -> Any | None:
    if isinstance(payload, dict):
        value = first_present(payload, keys)
        if value is not None:
            return value
        for wrapper_key in ("meta", "data", "messages"):
            nested = payload.get(wrapper_key)
            if isinstance(nested, dict):
                value = first_present_nested(nested, keys)
                if value is not None:
                    return value
    return None


def extract_detail_record(payload: Any) -> Any:
    if isinstance(payload, dict):
        for key in ("message", "data"):
            value = payload.get(key)
            if isinstance(value, dict):
                return value
    return payload


def is_missing_recording_error(exc: GHLAPIError) -> bool:
    message = str(exc).lower()
    return ("http 404" in message or "http 422" in message) and (
        "does not have recording" in message or "recording does not exist" in message
    )


def make_s3_uploader(bucket: str | None, prefix: str = "", *, dry_run: bool = False) -> S3Uploader | None:
    if dry_run or not bucket:
        return None
    return S3Uploader(bucket, prefix)
