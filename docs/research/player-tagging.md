# Player Tagging

This page records a first-pass player classification model for a future stats site. Treat these tags as heuristic labels, not objective judgments. The thresholds should be calibrated after collecting a larger Poker Fate sample.

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
| VPIP `15-28%`, VPIP / PFR gap `<= 12%`            | `TAG`             | Tight or standard range with enough raising.                       |
| VPIP `15-28%`, VPIP / PFR gap `> 12%`             | `Tight-passive`   | Tight range that still calls noticeably more often than it raises. |
| VPIP `28-40%`, VPIP / PFR gap `<= 12%`            | `LAG`             | Loose range with matching aggression.                              |
| VPIP `28-40%`, VPIP / PFR gap `> 12%` and `< 18%` | `Loose-balanced`  | Loose range with a medium raise gap, between LAG and passive.      |
| VPIP `>= 28%`, VPIP / PFR gap `>= 18%`            | `Loose-passive`   | Many pots entered without matching raises.                         |
| VPIP `>= 40%`, PFR `>= 25%`, high 3-Bet or AFq    | `Maniac`          | Loose and over-aggressive profile.                                 |
| VPIP `>= 40%`, PFR `>= 25%`, below maniac cutoff  | `LAG`             | Very loose and aggressive, but without the extra maniac signal.    |

The v1 site should not emit `Unclassified` once a player passes the hand threshold. The 2026-06-12 Hold'em snapshot showed that fallthrough rows had enough data and mostly sat between the original TAG / LAG / loose-passive thresholds, so the model now uses explicit middle buckets instead of hiding those players behind an unknown label.

## Postflop Tags

The website presents separate preflop and postflop chips. The preflop chip uses VPIP, PFR, VPIP / PFR gap, and 3-Bet. The postflop chip uses WTSD, AFq, and C-Bet. This avoids mixing a player who enters too many pots with a player who simply calls down too often after the flop.

The postflop thresholds are calibrated for Hold'em, which is the primary view. In the 2026-06-12 snapshot, Hold'em players with at least 500 hands had these rough ranges:

| Field | Median   | 75th percentile | 90th percentile |
| ----- | -------- | --------------- | --------------- |
| WTSD  | `35.55%` | `38.87%`        | `43.26%`        |
| AFq   | `17.86%` | `22.32%`        | `25.01%`        |
| C-Bet | `37.63%` | `44.24%`        | `49.31%`        |

Postflop tags:

| Condition                      | Tag                  | Rationale                                                  |
| ------------------------------ | -------------------- | ---------------------------------------------------------- |
| Hands `< 500`                  | `Sample too low`     | Avoid postflop labels from unstable samples.               |
| AFq `>= 28%` or C-Bet `>= 55%` | `Postflop aggressor` | High pressure after the flop, especially by betting leads. |
| WTSD `>= 38%` and AFq `< 20%`  | `Showdown caller`    | Continues to showdown often without matching aggression.   |
| AFq `< 14%` and C-Bet `< 35%`  | `Fit-or-fold`        | Low betting frequency and low continuation betting.        |
| WTSD `>= 38%`                  | `Showdown-heavy`     | Reaches showdown often, but not purely passive.            |
| Remaining sampled players      | `Postflop balanced`  | Middle of the observed Hold'em distribution.               |

## External References

External poker references agree that VPIP and PFR are the core first-pass dimensions, the VPIP / PFR gap is a passive-play signal, low VPIP indicates nitty play, high VPIP with low PFR indicates loose-passive play, and high VPIP with high PFR points toward LAG or maniac profiles.

| Source                                                       | Relevant finding                                                                                                                                                              |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| <https://pokercopilot.com/poker-statistics/vpip-pfr>         | Defines VPIP/PFR, explains that a larger VPIP / PFR gap indicates passivity, and gives example VPIP/PFR ranges for nits, rocks, regulars, and loose-passive players.          |
| <https://poker-alpha.com/en/insights/player-categorization/> | Recent 2026 player-type overview using nit, calling station, solid regular, LAG, maniac, and elite regular categories, with VPIP/PFR as primary quick-classification signals. |
