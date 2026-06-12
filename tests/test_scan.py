from __future__ import annotations

import zipfile
from pathlib import Path

from poker_fate_research.__main__ import scan_paths


def test_scan_extracts_url_host_path_and_keywords(tmp_path: Path) -> None:
    sample = tmp_path / 'sample.bin'
    sample.write_bytes(
        b'https://api.pokerfate.com/player/list?season=1 '
        + b'/api/player/stats '
        + '入池率'.encode()
    )

    result = scan_paths([sample])

    assert result.urls.values == {'https://api.pokerfate.com/player/list?season=1'}
    assert 'api.pokerfate.com' in result.hosts.values
    assert '/api/player/stats' in result.paths.values
    assert '入池率' in result.keywords.values


def test_scan_reads_zip_entries(tmp_path: Path) -> None:
    sample = tmp_path / 'sample.apk'
    with zipfile.ZipFile(sample, 'w') as archive:
        archive.writestr('assets/config.txt', b'https://store.pokerfate.com/api/user/profile')

    result = scan_paths([sample])

    assert 'https://store.pokerfate.com/api/user/profile' in result.urls.values
    assert result.entries_scanned == 1


def test_scan_ignores_empty_urls_and_android_packages(tmp_path: Path) -> None:
    sample = tmp_path / 'sample.bin'
    sample.write_bytes(b'http:// androidx.core.app android.content.Contextandroid.net')

    result = scan_paths([sample])

    assert result.urls.values == set()
    assert 'androidx.core.app' not in result.hosts.values
