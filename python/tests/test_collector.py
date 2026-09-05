from __future__ import annotations

import pytest

from poker_fate_research.client import PostJsonClient
from poker_fate_research.collector import fetch_player_snapshot, iter_leaderboard_pages
from poker_fate_research.json_types import JsonObject
from poker_fate_research.models import PlayerSeed


class StubClient:
    def __init__(self, responses: list[JsonObject]) -> None:
        self.responses: list[JsonObject] = responses
        self.requests: list[tuple[str, JsonObject]] = []

    def post_json(
        self, path: str, body: JsonObject | None, timeout: float = 20
    ) -> JsonObject:
        del timeout
        self.requests.append((path, body or {}))
        return self.responses.pop(0)


def client(responses: list[JsonObject]) -> PostJsonClient:
    return StubClient(responses)


def test_leaderboard_pages_reject_api_error() -> None:
    pages = iter_leaderboard_pages(
        client([{'code': -2, 'message': 'expired'}]),
        page_size=50,
        sleep_seconds=0,
    )

    with pytest.raises(RuntimeError, match='/activity/rankingList failed with code -2'):
        next(iter(pages))


@pytest.mark.parametrize('code', [{'authorization': 'private-authorization'}, False])
def test_leaderboard_pages_reject_malformed_code_without_exposing_it(
    code: object,
) -> None:
    pages = iter_leaderboard_pages(
        client([{'code': code}]),
        page_size=50,
        sleep_seconds=0,
    )

    with pytest.raises(RuntimeError) as error:
        next(iter(pages))

    assert str(error.value) == '/activity/rankingList returned an invalid response code'


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
    game_response: JsonObject = {'code': 0, 'data': {}}
    responses = [game_response for _ in range(4)] + [{'code': 0, 'list': {}}]

    with pytest.raises(RuntimeError, match="non-list field 'list'"):
        fetch_player_snapshot(
            client(responses),
            seed,
            sleep_seconds=0,
        )


def test_player_snapshot_keeps_successful_responses() -> None:
    seed = PlayerSeed.from_uid(1001)
    seed.names.add('Player One')
    game_response: JsonObject = {'code': 0, 'data': {'play_times': 1000}}
    responses = [game_response for _ in range(4)] + [{'code': 0, 'list': []}]

    snapshot = fetch_player_snapshot(client(responses), seed, sleep_seconds=0)

    assert snapshot.uid == 1001
    assert snapshot.names == ['Player One']
    assert len(snapshot.game_data) == 4
    assert snapshot.sng_record == {'code': 0, 'list': []}
