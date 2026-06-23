import { SearchIcon } from 'lucide-react';

import { FieldLabel } from '@/components/field-label';
import { LanguageControl } from '@/components/language-control';
import { PlayerDetails } from '@/components/player-stats/player-details';
import { PlayerTable } from '@/components/player-stats/player-table';
import { labelClass } from '@/components/player-stats/styles';
import { SummaryCard } from '@/components/player-stats/summary-card';
import { ThemeControl } from '@/components/theme-control';
import { Input } from '@/components/ui/input';
import { usePlayerStatsView } from '@/features/player-stats/use-player-stats-view';
import { usePlayers } from '@/features/player-stats/use-players';
import { useThemeMode } from '@/features/theme/use-theme-mode';
import { useI18n } from '@/i18n';

export function PlayerStatsPage() {
  const { format, t } = useI18n();
  const { setThemeMode, themeMode } = useThemeMode();
  const { dataIssue, loading, players, updatedAt } = usePlayers();
  const view = usePlayerStatsView(players);

  if (loading) {
    return (
      <main className="bg-background text-muted-foreground grid min-h-screen place-items-center">
        {t.app.loading}
      </main>
    );
  }

  return (
    <main className="text-foreground min-h-screen bg-[linear-gradient(180deg,color-mix(in_oklch,var(--primary)_11%,transparent),transparent_280px),var(--background)]">
      <div className="mx-auto w-[min(1500px,calc(100%-32px))] py-4 max-sm:w-[calc(100%-20px)]">
        <section className="grid items-end gap-3 lg:grid-cols-[1fr_auto]">
          <div>
            <p className={`${labelClass} mb-1.5`}>{t.app.eyebrow}</p>
            <h1 className="text-[clamp(32px,5vw,54px)] leading-none font-semibold tracking-normal">
              {t.app.title}
            </h1>
          </div>
          <div className="grid gap-3 sm:grid-cols-[auto_auto] sm:items-end">
            <LanguageControl />
            <ThemeControl
              themeMode={themeMode}
              onThemeModeChange={setThemeMode}
            />
          </div>
        </section>

        <section className="mt-4 grid items-end gap-3 lg:grid-cols-[minmax(220px,340px)_1fr]">
          <div className="grid gap-1.5">
            <FieldLabel htmlFor="player-search">{t.controls.search}</FieldLabel>
            <div className="relative">
              <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                className="pl-9"
                id="player-search"
                type="search"
                value={view.query}
                onChange={(event) => {
                  view.setQuery(event.target.value);
                }}
                placeholder={t.controls.searchPlaceholder}
              />
            </div>
          </div>
        </section>

        <section className="my-3 grid gap-3 md:grid-cols-3">
          <SummaryCard
            label={t.summary.players}
            value={format.integer(view.loadedPlayers.length)}
          />
          <SummaryCard
            label={t.summary.visible}
            value={format.integer(view.filteredPlayers.length)}
          />
          <SummaryCard
            label={t.summary.updated}
            value={updatedAt ? format.relativeTime(updatedAt) : '-'}
          />
        </section>

        {dataIssue ? (
          <p className="border-warning bg-warning/10 text-warning-foreground mb-4 rounded-md border px-3 py-2 text-sm">
            {t.app.dataUnavailable} {t.app.dataIssues[dataIssue.code]}
          </p>
        ) : null}

        <section className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
          <PlayerTable
            players={view.filteredPlayers}
            selectedUid={view.selectedPlayer?.uid ?? null}
            sort={view.sort}
            onSort={view.changeSort}
            onSelect={view.selectPlayer}
          />
          <PlayerDetails
            player={view.selectedPlayer}
            refreshing={view.selectedPlayer?.uid === view.refreshingUid}
          />
        </section>
      </div>
    </main>
  );
}
