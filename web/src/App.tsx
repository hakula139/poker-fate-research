import { useEffect, useMemo, useState } from 'react';

import { PlayerTagChip } from './components/PlayerTag';
import { ThemeControl } from './components/ThemeControl';
import { loadSnapshot, loadSnapshots } from './data';
import { formatInteger, formatProfit, formatRate } from './format';
import { classifyPlayer } from './tagging';
import { getInitialTheme, writeThemeMode, type ThemeMode } from './theme';
import type {
  GameStats,
  GameTypeId,
  PlayerRecord,
  PlayerSnapshot,
  SnapshotIndex,
  SnapshotIndexItem,
} from './types';

import './styles.css';

const gameTypes: { id: GameTypeId; label: string }[] = [
  { id: '10010101', label: "Hold'em" },
  { id: '10020101', label: 'Omaha' },
  { id: '10050301', label: 'SNG' },
  { id: '20010103', label: 'Friend room' },
];

const labelClass = 'text-xs font-bold tracking-normal text-[#557066] uppercase dark:text-[#9eb3aa]';
const panelClass =
  'rounded-lg border border-[#d3dbd2] bg-white shadow-[0_20px_45px_rgba(31,47,39,0.08)] dark:border-[#31483f] dark:bg-[#111a16] dark:shadow-[0_22px_48px_rgba(0,0,0,0.32)]';
const fieldClass =
  'min-h-10 rounded-md border border-[#cbd6cc] bg-white px-3 text-[#17201b] outline-none focus-visible:ring-3 focus-visible:ring-[#23527c]/35 dark:border-[#40594f] dark:bg-[#14201b] dark:text-[#e9f0ec] dark:placeholder:text-[#7f9289]';
const metricClass = 'rounded-md border border-[#e1e7e0] p-2.5 dark:border-[#31483f]';
const metricLabelClass = 'block text-xs font-bold text-[#62756d] uppercase dark:text-[#9eb3aa]';
const metricValueClass = 'mt-1 block text-lg font-semibold text-[#17201b] dark:text-[#eef4f0]';

type SortKey =
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

type SortState = {
  key: SortKey;
  direction: 'asc' | 'desc';
};

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

function bestLeaderboard(player: PlayerRecord): string {
  const entry = player.leaderboardEntries[0];
  if (!entry) {
    return '-';
  }
  const rank = typeof entry.rank === 'number' ? `#${entry.rank}` : 'ranked';
  return `${rank} ${entry.leaderboardName}`;
}

function TagGroup({ stats }: { stats: GameStats | undefined }) {
  const tags = classifyPlayer(stats);
  const values =
    tags.preflop === 'Sample too low' ? [tags.preflop] : [tags.preflop, tags.postflop];
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((tag) => (
        <PlayerTagChip tag={tag} key={tag} />
      ))}
    </div>
  );
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
  return (
    <button
      className="inline-flex min-w-14 items-center gap-1 bg-transparent p-0 text-xs font-extrabold text-inherit uppercase outline-none focus-visible:ring-3 focus-visible:ring-[#23527c]/35"
      type="button"
      onClick={() => onSort(sortKey)}
    >
      {label}
      <span className="w-2.5" aria-hidden="true">
        {active ? (sort.direction === 'asc' ? '↑' : '↓') : ''}
      </span>
    </button>
  );
}

function PlayerTable({
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
    <div className={`${panelClass} overflow-auto`}>
      <table className="w-full min-w-[1160px] border-collapse">
        <thead>
          <tr>
            <th className="sticky top-0 z-10 min-w-[230px] border-b border-[#dce4dc] bg-[#edf2ed] px-3.5 py-3 text-left text-xs font-bold text-[#40534a] uppercase dark:border-[#31483f] dark:bg-[#1d2a24] dark:text-[#b4c7bf]">
              <SortButton label="Player" sortKey="name" sort={sort} onSort={onSort} />
            </th>
            <th className="sticky top-0 z-10 border-b border-[#dce4dc] bg-[#edf2ed] px-3.5 py-3 text-left text-xs font-bold text-[#40534a] uppercase dark:border-[#31483f] dark:bg-[#1d2a24] dark:text-[#b4c7bf]">
              Source
            </th>
            <th className="sticky top-0 z-10 border-b border-[#dce4dc] bg-[#edf2ed] px-3.5 py-3 text-left text-xs font-bold text-[#40534a] uppercase dark:border-[#31483f] dark:bg-[#1d2a24] dark:text-[#b4c7bf]">
              <SortButton label="Hands" sortKey="hands" sort={sort} onSort={onSort} />
            </th>
            <th className="sticky top-0 z-10 border-b border-[#dce4dc] bg-[#edf2ed] px-3.5 py-3 text-left text-xs font-bold text-[#40534a] uppercase dark:border-[#31483f] dark:bg-[#1d2a24] dark:text-[#b4c7bf]">
              <SortButton label="Profit" sortKey="profit" sort={sort} onSort={onSort} />
            </th>
            <th className="sticky top-0 z-10 border-b border-[#dce4dc] bg-[#edf2ed] px-3.5 py-3 text-left text-xs font-bold text-[#40534a] uppercase dark:border-[#31483f] dark:bg-[#1d2a24] dark:text-[#b4c7bf]">
              <SortButton label="VPIP" sortKey="vpip" sort={sort} onSort={onSort} />
            </th>
            <th className="sticky top-0 z-10 border-b border-[#dce4dc] bg-[#edf2ed] px-3.5 py-3 text-left text-xs font-bold text-[#40534a] uppercase dark:border-[#31483f] dark:bg-[#1d2a24] dark:text-[#b4c7bf]">
              <SortButton label="PFR" sortKey="pfr" sort={sort} onSort={onSort} />
            </th>
            <th className="sticky top-0 z-10 border-b border-[#dce4dc] bg-[#edf2ed] px-3.5 py-3 text-left text-xs font-bold text-[#40534a] uppercase dark:border-[#31483f] dark:bg-[#1d2a24] dark:text-[#b4c7bf]">
              <SortButton label="3-Bet" sortKey="threeBet" sort={sort} onSort={onSort} />
            </th>
            <th className="sticky top-0 z-10 border-b border-[#dce4dc] bg-[#edf2ed] px-3.5 py-3 text-left text-xs font-bold text-[#40534a] uppercase dark:border-[#31483f] dark:bg-[#1d2a24] dark:text-[#b4c7bf]">
              <SortButton label="WTSD" sortKey="wtsd" sort={sort} onSort={onSort} />
            </th>
            <th className="sticky top-0 z-10 border-b border-[#dce4dc] bg-[#edf2ed] px-3.5 py-3 text-left text-xs font-bold text-[#40534a] uppercase dark:border-[#31483f] dark:bg-[#1d2a24] dark:text-[#b4c7bf]">
              <SortButton label="AFq" sortKey="afq" sort={sort} onSort={onSort} />
            </th>
            <th className="sticky top-0 z-10 border-b border-[#dce4dc] bg-[#edf2ed] px-3.5 py-3 text-left text-xs font-bold text-[#40534a] uppercase dark:border-[#31483f] dark:bg-[#1d2a24] dark:text-[#b4c7bf]">
              <SortButton label="C-Bet" sortKey="cbet" sort={sort} onSort={onSort} />
            </th>
            <th className="sticky top-0 z-10 border-b border-[#dce4dc] bg-[#edf2ed] px-3.5 py-3 text-left text-xs font-bold text-[#40534a] uppercase dark:border-[#31483f] dark:bg-[#1d2a24] dark:text-[#b4c7bf]">
              <SortButton label="Tag" sortKey="tag" sort={sort} onSort={onSort} />
            </th>
          </tr>
        </thead>
        <tbody>
          {players.map((player) => {
            const stats = stat(player, gameType);
            return (
              <tr
                className={`border-b border-[#eef2ee] hover:bg-[#f1f7f4] dark:border-[#24372f] dark:hover:bg-[#182720] ${
                  selectedUid === player.uid ? 'bg-[#f1f7f4] dark:bg-[#182720]' : ''
                }`}
                key={player.uid}
                onClick={() => onSelect(player.uid)}
              >
                <td className="min-w-[230px] px-3.5 py-3 whitespace-nowrap">
                  <button
                    className="grid gap-0.5 bg-transparent p-0 text-left text-inherit outline-none focus-visible:ring-3 focus-visible:ring-[#23527c]/35"
                    type="button"
                  >
                    <strong className="max-w-[260px] overflow-hidden text-ellipsis text-[#17201b] dark:text-[#eef4f0]">
                      {player.name}
                    </strong>
                    <span className="text-xs text-[#6c7c75] dark:text-[#94a69e]">{player.uid}</span>
                  </button>
                </td>
                <td className="px-3.5 py-3 whitespace-nowrap">{bestLeaderboard(player)}</td>
                <td className="px-3.5 py-3 whitespace-nowrap">{formatInteger(stats?.hands)}</td>
                <td
                  className={`px-3.5 py-3 whitespace-nowrap ${
                    stats && stats.profit < 0
                      ? 'text-[#9b2e2e] dark:text-[#f0a0a0]'
                      : 'text-[#17613d] dark:text-[#77d6a4]'
                  }`}
                >
                  {formatProfit(stats?.profit)}
                </td>
                <td className="px-3.5 py-3 whitespace-nowrap">{formatRate(stats?.vpip)}</td>
                <td className="px-3.5 py-3 whitespace-nowrap">{formatRate(stats?.pfr)}</td>
                <td className="px-3.5 py-3 whitespace-nowrap">{formatRate(stats?.threeBet)}</td>
                <td className="px-3.5 py-3 whitespace-nowrap">{formatRate(stats?.wtsd)}</td>
                <td className="px-3.5 py-3 whitespace-nowrap">{formatRate(stats?.afq)}</td>
                <td className="px-3.5 py-3 whitespace-nowrap">{formatRate(stats?.cbet)}</td>
                <td className="px-3.5 py-3 whitespace-nowrap">
                  <TagGroup stats={stats} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PlayerCard({
  player,
  gameType,
}: {
  player: PlayerRecord | undefined;
  gameType: GameTypeId;
}) {
  if (!player) {
    return (
      <aside className={`${panelClass} order-first p-4 text-[#62756d] dark:text-[#9eb3aa] lg:order-none`}>
        Select a player
      </aside>
    );
  }
  const stats = stat(player, gameType);
  const entries = player.leaderboardEntries.slice(0, 5);

  return (
    <aside className={`${panelClass} order-first grid gap-4 p-4 lg:sticky lg:top-4 lg:order-none`}>
      <div>
        <p className={`${labelClass} mb-1.5`}>Player</p>
        <h2 className="[overflow-wrap:anywhere] text-2xl font-semibold tracking-normal text-[#17201b] dark:text-[#eef4f0]">
          {player.name}
        </h2>
        <p className="mt-2 text-xs text-[#6c7c75] dark:text-[#94a69e]">{player.uid}</p>
      </div>
      <TagGroup stats={stats} />

      <div className="grid grid-cols-2 gap-2.5">
        <div className={metricClass}>
          <span className={metricLabelClass}>Hands</span>
          <strong className={metricValueClass}>{formatInteger(stats?.hands)}</strong>
        </div>
        <div className={metricClass}>
          <span className={metricLabelClass}>Profit</span>
          <strong className={metricValueClass}>{formatProfit(stats?.profit)}</strong>
        </div>
        <div className={metricClass}>
          <span className={metricLabelClass}>Score</span>
          <strong className={metricValueClass}>{formatInteger(stats?.score)}</strong>
        </div>
        <div className={metricClass}>
          <span className={metricLabelClass}>SNG records</span>
          <strong className={metricValueClass}>{formatInteger(player.sngRecordCount)}</strong>
        </div>
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
          <div className={metricClass} key={label}>
            <span className={metricLabelClass}>{label}</span>
            <strong className={metricValueClass}>{formatRate(value as number | undefined)}</strong>
          </div>
        ))}
      </div>

      <div>
        <p className={`${labelClass} mb-2`}>Leaderboard</p>
        <div className="grid gap-2">
          {entries.length ? (
            entries.map((entry, index) => (
              <div
                className="flex items-center justify-between gap-3 border-b border-[#edf1ed] pb-2 dark:border-[#24372f]"
                key={`${entry.leaderboardId}-${entry.period}-${index}`}
              >
                <span className="text-[#40534a] dark:text-[#c8d6d0]">{entry.leaderboardName}</span>
                <strong>{typeof entry.rank === 'number' ? `#${entry.rank}` : '-'}</strong>
              </div>
            ))
          ) : (
            <p className="text-xs text-[#6c7c75] dark:text-[#94a69e]">No leaderboard rows</p>
          )}
        </div>
      </div>
    </aside>
  );
}

export default function App() {
  const [snapshotIndex, setSnapshotIndex] = useState<SnapshotIndex | null>(null);
  const [snapshot, setSnapshot] = useState<PlayerSnapshot | null>(null);
  const [snapshotId, setSnapshotId] = useState<string>('');
  const [query, setQuery] = useState('');
  const [gameType, setGameType] = useState<GameTypeId>('10010101');
  const [selectedUid, setSelectedUid] = useState<number | null>(null);
  const [sort, setSort] = useState<SortState>({ key: 'profit', direction: 'desc' });
  const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialTheme);

  useEffect(() => {
    loadSnapshots().then(({ index, active }) => {
      setSnapshotIndex(index);
      setSnapshot(active);
      setSnapshotId(active.id);
      setSelectedUid(active.players[0]?.uid ?? null);
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
      return () => media.removeEventListener('change', applyTheme);
    }
  }, [themeMode]);

  async function changeSnapshot(item: SnapshotIndexItem) {
    const next = await loadSnapshot(item.path);
    setSnapshot(next);
    setSnapshotId(next.id);
    setSelectedUid(next.players[0]?.uid ?? null);
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
            player.name.toLowerCase().includes(needle) ||
            String(player.uid).includes(needle),
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

  const selectedPlayer = useMemo(
    () => filteredPlayers.find((player) => player.uid === selectedUid) ?? filteredPlayers[0],
    [filteredPlayers, selectedUid],
  );

  if (!snapshot || !snapshotIndex) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f6f7f2] text-[#40534a] dark:bg-[#0c1411] dark:text-[#c8d6d0]">
        Loading player stats
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,rgba(35,82,124,0.08),transparent_280px),#f6f7f2] text-[#17201b] dark:bg-[linear-gradient(180deg,rgba(83,129,110,0.12),transparent_300px),#0c1411] dark:text-[#e9f0ec]">
      <div className="mx-auto w-[min(1500px,calc(100%-32px))] py-7 max-sm:w-[calc(100%-20px)] max-sm:py-4">
        <section className="grid items-end gap-4 lg:grid-cols-[1fr_auto]">
          <div>
            <p className={`${labelClass} mb-1.5`}>Poker Fate research</p>
            <h1 className="text-[clamp(32px,5vw,54px)] leading-none font-normal tracking-normal">
              Player stats
            </h1>
          </div>
          <div className="grid gap-3 sm:grid-cols-[auto_auto] sm:items-end">
            <ThemeControl
              labelClass={labelClass}
              themeMode={themeMode}
              onThemeModeChange={setThemeMode}
            />
            <div className="grid gap-1.5">
              <label className={labelClass} htmlFor="snapshot">
                Snapshot
              </label>
              <select
                className={`${fieldClass} max-w-[min(420px,88vw)] pr-8`}
                id="snapshot"
                value={snapshotId}
                onChange={(event) => {
                  const item = snapshotIndex.snapshots.find(
                    (candidate) => candidate.id === event.target.value,
                  );
                  if (item) {
                    void changeSnapshot(item);
                  }
                }}
              >
                {snapshotIndex.snapshots.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label} · {item.playerCount} players
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="mt-6 grid items-end gap-4 lg:grid-cols-[minmax(220px,360px)_1fr]">
          <div className="grid gap-1.5">
            <label className={labelClass} htmlFor="player-search">
              Search
            </label>
            <input
              className={`${fieldClass} w-full`}
              id="player-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name or UID"
            />
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end" aria-label="Game type">
            {gameTypes.map((game) => (
              <button
                aria-pressed={game.id === gameType}
                className={`min-h-9 rounded-md border px-3.5 outline-none focus-visible:ring-3 focus-visible:ring-[#23527c]/35 ${
                  game.id === gameType
                    ? 'border-[#23527c] bg-[#23527c] text-white'
                    : 'border-[#cbd6cc] bg-white text-[#304139] dark:border-[#40594f] dark:bg-[#14201b] dark:text-[#c8d6d0]'
                }`}
                key={game.id}
                type="button"
                onClick={() => setGameType(game.id)}
              >
                {game.label}
              </button>
            ))}
          </div>
        </section>

        <section className="my-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-[#d9e0d8] bg-white/80 p-4 dark:border-[#31483f] dark:bg-[#111a16]/85">
            <span className={metricLabelClass}>Players</span>
            <strong className="mt-1 block text-2xl font-semibold">{formatInteger(snapshot.players.length)}</strong>
          </div>
          <div className="rounded-lg border border-[#d9e0d8] bg-white/80 p-4 dark:border-[#31483f] dark:bg-[#111a16]/85">
            <span className={metricLabelClass}>Visible</span>
            <strong className="mt-1 block text-2xl font-semibold">{formatInteger(filteredPlayers.length)}</strong>
          </div>
          <div className="rounded-lg border border-[#d9e0d8] bg-white/80 p-4 dark:border-[#31483f] dark:bg-[#111a16]/85">
            <span className={metricLabelClass}>Snapshot</span>
            <strong className="mt-1 block [overflow-wrap:anywhere] text-2xl font-semibold">
              {snapshot.label}
            </strong>
          </div>
        </section>

        <section className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <PlayerTable
            players={filteredPlayers}
            gameType={gameType}
            selectedUid={selectedPlayer?.uid ?? null}
            sort={sort}
            onSort={changeSort}
            onSelect={setSelectedUid}
          />
          <PlayerCard player={selectedPlayer} gameType={gameType} />
        </section>
      </div>
    </main>
  );
}
