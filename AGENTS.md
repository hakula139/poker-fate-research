# AGENTS.md / CLAUDE.md: poker-fate-research

## Project Overview

This repository is a durable workspace for the official Poker Fate client APIs that expose player profile statistics. It stores the current endpoint contract, APK provenance, decoded-client evidence, source links, timestamps, hashes, schemas, and fetched result snapshots that should survive beyond one active assistant session.

Keep user-facing status in `README.md`. Keep durable evidence, schemas, request shapes, and fetched result summaries under `docs/research/`. Do not turn this file into a research log.

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

## Research Conventions

### Documentation Maintenance

- Keep `README.md` concise and user-facing. Put detailed evidence, schemas, and artifact notes under `docs/research/`.
- Keep documentation indexes navigational. Do not repeat the same leaf-document table in multiple places.
- Do not hard-wrap prose paragraphs. Markdown tables, lists, and code blocks can wrap naturally when syntax or readability needs it.
- Prefer factual notes over speculation. If a finding is inferred, label it as an inference and keep the evidence nearby.
- Prefer final contracts and current results over procedure logs. Keep failed leads out of tracked docs unless they directly prevent repeating expensive work.
- Do not document planned work as if it already exists.

### API Findings

- Keep exploratory decoding and live API probes in ignored paths such as `work/` and `data/`.
- Promote only confirmed official interfaces into tracked docs.
- Store request / response schemas, authentication requirements, rate-shape notes, and current public player snapshots in `docs/research/api-inventory.md`.
- Store APK source metadata, hashes, decoded-client evidence, and extraction notes in `docs/research/android-apk.md`.
- Keep future collectors explicit about authentication, pagination, rate limits, required headers, and credential source.

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
- Reuse a stable dedicated guest identity for live probes. Store only the reusable device token in ignored local env files such as `.envrc.local`, using `POKER_FATE_RESEARCH_DEVICE_TOKEN`; do not create throwaway guest accounts when that token is available.
- Separate observed facts from hypotheses. Use short labels such as `Inference:` when the evidence does not directly prove the conclusion.

## Nix Development

`flake.nix` pins the research toolchain, documentation checks, spelling checks, Nix formatter, and pre-commit hooks. `direnv` auto-activates the shell via `.envrc`.

```bash
nix develop -c zsh                                      # Manual interactive shell
nix flake check                                         # Run repository validation
```

Use the dev shell tools instead of requiring global installs. Python collector tooling is uv-managed through `pyproject.toml` and `uv.lock`; repository validation runs through `nix flake check`. Keep the flake on the current NixOS stable branch unless a tool requires unstable.

### Pre-commit Hooks

`nix flake check` runs these `git-hooks.nix` checks:

- **Hygiene**: `check-added-large-files`, `end-of-file-fixer`, `trim-trailing-whitespace`
- **Documentation**: `markdownlint`
- **Spelling**: `cspell`
- **Python**: `check-python`, `ruff`, `ruff-format`
- **Nix**: `nixfmt`, `statix`, `deadnix`

## Verification

Run after substantive changes and before review:

```bash
nix flake check
```

## Git Conventions

Follows global commit / branch / PR conventions, plus:

- **Scope**: use the most specific research area changed: `api`, `apk`, `docs`, or `nix`.
- **Commits**: prefer `docs(...)` for durable findings and `chore(nix)` for environment-only changes.
- Do not commit ignored local artifacts or generated reverse-engineering output.
- **PRs**: label documentation-only research changes with `documentation`. Do not merge PRs without explicit approval for that PR.
