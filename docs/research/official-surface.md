# Official Surface

## Website

- Official website: <https://www.pokerfate.com/>
- Storefront domain observed in website JavaScript: `store.pokerfate.com`
- Official web assets referenced object storage:
  - `aws.poker-fate.com`
  - `bh-cn.oss-cn-shanghai.aliyuncs.com`
  - `kktp-test.oss-cn-beijing.aliyuncs.com`

## Public Social Links

Website JavaScript referenced these public channels:

- Discord invite: <https://discord.com/invite/acrfBjX8xT>
- Bilibili: <https://space.bilibili.com/3632315995523599>
- Weibo: <https://weibo.com/u/8498066320>
- X / Twitter accounts under `PokerFate_*`

## Download URLs

These URLs were extracted from the official website JavaScript on 2026-06-12:

- Android APK: <https://aws.poker-fate.com/dl/PokerFate_Android.apk>
- Android APK mirror: <https://kktp-test.oss-cn-beijing.aliyuncs.com/dl/PokerFate_APK.apk>
- Windows client: <https://aws.poker-fate.com/dl/PokerFate_Windows.exe>
- Windows client mirror: <https://bh-cn.oss-cn-shanghai.aliyuncs.com/dl/PokerFate_WIN.exe>

## Initial API Observations

The website is mostly a static front-end for marketing, language selection, account links, and client downloads. Static scan of the HTML and 25 async JavaScript chunks did not expose an obvious player database API, stats endpoint, or strings matching `vpip`, `pfr`, `入池率`, `玩家社群数据库`, `认证`, or `分析`.

Certificate transparency checks for `pokerfate.com`, `blufffate.com`, and `poker-fate.com` did not surface an obvious public `api.*` or player-stat subdomain during the first pass.

## Repro Commands

```bash
curl -L 'https://www.pokerfate.com/' -o work/www.pokerfate.com.html
rg -o 'js/[^"]+\.js' work/www.pokerfate.com.html | sort -u
```
