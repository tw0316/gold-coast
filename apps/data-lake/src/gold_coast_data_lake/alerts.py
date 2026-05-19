"""Sanitized Slack alert support for data-lake batch refresh runs."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import json
import re
from typing import Any, Callable
from urllib.request import Request, urlopen


ALERT_MODES = {"off", "failure-only", "success-and-failure", "launch-window"}
SENSITIVE_TEXT_MARKERS = (
    "hooks.slack.com/",
    "authorization:",
    "bearer ",
    "x-api-key",
    "api_key",
    "apikey",
    "access_token",
    "refresh_token",
    "webhook",
    "secret",
    "password",
    "recording_url",
    "audio_url",
)
EMAIL_RE = re.compile(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", re.IGNORECASE)
PHONE_RE = re.compile(r"\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b")


@dataclass
class AlertConfig:
    webhook_url: str | None = None
    mode: str = "off"
    success_alert_until: str | None = None
    cloudwatch_log_url: str | None = None
    timeout_seconds: float = 5.0


AlertSender = Callable[[str, dict[str, Any], float], None]


def alert_callback(config: AlertConfig, *, sender: AlertSender | None = None) -> Callable[[dict[str, Any]], str]:
    sender = sender or post_json

    def callback(run_status: dict[str, Any]) -> str:
        decision = alert_decision(config, str(run_status.get("status") or "unknown"))
        if not decision:
            return "skipped_policy"
        if not config.webhook_url:
            return "skipped_missing_webhook"
        sender(config.webhook_url, slack_payload(run_status, config), config.timeout_seconds)
        return "posted"

    return callback


def alert_decision(config: AlertConfig, status: str, *, now: datetime | None = None) -> bool:
    mode = config.mode
    if mode not in ALERT_MODES:
        raise ValueError(f"unsupported alert mode: {mode}")
    if mode == "off":
        return False
    if status != "succeeded":
        return True
    if mode == "success-and-failure":
        return True
    if mode != "launch-window":
        return False
    until = require_success_alert_until(config.success_alert_until)
    current = now or datetime.now(timezone.utc)
    return current <= until


def slack_payload(run_status: dict[str, Any], config: AlertConfig) -> dict[str, Any]:
    status = str(run_status.get("status") or "unknown")
    run_id = truncate(safe_text(run_status.get("run_id")), 80)
    prefix = "Gold Coast data lake GHL refresh"
    text = f"{prefix} {status}: {run_id}"
    fields = [
        field("Status", status),
        field("Run ID", run_id),
        field("Duration", f"{float(run_status.get('duration_seconds') or 0):.1f}s"),
        field("Snapshot At", truncate(safe_text(run_status.get("snapshot_at")), 80)),
        field("Entities", compact_counts(run_status.get("entity_counts"))),
        field("Recordings", compact_counts(run_status.get("recordings"))),
    ]
    if config.cloudwatch_log_url:
        log_url = safe_text(config.cloudwatch_log_url)
        fields.append(field("Logs", f"<{log_url}|CloudWatch>"))
    error = run_status.get("error")
    if isinstance(error, dict):
        fields.append(field("Error", safe_text(error.get("class") or "unknown")))
        if error.get("message"):
            fields.append(field("Message", truncate(safe_text(error.get("message")), 240)))

    return {
        "text": text,
        "blocks": [
            {
                "type": "section",
                "text": {"type": "mrkdwn", "text": f"*{prefix}*\n{status}: `{run_id}`"},
            },
            {"type": "section", "fields": fields},
        ],
    }


def field(label: str, value: str) -> dict[str, str]:
    return {"type": "mrkdwn", "text": f"*{label}:*\n{truncate(value or 'n/a', 300)}"}


def compact_counts(value: Any) -> str:
    if not isinstance(value, dict) or not value:
        return "n/a"
    parts = []
    for key in sorted(value):
        item = value[key]
        if isinstance(item, (int, float)):
            parts.append(f"{safe_count_key(key)}={item}")
    return ", ".join(parts) if parts else "n/a"


def safe_text(value: Any) -> str:
    text = str(value or "n/a")
    lowered = text.lower()
    if (
        any(marker in lowered for marker in SENSITIVE_TEXT_MARKERS)
        or EMAIL_RE.search(text)
        or PHONE_RE.search(text)
        or looks_like_raw_payload(text)
    ):
        return "[redacted]"
    return " ".join(text.split())


def safe_count_key(value: Any) -> str:
    raw = str(value or "item")
    lowered = raw.lower()
    if any(marker in lowered for marker in SENSITIVE_TEXT_MARKERS):
        return "redacted"
    cleaned = "".join(char if char.isalnum() or char in ("_", "-", ".") else "_" for char in raw)
    return truncate(cleaned or "item", 48)


def looks_like_raw_payload(value: str) -> bool:
    return (("{" in value and "}" in value) or ("[" in value and "]" in value)) and ":" in value


def truncate(value: str, limit: int) -> str:
    if len(value) <= limit:
        return value
    return f"{value[: limit - 3]}..."


def parse_alert_time(value: str) -> datetime | None:
    raw = value.strip()
    if not raw:
        return None
    if raw.endswith("Z"):
        raw = f"{raw[:-1]}+00:00"
    try:
        parsed = datetime.fromisoformat(raw)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def require_success_alert_until(value: str | None) -> datetime:
    until = parse_alert_time(value or "")
    if until is None:
        raise ValueError("SUCCESS_ALERT_UNTIL is required for launch-window success alerts")
    return until


def post_json(webhook_url: str, payload: dict[str, Any], timeout_seconds: float) -> None:
    body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    request = Request(
        webhook_url,
        data=body,
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    with urlopen(request, timeout=timeout_seconds) as response:
        response.read()
