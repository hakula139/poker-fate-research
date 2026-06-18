from __future__ import annotations

import json
import sqlite3
from datetime import UTC, datetime
from pathlib import Path

from poker_fate_research.d1_export import snapshot_import_sql


MIGRATION = Path(__file__).resolve().parents[2] / 'web/migrations/0001_player_data.sql'


def connect_with_schema() -> sqlite3.Connection:
    connection = sqlite3.connect(':memory:')
    connection.executescript(MIGRATION.read_text(encoding='utf-8'))
    return connection


def scalar(connection: sqlite3.Connection, query: str) -> object:
    row = connection.execute(query).fetchone()
    return row[0] if row else None


def test_snapshot_import_sql_loads_snapshot_into_schema(tmp_path: Path) -> None:
    snapshot_path = tmp_path / 'poker-fate-players-20260618T010203Z.jsonl'
    snapshot_path.write_text(
        json.dumps(
            {
                'uid': 101,
                'names': ["O'Malley"],
                'leaderboard_entries': [
                    {
                        'game_type': 10010101,
                        'leaderboard_id': 7,
                        'leaderboard_name': 'Throne Points',
                        'period': 'current_week',
                        'rank': 1,
                        'value': 1200,
                    }
                ],
                'game_data': {},
                'sng_record': {'list': []},
                'fetched_at': '2026-06-18T01:03:00+00:00',
            },
            ensure_ascii=False,
            separators=(',', ':'),
        )
        + '\n',
        encoding='utf-8',
    )

    sql = snapshot_import_sql(snapshot_path, datetime(2026, 6, 18, 2, 0, tzinfo=UTC))

    connection = connect_with_schema()
    connection.executescript(sql)

    snapshot = connection.execute(
        'SELECT id, player_count, leaderboard_row_count FROM snapshots'
    ).fetchone()
    assert snapshot == ('20260618T010203Z', 1, 1)

    player = connection.execute(
        'SELECT player_json FROM snapshot_players WHERE uid = 101'
    ).fetchone()
    assert json.loads(player[0])['name'] == "O'Malley"

    alias = connection.execute(
        "SELECT uid FROM player_aliases WHERE alias = 'O''Malley'"
    ).fetchone()
    assert alias == (101,)


def test_snapshot_import_sql_accepts_normalized_snapshot_json(tmp_path: Path) -> None:
    snapshot_path = tmp_path / '20260618T010203Z.json'
    snapshot_path.write_text(
        json.dumps(
            {
                'id': '20260618T010203Z',
                'label': '2026-06-18 01:02 UTC',
                'source': 'test',
                'generatedAt': '2026-06-18T01:02:03+00:00',
                'players': [
                    {
                        'uid': 101,
                        'name': 'Hakula',
                        'names': ['Hakula'],
                        'leaderboardEntries': [],
                        'games': {},
                        'sngRecordCount': 0,
                        'fetchedAt': '2026-06-18T01:03:00+00:00',
                    }
                ],
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding='utf-8',
    )

    sql = snapshot_import_sql(snapshot_path, datetime(2026, 6, 18, 2, 0, tzinfo=UTC))

    connection = connect_with_schema()
    connection.executescript(sql)

    cached_player = connection.execute(
        'SELECT uid FROM player_cache WHERE uid = 101'
    ).fetchone()
    assert cached_player == (101,)


def write_empty_snapshot(tmp_path: Path, generated_at: str) -> Path:
    snapshot_path = tmp_path / f'{generated_at.replace("-", "").replace(":", "")}.json'
    snapshot_path.write_text(
        json.dumps(
            {
                'id': generated_at,
                'label': generated_at,
                'source': 'test',
                'generatedAt': generated_at,
                'players': [],
            }
        ),
        encoding='utf-8',
    )
    return snapshot_path


def test_retention_prunes_expired_cache_and_its_aliases(tmp_path: Path) -> None:
    snapshot_path = write_empty_snapshot(tmp_path, '2026-06-18T00:00:00Z')
    sql = snapshot_import_sql(snapshot_path, datetime(2026, 6, 18, tzinfo=UTC))

    connection = connect_with_schema()
    connection.executescript(
        """
        INSERT INTO player_cache (uid, player_json, source, fetched_at, expires_at)
        VALUES (999, '{}', 'lookup', '2026-01-01T00:00:00Z', '2026-02-01T00:00:00Z');
        INSERT INTO player_aliases (alias, uid, source, observed_at)
        VALUES ('ghost', 999, 'lookup', '2026-01-01T00:00:00Z');
        """
    )
    connection.executescript(sql)

    assert scalar(connection, 'SELECT COUNT(*) FROM player_cache WHERE uid = 999') == 0
    assert (
        scalar(connection, "SELECT COUNT(*) FROM player_aliases WHERE alias = 'ghost'")
        == 0
    )


def test_retention_prunes_snapshot_players_beyond_thirty(tmp_path: Path) -> None:
    snapshot_path = write_empty_snapshot(tmp_path, '2026-06-18T00:00:00Z')
    sql = snapshot_import_sql(snapshot_path, datetime(2026, 6, 18, tzinfo=UTC))

    connection = connect_with_schema()
    for day in range(1, 31):
        connection.execute(
            'INSERT INTO snapshots '
            '(id, label, source, generated_at, fetched_at, player_count, '
            'leaderboard_row_count) VALUES (?, ?, ?, ?, ?, 0, 0)',
            (
                f'old-{day:02d}',
                f'old {day}',
                'test',
                f'2026-05-{day:02d}T00:00:00Z',
                '2026-05-01T00:00:00Z',
            ),
        )
    connection.execute(
        'INSERT INTO snapshot_players '
        '(snapshot_id, uid, player_json, leaderboard_entries_json, fetched_at) '
        "VALUES ('old-01', 555, '{}', '[]', '2026-05-01T00:00:00Z')"
    )
    connection.commit()

    connection.executescript(sql)

    assert scalar(connection, "SELECT COUNT(*) FROM snapshots WHERE id = 'old-01'") == 0
    assert (
        scalar(connection, 'SELECT COUNT(*) FROM snapshot_players WHERE uid = 555') == 0
    )
    assert scalar(connection, 'SELECT COUNT(*) FROM snapshots') == 30
