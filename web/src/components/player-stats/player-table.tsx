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
import { getGameStats, type SortKey, type SortState } from '@/features/player-stats/model';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';
import type { GameTypeId, PlayerRecord } from '@/types';

import { statsPanelClass } from './styles';
import { TagGroup } from './tag-group';

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
  const { format, t } = useI18n();

  return (
    <Card className={`overflow-hidden ${statsPanelClass}`}>
      <Table
        className="min-w-[980px]"
        containerClassName="max-h-[560px] lg:h-full lg:max-h-none"
      >
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="bg-muted sticky top-0 left-0 z-30 w-[220px] max-w-[220px] min-w-[220px] border-r">
              <SortButton
                label={t.table.player}
                sortKey="name"
                sort={sort}
                onSort={onSort}
              />
            </TableHead>
            <TableHead className="bg-muted/95 sticky top-0 z-10">
              <SortButton
                label={t.table.hands}
                sortKey="hands"
                sort={sort}
                onSort={onSort}
              />
            </TableHead>
            <TableHead className="bg-muted/95 sticky top-0 z-10">
              <SortButton
                label={t.table.profit}
                sortKey="profit"
                sort={sort}
                onSort={onSort}
              />
            </TableHead>
            <TableHead className="bg-muted/95 sticky top-0 z-10">
              <SortButton
                label={t.table.vpip}
                sortKey="vpip"
                sort={sort}
                onSort={onSort}
              />
            </TableHead>
            <TableHead className="bg-muted/95 sticky top-0 z-10">
              <SortButton
                label={t.table.pfr}
                sortKey="pfr"
                sort={sort}
                onSort={onSort}
              />
            </TableHead>
            <TableHead className="bg-muted/95 sticky top-0 z-10">
              <SortButton
                label={t.table.threeBet}
                sortKey="threeBet"
                sort={sort}
                onSort={onSort}
              />
            </TableHead>
            <TableHead className="bg-muted/95 sticky top-0 z-10">
              <SortButton
                label={t.table.wtsd}
                sortKey="wtsd"
                sort={sort}
                onSort={onSort}
              />
            </TableHead>
            <TableHead className="bg-muted/95 sticky top-0 z-10">
              <SortButton
                label={t.table.afq}
                sortKey="afq"
                sort={sort}
                onSort={onSort}
              />
            </TableHead>
            <TableHead className="bg-muted/95 sticky top-0 z-10">
              <SortButton
                label={t.table.cbet}
                sortKey="cbet"
                sort={sort}
                onSort={onSort}
              />
            </TableHead>
            <TableHead className="bg-muted/95 sticky top-0 z-10">
              <SortButton
                label={t.table.tag}
                sortKey="tag"
                sort={sort}
                onSort={onSort}
              />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {players.map((player) => {
            const stats = getGameStats(player, gameType);
            const selected = selectedUid === player.uid;
            return (
              <TableRow
                className={cn(
                  'group cursor-pointer',
                  selected ? 'bg-accent/70 hover:bg-accent/70' : 'hover:bg-muted/50',
                )}
                key={player.uid}
                aria-selected={selected}
                onClick={() => {
                  onSelect(player.uid);
                }}
              >
                <TableCell
                  className={cn(
                    'sticky left-0 z-20 w-[220px] max-w-[220px] min-w-[220px] border-r',
                    selected ? 'bg-accent group-hover:bg-accent' : 'bg-card group-hover:bg-muted',
                  )}
                >
                  <button
                    className="focus-visible:ring-ring/50 grid w-full cursor-pointer gap-0.5 bg-transparent p-0 text-left text-inherit outline-none focus-visible:ring-[3px]"
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
                <TableCell>{format.integer(stats?.hands)}</TableCell>
                <TableCell
                  className={cn(
                    stats && stats.profit < 0
                      ? 'text-destructive'
                      : 'text-emerald-700 dark:text-emerald-300',
                  )}
                >
                  {format.profit(stats?.profit)}
                </TableCell>
                <TableCell>{format.rate(stats?.vpip)}</TableCell>
                <TableCell>{format.rate(stats?.pfr)}</TableCell>
                <TableCell>{format.rate(stats?.threeBet)}</TableCell>
                <TableCell>{format.rate(stats?.wtsd)}</TableCell>
                <TableCell>{format.rate(stats?.afq)}</TableCell>
                <TableCell>{format.rate(stats?.cbet)}</TableCell>
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
