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
