from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

from poker_fate_research.web_data import build_snapshot


def sql_literal(value: object) -> str:
    if value is None:
        return 'NULL'
    if isinstance(value, bool):
        return '1' if value else '0'
    if isinstance(value, int):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def json_text(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'), sort_keys=True)


def insert_statement(table: str, values: dict[str, object]) -> str:
    columns = ', '.join(values)
    literals = ', '.join(sql_literal(value) for value in values.values())
    updates = ', '.join(f'{column} = excluded.{column}' for column in values if column)
    return (
        f'INSERT INTO {table} ({columns}) VALUES ({literals}) '
        f'ON CONFLICT DO UPDATE SET {updates};'
    )


def player_aliases(player: dict[str, Any]) -> list[str]:
    names = player.get('names')
    if not isinstance(names, list):
        names = []
    aliases = {
        name for name in [player.get('name'), *names] if isinstance(name, str) and name
    }
    return sorted(aliases)


def snapshot_import_sql(snapshot_path: Path, imported_at: datetime) -> str:
    snapshot = build_snapshot(snapshot_path)
    snapshot_id = str(snapshot['id'])
    generated_at = str(snapshot['generatedAt'])
    expires_at = (imported_at + timedelta(days=30)).isoformat(timespec='seconds')
    players = snapshot['players']
    if not isinstance(players, list):
        raise ValueError('Snapshot players must be a list')

    lines = [
        'BEGIN TRANSACTION;',
        insert_statement(
            'snapshots',
            {
                'id': snapshot_id,
                'label': snapshot['label'],
                'source': snapshot['source'],
                'generated_at': generated_at,
                'fetched_at': imported_at.isoformat(timespec='seconds'),
                'player_count': len(players),
                'leaderboard_row_count': sum(
                    len(player.get('leaderboardEntries', []))
                    for player in players
                    if isinstance(player, dict)
                ),
            },
        ),
        f'DELETE FROM snapshot_players WHERE snapshot_id = {sql_literal(snapshot_id)};',
    ]

    for player in players:
        if not isinstance(player, dict):
            raise ValueError('Snapshot player entries must be objects')
        uid = player.get('uid')
        if not isinstance(uid, int):
            raise ValueError('Snapshot player entries must have integer uid')

        leaderboard_entries = player.get('leaderboardEntries', [])
        fetched_at = str(
            player.get('fetchedAt') or imported_at.isoformat(timespec='seconds')
        )
        player_payload = {**player, 'leaderboardEntries': leaderboard_entries}
        lines.extend(
            [
                insert_statement(
                    'snapshot_players',
                    {
                        'snapshot_id': snapshot_id,
                        'uid': uid,
                        'player_json': json_text(player_payload),
                        'leaderboard_entries_json': json_text(leaderboard_entries),
                        'fetched_at': fetched_at,
                    },
                ),
                insert_statement(
                    'player_cache',
                    {
                        'uid': uid,
                        'player_json': json_text(player_payload),
                        'source': 'snapshot',
                        'fetched_at': fetched_at,
                        'expires_at': expires_at,
                    },
                ),
            ]
        )

        for alias in player_aliases(player):
            lines.append(
                insert_statement(
                    'player_aliases',
                    {
                        'alias': alias,
                        'uid': uid,
                        'source': 'snapshot',
                        'observed_at': imported_at.isoformat(timespec='seconds'),
                    },
                )
            )

    lines.extend(
        [
            (
                'DELETE FROM snapshots WHERE id NOT IN '
                '(SELECT id FROM snapshots ORDER BY generated_at DESC LIMIT 30);'
            ),
            (
                'DELETE FROM player_cache WHERE expires_at < '
                f'{sql_literal(imported_at.isoformat(timespec="seconds"))} '
                'AND uid NOT IN (SELECT uid FROM snapshot_players);'
            ),
            'COMMIT;',
            '',
        ]
    )
    return '\n'.join(lines)


def write_snapshot_import_sql(snapshot_path: Path, output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        snapshot_import_sql(snapshot_path, datetime.now(UTC)),
        encoding='utf-8',
    )
