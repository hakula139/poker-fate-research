from __future__ import annotations

import argparse
from collections.abc import Sequence

from poker_fate_research import commands


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog='poker-fate',
        description='Poker Fate API research tools.',
    )
    subparsers = parser.add_subparsers(dest='command', required=True)
    commands.register_all(subparsers)
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    return args.handler(args)


if __name__ == '__main__':
    raise SystemExit(main())
