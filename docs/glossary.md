# Glossary

This glossary is for API discovery. Prefer exact English stat keys first because clients and APIs commonly keep HUD terms in English; use Chinese terms as secondary search keys when scanning localized UI text or documentation.

## Reference Sources

- Wikipedia poker glossary: <https://en.wikipedia.org/wiki/Glossary_of_poker_terms>
- Wikipedia Texas hold 'em overview: <https://en.wikipedia.org/wiki/Texas_hold_%27em>
- Chinese Wikipedia Texas hold 'em page: <https://zh.wikipedia.org/wiki/德州扑克>
- Upswing Poker HUD stats overview: <https://upswingpoker.com/poker-hud-stats/>
- Poker Copilot VPIP / PFR definitions: <https://pokercopilot.com/poker-statistics/vpip-pfr>
- DriveHUD stat definitions: <https://drivehud.com/knowledge-base/what-are-the-hud-stat-definitions/>

## Core Game Terms

| English               | Chinese search terms                   | Notes                                                          |
| --------------------- | -------------------------------------- | -------------------------------------------------------------- |
| Texas hold 'em        | `德州扑克`, `德扑`                     | Game name.                                                     |
| preflop               | `翻牌前`, `翻前`                       | Before the flop.                                               |
| flop                  | `翻牌`, `翻牌圈`                       | First three community cards.                                   |
| turn                  | `转牌`, `转牌圈`                       | Fourth community card.                                         |
| river                 | `河牌`, `河牌圈`                       | Fifth community card.                                          |
| showdown              | `摊牌`, `摊牌圈`                       | Remaining players compare hands after the final betting round. |
| hand history          | `牌局记录`, `手牌记录`, `牌谱`, `战绩` | Use these when looking for stored rounds or replay data.       |
| leaderboard / ranking | `排行榜`, `排名`, `榜单`               | Useful for player-list discovery.                              |

## Actions

| English                  | Chinese search terms                              | Notes                                                  |
| ------------------------ | ------------------------------------------------- | ------------------------------------------------------ |
| bet                      | `下注`                                            | First voluntary wager in a betting round.              |
| call                     | `跟注`                                            | Match the current bet.                                 |
| raise                    | `加注`                                            | Increase an existing bet.                              |
| re-raise / 3-bet         | `再加注`, `3-bet`, `3bet`, `3bet率`, `第三次下注` | Do not use `三 bet`; it is not standard Chinese usage. |
| 4-bet                    | `4-bet`, `4bet`, `四次下注`                       | Usually not translated in Chinese HUD contexts.        |
| continuation bet / c-bet | `持续下注`, `c-bet`, `cbet`                       | Postflop bet by the preflop aggressor.                 |
| fold                     | `弃牌`                                            | Leave the hand.                                        |
| check                    | `过牌`                                            | Decline to bet when no bet is pending.                 |
| limp                     | `跛入`, `平跟入池`                                | Call the big blind preflop instead of raising.         |
| all-in                   | `全下`, `all-in`                                  | Commit the full stack.                                 |

## HUD Stats

| Stat             | Meaning                                                                             | Chinese search terms                 |
| ---------------- | ----------------------------------------------------------------------------------- | ------------------------------------ |
| `VPIP`           | Voluntarily put money in pot preflop, excluding blind postings.                     | `入池率`, `主动入池率`, `自愿入池率` |
| `PFR`            | Preflop raise frequency.                                                            | `翻前加注率`, `翻前加注`             |
| `3Bet` / `3-Bet` | Frequency of making the third bet, commonly a preflop re-raise after an open raise. | `3bet率`, `再加注率`, `反加率`       |
| `Fold to 3Bet`   | Frequency of folding after opening and facing a 3-bet.                              | `面对3bet弃牌率`, `对3bet弃牌率`     |
| `CBet` / `C-Bet` | Continuation-bet frequency.                                                         | `持续下注率`, `cbet率`               |
| `Fold to CBet`   | Frequency of folding after facing a continuation bet.                               | `面对cbet弃牌率`, `对持续下注弃牌率` |
| `AF`             | Aggression factor, usually a ratio based on aggressive actions versus calls.        | `激进系数`, `攻击系数`               |
| `AFq`            | Aggression frequency, the share of postflop opportunities taken aggressively.       | `攻击频率`, `激进频率`               |
| `WTSD`           | Went to showdown.                                                                   | `摊牌率`, `进入摊牌率`               |
| `WSD` / `W$SD`   | Won money at showdown.                                                              | `摊牌胜率`, `摊牌赢率`               |
| `WWSF` / `W$WSF` | Won when saw flop.                                                                  | `看翻牌后胜率`, `见翻牌胜率`         |
| `ATS` / `Steal`  | Attempt to steal blinds.                                                            | `偷盲率`, `偷盲`                     |

## Player Style Labels

| English          | Chinese search terms | Notes                                                                         |
| ---------------- | -------------------- | ----------------------------------------------------------------------------- |
| tight            | `紧`, `紧手`         | Plays fewer hands.                                                            |
| loose            | `松`, `松手`         | Plays more hands.                                                             |
| aggressive       | `凶`, `激进`, `主动` | Bets and raises frequently.                                                   |
| passive          | `弱`, `被动`         | Calls and checks more often.                                                  |
| tight-aggressive | `紧凶`, `TAG`        | Common HUD-style player label.                                                |
| loose-aggressive | `松凶`, `LAG`        | Common HUD-style player label.                                                |
| tight-passive    | `紧弱`, `紧被动`     | Useful as a localized style label, but less likely to appear as an API field. |
| loose-passive    | `松弱`, `松被动`     | Useful as a localized style label, but less likely to appear as an API field. |
