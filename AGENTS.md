# AGENTS.md / CLAUDE.md: poker-fate-research

## Project Overview

This repository is a durable workspace for discovering official Poker Fate APIs that expose player data, documenting request / response schemas, and building our own collection tools. It stores evidence, source links, timestamps, hashes, commands, schemas, and findings that should survive beyond one active assistant session.

### Project Layout

```text
.
├── artifacts/                             # Local APK / EXE downloads; ignored except README
├── docs/                                  # Durable research notes and methodology
│   ├── design/                            # Research workflow and evidence conventions
│   ├── research/                          # Source-specific findings and commands
│   └── glossary.md                        # Poker-stat terminology and Chinese search terms
├── src/poker_fate_research/               # API discovery and collection tooling
├── tests/                                 # Tool tests
├── scripts/                               # Small reproducible helper scripts, if needed
├── work/                                  # Scratch command output; ignored
├── data/                                  # Raw API responses and normalized local datasets; ignored
├── apktool-out/                           # Decoded Android resources; ignored
└── jadx-out/                              # Java decompiler output; ignored
```

## Documentation

- [`docs/README.md`](docs/README.md): top-level index of design notes, research notes, and glossary.
- [`docs/design/`](docs/design/): internal study workflow, evidence rules, and durable analysis decisions.
- [`docs/research/`](docs/research/): official surface findings, candidate API inventory, download metadata, commands, and next research threads.
- [`docs/glossary.md`](docs/glossary.md): Poker-stat terminology and Chinese search terms.

### Documentation Style

- Follow the `oxide-code` docs convention: do not hard-wrap prose paragraphs. Markdown tables, lists, and code blocks can wrap naturally when the syntax needs it.
- Prefer factual notes over speculation. If a finding is inferred, label it as an inference and keep the evidence nearby.
- Record enough command context that a future reader can reproduce the result.
- Do not document planned work as if it already exists.

## Tooling Conventions

- Start with offline discovery tools that extract API candidates from official website bundles and official client artifacts.
- Promote only confirmed official interfaces into collection code.
- Store request / response schemas in `docs/research/api-inventory.md` before relying on them in collectors.
- Keep collectors explicit about authentication, pagination, rate limits, and required headers.

### Python

- Use Ruff for Python format and lint. Run `ruff format .`, `ruff check .`, and `pytest -q` after Python changes.
- Keep type hints on functions, including tests and small helpers.
- Prefer standard-library code until an external dependency removes real complexity.

## Research Conventions

### Artifact Policy

- Commit metadata, not binaries. APKs, EXEs, decoded resources, decompiler output, raw API responses, normalized local datasets, and scratch output stay under ignored paths such as `artifacts/`, `data/`, `work/`, `apktool-out/`, and `jadx-out/`.
- When adding an artifact locally, record the source URL, download date, size, and hash in `docs/research/`.

### Boundaries

- Public website and static official-client analysis are in scope.
- Official API request / response schema documentation is in scope.
- Building collectors for accessible official APIs is in scope once the interface is confirmed.
- Do not bypass authentication, payment, access controls, or rate limits.
- Third-party community databases are background references only, not the core target.

### Evidence

- Keep raw command outputs in `work/` when they are bulky. Summarize the relevant finding in `docs/`.
- Keep source URLs beside findings. For downloaded artifacts, include hash and observed HTTP metadata.
- Separate observed facts from hypotheses. Use short labels such as `Inference:` when the evidence does not directly prove the conclusion.

## Nix Conventions

- Use `nix develop` for tools. Do not require global installs for routine study work.
- Keep the flake on the current NixOS stable branch unless a tool requires unstable.
- `nix fmt` formats Nix files with `nixfmt` and Python files with Ruff.

## Git Conventions

Follows global commit / branch / PR conventions, plus:

- **Scope**: use the most specific research area changed: `research`, `docs`, `apk`, `website`, `glossary`, or `nix`.
- **Commits**: prefer `docs(...)` for durable findings and `chore(nix)` for environment-only changes.
- Do not commit ignored local artifacts or generated reverse-engineering output.
