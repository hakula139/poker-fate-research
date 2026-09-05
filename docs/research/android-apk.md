# Android APK Evidence

## Current Artifact

| Field                | Value                                                              |
| -------------------- | ------------------------------------------------------------------ |
| Source URL           | <https://aws.poker-fate.com/dl/PokerFate_Android.apk>              |
| Local path           | `artifacts/PokerFate_Android-20260727.apk`                         |
| Downloaded           | 2026-09-06                                                         |
| HTTP `Last-Modified` | `Mon, 27 Jul 2026 06:55:27 GMT`                                    |
| HTTP `ETag`          | `e7050febc91be404b750c2ba6961b645-224` (multipart identifier)      |
| Size                 | `1871025148` bytes                                                 |
| SHA-256              | `e2cc9250c19259f240fce93b95f7b4afaf4fb7ee0e8cd5ece94e9b66ff6479c7` |

## Package Metadata

| Field               | Value                         |
| ------------------- | ----------------------------- |
| Package name        | `com.pokerfate.play`          |
| Version code        | `32`                          |
| Version name        | `1.6.9`                       |
| Minimum Android SDK | `28`                          |
| Target Android SDK  | `36`                          |
| Application label   | `Poker Fate`                  |
| Network permission  | `android.permission.INTERNET` |

## Decode Keys

Running Il2CppDumper on `libil2cpp.so` and `global-metadata.dat` revealed the client decode paths and XXTEA keys, which successfully decode both the `1.5.3` and `1.6.9` bundles.

| Asset type   | Key                   |
| ------------ | --------------------- |
| Lua source   | `bee#happy&pkproject` |
| Proto schema | `bee#happy&pkproto`   |

## Current Login Evidence

The full APK above and its extracted login sources were inspected on 2026-09-06. Relevant bundles, manifest, and DEX files initially recovered with ZIP byte ranges were checked against the completed local APK, including their entry CRCs. Decoded sources and extraction evidence are under ignored `work/apk-research/decoded/`.

Extracted bundles under `assets/aa/Android/gameres_assets_src/`:

| Bundle path                                         | SHA-256                                                            |
| --------------------------------------------------- | ------------------------------------------------------------------ |
| `app/model_9e7869b6f287254b7cba717959df4903.bundle` | `757725bc418a2335d2894b3c1c0ebf037a8f1c701963d4e3f9a75b86c7c9db60` |
| `tpl_fa73c8cc0347b639a3a11b45215bb997.bundle`       | `5053d4bf91ff1660154e3a5e9077624c5df67655add464e063ee5819b30d6eaa` |
| `sdk_e49edbee7c31596a57c7977a7fa854aa.bundle`       | `7ba9c392ce2b72f6fa7b0ad07e2f494feb65bc360489dc27b975c002ef6642e1` |

`tpl_HttpCode.lua:13` maps `-5` to `HTTP_THIRD_RISK_VERIFY_FAILED` and tells the user that the device is not secure and to contact Support. Lines 16-18 separately define IP, device, and account blocks as `-52`, `-53`, and `-54`.

`LoginModel.lua:69-89` attaches `YiDunHelper:getReportData()` as `yidun_risk_check` before `POST /login`. Lines 255-257 submit the queued login after the SDK token callback. The existing MD5 verification formula remains at lines 760-761.

`YiDunHelper.lua:48-84` builds a report containing `account`, `ip`, `os`, and `sceneData` with the login channel, operation type, and app channel. For client versions at least `1.5.3`, it requests a token from `CS.DeviceFingerprint.Instance:GetToken()` and waits for the callback before adding `reportData.token` and releasing the login request. This token comes from the native risk SDK and is separate from the reusable guest device ID and the HTTP session authorization.

For the guest path, `account` and `ip` are both `unknown`, `os` comes from `bee.pfsys`, and `sceneData` contains `registerOrLogType: "1"`, `operationType: "log"`, and `appChannel: "1"`. `EnumConfig.lua:377-378,413-416` supplies the guest-channel and login-operation constants. The helper polls for the native callback every 20 ms, with no timeout visible in the Lua code.

`YiDunHelper.lua:3-4` defines the gate versions `1.4.10` and `1.5.3`. In the same function, two branches submit `token` as an empty string: the Unity editor branch at line 67 and clients that fail the `1.4.10` check at line 82. While this reflects decoded client behavior under those build conditions, it does not establish that the live server accepts reports with an empty token.

`SdkHelper.lua:56-68` persists the guest `device_id`. It uses native device ID, Unity device identifier, and UUID generation as successive fallbacks when an identifier is invalid. The normal path reuses the stored identity.

### Native SDK

The APK embeds NetEase HTProtect Android SDK `5.7.6`, identified by `com/netease/htprotect/BuildConfig.java:9`, and `libNetHTProtect.so` for both bundled Android ABIs. `HTProtect.java:169-189` requires SDK initialization before retrieving a token and delegates to WatchMan. Lines 221-246 initialize the SDK with Android `Context`, an identifier, callbacks, and configuration. These signatures match the vendor's [Android game SDK integration](https://support.dun.163.com/documents/761315885761396736?docId=778684309123280896).

The current vendor [online-check contract](https://support.dun.163.com/documents/761315885761396736?docId=1207401648458317824) recommends submitting generated tokens within 30 minutes for detection quality. This is not a confirmed hard expiry for Poker Fate's tokens. Its legacy fingerprint SDK documentation describes a different integration and cannot establish this client's token lifetime.

`com/pokerfate/SdkHelper.java:200-219` contains root and emulator detection that displays an error and exits. The analysis did not establish whether this method is invoked, so emulator-based recovery is not an established supported path. The Android APK also cannot establish the desktop implementation of `DeviceFingerprint`.

The relevant decoded methods were readable, but JADX reported errors in unrelated methods. The C# SDK initialization call, actual token lifetime and binding, and successful official-client login were not verified. The current source establishes a contract difference from the repository clients. It does not establish when the report was introduced or prove that its omission is the only reason for a live risk rejection.

## Earlier Profile API Evidence

The findings below are from the 2026-06-12 profile API research, which evaluated version `1.5.3` (version code `29`) from the same official download URL. That earlier artifact was approximately 1.4 GB, with an HTTP `Last-Modified` date of 2026-05-14 and SHA-256 `1f12a3866ac4fffddf923d40608ef38a0770a33bfd371c650158fed623f7ca13`.

The actionable API evidence came from decoded Unity Addressables bundles under the APK `assets/aa/Android/` tree. Java strings and the marketing website exposed hosts and account SDK references, but not the player-stat contract.

### Endpoint Evidence

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
