from __future__ import annotations

import hashlib
import json
import urllib.error
import urllib.request
from http.client import HTTPResponse
from typing import cast

from poker_fate_research.constants import LOGIN_VERIFY_SALT
from poker_fate_research.json_types import JsonObject, json_int, json_str
from poker_fate_research.models import Session


class PokerFateClient:
    def __init__(self, base_host: str, authorization: str | None = None) -> None:
        self.base_host = base_host.rstrip('/')
        self.authorization = authorization

    def post_json(
        self, path: str, body: JsonObject | None, timeout: float = 20
    ) -> JsonObject:
        data = json.dumps(body or {}, separators=(',', ':')).encode()
        request = urllib.request.Request(
            self.base_host + '/' + path.lstrip('/'),
            data=data,
            headers={'content-type': 'application/json'},
            method='POST',
        )
        if self.authorization:
            request.add_header('authorization', self.authorization)

        try:
            response = cast(
                HTTPResponse, urllib.request.urlopen(request, timeout=timeout)
            )
            with response:
                decoded = cast(object, json.loads(response.read().decode()))
        except urllib.error.HTTPError as error:
            details = error.read().decode(errors='replace')[:300]
            raise RuntimeError(
                f'{path} failed with HTTP {error.code}: {details}'
            ) from error

        if not isinstance(decoded, dict):
            raise RuntimeError(f'{path} returned a non-object JSON response')
        return cast(JsonObject, decoded)

    def login_guest(self, device_token: str) -> Session:
        os_name = 'Android'
        body: JsonObject = {
            'type': 1,
            'token': device_token,
            'imei': device_token,
            'os': os_name,
            'lang': 'en',
            'verify': hashlib.md5(
                (os_name + device_token + LOGIN_VERIFY_SALT).encode()
            ).hexdigest(),
            'adjust_id': None,
            'mask': 'LoginHttp',
        }
        response = self.post_json('/login', body)
        if response.get('code') != 0:
            raise RuntimeError(f'login failed with code {response.get("code")}')

        session = Session(
            uid=json_int(response, 'uid'),
            authorization=json_str(response, 'authorization'),
            is_guest=bool(response.get('is_guest')),
            is_reg=bool(response.get('is_reg')),
        )
        self.authorization = session.authorization
        return session
