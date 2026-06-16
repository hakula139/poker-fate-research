import { SearchIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { FieldLabel } from '@/components/field-label';
import { LanguageControl } from '@/components/language-control';
import { PlayerDetails } from '@/components/player-stats/player-details';
import { PlayerTable } from '@/components/player-stats/player-table';
import { labelClass } from '@/components/player-stats/styles';
import { ThemeControl } from '@/components/theme-control';
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
import {
  loadSnapshot,
  loadSnapshots,
  type SnapshotLoadErrorCode,
  snapshotLoadErrorCode,
} from '@/data';
import {
  filterAndSortPlayers,
  gameTypeIds,
  snapshotDisplayLabel,
  type SortKey,
  type SortState,
} from '@/features/player-stats/model';
import { I18nProvider, useI18n } from '@/i18n';
import { getInitialTheme, type ThemeMode, writeThemeMode } from '@/theme';
import type {
  GameTypeId,
  PlayerRecord,
  PlayerSnapshot,
  SnapshotIndex,
  SnapshotIndexItem,
} from '@/types';

import './styles.css';

type DataIssue =
  | {
      code: SnapshotLoadErrorCode;
      kind: 'sampleFallback';
    }
  | {
      code: SnapshotLoadErrorCode;
      kind: 'snapshotSelection';
    };

export default function App() {
  return (
    <I18nProvider>
      <PlayerStatsApp />
    </I18nProvider>
  );
}

function PlayerStatsApp() {
  const { format, t } = useI18n();
  const [snapshotIndex, setSnapshotIndex] = useState<SnapshotIndex | null>(null);
  const [snapshot, setSnapshot] = useState<PlayerSnapshot | null>(null);
  const [snapshotId, setSnapshotId] = useState<string>('');
  const [query, setQuery] = useState('');
  const [gameType, setGameType] = useState<GameTypeId>('10010101');
  const [selectedUid, setSelectedUid] = useState<number | null>(null);
  const [sort, setSort] = useState<SortState>({ key: 'profit', direction: 'desc' });
  const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialTheme);
  const [dataIssue, setDataIssue] = useState<DataIssue | null>(null);

  useEffect(() => {
    void loadSnapshots().then(({ index, active, source, error }) => {
      setSnapshotIndex(index);
      setSnapshot(active);
      setSnapshotId(active.id);
      setSelectedUid(null);
      setDataIssue(source === 'sample' && error ? { kind: 'sampleFallback', code: error } : null);
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
    try {
      const next = await loadSnapshot(item.path);
      setSnapshot(next);
      setSnapshotId(next.id);
      setSelectedUid(null);
      setDataIssue(null);
    } catch (error) {
      setDataIssue({ kind: 'snapshotSelection', code: snapshotLoadErrorCode(error) });
    }
  }

  function changeSort(key: SortKey) {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc',
    }));
  }

  const filteredPlayers = useMemo(() => {
    return filterAndSortPlayers({
      gameType,
      players: snapshot?.players ?? [],
      query,
      sort,
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
          <div className="grid gap-3 sm:grid-cols-[auto_auto_260px] sm:items-end">
            <LanguageControl />
            <ThemeControl
              themeMode={themeMode}
              onThemeModeChange={setThemeMode}
            />
            <div className="grid gap-1.5">
              <FieldLabel htmlFor="snapshot">{t.controls.snapshot}</FieldLabel>
              <Select
                value={snapshotId}
                onValueChange={(value) => {
                  const item = snapshotIndex.snapshots.find((candidate) => candidate.id === value);
                  if (item) {
                    void changeSnapshot(item);
                  }
                }}
              >
                <SelectTrigger
                  id="snapshot"
                  className="w-full"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {snapshotIndex.snapshots.map((item) => (
                    <SelectItem
                      key={item.id}
                      value={item.id}
                    >
                      {snapshotDisplayLabel(item, t.summary)} · {format.integer(item.playerCount)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        <section className="mt-6 grid items-end gap-4 lg:grid-cols-[minmax(220px,360px)_1fr]">
          <div className="grid gap-1.5">
            <FieldLabel htmlFor="player-search">{t.controls.search}</FieldLabel>
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
              <ToggleGroupItem
                value={gameTypeId}
                key={gameTypeId}
              >
                {t.gameTypes[gameTypeId]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </section>

        <section className="my-4 grid gap-4 md:grid-cols-3">
          <SummaryCard
            label={t.summary.players}
            value={format.integer(snapshot.players.length)}
          />
          <SummaryCard
            label={t.summary.visible}
            value={format.integer(filteredPlayers.length)}
          />
          <SummaryCard
            label={t.summary.snapshot}
            value={snapshotDisplayLabel(snapshot, t.summary)}
          />
        </section>

        {dataIssue ? (
          <p className="border-warning bg-warning/10 text-warning-foreground mb-4 rounded-md border px-3 py-2 text-sm">
            {dataIssue.kind === 'sampleFallback' ? t.app.sampleDataIssue : t.app.snapshotDataIssue}{' '}
            {t.app.dataIssues[dataIssue.code]}
          </p>
        ) : null}

        <section className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <PlayerTable
            players={filteredPlayers}
            gameType={gameType}
            selectedUid={selectedPlayer?.uid ?? null}
            sort={sort}
            onSort={changeSort}
            onSelect={setSelectedUid}
          />
          <PlayerDetails
            player={selectedPlayer}
            gameType={gameType}
          />
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
        <strong className="mt-1 block text-2xl font-semibold wrap-anywhere">{value}</strong>
      </CardContent>
    </Card>
  );
}
