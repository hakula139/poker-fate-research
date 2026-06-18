from __future__ import annotations

import argparse
from pathlib import Path

import pytest

from poker_fate_research.commands.players import config_from_args
from poker_fate_research.paths import find_repo_root, repo_path


def test_find_repo_root_from_package_subdir() -> None:
    repo_root = Path.cwd().resolve()
    assert find_repo_root(repo_root / 'python') == repo_root


def test_repo_path_resolves_from_subdir(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.chdir(Path.cwd() / 'python')

    assert (
        repo_path('data', 'player-snapshots')
        == Path.cwd().parent / 'data/player-snapshots'
    )


def test_players_default_output_dir_uses_repo_root(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.chdir(Path.cwd() / 'python')
    args = argparse.Namespace(
        base_host='https://example.invalid/',
        output_dir=None,
        page_size=50,
        sleep_seconds=0.25,
        max_players=None,
    )

    config = config_from_args(args)

    assert config.output_dir == Path.cwd().parent / 'data/player-snapshots'


def test_explicit_players_output_dir_is_preserved() -> None:
    args = argparse.Namespace(
        base_host='https://example.invalid/',
        output_dir=Path('custom-output'),
        page_size=50,
        sleep_seconds=0.25,
        max_players=None,
    )

    config = config_from_args(args)

    assert config.output_dir == Path('custom-output')
