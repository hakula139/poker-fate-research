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
import { leaderboardSummary } from '@/leaderboard';
import { cn } from '@/lib/utils';
import type { GameStats, GameTypeId, PlayerRecord } from '@/types';

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
      onClick={() => onSort(sortKey)}
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
  return (
    <Card className="overflow-hidden">
      <Table className="min-w-[1180px]" containerClassName="max-h-[calc(100vh-260px)] min-h-[520px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="sticky top-0 z-10 min-w-[260px] bg-muted/95">
              <SortButton label="Player" sortKey="name" sort={sort} onSort={onSort} />
            </TableHead>
            <TableHead className="sticky top-0 z-10 bg-muted/95">Best rank</TableHead>
            <TableHead className="sticky top-0 z-10 bg-muted/95">
              <SortButton label="Hands" sortKey="hands" sort={sort} onSort={onSort} />
            </TableHead>
            <TableHead className="sticky top-0 z-10 bg-muted/95">
              <SortButton label="Profit" sortKey="profit" sort={sort} onSort={onSort} />
            </TableHead>
            <TableHead className="sticky top-0 z-10 bg-muted/95">
              <SortButton label="VPIP" sortKey="vpip" sort={sort} onSort={onSort} />
            </TableHead>
            <TableHead className="sticky top-0 z-10 bg-muted/95">
              <SortButton label="PFR" sortKey="pfr" sort={sort} onSort={onSort} />
            </TableHead>
            <TableHead className="sticky top-0 z-10 bg-muted/95">
              <SortButton label="3-Bet" sortKey="threeBet" sort={sort} onSort={onSort} />
            </TableHead>
            <TableHead className="sticky top-0 z-10 bg-muted/95">
              <SortButton label="WTSD" sortKey="wtsd" sort={sort} onSort={onSort} />
            </TableHead>
            <TableHead className="sticky top-0 z-10 bg-muted/95">
              <SortButton label="AFq" sortKey="afq" sort={sort} onSort={onSort} />
            </TableHead>
            <TableHead className="sticky top-0 z-10 bg-muted/95">
              <SortButton label="C-Bet" sortKey="cbet" sort={sort} onSort={onSort} />
            </TableHead>
            <TableHead className="sticky top-0 z-10 bg-muted/95">
              <SortButton label="Tag" sortKey="tag" sort={sort} onSort={onSort} />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {players.map((player) => {
            const stats = stat(player, gameType);
            return (
              <TableRow
                className={cn('cursor-pointer', selectedUid === player.uid && 'bg-accent/70')}
                key={player.uid}
                aria-selected={selectedUid === player.uid}
                onClick={() => onSelect(player.uid)}
              >
                <TableCell className="min-w-[260px]">
                  <button
                    className="grid max-w-[300px] gap-0.5 bg-transparent p-0 text-left text-inherit outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    type="button"
                    onClick={() => onSelect(player.uid)}
                  >
                    <strong className="overflow-hidden text-ellipsis font-semibold text-foreground">
                      {player.name}
                    </strong>
                    <span className="text-xs text-muted-foreground">{player.uid}</span>
                  </button>
                </TableCell>
                <TableCell>{leaderboardSummary(player.leaderboardEntries)}</TableCell>
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
