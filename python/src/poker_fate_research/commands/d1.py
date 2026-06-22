from __future__ import annotations

import argparse
from pathlib import Path

from poker_fate_research.d1_export import write_player_import_sql


def register(subparsers: argparse._SubParsersAction[argparse.ArgumentParser]) -> None:
    parser = subparsers.add_parser(
        'd1-import-sql',
        help='Build D1 import SQL for collected players',
        description='Build D1 import SQL from one collected player JSON or JSONL file.',
    )
    parser.add_argument('snapshot', type=Path)
    parser.add_argument('--output', required=True, type=Path)
    parser.set_defaults(handler=run_player_import)


def run_player_import(args: argparse.Namespace) -> int:
    write_player_import_sql(args.snapshot, args.output)
    return 0
