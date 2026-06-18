# Poker Fate Research

Research workspace, collector, D1 import pipeline, and player stats website for Poker Fate profile data.

The repo keeps the confirmed API findings, the snapshot collector, D1 schema and import tooling, and the frontend source. Large binaries, decoded client output, raw API responses, local snapshots, and credentials stay out of git.

## Current Result

The main output is a D1-backed website for browsing collected leaderboard player snapshots. It supports snapshot selection, game-mode filtering, player search, sortable stats, player details, dark mode, and English / Simplified Chinese UI.

Player classification is split into preflop and postflop tags. The current thresholds are tuned for 6-max Hold'em, which is the main mode this project uses.

Daily snapshots are collected by GitHub Actions and imported into Cloudflare D1. Direct player searches can cache players outside the leaderboard into the same database.

## Project Layout

| Path                         | Purpose                                                       |
| ---------------------------- | ------------------------------------------------------------- |
| [`python/`](python/)         | Python package for the collector and D1 import CLI            |
| [`web/`](web/)               | React player stats website                                    |
| [`docs/`](docs/)             | Research notes, API findings, APK provenance, and tag model   |
| [`artifacts/`](artifacts/)   | Ignored local APK / binary downloads with tracked metadata    |
| `data/`, `work/`             | Ignored local snapshots, API responses, and scratch output    |

## Documentation

See [`docs/`](docs/) for the research index, endpoint contract, and APK evidence.

## Development

`direnv` auto-activates the shell via `.envrc`.

```bash
nix develop -c zsh                                      # Manual interactive shell
nix flake check                                         # Run repository validation
```

The shell includes Android static-analysis tools, text search utilities, uv-managed Python tooling, frontend tooling, Ruff, documentation linters, and pre-commit hooks.

Local leaderboard snapshots can be collected with `uv --project python run poker-fate players`; see [`docs/research/player-discovery.md`](docs/research/player-discovery.md) for credential and output details.

## Player Stats Website

Run the frontend locally:

```bash
pnpm --dir web install
pnpm --dir web run dev
```

The production site reads player data from Cloudflare D1 through the Worker API. The dev server runs at <http://127.0.0.1:5178/>. See [`web/README.md`](web/README.md) for frontend setup, ports, and checks.

## Validation

```bash
nix flake check
nix develop --command scripts/check-web.sh
```
