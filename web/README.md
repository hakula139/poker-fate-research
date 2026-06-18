# Poker Fate Stats Web

Local React website for browsing generated Poker Fate player snapshots.

## Data

From the repository root, collect player snapshots if needed, then generate frontend data:

```bash
uv --project python run poker-fate players
uv --project python run poker-fate web-data
```

The collector needs the dedicated guest research credential described in [`../docs/research/player-discovery.md`](../docs/research/player-discovery.md).

The app reads generated JSON from `web/public/data/`. Those files are local artifacts and are not committed. If generated data is missing, the app falls back to committed sample data and marks that state in the UI.

Daily JSONL snapshots can be added under `data/player-snapshots/` and regenerated with the same command from the repository root.

## Development

```bash
pnpm install
pnpm run dev
```

The dev server runs at <http://127.0.0.1:5178/>. Smoke tests run their own Vite server on port `5179`, so they do not depend on the dev server.

## Checks

```bash
nix develop --command scripts/check-web.sh
```

The web check script installs locked pnpm dependencies, runs ESLint, Prettier check, Vitest, type checking, a production build, and the Playwright smoke test.

## Deployment

Cloudflare Workers serves the production build from `web/dist`.

```bash
pnpm run build
pnpm exec wrangler deploy
```

Production URL: <https://poker-fate-stats.hakula.xyz/>

GitHub Actions deploys from `main` and uploads pull request previews. The workflows require these repository secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `POKER_FATE_RESEARCH_DEVICE_TOKEN`

Production deploys collect a fresh player snapshot before building. Pull request previews build without live collection and fall back to sample data when generated JSON is absent.

## Player Tags

Player tags are split into preflop and postflop labels. See [`../docs/research/player-tagging.md`](../docs/research/player-tagging.md) for the current tagging model.
