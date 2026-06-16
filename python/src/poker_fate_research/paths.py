from __future__ import annotations

from pathlib import Path


def find_repo_root(start: Path | None = None) -> Path | None:
    current = (start or Path.cwd()).resolve()
    for path in (current, *current.parents):
        if (path / 'python/pyproject.toml').is_file() and (
            path / 'web/package.json'
        ).is_file():
            return path
    return None


def repo_path(*parts: str) -> Path:
    root = find_repo_root()
    if root is None:
        joined = '/'.join(parts)
        raise SystemExit(
            'Run this command from the repository tree or pass an explicit path '
            f'for {joined}.'
        )
    return root.joinpath(*parts)
