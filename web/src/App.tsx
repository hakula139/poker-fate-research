import { useEffect, useMemo, useState } from 'react';

import { loadSnapshot, loadSnapshots } from './data';
import { formatInteger, formatProfit, formatRate } from './format';
import { classifyPlayer } from './tagging';
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
    return classifyPlayer(stats);
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

function tagClass(tag: string): string {
  return `tag tag-${tag.toLowerCase().replaceAll(' ', '-')}`;
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
    <button className="sort-button" type="button" onClick={() => onSort(sortKey)}>
      {label}
      <span aria-hidden="true">{active ? (sort.direction === 'asc' ? '↑' : '↓') : ''}</span>
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
    <div className="table-shell">
      <table>
        <thead>
          <tr>
            <th>
              <SortButton label="Player" sortKey="name" sort={sort} onSort={onSort} />
            </th>
            <th>Source</th>
            <th>
              <SortButton label="Hands" sortKey="hands" sort={sort} onSort={onSort} />
            </th>
            <th>
              <SortButton label="Profit" sortKey="profit" sort={sort} onSort={onSort} />
            </th>
            <th>
              <SortButton label="VPIP" sortKey="vpip" sort={sort} onSort={onSort} />
            </th>
            <th>
              <SortButton label="PFR" sortKey="pfr" sort={sort} onSort={onSort} />
            </th>
            <th>
              <SortButton label="3-Bet" sortKey="threeBet" sort={sort} onSort={onSort} />
            </th>
            <th>
              <SortButton label="WTSD" sortKey="wtsd" sort={sort} onSort={onSort} />
            </th>
            <th>
              <SortButton label="AFq" sortKey="afq" sort={sort} onSort={onSort} />
            </th>
            <th>
              <SortButton label="C-Bet" sortKey="cbet" sort={sort} onSort={onSort} />
            </th>
            <th>
              <SortButton label="Tag" sortKey="tag" sort={sort} onSort={onSort} />
            </th>
          </tr>
        </thead>
        <tbody>
          {players.map((player) => {
            const stats = stat(player, gameType);
            const tag = classifyPlayer(stats);
            return (
              <tr
                className={selectedUid === player.uid ? 'selected-row' : ''}
                key={player.uid}
                onClick={() => onSelect(player.uid)}
              >
                <td>
                  <button className="player-button" type="button">
                    <strong>{player.name}</strong>
                    <span>{player.uid}</span>
                  </button>
                </td>
                <td>{bestLeaderboard(player)}</td>
                <td>{formatInteger(stats?.hands)}</td>
                <td className={stats && stats.profit < 0 ? 'negative' : 'positive'}>
                  {formatProfit(stats?.profit)}
                </td>
                <td>{formatRate(stats?.vpip)}</td>
                <td>{formatRate(stats?.pfr)}</td>
                <td>{formatRate(stats?.threeBet)}</td>
                <td>{formatRate(stats?.wtsd)}</td>
                <td>{formatRate(stats?.afq)}</td>
                <td>{formatRate(stats?.cbet)}</td>
                <td>
                  <span className={tagClass(tag)}>{tag}</span>
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
    return <aside className="detail-card empty-card">Select a player</aside>;
  }
  const stats = stat(player, gameType);
  const tag = classifyPlayer(stats);
  const entries = player.leaderboardEntries.slice(0, 5);

  return (
    <aside className="detail-card">
      <div>
        <p className="eyebrow">Player</p>
        <h2>{player.name}</h2>
        <p className="muted">{player.uid}</p>
      </div>
      <span className={tagClass(tag)}>{tag}</span>

      <div className="metric-grid">
        <div>
          <span>Hands</span>
          <strong>{formatInteger(stats?.hands)}</strong>
        </div>
        <div>
          <span>Profit</span>
          <strong>{formatProfit(stats?.profit)}</strong>
        </div>
        <div>
          <span>Score</span>
          <strong>{formatInteger(stats?.score)}</strong>
        </div>
        <div>
          <span>SNG records</span>
          <strong>{formatInteger(player.sngRecordCount)}</strong>
        </div>
      </div>

      <div className="rate-strip">
        {[
          ['VPIP', stats?.vpip],
          ['PFR', stats?.pfr],
          ['3-Bet', stats?.threeBet],
          ['WTSD', stats?.wtsd],
          ['AFq', stats?.afq],
          ['C-Bet', stats?.cbet],
        ].map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{formatRate(value as number | undefined)}</strong>
          </div>
        ))}
      </div>

      <div>
        <p className="eyebrow">Leaderboard</p>
        <div className="entry-list">
          {entries.length ? (
            entries.map((entry, index) => (
              <div className="entry" key={`${entry.leaderboardId}-${entry.period}-${index}`}>
                <span>{entry.leaderboardName}</span>
                <strong>
                  {typeof entry.rank === 'number' ? `#${entry.rank}` : '-'}
                </strong>
              </div>
            ))
          ) : (
            <p className="muted">No leaderboard rows</p>
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

  useEffect(() => {
    loadSnapshots().then(({ index, active }) => {
      setSnapshotIndex(index);
      setSnapshot(active);
      setSnapshotId(active.id);
      setSelectedUid(active.players[0]?.uid ?? null);
    });
  }, []);

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
    return <main className="loading">Loading player stats</main>;
  }

  return (
    <main className="app-shell">
      <section className="topbar">
        <div>
          <p className="eyebrow">Poker Fate research</p>
          <h1>Player stats</h1>
        </div>
        <div className="snapshot-control">
          <label htmlFor="snapshot">Snapshot</label>
          <select
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
      </section>

      <section className="control-row">
        <div className="search-box">
          <label htmlFor="player-search">Search</label>
          <input
            id="player-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name or UID"
          />
        </div>
        <div className="segment-control" aria-label="Game type">
          {gameTypes.map((game) => (
            <button
              className={game.id === gameType ? 'active-segment' : ''}
              key={game.id}
              type="button"
              onClick={() => setGameType(game.id)}
            >
              {game.label}
            </button>
          ))}
        </div>
      </section>

      <section className="summary-row">
        <div>
          <span>Players</span>
          <strong>{formatInteger(snapshot.players.length)}</strong>
        </div>
        <div>
          <span>Visible</span>
          <strong>{formatInteger(filteredPlayers.length)}</strong>
        </div>
        <div>
          <span>Snapshot</span>
          <strong>{snapshot.label}</strong>
        </div>
      </section>

      <section className="content-grid">
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
    </main>
  );
}
