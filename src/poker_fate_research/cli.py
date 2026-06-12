from __future__ import annotations

import argparse
import json
import os
from collections.abc import Sequence
from pathlib import Path
from typing import cast

from poker_fate_research.client import PokerFateClient
from poker_fate_research.collector import collect_snapshot
from poker_fate_research.constants import BASE_HOST, DEVICE_TOKEN_ENV
from poker_fate_research.models import CollectorConfig, OutputPaths
from poker_fate_research.time import iso_now


def parse_args(argv: Sequence[str] | None = None) -> CollectorConfig:
    parser = argparse.ArgumentParser(
        description='Collect Poker Fate leaderboard player stats.'
    )
    parser.add_argument('--base-host', default=BASE_HOST)
    parser.add_argument(
        '--output-dir', type=Path, default=Path('data/player-snapshots')
    )
    parser.add_argument('--page-size', type=int, default=50)
    parser.add_argument('--sleep-seconds', type=float, default=0.25)
    parser.add_argument('--max-players', type=int, default=None)
    args = parser.parse_args(argv)
    return CollectorConfig(
        base_host=cast(str, args.base_host),
        output_dir=cast(Path, args.output_dir),
        page_size=cast(int, args.page_size),
        sleep_seconds=cast(float, args.sleep_seconds),
        max_players=cast(int | None, args.max_players),
    )


def main(argv: Sequence[str] | None = None) -> None:
    config = parse_args(argv)
    device_token = os.environ.get(DEVICE_TOKEN_ENV)
    if not device_token:
        raise SystemExit(
            f'Set {DEVICE_TOKEN_ENV} in an ignored local environment file first.'
        )

    fetched_at = iso_now()
    config.output_dir.mkdir(parents=True, exist_ok=True)
    paths = OutputPaths.from_timestamp(config.output_dir, fetched_at)

    session = PokerFateClient(config.base_host).login_guest(device_token)
    print(
        json.dumps(
            {
                'guest': {
                    'uid': session.uid,
                    'is_guest': session.is_guest,
                    'is_reg': session.is_reg,
                }
            }
        )
    )

    metadata = collect_snapshot(config, session, paths, fetched_at)
    with paths.metadata.open('w', encoding='utf-8') as handle:
        print(json.dumps(metadata.to_json(), ensure_ascii=False, indent=2), file=handle)
    print(
        json.dumps(
            {
                'leaderboard_pages_path': str(paths.leaderboard_pages),
                'players_path': str(paths.players),
                'metadata_path': str(paths.metadata),
                'unique_players_discovered': metadata.unique_players_discovered,
                'players_fetched': metadata.players_fetched,
            }
        )
    )


if __name__ == '__main__':
    main()
