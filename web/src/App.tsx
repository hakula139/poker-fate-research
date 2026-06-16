import { useEffect, useMemo, useState } from 'react';
import { SearchIcon } from 'lucide-react';

import { LanguageControl } from '@/components/language-control';
import { ThemeControl } from '@/components/theme-control';
import { PlayerDetails } from '@/components/player-stats/player-details';
import { PlayerTable, type SortKey, type SortState } from '@/components/player-stats/player-table';
import { labelClass } from '@/components/player-stats/styles';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { loadSnapshot, loadSnapshots } from '@/data';
import { formatInteger } from '@/format';
import { I18nProvider, useI18n } from '@/i18n';
import { classifyPlayer } from '@/tagging';
import { getInitialTheme, writeThemeMode, type ThemeMode } from '@/theme';
import type {
  GameStats,
  GameTypeId,
  PlayerRecord,
  PlayerSnapshot,
  SnapshotIndex,
  SnapshotIndexItem,
} from '@/types';

import './styles.css';

const gameTypeIds: GameTypeId[] = ['10010101', '10020101', '10050301', '20010103'];

function stat(player: PlayerRecord, gameType: GameTypeId): GameStats | undefined {
  return player.games[gameType];
}

function sortValue(player: PlayerRecord, gameType: GameTypeId, key: SortKey): string | number {
  const stats = stat(player, gameType);
  if (key === 'name') {
    return player.name.toLowerCase();
  }
  if (key === 'tag') {
    const tags = classifyPlayer(stats);
    return `${tags.preflop} ${tags.postflop}`;
  }
  return stats?.[key] ?? Number.NEGATIVE_INFINITY;
}

export default function App() {
  return (
    <I18nProvider>
      <PlayerStatsApp />
    </I18nProvider>
  );
}

function PlayerStatsApp() {
  const { t } = useI18n();
  const [snapshotIndex, setSnapshotIndex] = useState<SnapshotIndex | null>(null);
  const [snapshot, setSnapshot] = useState<PlayerSnapshot | null>(null);
  const [snapshotId, setSnapshotId] = useState<string>('');
  const [query, setQuery] = useState('');
  const [gameType, setGameType] = useState<GameTypeId>('10010101');
  const [selectedUid, setSelectedUid] = useState<number | null>(null);
  const [sort, setSort] = useState<SortState>({ key: 'profit', direction: 'desc' });
  const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialTheme);

  useEffect(() => {
    void loadSnapshots().then(({ index, active }) => {
      setSnapshotIndex(index);
      setSnapshot(active);
      setSnapshotId(active.id);
      setSelectedUid(null);
    });
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    function applyTheme() {
      const dark = themeMode === 'dark' || (themeMode === 'system' && media.matches);
      document.documentElement.classList.toggle('dark', dark);
      document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    }

    writeThemeMode(themeMode);
    applyTheme();
    if (themeMode === 'system') {
      media.addEventListener('change', applyTheme);
      return () => {
        media.removeEventListener('change', applyTheme);
      };
    }
  }, [themeMode]);

  async function changeSnapshot(item: SnapshotIndexItem) {
    const next = await loadSnapshot(item.path);
    setSnapshot(next);
    setSnapshotId(next.id);
    setSelectedUid(null);
  }

  function changeSort(key: SortKey) {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc',
    }));
  }

  const filteredPlayers = useMemo(() => {
    const players = snapshot?.players ?? [];
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? players.filter(
          (player) =>
            player.name.toLowerCase().includes(needle) || String(player.uid).includes(needle),
        )
      : players;

    return [...filtered].sort((left, right) => {
      const leftValue = sortValue(left, gameType, sort.key);
      const rightValue = sortValue(right, gameType, sort.key);
      if (typeof leftValue === 'number' && typeof rightValue === 'number') {
        return sort.direction === 'asc' ? leftValue - rightValue : rightValue - leftValue;
      }
      return sort.direction === 'asc'
        ? String(leftValue).localeCompare(String(rightValue))
        : String(rightValue).localeCompare(String(leftValue));
    });
  }, [gameType, query, snapshot?.players, sort]);

  const selectedPlayer = useMemo<PlayerRecord | undefined>(
    () => filteredPlayers.find((player) => player.uid === selectedUid) ?? filteredPlayers[0],
    [filteredPlayers, selectedUid],
  );

  if (!snapshot || !snapshotIndex) {
    return (
      <main className="bg-background text-muted-foreground grid min-h-screen place-items-center">
        {t.app.loading}
      </main>
    );
  }

  return (
    <main className="text-foreground min-h-screen bg-[linear-gradient(180deg,color-mix(in_oklch,var(--primary)_11%,transparent),transparent_280px),var(--background)]">
      <div className="mx-auto w-[min(1500px,calc(100%-32px))] py-7 max-sm:w-[calc(100%-20px)] max-sm:py-4">
        <section className="grid items-end gap-4 lg:grid-cols-[1fr_auto]">
          <div>
            <p className={`${labelClass} mb-1.5`}>{t.app.eyebrow}</p>
            <h1 className="text-[clamp(32px,5vw,54px)] leading-none font-semibold tracking-normal">
              {t.app.title}
            </h1>
          </div>
          <div className="grid gap-3 sm:grid-cols-[auto_auto_minmax(280px,420px)] sm:items-end">
            <LanguageControl labelClass={labelClass} />
            <ThemeControl
              labelClass={labelClass}
              themeMode={themeMode}
              onThemeModeChange={setThemeMode}
            />
            <div className="grid gap-1.5">
              <label className={labelClass} htmlFor="snapshot">
                {t.controls.snapshot}
              </label>
              <Select
                value={snapshotId}
                onValueChange={(value) => {
                  const item = snapshotIndex.snapshots.find((candidate) => candidate.id === value);
                  if (item) {
                    void changeSnapshot(item);
                  }
                }}
              >
                <SelectTrigger id="snapshot" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {snapshotIndex.snapshots.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.label} · {formatInteger(item.playerCount)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        <section className="mt-6 grid items-end gap-4 lg:grid-cols-[minmax(220px,360px)_1fr]">
          <div className="grid gap-1.5">
            <label className={labelClass} htmlFor="player-search">
              {t.controls.search}
            </label>
            <div className="relative">
              <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                className="pl-9"
                id="player-search"
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                }}
                placeholder={t.controls.searchPlaceholder}
              />
            </div>
          </div>
          <ToggleGroup
            type="single"
            value={gameType}
            onValueChange={(value) => {
              if (value) {
                setGameType(value as GameTypeId);
              }
            }}
            className="flex w-fit flex-wrap justify-start justify-self-start lg:justify-self-end"
            aria-label={t.controls.gameType}
          >
            {gameTypeIds.map((gameTypeId) => (
              <ToggleGroupItem value={gameTypeId} key={gameTypeId}>
                {t.gameTypes[gameTypeId]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </section>

        <section className="my-4 grid gap-4 md:grid-cols-3">
          <SummaryCard label={t.summary.players} value={formatInteger(snapshot.players.length)} />
          <SummaryCard label={t.summary.visible} value={formatInteger(filteredPlayers.length)} />
          <SummaryCard label={t.summary.snapshot} value={snapshot.label} />
        </section>

        <section className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <PlayerTable
            players={filteredPlayers}
            gameType={gameType}
            selectedUid={selectedPlayer?.uid ?? null}
            sort={sort}
            onSort={changeSort}
            onSelect={setSelectedUid}
          />
          <PlayerDetails player={selectedPlayer} gameType={gameType} />
        </section>
      </div>
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <span className={labelClass}>{label}</span>
        <strong className="mt-1 block text-2xl font-semibold [overflow-wrap:anywhere]">
          {value}
        </strong>
      </CardContent>
    </Card>
  );
}
