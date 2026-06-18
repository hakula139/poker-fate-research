from __future__ import annotations

from typing import cast

import pytest

from poker_fate_research.client import PokerFateClient
from poker_fate_research.player_lookup import lookup_player_seeds, lookup_request


class StubClient:
    def __init__(self, response: dict[str, object]) -> None:
        self.response = response
        self.requests: list[tuple[str, dict[str, object] | None]] = []

    def post_json(
        self, path: str, body: dict[str, object] | None, timeout: float = 20
    ) -> dict[str, object]:
        del timeout
        self.requests.append((path, body))
        return self.response


def client(response: dict[str, object]) -> PokerFateClient:
    return cast(PokerFateClient, StubClient(response))


def test_lookup_request_includes_numeric_uid() -> None:
    assert lookup_request('10410931') == {
        'friend_uid': 10410931,
        'nickname': '10410931',
    }


def test_lookup_request_uses_nickname_for_text() -> None:
    assert lookup_request('Hakula') == {'nickname': 'Hakula'}


def test_lookup_player_seeds_keeps_nickname() -> None:
    seeds = lookup_player_seeds(
        client({'code': 0, 'list': [{'uid': 10410931, 'nickname': 'Hakula'}]}),
        'Hakula',
    )

    assert len(seeds) == 1
    assert seeds[0].uid == 10410931
    assert seeds[0].names == {'Hakula'}


def test_lookup_player_seeds_rejects_api_error() -> None:
    with pytest.raises(RuntimeError, match='/friend/searchList failed with code -2'):
        lookup_player_seeds(client({'code': -2}), 'Hakula')
