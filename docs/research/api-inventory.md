# Poker Fate API Contract

This page records the currently useful official client APIs for fetching player profile statistics. The confirmed route is guest login, nickname lookup, then profile-stat reads.

## Safety Boundary

Use a dedicated guest account for research. Do not reuse a main player account for automation. Keep requests read-only and low-volume, and do not commit returned `authorization`, `rdkey`, raw account payloads, or device tokens.

## Base Hosts

| Purpose             | Host                                   |
| ------------------- | -------------------------------------- |
| Primary HTTP API    | `https://ga-foreign.poker-fate.com/`   |
| Secondary HTTP API  | `https://awsb-entry.poker-fate.com/`   |
| Primary websocket   | `wss://ga-foreign.poker-fate.com:9012` |
| Secondary websocket | `wss://awss-entry.poker-fate.net:443`  |

## Guest Login

`POST /login`

Guest login creates or resumes an account keyed by the device token.

Request body:

| Field       | Value                                                             |
| ----------- | ----------------------------------------------------------------- |
| `type`      | `1`                                                               |
| `token`     | Device ID or generated research device token.                     |
| `imei`      | Same value as `token` for the Android guest path.                 |
| `os`        | Android platform string. `Android` was accepted in the live test. |
| `lang`      | UI language, such as `en`.                                        |
| `verify`    | `md5(os + imei + "ba2798edafa12f3ae08822a3203158cb")`             |
| `adjust_id` | `null` was accepted in the live test.                             |
| `mask`      | `LoginHttp`                                                       |

Successful response fields:

| Field           | Meaning                                                    |
| --------------- | ---------------------------------------------------------- |
| `code`          | `0` on success.                                            |
| `uid`           | Guest account UID.                                         |
| `rdkey`         | Websocket login key.                                       |
| `authorization` | JWT used as the HTTP `authorization` header.               |
| `server.server` | Ordered HTTP and websocket server list.                    |
| `is_reg`        | `true` on first registration for a generated device token. |
| `is_guest`      | `true` for guest accounts.                                 |

Live verification on 2026-06-12 created guest UID `10700557`.

## Player Lookup

`POST /friend/searchList`

Headers:

| Header          | Value                          |
| --------------- | ------------------------------ |
| `authorization` | JWT returned by `POST /login`. |
| `content-type`  | `application/json`             |

Request body:

| Lookup type      | Body                                            |
| ---------------- | ----------------------------------------------- |
| Nickname         | `{"nickname":"Hakula"}`                         |
| Numeric UID text | `{"nickname":"10410931","friend_uid":10410931}` |

Successful response:

| Field  | Meaning                    |
| ------ | -------------------------- |
| `code` | `0` on success.            |
| `list` | Matching player summaries. |

`Hakula` lookup result on 2026-06-12:

| Field        | Value      |
| ------------ | ---------- |
| `uid`        | `10410931` |
| `nickname`   | `Hakula`   |
| `level`      | `30`       |
| `game_level` | `30`       |
| `is_online`  | `false`    |
| `status`     | `-1`       |

## Profile Statistics

`POST /player/gameData`

Headers:

| Header          | Value                          |
| --------------- | ------------------------------ |
| `authorization` | JWT returned by `POST /login`. |
| `content-type`  | `application/json`             |

Request body:

| Field        | Value                                      |
| ------------ | ------------------------------------------ |
| `game_type`  | One of the profile game-type values below. |
| `player_uid` | Target player UID.                         |
| `lang`       | UI language, such as `en`.                 |

Profile game types:

| Label               | Constant             | Value      |
| ------------------- | -------------------- | ---------- |
| Hold'em lobby       | `LOBBY_HOLDEM_GAME`  | `10010101` |
| Omaha lobby         | `LOBBY_OMAHA_GAME`   | `10020101` |
| SNG Hold'em         | `SNG_HOLDEM_GAME`    | `10050301` |
| Friend-room Hold'em | `FRIEND_HOLDEM_GAME` | `20010103` |

Response fields used by the profile UI:

| Field                      | Meaning                                                            |
| -------------------------- | ------------------------------------------------------------------ |
| `game_type`                | Game type returned by the API                                      |
| `fire_power`               | Hold'em / Omaha score shown on lobby-game tabs                     |
| `champion_points`          | SNG score shown on the SNG tab                                     |
| `play_times`               | Hands played                                                       |
| `win_play_times`           | Hands won                                                          |
| `round`                    | Total rounds / sessions                                            |
| `win_round`                | Winning rounds / sessions                                          |
| `tour_round`               | SNGs played                                                        |
| `tour_win_round`           | SNGs won                                                           |
| `tour_max_profit`          | Biggest SNG win                                                    |
| `tour_profit`              | Total SNG winnings                                                 |
| `max_profit`               | Biggest pot                                                        |
| `profit`                   | Total profit                                                       |
| `pool_entry_rate`          | VPIP (voluntarily put money in pot before the flop)                |
| `add_before_flipping_rate` | PFR (preflop raise)                                                |
| `three_bet_rate`           | 3-Bet (preflop re-raise after an opening raise)                    |
| `show_hand_rate`           | WTSD (went to showdown)                                            |
| `active_rate`              | AFq (aggression frequency)                                         |
| `c_bete_rate`              | C-Bet (continuation bet after being the previous-street aggressor) |
| `best_cards`               | Best hand display data                                             |
| `max_profit_cards`         | Biggest-pot hand display data                                      |

The client displays rate fields as `rate / 100`, so an API value of `2530` displays as `25.30%`. The same UI uses `rate / 10000` for circular progress fill. Decoded in-app text says these profile statistics cover the past 30 days and exclude practice modes.

## `Hakula` Snapshot

Fetched on 2026-06-12 for UID `10410931` with a dedicated guest account:

| Game type           | Hands  | Profit     | VPIP      | PFR      | 3-Bet   | WTSD     | AFq      | C-Bet    |
| ------------------- | ------ | ---------- | --------- | -------- | ------- | -------- | -------- | -------- |
| Hold'em lobby       | `8229` | `94114872` | `33.74%`  | `16.17%` | `8.86%` | `31.18%` | `20.24%` | `44.39%` |
| Omaha lobby         | `3`    | `11750`    | `100.00%` | `0.00%`  | `0.00%` | `33.33%` | `20.00%` | `0.00%`  |
| SNG Hold'em         | `0`    | `0`        | `0.00%`   | `0.00%`  | `0.00%` | `0.00%`  | `0.00%`  | `0.00%`  |
| Friend-room Hold'em | `0`    | `0`        | `0.00%`   | `0.00%`  | `0.00%` | `0.00%`  | `0.00%`  | `0.00%`  |

`POST /player/sngRecord` for UID `10410931` returned `{"code":0}` with an empty `list`.

## Related APIs

| API                                  | Use                                                                                                         |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `POST /player/sngRecord`             | SNG trend data for a target UID.                                                                            |
| WebSocket `pb.GetOtherDetailInfoREQ` | Profile detail by UID, including brief profile, bio, achievements, collections, and certification metadata. |
| `POST activity/rankingList`          | Authenticated leaderboard pages; useful for discovering public users, not for direct nickname lookup.       |

## Error Codes

| Code | Client label                 | Meaning                                       |
| ---- | ---------------------------- | --------------------------------------------- |
| `0`  | `HTTP_RET_OK`                | Success.                                      |
| `-2` | `HTTP_AUTHENTICATION_FAILED` | `authorization` missing, invalid, or expired. |
