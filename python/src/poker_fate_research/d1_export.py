from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta
from pathlib import Path

from poker_fate_research.json_types import (
    JsonObject,
    as_int,
    as_list,
    as_str,
    expect_object,
    json_object_list,
    parse_json,
)
from poker_fate_research.player_normalization import build_snapshot
from poker_fate_research.time import iso_format


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


def player_aliases(player: JsonObject) -> list[str]:
    candidates = [player.get('name'), *as_list(player.get('names'))]
    aliases = {name for name in candidates if isinstance(name, str) and name}
    return sorted(aliases)


def load_snapshot(snapshot_path: Path) -> JsonObject:
    if snapshot_path.suffix == '.json':
        parsed = parse_json(snapshot_path.read_text(encoding='utf-8'))
        return expect_object(parsed, 'Snapshot JSON must be an object')
    return build_snapshot(snapshot_path)


def cache_player_statements(
    player: JsonObject,
    imported_at: datetime,
    source: str,
) -> list[str]:
    uid = as_int(player.get('uid'))
    if uid <= 0:
        raise ValueError('Cached player entries must have a positive integer uid')

    expires_at = iso_format(imported_at + timedelta(days=30))
    fetched_at = as_str(player.get('fetchedAt')) or iso_format(imported_at)
    statements = [
        insert_statement(
            'player_cache',
            {
                'uid': uid,
                'player_json': json_text(player),
                'source': source,
                'fetched_at': fetched_at,
                'expires_at': expires_at,
            },
        )
    ]
    for alias in player_aliases(player):
        statements.append(
            insert_statement(
                'player_aliases',
                {
                    'alias': alias,
                    'uid': uid,
                    'source': source,
                    'observed_at': iso_format(imported_at),
                },
            )
        )
    return statements


def snapshot_import_sql(snapshot_path: Path, imported_at: datetime) -> str:
    snapshot = load_snapshot(snapshot_path)
    snapshot_id = as_str(snapshot.get('id'))
    players = json_object_list(snapshot.get('players'))

    lines = [
        insert_statement(
            'snapshots',
            {
                'id': snapshot_id,
                'label': as_str(snapshot.get('label')),
                'source': as_str(snapshot.get('source')),
                'generated_at': as_str(snapshot.get('generatedAt')),
                'fetched_at': iso_format(imported_at),
                'player_count': len(players),
                'leaderboard_row_count': sum(
                    len(as_list(player.get('leaderboardEntries'))) for player in players
                ),
            },
        ),
        f'DELETE FROM snapshot_players WHERE snapshot_id = {sql_literal(snapshot_id)};',
    ]

    for player in players:
        uid = as_int(player.get('uid'))
        if uid <= 0:
            raise ValueError('Snapshot player entries must have a positive integer uid')

        leaderboard_entries = as_list(player.get('leaderboardEntries'))
        fetched_at = as_str(player.get('fetchedAt')) or iso_format(imported_at)
        player_payload: JsonObject = {
            **player,
            'leaderboardEntries': leaderboard_entries,
        }
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
                *cache_player_statements(player_payload, imported_at, 'snapshot'),
            ]
        )

    retained = '(SELECT id FROM snapshots ORDER BY generated_at DESC LIMIT 30)'
    expired_cache = (
        'SELECT uid FROM player_cache '
        f'WHERE expires_at < {sql_literal(iso_format(imported_at))} '
        'AND uid NOT IN (SELECT uid FROM snapshot_players)'
    )
    lines.extend(
        [
            f'DELETE FROM snapshot_players WHERE snapshot_id NOT IN {retained};',
            f'DELETE FROM snapshots WHERE id NOT IN {retained};',
            f'DELETE FROM player_aliases WHERE uid IN ({expired_cache});',
            f'DELETE FROM player_cache WHERE uid IN ({expired_cache});',
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
