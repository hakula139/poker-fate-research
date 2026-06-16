from __future__ import annotations

import argparse
from pathlib import Path
from typing import cast

from poker_fate_research.web_data import (
    DEFAULT_INPUT_DIR,
    DEFAULT_OUTPUT_DIR,
    run as build_web_data,
)


def register(subparsers: argparse._SubParsersAction) -> None:
    parser = subparsers.add_parser(
        'web-data',
        help='Build static website data',
        description='Build static website data from player snapshot JSONL files.',
    )
    parser.add_argument('--input-dir', type=Path, default=DEFAULT_INPUT_DIR)
    parser.add_argument('--output-dir', type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument('snapshots', nargs='*', type=Path)
    parser.set_defaults(handler=run)


def run(args: argparse.Namespace) -> int:
    build_web_data(
        cast(Path, args.input_dir),
        cast(Path, args.output_dir),
        cast(list[Path], args.snapshots),
    )
    return 0
