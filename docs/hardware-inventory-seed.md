# Hardware-Inventar — Seed-Daten fuer Phase 4

> User-Eingabe vom 2026-05-03. Wird in Phase 4 (F16 Hardware-Inventar)
> als Initial-Seed in die DB geladen. Bis dahin nicht angefasst.

## Liste pro Cube-Type

### 3x3
- Weilong v11
- Gan 15
- Gan I4
- Tornado v3
- QiYi MS
- QiYi Stickered

### 4x4
- AoSu v7
- Vin 4x4
- Pillowed 4x4
- Rubix 4x4

### 5x5
- X-Man Hong
- Gan 562

### 7x7
- Moyu Meilong

### 2x2
- Vin 2x2
- QiYi M Pro
- QiYi Stickered

### Square-1
- YJ MGC

### Pyraminx
- Gan Pyraminx
- Moyu Weilong
- YJ Pyraminx
- QiYi Stickered

### Skewb
- Gan Skewb
- YJ Skewb
- QiYi Stickered

### Clock
- QiYi Clock

### Megaminx
- Dayan Pro
- Moyu Mofang
- QiYi Stickered

### OH (One-Handed 3x3)
- Weilong v11
- Gan 15
- Gan I4
- Tornado v3
- QiYi MS
- QiYi Stickered

### Into Cube (zu klaeren)
- Schwarz
- Rot

> **Offene Frage fuer Phase 4:** „Into Cube" ist unklar — ist das ein
> eigener Cube-Type? Eine Marke? Color-Variants eines anderen Cubes?
> Beim Phase-4-Bau nachfragen.

## Beobachtungen fuer Datenmodell

1. **Cubes wiederholen sich ueber Cube-Types**: 3x3 und OH teilen sich
   sechs Modelle (logisch — physisch derselbe Cube). Heisst: das
   Hardware-Schema sollte erlauben, dass ein Hardware-Eintrag fuer
   MEHRERE Cube-Types geeignet ist (oder dass derselbe Cube physisch
   doppelt erfasst werden darf).
2. **„QiYi Stickered" taucht 5x auf** (bei 3x3, OH, 2x2, Pyraminx,
   Skewb, Megaminx). Wahrscheinlich verschiedene physische Cubes —
   Hardware-IDs sollten pro physischem Cube vergeben werden, nicht
   pro Modell. Naming sollte das aufloesen, z.B. „QiYi Stickered (3x3)"
   vs „QiYi Stickered (Megaminx)".
3. **Total ca. 35 physische Cubes** (mit Wiederholungen) ueber alle
   Cube-Types. Inventar-CRUD-UI sollte die Liste gut sortieren koennen.

## Schema-Vorschlag (vorlaeufig)

```python
class Hardware:
    id: int
    name: str            # 'Weilong v11'
    cube_types: list[str]  # ['3x3', 'OH'] — JSON-Spalte oder M2M
    purchased_at: date | None
    notes: str | None
    is_active: bool      # wenn True: default-empfehlung im SolveForm
```

Alternative: Hardware ist 1:1 zu cube_type, dieselben Modelle werden
mehrfach erfasst (einfacher zu modellieren, aber redundant beim Eingeben).
Entscheidung in Phase 4.
