from __future__ import annotations

from pathlib import Path

from poker_fate_research.json_types import as_object, parse_json
from poker_fate_research.player_normalization import normalized_game


CONTRACT = Path(__file__).resolve().parent / 'fixtures/official-game-data.json'


def test_normalized_game_matches_shared_contract() -> None:
    """Pins collector normalization against a recorded official response."""
    contract = as_object(parse_json(CONTRACT.read_text(encoding='utf-8')))
    value = {'label': contract['label'], 'response': {'data': contract['raw']}}

    assert normalized_game(str(contract['gameType']), value) == contract['normalized']
