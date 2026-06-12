# Poker Fate Research

Research workspace for discovering official Poker Fate APIs that expose player data, documenting request / response schemas, and building our own collection tools.

Tracked files keep durable findings, reproducible commands, and source links. Large binaries and generated reverse-engineering output stay under ignored directories.

## Layout

| Path | Purpose |
| ---- | ------- |
| `docs/` | API specs, durable study notes, and findings. |
| `src/` | Local tooling for API discovery and later data collection. |
| `artifacts/` | Local binary artifacts such as APK / EXE downloads. Ignored except for its README. |
| `work/` | Temporary command output. Ignored. |
| `data/` | Raw API responses and normalized local datasets. Ignored. |
| `apktool-out/` | Decoded Android resources. Ignored. |
| `jadx-out/` | Java decompiler output. Ignored. |

## Development Shell

```bash
nix develop
```

The shell includes Android static-analysis tools, text search utilities, Python tooling, and documentation linters.

## API Candidate Scan

```bash
nix develop
python -m poker_fate_research scan artifacts/PokerFate_Android.apk --json > work/android-api-candidates.json
```
