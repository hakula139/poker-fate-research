# Poker Fate Research

Research workspace, collector, D1 import pipeline, and player stats website for Poker Fate profile data.

The repo keeps the confirmed API findings, the player collector, D1 schema and import tooling, and the frontend source. Large binaries, decoded client output, raw API responses, local datasets, and credentials stay out of git.

## Current Result

Daily collection has failed at guest login since 2026-09-03 with device-risk verification code `-5`. The current official client supplies a native device-risk report that the collector and Worker omit. Existing stored snapshots remain available. See the [login findings](docs/research/api-inventory.md#guest-login) for evidence and recovery constraints.

The main output is a D1-backed website for browsing collected Poker Fate player stats. It supports player search, sortable stats, player details, per-player update times, dark mode, and English / Simplified Chinese UI.

The website surface is Texas Hold'em only. Player classification is split into preflop and postflop tags tuned for 6-max Hold'em. The collector still fetches Omaha and SNG profile data from the official API, but those modes are not exposed in the UI; see [`docs/research/player-tagging.md`](docs/research/player-tagging.md) for the reason.

A single unified player table is refreshed daily by GitHub Actions from the official leaderboards. Searching for or opening a player refreshes that player in the same table when its data is more than one hour old, so every player carries a one-hour freshness cache. Players with no Texas Hold'em hands are removed and hidden from search.

## Project Layout

| Path                       | Purpose                                                     |
| -------------------------- | ----------------------------------------------------------- |
| [`python/`](python/)       | Python package for the collector and D1 import CLI          |
| [`web/`](web/)             | React player stats website                                  |
| [`docs/`](docs/)           | Research notes, API findings, APK provenance, and tag model |
| [`artifacts/`](artifacts/) | Ignored local APK / binary downloads with tracked metadata  |
| `data/`, `work/`           | Ignored local snapshots, API responses, and scratch output  |

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
