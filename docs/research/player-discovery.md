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
| Throne Points    | Current week | `12711`        | `100`                                 |
| Throne Points    | Last week    | `16893`        | `100`                                 |
| Honor Points     | Current week | `4991`         | `100`                                 |
| Honor Points     | Last week    | `6728`         | `100`                                 |
| Classic Winnings | Current week | `12729`        | `100`                                 |
| Classic Winnings | Last week    | `16893`        | `100`                                 |
| Casual Winnings  | Current week | `8174`         | `100`                                 |
| Casual Winnings  | Last week    | `11251`        | `100`                                 |

The sampled top-100 pages across active current and previous-week leaderboards contained `428` unique UIDs. The local ignored snapshot is `data/research-snapshots/leaderboard-and-profile-sample-2026-06-12.json`.

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
