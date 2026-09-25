# CLAUDE.md — cubetracker

## Was ist das?

Speedcubing-Solve-Tracking. **Aktiv ist nur `webapp/`**, die Multi-User-Web-Variante,
**LIVE auf cubetracker.de** (Hetzner + Coolify). `backend/` + `frontend/` sind die
eingefrorene Single-User-Desktop-Variante (SQLite, PyInstaller) — intakt, nicht mehr
erweitert.

Features: Timer (Tastatur/Touch, Stackmat per Klinke, Smart-Cube per BLE),
csTimer-Import/-Export, WCA-Profil, Statistiken inkl. Multi-Cube-Vergleich,
PB-Tracking, Trainer (PLL/OLL), Scramble-Nets, Hardware-Analyse, Achievements, Friends/Leaderboard,
Roadmap/Feedback/Patch-Notes in der App, Skins, i18n.

## Tech-Stack (`webapp/`)

- **Frontend** (`webapp/frontend`): React 19, Vite 8, TypeScript 6 (strict),
  TanStack Query 5, Recharts 3, Tailwind 4, i18next, Vitest 4; ESLint + Prettier.
- **Backend** (`webapp/`): Python ≥ 3.12 (Docker 3.12), FastAPI, SQLAlchemy 2,
  Pydantic 2, Postgres in Prod (SQLite nur lokal/Tests), pytest; Black + Ruff.
  Schema-Änderungen als Mini-Migration in `webapp/main.py:lifespan`.
- **Deploy:** Push auf `feature/W-api-prefix` → `.github/workflows/deploy.yml`
  (CI-Test-Gate: pytest + tsc + vitest) → Coolify-Deploy **nur der App, deren
  Pfade der Push ändert** (Frontend `webapp/frontend/`, Backend übriges `webapp/`
  außer `.md`). Doku im Repo-Root und `.claude/` lösen keinen Deploy aus.
  Live-Überwachung: UptimeRobot (extern, `/api/health` alle 5 min, Mail);
  `health-check.yml` nur zweite Linie (GitHub-Cron unzuverlässig).

## 🗺️ SSOT-Landkarte — je Thema GENAU eine maßgebliche Datei

Andere Dateien verweisen darauf, kopieren nicht. **Regeln** stehen hier, der
**Zustand** in `NEXT_SESSION.md`, **Persönliches** in der Memory. Bei Widerspruch
gilt diese Tabelle — und ich weise auf den Widerspruch hin, statt still zu
überschreiben.

| Thema | Maßgeblich |
|---|---|
| Verhalten, Regeln, diese Landkarte | `CLAUDE.md` |
| Session-Übergabe (Stand · Offen · Zeiger) — wird beim `/abschluss` **ersetzt** | `NEXT_SESSION.md` |
| Session-Verlauf (append-only, **nie** beim Start laden) | `docs/session-journal.md` |
| Code-Disziplin (lädt nur bei `.py`/`.ts`-Arbeit) | `.claude/rules/discipline.md` |
| Bug-Postmortems, Betriebs-Lessons | `docs/lessons-archive.md` |
| Wer sieht welche Daten (Rollen, Endpoints, Privacy) | `docs/permissions-matrix.md` |
| Patch-Notes | `webapp/changelog/data.py` |
| User-facing Feature-Liste | `webapp/frontend/src/lib/features-data.ts` |
| Roadmap-Items (live) / Phasen-Meta / Cold-Start-Seed | DB `roadmap_items` (Admin-UI) / `webapp/frontend/src/lib/roadmap-phases.ts` / `webapp/seeds/roadmap.py` |
| Schema + Mini-Migrations | `webapp/db/models.py` + `webapp/main.py:lifespan` |
| Frontend-API-Hooks | `webapp/frontend/src/lib/api.ts` |
| Erlaubte `cube_type`-Werte | `webapp/frontend/src/lib/format.ts:COMMON_CUBE_TYPES` |
| Periodischer Tiefen-Check | `MAINTENANCE.md` |

## 💬 Antwortformat (verbindlich)

- Deutsch, knapp, mit klarer Empfehlung. Belegzeichen: **● belegt** (Test, Repo,
  Live-Check, Quelle) · **○ eigene Einschätzung**.
- **📋 Ansage + Stopp vor jeder neuen Aufgabe:** (1) Plan- oder Auto-Modus,
  abgewogen · (2) Modell · (3) Effort (`low`…`max`) · (4) Delegation — keiner /
  Gegenleser / Panel, mit Modellnamen · (5) geplante Schreibzugriffe und ob
  gepusht wird (**Push = live**). Dann **Antwort beenden**; erst deine nächste
  Nachricht startet die Arbeit.
  - **Serien-GO:** Eine Ansage kann mehrere Wellen bündeln (höchsten Effort
    nennen); ein GO deckt die Serie. Darin stoppe ich nur bei Abweichung vom
    Angesagten, beim Effort-Stopp oder bei **Risikoklassen**: Schema-Migration,
    Auth/Rechte, Datenlöschung, Force-Push.
  - **Ohne Stopp:** Kleinkram (eine Datei, kein Push) — nur Ansage; reine
    Auskünfte und Meta-Bestätigungen — gar keine Ansage.
  - **Ansage ≠ Einstellung:** Die Ansage stellt nichts um; was die Umgebung
    meldet, schlägt meine Ansage.
- **⏫ Effort-Stopp:** Braucht ein späterer Schritt mehr Effort als der laufende,
  halte ich **davor** an: was fertig ist, was der Schritt ändert, woran er
  scheitern könnte, worauf umzustellen ist.
- **➡️ End-Block „Jetzt bei dir"** — nur wenn eine Entscheidung offen ist, immer
  am Antwortende: nummerierte Zeilen, je eine Handlung mit ●/○ und genau einem
  Empfehlungswort — `(empfohlen)` · `(offene Wahl)` (nennt immer den Default:
  „sonst X") · `(nicht empfohlen)` (nur als gekennzeichnete Alternative, „statt 2").
  Sortiert nach Empfehlungswort, darin nach Reihenfolge.
  - **Aufnahmetest:** nur, was allein du tun kannst (freigeben, Effort umstellen,
    extern prüfen) oder was ich erst nach deiner Antwort tue. Erledigtes, bloße
    Infos und ohnehin Eigenes gehören nicht hinein.
  - **Nichts offen → kein Block.** Sein Fehlen ist das Erfolgssignal. Bei
    Zwei-Satz-Antworten entfällt er.
  - **`🔭 Ohne dein Zutun`** (Bullets ohne Nummern) steht direkt **über** dem
    Block. Die Rubrik zeigt an, sie verwahrt nicht — was nachzuhalten ist, steht
    vorher in `NEXT_SESSION.md` → „Offen".
  - `AskUserQuestion` nur, wenn genau **eine** blockierende Wahl ansteht und du
    per Klick (Handy) antworten können sollst; sonst End-Block.
- **✅ GO:** `GO` = alle `(empfohlen)` + Defaults der `(offene Wahl)`.
  `GO 2` · `GO 1, 3` · `GO 1-3; 5` = nur diese. Nummern gelten für den **jüngsten**
  Block; im Zweifel frage ich nach. Nicht Genanntes bleibt offen (nicht
  abgelehnt). `(nicht empfohlen)` gilt nur mit ausdrücklicher Nummer. GO deckt nur
  wörtlich im Block Stehendes — keine Sammelposten. **Löschzeilen** (nicht
  wiederherstellbar) stehen nie als `(empfohlen)`, sondern als `(offene Wahl) —
  sonst behalten`: Ein bloßes GO löscht nichts.
- **🔎 Regelstelle nennen beim Bremsen:** Halte ich außerhalb der Ansage-/Effort-
  Stopps an, weiche ab oder lehne ab, nenne ich die Stelle mit Kurzzitat und
  Quellenart: Repo-Regel/Hook (`.claude/…`) · Memory · dein Zuruf (wann) ·
  Plattform (nicht im Repo änderbar). Ohne Quelle heißt es „eigene Vorsicht".

## 🔄 Session-Workflow

- **Start:** Der SessionStart-Hook lädt `NEXT_SESSION.md` automatisch (auch nach
  `/compact` und `/clear`) samt Werkstatt-Zeile (Liegengebliebenes). Meldet er
  „NICHT geladen" (Budget), die Datei sofort per Read lesen und kürzen.
- **Laufend:** Nach `/compact` zählt nur, was in Dateien steht. Bei mehrstufigen
  Wellen nach **jedem** abgeschlossenen Schritt eine Zeile in
  `NEXT_SESSION.md` → „Offen" — nicht erst beim Abschluss.
- **Abschluss:** `/abschluss` (`.claude/commands/abschluss.md`). Bei „Session
  beenden", „das wars für heute", „ich höre auf" o. ä. proaktiv aufrufen.
- **ntfy (User-Wunsch, verbindlich):** Der Stop-Hook pingt bei jedem Turn-Ende.
  **Vor jedem Turn-Ende** `.tmp/last-ntfy-message.txt` schreiben (optional
  `.tmp/last-ntfy-title.txt`): was passiert ist · ob du gebraucht wirst · was als
  Nächstes kommt. Mit End-Block: „Du bist dran: N Punkte — Empfehlung …"; ohne:
  „Nichts liegt bei dir — …". Der git-Fallback darf praktisch nie feuern.
  `AskUserQuestion` pingt separat (`pre-ask-question-ntfy.sh`).
- **Aufweckung ohne neuen Stand** (Hintergrund-Task, Monitor, Hook): Wartezustand
  **einmal** melden, danach nur „–" antworten und eine **leere**
  `.tmp/last-ntfy-message.txt` schreiben — leere Datei = kein Push.
- **ntfy-Topics sind öffentlich lesbar:** Das Repo ist public, das persönliche
  Topic steht (noch) in den Hooks. Push-Texte daher ohne Tokens, Passwörter,
  personenbezogene oder vertrauliche Inhalte. Monitoring-Topic nur als GH-Secret.
- **Patch-Notes:** jeder `feat(W.X)`/`fix(W.X)`-Commit braucht einen Eintrag in
  `webapp/changelog/data.py` (`version="2.0.0-alpha.W.X"`) + Git-Tag
  `v2.0.0-alpha.W.X` nach Push. `post-git-commit.sh` erinnert.
- **User-facing Features:** Bullet in `features-data.ts` (bzw. `features.*`-Locale);
  `post-git-commit.sh` warnt bei `feat(W.X)` ohne solchen Bullet (außer Backstage-
  Muster wie qa, fix, hardening, deps, hotfix).
- **Lange Session:** `/context` prüfen; vor drohender Kompaktierung den Kopf
  aktualisieren (`pre-compact-checkpoint.sh` sichert nur den git-Stand).
- **Roadmap:** `/roadmap` (Abruf, Auth, Live-only-Abgleich). Schließt eine Welle
  ein Roadmap-Item ab: `python .claude/hooks/roadmap-fetch.py --mark-done
  "<title_de exakt>"` — verbindlich, vorher die `note_de` lesen, nie nur den Titel.
- **Deploy verifizieren:** Health-Version **und** Bundle-Hash müssen flippen
  (`/abschluss` Check 9); halber Deploy → `gh workflow run deploy.yml`.

## 🤖 Subagenten, QA & Gegenlesung

- **Modell immer explizit** (`model`-Parameter): Suche/Recherche/Extraktion →
  `sonnet` · Routine-Code-QA (`qa-reviewer`) → `sonnet` · Critique/Gegenlesung →
  `opus` · kein `haiku`. Delegiert wird wegen Kontextschonung und Fan-out, nicht
  wegen des Preises; die Bewertung bleibt in der Hauptsession.
- **Prompt-Pflichtbestandteile:** exakte Pfade · „nur lesen" (wo zutreffend) ·
  „keine weiteren Agenten, Ergebnis in dieser Antwort" · Rohdaten mit Fundstelle,
  Nicht-Funde als „nicht gefunden" · lange Ergebnisse zusätzlich in eine
  Scratchpad-Datei.
- **QA nach wesentlichen Änderungen:** `qa-reviewer` — Trigger-Liste in
  `discipline.md`. KRITISCH vor Deploy fixen.
- **Gegenleser-Pflicht Regelebene:** Ändert eine Änderung an `CLAUDE.md` oder
  `.claude/**` (inkl. `settings.json`, Hooks, Commands) eine **Aussage**, liest
  ein Opus-Subagent mit frischem Kontext gegen — **nach** den mechanischen Tests
  (Hooks per stdin). Auftrag ausdrücklich als Critique („greif die Annahmen an,
  nenne die geprüften Nachbarregeln"), mit Vorher/Nachher und dem Satz „Entwurf,
  kein Bestand"; Herleitung und Verteidigung gehören nicht hinein. Befunde gehen
  als Kurzliste an dich, **bevor** geschrieben wird; nicht Übernommenes mit
  Halbsatz-Grund. Bagatelle (Wortlaut, Tippfehler, Umsortierung) → ansagen statt
  still annehmen. Kosten ~150–200 T je Lauf.
- **Exit-Codes nie hinter einer Pipe werten:** Prüfläufe, deren Ergebnis zählt
  (Tests, Gates vor Commit/Push), in eine Datei umleiten und den Code sichern
  (`… > out.txt 2>&1; RC=$?`) — hinter `| tail` meldet die Shell den Code von
  `tail`.

## 🌿 Branching & Deploy-Stand

- **`feature/W-api-prefix`** = live-deployter Branch, GitHub-Default und einzige
  Wahrheit für Code und Doku.
- **`feature/W-multi-user-web`** ist **eingefroren** — nicht committen/pushen.
- Branch-Endspiel (→ `main`, Altbranch + Render-Reste abbauen) steht aus →
  `NEXT_SESSION.md` „Offen".
- Rollback: `git revert <sha>` (bevorzugt, deployt sauber) · `git reset --soft
  HEAD~1` nur für Ungepushtes · Tags `v2.0.0-alpha.W.*` als Sprungmarken.

## 🛠️ Umgebung & Tooling

- **Tooling-Autonomie (User-Anweisung 2026-06-07):** benötigte Dependencies,
  CLI-Tools und System-Software selbst installieren, ohne vorher zu fragen
  (`winget … --silent --accept-package-agreements --accept-source-agreements
  --disable-interactivity`, `npm install`; bei System-Installs ggf. Sandbox aus
  via `dangerouslyDisableSandbox`). Installationen ohne UAC gelten in einer
  Serie **nicht** als Abweichung. ⚠️ System-Installs lösen eine **UAC-Abfrage**
  aus, die `--silent` nicht umgeht → vorher ansagen („gleich kommt UAC, bitte
  bestätigen") = Stopp; fremde Installer-Prozesse nie hart killen.
  Herleitung: `docs/lessons-archive.md` 2026-06-07.
- **pre-commit** (`.pre-commit-config.yaml`, installiert) läuft bei jedem Commit
  über alle gestagten Dateien (Whitespace, EOF, Ruff/Black …) und kann Commits
  abbrechen — dann fixen, neu stagen, erneut committen (Tag erst danach).
- **Keine lokalen Dev-Server** — die App ist live (Hook `pre-bash-dev-server.sh`;
  Override `CUBETRACKER_ALLOW_LOCAL_DEV=1`). Tests (`npm test`, `pytest`) laufen
  lokal.
- **Permission-Modes:** Wechsel mit Shift+Tab (default · acceptEdits · plan ·
  auto). Allow-/Deny-Listen: `.claude/settings.json`.
- **Sub-Agent-Files:** `.claude/agents/` (`qa-reviewer`, `patch-notes-writer`).

## 🔐 Sichtbarkeit & Privacy

`docs/permissions-matrix.md` ist die Single-Source für „wer sieht was?"
(anonym / user / friend / tester / admin, Endpoints, UI-Tabs, Anti-Tracking).
**Pflicht-Lesen** bei neuen Endpoints, Auth-Code, Cross-User-Filtern,
Privacy-Texten und Rollen-Änderungen — bei Änderung mit-aktualisieren.
Das Repo ist **public**: keine Secrets, Tokens oder ntfy-Topics für Monitoring
im Klartext (GH-Secrets nutzen).

## Externe Datenquellen

WCA-API (`https://www.worldcubeassociation.org/api/v0/`) · csTimer-Export
(Import/Export) · cubing.js (nur devDependency, Daten werden gebacken).

## Archiv & Audits

`docs/lessons-archive.md` (Postmortems, neueste zuerst) ·
`docs/audit-2026-05-20.md` + `/audit` (Setup-Audit) · QA-Befunde je Welle in den
Patch-Notes (`…-qa`-Suffix) · Memory-Pflege gelegentlich per `/consolidate-memory`.
