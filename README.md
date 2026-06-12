# Poker Fate Research

Research workspace for the official Poker Fate client APIs that expose player profile statistics.

Tracked files keep the current API contract, artifact provenance, and fetched result snapshots. Large binaries, decoded client output, raw API responses, and temporary session credentials stay under ignored directories.

## Current Result

The Android client exposes a guest login path and authenticated read APIs for player lookup and profile statistics. A dedicated guest account resolved `Hakula` to UID `10410931` and fetched VPIP / PFR / related profile rates.

See [`docs/research/api-inventory.md`](docs/research/api-inventory.md) for the endpoint contract and [`docs/research/android-apk.md`](docs/research/android-apk.md) for APK provenance.

## Layout

| Path | Purpose |
| ---- | ------- |
| `docs/` | API contract, current findings, and artifact provenance. |
| `artifacts/` | Local binary artifacts such as APK / EXE downloads. Ignored except for its README. |
| `work/` | Temporary command output. Ignored. |
| `data/` | Raw API responses and normalized local datasets. Ignored. |
| `apktool-out/` | Decoded Android resources. Ignored. |
| `jadx-out/` | Java decompiler output. Ignored. |

## Development Shell

```bash
nix develop
```

The shell includes Android static-analysis tools, text search utilities, Python for scratch decoding, and documentation linters.
