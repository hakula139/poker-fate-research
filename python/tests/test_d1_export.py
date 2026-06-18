from __future__ import annotations

import json
import sqlite3
from datetime import UTC, datetime
from pathlib import Path

from poker_fate_research.d1_export import snapshot_import_sql
from poker_fate_research.paths import find_repo_root


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

    sql = snapshot_import_sql(
        snapshot_path,
        datetime(2026, 6, 18, 2, 0, tzinfo=UTC),
    )

    connection = sqlite3.connect(':memory:')
    migration = find_repo_root(Path.cwd()) / 'web/migrations/0001_player_data.sql'
    connection.executescript(migration.read_text(encoding='utf-8'))
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
