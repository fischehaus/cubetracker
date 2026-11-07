"""PyJWT-Umstieg (W.pyjwt, 2026-11-07): Kompatibilität + Ablehnungsfälle.

Die beiden Referenz-Tokens wurden mit python-jose 3.5.0 erzeugt (HS256,
Secret = "compat-test-secret-" * 4, exp = 2100-01-01). Sie müssen unter
PyJWT gültig bleiben — sonst wären nach dem Deploy alle Nutzer ausgeloggt.
"""

from __future__ import annotations

from datetime import timedelta

import pytest

import auth.jwt as authjwt

COMPAT_SECRET = "compat-test-secret-" * 4
JOSE_ACCESS = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0MiIsInR5cGUiOiJhY2Nlc3MiLCJ2ZXIiOjMsImlhdCI6MTc5MDAwMDAwMCwiZXhwIjo0MTAyNDQ0ODAwfQ.EWWeAyti61u93hQsNPZ5je7e86FgvFvR3NRENzLtICo"
JOSE_REFRESH = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0MiIsInR5cGUiOiJyZWZyZXNoIiwidmVyIjozLCJpYXQiOjE3OTAwMDAwMDAsImV4cCI6NDEwMjQ0NDgwMH0.jbNu0ciFihq-hvRlwwQbozqarKngrR5XNvxuwNWjNBY"


@pytest.fixture
def compat_secret(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(authjwt, "JWT_SECRET", COMPAT_SECRET)


def test_jose_access_token_bleibt_gueltig(compat_secret: None) -> None:
    assert authjwt.extract_user_id_and_version(JOSE_ACCESS, "access") == (42, 3)


def test_jose_refresh_token_bleibt_gueltig(compat_secret: None) -> None:
    payload = authjwt.decode_token(JOSE_REFRESH, expected_type="refresh")
    assert payload["sub"] == "42" and payload["ver"] == 3


def test_typ_mismatch_wirft_jwterror(compat_secret: None) -> None:
    with pytest.raises(authjwt.JWTError):
        authjwt.decode_token(JOSE_REFRESH, expected_type="access")


def test_falsche_signatur_wirft_jwterror(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(authjwt, "JWT_SECRET", "anderes-secret-" * 4)
    with pytest.raises(authjwt.JWTError):
        authjwt.decode_token(JOSE_ACCESS)


def test_abgelaufener_token_wirft_jwterror(compat_secret: None) -> None:
    token = authjwt.create_token(7, "access", 1, expires_delta=timedelta(seconds=-5))
    with pytest.raises(authjwt.JWTError):
        authjwt.decode_token(token)


def test_alg_none_wird_abgelehnt(compat_secret: None) -> None:
    import jwt as pyjwt

    unsigned = pyjwt.encode(
        {"sub": "42", "type": "access", "ver": 3, "iat": 1790000000, "exp": 4102444800},
        key=None,
        algorithm="none",
    )
    with pytest.raises(authjwt.JWTError):
        authjwt.decode_token(unsigned)


def test_roundtrip_neuer_token(compat_secret: None) -> None:
    token = authjwt.create_token(5, "access", 2)
    assert authjwt.extract_user_id_and_version(token) == (5, 2)


def test_sub_als_int_wird_abgelehnt(compat_secret: None) -> None:
    """PyJWT verlangt sub als String (jose prüfte das nicht) — eigene Tokens
    casten immer per str(), fremde mit int-sub müssen als JWTError enden."""
    import jwt as pyjwt

    token = pyjwt.encode(
        {"sub": 42, "type": "access", "ver": 3, "iat": 1790000000, "exp": 4102444800},
        COMPAT_SECRET,
        algorithm="HS256",
    )
    with pytest.raises(authjwt.JWTError):
        authjwt.decode_token(token)


def test_nicht_numerischer_sub_ergibt_jwterror_statt_500(compat_secret: None) -> None:
    import jwt as pyjwt

    token = pyjwt.encode(
        {"sub": "abc", "type": "access", "ver": 3, "iat": 1790000000, "exp": 4102444800},
        COMPAT_SECRET,
        algorithm="HS256",
    )
    with pytest.raises(authjwt.JWTError):
        authjwt.extract_user_id_and_version(token)
