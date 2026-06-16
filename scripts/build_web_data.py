from __future__ import annotations

import argparse
import json
import re
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


DEFAULT_INPUT_DIR = Path('data/player-snapshots')
DEFAULT_OUTPUT_DIR = Path('web/public/data')
SNAPSHOT_RE = re.compile(r'poker-fate-players-(?P<stamp>.+)\.jsonl$')


def json_object(value: object) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def int_value(value: object) -> int:
    return value if isinstance(value, int) else 0


def str_value(value: object) -> str:
    return value if isinstance(value, str) else ''


def list_value(value: object) -> list[Any]:
    return value if isinstance(value, list) else []


def snapshot_id(path: Path) -> str:
    match = SNAPSHOT_RE.match(path.name)
    if not match:
        raise ValueError(f'{path} is not a player snapshot JSONL file')
    return match.group('stamp')


def display_stamp(stamp: str) -> str:
    if len(stamp) == 16 and stamp.endswith('Z') and 'T' in stamp:
        return (
            f'{stamp[0:4]}-{stamp[4:6]}-{stamp[6:8]} {stamp[9:11]}:{stamp[11:13]} UTC'
        )
    return stamp


def normalized_game(game_type: str, value: object) -> dict[str, Any]:
    item = json_object(value)
    data = json_object(json_object(item.get('response')).get('data'))
    return {
        'gameType': int(game_type),
        'label': str_value(item.get('label')),
        'score': int_value(data.get('champion_points'))
        or int_value(data.get('fire_power')),
        'hands': int_value(data.get('play_times')),
        'winHands': int_value(data.get('win_play_times')),
        'rounds': int_value(data.get('round')),
        'winRounds': int_value(data.get('win_round')),
        'tourRounds': int_value(data.get('tour_round')),
        'tourWinRounds': int_value(data.get('tour_win_round')),
        'tourProfit': int_value(data.get('tour_profit')),
        'tourMaxProfit': int_value(data.get('tour_max_profit')),
        'profit': int_value(data.get('profit')),
        'maxProfit': int_value(data.get('max_profit')),
        'vpip': int_value(data.get('pool_entry_rate')),
        'pfr': int_value(data.get('add_before_flipping_rate')),
        'threeBet': int_value(data.get('three_bet_rate')),
        'wtsd': int_value(data.get('show_hand_rate')),
        'afq': int_value(data.get('active_rate')),
        'cbet': int_value(data.get('c_bete_rate')),
    }


def normalized_entry(value: object) -> dict[str, Any]:
    entry = json_object(value)
    return {
        'leaderboardId': int_value(entry.get('leaderboard_id')),
        'leaderboardName': str_value(entry.get('leaderboard_name')),
        'period': str_value(entry.get('period')),
        'rank': entry.get('rank'),
        'value': entry.get('value'),
        'gameType': entry.get('game_type'),
    }


def normalized_player(line: str) -> dict[str, Any]:
    record = json_object(json.loads(line))
    names = [str(name) for name in list_value(record.get('names')) if name]
    games = {
        game_type: normalized_game(game_type, value)
        for game_type, value in json_object(record.get('game_data')).items()
    }
    return {
        'uid': int_value(record.get('uid')),
        'name': names[0] if names else str(int_value(record.get('uid'))),
        'names': names,
        'leaderboardEntries': [
            normalized_entry(entry)
            for entry in list_value(record.get('leaderboard_entries'))
        ],
        'games': games,
        'sngRecordCount': len(
            list_value(json_object(record.get('sng_record')).get('list'))
        ),
        'fetchedAt': str_value(record.get('fetched_at')),
    }


def build_snapshot(path: Path) -> dict[str, Any]:
    players: list[dict[str, Any]] = []
    with path.open(encoding='utf-8') as handle:
        for line in handle:
            if line.strip():
                players.append(normalized_player(line))

    stamp = snapshot_id(path)
    players.sort(key=lambda player: player['uid'])
    return {
        'id': stamp,
        'label': display_stamp(stamp),
        'source': str(path),
        'generatedAt': datetime.now(UTC).isoformat(timespec='seconds'),
        'players': players,
    }


def iter_input_files(input_dir: Path, requested: list[Path]) -> list[Path]:
    if requested:
        return sorted(requested)
    return sorted(input_dir.glob('poker-fate-players-*.jsonl'))


def run(input_dir: Path, output_dir: Path, requested: list[Path]) -> None:
    files = iter_input_files(input_dir, requested)
    if not files:
        raise SystemExit(f'No player snapshots found under {input_dir}')

    snapshot_dir = output_dir / 'snapshots'
    snapshot_dir.mkdir(parents=True, exist_ok=True)

    index_items: list[dict[str, Any]] = []
    for path in files:
        snapshot = build_snapshot(path)
        output_path = snapshot_dir / f'{snapshot["id"]}.json'
        output_path.write_text(
            json.dumps(snapshot, ensure_ascii=False, indent=2) + '\n',
            encoding='utf-8',
        )
        index_items.append(
            {
                'id': snapshot['id'],
                'label': snapshot['label'],
                'playerCount': len(snapshot['players']),
                'source': snapshot['source'],
                'path': f'data/snapshots/{snapshot["id"]}.json',
            }
        )

    index = {
        'generatedAt': datetime.now(UTC).isoformat(timespec='seconds'),
        'snapshots': index_items,
    }
    (output_dir / 'snapshots.json').write_text(
        json.dumps(index, ensure_ascii=False, indent=2) + '\n',
        encoding='utf-8',
    )


def main() -> int:
    parser = argparse.ArgumentParser(
        description='Build static frontend data from player snapshot JSONL files.'
    )
    parser.add_argument('--input-dir', type=Path, default=DEFAULT_INPUT_DIR)
    parser.add_argument('--output-dir', type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument('snapshots', nargs='*', type=Path)
    args = parser.parse_args()
    run(args.input_dir, args.output_dir, args.snapshots)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
