# Poker Fate Research

Research workspace for the official Poker Fate client APIs that expose player profile statistics.

Tracked files keep the current API contract, artifact provenance, and fetched result snapshots. Large binaries, decoded client output, raw API responses, and temporary session credentials stay under ignored directories.

## Current Result

The Android client exposes a guest login path and authenticated read APIs for player lookup and profile statistics. A dedicated guest account resolved `Hakula` to UID `10410931` and fetched VPIP / PFR / related profile rates.

## Documentation

| Document                                        | Description                                |
| ----------------------------------------------- | ------------------------------------------ |
| [API Inventory](docs/research/api-inventory.md) | Endpoint contract and `Hakula` snapshot    |
| [Android APK](docs/research/android-apk.md)     | APK provenance and decoded-client evidence |

## Layout

| Path           | Purpose                                                                            |
| -------------- | ---------------------------------------------------------------------------------- |
| `docs/`        | API contract, current findings, and artifact provenance.                           |
| `artifacts/`   | Local binary artifacts such as APK / EXE downloads. Ignored except for its README. |
| `work/`        | Temporary command output. Ignored.                                                 |
| `data/`        | Raw API responses and normalized local datasets. Ignored.                          |
| `apktool-out/` | Decoded Android resources. Ignored.                                                |
| `jadx-out/`    | Java decompiler output. Ignored.                                                   |

## Development Shell

```bash
nix develop
```

The shell includes Android static-analysis tools, text search utilities, Python for scratch decoding, and documentation linters.
