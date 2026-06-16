from __future__ import annotations

from typing import cast

import pytest

from poker_fate_research.client import PokerFateClient
from poker_fate_research.collector import fetch_player_snapshot, iter_leaderboard_pages
from poker_fate_research.models import PlayerSeed


class StubClient:
    def __init__(self, responses: list[dict[str, object]]) -> None:
        self.responses = responses
        self.requests: list[tuple[str, dict[str, object]]] = []

    def post_json(
        self, path: str, body: dict[str, object] | None, timeout: float = 20
    ) -> dict[str, object]:
        del timeout
        self.requests.append((path, body or {}))
        return self.responses.pop(0)


def client(responses: list[dict[str, object]]) -> PokerFateClient:
    return cast(PokerFateClient, StubClient(responses))


def test_leaderboard_pages_reject_api_error() -> None:
    pages = iter_leaderboard_pages(
        client([{'code': -2, 'message': 'expired'}]),
        page_size=50,
        sleep_seconds=0,
    )

    with pytest.raises(RuntimeError, match='/activity/rankingList failed with code -2'):
        next(iter(pages))


def test_leaderboard_pages_reject_invalid_list_shape() -> None:
    pages = iter_leaderboard_pages(
        client([{'code': 0, 'list': {}}]),
        page_size=50,
        sleep_seconds=0,
    )

    with pytest.raises(RuntimeError, match="non-list field 'list'"):
        next(iter(pages))


def test_player_snapshot_rejects_missing_game_data_object() -> None:
    seed = PlayerSeed.from_uid(1001)

    with pytest.raises(RuntimeError, match="without object field 'data'"):
        fetch_player_snapshot(
            client([{'code': 0}]),
            seed,
            sleep_seconds=0,
        )


def test_player_snapshot_rejects_invalid_sng_list_shape() -> None:
    seed = PlayerSeed.from_uid(1001)
    responses = [{'code': 0, 'data': {}} for _ in range(4)] + [{'code': 0, 'list': {}}]

    with pytest.raises(RuntimeError, match="non-list field 'list'"):
        fetch_player_snapshot(
            client(responses),
            seed,
            sleep_seconds=0,
        )


def test_player_snapshot_keeps_successful_responses() -> None:
    seed = PlayerSeed.from_uid(1001)
    seed.names.add('Player One')
    responses = [{'code': 0, 'data': {'play_times': 1000}} for _ in range(4)] + [
        {'code': 0, 'list': []}
    ]

    snapshot = fetch_player_snapshot(client(responses), seed, sleep_seconds=0)

    assert snapshot.uid == 1001
    assert snapshot.names == ['Player One']
    assert len(snapshot.game_data) == 4
    assert snapshot.sng_record == {'code': 0, 'list': []}
