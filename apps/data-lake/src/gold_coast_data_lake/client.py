"""Small GET-only LeadConnector API client."""

from __future__ import annotations

from dataclasses import dataclass
import hashlib
import json
import mimetypes
from pathlib import Path
import time
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urljoin
from urllib.request import Request, urlopen

from .config import GHLConfig


TRANSIENT_HTTP_STATUS = {408, 409, 425, 429, 500, 502, 503, 504}


class GHLAPIError(RuntimeError):
    """Raised for LeadConnector API failures with secrets excluded."""


@dataclass(frozen=True)
class DownloadResult:
    path: Path
    content_type: str | None
    byte_count: int
    sha256: str
    filename: str | None


class GHLClient:
    """Read-only GHL client.

    The public request surface only permits GET. This is deliberate: the
    extractor must never mutate GHL while building the data lake.
    """

    def __init__(
        self,
        config: GHLConfig,
        *,
        timeout_seconds: float = 30.0,
        max_retries: int = 4,
        backoff_seconds: float = 0.75,
    ) -> None:
        self.config = config
        self.timeout_seconds = timeout_seconds
        self.max_retries = max_retries
        self.backoff_seconds = backoff_seconds

    def get_json(self, path: str, params: dict[str, Any] | None = None) -> dict[str, Any] | list[Any]:
        body, _headers = self._request("GET", path, params=params)
        if not body:
            return {}
        try:
            return json.loads(body.decode("utf-8"))
        except json.JSONDecodeError as exc:
            raise GHLAPIError(f"GET {path} returned non-JSON response") from exc

    def download_to_file(
        self,
        path: str,
        destination: Path,
        params: dict[str, Any] | None = None,
        *,
        max_bytes: int = 100 * 1024 * 1024,
    ) -> DownloadResult:
        body, headers = self._request("GET", path, params=params, max_bytes=max_bytes)
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(body)
        content_type = headers.get("content-type")
        sha256 = hashlib.sha256(body).hexdigest()
        filename = _filename_from_headers(headers.get("content-disposition"))
        return DownloadResult(
            path=destination,
            content_type=content_type,
            byte_count=len(body),
            sha256=sha256,
            filename=filename,
        )

    def request_json(self, method: str, path: str, params: dict[str, Any] | None = None) -> Any:
        """Testing hook that still enforces the GET-only contract."""

        body, _headers = self._request(method, path, params=params)
        return json.loads(body.decode("utf-8")) if body else {}

    def _request(
        self,
        method: str,
        path: str,
        *,
        params: dict[str, Any] | None = None,
        max_bytes: int | None = None,
    ) -> tuple[bytes, dict[str, str]]:
        method = method.upper()
        if method != "GET":
            raise ValueError(f"GHL extractor is read-only; refusing {method}")
        if not path.startswith("/"):
            raise ValueError(f"API path must start with '/': {path}")

        url = self._url(path, params)
        request = Request(url, method="GET", headers=self._headers())

        attempt = 0
        while True:
            try:
                with urlopen(request, timeout=self.timeout_seconds) as response:
                    body = response.read()
                    if max_bytes is not None and len(body) > max_bytes:
                        raise GHLAPIError(f"GET {path} exceeded max_bytes={max_bytes}")
                    headers = {key.lower(): value for key, value in response.headers.items()}
                    return body, headers
            except HTTPError as exc:
                body = exc.read(2048).decode("utf-8", errors="replace")
                if exc.code in TRANSIENT_HTTP_STATUS and attempt < self.max_retries:
                    self._sleep(attempt, retry_after=exc.headers.get("Retry-After"))
                    attempt += 1
                    continue
                message = _compact_error_body(body)
                raise GHLAPIError(f"GET {path} failed with HTTP {exc.code}: {message}") from exc
            except URLError as exc:
                if attempt < self.max_retries:
                    self._sleep(attempt)
                    attempt += 1
                    continue
                raise GHLAPIError(f"GET {path} failed: {exc.reason}") from exc

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.config.api_key}",
            "Version": self.config.api_version,
            "Accept": "application/json, audio/*, application/octet-stream",
            "User-Agent": "gold-coast-data-lake/0.1",
        }

    def _url(self, path: str, params: dict[str, Any] | None) -> str:
        url = urljoin(f"{self.config.base_url}/", path.lstrip("/"))
        if params:
            clean = {key: value for key, value in params.items() if value is not None}
            if clean:
                url = f"{url}?{urlencode(clean, doseq=True)}"
        return url

    def _sleep(self, attempt: int, retry_after: str | None = None) -> None:
        if retry_after:
            try:
                delay = min(float(retry_after), 30.0)
            except ValueError:
                delay = self.backoff_seconds
        else:
            delay = min(self.backoff_seconds * (2**attempt), 30.0)
        time.sleep(delay)


def extension_for_content_type(content_type: str | None) -> str:
    if not content_type:
        return ".bin"
    media_type = content_type.split(";", 1)[0].strip().lower()
    if media_type in {"audio/wav", "audio/x-wav"}:
        return ".wav"
    if media_type in {"audio/mpeg", "audio/mp3"}:
        return ".mp3"
    return mimetypes.guess_extension(media_type) or ".bin"


def _filename_from_headers(content_disposition: str | None) -> str | None:
    if not content_disposition:
        return None
    for part in content_disposition.split(";"):
        part = part.strip()
        if part.lower().startswith("filename="):
            return part.split("=", 1)[1].strip().strip('"')
    return None


def _compact_error_body(body: str) -> str:
    body = " ".join(body.split())
    if len(body) > 300:
        return f"{body[:300]}..."
    return body or "<empty response body>"
