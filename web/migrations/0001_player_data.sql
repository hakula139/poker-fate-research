CREATE TABLE snapshots (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  source TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  player_count INTEGER NOT NULL,
  leaderboard_row_count INTEGER NOT NULL
);

CREATE TABLE snapshot_players (
  snapshot_id TEXT NOT NULL,
  uid INTEGER NOT NULL,
  player_json TEXT NOT NULL,
  leaderboard_entries_json TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  PRIMARY KEY (snapshot_id, uid),
  FOREIGN KEY (snapshot_id) REFERENCES snapshots (id) ON DELETE CASCADE
);

CREATE TABLE player_cache (
  uid INTEGER PRIMARY KEY,
  player_json TEXT NOT NULL,
  source TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE player_aliases (
  alias TEXT PRIMARY KEY COLLATE NOCASE,
  uid INTEGER NOT NULL,
  source TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  FOREIGN KEY (uid) REFERENCES player_cache (uid) ON DELETE CASCADE
);

CREATE INDEX idx_snapshots_generated_at ON snapshots (generated_at DESC);
CREATE INDEX idx_snapshot_players_uid ON snapshot_players (uid);
CREATE INDEX idx_player_cache_expires_at ON player_cache (expires_at);
CREATE INDEX idx_player_aliases_uid ON player_aliases (uid);
