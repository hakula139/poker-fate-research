# Poker Fate Stats Web

React website for browsing D1-backed Poker Fate player snapshots.

## Data

The app reads snapshots and searched-player cache entries through Worker API routes backed by Cloudflare D1. Daily collection and D1 import are handled by GitHub Actions. Local test fixtures live under `web/tests/fixtures/`.

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

GitHub Actions deploys from `main`, uploads pull request previews, and runs daily D1 imports. The workflows require these repository secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `POKER_FATE_RESEARCH_DEVICE_TOKEN`

Production and pull request deploys build the Worker artifact. The scheduled data workflow owns snapshot collection and D1 import.

## Player Tags

Player tags are split into preflop and postflop labels. The website surface is Texas Hold'em only; Omaha and SNG profile data is still collected through the API but not rendered. See [`../docs/research/player-tagging.md`](../docs/research/player-tagging.md) for the current tagging model and the reasons Omaha and SNG are not surfaced today.
