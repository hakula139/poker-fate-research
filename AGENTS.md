# AGENTS.md / CLAUDE.md: poker-fate-research

## Project Overview

This repository is a durable workspace for the official Poker Fate client APIs that expose player profile statistics. It stores the current endpoint contract, APK provenance, decoded-client evidence, source links, timestamps, hashes, schemas, and fetched result snapshots that should survive beyond one active assistant session.

### Project Layout

```text
.
├── artifacts/                             # Local APK / EXE downloads; ignored except README
├── docs/                                  # API contract, current findings, and artifact provenance
│   └── research/                          # Guest auth, player lookup, stats schema, APK evidence
├── work/                                  # Scratch command output; ignored
├── data/                                  # Raw API responses and normalized local datasets; ignored
├── apktool-out/                           # Decoded Android resources; ignored
└── jadx-out/                              # Java decompiler output; ignored
```

## Documentation

- [`docs/README.md`](docs/README.md): top-level documentation index.
- [`docs/research/README.md`](docs/research/README.md): research-note index.
- [`docs/research/api-inventory.md`](docs/research/api-inventory.md): guest auth, player lookup, profile-stat schema, related APIs, error codes, and the latest `Hakula` snapshot.
- [`docs/research/android-apk.md`](docs/research/android-apk.md): APK source metadata and decoded-client evidence.

### Documentation Style

- Follow the `oxide-code` docs convention: do not hard-wrap prose paragraphs. Markdown tables, lists, and code blocks can wrap naturally when the syntax needs it.
- Prefer factual notes over speculation. If a finding is inferred, label it as an inference and keep the evidence nearby.
- Prefer final contracts and current results over procedure logs. Keep failed leads out of tracked docs unless they directly prevent repeating expensive work.
- Do not document planned work as if it already exists.

## Tooling Conventions

- Keep exploratory decoding and live API probes in ignored paths such as `work/` and `data/`.
- Promote only confirmed official interfaces into tracked docs.
- Store request / response schemas in `docs/research/api-inventory.md`.
- Keep future collectors explicit about authentication, pagination, rate limits, and required headers.

## Research Conventions

### Artifact Policy

- Commit metadata, not binaries. APKs, EXEs, decoded resources, decompiler output, raw API responses, normalized local datasets, and scratch output stay under ignored paths such as `artifacts/`, `data/`, `work/`, `apktool-out/`, and `jadx-out/`.
- When adding an artifact locally, record the source URL, download date, size, and hash in `docs/research/`.

### Boundaries

- Public website and static official-client analysis are in scope.
- Official API request / response schema documentation is in scope.
- Dedicated guest-account read probes are in scope when they use the normal official login path and stay low-volume.
- Building collectors for accessible official APIs is in scope once the interface is confirmed and request volume is bounded.
- Do not bypass authentication, payment, access controls, or rate limits.
- Do not automate or reuse a main player account for research.
- Third-party community databases are background references only, not the core target.

### Evidence

- Keep raw command outputs in `work/` when they are bulky. Summarize the relevant finding in `docs/`.
- Keep source URLs beside findings. For downloaded artifacts, include hash and observed HTTP metadata.
- Do not commit guest `authorization`, `rdkey`, device tokens, raw login responses, or other live credentials.
- Separate observed facts from hypotheses. Use short labels such as `Inference:` when the evidence does not directly prove the conclusion.

## Nix Conventions

- Use `nix develop` for tools. Do not require global installs for routine study work.
- Keep the flake on the current NixOS stable branch unless a tool requires unstable.
- `nix fmt` formats Nix files with `nixfmt`.

## Git Conventions

Follows global commit / branch / PR conventions, plus:

- **Scope**: use the most specific research area changed: `api`, `apk`, `docs`, or `nix`.
- **Commits**: prefer `docs(...)` for durable findings and `chore(nix)` for environment-only changes.
- Do not commit ignored local artifacts or generated reverse-engineering output.
