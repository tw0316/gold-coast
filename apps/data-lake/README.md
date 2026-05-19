# Gold Coast Data Lake

Read-only source extractor and curated table tooling for the Gold Coast data lake.

## Scope

- GHL source extraction uses GET-only API behavior.
- Local raw/curated outputs are written under `apps/data-lake/data/`, which is ignored by git.
- Production recurring refresh infrastructure is not part of this imported app yet.

## Local Checks

```bash
PYTHONPATH=src python3 -m pytest tests
```

## Safe Local Smoke

```bash
GHL_ENV_FILE=/path/to/credentials.env python3 scripts/ghl_extract_raw.py --smoke --output-dir data/smoke
```

Do not commit credential files, raw payloads, local extracts, recordings, or generated Parquet output.
