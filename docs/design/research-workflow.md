# Research Workflow

This repo separates local artifacts from durable findings. Binaries and generated output stay ignored, while source URLs, hashes, commands, API candidates, schemas, and conclusions are tracked under `docs/`.

## Artifact Handling

Downloaded APKs, EXEs, decoded resources, and decompiler output belong under ignored paths: `artifacts/`, `work/`, `apktool-out/`, and `jadx-out/`. Commit only metadata and conclusions.

For every downloaded client artifact, record:

- source URL
- download date
- observed HTTP metadata when available
- local path
- size
- SHA-256

## Evidence Standards

Findings should be reproducible from tracked commands or cited source URLs. If a note depends on a bulky command output, keep the raw output in `work/` and summarize the relevant lines in `docs/`.

For official APIs, record:

- endpoint URL or path template
- method
- required headers
- authentication state
- request parameters
- pagination behavior
- response status codes
- response schema
- source evidence

Use direct language for observed facts. Label uncertain conclusions as inferences.

## Promotion Flow

1. Run exploratory commands into ignored output under `work/` or decompiler output directories.
2. Extract candidate hosts, paths, and schema terms into `docs/research/api-inventory.md`.
3. Confirm official request behavior before writing collection code.
4. Move repeated process decisions into `docs/design/`.
5. Keep artifact hashes and source links near the relevant finding.
