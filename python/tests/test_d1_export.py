from __future__ import annotations

import json
import sqlite3
from datetime import UTC, datetime
from pathlib import Path

from poker_fate_research.d1_export import player_import_sql


MIGRATIONS_DIR = Path(__file__).resolve().parents[2] / 'web/migrations'


def connect_with_schema() -> sqlite3.Connection:
    connection = sqlite3.connect(':memory:')
    for migration in sorted(MIGRATIONS_DIR.glob('*.sql')):
        connection.executescript(migration.read_text(encoding='utf-8'))
    return connection


def scalar(connection: sqlite3.Connection, query: str) -> object:
    row = connection.execute(query).fetchone()
    return row[0] if row else None


def holdem_game_data(play_times: int) -> dict[str, object]:
    return {
        '10010101': {
            'label': "Hold'em lobby",
            'request': {'game_type': 10010101, 'player_uid': 101},
            'response': {'data': {'play_times': play_times, 'profit': 100}},
        }
    }


def test_player_import_sql_loads_players_into_schema(tmp_path: Path) -> None:
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
                'game_data': holdem_game_data(8229),
                'sng_record': {'list': []},
                'fetched_at': '2026-06-18T01:03:00+00:00',
            },
            ensure_ascii=False,
            separators=(',', ':'),
        )
        + '\n',
        encoding='utf-8',
    )

    sql = player_import_sql(snapshot_path, datetime(2026, 6, 18, 2, 0, tzinfo=UTC))

    connection = connect_with_schema()
    connection.executescript(sql)

    player = connection.execute(
        'SELECT player_json, fetched_at FROM players WHERE uid = 101'
    ).fetchone()
    assert json.loads(player[0])['name'] == "O'Malley"
    assert player[1] == '2026-06-18T01:03:00+00:00'

    alias = connection.execute(
        "SELECT uid FROM player_aliases WHERE alias = 'O''Malley'"
    ).fetchone()
    assert alias == (101,)


def test_player_import_sql_accepts_normalized_player_json(tmp_path: Path) -> None:
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
                        'games': {'10010101': {'gameType': 10010101, 'hands': 500}},
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

    sql = player_import_sql(snapshot_path, datetime(2026, 6, 18, 2, 0, tzinfo=UTC))

    connection = connect_with_schema()
    connection.executescript(sql)

    assert scalar(connection, 'SELECT uid FROM players WHERE uid = 101') == 101


def test_import_skips_players_without_holdem_hands(tmp_path: Path) -> None:
    snapshot_path = tmp_path / '20260618T010203Z.json'
    snapshot_path.write_text(
        json.dumps(
            {
                'id': '20260618T010203Z',
                'label': 'test',
                'source': 'test',
                'generatedAt': '2026-06-18T01:02:03+00:00',
                'players': [
                    {
                        'uid': 101,
                        'name': 'Active',
                        'names': ['Active'],
                        'leaderboardEntries': [],
                        'games': {'10010101': {'gameType': 10010101, 'hands': 500}},
                        'sngRecordCount': 0,
                        'fetchedAt': '2026-06-18T01:03:00+00:00',
                    },
                    {
                        'uid': 202,
                        'name': 'Empty',
                        'names': ['Empty'],
                        'leaderboardEntries': [],
                        'games': {'10010101': {'gameType': 10010101, 'hands': 0}},
                        'sngRecordCount': 0,
                        'fetchedAt': '2026-06-18T01:03:00+00:00',
                    },
                ],
            }
        ),
        encoding='utf-8',
    )

    sql = player_import_sql(snapshot_path, datetime(2026, 6, 18, tzinfo=UTC))

    connection = connect_with_schema()
    connection.executescript(sql)

    assert scalar(connection, 'SELECT COUNT(*) FROM players') == 1
    assert scalar(connection, 'SELECT uid FROM players') == 101
    assert (
        scalar(connection, "SELECT COUNT(*) FROM player_aliases WHERE alias = 'Empty'")
        == 0
    )


def test_import_cleans_up_existing_zero_hand_players(tmp_path: Path) -> None:
    snapshot_path = tmp_path / '20260618T010203Z.json'
    snapshot_path.write_text(
        json.dumps(
            {
                'id': '20260618T010203Z',
                'label': 'test',
                'source': 'test',
                'generatedAt': '2026-06-18T01:02:03+00:00',
                'players': [
                    {
                        'uid': 101,
                        'name': 'Active',
                        'names': ['Active'],
                        'leaderboardEntries': [],
                        'games': {'10010101': {'gameType': 10010101, 'hands': 500}},
                        'sngRecordCount': 0,
                        'fetchedAt': '2026-06-18T01:03:00+00:00',
                    }
                ],
            }
        ),
        encoding='utf-8',
    )
    sql = player_import_sql(snapshot_path, datetime(2026, 6, 18, tzinfo=UTC))

    connection = connect_with_schema()
    connection.executescript(
        """
        INSERT INTO players (uid, player_json, source, fetched_at)
        VALUES (999, '{"games":{}}', 'lookup', '2026-01-01T00:00:00Z');
        INSERT INTO player_aliases (alias, uid, source, observed_at)
        VALUES ('ghost', 999, 'lookup', '2026-01-01T00:00:00Z');
        """
    )
    connection.executescript(sql)

    assert scalar(connection, 'SELECT COUNT(*) FROM players WHERE uid = 999') == 0
    assert (
        scalar(connection, "SELECT COUNT(*) FROM player_aliases WHERE alias = 'ghost'")
        == 0
    )
    assert scalar(connection, 'SELECT uid FROM players WHERE uid = 101') == 101
