# Poker Fate Research

Research workspace for the official Poker Fate client APIs that expose player profile statistics.

Tracked files keep the current API contract, artifact provenance, and fetched result snapshots. Large binaries, decoded client output, raw API responses, and temporary session credentials stay under ignored directories.

## Current Result

The Android client exposes a guest login path and authenticated read APIs for player lookup and profile statistics. A dedicated guest account resolved `Hakula` to UID `10410931` and fetched VPIP / PFR / related profile rates. The leaderboard API provides public UID discovery for top weekly leaderboard rows, which can be enriched through the same profile-stat endpoint and classified with a documented first-pass tagging model.

## Documentation

See [`docs/`](docs/) for the research index, endpoint contract, and APK evidence.

## Development

`direnv` auto-activates the shell via `.envrc`.

```bash
nix develop -c zsh                                      # Manual interactive shell
nix flake check                                         # Run repository validation
```

The shell includes Android static-analysis tools, text search utilities, uv-managed Python tooling, Ruff, documentation linters, and pre-commit hooks.

Local leaderboard snapshots can be collected with `uv run poker-fate players`; see [`docs/research/player-discovery.md`](docs/research/player-discovery.md) for credential and output details.

## Player Stats Website

Build static website data from collected player snapshots, then run the frontend:

```bash
python scripts/build_web_data.py
cd web
pnpm install
pnpm run dev
```

The website reads generated static snapshot files from ignored `web/public/data/`. Future daily JSONL snapshots can be added under `data/player-snapshots/` and regenerated with the same script.
