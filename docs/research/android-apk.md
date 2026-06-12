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
| `CSGame.proto`           | `GetOtherDetailInfoREQ` / `GetOtherDetailInfoRSP` define websocket profile detail by UID.                                      |
| `tpl_HttpCode.lua`       | `-2` is `HTTP_AUTHENTICATION_FAILED`, displayed as login authorization verification failure.                                   |
| `tpl_mult_language.lua`  | Profile statistics are displayed as VPIP, PFR, 3-Bet, WTSD, AFq, and C-Bet, for the past 30 days and excluding practice modes. |

Release HTTP hosts from decoded constants:

| Channel branch                       | Hosts                                                                                                                                 |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Normal release channels              | `https://ga-foreign.poker-fate.com/`, `https://awsb-entry.poker-fate.com/`                                                            |
| Simplified Chinese PC / APK channels | `http://8.163.49.33:8888/`, `http://121.196.174.32:8888/`, `https://ga-foreign.poker-fate.com/`, `https://awsb-entry.poker-fate.com/` |

Raw decoded output and live API responses stay under ignored `work/` or `data/` paths. Session credentials from guest login are scratch data and must not be committed.
