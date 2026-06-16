import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatInteger, formatProfit, formatRate } from '@/format';
import { useI18n } from '@/i18n';
import { leaderboardSummary } from '@/leaderboard';
import { cn } from '@/lib/utils';
import type { GameStats, GameTypeId, PlayerRecord } from '@/types';

import { statsPanelClass } from './styles';
import { TagGroup } from './tag-group';

export type SortKey =
  | 'name'
  | 'hands'
  | 'profit'
  | 'vpip'
  | 'pfr'
  | 'threeBet'
  | 'wtsd'
  | 'afq'
  | 'cbet'
  | 'tag';

export type SortState = {
  key: SortKey;
  direction: 'asc' | 'desc';
};

function stat(player: PlayerRecord, gameType: GameTypeId): GameStats | undefined {
  return player.games[gameType];
}

function SortButton({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  sort: SortState;
  onSort: (key: SortKey) => void;
}) {
  const active = sort.key === sortKey;
  const Icon = active ? (sort.direction === 'asc' ? ArrowUpIcon : ArrowDownIcon) : ArrowUpDownIcon;

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 px-0 text-xs font-bold text-inherit uppercase hover:bg-transparent"
      type="button"
      onClick={() => {
        onSort(sortKey);
      }}
    >
      {label}
      <Icon className={cn(!active && 'text-muted-foreground/60')} />
    </Button>
  );
}

export function PlayerTable({
  players,
  gameType,
  selectedUid,
  sort,
  onSort,
  onSelect,
}: {
  players: PlayerRecord[];
  gameType: GameTypeId;
  selectedUid: number | null;
  sort: SortState;
  onSort: (key: SortKey) => void;
  onSelect: (uid: number) => void;
}) {
  const { t } = useI18n();

  return (
    <Card className={`overflow-hidden ${statsPanelClass}`}>
      <Table className="min-w-[1120px]" containerClassName="max-h-[560px] lg:h-full lg:max-h-none">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="bg-muted sticky top-0 left-0 z-30 w-[220px] max-w-[220px] min-w-[220px] border-r">
              <SortButton label={t.table.player} sortKey="name" sort={sort} onSort={onSort} />
            </TableHead>
            <TableHead className="bg-muted/95 sticky top-0 z-10">{t.table.bestRank}</TableHead>
            <TableHead className="bg-muted/95 sticky top-0 z-10">
              <SortButton label={t.table.hands} sortKey="hands" sort={sort} onSort={onSort} />
            </TableHead>
            <TableHead className="bg-muted/95 sticky top-0 z-10">
              <SortButton label={t.table.profit} sortKey="profit" sort={sort} onSort={onSort} />
            </TableHead>
            <TableHead className="bg-muted/95 sticky top-0 z-10">
              <SortButton label={t.table.vpip} sortKey="vpip" sort={sort} onSort={onSort} />
            </TableHead>
            <TableHead className="bg-muted/95 sticky top-0 z-10">
              <SortButton label={t.table.pfr} sortKey="pfr" sort={sort} onSort={onSort} />
            </TableHead>
            <TableHead className="bg-muted/95 sticky top-0 z-10">
              <SortButton label={t.table.threeBet} sortKey="threeBet" sort={sort} onSort={onSort} />
            </TableHead>
            <TableHead className="bg-muted/95 sticky top-0 z-10">
              <SortButton label={t.table.wtsd} sortKey="wtsd" sort={sort} onSort={onSort} />
            </TableHead>
            <TableHead className="bg-muted/95 sticky top-0 z-10">
              <SortButton label={t.table.afq} sortKey="afq" sort={sort} onSort={onSort} />
            </TableHead>
            <TableHead className="bg-muted/95 sticky top-0 z-10">
              <SortButton label={t.table.cbet} sortKey="cbet" sort={sort} onSort={onSort} />
            </TableHead>
            <TableHead className="bg-muted/95 sticky top-0 z-10">
              <SortButton label={t.table.tag} sortKey="tag" sort={sort} onSort={onSort} />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {players.map((player) => {
            const stats = stat(player, gameType);
            return (
              <TableRow
                className={cn('group cursor-pointer', selectedUid === player.uid && 'bg-accent/70')}
                key={player.uid}
                aria-selected={selectedUid === player.uid}
                onClick={() => {
                  onSelect(player.uid);
                }}
              >
                <TableCell
                  className={cn(
                    'bg-card group-hover:bg-muted sticky left-0 z-20 w-[220px] max-w-[220px] min-w-[220px] border-r',
                    selectedUid === player.uid && 'bg-accent',
                  )}
                >
                  <button
                    className="focus-visible:ring-ring/50 grid w-full gap-0.5 bg-transparent p-0 text-left text-inherit outline-none focus-visible:ring-[3px]"
                    type="button"
                    onClick={() => {
                      onSelect(player.uid);
                    }}
                  >
                    <strong className="text-foreground overflow-hidden font-semibold text-ellipsis">
                      {player.name}
                    </strong>
                    <span className="text-muted-foreground text-xs">{player.uid}</span>
                  </button>
                </TableCell>
                <TableCell>
                  {leaderboardSummary(player.leaderboardEntries, t.periods, t.leaderboards)}
                </TableCell>
                <TableCell>{formatInteger(stats?.hands)}</TableCell>
                <TableCell
                  className={cn(
                    stats && stats.profit < 0
                      ? 'text-destructive'
                      : 'text-emerald-700 dark:text-emerald-300',
                  )}
                >
                  {formatProfit(stats?.profit)}
                </TableCell>
                <TableCell>{formatRate(stats?.vpip)}</TableCell>
                <TableCell>{formatRate(stats?.pfr)}</TableCell>
                <TableCell>{formatRate(stats?.threeBet)}</TableCell>
                <TableCell>{formatRate(stats?.wtsd)}</TableCell>
                <TableCell>{formatRate(stats?.afq)}</TableCell>
                <TableCell>{formatRate(stats?.cbet)}</TableCell>
                <TableCell>
                  <TagGroup stats={stats} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
