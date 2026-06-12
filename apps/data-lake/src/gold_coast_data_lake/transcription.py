"""Local transcription helpers for archived Gold Coast GHL call recordings."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
import hashlib
import json
import math
import os
from pathlib import Path
import re
import subprocess
import tempfile
from typing import Any, Callable, Iterable, Mapping


DEFAULT_PROVIDER = "openai"
DEFAULT_TRANSCRIPTION_MODEL = "gpt-4o-transcribe"
DEFAULT_FALLBACK_TRANSCRIPTION_MODEL = "whisper-1"
DEFAULT_ARTIFACT_SCHEMA_VERSION = "v1"
LONG_AUDIO_DURATION_SECONDS = 1380
CHUNKED_TRANSCRIPTION_DURATION_SECONDS = 9 * 60
TRANSCRIPTION_CHUNK_SECONDS = 8 * 60
TRANSCRIPTION_CHUNK_OVERLAP_SECONDS = 10
TRANSCRIPTION_RETRY_CHUNK_SECONDS = 4 * 60
OUTPUT_TOKEN_INCOMPLETE_THRESHOLD = 1900
TRANSCRIPT_ARTIFACT_PREFIX = "ai-artifacts/ghl/transcripts"

TRANSCRIPT_ROW_COLUMNS = (
    "call_message_id",
    "conversation_id",
    "contact_id",
    "opportunity_id",
    "actor_user_id",
    "direction",
    "call_status",
    "recording_s3_uri",
    "recording_object_key",
    "recording_sha256",
    "recording_content_type",
    "recording_byte_count",
    "recording_duration_seconds",
    "transcription_status",
    "transcript_text",
    "transcript_segments_json",
    "language",
    "provider",
    "transcription_model",
    "artifact_schema_version",
    "idempotency_key",
    "transcript_object_key",
    "provider_response_object_key",
    "usage_json",
    "error_json",
    "attempt_count",
    "first_attempted_at",
    "last_attempted_at",
    "transcribed_at",
    "source_call_run_id",
    "source_recording_run_id",
    "source_call_snapshot_at",
    "source_recording_snapshot_at",
    "run_id",
    "snapshot_at",
)

SENSITIVE_ERROR_KEY_PARTS = (
    "api_key",
    "apikey",
    "authorization",
    "audio",
    "body",
    "credential",
    "email",
    "file",
    "password",
    "payload",
    "phone",
    "presigned",
    "recording",
    "secret",
    "text",
    "token",
    "transcript",
    "uri",
    "url",
    "webhook",
)
S3_URI_RE = re.compile(r"s3://[^\s'\"<>]+", re.IGNORECASE)
RECORDING_OBJECT_KEY_RE = re.compile(r"\brecordings/ghl/[^\s'\"<>]+", re.IGNORECASE)
URL_RE = re.compile(r"https?://[^\s'\"<>]+", re.IGNORECASE)
EMAIL_RE = re.compile(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", re.IGNORECASE)
PHONE_RE = re.compile(r"\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b")
BEARER_RE = re.compile(r"\bBearer\s+[A-Za-z0-9._~+/=-]+", re.IGNORECASE)
OPENAI_KEY_RE = re.compile(r"\bsk-[A-Za-z0-9_-]{12,}\b")
CREDENTIAL_ASSIGNMENT_RE = re.compile(
    r"(?i)\b(api[_-]?key|access[_-]?token|secret|password|authorization)\s*[:=]\s*[^,\s;]+"
)


@dataclass(frozen=True)
class IdempotencyParts:
    call_message_id: str
    recording_sha256: str | None
    artifact_schema_version: str
    provider: str
    transcription_model: str


@dataclass(frozen=True)
class DownloadedRecording:
    bucket: str
    key: str
    path: Path
    content_type: str | None
    byte_count: int
    sha256: str


@dataclass(frozen=True)
class TranscodedAudio:
    path: Path
    content_type: str
    bitrate_kbps: int


@dataclass(frozen=True)
class TranscriptionPlan:
    model: str
    use_fallback: bool
    needs_transcode: bool
    reason: str


@dataclass(frozen=True)
class TranscriptionWindow:
    index: int
    start_seconds: float
    end_seconds: float

    @property
    def duration_seconds(self) -> float:
        return max(0.0, self.end_seconds - self.start_seconds)


@dataclass(frozen=True)
class ProviderAttempt:
    model: str
    status: str
    error: dict[str, Any] | None = None


@dataclass(frozen=True)
class ProviderTranscription:
    provider: str
    model: str
    response: Any
    attempts: tuple[ProviderAttempt, ...] = field(default_factory=tuple)
    audio_path: Path | None = None
    content_type: str | None = None


class TranscriptionProviderError(RuntimeError):
    """Provider attempts failed; message and attempts are already sanitized."""

    def __init__(self, message: str, attempts: Iterable[ProviderAttempt]) -> None:
        super().__init__(message)
        self.attempts = tuple(attempts)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def isoformat(moment: datetime | str | None) -> str | None:
    if moment is None:
        return None
    if isinstance(moment, str):
        return moment
    return moment.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def build_idempotency_source(
    call_message_id: str,
    recording_sha256: str | None,
    artifact_schema_version: str,
    provider: str,
    transcription_model: str,
) -> str:
    required = {
        "call_message_id": call_message_id,
        "artifact_schema_version": artifact_schema_version,
        "provider": provider,
        "transcription_model": transcription_model,
    }
    missing = [name for name, value in required.items() if value in (None, "")]
    if missing:
        raise ValueError(f"missing idempotency fields: {', '.join(missing)}")
    parts = IdempotencyParts(
        call_message_id=str(call_message_id),
        recording_sha256=recording_sha256 or "",
        artifact_schema_version=str(artifact_schema_version),
        provider=str(provider),
        transcription_model=str(transcription_model),
    )
    return "|".join(
        [
            parts.call_message_id,
            parts.recording_sha256 or "",
            parts.artifact_schema_version,
            parts.provider,
            parts.transcription_model,
        ]
    )


def build_idempotency_key(
    call_message_id: str,
    recording_sha256: str | None,
    artifact_schema_version: str,
    provider: str,
    transcription_model: str,
) -> str:
    source = build_idempotency_source(
        call_message_id,
        recording_sha256,
        artifact_schema_version,
        provider,
        transcription_model,
    )
    return hashlib.sha256(source.encode("utf-8")).hexdigest()


def safe_partition_value(value: Any, *, fallback: str = "unknown") -> str:
    text = str(value) if value not in (None, "") else fallback
    safe = "".join(ch if ch.isalnum() or ch in {"-", "_", "."} else "_" for ch in text)
    return safe[:200] or fallback


def build_transcript_artifact_key(
    *,
    call_message_id: str,
    recording_sha256: str | None,
    artifact_schema_version: str,
    provider: str,
    transcription_model: str,
    run_id: str,
    prefix: str = TRANSCRIPT_ARTIFACT_PREFIX,
) -> str:
    return "/".join(
        [
            prefix.strip("/"),
            safe_partition_value(artifact_schema_version),
            f"message_id={safe_partition_value(call_message_id)}",
            f"recording_sha256={safe_partition_value(recording_sha256, fallback='none')}",
            f"provider={safe_partition_value(provider)}",
            f"model={safe_partition_value(transcription_model)}",
            f"run={safe_partition_value(run_id)}.json",
        ]
    )


def download_private_s3_recording(
    *,
    bucket: str,
    key: str,
    destination_path: str | Path | None = None,
    s3_client: Any | None = None,
    max_bytes: int | None = None,
) -> DownloadedRecording:
    """Download a private S3 recording through an injected client or lazy boto3 client.

    This helper intentionally does not log or print bucket/key/URI values. Callers should
    put only sanitized failures into run status.
    """

    if s3_client is None:
        try:
            import boto3  # type: ignore
        except ImportError as exc:  # pragma: no cover - runtime packaging path
            raise RuntimeError("boto3 is required for S3 recording download") from exc
        s3_client = boto3.client("s3")

    response = s3_client.get_object(Bucket=bucket, Key=key)
    content_type = response.get("ContentType")
    suffix = suffix_for_recording(key, content_type)
    output_path = resolve_download_path(destination_path, suffix)
    body = response["Body"]
    hasher = hashlib.sha256()
    byte_count = 0
    try:
        with output_path.open("wb") as handle:
            for chunk in iter_body_chunks(body):
                if not chunk:
                    continue
                byte_count += len(chunk)
                if max_bytes is not None and byte_count > max_bytes:
                    raise ValueError("recording exceeded configured byte limit")
                hasher.update(chunk)
                handle.write(chunk)
    except Exception:
        if output_path.exists():
            output_path.unlink()
        raise
    finally:
        close = getattr(body, "close", None)
        if callable(close):
            close()

    return DownloadedRecording(
        bucket=bucket,
        key=key,
        path=output_path,
        content_type=content_type,
        byte_count=byte_count,
        sha256=hasher.hexdigest(),
    )


def resolve_download_path(destination_path: str | Path | None, suffix: str) -> Path:
    if destination_path is None:
        handle, raw_path = tempfile.mkstemp(prefix="ghl-recording-", suffix=suffix)
        os.close(handle)
        return Path(raw_path)
    path = Path(destination_path)
    if path.exists() and path.is_dir():
        path = path / f"recording{suffix}"
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def iter_body_chunks(body: Any, *, chunk_size: int = 64 * 1024) -> Iterable[bytes]:
    iter_chunks = getattr(body, "iter_chunks", None)
    if callable(iter_chunks):
        yield from iter_chunks(chunk_size=chunk_size)
        return

    while True:
        chunk = body.read(chunk_size)
        if not chunk:
            break
        yield chunk


def suffix_for_recording(key: str, content_type: str | None) -> str:
    suffix = Path(key).suffix
    if suffix:
        return suffix
    if content_type == "audio/mpeg":
        return ".mp3"
    if content_type in {"audio/wav", "audio/x-wav"}:
        return ".wav"
    if content_type == "audio/mp4":
        return ".m4a"
    return ".audio"


class OpenAITranscriptionProvider:
    """Direct OpenAI transcription wrapper with lazy import and test injection."""

    def __init__(self, *, api_key: str | None = None, client: Any | None = None) -> None:
        self.api_key = api_key
        self._client = client

    @property
    def client(self) -> Any:
        if self._client is None:
            self._client = self._build_default_client()
        return self._client

    def transcribe(self, audio_path: str | Path, *, model: str, content_type: str | None = None) -> Any:
        path = Path(audio_path)
        with path.open("rb") as handle:
            file_arg: Any = handle if content_type is None else (path.name, handle, content_type)
            return self.client.audio.transcriptions.create(
                file=file_arg,
                model=model,
                response_format="json",
            )

    def _build_default_client(self) -> Any:
        api_key = self.api_key or os.environ.get("OPENAI_API_KEY") or os.environ.get("OPENAI_TRANSCRIPTION_API_KEY")
        if not api_key:
            raise ValueError("OpenAI API key is required for transcription execution")
        try:
            from openai import OpenAI  # type: ignore
        except ImportError as exc:  # pragma: no cover - runtime packaging path
            raise RuntimeError("openai package is required for transcription execution") from exc
        return OpenAI(api_key=api_key)


def choose_transcription_plan(
    duration_seconds: float | int | None,
    *,
    primary_model: str = DEFAULT_TRANSCRIPTION_MODEL,
    fallback_model: str = DEFAULT_FALLBACK_TRANSCRIPTION_MODEL,
    cutoff_seconds: int = LONG_AUDIO_DURATION_SECONDS,
) -> TranscriptionPlan:
    if duration_seconds is not None and float(duration_seconds) > cutoff_seconds:
        return TranscriptionPlan(
            model=fallback_model,
            use_fallback=True,
            needs_transcode=True,
            reason="duration_over_cutoff",
        )
    return TranscriptionPlan(
        model=primary_model,
        use_fallback=False,
        needs_transcode=False,
        reason="primary",
    )


def transcribe_with_openai_fallback(
    *,
    provider: OpenAITranscriptionProvider,
    audio_path: str | Path,
    duration_seconds: float | int | None = None,
    content_type: str | None = None,
    primary_model: str = DEFAULT_TRANSCRIPTION_MODEL,
    fallback_model: str = DEFAULT_FALLBACK_TRANSCRIPTION_MODEL,
    cutoff_seconds: int = LONG_AUDIO_DURATION_SECONDS,
    transcode_helper: Callable[..., TranscodedAudio] | None = None,
) -> ProviderTranscription:
    path = Path(audio_path)
    if transcode_helper is None:
        transcode_helper = transcode_audio_for_whisper
    plan = choose_transcription_plan(
        duration_seconds,
        primary_model=primary_model,
        fallback_model=fallback_model,
        cutoff_seconds=cutoff_seconds,
    )
    attempts: list[ProviderAttempt] = []

    if plan.use_fallback:
        fallback_path = path
        fallback_content_type = content_type
        if plan.needs_transcode and transcode_helper is not None:
            transcoded = transcode_helper(path, duration_seconds=duration_seconds)
            fallback_path = transcoded.path
            fallback_content_type = transcoded.content_type
        try:
            response = provider.transcribe(fallback_path, model=fallback_model, content_type=fallback_content_type)
        except Exception as exc:
            attempts.append(ProviderAttempt(fallback_model, "failed", build_error_json(exc, provider=DEFAULT_PROVIDER, model=fallback_model)))
            raise TranscriptionProviderError("fallback transcription failed", attempts) from exc
        attempts.append(ProviderAttempt(fallback_model, "succeeded"))
        return ProviderTranscription(
            provider=DEFAULT_PROVIDER,
            model=fallback_model,
            response=response,
            attempts=tuple(attempts),
            audio_path=fallback_path,
            content_type=fallback_content_type,
        )

    try:
        response = provider.transcribe(path, model=primary_model, content_type=content_type)
    except Exception as primary_exc:
        attempts.append(ProviderAttempt(primary_model, "failed", build_error_json(primary_exc, provider=DEFAULT_PROVIDER, model=primary_model)))
        try:
            response = provider.transcribe(path, model=fallback_model, content_type=content_type)
        except Exception as fallback_exc:
            attempts.append(ProviderAttempt(fallback_model, "failed", build_error_json(fallback_exc, provider=DEFAULT_PROVIDER, model=fallback_model)))
            raise TranscriptionProviderError("primary and fallback transcription failed", attempts) from fallback_exc
        attempts.append(ProviderAttempt(fallback_model, "succeeded"))
        return ProviderTranscription(
            provider=DEFAULT_PROVIDER,
            model=fallback_model,
            response=response,
            attempts=tuple(attempts),
            audio_path=path,
            content_type=content_type,
        )

    attempts.append(ProviderAttempt(primary_model, "succeeded"))
    return ProviderTranscription(
        provider=DEFAULT_PROVIDER,
        model=primary_model,
        response=response,
        attempts=tuple(attempts),
        audio_path=path,
        content_type=content_type,
    )


def transcribe_with_deterministic_strategy(
    *,
    provider: OpenAITranscriptionProvider,
    audio_path: str | Path,
    duration_seconds: float | int | None = None,
    content_type: str | None = None,
    primary_model: str = DEFAULT_TRANSCRIPTION_MODEL,
    fallback_model: str = DEFAULT_FALLBACK_TRANSCRIPTION_MODEL,
    chunked_cutoff_seconds: int = CHUNKED_TRANSCRIPTION_DURATION_SECONDS,
    chunk_extractor: Callable[..., TranscodedAudio] | None = None,
    transcode_helper: Callable[..., TranscodedAudio] | None = None,
) -> ProviderTranscription:
    duration = resolve_audio_duration(audio_path, duration_seconds)
    if duration <= chunked_cutoff_seconds:
        return transcribe_with_openai_fallback(
            provider=provider,
            audio_path=audio_path,
            duration_seconds=duration,
            content_type=content_type,
            primary_model=primary_model,
            fallback_model=fallback_model,
            transcode_helper=transcode_helper,
        )

    if chunk_extractor is None:
        chunk_extractor = extract_audio_window

    path = Path(audio_path)
    windows = build_chunk_windows(duration)
    if not windows:
        raise RuntimeError("deterministic transcription produced no chunk windows")
    attempts: list[ProviderAttempt] = []
    chunk_texts: list[str] = []
    chunk_segments: list[Any] = []
    chunk_metadata: list[dict[str, Any]] = []
    languages: list[str] = []
    models_used: list[str] = []
    max_output_tokens = 0

    with tempfile.TemporaryDirectory(prefix="ghl-transcription-chunks-") as tmp:
        output_dir = Path(tmp)
        for window in windows:
            chunk_results = transcribe_window_with_retry(
                provider=provider,
                source_audio_path=path,
                window=window,
                primary_model=primary_model,
                fallback_model=fallback_model,
                chunk_extractor=chunk_extractor,
                output_dir=output_dir,
                attempts=attempts,
            )
            for chunk_window, chunk_result in chunk_results:
                normalized = normalize_transcription_response(chunk_result.response)
                text = normalized.get("text")
                if isinstance(text, str) and text.strip():
                    chunk_texts.append(text.strip())
                segments = normalized.get("segments")
                if isinstance(segments, list):
                    chunk_segments.extend(offset_transcript_segments(segments, chunk_window.start_seconds))
                language = normalized.get("language")
                if isinstance(language, str) and language and language not in languages:
                    languages.append(language)
                if chunk_result.model not in models_used:
                    models_used.append(chunk_result.model)
                output_tokens = output_tokens_from_response(chunk_result.response) or 0
                max_output_tokens = max(max_output_tokens, output_tokens)
                chunk_metadata.append(
                    {
                        "chunk_index": chunk_window.index,
                        "start_seconds": chunk_window.start_seconds,
                        "end_seconds": chunk_window.end_seconds,
                        "model": chunk_result.model,
                        "output_tokens": output_tokens,
                        "status": "succeeded",
                    }
                )

    aggregate_model = aggregate_transcription_model(models_used, default_model=primary_model)
    response = {
        "text": merge_transcript_texts(chunk_texts),
        "segments": chunk_segments or None,
        "language": languages[0] if languages else None,
        "usage": {
            "transcription_strategy": "chunked_v1",
            "chunk_count_expected": len(windows),
            "chunk_count_completed": len(chunk_metadata),
            "max_chunk_output_tokens": max_output_tokens,
            "coverage_start_seconds": windows[0].start_seconds if windows else 0.0,
            "coverage_end_seconds": windows[-1].end_seconds if windows else 0.0,
            "overlap_seconds": TRANSCRIPTION_CHUNK_OVERLAP_SECONDS,
            "models_used": models_used,
            "chunks": chunk_metadata,
        },
    }
    return ProviderTranscription(
        provider=DEFAULT_PROVIDER,
        model=aggregate_model,
        response=response,
        attempts=tuple(attempts),
        audio_path=path,
        content_type=content_type,
    )


def transcribe_window_with_retry(
    *,
    provider: OpenAITranscriptionProvider,
    source_audio_path: Path,
    window: TranscriptionWindow,
    primary_model: str,
    fallback_model: str,
    chunk_extractor: Callable[..., TranscodedAudio],
    output_dir: Path,
    attempts: list[ProviderAttempt],
) -> list[tuple[TranscriptionWindow, ProviderTranscription]]:
    first_result = transcribe_single_window(
        provider=provider,
        source_audio_path=source_audio_path,
        window=window,
        primary_model=primary_model,
        fallback_model=fallback_model,
        chunk_extractor=chunk_extractor,
        output_dir=output_dir,
    )
    attempts.extend(first_result.attempts)
    if not transcription_response_near_output_cap(first_result.response):
        return [(window, first_result)]

    retry_windows = build_chunk_windows(
        window.duration_seconds,
        window_seconds=TRANSCRIPTION_RETRY_CHUNK_SECONDS,
        overlap_seconds=TRANSCRIPTION_CHUNK_OVERLAP_SECONDS,
        start_seconds=window.start_seconds,
        index_offset=(window.index + 1) * 1000,
    )
    retry_results: list[tuple[TranscriptionWindow, ProviderTranscription]] = []
    for retry_window in retry_windows:
        retry_result = transcribe_single_window(
            provider=provider,
            source_audio_path=source_audio_path,
            window=retry_window,
            primary_model=primary_model,
            fallback_model=fallback_model,
            chunk_extractor=chunk_extractor,
            output_dir=output_dir,
        )
        attempts.extend(retry_result.attempts)
        if transcription_response_near_output_cap(retry_result.response):
            output_tokens = output_tokens_from_response(retry_result.response)
            error = build_error_json(
                RuntimeError("transcription chunk reached output token threshold"),
                provider=DEFAULT_PROVIDER,
                model=retry_result.model,
                retryable=True,
            )
            error["output_tokens"] = output_tokens
            error["threshold"] = OUTPUT_TOKEN_INCOMPLETE_THRESHOLD
            attempts.append(ProviderAttempt(retry_result.model, "failed", error))
            raise TranscriptionProviderError("transcription incomplete after deterministic subchunk retry", attempts)
        retry_results.append((retry_window, retry_result))
    return retry_results


def transcribe_single_window(
    *,
    provider: OpenAITranscriptionProvider,
    source_audio_path: Path,
    window: TranscriptionWindow,
    primary_model: str,
    fallback_model: str,
    chunk_extractor: Callable[..., TranscodedAudio],
    output_dir: Path,
) -> ProviderTranscription:
    chunk = chunk_extractor(source_audio_path, window, output_dir=output_dir)
    return transcribe_with_openai_fallback(
        provider=provider,
        audio_path=chunk.path,
        duration_seconds=window.duration_seconds,
        content_type=chunk.content_type,
        primary_model=primary_model,
        fallback_model=fallback_model,
    )


def build_chunk_windows(
    duration_seconds: float | int,
    *,
    window_seconds: float | int = TRANSCRIPTION_CHUNK_SECONDS,
    overlap_seconds: float | int = TRANSCRIPTION_CHUNK_OVERLAP_SECONDS,
    start_seconds: float | int = 0.0,
    index_offset: int = 0,
) -> list[TranscriptionWindow]:
    duration = float(duration_seconds)
    window_length = float(window_seconds)
    overlap = float(overlap_seconds)
    base_start = float(start_seconds)
    if not math.isfinite(duration) or duration <= 0:
        return []
    if not math.isfinite(window_length) or window_length <= 0:
        raise ValueError("window_seconds must be positive and finite")
    if not math.isfinite(overlap) or overlap < 0:
        raise ValueError("overlap_seconds must be non-negative and finite")
    if window_length <= overlap:
        raise ValueError("window_seconds must be greater than overlap_seconds")

    windows: list[TranscriptionWindow] = []
    start = base_start
    final_end = base_start + duration
    index = index_offset
    while start < final_end:
        end = min(start + window_length, final_end)
        windows.append(
            TranscriptionWindow(
                index=index,
                start_seconds=round(start, 3),
                end_seconds=round(end, 3),
            )
        )
        if end >= final_end:
            break
        start = end - overlap
        index += 1
    return windows


def extract_audio_window(
    audio_path: str | Path,
    window: TranscriptionWindow,
    *,
    output_dir: Path | None = None,
    runner: Callable[..., Any] = subprocess.run,
) -> TranscodedAudio:
    input_path = Path(audio_path)
    directory = output_dir or input_path.parent
    directory.mkdir(parents=True, exist_ok=True)
    output = directory / f"{input_path.stem}.chunk-{window.index:03d}.wav"
    args = [
        "ffmpeg",
        "-hide_banner",
        "-nostdin",
        "-y",
        "-ss",
        f"{window.start_seconds:.3f}",
        "-i",
        str(input_path),
        "-t",
        f"{window.duration_seconds:.3f}",
        "-vn",
        "-ac",
        "1",
        "-ar",
        "8000",
        "-c:a",
        "pcm_s16le",
        str(output),
    ]
    completed = runner(args, check=False, capture_output=True)
    if getattr(completed, "returncode", 0) != 0:
        stderr = sanitize_text(getattr(completed, "stderr", b"").decode("utf-8", errors="replace"))
        raise RuntimeError(f"ffmpeg chunk extraction failed: {stderr}")
    return TranscodedAudio(path=output, content_type="audio/x-wav", bitrate_kbps=128)


def resolve_audio_duration(audio_path: str | Path, duration_seconds: float | int | None) -> float:
    if duration_seconds is None:
        return probe_audio_duration(audio_path)
    try:
        duration = float(duration_seconds)
    except (TypeError, ValueError):
        return probe_audio_duration(audio_path)
    if not math.isfinite(duration) or duration <= 0:
        return probe_audio_duration(audio_path)
    return duration


def probe_audio_duration(
    audio_path: str | Path,
    *,
    runner: Callable[..., Any] = subprocess.run,
) -> float:
    args = [
        "ffprobe",
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        str(audio_path),
    ]
    completed = runner(args, check=False, capture_output=True)
    if getattr(completed, "returncode", 0) != 0:
        stderr = sanitize_text(getattr(completed, "stderr", b"").decode("utf-8", errors="replace"))
        raise RuntimeError(f"ffprobe duration probe failed: {stderr}")
    raw_duration = getattr(completed, "stdout", b"").decode("utf-8", errors="replace").strip()
    try:
        duration = float(raw_duration)
    except ValueError as exc:
        raise RuntimeError("ffprobe duration probe returned an invalid duration") from exc
    if not math.isfinite(duration) or duration <= 0:
        raise RuntimeError("ffprobe duration probe returned a non-positive duration")
    return duration


def aggregate_transcription_model(models_used: list[str], *, default_model: str) -> str:
    if not models_used:
        return default_model
    if len(models_used) == 1:
        return models_used[0]
    return "+".join(models_used)


def offset_transcript_segments(segments: list[Any], offset_seconds: float) -> list[Any]:
    return [offset_transcript_segment(segment, offset_seconds) for segment in segments]


def offset_transcript_segment(segment: Any, offset_seconds: float) -> Any:
    if not isinstance(segment, Mapping):
        return segment
    adjusted = dict(segment)
    for key in ("start", "end", "start_seconds", "end_seconds"):
        value = adjusted.get(key)
        if isinstance(value, (int, float)):
            adjusted[key] = round(float(value) + offset_seconds, 3)
    words = adjusted.get("words")
    if isinstance(words, list):
        adjusted["words"] = [offset_transcript_segment(word, offset_seconds) for word in words]
    return adjusted


def merge_transcript_texts(chunks: list[str]) -> str:
    merged: list[str] = []
    for chunk in chunks:
        text = chunk.strip()
        if not text:
            continue
        if merged:
            text = trim_repeated_overlap(merged[-1], text)
        if text:
            merged.append(text)
    return "\n".join(merged)


def trim_repeated_overlap(previous: str, current: str, *, max_words: int = 80) -> str:
    previous_words = previous.split()
    current_words = current.split()
    max_overlap = min(max_words, len(previous_words), len(current_words))
    for size in range(max_overlap, 0, -1):
        if [word.lower() for word in previous_words[-size:]] == [word.lower() for word in current_words[:size]]:
            return " ".join(current_words[size:])
    return current


def transcription_response_near_output_cap(
    response: Any,
    *,
    threshold: int = OUTPUT_TOKEN_INCOMPLETE_THRESHOLD,
) -> bool:
    output_tokens = output_tokens_from_response(response)
    return output_tokens is not None and output_tokens >= threshold


def output_tokens_from_response(response: Any) -> int | None:
    usage = normalize_transcription_response(response).get("usage")
    if not isinstance(usage, Mapping):
        return None
    for key in ("output_tokens", "completion_tokens"):
        value = usage.get(key)
        if value is None:
            continue
        try:
            return int(value)
        except (TypeError, ValueError):
            continue
    return None


def transcode_audio_for_whisper(
    audio_path: str | Path,
    *,
    duration_seconds: float | int | None,
    output_path: str | Path | None = None,
    runner: Callable[..., Any] = subprocess.run,
) -> TranscodedAudio:
    duration = float(duration_seconds or LONG_AUDIO_DURATION_SECONDS)
    bitrate_kbps = whisper_transcode_bitrate_kbps(duration)
    input_path = Path(audio_path)
    if output_path is None:
        output = input_path.with_suffix(".whisper.mp3")
    else:
        output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    args = [
        "ffmpeg",
        "-hide_banner",
        "-nostdin",
        "-y",
        "-i",
        str(input_path),
        "-vn",
        "-ac",
        "1",
        "-ar",
        "8000",
        "-c:a",
        "libmp3lame",
        "-b:a",
        f"{bitrate_kbps}k",
        "-write_xing",
        "0",
        "-f",
        "mp3",
        str(output),
    ]
    completed = runner(args, check=False, capture_output=True)
    if getattr(completed, "returncode", 0) != 0:
        stderr = sanitize_text(getattr(completed, "stderr", b"").decode("utf-8", errors="replace"))
        raise RuntimeError(f"ffmpeg transcode failed: {stderr}")
    return TranscodedAudio(path=output, content_type="audio/mpeg", bitrate_kbps=bitrate_kbps)


def whisper_transcode_bitrate_kbps(duration_seconds: float) -> int:
    margin = 0.9
    budget_bits = 25 * 1024 * 1024 * 8 * margin
    kbps = int(budget_bits // (max(duration_seconds, 1.0) * 1000))
    return max(16, min(kbps, 48))


def normalize_transcription_response(response: Any) -> dict[str, Any]:
    payload = provider_response_to_dict(response)
    text = extract_field(payload, response, "text")
    segments = extract_field(payload, response, "segments")
    language = extract_field(payload, response, "language")
    usage = extract_field(payload, response, "usage")
    return {
        "text": text if isinstance(text, str) else "",
        "segments": segments,
        "language": language,
        "usage": usage,
        "raw": payload,
    }


def provider_response_to_dict(response: Any) -> dict[str, Any]:
    if isinstance(response, dict):
        return response
    model_dump = getattr(response, "model_dump", None)
    if callable(model_dump):
        dumped = model_dump()
        return dumped if isinstance(dumped, dict) else {"value": dumped}
    to_dict = getattr(response, "to_dict", None)
    if callable(to_dict):
        dumped = to_dict()
        return dumped if isinstance(dumped, dict) else {"value": dumped}
    payload: dict[str, Any] = {}
    for key in ("text", "segments", "language", "usage", "duration"):
        if hasattr(response, key):
            payload[key] = getattr(response, key)
    return payload


def extract_field(payload: Mapping[str, Any], response: Any, key: str) -> Any:
    if key in payload:
        return payload[key]
    return getattr(response, key, None)


def build_transcript_row(
    *,
    source: Mapping[str, Any],
    run_id: str,
    snapshot_at: datetime | str,
    artifact_schema_version: str,
    provider: str,
    transcription_model: str,
    transcription_status: str,
    transcription_response: Any | None = None,
    transcript_object_key: str | None = None,
    provider_response_object_key: str | None = None,
    error: BaseException | Mapping[str, Any] | None = None,
    attempt_count: int = 1,
    first_attempted_at: datetime | str | None = None,
    last_attempted_at: datetime | str | None = None,
    transcribed_at: datetime | str | None = None,
) -> dict[str, Any]:
    normalized = normalize_transcription_response(transcription_response) if transcription_response is not None else {}
    call_message_id = source_text(source, "call_message_id", "message_id")
    recording_sha256 = source_text(source, "recording_sha256", "sha256")
    now = utc_now()
    if first_attempted_at is None:
        first_attempted_at = now
    if last_attempted_at is None:
        last_attempted_at = now
    if transcribed_at is None and transcription_status == "succeeded":
        transcribed_at = now
    idempotency_key = build_idempotency_key(
        call_message_id,
        recording_sha256,
        artifact_schema_version,
        provider,
        transcription_model,
    )
    error_payload = normalize_error_payload(error, provider=provider, model=transcription_model) if error else None
    row = {
        "call_message_id": call_message_id,
        "conversation_id": source_text(source, "conversation_id"),
        "contact_id": source_text(source, "contact_id"),
        "opportunity_id": source_text(source, "opportunity_id"),
        "actor_user_id": source_text(source, "actor_user_id", "user_id"),
        "direction": source_text(source, "direction"),
        "call_status": source_text(source, "call_status", "status"),
        "recording_s3_uri": source_text(source, "recording_s3_uri", "s3_uri"),
        "recording_object_key": source_text(source, "recording_object_key", "object_key"),
        "recording_sha256": recording_sha256,
        "recording_content_type": source_text(source, "recording_content_type", "content_type"),
        "recording_byte_count": source_number(source, "recording_byte_count", "byte_count"),
        "recording_duration_seconds": source_number(source, "recording_duration_seconds", "duration_seconds", "duration"),
        "transcription_status": transcription_status,
        "transcript_text": normalized.get("text") if transcription_status == "succeeded" else None,
        "transcript_segments_json": json_or_none(normalized.get("segments")),
        "language": normalized.get("language"),
        "provider": provider,
        "transcription_model": transcription_model,
        "artifact_schema_version": artifact_schema_version,
        "idempotency_key": idempotency_key,
        "transcript_object_key": transcript_object_key,
        "provider_response_object_key": provider_response_object_key,
        "usage_json": json_or_none(normalized.get("usage")),
        "error_json": json_or_none(error_payload),
        "attempt_count": attempt_count,
        "first_attempted_at": isoformat(first_attempted_at),
        "last_attempted_at": isoformat(last_attempted_at),
        "transcribed_at": isoformat(transcribed_at),
        "source_call_run_id": source_text(source, "source_call_run_id", "call_run_id"),
        "source_recording_run_id": source_text(source, "source_recording_run_id", "recording_run_id"),
        "source_call_snapshot_at": source_text(source, "source_call_snapshot_at", "call_snapshot_at"),
        "source_recording_snapshot_at": source_text(source, "source_recording_snapshot_at", "recording_snapshot_at"),
        "run_id": run_id,
        "snapshot_at": isoformat(snapshot_at),
    }
    return {column: row.get(column) for column in TRANSCRIPT_ROW_COLUMNS}


def build_transcript_artifact(
    *,
    row: Mapping[str, Any],
    provider_response: Any | None = None,
    error: BaseException | Mapping[str, Any] | None = None,
) -> dict[str, Any]:
    error_payload = parse_json_or_none(row.get("error_json"))
    if error and not error_payload:
        error_payload = normalize_error_payload(
            error,
            provider=str(row.get("provider") or DEFAULT_PROVIDER),
            model=str(row.get("transcription_model") or DEFAULT_TRANSCRIPTION_MODEL),
        )
    return {
        "artifact_type": "ghl_call_transcript",
        "artifact_schema_version": row.get("artifact_schema_version"),
        "idempotency_key": row.get("idempotency_key"),
        "status": row.get("transcription_status"),
        "source": {
            "call_message_id": row.get("call_message_id"),
            "conversation_id": row.get("conversation_id"),
            "contact_id": row.get("contact_id"),
            "opportunity_id": row.get("opportunity_id"),
            "recording_object_key": row.get("recording_object_key"),
            "recording_sha256": row.get("recording_sha256"),
            "source_call_run_id": row.get("source_call_run_id"),
            "source_recording_run_id": row.get("source_recording_run_id"),
        },
        "provider": {
            "name": row.get("provider"),
            "model": row.get("transcription_model"),
            "usage": parse_json_or_none(row.get("usage_json")),
        },
        "transcript": {
            "text": row.get("transcript_text"),
            "segments": parse_json_or_none(row.get("transcript_segments_json")),
            "language": row.get("language"),
        },
        "error": error_payload,
        "provider_response": provider_response_to_dict(provider_response) if provider_response is not None else None,
        "row": dict(row),
    }


def source_text(source: Mapping[str, Any], *keys: str) -> str | None:
    for key in keys:
        value = source.get(key)
        if value not in (None, ""):
            return str(value)
    return None


def source_number(source: Mapping[str, Any], *keys: str) -> int | float | None:
    for key in keys:
        value = source.get(key)
        if value in (None, ""):
            continue
        if isinstance(value, (int, float)):
            return value
        try:
            number = float(value)
        except (TypeError, ValueError):
            return None
        return int(number) if number.is_integer() else number
    return None


def json_or_none(value: Any) -> str | None:
    if value in (None, ""):
        return None
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def parse_json_or_none(value: Any) -> Any | None:
    if value in (None, ""):
        return None
    if not isinstance(value, str):
        return value
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return None


def normalize_error_payload(
    error: BaseException | Mapping[str, Any] | None,
    *,
    provider: str | None = None,
    model: str | None = None,
) -> dict[str, Any] | None:
    if error is None:
        return None
    if isinstance(error, Mapping):
        payload = dict(error)
    else:
        payload = build_error_json(error, provider=provider, model=model)
    return sanitize_error_value(payload)


def build_error_json(
    error: BaseException,
    *,
    provider: str | None = None,
    model: str | None = None,
    retryable: bool | None = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "class": error.__class__.__name__,
        "message": sanitize_text(str(error)),
    }
    if provider:
        payload["provider"] = provider
    if model:
        payload["model"] = model
    if retryable is not None:
        payload["retryable"] = retryable
    response = getattr(error, "response", None)
    if response is not None:
        payload["response"] = sanitize_error_value(response)
    return sanitize_error_value(payload)


def sanitize_error_value(value: Any) -> Any:
    if isinstance(value, Mapping):
        sanitized: dict[str, Any] = {}
        for key, item in value.items():
            lowered = str(key).lower()
            if any(part in lowered for part in SENSITIVE_ERROR_KEY_PARTS):
                sanitized[str(key)] = "[redacted]"
            else:
                sanitized[str(key)] = sanitize_error_value(item)
        return sanitized
    if isinstance(value, list):
        return [sanitize_error_value(item) for item in value]
    if isinstance(value, tuple):
        return [sanitize_error_value(item) for item in value]
    if isinstance(value, bytes):
        return "[redacted]"
    if isinstance(value, str):
        return sanitize_text(value)
    return value


def sanitize_text(value: str, *, max_length: int = 500) -> str:
    if looks_like_raw_payload(value):
        return "[redacted]"
    redacted = S3_URI_RE.sub("[redacted-s3-uri]", value)
    redacted = RECORDING_OBJECT_KEY_RE.sub("[redacted-recording-key]", redacted)
    redacted = URL_RE.sub("[redacted-url]", redacted)
    redacted = EMAIL_RE.sub("[redacted-email]", redacted)
    redacted = PHONE_RE.sub("[redacted-phone]", redacted)
    redacted = BEARER_RE.sub("Bearer [redacted]", redacted)
    redacted = OPENAI_KEY_RE.sub("[redacted-key]", redacted)
    redacted = CREDENTIAL_ASSIGNMENT_RE.sub(lambda match: f"{match.group(1)}=[redacted]", redacted)
    if len(redacted) > max_length:
        return redacted[: max_length - 15] + "...[truncated]"
    return redacted


def looks_like_raw_payload(value: str) -> bool:
    stripped = value.strip()
    if not stripped:
        return False
    starts_payload = stripped.startswith("{") or stripped.startswith("[")
    has_payload_shape = (("{" in stripped and "}" in stripped) or ("[" in stripped and "]" in stripped)) and ":" in stripped
    return starts_payload or has_payload_shape
