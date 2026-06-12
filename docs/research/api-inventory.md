# API Inventory

This document tracks candidate official APIs for player data. A candidate is not considered usable until the request / response shape is verified and the access path is allowed.

## Status Labels

- `candidate`: extracted from an official source, not yet called or schema-verified.
- `confirmed-auth-required`: official client code identifies the request shape and live probing confirms the route exists, but an authenticated session is required before a successful response can be captured.
- `verified`: minimal request confirmed method, headers, parameters, and response shape.
- `collector`: implemented in repo tooling with a matching schema entry.
- `rejected`: confirmed unrelated, inaccessible, or not official.

## Candidates

The APK decode pass found the official client endpoints needed for the first research target, but they require a real logged-in session. The direct path for a `Hakula` lookup is `POST /friend/searchList` to resolve candidate users / UIDs, followed by `POST /player/gameData` for profile statistics such as VPIP and PFR. Unauthenticated live probes on 2026-06-12 returned HTTP 200 with `{"code":-2}`; the app's own HTTP code table labels `-2` as `HTTP_AUTHENTICATION_FAILED`, with English text `login.authorization verification failed`.

No UID or stats for `Hakula` have been fetched yet. The remaining blocker is access to a legitimate Poker Fate `authorization` value from the normal login flow. Guest login appears to create or bind a server-side account, so it has not been used from this repo.

## Confirmed Official Client APIs

Source artifact: `artifacts/PokerFate_Android.apk`, SHA-256 `1f12a3866ac4fffddf923d40608ef38a0770a33bfd371c650158fed623f7ca13`.

| API | Status | Source evidence | Request | Response evidence | Notes |
| --- | ------ | --------------- | ------- | ----------------- | ----- |
| `POST /friend/searchList` | confirmed-auth-required | Decoded `FriendModel.lua` calls this path from `searchFriend(searchText, cb)`. | JSON body with `nickname`; numeric search text also sends `friend_uid`. For `Hakula`, start with `{"nickname":"Hakula"}`. | Callback reads `data.list` when `data.code == 0`. Live unauthenticated probe returned `{"code":-2}`. | Best lead for resolving the UID before requesting stats. |
| `POST /player/gameData` | confirmed-auth-required | Decoded `InformationMainNew.lua` calls this path from the profile record tab. | JSON body with `game_type`, `player_uid`, and `lang`. | Callback reads `data.data` when `data.code == 0`; default UI fields list the schema below. Live unauthenticated probe returned `{"code":-2}`. | This is the direct VPIP / PFR stats API. |
| `POST /player/sngRecord` | candidate | Decoded `InformationMainNew.lua` calls this path when the SNG tab is active. | JSON body with `player_uid`. | Callback stores `resp.list`. | SNG trend support, not the primary VPIP / PFR target. |
| WebSocket `pb.GetOtherDetailInfoREQ` | candidate | Decoded `CSGame.proto` and profile code request `the_uid`. | Protobuf message with `the_uid`. | `GetOtherDetailInfoRSP` includes `brief`, `declaration`, achievements, collections, certification metadata, and achievement counts. | Useful profile detail once a UID is known, but not the detailed HUD-stat endpoint. |
| `POST activity/rankingList` | candidate | Decoded `RankingModel.lua` requests leaderboard pages. | JSON body with `id`, `skip`, `size`, `last_week`, and `immediately`. | Callback reads leaderboard data when `data.code == 0`. | Could discover public users from leaderboards after auth, but does not target one nickname directly. |

## `/player/gameData` Schema

Profile stats are requested for these game types:

| Label | `GAME_GAME_TYPE` constant | Value |
| ----- | ------------------------- | ----- |
| Hold'em lobby | `LOBBY_HOLDEM_GAME` | `10010101` |
| Omaha lobby | `LOBBY_OMAHA_GAME` | `10020101` |
| SNG Hold'em | `SNG_HOLDEM_GAME` | `10050301` |
| Friend-room Hold'em | `FRIEND_HOLDEM_GAME` | `20010103` |

Known response fields from the profile record UI:

| Field | Meaning in UI |
| ----- | ------------- |
| `game_type` | Game type returned by the API. |
| `fire_power` | Hold'em / Omaha score shown on lobby-game tabs. |
| `champion_points` | SNG score shown on the SNG tab. |
| `play_times` | Hands played. |
| `win_play_times` | Hands won. |
| `round` | Total rounds / sessions. |
| `win_round` | Winning rounds / sessions. |
| `tour_round` | SNGs played. |
| `tour_win_round` | SNGs won. |
| `tour_max_profit` | Biggest SNG win. |
| `tour_profit` | Total SNG winnings. |
| `max_profit` | Biggest pot. |
| `profit` | Total profit. |
| `pool_entry_rate` | VPIP. |
| `add_before_flipping_rate` | PFR. |
| `three_bet_rate` | 3-Bet. |
| `show_hand_rate` | WTSD. |
| `active_rate` | AFq. |
| `c_bete_rate` | C-Bet. |
| `best_cards` | Best hand display data. |
| `max_profit_cards` | Biggest-pot hand display data. |

The client formats each rate as `rate / 100`, so an API value of `2530` would display as `25.3%`. The same UI also uses `rate / 10000` for circular progress fill. The in-app text says profile statistics cover the past 30 days and exclude practice modes. The UI shows VPIP, PFR, and 3-Bet unconditionally, while WTSD, AFq, and C-Bet are presented as Shark Pass advanced stats.

## 2026-06-12 Android APK Scan

Source artifact: `artifacts/PokerFate_Android.apk`, SHA-256 `1f12a3866ac4fffddf923d40608ef38a0770a33bfd371c650158fed623f7ca13`.

Scan output: `work/android-api-candidates.json` and `work/targeted-api-context.txt` are ignored local outputs.

| Endpoint / Host | Status | Evidence | Notes |
| --------------- | ------ | -------- | ----- |
| `https://api-main-common.gate8.com` | candidate | `classes3.dex` | Production-looking STOVE / GATE8 common API host. No player-data path found in first-pass strings. |
| `https://api.onstove.com` | candidate | `classes3.dex` | STOVE platform API host. Likely account / platform SDK surface. |
| `https://s-api.onstove.com` | candidate | `classes3.dex` | STOVE API host. Purpose not confirmed. |
| `https://m-member.onstove.com/auth/login` | candidate | `classes3.dex` | Member login endpoint. Authentication flow, not player data. |
| `https://accounts.onstove.com/webview/sdk` | candidate | `classes3.dex` | Account webview SDK endpoint. Authentication flow. |
| `https://accounts.onstove.com/webview/sdk/verification` | candidate | `classes3.dex` | Account verification endpoint. Authentication flow. |
| `https://accounts.onstove.com/auth/captcha` | candidate | `classes3.dex` | Captcha endpoint. Authentication flow. |
| `pokerfate001.firebasestorage.app` | candidate | `assets/google-services-desktop.json`, `resources.arsc` | Firebase storage bucket for the Poker Fate project. Storage contents and permissions not verified. |
| `firestore.googleapis.com` | candidate | `libFirebaseCppApp-13_6_0.so` | Firebase SDK dependency. No Poker Fate collection or schema identified yet. |
| `firebaseinstallations.googleapis.com` | candidate | `classes3.dex` | Firebase installation service, likely SDK plumbing. |

Non-production hosts such as `api-dev-main-common.onstove.com`, `api-qa-main-common.onstove.com`, `api-qa2-main-common.onstove.com`, `m-member-dev.onstove.com`, `m-member-qa.onstove.com`, and `m-member-qa2.onstove.com` were also present in `classes3.dex`. Treat them as environment constants, not collection targets.

Relevant terms found in the APK include `player`, `rank`, `record`, `stats`, `user`, `api`, and `history`. First-pass string evidence pointed mostly to UI resources, SDKs, and generic libraries.

The strongest lead was game-logic asset metadata, not the STOVE host strings. Decoding the Lua and proto bundles confirmed the profile-stat and friend-search endpoints documented above.

Live root checks on 2026-06-12 confirmed that the platform hosts respond, but did not reveal useful schemas: `GET /` on `https://api-main-common.gate8.com` returned a Spring 404 JSON body, `GET /` on `https://api.onstove.com` returned `{"message":"name resolution failed"}`, and `https://s-api.onstove.com` returned 404. These checks prove service presence only.

Next useful step: use a legitimate authenticated session to call `POST /friend/searchList` with `{"nickname":"Hakula"}`, select the intended UID from `data.list`, then call `POST /player/gameData` for each profile game type. Decompile `classes3.dex` separately for STOVE / GATE8 SDK call sites only if the normal login flow needs more detail.

## Schema Template

```text
Endpoint:
Status:
Source evidence:
Method:
Authentication:
Required headers:
Request parameters:
Pagination:
Response status codes:
Response schema:
Notes:
```
