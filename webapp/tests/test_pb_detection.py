"""PB-Detection am Solve-POST (X-PB-Achieved-Header) — W.solve-hotpath.

Pinnt das IST-Verhalten von api/solves.py:_detect_pbs_for_user fest,
BEVOR der Hot-Path performance-optimiert wird (App-Analyse 2026-06-12,
Welle B #6). Das Frontend konsumiert den Header für Konfetti/Toasts —
das Verhalten muss nach dem Umbau bitidentisch sein.

Regeln (aus dem Code abgelesen):
- "single": Solve ist (a) der aktuell beste effektive Wert UND
  (b) strikt besser als der beste Wert OHNE diesen Solve. DNF nie.
  +2 zählt mit 2000ms in den Vergleich.
- "ao5"/"ao12": best_ao5/ao12 MIT dem Solve ist strikt besser als OHNE
  (bzw. existiert erstmals — z.B. beim 5. Solve überhaupt).
"""

from __future__ import annotations

from fastapi.testclient import TestClient


def _post_solve(
    client: TestClient,
    headers: dict[str, str],
    time_ms: int,
    ts: str,
    **overrides: object,
) -> tuple[int, str]:
    """Solve anlegen; liefert (status_code, X-PB-Achieved-Header oder '')."""
    payload: dict[str, object] = {
        "time_ms": time_ms,
        "cube_type": "3x3",
        # Explizite, aufsteigende Timestamps — die PB-Detection sortiert
        # chronologisch, und now()-Defaults könnten in derselben Sekunde
        # kollidieren.
        "timestamp": ts,
    }
    payload.update(overrides)
    r = client.post("/api/solves", json=payload, headers=headers)
    return r.status_code, r.headers.get("X-PB-Achieved", "")


def test_first_solve_is_single_pb(client: TestClient, make_user) -> None:
    _, headers = make_user()
    code, pb = _post_solve(client, headers, 20000, "2026-06-01T10:00:00Z")
    assert code == 201
    assert "single" in pb.split(",")


def test_slower_solve_is_no_pb(client: TestClient, make_user) -> None:
    _, headers = make_user()
    _post_solve(client, headers, 20000, "2026-06-01T10:00:00Z")
    _, pb = _post_solve(client, headers, 25000, "2026-06-01T10:01:00Z")
    assert pb == ""


def test_faster_solve_is_single_pb(client: TestClient, make_user) -> None:
    _, headers = make_user()
    _post_solve(client, headers, 20000, "2026-06-01T10:00:00Z")
    _, pb = _post_solve(client, headers, 18000, "2026-06-01T10:01:00Z")
    assert "single" in pb.split(",")


def test_dnf_is_never_single_pb(client: TestClient, make_user) -> None:
    _, headers = make_user()
    _post_solve(client, headers, 20000, "2026-06-01T10:00:00Z")
    # Schnellste Roh-Zeit, aber DNF → kein Single-PB.
    _, pb = _post_solve(client, headers, 9000, "2026-06-01T10:01:00Z", dnf=True)
    assert "single" not in pb.split(",")


def test_plus_two_counts_into_comparison(client: TestClient, make_user) -> None:
    _, headers = make_user()
    _post_solve(client, headers, 18000, "2026-06-01T10:00:00Z")
    # 17.0s + 2000ms Strafe = 19.0s effektiv → KEIN PB gegenüber 18.0s.
    _, pb = _post_solve(
        client, headers, 17000, "2026-06-01T10:01:00Z", plus_two=True
    )
    assert "single" not in pb.split(",")


def test_fifth_solve_completes_first_ao5(client: TestClient, make_user) -> None:
    _, headers = make_user()
    times = [20000, 25000, 18000, 19000]
    for i, t in enumerate(times):
        _post_solve(client, headers, t, f"2026-06-01T10:0{i}:00Z")

    # 4. Solve (19000): weder single (18000 steht) noch ao5 (erst 4 Solves).
    # Der 5. Solve komplettiert das erste Ao5-Fenster → "ao5" erscheint,
    # "single" nicht (21000 > 18000), "ao12" nicht (erst 5 Solves).
    _, pb = _post_solve(client, headers, 21000, "2026-06-01T10:04:00Z")
    kinds = pb.split(",") if pb else []
    assert "ao5" in kinds
    assert "single" not in kinds
    assert "ao12" not in kinds


def test_twelfth_solve_completes_first_ao12(client: TestClient, make_user) -> None:
    # QA-Finding W.solve-hotpath: ao12 nutzt denselben Pfad wie ao5
    # (best_average_window) — dieser Test verhindert lautloses Driften,
    # falls die Fenster-Logik je größenspezifisch wird.
    _, headers = make_user()
    # 11 Solves: bester ist 18.0s (Solve 3), kein ao12 möglich.
    times = [20000, 25000, 18000, 19000, 21000, 22000, 23000, 20500, 21500, 24000, 19500]
    for i, t in enumerate(times):
        _post_solve(client, headers, t, f"2026-06-01T10:{10 + i}:00Z")

    # 12. Solve (26.0s, langsamster): komplettiert das erste Ao12-Fenster
    # → "ao12" erscheint; single nicht (26.0 > 18.0); ao5 nicht (alle
    # neuen 5er-Fenster mit dem langsamen Solve sind schlechter).
    _, pb = _post_solve(client, headers, 26000, "2026-06-01T10:21:00Z")
    kinds = pb.split(",") if pb else []
    assert "ao12" in kinds
    assert "single" not in kinds
    assert "ao5" not in kinds


def test_better_ao5_window_is_detected(client: TestClient, make_user) -> None:
    _, headers = make_user()
    # Erste 5 Solves: Ao5 = mean(20,21,22) = 21.0s (19 + 25 getrimmt).
    for i, t in enumerate([19000, 20000, 21000, 22000, 25000]):
        _post_solve(client, headers, t, f"2026-06-01T10:0{i}:00Z")

    # 6. Solve 18.5s: neues Fenster (20,21,22,25,18.5) → getrimmt
    # mean(20,21,22) = 21.0s — NICHT besser. Aber 18.5 < 19.0 → single!
    _, pb = _post_solve(client, headers, 18500, "2026-06-01T10:05:00Z")
    kinds = pb.split(",") if pb else []
    assert "single" in kinds
    assert "ao5" not in kinds

    # 7. Solve 15.0s: Fenster (22,25,18.5,15) + ... → bestes neues Fenster
    # (21,22,25,18.5,15): getrimmt mean(18.5,21,22) = 20.5s < 21.0s → ao5-PB.
    # Und 15.0 < 18.5 → auch single.
    _, pb2 = _post_solve(client, headers, 15000, "2026-06-01T10:06:00Z")
    kinds2 = pb2.split(",") if pb2 else []
    assert "single" in kinds2
    assert "ao5" in kinds2
