# Player Discovery

This page records the confirmed route for discovering public player UIDs beyond direct nickname lookup. The current discovery source is the official leaderboard API decoded from the Android client and verified with a dedicated guest account.

## Leaderboard API

`POST /activity/rankingList`

Headers:

| Header          | Value                          |
| --------------- | ------------------------------ |
| `authorization` | JWT returned by `POST /login`. |
| `content-type`  | `application/json`             |

Request body:

| Field         | Value                                                                                    |
| ------------- | ---------------------------------------------------------------------------------------- |
| `id`          | Leaderboard ID from `tpl_leaderboard_info`.                                              |
| `skip`        | Offset. The client requests pages of 50.                                                 |
| `size`        | Page size. The client uses `50`.                                                         |
| `last_week`   | `false` for current week, `true` for the previous closed week.                           |
| `immediately` | `true` when the client wants the response immediately instead of using normal UI timing. |

Response fields observed in `list` rows:

| Field       | Meaning                                                          |
| ----------- | ---------------------------------------------------------------- |
| `rank`      | Rank within the selected leaderboard period.                     |
| `rank_id`   | Opaque leaderboard-row ID, used by `POST /activity/likeRanking`. |
| `uid`       | Player UID. This can be passed to `/player/gameData`.            |
| `name`      | Player display name.                                             |
| `value`     | Leaderboard score, such as points or chip winnings.              |
| `game_type` | Game type associated with the leaderboard row.                   |
| `avatar`    | Avatar item/config ID.                                           |
| `frame`     | Avatar frame item/config ID.                                     |
| `title`     | Title item/config ID.                                            |
| `skin_id`   | Character skin ID used by leaderboard presentation.              |
| `like`      | Leaderboard likes for the row.                                   |

The response also includes `total` and `self`. `total` can report thousands of ranked users, but live probes on 2026-06-12 showed that pagination is effectively capped at the top 100 rows. `skip = 0` and `skip = 50` returned rows; `skip = 100` returned an empty page with `total = 0`. Requesting `size = 200` also returned an empty page. This matches the decoded client cap `weekly_num = 100`.

## Leaderboard IDs

Decoded from `work/unity-extract/tpl/tpl_leaderboard_info.lua` and localized through `tpl_mult_language.lua`.

| ID  | English label    | Current status on 2026-06-12 | Meaning from client rules                                                              |
| --- | ---------------- | ---------------------------- | -------------------------------------------------------------------------------------- |
| `1` | Winnings         | Empty                        | Total weekly chip winnings across Hold'em, Omaha, Color Game, and limited-time All-In. |
| `2` | Throne Points    | Active                       | Weekly Throne Points from Hold'em, Omaha, and limited-time All-In.                     |
| `3` | Honor Points     | Active                       | Weekly tournament points from SNG.                                                     |
| `4` | Classic Winnings | Active                       | Weekly chip winnings from classic modes: Hold'em, Omaha, and limited-time All-In.      |
| `5` | Casual Winnings  | Active                       | Weekly chip winnings from casual modes: Color Game and Pinball.                        |

Live verification on 2026-06-12 using the reusable research guest:

| Leaderboard      | Period       | Reported total | Rows fetchable with client pagination |
| ---------------- | ------------ | -------------- | ------------------------------------- |
| Winnings         | Current week | `0`            | `0`                                   |
| Winnings         | Last week    | `0`            | `0`                                   |
| Throne Points    | Current week | `12788`        | `100`                                 |
| Throne Points    | Last week    | `16893`        | `100`                                 |
| Honor Points     | Current week | `5019`         | `100`                                 |
| Honor Points     | Last week    | `6728`         | `100`                                 |
| Classic Winnings | Current week | `12807`        | `100`                                 |
| Classic Winnings | Last week    | `16893`        | `100`                                 |
| Casual Winnings  | Current week | `8222`         | `100`                                 |
| Casual Winnings  | Last week    | `11251`        | `100`                                 |

The 2026-06-12 leaderboard snapshot fetched `800` rows from `26` leaderboard pages and discovered `431` unique UIDs. The local ignored snapshot files are under `data/player-snapshots/` with timestamp `20260612T085028Z`.

## Discovery Limits and Other Sources

There is no confirmed all-player listing endpoint. The current high-confidence discovery surfaces are:

| Source                         | Status                       | Use                                                                                                  |
| ------------------------------ | ---------------------------- | ---------------------------------------------------------------------------------------------------- |
| `POST /friend/searchList`      | Confirmed for known targets  | Resolves known nicknames or UIDs, such as `Hakula` / `10410931`, but does not provide enumeration.   |
| `POST /activity/rankingList`   | Confirmed and currently used | Discovers leaderboard-visible UIDs, capped at the client-visible top 100 rows per leaderboard week.  |
| Tournament WebSocket rank data | Decoded client lead          | `TourRankItem` contains `UserBrief`, which includes `uid`; this may expose SNG / MTT entrant ranks.  |
| Account social lists           | Confirmed account-scoped     | Friend, blocked, and friend-game lists are tied to the research account and empty for a fresh guest. |
| Card history / replay lists    | Confirmed account-scoped     | Recent and collected card lists are tied to the research account and empty for a fresh guest.        |

Fresh-guest probes on 2026-06-12 returned empty results for `friend/list`, `friend/gameList`, `friend/applyList`, `friend/blockedList`, `collCard/recentlyCardList`, and `collCard/list`. These endpoints can reveal UIDs only when the research account already has friends, recent games, or collected hands, so they are not broad public discovery sources.

The most promising expansion path is the tournament WebSocket API. The decoded protobuf schema contains `TourListREQ`, `TourHistoryListREQ`, `TourDetailInfoREQ`, `TourRoomDetailREQ`, and `MttRankREQ`. Their responses reference `TourRankItem`, and `TourRankItem` carries `UserBrief brief`. This still needs live WebSocket verification with the reusable research guest before it should be treated as a confirmed collector source.

## Leaderboard Snapshot Collector

Use `uv --project python run poker-fate players` from the repository root to create reproducible local JSONL snapshots under ignored `data/player-snapshots/`. The collector requires `POKER_FATE_RESEARCH_DEVICE_TOKEN` from an ignored local environment file and does not write guest authorization, `rdkey`, or raw login responses to output.

Guest logins have been rejected with `-5` since 2026-09-03, preventing live runs from completing today. The endpoint contract below remains unchanged; see [login rejection and recovery](api-inventory.md#login-rejection-and-recovery).

```bash
set -a
source .envrc.local
set +a
uv --project python run poker-fate players
```

Output files:

| File pattern                          | Contents                                                                                   |
| ------------------------------------- | ------------------------------------------------------------------------------------------ |
| `poker-fate-leaderboards-*.jsonl`     | One `leaderboard_page` record per fetched `/activity/rankingList` page.                    |
| `poker-fate-players-*.jsonl`          | One `player_snapshot` record per discovered UID, enriched with profile stats and SNG data. |
| `poker-fate-snapshot-*.metadata.json` | Snapshot paths, leaderboard summaries, fetched row counts, and guest UID.                  |

For a low-volume protocol check, use `--max-players 2`. That still fetches leaderboard pages but only enriches the first two discovered UIDs.

Reusable API client, model, and collection helpers live under `python/src/poker_fate_research/`. Run the collector through the uv-managed console script so imports and tool versions stay consistent.

## D1 Import

The website reads a single unified `players` table from Cloudflare D1 through Worker API routes. Convert a collected player JSONL file into D1 import SQL with:

```bash
uv --project python run poker-fate d1-import-sql data/player-snapshots/poker-fate-players-20260618T010203Z.jsonl --output work/d1-import.sql
```

The import upserts each player into the `players` table and records the fetch time used for the one-hour freshness cache. Players with no Texas Hold'em (`10010101`) hands are skipped on insert and removed from the table, so the website surface never lists empty profiles.

The daily collection workflow has been removed, so the stored table is no longer refreshed and the website performs no per-player refresh. Deploy workflows still build and publish the Worker.

## Stats Enrichment

Leaderboard `uid` values can be passed directly to `POST /player/gameData`, using the same profile-stat endpoint documented in `api-inventory.md`.

Sample enrichment on 2026-06-12 for the current Classic Winnings top five:

| Rank | UID        | Name             | Hold'em hands | Hold'em profit | VPIP     | PFR      |
| ---- | ---------- | ---------------- | ------------- | -------------- | -------- | -------- |
| `1`  | `10720217` | `读博高手唐可可` | `5505`        | `565456171`    | `79.96%` | `11.48%` |
| `2`  | `10495287` | `划水的鱼`       | `11186`       | `690992137`    | `32.80%` | `12.25%` |
| `3`  | `10445968` | `且听风吟`       | `9497`        | `646650857`    | `53.26%` | `16.48%` |
| `4`  | `10556510` | `阿萨拉喷火兵`   | `9302`        | `1204243254`   | `44.56%` | `21.11%` |
| `5`  | `10431673` | `重新开始`       | `10807`       | `1402480184`   | `47.07%` | `24.32%` |

The API returns rate fields as integer basis points of percent display, so `7996` displays as `79.96%`. See [Player Tagging](player-tagging.md) for a first-pass classification model using these profile fields.
