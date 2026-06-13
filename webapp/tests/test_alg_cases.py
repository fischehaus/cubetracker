"""Würfel-Level-Verifikation der Trainer-Algorithmen (W.oll-scramble-fix).

Hintergrund: QA 2026-06-13 fand OLL-17 mit gespiegelter S-Konvention —
der Trainer-Scramble (inverse(alg)) zerstörte das F2L. String-Tests
(algs.test.ts) können das nicht sehen; dieser Test simuliert echte Würfel.

Parst webapp/frontend/src/lib/algs.ts LIVE (kein hartkodiertes Duplikat) —
jede künftige Alg-Änderung läuft damit automatisch durchs CI-Gate.

Simulator: exakter Sticker-Level-3x3 (Position+Normale → Farbe), Basis
verifiziert via Token⁴=Identität, Sexy-Move-Ordnung 6 und
Wide=Outer+Slice-Äquivalenzen (aus .tmp/qa-oll/verify_oll.py destilliert).
"""

from __future__ import annotations

import math
import re
from pathlib import Path

import pytest

# ======================================================================
# Sticker-Level-Simulator
# ======================================================================

FACE_COLOR = {
    (0, 1, 0): "Y", (0, -1, 0): "W",
    (0, 0, 1): "B", (0, 0, -1): "G",
    (1, 0, 0): "R", (-1, 0, 0): "O",
}

_TANGENTS = {
    (0, 1, 0): ((1, 0, 0), (0, 0, 1)),
    (0, -1, 0): ((1, 0, 0), (0, 0, 1)),
    (0, 0, 1): ((1, 0, 0), (0, 1, 0)),
    (0, 0, -1): ((1, 0, 0), (0, 1, 0)),
    (1, 0, 0): ((0, 1, 0), (0, 0, 1)),
    (-1, 0, 0): ((0, 1, 0), (0, 0, 1)),
}

State = dict


def solved_state() -> State:
    st: State = {}
    for n, (u, w) in _TANGENTS.items():
        for a in (-1, 0, 1):
            for b in (-1, 0, 1):
                pos = tuple(2 * n[i] + a * u[i] + b * w[i] for i in range(3))
                st[(pos, n)] = FACE_COLOR[n]
    return st


def _rx_cw(v):
    x, y, z = v
    return (x, z, -y)


def _rx_ccw(v):
    x, y, z = v
    return (x, -z, y)


def _ry_cw(v):
    x, y, z = v
    return (-z, y, x)


def _ry_ccw(v):
    x, y, z = v
    return (z, y, -x)


def _rz_cw(v):
    x, y, z = v
    return (y, -x, z)


def _rz_ccw(v):
    x, y, z = v
    return (-y, x, z)


MOVES = {
    "U": (lambda p: p[1] >= 1, _ry_cw),
    "D": (lambda p: p[1] <= -1, _ry_ccw),
    "R": (lambda p: p[0] >= 1, _rx_cw),
    "L": (lambda p: p[0] <= -1, _rx_ccw),
    "F": (lambda p: p[2] >= 1, _rz_cw),
    "B": (lambda p: p[2] <= -1, _rz_ccw),
    "M": (lambda p: p[0] == 0, _rx_ccw),  # folgt L (WCA)
    "S": (lambda p: p[2] == 0, _rz_cw),   # folgt F (WCA)
    "E": (lambda p: p[1] == 0, _ry_ccw),  # folgt D (WCA)
    "r": (lambda p: p[0] >= 0, _rx_cw),
    "l": (lambda p: p[0] <= 0, _rx_ccw),
    "u": (lambda p: p[1] >= 0, _ry_cw),
    "d": (lambda p: p[1] <= 0, _ry_ccw),
    "f": (lambda p: p[2] >= 0, _rz_cw),
    "b": (lambda p: p[2] <= 0, _rz_ccw),
    "x": (lambda p: True, _rx_cw),
    "y": (lambda p: True, _ry_cw),
    "z": (lambda p: True, _rz_cw),
}

TOKEN_PATTERN = re.compile(r"^([UDRLFBMSEudlrfbxyz])(2'?|'|)$")


def apply_move(st: State, token: str) -> State:
    m = TOKEN_PATTERN.match(token)
    assert m, f"unbekanntes Token: {token!r}"
    base, suffix = m.groups()
    layer, rot = MOVES[base]
    times = {"": 1, "'": 3, "2": 2, "2'": 2}[suffix]
    for _ in range(times):
        new: State = {}
        for (pos, n), c in st.items():
            if layer(pos):
                new[(rot(pos), rot(n))] = c
            else:
                new[(pos, n)] = c
        st = new
    return st


def apply_alg(st: State, alg: str) -> State:
    for tok in alg.split():
        st = apply_move(st, tok)
    return st


# 1:1-Port von inverseAlg() aus algs.ts (gleiche Token-Semantik).
def invert_token(token: str) -> str:
    if not token:
        return token
    if token.endswith("2'"):
        return token[:-1]
    if token.endswith("2"):
        return token
    if token.endswith("'"):
        return token[:-1]
    return token + "'"


def inverse_alg(alg: str) -> str:
    return " ".join(invert_token(t) for t in reversed(alg.split()))


def f2l_broken_stickers(st: State) -> list:
    """Sticker der unteren zwei Lagen + Seiten-Center, die NICHT gelöst sind."""
    return [
        (pos, n, c)
        for (pos, n), c in st.items()
        if pos[1] <= 0 and c != FACE_COLOR[n]
    ]


# Alle 24 Würfel-Orientierungen als Rotations-Sequenzen.
_ORIENTATIONS = [
    f"{a} {b}".strip()
    for b in ("", "x", "x2", "x'", "z", "z'")
    for a in ("", "y", "y2", "y'")
]


def normalize_orientation(st: State) -> State:
    """Dreht den GANZEN Würfel so, dass alle 6 Center gelöst sind.

    Nötig, weil Algs mit unbalancierter Rotation (z.B. PLL-V endet nach
    einem `y` ohne Rückdrehung) den Würfel physisch intakt, aber im Raum
    gedreht hinterlassen — das ist beim echten Cuben völlig normal und
    darf nicht als F2L-Schaden zählen. Echte Piece-Schäden (wie das alte
    OLL-17) übersteht KEINE der 24 Orientierungen — die bleiben erkannt.
    Center sind starr verbunden → exakt eine Orientierung passt immer.
    """
    for seq in _ORIENTATIONS:
        s = apply_alg(st, seq) if seq else st
        if all(
            s[(tuple(2 * n[i] for i in range(3)), n)] == FACE_COLOR[n]
            for n in FACE_COLOR
        ):
            return s
    raise AssertionError("keine Orientierung löst die Center — Zustand korrupt")


def top_orientation_key(st: State) -> tuple:
    """Orientierungsmuster der obersten Lage (Top-3x3 + 12 Seiten-Sticker)."""
    top = tuple(
        tuple(st[((c - 1, 2, r - 1), (0, 1, 0))] == "Y" for c in range(3))
        for r in range(3)
    )
    sides = (
        tuple(st[((tx, 1, -2), (0, 0, -1))] == "Y" for tx in (-1, 0, 1)),
        tuple(st[((2, 1, tz), (1, 0, 0))] == "Y" for tz in (-1, 0, 1)),
        tuple(st[((tx, 1, 2), (0, 0, 1))] == "Y" for tx in (-1, 0, 1)),
        tuple(st[((-2, 1, tz), (-1, 0, 0))] == "Y" for tz in (-1, 0, 1)),
    )
    return (top, sides)


# ======================================================================
# algs.ts LIVE parsen — kein Duplikat, das driften kann
# ======================================================================

ALGS_TS = Path(__file__).resolve().parents[1] / "frontend" / "src" / "lib" / "algs.ts"
CASE_RE = re.compile(r'\{\s*id:\s*"((?:PLL|OLL)-[^"]+)",\s*name:\s*"[^"]*",\s*alg:\s*"([^"]+)"')


def load_cases() -> dict[str, str]:
    text = ALGS_TS.read_text(encoding="utf-8")
    cases = dict(CASE_RE.findall(text))
    # Bestands-Invariante: 21 PLL + 57 OLL. Schlägt der Parser fehl
    # (Format-Änderung in algs.ts), soll das LAUT scheitern statt
    # still 0 Cases zu testen.
    assert sum(1 for k in cases if k.startswith("PLL-")) == 21, "PLL-Parse unvollständig"
    assert sum(1 for k in cases if k.startswith("OLL-")) == 57, "OLL-Parse unvollständig"
    return cases


CASES = load_cases()


# ======================================================================
# Tests
# ======================================================================


def test_simulator_self_check() -> None:
    """Token⁴ = Identität + Sexy-Move-Ordnung 6 — sichert den Simulator selbst."""
    st0 = solved_state()
    for tok in MOVES:
        s = st0
        for _ in range(4):
            s = apply_move(s, tok)
        assert s == st0, f"{tok}^4 != Identität"
    s = st0
    for _ in range(6):
        s = apply_alg(s, "R U R' U'")
    assert s == st0, "Sexy-Move-Ordnung != 6"


def test_all_tokens_supported_and_invertible() -> None:
    """Jedes in den Algs vorkommende Token wird vom Simulator unterstützt
    und von der inverseAlg-Logik korrekt invertiert (Token+Invers=Identität)."""
    st0 = solved_state()
    tokens = {t for alg in CASES.values() for t in alg.split()}
    for t in sorted(tokens):
        assert TOKEN_PATTERN.match(t), f"Token {t!r} nicht unterstützt"
        assert apply_move(apply_move(st0, t), invert_token(t)) == st0, (
            f"invertToken({t!r}) ist kein Invers"
        )


@pytest.mark.parametrize("case_id", sorted(CASES))
def test_alg_plus_inverse_is_identity(case_id: str) -> None:
    st0 = solved_state()
    alg = CASES[case_id]
    assert apply_alg(apply_alg(st0, alg), inverse_alg(alg)) == st0


@pytest.mark.parametrize("case_id", sorted(CASES))
def test_trainer_scramble_keeps_f2l_intact(case_id: str) -> None:
    """DER Kern-Check (hätte OLL-17 gefangen): der Trainer-Scramble
    (= inverse(alg) auf gelöstem Würfel) darf nur die oberste Lage
    verändern — F2L + alle Center müssen gelöst bleiben."""
    scramble = inverse_alg(CASES[case_id])
    st = normalize_orientation(apply_alg(solved_state(), scramble))
    broken = f2l_broken_stickers(st)
    assert not broken, (
        f"{case_id}: Scramble zerstört F2L/Center — {broken[:4]}"
        f" (+{max(0, len(broken) - 4)} weitere)"
    )


def test_oll_patterns_unique_and_invariant() -> None:
    """Alle 57 OLL-Orientierungsmuster paarweise verschieden, U-Center
    immer gelb, Gelb-Summe (Top+Seiten) == 9 (jeder LL-Cubie genau 1 Gelb)."""
    seen: dict[tuple, str] = {}
    for case_id, alg in CASES.items():
        if not case_id.startswith("OLL-"):
            continue
        st = apply_alg(solved_state(), inverse_alg(alg))
        key = top_orientation_key(st)
        top, sides = key
        assert top[1][1], f"{case_id}: U-Center nicht gelb"
        total = sum(map(sum, top)) + sum(map(sum, sides))
        assert total == 9, f"{case_id}: Gelb-Summe {total} != 9"
        assert key not in seen, f"{case_id} und {seen[key]} erzeugen dasselbe Muster"
        seen[key] = case_id
    assert len(seen) == 57


def test_oll_auf_suffix_actually_varies_pattern() -> None:
    """Regression für den AUF-Fix: ein U-Suffix nach dem OLL-Scramble muss
    das sichtbare Muster bei der Mehrheit der Cases drehen (Präfix tat das
    nachweislich nie — 0/171). Symmetrische Cases (z.B. OLL-20/21) dürfen
    unverändert bleiben, darum Schwelle deutlich > 0 statt == alle."""
    changed = 0
    total = 0
    for case_id, alg in CASES.items():
        if not case_id.startswith("OLL-"):
            continue
        inv = inverse_alg(alg)
        base = top_orientation_key(apply_alg(solved_state(), inv))
        for auf in ("U", "U2", "U'"):
            total += 1
            after = top_orientation_key(apply_alg(solved_state(), f"{inv} {auf}"))
            if after != base:
                changed += 1
    assert changed > total // 2, (
        f"AUF-Suffix variiert nur {changed}/{total} Muster — Winkel-Variation kaputt?"
    )


def test_oll17_specifically_fixed() -> None:
    """Pinnt den OLL-17-Fix fest (S↔S'-Tausch wegen gespiegelter
    S-Konvention der Original-Quelle). Falls jemand den Alg zurückdreht,
    schlägt schon test_trainer_scramble_keeps_f2l_intact an — dieser Test
    dokumentiert zusätzlich den korrekten Wortlaut."""
    assert CASES["OLL-17"] == "F R' F' R U S' R U' R' S"
