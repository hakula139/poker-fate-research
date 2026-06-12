# API Inventory

This document tracks candidate official APIs for player data. A candidate is not considered usable until the request / response shape is verified and the access path is allowed.

## Status Labels

- `candidate`: extracted from an official source, not yet called or schema-verified.
- `verified`: minimal request confirmed method, headers, parameters, and response shape.
- `collector`: implemented in repo tooling with a matching schema entry.
- `rejected`: confirmed unrelated, inaccessible, or not official.

## Candidates

No verified player-data API yet. The first official APK scan found platform API hosts and authentication URLs, but did not expose a concrete player list, player stats, VPIP, PFR, or hand-history endpoint path.

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

Relevant terms found in the APK include `player`, `rank`, `record`, `stats`, `user`, `api`, and `history`. First-pass evidence points mostly to UI resources, SDKs, and generic libraries. It does not yet identify request / response schemas for a player list API or player-stat API.

The strongest current lead is game-logic asset metadata, not the STOVE host strings. The APK references Lua-side names such as `GameRes/src/app/model/RankingModel.lua`, `GameRes/src/app/table/data/PlayerData.lua`, `GameRes/src/app/table/data/PKRecordData.lua`, and `GameRes/src/app/table/IngameHistory.lua`; these point at ranking, player, and hand-record code paths, but they are not endpoint evidence until the Lua bundle contents or runtime calls are recovered.

Live root checks on 2026-06-12 confirmed that the platform hosts respond, but did not reveal useful schemas: `GET /` on `https://api-main-common.gate8.com` returned a Spring 404 JSON body, `GET /` on `https://api.onstove.com` returned `{"message":"name resolution failed"}`, and `https://s-api.onstove.com` returned 404. These checks prove service presence only.

Next useful step: extract or decode the Lua asset bundles that contain ranking and player-data modules, then trace their calls into `HttpManager` or `WebSocketManager`. Decompile `classes3.dex` separately for STOVE / GATE8 SDK call sites. The strings-only path scan is too noisy for Unity asset bundles and should not be treated as endpoint evidence.

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
