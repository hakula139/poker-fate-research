from __future__ import annotations

import json
from typing import Any

from poker_fate_research.client import PokerFateClient
from poker_fate_research.collector import (
    fetch_player_snapshot,
    require_success_response,
)
from poker_fate_research.json_types import (
    JsonObject,
    json_int,
    json_object_list,
    json_str,
)
from poker_fate_research.models import PlayerSeed
from poker_fate_research.web_data import normalized_player


def lookup_request(query: str) -> JsonObject:
    body: JsonObject = {'nickname': query}
    if query.isdecimal():
        body['friend_uid'] = int(query)
    return body


def lookup_player_seeds(client: PokerFateClient, query: str) -> list[PlayerSeed]:
    request_body = lookup_request(query)
    response = client.post_json('/friend/searchList', request_body)
    require_success_response('/friend/searchList', request_body, response)

    seeds: list[PlayerSeed] = []
    for item in json_object_list(response.get('list')):
        uid = json_int(item, 'uid')
        if uid <= 0:
            continue
        seed = PlayerSeed.from_uid(uid)
        nickname = json_str(item, 'nickname')
        if nickname:
            seed.names.add(nickname)
        seeds.append(seed)
    return seeds


def lookup_players(
    client: PokerFateClient,
    query: str,
    *,
    limit: int,
    sleep_seconds: float,
) -> list[dict[str, Any]]:
    players: list[dict[str, Any]] = []
    for seed in lookup_player_seeds(client, query)[:limit]:
        snapshot = fetch_player_snapshot(client, seed, sleep_seconds)
        players.append(
            normalized_player(
                json.dumps(
                    snapshot.to_json(), ensure_ascii=False, separators=(',', ':')
                )
            )
        )
    return players
