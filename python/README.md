# Poker Fate Python Tools

uv-managed Python package for collecting Poker Fate player snapshots and importing them into D1.

Run these commands from the repository root.

## Commands

Collect leaderboard player snapshots:

```bash
uv --project python run poker-fate players
```

Build D1 import SQL from a collected player file:

```bash
uv --project python run poker-fate d1-import-sql data/player-snapshots/poker-fate-players-20260618T010203Z.jsonl --output work/d1-import.sql
```

The import upserts players into the unified `players` table and skips players with no Texas Hold'em hands. The collector writes local JSONL files under `data/player-snapshots/`. D1 import SQL is written under `work/`. Both paths are ignored local artifacts.

## Checks

```bash
uv --project python run ruff check python/src
uv --project python run ruff format --check python/src
```
