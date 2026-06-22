import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  compareLeaderboardEntries,
  leaderboardNameLabel,
  periodLabel,
} from '@/features/player-stats/leaderboard';
import { getGameStats, HOLDEM_GAME_TYPE_NUMERIC } from '@/features/player-stats/model';
import { useI18n } from '@/i18n';
import type { LeaderboardEntry, PlayerRecord } from '@/types';

import { MetricTile } from './metric-tile';
import { StatLabel, type StatLabelId } from './stat-label';
import { labelClass, statsPanelClass } from './styles';
import { TagGroup } from './tag-group';

function PeriodBadge({ entry }: { entry: LeaderboardEntry }) {
  const { t } = useI18n();

  return (
    <Badge variant={entry.period === 'current_week' ? 'info' : 'secondary'}>
      {periodLabel(entry.period, t.periods)}
    </Badge>
  );
}

export function PlayerDetails({ player }: { player: PlayerRecord | undefined }) {
  const { format, t } = useI18n();

  if (!player) {
    return (
      <Card className={`order-first lg:order-0 ${statsPanelClass}`}>
        <CardContent className="text-muted-foreground p-4">
          {t.details.noMatchingPlayer}
        </CardContent>
      </Card>
    );
  }
  const stats = getGameStats(player);
  const statMetrics: { id: StatLabelId; label: string; value: number | undefined }[] = [
    { id: 'vpip', label: t.table.vpip, value: stats?.vpip },
    { id: 'pfr', label: t.table.pfr, value: stats?.pfr },
    { id: 'threeBet', label: t.table.threeBet, value: stats?.threeBet },
    { id: 'wtsd', label: t.table.wtsd, value: stats?.wtsd },
    { id: 'afq', label: t.table.afq, value: stats?.afq },
    { id: 'cbet', label: t.table.cbet, value: stats?.cbet },
  ];
  const entries = [...player.leaderboardEntries]
    .filter(
      (entry) => typeof entry.rank === 'number' && entry.gameType === HOLDEM_GAME_TYPE_NUMERIC,
    )
    .sort(compareLeaderboardEntries)
    .slice(0, 6);

  return (
    <Card
      className={`order-first lg:sticky lg:top-4 lg:order-0 lg:flex lg:flex-col lg:overflow-hidden ${statsPanelClass}`}
    >
      <CardHeader className="lg:shrink-0">
        <span className={labelClass}>{t.details.player}</span>
        <CardTitle className="text-2xl wrap-anywhere">{player.name}</CardTitle>
        <p className="text-muted-foreground text-xs">{player.uid}</p>
        <p
          className="text-muted-foreground text-xs"
          title={format.dateTime(player.fetchedAt)}
        >
          {t.details.updated}: {format.relativeTime(player.fetchedAt)}
        </p>
        <TagGroup stats={stats} />
      </CardHeader>
      <CardContent className="grid gap-4 lg:min-h-0 lg:overflow-auto">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <MetricTile
            label={t.table.hands}
            value={format.integer(stats?.hands)}
          />
          <MetricTile
            label={t.table.profit}
            value={format.compactProfit(stats?.profit)}
          />
          <MetricTile
            label={t.details.thronePoints}
            value={format.integer(stats?.score)}
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {statMetrics.map((metric) => (
            <MetricTile
              key={metric.id}
              label={
                <StatLabel
                  id={metric.id}
                  label={metric.label}
                />
              }
              value={format.rate(metric.value)}
            />
          ))}
        </div>

        <div>
          <p className={`${labelClass} mb-2`}>{t.details.leaderboardRanks}</p>
          <div className="grid gap-2">
            {entries.length ? (
              entries.map((entry, index) => (
                <div
                  className="bg-background/45 grid gap-1 rounded-md border p-2.5"
                  key={`${String(entry.leaderboardId)}-${entry.period}-${String(index)}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-medium">
                      {leaderboardNameLabel(entry.leaderboardName, t.leaderboards)}
                    </span>
                    <strong>#{entry.rank}</strong>
                  </div>
                  <div className="text-muted-foreground flex items-center justify-between gap-3 text-xs">
                    <PeriodBadge entry={entry} />
                    <span>
                      {t.details.value}: {format.integer(entry.value ?? undefined)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-xs">{t.details.noLeaderboardRows}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
