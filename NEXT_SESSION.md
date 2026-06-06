# NEXT_SESSION — Cubetracker Wiederaufnahme

> **Zweck:** Damit die naechste Claude-Session ohne Reibungsverlust dort
> ansetzt, wo wir aufgehoert haben.

## Single-Source-Files (canonical)

Diese Files sind die einzige Wahrheit für ihren Bereich — alles andere
liest aus / referenziert sie:

| File | Inhalt | Update bei |
|---|---|---|
| `webapp/changelog/data.py` | Patch-Notes (PATCH_NOTES list) — neueste oben | Jedem `feat()` / `fix()`-Commit, vor Tag-Push |
| `webapp/frontend/src/lib/roadmap-phases.ts` (Phase-Meta) + DB-Tabelle `roadmap_items` (Items, gepflegt via Admin-UI) | Roadmap-Phasen P1-P6 + Items (Frontend-Modal liest beides) | Phase-Meta: TS-Datei editieren. Items: App → „Verwaltung → Admin → Roadmap" |
| `webapp/frontend/src/lib/features-data.ts` | User-facing Feature-Liste (Login-Page + Modal) | Bei jedem User-facing-Feature |
| `webapp/db/models.py` + `webapp/main.py:lifespan` | Schema + Mini-Migrations (ALTER TABLE IF NOT EXISTS) | Bei Schema-Änderungen |
| `webapp/frontend/src/lib/api.ts` | React-Query-Hooks (Single-Source für Frontend-API-Calls) | Bei neuen Endpoints |
| `webapp/frontend/src/lib/format.ts:COMMON_CUBE_TYPES` | Liste der erlaubten cube_type-Werte | Bei neuen Cubes |
| `docs/audit-2026-05-20.md` | Letzter Setup-Audit (Claude-Code-Konfig) | Quartalsweise via `/audit`-Skill (geplant) |
| `docs/lessons-archive.md` | Bug-Postmortems chronologisch | Nach jedem Production-Crash / Workflow-Lesson |

`/abschluss` prüft im Check 3-5 ob diese Files konsistent mit den letzten
Commits sind.

---

## ✅ ERLEDIGT 2026-06-06 (Forts.) — Friend-Profil (Card per Klick auf Namen)

**`W.friend-profile`** (BE `81baba8` + FE `c2ba62f`, Tag
`v2.0.0-alpha.W.friend-profile`) — User-Wunsch: Klick auf einen Freundes-Namen
(Community → Freunde-Liste) zeigt dessen Solving-Card, **ohne** dass der Freund
das anonyme öffentliche Profil aktiviert hat.
- **Backend:** neuer **authentifizierter** Endpoint
  `GET /api/friends/{user_id}/profile` — nur accepted-Friends (beide Richtungen
  geprüft) oder self; generischer 404 sonst (non-friend/pending/inaktiv);
  rate-limited 60/min. Reuse von `build_public_profile_card` (ex
  `_build_public_profile`, jetzt geteilter, auth-neutraler Composer — der Caller
  gated). Identische Aggregate wie die öffentliche Card (nie Email/Einzel-Solves).
- **Frontend:** `SolvingCard` aus PublicProfilePage extrahiert (DRY → geteilt mit
  der anonymen Seite), `FriendProfileModal` (`useFriendProfile`-Hook, Esc/Backdrop,
  aria-labelledby), klickbare Namen NUR in der accepted-Friends-Liste (pending
  bleibt nicht-klickbar → kann nicht 404en).
- 6 neue Tests (beide Friendship-Richtungen, non-friend/pending→404, self→200,
  no-auth→401); test_public_profile.py 14 grün. QA: **safe, kein KRITISCH**
  (is_active-Reorder + Reverse-Test + aria-labelledby mitgenommen). Beidseitig
  live-verifiziert (Health-Version + Bundle `index-D9cLjQDS.js` + funktionaler
  401). Kein Roadmap-Item (Verfeinerung des Public-Profile).
- ⏭️ Bekanntes app-weites a11y-Item (nicht in dieser Welle): kein Focus-Trap in
  den Modals (gilt für ALLE App-Modals, nicht nur dieses) → eigener a11y-Pass.

---

## ✅ ERLEDIGT 2026-06-06 (Forts.) — Public-Profile + ntfy-Fix für klickbare Fragen

**`W.public-profile`** (BE `049260c` + FE `e59cc34`, Tag
`v2.0.0-alpha.W.public-profile`) — **Roadmap-P1-#2** „Public-Profile als teilbare
Solving-Card". Anonyme, opt-in öffentliche Card unter **/u/&lt;slug&gt;**:
- **Backend:** neuer **anonymer** Endpoint `GET /api/public/profile/{slug}`
  (rate-limited 60/min; generischer 404 bei unbekannt/privat/inaktiv → kein
  Existence-Leak). Liefert NUR Aggregate (Single/Avg-PBs pro Cube, Counts,
  Achievements, letzte PB-Events) — nie Email/PLZ/Einzel-Solves. `compute_stats`
  wiederverwendet (nicht an current_user gekoppelt). Opt-in via PATCH /auth/me
  (`public_profile_enabled`); `public_slug` aus display_name generiert (ä/ö/ü/ß
  transliteriert, **stabil ab Aktivierung** → geteilte Links bleiben gültig,
  race-sicherer IntegrityError-Fallback auf id-Suffix). Neue User-Spalten +
  Mini-Migration + partieller Unique-Index. **8 pytest-Tests** (tests/test_public_profile.py).
- **Frontend:** `PublicProfilePage` (Route im AuthGuard VOR dem Login-Gate,
  nginx-SPA-Fallback), Opt-in-Toggle + Teilen-Link mit Copy-Button in ProfilView
  (ersetzt den Phase-B-Platzhalter), `usePublicProfile`-Hook, i18n de/en.
- **Erster anonymer User-Daten-Endpoint** → `docs/permissions-matrix.md` +
  Datenschutz-Seite nachgezogen, Marketing-Bullet `communityBullet5`.
- QA (qa-reviewer): **safe, kein KRITISCH**; 2 SOLLTE direkt gefixt (Rate-Limit +
  Slug-Race). Beidseitig live-verifiziert (Health-Version + FE-Bundle
  `index-BlgZFmx4.js` + funktionaler 404). Roadmap-Item auf **done**.
- ⚠️ Bewusste Scope-Grenze: WCA-Badge = **Link** zum offiziellen WCA-Profil (kein
  neuer WCA-Proxy-Endpoint). Live-WCA-Daten auf der Card = spätere Option.

**`W.ntfy-ask-question`** (`1bafa3a`, chore) — ntfy-Push jetzt **auch bei
klickbaren Fragen** (`AskUserQuestion`): neuer PreToolUse-Hook
`pre-ask-question-ntfy.sh`. Vorher pingte nur Prosa/„fertig" (Stop-Hook am
Turn-Ende); AskUserQuestion ist ein Tool-Call mitten im Turn → Stop feuerte nie.
Nutzt `.tmp/last-ntfy-message.txt` falls da, sonst auto aus Fragetext + Optionen.
Live im echten Flow getestet (User bestätigte sofortigen Push).

---

## ✅ ERLEDIGT 2026-06-06 (Fortsetzung nach Kompaktierung) — Big-Cube-Scrambles 8×8–11×11

**`W.big-cube-scramble`** (FE `0834b05` + BE `48ac0b1`, Tag
`v2.0.0-alpha.W.big-cube-scramble`) — Auslöser war die User-Frage „gibt es schon
einen 11×11-Scramble?" → nein, die App ging bei NxN nur bis 7×7 (größtes
WCA-Event). Recherche am csTimer-Source (cs0x7f/cstimer via `gh api`): csTimer
kann 2×2–11×11; der Big-Cube-Generator ist `mega()` (scramble.js) + die
Move-Tabellen `args[]` (megascramble.js) — **pures Random-Move, kein Solver** →
1:1 in TypeScript nachgebaut. Umgesetzt:
- `generateBigCubeScramble()` + `BIG_CUBE_SPECS` (888/999/101010/111111,
  SiGN-Notation, 120 Züge) in `lib/scramble.ts`; Early-Return in
  `generateScramble` (pure → kein Vendor-Chunk).
- Neue Cube-Typen `8x8/9x9/10x10/11x11` in `COMMON_CUBE_TYPES` (propagiert in
  alle Cube-Picker/Filter — cube_type ist freier String, kein Schema/Backup-Impact).
- Dritte Scramble-Picker-Kategorie **„Big Cubes"** in `ScrambleCard.tsx`
  (categoryFor/setCategory/typesInCategory + 3. Toggle-Button + bigCubeNote).
- i18n (categoryBig, bigCubeNote, solvingBullet4 erweitert), 11 neue Vitest-Tests.
- QA (qa-reviewer): **safe, keine KRITISCH/SOLLTE**; 3 NICE mitgenommen
  (Terminierungs-Kommentar, Same-Axis-Positiv-Test, `setCategory("unofficial")`-
  Asymmetrie als Pre-Existing-Fix). 69 Tests grün, tsc+build clean.
- Beidseitig **live-verifiziert**: Bundle `index-ddbU43_q.js` + Health-Version +
  Changelog-Endpoint + Live-Bundle-Content (`111111`/`Big Cubes`).
- ⚠️ **Kein Roadmap-Item** (spontaner User-Wunsch). Falls gewünscht: via Admin-UI
  als erledigtes Item nachtragen (Seed = INSERT-only, zieht nicht auto nach).

ScrambleNet (2D-Netz) ist auf 3×3/OH/3BLD begrenzt (`isScrambleNetSupported`) →
große Cubes zeigen korrekt kein Netz, kein Toggle. Random-State-Solver für große
Cubes ist bewusst NICHT gebaut (auch WCA scrambelt ab 6×6 per Random-Move).

---

## ✅ ERLEDIGT 2026-06-05/06 — 6 Wellen + MoYu-Timer-Recherche + Roadmap-Pflege-Korrektur

> Langer Sprint (über Mitternacht). Alle Wellen **Split-Deploy** (Frontend +
> Backend getrennt committet → kein Coolify-Monorepo-Dedup) und **beidseitig
> live-verifiziert** (Bundle-Hash UND Health-Version, meist beim 1. Versuch).
> QA-Sub-Agent wo wesentlich.

**Wellen (Reihenfolge):**
1. **`W.inspection-hold-config`** (FE `13870d9` + BE `0af684e`, Tag) — Hold-to-
   Inspect-Haltedauer am **Touch einstellbar** (Regler in EinstellungenView →
   Timer & Eingabe → Inspection, 200–1500 ms, Default 500; touch-gated via
   `useIsTouchDevice`). Neues Feld `settings.inspection_hold_ms` (localStorage,
   kein Schema). QA: 2 SOLLTE (Settings-Snapshot vor Hold-Timeout +
   `Number.isFinite`-Guard gegen korrupten localStorage).
2. **`W.roadmap-tab-archive`** (FE `22cb600` + BE `8c1a423` intern, Tag) —
   Admin-Roadmap-Tab: **Archiv-Ansicht** (Umschalter Aktiv/Archiv/Alle, Default
   Aktiv → erledigte auto-archiviert) + **Jump-to-Top/Bottom-Pfeile** (⏫⏬) +
   Reorder funktioniert jetzt auch in der Aktiv-Ansicht (`buildFullOrder` hängt
   versteckte Items hinten an → Public-View bleibt konsistent). Setzt Roadmap-
   Item **id=38 „Tab Roadmap-pflege Anpassungen"** um. UI-Relabel done→„Archiviert"
   (kein Schema-Change). QA: 2 SOLLTE + 1 NICE.
3. **`W.feedback-unread-fix`** (FE `7414cbc` + BE `55d5ddb`, Tag) — **User-Report**:
   Nachrichten-Badge blieb bei 1 hängen. Ursache: „gelesen" wurde nur beim
   Aufklappen gesetzt, die Antwort war aber für ungelesene Items schon inline
   sichtbar → Lesen ohne Klick. Fix: **mark-on-open** aller ungelesenen +
   `wasUnreadIds`-Snapshot (hält die grüne „neu"-Hervorhebung den Besuch lang).
4. **`W.timer-stats-ux`** (FE `0178788` + BE `6cc99c4`, Tag) — 2 User-Wünsche:
   (a) **Scramble-ⓘ** pro vergangenem Solve im Timer-Tab (LastSolvesPreview →
   öffnet `SolveDetailModal` mit vollem Scramble); (b) **Session-Übernahme
   Timer→Statistik** (`timerSessionId` von TimerTab nach MainLayout gehoben +
   `handleTabChange`-Wrapper an TabBar/BottomNav; Nebeneffekt: Timer-Session
   bleibt jetzt über Tab-Wechsel erhalten).
5. **`W.single-pb-live`** (FE `8aa94f2` + BE `85c0fbc`, Tag) — **Roadmap-#1**:
   **Single-PB** (`stats.best_ms`) in der LIVE-Karte unter „Letzter Solve", gold
   wenn der letzte Solve der PB ist. Eine Zeile, kein Backend/i18n.

**Außerdem:**
- **⚠️ Roadmap-Pflege-Korrektur (Lesson):** „Roadmap-pflege" wurde von mir
  **verfrüht auf done** gesetzt (Titel wörtlich als „Daten pflegen" gelesen statt
  die note_de). User korrigierte → der echte Auftrag war id=38 (= jetzt als
  `W.roadmap-tab-archive` gebaut). **Lesson: bei Roadmap-Items IMMER die note_de
  lesen, nie nur den Titel.**
- **W.hold-to-inspect-Patch-Note** 1s→0,5s korrigiert (`3f2857a`, docs).
- **MoYu-Timer-Recherche** (User hat MoYu **Cube AI Timer MF9141**): drahtlos
  **KEIN offener Weg** — proprietäres BLE (spricht nur mit MoYus WCU-App);
  csTimer bindet MoYu-Timer nur per **Audio/Stackmat** an (`appendBitMoyu`) +
  buggy (cstimer#164). **GAN Smart Timer** wäre der saubere BLE-Weg (unsere
  `gan-web-bluetooth`-Lib kann GAN-Timer mit). Befund im Seed festgehalten
  (`2a1a5a3`, Note des Items „Stackmat-Hardware-Input"). User-Entscheidung: nur
  festhalten, NICHT bauen. ⚠️ Live-Roadmap-Note wird vom Seed NICHT auto-
  aktualisiert (bootstrap = INSERT-only) → bei Bedarf via Admin-UI nachziehen.

**Roadmap-Items auf done gesetzt:** Roadmap-pflege · Tab Roadmap-pflege
Anpassungen (id=38) · einstellbare Zeit beim draufdrücken · single pb neben dem
timer · Backend-Test-Suite (am 03.06.).

### 🔜 Restplan (frischester Stand — ersetzt alle unten)
Offene **P1** (deine Roadmap-Reihenfolge = Priorität): **Activity-Feed** (~3 T) ·
**Public-Profile als teilbare Solving-Card** (~2 T) · **Ranking/Level** (groß,
eigene Session) · **Solve-Liste virtualisieren** (~3 h, ⚡ schneller Win) ·
**Hardware aus kuratierter Liste**. — Danach **P3** (Online-Battle, Friend-
Challenges, Nachrichten-Hub), **P4** (Trainer-Subsets, BLE Smart Cube GAN/MoYu,
3D-Vis cubing.js, Reconstruction), **P5** (PLL-Bilder — ⚠️ wartet auf deine 21
PNGs; Cookieless-Analytics; News-Quellen; Gear/Redi/Skewb-Solver), **P6**
(Alembic, csTimer-Solver vendoren, Metronom, **Stackmat/BLE-Timer** = MoYu-Befund,
FMC, Multi-BLD/BLD-Helper, Virtual-Cube-Input, VRC-Replay, Gruppen/Coaching).
**MAINTENANCE** zuletzt 2026-05-26 → in ~2 Wochen fällig.

---

## ✅ ERLEDIGT 2026-06-03 — Hold-to-Inspect (Touch) + Intro-Backing + Deploy-Postmortem

> Session-Fortsetzung nach dem 31.05.-Abschluss. 2 Wellen + eine wichtige
> Deploy-Lesson. Alle live-verifiziert (Bundle-Check!), QA wo wesentlich.

- **`W.hold-to-inspect`** (commit `3672589`, Fix `52e7fc0`, Tag
  `v2.0.0-alpha.W.hold-to-inspect`) — User-Wunsch: am **Touch** (Phone/Tablet)
  startet die **Inspektion** nicht mehr per Antippen, sondern per **0,5 Sek.
  Halten** (verhindert versehentliche Starts). Desktop-Spacebar unverändert
  (Sofort-Start, WCA-Standard). Der bisher tote `holding`-State umgewidmet zur
  Vor-Inspektion-Halte-Phase (lila + `animate-pulse` als Feedback, idle-Hint
  touch-aware). Neue Hook-Opt `holdToStartInspection` (gated auf `isTouchDevice`
  in SpacebarTimerCard), `INSPECTION_HOLD_MS=500`. **QA (State-Machine-streng):
  2 KRITISCH gefixt** — (1) Zen-Exit-× jetzt auch im `holding` sichtbar; (2)
  Hold-Timeout überlebt Listener-Re-Subscribes: `onComplete` (saveFromSpacebar)
  ist pro Render neu → der idle→holding-Wechsel triggert ein Re-Subscribe → der
  Effect-Cleanup hätte den laufenden Hold gekillt (= Dauerhänger in „holding").
  Fix: Timeout NUR in reset()/handleUp/Unmount räumen, NICHT im Listener-Cleanup.
  Verworfen: „Doppel-Dispatch"-Verdacht (stateRef synchron → 2. keydown no-op).
  User-Tuning 1000→500 ms (Fix-Commit).
- **`W.skin-pseudo-header-pills` (Intro-Nachzug)** (commit `828686e`) — die
  Beschreibungstexte unter den Pseudo-Bereich-Titeln (Profil, Nachrichten) lagen
  auf Skins nackt auf dem Hintergrund. `PseudoViewHeader` bekam eine optionale
  `intro`-Prop mit `bg-gray-900/50`-Backing (Skin-CSS schaltet deckend). User
  bestätigt: „Text unter Profil ist jetzt lesbar."

### ⚠️ DEPLOY-LESSON (wichtig — kostete heute eine Debug-Runde)
Bei einem Commit der **Backend (changelog) UND Frontend** anfasst, deployt
Coolify **manchmal nur EINE App** (Monorepo-Dedup). Heute: `3672589`
(hold-to-inspect) → Backend ging live (Health-Version flippte auf
`hold-to-inspect`), **Frontend-Bundle blieb aber alt** → der User testete den
alten Timer-Code („reagiert noch aufs Tippen"). Die GitHub-Action lief grün (9s,
beide Deploy-Calls), Coolify verwarf den Frontend-Build trotzdem.
**→ Deploy-Verify IMMER beidseitig: Health-Version UND Bundle-Hash müssen
flippen.** Fix bei halbem Deploy: **frontend-only Folge-Push** (re-triggert nur
das Frontend, keine Backend-Kollision) ODER `gh workflow run deploy.yml` (beide).
Heute mit dem Intro-Nachzug als frontend-only Push gelöst.

### 🔜 Offen für die nächste Session (frischester Stand — ersetzt die Restpläne unten)
1. **🟡 Patch-Note-Korrektur (Backend, 1 Zeile):** der public PatchNote
   `W.hold-to-inspect` in `webapp/changelog/data.py` sagt noch „wenn du eine
   Sekunde lang hältst" — ist aber 0,5 s. Beim nächsten Backend-Anlass auf „kurz
   hältst" o.ä. korrigieren (bewusst NICHT mit dem 0,5s-Frontend-Push gemischt,
   um den Coolify-Dedup zu vermeiden).
2. **Hardware aus kuratierter Liste** (Roadmap P1, letztes der 3 User-P1-Items)
   — `COMMON_HARDWARE` analog `COMMON_CUBE_TYPES`; Frontend + ggf. Daten-Migration
   der Bestands-Hardware. Berührt das Hardware-Backend-Modell → dort die
   Patch-Note (1) gleich mitkorrigieren. **Wahrscheinlich die nächste Arbeit.**
3. **Solve-Liste-Virtualisierung** (P1, ~3h, react-window) + **Ranking/Level**
   (P1, groß, eigenes Item) + **Phase B öffentliches Profil** (P3.10) bleiben offen.

**Roadmap-Pflege heute:** „Backend-Test-Suite einführen" auf done gesetzt (war
stale-aktiv). 3 live-only Items (2 done + 1 Meta) bewusst NICHT geseedet
(Verlust bei DB-Wipe harmlos).

---

## ✅ ERLEDIGT 2026-05-31 (Abend 2, nach /compact) — Timer-Polish + Skin-Header-Pills + „Angemeldet bleiben"

> 4 weitere Wellen nach der Kompaktierung (User-Wünsche), alle getaggt +
> live-verifiziert. QA wo wesentlich (Timer-State-Machine, Auth).

- **`W.timer-keep-last-time`** (commit `d00f29d` + Fix `2b89913`, Tag) — die
  gestoppte Zeit bleibt nach dem Solve groß stehen (statt sofort 0.00). Reset
  erst bei **Löschen** ODER Start des **nächsten Solves/Inspection**. **+2/DNF
  lassen die Zeit bewusst stehen** (User-Entscheidung → Fix-Commit). Quick-
  Penalty-Leiste (+2/DNF/Löschen) jetzt auch im **Zen-Modus**. Opt-in-Hook-
  Option `restartFromStopped` (Trainer/DrillCard unangetastet). QA: 3 SOLLTE
  gefixt — `penaltyRef` statt penalty-in-Deps (vorbestehender Listener-Riss beim
  WCA-Overrun), Warn-Refs-Reset im stopped-Restart, Zen-Layout `min-h-0`.
  features-data `solvingBullet11`.
- **`W.timer-controls-height`** (commit `2123f95`, internal) — Steuerleiste über
  dem Timer höhen-einheitlich: Schriftgrößen-Card + Fokus + Zen alle h-10 (40px),
  Stepper + Größen-Pille h-8 (32px) + flex-wrap fürs Phone. Reine Kosmetik.
- **`W.skin-pseudo-header-pills`** (commit `7139152`, internal) — die 6 UserMenu-
  Bereiche (Profil/Einstellungen/Nachrichten/Konto/Admin/Tester) hatten Titel +
  „Zurück zur App" nackt auf dem Hintergrund (auf Skins kaum lesbar). Neue
  geteilte **`PseudoViewHeader`**-Komponente: Titel als `bg-gray-900/60`-Pille
  (Skin-CSS schaltet sie deckend), Zurück-Button `secondary` statt `ghost`.
  −69 Zeilen Doppel-Markup. Audit: Flow-Tabs nutzen schon `SectionHeading`-Pille.
- **`W.remember-me`** (commit `d97ab01`, Tag) — Login-Checkbox **„Angemeldet
  bleiben"** (default an = Bestandsverhalten). AN → persistenter Refresh-Cookie
  (30d) + localStorage; AUS → Session-Cookie + sessionStorage (Shared-Device,
  kein Token bleibt liegen). **Plus Cold-Start-Refresh** (AuthContext-Init holt
  über den HttpOnly-Cookie einen neuen Access-Token → „angemeldet bleiben" wirkt
  jetzt wirklich bis 30d, auch in der PWA). Backend: `UserLogin.remember_me` +
  `_set_refresh_cookie(persistent=…)` (max_age=None = Session). 2 neue pytest
  (6/6 grün). QA Auth-streng: 1 KRITISCH (Account-Delete → `clearAccessToken()`)
  + 3 SOLLTE (`tryRefresh` verwirft Session nur bei echtem 401/403 = übersteht
  Netzwerk-Blips; race-freie Pref-Reihenfolge; Multi-Tab-Doku). features-data
  `accountBullet10`.

**Tagesbilanz 2026-05-31 gesamt: 11 Wellen live** (7 vor /compact + 4 danach).

### 🔜 Offen für die nächste Session (frischester Stand — ersetzt die Restpläne unten)

1. **Item 3 — Hardware aus kuratierter Liste** (letztes der 3 User-Items;
   `COMMON_HARDWARE` analog `COMMON_CUBE_TYPES`; Frontend + ggf. Daten-Migration
   der Bestands-Hardware). **Wahrscheinlich die nächste konkrete Arbeit.**
2. **Phase B — öffentliches/teilbares Profil** (Roadmap P3.10, großer Brocken):
   Schema `avatar_url`/`bio`/`profile_visibility` + Migration + `GET /profile/{id}`
   mit Zugriffskontrolle + 3 Stufen (privat/Freunde/öffentlich = nur eingeloggt).
   `ProfilView` + die Sichtbarkeits-Platzhalter sind die Blaupause.
3. **Kleinkram offen:** (a) Intro-Texte der Pseudo-Bereiche (z.B. „So sehen dich
   andere Cuber …") liegen noch nackt auf dem Skin — User-Nachfrage offen, Backing
   anbieten. (b) Remember-me v2.x: Refresh rotiert den Cookie NICHT — bei Browsern
   die Session-Cookies bei Inaktivität verwerfen könnte das früher ausloggen;
   falls relevant, Persistenz im Refresh-Token-Claim mitführen.
4. **Nachrichten-Hub** (P3, bei Community-Messaging) + **Variante A** (Voll-Sub-
   Tab-Routing) + **Phase 6** (Render-Abbau, `feature/W-api-prefix`→`main`).

---

## ✅ ERLEDIGT 2026-05-31 (Abend) — Feedback-Pipeline + Zen-Timer + Nachrichten-Bereich

> Nach dem /abschluss noch 3 Wellen draufgesetzt (User: „es geht weiter"),
> alle getaggt + live-verifiziert, QA je 0 KRITISCH (nach Fixes).

- **`W.feedback-roadmap-pipeline`** (commit `d9d467f`) — Admin macht in der
  Feedback-Inbox per „🗺 Auf die Roadmap"-Button aus einem Feedback ein
  Roadmap-Item: atomarer Endpoint `POST /admin/feedback/{id}/to-roadmap` +
  Schema-Spalte `roadmap_items.source_feedback_id` (Mini-Migration) +
  `FeedbackToRoadmapModal` (Editor, vorbefüllt) + Feedback-Status/Auto-Reply +
  4 pytest-Tests. Patch-Note `internal=True` (Admin-only). Roadmap-Item
  „Feedback-Inbox → Roadmap-Pipeline" → **done**.
- **`W.timer-zen-mode`** (commit `9004b82`) — Vollbild-Zen-Timer (Knopf „🧘 Zen"
  im Timer-Tab): nur Scramble + große Zeit, Tap/Leertaste tracket. EINE
  Timer-Instanz (neues `bare`-Prop auf `SpacebarTimerCard`, kein zweiter
  `useSpacebarTimer` → kein Doppel-Save). QA: 2 KRITISCH gefixt (TouchTimerPad
  hinterm Overlay ausblenden; Exit-× nur wenn kein Solve läuft, via
  `onStateChange`). features-data `solvingBullet10`. Roadmap-Item „Zen-Timer"
  → **done**.
- **`W.ia-nachrichten-bereich`** (commit `1c470f0`) — aus der User-Frage „passt
  Mein Feedback in Meine Daten?": „Mein Feedback" (Team-Antworten) zieht in
  einen **eigenen Bereich 📬 Nachrichten** (UserMenu, raus aus Konto & Daten →
  Daten — es ist Kommunikation, keine Daten). **Unread-Badge am UserMenu-Avatar**
  (rot, `useMyFeedbackUnreadCount`) schließt die Discoverability-Lücke; Toaster
  zeigt jetzt auf `nachrichten`. Roadmap-Seed „Nachrichten-Hub" (P3) für die
  spätere Vereinigung mit Community-Messages.

**Tagesbilanz 2026-05-31: 7 Wellen live** (Profil, Einstellungen, App-Shell,
Feedback-Pipeline, Zen, Nachrichten-Bereich) + 5 Roadmap-Seed-Items.

### 🔜 Offen für die nächste Session (frischester Stand — ersetzt die Restpläne unten)

1. **Item 3 — Hardware aus kuratierter Liste** (das letzte der 3 neuen
   User-Items; bewusst vertagt): Cubes aus fester `COMMON_HARDWARE`-Liste statt
   Freitext; Frontend + ggf. Daten-Migration der Bestands-Hardware. Note im Seed.
2. **Logo-Größe prüfen** (User-Review offen): App-Bar-Logo jetzt klein
   (`h-9 sm:h-10 md:h-11` im App.tsx-Header). Falls zu klein → 1-Zeilen-Tweak.
3. **Phase B — öffentliches/teilbares Profil** (Roadmap P3.10, großer Brocken):
   Schema `avatar_url`/`bio`/`profile_visibility` + Migration + Backup/Export +
   `GET /profile/{id}` mit Zugriffskontrolle + 3 Stufen (privat/Freunde/
   öffentlich = **nur eingeloggt**) + Read-only-Ansicht. `ProfilView` = Blaupause.
4. **Nachrichten-Hub** (Roadmap P3): wenn Community-Messaging kommt, Team- +
   Friend-Nachrichten im Nachrichten-Bereich vereinen (Badge existiert schon).
5. **Variante A** (Voll-Sub-Tab-Routing) + **Workstream-1-Reste** (Design-System)
   + **Phase 6** (Render-Abbau, `feature/W-api-prefix`→`main`).

---

## ✅ ERLEDIGT 2026-05-31 (Forts.) — Profil/Einstellungen/Konto-Bereiche + App-Shell

> Aufbauend auf dem IA-Umbau (W1–W6, Block darunter): tieferes Struktur-
> Refactoring von „Konto & Daten" + „Einstellungen" (User-P1-Item „aufräumen"
> → **jetzt DONE**, im Admin auf done gesetzt) + App-Shell-Modernisierung.
> **3 Wellen, alle getaggt + live-verifiziert, QA je 0 KRITISCH.**

**3-Bereiche-Schnitt (User-Entscheidung „3 bereiche"):** statt 2 UserMenu-
Bereichen (Konto & Daten + Einstellungen, wobei „Einstellungen" nur ein
Deep-Link in Konto war) jetzt DREI saubere Bereiche:
- 👤 **Profil** (`W.ia-profil-bereich`, commit `c89dd44`) — nach außen
  gerichtete Identität: Name/Land/WCA-ID + offizielles WCA-Profil
  (`WcaProfileCard` aus dem Statistik-Dashboard hierher) + Auffindbarkeit +
  Sichtbarkeits-Platzhalter (für Phase B). Neue `ProfilView`.
- ⚙ **Einstellungen** (`W.ia-einstellungen-bereich`, commit `596e643`) —
  eigener Bereich, Geräte-Präferenzen gruppiert „Aussehen | Timer & Eingabe".
  `SettingsPanel` aufgelöst → neue `EinstellungenView`. UserMenu-„Einstellungen"
  zeigt jetzt auf den echten Bereich (Deep-Link-Duplikat weg).
- 🗄 **Konto & Daten** — schlanker: Sessions/Hardware/Daten/Outliers + neuer
  **Sicherheit**-Subtab (Email/Passwort/Account, = der Rest von
  `AccountSettingsPanel`).

**App-Shell (`W.ia-app-shell`, commit `6641ec3`, User delegierte die
Entscheidung an mich):** schlanke **sticky App-Bar** oben (Logo bar-klein
h-9..h-11; Hero-Logo nur noch auf Login) + **fixe Bottom-Nav auf dem Phone**
(4 Flow-Tabs, safe-area-aware, bewusst KEIN Hamburger). Desktop behält die
Top-Leiste (`hidden md:block`). Neuer `BottomNav` + `isPseudoView`-Helper.

**Architektur-Notizen:**
- `AccountSettingsPanel` gesplittet: Identität (→Profil) + Sicherheit (→Konto);
  geteilte Form-Helfer in neuer `components/accountForm.tsx`.
- Gefahrenzonen **bewusst NICHT vereint** (User „gut so"): Account-Löschung
  unter Sicherheit, Daten-Reset (`DangerZoneCard`) unter Daten — je im
  logischen Zuhause.
- Pseudo-Tabs jetzt: `konto/profil/einstellungen/admin/tester` (+`verwaltung`
  tot). Routing-Muster wie gehabt (VALID_TABS + Render-Gate + TabBar-Hide).

**Neue Roadmap-Items (Seed `webapp/seeds/roadmap.py`, P1, `internal=True`,
commit `5773b6e`) — gehen beim nächsten Backend-Deploy live, Admin schaltet
bei Bedarf auf öffentlich:**
1. **Feedback-Inbox → Roadmap-Pipeline** — Admin macht aus einem Feedback-Item
   per Klick ein Roadmap-Item (Editor vorbefüllt mit User-Text, Phase/Prio/
   Sichtbarkeit, `source_feedback_id`-Rücklink, optional Auto-Reply). **Konzept
   steht ausführlich in der `note_de`.** Bau: Endpoint
   `POST /admin/feedback/{id}/to-roadmap` + Schema-Spalte + Button/Modal.
2. **Minimalistischer Timer-Modus (Zen)** — nur Scramble + großer Timer, kein
   Button, Tap-auf-die-Zeit trackt. Baut auf Fokus-Modus + `touch-timer.ts`.
3. **Hardware aus kuratierter Liste** statt Freitext (`COMMON_HARDWARE` analog
   `COMMON_CUBE_TYPES`; Freitext ggf. als „Sonstige"-Fallback).

### 🔜 Offen für die nächste Session

1. **Logo-Größe prüfen** (User reviewt live): in der App jetzt klein
   (`h-9 sm:h-10 md:h-11` im App.tsx-Header), passend zur sticky Bar. Falls dem
   User zu klein → 1-Zeilen-Tweak. (Berührt seinen früheren „Logo groß"-Wunsch.)
2. **Phase B — öffentliches/teilbares Profil** (Roadmap **P3.10**, der große
   nächste Brocken): Schema `avatar_url`/`bio`/`profile_visibility` +
   Mini-Migration (lifespan) + Backup/Export mitziehen; Endpoint
   `GET /profile/{id}` mit Zugriffskontrolle; **3 Sichtbarkeits-Stufen
   (privat / nur Freunde / öffentlich), wobei „öffentlich" = nur eingeloggte
   Nutzer** (User-Entscheidung, KEIN anonymer Web-Link → permissions-matrix);
   Read-only-Profilansicht + In-App-Teilen; Freund-Namen klickbar → Profil.
   `ProfilView` + die Sichtbarkeits-Platzhalter sind die Blaupause. Eigene,
   frische Session (Schema-Migration + Tests).
3. **Die 3 neuen Roadmap-Items** (Feedback-Pipeline / Zen-Timer / Hardware-Liste)
   — falls der User eins priorisiert.
4. **Variante A** (Voll-Sub-Tab-Routing alle Sub-Systeme) + **Workstream-1-Reste**
   (Design-System: h3-Titel, FilterBar, Button-Spezialfälle) + **Phase 6**
   (Render-Abbau, DNS apex→Hetzner, `feature/W-api-prefix`→`main`).

---

## ✅ ERLEDIGT 2026-05-31 — Große UX-/Struktur-Überarbeitung (IA-Umbau W1–W6 KOMPLETT)

> **Wichtigste offene Arbeit.** Referenz-Dokumente (PFLICHT-Lesen bei
> Wiederaufnahme): `docs/ux-audit-2026-05-30.md` (Ist-Zustand + P1–P10)
> und `docs/ia-zielbild-2026-05-30.md` (flow-orientiertes Zielbild +
> 6-Wellen-Umbauplan).

**User-Entscheidungen (verbindlich):** Tab-Umbau „neu denken (flow-
orientiert)"; visuell „ruhiger/aufgeräumter"; Haupt-Nav = 4 Flow-Tabs
(Timer/Statistik/Training/Community); Konto & Daten → ins UserMenu;
Admin → eigener Bereich; Dashboard+Analyse → ein Tab „Statistik"
(Übersicht→Detail).

### Workstream 1 — Design-System (risikoarm, additiv, läuft)

Neue Primitive in `src/components/ui/` (Card, CardTitle/SectionLabel/
SubTitle, Button [sm/md/lg], EmptyState [sm/md]) + `lib/cn.ts`.
**WICHTIG:** `<Card>` behält `bg-gray-900/50` — der Glassmorphism-/Skin-
CSS-Selektor (index.css) hängt exakt an diesem + den Akzent-Varianten
(bg-emerald-500/10 etc.). Tab-weise Migration:
- ✅ Foundation + StatsCard (`W.design-system-foundation`, getaggt)
- ✅ Dashboard 9 Cards (`W.design-system-dashboard`)
- ✅ Analyse 6 + Timer 5 (`W.design-system-analyse-timer`)
- ✅ Trainer + Community 5 (`W.design-system-trainer-community`,
  commit `f61dfde`) — **damit alle 4 Flow-Tabs design-system-konsistent.**
  TrainerTab selbst hat keine Cards (nur hand-gerollte Sub-Tab-nav, P8).
- ⬜ **Verwaltung/Admin-Panels bewusst NICHT separat** — werden im
  IA-Umbau (WS2) mit-migriert (sonst Doppelarbeit, da sie umziehen).
- ⬜ Spätere Runden: h3-Titel-Vereinheitlichung (farbige Icon-Titel,
  Design-Entscheidung nötig), Button-Spezialfälle (segmented controls/
  Toggle-Buttons), FilterBar-Konsolidierung (P10).

Migrations-Rezept (für Sub-Agenten bewährt): Container-div→`<Card>`
(p-6→default, p-4→sm, p-5→md; Zusatzklassen via className NICHT
verlieren), Card-Haupttitel→`<CardTitle>`, Error→`tone="danger"`,
nackter Leer-`<p>`→`<EmptyState>` (kompakt: size="sm"). Toggle-/Akzent-
Buttons + emerald/purple/blue-Akzent-Cards bewusst LASSEN. Danach
zentral `npx tsc --noEmit` + qa-reviewer + commit als `chore(W.design-
system-<tab>)`.

### Workstream 2 — IA-Umbau (FAST DURCH — Stand 2026-05-31)

6-Wellen-Plan in `docs/ia-zielbild-2026-05-30.md`. Jede Welle einzeln
getaggt + live + QA-geprüft:
1. ✅ `W.ia-statistik-merge` — Dashboard+Analyse → ein Tab „Statistik"
   (Übersicht→Detail, controlled section).
2. ✅ `W.ia-konto-usermenu` — Verwaltung-Base-Inhalte → UserMenu „Konto &
   Daten" (KontoDatenView, controlled). User-Entscheidung „sofort aufräumen".
3. ✅ `W.ia-admin-bereich` — Admin+Tester eigener UserMenu-Bereich (Sub-Nav),
   `VerwaltungTab.tsx` GELÖSCHT. Damit TabBar für ALLE 4 Flow-Tabs.
4. ✅ **`W.ia-tabbar-flow` ENTFÄLLT** — durch W2+W3 miterledigt (4 Flow-Tabs
   für alle + localStorage/Hash-Migration analyse/dashboard/verwaltung).
5. ✅ `W.ia-subtab-routing` — SCHLANK (User-Wahl B): nur Statistik-Detail
   bookmarkbar (`#statistik/detail`) + Browser-Back via pushState.
   **⚠️ OFFEN (User-Wunsch): Variante A — Voll-Sub-Tab-Routing für ALLE 5
   Sub-Systeme (Konto/Admin/Community/Trainer auch) — nochmal anbieten/abwägen.**
6. ✅ `W.ia-nav-entdopplung` — Footer/UserMenu-Redundanz aufgelöst
   (Features/Roadmap/Feedback nur noch im UserMenu = kanonischer Hub),
   doppelter Header-LanguageSwitcher entfernt, verwaiste i18n-Keys weg.
   **→ IA-UMBAU KOMPLETT. Alle Wellen getaggt + live verifiziert.**

**Doku nachgezogen:** `docs/permissions-matrix.md` (Abschnitt 1+4) auf die
neue Nav (4 Flow-Tabs + UserMenu-Bereiche) — Daten-Sichtbarkeit unverändert.

**Reste aus Workstream 1 (Design-System):** h3-Titel-Vereinheitlichung,
Button-Spezialfälle, FilterBar-Konsolidierung (P10) — nice-to-have, offen.

**Workflow-Neuerung 2026-05-31:** ntfy-Push bei Fragen an den User ist
jetzt verbindlich (CLAUDE.md) — vor dem Turn-Ende `.tmp/last-ntfy-message.txt`
schreiben, der `stop-ntfy-notify.sh`-Hook pusht sie ans Topic `jjY2OjY`.

### 🔜 Offen für nächste Session(en)

1. **🆕 Frische User-Roadmap-Items (P1, im Admin-Panel angelegt 2026-05-31):**
   - **„Konto & Daten / Einstellungen aufräumen"** — direktes Feedback auf
     den IA-Umbau (W2). Der neue Konto-Bereich (`KontoDatenView`) + das
     `SettingsPanel` sollen aufgeräumt werden. **Wahrscheinlich die nächste
     konkrete Arbeit** — beim Start dieses Item + Feedback-Inbox klären.
   - **„Roadmap-pflege"** — Roadmap-Items pflegen/aufräumen.
   - „Überschriften fix im Dashboard" ist bereits **done**
     (W.skin-readability-headings).
   - ⚠️ Diese Items sind nur LIVE in der Admin-DB, NICHT im Code-Seed
     `webapp/seeds/roadmap.py` — bei Bedarf dort aufnehmen (sonst
     DB-Wipe-Verlust).
2. **Variante A — Voll-Sub-Tab-Routing** (User-Wunsch, zuerst nochmal
   abwägen): alle 5 Sub-Systeme (Konto/Admin/Community/Trainer auch)
   bookmarkbar machen. Aufwand: 4 Komponenten → controlled + zentrale
   Hash-Sync in MainLayout. Realnutzen gering — deshalb in W5 bewusst
   schlank (nur Statistik). StatistikTab ist die Blaupause.
3. **Workstream-1-Reste** (Design-System, nice-to-have): h3-Titel-
   Vereinheitlichung (farbige Icon-Titel), Button-Spezialfälle (segmented
   controls / Toggles), FilterBar-Konsolidierung (Audit-P10).
4. **Phase 6** (~2026-06-05): Render-Abbau, DNS apex→Hetzner,
   `feature/W-api-prefix` → `main`, GitHub-Default → main.

---

## ✅ ERLEDIGT 2026-05-30 (Tag) — UX-Vorarbeiten + PWA + Skins

Vor der großen Überarbeitung mehrere User-Wünsche + Foundation, alle
getaggt+gepusht+live:
- `W.skin-readability` + `W.skin-readability-headings` — Footer/Health-
  Badge/Dashboard-Section-Headings auf Skin-Hintergründen lesbar.
- `W.timer-card-tap` — Timer-Display selbst auf Phone tappbar (Bonus
  neben TouchTimerPad). Neu: `lib/touch-timer.ts` (dispatchSpace).
- `W.pwa-manifest` + `W.pwa-offline` — **PWA komplett**: Homescreen-
  Install + Service-Worker (offline App-Shell, /api/* network-only,
  Update-Toast via lib/toast.ts). `public/sw.js` + `lib/pwa-register.ts`.
  Grenze: kein Offline-MIT-Daten (bräuchte React-Query-Persistenz).
- `W.skin-maxcontent` — +2 Skins (Pixel Academy + Lofi Solver Max
  Content). Jetzt 10 Themes. Convert-Script `.tmp/convert_v2_skins.py`.

---

## ✅ ERLEDIGT 2026-05-30 (Nacht) — Tier B komplett + 4 Skin-Wellen

Nach `/compact` weitergegangen — **5 weitere Wellen** committet+getaggt+
gepusht, alle live. Tier B ist damit **komplett durch**.

- `W.cache-invalidation-prefix` (Tag, **internal**) — Tier-B-Refactor: alle
  React-Query-Keys laufen jetzt über zentrale `qk`-Konstante (neue
  `lib/queryKeys.ts`) mit Domain-Prefix-Hierarchie. Mutations invalidieren
  per Prefix-Match statt 13-Zeilen-Einzellisten. Beifang: **3 reale Bugs
  gefixt** — stille No-Op-Invalidates in `useResetMyData`, stales
  Leaderboard nach Solve, stales Stats nach CSV-Import. ~140 Stellen in
  api.ts + BackupPanel + AccountSettingsPanel + ImportPanel + App.tsx.
  QA-Sub-Agent: 0 KRITISCH + 4 SOLLTE + 2 NICE — alle vor Push gefixt.

- `W.toast-manager` (Tag, **internal**) — Tier-B-Refactor: zentraler Pub-Sub-
  Store `lib/toast.ts` (6 Severities, 4 Positionen) + `ToastHost.tsx`-
  Renderer. Die 3 alten Toaster (Achievement/Challenge/FeedbackUnread)
  sind jetzt reine Listener (null-rendering) — ~90% Code-Doppel
  eliminiert. Künftige Toasts brauchen keine neue Komponente, einfach
  `toast.success(...)`. QA: 0 KRITISCH + 4 SOLLTE + 2 NICE alle gefixt.
  **Follow-up offen:** `PbConfettiOverlay`-Timer-Leak (als spawned Task
  geflagt, pre-existing).

- `W.cstimer-dynamic-import` (Tag, **public**) — Tier-B-Bundle-Splitter,
  letzte Welle vor Tier-B-Abschluss. csTimer-Code aus Initial-Bundle
  rauslazy-loaden, scramble.ts wird async. **-122 KB unkomprimiert /
  -43 KB gzip** beim Erstladen — spürbar bei langsamem Mobile +
  Login-Flow (wo Scrambles gar nicht gebraucht werden).

- `W.skin-algorithm-lab-codex-v2` (Tag, **public**) — Algorithm Lab +
  Codex Vitruvian auf **"No Real Cube Edition"** aktualisiert (12 WebP-
  Files ersetzt, gleiche IDs → User-Settings bleiben gültig). Die
  realistischen Plastik-Cubes sind raus, dafür Wireframes/OLL+PLL-
  Diagramme.

- `W.skin-pixel-academy-lofi` (Tag, **public**) — Zwei NEUE Skins:
  **Pixel Academy** (Pixel-Art Coding-Club, bunt, Kids 8-12) und
  **Lofi Solver** (cozy rainy-night, dunkel, warmes Orange/Violett).
  Total Skin-Anzahl jetzt 9 (none + 8). Plus features-data.ts-Drift-
  Korrektur (Bullet sagte "6 Themen", jetzt korrekt 8).

### ✅ Erledigt: ROADMAP_EXPORT_KEY-Setup

Die offene User-Aktion vom Spätabend-Block ist durch — Coolify hat den
Key (Backend antwortet auf `/api/roadmap/export` mit `is_admin: true`),
lokale Datei `.tmp/roadmap-export-key` ist da, `roadmap-fetch.py --brief`
zeigt "34 Items (Admin, inkl. intern)". Tooling-Pfad ist durabel,
`.tmp/admin-token` wird nicht mehr gebraucht.

### 🔜 Reste für die nächste Session

**🟢 Frei wählbar — keine offenen Wellen, alles Tier-B-fertig:**

**🔴 Blockiert / groß (warten auf User-Input):**
- PLL-Bilder (deine 21 PNGs warten).
- Smart-Cube v5 (Diagnose-Logs gelöster Cube + Console-Screenshot).
- PWA-Setup (Service-Worker-Caching-Entscheidungen + Icons).
- Alembic (DB-Migration-Framework — Deploy-Risiko).
- Battle/3D-Vis/Reconstruction/Trainer-Subsets (mehrere Wochen, Design).
- Ranking / Level (großes Feature mit Profil + Level-Badges).

**🟢 Optional / Polish:**
- SolveList: react-window-Virtualisierung wenn Mount-Jank auf alten Phones
  weiterhin auftritt.
- PbConfettiOverlay-Timer-Leak (separater Task, off-scope von toast-manager).
- Browser-Cache-Strategie für Skin-Asset-Swaps (Versionssuffix oder CDN-Purge).

---

## ✅ ERLEDIGT 2026-05-29 (Spätabend) — 3 Wellen: Tests + SolveList + Export-Key

Nach dem Tier-A-Batch noch 3 substanzielle Wellen draufgesetzt — alles
getaggt + gepusht, **32 Backend-Tests grün**, QA-Sub-Agent über jeden
heiklen Teil (0 KRITISCH).

- `W.backend-test-suite` (Tag `v2.0.0-alpha.W.backend-test-suite`, **internal**) —
  Roadmap-Item „Backend-Test-Suite einführen". Befund: `tests/` existierte
  schon (2 Files, pyproject hatte `testpaths`). Erweitert um:
  **`webapp/.venv`** (Editable-Install `-e .[dev]`, die /abschluss-erwartete
  Stelle), `conftest.py` (Test-SQLite via `DATABASE_URL` vor Import,
  `make_user`-Fixture mintet Token direkt → kein Login-Rate-Limit), und
  **13 Smoke-Tests** über health / auth (register/login/me + Negativ) /
  solves (create/list + Cross-User-Isolation) / roadmap (public vs admin-
  Flag) / admin-guard. Schöner Nebenbefund: `require_admin` returnt für
  authenticated Non-Admins **404** statt 403 (versteckt Admin-Endpoints).
  **Tests laufen mit:** `webapp/.venv/Scripts/python.exe -m pytest tests/ -q`

- `W.solvelist-scroll-cap` (Tag, **public**) — User-Wunsch: SolveList in
  bounded Scroll-Box statt Seite zu sprengen. Default-Limit 100→50,
  Mobile-Cards + Desktop-Tabelle je in `max-h-[70vh] overflow-y-auto`,
  Desktop-Header sticky. Limit-Selektor bleibt. Honest-Note: leichte
  Variante; bei weiterhin ruckelndem 1000-Zeilen-Mount auf alten Phones
  ist react-window die Folge.

- `W.roadmap-export-key` (Tag, **internal**) — User-Wunsch: dauerhafter
  Roadmap-Zugriff fürs Tooling, ohne den stündlich ablaufenden JWT.
  Neue key-gated Endpoints `GET /api/roadmap/export` (volle Items inkl.
  internal) + `POST /api/roadmap/export/done` (setzt status=done per
  title_de-Match, idempotent). Auth via Header `X-Roadmap-Key` gegen
  ENV `ROADMAP_EXPORT_KEY`. **Safe-by-default:** Endpoints sind 404 bis
  die ENV-Var gesetzt ist. Constant-time-Compare, schmaler Write-Surface
  (nur status="done"). Tooling (`roadmap-fetch.py`) bevorzugt jetzt den
  Export-Key, JWT bleibt Fallback. 7 Tests dazu (Gesamtsuite 32 grün).
  QA-Sub-Agent: 0 KRITISCH, 2 SOLLTE umgesetzt (per-Titel-max_length,
  try/except um db.commit).

### 🔲 OFFENE USER-AKTION (1×, ermöglicht den durabel-Tooling-Pfad)

**`ROADMAP_EXPORT_KEY` setzen** — 4 Schritte, je ~10 sec:

1. **Key generieren** (lokal, nie in den Chat):
   `python -c "import secrets; print(secrets.token_urlsafe(32))"`
2. **Coolify** → Backend-App → Environment → `ROADMAP_EXPORT_KEY=‹wert›` →
   **Redeploy** (Coolify-Knopf oder neuer Push). Bis dahin: Endpoint 404.
3. **Lokal:** `D:\Projekte\cubetracker\.tmp\roadmap-export-key` (gitignored,
   `.txt`/`.md`-Endung wird auch akzeptiert) — derselbe Wert.
4. **Testen:** `python .claude/hooks/roadmap-fetch.py --brief` →
   sollte „Admin, inkl. intern" ohne Ablauf zeigen.

Danach kann `.tmp/admin-token` weg (Export-Key gewinnt; JWT bleibt nur
als Fallback im Code).

### 🔜 Reste für die nächste Session (frischer Stand)

**🟡 Tier B (mehr Regressions-Fläche, je ~3h, einzeln mit Extra-QA):**
- Cache-Invalidation-Refactor (15 Mutation-Hooks → Query-Key-Prefix-Pattern).
- Toast-Manager (Severity-Stacking + dedizierte Engine — touch 3 bestehende Toaster).
- csTimer-Vendor dynamic-importen (Bundle-Split, Async-Refactor scramble.ts).

**🔴 Blockiert / groß:**
- PLL-Bilder (deine 21 PNGs warten).
- Smart-Cube v5 (Diagnose-Logs gelöster Cube + Console-Screenshot).
- PWA-Setup (Service-Worker-Caching-Entscheidungen + Icons).
- Alembic (DB-Migration-Framework — Deploy-Risiko).
- Battle/3D-Vis/Reconstruction/Trainer-Subsets (mehrere Wochen, Design).
- Ranking / Level (dein eigenes Item — großes Feature mit Profil + Level-Badges).

**🟢 SolveList wenn alte-Phone-Mount-Jank noch da ist:**
- Echte DOM-Virtualisierung via `react-window` (nur ~sichtbare Zeilen im DOM).

---

## ✅ ERLEDIGT 2026-05-29 (Abend) — 5 risikoarme Auto-Mode-Wellen (Tier A)

Nach dem `.tmp/admin-token`-Setup (Token funktioniert) `/roadmap` durchgelaufen
→ Live-Roadmap = 34 Items. Daraus die risikoarmen, solo-machbaren Items gebaut
(User-Greenlight „Tier A komplett + Ranking"). Alle gebaut → Build/Test grün →
einzeln gepusht → **QA-Sub-Agent über den Batch: 0 KRITISCH, safe-to-deploy.**

- `W.roadmap-seed-ranking` (Commit, kein Tag) — live-only Item „Ranking / Level"
  (P1, intern, von dir im Panel angelegt) in `seeds/roadmap.py` gesichert
  (DB-Wipe-Schutz). note_de verbatim, note_en nachübersetzt.
- `W.random-move-fallback` (Tag, internal) — Dino/Floppy/Tower hingen nur an
  csTimer; bei dessen Crash gab es leeren Scramble. Jetzt Fallback-Specs in
  `CUSTOM_PUZZLE_SPECS`. Tests + Node-Check grün.
- `W.wca-503-banner` (Tag, **public**) — globales Banner bei WCA-Ausfall
  (502/503/504), neue `WcaStatusBanner.tsx`, reused `useMyWcaProfile`-Query.
- `W.recharts-split` (Tag, internal) — Recharts via `LazyCharts.tsx` lazy →
  Initial-Bundle **536 → 426kb gzip (~110kb kleiner)**. Charts laden erst
  beim Render.
- `W.roadmap-admin-reorder-qa`-Nachzug + dieser Block: QA-NICE (bare `open()`
  in roadmap-fetch.py → `with`).

**Token-Mechanik bewährt:** `.tmp/admin-token` (akzeptiert auch `.txt`/`.md`-
Endung), `/roadmap` zeigt live-only Items + neue seit letztem Start.

### 🔜 Reste / Ideen (nicht Tier A)
- **🟡 Tier B** (mehr Regressions-Fläche, einzeln mit Check): Cache-Invalidation-
  Refactor, Solve-Liste-Virtualisierung, Toast-Manager, csTimer-Vendor-Lazy.
- **🔴 Blockiert/groß:** PLL-Bilder (deine PNGs), Smart-Cube v5 (deine Logs),
  PWA, Alembic, Battle/3D-Vis/Reconstruction.
- **🟢 Roadmap-Items als „done" markieren:** Random-Move-Fallback + 503-Banner
  + Recharts-Split sind erledigt → im Admin-Panel auf done setzen (oder ich per
  PATCH, wenn du willst).

---

## ✅ ERLEDIGT 2026-05-29 (Nachmittag) — 3 User-Tasks: Skins + Roadmap-Pflege + /roadmap-Tooling

**Letzte Welle: `W.roadmap-admin-reorder-qa` (Hardening, kein Tag).** Branch
`feature/W-api-prefix`, alles gepusht. Health-Badge → `v2.0.0-alpha.W.skin-three-themes`
(letzter public PatchNote). Working-Tree clean ausser den bekannten untracked
Assets (PNGs/ZIPs/scripts/).

**Vier Wellen:**
- `W.skin-three-themes` (Tag `cc5d988` / `v2.0.0-alpha.W.skin-three-themes`,
  **public**) — 3 neue Hintergrund-Skins eingebaut: `pb-hunt-focus`,
  `algorithm-lab`, `codex-vitruvian` (jetzt 6 Skins). Pipeline:
  `appsafe/`-Subordner je ZIP → `convert-skins.cjs` → je 5 WebP + Preview.
  Registry in `lib/skins.ts`, i18n DE+EN, Marketing-Bullet `accountBullet7`
  3→6. **Hero-Splash-Varianten liegen in separatem Ordner → kein Konflikt**
  (`--src` zeigt auf `appsafe/`).
- `W.roadmap-admin-reorder` (Tag `37955c3` / `v2.0.0-alpha.W.roadmap-admin-reorder`,
  internal) — Roadmap-Items im Admin-Panel per ▲/▼ sortierbar (oben zuerst).
  Atomarer Endpoint `POST /admin/roadmap/reorder` (require_admin) +
  `useAdminReorderRoadmap`-Hook. **Reorder nur aktiv ohne Status-/Sichtbarkeits-
  Filter** (sonst würden versteckte Items verwürfelt — Hinweis im Panel).
- `roadmap-session-fetch` (Commit `fa003ff`, reines Tooling, kein Tag) —
  `/roadmap`-Command + Session-Start-Abruf der Live-Roadmap. Engine:
  `.claude/hooks/roadmap-fetch.py` (liest `.tmp/admin-token`, Bearer →
  `GET /api/roadmap`; Snapshot-Diff für neue Items + Code-Seed-Regex für
  live-only Items). In `session-start-context.sh` + CLAUDE.md verdrahtet.
- `W.roadmap-admin-reorder-qa` (Commit `cae3975`, Hardening) — qa-reviewer:
  0 echte KRITISCH, 2 SOLLTE gefixt (Schema `ge=1`, Callback-Guard), 1 NICE.

**Roadmap-Reconciliation-Befund:** Live-DB zeigt öffentlich nur **3 Items**
(Admin hat ~30 auf `internal=True` gesetzt, inkl. PWA/Activity-Feed/Battle).
Das ist **bewusste Admin-Wahl** (per „Öffentlich"-Toggle jederzeit änderbar) —
alle 33 Seed-Items sind live, kein Verlust. `/roadmap` flaggt künftig
automatisch live-only Items (im Panel angelegt, nicht im Code-Seed).

### 🔲 OFFENE USER-AKTION (1×, ermöglicht /roadmap + Session-Start-Abruf)
**`.tmp/admin-token` anlegen:** als Admin auf cubetracker.de einloggen →
DevTools → Application → Local Storage → Wert von `cubetracker_access_token`
kopieren → in `.tmp/admin-token` (gitignored) ablegen. Danach zieht der
Session-Start-Hook + `/roadmap` die volle Live-Roadmap. Token ist kurzlebig →
bei „HTTP 401" einfach neu kopieren.

---

## ✅ ERLEDIGT 2026-05-29 (Vor-Demo-Sa) — 7 Wellen Pre-Demo-Polish + Feature-Modal-Refactor + Roadmap-Doku-Cleanup + WSJF-Reorder

**Letzte Welle: `W.roadmap-wsjf-reorder` (internal, Tag folgt im Push).**
Davor: `W.roadmap-doku-cleanup` (Tag `v2.0.0-alpha.W.roadmap-doku-cleanup`),
`W.feature-curation` (Tag `7c16ecb`). Branch
`feature/W-api-prefix`, alles gepusht. Backend live, Health-Badge bleibt bei
`v2.0.0-alpha.W.feature-curation` (die 2 roadmap-Wellen sind `internal=True`,
`current_version()` überspringt internal-Einträge). Working-Tree clean ausser 5 alte
PNGs/scripts/ (irrelevant) + **3 NEUE Wallpaper-Packs** vom User in
`frontend/src/assets/`: `cubetracker_pb_hunt_competition_focus_template2_pack.zip`,
`cubetracker_algorithm_lab_theme_pack.zip`,
`cubetracker_codex_vitruvian_cube_theme_pack.zip` — Stoff für die
nächsten Skin-Wellen (Skins 4-6: „PB Hunt Competition Focus", „Algorithm
Lab", „Codex Vitruvian Cube", lt. Filenames).

### Sprint-Gruppen heute (5 Wellen)

**Gruppe 8 — Marketing-Liste + Cross-Diff** (3 Wellen):
- `W.features-data-update` (Tag `bb9a1ed`, internal) — Skin-System +
  GAN-Smart-Cube als Bullets in `features-data.ts` nachgezogen
  (war im /abschluss-Check ⚠ markiert).
- `W.feature-audit-and-hook` (Tag `69ef56b`) — vollständiger Sub-Agent-
  Audit aller ~70 Features im Code gegen die Marketing-Liste. 6 Lücken
  als neue Bullets nachgezogen (Mehrsprachigkeit DE/EN, Voice-Alerts,
  Multi-Cube-Compare, Outlier-Pflege, Feedback-Workflow,
  Roadmap+Patch-Notes-Modal). **Plus post-git-commit.sh-Hook erweitert**
  (Check 4): warnt jetzt bei `feat(W.X)`-Wellen die weder
  `features-data.ts` noch neuen `features.*`-Locale-Key anfassen, es
  sei denn W.X matched Backstage-Pattern (qa/fix/hardening/...).
- `W.feature-curation` (Tag `7c16ecb`) — strukturelles Refactor der
  Marketing-Liste: jedes Bullet hat jetzt eine `audience`-Klassifikation
  (public/expanded/internal). Default-LoginPage-Modal zeigt 23
  kuratierte Public-Bullets, „Mehr anzeigen"-Toggle zeigt zusätzlich
  13 Expanded-Bullets. 11 Internal-Bullets sind ganz raus aus
  User-Sicht. **5 Konsolidierungen** (Timer-Modi + Hauptbullet,
  Sessions + Trainings-Sets, csTimer Import + Export, JSON-Backup
  inkl. Achievements, Hardware-Standard-Liste + Markieren). **2
  Kategorie-Umzüge** (PLZ → Speedcubing-Welt, Feedback → Community).
  Single-Source via `BulletAudience`-Type + `filterBulletsByAudience()`
  Helfer-Funktion.

**Gruppe 9 — Vor-Demo-Polish** (3 Wellen):
- `W.pre-demo-fixes` (Tag `e881738`) — drei Fixes vor der Demo: (1)
  Smart-Cube-Block liegt jetzt direkt unter `BigTimerInput`, auch im
  Fokus-Modus sichtbar. (2) `AdminLiveTestsPanel` fetcht jetzt für
  Tester (Bug: `enabled` war auf `isAdmin` gepinnt, Tester sahen
  permanent „Lade Live-Tests …"). (3) LoginPage-Tiles + Trust-Pills
  sind klickbar — öffnen das Features-Modal und scrollen zur
  passenden Kategorie (lila Highlight 2.4s).
- `W.login-logo-visible` (Tag `d35d4b7`) — LoginPage-Logo bleibt auch
  bei aktivem Skin sichtbar (User-Wunsch). CSS-Override via zweite
  Klasse `cubetracker-logo-always`.

**Gruppe 10 — Roadmap-Doku-Cleanup** (1 Welle, internal):
- `W.roadmap-doku-cleanup` (Tag folgt) — analoges Sub-Agent-Audit wie
  morgens für Features, jetzt auf die Roadmap angewandt. Cross-Diff über
  5 Schichten (ROADMAP.md / seeds/roadmap.py / lib/roadmap-phases.ts /
  changelog/data.py / NEXT_SESSION.md). Ergebnis: **6 Stellen Doku-Drift**
  — 5 verwiesen auf nicht-mehr-existentes `roadmap-data.ts` (das File
  wurde mit W.roadmap-modal-api gelöscht, Phase-Meta liegt seither in
  `roadmap-phases.ts`, Items in DB-Tabelle `roadmap_items`), 1 Hook-Hint
  in `post-git-commit.sh` gab veraltete Anweisung. Plus: Aufklärungs-
  Block in ROADMAP.md ergänzt, der die zwei Phase-Konzepte erklärt
  (historische Release-Timeline 1..9 vs. thematische Cluster P1..P6).
  **Item-Stand bestätigt**: 33 DB-Seeds in P1/P3/P4/P5/P6, P2=done — kein
  Item-Drift, nur Doku-Drift.

**Gruppe 11 — Roadmap nach WSJF priorisiert** (1 Welle, internal):
- `W.roadmap-wsjf-reorder` (Tag folgt) — die 33 Items in eine
  entwicklungs-sinnvolle Reihenfolge gebracht. WSJF = Cost-of-Delay ÷
  Effort, CoD ausgewogen aus USP/Reichweite/Risiko/Nachfrage. Pro Phase
  neu sortiert + **2 Phasen-Wechsel P6→P1**: Backend-Test-Suite
  (Fundament) + Random-Move-Fallback (Quick-Win). Abhängigkeiten als
  Constraints (3D-Vis vor Reconstruction, Battle vor Friend-Challenges).
  Smart-Cube Status-Drift-Note bereinigt (v1-v4 live, v5 offen).
  **Technik**: einmalige selbst-deaktivierende Migration
  `reorder_roadmap_once` (Sentinel = Backend-Test in P6), weil Seeder
  INSERT-only sind. Smoke-getestet + QA 0 KRITISCH. **Wenn du künftig
  die Reihenfolge ändern willst**: Items via Admin-UI reordern (bleibt
  jetzt erhalten, Migration ist deaktiviert) ODER `WSJF_TARGET_ORDER` in
  `seeds/roadmap.py` editieren + Sentinel-Item kurz auf P6 zurücksetzen.

### 🔜 Offen für nächste Session (Sa Vormittag — Demo-Tag)

**Direkte Demo-Vorbereitung:**
- **🔲 Phone-Demo-Probe via 12 Admin-Live-Tests** (Du-Aktion, ~30 min) —
  Reihenfolge folgt dem realen Demo-Flow. Bei FAIL: Notiz im UI → ich
  fixe gezielt.
- **🔲 Viertes Wallpaper-Pack** als Skin „PB Hunt Competition Focus"
  einbauen — ZIP liegt schon in `frontend/src/assets/`. Workflow ist
  klar (npm run skins:build → Registry-Eintrag → i18n → Push), ~30 min.

**Demo-irrelevant aber bald nachzuholen:**
- **🔴 Smart-Cube Auto-Solved-Detection** (`W.gan-cube-auto-time-v4`-
  Welle wartet weiterhin auf v4-Logs vom User: gelöster Cube +
  Console-Screenshot mit `[SmartCube] FACELETS len=... solved=...`-
  Zeile). Ohne die Diagnose kein v5-Fix möglich.
- **🟡 Demo-Backend-Welle Schritt-für-Schritt** neu aufbauen (Lesson
  aus dem Revert: jeder Step einzeln live-verifizieren — Schema-
  Migration → Seed leer → Solve-Chunks von 20 → require_not_demo).
- **🟡 QA-Hotfixes** aus den Skin-Reviews: Flash-of-wrong-style auf
  Reload, A11y Arrow-Key-Nav im Radiogroup, convert-skins Path-
  Traversal-Schutz, Progress-Bar-Tracks im Glass-Mode.
- **🟡 Permissions-Matrix updaten** (`docs/permissions-matrix.md`
  Stand 2026-05-28 → 29: Skin-System + Card-Style ergänzen,
  Tester-LiveTests-Bug klarstellen).
- **🟡 Hook erweitern**: BulletDef.audience-Pflicht-Check (verhindert
  vergessen beim nächsten Bullet-Add).
- **🟡 Roadmap-Drift-Hook** (optional, niedrige Prio): analog Features-
  Hook ein post-commit-Check „bei `feat(W.X)`-Commits warnen, wenn weder
  `roadmap-phases.ts` noch ein DB-Roadmap-Endpoint angefasst wurde".
  Aus dem Roadmap-Audit 2026-05-29 als Stufe 3 zurückgestellt — Roadmap-
  Drift passiert deutlich seltener als Feature-Drift, Wert ist niedrig.

---

## ✅ ERLEDIGT 2026-05-28 (Spätschicht) — Skin-System + LoginPage-Refresh + Demo-Backend-Revert

**Letzte public Welle: `W.skin-card-fix-v2` (Tag `221fdc0`).** Working-Tree
clean (5 alte untracked PNGs/scripts/ aus Vor-Tagen, nicht Session-relevant),
alles gepusht. Bilanz Spätschicht: **9 Wellen + 7 Tags + ~16 Commits** (inkl.
3 Revert-Commits für die gescheiterte Demo-Backend-Welle).

### Sprint-Gruppen Spätschicht

**Gruppe 5 — Skin-System (3 Skins + Card-Stil + Logo-Hide)** (6 Wellen):
- `W.skin-cyberpunk-mvp` (Tag `e35fdba`) — Background-Skin-System + 1. Skin
  „Cyberpunk Neon" + Settings-Picker. Asset-Pipeline mit sharp/WebP + 5
  Auflösungen pro Skin. localStorage-Persistenz, BackgroundLayer.
- `W.skin-glassmorphism` (Tag `d02f251`) — Card-Stil als zweite Achse:
  „Deckend" (Status-quo) vs. „Glas / transparent" (rgba 0.78 + blur 10px
  saturate 140%). Zentraler CSS-Override per `body[data-card-style="glass"]`.
- `W.skin-hide-logo` (Tag `bdfa98e`) — App-Logo (Header + LoginPage) wird
  bei aktivem Skin ausgeblendet, weil das Cubetracker-Logo im Background-
  Bild integriert ist (Doppelung vermeiden). Header schaltet auf flex-end.
- `W.skin-legendary-partymode` (Tag `d5ed5e1`) — zweiter Skin (jetzt
  umbenannt zu „Cyberpunk Laser"). Per-Skin `background-position` (Cube
  Mitte-links statt unten). Convert-Script JPG-Support.
- `W.skin-rename-and-party-fun` (Tag `78575d3`) — Rename „Legendary
  Partymodus" → „Cyberpunk Laser" mit LEGACY_SKIN_ID_MAP für sanfte
  Migration. Plus dritter Skin „Party Fun" (helle Paint-Splash-Bonbons,
  Cube mittig, 7 Auflösungen inkl. 1366×768 HD + 1080×1920 Portrait).
- `W.skin-solid-fix` (Tag `1987920`) — Akzent-Cards (`bg-emerald-500/5`
  etc.) wurden im Deckend-Modus nicht erfasst weil sie schon mit /5
  opacity halbtransparent gerendert sind. Selektor-Liste erweitert.
- `W.skin-card-fix-v2` (Tag `221fdc0`) — gleiche Klasse Bug für graue
  Slash-Tokens (`bg-gray-900/50`, `bg-gray-800/40` etc.) — typisch für
  User-Settings-Cards (WCA-ID, Passwort, Email). Selektor-Liste erweitert.

**Gruppe 6 — Vor-Demo-Polish** (1 Welle):
- `W.smart-cube-position-restore` (Tag `144cae5`) — SmartCubeConnect-
  Block wieder unter TimerControlsCard (= „Timer-Modus"). Im Fokus-Modus
  damit ausgeblendet. User-Wunsch.

**Gruppe 7 — LoginPage-Refresh** (1 Welle):
- `W.login-redesign` (Tag `e249089` + Patch-Note-Nachschlag `885ea99`) —
  Konzept A: Skin-Slideshow im Hintergrund (rotiert alle 6s durch die 3
  Skins, opacity-Crossfade 1200ms), Logo zentriert, kompakte Login-Card,
  3 Trust-Pills inline, 4 Feature-Icon-Tiles. Komplett-Refactor des
  bisherigen 2-Spalten-Layouts. LoginPageBackgroundLayer als eigene
  Komponente.

### 🔴 Reverted Demo-Backend-Welle

Die Demo-Backend-Welle hat das Backend live gekillt → 502. Revert:
- `W.demo-user-backend` (Commit `1ec82c3`) — Schema-Migration `users.is_demo`,
  Bootstrap mit ~120 Sample-Solves, `require_not_demo`-Dep auf 34 mutating
  Endpoints, neuer Endpoint `POST /auth/demo-login`. Lokal SQLite-Smoke
  hatte funktioniert (118 Solves), aber Production-Postgres-Container
  crashed-loop't. Verdacht: eager `_DUMMY_PW_HASH = hash_password(...)`
  Top-Level + Solve-Bulk-Insert blockt uvicorn-Worker beim Cold-Start.
- `W.login-redesign-and-demo` (Commits `de97e82` + `3f42de2`) — Frontend-
  Welle mit Demo-Login-Button + DemoBanner. Reverted weil keine
  Backend-Endpoint mehr.
- Revert-Commits `ce7a95c`, `bc2c07d`, `4ffbcaa` — Coolify hat den
  Revert-Push als Backend-Change erkannt + den alten Backend-Stand
  re-deployed → live wieder OK (Health zeigt `W.skin-solid-fix`-Backend +
  jetzt mit `W.skin-card-fix-v2`-Frontend).

**Lesson für nächste Demo-Backend-Welle:**
1. Schema-Migration ALLEIN pushen → verify Backend lebt → next
2. Bootstrap ohne Sample-Solves → verify → next
3. Sample-Solves in Chunks von 20 → verify → next
4. `require_not_demo`-Dep nur auf solves.py → verify → next
5. Etc. — jeder Step einzeln live-verifizieren BEVOR der nächste.

### 🔜 Restplan vor Demo Sa 30.05.

- ✅ Skin-System komplett (3 Skins + Card-Stil + 2 Fixes)
- ✅ Smart-Cube-Position wieder unten (vor-Demo-Wunsch)
- ✅ LoginPage neu (Konzept A, Skin-Showcase, kompakt)
- ✅ Backend lebt (W.skin-card-fix-v2)
- ⏸ Demo-Account-Button vertagt auf Post-Demo-Sprint
- ⏸ Smart-Cube-Auto-Solved-Detection wartet weiterhin auf v4-Diagnose-Logs vom User
- 🔲 Phone-Demo-Probe via 12 Admin-Live-Tests (Du-Aktion, ~30 min)
- 🔲 features-data.ts ergänzen mit Skin-System-Bullets (offen — User-facing-
  Welle ohne Marketing-Bullet, kann auch Post-Demo)

### ⚠ Offene Punkte für die nächste Session

1. **Smart-Cube v4-Diagnose-Logs** abwarten (User-Aktion: gelösten Cube +
   Console-Screenshot mit `[SmartCube] FACELETS len=... solved=...`)
2. **Demo-Backend-Welle Schritt-für-Schritt** neu aufbauen (siehe Lesson oben)
3. **features-data.ts ergänzen** mit Bullet für Skin-System + Card-Stil +
   Smart-Cube-Integration
4. **QA-Hotfixes aus den ursprünglichen Reviews** noch offen: Flash-of-wrong-
   style auf Reload, convert-skins Path-Traversal-Schutz, A11y Arrow-Key-Nav

---

## ✅ ERLEDIGT 2026-05-28 (Voller Mega-Tag) — 25 Wellen in einer Sitzung

**Letzte Welle: `W.gan-cube-auto-time-v4` (internal, Tag `becf7be`).**
Live-public-Version: `W.gan-cube-auto-time-v3` (= letzte public Welle vor
den v4-Diagnose-Logs). Working-Tree clean, alles gepusht.

### Sprint-Gruppen heute (chronologisch)

**Gruppe 1 — UX-Audit + Mobile-Polish + Diagnose-Korrektur** (4 Wellen):
Siehe Block „Abend 2026-05-28" unten — W.ux-demo-polish, W.roadmap-restore
(+ -clarify), W.ux-demo-polish-qa.

**Gruppe 2 — Tester-Permission + Timer-Polish + LoginPage Trust** (8 Wellen):
- `W.tester-readonly-roadmap` (+ QA) — Tester sieht Roadmap nur lesend
- `W.timer-lastsolves-all` — „Alle Solves" + interner Scroll
- `W.timer-focus-mode` — Fokus-Toggle versteckt Sub-Cards
- `W.timer-display-size` (+ v2) — A−/A+ + neues App-Logo, danach
  Polish + Alle-Solves-Bug-Fix
- `W.login-trust-block` — „Was wir mit deinen Daten machen" auf LoginPage
- `docs/permissions-matrix.md` — Single-Source-Doku via Sub-Agent
- `W.timer-polish-pbs` (+ QA) — A−/A+ überall, globale Scrollbar,
  PB-Markers in LastSolvesPreview, ao100-Toggle, PB-Werte in Live-Karte

**Gruppe 3 — Admin + Feedback-Inbox** (2 Wellen):
- `W.admin-snapshot-limit` — Storage X/Limit + Progress-Bar
- `W.feedback-admin-tester-improvements` — archived versteckt + „+ Feedback"-
  Button für Admin und Tester via Custom-Event

**Gruppe 4 — GAN i4 Smart-Cube-Saga** (10 Wellen):
1. `W.gan-cube-mvp` — Skeleton + Pairing-UI
2. `W.gan-cube-mvp-deps` — npm-Versionsfix (^1.8.0 existierte nicht)
3. `W.gan-cube-mvp-qa` — DISCONNECT-Handler + Race-Guard nach QA
4. `W.gan-cube-mvp-tsbuild` — TypeScript-Types `web-bluetooth` für
   navigator.bluetooth (Build crashed silent!)
5. `W.gan-cube-connect-fix` — Chrome User-Gesture-Bug:
   `await import("gan-web-bluetooth")` schiebt requestDevice hinter
   Promise-Microtask → kein Dialog. Static import statt dynamic.
6. `W.gan-cube-mac-fallback` — GAN-Cubes brauchen MAC für AES-Decryption.
   Auf Windows-Chrome ist Auto-Detection aus. User-Prompt + localStorage-
   Cache. Plus Hinweis auf chrome://flags fuer Auto-Detection.
7. `W.gan-cube-auto-time` — Initial State-Machine (idle/solving/solved)
   + Custom-Event `cubetracker:smart-cube-solve`
8. `W.gan-cube-auto-time-v2` — Ready-State + Manual-Stop + Fokus-
   Sichtbarkeit (SmartCubeConnect aus TimerControlsCard raus,
   eigene Position in TimerTab)
9. `W.gan-cube-auto-time-v3` — `REQUEST_FACELETS`-Polling: Library
   schickt FACELETS nicht automatisch nach Move, muss explizit angefragt
   werden via `sendCubeCommand({type: "REQUEST_FACELETS"})`
10. `W.gan-cube-auto-time-v4` — detaillierter Diagnose-Log (internal)

### 🔴 OFFEN für nächste Session — Smart-Cube-Auto-Detection

**Was funktioniert:** Pairing, MAC-Workflow (Variante A oder B Chrome-Flag),
Move-Counter, Manual-„Solve fertig"-Button → BigTimerInput-Auto-Save +
Solve landet in der Tabelle.

**Was NICHT funktioniert:** Auto-Solved-Detection trotz `REQUEST_FACELETS`-
Polling. `isCubeSolved()` greift nicht (Cube wird nicht als solved erkannt).
Mögliche Ursachen:
- Facelets-Format anders als Doku sagt (`UUUUUUUUURRRR...` 54-char)?
- Library schickt OLD-state nach REQUEST_FACELETS (Latency)?
- Race-Condition zwischen MOVE + FACELETS + setState?

**User-Aktion:** mit v4-Logs nochmal solven + Screenshot der Console mit
dem letzten `[SmartCube] FACELETS len=... solved=... [U=W(✓) R=...]`-
Zeile beim physisch gelösten Cube. Dann sehe ich präzise was die Library
liefert.

**Plus offen (v5):** großer Timer-Display im BigTimerInput zeigt während
Smart-Cube-Solve den laufenden Timer (sonst sieht User „0.00" und denkt
nichts passiert — der laufende Timer lebt nur im kleinen SmartCubeConnect-
Block).

### 🔜 Restplan (unverändert: Demo Sa 30.05.)

- Phone-Demo-Probe via die 12 Admin-Live-Tests (Du-Aktion, ~30 min)
- Bonus-Smoke-Test für die heute hinzugekommenen Wellen
- Smart-Cube-Demo als „Wow"-Moment **WENN** Auto-Detection bis dahin läuft

Bilanz heute: **25 Wellen + 25 Tags + ~30 Commits**. Realistisch zwischen
Vormittag und 2-3 Uhr nachts. GAN-Cube war 10 davon — ein klassisches
„Bibliothek-Verstehen kostet 10× mehr als gedacht".

---

## ✅ ERLEDIGT 2026-05-28 (Abend, Gruppe 1) — UX-Audit + Mobile-Polish + Roadmap-Restore-Diagnose

**4 Wellen + 4 Tags am Abend, alles live.** Letzte public-Welle:
`W.ux-demo-polish`. Backend skippt die drei nachfolgenden internal-Wellen
in `current_version()`, also bleibt das Versions-Badge sauber bei der
Mobile-Polish-Welle.

### Welle 1 — `W.ux-demo-polish` (public, `e86dfd1`)

UX-Audit-Schnell-Scan via 4 parallele `Explore`-Sub-Agents (10 Kategorien
× je Score 1-10) lieferte 9 KRITISCH-Befunde. 4 davon mit hohem Phone-
Demo-Impact + niedrigem Refactor-Risiko sofort gefixt, 5 größere
Refactors als P1-Roadmap-Items für nach der Demo:

**4 Mobile-/A11y-Fixes live:**
- **SolveList Mobile-Card-View** (`SolveList.tsx`) — neuer Card-Stack
  für `<md` mit Zeit + PB-Marker (★/☆) + ao5/ao12 + Cube + Aktionen
  als Tap-große Buttons. Card-Tap öffnet Detail-Modal (kein Inline-
  Edit auf Phone — der lebt im Modal). Tabelle bleibt ab `md+`
  unverändert via `hidden md:block`.
- **Header-Mobile-Hide** (`App.tsx`) — `LanguageSwitcher` + `HealthBadge`
  in `hidden md:flex` gewrapped. Backup-Zugriff: LanguageSwitcher liegt
  im UserMenu (zweiter Switcher, bewusst redundant gehalten), Patch-
  Notes via UserMenu→"Was ist neu?".
- **Modal-Padding** (`p-6` → `p-4 md:p-6`) in 5 Modals: PatchNotesModal
  + FeaturesModal (App.tsx inline) + RoadmapModal + FeedbackModal +
  SolveDetailModal. ~30px mehr Content-Breite auf 375px-Phones.
- **Kontrast WCAG-AA** — Footer + LanguageSwitcher inactive-State:
  `text-gray-500/600` → `text-gray-300/400`. Ratio von ~2.8:1 (Fail)
  auf ~6.8:1 (Pass) gezogen.

**5 Post-Demo-Items via additive Migration in der Live-Roadmap-DB:**
- `bootstrap_ux_polish_items()` in `seeds/roadmap.py` mit per-Item-
  Idempotenz (title_de-Match), nicht count-check.
- 3 public sichtbar: 503-Banner für WCA, Toast-Manager mit Severity-
  Stacking, Solve-Liste virtualisieren (1000+ Solves).
- 2 internal Tech-Debt: Recharts code-splitting (~70kb Bundle),
  Cache-Invalidation-Refactor (Query-Key-Prefix).

### Welle 2 — `W.roadmap-restore` (internal, `e79ab6d`) → später als Fehldiagnose markiert

Initial-Verify nach Welle 1 zeigte nur 3 Items in der Live-`/api/roadmap`
statt der erwarteten ~27. Reflex-Hypothese: Postgres-Volume-Issue +
Datenverlust. **Code-Fix:** `bootstrap_roadmap()` von count-check
(`if existing > 0: return 0`) auf per-Item-Idempotenz (title_de-Match,
analog zu UX-Polish-Bootstrap) umgestellt. Theorie: fehlende Items
kommen beim nächsten Boot zurück.

Push lief glatt — Bootstrap hat aber NICHTS hinzugefügt (Items waren
alle schon da, nur internal-gefiltert). Siehe Welle 4.

### Welle 3 — `W.ux-demo-polish-qa` (internal, `74fc2d6`)

QA-Sub-Agent-Review der ersten zwei Wellen: **0 KRITISCH, 3 SOLLTE,
2 NICE, 4 POSITIV.** Alle 3 SOLLTE sofort gefixt:

- **SOLLTE 1 (Data-Quality):** `bootstrap_roadmap` +
  `bootstrap_ux_polish_items` berechneten `max(sort_order)` im Loop
  ohne `db.flush()` — bei mehreren neuen P1-Items im selben Boot
  hätten alle dieselbe `sort_order` bekommen. Fix: explizites
  `db.flush()` vor `max()`.
- **SOLLTE 2 (WCAG 2.1.1):** SolveList-Mobile-Card hatte `role="button"`
  + `tabIndex=0` ohne `onKeyDown` — fokussierbar aber nicht
  aktivierbar. Fix: `onKeyDown` für Enter+Space.
- **SOLLTE 3 (Event-Bubbling):** Aktions-Container in der Mobile-Card
  stoppte nur `onClick`, nicht `onKeyDown` — nach SOLLTE-2-Fix hätte
  Enter auf einem Aktions-Button doppelt-getriggert (Aktion + Detail-
  Modal). Fix: `onKeyDown={(e) => e.stopPropagation()}`.

**NICE-Backlog:** PatchNotesPanel-Loading-States haben hartes `p-6`
(Doppel-Padding auf Mobile). UNIQUE-Constraint auf `roadmap_items.
title_de` wäre defensiv gegen Parallel-Boot-Race. Beide deferred.

### Welle 4 — `W.roadmap-restore-clarify` (internal, `2fdb3a7`)

User-Befund nach Welle 2-Verify: **„NUr zur info: ich hatte manuell in
der app die Roadmap-Einträge auf intern umgestellt"** → kein Datenverlust,
sondern bewusste Admin-UI-Aktion. Items waren weiterhin in der DB, nur
für Non-Admins per `/api/roadmap`-Filter unsichtbar. Das `count: 3` ist
also korrekt: 28 internal-geflaggte alte + 3 neue public UX-Polish +
2 neue internal UX-Polish = 33 in der DB, 3 davon public.

Korrektur:
- Neuer Patch-Note `W.roadmap-restore-clarify` (internal=True) der
  den Audit-Trail richtigstellt.
- Docstring von `bootstrap_roadmap` geschärft: **„Items aus User-Sicht
  entfernen → `internal=True`-Toggle via Admin-UI (Quick-Action im
  AdminRoadmapPanel), NICHT Delete — der bringt sie beim nächsten
  Container-Restart zurück."**
- Code-Verhalten bleibt: per-Item-Idempotenz ist defensiver gegen
  ECHTEN zukünftigen Volume-Reset, schadet in der aktuellen Situation
  nicht.

### 🔜 Restplan (unverändert: Sa Vormittag)

Sprint ist durch. Demo-Probe am Sa über die 12 Admin-Live-Tests
(Verwaltung → Admin → Live-Tests) + Bonus-Smoke für Tester+Feedback-
Wellen aus dem Mi-Fr-Block. Backlog (Post-Demo) jetzt offiziell in
der Live-Roadmap-DB einsehbar — 5 P1-Items aus dem UX-Audit
hinzugekommen.

**Lesson für die nächste Session:** Live-Verify nach Coolify-Deploy
muss DB-Inhalt gegen den ERWARTETEN BUSINESS-State prüfen („welche
Items _sollten_ jetzt public sein?"), nicht gegen abstrakte Historie-
Doku-Zahlen. Sonst landet man bei einer Fehldiagnose wie heute.

---

## ✅ ERLEDIGT 2026-05-27/28 — Turnier-Sprint + Roadmap-DB + Tester-Rolle + Feedback-Inbox

**~70 Commits + ~49 Tags in 1,5 Tagen, alles live.** Live-public-Version:
`W.roadmap-modal-api` (= letzte public-Welle; danach diverse internal-Wellen
für Roadmap-DB, Demo-Probe-Seed, Roadmap-Admin-UI, Quick-Actions, Tester-
Rolle, Feedback-Inbox). Backend skippt internal-Einträge in `current_version()`,
also sieht der User im Changelog sauber drei Top-Wellen: `W.roadmap-modal-api`,
`W.wca-profile-light`, `W.i18n-en-release` — nicht den ganzen Audit-Trail
dahinter.

**Bilanz Mi-spät / Do-Voll im Detail:**
- Mi-Vormittag/Mittag: Backlog-Sprint (Average-PB, Danger-Zone, Letzte
  Rekorde, Roadmap-intern) + 3 QA-Hotfixe + GitHub-Issue #1 vollständig
  adressiert.
- Mi-Spät: Turnier-Sprint Wellen 1-3 (i18n-Infra + LoginPage/Footer +
  Flaggen-Switcher + ChatGPT-Logo-Hinweis im Impressum).
- Do-Vormittag/Mittag: Massen-i18n Wellen 10-23 (Solve-Flow, Dashboard,
  Analyse-Tab, Charts, Toaster, Verwaltung-Sub-Panels, Trainer, Community,
  Friends).
- Do-Nachmittag: Konsolidierung + 2 QA-Wellen (CubeStateView/ScrambleNet
  Hardcoded-DE-Strings + Roadmap-Modal DE-only-Hinweis bei EN).
- Do-Spät: **WCA-Profil-Light komplett gebaut** — Schema + Endpoint +
  AccountSettings + Dashboard-Card + QA-Hotfix + 4-Bug-Fix gegen echte
  WCA-API-Quirks.
- Do-Nacht/Fr-Früh: **Demo-Probe-Seed + Roadmap-Migration** (siehe Block
  „Wellen 31-35" weiter unten).

🎯 **Turnier-Sprint:** Englisch-Variante + WCA-Profil-Light für privates
Demo beim WCA-Turnier in Meppel **Sa 30.05.** — beide Demo-Features sind
**am Mi/Do live geworden**, ein Tag früher als geplant. **Restplan:** nur
noch Sa-Vormittag (oder schon Fr) Demo-Probe via den 12 Admin-Live-Tests
(siehe „Restplan" unten).

### ✅ Patch-Notes-Konsolidierung erledigt

Welle `W.i18n-en-release` (public, am Do gepusht): ALLE 30 i18n-Einzel-
wellen sind im Changelog auf `internal=True` versteckt, ein sauberer
public Sammeleintrag „🇬🇧 Englische Version verfügbar" ersetzt sie für den
User. Audit-Trail bleibt für Admin komplett einsehbar.

Mechanik: Python-Regex-Pass über `webapp/changelog/data.py` flippte 16
public-Einträge auf internal, plus neuer Sammeleintrag oben — alles in
einem Commit `ea6d9a9`. Reproduzierbar dokumentiert.

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

### Wellen 24-30 (Do-Spät, 27.05.) — Konsolidierung + WCA-Profil + QA

> **Konsolidierung + i18n-QA-Polish:**
> - `W.i18n-en-release` (public Sammeleintrag) — 16 public i18n-Wellen
>   auf `internal=True` geflaggt + neuer Top-Eintrag „🇬🇧 Englische Version
>   verfügbar". Reproduzierbarer Python-Regex-Pass. Commit `ea6d9a9`.
> - `W.i18n-qa` (internal) — 2 KRITISCH-Findings nach Konsolidierungs-QA
>   gefixt: `CubeStateView.tsx:32` hartkodiertes `title="Kein Diagramm…"`
>   + `ScrambleNet.tsx:60` hartkodiertes `aria-label="2D-Cube-Net…
>   gelöst"`. Neue Keys `algTrainer.noImage`/`diagramAlt` + `scramble.
>   netAriaLabel`/`netSolvedFallback`. Commit `34a93f2`.
> - `W.i18n-roadmap-notice` (internal) — Roadmap-Modal zeigt bei EN einen
>   amber Hinweis-Banner „Roadmap content is currently only available in
>   German" statt komplett-DE-Modal. Volle Roadmap-Übersetzung wäre ~1h
>   für ~50 Items + 30 Notes + 6 Phases — post-Demo. Commit `cb71b6e`.
>
> **WCA-Profil-Light (P9-Feature komplett):**
> - `W.wca-profile-backend` (internal) — `users.wca_id`-Spalte +
>   `GET /wca/me/profile`-Endpoint (Rate-Limit 30/min, 422/404/503
>   differenziert) + `fetch_person()` mit 6h-Cache + 404-negative-cache.
>   Backup-Export erweitert um `user_wca_id`. Commit `8e3bfe7`.
> - `W.wca-profile-light` (**public**) — UI: AccountSettings WcaIdSection
>   mit Pattern-Validation + Direkt-Link, neue `WcaProfileCard` mit
>   Avatar/Name/Country/Delegate-Badge + Stats-Grid (Comps/Medals/
>   Records/Events) + PB-Tabelle (Single+Average mit bestem WR/CR/NR-
>   Badge in Gold/Lila/Blau) + Recent-Comps-Liste. Dashboard-Integration
>   in „Speedcubing-Welt"-Sektion. 32 neue Locale-Keys DE/EN. Plus
>   `features-data.ts` worldBullet6. Commit `7876add`.
> - `W.wca-profile-qa` (internal) — QA-Sub-Agent fand 4 SOLLTE + 3 NICE +
>   4 POSITIV. Demo-relevante Fixes: useQueryClient + invalidateQueries
>   nach wca_id-Change (sonst 6h staleTime-Lock), bestRankBadge bei
>   selbem Tier (vorher: NR-Single #10 vs NR-Average #2 → falsch #10),
>   404-negative-cache TTL 6h→30min, backendDetail-cap 200 chars,
>   url-nullable mit Render-Guard, NewsCard volle Breite. Commit
>   `17e6818`.
> - `W.qa-polish` (internal) — getIntlLocale(resolvedLanguage)-Helper in
>   lib/format.ts. 6 Konsumenten migriert (BackupPanel, NewsCard,
>   WcaProfileCard, LeaderboardTab, PatchNotesPanel, WcaUpcomingCard).
>   Commit `ca0f55e`.
> - `W.wca-profile-bugfix` (internal) — **User-Befund nach Live-Test:**
>   Wettkampf-Count 0, Medaillen 0, Recent-Comps leer. Ursache: 4 Key-
>   Mismatches gegen die echte WCA-API-v0 (verifiziert gegen Zemdegs):
>   `competition_count` (Singular!) statt `competitions_count`,
>   records-Keys `world`/`continental`/`national` statt WR/CR/NR,
>   PR-rank-Keys `continent_rank`/`country_rank` statt
>   `continental_rank`/`national_rank`, und `/persons/{id}` liefert
>   GAR KEIN `competitions`-Feld — Wettkampf-Historie kommt aus
>   `/persons/{id}/competitions` (separater Endpoint). Backend mappt
>   die Quirks intern, Frontend unverändert. **Lesson archiviert:
>   API-Quirks immer mit Live-Response gegenchecken.** Commit `e5c0273`.

### Wellen 31-35 (Do-Nacht / Fr-Früh, 27./28.05.) — Demo-Probe-Seed + Roadmap-DB

> **Demo-Probe-Seed:**
> - `W.demo-probe-meppel-seed` (internal) — 12 Live-Tests via Cold-
>   Start-Bootstrap in `seeds/live_tests.py` angelegt. Reihenfolge
>   folgt dem realen Demo-Flow am Phone (Login → Dashboard → Solve →
>   Analyse → Verwaltung → Trainer → Community → WCA-Profil → Backup
>   → Modals → Persistenz). Idempotent via related_phase-Marker.
>   Cross-Admin-Visibility war im Bestand schon korrekt — kein
>   Endpoint-Change nötig. Commit `bb329e7`.
>
> **Roadmap → DB-Migration (4 Wellen):**
> - `W.roadmap-db` (internal) — Neue Tabelle `roadmap_items` (id +
>   phase_id + sort_order + title_de + title_en + note_de + note_en +
>   effort + status + internal + timestamps). Pydantic-Schemas mit
>   Literal-Typing P1-P6 + active/done. Public-Endpoint GET /api/
>   roadmap (filtert internal=True für Non-Admins). Admin-CRUD POST/
>   PATCH/DELETE /api/admin/roadmap/items. Seed mit 28 kuratierten
>   Items (alle done aus altem ts-File entfernt — Hetzner, Backlog,
>   i18n, WCA-Profil sind durch). Bootstrap idempotent. Commit
>   `711f8ef`.
> - `W.roadmap-modal-api` (**public**) — RoadmapModal liest jetzt
>   aus useRoadmap-Hook, alte lib/roadmap-data.ts (~300 Zeilen)
>   gelöscht, neue lib/roadmap-phases.ts mit Phase-Meta + i18n-Keys.
>   Vollständig DE/EN — der amber „German only"-Banner aus
>   W.i18n-roadmap-notice ist Geschichte. Commit `7cb7723`.
> - `W.roadmap-admin-ui` (internal) — AdminRoadmapPanel als neuer
>   Block im Admin-Tab zwischen Live-Tests + Users. Liste gruppiert
>   nach Phase + Counter, Filter (Phase/Status/Visibility), Inline-
>   Edit alle 9 Felder, Create-Form + Delete-Confirm. Cache-
>   Invalidation auf ['roadmap'] nach Mutations. 43 neue Locale-
>   Keys DE/EN (1202/1202 symmetrisch). Commit `950f77b`.
> - `W.roadmap-admin-qa` (internal) — QA-Sub-Agent fand 0 echte
>   KRITISCH (Security-Kette POSITIV: require_admin + extra=forbid
>   + Cache-Invalidation + Anonymous-Filter) + 3 SOLLTE. Sofort
>   gefixt: deletingId-State (per-Row-Disable statt global),
>   key={id}-{view|edit} ItemRow-Reset gegen stale-form, Empty-
>   State im RoadmapModal (neuer Locale-Key roadmap.emptyState),
>   Seed-Re-Run-Verhalten im Docstring dokumentiert. Commit
>   `6775a78`.
>
> Live-Verify nach Coolify-Deploy: /api/roadmap anonym liefert
> 24 Items (28 - 4 internal), Admin-Endpoints alle 401 unauth,
> Bundle enthält Roadmap-Pflege + emptyState + alle Phase-Titel
> DE+EN. POSITIV-Findings vom QA: Cross-Admin-Filter sauber,
> Mass-Assignment via extra=forbid blockiert, Cache invalidiert
> bei jeder Mutation.

### Welle 36 (Do-spät) — Roadmap-Admin-Quick-Actions

> Vor den Tester+Feedback-Wellen noch ein User-Vorschlag umgesetzt:
> Im AdminRoadmapPanel sind „intern↔öffentlich" und „aktiv↔erledigt"
> jetzt Quick-Toggle-Buttons in der View-Mode-Row neben Bearbeiten/
> Löschen. 1-Klick, kein Confirm (Rückgängig per 2. Klick). Per-Row-
> Busy-Disable.
>
> `W.roadmap-admin-quickactions` (internal) — Commit `549e624`.
> 8 neue Locale-Keys (1211/1211 symmetrisch).

### Wellen 37-43 (Fr-Nacht, 27.→28.05.) — Tester-Rolle + Feedback-Inbox

> **Strategischer Refactor:** der „per Email"-Versand für Feedback ist
> Geschichte. Stattdessen DB-Inbox mit Admin-Antwort-Workflow + neue
> Tester-Rolle für QA-Workflow ohne Admin-Vollzugriff.
>
> - `W.tester-role-db` (internal) — Schema (users.is_tester +
>   feedback_messages-Tabelle), neue require_admin_or_tester-Dep an 7
>   Live-Tests- + Roadmap-Endpoints, Public/Admin-Endpoints für
>   Feedback-CRUD (3/h Rate-Limit pro User). Commit `e0e4de0`.
> - `W.feedback-modal-rebuild` (internal) — FeedbackModal: Mail-Mode
>   raus, „Per App"-Mode rein (schreibt in DB-Inbox). Anonyme User
>   (Login-Seite-Footer) sehen nur GitHub-Mode. 4 Kategorien jetzt
>   (general/bug/feature/other, +1). Commit `8f18a2d`.
> - `W.feedback-inbox-ui` (internal) — AdminFeedbackInboxPanel im
>   Admin-Tab: Stats-Badges (offene Bugs rot, Features lila, Allgemein
>   blau), Filter (Status + Kategorie), pro Item Status-Quick-Toggles
>   + Antwort-Editor + Delete. Sortierung: ungelesene oben mit blauem
>   Dot. Commit `fa8bbb6`.
> - `W.tester-tab-ui` (internal) — VerwaltungTab: neuer Tester-Tab
>   (🧪) für is_tester && !is_admin (rendert Live-Tests + Roadmap-
>   Panels). AdminUsersPanel: neuer 🧪 Tester-Toggle pro User-Zeile +
>   TESTER-Badge. Commit `a23eab1`.
> - `W.feedback-user-view` (internal) — User-Sicht: neuer „💬 Mein
>   Feedback"-Block in Verwaltung → Meine Daten (eigene Items + Admin-
>   Antworten, auto-mark-as-seen beim Aufklappen). FeedbackUnreadToaster
>   beim Login (6s Auto-Hide, Klick springt zur Sektion). Commit
>   `3e0c505`.
> - `W.session-scan-feedback` (internal) — session-start-context.sh +
>   /abschluss erweitert: gh issue list (Top 5) + Reminder zur
>   Admin-Inbox-URL beim Session-Start + neuer /abschluss-Check 11
>   („Offene Bugs / Feedback vor Session-Ende?"). Commit `1579702`.
> - `W.tester-feedback-qa` (internal) — QA-Sub-Agent fand 2 KRITISCH +
>   5 SOLLTE + 1 NICE + 4 POSITIV. Sofort gefixt: (1) admin_response
>   ohne min_length=1 → leerer String löschte still die Antwort
>   (Datenverlust), (2) InboxRow.responseDraft stale nach Refetch
>   (analog roadmap-admin-qa) → useEffect-Sync, (3) Privacy: User-
>   Endpoint /feedback/me/* nutzt jetzt FeedbackMessageUserRead ohne
>   user_id/admin_response_by_user_id, (4) delete_live_test wieder
>   require_admin (Tester kann nicht Test-Historie löschen), (5)
>   markSeen-Deps reduziert (kein 60s-Refetch-Replay), (6) Toaster-
>   Timer-Variable umbenannt (kein t-Shadowing). Commit `9fc1f40`.
>
> POSITIV-Verifikation: alle 4 /admin/feedback/* hinter require_admin
> (Tester sieht Inbox NICHT), kein User-ID-Spoofing möglich,
> mark_response_seen IDOR-frei, is_tester-Migration idempotent.

### 🔜 Restplan (nur noch Sa Vormittag)

**Du-Aktion (Fr Abend oder Sa Vormittag, ~30 Min):** Phone-Demo-Probe
über die **12 Admin-Live-Tests** (Verwaltung → Admin → Live-Tests).
Reihenfolge folgt dem realen Demo-Flow. Pro FAIL: Notiz im UI + status=
fail → öffnet automatisch ein GitHub-Issue, das fixe ich morgen direkt.

Checkliste-Highlights:
1. Sprach-Switcher im Header (Flagge klicken → sofort EN)
2. Login-Seite komplett EN
3. Dashboard EN: alle 11 Karten ohne DE-Reste
4. Timer-Tab EN: Solve eintippen + Penalty + Live-Karte
5. Analyse-Tab EN: Charts + Solve-Liste + Solve-Detail-Modal
6. Verwaltung-Tab EN: alle 6 Sub-Tabs (+ Admin- oder Tester-Tab)
7. Trainer + Community EN
8. WCA-ID setzen → Karte erscheint sofort
9. WCA-Profil: echte Zahlen (Wettkampf-Count + Medaillen + PRs + Comps)
10. Backup-Download EN → JSON enthält user_wca_id
11. Roadmap-Modal EN: vollständig EN, Items aus DB
12. Sprach-Persistenz nach Reload + Logout

**Bonus-Smoke-Test für die neue Tester+Feedback-Welle (~10 min):**
- Feedback-Modal: Per-App-Mode schreiben → in Admin-Inbox prüfen
- Admin-Antwort schreiben → in „Mein Feedback" + Toaster beim Login
- 🧪 Tester-Toggle setzen + abloggen + neu einloggen → Tester-Tab erscheint
- Tester sieht NUR Live-Tests + Roadmap-Pflege (keine Inbox/Users/Stats)

**Optionale Post-Demo-Items (Backlog, NICHT Sprint-blocker):**
- **AdminFeedbackInbox user-email/display_name anzeigen** (QA-SOLLTE-
  Backlog) — aktuell nur `Von User #42`, UX-Friction für Support-Cases.
  FeedbackMessageRead um user_email-Feld erweitern oder Link zur
  User-Liste setzen.
- AdminStatsPanel + AdminUsersPanel hartkodiert `"de-DE"` — Admin-only,
  Demo-irrelevant, getIntlLocale-Migration für Vollständigkeit.
- Activity-Feed (P3-USP, ~3 Tage) — Multi-User-Differenzierung gegen
  csTimer.
- PWA-Setup (P1, ~1 Tag) — letztes P1-Item, Phone-Homescreen-Install.
- Phase 6 (~05.06.) — apex `cubetracker.de` → Hetzner + Render abbauen
  + Branch `feature/W-api-prefix` → `main`.
- Backend-Test-Suite (P6, internal) — 0% Coverage.
- ConfirmDialog-Komponente statt native confirm() im Admin-Roadmap +
  Admin-Feedback.
- Cleanup: `emailing/service.py:send_feedback_email` ist tot (wird
  nirgendwo mehr aufgerufen seit W.feedback-modal-rebuild) — kann
  in einer späteren Tooling-Welle raus.

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
