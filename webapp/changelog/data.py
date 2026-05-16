"""Patch-Notes als Single-Source-of-Truth.

Konvention seit 2026-05-14:
  - Bei JEDER Aenderung neuer Eintrag oben in PATCH_NOTES.
  - `version` folgt SemVer-Schema `2.0.0-alpha.W.X.Y` waehrend Multi-User-
    Web-Phase. v2.0.0 sobald Hetzner-Migration durch + Feature-Set stable.
  - `__version__` in main.py wird automatisch aus PATCH_NOTES[0].version
    abgeleitet — damit "vergisst man nicht" die Versionsnummer hochzuziehen.
  - Frontend liest /api/changelog und rendert in Verwaltung → Patch Notes.

Format:
    PatchNote(
        version="2.0.0-alpha.W.X",
        released=date(2026, 5, 14),
        title="Kurzer Titel",
        highlights=["Aufzaehlungs-Punkt 1", "Punkt 2"],
        commit="abc1234",  # optional, fuer Cross-Reference
    )

KEINE Markdown im title/highlights — Frontend rendert als plain text.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date


@dataclass(frozen=True)
class PatchNote:
    version: str
    released: date
    title: str
    highlights: list[str]
    commit: str | None = None


# Neue Eintraege OBEN einfuegen — PATCH_NOTES[0] = neueste Version.
PATCH_NOTES: list[PatchNote] = [
    PatchNote(
        version="2.0.0-alpha.W.features-refresh",
        released=date(2026, 5, 16),
        title="Feature-Liste „Was kann cubetracker?" auf Stand gebracht",
        highlights=[
            "Solving: Scramble-Picker (WCA + Inoffiziell: Ivy, Gear, "
            "Redi, Master Pyraminx, Master Skewb, FTO) ergaenzt — war "
            "in der Marketing-Liste nicht sichtbar, obwohl seit heute "
            "im Timer-Tab nutzbar.",
            "Solving: Drei-Modi-Picker (Text/WCA/Pragmatisch) + "
            "Trainings-Sets (5/12/25/50/100 + Set-Statistik + Coaching-"
            "Feedback) waren portiert aber nicht erwaehnt — jetzt drin.",
            "Analyse: Mo3 in Best-Times-Aufzaehlung dazu (heute neu in "
            "den Tabellen). Best-Avg-Timestamps + Detail-Modal pro "
            "Solve waren portiert aber stumm — jetzt erwaehnt.",
            "Trainer: „Algs-Trainer mit Visualisierung\" war "
            "ueberoptimistisch — gilt nur fuer OLL (57 Bilder). PLL-"
            "Bilder folgen noch, jetzt ehrlich kommuniziert.",
            "Account: Postleitzahl im Profil dazu (Vorbereitung fuer "
            "„WCA-Turniere in deiner Naehe\").",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.welle2-3-qa",
        released=date(2026, 5, 16),
        title="QA-Fixes nach Welle 2 + 3",
        highlights=[
            "Race-Condition beim Speichern nach Cube-Wechsel behoben: "
            "wenn man unmittelbar nach Cube-Wechsel speicherte, konnte "
            "die alte (cube-fremde) Hardware persistiert werden, weil "
            "der Auto-Suggest noch nicht durch war. Jetzt: hardwareId "
            "wird beim Cube-Wechsel auf null gesetzt — worst case ist "
            "„ohne Hardware" statt „falsche Hardware".",
            "Custom-Scramble-Generator (Ivy, Gear, …) hatte einen "
            "theoretischen Endlos-Loop wenn eine Spec nur 1 Base-Move "
            "gehabt haette. Defensive Guard rein — bei <2 Bases "
            "deaktivieren wir den „kein-Wiederholen"-Filter automatisch, "
            "damit der Tab nicht haengt.",
            "Scramble-Picker bei Session-Vorgaben (z.B. „pll" aus einer "
            "PLL-Trainings-Session): Toggle/Dropdown wuerde inkonsistent "
            "wirken, weil pll weder in WCA noch in Inoffiziell ist. "
            "Jetzt: beide Toggle-Buttons un-highlighted, statt Dropdown "
            "ein Hinweis „Aus Session-Vorgabe: pll — Toggle waehlen "
            "um zu aendern". Klick auf einen Toggle wechselt sauber in "
            "die jeweilige Kategorie.",
            "Code-Hygiene: tote Props in ModeButton (disabled/disabled"
            "Title) raus, redundante mt-4 auf TouchTimerPad entfernt "
            "(space-y-4 des Parents reichte), eslint-disable-Kommentar "
            "in ScrambleCard erklaert (Identitaets-stabile Callback-Prop).",
            "Tests: „kein direktes Wiederholen"-Iterationen von 10 auf "
            "100 erhoeht — kostet <50ms, schliesst Glueckstreffer bei "
            "kleinen Move-Sets (gear hat nur 3 Bases) aus.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.scramble-picker",
        released=date(2026, 5, 16),
        title="Scramble-Picker: WCA + Inoffiziell (Ivy, Gear, Redi, …)",
        highlights=[
            "ScrambleCard hat jetzt einen Picker: Toggle WCA ↔ "
            "Inoffiziell + Dropdown mit den verfuegbaren Typen. Default "
            "folgt weiterhin dem gewaehlten Cube-Type — bei Override "
            "erscheint ein „↺ auto"-Button um wieder zum Default zu "
            "springen.",
            "WCA-Liste: alle WCA-Cubes (3x3, 4x4, …, Pyraminx, Skewb, "
            "Square-1, Megaminx, Clock) — werden weiterhin von scrambow "
            "generiert (WCA-quality, Mindest-Distanz).",
            "Inoffizielle Cubes (User-Wunsch): Ivy Cube, Gear Cube, "
            "Redi Cube, Master Pyraminx, Master Skewb, FTO. FTO via "
            "scrambow, die anderen via eigenem Random-Move-Generator mit "
            "„kein direktes Wiederholen derselben Achse"-Filter — nicht "
            "WCA-quality, aber sauber fuers Casual-Training.",
            "Cube-Type-Wechsel resettet den Picker automatisch, sodass "
            "der neue Cube wieder seinen passenden Scramble bekommt — "
            "verhindert „Ivy-Scramble fuer 3x3"-Stolperfallen.",
            "Session.scramble_type (csTimer-Import + PLL/OLL-Trainings-"
            "Sessions) wird weiterhin respektiert — User-Picker schlaegt "
            "es aber, falls man manuell aenderen will.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.timer-layout",
        released=date(2026, 5, 16),
        title="Mobile-Timer-Layout: Scramble direkt ueber Timer + Selektoren unten",
        highlights=[
            "Phone-Reihenfolge im Timer-Tab umgebaut: Scramble → Timer-"
            "Display → „Tippen & halten"-Pad → erst danach Cube-/Session-/"
            "Hardware-Selektoren + Timer-Modus. Damit ist beim Solven kein "
            "Scrollen mehr noetig — alles Wichtige sichtbar.",
            "BigTimerInput aufgeteilt: Selektoren leben jetzt in einer "
            "eigenen TimerControlsCard, das Timer-Display ist nur noch das "
            "Solving-Eingabefeld + Save. Klare Verantwortlichkeiten, "
            "leichter zu warten.",
            "hardwareId nach TimerTab hochgezogen — der Save-Pfad in "
            "BigTimerInput nutzt jetzt dieselbe Quelle wie der Selektor-"
            "Block, kein State-Auseinanderdriften mehr moeglich.",
            "Desktop unveraendert: Live-Solves links (420px), Solving "
            "rechts. Nur die Reihenfolge innerhalb des Solving-Spalts "
            "folgt jetzt der mobile-Logik (Selektoren unten).",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.mo3-ao100",
        released=date(2026, 5, 14),
        title="Mo3 + AO100 in Solve-Tabellen + Mobile-Scroll",
        highlights=[
            "Tabellen-Spalten erweitert: Solvenummer, Zeit, Mo3, AO5, "
            "AO12, AO100, Cube, Hardware — alle sortierbar per Spaltenkopf-"
            "Klick",
            "Mo3 = arithmetisches Mittel der letzten 3 Solves (kein Trim, "
            "DNF macht Mo3 ungueltig) — WCA-Standard fuer Big-Cubes (6x6, "
            "7x7) wo nur 3 Solves pro Round zaehlen",
            "AO100 = trimmed mean ueber 100er-Fenster, WCA-konform (5er-"
            "Trim pro Seite, 90er-Mittel)",
            "Mobile: in der LastSolves-Sidebar passen die 6 Avg-Spalten "
            "nicht — horizontaler Scroll greift jetzt sauber (min-w + "
            "overflow-x-auto), Spalten werden nicht mehr gequetscht",
            "Performance: AO100 rechnet auf bis zu 199 Solves pro "
            "Tabellen-Render — sliding-window in <50ms, keine spuerbare "
            "Verzoegerung",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.mobile-qa",
        released=date(2026, 5, 14),
        title="Mobile-Refactor QA-Fixes",
        highlights=[
            "Timer-Tab: DOM-Reihenfolge korrigiert — Tab-Taste + Screenreader "
            "folgen jetzt der visuellen Reihenfolge (Timer zuerst, dann "
            "Historie). Vorher tabbte man auf Phone erst durch die "
            "Solve-Historie.",
            "Tab-Leisten: snap-proximity statt snap-mandatory — kein "
            "Ruckeln mehr beim Antippen halb sichtbarer Tabs auf Touch.",
            "Info-Popover: z-Index auf 40 angehoben (sauber zwischen "
            "UserMenu und Modals) + Close-Button (×) im Phone-Bottom-Sheet, "
            "weil Outside-Tap als alleinige Schliess-Mechanik duenn war.",
            "QA-Sub-Agent-Review: Tabellen-Spalten-Konsistenz + alle "
            "Regressionen (Abstaende, Sub-Tab-State, Event-Listener) sauber.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.mobile-fixes",
        released=date(2026, 5, 14),
        title="Mobile-Fixes nach Phone-Test",
        highlights=[
            "Info-Button-Popover (ⓘ) ragte auf Phone teilweise ueber den "
            "Bildschirmrand. Jetzt: auf Phone als Bottom-Sheet (klebt unten, "
            "full-width minus Rand) — ragt nie mehr ueber. Ab Tablet wie "
            "bisher als Popover neben dem Button.",
            "Bestenliste + Solve-Liste: das min-w aus dem ersten Versuch "
            "blaehte die Tabelle kuenstlich auf (Leerraum rechts wirkte "
            "abgeschnitten). Jetzt: kein min-w — auf Phone sind durch die "
            "Spalten-Priorisierung eh nur 4 Spalten sichtbar, die passen "
            "via w-full in jeden Screen. Lange Display-Names werden "
            "abgeschnitten (truncate) statt die Tabelle zu sprengen.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.mobile-polish",
        released=date(2026, 5, 14),
        title="Mobile-First Welle 4: Header + Padding + Abschluss",
        highlights=[
            "Header-Logo auf Phone gefixt — war h-40 (160px Hoehe = "
            "~410px Breite) und sprengte jeden Phone-Screen. Jetzt "
            "responsiv gestaffelt: h-16 Phone → h-28 sm → h-52 Desktop "
            "(2.5x-Wunsch bleibt fuer grosse Screens)",
            "Container-Padding p-3 auf Phone (war p-6 = 24px, zu viel auf "
            "360px-Screens), p-6 ab Tablet",
            "Charts (Trends/Verteilung/Aktivitaet) waren bereits responsive "
            "(ResponsiveContainer), Filter-Bars haben flex-wrap — kein Fix "
            "noetig. Mobile-First-Refactor damit abgeschlossen.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.mobile-tables",
        released=date(2026, 5, 14),
        title="Mobile-First Welle 3: Tabellen phone-tauglich",
        highlights=[
            "Analyse → Solves: auf Phone zeigt die Tabelle nur noch #, "
            "Zeit, AO5, Aktionen — AO12/Cube/Hardware ab Tablet-Breite "
            "(Details immer ueber den ℹ-Button erreichbar)",
            "Bestenliste: auf Phone nur Rang, User, Best Single, Best AO5 "
            "— Best AO12/Aktuelle AO5/Solves/Zuletzt ab Tablet-Breite",
            "Timer → Letzte Solves: AO12-Spalte auf Phone ausgeblendet "
            "(Sidebar ist eng), Solvenummer/Zeit/AO5 bleiben",
            "Keine Funktion geht verloren — nur visuelle Priorisierung "
            "der wichtigsten Spalten auf kleinen Screens",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.mobile-nav",
        released=date(2026, 5, 14),
        title="Mobile-First Welle 1+2: Navigation + Timer-Layout",
        highlights=[
            "Neue ScrollableTabBar-Komponente: auf Phone horizontal "
            "scrollbar (snap-scroll), auf Desktop wie bisher gleichmaessig "
            "verteilt — kein Umbrechen/Quetschen mehr bei 6 Top-Tabs",
            "Top-TabBar + Verwaltung-Sub-Tabs + Community-Sub-Tabs nutzen "
            "alle das gleiche Pattern",
            "Timer-Tab auf Mobile: Solving-Bereich (Scramble + Timer) "
            "kommt jetzt ZUERST, die Letzte-Solves-Historie darunter — "
            "vorher musste man auf dem Phone erst durch die Historie "
            "scrollen. Auf Desktop unveraendert (Historie links).",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.postal-code",
        released=date(2026, 5, 14),
        title="Postleitzahl im Profil — Vorbereitung fuer Turnier-Naehe",
        highlights=[
            "Neues Profil-Feld 'Postleitzahl' in Verwaltung → Einstellungen "
            "→ Account → Profil (optional, multi-country-Format)",
            "Backend: User.postal_code (max 16 Zeichen) + Migration "
            "(idempotent via ALTER TABLE ADD COLUMN IF NOT EXISTS)",
            "PATCH /auth/me Whitelist erweitert — postal_code aenderbar",
            "Vorbereitung fuer kommendes Feature: „Naechste WCA-Turniere "
            "in deiner Naehe\" — Daten werden bewusst jetzt schon gesammelt "
            "damit das Feature spaeter direkt nutzbar ist",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.touch-text-mode",
        released=date(2026, 5, 14),
        title="Touch-Devices: Text-Eingabe erlaubt + WCA als Default",
        highlights=[
            "Auf Phone/Tablet ist Text-Eingabe-Modus jetzt waehlbar (war "
            "vorher zwangsgespertt). Sinnvoll wenn man z.B. Bluetooth-"
            "Keyboard hat oder ohne Inspection-Countdown solven will.",
            "Frische Touch-User starten direkt mit WCA-Spacebar als "
            "Default — kein „erst Settings finden\"-Detour mehr.",
            "Bestehende User behalten ihre gespeicherten Settings unangetastet.",
            "Tipp-Hinweis-Text passt sich an: auf Touch + Text-Modus "
            "wird darauf hingewiesen dass Soft-Tastatur muehsam sein "
            "kann; auf Desktop + Text-Modus wird zum Spacebar-Timer "
            "eingeladen.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.info-buttons-everywhere",
        released=date(2026, 5, 14),
        title="Info-Buttons in allen Karten",
        highlights=[
            "ⓘ-Buttons in 20+ Komponenten ergaenzt — jede groessere Card "
            "hat jetzt einen Hover-/Klick-Tooltip mit Erklaerungstext",
            "Dashboard: Statistiken, Activity, Reminders, Challenges-Mini, "
            "Erfolge-Mini, Vergleich",
            "Analyse: Solve-Liste, Trends, Verteilung, Aktivitaets-Chart, "
            "Hardware-Vergleich",
            "Verwaltung: Sessions, Hardware-Inventar, Backup, csTimer-"
            "Import, csTimer-Export, Outliers, Account, Spacebar-Settings",
            "Trainer: Algorithm-Trainer, Erfolge, Tages-Challenges",
            "Community: Bestenliste, Freunde-Suche",
            "Admin: Statistiken, User-Liste, Bulk-Mail",
            "SettingsPanel Section-Helper erweitert — kann optional einen "
            "InfoButton-Slot rendern (Pattern fuer weitere Sub-Sektionen)",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.timer-mode-picker",
        released=date(2026, 5, 14),
        title="Timer-Modus direkt am Timer auswaehlbar (WCA / Pragmatisch / Text)",
        highlights=[
            "Drei-Button-Modus-Picker oben im Timer-Tab — vorher musste man "
            "sich durch Verwaltung → Einstellungen klicken um Spacebar-Modus "
            "anzuschalten, war nicht discoverable",
            "Ein Klick wechselt sowohl spacebar_enabled als auch "
            "inspection_mode konsistent (WCA vs Pragmatisch)",
            "Info-Button erklaert die drei Modi: Text-Eingabe / WCA / "
            "Pragmatisch mit konkretem User-Verhalten",
            "Wenn Text-Modus aktiv (Desktop): Tipp-Hinweis weist auf den "
            "Spacebar-Timer hin",
            "Auf Touch-Geraeten ist Text-Modus disabled (Soft-Keyboard ist "
            "muehsam) — nur die zwei Spacebar-Varianten klickbar",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.user-menu",
        released=date(2026, 5, 14),
        title="User-Menu oben rechts (klassisches Account-Dropdown)",
        highlights=[
            "Klick auf Email/Avatar oben rechts oeffnet jetzt ein Dropdown-"
            "Menu mit den Standard-Aktionen: Mein Account, Patch Notes, "
            "Was kann diese App, Logout",
            "Avatar mit Initialen (Display-Name oder Email-Anfangsbuchstaben), "
            "ADMIN-Badge wenn du Admin bist",
            "„Mein Account & Einstellungen\" springt direkt zum richtigen "
            "Sub-Tab in der Verwaltung (Settings inkl. AccountSettingsPanel)",
            "Patch Notes + Features-Modal sind dadurch ueber 3 Wege "
            "erreichbar: Version-Badge oben rechts, User-Menu, Footer-Link",
            "Alter Email-Text + nackter Logout-Link entfernt — UserMenu "
            "ersetzt beides",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.logo-kor",
        released=date(2026, 5, 14),
        title="Korrigiertes Logo eingespielt",
        highlights=[
            "Neues Logo cubetracker_kor.png — auf das tatsaechliche Motiv "
            "zugeschnitten, kein toter Whitespace mehr im Bild",
            "Wirkt im Header + auf Login deutlich praesenter, weil bei "
            "gleicher Anzeigegroesse mehr Pixel auf das Logo entfallen",
            "Favicons + Apple-Touch-Icon neu generiert (Cube-Crop aus dem "
            "korrigierten Bild) — Browser-Tab-Icon ist jetzt klarer",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.logo-bigger",
        released=date(2026, 5, 14),
        title="Logo groesser (Header 2.5× / Login 1.5×)",
        highlights=[
            "App-Header-Logo von 64-80px auf 160-208px Hoehe "
            "(Faktor ~2.5×) — viel praesenter als Marke",
            "Login-Seite: Card-Breite max-w-md (448px) → max-w-[600px], "
            "Logo waechst proportional mit (~1.5×)",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.logo-info",
        released=date(2026, 5, 14),
        title="Logo prominenter + Info-Buttons in Karten",
        highlights=[
            "App-Header: Logo ersetzt den separaten „cubetracker\"-"
            "Schriftzug + Tagline (war doppelt — das Logo enthaelt beides). "
            "Logo-Hoehe 64-80px, klickbar zum Dashboard-Tab, mit Hover-"
            "Effekt. H1-Tag bleibt screenreader-only fuer SEO.",
            "Anmeldeseite: Logo nimmt jetzt die volle Card-Innenbreite ein "
            "(war zu klein im Verhaeltnis zum Whitespace) — Card-Breite "
            "etwas erhoeht.",
            "Neue InfoButton-Komponente (ⓘ-Icon) mit Klick-/Hover-Popover. "
            "Schliesst bei Klick ausserhalb oder Esc.",
            "Info-Buttons platziert in: LIVE-Karte, Letzte-Solves-Tabelle, "
            "Trainings-Set, Scramble — erklaert die wichtigsten Begriffe "
            "(AO5/AO12/Form-Vergleich/WCA-Scramble-Notation).",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.features-page",
        released=date(2026, 5, 14),
        title="App-Beschreibung + Feature-Liste",
        highlights=[
            "Anmeldeseite zeigt jetzt prominent „Was ist cubetracker?\" + "
            "Highlights neben dem Login-Formular — Besucher ohne Account "
            "verstehen sofort worum's geht",
            "Feature-Liste in 7 Kategorien (Solving, Analyse, Trainer, "
            "Community, Hardware, Daten, Account+Sicherheit)",
            "Innerhalb der App: Footer-Link „Was kann diese App?\" oeffnet "
            "die selbe Feature-Liste als Modal",
            "Layout: Desktop 2-spaltig (Form links + Features rechts), "
            "Mobile gestapelt — Form bleibt prominent oben",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.community-tab",
        released=date(2026, 5, 14),
        title="Tab-Konsolidierung: Community ersetzt Freunde + Bestenliste",
        highlights=[
            "7 Top-Tabs → 6: Freunde + Bestenliste zusammengelegt in "
            "neuen Tab „Community\" 🤝",
            "Innerhalb von Community: Sub-Tab-Bar mit „Freunde\" und "
            "„Bestenliste\" — gleicher Stil wie Verwaltung-Sub-Tabs",
            "Backward-Compat: alte URL-Hashes (#friends, #leaderboard) "
            "landen automatisch auf Community + richtigem Sub-Tab — "
            "Bookmarks bleiben funktional",
            "Trainer + Verwaltung bleiben eigenstaendig (konservative "
            "Konsolidierung — Trainer-Sub-Tabs Heute/Algs/Erfolge sind "
            "konzeptionell zu eigenstaendig fuer Zerlegung)",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.logo",
        released=date(2026, 5, 14),
        title="Neues Logo eingebunden",
        highlights=[
            "Logo (Cube mit lila/cyan-Gradient + Time-Bar-Linie) prominent "
            "auf der Anmeldeseite",
            "Cube-Icon klein neben dem 'cubetracker'-Schriftzug im Header",
            "Browser-Tab-Favicon zeigt den Cube — endlich kein Default-Icon mehr",
            "Apple-Touch-Icon fuer Homescreen-Install (vorab fuer PWA-Setup)",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.ux-quickwins",
        released=date(2026, 5, 14),
        title="UX-Quick-Wins nach Audit",
        highlights=[
            "Patch Notes raus aus Verwaltung — sind jetzt ein Modal das "
            "via Klick auf den Versions-Badge oben rechts aufgeht "
            "(natuerlicherer Ort fuer Versions-Info)",
            "Discoverability-Card in Freunde-Tab konsolidiert — "
            "Display-Name jetzt inline editierbar, kein Verweis mehr "
            "nach Verwaltung → Einstellungen noetig",
            "Cleanup: hidden refreshMe-Button + stale Footer-String entfernt",
            "Verwaltung-Sub-Tabs reduziert: 7 → 6 (Patch Notes raus)",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.solvelist-hardware",
        released=date(2026, 5, 14),
        title="Analyse → Solves: Hardware statt Notiz in Tabelle",
        highlights=[
            "Notiz-Spalte raus aus der Solve-Tabelle (Notiz bleibt im "
            "Detail-Modal ueber den ℹ-Button verfuegbar)",
            "Hardware-Spalte stattdessen — zeigt den Hardware-Namen "
            "fuer jeden Solve, oder „—\" wenn keine zugeordnet",
            "Cube-Spalte vereinfacht (Hardware-Sub-Zeile entfernt — "
            "wird ja jetzt eigenstaendig gezeigt)",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.patchnotes",
        released=date(2026, 5, 14),
        title="Patch Notes + automatische Versionierung",
        highlights=[
            "Single-Source-of-Truth `changelog/data.py` — pflegt Versions-"
            "Nummer + Patch-Notes in einem Schritt",
            "Neuer Sub-Tab in Verwaltung: Patch Notes",
            "Backend liefert neuen Endpoint GET /api/changelog",
            "Frontend-Versionsanzeige im Header zieht jetzt automatisch "
            "die neueste Version aus den Patch Notes",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.hardware-auto-seed",
        released=date(2026, 5, 14),
        title="Hardware Auto-Seed + Bulk-Aktionen + Umbenennen-Button",
        highlights=[
            "Jeder neue User bekommt automatisch die 30-Cube-Standard-Liste "
            "(default inaktiv) — kein Import-Button mehr noetig",
            "Lifespan-Backfill: bestehende User ohne Hardware kriegen die "
            "Liste beim naechsten Cold-Start nachgepflegt",
            "Pro Cube-Type-Gruppe: Checkbox 'alle markieren' + Bulk-Buttons "
            "(aktivieren, deaktivieren, loeschen)",
            "Expliziter Umbenennen-Button bei jedem Eintrag",
            "Header zeigt jetzt 'X aktiv von Y' statt nur Total",
        ],
        commit="8d24cbc",
    ),
    PatchNote(
        version="2.0.0-alpha.W.hardware-seed-fix",
        released=date(2026, 5, 13),
        title="Bug-Fix: Hardware-Seed-Endpoint im Web-Backend nachgeruestet",
        highlights=[
            "Frontend-Seed-Button war funktionslos (Endpoint existierte nur "
            "im Desktop-Backend) — jetzt multi-user-safe geportet",
            "pyproject.toml packages-Liste um friends/leaderboard/seeds "
            "ergaenzt fuer sauberen Pip-Install",
        ],
        commit="8e5f3bc",
    ),
    PatchNote(
        version="2.0.0-alpha.W.ui-polish",
        released=date(2026, 5, 13),
        title="TIMER-Layout links + sortierbare Solve-Tabellen",
        highlights=[
            "TIMER-Tab: LIVE + Letzte-Solves wandern von rechts nach links",
            "Neue 'Letzte Solves'-Tabelle: X-Picker (10/20/50/100), "
            "Spalten #|Zeit|AO5|AO12, klickbare Spalten-Headers zum Sortieren",
            "Analyse → Solves: zusaetzlich Solvenummer-Spalte + Sortierung "
            "nach #/Zeit/AO5/AO12",
            "DNF/None-Averages landen beim Sortieren immer am Ende",
        ],
        commit="b09b067",
    ),
    PatchNote(
        version="2.0.0-alpha.W.10",
        released=date(2026, 5, 13),
        title="Leaderboards — Vergleich mit Freunden",
        highlights=[
            "Neuer Top-Tab: Bestenliste",
            "Cube-Type-Picker + Tabelle mit Best Single, Best AO5, Best AO12, "
            "Aktuelles AO5, Solves (30d), Last Active",
            "Self optisch hervorgehoben + immer oben; Top-3 Freunde mit "
            "Gold/Silber/Bronze-Medaille",
            "Privacy: nur accepted-Friends, keine Emails im Output",
            "WCA-konforme +2/DNF-Behandlung",
        ],
        commit="8966715",
    ),
    PatchNote(
        version="2.0.0-alpha.W.9",
        released=date(2026, 5, 13),
        title="Friend-System",
        highlights=[
            "Neuer Top-Tab: Freunde",
            "User-Suche per Display-Name (Opt-In via is_discoverable) ODER "
            "exakter Email",
            "Anfragen-Workflow: schicken, annehmen, ablehnen, zuruecknehmen",
            "Eigene Freundeliste mit Entfreunden-Confirm",
            "Functional UniqueIndex (LEAST, GREATEST) verhindert Cross-"
            "Direction-Race bei parallelen Anfragen",
        ],
        commit="d573b11",
    ),
    PatchNote(
        version="2.0.0-alpha.W.backup",
        released=date(2026, 5, 13),
        title="DB-Backup via GitHub Actions",
        highlights=[
            "Daily pg_dump 02:00 UTC, GitHub-Artifact mit 90 Tagen Retention",
            "Manual-Trigger ueber Actions-Tab",
            "BACKUP.md mit Restore-Anleitung",
        ],
        commit="29074ba",
    ),
    PatchNote(
        version="2.0.0-alpha.W.admin-2",
        released=date(2026, 5, 13),
        title="Admin User-Management + Ad-hoc-Mail + Bulk-Announcement",
        highlights=[
            "User-Liste mit Solve-Count + Aktivitaet, Deaktivieren/Aktivieren",
            "Email manuell verifizieren (Support-Hilfe)",
            "DSGVO-Hard-Delete mit Pflicht-Confirm-String",
            "Ad-hoc-Mail an einzelne User",
            "Bulk-Announcement mit Dry-Run-Workflow",
        ],
        commit="faedeec",
    ),
    PatchNote(
        version="2.0.0-alpha.W.admin-1",
        released=date(2026, 5, 13),
        title="Admin-Statistik-Panel + Cache-Leak-Fix",
        highlights=[
            "Neuer Admin-Sub-Tab in Verwaltung mit User-/Volume-/Cube-/"
            "Storage-Kacheln",
            "React-Query-Cache wird bei Login/Logout geleert — "
            "verhindert Datenleak zwischen User-Sessions",
        ],
        commit="1a64bcb",
    ),
    PatchNote(
        version="2.0.0-alpha.W.touch",
        released=date(2026, 5, 13),
        title="Touch-Timer fuer Phone + F19-Race-Fix",
        highlights=[
            "Auf Touch-Devices erscheint im Timer-Tab ein grosser Tap-Pad",
            "Dispatched synthetische Space-Events → useSpacebarTimer "
            "behandelt sie identisch zur echten Tastatur",
            "Auf Phone wird automatisch Spacebar-Modus aktiviert "
            "(kein Settings-Detour mehr)",
        ],
        commit="f9491e5",
    ),
    PatchNote(
        version="2.0.0-alpha.W.5-ux",
        released=date(2026, 5, 13),
        title="UX-Trennung csTimer-Import vs Cubetracker-Backup",
        highlights=[
            "Klare visuelle Trennung der zwei JSON-Formate in Verwaltung → Daten",
            "Auto-Detect bei falscher Datei mit klarer Fehlermeldung",
            "csTimer-Import Crash bei Integer-Session-Namen behoben",
        ],
        commit="c11362b",
    ),
    PatchNote(
        version="2.0.0-alpha.W.8",
        released=date(2026, 5, 12),
        title="User-Management + Email-Verifikation",
        highlights=[
            "Email-Verifikation + Password-Reset via Resend",
            "Display-Name + Email-Change-Flow",
            "Token-Revocation-Pattern (alle Sessions sofort invalidierbar)",
        ],
        commit="6c780d1",
    ),
    PatchNote(
        version="2.0.0-alpha.W.5",
        released=date(2026, 5, 11),
        title="Backup + Snapshots + csTimer-Import",
        highlights=[
            "Voll-JSON-Export pro User unter Verwaltung → Daten",
            "Restore mit merge/replace-Modus + Confirm-String",
            "Manuelle + automatische Snapshots (max 2 pro User)",
            "csTimer-Import (TXT/JSON) mit Dedup",
        ],
        commit="b5531f3",
    ),
    PatchNote(
        version="2.0.0-alpha.W.4",
        released=date(2026, 5, 10),
        title="Trainer + Stats per User",
        highlights=[
            "Achievements + Daily Challenges multi-user-faehig",
            "Stats-Endpoints filtern auf user_id",
            "UTC-aware datetimes fuer Postgres-Kompatibilitaet",
        ],
        commit="b83c9df",
    ),
    PatchNote(
        version="2.0.0-alpha.W.3",
        released=date(2026, 5, 9),
        title="Multi-User-CRUD",
        highlights=[
            "Solve/Session/Hardware-Endpoints filtern auf user_id",
            "Cube-Filter im Analyse-Tab",
        ],
        commit="c225979",
    ),
    PatchNote(
        version="2.0.0-alpha.W.2",
        released=date(2026, 5, 7),
        title="Auth-Skeleton + Security-Sub-Agent-Findings",
        highlights=[
            "JWT-Auth mit Access-Token + HttpOnly-Refresh-Cookie",
            "Single-Flight Refresh-Interceptor im Frontend",
            "6 kritische Security-Findings vor Live-Deploy gefixt",
        ],
        commit="b791e36",
    ),
    PatchNote(
        version="1.0.1",
        released=date(2026, 5, 4),
        title="Letzter Desktop-Stand vor Multi-User-Web-Pivot",
        highlights=[
            "Bugfix: hardcoded baseURL in v1.0.0 — API-Calls in ausgerollter "
            "Desktop-App waren tot",
        ],
        commit="ceb63ba",
    ),
]


def current_version() -> str:
    """Neuester Eintrag = aktuelle App-Version. Wird von main.py importiert."""
    return PATCH_NOTES[0].version
