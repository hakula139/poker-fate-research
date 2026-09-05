# Android APK Evidence

## Artifact

| Field                | Value                                                              |
| -------------------- | ------------------------------------------------------------------ |
| Source URL           | <https://aws.poker-fate.com/dl/PokerFate_Android.apk>              |
| Local path           | `artifacts/PokerFate_Android.apk`                                  |
| Downloaded           | 2026-06-12                                                         |
| HTTP `Last-Modified` | 2026-05-14                                                         |
| Size                 | About 1.4 GB                                                       |
| SHA-256              | `1f12a3866ac4fffddf923d40608ef38a0770a33bfd371c650158fed623f7ca13` |

## Package Metadata

| Field              | Value                         |
| ------------------ | ----------------------------- |
| Package name       | `com.pokerfate.play`          |
| Version code       | `29`                          |
| Version name       | `1.5.3`                       |
| Application label  | `Poker Fate`                  |
| Network permission | `android.permission.INTERNET` |

## Useful Decoded Sources

The actionable API evidence came from decoded Unity Addressables bundles under the APK `assets/aa/Android/` tree. Java strings and the marketing website exposed hosts and account SDK references, but not the player-stat contract.

| Local output                | Useful contents                                                                                          |
| --------------------------- | -------------------------------------------------------------------------------------------------------- |
| `work/il2cpp-dump/`         | Il2CppDumper output from `libil2cpp.so` and `global-metadata.dat`.                                       |
| `work/unity-extract/lua/`   | Decoded Lua model and view files, including `LoginModel.lua`, `FriendModel.lua`, and `RankingModel.lua`. |
| `work/unity-extract/info/`  | Decoded profile views, including `InformationMainNew.lua`.                                               |
| `work/unity-extract/proto/` | Decoded protobuf schemas, including `CSGame.proto`.                                                      |
| `work/unity-extract/tpl/`   | Decoded localized text and HTTP code tables.                                                             |

Il2CppDumper identified the client decode paths and XXTEA keys:

| Asset type   | Key                   |
| ------------ | --------------------- |
| Lua source   | `bee#happy&pkproject` |
| Proto schema | `bee#happy&pkproto`   |

## Endpoint Evidence

| Decoded source           | Finding                                                                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `LoginModel.lua`         | Guest login sends `POST /login`; the response stores `authorization` for HTTP and `rdkey` for websocket login.                 |
| `FriendModel.lua`        | Nickname / UID search calls `POST /friend/searchList`.                                                                         |
| `InformationMainNew.lua` | Profile statistics call `POST /player/gameData`; SNG trend data calls `POST /player/sngRecord`.                                |
| `RankingModel.lua`       | Leaderboard pages call `POST /activity/rankingList`; rows include public UIDs that open the same profile view.                 |
| `CSGame.proto`           | `GetOtherDetailInfoREQ` / `GetOtherDetailInfoRSP` define websocket profile detail by UID.                                      |
| `tpl_HttpCode.lua`       | `-2` is `HTTP_AUTHENTICATION_FAILED`, displayed as login authorization verification failure.                                   |
| `tpl_mult_language.lua`  | Profile statistics are displayed as VPIP, PFR, 3-Bet, WTSD, AFq, and C-Bet, for the past 30 days and excluding practice modes. |

Release HTTP hosts from decoded constants:

| Channel branch                       | Hosts                                                                                                                                 |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Normal release channels              | `https://ga-foreign.poker-fate.com/`, `https://awsb-entry.poker-fate.com/`                                                            |
| Simplified Chinese PC / APK channels | `http://8.163.49.33:8888/`, `http://121.196.174.32:8888/`, `https://ga-foreign.poker-fate.com/`, `https://awsb-entry.poker-fate.com/` |

Raw decoded output and live API responses stay under ignored `work/` or `data/` paths.

## Current Login Evidence

Range inspection of the [official APK](https://aws.poker-fate.com/dl/PokerFate_Android.apk) on 2026-09-06 recovered the current login model, HTTP error table, and device-risk SDK helper. The full APK was not downloaded or hashed. The earlier artifact metadata above describes the June download.

| HTTP metadata   | Observed value                                                |
| --------------- | ------------------------------------------------------------- |
| Size            | `1871025148` bytes                                            |
| `Last-Modified` | `Mon, 27 Jul 2026 06:55:27 GMT`                               |
| `ETag`          | `e7050febc91be404b750c2ba6961b645-224` (multipart identifier) |

Extracted bundles under `assets/aa/Android/gameres_assets_src/`:

| Bundle path                                         | SHA-256                                                            |
| --------------------------------------------------- | ------------------------------------------------------------------ |
| `app/model_9e7869b6f287254b7cba717959df4903.bundle` | `757725bc418a2335d2894b3c1c0ebf037a8f1c701963d4e3f9a75b86c7c9db60` |
| `tpl_fa73c8cc0347b639a3a11b45215bb997.bundle`       | `5053d4bf91ff1660154e3a5e9077624c5df67655add464e063ee5819b30d6eaa` |
| `sdk_e49edbee7c31596a57c7977a7fa854aa.bundle`       | `7ba9c392ce2b72f6fa7b0ad07e2f494feb65bc360489dc27b975c002ef6642e1` |

`tpl_HttpCode.lua:13` maps `-5` to `HTTP_THIRD_RISK_VERIFY_FAILED` and tells the user that the device is not secure and to contact Support. Lines 16-18 separately define IP, device, and account blocks as `-52`, `-53`, and `-54`.

`LoginModel.lua:69-89` attaches `YiDunHelper:getReportData()` as `yidun_risk_check` before `POST /login`. Lines 255-257 submit the queued login after the SDK token callback. The existing MD5 verification formula remains at lines 760-761.

`YiDunHelper.lua:48-84` builds a report containing `account`, `ip`, `os`, and `sceneData` with the login channel, operation type, and app channel. For client versions at least `1.5.3`, it requests a token from `CS.DeviceFingerprint.Instance:GetToken()` and waits for the callback before adding `reportData.token` and releasing the login request. This token comes from the native risk SDK and is separate from the reusable guest device ID and the HTTP session authorization.

The current source establishes a contract difference from the repository clients. It does not establish when the report was introduced or prove that its omission is the only reason for a live risk rejection.
