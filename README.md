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
nix develop -c zsh  # Manual interactive shell
nix flake check     # Run repository validation
```

The shell includes Android static-analysis tools, text search utilities, Python for scratch decoding, documentation linters, and pre-commit hooks.
