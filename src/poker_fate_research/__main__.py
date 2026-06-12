from __future__ import annotations

import argparse
import json
import re
import sys
import zipfile
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import IO, TypedDict
from urllib.parse import urlparse


class MatchJson(TypedDict):
    value: str
    sources: list[str]


class ScanJson(TypedDict):
    artifacts: list[str]
    entries_scanned: int
    urls: list[MatchJson]
    hosts: list[MatchJson]
    paths: list[MatchJson]
    keywords: list[MatchJson]


URL_RE = re.compile(
    rb'https?://[A-Za-z0-9][A-Za-z0-9.-]*(?::[0-9]+)?(?:/[A-Za-z0-9._~:/?#\[\]@!$&\'()*+,;=%-]*)?'
)
HOST_RE = re.compile(rb'\b(?:[A-Za-z0-9-]+\.)+(?:com|net|org|io|cn|cc|gg|app|dev|top)\b')
PATH_RE = re.compile(rb"/[A-Za-z0-9._~:@!$&'()*+,;=%-]{2,}(?:/[A-Za-z0-9._~:@!$&'()*+,;=%-]+)*")
IGNORED_HOST_PREFIXES = (
    'android.',
    'androidx.',
    'com.android.',
    'java.',
    'javax.',
    'kotlin.',
    'okhttp3.',
    'org.xml.',
)

KEYWORDS = [
    'api',
    'auth',
    'hand',
    'hands',
    'history',
    'leaderboard',
    'match',
    'player',
    'profile',
    'rank',
    'record',
    'schema',
    'stat',
    'stats',
    'user',
    'vpip',
    'pfr',
    '入池',
    '入池率',
    '玩家',
    '牌局',
    '战绩',
    '数据',
    '统计',
]


@dataclass
class MatchSet:
    values: set[str] = field(default_factory=set)
    evidence: defaultdict[str, set[str]] = field(default_factory=lambda: defaultdict(set))

    def add(self, value: str, source: str) -> None:
        if value:
            self.values.add(value)
            self.evidence[value].add(source)

    def to_json(self) -> list[MatchJson]:
        return [
            {'value': value, 'sources': sorted(self.evidence[value])}
            for value in sorted(self.values)
        ]


@dataclass
class ScanResult:
    artifacts: list[str]
    entries_scanned: int = 0
    urls: MatchSet = field(default_factory=MatchSet)
    hosts: MatchSet = field(default_factory=MatchSet)
    paths: MatchSet = field(default_factory=MatchSet)
    keywords: MatchSet = field(default_factory=MatchSet)

    def as_json(self) -> ScanJson:
        return {
            'artifacts': self.artifacts,
            'entries_scanned': self.entries_scanned,
            'urls': self.urls.to_json(),
            'hosts': self.hosts.to_json(),
            'paths': self.paths.to_json(),
            'keywords': self.keywords.to_json(),
        }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog='poker-fate-research')
    subparsers = parser.add_subparsers(dest='command', required=True)

    scan_parser = subparsers.add_parser('scan', help='scan official artifacts for API candidates')
    scan_parser.add_argument('paths', nargs='+', type=Path)
    scan_parser.add_argument('--json', action='store_true', help='emit JSON')

    args = parser.parse_args(argv)

    if args.command == 'scan':
        result = scan_paths(args.paths)
        if args.json:
            json.dump(result.as_json(), sys.stdout, ensure_ascii=False, indent=2)
            sys.stdout.write('\n')
        else:
            print_summary(result)
        return 0

    parser.error(f'unknown command: {args.command}')


def scan_paths(paths: list[Path]) -> ScanResult:
    result = ScanResult(artifacts=[str(path) for path in paths])
    for path in paths:
        scan_path(path, result)
    return result


def scan_path(path: Path, result: ScanResult) -> None:
    if zipfile.is_zipfile(path):
        with zipfile.ZipFile(path) as archive:
            for info in archive.infolist():
                if info.is_dir():
                    continue
                result.entries_scanned += 1
                with archive.open(info) as stream:
                    scan_stream(stream, f'{path}!{info.filename}', result)
        return

    result.entries_scanned += 1
    with path.open('rb') as stream:
        scan_stream(stream, str(path), result)


def scan_stream(stream: IO[bytes], source: str, result: ScanResult) -> None:
    tail = b''
    while chunk := stream.read(1024 * 1024):
        data = tail + chunk
        collect_ascii_matches(data, source, result)
        collect_keywords(data, source, result)
        tail = data[-512:]


def collect_ascii_matches(data: bytes, source: str, result: ScanResult) -> None:
    for match in URL_RE.findall(data):
        url = decode_match(match)
        host = urlparse(url).hostname
        if host and is_plausible_host(host):
            result.urls.add(url, source)
            add_host(host, source, result)

    for match in HOST_RE.findall(data):
        add_host(decode_match(match), source, result)

    for match in PATH_RE.findall(data):
        path = decode_match(match)
        if looks_like_api_path(path):
            result.paths.add(path, source)


def collect_keywords(data: bytes, source: str, result: ScanResult) -> None:
    lower = data.lower()
    for keyword in KEYWORDS:
        encoded = keyword.lower().encode()
        if encoded in lower or keyword.encode('utf-16le') in data:
            result.keywords.add(keyword, source)


def decode_match(value: bytes) -> str:
    return value.rstrip(b'\'"),.;').decode('utf-8', errors='ignore')


def add_host(host: str, source: str, result: ScanResult) -> None:
    normalized = host.lower().strip('.')
    if is_plausible_host(normalized):
        result.hosts.add(normalized, source)


def is_plausible_host(host: str) -> bool:
    if not host or len(host) > 253:
        return False
    if any(host.startswith(prefix) for prefix in IGNORED_HOST_PREFIXES):
        return False
    if re.fullmatch(r'\d+type\.googleapis\.com', host):
        return False

    labels = host.split('.')
    if len(labels) < 2:
        return False
    if any(not label or len(label) > 63 for label in labels):
        return False
    if any(not re.fullmatch(r'[a-z0-9-]+', label) for label in labels):
        return False
    return not (labels[-1] == 'app' and any(label.startswith('android') for label in labels))


def looks_like_api_path(path: str) -> bool:
    lowered = path.lower()
    needles = (
        'api',
        'user',
        'player',
        'stat',
        'rank',
        'record',
        'hand',
        'history',
        'match',
    )
    return any(needle in lowered for needle in needles)


def print_summary(result: ScanResult) -> None:
    payload = result.as_json()
    for key in ('urls', 'hosts', 'paths', 'keywords'):
        values = [item['value'] for item in payload[key]]
        print(f'{key}:')
        for value in values:
            print(f'  {value}')


if __name__ == '__main__':
    raise SystemExit(main())
