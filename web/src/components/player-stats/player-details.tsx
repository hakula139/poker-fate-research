import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatInteger, formatProfit, formatRate } from '@/format';
import { periodLabel } from '@/leaderboard';
import type { GameStats, GameTypeId, LeaderboardEntry, PlayerRecord } from '@/types';

import { MetricTile } from './metric-tile';
import { labelClass } from './styles';
import { TagGroup } from './tag-group';

function stat(player: PlayerRecord, gameType: GameTypeId): GameStats | undefined {
  return player.games[gameType];
}

function PeriodBadge({ entry }: { entry: LeaderboardEntry }) {
  return (
    <Badge variant={entry.period === 'current_week' ? 'info' : 'secondary'}>
      {periodLabel(entry.period)}
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
  if (!player) {
    return (
      <Card className="order-first lg:order-none">
        <CardContent className="p-4 text-muted-foreground">Select a player</CardContent>
      </Card>
    );
  }
  const stats = stat(player, gameType);
  const entries = [...player.leaderboardEntries]
    .filter((entry) => typeof entry.rank === 'number')
    .sort((left, right) => Number(left.rank) - Number(right.rank))
    .slice(0, 6);

  return (
    <Card className="order-first lg:sticky lg:top-4 lg:order-none">
      <CardHeader>
        <span className={labelClass}>Player</span>
        <CardTitle className="[overflow-wrap:anywhere] text-2xl">{player.name}</CardTitle>
        <p className="text-xs text-muted-foreground">{player.uid}</p>
        <TagGroup stats={stats} />
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid grid-cols-2 gap-2.5">
          <MetricTile label="Hands" value={formatInteger(stats?.hands)} />
          <MetricTile label="Profit" value={formatProfit(stats?.profit)} />
          <MetricTile label="Score" value={formatInteger(stats?.score)} />
          <MetricTile label="SNG records" value={formatInteger(player.sngRecordCount)} />
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {[
            ['VPIP', stats?.vpip],
            ['PFR', stats?.pfr],
            ['3-Bet', stats?.threeBet],
            ['WTSD', stats?.wtsd],
            ['AFq', stats?.afq],
            ['C-Bet', stats?.cbet],
          ].map(([label, value]) => (
            <MetricTile key={label} label={String(label)} value={formatRate(value as number | undefined)} />
          ))}
        </div>

        <div>
          <p className={`${labelClass} mb-2`}>Leaderboard ranks</p>
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
              <p className="text-xs text-muted-foreground">No leaderboard rows</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
