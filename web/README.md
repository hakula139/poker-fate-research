# Poker Fate Stats Web

React website for browsing D1-backed Poker Fate player snapshots.

## Data

The app reads a single unified player table through Worker API routes backed by Cloudflare D1. GitHub Actions refreshes that table daily from the official leaderboards, and searching for or opening a player refreshes that individual player when its data is more than one hour old. Local test fixtures live under `web/tests/fixtures/`.

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

Production and pull request deploys build the Worker artifact. The scheduled data workflow owns daily player collection and D1 import.

## Preview environment

Pull request previews run as a separate `preview` Wrangler environment (`poker-fate-stats-preview`) bound to its own D1 database, so previews never read or write production data. The preview workflow applies the same migrations to the preview database and uploads a per-PR versioned preview URL. The preview Worker has its own `POKER_FATE_RESEARCH_DEVICE_TOKEN` secret so live search works there too.

The preview database is seeded from `seeds/preview-players.json`. Re-apply the seed after a destructive schema change with:

```bash
uv --project python run poker-fate d1-import-sql web/seeds/preview-players.json --output work/preview-seed.sql
pnpm --dir web exec wrangler d1 execute poker-fate-stats-preview --env preview --remote --file=../work/preview-seed.sql
```

## Player Tags

Player tags are split into preflop and postflop labels. The website surface is Texas Hold'em only; Omaha and SNG profile data is still collected through the API but not rendered. See [`../docs/research/player-tagging.md`](../docs/research/player-tagging.md) for the current tagging model and the reasons Omaha and SNG are not surfaced today.
