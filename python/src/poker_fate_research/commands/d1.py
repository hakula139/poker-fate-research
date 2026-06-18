from __future__ import annotations

import argparse
import os
from datetime import UTC, datetime
from pathlib import Path
from typing import cast

from poker_fate_research.client import PokerFateClient
from poker_fate_research.constants import BASE_HOST, DEVICE_TOKEN_ENV
from poker_fate_research.d1_export import (
    player_cache_import_sql,
    write_snapshot_import_sql,
)
from poker_fate_research.player_lookup import lookup_players


def register(subparsers: argparse._SubParsersAction) -> None:
    parser = subparsers.add_parser(
        'd1-import-sql',
        help='Build D1 import SQL for a player snapshot',
        description='Build D1 import SQL from one player snapshot JSON or JSONL file.',
    )
    parser.add_argument('snapshot', type=Path)
    parser.add_argument('--output', required=True, type=Path)
    parser.set_defaults(handler=run_snapshot_import)

    lookup_parser = subparsers.add_parser(
        'd1-player-cache-sql',
        help='Build D1 cache SQL for player lookups',
        description='Build D1 cache SQL from official player lookup results.',
    )
    lookup_parser.add_argument('query')
    lookup_parser.add_argument('--base-host', default=BASE_HOST)
    lookup_parser.add_argument('--limit', type=int, default=5)
    lookup_parser.add_argument('--sleep-seconds', type=float, default=0.25)
    lookup_parser.add_argument('--output', required=True, type=Path)
    lookup_parser.set_defaults(handler=run_player_cache)


def run_snapshot_import(args: argparse.Namespace) -> int:
    write_snapshot_import_sql(cast(Path, args.snapshot), cast(Path, args.output))
    return 0


def run_player_cache(args: argparse.Namespace) -> int:
    device_token = os.environ.get(DEVICE_TOKEN_ENV)
    if not device_token:
        raise SystemExit(
            f'Set {DEVICE_TOKEN_ENV} in an ignored local environment file first.'
        )

    client = PokerFateClient(cast(str, args.base_host))
    client.login_guest(device_token)
    players = lookup_players(
        client,
        cast(str, args.query),
        limit=cast(int, args.limit),
        sleep_seconds=cast(float, args.sleep_seconds),
    )
    output = cast(Path, args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        player_cache_import_sql(players, datetime.now(UTC)),
        encoding='utf-8',
    )
    return 0
