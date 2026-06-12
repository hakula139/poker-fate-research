# Android APK

## Artifact

- Source URL: <https://aws.poker-fate.com/dl/PokerFate_Android.apk>
- Local path: `artifacts/PokerFate_Android.apk`
- Downloaded: 2026-06-12
- HTTP `Last-Modified`: 2026-05-14
- Size: about 1.4 GB
- SHA-256: `1f12a3866ac4fffddf923d40608ef38a0770a33bfd371c650158fed623f7ca13`

## Package Metadata

- Package name: `com.pokerfate.play`
- Version code: `29`
- Version name: `1.5.3`
- Application label: `Poker Fate`
- Network permission: `android.permission.INTERNET`

## First-Pass Goals

1. Confirm Android package metadata and signing shape.
2. Identify whether the client is Unity / IL2CPP, native, or Java-heavy.
3. Extract public hostnames, URL paths, and feature strings.
4. Search for player-stat terms such as `vpip`, `pfr`, `入池率`, `紧弱`, `松弱`, `翻前纪律`, and `翻后保守`.

## Commands

```bash
nix develop
sha256sum artifacts/PokerFate_Android.apk
file artifacts/PokerFate_Android.apk
zipinfo -1 artifacts/PokerFate_Android.apk > work/apk-file-list.txt
aapt2 dump badging artifacts/PokerFate_Android.apk > work/aapt2-badging.txt
```

For targeted string extraction:

```bash
unzip -p artifacts/PokerFate_Android.apk 'lib/arm64-v8a/libil2cpp.so' \
  | strings -a \
  | rg -i 'https?://|vpip|pfr|入池|紧弱|松弱|翻前|翻后|玩家|数据库|认证|分析'
```

## First-Pass Findings

The APK is a Unity / IL2CPP Android client with Java SDK integration in DEX files. Static strings exposed STOVE / GATE8 account and platform hosts in `classes3.dex`, plus Firebase project configuration. No concrete player list, player stats, VPIP, PFR, or hand-history API path has been verified from the first pass.

Tracked candidate hosts and endpoints are in [`api-inventory.md`](api-inventory.md). Raw scan output stays under ignored `work/`.

## Unity Asset Decode Pass

The useful API evidence was inside Unity Addressables bundles under the APK `assets/aa/Android/` tree, not in top-level Java strings. The relevant local decode outputs are ignored:

| Output | Contents |
| ------ | -------- |
| `work/il2cpp-dump/` | Il2CppDumper output from `libil2cpp.so` and `global-metadata.dat`. |
| `work/unity-bundles/` | Selected Unity bundles copied out of the APK. |
| `work/unity-extract/lua/` | Decoded Lua model, view, table, and network handler files. |
| `work/unity-extract/proto/` | Decoded protobuf schema files. |
| `work/unity-extract/tpl/` | Decoded localized text and configuration tables. |
| `work/unity-extract/info/` | Decoded profile view files, including the profile record tab. |

Il2CppDumper identified the Lua and proto asset decode paths. The relevant client string literals include these XXTEA keys:

| Asset type | Key |
| ---------- | --- |
| Lua source | `bee#happy&pkproject` |
| Proto schema | `bee#happy&pkproto` |

The decoded Lua pass found `FriendModel.lua`, `InformationMainNew.lua`, `RankingModel.lua`, `LoginModel.lua`, `PlayerModel.lua`, and the HTTP code table. These files confirmed `POST /friend/searchList` for nickname / UID search and `POST /player/gameData` for profile statistics. The decoded proto pass found `CSGame.proto`, including `GetOtherDetailInfoREQ` / `GetOtherDetailInfoRSP` for profile detail over the socket protocol.

The release HTTP hosts in the decoded constants are:

| Channel branch | Hosts |
| -------------- | ----- |
| Normal release channels | `https://ga-foreign.poker-fate.com/`, `https://awsb-entry.poker-fate.com/` |
| Simplified Chinese PC / APK channels | `http://8.163.49.33:8888/`, `http://121.196.174.32:8888/`, `https://ga-foreign.poker-fate.com/`, `https://awsb-entry.poker-fate.com/` |

Live unauthenticated probes on 2026-06-12 showed that `open/checkServer` returns `{"code":0,"data":null}`, while `friend/searchList` and `player/gameData` return `{"code":-2}`. The decoded HTTP code table maps `-2` to login authorization verification failure, so further collection needs a normal authenticated session.
