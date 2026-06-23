from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path

from poker_fate_research.json_types import (
    JsonObject,
    as_int,
    as_list,
    as_object,
    as_str,
    expect_object,
    json_object_list,
    parse_json,
)
from poker_fate_research.player_normalization import build_snapshot
from poker_fate_research.time import iso_format


HOLDEM_GAME_TYPE = '10010101'

EMPTY_PLAYER_PREDICATE = (
    'COALESCE(json_extract(player_json, '
    f'\'$.games."{HOLDEM_GAME_TYPE}".hands\'), 0) = 0'
)


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


def holdem_hands(player: JsonObject) -> int:
    games = as_object(player.get('games'))
    return as_int(as_object(games.get(HOLDEM_GAME_TYPE)).get('hands'))


def load_players(snapshot_path: Path) -> list[JsonObject]:
    if snapshot_path.suffix == '.json':
        parsed = parse_json(snapshot_path.read_text(encoding='utf-8'))
        snapshot = expect_object(parsed, 'Snapshot JSON must be an object')
    else:
        snapshot = build_snapshot(snapshot_path)
    return json_object_list(snapshot.get('players'))


def player_import_sql(
    snapshot_path: Path,
    imported_at: datetime,
    source: str = 'leaderboard',
) -> str:
    lines: list[str] = []
    for player in load_players(snapshot_path):
        uid = as_int(player.get('uid'))
        if uid <= 0:
            raise ValueError('Player entries must have a positive integer uid')
        if holdem_hands(player) <= 0:
            continue

        fetched_at = as_str(player.get('fetchedAt')) or iso_format(imported_at)
        lines.append(
            insert_statement(
                'players',
                {
                    'uid': uid,
                    'player_json': json_text(player),
                    'source': source,
                    'fetched_at': fetched_at,
                },
            )
        )
        for alias in player_aliases(player):
            lines.append(
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

    lines.extend(
        [
            'DELETE FROM player_aliases WHERE uid IN '
            f'(SELECT uid FROM players WHERE {EMPTY_PLAYER_PREDICATE});',
            f'DELETE FROM players WHERE {EMPTY_PLAYER_PREDICATE};',
            '',
        ]
    )
    return '\n'.join(lines)


def write_player_import_sql(snapshot_path: Path, output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        player_import_sql(snapshot_path, datetime.now(UTC)),
        encoding='utf-8',
    )
