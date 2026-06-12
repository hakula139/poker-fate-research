from __future__ import annotations

from collections.abc import Sequence
from typing import cast


type JsonObject = dict[str, object]


def json_int(data: JsonObject, key: str) -> int:
    value = data[key]
    if isinstance(value, bool) or not isinstance(value, int | str):
        raise RuntimeError(f'{key} is not an integer-compatible JSON value')
    return int(value)


def json_str(data: JsonObject, key: str) -> str:
    value = data[key]
    if not isinstance(value, str):
        raise RuntimeError(f'{key} is not a string JSON value')
    return value


def json_object_list(value: object) -> list[JsonObject]:
    if not isinstance(value, list):
        return []

    records: list[JsonObject] = []
    for item in cast(Sequence[object], value):
        if isinstance(item, dict):
            records.append(cast(JsonObject, item))
    return records
