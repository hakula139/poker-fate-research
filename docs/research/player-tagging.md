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

## First-Pass Tags

Use a minimum hand threshold before assigning a style. A conservative first cutoff is:

| Condition                                      | Tag                                 | Rationale                                        |
| ---------------------------------------------- | ----------------------------------- | ------------------------------------------------ |
| Hands `< 500`                                  | `Sample too low`                    | Avoid strong labels from unstable small samples. |
| VPIP `< 15%`                                   | `Nit`                               | Very tight preflop participation.                |
| VPIP `15-28%`, PFR close to VPIP               | `TAG`                               | Tight or standard range with enough raising.     |
| VPIP `28-40%`, PFR close to VPIP               | `LAG`                               | Loose range with matching aggression.            |
| VPIP `>= 35%`, PFR gap `>= 18%`                | `Loose-passive` / `Calling station` | Many pots entered without matching raises.       |
| VPIP `>= 40%`, PFR `>= 25%`, high 3-Bet or AFq | `Maniac` / `Aggressive fish`        | Loose and over-aggressive profile.               |

## External References

External poker references agree that VPIP and PFR are the core first-pass dimensions, the VPIP / PFR gap is a passive-play signal, low VPIP indicates nitty play, high VPIP with low PFR indicates loose-passive play, and high VPIP with high PFR points toward LAG or maniac profiles.

| Source                                                       | Relevant finding                                                                                                                                                              |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| <https://pokercopilot.com/poker-statistics/vpip-pfr>         | Defines VPIP/PFR, explains that a larger VPIP / PFR gap indicates passivity, and gives example VPIP/PFR ranges for nits, rocks, regulars, and loose-passive players.          |
| <https://poker-alpha.com/en/insights/player-categorization/> | Recent 2026 player-type overview using nit, calling station, solid regular, LAG, maniac, and elite regular categories, with VPIP/PFR as primary quick-classification signals. |
