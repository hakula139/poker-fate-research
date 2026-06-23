DROP INDEX IF EXISTS idx_snapshots_generated_at;
DROP INDEX IF EXISTS idx_snapshot_players_uid;
DROP INDEX IF EXISTS idx_player_cache_expires_at;
DROP INDEX IF EXISTS idx_player_aliases_uid;

DROP TABLE IF EXISTS snapshot_players;
DROP TABLE IF EXISTS snapshots;
DROP TABLE IF EXISTS player_aliases;
DROP TABLE IF EXISTS player_cache;

CREATE TABLE players (
  uid INTEGER PRIMARY KEY,
  player_json TEXT NOT NULL,
  source TEXT NOT NULL,
  fetched_at TEXT NOT NULL
);

CREATE TABLE player_aliases (
  alias TEXT PRIMARY KEY COLLATE NOCASE,
  uid INTEGER NOT NULL,
  source TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  FOREIGN KEY (uid) REFERENCES players (uid) ON DELETE CASCADE
);

CREATE INDEX idx_players_fetched_at ON players (fetched_at DESC);
CREATE INDEX idx_player_aliases_uid ON player_aliases (uid);
