# NEXT_SESSION — Übergabe-Kopf

_Wird per SessionStart-Hook in jede Session geladen (auch nach `/compact`). **Nur
Zustand, keine Regeln** — Regeln stehen in `CLAUDE.md`. Wird beim `/abschluss`
**ersetzt statt ergänzt** (mit Verlustprobe); der Verlauf gehört ans Ende von
`docs/session-journal.md`. Budget: Die gesamte Hook-Ausgabe muss unter 10.000
Zeichen bleiben — jede Ergänzung hier braucht eine Streichung._

**Zuletzt aktualisiert:** 2026-09-25 (Abschluss: Skewb, Challenge-Fix, Ops-Härtung)

## 📍 Stand

- Live: `v2.0.0-alpha.W.challenge-plausible-pb` (25.09.2026), Frontend-Bundle
  `index-OgZS4hv1.js`. Backend mit festen Versionen (`webapp/constraints.txt`).
- Betrieb: Coolify 4.3.23 (Netz `coolify` am 25.09. repariert), UptimeRobot
  überwacht `/api/health` (5 min, Mail), CI startet die App vor jedem Deploy
  gegen Postgres 16, Hetzner-Server-Backups täglich (7), Hetzner-2FA aktiv.
- Details zum 25.09. (Ausfall, Hotfix, Coolify-Brüche): Journal + Lessons.

## 🔜 Offen

**Jetzt:**
1. **Hook-Fehlalarm `pre-bash-dev-server.sh`:** trennt Segmente an `|` auch
   INNERHALB von Anführungszeichen → `grep -E "a|uvicorn"` wird blockiert.
   Fix: erst `shlex` mit `punctuation_chars`, dann trennen; Testfall in
   `tests/test_pre_bash_dev_server.py`; Regelebene → Gegenlesung.
2. **Software-Reste:** Majors TS 7 / Vitest 5 / `@types/node` 26 · python-jose
   → PyJWT (`ecdsa`-Fund, HS256 nicht betroffen) · `sqlalchemy<2.1`-Pin lösen
   (Treiber jetzt explizit) · ESLint 27 Alt-Fehler (nicht im CI-Gate) · lokal
   21 winget-Updates.

**Bald:** Solve-Notizen editierbar (#48; Detail-Modal zeigt sie nur an) ·
Session/Hardware fixieren statt Auto (#49) · Roadmap #22 (Stackmat: Audio live,
USB nicht) und #7 (Bluetooth teils live) umbenennen — nur mit User im Admin-UI.

**Wartet auf dich:**
- Activity-Feed (P1): Plan steht (`docs/session-journal.md`, Block „IN ARBEIT —
  Activity-Feed"). Wartet auf die Fragebogen-Ergebnisse (`.tmp/Cubetracker-
  Fragebogen-Activity-Feed.docx`).
- 8 Roadmap-Items existieren nur live, nicht in `webapp/seeds/roadmap.py` —
  Stand 25.09.: 6 erledigt, aktiv nur noch #48/#49. Empfehlung: nichts in den
  Seed nachtragen (Schutz gegen DB-Verlust = Backups).
- Produktfrage Zen-Pille (Mattis): nur im Spacebar-Modus sichtbar; Desktop-
  Default bzw. Zen im Text-Modus ändern? (kein Bug)
- 15 OLL-Diagramme zeigen den Fall um 90/180/270° verdreht (Empfehlung: lassen;
  reproduzierbar via `.tmp/qa-oll/verify_oll.py`).
- Duplikat-Solves aus den Stackmat-Tests (Juni): Aufräumhilfe anbieten, falls
  noch vorhanden.

**Technik-Backlog (aus `docs/app-analyse-2026-06-12.md`):**
- Welle B: Off-Site-Backup (#9) · permissions-matrix-Drift + confirm()-Rest +
  A11y-Bundle (#10). Off-Site: Hetzner-Backups laufen, Lücke nur Anbieter/Konto
  + 24 h; externer DB-Dump wäre sauberer.
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
- Werkstatt: untracked seit Mai/Juni — am 25.09. eingeordnet: `scripts/*.py`
  versioniert, Skin-Pakete/Prüfbilder per `.gitignore`, Coolify-Log gelöscht.
  Ungesichert in `.tmp/`: Fragebogen (Activity-Feed), `qa-oll/verify_oll.py`.
- Hooks `pre-git-tag-check`, `post-git-commit`, `post-push-failure-diagnose`:
  „Maßgeblich:"-Zeile nachziehen, sobald sie ohnehin angefasst werden.

## 📌 Zeiger

- Produkt-Backlog + Prioritäten: Live-Roadmap (`/roadmap`), nicht diese Datei.
- Verlauf aller Sessions: `docs/session-journal.md` (Altbestand bis 21.06.
  neueste oben; ab 25.09. neue Blöcke am Dateiende).
- Lessons: `docs/lessons-archive.md` · Sichtbarkeit: `docs/permissions-matrix.md`.
- Server-Zugang: SSH-Schlüssel dieses PCs (`root@178.105.103.78`); Coolify
  `http://178.105.103.78:8000`.
- Wiederaufnahme nach Kompaktierung: `.tmp/last-compact-checkpoint.md` (git-Stand).
