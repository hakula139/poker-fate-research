from __future__ import annotations

import io
import traceback
import urllib.error
from email.message import Message
from unittest.mock import Mock

import pytest

from poker_fate_research.client import PokerFateClient


def test_rejected_login_does_not_expose_credentials(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client = PokerFateClient('https://example.com')
    post = Mock(
        return_value={
            'code': -5,
            'authorization': 'private-authorization',
            'message': 'private-device-token',
        }
    )
    monkeypatch.setattr(client, 'post_json', post)

    with pytest.raises(RuntimeError) as error:
        client.login_guest('private-device-token')

    assert str(error.value) == (
        '/login failed with code -5: device risk verification failed. '
        'Contact Poker Fate support.'
    )
    assert client.authorization is None
    post.assert_called_once()


@pytest.mark.parametrize(
    'code', ['private-device-token', {'token': 'private-device-token'}, None, False]
)
def test_login_rejects_malformed_code_without_exposing_it(
    monkeypatch: pytest.MonkeyPatch, code: object
) -> None:
    client = PokerFateClient('https://example.com')
    monkeypatch.setattr(client, 'post_json', Mock(return_value={'code': code}))

    with pytest.raises(RuntimeError) as error:
        client.login_guest('private-device-token')

    assert str(error.value) == '/login returned an invalid response code'
    assert client.authorization is None


def test_http_error_does_not_expose_response_body_or_reason(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    device_token = 'private-device-token'
    body = io.BytesIO(device_token.encode())
    post = Mock(
        side_effect=urllib.error.HTTPError(
            'https://example.com/login', 403, device_token, Message(), body
        )
    )
    monkeypatch.setattr('urllib.request.urlopen', post)

    with pytest.raises(RuntimeError) as error:
        PokerFateClient('https://example.com').login_guest(device_token)

    assert str(error.value) == '/login failed with HTTP 403'
    assert 'private-device-token' not in ''.join(
        traceback.format_exception(error.value)
    )
    assert body.closed
    post.assert_called_once()
