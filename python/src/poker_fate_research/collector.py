from __future__ import annotations

import json
import time
from collections.abc import Iterable
from pathlib import Path
from typing import TextIO

from poker_fate_research.client import PokerFateClient
from poker_fate_research.constants import GAME_TYPES, LEADERBOARDS
from poker_fate_research.json_types import JsonObject, json_int
from poker_fate_research.models import (
    CollectorConfig,
    GameDataSnapshot,
    LeaderboardIndex,
    LeaderboardPage,
    LeaderboardSummary,
    OutputPaths,
    PlayerSeed,
    PlayerSnapshot,
    Session,
    SnapshotMetadata,
)
from poker_fate_research.time import iso_now


def require_success_response(
    path: str, request: JsonObject, response: JsonObject
) -> None:
    code = response.get('code')
    if code != 0:
        raise RuntimeError(
            f'{path} failed with code {code!r} for request '
            f'{json.dumps(request, ensure_ascii=False, separators=(",", ":"))}'
        )


def require_object_field(path: str, response: JsonObject, key: str) -> None:
    if not isinstance(response.get(key), dict):
        raise RuntimeError(f'{path} returned code 0 without object field {key!r}')


def require_list_or_missing_field(path: str, response: JsonObject, key: str) -> None:
    value = response.get(key)
    if value is not None and not isinstance(value, list):
        raise RuntimeError(f'{path} returned code 0 with non-list field {key!r}')


def iter_leaderboard_pages(
    client: PokerFateClient,
    page_size: int,
    sleep_seconds: float,
) -> Iterable[LeaderboardPage]:
    for leaderboard_id, leaderboard_name in LEADERBOARDS.items():
        for last_week in (False, True):
            skip = 0
            while True:
                request_body: JsonObject = {
                    'id': leaderboard_id,
                    'skip': skip,
                    'size': page_size,
                    'last_week': last_week,
                    'immediately': True,
                }
                response = client.post_json('/activity/rankingList', request_body)
                require_success_response(
                    '/activity/rankingList', request_body, response
                )
                require_list_or_missing_field('/activity/rankingList', response, 'list')
                page = LeaderboardPage.from_api(
                    leaderboard_id=leaderboard_id,
                    leaderboard_name=leaderboard_name,
                    period='last_week' if last_week else 'current_week',
                    request=request_body,
                    response=response,
                )
                yield page
                if not page.rows:
                    break
                skip += len(page.rows)
                time.sleep(sleep_seconds)


def fetch_player_snapshot(
    client: PokerFateClient,
    seed: PlayerSeed,
    sleep_seconds: float,
) -> PlayerSnapshot:
    game_data: list[GameDataSnapshot] = []
    for game_type, label in GAME_TYPES.items():
        request_body: JsonObject = {
            'game_type': game_type,
            'player_uid': seed.uid,
            'lang': 'en',
        }
        response = client.post_json('/player/gameData', request_body)
        require_success_response('/player/gameData', request_body, response)
        require_object_field('/player/gameData', response, 'data')
        game_data.append(
            GameDataSnapshot(
                game_type=game_type,
                label=label,
                request=request_body,
                response=response,
            )
        )
        time.sleep(sleep_seconds)

    sng_request: JsonObject = {'player_uid': seed.uid}
    sng_record = client.post_json('/player/sngRecord', sng_request)
    require_success_response('/player/sngRecord', sng_request, sng_record)
    require_list_or_missing_field('/player/sngRecord', sng_record, 'list')

    return PlayerSnapshot(
        uid=seed.uid,
        names=sorted(seed.names),
        leaderboard_entries=seed.leaderboard_entries,
        game_data=game_data,
        sng_record=sng_record,
        fetched_at=iso_now(),
    )


def write_jsonl_record(handle: TextIO, record: JsonObject) -> None:
    print(json.dumps(record, ensure_ascii=False, separators=(',', ':')), file=handle)


def collect_leaderboard_index(
    client: PokerFateClient,
    config: CollectorConfig,
    path: Path,
) -> LeaderboardIndex:
    players: dict[int, PlayerSeed] = {}
    summaries: dict[tuple[int, str], LeaderboardSummary] = {}
    page_count = 0
    row_count = 0

    with path.open('w', encoding='utf-8') as handle:
        for page in iter_leaderboard_pages(
            client, config.page_size, config.sleep_seconds
        ):
            write_jsonl_record(handle, page.to_json())
            page_count += 1
            row_count += len(page.rows)

            key = (page.leaderboard_id, page.period)
            summary = summaries.setdefault(key, LeaderboardSummary.from_page(page))
            summary.observe(page)

            for row in page.rows:
                uid = json_int(row, 'uid')
                player = players.setdefault(uid, PlayerSeed.from_uid(uid))
                player.add_entry(page, row)

    return LeaderboardIndex(
        players=players,
        summaries=list(summaries.values()),
        page_count=page_count,
        row_count=row_count,
    )


def collect_player_snapshots(
    client: PokerFateClient,
    config: CollectorConfig,
    players: Iterable[PlayerSeed],
    path: Path,
) -> int:
    count = 0
    with path.open('w', encoding='utf-8') as handle:
        for count, player in enumerate(players, start=1):
            record = fetch_player_snapshot(client, player, config.sleep_seconds)
            write_jsonl_record(handle, record.to_json())
            print(json.dumps({'players_fetched': count, 'uid': player.uid}), flush=True)
            time.sleep(config.sleep_seconds)
    return count


def collect_snapshot(
    config: CollectorConfig,
    session: Session,
    paths: OutputPaths,
    fetched_at: str,
) -> SnapshotMetadata:
    client = PokerFateClient(config.base_host, authorization=session.authorization)
    index = collect_leaderboard_index(client, config, paths.leaderboard_pages)

    player_items = sorted(index.players.values(), key=lambda item: item.uid)
    if config.max_players is not None:
        player_items = player_items[: config.max_players]

    player_count = collect_player_snapshots(client, config, player_items, paths.players)
    return SnapshotMetadata(
        fetched_at=fetched_at,
        base_host=config.base_host,
        guest_uid=session.uid,
        summaries=index.summaries,
        leaderboard_pages_path=paths.leaderboard_pages,
        players_path=paths.players,
        unique_players_discovered=len(index.players),
        players_fetched=player_count,
        leaderboard_rows=index.row_count,
        leaderboard_pages=index.page_count,
        max_players=config.max_players,
    )
