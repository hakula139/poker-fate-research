from __future__ import annotations

import re
from pathlib import Path

from poker_fate_research.json_types import (
    JsonObject,
    as_int,
    as_list,
    as_object,
    as_str,
    parse_json,
)
from poker_fate_research.time import iso_now


SNAPSHOT_RE = re.compile(r'poker-fate-players-(?P<stamp>.+)\.jsonl$')


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


def normalized_game(game_type: str, value: object) -> JsonObject:
    item = as_object(value)
    data = as_object(as_object(item.get('response')).get('data'))
    return {
        'gameType': int(game_type),
        'label': as_str(item.get('label')),
        'score': as_int(data.get('champion_points')) or as_int(data.get('fire_power')),
        'hands': as_int(data.get('play_times')),
        'winHands': as_int(data.get('win_play_times')),
        'rounds': as_int(data.get('round')),
        'winRounds': as_int(data.get('win_round')),
        'tourRounds': as_int(data.get('tour_round')),
        'tourWinRounds': as_int(data.get('tour_win_round')),
        'tourProfit': as_int(data.get('tour_profit')),
        'tourMaxProfit': as_int(data.get('tour_max_profit')),
        'profit': as_int(data.get('profit')),
        'maxProfit': as_int(data.get('max_profit')),
        'vpip': as_int(data.get('pool_entry_rate')),
        'pfr': as_int(data.get('add_before_flipping_rate')),
        'threeBet': as_int(data.get('three_bet_rate')),
        'wtsd': as_int(data.get('show_hand_rate')),
        'afq': as_int(data.get('active_rate')),
        'cbet': as_int(data.get('c_bete_rate')),
    }


def normalized_entry(value: object) -> JsonObject:
    entry = as_object(value)
    return {
        'leaderboardId': as_int(entry.get('leaderboard_id')),
        'leaderboardName': as_str(entry.get('leaderboard_name')),
        'period': as_str(entry.get('period')),
        'rank': entry.get('rank'),
        'value': entry.get('value'),
        'gameType': entry.get('game_type'),
    }


def normalized_player(line: str) -> JsonObject:
    record = as_object(parse_json(line))
    names = [str(name) for name in as_list(record.get('names')) if name]
    games = {
        game_type: normalized_game(game_type, value)
        for game_type, value in as_object(record.get('game_data')).items()
    }
    return {
        'uid': as_int(record.get('uid')),
        'name': names[0] if names else str(as_int(record.get('uid'))),
        'names': names,
        'leaderboardEntries': [
            normalized_entry(entry)
            for entry in as_list(record.get('leaderboard_entries'))
        ],
        'games': games,
        'sngRecordCount': len(as_list(as_object(record.get('sng_record')).get('list'))),
        'fetchedAt': as_str(record.get('fetched_at')),
    }


def build_snapshot(path: Path) -> JsonObject:
    players: list[JsonObject] = []
    with path.open(encoding='utf-8') as handle:
        for line in handle:
            if line.strip():
                players.append(normalized_player(line))

    stamp = snapshot_id(path)
    players.sort(key=lambda player: as_int(player['uid']))
    return {
        'id': stamp,
        'label': display_stamp(stamp),
        'source': str(path),
        'generatedAt': iso_now(),
        'players': players,
    }
