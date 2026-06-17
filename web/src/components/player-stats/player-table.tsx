import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from 'lucide-react';
import type { AriaAttributes, ReactNode } from 'react';

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

import { StatLabel } from './stat-label';
import { statsPanelClass } from './styles';
import { TagGroup } from './tag-group';

const tableColumnCount = 10;
const playerColumnClass = 'w-[150px] max-w-[150px] min-w-[150px]';
const columnWidths = [
  '150px',
  '72px',
  '76px',
  '68px',
  '62px',
  '68px',
  '68px',
  '62px',
  '68px',
  '166px',
];

function SortButton({
  ariaLabel,
  label,
  sortKey,
  sort,
  onSort,
}: {
  ariaLabel: string;
  label: ReactNode;
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
      aria-label={ariaLabel}
      onClick={() => {
        onSort(sortKey);
      }}
    >
      {label}
      <Icon className={cn(!active && 'text-muted-foreground/60')} />
    </Button>
  );
}

function ariaSort(sort: SortState, key: SortKey): AriaAttributes['aria-sort'] {
  if (sort.key !== key) {
    return 'none';
  }
  return sort.direction === 'asc' ? 'ascending' : 'descending';
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
  const headers: { key: SortKey; label: ReactNode; ariaLabel: string; sticky?: boolean }[] = [
    { key: 'name', label: t.table.player, ariaLabel: t.table.player, sticky: true },
    { key: 'hands', label: t.table.hands, ariaLabel: t.table.hands },
    { key: 'profit', label: t.table.profit, ariaLabel: t.table.profit },
    {
      key: 'vpip',
      label: (
        <StatLabel
          id="vpip"
          label={t.table.vpip}
        />
      ),
      ariaLabel: `${t.table.vpip}, ${t.statDescriptions.vpip}`,
    },
    {
      key: 'pfr',
      label: (
        <StatLabel
          id="pfr"
          label={t.table.pfr}
        />
      ),
      ariaLabel: `${t.table.pfr}, ${t.statDescriptions.pfr}`,
    },
    {
      key: 'threeBet',
      label: (
        <StatLabel
          id="threeBet"
          label={t.table.threeBet}
        />
      ),
      ariaLabel: `${t.table.threeBet}, ${t.statDescriptions.threeBet}`,
    },
    {
      key: 'wtsd',
      label: (
        <StatLabel
          id="wtsd"
          label={t.table.wtsd}
        />
      ),
      ariaLabel: `${t.table.wtsd}, ${t.statDescriptions.wtsd}`,
    },
    {
      key: 'afq',
      label: (
        <StatLabel
          id="afq"
          label={t.table.afq}
        />
      ),
      ariaLabel: `${t.table.afq}, ${t.statDescriptions.afq}`,
    },
    {
      key: 'cbet',
      label: (
        <StatLabel
          id="cbet"
          label={t.table.cbet}
        />
      ),
      ariaLabel: `${t.table.cbet}, ${t.statDescriptions.cbet}`,
    },
    { key: 'tag', label: t.table.tag, ariaLabel: t.table.tag },
  ];

  return (
    <Card className={`overflow-hidden ${statsPanelClass}`}>
      <Table
        className="w-full min-w-[860px] table-fixed text-sm [&_td]:px-2 [&_th]:px-2"
        containerClassName="max-h-[560px] lg:h-full lg:max-h-none"
      >
        <colgroup>
          {columnWidths.map((width, index) => (
            <col
              key={index}
              style={{ width }}
            />
          ))}
        </colgroup>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {headers.map((header) => (
              <TableHead
                key={header.key}
                aria-sort={ariaSort(sort, header.key)}
                className={
                  header.sticky
                    ? cn('bg-muted sticky top-0 left-0 z-30 border-r', playerColumnClass)
                    : 'bg-muted/95 sticky top-0 z-10'
                }
              >
                <SortButton
                  ariaLabel={header.ariaLabel}
                  label={header.label}
                  sortKey={header.key}
                  sort={sort}
                  onSort={onSort}
                />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {players.length ? (
            players.map((player) => {
              const stats = getGameStats(player, gameType);
              const selected = selectedUid === player.uid;
              const fullProfit = format.profit(stats?.profit);
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
                      'sticky left-0 z-20 border-r',
                      playerColumnClass,
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
                    title={fullProfit}
                    className={cn(
                      stats && stats.profit < 0 && 'text-destructive',
                      stats && stats.profit > 0 && 'text-emerald-700 dark:text-emerald-300',
                    )}
                  >
                    {format.compactProfit(stats?.profit)}
                  </TableCell>
                  <TableCell>{format.rate(stats?.vpip)}</TableCell>
                  <TableCell>{format.rate(stats?.pfr)}</TableCell>
                  <TableCell>{format.rate(stats?.threeBet)}</TableCell>
                  <TableCell>{format.rate(stats?.wtsd)}</TableCell>
                  <TableCell>{format.rate(stats?.afq)}</TableCell>
                  <TableCell>{format.rate(stats?.cbet)}</TableCell>
                  <TableCell className="whitespace-normal">
                    <TagGroup stats={stats} />
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={tableColumnCount}
                className="text-muted-foreground h-24 text-center"
              >
                {t.table.noPlayers}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
