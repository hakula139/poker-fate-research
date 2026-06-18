# Player Tagging

This page records the player classification model used by the stats site. Treat these tags as heuristic labels, not objective judgments. The thresholds should be calibrated after collecting a larger Poker Fate sample.

## Available Signals

The official profile-stat API exposes enough public fields for an initial style tag:

| Field                      | Signal                                                     |
| -------------------------- | ---------------------------------------------------------- |
| `play_times`               | Sample size.                                               |
| `profit`                   | Recent 30-day profit for the selected game type.           |
| `pool_entry_rate`          | VPIP, preflop participation.                               |
| `add_before_flipping_rate` | PFR, preflop raising.                                      |
| `three_bet_rate`           | Preflop re-raise frequency.                                |
| `show_hand_rate`           | WTSD, willingness to continue to showdown.                 |
| `active_rate`              | AFq, postflop aggression frequency.                        |
| `c_bete_rate`              | C-Bet frequency after being the previous-street aggressor. |

Rates are returned as integer basis points of percent display, so `2530` displays as `25.30%`.

## Preflop Tags

Use a minimum hand threshold before assigning a preflop style. A conservative first cutoff is:

| Condition                                         | Tag               | Rationale                                                          |
| ------------------------------------------------- | ----------------- | ------------------------------------------------------------------ |
| Hands `< 500`                                     | `Sample too low`  | Avoid strong labels from unstable small samples.                   |
| VPIP `< 15%`                                      | `Nit`             | Very tight preflop participation.                                  |
| VPIP `15-20%`, VPIP / PFR gap `<= 8%`             | `TAG`             | Tight for 6-max, but still entering pots with matching raises.     |
| VPIP `15-20%`, VPIP / PFR gap `> 8%`              | `Tight-passive`   | Tight range that still calls noticeably more often than it raises. |
| VPIP `20-28%`, VPIP / PFR gap `<= 10%`            | `TAG`             | Standard 6-max tight-aggressive range with enough raising.         |
| VPIP `20-28%`, VPIP / PFR gap `> 10%`             | `Tight-passive`   | Standard-width VPIP with too much calling relative to raising.     |
| VPIP `28-40%`, VPIP / PFR gap `<= 12%`            | `LAG`             | Loose range with matching aggression.                              |
| VPIP `28-40%`, VPIP / PFR gap `> 12%` and `< 18%` | `Loose-balanced`  | Loose range with a medium raise gap, between LAG and passive.      |
| VPIP `>= 28%`, VPIP / PFR gap `>= 18%`            | `Loose-passive`   | Many pots entered without matching raises.                         |
| VPIP `>= 40%`, PFR `>= 25%`, 3-Bet `>= 10%`       | `Maniac`          | Loose and over-aggressive preflop profile.                         |
| VPIP `>= 40%`, PFR `>= 25%`, below maniac cutoff  | `LAG`             | Very loose and aggressive, but without the extra maniac signal.    |

Players above the hand threshold should always receive a preflop label. The middle buckets cover players between the tight-aggressive, loose-aggressive, and loose-passive shapes.

## Postflop Tags

The website presents separate preflop and postflop chips. The preflop chip uses VPIP, PFR, VPIP / PFR gap, and 3-Bet. The postflop chip uses WTSD, AFq, and C-Bet. This avoids mixing a player who enters too many pots with a player who simply calls down too often after the flop.

Postflop thresholds are calibrated for 6-max cash Hold'em, which is the primary view. They are not calibrated from the Poker Fate sample percentiles alone. The 2026-06-12 Poker Fate Hold'em snapshot is much more passive than common 6-max cash HUD guidance: among players with at least 500 Hold'em hands, median WTSD is `35.55%`, median AFq is `17.86%`, and median C-Bet is `37.63%`. Treating that median as balanced would hide a real population tendency.

External 6-max / cash-game HUD guidance used for the v1 postflop model:

- WTSD: `27-32%` is a good range, with `30%` as a target; `20-30%` is also cited as normal.
- AFq: AFq is an aggression-frequency percentage; roughly `30%` or lower is passive and around `50%` is usable.
- C-Bet: 6-max flop C-Bet ideal is cited around `70%`; very low C-Bet is passive for a preflop raiser.

Poker Fate Hold'em observed ranges on 2026-06-12:

| Field | Median   | 75th percentile | 90th percentile |
| ----- | -------- | --------------- | --------------- |
| WTSD  | `35.55%` | `38.87%`        | `43.26%`        |
| AFq   | `17.86%` | `22.32%`        | `25.01%`        |
| C-Bet | `37.63%` | `44.24%`        | `49.31%`        |

Postflop tags:

| Condition                                     | Tag                  | Rationale                                                  |
| --------------------------------------------- | -------------------- | ---------------------------------------------------------- |
| Hands `< 500`                                 | `Sample too low`     | Avoid postflop labels from unstable samples.               |
| AFq `>= 40%` or C-Bet `>= 60%`                | `Postflop aggressor` | High pressure after the flop, especially by betting leads. |
| WTSD `>= 33%` and AFq `< 30%`                 | `Showdown caller`    | Continues to showdown too often without enough aggression. |
| WTSD `<= 25%`, AFq `< 30%`, C-Bet `< 50%`     | `Fit-or-fold`        | Avoids showdown and does not apply much pressure.          |
| WTSD `>= 33%`                                 | `Showdown-heavy`     | Reaches showdown often, but not purely passive.            |
| AFq `< 30%` and C-Bet `< 50%`                 | `Postflop passive`   | Below normal aggression without the high-showdown shape.   |
| Remaining sampled players                     | `Postflop balanced`  | Closest to a normal 6-max cash postflop shape.             |

## External References

External poker references agree that VPIP and PFR are the core first-pass dimensions, the VPIP / PFR gap is a passive-play signal, low VPIP indicates nitty play, high VPIP with low PFR indicates loose-passive play, and high VPIP with high PFR points toward LAG or maniac profiles.

- <https://pokercopilot.com/poker-statistics/vpip-pfr>: Defines VPIP/PFR, explains that a larger VPIP / PFR gap indicates passivity, and gives example VPIP/PFR ranges for nits, rocks, regulars, and loose-passive players.
- <https://www.blackrain79.com/2017/10/what-are-the-best-poker-hud-stats.html>: Gives 6-max HUD reference points including VPIP `20`, PFR `17`, 3-Bet `7`, and flop C-Bet `70`.
- <https://upswingpoker.com/poker-hud-stats/>: Gives WTSD guidance around `27-32%`, with `30%` as a useful target, and warns that WTSD needs a large sample.
- <https://drivehud.com/dwkb/what-are-good-hud-stats/>: Gives WTSD normal range around `20-30%` and explains aggression-factor interpretation.
- <https://upswingpoker.com/glossary/aggression-frequency-afq/>: Defines AFq as an aggression-frequency percentage based on bets and raises divided by aggressive and non-aggressive actions.
