# NEXT_SESSION — Übergabe-Kopf

_Wird per SessionStart-Hook in jede Session geladen (auch nach `/compact`). **Nur
Zustand, keine Regeln** — Regeln stehen in `CLAUDE.md`. Wird beim `/abschluss`
**ersetzt statt ergänzt** (mit Verlustprobe); der Verlauf gehört ans Ende von
`docs/session-journal.md`. Budget: Die gesamte Hook-Ausgabe muss unter 10.000
Zeichen bleiben — jede Ergänzung hier braucht eine Streichung._

**Zuletzt aktualisiert:** 2026-09-25 (Harness-Umbau nach SKHO-Vorbild)

## 📍 Stand

- Live: `v2.0.0-alpha.W.scramble-net-pyraminx` (04.07.2026). Seitdem kein
  Feature-Deploy.
- Juli-Wellen (FTO-csTimer-Roundtrip, FTO-Random-State, Scramble-Net NxN +
  Pyraminx) sind getaggt, live und im Journal nachgetragen.
- 25.09.2026: Harness auf SKHO-Verfahren umgestellt (Antwortformat mit
  Ansage/End-Block/GO, dieser Kopf, Start-Hook lädt ihn, Gegenleser-Pflicht für
  die Regelebene). Details: Journal-Block 2026-09-25.

## 🔜 Offen

**Als Nächstes (vom User am 25.09. so gereiht):**
1. **W.scramble-net-skewb fertig machen.** Lokal, uncommittet: Generator-Fix
   (Loader-SVG statt PuzzleGeometry-SVG, Center-Dedupe) + Renderer-Fallback für
   Ein-Sticker-Pieces; 10/10 `puzzle-net`-Tests grün. Fehlt: `Skewb: SKEWB_NET`
   in `ScrambleNet.tsx` → Patch-Note, `features-data`, QA, Push, Tag, Live-Check.
2. **Bug Tägliche Herausforderung:** verlangt teils „10 3x3-Solves unter 0,01 s"
   (Roadmap P1, nur live).

**Wartet auf dich:**
- Activity-Feed (P1): Plan steht (`docs/session-journal.md`, Block „IN ARBEIT —
  Activity-Feed"). Wartet auf die Fragebogen-Ergebnisse (`.tmp/Cubetracker-
  Fragebogen-Activity-Feed.docx`).
- 8 Roadmap-Items existieren nur live, nicht in `webapp/seeds/roadmap.py` → per
  `/roadmap` einzeln entscheiden, ob sie in den Seed gehören (3 davon laut
  Journal 06.06. schon erledigt: Tab Roadmap-pflege, einstellbare Haltezeit,
  Single-PB neben dem Timer).
- Produktfrage Zen-Pille (Mattis): nur im Spacebar-Modus sichtbar; Desktop-
  Default bzw. Zen im Text-Modus ändern? (kein Bug)
- 15 OLL-Diagramme zeigen den Fall um 90/180/270° verdreht (Empfehlung: lassen;
  reproduzierbar via `.tmp/qa-oll/verify_oll.py`).
- Duplikat-Solves aus den Stackmat-Tests (Juni): Aufräumhilfe anbieten, falls
  noch vorhanden.

**Technik-Backlog (aus `docs/app-analyse-2026-06-12.md`, nichts davon begonnen):**
- Welle B: Off-Site-Backup (#9) · permissions-matrix-Drift + confirm()-Rest +
  A11y-Bundle (#10).
- Welle C: `user_cube_stats`-Aggregat (#11) · Alembic (#12) · Sentry (#13).
- Coolify-API ohne TLS (`docs/coolify-https-howto.md`).
- Branch-Endspiel (→ `main`, `feature/W-multi-user-web` + Render-Reste abbauen,
  Apex-Redirect direkt auf Hetzner) — geplant war ~05.06., steht aus.

**Klein / Polish:**
- Stackmat: Fokus-Modus-Escape aus dem Stackmat-Modus · Hinweis-Link → Direkt-
  Scroll zur Geräte-Sektion · 2-s-Diagnose-Log hinter einen Debug-Toggle.
- Timer-Zeit ragt bei großer Schrift auf dem Handy aus der Karte (der
  Clamp-Ansatz vom 07.06. wurde zurückgerollt, das Problem ist offen).
- **MAINTENANCE-Lauf überfällig** (letzter 2026-05-26).
- Werkstatt: untracked seit Mai/Juni — `frontend/src/assets/*.zip`/`*.png`,
  `skins/`, `scripts/` → beim nächsten `/abschluss` einordnen. Ungesichert in
  `.tmp/` liegen Fragebogen (Activity-Feed) und `qa-oll/verify_oll.py`.
- Hooks `pre-git-tag-check`, `post-git-commit`, `post-push-failure-diagnose`:
  „Maßgeblich:"-Zeile nachziehen, sobald sie ohnehin angefasst werden.

**Nach dem Harness-Umbau prüfen:**
- Einmal `/compact` ausführen → steht dieser Kopf danach im Kontext?
- Nach einer Antwort mit End-Block: kein zweiter Turn, kein Fallback-ntfy?

## 📌 Zeiger

- Produkt-Backlog + Prioritäten: Live-Roadmap (`/roadmap`), nicht diese Datei.
- Verlauf aller Sessions: `docs/session-journal.md` (Altbestand bis 21.06.
  neueste oben; ab 25.09. neue Blöcke am Dateiende).
- Lessons: `docs/lessons-archive.md` · Sichtbarkeit: `docs/permissions-matrix.md`.
- Wiederaufnahme nach Kompaktierung: `.tmp/last-compact-checkpoint.md` (git-Stand).
