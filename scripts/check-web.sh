#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"

pnpm --dir "$repo_root/web" install --frozen-lockfile
pnpm --dir "$repo_root/web" run check
pnpm --dir "$repo_root/web" run smoke
