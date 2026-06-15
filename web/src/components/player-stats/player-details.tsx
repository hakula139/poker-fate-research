import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatInteger, formatProfit, formatRate } from '@/format';
import { useI18n } from '@/i18n';
import { periodLabel } from '@/leaderboard';
import type { GameStats, GameTypeId, LeaderboardEntry, PlayerRecord } from '@/types';

import { MetricTile } from './metric-tile';
import { labelClass, statsPanelClass } from './styles';
import { TagGroup } from './tag-group';

function stat(player: PlayerRecord, gameType: GameTypeId): GameStats | undefined {
  return player.games[gameType];
}

function PeriodBadge({ entry }: { entry: LeaderboardEntry }) {
  const { t } = useI18n();

  return (
    <Badge variant={entry.period === 'current_week' ? 'info' : 'secondary'}>
      {periodLabel(entry.period, t.periods)}
    </Badge>
  );
}

export function PlayerDetails({
  player,
  gameType,
}: {
  player: PlayerRecord | undefined;
  gameType: GameTypeId;
}) {
  const { t } = useI18n();

  if (!player) {
    return (
      <Card className={`order-first lg:order-none ${statsPanelClass}`}>
        <CardContent className="p-4 text-muted-foreground">{t.details.selectPlayer}</CardContent>
      </Card>
    );
  }
  const stats = stat(player, gameType);
  const entries = [...player.leaderboardEntries]
    .filter((entry) => typeof entry.rank === 'number')
    .sort((left, right) => Number(left.rank) - Number(right.rank))
    .slice(0, 6);

  return (
    <Card className={`order-first lg:sticky lg:top-4 lg:order-none lg:flex lg:flex-col lg:overflow-hidden ${statsPanelClass}`}>
      <CardHeader className="lg:shrink-0">
        <span className={labelClass}>{t.details.player}</span>
        <CardTitle className="[overflow-wrap:anywhere] text-2xl">{player.name}</CardTitle>
        <p className="text-xs text-muted-foreground">{player.uid}</p>
        <TagGroup stats={stats} />
      </CardHeader>
      <CardContent className="grid gap-4 lg:min-h-0 lg:overflow-auto">
        <div className="grid grid-cols-2 gap-2.5">
          <MetricTile label={t.table.hands} value={formatInteger(stats?.hands)} />
          <MetricTile label={t.table.profit} value={formatProfit(stats?.profit)} />
          <MetricTile label={t.details.score} value={formatInteger(stats?.score)} />
          <MetricTile label={t.details.sngRecords} value={formatInteger(player.sngRecordCount)} />
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {[
            [t.table.vpip, stats?.vpip],
            [t.table.pfr, stats?.pfr],
            [t.table.threeBet, stats?.threeBet],
            [t.table.wtsd, stats?.wtsd],
            [t.table.afq, stats?.afq],
            [t.table.cbet, stats?.cbet],
          ].map(([label, value]) => (
            <MetricTile key={label} label={String(label)} value={formatRate(value as number | undefined)} />
          ))}
        </div>

        <div>
          <p className={`${labelClass} mb-2`}>{t.details.leaderboardRanks}</p>
          <div className="grid gap-2">
            {entries.length ? (
              entries.map((entry, index) => (
                <div
                  className="grid gap-1 rounded-md border bg-background/45 p-2.5"
                  key={`${entry.leaderboardId}-${entry.period}-${index}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-medium">{entry.leaderboardName}</span>
                    <strong>#{entry.rank}</strong>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <PeriodBadge entry={entry} />
                    <span>{formatInteger(entry.value ?? undefined)}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">{t.details.noLeaderboardRows}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
