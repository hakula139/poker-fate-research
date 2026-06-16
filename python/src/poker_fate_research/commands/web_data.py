from __future__ import annotations

import argparse
from pathlib import Path
from typing import cast

from poker_fate_research.paths import repo_path
from poker_fate_research.web_data import (
    run as build_web_data,
)


def register(subparsers: argparse._SubParsersAction) -> None:
    parser = subparsers.add_parser(
        'web-data',
        help='Build static website data',
        description='Build static website data from player snapshot JSONL files.',
    )
    parser.add_argument('--input-dir', type=Path)
    parser.add_argument('--output-dir', type=Path)
    parser.add_argument('snapshots', nargs='*', type=Path)
    parser.set_defaults(handler=run)


def run(args: argparse.Namespace) -> int:
    build_web_data(
        cast(Path | None, args.input_dir) or repo_path('data', 'player-snapshots'),
        cast(Path | None, args.output_dir) or repo_path('web', 'public', 'data'),
        cast(list[Path], args.snapshots),
    )
    return 0
