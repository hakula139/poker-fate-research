from __future__ import annotations

import argparse

from poker_fate_research.commands import d1, players


def register_all(
    subparsers: argparse._SubParsersAction[argparse.ArgumentParser],
) -> None:
    d1.register(subparsers)
    players.register(subparsers)
