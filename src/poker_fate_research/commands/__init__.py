from __future__ import annotations

import argparse

from poker_fate_research.commands import players


def register_all(subparsers: argparse._SubParsersAction) -> None:
    players.register(subparsers)
