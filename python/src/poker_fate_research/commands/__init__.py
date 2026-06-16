from __future__ import annotations

import argparse

from poker_fate_research.commands import players, web_data


def register_all(subparsers: argparse._SubParsersAction) -> None:
    players.register(subparsers)
    web_data.register(subparsers)
