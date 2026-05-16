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
        version="2.0.0-alpha.W.scramble-cstimer",
        released=date(2026, 5, 17),
        title="Inoffizielle Scrambles: 4/5 jetzt WCA-Quality (cstimer_module)",
        highlights=[
            "Recherche-Sub-Agent fand cstimer_module@0.1.5 auf npm — vom "
            "Original-csTimer-Autor (cs0x7f) veroeffentlicht. Bietet echte "
            "Random-State-Solver fuer Ivy/Gear/Redi/Master Pyraminx.",
            "Drop-in-Einbau: webapp/frontend/src/lib/scramble.ts routet "
            "diese 4 Custom-Puzzles jetzt zu cstimer_module statt zum "
            "primitiven Random-Move-Generator. Notation + Quality "
            "identisch zu csTimer.app.",
            "Konkret bedeutet das: Ivy-Scrambles sind 6-8 Moves statt 8 "
            "Random-Moves. Gear-Scrambles haben die korrekte Tooth-Counting-"
            "Notation (U5, F3 = Anzahl Zaehne). Redi-Scrambles in MoYu-"
            "Standard-Format. Master Pyraminx mit Wide-Moves.",
            "Master Skewb bleibt als einziger bei Random-Move — kein "
            "Random-State-Solver existiert im JavaScript-Oekosystem (auch "
            "csTimer selbst hat keinen). Disclaimer in der ScrambleCard "
            "entsprechend angepasst (zeigt sich nur noch fuer Master Skewb).",
            "Bundle-Auswirkung: +250 KB minified / +80 KB gzipped. "
            "Lizenz GPL-3.0 (csTimer-Standard-Modell, passt zu cubetracker "
            "als Open-Source-Speedcubing-App).",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.scramble-quality",
        released=date(2026, 5, 17),
        title="Inoffizielle Scrambles: Notations-Bugs gefixt + ehrlicher Disclaimer",
        highlights=[
            "User-Befund: einige Custom-Scrambles waren falsch. Recherche "
            "bestaetigt zwei echte Bugs in scramble.ts:",
            "GEAR CUBE (kritischer Bug): wegen der Zahnrad-Mechanik sind "
            "physikalisch nur 180-Grad-Drehungen moeglich (Quelle: Wikipedia/"
            "Gear-Cube). Meine alte Spec hatte nur 3 Faces (U/R/F) statt 6 "
            "und mischte 90 + 180 Grad. Jetzt: alle 6 Faces (U/D/L/R/F/B), "
            "ausschliesslich 2-Suffix.",
            "IVY CUBE: falsche Achse F statt U. Standard-Notation per "
            "Speedsolving-Wiki ist U/L/R/B fuer die 4 Eck-Achsen. "
            "Scramble-Laenge auf csTimer-Default 8 reduziert.",
            "Ehrlicher UI-Disclaimer in der ScrambleCard fuer inoffizielle "
            "Cubes: 'Random-Move-Sequenzen mit korrekter Notation, kein "
            "Random-State-Solver — gut fuers Training, nicht 100% Wettkampf-"
            "vergleichbar'. FTO bleibt ausgenommen (scrambow-generiert, "
            "WCA-quality).",
            "Redi + Master Pyra/Skewb: Notation belassen (csTimer-MoYu-"
            "Variante ist nicht eindeutig dokumentiert, unsere Approximation "
            "ist plausibel).",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.live-card-mo3-ao100",
        released=date(2026, 5, 17),
        title="LIVE-Karte: 4 Averages — Tabelle wieder ohne Scroll",
        highlights=[
            "Live-Karte (Timer-Tab) zeigt jetzt 4 Averages in 2x2-Grid: "
            "Mo3, AO5, AO12, AO100. Vorher nur AO5 + AO12. Mo3 wird "
            "clientseitig aus dem schon geladenen rolling-Map abgeleitet, "
            "AO100 kommt aus dem bestehenden Stats-Endpoint.",
            "Letzte-Solves-Tabelle (Timer-Tab): AO100-Spalte wieder raus. "
            "Hintergrund: AO100 aendert sich pro Zeile praktisch nicht "
            "(100er-Fenster). In der Tabelle wenig informativ, in der "
            "Live-Karte oben deutlich besser aufgehoben.",
            "Tabelle ohne AO100 hat jetzt nur 5 Spalten (Nr / Zeit / Mo3 / "
            "AO5 / AO12 + Loeschen) — passt wieder ohne horizontalen Scroll "
            "in die schmale Sidebar. Das min-w-[420px] + overflow-Scroll "
            "ist raus.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.abschluss-skill",
        released=date(2026, 5, 16),
        title="Session-Ende-Check: /abschluss-Slash-Command + Stop-Hook-Backstop",
        highlights=[
            "Neuer Slash-Command /abschluss fuer den User-getriggerten "
            "Session-Ende-Check. Geht eine 8-Punkte-Liste durch: "
            "uncommitted Aenderungen, unpushed Commits, fehlende Patch-"
            "Notes-Eintraege, fehlende Git-Tags, features-data.ts-Update, "
            "Doku-Aktualitaet, offene Todos, Backend-Smoke-Test (lokal "
            "Parse + Module-Import). Bei Luecken bietet Fixes an.",
            "Neuer Stop-Hook stop-mini-check.sh: laeuft 1x pro Session "
            "(via once:true) als Mini-Backstop wenn Claude zum ersten Mal "
            "antwortet. Meldet nur das absolut Wichtigste (uncommitted + "
            "unpushed) und verweist auf /abschluss fuer den vollen Check.",
            "Konvention in CLAUDE.md verankert: bei Aussagen wie „Session "
            "beenden\” / „das wars fuer heute\” → /abschluss proaktiv "
            "aufrufen. Plus Hinweis-Block ueber Patch-Notes-Konvention, "
            "Tag-Konvention, features-data.ts-Konvention.",
            "Hintergrund: heute (2026-05-16) ist mehrfach was durchge"
            "rutscht: 26 ungetaggte Patch-Notes-Versionen, features-data.ts "
            "wurde erst nach User-Nachfrage aktualisiert, Quote-Bug hat "
            "5 Render-Deploys gekillt. Der /abschluss-Check faengt all das "
            "in Zukunft systematisch ab.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.features-update-wca-news",
        released=date(2026, 5, 16),
        title="Was kann die App: Speedcubing-Welt + Country-Update",
        highlights=[
            "Feature-Liste auf der Anmeldeseite + im In-App-Modal um die "
            "heute neuen Features erweitert.",
            "Neue Kategorie Speedcubing-Welt: WCA-Turniere in der Naehe "
            "(mit DACH-Nachbarn-Logik), Speedcubing-News aus drei kuratierten "
            "Quellen, Auto-Refresh-Hinweis, Datenquellen-Transparenz.",
            "Account-Bullet aktualisiert: Postleitzahl ist nicht mehr "
            "Vorbereitung sondern produktiv genutzt — jetzt mit Land "
            "zusammen klar als Speed-Turnier-Filter beschrieben.",
            "HERO-HIGHLIGHTS auf der Login-Seite: einen Snapshot+Backup-"
            "Bullet ersetzt durch WCA-Turniere/News — das ist heute der "
            "wahre Marketing-Wert.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.country-qa",
        released=date(2026, 5, 16),
        title="QA-Fixes nach Country-Feld-Welle",
        highlights=[
            "HIGH-Bug-Fix: WcaUpcomingCard hat die 422-Detail-Message vom "
            "Backend nicht extrahiert (Axios setzt error.message auf "
            "generisches Request-failed-Status — die echte Message liegt "
            "in error.response.data.detail). Folge: der Onboarding-Empty-"
            "State triggerte NIE, User sahen statt freundlichem Hint die "
            "nutzlose rote Error-Box. Jetzt: explizites Parsing via "
            "AxiosError-Type + Status-422-Match.",
            "MEDIUM-Fix: Login-Endpoint hatte lazy-import von news.refresh "
            "ohne try/except. Wenn feedparser/httpx fehlen (z.B. nach "
            "fehlgeschlagenem Render-pip-install), wuerde Login 500 werfen "
            "obwohl Auth funktioniert. Jetzt: try/except um den Import — "
            "Auto-Refresh ist nice-to-have, Login hat Prio.",
            "Country-Liste erweitert um 8 fehlende Cube-Communities: "
            "Hongkong (HK, >500 WCA-Cuber), VAE (AE), Neuseeland (NZ), "
            "Aegypten (EG), Marokko (MA), Dominikanische Republik (DO), "
            "Costa Rica (CR), Venezuela (VE). Insgesamt 63 Laender.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.country-feld",
        released=date(2026, 5, 16),
        title="Land-Feld im Profil + WCA-Hinweise sauber",
        highlights=[
            "Neues Profil-Feld „Land” (Dropdown mit 55 Cuber-Laendern, "
            "alphabetisch nach dt. Bezeichnung) zusaetzlich zur "
            "Postleitzahl. Vorher haben wir das Land aus der PLZ-Struktur "
            "geraten (5-stellig=DE, 4-stellig=AT, sonst nichts) — das "
            "funktionierte nur fuer DACH-User.",
            "WCA-Turniere-Endpoint nutzt jetzt User.country_iso2 mit "
            "Vorrang vor der PLZ-Heuristik. Damit funktioniert das "
            "Turnier-Feature weltweit: User in USA, Polen, Japan etc. "
            "bekommen die richtigen Turniere ihres Landes (+ Nachbarn "
            "wo definiert).",
            "Sauber kommunizierte Voraussetzungen: AccountSettingsPanel "
            "zeigt einen Amber-Hint dass „PLZ UND Land beide noetig\” "
            "sind. WcaUpcomingCard zeigt bei fehlenden Feldern den "
            "konkreten Pfad „Verwaltung → Einstellungen → Account → "
            "Profil\” als Empty-State.",
            "DB-Schema: User.country_iso2 VARCHAR(2), via Inline-Migration "
            "(ALTER TABLE ADD COLUMN IF NOT EXISTS) idempotent eingespielt. "
            "Pydantic-Schema mit Pattern ^[A-Za-z]{2}$, im Endpoint wird "
            "uppercased + getrimmt.",
            "Geocoding-Call nutzt jetzt das User-Land statt Heuristik — "
            "Nominatim-Treffer sind deutlich praeziser (z.B. PLZ 8001 "
            "in CH vs AT korrekt aufloesbar).",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.wca-neighbors-news-refresh",
        released=date(2026, 5, 16),
        title="WCA: Nachbarlaender + News: weitere Quelle + Auto-Refresh bei Login",
        highlights=[
            "WCA-Turniere: zeigt jetzt nicht nur Turniere im eigenen Land, "
            "sondern auch in direkten Nachbarlaendern. Fuer DE-User: AT, CH, "
            "NL, BE, LU, FR, DK, PL, CZ. Fuer AT-User: DE, CH, IT, SI, HU, "
            "SK, CZ, LI. Fuer CH-User: DE, AT, FR, IT, LI. Parallel-Fetch "
            "via asyncio.gather, daher kaum Latenz-Aufschlag.",
            "Speedcubing-News: dritte Quelle dazu — SpeedCubing.org/blog "
            "(World Records, Competition Coverage). RSS-Recherche ergab "
            "dass SpeedCubeShop + TheCubicle keinen public RSS-Endpoint "
            "anbieten — die kaemen nur via HTML-Scraping ran, kein MVP-Wert.",
            "Auto-Refresh bei Login (User-Wunsch): nach erfolgreichem "
            "Login laeuft im Hintergrund (NACH der Response, blockt User "
            "nicht) ein Refresh fuer News + WCA-Caches. Bei warmen Caches "
            "= no-op, bei stale Caches = stiller Refresh. Effekt: wer sich "
            "nach Pause einloggt, sieht frische Daten ohne Wartezeit.",
            "Backend-Module: webapp/news/refresh.py als zentraler Refresh-"
            "Helper. Wird vom Auth-Login-Endpoint als BackgroundTask "
            "getriggert. News-Refresh = sync, WCA-Warmup = async via "
            "asyncio.run im Background-Thread.",
            "Frontend zeigt in der WCA-Card jetzt die Liste der "
            "gequeryten Laender (z.B. 'Laender: DE, AT, CH, NL, ...') "
            "als Footer-Info, damit der User weiss warum sich z.B. ein "
            "Wiener Turnier in seiner Berliner Liste findet.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.deploy-fix",
        released=date(2026, 5, 16),
        title="Hotfix: SyntaxError-Quotes in Patch-Notes — alle Render-Deploys grün",
        highlights=[
            "Render-Deploys aller heutigen Welle-Commits sind gescheitert "
            "(5 Fail-Mails: news-backend, news-frontend, dashboard-story, "
            "wca-comps-hardening, wca-news-qa).",
            "Root-Cause: in mehreren Patch-Notes-Strings hatte mein "
            "Bash-Heredoc das deutsche Schliess-Anfuehrungszeichen (U+201D) "
            "faelschlich durch ein ASCII-Quote (U+0022) ersetzt. Das mittlere "
            "ASCII-Quote terminierte den Python-String an einer ungewollten "
            "Stelle, der Rest war Syntaxmuell. 22 solcher Stellen ueber 13 "
            "Zeilen gefunden.",
            "Fix: alle ASCII-Quotes mitten in Patch-Notes-Strings systematisch "
            "durch das korrekte deutsche Schliess-Anfuehrungszeichen ersetzt. "
            "Backend startet jetzt sauber (lokal mit echten Deps verifiziert).",
            "Konsequenz: zukuenftige Patch-Notes nutzen nur ASCII-Quoting "
            "oder explizit-escaped Quotes — kein Mix mehr von deutschen "
            "Anfuehrungszeichen mit Heredoc-faulen Bash-Pipes.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.wca-news-qa",
        released=date(2026, 5, 16),
        title="QA-Fixes nach WCA/News-Sprint",
        highlights=[
            "Operator-Precedence-Bug im News-Parser behoben: bei feedparser-"
            "Entries ohne `.get`-Methode wurde der link faelschlich None. "
            "Helper `_attr_or_key` mit expliziten Klammern.",
            "Session-Race im News-Fetcher: bei IntegrityError (Multi-Worker-"
            "Race) wuerde der naive db.rollback() ALLE bisher geflushten "
            "Items derselben Iteration wegrollen. Jetzt: SAVEPOINT pro "
            "Item via `db.begin_nested()` — nur das eine kaputte Item "
            "rollt zurueck.",
            "WCA-Sortier-Bug: Turniere mit distance_km = 0.0 (User direkt "
            "am Venue) wurden faelschlich ans Ende sortiert, weil 0.0 in "
            "Python falsy ist. Jetzt expliziter `is None`-Check.",
            "News-Cleanup: N+1-DELETE-Schleife → ein einzelner DELETE WHERE "
            "(SQLAlchemy `delete()`-Construct).",
            "PostalCodeGeo: `Float` explizit als mapped_column-Type — "
            "SQLAlchemy 2.0 sollte das aus dem Python-Type ableiten koennen, "
            "aber explizit ist defensiver bei Postgres-DDL-Generation.",
            "Hygiene: ungenutzter datetime-Import in wca/client.py raus, "
            "Doc-Strings in den __init__.py-Files der neuen Sub-Pakete "
            "(wca, news).",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.dashboard-story",
        released=date(2026, 5, 16),
        title="Dashboard-Refactor: 4-Sektionen-Story",
        highlights=[
            "Dashboard hat jetzt eine klare Story-Reihenfolge in 4 "
            "Sektionen statt loser Karten-Reihen: HEUTE (Activity/"
            "Reminder) → DEINE PERFORMANCE (Multi-Cube-Vergleich + "
            "Stats) → TRAININGS-ANTRIEB (Challenges + Achievements) → "
            "SPEEDCUBING-WELT (WCA-Turniere + News).",
            "Jede Sektion hat einen dezenten Mini-Header (lila, klein, "
            "Spacing wide), Karten selbst sind unveraendert. Semantisches "
            "<section>-Markup + aria-labelledby fuer Screenreader.",
            "Speedcubing-Welt-Sektion ist jetzt der „natuerliche\” Ort "
            "fuer die heute neu hinzugefuegten Karten (WCA-Turniere + "
            "News) statt einer temporaeren Anhang-Reihe.",
            "Spacing zwischen Sektionen leicht groesser (space-y-8 statt "
            "space-y-6) — Sektionen sollen sich visuell abgrenzen.",
            "Tab-Reihenfolge bleibt (User-Entscheidung): Timer / "
            "Dashboard / Analyse / Trainer / Community / Verwaltung.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.news-frontend",
        released=date(2026, 5, 16),
        title="Speedcubing-News-Card im Dashboard live",
        highlights=[
            "Neue Karte „📰 Speedcubing-News\” im Dashboard, direkt neben "
            "der WCA-Turniere-Card (zweispaltig ab Tablet-Breite, "
            "Mobile gestapelt).",
            "Pro News-Item: Titel als Link zur Quelle, Source-Badge "
            "(farb-kodiert: WCA = lila, r/Cubers = orange), Summary "
            "(2 Zeilen abgekuerzt), Relativ-Datum („vor 3h\”, „vor 2d\”).",
            "Beim Erst-Aufruf nach Deploy ist die DB noch leer — die "
            "Card zeigt einen Hinweis, dass der Hintergrund-Fetch "
            "dabei ist + bittet um Reload in einer Minute.",
            "Naechster Schritt: Phase C — Dashboard-Refactor mit "
            "eigener „Speedcubing-Welt\”-Sektion und neuer Story-"
            "Reihenfolge.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.news-backend",
        released=date(2026, 5, 16),
        title="Backend fuer „Speedcubing-News\” gebaut",
        highlights=[
            "Neues Backend-Modul `webapp/news/`: RSS-Aggregator mit "
            "feedparser, persistente DB-Tabelle `news_items` (Dedup ueber "
            "RSS-Link-URL), on-demand-Refresh-Strategie (wenn letzter "
            "Fetch > 60min alt, sync re-fetch beim naechsten Endpoint-Call).",
            "Konfigurierte Sources (vorerst): WCA Posts (offizielle "
            "Announcements) + r/Cubers (Community-Reddit). Erweiterung "
            "spaeter via `news/sources.py`.",
            "Endpoint `GET /news/latest?limit=10` mit Auth + 60/min-Rate-"
            "Limit. Liefert sortiert nach published_at DESC.",
            "Cleanup: Items > 60 Tage werden im selben Pass geloescht — "
            "Tabelle bleibt schlank, kein Cron noetig.",
            "Frontend-Card folgt im naechsten Commit.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.wca-comps-frontend",
        released=date(2026, 5, 16),
        title="WCA-Turniere-Card im Dashboard live",
        highlights=[
            "Neue Karte „🏆 WCA-Turniere\” im Dashboard (temporaer am "
            "Ende — Phase C wandert sie in eine eigene „Speedcubing-"
            "Welt\”-Sektion gemeinsam mit den geplanten News).",
            "Pro Turnier sichtbar: Name (Link zur WCA-Detailseite), "
            "Datum (Range-formatiert dt.), Stadt, Anzahl Events, "
            "Distanz in km von deiner Profil-PLZ (Luftlinie).",
            "Distanz-Selector: 100 / 300 / 500 / 1000 / 5000 km. Bei "
            "leerer Liste auf Default-300km: ein-Klick auf „Weltweit "
            "suchen\”.",
            "Empty-State wenn keine PLZ im Profil: Hint mit Pfad "
            "Verwaltung → Account zum Setzen.",
            "Daten direkt von der offiziellen WCA-API (1h Cache); "
            "Geocoding via OpenStreetMap-Nominatim (30 Tage DB-Cache).",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.wca-comps-backend",
        released=date(2026, 5, 16),
        title="Backend fuer „WCA-Turniere in der Naehe\” gebaut",
        highlights=[
            "Neues Backend-Modul `webapp/wca/`: WCA-API-Client (mit 1h-In-"
            "Memory-Cache), Nominatim-Geocoding-Wrapper (mit persistentem "
            "DB-Cache, TTL 30 Tage), Haversine-Distance-Berechnung, "
            "Country-Detection aus PLZ-Struktur.",
            "Endpoint `GET /wca/competitions/upcoming`: liefert die "
            "naechsten Turniere im Land des Users (PLZ aus Profil), "
            "sortiert nach Datum + Distanz, mit `distance_km` pro Eintrag. "
            "Default: max 300km, 10 Eintraege, 6 Monate Vorausschau.",
            "DB-Tabelle `postal_code_geo` (Composite-Key postal_code + "
            "country_iso2): persistenter Geocoding-Cache. Wenn 100 User "
            "dieselbe PLZ haben = nur 1 Nominatim-Call. PLZ-Geo aendert "
            "sich nie, TTL 30 Tage ist konservativ.",
            "Frontend-Card folgt im naechsten Commit.",
            "Hintergrund: User-Wunsch nach „Turniere in deiner Naehe\”. "
            "PLZ-Feld wurde dafuer Mai 14 schon im Profil ergaenzt — "
            "jetzt ist die andere Haelfte fertig.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.cstimer-bigfile",
        released=date(2026, 5, 16),
        title="csTimer-Import: grosse Files (30k+ Solves) jetzt importierbar",
        highlights=[
            "Bug-Fix: JSON-Bomb-Pre-Check (Security-Layer K2) hatte das "
            "Limit auf 200.000 strukturelle JSON-Tokens — fuer csTimer-"
            "Exporte mit > ca. 30.000 Solves zu eng. Limit jetzt auf "
            "2.000.000 hoch, was ca. 300.000 Solves abdeckt.",
            "Sicherheit bleibt: 30MB-Upload-Hardcap macht echte JSON-Bombs "
            "(~30M Tokens) weiterhin unmoeglich. Pre-Check greift bei 1/15 "
            "der theoretisch moeglichen Token-Last.",
            "Error-Message verstaendlicher: vorher „Moeglicher JSON-Bomb-"
            "Angriff\” (verwirrend fuer normale User), jetzt „Datei zu "
            "komplex — bei normalen csTimer-Exporten reicht das fuer ca. "
            "300.000 Solves\” plus Diagnose-Hinweis.",
            "Hintergrund: User-Report 2026-05-13 (csTimer-.txt-Datei "
            "scheiterte). Hypothese im STATUS-Memo war korrekt.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.features-refresh",
        released=date(2026, 5, 16),
        title="Feature-Liste „Was kann cubetracker?” auf Stand gebracht",
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
            "Trainer: „Algs-Trainer mit Visualisierung\” war "
            "ueberoptimistisch — gilt nur fuer OLL (57 Bilder). PLL-"
            "Bilder folgen noch, jetzt ehrlich kommuniziert.",
            "Account: Postleitzahl im Profil dazu (Vorbereitung fuer "
            "„WCA-Turniere in deiner Naehe\”).",
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
            "„ohne Hardware” statt „falsche Hardware”.",
            "Custom-Scramble-Generator (Ivy, Gear, …) hatte einen "
            "theoretischen Endlos-Loop wenn eine Spec nur 1 Base-Move "
            "gehabt haette. Defensive Guard rein — bei <2 Bases "
            "deaktivieren wir den „kein-Wiederholen”-Filter automatisch, "
            "damit der Tab nicht haengt.",
            "Scramble-Picker bei Session-Vorgaben (z.B. „pll” aus einer "
            "PLL-Trainings-Session): Toggle/Dropdown wuerde inkonsistent "
            "wirken, weil pll weder in WCA noch in Inoffiziell ist. "
            "Jetzt: beide Toggle-Buttons un-highlighted, statt Dropdown "
            "ein Hinweis „Aus Session-Vorgabe: pll — Toggle waehlen "
            "um zu aendern”. Klick auf einen Toggle wechselt sauber in "
            "die jeweilige Kategorie.",
            "Code-Hygiene: tote Props in ModeButton (disabled/disabled"
            "Title) raus, redundante mt-4 auf TouchTimerPad entfernt "
            "(space-y-4 des Parents reichte), eslint-disable-Kommentar "
            "in ScrambleCard erklaert (Identitaets-stabile Callback-Prop).",
            "Tests: „kein direktes Wiederholen”-Iterationen von 10 auf "
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
            "erscheint ein „↺ auto”-Button um wieder zum Default zu "
            "springen.",
            "WCA-Liste: alle WCA-Cubes (3x3, 4x4, …, Pyraminx, Skewb, "
            "Square-1, Megaminx, Clock) — werden weiterhin von scrambow "
            "generiert (WCA-quality, Mindest-Distanz).",
            "Inoffizielle Cubes (User-Wunsch): Ivy Cube, Gear Cube, "
            "Redi Cube, Master Pyraminx, Master Skewb, FTO. FTO via "
            "scrambow, die anderen via eigenem Random-Move-Generator mit "
            "„kein direktes Wiederholen derselben Achse”-Filter — nicht "
            "WCA-quality, aber sauber fuers Casual-Training.",
            "Cube-Type-Wechsel resettet den Picker automatisch, sodass "
            "der neue Cube wieder seinen passenden Scramble bekommt — "
            "verhindert „Ivy-Scramble fuer 3x3”-Stolperfallen.",
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
            "Display → „Tippen & halten”-Pad → erst danach Cube-/Session-/"
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
            "in deiner Naehe\” — Daten werden bewusst jetzt schon gesammelt "
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
            "Default — kein „erst Settings finden\”-Detour mehr.",
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
            "„Mein Account & Einstellungen\” springt direkt zum richtigen "
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
            "App-Header: Logo ersetzt den separaten „cubetracker\”-"
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
            "Anmeldeseite zeigt jetzt prominent „Was ist cubetracker?\” + "
            "Highlights neben dem Login-Formular — Besucher ohne Account "
            "verstehen sofort worum's geht",
            "Feature-Liste in 7 Kategorien (Solving, Analyse, Trainer, "
            "Community, Hardware, Daten, Account+Sicherheit)",
            "Innerhalb der App: Footer-Link „Was kann diese App?\” oeffnet "
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
            "neuen Tab „Community\” 🤝",
            "Innerhalb von Community: Sub-Tab-Bar mit „Freunde\” und "
            "„Bestenliste\” — gleicher Stil wie Verwaltung-Sub-Tabs",
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
            "fuer jeden Solve, oder „—\” wenn keine zugeordnet",
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
