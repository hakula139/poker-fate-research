from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from poker_fate_research.constants import DEVICE_TOKEN_ENV, GAME_TYPES, LEADERBOARDS
from poker_fate_research.json_types import JsonObject, json_int, json_object_list
from poker_fate_research.time import iso_now


@dataclass(frozen=True)
class CollectorConfig:
    base_host: str
    output_dir: Path
    page_size: int
    sleep_seconds: float
    max_players: int | None


@dataclass(frozen=True)
class Session:
    uid: int
    authorization: str
    is_guest: bool
    is_reg: bool


@dataclass(frozen=True)
class OutputPaths:
    leaderboard_pages: Path
    players: Path
    metadata: Path

    @classmethod
    def from_timestamp(cls, output_dir: Path, fetched_at: str) -> OutputPaths:
        stamp = fetched_at.replace('-', '').replace(':', '')
        return cls(
            leaderboard_pages=output_dir / f'poker-fate-leaderboards-{stamp}.jsonl',
            players=output_dir / f'poker-fate-players-{stamp}.jsonl',
            metadata=output_dir / f'poker-fate-snapshot-{stamp}.metadata.json',
        )


@dataclass(frozen=True)
class LeaderboardPage:
    leaderboard_id: int
    leaderboard_name: str
    period: str
    request: JsonObject
    code: object
    total: object
    self_value: object
    rows: list[JsonObject]
    fetched_at: str

    @classmethod
    def from_api(
        cls,
        leaderboard_id: int,
        leaderboard_name: str,
        period: str,
        request: JsonObject,
        response: JsonObject,
    ) -> LeaderboardPage:
        return cls(
            leaderboard_id=leaderboard_id,
            leaderboard_name=leaderboard_name,
            period=period,
            request=request,
            code=response.get('code'),
            total=response.get('total'),
            self_value=response.get('self'),
            rows=json_object_list(response.get('list')),
            fetched_at=iso_now(),
        )

    def to_json(self) -> JsonObject:
        return {
            'type': 'leaderboard_page',
            'leaderboard_id': self.leaderboard_id,
            'leaderboard_name': self.leaderboard_name,
            'period': self.period,
            'request': self.request,
            'code': self.code,
            'total': self.total,
            'self': self.self_value,
            'rows': self.rows,
            'fetched_at': self.fetched_at,
        }


@dataclass
class PlayerSeed:
    uid: int
    names: set[str]
    leaderboard_entries: list[JsonObject]

    @classmethod
    def from_uid(cls, uid: int) -> PlayerSeed:
        return cls(uid=uid, names=set(), leaderboard_entries=[])

    def add_entry(self, page: LeaderboardPage, row: JsonObject) -> None:
        if row.get('name'):
            self.names.add(str(row['name']))
        self.leaderboard_entries.append(
            {
                'leaderboard_id': page.leaderboard_id,
                'leaderboard_name': page.leaderboard_name,
                'period': page.period,
                'rank': row.get('rank'),
                'rank_id': row.get('rank_id'),
                'value': row.get('value'),
                'game_type': row.get('game_type'),
                'row': row,
            }
        )


@dataclass(frozen=True)
class GameDataSnapshot:
    game_type: int
    label: str
    request: JsonObject
    response: JsonObject

    def to_json(self) -> JsonObject:
        return {
            'label': self.label,
            'request': self.request,
            'response': self.response,
        }


@dataclass(frozen=True)
class PlayerSnapshot:
    uid: int
    names: list[str]
    leaderboard_entries: list[JsonObject]
    game_data: list[GameDataSnapshot]
    sng_record: JsonObject
    fetched_at: str

    def to_json(self) -> JsonObject:
        return {
            'type': 'player_snapshot',
            'uid': self.uid,
            'names': self.names,
            'leaderboard_entries': self.leaderboard_entries,
            'game_data': {
                str(item.game_type): item.to_json() for item in self.game_data
            },
            'sng_record': self.sng_record,
            'fetched_at': self.fetched_at,
        }


@dataclass
class LeaderboardSummary:
    leaderboard_id: int
    leaderboard_name: str
    period: str
    reported_total: object
    fetched_rows: int = 0
    empty_after_skip: int | None = None

    @classmethod
    def from_page(cls, page: LeaderboardPage) -> LeaderboardSummary:
        return cls(
            leaderboard_id=page.leaderboard_id,
            leaderboard_name=page.leaderboard_name,
            period=page.period,
            reported_total=page.total,
        )

    def observe(self, page: LeaderboardPage) -> None:
        if page.rows:
            self.fetched_rows += len(page.rows)
        else:
            self.empty_after_skip = json_int(page.request, 'skip')

    def to_json(self) -> JsonObject:
        return {
            'leaderboard_id': self.leaderboard_id,
            'leaderboard_name': self.leaderboard_name,
            'period': self.period,
            'reported_total': self.reported_total,
            'fetched_rows': self.fetched_rows,
            'empty_after_skip': self.empty_after_skip,
        }


@dataclass(frozen=True)
class LeaderboardIndex:
    players: dict[int, PlayerSeed]
    summaries: list[LeaderboardSummary]
    page_count: int
    row_count: int


@dataclass(frozen=True)
class SnapshotMetadata:
    fetched_at: str
    base_host: str
    guest_uid: int
    summaries: list[LeaderboardSummary]
    leaderboard_pages_path: Path
    players_path: Path
    unique_players_discovered: int
    players_fetched: int
    leaderboard_rows: int
    leaderboard_pages: int
    max_players: int | None

    def to_json(self) -> JsonObject:
        return {
            'type': 'snapshot_metadata',
            'fetched_at': self.fetched_at,
            'base_host': self.base_host,
            'guest_uid': self.guest_uid,
            'leaderboards': LEADERBOARDS,
            'game_types': GAME_TYPES,
            'leaderboard_summaries': [summary.to_json() for summary in self.summaries],
            'leaderboard_pages_path': str(self.leaderboard_pages_path),
            'players_path': str(self.players_path),
            'unique_players_discovered': self.unique_players_discovered,
            'players_fetched': self.players_fetched,
            'leaderboard_rows': self.leaderboard_rows,
            'leaderboard_pages': self.leaderboard_pages,
            'max_players': self.max_players,
            'notes': [
                f'Uses reusable {DEVICE_TOKEN_ENV} guest identity.',
                (
                    'Discovery is bounded by official leaderboard pagination observed '
                    'through /activity/rankingList.'
                ),
                (
                    'Files are under ignored data/ and may contain public player names '
                    'and profile-stat snapshots.'
                ),
            ],
        }
