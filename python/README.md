# Poker Fate Python Tools

uv-managed Python package for collecting Poker Fate player snapshots and building website data.

Run these commands from the repository root.

## Commands

Collect leaderboard player snapshots:

```bash
uv --project python run poker-fate players
```

Build static frontend data from collected snapshots:

```bash
uv --project python run poker-fate web-data
```

The collector writes local JSONL snapshots under `data/player-snapshots/`. The website data builder writes generated JSON under `web/public/data/`. Both paths are ignored local artifacts.

## Checks

```bash
uv --project python run ruff check python/src
uv --project python run ruff format --check python/src
```
