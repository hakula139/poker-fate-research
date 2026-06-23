CREATE TABLE community_tag_votes (
  uid INTEGER NOT NULL,
  tag TEXT NOT NULL,
  voter_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (uid, tag, voter_id)
);

CREATE TABLE community_vote_rate_limits (
  ip_hash TEXT PRIMARY KEY,
  window_start TEXT NOT NULL,
  count INTEGER NOT NULL
);

CREATE INDEX idx_community_tag_votes_uid ON community_tag_votes (uid);
