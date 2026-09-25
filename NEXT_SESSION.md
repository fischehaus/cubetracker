# NEXT_SESSION — Übergabe-Kopf

_Wird per SessionStart-Hook in jede Session geladen (auch nach `/compact`). **Nur
Zustand, keine Regeln** — Regeln stehen in `CLAUDE.md`. Wird beim `/abschluss`
**ersetzt statt ergänzt** (mit Verlustprobe); der Verlauf gehört ans Ende von
`docs/session-journal.md`. Budget: Die gesamte Hook-Ausgabe muss unter 10.000
Zeichen bleiben — jede Ergänzung hier braucht eine Streichung._

**Zuletzt aktualisiert:** 2026-09-25 (Harness-Umbau nach SKHO-Vorbild)

## 📍 Stand

- Live: `v2.0.0-alpha.W.challenge-plausible-pb` (25.09.2026). Davor heute:
  Skewb-Net, Hotfix `18e2561` (SQLAlchemy 2.1 → Backend-Ausfall 09:03–10:58
  UTC, behoben). Roadmap #47, #32, #10 auf done. Live-Überwachung seit 25.09.
  über UptimeRobot (extern, 5 min, Mail).
- Juli-Wellen (FTO-csTimer-Roundtrip, FTO-Random-State, Scramble-Net NxN +
  Pyraminx) sind getaggt, live und im Journal nachgetragen.
- 25.09.2026: Harness auf SKHO-Verfahren umgestellt (Antwortformat mit
  Ansage/End-Block/GO, dieser Kopf, Start-Hook lädt ihn, Gegenleser-Pflicht für
  die Regelebene). Details: Journal-Block 2026-09-25.

## 🔜 Offen

**Als Nächstes (priorisierte Liste, vom User am 25.09. freigegeben):**

_Jetzt:_
1. **CI gegen echtes Postgres + Obergrenzen für Backend-Deps** (Lesson
   2026-09-25: SQLAlchemy 2.1 → 2 h Ausfall, CI mit SQLite sah es nicht).
2. **Off-Site-Backup der DB** (Technik-Backlog B #9).

_Bald:_ Solve-Notizen editierbar (#48; Detail-Modal zeigt sie nur an) ·
Session/Hardware fixieren statt Auto (#49) · Coolify-TLS · MAINTENANCE-Lauf ·
Timer-Schrift Handy · Stackmat-Polish · B #10 (permissions-matrix, confirm, A11y).

_Roadmap-Pflege:_ #32 + #10 am 25.09. auf done gesetzt. #22 (Stackmat: Audio live,
USB nicht) und #7 (Bluetooth teils live) umbenennen — nur mit User im Admin-UI.

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

**Harness-Umbau geprüft (25.09.):** `/compact` lädt diesen Kopf ✅ · nach dem
End-Block kein zweiter Turn, ntfy mit eigenem Text ✅ · Push `fc41040` hat
nichts deployt ✅. → Zeile beim nächsten `/abschluss` streichen.

## 📌 Zeiger

- Produkt-Backlog + Prioritäten: Live-Roadmap (`/roadmap`), nicht diese Datei.
- Verlauf aller Sessions: `docs/session-journal.md` (Altbestand bis 21.06.
  neueste oben; ab 25.09. neue Blöcke am Dateiende).
- Lessons: `docs/lessons-archive.md` · Sichtbarkeit: `docs/permissions-matrix.md`.
- Wiederaufnahme nach Kompaktierung: `.tmp/last-compact-checkpoint.md` (git-Stand).
