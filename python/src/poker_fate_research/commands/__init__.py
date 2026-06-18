from __future__ import annotations

import argparse

from poker_fate_research.commands import d1, players, web_data


def register_all(subparsers: argparse._SubParsersAction) -> None:
    d1.register(subparsers)
    players.register(subparsers)
    web_data.register(subparsers)
