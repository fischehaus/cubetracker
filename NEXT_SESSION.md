# NEXT_SESSION — Cubetracker Wiederaufnahme

> **Zweck:** Damit die naechste Claude-Session ohne Reibungsverlust dort
> ansetzt, wo wir aufgehoert haben.

## Single-Source-Files (canonical)

Diese Files sind die einzige Wahrheit für ihren Bereich — alles andere
liest aus / referenziert sie:

| File | Inhalt | Update bei |
|---|---|---|
| `webapp/changelog/data.py` | Patch-Notes (PATCH_NOTES list) — neueste oben | Jedem `feat()` / `fix()`-Commit, vor Tag-Push |
| `webapp/frontend/src/lib/roadmap-data.ts` | Roadmap-Phasen P1-P6 (Frontend-Modal) | Wenn neue Items / Phasen-Wechsel |
| `webapp/frontend/src/lib/features-data.ts` | User-facing Feature-Liste (Login-Page + Modal) | Bei jedem User-facing-Feature |
| `webapp/db/models.py` + `webapp/main.py:lifespan` | Schema + Mini-Migrations (ALTER TABLE IF NOT EXISTS) | Bei Schema-Änderungen |
| `webapp/frontend/src/lib/api.ts` | React-Query-Hooks (Single-Source für Frontend-API-Calls) | Bei neuen Endpoints |
| `webapp/frontend/src/lib/format.ts:COMMON_CUBE_TYPES` | Liste der erlaubten cube_type-Werte | Bei neuen Cubes |
| `docs/audit-2026-05-20.md` | Letzter Setup-Audit (Claude-Code-Konfig) | Quartalsweise via `/audit`-Skill (geplant) |
| `docs/lessons-archive.md` | Bug-Postmortems chronologisch | Nach jedem Production-Crash / Workflow-Lesson |

`/abschluss` prüft im Check 3-5 ob diese Files konsistent mit den letzten
Commits sind.

---

## ✅ ERLEDIGT 2026-05-27 — Backlog-Sprint + Turnier-Sprint i18n-Massenwelle

**~32 Commits + ~22 Tags an einem Tag, alles live.** Live-public-Version:
`W.i18n-charts` (letzter public Tag; danach 3 internal-Wellen für die
Verwaltung-Sub-Panels). Backend skippt internal-Einträge in
`current_version()`, also sieht User nichts vom Internal-Spam.

**Bilanz nach Mi-Spät + Do-Voll:**
- Vormittag/Mittag: Backlog-Sprint (Average-PB, Danger-Zone, Letzte Rekorde,
  Roadmap-intern) + 3 QA-Hotfixe + GitHub-Issue #1 vollständig adressiert
- Mi-Spät: Turnier-Sprint Wellen 1-3 (i18n-Infra + LoginPage/Footer + Flaggen-
  Switcher + ChatGPT-Logo-Hinweis im Impressum)
- Do: **Turnier-Sprint Massen-i18n (Wellen 10-23)** — 17 weitere i18n-Wellen
  (siehe Block direkt unten)

🎯 **Aktiver Sprint:** Englisch-Variante + WCA-Profil-Light bis Sa 30.05. morgens
für privates Demo beim WCA-Turnier in Meppel. **Plan siehe „Restplan Turnier-
Sprint" unten.**

### 📌 WICHTIG für nächste Session — Patch-Notes-Konsolidierung-Plan

**Vereinbarung mit User (am Do, mid-sprint):** Am Ende des Turnier-Sprints
werden ALLE 20+ einzelnen `W.i18n-*`-Patch-Notes auf `internal=True` geflaggt
(analog gestern-Welle „Patch-Notes-intern"). Ein einziger public Patch-Note
`W.i18n-en-release` ersetzt sie im User-Changelog — User sieht dort dann
einen einzelnen sauberen „🇬🇧 Englische Version verfügbar!"-Eintrag statt
20 fast-identische Einträge. Git-Tags + Audit-Trail bleiben unangetastet
(Admin sieht alles weiterhin). Die ab `W.i18n-import-export` neuen Wellen
sind schon mit `internal=True` direkt geschrieben — spart Refactor-Arbeit.

→ **TODO am Sprint-Ende:** alle public `W.i18n-*`-Einträge in
`webapp/changelog/data.py` von `internal` flag aktuell `False` (oder
fehlend = Default `False`) auf `internal=True` umstellen, und neuen
public `W.i18n-en-release` ganz oben einfügen.

### Wellen 10-23 (Do, 27.05.) — Turnier-Sprint Massen-i18n

> Reihenfolge gewählt nach Demo-Sichtbarkeit (oben = User sieht zuerst):
>
> **Solve-Flow & Dashboard:**
> - `W.i18n-timer` — BigTimerInput, ScrambleCard, TimerControlsCard, HealthBadge, Modal-Close-Aria
> - `W.i18n-stats` — StatsCard, RecentRecordsCard, ReminderCard
> - `W.i18n-list` — SolveList (Tabelle + Filter), Filter-Bars (Analyse + Dashboard)
> - `W.i18n-auth-pages` — ResetPasswordPage, VerifyEmailPage, OnboardingBanner
> - `W.i18n-dashboard` — ActivityCard, NewsCard, WcaUpcomingCard, AchievementsMini, ChallengesMini
> - `W.i18n-jsonfix-qa` (internal) — **🔧 JSON-Bug-Fix** der die heutigen EN-Strings live brachte (un-escaped " in scramble.* hatte Vite-Parse silent fallen lassen → alle Keys ab Bruchstelle leer im Bundle)
> - `W.i18n-timer-complete` — SpacebarTimerCard, TouchTimerPad, SessionPlanCard, InfoButton
> - `W.i18n-toaster` — AchievementToaster, ChallengeCompletionToaster, PbConfettiOverlay
> - `W.i18n-verwaltung-1` — VerwaltungTab Sub-Tabs + MeineDatenCard
> - `W.i18n-live-card` — LastSolvesPreview (Live + Letzte Solves im Timer-Tab)
> - `W.i18n-danger-zone` — DangerZoneCard (3 Lösch-Aktionen)
> - `W.i18n-dashboard-sections` — Dashboard-Section-Header (Heute/Performance/Antrieb/Welt)
> - `W.i18n-multi-compare` — MultiCompareCard (Cube/Session/Drilldowns)
> - `W.i18n-charts` — TrendsChart, PbProgressionCard, ActivityChart, HistogramChart, HardwareCompareCard
> - `W.i18n-import-export` (internal) — ImportPanel + CsTimerExportPanel
> - `W.i18n-backup-panel` (internal) — BackupPanel (Voll-Export + Restore + Snapshots)
> - `W.i18n-session-list` (internal) — SessionList (Add/Rename/Notes/Merge/Delete-Modals)
>
> **User-Feedback-Loop war wertvoll:** mehrere Wellen entstanden direkt aus
> Befunden während Klick-Sessions („Tabs sind englisch, Fenster nicht" →
> JSON-Bug-Fix; „Live + Letzte Solves" → W.i18n-live-card; „Vergleich
> ist noch deutsch" → W.i18n-multi-compare; „Sektion-Header HEUTE/DEINE
> PERFORMANCE" → W.i18n-dashboard-sections).
>
> Damit komplett DE/EN: Login + Register + Mail-Pages + Dashboard
> (alle Karten) + Timer-Tab (Solve-Flow + Live + Letzte-Solves +
> Spacebar + Touch + Set + InfoPopups) + Analyse-Tab (Charts + SolveList +
> Filter) + Verwaltung-Tab teilweise (Header + Meine Daten + DangerZone +
> Sessions + Backup + Import/Export).

### 🔜 Restplan Turnier-Sprint (Fr + Sa-Vormittag)

**Was noch offen:**
- `HardwareList` (480 Zeilen — die Cube-Inventar-Liste)
- `OutlierCard` (238 Zeilen)
- `SettingsPanel` (383 Zeilen)
- `AccountSettingsPanel` (501 Zeilen — Profile + Email-Change + Password-Change + Account-Delete)
- `AdminPanel` (21 Zeilen Wrapper — die 4 Sub-Panels nur Admin-only, Demo nicht relevant)
- `TrainerTab` (65 Zeilen Wrapper + Sub-Components: AlgTrainerPanel etc.)
- `CommunityTab` (50 Zeilen Wrapper + Sub-Components)
- `features-data.ts` (Marketing-Texte für Login-Page + FeaturesModal — anderes Pattern, separate Welle)
- **WCA-Profil-Light** (P9 — DB-Spalte + Backend-Endpoint + Frontend-Card)
- **W.i18n-en-release Konsolidierungs-Welle** (siehe oben)

**Fr-Plan:**
- Vormittag: HardwareList + OutlierCard + SettingsPanel + AccountSettingsPanel + features-data.ts
- Nachmittag: WCA-Profil-Light (echter neuer Feature-Endpoint, kein i18n)
- Spät: Konsolidierungs-Welle W.i18n-en-release

**Sa Vormittag:** Demo-Probe + Last-Polish + ggf. TrainerTab/CommunityTab nachziehen.

### Welle 1 — #2 Average-PB-Punkte + Hook-Drift

> Backend: `StatsResult.ao5_pb_solve_ids` + `ao12_pb_solve_ids` ergänzt
> (Anker-IDs aus `avg_pb_progression`). Frontend: cyan ● vor ao5-PB-Zahlen,
> emerald ● vor ao12-PB-Zahlen in der Solve-Liste (gold ★ Single bleibt).
> Bonus: `session-start-context.sh` skippt internal-Einträge via Python-
> `current_version()` (konsistent mit /api/health).
>
> Commit: `cab748d` (Tag `W.avg-pb-dots`).

### Welle 2 — Danger-Zone „Meine Daten" + QA-Hotfix

> Neue Sektion unter Verwaltung→Meine Daten: 3 abgestufte Lösch-Aktionen
> (Solves zurücksetzen / Tracking-Daten zurücksetzen / Account löschen),
> 2-Klick-Bestätigung mit 5s Auto-Reset, Backup-Hinweis-Banner. 2 neue
> Backend-Endpoints (`/auth/me/reset-solves` + `/auth/me/reset-tracking`)
> mit confirm-Query-Schutz. Account-Löschung existierte schon.
>
> QA-Sub-Agent: 3 SOLLTE + 2 NICE, kein KRITISCH. Alles gefixt: Sessions/
> Achievements-Cache, Rate-Limit 5/min, `window.location.replace`, Other-
> Buttons disabled wenn armed, Backup-Error sichtbar.
>
> Commits: `079a876` (Tag `W.danger-zone`) + `26dc492` (Tag `W.danger-zone-qa`).

### Welle 3 — ntfy-Format zurück zu informativ

> `stop-ntfy-notify.sh` umgestellt: nutzt `.tmp/last-ntfy-message.txt` +
> `.tmp/last-ntfy-title.txt` als Override (Claude schreibt vor Turn-Ende),
> Fallback ist mechanisch aus git-State (HEAD-subject + Branch + unpushed).
> Format-Drift vom alten informativen zum generischen Format ist zurückgenommen.
>
> Commit: `00be68d` (kein Tag, chore-Methodik).

### Welle 4 — Block A: Doku-Pflege + Issue #1 adressiert

> - `roadmap-data.ts`: Erledigte Items als `done` markiert; neues P1-Item
>   „Roadmap & Features intern/extern trennen" (= Issue #1 Punkt 3).
> - `features-data.ts`: 2 neue Bullets (ao5/ao12-PB-Marker + Gefahren-Bereich).
> - `docs/coolify-https-howto.md` (NEU): Anleitung für Backlog #43 (Coolify-
>   HTTPS-Setup), 1-Klick-Howto mit Schritten, Rollback und Token-Rotation.
> - **GitHub-Issue #1 (geschlossen mit Kommentar)** — Punkt 1 (Aktualität)
>   ist mit diesem Commit erledigt, Punkt 3 (intern/extern-Filter) ist
>   als neues Roadmap-Item aufgenommen.
>
> Commit: `d909d46` (kein Tag, docs).

### Welle 5 — #3 Dashboard „Letzte Rekorde" + QA-Hotfix

> Neue Karte oben in „Deine Performance" im Dashboard: zeigt die 5 jüngsten
> PB-Ereignisse (Single/ao5/ao12) über ALLE Cubes, chronologisch absteigend.
> Pro Eintrag: Metrik-Badge (gold ★/cyan ●/emerald ●), Cube, Zeit, Δ-Verbesserung,
> Age-Label. Klick → Analyse-Tab mit Cube-Filter (zeigt dort PB-Chart).
> Neuer Backend-Endpoint `/stats/recent-pbs?limit=N`.
>
> QA-Sub-Agent: 3 SOLLTE + 2 NICE, kein KRITISCH. Alle relevanten gefixt:
> `load_only` für Memory, Keyboard-Accessibility (role+tabIndex+Enter),
> Timezone-Guard im Age-Label, `emptyRecentPbs(limit)`-Funktion statt
> hartkodiertem Stub-Limit.
>
> Commits: `8722a5d` (Tag `W.recent-pbs`) + `e9deea5` (Tag `W.recent-pbs-qa`).

### Welle 6 — Roadmap intern/extern + Aufräum-Beifang

> Roadmap-Modal filtert für Non-Admins die Dev-Schuld-Items raus
> (Backend-Test-Suite, Alembic, Bundle-Split, Random-Move-Fallback +
> das Meta-Item selbst). Admin sieht alles inkl. amber intern-Badge.
> Aufräum-Beifang: P1-Duplikat entfernt + Dashboard-Letzte-Rekorde
> nachträglich als done markiert. `features-data.ts` bewusst unangetastet
> (alle Bullets sind User-Marketing — Filter wäre toter Code).
>
> Damit ist **Issue #1 Punkt 3** vollständig erledigt → Issue #1 ist
> komplett abgearbeitet (Punkt 1 in Welle 4, Punkt 3 hier).
>
> Commit: `0e409d8` (Tag `W.roadmap-intern`).

### Welle 7 — Turnier-Sprint Start: i18n-Setup + KI-Impressum

> **Trigger:** privates Demo am WCA-Turnier in Meppel am Samstag 30.05.2026.
> Erste Welle des 3-Tage-Sprints für Englisch-Variante + Power-Demo-Feature.
> Option A gewählt (i18n breit + WCA-Profil-Light, Activity-Feed vertagt).
>
> - `react-i18next` + `i18next-browser-languagedetector` installiert,
>   Setup unter `src/i18n/` mit `de.json` + `en.json` als nested namespaces
>   (common/tabs/userMenu).
> - **TabBar + UserMenu komplett übersetzt** inkl. ARIA-Labels und
>   Tab-Descriptions. Sprach-Switcher (DE/EN) liegt im UserMenu vor
>   Logout.
> - Browser-Auto-Detect mit localStorage-Override (`cubetracker_language`).
> - **KI-Transparenz-Hinweis im Impressum**: explizit dokumentiert dass
>   App mit KI entwickelt wurde (Hilfsmittel im Sinne Art. 50 EU-KI-VO,
>   anwendbar ab 2.8.2026) — alle App-Inhalte rein regelbasiert, keine
>   echte Kennzeichnungspflicht. Set-End-Feedback grep-verifiziert:
>   regelbasiert (`SessionPlanCard.tsx:307-322`), kein LLM-Call irgendwo.
>
> Roadmap-Item „Turnier-Sprint Meppel" mit 4 Sub-Items in P1 (2 done).
>
> Commit: `3550e6c` (Tag `W.i18n-setup`).

### Welle 8 — i18n LoginPage + globaler Footer

> Die Anmelde-/Registrierungs-/Forgot-Password-Seite ist jetzt komplett
> durchschaltbar (DE/EN): Formular-Labels, Buttons, Tab-Switcher,
> Forgot-Info-Banner, Logo-Alt-Text. Auch der globale Footer im
> eingeloggten Zustand ist übersetzt (Was-kann / Roadmap / Feedback /
> Impressum / Datenschutz / Mehr-Optionen-Hinweis).
>
> Marketing-Tagline + Hero-Highlights aus `features-data.ts` bewusst
> nicht in dieser Welle — `features-data.ts` ist Single-Source-Liste
> mit anderem Pattern, separate Welle.
>
> Commit: `e191907` (Tag `W.i18n-loginpage`).

### Welle 9 — Flaggen-Sprach-Switcher im Header + ChatGPT-Logo-Hinweis

> User-Feedback: „eine deutsche und englische Flagge im Header an
> geeigneter Stelle". Umgesetzt: neue Komponente `LanguageSwitcher`
> mit Flaggen-Emoji + Buchstaben-Kürzel (🇩🇪 DE · 🇬🇧 EN). Eingebaut:
> (a) App-Header vor `HealthBadge`, (b) LoginPage-Auth-Card oben rechts,
> (c) UserMenu-Switcher bleibt als Backup.
>
> Windows-Eigenheit: Chrome rendert Emoji-Flaggen als Buchstaben-Boxen
> (Regional-Indicator). Daneben stehende DE/EN-Kürzel bleiben lesbar,
> kein Funktions-Verlust.
>
> User-Hinweis: Logo wurde mit ChatGPT/DALL·E erstellt. KI-Hinweis im
> Impressum entsprechend erweitert um Logo-Generierung — analog zum
> bereits dokumentierten Code-Hinweis.
>
> Commit: `2c37351` (Tag `W.i18n-flags`).

### 🔜 Restplan Turnier-Sprint (bis Sa 30.05. morgens)

**Mi-Abend (heute, erledigt):** i18n-Setup + KI-Impressum + LoginPage/Footer +
Flaggen-Switcher im Header + ChatGPT-Logo-Hinweis ✓ (Wellen 7-9, 4 Commits +
3 Tags)

**Do 28.05.:** Top-Strings übersetzen
- Solve-Flow (BigTimerInput, Penalty-Quick-Buttons, ScrambleCard)
- Stats-Labels (Dashboard-Karten, AnalyseTab-Charts-Labels)
- Auth-Flow (LoginPage, Register, EmailVerify, PasswordReset)
- HealthBadge / Footer

**Fr 29.05. Vormittag:** Rest-Strings (Trainer, Hardware-Inventar,
Verwaltung, Achievements-Titel, Toaster).

**Fr 29.05. Nachmittag:** WCA-Profil-Light
- `users.wca_id`-Spalte via main.py:lifespan-Migration
- Backend-Endpoint `/users/me/wca-profile` → ruft `api.worldcubeassociation.org/persons/{id}` ab
- AccountSettings: WCA-ID-Eingabe + Validierung
- Dashboard-Card: offizielle WCA-PRs + Wettkampf-Historie neben Cubetracker-Stats
- Backup-JSON muss `wca_id` mit-exportieren

**Sa 30.05. Vormittag:** Demo-Probe + Last-Polish.

### 🔜 Backlog NACH Turnier (in Reihenfolge)

1. **Activity-Feed** (P3, ~3 Tage) — Multi-User-USP demonstrieren.
   War für Turnier vorgesehen, vertagt zugunsten i18n-Vollausbau.
2. **#43 Coolify-HTTPS** — Howto liegt in `docs/coolify-https-howto.md`,
   👤 Server-Arbeit (~1h: DNS + Cert + GitHub-Action-URL + Token-Rotation).
3. **Phase 6 (~05.06.2026)** — apex `cubetracker.de` → Hetzner + Render
   abbauen + `feature/W-api-prefix` → `main` konsolidieren + GitHub-Default
   auf `main`.
4. **Backend-Test-Suite einführen** (P6, intern) — 0% Coverage; mind. Smoke pro
   Endpoint-Cluster.
5. **Alembic statt Inline-Migrations** (P6, intern) — Postgres-only-Syntax,
   bricht auf SQLite.
6. **csTimer-Vendor dynamic-importen** (P6, intern, ~1 Tag) — Bundle-Split,
   schaltet ~16KB gz aus dem initialen Bundle aus.

**🚨 Start-Selbsttest (Projekt-Wurzel / Hooks):** siehe Box direkt im
„AKTUELLER PRODUKT-STAND"-Block weiter unten.

---

## ✅ ERLEDIGT 2026-05-26 — Volltag: Methodik-Drift-Fix + Roadmap #5 + Backlog-Pflege

**9 Commits + 5 Tags heute, alles live.** Stand der Live-App: Version
`W.patchnotes-intern` (public), Bundle enthält die neuen Danger-Zone-Roadmap-Items.

### Welle 1 (Vormittag) — Methodik-System-Audit + Drift-Fix

> Volltext-Read aller 10 Hook-Skripte + `discipline.md` + 2 Commands + 2 Sub-
> Agents + `MAINTENANCE.md`. Danach Aufräum-Welle:
> - 8 Render→Coolify-Drift-Stellen in `.claude/*` + `webapp/auth+emailing/` gefixt
>   (der Hook gegen Mental-Model-Drift war selbst Drift)
> - `stop-mini-check.sh` ignoriert jetzt untracked-Files (kein `scripts/`-false-positive)
> - `abschluss.md` Check 8 in Sub-Shell (verhindert CWD-Leak — live aufgetreten)
> - **Erster MAINTENANCE-Voll-Durchlauf** protokolliert (Lauf-Protokoll war leer)
> - **Neue Lesson** in `docs/lessons-archive.md`: Auto-Mode-Classifier unterscheidet
>   Doku-Drift vs. funktionale Hook-Änderung (präzisiert Self-Modification-Befund
>   aus `docs/audit-2026-05-20.md`)
>
> Commits: `f7e581a` · `0a81d2f` · `2b9c24f` · `e995678`.

### Welle 2 (Mittag/Nachmittag) — #5 Patch Notes intern/öffentlich live

> User-Changelog zeigt jetzt **57 statt 82 Einträge** (25 internal-Wellen
> ausgeblendet) — wieder eine lesbare Feature-Geschichte statt Build-Log.
> - Schema: `PatchNote.internal: bool = False` + 25 bestehende Einträge geflaggt
>   (QA-Wellen, Admin-only, Backend-Vorbereitungen, Logo-/Hotfix-Iterationen).
> - Backend: neue `get_current_user_optional`-Dependency, serverseitiger Filter
>   (Anonyme + Non-Admins → nur public; Admins → alles inkl. amber „intern"-Badge).
> - **QA-Sub-Agent-Review** durch (3 SOLLTE + 2 NICE, kein KRITISCH). Alle Befunde
>   sofort gefixt im Hotfix `W.patchnotes-intern-qa`: `current_version()` skippt
>   internal-Einträge (kein Leak via `/api/health`), JWT-Errors werden geloggt
>   (Defense-in-Depth), Duplikat-Assert, Code-Hygiene.
> - **Hygiene-Streifzüge:** features-data.ts um #1/#6-Bullets ergänzt; 3 alte Tags
>   nachgezogen (`W.meine-daten` / `W.legal` / `W.hetzner`); 2 neue Tags gesetzt
>   (`W.patchnotes-intern` / `W.patchnotes-intern-qa`).
> - **Roadmap-Pflege:** „Patch-Notes aufgeräumt" als done markiert; 3 neue
>   P1-Items unter „Meine Daten" als strukturierte „Gefahren-Bereich"-Sektion
>   (Solves zurücksetzen ~0.5d → Tracking-Daten zurücksetzen / Reset to factory
>   ~1d → Account-Löschung auch hier ~2h).
>
> Commits: `a2f19fb` · `5119677` · `fbae115` · `8626263` · `7fd0012`.

### 🔜 Backlog jetzt (in Reihenfolge)

1. **#2 Average-PBs** — kleiner farbiger Punkt an ao5/ao12-Rekorden in der
   Solve-Liste (~30 Min, Backend-Logik `avg_pb_progression` existiert schon).
2. **#3 Dashboard „Letzte Rekorde"** — kompakte Liste der letzten ~5 PB-Ereignisse
   mit Δ-Verbesserung, Klick führt zum PB-Verlauf-Chart.
3. **Danger-Zone „Meine Daten"** — die 3 Lösch-Aktionen (~1.5-2 Tage gesamt,
   inkl. 2 neue Backend-Endpoints + Frontend-Sektion).
4. **#43 Coolify-HTTPS** — Howto schreiben (~10 Min Doku), eigentliche
   Server-Arbeit ist 👤.
5. **Phase 6 (~05.06.2026)** — apex `cubetracker.de` → Hetzner + Render abbauen
   (3 Services) + `feature/W-api-prefix` → `main` konsolidieren + GitHub-Default
   auf `main` (zwischenzeitlich am 2026-05-27 von `feature/W-multi-user-web` auf
   `feature/W-api-prefix` zwischen-korrigiert; in Phase 6 dann auf `main`).

**🚨 Start-Selbsttest (Projekt-Wurzel / Hooks):** siehe Box direkt im Block darunter.
**Live-Setup-Details** (Coolify-UUIDs, ntfy-Topic, etc.): siehe „AKTUELLER
PRODUKT-STAND"-Block darunter — Inhalt unverändert gültig, nur sein Backlog
ist überholt (#5 ist erledigt, neuer Backlog steht hier oben).

---

## ⭐⭐⭐ AKTUELLER PRODUKT-STAND (2026-05-25, Abend) — #1+#6 LIVE · Auto-Deploy rund · Prozess-Härtung

> ### 🚨 ALLERERSTES BEIM START (sonst läuft die halbe Automatik nicht!)
> **Wir arbeiten in der Claude-DESKTOP-App (Cowork/Code), nicht im Terminal-CLI.**
> Die App lädt `.claude/` (Hooks, Skills, Sub-Agents, CLAUDE.md) **nur aus der
> PROJEKT-WURZEL** — und **„Ordner hinzufügen" reicht NICHT** (das gibt nur Datei-Zugriff,
> lädt KEINE Config). Die Projekt-/Session-Wurzel MUSS daher **`D:\Projekte\cubetracker`**
> sein (den Repo-Ordner als Projekt öffnen — NICHT als Unterordner unter `D:\Claude-Projekte`
> „hinzufügen").
>
> **Konkret:** in der Claude-App eine **neue Session/Projekt mit Wurzel
> `D:\Projekte\cubetracker`** öffnen. Läuft die Session aus `D:\Claude-Projekte`, schlafen
> ALLE Hooks (ntfy weg, kein Patch-Notes-/Commit-Reminder, kein Dev-Guard, kein
> Session-Start-Kontext) — genau das war am 2026-05-25 der Fall.
>
> **Start-Selbsttest:** kommt ein Session-Start-Kontext? Kommt am Turn-Ende ein ntfy-Ping
> (Topic `jjY2OjY`)? Wenn nein → Repo ist nicht die Projekt-Wurzel.

**Live-Stand:** cubetracker.de läuft auf Hetzner. **Live-Branch = `feature/W-api-prefix`**
(= einzige Wahrheit für Code UND Doku). Versions-Badge: `W.meine-daten`. **Auto-Deploy
funktioniert** (Push auf W-api-prefix → GitHub-Action deployt gezielt Frontend und/oder
Backend via Coolify-per-App-API; beidseitig bewiesen).

**Heute live gegangen:**
- **#1 Impressum + Datenschutz** (`/impressum`, `/datenschutz`, öffentlich, Footer-Links):
  offizielle e-recht24-Texte + App-Ergänzungen. **Kein Cookie-Banner** (nur funktionales
  Login-Cookie). Kontakt **datenschutz@cubetracker.de** → **Forward Email** (Weiterleitung
  ans Betreiber-Postfach, verschlüsselter DNS-TXT bei INWX). Telefon raus, Adresse drin.
  Pflichtangaben: `webapp/frontend/src/lib/legal-data.ts`.
- **#6 „Meine Daten"-Panel** (Verwaltung → „Meine Daten"): Ownership-Botschaft + prominenter
  Voll-Backup-Download. Helper `webapp/frontend/src/lib/backup.ts` (DRY mit BackupPanel).
- **Patch-Notes + Roadmap synchronisiert:** 3 Patch-Notes (W.meine-daten/legal/hetzner);
  #1+#6 in `roadmap-data.ts` als `done` markiert.
- **QA-Review** (Sub-Agent) durch: Features sauber (kein Auth-Bypass/Datenleck); SOLLTE/NICE gefixt.
- **Auto-Deploy-Bug gefixt:** Multi-Commit-Push brach die Pfad-Erkennung (fetch-depth 2→0);
  **post-git-commit-Hook gehärtet** (warnt jetzt bei feat/fix OHNE Patch-Note).

**NÄCHSTER SCHRITT — Backlog in dieser Reihenfolge:**
1. **#5 Patch-Notes intern/öffentlich:** `internal: bool` pro PatchNote in
   `webapp/changelog/data.py` + Filter (Admin sieht alles, User nur öffentliche/geglättete).
   Bestehende Einträge einmal kuratieren.
2. **#2 Average-PBs:** kleiner farbiger Punkt an ao5/ao12-Rekorden in der Solve-Liste
   (Backend-Logik `avg_pb_progression` existiert).
3. **#3 Dashboard „Letzte Rekorde":** kompakte Liste der letzten ~5 PB-Ereignisse.

**OFFEN / HÄRTUNG:**
- **#43 Coolify-API über HTTPS** (QA-KRITISCH): `deploy.yml` curlt Coolify über HTTP →
  `COOLIFY_TOKEN` unverschlüsselt. Braucht Coolify hinter HTTPS (Domain+Cert). Kurzfristig
  Hobby-vertretbar; Token klein halten + rotieren.
- **Git-Tags** seit `wca-comps` nicht gesetzt — heutige Patch-Notes ungetaggt. Optional
  nachziehen (Tag-Falle: erst `git commit` verifizieren, DANN `git tag`).
- **features-data.ts** nicht für #1/#6 ergänzt (keine „Capability"-Features — minor).
- **Phase 6 (~05.06.):** apex `cubetracker.de` → Hetzner (A 178.105.103.78) + Render abbauen
  (3 Services) + `feature/W-api-prefix` → `main` konsolidieren. Bis dahin Render = Rollback.
- **MAINTENANCE.md** noch nie gelaufen — bei Gelegenheit „lauf MAINTENANCE.md durch".

**Infra-Kurzref:** Hetzner CPX22 `178.105.103.78`; Coolify-UI `http://178.105.103.78:8000`.
Frontend-App-uuid `pcixgncs671tifdx9e3rxr7h`, Backend-App-uuid `w3dw05zc8nv2izxa3v2qi911`.
Auto-Deploy: GitHub-Secret `COOLIFY_TOKEN` + `.github/workflows/deploy.yml`. ntfy-Topic `jjY2OjY`.

---

## ⭐⭐ (überholt, siehe Block oben) LETZTER STAND (2026-05-25, später) — DOKU-KONSOLIDIERUNG + BRANCH-SINGLE-SOURCE + MAINTENANCE

**Heute (Nachmittag/Abend) aufgeräumt — alles auf den aktuellen Stand gebracht:**

- **Doku Render→Hetzner nachgezogen** (7 .md-Files): README, webapp/README, BACKUP,
  CLAUDE, CHANGELOG, lessons-archive, ROADMAP. Commit `dfd4d28` (entstand zuerst auf
  `feature/W-multi-user-web`, jetzt auf den Live-Branch konsolidiert).
- **5 Roadmap-Backlog-Punkte in die App-Roadmap (P1) aufgenommen** — Impressum/Datenschutz,
  Meine-Daten-Panel, Patch-Notes-Cleanup, Average-PB-Punkt, Dashboard-Rekorde. Commit
  `0f434d7` auf `feature/W-api-prefix` (live, deployt). Standen vorher nur hier im Handoff.
- **🔑 BRANCH-KONSOLIDIERUNG (wichtig!):** Doku + diese NEXT_SESSION wurden auf den
  Live-Branch **`feature/W-api-prefix`** geholt → der ist jetzt die **EINE Wahrheit für
  Code UND Doku**. **`feature/W-multi-user-web` ist EINGEFROREN** (nur noch Render-Rollback;
  NICHT mehr committen — jeder Push deployt sonst Render neu).
  → **AB JETZT: alle Änderungen NUR auf `feature/W-api-prefix`.**
- **`MAINTENANCE.md` neu** — periodischer Gesundheits-/Hygiene-Runbook (Git, Live-App,
  Doku-Konsistenz, Backups, Security, Build, Kosten). Ergänzt `/abschluss` (Session-Ende)
  + `/audit` (Setup). Empfehlung: ~monatlich + vor/nach großen Änderungen durchlaufen.
  Später evtl. als `/maintenance`-Command.
- **🚀 AUTO-DEPLOY LIVE + verifiziert** (`.github/workflows/deploy.yml`): Push auf
  `feature/W-api-prefix` → GitHub-Action deployt gezielt die geänderte App (Frontend
  `uuid=pcixgncs671tifdx9e3rxr7h` / Backend `uuid=w3dw05zc8nv2izxa3v2qi911`) via
  Coolify-per-App-API (GH-Secret `COOLIFY_TOKEN`). End-to-End getestet (Marker
  rein→live ~20s→raus). **„push = live"** — Backend braucht KEINEN manuellen Redeploy
  mehr. **OFFEN:** alten generischen Coolify-Webhook (GitHub → Settings → Webhooks,
  id 630590452) löschen, sonst Doppel-Deploys.

**Nächster echter Schritt:** Roadmap-Backlog #1 = **Impressum + Datenschutz** (`/impressum`
+ `/datenschutz` als SPA-Routen + Footer, KEIN Cookie-Banner). User liefert echte
Impressums-Daten (Name/Anschrift/E-Mail). Danach in Reihenfolge: Meine-Daten-Panel →
Patch-Notes-Cleanup → Average-PB-Punkt → Dashboard-Rekorde.

**Offene Mini-Punkte:** apex `cubetracker.de` zeigt noch auf Render (301→www) — wird in
Phase 6 (05.06.) mit dem Render-Abbau erledigt. Live-App läuft auf **www.cubetracker.de**.

---

## ⭐⭐ (überholt, siehe Block oben) LETZTER STAND (2026-05-25) — POST-MIGRATION: #4 erledigt + Auto-Deploy + Roadmap-Backlog

**Migration läuft stabil live** (cubetracker.de auf Hetzner). Heute aufgeräumt + Roadmap besprochen.

**Erledigt heute (alles auf Branch `feature/W-api-prefix`):**
- **#4 Render-Bezüge raus** (live): Login-„Render-Free schläft"-Tipp entfernt, Roadmap **P2 = grün/erledigt**
  (neuer `done`-PhaseStatus + Badge), Render-Erwähnungen in Code-Kommentaren bereinigt. Commits `d2806b3` + `4d8872b`.
- **Auto-Deploy (Frontend)** eingerichtet: EIN GitHub-Webhook (push) → Coolify deployt das **Frontend**
  automatisch bei jedem Push. **Monorepo-Lektion:** zwei Webhooks für ein Repo → Coolify dedupliziert den
  Commit → nur EINE App deployt (zufällig welche); darum nur EINER, fürs Frontend.
  → **Backend-only-Änderungen weiterhin manuell „Redeploy"** in Coolify (selten). Volle Beidseitig-Automatik
  ginge via Deploy-Webhooks (`…/api/v1/deploy?uuid=…`) + Coolify-API-Token (später optional).
- **Coolify-UUID-Korrektur:** Frontend-App-URL = **`pcixgncs671tifdx9e3rxr7h`** (NICHT `c45fw9k0…` — das ist
  nur Anzeigename/`resourceName`!). Backend-App-URL = `wvj3lwq00uuw29uqf5y47vhq`. Container-Prefixe wieder anders.

**📋 ROADMAP-BACKLOG (besprochen 2026-05-25 — Reihenfolge fix, alles außer #4 noch offen):**
1. ✅ **#4 Render-Bezüge** — erledigt (s.o.).
2. **#1 Recht (HÖCHSTE Prio):** `/impressum` + `/datenschutz` (SPA-Routen + Footer). **KEIN Cookie-Banner**
   (nur funktionale Auth-Cookies, kein Tracking). Privat-Hobby; kommerziell wäre GPL-konform (Hosting löst
   keine Quellcode-Pflicht aus, nur Distribution → GitHub public reicht). Analytics später nur cookieless
   (Umami/Plausible). User füllt echte Daten (Name/Anschrift) via Generator (e-recht24). **Kein Rechtsrat.**
3. **#6 User-Backup sichtbar:** „Meine Daten"-Panel in Account-Settings — Button „Vollständiges Backup
   herunterladen" + „Importieren" + „letztes Backup vor X" + beruhigender Satz (Daten gehören dir + tägliche
   Server-Backups/EU). Nutzt bestehende Backup/Export-Endpoints.
4. **#5 Patch-Notes Admin/User:** `internal: bool` pro PatchNote in `changelog/data.py` + optional geglättete
   `user_title`/`user_highlights`. API/Frontend filtert: Admin sieht alles, User nur nicht-interne/geglättete.
   Bestehende Einträge einmal kuratieren.
5. **#2 Average-PBs:** ao5/ao12-Rekord-Solve-IDs ausgeben (analog `pb_solve_ids`) + in der Solve-Liste an der
   ao5/ao12-Zahl einen **kleinen farbigen Punkt** (dezent). Backend-Logik (`avg_pb_progression`) existiert schon.
6. **#3 Dashboard „Letzte Rekorde":** kompakte Liste der letzten ~5 PB-Ereignisse (🏆 Cube + Metrik + Zeit +
   „vor X Tagen" + Δ-Verbesserung), Klick → Analyse-PB-Chart.

**⏰ Erinnerung gesetzt (Kalender 05.06.2026):** Phase-6 — apex `cubetracker.de` auf Hetzner umstellen +
Render abbauen + Branch konsolidieren. Rollback bis dahin = INWX `www` zurück auf Render-CNAME.

**Workflow ab jetzt:** Ich pushe Frontend-Änderungen auf `feature/W-api-prefix` → Coolify deployt das
Frontend automatisch. Backend-Änderungen → ich pushe + sage dir Bescheid, du klickst „Redeploy" am Backend.

---

## ⭐⭐ LETZTER STAND (2026-05-22) — HETZNER-MIGRATION LIVE ✅✅ (cubetracker.de auf Hetzner!)

**Status:** Migration **KOMPLETT + LIVE**. **cubetracker.de läuft jetzt auf Hetzner** (Coolify),
nicht mehr auf Render. Daten (13.590 Solves + alle 13 Tabellen) 1:1 migriert + verifiziert, HTTPS via
Let's Encrypt gültig, vom User am Handy getestet (Login + Daten aktuell). **Render läuft noch parallel
als Rollback** (1–2 Wochen).

**Live-Setup:**
- **Server:** Hetzner CPX22, IP **178.105.103.78**, `ssh root@178.105.103.78` (Key id_ed25519). Coolify v4 UI :8000.
- **Frontend-App** (Coolify-UUID `c45fw9k0...`, Container-Prefix `pcixgncs671...`): Dockerfile, Port 80,
  Domains `https://www.cubetracker.de,http://178-105-103-78.sslip.io`. Let's-Encrypt-Cert (R12, gültig bis
  20.08.2026, Traefik auto-renew). nginx serviert SPA + proxyt `/api` an `cubetracker-backend:8000` (mit Resolver).
- **Backend-App** (Coolify-UUID `wvj3lwq...`, Container-Prefix `w3dw05zc8...`): Dockerfile, Port 8000,
  Network-Alias `cubetracker-backend`, **Domains+Labels LEER** (privat, nur intern). Env: DATABASE_URL(intern),
  JWT_SECRET, CUBETRACKER_PROD=1, WEBAPP_FRONTEND_ORIGIN+FRONTEND_URL=https://cubetracker.de, ADMIN_EMAILS.
  **RESEND_API_KEY fehlt noch** (Mails inaktiv, Logins gehen).
- **Postgres** (Coolify `a10kg8z6...`): PG **16**, gefüllt + `VACUUM ANALYZE` gelaufen (Queries ~4ms).
  Render war PG **18** → Dump via `postgres:18`-Tools, `transaction_timeout`-SET rausgefiltert, `--clean`-Restore,
  ON_ERROR_STOP. Dump-Datei auf Server unter `/root/migration/render.sql`.
- **DNS bei INWX** (NICHT Cloudflare — das „cloudflare" in den Headern war Renders eigenes Cloudflare-for-SaaS!):
  `www` = **A 178.105.103.78, DNS-only**. apex `cubetracker.de` zeigt **noch auf Render** (216.24.57.1) →
  301-Redirect auf www → landet auf Hetzner. E-Mail-Records (send-MX/TXT, _dmarc, resend._domainkey) unangetastet.

**Branch `feature/W-api-prefix`** = der live-deployte Branch (NICHT gemergt). Commits:
`8f69642`/`94cd1d5`/`fa956e4` (/api-Prefix + Dockerfiles + nginx-Proxy), `1abf8a2` (changelog-Doppelprefix-Fix +
Regr.-Test), `3902c2f` (nginx-Resolver gegen Backend-IP-Cache), `672d313` (Frontend health+changelog-Pfad-Fix).

**🔧 OFFEN (Phase 5/6, nicht dringend):**
1. **RESEND_API_KEY** (rotiert!) am Backend in Coolify setzen → Backend-Redeploy. Sonst keine Verifizierungs-/
   Passwort-Mails (existierende Logins funktionieren).
2. **apex `cubetracker.de`** sauber nachziehen **VOR Render-Abbau**: bei INWX A-Record 216.24.57.1 →
   178.105.103.78, UND `https://cubetracker.de` zur Coolify-Frontend-Domain hinzufügen (sonst apex→503).
3. **Render 1–2 Wochen als Rollback** behalten. **Rollback** = INWX `www` zurück auf CNAME
   `cubetracker-frontend.onrender.com`. Danach Render abbauen (Postgres-90d-Deadline ~2026-08-08 wird obsolet).
4. **Coolify-Postgres-Backups** (off-site) einrichten — aktuell KEIN automatisches Backup!
5. Branch-Strategie klären: `feature/W-api-prefix` ist live, `feature/W-multi-user-web` war Render — ggf. mergen/umbenennen.

**Lessons (Cutover):** (a) DNS-TTL VOR Cutover senken — sonst trifft die erste LE-ACME-Challenge noch die alte
IP (1 Fehlversuch); Fix: Frontend-Container-Restart triggert erfolgreichen Retry, sobald DNS global propagiert.
(b) Coolify: Container-Name ≠ App-UUID (`coolify.resourceName`). (c) Domain-Änderung → „Reset Labels to Defaults".
(d) Frontend-`api.get`-Pfade NIE mit `/api` prefixen (baseURL ist schon `/api`).

---

## ⭐ (überholt, siehe Block oben) LETZTER STAND (2026-05-21, abends) — HETZNER-MIGRATION (P2): ARCHITEKTUR LÄUFT ✅

**Status:** Eine-Domain-Architektur auf Hetzner/Coolify **funktioniert end-to-end**,
getestet über `http://178-105-103-78.sslip.io`:
- `/` → 200 (Frontend-SPA)
- `/api/health` → 200 `{"status":"ok","mode":"prod","version":"...W.pb-history"}` (durch Frontend-nginx → Backend)
- `/api/auth/me` → 401 (Backend verarbeitet Auth-Routen korrekt)

**Render läuft unberührt parallel** — cubetracker.de zeigt noch auf Render, KEIN Cutover.
DB auf Hetzner ist noch **leer** (Daten-Migration steht aus).

**Server/Coolify:** Hetzner CPX22, IP **178.105.103.78**, SSH `ssh root@178.105.103.78`
(Key `id_ed25519`). Coolify v4 UI `http://178.105.103.78:8000`. Projekt `my-first-project`,
env `production`, Netz `coolify`.
- **Postgres** (Resource `a10kg8z6...`): läuft, **leer**. Interne URL in Backend-Env.
- **Backend-App:** Coolify-UUID **`wvj3lwq00uuw29uqf5y47vhq`** (applicationId 1; Container-Name-
  Prefix `w3dw05zc8...` — das ist NICHT die App-UUID!). Dockerfile, Base `/webapp`, Port 8000,
  Branch `feature/W-api-prefix`, **Domains LEER**, **Labels LEER** (= privat, nur intern),
  Network-Alias `cubetracker-backend`. Env gesetzt: DATABASE_URL(intern), JWT_SECRET,
  CUBETRACKER_PROD=1, WEBAPP_FRONTEND_ORIGIN+FRONTEND_URL=https://cubetracker.de, ADMIN_EMAILS.
  RESEND_API_KEY fehlt (optional).
- **Frontend-App:** Coolify-UUID **`c45fw9k0hzpgh2xxuveopqj7`** (applicationId 2; Container-Prefix
  `pcixgncs671...`). Dockerfile, Base `/webapp/frontend`, Port **80**, Domain
  `http://178-105-103-78.sslip.io`, VITE_API_BASE=/api. nginx serviert SPA + proxyt `/api` an
  `cubetracker-backend:8000`.

**Branch `feature/W-api-prefix`** (Hetzner-Branch, NICHT der Render-Branch): Commits `8f69642`
(/api-Prefix), `94cd1d5` (Backend-Dockerfile), `fa956e4` (Frontend-Dockerfile + nginx.conf).

**⚠️ COOLIFY-LESSONS (heute teuer gelernt — beim nächsten Mal Zeit sparen):**
1. **Container-Name ≠ App-UUID.** Container = `w3dw05zc8...` (`coolify.name`), App-UUID in der
   Browser-URL = `wvj3lwq...` (`coolify.resourceName`). App immer über Resources-Liste/URL finden,
   nie über den Container-Namen. Per SSH prüfbar:
   `docker inspect <container> --format '{{json .Config.Labels}}' | tr ',' '\n' | grep coolify.resourceName`.
2. **Domain leeren reicht NICHT** — die generierten Traefik-Labels bleiben kleben (Redeploy schreibt
   sie immer wieder). Fix: App → Configuration → ganz unten **„Labels" → „Reset Labels to Defaults"**
   (Bestätigung: App-URL `/` eintippen) → Redeploy.
3. **nginx cached die Backend-IP beim Start.** Nach jedem Backend-Redeploy (neue Container-IP) → 502,
   bis das **Frontend neu gestartet** wird. Dauerlösung = FIX B unten (nginx-Resolver).

**🔧 2 OFFENE FIXES (vor dem Cutover, beide auf `feature/W-api-prefix`):**
- **FIX A — Bug (Backend):** `webapp/api/changelog.py` Z.18:
  `APIRouter(prefix="/api", tags=["changelog"])` → `APIRouter(tags=["changelog"])` (prefix RAUS!).
  `main.py` wrappt schon `/api` drum → sonst landet die Route bei `/api/api/changelog` (per curl
  bestätigt: 200), und `/api/changelog` = 404 → Changelog-Modal tot. NUR dieser Router betroffen
  (alle anderen haben saubere Prefixes wie `/auth`, `/stats`). Danach **Backend-Redeploy**, Test
  `/api/changelog`=200.
- **FIX B — Härtung (Frontend):** `webapp/frontend/nginx.conf`, im `location /api/` Resolver ergänzen:
  ```
  location /api/ {
      resolver 127.0.0.11 valid=10s ipv6=off;
      set $cbe http://cubetracker-backend:8000;
      proxy_pass $cbe;
      proxy_http_version 1.1;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
  }
  ```
  (Variable in `proxy_pass` erzwingt Laufzeit-DNS via Docker-DNS 127.0.0.11 → kein 502 mehr nach
  Backend-Redeploys/Cutover.) Danach **Frontend-Redeploy**.

**EXAKTE NÄCHSTE SCHRITTE:**
1. FIX A + FIX B committen + pushen (feature/W-api-prefix), dann **Backend- + Frontend-Redeploy**.
   Test: `/api/changelog`=200, `/api/health`=200, `/`=200.
2. **Phase 3 Daten:** `pg_dump` von Render-External-DB-URL (Render-Dashboard) → `pg_restore` in
   Coolify-Postgres (auf dem Server). Tabellen-Counts (users/solves/sessions/...) Render vs. Hetzner
   vergleichen. Browser-Voll-Test auf sslip.io (Register/Login, Stats, PB-Chart, Changelog).
3. **Phase 4 Cutover:** cubetracker.de A-Record → 178.105.103.78; Frontend-Domain in Coolify →
   cubetracker.de (VITE_API_BASE bleibt /api, KEIN Rebuild); WEBAPP_FRONTEND_ORIGIN+FRONTEND_URL →
   https://cubetracker.de; Let's-Encrypt automatisch. TTL vorher senken, Rollback = A-Record zurück.
4. **Phase 6:** 1–2 Wochen parallel, dann Render abbauen + Coolify-Postgres-Backups (off-site).

**Runbook:** `docs/hetzner-migration-runbook.md`. **ntfy:** `jjY2OjY`. **Render-Postgres-Deadline:** ~2026-08-08.

---

## ⭐ LETZTER STAND (2026-05-21, früher Stand — ÜBERHOLT vom Block oben) — HETZNER-MIGRATION (P2) MITTENDRIN

**Status:** Backend läuft LIVE auf Hetzner via Coolify + DB verbunden. Frontend-
Deploy + One-Domain-Routing = nächster Schritt. **Render läuft unberührt parallel
weiter** (KEIN Cutover bisher — cubetracker.de zeigt noch auf Render).

**Server:** Hetzner CPX22, Ubuntu 24.04, Falkenstein, IP **178.105.103.78**.
SSH: `ssh root@178.105.103.78` (Key `~/.ssh/id_ed25519`, passwortlos, funktioniert).
Coolify v4 läuft (UI `http://178.105.103.78:8000`, Admin-Account angelegt).

**Coolify (Projekt „My first project", env production, Server „localhost", einziges Netz `coolify`):**
- **Postgres** `postgres:16-alpine` — läuft, DB **leer**. Interne URL steht in Backend-Env.
- **Backend** (App-UUID `w3dw05zc8nv2izxa3v2qi911`): Build Pack **Dockerfile**, Base `/webapp`,
  Port 8000, Branch `feature/W-api-prefix`. **Läuft, `/api/health`=200 getestet.** DB-Verbindung
  verifiziert (admin-bootstrap-Query lief). Env: DATABASE_URL(intern), JWT_SECRET, CUBETRACKER_PROD=1,
  WEBAPP_FRONTEND_ORIGIN+FRONTEND_URL=https://cubetracker.de, ADMIN_EMAILS=henning.fietz@hotmail.de.
  RESEND_API_KEY noch NICHT gesetzt (optional).
- **Frontend** (App-UUID `c45fw9k0hzpgh2xxuveopqj7`): angelegt, Branch `feature/W-api-prefix`,
  Base `/webapp/frontend`, VITE_API_BASE=/api. **NOCH NICHT korrekt deployed** (muss auf Dockerfile).

**Branch `feature/W-api-prefix`** (NICHT gemergt, NICHT der Render-Branch!) — Migrations-Commits:
- `8f69642` /api-Prefix (main.py Router unter /api, api.ts API_BASE=/api, REFRESH_COOKIE_PATH=/api/auth, test_api_prefix.py)
- `94cd1d5` `webapp/Dockerfile` (Backend, python:3.12-slim, mirror Render)
- `fa956e4` `webapp/frontend/Dockerfile` + `webapp/frontend/nginx.conf` (Frontend nginx-Proxy)

**ROUTING-ENTSCHEIDUNG (wichtig!):** Coolify-Path-Routing **strippt `/api`** → Konflikt mit
unserem /api-Backend (gab FastAPI-404). Lösung: **Frontend-nginx proxyt `/api` intern ans Backend**
(`proxy_pass http://cubetracker-backend:8000;` OHNE Slash → kein Strip). Eine Domain, kein CORS.
Backend braucht KEINE öffentliche Domain mehr.

**EXAKTE NÄCHSTE SCHRITTE (genau hier weitermachen):**
1. **Backend** in Coolify: General → Network → „Network Aliases" = `cubetracker-backend` → Save.
   Domains-Feld **leeren** → **Redeploy**.
2. Per SSH verifizieren: `cubetracker-backend:8000` intern erreichbar.
3. **Frontend** in Coolify: Build Pack → **Dockerfile**, Ports Exposes → **80**,
   Domain → `http://178-105-103-78.sslip.io` → **Deploy**.
4. **Testen:** `http://178-105-103-78.sslip.io` lädt + `…/api/health`=200 (via Proxy). Voll-Test (Register/Login, Stats, PB-Chart).
5. **Phase 3 Daten:** `pg_dump` (Render external DB-URL aus Render-Dashboard) → `pg_restore` (Coolify-Postgres, auf dem Server) → Tabellen-Counts vergleichen.
6. **Phase 4 Cutover:** cubetracker.de A-Record → 178.105.103.78; Frontend-Domain in Coolify → cubetracker.de (VITE_API_BASE bleibt /api, KEIN Rebuild — relativ); WEBAPP_FRONTEND_ORIGIN+FRONTEND_URL → https://cubetracker.de; Let's-Encrypt automatisch. TTL vorher senken, Rollback = A-Record zurück.
7. **Phase 6:** 1–2 Wochen parallel, dann Render abbauen + Coolify-Backups (Postgres, off-site) einrichten.

**Runbook:** `docs/hetzner-migration-runbook.md`. **ntfy:** Topic `jjY2OjY`. **Render-Postgres-Deadline:** ~2026-08-08.

---

## ⭐ LETZTER STAND (2026-05-20) — Claude-Code-Setup-Audit (Welle 1 + 2)

**Worum ging's:** Großer Audit unseres `.claude/`-Setups gegen die offizielle
Claude-Code-Doku (Ziel: selbst-verbesserndes Methodik-System). **KEIN App-Code
angefasst** — reine Tooling-/Konfig-/Doku-Arbeit. App läuft unverändert auf
cubetracker.de.

**3 Commits (alle gepusht, Branch `feature/W-multi-user-web`):**
- `7330b81` (Tag `v2.0.0-alpha.W.setup-audit-quickwins`): 10 Quick-Wins
  (Allow/Deny-Listen, Env-Timeout, qa-reviewer-Subagent, `rules/discipline.md`,
  `docs/lessons-archive.md`, CLAUDE.md geschrumpft).
- `b3312fc` (Tag `v2.0.0-alpha.W.setup-audit-phase-d`): P3 `pre-git-tag-check.sh`
  (blockt `git tag` bei dirty tree), H2 `post-push-failure-diagnose.sh`,
  S2 `agents/patch-notes-writer.md`.
- `31ae57d` (Tag `v2.0.0-alpha.W.setup-audit-welle2`): `/audit`-Command,
  PreCompact-Checkpoint-Hook, ntfy-Stop-Hook, CM2/CM5-Context-Doku in CLAUDE.md.

**⚠ WICHTIG beim nächsten Start:** Die neu registrierten Hooks (P3, H2,
PreCompact, ntfy-Stop) werden erst bei einem **Claude-Code-Neustart** aktiv —
der `/hooks`-Befehl ist in dieser Umgebung NICHT verfügbar, also Neustart =
Aktivierung. Beim Start evtl. Hook-Änderungen bestätigen.

**Neue Fähigkeiten im Setup:**
- **`/audit <sektion>`** — reproduzierbarer Doku-vs-Setup-Audit (z.B. `/audit mcp`),
  schreibt Report selbst in `docs/audit-2026-05-20.md`.
- **PreCompact-Checkpoint** — friert vor Kompaktierung den git-Stand nach
  `.tmp/last-compact-checkpoint.md`. Nach Kontextverlust: dieses File + diese
  NEXT_SESSION.md lesen.
- **ntfy-Auto-Ping** (Topic `jjY2OjY`) via `stop-ntfy-notify.sh` bei Turn-Ende.

**OFFEN — Audit (jederzeit via `/audit` nachholbar, niedrige Prio):**
mcp, output-styles, status-line, plugins. Zurückgestellt: M4 (NEXT_SESSION-
Update-Hook), S3 (audit-loop-Subagent — „erst wenn die anderen Sektionen durch
sind"). Add-ons offen: SC1 (`/abschluss`-Frontmatter-Härtung), SC3
(`/patchnote`-Command) — Frontmatter-Felder vor Bau verifizieren.

**OFFEN — App (eigentliche Produktarbeit, Empfehlung: hier weitermachen):**
- **PLL-Renderer** (`scripts/` untracked: `render_pll.py`, `pll_cases.py`,
  `render_collage.py`, `render_ua_variants.py` + Bilder unter
  `webapp/frontend/src/assets/pll/`). ~20 Min bis fertig: restliche
  Permutationen rendern + `lib/pll-images.ts` + Einbindung analog OLL.
  → war der Pivot-Plan nach dem Audit.
- **P1.6 PWA-Setup** (~1 Tag) — letztes offenes P1-Item.
- Danach P2 Hetzner-Migration (Mitte Juli, vor Render-Postgres-90d-Limit ~2026-08-08).

**OFFENE USER-AKTIONEN (carry-over):**
- GITHUB_TOKEN auf Render setzen (Admin-Workflow-Phase-3, sonst kein Auto-Issue).
- RESEND_API_KEY rotieren (alter Chat-Key revoken).
- Phone-Re-Test der letzten Wellen (Voice-Alert / Penalty-Quick / Custom-Scramble /
  2D-Net / 9 inoff. Cubes / Admin-Toggle).

**Working-Tree:** clean (nur untracked `scripts/` + `.claude/Protokoll_Session_20_05_2026.docx`).

---

> **WICHTIG (User-Festlegung 2026-05-03):** Phase 9 (Distribution → v1.0)
> ist KEIN End-Punkt. **Nach v1.0 wird weiter an der App gebaut.**
> Phase 9 ist nicht-destruktiv: Source-Code aenderungen sind minimal
> (StaticFiles-Mount, %LOCALAPPDATA% statt backend/data/, PyInstaller-
> spec). Dev-Workflow `uvicorn --reload` + `npm run dev` bleibt parallel
> zur ausgerollten App nutzbar. Neue Phasen 10/11/... werden danach
> normal weitergebaut und als Updates ausgerollt. KEIN feature-freeze
> nach v1.0.
>
> **TODO fuer spaeter (User-Notiz 2026-05-03):** Code-Orchestrator-
> Plan vs. Cubetracker-Praxis ehrlich vergleichen. Cubetracker wurde
> ohne strikte Anwendung des Code-Orchestrator-Workflows gebaut, hat
> aber organisch sehr aehnliche Disziplinen entwickelt (Snapshots vor
> Phasen, Modul-Check vor Bau, ROADMAP-/NEXT-SESSION-Pflicht-Updates,
> Test-Pyramide pure→service→api). Vor naechstem Projekt: `project_
> code_orchestrator.md` lesen + Diff zwischen Plan und unserer Praxis
> erstellen, um den Plan auf Basis der Erfahrung nachzuschaerfen.
>
> **Parallel-Betrieb Dev + Prod auf demselben Rechner (User-Anforderung):**
> Phase 9 muss so konfiguriert werden, dass die ausgerollte App OHNE
> Konflikt parallel zur Dev-Umgebung laeuft. Saubere Trennung erforderlich:
> - **Port**: Dev=8000, Prod=8765 (Default, falls belegt nächster freier)
> - **DB**: Dev=backend/data/solves.db, Prod=%LOCALAPPDATA%\cubetracker\solves.db
>   — getrennt via `CUBETRACKER_DB_PATH`-Env oder Code-Default
> - **localStorage**: automatisch getrennt durch unterschiedliche Origins
>   (Browser isoliert per Origin)
> - **Versions-Badge im Header** zeigt klar welche Variante laeuft
>   (z.B. `v0.16-dev` vs `v1.0-installed`)
> - **Datenuebertragung Dev↔Prod via Backup/Restore-Endpoint** (Pflicht
>   in Phase 9)
>
> **LETZTER STAND (2026-05-17 abends, Session-Ende via /abschluss):**
> Multi-User-Web-Variante (webapp/) ist live auf cubetracker.de. Heute war
> ein Monster-Tag: 4 Wellen-Phasen + GPL-Migration + Vendor-Port + Admin-
> Workflow + 2 QA-Reviews = 11+ Commits, 14 Tags.
>
> **Tag-Block 1 (Quick-Wins-Sprint P1):**
>   - **P1.1 Voice-Alert** (`3928aaf`, tag `voice-alert`): WCA-Inspection
>     spricht "acht"/"zwoelf" (DE) oder "eight"/"twelve" (EN) statt
>     Sinus-Beep. Cascade-Setting in SettingsPanel: beep / de / en / off.
>   - **P1.2 Penalty-Quick-Buttons** (`fe3b1e8`, tag `penalty-quick`):
>     Nach jedem Save erscheinen +2 / DNF / Loeschen direkt unter dem
>     Timer — kein Weg mehr ueber die Letzte-Solves-Sidebar.
>   - **P1.3 Custom-Scramble-Input** (`2551a2d`, tag `custom-scramble`):
>     Edit-Button in der ScrambleCard. Eigenen Scramble eintippen
>     (z.B. Wettkampf-Scramble), Enter speichert, Esc bricht ab.
>   - **P1.4 Roadmap-Frontend** (`2050e74`, tag `roadmap-frontend`):
>     RoadmapModal mit P1-P6, Status-Badges, ✓-Markern fuer erledigte
>     Items. Trigger via Footer-Link + User-Menu.
>   - **QA-Fixes** (`3263f47`, tag `qa-fixes-p1`): 3 HIGH + 2 MEDIUM
>     aus Sub-Agent-Review gefixt.
>
> **Tag-Block 2 (Scramble-Bild + Toggle):**
>   - **P1.5 Scramble-Bild 2D-Net** (`120efac`, tag `scramble-image`):
>     Eigenbau-Cube-State-Simulator (lib/cube-net.ts, 250 Zeilen) +
>     SVG-Renderer (Cross-Layout). 20 Tests (Group-Orders, Inverse-
>     Invariante, Center-Invariante). Bundle +1.7KB gz.
>   - **Schnell-Toggle direkt in ScrambleCard** (`9b0c22b`, tag
>     `scramble-image-toggle`): Button "Bild an/aus" neben Eigene/Skip,
>     nur sichtbar bei 3x3 (User-Wunsch "nur was fertig ist").
>
> **Tag-Block 3 (GPL + csTimer-Vendor — grosses Refactor):**
>   - **GPL-Migration** (`545c680`, tag `gpl-license-migration`):
>     Cubetracker steht jetzt unter GNU GPL-3.0-or-later. LICENSE-File,
>     README-Sektion, package.json + pyproject.toml license-Fields.
>     Vorbereitung fuer csTimer-Code-Integration (selbst GPL-v3).
>   - **csTimer-Vendor-Port** (`cb03c16`, tag `cstimer-vendor-impl`):
>     Vendor-Folder webapp/frontend/src/lib/cstimer-vendor/ mit
>     mathlib, scramble, isaac, gearcube, redi, pyraminx, skewb,
>     mgmlsll + jQuery-Shim. Public-API getCstimerScramble().
>     Gear/Redi/Master-Pyraminx haben jetzt Random-State.
>   - **Ivy-Switch** (`866c624`, tag `cstimer-ivy-switch`): Ivy von
>     Eigenbau-BFS auf csTimer umgestellt (Konsistenz). Eigenbau bleibt
>     als Fallback.
>   - **+11 Puzzles** (`f28541e`, tag `cstimer-more-puzzles-impl`):
>     erst 14 neue Scramble-Types verkabelt (Dino, Floppy, Tower,
>     Helicopter, Gigaminx, Bicube, Bandaged-SQ1, Square-2, Curvy Copter,
>     Diamond, Megaminx-RS).
>   - **QA-Cleanup** (`b89f3f8`, tag `cstimer-more-puzzles-qa`): 7 von
>     11 broken (utilscramble + megaminx brauchen solver/-Files die wir
>     nicht haben). Wieder entfernt aus UI + Vendor. Inoff. Cubes-Liste
>     auf 9 finale (Ivy, Gear, Redi, Master Pyra, Master Skewb, FTO,
>     Dino, Floppy, Tower). COMMON_CUBE_TYPES erweitert um die 9.
>
> **Tag-Block 4 (Admin-Workflow-Refactor in 3 Phasen):**
>   - **Phase 1 admin-toggle** (`cb54770`): is_admin von Env-Var-Property
>     zu DB-Spalte. UI-Toggle '★ Admin abnehmen' / '☆ Admin machen' in
>     AdminUsersPanel. Migration + Bootstrap-Step in main.py:lifespan
>     promotet ADMIN_EMAILS-User auf is_admin=TRUE beim ersten Startup.
>     Safeguard 'letzter Admin'.
>   - **Phase 2 live-tests** (`059b5a5`): Neue Tabelle live_tests + 4
>     Endpoints + AdminLiveTestsPanel. Loest Workflow-Problem: Claude-
>     Test-Hinweise ('Phone-Test: X') verlieren sich im Chat. Admin
>     klickt PASS/FAIL/SKIP + schreibt Notiz.
>   - **Phase 3 live-tests-github** (`0a4b8f6`): services/github.py mit
>     create_issue + add_comment. Bei FAIL + Notiz → automatisches
>     GitHub-Issue (Labels live-test-fail/automated/phase:W.xyz).
>     Graceful Degradation ohne GITHUB_TOKEN.
>   - **QA-Fix** (`b763086`, tag `admin-workflow-qa`): Race-Condition
>     Admin-Safeguard via SELECT FOR UPDATE gefixt. GitHub-Calls jetzt
>     BackgroundTask. confirm() raus, 2-Klick rein. Skip-Filter ergaenzt.
>     Token-Logging defense-in-depth.
>
> **USER-ACTION (offen):** GITHUB_TOKEN auf Render setzen (PAT mit repo-
> Scope unter Environment-Tab im Backend-Service). Sonst kein Auto-Issue
> bei FAIL — bleibt aber graceful.
>
> **Folgewellen 2026-05-19/20 (Umlaut-Migration):**
>   - **W.umlauts** (`c00e2d8`): 1417 Ersetzungen über 164 Files. Deutsche
>     Texte wieder mit ä/ö/ü/ß statt ASCII-Substituten. Vendor-Files
>     (cstimer-vendor + scrambow-patched) bleiben unangetastet.
>   - **W.umlauts (followup)** (`a9408f9`): 5 manuelle Nachzieher
>     ("Laedt…" → "Lädt…" im Boot-Splash, "geprueft" → "geprüft").
>   - **W.umlauts-qa** (`1234798`): 487 weitere Replacements über
>     102 Files in 3 zusätzlichen Skript-Pässen. User-gefundener
>     Bestätigung-Bug + alle ähnlich übersehenen Worte (noetig/laeuft/
>     zusaetzlich/Empfaenger/zwoelf/etc.). Audit-Tool unter
>     `.tmp/umlaut_audit.py` dokumentiert.
>
> **PLL-Renderer-Arbeit ist weitergewachsen** (untracked):
>   - `scripts/pll_cases.py` (~10KB) — PLL-Case-Definitionen
>   - `scripts/render_collage.py` (~1.3KB)
>   - `scripts/render_ua_variants.py` (~2.8KB)
>   - `scripts/render_pll.py` (committed im W.umlauts-Push)
>   - PLL-Bilder im `webapp/frontend/src/assets/pll/`-Folder.
>   Geht weiter bei der nächsten Session, dann committen + in den
>   AlgTrainer einbinden.
>
> **Infra-Setup heute:** ntfy.sh als trusted endpoint in
> `~/.claude/settings.json` (User-Level). Permission-Pattern:
> `Bash(curl * https://ntfy.sh/*)`. ntfy-Topic: `jjY2OjY` (persoenlich).
>
> **WAS DU PARALLEL ANGEFANGEN HAST (untracked):**
> - `scripts/render_pll.py` — PIL-basierter PLL-Renderer im OLL-Stil
>   (700x500, gleiche Sticker-/Pill-/Arrow-Geometrie wie OLL).
> - `webapp/frontend/src/assets/pll/PLL_Ua.png` — erstes generiertes Bild
>   (Ua-Perm). Sieht visuell sauber aus, Indikatoren korrekt platziert.
> - Klarer Fortschritt zu **P5 "PLL-Bilder einbinden (analog OLL)"** aus
>   der Roadmap (~30 Min wenn alle 21 fertig).
>
> **OFFENE USER-AUFGABEN:**
> - **GITHUB_TOKEN auf Render setzen** (Admin-Workflow-Phase-3): PAT mit
>   repo-Scope, Env-Var auf Backend-Service. Sonst kein Auto-Issue bei
>   Live-Test-FAIL — bleibt graceful, kein Crash.
> - **Live-Test-Workflow ausprobieren**: Admin-Bereich → Live-Tests →
>   '+ Neu' → einen offenen Test aus dem Chat-Verlauf eintragen
>   (z.B. csTimer-Cubes durchklicken).
> - **Phone-Re-Test** der heutigen Wellen: Voice-Alert / Penalty-Quick /
>   Custom-Scramble / 2D-Net / 9 inoff. Scramble-Cubes / Admin-Toggle.
> - **PLL-Renderer fertig machen**: restliche 20 Permutationen aus
>   scripts/render_pll.py + frontend/src/lib/pll-images.ts anlegen.
> - **RESEND_API_KEY rotieren** (alter Chat-Key revoken).
>
> **NAECHSTE Schritte (P1-Sprint-Restplan):**
> - **P1.6 PWA-Setup** (~1 Tag) — Manifest + Service-Worker fuer Phone-
>   Homescreen-Install. Letztes offenes P1-Item.
> - Danach P2 Hetzner-Migration (Mitte Juli, vor Postgres-90d-Limit
>   2026-08-08).
>
> **NEU in Roadmap (durch heutige QA-Befunde):**
> - **Backend-Test-Suite einfuehren** (~1-2 Tage initial, P6) — aktuell
>   0% Coverage auf den Endpoints, pyproject.toml verweist auf nicht-
>   existierenden tests/-Folder.
> - **Alembic statt inline-Migrations** (~1 Tag, P6) — `ALTER TABLE IF
>   NOT EXISTS` ist Postgres-only, bricht auf SQLite. Niedrige Prio
>   solange wir nur Postgres-Prod nutzen.
> - **csTimer solver/-Files vendoren** (~1-2 Tage, P6) — schaltet
>   Helicopter, Gigaminx, Bicube, Bandaged-SQ1, Square-2, Curvy Copter,
>   Diamond + Megaminx-RS frei. Aktuell aus UI raus weil broken ohne
>   solver-Files.
> - **Dynamic-Import csTimer-Vendor** (Bundle-Split, P6 SOLLTE).
> - **Random-Move-Fallback fuer Dino/Floppy/Tower** (P6 SOLLTE).
>
> **INFRASTRUKTUR:**
> - Mitte Juli: Hetzner-Migration (vor Render-Postgres-90d-Limit
>   ~2026-08-08). Coolify-basiertes Setup.
>
> **WORKFLOW-NEU:**
> - Beim Start: SessionStart-Hook gibt Repo-Stand-Snapshot aus.
> - Bei jedem Bash-Aufruf: pre-bash-dev-server.sh blockt uvicorn/npm
>   run dev/vite (User-Override CUBETRACKER_ALLOW_LOCAL_DEV=1).
> - Nach git commit: Push-Reminder + Tag-Reminder.
> - Nach Edit von .ts/.tsx: localhost-Hardcode-Warner.
> - Bei "Session beenden": /abschluss-Skill ruft 8-Punkte-Check auf.
> - Stop-Hook (1x/Session): Mini-Backstop.
>
> ---
>
> **ARCHIV-ABSCHNITT (Stand 2026-05-04, Desktop-Phase 9):**
> Distribution-faehig + ausgerollt + live verifiziert.
> v1.0 hatte einen API-baseURL-Bug (hardcoded localhost:8000) — in v1.0.1
> behoben (relative URL via `import.meta.env.DEV`-check).
>
> **Lesson learned (Klassiker-Bug)**: bei SPA-mit-Backend in der
> ausgerollten App IMMER Frontend-API-baseURL durch env-vars steuern,
> NIE hardcoden. Faellt erst beim Distribution-Test auf, nicht im Dev.
>
> **Wie ein neuer Installer gebaut wird:** siehe `backend/BUILD.md`
> (3 Schritte: npm run build → PyInstaller → Inno Setup Compiler).
>
> **Naechster Strang: Phase 8.3.2 — PLL-Visualisierung.** User hat
> festgelegt dass die 21 PLL-Bilder im naechsten Rollout kommen.
> Implementierung analog zu OLL.
>
> **Phase 8.5 (Tag `v0.15`)** war 14 neue Volume/Speed/Streak-
> Achievements + Backfill (6 neu unlocked):
> - Volume-Tages-Patterns separat pro Event (3x3/2x2/4x4/5x5/OH × 100er-Tag)
> - Marathon-Tag (200 any cube), Wochen-Disziplin (7 Tage je 100+ 3x3)
> - Speed-Schwellen sub_30, sub_22.95, sub_6_66 (Hex-Master)
> - Streaks 7/30/100 Tage (neue Category „consistency")
> - Sanity-Floor 1000ms im Speed-Check schuetzt vor degenerierten Daten
> - 349 Tests gruen (237 backend + 112 frontend)
>
> **Phase 8.4 (Tag `v0.14`)** war Trainings-Sets + Schrift-Slider +
> Best-Avg-Timestamps. **Phase 8.3 (Tag `v0.13`)** war PB-Konfetti.
>
> **Phase 8.2 (Tag `v0.12`)** war Speedcubing-Timer mit Spacebar +
> WCA-Inspection (Mode-Toggle WCA/Pragmatisch) + Sound + Multi-Phase-
> Splits (Variante A) + Settings-Panel. Solve.split_times_ms-Spalte
> + Migration; csTimer-Import/Export unveraendert.
>
> **Bisheriger Phase-8.2-Header (zur Kontext-Erhaltung):**
> - useSpacebarTimer-Hook: WCA-State-Machine
>   (idle → inspection → ready → running → stopped)
> - Inspection 15s default, Sound bei 8s + 12s, Penalty +2/DNF
> - Multi-Phase: jeder Spacebar-Press = Split, beim N-ten Press stop
> - SettingsPanel als 5. Sub-Tab in VERWALTUNG
> - Solve.split_times_ms-Spalte + Migration 593bfa59e08b
> - csTimer-Importer/Exporter unveraendert (compat-test gruen)
> - 327 Tests gruen (215 backend + 112 frontend), Bundle 846kB / 248kB
>
> **Phase 8.1 (Tag `v0.11.1`)** war UX-Quick-Wins (csTimer-Mapping
> fix + Outlier-Toggle + DrillCard-Solve-Liste).
>
> **Phase 8 (Tag `v0.11`)**: Scramble im TIMER + PLL/OLL-Trainer
> (alg_case-Schema, /stats/by-alg-case-Endpoint, AlgTrainerPanel
> mit DrillCard, scrambow vendor-patched). Snapshots vor Phase 8 +
> 8.1 jeweils als tag + legacy-branch verfuegbar.
>
> **Phase 7 (Tag `v0.10`)** war Personal Trainer Teil 1+2 (Achievements
> + Daily Challenges). **Phase 7a (Tag `v0.9`)** war Teil 1 mit
> 18 Achievements + Live-Backfill 17/18.
>
> **Snapshot v0.6 Layout** weiter verfuegbar: tag `v0.6` + branch
> `legacy/v0.6-classic-layout`.

---

## TL;DR fuer den User beim Wiedereinstieg

Du musst beim naechsten Mal:

1. **Backend-Terminal oeffnen** (PowerShell):
   ```powershell
   cd D:\Projekte\cubetracker\backend
   .\.venv\Scripts\Activate.ps1
   uvicorn main:app --reload
   ```
   → laeuft auf `http://localhost:8000`

2. **Frontend-Terminal oeffnen** (zweites PowerShell-Fenster):
   ```powershell
   cd D:\Projekte\cubetracker\frontend
   npm run dev
   ```
   → laeuft auf `http://localhost:5173`

3. **Browser:** `http://localhost:5173` aufmachen.

4. **Claude Code starten** (drittes Terminal oder VS Code), Repo-Root
   `D:\Projekte\cubetracker`. Erster Prompt:
   > „Lies `NEXT_SESSION.md` und gib mir den aktuellen Stand."

---

## Was beim App-Walkthrough zu pruefen ist

### Funktionale Checks (Phase 4 neu — UI/UX)

- [ ] **3 Tabs oben gross**: TIMER / DASHBOARD / ANALYSE (h-14, lila aktiv)
- [ ] **Tab-Wahl persistiert** in localStorage (Reload landet wieder dort)
- [ ] **TIMER-Tab**: grosse zentrale Eingabe (text-7xl), auto-focus,
      Enter speichert + re-focus. Live-card rechts: Letzter Solve text-4xl,
      ao5/ao12 text-3xl, Form-vergleich fuer ao5+ao12+ao100 mit
      Window-Selector (letzte 100/500/alle), Mini-Liste mit Quick-Delete
- [ ] **DASHBOARD-Tab**: 3 Quick-Cards top (Today/Week/Reminders),
      darunter MultiCube + Stats voll-breit
- [ ] **ANALYSE-Tab**: FilterBar oben (Cube-Filter zentral),
      TrendsChart full-width mit Y-Achsen-Smart-Skala + manuell,
      Histogramm + Outlier nebeneinander, SolveList full-width,
      Stats + Import unten
- [ ] **Y-Achse Trends**: standardmaessig P2..P98 (Outlier weggeklippt,
      Verlauf gross sichtbar). Manuell ueberschreibbar via min/max-Inputs
      in Sekunden („10" oder „1:30"). Reset bei Filter-Wechsel.
- [ ] **OutlierCard session-aware**: bei aktiver Session-Wahl im Header
      werden nur diese Session-Outliers gezeigt
- [ ] **SessionSwitcher** sitzt im Header (App-weit)
- [ ] Schriften deutlich groesser ueberall (Headlines 2xl, Body base)

### Funktionale Checks (Phase 1-3 — sollten weiterhin gehen)

- [ ] csTimer-Stackmat-Eingabe: `945` → 9.45s, `15102` → 1:51.02
- [ ] csTimer-Re-Import erkennt alle als Duplikate
- [ ] Inline-Edit in SolveList (Click auf Zeit/Notiz)
- [ ] Sofort-Update aller Werte bei Mutations
- [ ] Backend-Badge gruen, ao5/ao12 als Sub-Zeile in der Liste

### Funktionale Checks (Phase 1 — sollten weiterhin gruen sein)

- [ ] Backend-Badge gruen
- [ ] Cube-Filter-Dropdown filtert Liste + Stats + Charts synchron
- [ ] Session-Switcher filtert alles synchron
- [ ] PB-Marker (★ + gold) auf der besten Zeit des aktuellen Filters
- [ ] csTimer-Re-Import: alle als Duplikate erkannt

### Was du jetzt eventuell vermissen wirst (Phase-3-Kandidaten)

- **Form-Faktor fuer Lernkurve verzerrt**: bei kontinuierlicher
  Verbesserung ist current_ao5 immer < mean — das misst eher
  Lernkurve als Tagesform. Alternative: Bezug auf letzte 100 Solves.
- **Keine Inline-Edits** fuer Scramble/Notes/time_ms
- **Keine Tag/Wochen-Aggregation** („heute 47 Solves")
- **Kein Trainings-Reminder** (lange-nicht-gemacht-Banner)
- **Kein Hardware-Tracking** (Welcher Wuerfel war benutzt?)
- **WCA-Profil-Verknuepfung** ist verschoben — nicht in Roadmap-
  Hochprio.

---

## Was als naechstes ansteht

Phase 8 + 8.1 + 8.2 + 8.3 + 8.4 + 8.5 abgeschlossen. Geplante Reihenfolge:

**Phase 9 — Distribution + Restore → v1.0** (~2-3 Tage):
- POST /backup/restore Endpoint + UI im BackupPanel
- Backend serviert Frontend statisch (StaticFiles)
- DB nach %LOCALAPPDATA%, Migrations beim ersten Start
- PyInstaller-Bundle, Inno-Setup-Installer
- Achievement-Trigger nach Import explizit verifizieren

**Phase 8.3.2 — PLL-Visualisierung** (Aufwand ~30min nach Bild-Lieferung):
User-Festlegung 2026-05-04: Bilder fuer alle 21 PLLs kommen im
naechsten Rollout. Implementierung analog zu OLL:
- PNGs nach `frontend/src/assets/pll/` kopieren
- `lib/pll-images.ts` mit 21 statischen Vite-Imports + `getPllImage()`
- `CubeStateView.tsx` `getPllImage()`-call ergaenzen (PLL-Pfad)
- evtl. groessere Drill-Bilder weil PLL-Cycle-Diagramme detailreicher
  sind als OLL-Orientation-Diagramme

**Phase 11 — WCA-Ranking** (optional):
Hardcoded WR-Tabelle pro Event, Anzeige „Du waerst Top X% weltweit"
in StatsCard.

**Nach v1.0**:
- Phase 11 — WCA-Ranking-Lookup (hardcoded WR-Tabelle, „Top X% weltweit")
- 2D-Cube-State-Bilder im AlgTrainerPanel + DrillCard
- Lib `sr-visualizer` oder selbst-gebaute SVG aus state-pattern
- KEIN Hotlinking auf jperm.net (urheberrechtlich)

**Phase 9 — Distribution** (Tag `v1.0`, ~2-3 Tage):
- F21-F25 in ROADMAP (PyInstaller, %LOCALAPPDATA%, Inno-Setup, …)

Bewusst skippt: Light-Mode (User-Entscheidung — Speedcubing-Timer
sind standardmaessig dark).

---

### Historische Notizen aus frueheren Phasen (zur Kontext-Einordnung)

Phase 4 (Visualisierungs-Refactor) ist mit Tag `v0.4` abgeschlossen.
Hardware-Tracking ist nach Phase 5 verschoben.

**Phase 5 — Hardware-Tracking** (Seed liegt in
`docs/hardware-inventory-seed.md`, ~35 physische Cubes vom 2026-05-03):

- **F16 Hardware-Inventar** — CRUD fuer Cube-Modelle. Schema-Frage:
  Hardware m:n cube_types (ein Modell fuer mehrere events nutzbar)?
  Oder 1:1 mit Wiederholungen?
- **F17 Hardware pro Solve** — `hardware_id` FK aktivieren via
  Alembic-Migration, Default-Hardware pro cube_type, Auswahl im
  BigTimerInput
- **F18 Hardware-Performance-Vergleich** — „mit Weilong v11 bist du
  0.8s schneller als mit Gan 15 auf 3x3"
- **F19 Aktive-Hardware-Empfehlung** pro Event
- **F20 Custom-Reports + Backup/Sync**

**Phase 7 — Personal Trainer MVP** (neu geplant 2026-05-04):

User-Wunsch nach Gamification-Modul. Aufgeteilt in zwei branches:

- **7a Achievements**: ~15 vordefinierte achievements (Volume,
  Speed-PBs, Variety, Hardware), Auto-Check nach jedem Solve,
  AchievementsCard im DASHBOARD mit unlocked/locked-grid
- **7b Daily Challenges**: 3 challenges pro tag generiert basierend
  auf user-stats (Volume / Speed / Comeback / Diversity / Consistency),
  fortschritts-tracking, expiry am tagesende, Card im DASHBOARD

aufwand-schaetzung: ~1 tag MVP komplett.

**Phase 8 — Distribution** (Tag `v1.0`, neu hinzugefuegt 2026-05-03):

App als Windows-Installer fuer fremde Rechner — User-Wunsch, damit
die App z.B. an Familien-/Freunde-Test verteilbar ist.

- **F21 Backend serviert Frontend statisch** (`npm run build` +
  StaticFiles in FastAPI)
- **F22 PyInstaller-Bundle + Auto-Browser-Open** (eine .exe, ~70 MB)
- **F23 Persistenz auf %LOCALAPPDATA%** (DB ueberlebt updates)
- **F24 Inno-Setup-Installer** (start-menue, uninstaller,
  optional code-signing gegen Defender-FP)
- **F25 Auto-Update** (optional, github-releases-API)

Aufwand ~1 tag POC, ~2-3 tage poliert. **Bewusst nach Phase 5**, weil
sich vorher das DB-Schema (hardware_id) noch bewegt.

Plus offene Wuensche:
- **WCA-Profil-Verknuepfung** (F9/F10) — externe API, niedrige Prio
- **Outlier-Schwellen cube-spezifisch** (2x2 grosszuegiger als 3x3)
- **Cube_type editierbar** in der Liste (derzeit read-only)
- **„Into Cube"-Klaerung** beim Phase-5-Bau (siehe Seed-doku)
- **Bundle-Splitting** fuer Recharts (heute ~200kB gzipped, koennte
  mit code-splitting halbiert werden) — wird Pflicht spaetestens
  in Phase 6

---

## Repo-Stand (Snapshot)

- **Branch:** `main` (sauber)
- **Tags:** `v0.0` … `v1.0`, **`v1.0.1`** (aktuell, Hotfix)
- **Tests:** 260 backend + 112 frontend = **372 gruen**
  - backend: `cd backend && .venv\Scripts\python.exe -m pytest -q`
  - frontend: `cd frontend && npm test`
- **Lint:** Pre-commit-Hooks (Black + Ruff) sauber
- **Build:** `npm run build` clean (Bundle ~200kB gzipped wegen Recharts)
- **DB:** `backend/data/solves.db` mit 6202 Solves + 22 Sessions +
  13 Cube-Types
- **Phase-4-Highlights:** 3-Tab-Architektur, BigTimerInput mit text-7xl
  Eingabe + auto-focus, Form-vergleich fuer alle ao*, Y-Achse smart-skaliert,
  einheitliche grosse Schriften ueberall, Dead-Code (SolveForm,
  TodayWeekCard) entfernt.

---

## Files-Map (nach Phase 1)

```
cubetracker/
├── CLAUDE.md                  # Disziplin, Tech-Stack, Branching
├── ROADMAP.md                 # Phase 1-4 done, Phase 5 pending
├── NEXT_SESSION.md            # diese Datei
├── docs/
│   └── hardware-inventory-seed.md  # Phase-5-Seed
├── backend/
│   ├── api/
│   │   ├── solves.py          # CRUD-Endpoints (cap le=100k)
│   │   ├── sessions.py        # GET-Endpoints
│   │   ├── stats.py           # /stats, /stats/by-cube, /stats/temporal
│   │   └── import_cstimer.py  # POST /import/cstimer (F4)
│   ├── stats/calc.py          # WCA-Trimmed-Mean, pure functions
│   ├── importers/cstimer.py   # JSON-Parser
│   ├── db/                    # models, schemas, database
│   ├── alembic/               # Migrations
│   ├── tests/                 # 91 Tests
│   └── data/solves.db         # SQLite mit 6202 Solves
└── frontend/
    └── src/
        ├── App.tsx                            # Tab-Routing + State
        ├── components/
        │   ├── TabBar.tsx                     # 3 Modi (Phase 4)
        │   ├── SessionSwitcher.tsx            # F4
        │   ├── ImportPanel.tsx                # F4
        │   ├── BigTimerInput.tsx              # TIMER-Tab Eingabe (Phase 4)
        │   ├── LastSolvesPreview.tsx          # TIMER-Tab Live-card
        │   ├── ActivityCard.tsx               # DASHBOARD Today/Week
        │   ├── ReminderCard.tsx               # F13 + emptyMode
        │   ├── MultiCubeCompareCard.tsx       # F11 + FF2 + F12-Trend
        │   ├── StatsCard.tsx                  # F5
        │   ├── AnalyseFilterBar.tsx           # ANALYSE Cube-Filter
        │   ├── TrendsChart.tsx                # F6 + Y-Achsen-Smart (Phase 4)
        │   ├── HistogramChart.tsx             # F6 (Phase 2)
        │   ├── OutlierCard.tsx                # F7 outlier + sessionId
        │   └── SolveList.tsx                  # F3+F5+F5.1+F7 (Inline-Edit)
        └── lib/
            ├── api.ts             # axios + tanstack-query Hooks
            ├── format.ts          # Zeit-Format + Cube-Liste + Stackmat-Parser
            ├── types.ts           # Solve, Session
            ├── rolling.ts         # WCA-Trimmed-Mean (TS-Port von calc.py)
            ├── histogram.ts       # Bin-Berechnung + Sturges
            ├── outliers.ts        # Cube-spezifische Outlier-Erkennung
            └── chart-utils.ts     # Y-Domain (Phase 4)
```

---

## Layout-Rollback (Phase 5b → v0.6 = klassisches 3-Tab-Layout)

Falls das neue 4-Tab-Layout (Phase L) nicht gefaellt, drei Wege zurueck:

```powershell
# Option 1: zum Tag wechseln (detached HEAD)
git checkout v0.6

# Option 2: zum legacy-branch wechseln (mutable HEAD, kann commits aufnehmen)
git checkout legacy/v0.6-classic-layout

# Option 3: main zurueck-rollen (DESTRUKTIV — verwirft neue Commits)
git checkout main && git reset --hard v0.6
```

Empfohlen: **Option 1** (`git checkout v0.6`) zum bloss-anschauen. Vite-
Restart + Browser-Refresh, dann siehst du die alte UI. Mit
`git checkout main` kommst du zur neuen UI zurueck — ohne Datenverlust,
da die SQLite-DB unter `backend/data/solves.db` von der Layout-Aenderung
nicht beruehrt wird.

## Wenn etwas nicht startet

| Problem | Loesung |
|---|---|
| `uvicorn: command not found` | `.venv` nicht aktiviert. `.\.venv\Scripts\Activate.ps1` |
| `npm: command not found` | Node.js nicht im PATH. PowerShell neu oeffnen. |
| Backend-Badge bleibt rot | Backend-Terminal pruefen, ob uvicorn laeuft. Port 8000 frei? |
| Frontend zeigt nur weisse Seite | F12 → Console pruefen. Meist API-CORS oder Backend down. |
| Pre-commit failt beim Commit | `pre-commit run --all-files` fuer Detail-Output |
| Tests failen | `cd backend && .venv\Scripts\python.exe -m pytest -v` |

---

## Cross-Reference

- **Cross-Projekt-Status:** `D:\Claude-Projekte\STATUS.md`
- **Code-Orchestrator-Befunde:** noch zu schreiben unter
  `D:\Claude-Projekte\code-orchestrator\01_phase_D_befunde_cubetracker.md`
  (fuer V5-Code-Schwester-Projekt)
- **Memory:** `~/.claude/projects/.../memory/MEMORY.md`
