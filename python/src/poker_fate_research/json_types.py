from __future__ import annotations

import json
from collections.abc import Sequence
from typing import cast


type JsonObject = dict[str, object]


def parse_json(text: str) -> object:
    """Parse JSON text into an untyped value for explicit narrowing."""
    return cast(object, json.loads(text))


def expect_object(value: object, message: str) -> JsonObject:
    """Narrow a JSON value to an object, raising ``ValueError`` otherwise."""
    if isinstance(value, dict):
        return cast(JsonObject, value)
    raise ValueError(message)


def json_int(data: JsonObject, key: str) -> int:
    """Return ``data[key]`` as an int, raising if missing or not int-like."""
    value = data[key]
    if isinstance(value, bool) or not isinstance(value, int | str):
        raise RuntimeError(f'{key} is not an integer-compatible JSON value')
    return int(value)


def json_str(data: JsonObject, key: str) -> str:
    """Return ``data[key]`` as a string, raising if missing or not a string."""
    value = data[key]
    if not isinstance(value, str):
        raise RuntimeError(f'{key} is not a string JSON value')
    return value


def json_object_list(value: object) -> list[JsonObject]:
    """Return the object entries of a JSON list, dropping non-object items."""
    if not isinstance(value, list):
        return []

    records: list[JsonObject] = []
    for item in cast(Sequence[object], value):
        if isinstance(item, dict):
            records.append(cast(JsonObject, item))
    return records


def as_object(value: object) -> JsonObject:
    """Coerce an arbitrary JSON value to an object, defaulting to empty."""
    return cast(JsonObject, value) if isinstance(value, dict) else {}


def as_int(value: object) -> int:
    """Coerce an arbitrary JSON value to an int, defaulting to ``0``."""
    return value if isinstance(value, int) else 0


def as_str(value: object) -> str:
    """Coerce an arbitrary JSON value to a string, defaulting to empty."""
    return value if isinstance(value, str) else ''


def as_list(value: object) -> list[object]:
    """Coerce an arbitrary JSON value to a list, defaulting to empty."""
    return cast('list[object]', value) if isinstance(value, list) else []
