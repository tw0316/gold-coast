"""Runtime configuration loading for the read-only GHL extractor."""

from __future__ import annotations

from dataclasses import dataclass
import os
from pathlib import Path


DEFAULT_BASE_URL = "https://services.leadconnectorhq.com"
DEFAULT_API_VERSION = "2021-07-28"


@dataclass(frozen=True)
class GHLConfig:
    api_key: str
    location_id: str
    api_version: str = DEFAULT_API_VERSION
    base_url: str = DEFAULT_BASE_URL


def _strip_quotes(value: str) -> str:
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
        return value[1:-1]
    return value


def read_env_file(path: str | Path | None) -> dict[str, str]:
    """Read a simple KEY=VALUE env file without printing or exporting secrets."""

    if path is None:
        return {}

    env_path = Path(path).expanduser()
    if not env_path.exists():
        raise FileNotFoundError(f"env file not found: {env_path}")

    values: dict[str, str] = {}
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[len("export ") :].strip()
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        if not key:
            continue
        values[key] = _strip_quotes(value)
    return values


def load_ghl_config(
    env_file: str | Path | None = None,
    *,
    api_version: str | None = None,
    base_url: str | None = None,
) -> GHLConfig:
    """Load GHL credentials from an optional env file plus the process env."""

    file_values = read_env_file(env_file)

    def get(name: str, default: str | None = None) -> str | None:
        return os.environ.get(name) or file_values.get(name) or default

    api_key = get("GHL_API_KEY")
    location_id = get("GHL_LOCATION_ID")
    resolved_version = api_version or get("GHL_API_VERSION", DEFAULT_API_VERSION)
    resolved_base_url = (base_url or get("GHL_BASE_URL", DEFAULT_BASE_URL) or DEFAULT_BASE_URL).rstrip("/")

    missing = [name for name, value in (("GHL_API_KEY", api_key), ("GHL_LOCATION_ID", location_id)) if not value]
    if missing:
        joined = ", ".join(missing)
        raise ValueError(f"missing required GHL config: {joined}")

    return GHLConfig(
        api_key=str(api_key),
        location_id=str(location_id),
        api_version=str(resolved_version),
        base_url=resolved_base_url,
    )
