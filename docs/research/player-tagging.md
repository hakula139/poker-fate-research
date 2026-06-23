# Player Tagging

This page records the player classification model used by the stats site. Treat these tags as heuristic labels, not objective judgments.

The site shows two tag tracks. Algorithmic tags are computed from official profile stats in `web/src/features/player-stats/tagging.ts` and always reflect the latest snapshot. Community tags are crowd-sourced reads that the official stats cannot express; they are voted by visitors, stored in D1, and surfaced only once enough distinct voters agree. The two tracks never share a label, so a computed style is never confused with a community opinion. See [Community Tags](#community-tags) for that track.

## Current Model

The tagging model and the public stats website cover Hold'em lobby only. The collector still fetches every confirmed `/player/gameData` profile game type so the official API contract stays documented in [API Inventory](api-inventory.md), but Omaha, SNG Hold'em, and friend-room Hold'em are not selectable in the UI and are not classified. See [Excluded Game Modes](#excluded-game-modes) for the reasons.

Each sampled Hold'em player receives one primary preflop tag and one primary postflop tag. If the player has fewer than `500` Hold'em hands, the UI shows only `Sample too low`. Players above the hand threshold can also receive additive overlay chips for narrow signals that do not replace the primary taxonomy.

## Signals and Limits

The official profile-stat API exposes enough public fields for a first-pass style model:

| Field                      | Signal                                                     |
| -------------------------- | ---------------------------------------------------------- |
| `play_times`               | Sample size.                                               |
| `pool_entry_rate`          | VPIP, preflop participation.                               |
| `add_before_flipping_rate` | PFR, preflop raising.                                      |
| `three_bet_rate`           | Preflop re-raise frequency.                                |
| `show_hand_rate`           | WTSD, willingness to continue to showdown.                 |
| `active_rate`              | AFq, postflop aggression frequency.                        |
| `c_bete_rate`              | C-Bet frequency after being the previous-street aggressor. |

Rates are returned as integer basis points of percent display, so `2530` displays as `25.30%`. The UI also displays `profit`, but the classifier does not use profit as a style tag because it is an outcome, not a strategic tendency.

Common HUD references also use signals that are not exposed by the current profile-stat API:

| Read                         | Missing signal                                                                                       |
| ---------------------------- | ---------------------------------------------------------------------------------------------------- |
| Blind-steal / blind-defense  | Position-specific opens, steal attempts, fold-to-steal, and blind-defense frequencies.               |
| 3-Bet exploitability         | Fold-to-3-Bet, 4-Bet, and fold-to-4-Bet frequencies.                                                 |
| C-Bet exploitability         | Fold-to-C-Bet, raise-C-Bet, delayed-C-Bet, and single-raised-pot versus 3-Bet-pot splits.            |
| Showdown quality             | Won money at showdown and won when saw flop.                                                         |
| Barrel profile               | Turn / river C-Bet, probe, check-raise, and river aggression frequencies.                            |
| Tournament-stage SNG profile | Stack depth, blind level, ante stage, bubble state, push / fold opportunities, ROI, and ITM history. |

## Calibration Notes

External 6-max / cash-game HUD guidance agrees that VPIP and PFR are the main first-pass dimensions, the VPIP / PFR gap is a passive-play signal, low VPIP indicates nitty play, high VPIP with low PFR indicates loose-passive play, and high VPIP with high PFR points toward LAG or maniac profiles. 3-Bet, WTSD, AFq, and C-Bet are useful confirming signals, but they need larger samples and cannot express every exploit without the missing fields above.

The 2026-06-12 Poker Fate Hold'em snapshot is much more passive than common 6-max cash HUD guidance: among players with at least `500` Hold'em hands, median WTSD is `35.55%`, median AFq is `17.86%`, and median C-Bet is `37.63%`. Treating that median as balanced would hide a real population tendency, so the postflop model keeps external 6-max baselines in view.

Fresh low-volume check on 2026-06-23: the official collector discovered `444` leaderboard-visible UIDs and enriched the first `40` UID-sorted players with `--max-players 40`. Of those, `39` had Hold'em hands and `25` had at least `500` Hold'em hands. This is useful as a field-shape check, not population calibration, because the enriched set is UID-sorted after leaderboard discovery.

Observed 2026-06-23 sampled Hold'em ranges for players with at least `500` hands:

| Field | Median   | 75th percentile | 90th percentile |
| ----- | -------- | --------------- | --------------- |
| VPIP  | `36.97%` | `41.51%`        | `62.41%`        |
| PFR   | `13.90%` | `18.07%`        | `26.55%`        |
| 3-Bet | `7.37%`  | `9.49%`         | `11.85%`        |
| WTSD  | `35.18%` | `38.54%`        | `43.57%`        |
| AFq   | `17.25%` | `20.92%`        | `23.24%`        |
| C-Bet | `42.10%` | `47.76%`        | `51.52%`        |

## Preflop Tags

Use a minimum hand threshold before assigning a preflop style. A conservative first cutoff is:

| Condition                                         | Tag              | Rationale                                                          |
| ------------------------------------------------- | ---------------- | ------------------------------------------------------------------ |
| Hands `< 500`                                     | `Sample too low` | Avoid strong labels from unstable small samples.                   |
| VPIP `< 15%`                                      | `Nit`            | Very tight preflop participation.                                  |
| VPIP `15-20%`, VPIP / PFR gap `<= 8%`             | `TAG`            | Tight for 6-max, but still entering pots with matching raises.     |
| VPIP `15-20%`, VPIP / PFR gap `> 8%`              | `Tight-passive`  | Tight range that still calls noticeably more often than it raises. |
| VPIP `20-28%`, VPIP / PFR gap `<= 10%`            | `TAG`            | Standard 6-max tight-aggressive range with enough raising.         |
| VPIP `20-28%`, VPIP / PFR gap `> 10%`             | `Tight-passive`  | Standard-width VPIP with too much calling relative to raising.     |
| VPIP `28-40%`, VPIP / PFR gap `<= 12%`            | `LAG`            | Loose range with matching aggression.                              |
| VPIP `28-40%`, VPIP / PFR gap `> 12%` and `< 18%` | `Loose-balanced` | Loose range with a medium raise gap, between LAG and passive.      |
| VPIP `>= 28%`, VPIP / PFR gap `>= 18%`            | `Loose-passive`  | Many pots entered without matching raises.                         |
| VPIP `>= 40%`, PFR `>= 25%`, 3-Bet `>= 10%`       | `Maniac`         | Loose and over-aggressive preflop profile.                         |
| VPIP `>= 40%`, PFR `>= 25%`, below maniac cutoff  | `LAG`            | Very loose and aggressive, but without the extra maniac signal.    |

Players above the hand threshold should always receive a preflop label. The middle buckets cover players between the tight-aggressive, loose-aggressive, and loose-passive shapes.

## Postflop Tags

The website presents separate preflop and postflop chips. The preflop chip uses VPIP, PFR, VPIP / PFR gap, and 3-Bet. The postflop chip uses WTSD, AFq, and C-Bet. This avoids mixing a player who enters too many pots with a player who simply calls down too often after the flop.

Postflop tags:

| Condition                                 | Tag                  | Rationale                                                  |
| ----------------------------------------- | -------------------- | ---------------------------------------------------------- |
| Hands `< 500`                             | `Sample too low`     | Avoid postflop labels from unstable samples.               |
| AFq `>= 40%` or C-Bet `>= 60%`            | `Postflop aggressor` | High pressure after the flop, especially by betting leads. |
| WTSD `>= 33%` and AFq `< 30%`             | `Showdown caller`    | Continues to showdown too often without enough aggression. |
| WTSD `<= 25%`, AFq `< 30%`, C-Bet `< 50%` | `Fit-or-fold`        | Avoids showdown and does not apply much pressure.          |
| WTSD `>= 33%`                             | `Showdown-heavy`     | Reaches showdown often, but not purely passive.            |
| AFq `< 30%` and C-Bet `< 50%`             | `Postflop passive`   | Below normal aggression without the high-showdown shape.   |
| Remaining sampled players                 | `Postflop balanced`  | Closest to a normal 6-max cash postflop shape.             |

## Overlay Tags

Overlay tags add narrow reads without changing the primary preflop / postflop labels or table sorting. They use the same `500`-hand cutoff as the primary tags.

| Condition      | Tag              | Rationale                                                                            |
| -------------- | ---------------- | ------------------------------------------------------------------------------------ |
| 3-Bet `>= 10%` | `3-Bet pressure` | Common HUD guidance treats roughly `6-10%` as normal and `10-12%+` as aggressive.    |
| 3-Bet `< 4%`   | `Low 3-Bet`      | Flags players who have a meaningful sample but rarely re-raise preflop.              |
| C-Bet `< 35%`  | `Low C-Bet`      | Confirms low continuation pressure after a player was the previous-street aggressor. |

`Showdown caller` already captures the high-WTSD, low-AFq "sticky caller" shape as a primary postflop tag. Profit remains visible in the table and details panel, but it is not a style tag.

## Community Tags

The algorithmic tags above cover only what the profile-stat API exposes. Many useful reads, such as bluffing tendency, tilt, table etiquette, and exploit habits, cannot be derived from aggregate VPIP / PFR / WTSD / AFq / C-Bet. Community tags let visitors record those reads by voting on a fixed preset list, with no free text, so the vocabulary stays curated and never duplicates an algorithmic label. The calling-station read is deliberately absent because the `Showdown caller` algorithmic tag (跟注站) already covers it.

A community tag is private until it earns agreement. The table and details panel show it only once at least `10` distinct voters apply it. Below that threshold a tag is visible only to the voter who selected it, inside the details-panel voter, so casual or single-actor labels do not leak into the public surface.

Preset community tags:

| Tag             | 中文     | Read                                                            |
| --------------- | -------- | --------------------------------------------------------------- |
| `Bluff-heavy`   | 诈唬狂   | Bets and raises as bluffs more than the board justifies.        |
| `Tilts easily`  | 易上头   | Decisions degrade after losses or bad beats.                    |
| `Hero caller`   | 英雄跟注 | Makes thin bluff-catching calls against big bets.               |
| `Slow-roller`   | 慢摇     | Stalls before showing the winning hand; poor etiquette.         |
| `Limper`        | 跛入     | Enters pots by calling the big blind instead of raising.        |
| `Friendly`      | 友善     | Pleasant or soft at the table.                                  |
| `Overfolds`     | 过度弃牌 | Folds too often to aggression.                                  |
| `Min-raiser`    | 最小加注 | Defaults to minimum-size raises.                                |
| `Blind stealer` | 偷盲     | Attacks the blinds frequently from late position.               |
| `Bumhunter`     | 猎鱼     | Seeks out and table-selects weaker players.                     |
| `Promo hunter`  | 羊毛党   | Plays mainly to farm bonuses and promotions.                    |
| `Donk bettor`   | 驴式下注 | Leads into the previous-street aggressor while out of position. |

### Trust model

Voting is anonymous, with no account. The controls are best-effort deterrents, not a Sybil-proof system:

- One vote per (player, tag, voter). Each browser stores an opaque voter id, and voting again toggles the vote off. Because the id is client-side and clearable, this is a soft de-duplicate.
- The real cap is server-side rate limiting keyed by a salted hash of the request IP, bounded to `60` writes per hour. The raw IP is never stored.
- The `10`-distinct-voter display threshold blunts single-actor manipulation before a tag goes public.

### Data

Votes live in D1, independent of the official player snapshot (migration `web/migrations/0003_community_tags.sql`):

- `community_tag_votes(uid, tag, voter_id, created_at)` with a composite primary key on `(uid, tag, voter_id)`, so a distinct-voter count is `COUNT(*)` per `(uid, tag)`.
- `community_vote_rate_limits(ip_hash, window_start, count)` for the per-hour IP write cap.

The Worker exposes `GET /api/players/:uid/tags` (all presets with current counts and the caller's own votes) and `POST /api/players/:uid/tags` (body `{ tag, voterId, action }`), and attaches threshold-met tags to the player list, search, and refresh responses so the table renders them without extra requests.

## Excluded Game Modes

The collector fetches every confirmed profile game type, but the current public model classifies only Hold'em lobby (`10010101`). Other modes have real data in the current sample; they are excluded because they need separate baselines and, for SNG, different outcome metrics.

The 2026-06-23 bounded run enriched `40` leaderboard-discovered players:

| Game type           | Players with hands | Players with `>= 500` hands | Max hands |
| ------------------- | ------------------ | --------------------------- | --------- |
| Hold'em lobby       | `39`               | `25`                        | `17390`   |
| Omaha lobby         | `31`               | `11`                        | `5544`    |
| SNG Hold'em         | `36`               | `13`                        | `7583`    |
| Friend-room Hold'em | `14`               | `3`                         | `707`     |

Omaha has enough fresh rows to show that the fields are populated, but not enough to set a stable threshold table from this checkout. Four-card equities and board coverage also change the meaning of VPIP, PFR, C-Bet, and aggression, so importing Hold'em lobby thresholds would mislabel the mode.

SNG Hold'em also has populated profile rows and SNG history in the current sample. The same bounded run contained `1048` `/player/sngRecord` rows across the `40` enriched players, and `36` players had nonzero `tour_round`. The SNG HUD fields have a different shape from cash Hold'em: among sampled players with at least `500` SNG Hold'em hands, median VPIP was `67.16%`, median PFR was `44.59%`, median WTSD was `63.58%`, and median C-Bet was `4.32%`. Those values reflect a tournament surface, not a 6-max cash baseline.

Friend-room Hold'em is also excluded from the model. It is a separate play context and the 2026-06-23 bounded sample had only `3` players with at least `500` friend-room hands.

Future Omaha and SNG tags should use their own threshold tables. For SNG, the useful basis is likely tournament outcomes and stage-aware tendencies, such as ROI, ITM, tour profit per game, and stack-depth push / fold behavior, rather than cash-game VPIP / PFR / WTSD / AFq / C-Bet bands alone.

References:

- <https://plo.com/plo-vs-nlhe>: PLO vs Hold'em strategy differences and explicit advice to recalibrate HUD baselines rather than import Hold'em thresholds.
- <https://www.poker.pro/strategy/5-key-diffences-between-pot-limit-omaha-and-no-limit-hold-em-102/>: PLO equity compression and typical Omaha VPIP ranges relative to Hold'em.
- <https://www.vip-grinders.com/poker-strategy/sit-and-go/>: Stage-by-stage SNG strategy, push / fold under `~12 BB`, and realistic SNG ROI ranges.
- <https://riverodds.app/sit-and-go-strategy/>: Stage-dependent VPIP guidance and stack-depth push / fold tables for 9-max SNGs.

## External References

- <https://pokercopilot.com/poker-statistics/vpip-pfr>: Defines VPIP/PFR, explains that a larger VPIP / PFR gap indicates passivity, and gives example VPIP/PFR ranges for nits, rocks, regulars, and loose-passive players.
- <https://www.blackrain79.com/2017/10/what-are-the-best-poker-hud-stats.html>: Gives 6-max HUD reference points including VPIP `20`, PFR `17`, 3-Bet `7`, and flop C-Bet `70`.
- <https://upswingpoker.com/poker-hud-stats/>: Gives WTSD guidance around `27-32%`, with `30%` as a useful target, and warns that WTSD needs a large sample.
- <https://drivehud.com/dwkb/what-are-good-hud-stats/>: Gives WTSD normal range around `20-30%` and explains aggression-factor interpretation.
- <https://upswingpoker.com/glossary/aggression-frequency-afq/>: Defines AFq as an aggression-frequency percentage based on bets and raises divided by aggressive and non-aggressive actions.
- <https://riverodds.app/poker-hud-stats/>: Summarizes common VPIP, PFR, VPIP / PFR gap, 3-Bet, WTSD, and C-Bet uses for player profiling.
- <https://www.hand2note.com/Blog/Features/key-preflop-stats-player-profiling-and-basic-adjustments>: Gives 6-max VPIP bands for nits, tight players, loose players, and fish, and emphasizes combining VPIP with PFR.
