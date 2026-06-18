from __future__ import annotations

import argparse
from pathlib import Path
from typing import cast

from poker_fate_research.d1_export import write_snapshot_import_sql


def register(subparsers: argparse._SubParsersAction) -> None:
    parser = subparsers.add_parser(
        'd1-import-sql',
        help='Build D1 import SQL for a player snapshot',
        description='Build D1 import SQL from one player snapshot JSON or JSONL file.',
    )
    parser.add_argument('snapshot', type=Path)
    parser.add_argument('--output', required=True, type=Path)
    parser.set_defaults(handler=run_snapshot_import)


def run_snapshot_import(args: argparse.Namespace) -> int:
    write_snapshot_import_sql(cast(Path, args.snapshot), cast(Path, args.output))
    return 0
