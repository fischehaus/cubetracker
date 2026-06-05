"""Patch-Notes als Single-Source-of-Truth.

Konvention seit 2026-05-14:
  - Bei JEDER Änderung neuer Eintrag oben in PATCH_NOTES.
  - `version` folgt SemVer-Schema `2.0.0-alpha.W.X.Y` während Multi-User-
    Web-Phase. v2.0.0 sobald Hetzner-Migration durch + Feature-Set stable.
  - `__version__` in main.py wird automatisch aus PATCH_NOTES[0].version
    abgeleitet — damit "vergisst man nicht" die Versionsnummer hochzuziehen.
  - Frontend liest /api/changelog und rendert in Verwaltung → Patch Notes.

Format:
    PatchNote(
        version="2.0.0-alpha.W.X",
        released=date(2026, 5, 14),
        title="Kurzer Titel",
        highlights=["Aufzählungs-Punkt 1", "Punkt 2"],
        commit="abc1234",  # optional, für Cross-Reference
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
    # internal=True: rein technischer Eintrag (QA-Fixes, Methodik-/Tooling-
    # Refactors, Drift-Korrekturen) — fuer Nicht-Admins ausgeblendet,
    # damit der User-Changelog lesbar bleibt. Default ist public (False).
    internal: bool = False


# Neue Einträge OBEN einfügen — PATCH_NOTES[0] = neueste Version.
# Hinweis: bei internal=True-Eintraegen oben springt current_version()
# zum ersten public-Eintrag — die App-Version leakt also nie intern.
PATCH_NOTES: list[PatchNote] = [
    PatchNote(
        version="2.0.0-alpha.W.inspection-hold-config",
        released=date(2026, 6, 5),
        title="⏱ Inspektions-Halten: Dauer einstellbar",
        highlights=[
            "Am Phone/Tablet startet die Inspektion durch kurzes Gedrückthalten "
            "des Timers/Knopfs (statt Antippen). Wie lange du halten musst, kannst "
            "du jetzt selbst festlegen: in den Einstellungen unter Timer & Eingabe "
            "gibt es den Regler Halten bis Inspektion (200 bis 1500 ms, Standard "
            "500 = 0,5 s). Kürzer = schneller los, länger = noch weniger "
            "versehentliche Starts. Der Regler erscheint nur auf Touch-Geräten — "
            "am Desktop startet die Leertaste die Inspektion unverändert sofort.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.hold-to-inspect",
        released=date(2026, 6, 3),
        title="⏱ Inspektion am Phone: Halten statt Antippen",
        highlights=[
            "Auf dem Phone/Tablet startet die Inspektion jetzt nicht mehr durch "
            "ein kurzes Antippen des Timers oder des Tap-Knopfs, sondern erst "
            "wenn du ihn kurz gedrückt hältst — versehentliche Berührungen lösen "
            "so keine Inspektion mehr aus. Während du hältst, färbt sich der "
            "Timer lila und pulst; sobald die Inspektion startet, machst du wie "
            "gewohnt weiter. Am Desktop bleibt die Leertaste unverändert "
            "(sofortiger Start, WCA-Standard).",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.remember-me",
        released=date(2026, 5, 31),
        title="🔐 Angemeldet bleiben",
        highlights=[
            "Neu am Login: eine Checkbox Angemeldet bleiben (standardmäßig "
            "aktiv). Angehakt bleibst du über Browser-Neustarts hinweg "
            "eingeloggt — bis zu 30 Tage, und auch in der zum Homescreen "
            "hinzugefügten App. Hakst du sie ab, gilt die Anmeldung nur für die "
            "aktuelle Sitzung und endet automatisch beim Schließen des Browsers "
            "— praktisch an einem geteilten Gerät. Bei einer Sitzungs-Anmeldung "
            "bleibt danach kein gültiger Zugang im Gerät liegen.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.skin-pseudo-header-pills",
        released=date(2026, 5, 31),
        title="Lesbare Köpfe in Profil / Einstellungen / Nachrichten & Co.",
        highlights=[
            "Die Bereiche aus dem Menü oben rechts (Profil, Einstellungen, "
            "Nachrichten, Konto & Daten, Admin, Tester) haben oben einen Titel "
            "und einen Zurück-zur-App-Knopf, die bisher direkt auf dem "
            "Hintergrund lagen — bei aktivem Skin-Bild teils kaum lesbar. Beide "
            "bekommen jetzt ein dezentes Pillen-Backing (gemeinsame Komponente), "
            "das bei aktivem Skin auf deckend dunkel schaltet und so überall "
            "lesbar bleibt.",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.timer-controls-height",
        released=date(2026, 5, 31),
        title="Timer-Steuerleiste: einheitliche Button-Höhe",
        highlights=[
            "Kosmetik: Die Knöpfe über dem Timer (Schriftgröße A-/A+, "
            "Größen-Pille, Fokus, Zen) haben jetzt alle dieselbe Höhe und "
            "die Leiste bricht auf schmalen Phones sauber um statt zu "
            "überlaufen.",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.timer-keep-last-time",
        released=date(2026, 5, 31),
        title="⏱ Zeit bleibt nach dem Solve stehen + Schnellkorrektur im Zen",
        highlights=[
            "Im Spacebar-/Tap-Timer bleibt deine gestoppte Zeit jetzt groß "
            "stehen, statt sofort auf 0.00 zu springen — sie verschwindet erst, "
            "wenn du den nächsten Solve startest (antippen/Leertaste) oder den "
            "Solve löschst. +2 und DNF korrigierst du direkt unter der Zeit, "
            "ohne dass sie ausgeblendet wird. So kannst du nach jedem Versuch "
            "in Ruhe das Ergebnis lesen und korrigieren — die Schnellkorrektur-"
            "Knöpfe erscheinen jetzt auch im Zen-Vollbild-Modus.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.ia-nachrichten-bereich",
        released=date(2026, 5, 31),
        title="📬 Eigener Nachrichten-Bereich + Ungelesen-Badge",
        highlights=[
            "Die Antworten des Teams auf dein Feedback haben jetzt einen "
            "eigenen Bereich Nachrichten im Menü oben rechts (vorher unter "
            "Konto & Daten versteckt) — denn das ist Kommunikation, keine "
            "Daten-Verwaltung. Neu: ein rotes Zähler-Badge am Avatar oben "
            "rechts zeigt ungelesene Antworten, auch ohne das Menü zu öffnen. "
            "Hier sollen später auch Community-Nachrichten landen.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.timer-zen-mode",
        released=date(2026, 5, 31),
        title="🧘 Zen-Modus für den Timer",
        highlights=[
            "Neuer Vollbild-Zen-Modus im Timer-Tab (Knopf 🧘 Zen oben rechts): "
            "nur der Scramble und eine sehr große Zeit, sonst nichts — keine "
            "Karten, keine Knöpfe. Antippen (Phone) oder Leertaste (Desktop) "
            "startet und stoppt wie gewohnt, inklusive Inspektion und +2/DNF. "
            "Das × oben rechts beendet den Modus — und ist nur sichtbar, wenn "
            "gerade kein Solve läuft, damit du keine Zeit aus Versehen "
            "verwirfst.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.feedback-roadmap-pipeline",
        released=date(2026, 5, 31),
        title="🗺 Feedback-Inbox → Roadmap-Pipeline (Admin)",
        highlights=[
            "Admin-Workflow: In der Feedback-Inbox gibt es pro Nachricht jetzt "
            "einen Knopf, der das Feedback direkt auf die Roadmap übernimmt. "
            "Er öffnet einen Editor, vorbefüllt mit dem User-Text — "
            "Titel/Beschreibung präzisieren, Phase + Sichtbarkeit + optionale "
            "Antwort an den User wählen, speichern. Das legt atomar ein "
            "Roadmap-Item an (mit Rücklink zum Ursprungs-Feedback), setzt den "
            "Feedback-Status und schreibt die Antwort. So wird aus einem "
            "User-Wunsch direkt ein Entwicklungs-Auftrag.",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.ia-app-shell",
        released=date(2026, 5, 31),
        title="📱 App-Feeling: feste Navi-Leiste unten + schlanke Kopfzeile",
        highlights=[
            "Auf dem Phone gibt es jetzt eine feste Navigationsleiste am "
            "unteren Rand (Timer, Statistik, Training, Community) — immer "
            "mit dem Daumen erreichbar, wie in einer echten App. Die "
            "Kopfzeile oben ist schlanker geworden und bleibt beim Scrollen "
            "stehen, sodass Version und das Menü oben rechts immer in "
            "Reichweite sind.",
            "Auf dem Desktop bleibt die gewohnte Tab-Leiste oben.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.ia-einstellungen-bereich",
        released=date(2026, 5, 31),
        title="⚙ Einstellungen sind jetzt ein eigener Bereich",
        highlights=[
            "Die App-Einstellungen haben jetzt einen eigenen Platz im Menü "
            "oben rechts (vorher steckten sie als Unterpunkt in Konto & "
            "Daten). Übersichtlich in zwei Gruppen sortiert: Aussehen & "
            "Darstellung (Skin, Schriftgrößen, Scramble-Bild) und Timer & "
            "Eingabe (Leertaste, Inspektion, Multi-Phasen-Splits).",
            "Konto & Daten ist im Gegenzug schlanker: der frühere "
            "Einstellungen-Reiter heißt jetzt Sicherheit und enthält genau "
            "das Konto-Thema (Email, Passwort, Account löschen).",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.ia-profil-bereich",
        released=date(2026, 5, 31),
        title="👤 Neuer Profil-Bereich",
        highlights=[
            "Im Menü oben rechts gibt es jetzt einen eigenen Bereich Profil — "
            "hier wohnt deine nach außen gerichtete Identität an einem Ort: "
            "Anzeigename, Land, deine WCA-ID samt offiziellem WCA-Profil "
            "(Bestzeiten, Medaillen, Wettkämpfe) und die Auffindbarkeit für "
            "Freunde. Vorher war das über die Einstellungen und das "
            "Statistik-Dashboard verstreut.",
            "Schon als Ausblick sichtbar: die kommende Sichtbarkeits-Steuerung "
            "(privat / nur Freunde / öffentlich) und eine teilbare "
            "Solving-Card — beides kommt in einem nächsten Schritt.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.ia-nav-entdopplung",
        released=date(2026, 5, 31),
        title="🧹 Aufgeräumte Navigation: ein Ort pro Aktion",
        highlights=[
            "Letzter Schliff der Navigations-Überarbeitung: Funktionen, die "
            "vorher doppelt im Footer UND im Menü oben rechts standen (Was "
            "kann die App, Roadmap, Feedback), gibt es jetzt nur noch an "
            "einer Stelle — im Menü oben rechts. Auch die Sprachwahl lebt "
            "jetzt nur noch dort. Der Footer bleibt schlank: Impressum, "
            "Datenschutz und der Hinweis aufs Menü.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.ia-subtab-routing",
        released=date(2026, 5, 31),
        title="🔖 Statistik-Detailansicht ist jetzt verlinkbar",
        highlights=[
            "Die Detail-Ansicht im Statistik-Tab (Charts + Solveliste) hat "
            "jetzt eine eigene Adresse (Endung #statistik/detail) — du "
            "kannst sie direkt als Lesezeichen speichern, und der "
            "Zurück-Knopf des Browsers wechselt jetzt korrekt zwischen "
            "Übersicht und Detail (vorher blieb die Ansicht stehen).",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.ia-admin-bereich",
        released=date(2026, 5, 31),
        title="🛡 Admin & Tester: eigener Bereich im Menü statt Verwaltungs-Tab",
        highlights=[
            "Auch für Admin und Tester ist der Verwaltungs-Tab aus der "
            "oberen Leiste verschwunden — ihre Werkzeuge liegen jetzt im "
            "Menü oben rechts (Admin bzw. Tester). Damit hat jede Rolle "
            "dieselbe schlanke 4-Tab-Leiste: Timer, Statistik, Training, "
            "Community.",
            "Der Admin-Bereich hat jetzt eine eigene Unter-Navigation "
            "(Statistiken, Feedback, Live-Tests, Roadmap, Nutzer, "
            "Ankündigung) statt sechs langer Panels untereinander — kein "
            "endloses Scrollen mehr.",
            "Bestehende Lesezeichen und die zuletzt geöffnete Ansicht "
            "werden automatisch in den passenden neuen Bereich umgeleitet.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.ia-konto-usermenu",
        released=date(2026, 5, 31),
        title="👤 Konto & Daten wandern ins Menü — schlankere Navigation",
        highlights=[
            "Sessions, Hardware, Backup/Import, Outlier-Pflege und "
            "Einstellungen sind nicht mehr ein eigener Haupt-Tab "
            "(Verwaltung), sondern liegen jetzt gebündelt unter Konto & "
            "Daten im Menü oben rechts (das Avatar-Symbol). Die Haupt-"
            "Navigation wird dadurch spürbar ruhiger.",
            "Für normale Nutzer bleibt damit eine aufgeräumte Leiste mit "
            "genau den täglich genutzten Bereichen: Timer, Statistik, "
            "Training und Community. Admin und Tester behalten ihren "
            "zusätzlichen Verwaltungs-Tab.",
            "Es geht nichts verloren: wer den alten Verwaltung-Tab als "
            "Lesezeichen gespeichert oder zuletzt offen hatte, landet "
            "automatisch im neuen Konto-&-Daten-Bereich.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.ia-statistik-merge",
        released=date(2026, 5, 30),
        title="📊 Dashboard + Analyse vereint: der neue Statistik-Tab",
        highlights=[
            "Die bisher getrennten Tabs Dashboard und Analyse sind jetzt "
            "ein einziger Tab: Statistik. Oben schaltest du zwischen "
            "Übersicht (deine Tagesform + Kern-Stats, wie das frühere "
            "Dashboard) und Detail (alle Charts + die volle Solveliste, "
            "wie die frühere Analyse) um. Die Haupt-Navigation wird damit "
            "ruhiger — 5 statt 6 Tabs.",
            "Direkter Sprung in die Tiefe: ein Klick auf einen Würfel in "
            "der Übersicht (z.B. bei den letzten Rekorden) öffnet sofort "
            "die Detail-Charts für genau diesen Würfel.",
            "Nichts geht verloren: wer Dashboard oder Analyse als "
            "Lesezeichen gespeichert oder zuletzt offen hatte, landet "
            "automatisch im passenden Bereich des neuen Statistik-Tabs.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.design-system-foundation",
        released=date(2026, 5, 30),
        title="🧱 Design-System-Grundlage (UI-Primitive)",
        highlights=[
            "Start der UX-/Struktur-Überarbeitung: erste wiederverwendbare "
            "UI-Bausteine (Card, CardTitle, Button, EmptyState) als eine "
            "zentrale Quelle, statt überall kopierter Style-Strings. Das "
            "ist die Grundlage, um die App nach und nach ruhiger + "
            "konsistenter zu machen.",
            "Erste sichtbare Migration: die Statistik-Karte nutzt jetzt "
            "die neuen Bausteine — etwas ruhigere Überschrift + "
            "aufgeräumterer Leer-Zustand. Die restlichen Karten ziehen "
            "in den nächsten Wellen nach (Tab für Tab).",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.skin-maxcontent",
        released=date(2026, 5, 30),
        title="🎨 Zwei Max-Content-Skins: Pixel Academy + Lofi Solver",
        highlights=[
            "Zwei neue, visuell reichere Theme-Varianten: **Pixel "
            "Academy (Max Content)** und **Lofi Solver (Max Content)**. "
            "Vollere Versionen der bestehenden Themes — mehr Szene-"
            "Details, Atmosphäre, Stimmung. Optimiert für deckende Cards.",
            "Die schlankeren Originale (Pixel Academy / Lofi Solver) "
            "bleiben erhalten — die Max-Content-Varianten sind zusätzliche "
            "Auswahl im Tab „Verwaltung → Aussehen\". Damit jetzt 10 "
            "Hintergrund-Themen zur Wahl.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.pwa-offline",
        released=date(2026, 5, 30),
        title="📴 PWA Phase B: Offline-Start + Neue-Version-Hinweis",
        highlights=[
            "Cubetracker hat jetzt einen Service-Worker: Nach dem ersten "
            "Besuch lädt das App-Gerüst auch **offline** (statt weißem "
            "Screen / Browser-Dino). Statische Teile (Code, Bilder, "
            "Skins) kommen blitzschnell aus dem lokalen Cache, im "
            "Hintergrund wird auf neue Versionen geprüft.",
            "Wichtig & bewusst: deine **Daten** (Solves, Statistiken) "
            "kommen weiterhin immer frisch vom Server und werden NIE "
            "gecacht — offline siehst du also das App-Gerüst, aber für "
            "aktuelle Solve-Daten brauchst du Verbindung. Kein Risiko, "
            "alte Zahlen angezeigt zu bekommen.",
            "Neuer „🔄 Neue Version verfügbar“-Hinweis: wenn ein Update "
            "deployt wurde, erscheint ein Toast — ein Tipp darauf lädt "
            "die App sauber neu. Kein manuelles Hard-Refresh / Cache-"
            "Leeren mehr nötig.",
            "Technik-Notiz: bewusst hand-gerollter Service-Worker (kein "
            "Workbox-Plugin) wegen Vite-8/Rolldown-Kompatibilität + "
            "voller Kontrolle über die Caching-Regeln. QA-Sub-Agent-"
            "Review mit Fokus auf die typischen SW-Fallen (Stale-Cache-"
            "Lock, API-Cache-Unfall, Reload-Loop) — 3 SOLLTE + 1 NICE "
            "vor Deploy gefixt.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.pwa-manifest",
        released=date(2026, 5, 30),
        title="📲 App auf den Homescreen installierbar (PWA-Manifest)",
        highlights=[
            "Cubetracker lässt sich jetzt **als App auf den Homescreen "
            "installieren** — der Browser zeigt auf Android Chrome/Edge "
            "automatisch „Zum Startbildschirm hinzufügen\", auf iOS via "
            "Teilen → „Zum Home-Bildschirm\". Einmal installiert startet "
            "die App im standalone-Mode: Vollbild ohne Browser-Adresszeile, "
            "fühlt sich an wie eine native App.",
            "Theme- und Status-Bar-Farbe matchen das App-Design (purple). "
            "Splash-Screen mit Cubetracker-Logo + dunklem Background. "
            "Funktioniert mit allen Skin-Themes — der Skin lädt nach dem "
            "Splash. Roadmap-Item „PWA-Setup (Phone-Homescreen-Install)\" "
            "damit abgeschlossen.",
            "Was NICHT enthalten ist (kann später nachgezogen werden, "
            "ist als eigenes Item denkbar): Service-Worker für Offline-"
            "Nutzung + Auto-Update-Toast „neue Version verfügbar\". "
            "Aktuell braucht die App eine Internet-Verbindung wie die "
            "normale Webseite — der Homescreen-Eintrag spart nur den "
            "Browser-Tab und macht den App-Start direkt.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.timer-card-tap",
        released=date(2026, 5, 30),
        title="📱 Timer-Display auf Phone tappbar",
        highlights=[
            "Auf Touch-Devices ist jetzt das **Timer-Display selbst** "
            "tappbar zum Starten/Stoppen — statt nur den separaten "
            "Tap-Pad-Knopf darunter. Das große Zeit-Feld ist ein "
            "natürliches Touch-Target und der Workflow wird flüssiger.",
            "Beide Tap-Targets bleiben parallel verfügbar: der "
            "dedizierte Knopf unter dem Timer und das Display selbst. "
            "Wer das eine bevorzugt, kann es weiter so nutzen; das "
            "andere ist ein Bonus-Hotspot. Identisches Pointer-Capture-"
            "Verhalten wie der Knopf (Finger-vom-Rand-rutschen verliert "
            "kein keyup → kein in „ready\"-stecken-bleiben).",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.skin-readability-headings",
        released=date(2026, 5, 30),
        title="🔍 Dashboard-Section-Headings auf Skin lesbar",
        highlights=[
            "Nachzug zur Lesbarkeits-Welle: die 4 Section-Headings auf "
            "dem Dashboard („HEUTE\", „DEINE PERFORMANCE\", „TRAINING\", "
            "„WELT\") schwebten als reiner Text auf dem Skin-Hintergrund — "
            "auf hellen Bereichen (Codex Vitruvian / Pergament, Pixel "
            "Academy) waren sie quasi unsichtbar. Jetzt: kleine "
            "halb-deckende Pille mit backdrop-blur drumherum (gleicher "
            "Stil wie die Versions-Pille, nur kleiner). Bleibt dezent, "
            "die Stats-Karten dominieren weiterhin.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.skin-readability",
        released=date(2026, 5, 30),
        title="🔍 Lesbarkeit auf Skin-Hintergründen verbessert",
        highlights=[
            "Bei aktivem Hintergrund-Skin (besonders Pixel Academy + "
            "Algorithm Lab mit hellen Bereichen) konnte der freistehende "
            "Footer-Text (Impressum / Datenschutz / Feedback / Roadmap-"
            "Links) gegen den Hintergrund wegfließen. Jetzt: Text + Links "
            "in helleren Tönen (gray-200 / gray-100 statt 400 / 300) "
            "plus drop-shadow — Pattern wie LoginPage-Footer.",
            "Die Versionsnummer-Pill oben rechts (Health-Badge) bleibt "
            "grün/violett, ist jetzt aber deutlich deckender "
            "(Hintergrund-Opacity 10 → 25%, Border 30 → 50%, plus "
            "backdrop-blur). Dadurch hebt sie sich auch vor hellen "
            "Skin-Bereichen stabil ab, ohne ihren Farb-Charakter zu "
            "verlieren.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.skin-pixel-academy-lofi",
        released=date(2026, 5, 30),
        title="🎨 Zwei neue Skins: Pixel Academy + Lofi Solver",
        highlights=[
            "**Pixel Academy** — Pixel-Art / Coding-Club-Look mit "
            "bunten Akzenten (Cyan, Mint, Pink, Yellow). Speziell für "
            "junge Cuber (8-12 Jahre) entworfen, aber auch erwachsenen-"
            "tauglich.",
            "**Lofi Solver** — Cinematic Rainy-Night-Vibe in dunklen "
            "Violett/Orange-Tönen. Cozy Fokus-Atmosphäre, besonders gut "
            "für lange Übungs-Sessions. Pairing mit Glassmorphism-Cards "
            "wirkt am stärksten.",
            "Beide Skins haben alle 5 App-Auflösungen (1920×1080 bis "
            "3840×1600 + 3840×1080-superwide). Im Tab „Verwaltung → "
            "Aussehen\" auswählbar. Total ~1 MB zusätzliche Asset-Größe.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.skin-algorithm-lab-codex-v2",
        released=date(2026, 5, 30),
        title="🎨 Skin-Update: Algorithm Lab + Codex Vitruvian (No-Cube-Edition)",
        highlights=[
            "Die zwei Theme-Skins „Algorithm Lab\" und „Codex Vitruvian\" "
            "wurden auf v2 aktualisiert. Die neuen Versionen sind "
            "\"No Real Cube Edition\" — keine realistischen Plastik-3x3-"
            "Cubes im Hintergrund mehr, dafür klarere Wireframes, "
            "OLL/PLL-Diagramme und Algorithmus-Notizen. Bessere "
            "Lesbarkeit der UI-Schicht oben drüber.",
            "Skin-IDs unverändert (`algorithm-lab`, `codex-vitruvian`) — "
            "User-Settings bleiben gültig, der neue Look erscheint nach "
            "Reload automatisch. Alle 5 Auflösungen (1920×1080, "
            "2560×1440, 3440×1440, 3840×1080-super, 3840×1600) ersetzt "
            "plus Preview-Thumbnail. JPG-Quellen aus den v2-Theme-Packs "
            "wurden zu WebP konvertiert (~3 MB total, gleicher Pfad).",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.cstimer-dynamic-import",
        released=date(2026, 5, 30),
        title="⚡ Schnellerer App-Start: Scramble-Code lazy-geladen",
        highlights=[
            "Die drei Scramble-Bibliotheken (scrambow, csTimer-Vendor, "
            "Eigenbau-Ivy-Solver) werden NICHT mehr im Initial-Bundle "
            "ausgeliefert, sondern erst gefetcht wenn der Timer-Tab "
            "erscheint. Das spart **122 KB unkomprimiert / 43 KB "
            "gzip** beim Erstladen — spürbar bei langsamer Mobile-"
            "Connection und dem Login-Flow (wo Scrambles gar nicht "
            "gebraucht werden).",
            "Damit es trotzdem flott bleibt: der Timer-Tab triggert "
            "den Lazy-Load beim Card-Mount opportunistisch (fire-and-"
            "forget) — zur Zeit deines ersten „Skip\"-Klicks liegt "
            "das Vendor-Bundle in der Regel schon im Browser-Cache. "
            "Auch bei langsamen Verbindungen bleibt der Klick "
            "race-condition-safe: wechselst du den Cube-Type "
            "während noch ein Scramble lädt, wird das alte Ergebnis "
            "verworfen.",
            "Tests: alle 44 scramble.test.ts-Cases auf async/await "
            "umgestellt, grün in ~1s. TypeScript-Compile grün. "
            "QA-Sub-Agent-Review absolviert vor Push.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.toast-manager",
        released=date(2026, 5, 30),
        title="🔔 Toast-Manager: zentrale Engine + Severity-Stacking",
        highlights=[
            "Neuer zentraler Toast-Hub (lib/toast.ts) mit 6 Severities "
            "(success/info/warning/error/achievement/challenge) und 4 "
            "Positionen (TR/TL/BR/BL). Convenience-API: "
            "`toast.success('Solve gespeichert')`, `toast.error(...)`, "
            "`toast.achievement({title, message, icon})`. Pushed wird in "
            "einen Singleton-Store, rendert wird in EINER <ToastHost />-"
            "Komponente in App.tsx. Bestehende 3 Toaster sind jetzt "
            "reine Listener (null-rendering) — ~90% Code-Duplikat zwischen "
            "Achievement- und Challenge-Toaster eliminiert.",
            "Severity-Stacking: pro Position max 5 sichtbar, „+N weitere\""
            "-Summen-Toast unten dran, „Alle ausblenden\"-Knopf. "
            "Auto-Dismiss-Default je Severity sinnvoll (Errors bleiben "
            "bis User-Dismiss, Success 4s, Info/Warning/Achievement/"
            "Challenge 5-6s). dedupKey-Pattern verhindert Doppel-Pushen "
            "bei Query-Refetch. Künftige Use-Cases (Solve-saved, Restore-"
            "done, Smart-Cube-Disconnected, …) brauchen keine neue "
            "Toaster-Komponente mehr — einfach `toast.*` aufrufen.",
            "QA-Sub-Agent: 0 KRITISCH, 4 SOLLTE + 2 NICE — alle vor "
            "Push gefixt. Multi-Instance-Snapshot-Race per useMemo-"
            "Closures isoliert, ein zentraler aria-live-Announcer "
            "für Screen-Reader (statt 4× pro Stack), MoreCard-Severity "
            "auf ältesten versteckten Toast korrigiert, Title/Text-"
            "Farben getauscht. PbConfettiOverlay-Timer-Leak als separate "
            "Mini-Welle ausgelagert.",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.cache-invalidation-prefix",
        released=date(2026, 5, 30),
        title="🔁 Cache-Invalidation: Domain-Prefix statt 13-Zeilen-Listen",
        highlights=[
            "React-Query-Keys laufen jetzt über eine zentrale `qk`-"
            "Konstante (lib/queryKeys.ts) mit Domain-Prefix-Hierarchie "
            "(`solves-domain`, `sessions-domain`, …). Mutations "
            "invalidieren per Prefix-Match statt 13 Einzelkeys "
            "aufzuzählen — neue Stats-Endpoints werden ab jetzt "
            "automatisch mit-invalidiert, kein Drift mehr durch "
            "vergessene Listen-Updates. Touched: api.ts (~140 Stellen) "
            "+ BackupPanel + AccountSettingsPanel + ImportPanel + "
            "App.tsx + neue queryKeys.ts. TypeScript-Compile grün.",
            "Beifang: 3 reale Bugs gefixt, die der Refactor aufgedeckt "
            "hat — (a) Wipe-Demo-Data invalidierte `[\"activity\"]` / "
            "`[\"temporal\"]` / `[\"by-cube\"]` (echte Keys haben "
            "`stats-`-Prefix → stille No-Ops, Stats zeigten nach "
            "Reset stale Werte), (b) CSV-Import invalidierte nur "
            "Solves+Sessions (Stats+Achievements blieben stale), "
            "(c) Leaderboard wurde NIRGENDWO invalidiert (eigenes "
            "Ranking blieb nach jedem Solve bis zum Tab-Wechsel "
            "stale). Alle drei via Prefix-Invalidation jetzt sauber.",
            "QA-Sub-Agent-Review: 1 KRITISCH (ImportPanel — vor "
            "Commit gefixt), 1 SOLLTE (App.tsx health-Key in Hierarchie "
            "integriert), 1 NICE (BackupPanel-Restore-Kommentar "
            "präzisiert). Alle erledigt vor Push.",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.roadmap-export-key",
        released=date(2026, 5, 29),
        title="🔑 Roadmap-Export-Endpoint mit festem Key (Tooling)",
        highlights=[
            "Neuer dedizierter Auth-Pfad für das Claude-Roadmap-Tooling: "
            "`GET /api/roadmap/export` + `POST /api/roadmap/export/done`, "
            "gated durch einen langlebigen Secret-Key (ENV "
            "`ROADMAP_EXPORT_KEY`, Header `X-Roadmap-Key`). Ersetzt den "
            "kurzlebigen Admin-JWT, der ~stündlich ablief.",
            "Safe-by-Default: ohne gesetzte ENV-Var sind beide Endpoints "
            "deaktiviert (404). Bei Mismatch ebenfalls 404 (versteckt die "
            "Existenz, analog `require_admin`). Constant-time-Vergleich.",
            "Schmaler Write-Surface: `/export/done` kann ausschließlich "
            "`status=\"done\"` setzen (kein Delete, kein Content-Edit). "
            "Schema lehnt leere Listen/zu lange Titel ab. Verifiziert "
            "durch 7 neue pytest-Smoke-Tests (Gesamt-Suite: 32 grün).",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.solvelist-scroll-cap",
        released=date(2026, 5, 29),
        title="📜 Solve-Liste: kompakte Scroll-Box statt endloser Seite",
        highlights=[
            "Die Solve-Liste lebt jetzt in einer höhenbegrenzten Scroll-Box "
            "(max. ~70% Bildschirmhöhe) mit eigener Scrollbar — statt die "
            "ganze Seite bei 1000 Solves / „Alle\" in die Länge zu ziehen. "
            "Auf älteren Phones scrollt es dadurch ruhiger.",
            "Standard-Anzeige ist jetzt 50 Solves (vorher 100) — über den "
            "Limit-Selektor weiterhin bis „Alle\" erweiterbar.",
            "Auf dem Desktop bleiben die Spaltenköpfe beim Scrollen oben "
            "stehen (sticky Header).",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.backend-test-suite",
        released=date(2026, 5, 29),
        title="🧪 Backend-Smoke-Tests (pytest)",
        highlights=[
            "Erste echte Test-Abdeckung der Backend-Endpoints: pytest-Infra "
            "(conftest mit Test-SQLite + Auth-Fixtures, die Token direkt "
            "minten) + 13 Smoke-Tests über die Kern-Cluster — Health, Auth "
            "(Register/Login/Me + Negativ-Fälle), Solves (Create/List + "
            "Cross-User-Isolation), Roadmap (Public vs Admin) und die "
            "Admin-Permission-Boundary. 25 Tests grün (inkl. der 12 "
            "bestehenden). Fundament, das künftige Backend-Wellen absichert.",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.recharts-split",
        released=date(2026, 5, 29),
        title="⚡ Schnellerer Erststart: Diagramme werden lazy geladen",
        highlights=[
            "Die Chart-Bibliothek (Recharts, ~80kb gzip) wurde bisher beim "
            "ersten App-Laden mitgeladen — auch für alle, die nie den "
            "Analyse-/Dashboard-Tab öffnen. Jetzt wird sie erst geladen, "
            "wenn wirklich ein Diagramm gerendert wird.",
            "Effekt: das Initial-Bundle ist ~110kb gzip kleiner (536 → 426kb), "
            "die App startet spürbar schneller — besonders auf dem Phone.",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.wca-503-banner",
        released=date(2026, 5, 29),
        title="📡 WCA-Ausfall: klarer Hinweis statt stiller Lücke",
        highlights=[
            "Wenn der offizielle WCA-Service mal nicht erreichbar ist "
            "(502/503/504), zeigt die App jetzt ein dezentes Banner oben — "
            "damit weißt du sofort, dass dein WCA-Profil und die offiziellen "
            "Records vorübergehend fehlen oder veraltet sein können, statt "
            "dich über eine leere Karte zu wundern.",
            "Das Banner blendet sich automatisch wieder aus, sobald der "
            "WCA-Service zurück ist (und lässt sich manuell wegklicken).",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.random-move-fallback",
        released=date(2026, 5, 29),
        title="🎲 Robusterer Scramble-Fallback (Dino/Floppy/Tower)",
        highlights=[
            "Dino-, Floppy- und Tower-Cube-Scrambles kommen normal vom "
            "csTimer-Modul (Random-State). Falls dessen Init mal crasht, gab "
            "es bisher einen leeren Scramble („nicht verfügbar\"). Jetzt "
            "greift ein Random-Move-Fallback (analog Ivy/Gear/Redi) — der "
            "Timer bleibt immer bespielbar. QA-Befund vom 2026-05-17.",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.roadmap-admin-reorder",
        released=date(2026, 5, 29),
        title="🔼 Roadmap-Pflege: Items per ▲▼ sortieren (oben zuerst)",
        highlights=[
            "Im Admin-Panel „Roadmap-Pflege\" lässt sich die Reihenfolge "
            "der Items jetzt direkt per ▲/▼-Buttons ändern — oben zuerst, "
            "genau wie sie im User-Roadmap-Modal erscheinen.",
            "Backend: neuer atomarer Endpoint POST /admin/roadmap/reorder "
            "(vergibt sort_order in 10er-Schritten anhand der Reihenfolge, "
            "alles in einer Transaktion). Schema lehnt leere Listen, "
            "fremde Phasen und Extra-Felder ab.",
            "Die ▲/▼-Buttons sind bewusst nur aktiv, wenn KEIN Status-/"
            "Sichtbarkeits-Filter läuft — sonst würde die Phase nur anhand "
            "der sichtbaren Items neu nummeriert und versteckte Items "
            "verwürfeln. Ein Hinweis erklärt das im Panel.",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.skin-three-themes",
        released=date(2026, 5, 29),
        title="🎨 Drei neue Hintergrund-Skins",
        highlights=[
            "Drei neue wählbare Hintergründe — damit gibt es jetzt 6 Skins "
            "zur Auswahl (unter Verwaltung → Aussehen / Hintergrund):",
            "  • PB Hunt – Competition Focus: dunkel, fokussiert, "
            "Wettkampf-Stimmung für die PB-Jagd.",
            "  • Algorithm Lab: cleaner Analyse-Look mit OLL/PLL-Boards "
            "und Notation in Blau.",
            "  • Codex – Vitruvian Cube: Da-Vinci-Codex-Stil mit "
            "Pergament, Konstruktionszeichnungen und Gold-Akzenten.",
            "Jeder Skin kommt in 5 Auflösungen (FullHD bis Superwide 32:9) "
            "als WebP — die App lädt automatisch die kleinste passende für "
            "deinen Bildschirm. Wie immer pro Gerät gespeichert, jederzeit "
            "umschaltbar, und kombinierbar mit dem Card-Stil (deckend / Glas).",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.roadmap-wsjf-reorder",
        released=date(2026, 5, 29),
        title="🗺️ Roadmap nach WSJF priorisiert + einmalige Reorder-Migration",
        highlights=[
            "Die 33 Roadmap-Items wurden in eine entwicklungs-sinnvolle "
            "Reihenfolge gebracht. Methode: WSJF (Cost-of-Delay ÷ Effort), "
            "wobei Cost-of-Delay ausgewogen aus 4 Kriterien kommt — "
            "USP-Beitrag, Reichweite, Risiko-Reduktion, User-Nachfrage.",
            "Reihenfolge innerhalb jeder Phase (P1/P3/P4/P5/P6) neu sortiert. "
            "Zwei bewusste Phasen-Wechsel P6 → P1: Backend-Test-Suite "
            "(Fundament für künftige Backend-Wellen — die 3x zurückgerollte "
            "Demo-Backend-Welle war das Symptom fehlender Tests) + Random-"
            "Move-Fallback (Robustheit-Quick-Win, 1-2h).",
            "Harte Abhängigkeiten als Constraints respektiert: 3D-Cube-Vis "
            "vor Reconstruction-Tool, Online-Battle vor Friend-Challenges.",
            "Smart-Cube-Item Status-Drift bereinigt: stand als „geplant\", "
            "ist aber für GAN i4 längst teil-live (Pairing/Connect + Auto-"
            "Time v1-v4) — Note ehrlich gemacht (offen: v5 Auto-Solved-"
            "Detection, wartet auf Diagnose-Logs).",
            "Technik: einmalige, selbst-deaktivierende Migration "
            "`reorder_roadmap_once` (Sentinel = „Backend-Test-Suite noch in "
            "P6?\"). Nötig weil die Seeder bewusst INSERT-only sind (damit "
            "manuelle Admin-Reorders erhalten bleiben). Läuft genau einmal "
            "pro DB, danach skip. Smoke-getestet (33 Items, sort_order "
            "sequenziell, idempotent) + QA-Pass mit 0 KRITISCH.",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.roadmap-doku-cleanup",
        released=date(2026, 5, 29),
        title="🗺️ Roadmap-Doku-Cleanup: 6 Stellen Drift-Fix",
        highlights=[
            "Audit-Methode auf die Roadmap angewandt (analog zum Feature-"
            "Audit von heute Morgen): Sub-Agent-Inventar über 5 Schichten "
            "(ROADMAP.md / seeds/roadmap.py / lib/roadmap-phases.ts / "
            "changelog/data.py / NEXT_SESSION.md) + Cross-Diff.",
            "Befund 1 (HARD): 6 Doku-/Config-Stellen referenzierten noch das "
            "nicht-mehr-existierende `webapp/frontend/src/lib/roadmap-"
            "data.ts`. Das File wurde mit W.roadmap-modal-api gelöscht "
            "— Phase-Meta liegt seither in `roadmap-phases.ts`, Items "
            "in der DB-Tabelle `roadmap_items` (gepflegt via Admin-UI).",
            "Fix-Stellen: NEXT_SESSION.md (Single-Source-Tabelle), "
            "MAINTENANCE.md (2 Maintenance-Checks), ROADMAP.md (Header-"
            "Block neu strukturiert), seeds/roadmap.py (Docstring-"
            "Quelle), post-git-commit.sh (Hook-Hint).",
            "Befund 2 (KONZEPTIONELL): zwei koexistierende Phase-"
            "Konzepte waren nirgends erklärt — `ROADMAP.md` zählt "
            "historische Release-Phasen 1..9 (+ Sub-Phasen, Tags v0.1..v1.0), "
            "die aktuelle App-Roadmap nutzt thematische Cluster P1..P6 "
            "(Polish / Multi-User-USP / Power-User / Reichweite / "
            "Nische-Spezial-User). Aufklärungs-Block oben in ROADMAP.md "
            "ergänzt.",
            "Item-Stand bestätigt: 33 DB-Seeds verteilt auf P1/P3/P4/P5/P6 "
            "(P2 ist `done` und nicht im Seed) — kein Item-Drift, nur "
            "Doku-Drift gefunden.",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.feature-curation",
        released=date(2026, 5, 29),
        title="📐 Feature-Modal kuratiert: 23 Public + „Mehr anzeigen\"-Toggle",
        highlights=[
            "Vor der Demo morgen: das „Was kann diese App?\"-Modal war "
            "mit 55 Bullets über 8 Kategorien überfrachtet. Aus User-"
            "Sicht hat das mehr abgeschreckt als überzeugt.",
            "**Refactor**: jedes Bullet hat jetzt eine Audience-"
            "Klassifikation:",
            "  • `public` — die ~23 Bullets die einen csTimer-User wirklich "
            "aufhorchen lassen (Smart-Cube, Voice-Alerts, Multi-Cube-"
            "Compare, WCA-Integration, Skin-System, Trainings-Sets, ...)",
            "  • `expanded` — 13 Detail-Bullets im „Mehr anzeigen\"-Drawer "
            "(z.B. Auto-Preselect, Multi-Bull-Markers, DACH-Bonus, etc.)",
            "  • `internal` — 11 Bullets ganz raus aus der User-Sicht "
            "(Trust-Block-Material, defensive UX-Details, technische "
            "Mechanik) — bleiben in features-data.ts als Anker für QA-"
            "Listen.",
            "**5 Konsolidierungen**: redundante Bullets verschmolzen "
            "(Timer-Modi in Hauptbullet, Sessions + Trainings-Sets, "
            "Import + Export, JSON-Backup inkl. Achievements, "
            "Standard-Cubes + Markieren).",
            "**2 Kategorie-Umzüge**: PLZ+Land von Account zu Speedcubing-"
            "Welt (gehört zur WCA-Turnier-Suche), Feedback-Workflow von "
            "Account zu Community (User↔Admin-Kommunikation).",
            "**Toggle „Mehr anzeigen\"** im Modal — default 1-Bildschirm-"
            "kuratierte Sicht, ein Klick zeigt die Detail-Bullets.",
            "Single-Source: alle 3 Sichten kommen aus einer Liste "
            "(features-data.ts mit `BulletAudience`-Type), gefiltert "
            "per `filterBulletsByAudience()`. Keine doppelten Listen, "
            "kein Drift.",
            "i18n: DE+EN 1384/1384 (vorher 1387, jetzt nach Konsolidierung "
            "+ 2 neue showMore/showFewer-Keys).",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.feature-audit-and-hook",
        released=date(2026, 5, 29),
        title="📋 Feature-Audit: 6 fehlende Bullets nachgezogen + Hook gegen zukünftigen Drift",
        highlights=[
            "Audit der Marketing-Feature-Liste gegen den Code-Stand: 7 "
            "User-facing Features waren in features-data.ts NICHT erwähnt. "
            "6 davon jetzt als Bullets ergänzt (Mehrsprachigkeit DE/EN, "
            "Voice-Alerts in der Inspection, Multi-Cube-Compare, Outlier-"
            "Pflege, Feedback-Workflow mit Antwort-Toaster, Roadmap- + "
            "Patch-Notes-Modale für Transparenz).",
            "**6 neue Bullets** verteilt auf 4 Kategorien:",
            "  • solvingBullet9 — Voice-Alerts statt nur Beep",
            "  • analysisBullet10 — Multi-Cube-Compare",
            "  • analysisBullet11 — Outlier-Pflege",
            "  • worldBullet7 — Mehrsprachigkeit DE/EN",
            "  • accountBullet8 — Direkter Draht zum Admin",
            "  • accountBullet9 — Roadmap- + Patch-Notes-Transparenz",
            "**Pre-Commit-Hook erweitert**: der bestehende post-git-commit.sh "
            "warnt jetzt zusätzlich bei jedem `feat(W.X)`-Commit der weder "
            "features-data.ts noch ein neuer features.*-Locale-Key anfasst — "
            "es sei denn W.X matched ein Backstage-Pattern (qa/fix/hardening/"
            "tsbuild/deps/hotfix/...). Damit kein Marketing-Bullet mehr "
            "wochenlang im Drift hängt.",
            "CLAUDE.md mit der erweiterten Konvention aktualisiert.",
            "i18n DE+EN symmetrisch (1387/1387).",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.login-logo-visible",
        released=date(2026, 5, 29),
        title="🪧 LoginPage: Logo bleibt immer sichtbar",
        highlights=[
            "User-Wunsch: das App-Logo auf der LoginPage soll auch dann "
            "sichtbar bleiben wenn ein Hintergrund-Skin aktiv ist. Sonst "
            "ist unklar auf welcher Seite man landet.",
            "Fix: das LoginPage-Logo bekommt eine zweite Klasse "
            "`cubetracker-logo-always`, die im CSS den `display:none`-"
            "Hide bei `body[data-skin]` ueberschreibt.",
            "Header-Logo im eingeloggten Zustand wird weiterhin "
            "ausgeblendet bei aktivem Skin -- da uebernimmt die TabBar "
            "die Branding-Funktion, und das Logo im Background-Bild "
            "vermeidet Doppelung.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.pre-demo-fixes",
        released=date(2026, 5, 29),
        title="🔧 Drei Demo-Vorbereitungs-Fixes (Smart-Cube + Tester + LoginPage)",
        highlights=[
            "Drei kleine, gezielte Fixes vor der Demo morgen:",
            "**Smart-Cube-Block auch im Fokus-Modus sichtbar**: liegt jetzt "
            "direkt unter dem großen Timer-Display, unabhängig vom Fokus-"
            "Toggle. Wer im Fokus solven will, sieht weiterhin den "
            "Verbindungs-Status + Move-Counter.",
            "**Tester sehen + editieren jetzt Live-Tests**: das Panel zeigte "
            "Testern bisher dauerhaft 'Lade Live-Tests …' weil der React-"
            "Query-Gate auf is_admin gepinnt war. Jetzt fetcht das Panel "
            "für Admin ODER Tester. Backend war schon korrekt "
            "(require_admin_or_tester), nur das Frontend hat blockiert.",
            "**LoginPage-Tiles + Pills klickbar**: ein Klick auf eine "
            "Trust-Pill (🇪🇺 EU-Server, 🚫 Kein Tracking, 🔓 Open Source) "
            "oder ein Feature-Tile (🎯 Timer, 📊 Stats, 🔥 Trainer, 👥 "
            "Community) öffnet jetzt das 'Was kann diese App?'-Modal und "
            "scrollt direkt zur passenden Kategorie. Die Ziel-Karte glüht "
            "kurz lila auf (2.4s) damit klar ist wo der Klick gelandet ist.",
            "Implementierung: FeatureListPanel hat ein neues optionales "
            "`scrollToCategoryTitleKey`-Prop + die FeatureCategory-Interface "
            "hat den titleKey jetzt mit dabei (sprachunabhängige Identifikation).",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.features-data-update",
        released=date(2026, 5, 29),
        title="📋 Feature-Liste: Skin-System + GAN Smart-Cube nachgetragen",
        highlights=[
            "Hygiene-Welle vor der Demo: die Marketing-Feature-Liste "
            "(features-data.ts, sichtbar im 'Was kann diese App?'-Modal) "
            "war für die Skin-Wellen und die Smart-Cube-Integration noch "
            "nicht aktualisiert.",
            "**Neu in Hardware-Inventar**: GAN i4 Smart-Cube koppeln via "
            "Web-Bluetooth (Chrome auf Windows/Mac/Android), Move-Counter "
            "live im Timer-Tab, Auto-Solve-Detection noch in Entwicklung.",
            "**Neu in Account + Sicherheit**: Personalisierung mit 3 "
            "wählbaren Hintergrund-Themen (Cyberpunk Neon, Cyberpunk "
            "Laser, Party Fun) plus Card-Stil-Wahl (deckend vs. Glas / "
            "transparent mit Backdrop-Blur), pro Gerät einstellbar.",
            "Reine Doku-Welle, keine Code-Änderung an Features selbst.",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.skin-card-fix-v2",
        released=date(2026, 5, 28),
        title="🔧 Card-Stil: graue Cards mit Slash-Opacity gefixt",
        highlights=[
            "User-Befund: nach einmal 'Deckend' + zurück zu 'Glas' "
            "blieben einige Cards halbtransparent obwohl 'Deckend' "
            "gewählt war (oder umgekehrt).",
            "**Ursache**: viele User-Settings-Cards (WCA-ID, Passwort "
            "ändern, Email ändern etc.) nutzen das Tailwind-Pattern "
            "`bg-gray-900/50` oder `bg-gray-800/40` — graue Container "
            "mit Slash-Opacity-Suffix. Mein Solid-Mode-Override aus "
            "W.skin-solid-fix hat aber nur die farbigen Akzent-Cards "
            "(bg-emerald-500/5 etc.) erfasst, NICHT die grauen.",
            "**Fix**: Selektor-Liste um die grauen Slash-Tokens erweitert "
            "(bg-gray-{700,800,900}/{30,40,50,60,80}). Jetzt werden ALLE "
            "Card-Container — egal ob farbig oder grau, egal ob mit "
            "/5 oder /50 Opacity — konsistent auf den gewählten Card-"
            "Stil gemappt.",
            "Bundle: minimaler CSS-Wachstum, kein JS-Wachstum.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.login-redesign",
        released=date(2026, 5, 28),
        title="🎨 LoginPage neu: Skin-Slideshow + kompakte Trust + Features",
        highlights=[
            "Vor der Demo am Samstag: die LoginPage hat ein neues, "
            "fokussierteres Layout bekommen.",
            "**Skin-Slideshow im Hintergrund**: rotiert automatisch alle "
            "6 Sekunden durch die 3 Skins (Cyberpunk Neon → Cyberpunk "
            "Laser → Party Fun → repeat). Sichtbar auch bevor man sich "
            "einloggt — neue Besucher sehen das Skin-System direkt in "
            "Aktion. Unabhängig vom User-Setting (das wird erst nach "
            "Login aktiv).",
            "**Layout zentriert**: statt 2-Spalten-Marketing. Logo + "
            "Tagline oben, Login/Register-Card mittig, dann 3 Trust-"
            "Pills (EU-Server / Kein Tracking / Open Source) plus 4 "
            "Feature-Highlights als Icon-Tiles (Timer, Stats, Trainer, "
            "Community).",
            "**Mobile-Optimierung**: kein langes Scrollen mehr durch "
            "Hero + TrustBlock + FeatureListPanel rechts. Alles in "
            "einer Single-Column auf allen Breakpoints.",
            "**Bewusst kein Demo-Account in dieser Welle**: das Demo-"
            "Backend-Feature war ein Stabilitäts-Risiko vor der Demo. "
            "Kommt in einer separaten Welle nach dem Wochenende, mit "
            "sauberer Schritt-für-Schritt-Live-Verifikation.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.smart-cube-position-restore",
        released=date(2026, 5, 28),
        title="📍 Smart-Cube-Block wieder unter Timer-Modus",
        highlights=[
            "User-Wunsch vor der Demo: der Smart-Cube-Connect-Block "
            "lebt wieder dort wo er ursprünglich war — direkt unter "
            "dem „Timer-Modus\"-Block (TimerControlsCard).",
            "Konsequenz: im Fokus-Modus ist er jetzt mit ausgeblendet "
            "— konsistent mit den anderen Sub-Cards (Session, Hardware "
            "etc.). Wer im Fokus-Modus den Smart-Cube nutzen will, "
            "verbindet vorher und schaltet dann in den Fokus.",
            "Hintergrund: war in W.gan-cube-auto-time-v2 nach oben "
            "gezogen damit er im Fokus-Modus sichtbar bleibt. Vor "
            "der Demo lieber an seinem gewohnten Platz unten.",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.skin-solid-fix",
        released=date(2026, 5, 28),
        title="🔧 Card-Stil „Deckend\" wirkt jetzt auch auf Akzent-Cards",
        highlights=[
            "**User-Befund**: „Card-Stil Deckend funktioniert nicht\" — "
            "weil ~90% der Cards in der App das Tailwind-Akzent-Pattern "
            "`bg-<farbe>-500/5` (5% Opacity) nutzen, blieben sie bei "
            "aktivem Skin IMMER halbtransparent. Egal welcher Card-Stil "
            "gewählt war.",
            "**Fix**: alle Akzent-Card-Backgrounds an die Card-Stil-"
            "Logik angebunden. Im Deckend-Mode bekommen sie einen "
            "deckenden dunklen Background (rgba 17,24,39,0.94). Im "
            "Glas-Mode den vollen Glassmorphism-Look (rgba 0.78 + "
            "Blur). Border + Text-Farbe bleiben — der Akzent wird "
            "über die Border kommuniziert.",
            "**Welche Cards betroffen**: alle Container mit "
            "`bg-{red,emerald,purple,amber,yellow,blue,pink,orange,"
            "cyan,indigo}-{500,600}/{5,10,15,20}`. Status-Indicator-"
            "Buttons (z.B. rote Fail-Buttons) bleiben unverändert "
            "(geschützt via :not(button)).",
            "**Bewusst nicht angefasst**: höhere Opacity-Stufen ab "
            "/30 (z.B. `bg-blue-500/30` für Badges) — die sind "
            "absichtlich sichtbar und sollen nicht verflachen.",
            "Bundle: +2 KB CSS gzipped (zusätzliche Selektor-Liste). "
            "Kein JavaScript-Wachstum.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.skin-rename-and-party-fun",
        released=date(2026, 5, 28),
        title="🎨 „Legendary Partymodus\" → „Cyberpunk Laser\" + dritter Skin „Party Fun\"",
        highlights=[
            "**Umbenannt**: „Legendary Partymodus\" heißt ab sofort "
            "„Cyberpunk Laser\" — der Name passt besser zum tatsächlichen "
            "Look (Cube mit Laser-Beams im Cyberpunk-Stil).",
            "**Sanfte Migration**: wer den alten Skin in den "
            "Einstellungen aktiv hatte, behält ihn automatisch — der "
            "Legacy-ID-Mapper im Hook übersetzt `legendary-partymodus` "
            "transparent auf `cyberpunk-laser`. Kein Reset, kein Reload "
            "der Einstellung nötig.",
            "**Dritter Skin live: Party Fun** — bewusst weg vom "
            "Cyberpunk-Look. Helle Paint-Splash-Bonbons, 3D-Cube "
            "mittig, freundliche Farben. Für User die's bunt mögen.",
            "**Neue Auflösungen** im Party-Fun-Pack: zusätzlich "
            "1366×768 (HD-Laptop) und 1080×1920 (Mobile Portrait!). "
            "Das System picked auf dem Phone hochkant jetzt automatisch "
            "die Portrait-Variante statt das beschnittene Landscape-Bild.",
            "**Asset-Pipeline universal**: Convert-Script akzeptiert "
            "jetzt drei Pack-Conventions parallel — mit `_appsafe_`-"
            "Marker (Pack 1+2) und ohne (Pack 3). Weitere Auflösungen "
            "und Suffix-Varianten kommen ohne Code-Änderung durch.",
            "**Gesamt jetzt 3 Skins + Kein-Hintergrund**: Cyberpunk "
            "Neon (Cube unten links), Cyberpunk Laser (Cube mittig-"
            "links mit Lasern), Party Fun (3D-Cube mittig mit "
            "Farb-Splash). Plus den Card-Stil Deckend/Glas als "
            "zweite Achse.",
            "Bundle-Impact: ~880 KB neue WebPs für Party Fun (7 "
            "Auflösungen), on-demand geladen nur wenn aktiv.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.skin-legendary-partymode",
        released=date(2026, 5, 28),
        title="🎉 Zweiter Skin: Legendary Partymodus",
        highlights=[
            "Zweiter Background-Skin live: **„Legendary Partymodus\"** — "
            "Cube mit Laser-Linien, Konfetti-Partikeln, Energy-Lines + "
            "warmen Festival-Akzenten. Lila/Pink/Cyan-Palette mit "
            "ruhiger dunkler Mitte für lesbare Cards.",
            "**Auswählbar im selben Picker** unter Verwaltung → "
            "Einstellungen → 🎨 Aussehen. Wechsel zwischen Cyberpunk "
            "Neon und Legendary Partymodus per Klick.",
            "**Per-Skin Background-Position**: Skin-Designer entscheidet "
            "wo das Bild verankert wird. Cyberpunk Neon = `center "
            "bottom` (Cube + Logo unten), Legendary = `center center` "
            "(Cube mittig-links, Logo unten — Balance für beide).",
            "**Auflösungen**: 1920×1080, 2560×1440, 3440×1440, "
            "3840×1600, 3840×1080 (DualUp). System picked automatisch "
            "die beste für deinen Monitor.",
            "**Asset-Pipeline erweitert**: Convert-Script akzeptiert "
            "jetzt PNG + JPG + JPEG, plus die Suffix-Varianten "
            "`_standard`, `_ultrawide`, `_superwide` aus dem neuen "
            "Pack-Format. Weitere Skin-Pakete können in beiden "
            "Conventions geliefert werden.",
            "**Bildgrößen**: 106-256 KB pro WebP. Total ~900 KB neue "
            "Assets im Bundle (on-demand geladen wenn Skin aktiv).",
            "Tipp: Der „MaxEnergy\"-Variante aus dem Skin-Pack ist "
            "für Splash-Screens / Achievement-Moments gedacht — wird "
            "in einer späteren Welle nachgereicht.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.skin-hide-logo",
        released=date(2026, 5, 28),
        title="🪄 App-Logo verbergen wenn Hintergrund aktiv",
        highlights=[
            "Wenn ein Hintergrund-Skin aktiv ist, wird das App-Logo "
            "(im Header oben links und auf der LoginPage in der "
            "Auth-Card) ausgeblendet. Grund: das Cubetracker-Logo ist "
            "bereits ins Background-Bild integriert (unten links) — "
            "doppeltes Logo wäre visuell unsauber.",
            "**Verhalten**: bei Skin=Kein bleibt das App-Logo wie "
            "bisher sichtbar. Sobald ein anderer Skin gewählt wird, "
            "verschwindet das App-Logo sofort — kein Reload nötig.",
            "**Layout**: der App-Header schaltet bei aktivem Skin auf "
            "`justify-content: flex-end`, damit die rechte Action-Bar "
            "(Sprache + Versions-Badge + UserMenu) rechts bleibt und "
            "nicht in die Lücke wandert.",
            "**Funktionalität**: der Klick zum Dashboard, der vorher "
            "am Logo-Button hing, ist im aktivem-Skin-Zustand kurzzeitig "
            "weg. Der Dashboard-Tab ist über die TabBar weiterhin "
            "erreichbar — kein Verlust.",
            "Implementiert per CSS-Selector `body[data-skin] .cubetracker-"
            "app-logo` mit Marker-Klassen an beiden Logo-Stellen, kein "
            "React-Re-Render bei Skin-Wechsel (smoother Übergang).",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.skin-glassmorphism",
        released=date(2026, 5, 28),
        title="🪟 Card-Stil-Wahl: Deckend vs. Glas / transparent",
        highlights=[
            "Neue zweite Achse im Aussehen-Picker: **Card-Stil** — "
            "unabhängig vom Skin-Hintergrund wählbar.",
            "**Deckend** (Standard) — Cards mit voller Hintergrundfarbe "
            "wie bisher; Skin-Bild scheint nur am Rand zwischen den "
            "Cards durch. Status-quo der MVP-Welle, bleibt dauerhaft "
            "wählbar.",
            "**Glas / transparent** — Cards mit halbtransparenter Fülle "
            "und Backdrop-Blur (10px + saturate 140%). Skin-Bild scheint "
            "durch die Cards durch → „Glassmorphism\"-Effekt.",
            "**Beide Achsen kombinierbar**: Skin=Cyberpunk + Card-Stil="
            "Deckend (= MVP-Look) ODER Skin=Cyberpunk + Card-Stil=Glas "
            "(= Full-Cyberpunk). Wechsel jederzeit per Klick im "
            "Settings-Picker.",
            "**Defensive Implementierung**: zentraler CSS-Override per "
            "`body[data-card-style=\"glass\"]` + Tailwind-Word-Selector "
            "`[class~=\"bg-gray-800\"]`. Default-Verhalten (= „solid\") "
            "bleibt unverändert — User die das Feature nicht nutzen "
            "haben keinerlei Regression.",
            "**Button-/Form-Schutz**: `:not(button):not(input):not("
            "select):not(textarea)` verhindert, dass Klick-Elemente in "
            "Glas-Cards transparent werden. Sie bleiben visuell klar "
            "abgesetzt.",
            "**Hint bei Glas ohne Skin**: wenn man Card-Stil=Glas "
            "wählt aber Skin=Kein-Hintergrund hat, zeigt der Picker "
            "einen Amber-Hinweis dass der Effekt nichts hat zum "
            "Durchscheinen.",
            "Performance: backdrop-filter ist GPU-accelerated, "
            "Bundle-Wachstum nur +1 KB gz Code + 0,6 KB CSS.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.skin-cyberpunk-mvp",
        released=date(2026, 5, 28),
        title="🎨 Skin-System: Cyberpunk-Neon-Hintergrund",
        highlights=[
            "Neues optionales Feature: User können ein Hintergrundbild "
            "für die App wählen. Default bleibt der klassische dunkle "
            "Hintergrund — niemand muss aktiv etwas einstellen.",
            "**Erster Skin: „Cyberpunk Neon\"** — Cube mit Neon-Glow in "
            "Lila/Blau, Cubetracker-Logo unten links, Linien-Reflexionen. "
            "Passt zur Lila-Akzentfarbe der App.",
            "**Resolutions pro Skin**: das System wählt automatisch die "
            "beste Auflösung für deinen Monitor — 1920×1080 (FullHD), "
            "2560×1440 (QHD), 3440×1440 (UWQHD), 3840×1600 (5K), "
            "3840×1080 (DualUp/32:9). Resize-aware, passt sich bei "
            "Fenster-Verschiebung an.",
            "**Einstellung**: Verwaltung → Einstellungen → „🎨 Aussehen / "
            "Hintergrund\". Sofort-Apply, kein Reload. Gespeichert pro "
            "Gerät (localStorage).",
            "**Performance**: WebP-Format, ~70-150 KB pro Auflösung. Bei "
            "„Kein Hintergrund\" wird nichts geladen — kein Overhead für "
            "User die das Feature nicht nutzen.",
            "**Format-Konvention** dokumentiert: zukünftige Skin-Pakete "
            "folgen dem `{skin-id}_wallpaper_appsafe_<width>x<height>.png` "
            "Schema; Konverter-Script `npm run skins:build` produziert "
            "die WebP-Outputs in einem Schritt.",
            "**Hinweis**: Cards bleiben in dieser Welle solid (Hintergrund "
            "nur am Rand sichtbar). Die transparente Glassmorphism-"
            "Variante kommt in einer Folge-Welle, wenn die MVP-Variante "
            "im Live-Test sauber aussieht.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.gan-cube-auto-time-v4",
        released=date(2026, 5, 28),
        title="🔍 Smart-Cube v4: Detaillierter FACELETS-Log für Diagnose",
        highlights=[
            "User-Bericht: Auto-Solved-Detection greift trotz v3 nicht "
            "(Move-Counter zaehlt, REQUEST_FACELETS-Polling laeuft, "
            "aber nowSolved bleibt false). User musste manuell „Solve "
            "fertig\" klicken.",
            "**Diagnose-Verbesserung**: jeder FACELETS-Log zeigt jetzt:",
            "  • `len=` Anzahl Zeichen (sollte 54 sein)",
            "  • `solved=` Boolean-Ergebnis von isCubeSolved()",
            "  • Pro Face: `U=W(✓)` = U-Face Mitte ist 'W' und alle 9 "
            "Stickers gleich (oder ✗ falls nicht)",
            "  • `raw=` der komplette Facelets-String",
            "Format-Beispiel: `[SmartCube] FACELETS len=54 solved=true "
            "[U=W(✓) R=R(✓) F=G(✓) D=Y(✓) L=O(✓) B=B(✓)] raw=...`",
            "Damit sehen wir bei deinem naechsten Test sofort: ist die "
            "Laenge wirklich 54? Stimmt das Pattern? Welche Face "
            "scheitert? Plus das raw-Format zur Library-Verifikation.",
            "Nach v4-Test mit Console-Log-Output kann ich isCubeSolved() "
            "praezise anpassen (anderes Format, andere Laenge, oder "
            "Bug in der Pattern-Detection).",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.gan-cube-auto-time-v3",
        released=date(2026, 5, 28),
        title="🎯 Smart-Cube v3: Library aktiv nach Facelets pollen",
        highlights=[
            "User-Test-Befund: Move-Counter zählt im solving-State "
            "korrekt, aber Auto-Solved-Detection greift nicht — "
            "Solve wird nicht automatisch ausgelöst.",
            "**Diagnose**: Aus den `gan-web-bluetooth`-TypeScript-"
            "Definitionen klar geworden: die Library schickt FACELETS-"
            "Events NICHT automatisch nach jedem Move. Sie müssen via "
            "`sendCubeCommand({ type: 'REQUEST_FACELETS' })` explizit "
            "angefragt werden. Mein vorheriger Code hat ausschließlich "
            "auf die initiale FACELETS-Nachricht nach Connect gehört "
            "— deshalb blieb die Solved-Detection still.",
            "**Fix**: nach jedem MOVE-Event im ready/solving/idle/"
            "solved-State wird `conn.sendCubeCommand({ type: 'REQUEST_"
            "FACELETS' })` aufgerufen. Die Library antwortet kurz "
            "danach mit einem FACELETS-Event → isCubeSolved() prüft "
            "den State → solve-Detection läuft.",
            "**Plus**: initial nach Connect werden REQUEST_FACELETS + "
            "REQUEST_BATTERY + REQUEST_HARDWARE geschickt, damit die "
            "App direkt den vollen Cube-Zustand kennt (Akku-Anzeige "
            "ist sonst leer + Cube-Hardware-Name wird nicht "
            "übernommen).",
            "**Facelets-Format bestätigt** aus den Library-Types: "
            "Standard Kociemba-Notation `UUUUUUUUURRRRRRRRR...` mit "
            "54 Zeichen — genau wie isCubeSolved() es erwartet. Auto-"
            "Detection sollte jetzt also greifen.",
            "Type-Erweiterung `GanCubeConnection.sendCubeCommand?` mit "
            "den 4 Command-Types (REQUEST_FACELETS / HARDWARE / "
            "BATTERY / RESET).",
        ],
        internal=False,
    ),
    PatchNote(
        version="2.0.0-alpha.W.gan-cube-auto-time-v2",
        released=date(2026, 5, 28),
        title="🎯 Smart-Cube v2: Ready-State + Manual-Stop + Fokus-Sichtbarkeit",
        highlights=[
            "Drei User-Test-Befunde behoben:",
            "**Issue 1 (Fokus-Sichtbarkeit):** SmartCubeConnect lebte "
            "in TimerControlsCard — wird im Fokus-Modus versteckt → "
            "kein Connect-Button + kein Status mehr sichtbar. Fix: "
            "SmartCubeConnect aus TimerControlsCard raus, lebt jetzt "
            "direkt in TimerTab oben, immer sichtbar (Fokus + Voll).",
            "**Issue 2 (Auto-Solved nicht erkannt):** State-Wechsel "
            "solving → solved geschieht jetzt sowohl automatisch (wenn "
            "FACELETS-Event mit solved-Pattern kommt) ALS AUCH manuell "
            "(neuer „✓ Solve fertig\"-Button im solving-State). Plus "
            "Console-Log [SmartCube] FACELETS: ... bei jedem Facelets-"
            "Update — Diagnose welches Format die Library wirklich "
            "schickt.",
            "**Issue 3 (fundamentaler Workflow-Bug):** Aktuell hat "
            "JEDER Move den Solve gestartet — auch der erste Scramble-"
            "Move! Behoben: neuer „ready\"-State zwischen idle und "
            "solving. Workflow jetzt:",
            "  1. Cube verbunden → State `idle` (User scrambelt frei)",
            "  2. Scramble fertig → User klickt „🟢 Bereit für Solve\" "
            "→ State `ready` (blauer Pulse-Dot)",
            "  3. Erster Move → State `solving` (Timer startet via "
            "performance.now()) — amber Pulse-Dot + Live-Move-Counter",
            "  4. Cube solved erkannt ODER User klickt „✓ Solve fertig\" "
            "→ State `solved` → Auto-Save (Custom-Event)",
            "  5. Nach 3 Sek zurueck zu `idle`, naechster Scramble.",
            "5 neue i18n-Keys DE/EN (readyButton/Title/Label + stopButton/"
            "Title) symmetrisch (1355/1355).",
            "Bonus: Wenn die Auto-Solved-Detection generell nicht "
            "klappt (z.B. weil die Library Facelets nicht zuverlaessig "
            "sendet), kannst du den „Solve fertig\"-Button als "
            "verlaesslichen Fallback nutzen.",
        ],
        internal=False,
    ),
    PatchNote(
        version="2.0.0-alpha.W.gan-cube-auto-time",
        released=date(2026, 5, 28),
        title="🎯 Smart-Cube Auto-Time: dreh den Cube, Time landet ohne Tippen",
        highlights=[
            "Sub-Welle 3 der Smart-Cube-Integration: der „Wow\"-Moment. "
            "Cube ist verbunden, du faengst an zu drehen — der Timer "
            "startet automatisch. Cube ist geloest — Timer stoppt + "
            "Solve wird DIREKT gespeichert. Kein Tippen, kein Spacebar.",
            "**State-Machine** in useSmartCube:",
            "  • `idle` — Cube ist verbunden, kein Solve aktiv "
            "(gruener Pulse-Dot)",
            "  • `solving` — Erster Move erkannt → Timer laeuft "
            "(gelb-amber Pulse-Dot + Live-Move-Counter)",
            "  • `solved` — Cube-Facelets = solved State erkannt → "
            "Timer stoppt + Solve gespeichert (gold-yellow, fertige "
            "Zeit + Move-Anzahl). Nach 3 Sek zurueck zu `idle`.",
            "**Solved-Detection** via Facelets-Vergleich (lib/cube-"
            "solved.ts): ein 3x3-Cube ist solved wenn alle 9 Stickers "
            "pro Face dieselbe Farbe haben. Pattern-basiert, kein "
            "fixer String-Vergleich — robust gegen Cube-Orientation.",
            "**Auto-Save** via Custom-Event `cubetracker:smart-cube-"
            "solve` mit { time_ms, moves }. BigTimerInput hat einen "
            "Listener, ruft useCreateSolve.mutate() direkt — wie der "
            "Spacebar-Mode, nur ohne menschliche Spacebar-Aktion.",
            "**Timing-Praezision**: performance.now() statt Date.now() "
            "(monoton, nicht von System-Clock beeinflusst). Auf den "
            "Millisekunden genau.",
            "**Demo-Tipp**: am besten im Fokus-Modus testen — dann ist "
            "der Timer-Display der einzige Inhalt, und du siehst die "
            "Time gleich riesig.",
            "5 neue i18n-Keys DE/EN (1350/1350 symmetrisch).",
        ],
        internal=False,
    ),
    PatchNote(
        version="2.0.0-alpha.W.gan-cube-mac-fallback",
        released=date(2026, 5, 28),
        title="🧊 GAN-Cube Windows-Pairing-Fix (MAC manuell + Cache)",
        highlights=[
            "User-Bug: nach Pairing-Dialog kommt „Unable to determine "
            "cube MAC address, connection not possible\". Klassisches "
            "Problem: GAN-Cubes verschluesseln Daten mit AES, dessen "
            "Schluessel auf der MAC-Adresse basiert. Auf Windows-Chrome "
            "ist die Web-Bluetooth-Advertisement-API standardmaessig "
            "DEAKTIVIERT — die Library kann die MAC nicht autom. "
            "ermitteln.",
            "**Fix**: customMacAddressProvider-Callback in connectGanCube"
            "() implementiert. Wenn die Library mit "
            "`isFallbackCall=true` zurueckkommt: User wird per "
            "window.prompt() nach der MAC gefragt. Eingegebene MAC "
            "wird in localStorage pro `device.id` gecacht — beim "
            "zweiten Pairing kein Prompt mehr.",
            "**Prompt-Text** erklaert dem User wie er die MAC findet:"
            " `chrome://bluetooth-internals/#devices` → Cube-Name → "
            "Address-Spalte kopieren.",
            "**Dauerhafte Loesung** (im Hilfe-Hinweis dokumentiert): "
            "chrome://flags#enable-experimental-web-platform-features "
            "aktivieren + Browser-Restart → Auto-Detection klappt.",
            "Plus: SmartCubeConnect zeigt jetzt einen aufklappbaren "
            "Hilfe-Hinweis („Hilfe: Windows-Chrome-Hinweis\") unter "
            "dem Connect-Button mit beiden Loesungswegen.",
            "Plus: MAC-Eingabe wird validiert (Format AB:12:34:5D:34:12) "
            "— ungueltige Eingaben gehen wieder zurueck zu disconnected "
            "mit Console-Log, statt mit kryptischem Backend-Fehler.",
            "4 neue i18n-Keys DE/EN (windowsHintSummary, windowsHintBody).",
        ],
        internal=False,
    ),
    PatchNote(
        version="2.0.0-alpha.W.feedback-admin-tester-improvements",
        released=date(2026, 5, 28),
        title="📝 Feedback-Inbox aufgeräumt + „+ Feedback\"-Buttons für Admin und Tester",
        highlights=[
            "Drei User-Wünsche zur internen Feedback-Inbox:",
            "**Archivierte Feedbacks standardmäßig versteckt** "
            "(AdminFeedbackInboxPanel). „Status: Alle\" zeigt jetzt "
            "alles AUSSER archived. Wer alte archivierte Items sehen "
            "will: Filter auf „Status: Archiviert\" setzen. So bleibt "
            "die Inbox langfristig aufgeräumt.",
            "**Neuer „+ Neues Feedback\"-Button im Admin-Feedback-"
            "Inbox** neben den Stats-Badges (offene Bugs/Wünsche/...). "
            "Ein Klick öffnet das FeedbackModal — Admin kann direkt "
            "selbst einen Wunsch oder Bug eintragen ohne den Umweg "
            "über das UserMenu.",
            "**„+ Feedback geben\"-Button für Tester** prominent oben "
            "im Tester-Tab (über Live-Tests). Beim Testen findet der "
            "Tester einen Bug oder hat einen Wunsch — ein Klick und "
            "er ist im FeedbackModal. Mit Begleittext „Beim Testen "
            "Bug oder Wunsch gefunden?\".",
            "Beide Buttons triggern das globale FeedbackModal via "
            "Custom-Event `cubetracker:open-feedback-modal` — analog "
            "zum bestehenden Pattern für UserMenu → Verwaltung-Sektion. "
            "Listener in App.tsx setzt setShowFeedback(true).",
            "**Wichtig**: nur INTERNE Feedbacks (Per-App-Modus), kein "
            "GitHub-Modus — das ist die DB-Inbox, nicht der Issue-"
            "Tracker.",
            "5 neue i18n-Keys DE/EN unter testerPanel + adminFeedback.",
        ],
        internal=False,
    ),
    PatchNote(
        version="2.0.0-alpha.W.gan-cube-connect-fix",
        released=date(2026, 5, 28),
        title="🧊 Smart-Cube-Pairing-Dialog erscheint endlich (Chrome User-Gesture-Fix)",
        highlights=[
            "User-Bug: „Cube verbinden\"-Klick wird erkannt, aber der "
            "Browser-Pairing-Dialog kommt nicht. Diagnose: Chrome (und "
            "alle Web-Bluetooth-Browser) verlangen dass navigator."
            "bluetooth.requestDevice() **direkt aus dem User-Gesture-"
            "Click-Handler** aufgerufen wird — JEDE Promise-Microtask-"
            "Boundary (await) zwischen Click und requestDevice fuehrt "
            "dazu dass die User-Gesture verloren geht. Dialog wird "
            "still verschluckt, kein Error.",
            "**Ursache**: `await import(\"gan-web-bluetooth\")` in "
            "useSmartCube.connect() war eine solche Boundary — die "
            "Library wurde dynamisch geladen, danach kam der "
            "requestDevice-Call zu spaet.",
            "**Fix**: static import von gan-web-bluetooth statt "
            "dynamic. Library landet jetzt im Main-Bundle (525 KB gz "
            "statt 499 KB + 26 KB async-Chunk) — Trade-off Bundle-Size "
            "fuer Funktionalitaet. requestDevice wird jetzt synchron "
            "im selben User-Gesture-Stack aufgerufen.",
            "Plus: NotAllowedError + AbortError werden jetzt auch als "
            "User-Cancel behandelt (vorher rote Fehlerbox bei diesen "
            "DOMException-Codes).",
            "Plus: console.log + console.error in connect() fuer "
            "Debug-Sichtbarkeit in der Browser-Console (`[SmartCube] "
            "connect() start...`).",
        ],
        internal=False,
    ),
    PatchNote(
        version="2.0.0-alpha.W.timer-polish-pbs-qa",
        released=date(2026, 5, 28),
        title="QA-Hotfix nach Timer-Polish + Snapshot-Limit (1 KRITISCH + 3 SOLLTE)",
        highlights=[
            "QA-Sub-Agent-Review der Wellen W.timer-polish-pbs und "
            "W.admin-snapshot-limit: 1 KRITISCH + 3 SOLLTE + 3 NICE + "
            "3 POSITIV. Verdikt: NICHT safe to deploy as-is. Alle 4 "
            "Findings sofort gefixt.",
            "**KRITISCH** (Admin-Stats 500-Crash): `int(os.environ.get("
            "'CUBETRACKER_SNAPSHOT_STORAGE_LIMIT_MB', '1024'))` ohne "
            "try/except. Jede falsch gesetzte ENV (Tippfehler, leerer "
            "String, '1024MB' mit Suffix) waere als ValueError aus dem "
            "/admin/stats-Endpoint mit 500 rausgeflogen — ganze Admin-"
            "Stats-Seite tot. Fix: import os an Modul-Kopf + try/except "
            "ValueError mit Logger-Warning + Fallback 1024 MB.",
            "**SOLLTE** (PB-Row Schrift zu dunkel): Ternary im <tr> ließ "
            "`text-gray-100` weg wenn isBest=true (nur `bg-yellow-500/5` "
            "gesetzt). Frisch eingetragener neuer PB erschien mit "
            "text-gray-400 (= Fallback fuer alte Rows) statt heller. "
            "Fix: `bg-yellow-500/5 text-gray-100` zusammen im isBest-"
            "Branch.",
            "**SOLLTE** (Scrollbar-Doppelregel): seit der globalen "
            "Scrollbar-Regel in index.css waren die alten inline-"
            "Tailwind-Klassen in LastSolvesPreview (`[&::-webkit-"
            "scrollbar]:w-2` etc.) redundant + inkonsistent (8px Inline "
            "vs 10px Global). Inline-Styling entfernt — globale Regel "
            "uebernimmt.",
            "**SOLLTE** (PB-Gold-Logik dokumentiert): `current_ao5 <= "
            "best_ao5` triggert gold auch bei Gleichheit. Bewusst — "
            "User sieht „auf PB-Niveau\"-Anzeige sobald er sich erneut "
            "auf seinem Best bewegt. Kommentar im Code, was die "
            "Semantik ist.",
            "POSITIV-Findings vom QA: try/catch um localStorage-Calls, "
            "max(limit, 1)-Division-by-Zero-Guard, vollstaendige "
            "ARIA-Attribute auf Progress-Bar.",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.admin-snapshot-limit",
        released=date(2026, 5, 28),
        title="Admin → Snapshot-Storage zeigt X / Limit + Progress-Bar",
        highlights=[
            "User-Wunsch: Snapshot-Storage-Anzeige im Admin-Stats-Panel "
            "soll „verbraucht / Limit\" sein, nicht nur „verbraucht\".",
            "Backend (api/admin.py:get_admin_stats): neue Felder im "
            "storage-Block: snapshots_limit_mb + snapshots_used_pct. "
            "Default-Limit 1024 MB, ueber ENV CUBETRACKER_SNAPSHOT_"
            "STORAGE_LIMIT_MB ueberschreibbar. Kein technisches Limit "
            "erzwungen — nur fuer das Dashboard.",
            "Frontend (AdminStatsPanel): Tile zeigt jetzt „3.42 MB / "
            "1024.00 MB\" + Sub-Label „X.Y % belegt\". Plus Progress-Bar "
            "darunter mit Schwellenwert-Farben: <60% emerald, 60-85% "
            "amber, >85% rot. ARIA-Label mit Prozent.",
        ],
        internal=False,
    ),
    PatchNote(
        version="2.0.0-alpha.W.timer-polish-pbs",
        released=date(2026, 5, 28),
        title="🎯 Timer-Tab Polish: PBs überall + globale Scrollbar + ao100",
        highlights=[
            "Fünf User-Wünsche in einer Welle:",
            "**A−/A+ jetzt auch in der vollen Ansicht** sichtbar "
            "(vorher nur im Fokus-Modus). Conditional aufgehoben — der "
            "Größenregler hängt jetzt immer rechts über dem Timer-Tab.",
            "**Globale Cubetracker-Scrollbar:** alle Scrollbars in der "
            "App jetzt farb-passend (Purple-Thumb auf Dark-Gray-Track, "
            "rgba 168/85/247/0.55). Funktioniert in Firefox + Chromium "
            "121+ via `scrollbar-color`, in Safari/Webkit via `::-webkit-"
            "scrollbar`. Implementiert in index.css für alle scrollbaren "
            "Elemente — Modals, Tabellen, alles.",
            "**PB-Markers in „Letzte Solves\"** (Timer-Tab) analog zur "
            "Solve-Liste im Analyse-Tab: Gold-★ für aktuellen Single-"
            "PB, schwaches ☆ für alte Singles, Cyan-● für AO5-PBs, "
            "Emerald-● für AO12-PBs. Mit Tooltip „Aktueller / War mal "
            "Bestwert\".",
            "**PB-Werte neben current ao5/ao12/ao100** in der Live-"
            "Karte: in kleinerer Schrift unter dem aktuellen Wert "
            "steht jetzt „PB 10.45\" — gold gefärbt wenn current = PB "
            "(= neuer Bestwert).",
            "**AO100 als Toggle-Spalte** in der Letzte-Solves-Tabelle: "
            "neue Checkbox „AO100 zeigen\" neben dem Anzahl-Selector. "
            "Default OFF (schmale Sidebar bleibt aufgeräumt), an wenn "
            "der User es will — persistent via localStorage.",
            "8 neue i18n-Keys DE/EN symmetrisch (1340/1340).",
        ],
        internal=False,
    ),
    PatchNote(
        version="2.0.0-alpha.W.gan-cube-mvp-tsbuild",
        released=date(2026, 5, 28),
        title="Build-Hotfix #2: TypeScript-Type für navigator.bluetooth",
        highlights=[
            "ROOT CAUSE des „Smart-Cube-Block nicht sichtbar\"-Problems "
            "endlich gefunden: seit dem ersten W.gan-cube-mvp-Push "
            "(937daa7, vor 2h) failt der TypeScript-Compile im Coolify-"
            "Build silent. Symptom:",
            "  src/hooks/useSmartCube.ts(77,22): "
            "  error TS2339: Property 'bluetooth' does not exist on "
            "  type 'Navigator'.",
            "GitHub-Action triggert Coolify, Coolify nimmt API-Call an "
            "(= 200 OK = „success\" in der Action), aber der eigentliche "
            "Vite-Build crashed auf tsc. Container bleibt beim alten "
            "Image. Bundle-Hash MBTGTWHx ist seit 2h identisch — alle "
            "drei Wellen (W.gan-cube-mvp, -deps, -qa) sind in den letzten "
            "2h gar nicht live gewesen.",
            "Fix: @types/web-bluetooth ^0.0.21 als devDependency + "
            "tsconfig.app.json `types` auf `[vite/client, web-bluetooth]` "
            "erweitert (war vorher nur vite/client — exclusive Liste).",
            "**Wichtige Lesson:** GitHub-Action „success\" beweist nur "
            "dass Coolify den API-Call angenommen hat, NICHT dass der "
            "Build wirklich durchgekommen ist. Bei npm-Dep-Wellen MUSS "
            "lokal `npm run build` pro-aktiv laufen — sonst dreht man "
            "Runden wie die letzten 2 Stunden.",
            "Build-Result lokal verifiziert: main bundle 498 KB gz, "
            "Async-Chunk fuer gan-web-bluetooth + rxjs 26 KB gz, alle "
            "QA-Hotfixes drin (DISCONNECT-Handler, User-Cancel, Race-"
            "Guard).",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.gan-cube-mvp-qa",
        released=date(2026, 5, 28),
        title="QA-Hotfix nach W.gan-cube-mvp (2 KRITISCH + 3 SOLLTE + 2 NICE)",
        highlights=[
            "QA-Sub-Agent-Review der Smart-Cube-Welle: 2 KRITISCH + 3 "
            "SOLLTE + 2 NICE + 4 POSITIV. Verdikt: NICHT safe to "
            "deploy as-is. Alle 7 Findings sofort gefixt.",
            "**KRITISCH 1** (DISCONNECT-Event): useSmartCube-Hook hatte "
            "keinen Handler fuer das DISCONNECT-Event der Library. Wenn "
            "der Cube ausser Reichweite ging oder Akku leer war, blieb "
            "der gruene Pulse-Dot dauerhaft + alle weiteren Move-Events "
            "kamen nie an. Fix: case in events$-Handler ergaenzt, "
            "setState zurueck zu disconnected+error.",
            "**KRITISCH 2** (rxjs doppelt installiert): rxjs war als "
            "top-level dependency in package.json, obwohl gan-web-"
            "bluetooth rxjs bereits als eigene Dep mitbringt. Top-"
            "level-Eintrag entfernt, Lock-File regeneriert. rxjs lebt "
            "jetzt nur als transitive Dep der Library.",
            "**SOLLTE** (User-Cancel als Fehler): Browser-Pairing-"
            "Dialog mit X schliessen wirft DOMException NotFoundError. "
            "Vorher: rote Fehlerbox mit Browser-internem Text. Jetzt: "
            "wird erkannt + still zurueck zum disconnected-State, "
            "keine Fehlermeldung.",
            "**SOLLTE** (Race-Condition double-connect): wenn der User "
            "schnell zweimal Connect klickt, lief connectGanCube() "
            "parallel. Fix: Guard am Anfang von connect() — wenn "
            "status connecting/connected → no-op.",
            "**SOLLTE** (permissions-matrix.md): neuer Bluetooth-"
            "Abschnitt in Section 8 (Anti-Tracking-Audit), der "
            "dokumentiert: Library macht keinen Server-Call, Cube-"
            "Daten leben nur im Browser-Tab, kein Drittanbieter-"
            "Endpoint, MIT-lizenziert + tree-shaking-auditiert.",
            "**NICE** (aria-live=off auf lastMove): Speedcuber haben "
            "50+ Moves pro Solve — Screen-Reader wuerde sonst jede "
            "Drehung ansagen. aria-live=off explizit.",
            "**NICE** (void disconnect im cleanup): Promise.catch um "
            "unbehandelte BLE-Disconnect-Rejections beim Unmount.",
            "POSITIV-Findings vom QA: Dynamic-Import korrekt als "
            "eigener Async-Chunk (26kb gz), Wrapper-Pattern in "
            "TimerControlsCard verhindert Card-Re-Render bei Move-"
            "Events, BigTimerInput-Grenze (kein Auto-Time-Code) "
            "sauber eingehalten, Lock-File-Hotfix richtig als "
            "separater Commit gefuehrt.",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.gan-cube-mvp-deps",
        released=date(2026, 5, 28),
        title="Build-Hotfix nach W.gan-cube-mvp (Lock-File + Versionen)",
        highlights=[
            "Live-Verify nach W.gan-cube-mvp-Push hat aufgedeckt: "
            "Backend-Version zeigte zwar W.gan-cube-mvp, aber der "
            "Frontend-Bundle enthielt 0 Referenzen zu SmartCube/"
            "useSmartCube/gan-web-bluetooth.",
            "Diagnose: package.json hatte gan-web-bluetooth@^1.8.0 "
            "angegeben — diese Version existiert in der Registry nicht "
            "(echte Major-Versionen sind 1.0.x / 2.x / 3.x, aktuell "
            "3.0.2). Zusaetzlich wurde package-lock.json nicht mit-"
            "geaendert, also `npm ci` im Coolify-Build hat das Package "
            "gar nicht installiert. Vite konnte den Import nicht "
            "aufloesen → SmartCubeConnect wegoptimiert.",
            "Fix: gan-web-bluetooth auf ^3.0.2, rxjs ^7.8.2 als "
            "Top-Level-Dep (war nur peerDependency, npm installiert "
            "peer-deps nicht auto), package-lock.json regeneriert.",
            "API ist zwischen v1 und v3 nicht geaendert — Hook + "
            "Komponente bleiben unangetastet, kein User-sichtbarer "
            "Change zur W.gan-cube-mvp-Welle.",
            "Lesson: Live-Verify nach Welle mit npm-Dep MUSS pruefen "
            "ob ein erwarteter String aus dem neuen Code im Bundle "
            "ankommt — Version-Badge allein ist kein Beweis dass "
            "Frontend-Code wirklich deployt ist.",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.gan-cube-mvp",
        released=date(2026, 5, 28),
        title="🧊 Smart-Cube-Pairing (GAN i4 / 12/14 / MoYu AI 2023)",
        highlights=[
            "Erste Welle der Smart-Cube-Integration. MVP: Connect + "
            "Pairing + Move-Indicator. Auto-Time-Insertion (Timer "
            "startet/stoppt mit dem Cube) kommt in einer Folge-Welle.",
            "**Library:** `gan-web-bluetooth` (npm, ~30kb gz) — "
            "dynamic-importiert, also kein Bundle-Impact fuer User "
            "die nie Smart-Cube nutzen.",
            "**Unterstuetzte Cubes:** GAN i4, GAN Mini ui FreePlay, "
            "GAN 12/14 ui, GAN356i / Carry / 3, Monster Go 3Ai, MoYu "
            "AI 2023 (nutzt GAN-Gen2-Protokoll).",
            "**Browser-Constraint:** Chrome / Edge / Brave / Opera "
            "(Desktop + Android). Safari (iOS/macOS) + Firefox haben "
            "kein Web-Bluetooth — der Block zeigt dort eine amber "
            "Hinweis-Box mit Empfehlung.",
            "**Wo:** neuer Block unter den Mode-Tipps in der "
            "TimerControlsCard (Timer-Tab). Connect-Button gross + "
            "purple, im verbundenen Zustand: gruener Pulse-Dot + "
            "Cube-Name + Battery + letzter Move + Move-Counter.",
            "**Privacy:** Bluetooth-Pairing ist Browser-nativ, kein "
            "Drittanbieter-Code, keine Cloud-Telemetrie. Cube-Daten "
            "bleiben lokal im Browser — Backend bekommt nur die "
            "Solve-Time wie bei manueller Eingabe.",
            "14 neue i18n-Keys unter smartCube-Namespace DE/EN.",
        ],
        internal=False,
    ),
    PatchNote(
        version="2.0.0-alpha.W.timer-display-size-v2",
        released=date(2026, 5, 28),
        title="Größenregler-Polish + „Alle Solves\"-Bug gefixt",
        highlights=[
            "User-Feedback nach W.timer-display-size: (1) noch groesser, "
            "(2) Anzeige zur Vergroesserung besser aussehen, (3) „Alle "
            "Solves\" zeigt aktuell GAR KEINE Solves.",
            "**Schrift-Stufen erweitert** (settings.ts): 5 → 7 Stufen. "
            "Neu: `xxxl` (11rem) und `xxxxl` (15rem). FONT_SIZE_LABELS "
            "auf neutrale S/M/L/XL/XXL/3XL/4XL umgestellt (vorher "
            "DE-Strings „Klein/Mittel/...\", die mit den neuen Stufen "
            "inkonsistent geworden waeren). SettingsPanel listet jetzt "
            "alle 7 Stufen, A−/A+ im Fokus rotiert durch alle 7.",
            "**A−/A+ Buttons redesigned**: vorher pixelige 2-Spalten-"
            "Icons, jetzt eigene Karte mit purple-Border, 40×40-Buttons "
            "mit aktiv-scale + hover-Color, in der Mitte ein Pill mit "
            "der aktuellen Stufe (purple-Akzent) — passt zum Theme + "
            "klarere Ziel-Affordance auf Touch-Geraeten.",
            "**„Alle Solves\"-Bug gefixt** (LastSolvesPreview): vorher "
            "wurde effectiveTableSize=100_000 gesetzt, fetchLimit = "
            "100_000+99 = 100_099 — Backend cap `le=100_000` lieferte "
            "422 Validation Error → keine Solves in der Tabelle. "
            "Effektiv-Limit auf 50_000 gecappt (50_099 + AO_LOOKBACK "
            "= 50_099 < 100_000). Realistisches Maximum.",
            "**„Letzte Solves\" — Sicht max 20 Zeilen** (vorher 100): "
            "User-Wunsch. Bei tableSize > 20 wird die Tabelle auf "
            "max-h-[760px] (= ~20 Zeilen + sticky-Header) begrenzt + "
            "scrollt intern. Plus farb-passender Scrollbar (Purple-"
            "Thumb auf Dark-Gray-Track, Firefox + Chrome 121+ via "
            "scrollbar-color, Safari/Webkit via Tailwind arbitrary "
            "variants).",
        ],
        internal=False,
    ),
    PatchNote(
        version="2.0.0-alpha.W.timer-display-size",
        released=date(2026, 5, 28),
        title="🅰 Zeit-Display skalieren im Fokus-Modus + neues App-Logo",
        highlights=[
            "Im Fokus-Modus (Timer-Tab) gibt es jetzt zwei A−/A+-"
            "Buttons direkt neben dem „🎯 Fokus aktivieren\"-Toggle, "
            "die die Schriftgroesse der Zeitanzeige rotieren. 5 "
            "Stufen (sm → md → lg → xl → xxl, Default xxl).",
            "Die Settings sind dieselben wie in Verwaltung → "
            "Einstellungen → „Schriftgroesse der Zeitanzeige\" — die "
            "+/-Buttons im Fokus-Modus sind nur der direkte Zugriff "
            "fuer waehrend einer Solving-Session. Persistiert auch "
            "ueber den Fokus-Modus hinaus.",
            "Neues App-Logo: das alte Logo wurde durch eine neue "
            "Version ersetzt (main_logo.png 1.4 MB → "
            "public/cubetracker-logo.png). Wird in Login-Page-Card "
            "sowie im App-Header (rechts vom UserMenu) automatisch "
            "uebernommen — keine weiteren Code-Aenderungen noetig.",
            "5 neue i18n-Keys (fontSizeLabel + ShrinkTitle/GrowTitle/"
            "ShrinkAria/GrowAria) DE/EN symmetrisch.",
        ],
        internal=False,
    ),
    PatchNote(
        version="2.0.0-alpha.W.login-trust-block",
        released=date(2026, 5, 28),
        title="🛡 „Was wir mit deinen Daten machen\" auf der LoginPage",
        highlights=[
            "User-Wunsch: ein Block auf der LoginPage, der Misstrauen "
            "abbaut bevor sich jemand registriert. Tonalitaet: "
            "sachlich-praezise, kein Werbe-Sprech — Zielgruppe sind "
            "speedcubende Power-User, die explizit fragen werden „was "
            "passiert mit meinen Daten\".",
            "Neue Komponente TrustBlock im aside der LoginPage zwischen "
            "Hero-Card und FeaturesListPanel. 5 Karten in priorisierter "
            "Conversion-Reihenfolge:",
            "**🇪🇺 Deine Daten bleiben in Europa** — Hetzner Falkenstein, "
            "Let's-Encrypt-TLS, taegliche Backups.",
            "**🚫 Kein Tracking. Punkt.** — kein GA / Mixpanel / Werbe-"
            "Cookie. Genau 1 funktionales Login-Cookie (HttpOnly + "
            "Secure). Quellcode offen auf GitHub.",
            "**👤 Du waehlst, wie du heisst** — Display-Name frei, "
            "Pseudonym OK, E-Mail nur fuer Login + Reset, WCA-ID "
            "optional (Stats kommen live von der WCA-API, wir "
            "speichern nur die ID).",
            "**👥 Andere User sehen nur, was du teilst** — anonyme "
            "Besucher null. Andere User null solange ihr nicht "
            "befreundet seid. Freunde sehen display_name + "
            "oeffentliche PRs + Hardware. E-Mail erst bei "
            "beidseitig-accepted Friendship.",
            "**🛡 Was Admin sieht — und was nicht** — sichtbar: "
            "E-Mail + display_name + grobe Stats fuer Support. NICHT "
            "sichtbar (mit ⓘ-Popover ausfuehrlich): Plaintext-"
            "Passwoerter (nur bcrypt-Hash), Backups anderer User, "
            "WCA-Profil-Live-Daten, Drittanbieter-IDs.",
            "Footer mit Links zur Datenschutzerklaerung + GitHub-Repo "
            "fuer User die die Behauptungen pruefen wollen.",
            "Faktenbasis: docs/permissions-matrix.md (in selber "
            "Session vom Sub-Agent erstellt). Bei jeder neuen "
            "Privacy-/Tracking-Aenderung muss Matrix re-validiert + "
            "TrustBlock-Texte ggf. angepasst werden — sonst leakt "
            "eine veraltete Marketing-Aussage.",
            "27 neue i18n-Keys DE/EN symmetrisch unter neuem "
            "trustBlock-Namespace.",
        ],
        internal=False,
    ),
    PatchNote(
        version="2.0.0-alpha.W.tester-readonly-roadmap-qa",
        released=date(2026, 5, 28),
        title="QA-Hotfix nach Tester-Readonly-Roadmap (2 Findings)",
        highlights=[
            "QA-Sub-Agent-Review der W.tester-readonly-roadmap-Welle: "
            "0 KRITISCH, 2 SOLLTE, 2 NICE, 4 POSITIV. Verdikt: „safe "
            "to deploy as-is\". Vorgezogene Fixes:",
            "**SOLLTE** (Docstring): require_admin_or_tester in api/"
            "admin.py:106 erwaehnte noch „Live-Tests + Roadmap-Pflege\" "
            "als Tester-Berechtigung — irrefuehrend nach dem Refactor. "
            "Aktualisiert: Tester schreibt NUR Live-Tests, sieht "
            "Roadmap nur lesend. Verhindert dass der naechste "
            "Entwickler aus Versehen require_admin_or_tester an einen "
            "CRUD-Endpoint setzt.",
            "**NICE** (a11y / Touch): das amber „🔍 Nur Ansicht\"-"
            "Badge im AdminRoadmapPanel hatte nur title= als Tooltip — "
            "auf Touch-Geraeten + Screen-Readern stumm. Jetzt Badge + "
            "InfoButton-Pattern (gleiche Mechanik wie alle anderen "
            "ⓘ-Erklaerungen im Projekt). Demo-relevant fuer Meppel.",
            "**SOLLTE** (Role-Downgrade-Lag, NICHT gefixt): wenn ein "
            "Admin waehrend einer aktiven Browser-Session zu Tester "
            "zurueckgesetzt wird, sieht er die Admin-Version bis zum "
            "Token-Refresh. Akzeptables Restrisiko — Token-TTL ist "
            "kurz, betrifft nur den eigenen Browser-Tab, kein Cross-"
            "User-Issue. Dokumentiert in der Lessons-Archive-Backlog.",
            "**NICE** (Code-Hygiene, NICHT gefixt): unused Callbacks "
            "(onStartEdit/onSave/etc.) werden im Tester-Kontext ans "
            "ItemRow gegeben, dort aber nicht aufgerufen. Kein Bug — "
            "Refactor zur separaten ReadOnlyItemRow nur sinnvoll wenn "
            "die Komponente weiter waechst.",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.timer-focus-mode",
        released=date(2026, 5, 28),
        title="🎯 Fokus-Modus im Timer-Tab",
        highlights=[
            "User-Wunsch: Toggle der die Sub-Cards im Timer-Tab "
            "ausblendet, damit Scramble + Timer-Display den ganzen "
            "Bildschirm einnehmen koennen — fuer Speedcuber die wenig "
            "Ablenkung wollen.",
            "Neuer „🎯 Fokus aktivieren\"-Button rechts ueber dem "
            "TimerTab-Layout. Klick → Live-Karte + Letzte-Solves-"
            "Tabelle + SessionPlanCard + TimerControlsCard werden "
            "ausgeblendet, Layout wird einspaltig.",
            "Sichtbar bleiben: Scramble, BigTimerInput (Soft-Tastatur "
            "im Text-Modus / Spacebar-Tracking im Spacebar-Modus), "
            "TouchTimerPad (auf Phone).",
            "Zustand persistiert in localStorage (Key: "
            "cubetracker.timer_focus_mode). Bleibt auch nach Reload "
            "aktiv — wer Fokus mag, bleibt im Fokus.",
            "Default OFF damit Bestands-User nicht ueberrascht "
            "werden. Cube/Session/Hardware wechseln geht weiterhin "
            "ueber „🪟 Volle Ansicht\"-Toggle zurueck zur Sub-Card.",
        ],
        internal=False,
    ),
    PatchNote(
        version="2.0.0-alpha.W.timer-lastsolves-all",
        released=date(2026, 5, 28),
        title="⏱ Letzte Solves im Timer-Tab: jetzt bis „Alle\" + interner Scroll",
        highlights=[
            "User-Wunsch: in der Karte „Letzte Solves\" (Timer-Tab) "
            "soll man ueber das 100er-Limit hinaus alle Solves "
            "einsehen koennen — analog zum Selector im Analyse-Tab.",
            "LastSolvesPreview-Selector erweitert von 10/20/50/100 "
            "auf 10/20/50/100/200/500/Alle. Default bleibt 20.",
            "Bei mehr als 100 Zeilen (200/500/Alle) bekommt die "
            "Tabelle einen internen vertikalen Scroll (max-h-96 + "
            "overflow-y-auto) — damit die Karte nicht ewig hoch "
            "wird und der Rest des Timer-Tabs sichtbar bleibt.",
            "Sticky-Header: Spaltenkopf bleibt beim Scrollen oben "
            "sichtbar (sticky top-0 bg-gray-900/95 z-10).",
            "Backend: fetchLimit wird bei „Alle\" intern auf 100_000 "
            "gesetzt — die API verkraftet das problemlos (Pattern "
            "wie im Analyse-Tab SolveList).",
        ],
        internal=False,
    ),
    PatchNote(
        version="2.0.0-alpha.W.tester-readonly-roadmap",
        released=date(2026, 5, 28),
        title="Tester sieht Roadmap nur lesend (Rollen-Schnitt-Korrektur)",
        highlights=[
            "User-Wunsch: die Tester-Rolle soll die Roadmap weiterhin "
            "sehen koennen (inkl. interner Tech-Schuld-Items), aber "
            "nicht editieren — Live-Tests-Pflege bleibt voll ihre.",
            "Backend: 3 Roadmap-CRUD-Endpoints in api/admin.py "
            "(POST/PATCH/DELETE /admin/roadmap/items) zurueck auf "
            "require_admin (vorher require_admin_or_tester). Public "
            "GET /api/roadmap bleibt mit is_admin_or_tester-Filter, "
            "Tester sehen also weiterhin alle Items inkl. internal=True.",
            "Frontend: AdminRoadmapPanel bekommt `readOnly`-Prop. "
            "TesterPanel ruft mit readOnly=true — Quick-Toggles, "
            "Bearbeiten, Loeschen, Neu-Button sind ausgeblendet. "
            "Filter (Phase/Status/Visibility) bleibt, damit Tester "
            "auch internal-only-Filter nutzen koennen.",
            "Defense-in-Depth: selbst wenn ein kompromittierter Tester-"
            "Client die Backend-Endpoints direkt anspricht, antworten "
            "die mit 404 (require_admin fail-closed via Fail-closed-"
            "Pattern aus W.tester-role-db).",
            "UX-Hinweis im Tester-Modus: amber Badge \"🔍 Nur Ansicht\" "
            "neben dem Roadmap-Title, mit Tooltip-Erklaerung. Klar "
            "kommunizierte Beschraenkung statt versteckter Buttons.",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.roadmap-restore-clarify",
        released=date(2026, 5, 28),
        title="Korrektur: W.roadmap-restore war Fehldiagnose, kein Datenverlust",
        highlights=[
            "Audit-Trail-Korrektur zu W.roadmap-restore (Commit "
            "`e79ab6d`): die behauptete Volume-Issue-Hypothese stimmt "
            "nicht. Tatsaechlich hatte der Admin (User) die ~28 "
            "Roadmap-Items via Admin-UI bewusst auf `internal=True` "
            "umgestellt — Items waren weiterhin in der DB, nur fuer "
            "Non-Admins per Filter unsichtbar.",
            "Nachvollzogen: `count: 3` an der Public-API ist KORREKT "
            "(28 internal-geflaggte alte + 3 neue public UX-Polish + "
            "2 neue internal UX-Polish = 33 in der DB, 3 davon public).",
            "Der `bootstrap_roadmap`-Refactor von count-check auf per-"
            "Item-Idempotenz (title_de-Match) bleibt trotzdem im Code "
            "— defensiver gegen ECHTEN zukuenftigen Datenverlust "
            "(z.B. Postgres-Volume-Reset). War in dieser Situation "
            "nicht noetig, schadet aber nicht.",
            "Docstring von `bootstrap_roadmap` geschaerft: der saubere "
            "Weg, Items aus der User-Sicht zu entfernen, ist `internal"
            "=True` via Admin-UI (NICHT Delete — der bringt das Item "
            "beim naechsten Container-Restart wieder zurueck, weil die "
            "title_de-Idempotenz dann denkt es fehlt).",
            "Lesson: Live-Verify nach Coolify-Deploys muss die "
            "API-Antwort gegen DEN ERWARTETEN BUSINESS-State pruefen "
            "(„welche Items sollten public sein?\"), nicht gegen "
            "Historie-Doku-Behauptungen.",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.ux-demo-polish-qa",
        released=date(2026, 5, 28),
        title="QA-Hotfix nach UX-Demo-Polish (0 KRITISCH + 3 SOLLTE)",
        highlights=[
            "QA-Sub-Agent-Review der W.ux-demo-polish + W.roadmap-"
            "restore-Wellen: 0 KRITISCH, 3 SOLLTE, 2 NICE, 4 POSITIV. "
            "Alle 3 SOLLTE-Findings sofort gefixt.",
            "**SOLLTE 1** (sort_order-Kollision): bootstrap_roadmap "
            "und bootstrap_ux_polish_items berechneten max(sort_order) "
            "innerhalb des Loops ohne explizites db.flush() — bei 3 "
            "P1-Items im selben Boot wuerden alle dieselbe sort_order "
            "bekommen (autoflush nicht garantiert in allen Session-"
            "Configs). Fix: explizites db.flush() vor jeder max()-"
            "Query.",
            "**SOLLTE 2** (WCAG 2.1.1): SolveList-Mobile-Card hatte "
            "role='button' + tabIndex=0 ohne onKeyDown-Handler. Tab-"
            "Navigation per BT-Keyboard/Folding-Phone landete auf der "
            "Card, Enter/Space loeste aber nichts aus. Fix: onKeyDown "
            "fuer Enter+Space hinzugefuegt (oeffnet Detail-Modal). "
            "Echtes <button> ging nicht weil verschachtelte Aktions-"
            "<button>s invalid waeren.",
            "**SOLLTE 3** (Event-Bubbling): Aktions-Container in der "
            "Mobile-Card stoppte nur onClick, nicht onKeyDown. Nach "
            "SOLLTE-2-Fix wuerde Enter auf +2/DNF/🗑 gleichzeitig "
            "die Aktion + das Detail-Modal triggern. Fix: onKeyDown="
            "{(e) => e.stopPropagation()} am Container.",
            "NICE-Findings (Backlog): PatchNotesPanel hat eigenes "
            "hartes p-6 in Loading/Error-States (Doppel-Padding auf "
            "Mobile). UNIQUE-Constraint auf roadmap_items.title_de "
            "fuer Parallel-Boot-Race waere defensiv — beide selten "
            "genug fuer spaeter.",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.roadmap-restore",
        released=date(2026, 5, 28),
        title="Roadmap-DB-Restore (25 fehlende Items nachgereicht)",
        highlights=[
            "Live-Verify nach dem W.ux-demo-polish-Push hat einen "
            "Datenverlust in der Live-Postgres-DB aufgedeckt: von den "
            "28 Items aus W.roadmap-db waren nur noch 3 sichtbar (die "
            "neuen UX-Polish-Items). Vermutete Ursache: Postgres-"
            "Volume-Issue bei einem früheren Coolify-Deploy zwischen "
            "Do-Nacht und heute, NICHT durch den Sprint verursacht.",
            "Fix: bootstrap_roadmap() in seeds/roadmap.py umgestellt "
            "von count-check (`if existing > 0: return 0`) auf per-"
            "Item-Idempotenz (title_de-Match, analog zu bootstrap_"
            "ux_polish_items). Beim nächsten Container-Boot werden "
            "fehlende Items aus ROADMAP_SEED automatisch nachgereicht.",
            "Trade-off bewusst geändert: Items aus ROADMAP_SEED können "
            "nicht mehr permanent via Admin-UI-Delete entfernt werden "
            "(kommen beim Restart zurück). Wer ein Item endgültig "
            "loswerden will: aus seeds/roadmap.py rauseditieren — ODER "
            "internal=True via Admin-UI setzen (= für User unsichtbar, "
            "aber Audit-Trail bleibt).",
            "Lesson archiviert in docs/lessons-archive.md: Live-Verify "
            "nach Coolify-Deploys muss DB-Stand explizit prüfen (nicht "
            "nur Health-Endpoint + Bundle-Marker), sonst übersieht man "
            "Volume-Verlust.",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.ux-demo-polish",
        released=date(2026, 5, 28),
        title="📱 Mobile-Polish + Kontrast-Schub für die Phone-Demo",
        highlights=[
            "Vorbereitung für die Demo am WCA-Turnier Meppel (Sa 30.05.): "
            "schneller UX-Audit (4 parallele Sub-Agents, 10 Kategorien) "
            "hat 9 KRITISCH-Befunde gebracht. Die 4 mit hohem Phone-Impact "
            "+ niedrigem Refactor-Risiko sind jetzt live, die 5 größeren "
            "Refactors landen als P1-Roadmap-Items.",
            "**Solve-Liste auf dem Phone**: jetzt als Card-Stack statt "
            "7-Spalten-Tabelle. Zeit + PB-Marker (★/☆) prominent, ao5/"
            "ao12 mit Farb-Punkten, Cube-Type rechts, +2/DNF/🗑 als "
            "Tap-große Buttons darunter. Tap auf die Card öffnet das "
            "Detail-Modal (inkl. Inline-Edit). Tabelle bleibt unverändert "
            "ab md-Breakpoint.",
            "**Header auf dem Phone aufgeräumt**: Sprach-Switcher + "
            "Versions-Badge sind unter md ausgeblendet. Backup-Zugriff "
            "liegt im UserMenu (Sprach-Switcher ist dort schon, Patch-"
            "Notes via „Was ist neu?\"-Eintrag). Mehr Platz fürs Logo.",
            "**Alle Modals auf dem Phone schmaler**: Padding p-6 → "
            "p-4 md:p-6 in PatchNotes / Features / Roadmap / Feedback / "
            "SolveDetail. Auf 375px-Screens sind das ~30px mehr Content-"
            "Breite pro Modal.",
            "**Footer + Sprach-Switcher Kontrast WCAG-AA-konform**: "
            "text-gray-500 → text-gray-300 (Footer-Links), text-gray-"
            "600 → text-gray-400 (Footer-Container), inactive-Sprach-"
            "Button text-gray-400 → text-gray-300. Vorher knapp 2.8:1 "
            "Kontrast-Ratio, jetzt 6.8:1.",
            "**5 neue P1-Items in der Roadmap** als ehrliche Mängelliste "
            "aus dem UX-Audit: 503-Banner für WCA-Profil, Toast-Manager "
            "mit Severity-Stacking, Solve-Liste virtualisieren (1000+ "
            "Solves), Recharts lazy-loaden (Bundle ~70kb kleiner), "
            "Cache-Invalidation refactoren (Query-Key-Prefix). Drei "
            "davon public sichtbar im Roadmap-Modal, zwei internal "
            "(reine Tech-Debt). Werden via additive Migration in "
            "main.py:lifespan auch in die Live-DB nachgereicht.",
        ],
        internal=False,
    ),
    PatchNote(
        version="2.0.0-alpha.W.tester-feedback-qa",
        released=date(2026, 5, 28),
        title="QA-Hotfix nach Tester+Feedback (2 KRITISCH + 4 SOLLTE)",
        highlights=[
            "QA-Sub-Agent fand 2 KRITISCH + 5 SOLLTE + 1 NICE + 4 "
            "POSITIV. Sofort gefixt:",
            "**KRITISCH 1** (Datenverlust): FeedbackMessageAdminUpdate."
            "admin_response hatte kein min_length=1 — leerer String "
            "überschrieb still eine bestehende Antwort. Jetzt min_"
            "length=1; explizites null bleibt der dokumentierte Pfad "
            "zum Löschen einer Antwort.",
            "**KRITISCH 2** (stale form): InboxRow.responseDraft hing "
            "am useState-Init-Wert. Nach Admin-Antwort → Refetch hatte "
            "msg.admin_response neuen Wert, aber Editor zeigte alten "
            "Draft. Fix: useEffect synct setResponseDraft auf msg."
            "admin_response-Change. Analog zum W.roadmap-admin-qa-Fix.",
            "**SOLLTE** (privacy): User-Endpoint /feedback/me/messages "
            "leakte user_id + admin_response_by_user_id. Neuer Schema-"
            "Typ FeedbackMessageUserRead ohne diese internen IDs. ID-"
            "Enumeration ist damit nicht mehr möglich.",
            "**SOLLTE** (Security/Sortenrein): delete_live_test ist "
            "jetzt require_admin (nicht require_admin_or_tester) — "
            "Tester kann PASS/FAIL/SKIP machen, aber nicht Test-"
            "Historie wegwerfen. Defense-in-Depth gegen kompromittierte "
            "Tester-Accounts.",
            "**SOLLTE** (Performance): MyFeedbackPanel feuerte markSeen "
            "alle 60s neu wenn ein Item aufgeklappt war (Query-Refetch "
            "triggerte useEffect via messages-Dep). Fix: useEffect-Deps "
            "auf [expandedId] reduziert, messages via Closure.",
            "**SOLLTE** (Code-Hygiene): FeedbackUnreadToaster `const t "
            "= setTimeout(…)` shadowed `t` von useTranslation. "
            "Umbenannt zu `autohideTimer`.",
            "POSITIV-Findings: Auth-Filter sauber (alle 4 /admin/"
            "feedback/* hinter require_admin, Tester sieht Inbox "
            "nicht), POST /feedback/messages kein user_id-Spoofing "
            "möglich, mark_response_seen-IDOR-frei (404 statt 403), "
            "is_tester-Migration idempotent, VerwaltungTab-Section-"
            "Guard doppelt geprüft.",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.session-scan-feedback",
        released=date(2026, 5, 28),
        title="Session-Start-Context + /abschluss scannen Bugs + Feedback",
        highlights=[
            "Phase 6 (Tooling) der Tester+Feedback-Welle: damit Bugs "
            "+ Feedback nicht zwischen Sessions verloren gehen, scannt "
            "Claude jetzt automatisch beim Session-Start beide Quellen.",
            "session-start-context.sh erweitert: zusätzlich zu Git-"
            "Stand + Branch + Patch-Notes-Version jetzt auch (a) offene "
            "GitHub-Issues via gh CLI (Anzahl + Top 5), (b) Hinweis "
            "auf Admin-Feedback-Inbox-URL mit Reminder zum manuellen "
            "Check.",
            "Backend-Stats-Endpoint (/admin/feedback/stats) bewusst "
            "NICHT auto-gescannt — Hook hat keinen Admin-Token, das "
            "wäre Security-Risk. Manueller Check via Browser ist der "
            "saubere Weg.",
            "/abschluss-Skill: neuer Check 11 „Offene Bugs / Feedback-"
            "Items vor Session-Ende?\" listet gh issue list + erinnert "
            "an Inbox-Browse. Nicht erzwingend — falls Items offen, "
            "wird gefragt ob aktuelle Welle oder „nächste Session\".",
            "Zusammenfassungs-Tabelle in /abschluss um Zeile 11 "
            "erweitert.",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.feedback-user-view",
        released=date(2026, 5, 28),
        title="💬 Mein-Feedback-Bereich + Login-Toast bei neuer Antwort",
        highlights=[
            "Phase 5 (Frontend) der Tester+Feedback-Welle: User-Sicht "
            "der Feedback-Inbox. Nach dem Senden einer Nachricht "
            "verschwindet sie nicht mehr ins Leere — der User sieht "
            "Status + Admin-Antwort in einem eigenen Bereich.",
            "Neuer Block „Mein Feedback\" in Verwaltung → Meine Daten "
            "(direkt nach der Ownership-Card). Liste aller eigenen "
            "Items chronologisch absteigend mit Kategorie-Icon + "
            "Status-Badge + Datum. Truncated nach 200 Zeichen, klick "
            "zum Expandieren.",
            "Items mit ungelesener Admin-Antwort: grüne Border + grüner "
            "Dot + „💬 Neue Antwort\"-Badge. Beim Aufklappen wird die "
            "Antwort automatisch als gelesen markiert (POST /feedback/"
            "me/messages/{id}/seen).",
            "FeedbackUnreadToaster (App.tsx): beim Login + bei jedem "
            "Reload prüft der Toaster /feedback/me/unread-count. Wenn "
            "> 0: kleiner grüner Toast oben rechts, 6s sichtbar. Klick "
            "springt direkt zum „Meine Daten\"-Sub-Tab via Custom-"
            "Event-Pattern (cubetracker:goto-verwaltung-section).",
            "Toast erscheint nur 1× pro Mount (useState-Flag) damit er "
            "nicht bei jedem Page-Refresh nervt — Re-Trigger erst bei "
            "neuem Login oder Browser-Refresh.",
            "21 neue Locale-Keys (myFeedback.* + feedbackToaster.*), "
            "1280/1280 symmetrisch.",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.tester-tab-ui",
        released=date(2026, 5, 28),
        title="Tester-Tab in Verwaltung + Admin-Toggle „🧪 Tester machen\"",
        highlights=[
            "Phase 4 (Frontend) der Tester+Feedback-Welle: User mit "
            "is_tester=true && !is_admin sehen jetzt einen eigenen "
            "Tester-Tab (🧪) in der Verwaltung statt des Admin-Tabs.",
            "Neue Komponente TesterPanel rendert die existierenden "
            "AdminLiveTestsPanel + AdminRoadmapPanel 1:1 — gleiche UI, "
            "gleiche Hooks. Berechtigung ist Backend-seitig durch "
            "require_admin_or_tester garantiert (W.tester-role-db).",
            "AdminUsersPanel: neuer 🧪 Tester-Toggle pro User-Zeile "
            "(analog dem ★ Admin-Toggle). Promotion + Demotion ohne "
            "Safeguard (Tester ist additive Rolle, niemand wird "
            "ausgesperrt). Plus TESTER-Badge (blau) wenn is_tester && "
            "!is_admin.",
            "AdminUserPatch um is_tester erweitert — useAdminPatchUser "
            "kann beides senden.",
            "Locale-Keys: verwaltung.tester (DE+EN). 1259/1259 "
            "symmetrisch.",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.feedback-inbox-ui",
        released=date(2026, 5, 28),
        title="Admin-Feedback-Inbox-UI mit Filter + Antwort-Workflow",
        highlights=[
            "Phase 3 (Frontend) der Tester+Feedback-Welle: neuer "
            "AdminFeedbackInboxPanel im Admin-Tab unter Stats.",
            "Header zeigt Stats-Badges für offene Kategorien (rot bei "
            "Bugs, lila bei Features, blau bei Allgemein, grau bei "
            "Sonstigem) — auf einen Blick siehst du was hängt.",
            "Filter-Bar: Status (Alle/Neu/In-Bearbeitung/Erledigt/"
            "Archiviert) + Kategorie. Liste sortiert nach „status='new' "
            "zuerst, dann nach Datum descending\".",
            "Pro Item: Kategorie-Badge + Status-Badge + Antwort-Badge "
            "(💬 Antwort gesehen / wartet auf User), User-Info, Datum, "
            "expandable Message (truncated nach 200 Zeichen).",
            "Quick-Toggles (in-progress / done / archive) + Antwort-"
            "Editor (Textarea + Save) + Delete mit Confirm. Antwort "
            "schreiben setzt Status automatisch auf in_progress wenn "
            "vorher new.",
            "Per-Row-Busy-Disable (analog AdminRoadmapPanel-Pattern). "
            "Mutations invalidieren ['admin-feedback'] + ['admin-"
            "feedback-stats'].",
            "45 neue Locale-Keys DE/EN symmetrisch (1258/1258).",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.feedback-modal-rebuild",
        released=date(2026, 5, 28),
        title="Feedback-Modal: „Per Email\"-Mode raus, „Per App\"-Mode rein",
        highlights=[
            "Phase 2 (Frontend) der Tester+Feedback-Welle: das "
            "FeedbackModal nutzt jetzt den neuen DB-Inbox-Endpoint "
            "statt Resend-E-Mail-Versand.",
            "Eingeloggte User: Tab-Toggle zwischen „Direkt in der App\" "
            "(Default — schreibt in die Admin-Inbox) und „GitHub-Issue\". "
            "4 Kategorien jetzt: Allgemein / Bug / Feature-Wunsch / "
            "Sonstiges (vorher 3).",
            "Anonyme User (Login-Seite-Footer): KEIN Tab-Toggle, nur "
            "GitHub-Mode. Hint-Text erklärt warum („Logge dich ein, um "
            "direkt in der App zu schreiben — Antwort kommt zurück in "
            "dein Konto\").",
            "Frontend-API: useCreateFeedbackMessage / useMyFeedback / "
            "useMyFeedbackUnreadCount / useMarkFeedbackResponseSeen + "
            "Admin-Hooks (useAdminFeedbackMessages, useAdminFeedbackStats, "
            "useAdminUpdateFeedback, useAdminDeleteFeedback). Cache-"
            "Invalidation umfassend.",
            "AuthContext.UserRead + AdminUser-Type um is_tester ergänzt "
            "(für die Tester-Tab-Anzeige + Admin-Toggle-UI in den "
            "Folge-Wellen).",
            "Locales DE/EN angepasst (1213/1213 symmetrisch): modeEmail/"
            "emailIntro/successMessage durch modeApp/appIntro/"
            "appSuccessMessage ersetzt, anonHint neu, typeGeneral neu.",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.tester-role-db",
        released=date(2026, 5, 28),
        title="Tester-Rolle + Feedback-Inbox-Backend (DB-persistent)",
        highlights=[
            "Phase 1 (Backend) für 2 zusammenhängende Features:",
            "**Tester-Rolle**: neue users.is_tester-Spalte (default false). "
            "Tester sehen + bearbeiten Live-Tests + Roadmap-Items "
            "(neue require_admin_or_tester-Dep an 7 Endpoints) — NICHT "
            "aber User-Management, Stats, Feedback-Inbox oder "
            "Announcements (bleiben hinter require_admin). Promotion "
            "via Admin-UI (PATCH /admin/users/{id} mit is_tester=true), "
            "kein Env-Var-Bootstrap nötig. Public /api/roadmap zeigt "
            "Tester die internal-Items (UI-Filter, kein Auth-Bypass).",
            "**Feedback-Inbox**: neue feedback_messages-Tabelle ersetzt "
            "den bisherigen Email-Versand. Schema: user_id (FK SET NULL "
            "— anonymisiert bei User-Delete) + category + message + "
            "status (new/in_progress/done/archived) + admin_response + "
            "admin_response_at + admin_response_by + "
            "user_seen_response_at.",
            "User-Endpoints: POST /feedback/messages (3/h Rate-Limit) "
            "ersetzt den alten Email-Versand. GET /feedback/me/messages "
            "(eigene Liste). GET /feedback/me/unread-count (Toast-"
            "Trigger). POST /feedback/me/messages/{id}/seen (markiert "
            "Antwort als gelesen).",
            "Admin-Endpoints: GET /admin/feedback/messages (Filter "
            "category/status, ungelesene oben). GET /admin/feedback/"
            "stats (Counts pro Status + offene-Categories). PATCH /"
            "admin/feedback/messages/{id} (Status + Antwort). DELETE "
            "/admin/feedback/messages/{id}.",
            "Frontend folgt in W.feedback-modal-rebuild + W.feedback-"
            "inbox-ui + W.tester-tab-ui + W.feedback-user-view.",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.roadmap-admin-quickactions",
        released=date(2026, 5, 28),
        title="Admin-Roadmap: Quick-Toggle für Intern/Öffentlich + Aktiv/Erledigt",
        highlights=[
            "User-Vorschlag: die zwei häufigsten Roadmap-Item-Änderungen "
            "(intern↔öffentlich und aktiv↔erledigt) aus dem Edit-Mode "
            "rausziehen — direkt als Quick-Toggle-Buttons in der View-"
            "Mode-Row neben Bearbeiten/Löschen.",
            "Visual: zwei neue Buttons pro Zeile. Internal-Toggle wechselt "
            "die Farbe je nach aktuellem State (amber wenn intern, "
            "emerald wenn öffentlich; Klick-Hover zeigt das Ziel an). "
            "Status-Toggle zeigt „→ erledigt\" bzw. „→ aktiv\".",
            "Keine Confirms — 1-Klick-Toggle, Rückgängig per zweitem "
            "Klick (analog Live-Tests-PASS/FAIL). Per-Row Busy-State, "
            "damit nur die geklickte Zeile disabled ist.",
            "Backend unverändert — beide Toggles nutzen den existierenden "
            "PATCH /api/admin/roadmap/items/{id}-Endpoint mit jeweils "
            "nur dem geänderten Feld (internal oder status). Cache-"
            "Invalidation greift wie immer auf ['roadmap'].",
            "8 neue Locale-Keys DE/EN symmetrisch (1211/1211).",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.roadmap-admin-qa",
        released=date(2026, 5, 28),
        title="QA-Hotfix nach Roadmap-Admin-UI (3 SOLLTE)",
        highlights=[
            "QA-Sub-Agent fand 0 echte KRITISCH (Security/Datenverlust-"
            "Kette komplett sauber: require_admin, extra=forbid, Cache-"
            "Invalidation, Anonymous-Filter alle POSITIV), 3 SOLLTE + "
            "2 NICE. Alle 3 SOLLTE sofort gefixt:",
            "(1) AdminRoadmapPanel deleteMut/updateMut wurden global "
            "geteilt → alle Delete-/Save-Buttons gleichzeitig disabled "
            "wenn einer pending war. Jetzt: deletingId-State und "
            "editingId-Check, nur die betroffene Zeile ist disabled.",
            "(2) ItemRow Form-State stale nach Cancel+Reopen behoben: "
            "key={item.id}-{view|edit} zwingt React beim Modus-Wechsel "
            "den ItemRow neu zu mounten und den Form-State mit dem "
            "aktuellen Server-Stand zu re-initialisieren.",
            "(3) RoadmapModal hatte keinen Empty-State wenn API "
            "items=[] zurückgibt (z.B. nach Admin-Bulk-Delete oder vor "
            "Seed-Bootstrap). Vorher: nur Intro-Text + leere ol. Jetzt: "
            "neuer Locale-Key roadmap.emptyState mit freundlichem "
            "Hinweis.",
            "(4) Seed-Re-Run-Verhalten dokumentiert: wenn Admin alle "
            "Items löscht + Container neu startet, kommen die 28 Seed-"
            "Items zurück. Kein Bug, aber bewusst dokumentiert im "
            "bootstrap_roadmap-Docstring für späteren Lookup.",
            "Locale-Symmetrie nach den Fixes: 1203/1203 DE/EN.",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.roadmap-admin-ui",
        released=date(2026, 5, 28),
        title="Admin-Roadmap-CRUD: Items anlegen / bearbeiten / löschen",
        highlights=[
            "Komplettiert die Roadmap-Migration (W.roadmap-db + W.roadmap-"
            "modal-api → diese Welle): Admins bekommen im Verwaltung-→-"
            "Admin-Tab einen neuen Block „Roadmap-Pflege\" mit voller "
            "CRUD-UI.",
            "Liste alle Items gruppiert nach Phase (P1..P6, je mit "
            "Counter). Pro Zeile: DE-Titel + EN-Titel + Notes (DE+EN) "
            "+ effort + Public/Internal-Badge + Done-Badge. Inline-Edit "
            "alle Felder + Save/Cancel.",
            "Filter-Bar: Phase (P1-P6 oder alle), Status (active/done/"
            "alle), Sichtbarkeit (public/internal/alle). Filter sind "
            "kombinierbar, leerer Filter-Treffer zeigt freundlichen "
            "Hinweis.",
            "„+ Neues Item\"-Form: Phase-Picker, Effort, beide Titel-"
            "Sprachen, beide Note-Sprachen, Status-Picker, Internal-"
            "Toggle. sort_order wird vom Backend automatisch vergeben "
            "(max(existing)+10 pro Phase) wenn nicht explizit gesetzt.",
            "Delete per Zeile mit nativem confirm-Dialog (interpoliert "
            "den Item-Titel). Mutations invalidieren ['roadmap']-"
            "QueryKey → User-Modal aktualisiert sich beim nächsten "
            "Öffnen ohne Reload.",
            "Cross-Admin: alle Admins sehen + bearbeiten alle Items, "
            "kein per-User-Filter (Backend-seitig schon in W.roadmap-db "
            "garantiert). 43 neue Locale-Keys DE/EN symmetrisch "
            "(1202/1202).",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.roadmap-modal-api",
        released=date(2026, 5, 28),
        title="🌍 Roadmap-Modal komplett DE/EN — liest jetzt aus DB",
        highlights=[
            "Das Roadmap-Modal (Footer-Link „Roadmap\") ist jetzt "
            "vollständig zweisprachig — jeder Item-Titel + jede Notiz "
            "rendert in der gewählten UI-Sprache. Der temporäre amber "
            "„Roadmap content is currently only available in German\"-"
            "Hinweis aus W.i18n-roadmap-notice ist Geschichte.",
            "Unter der Haube: Modal liest die Items jetzt aus dem "
            "neuen /api/roadmap-Endpoint statt aus einer statischen "
            "TypeScript-Konstante. Phase-Meta (Titel/Summary/Timeframe "
            "der 6 Phasen) bleibt clientseitig + via i18n-Keys "
            "übersetzt — Phasen ändern sich selten, Items häufig.",
            "Status-Logik: Items mit status='done' bekommen weiterhin "
            "den ✓ + Strike-Through. Phasen ohne sichtbare Items "
            "werden komplett ausgeblendet (kein „leeres P1\" mehr).",
            "Sichtbarkeits-Filter passiert serverseitig (Backend "
            "filtert internal=True-Items für Non-Admins) — der "
            "isAdmin-Prop am Modal ist weg, kein Mass-Assignment-"
            "Risiko mehr.",
            "Cleanup: alte lib/roadmap-data.ts gelöscht (~300 Zeilen "
            "veralteter Roadmap-Stand). Phase-Meta liegt jetzt in "
            "lib/roadmap-phases.ts (~80 Zeilen, nur Phase-Struktur).",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.roadmap-db",
        released=date(2026, 5, 28),
        title="Roadmap in DB — Schema + Seed + Endpoints (Backend)",
        highlights=[
            "Roadmap-Items wandern aus der statischen lib/roadmap-data.ts "
            "in eine echte DB-Tabelle (roadmap_items) — Admin kann ab "
            "der nächsten Welle (W.roadmap-admin-ui) im Tab Admin neue "
            "Items anlegen, bestehende editieren, löschen, und das "
            "internal-Flag toggeln.",
            "Schema: id + phase_id (P1-P6) + sort_order + title_de + "
            "title_en + note_de + note_en + effort + status + internal "
            "+ created_at + updated_at. Migration in main.py:lifespan "
            "(create_all + defensive CREATE INDEX IF NOT EXISTS).",
            "Seed: 28 kuratierte Items aus dem alten roadmap-data.ts, "
            "ALLE done-Items wurden gestrichen (Sprint-Bereinigung — "
            "Hetzner-Migration komplett, Backlog fertig, Turnier-Sprint "
            "live). Pro Item DE + EN Übersetzung — der germanOnlyNotice-"
            "Banner aus W.i18n-roadmap-notice wird in der nächsten Welle "
            "obsolet.",
            "Public-Endpoint GET /api/roadmap: liefert alle Items "
            "sortiert nach (phase_id, sort_order, id). Non-Admin "
            "filtert internal=True raus. Admin sieht alles + flag im "
            "Response.",
            "Admin-CRUD: POST /api/admin/roadmap/items, PATCH /api/"
            "admin/roadmap/items/{id}, DELETE /api/admin/roadmap/items/"
            "{id}. Alle mit ADMIN_LIMIT-Rate-Limit. Cross-Admin: jeder "
            "Admin sieht + bearbeitet alle Items, kein per-User-Filter.",
            "Bootstrap idempotent via Count-Check auf roadmap_items. "
            "Beim zweiten Container-Start passiert nichts mehr — der "
            "Admin pflegt ab dann selbst.",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.demo-probe-meppel-seed",
        released=date(2026, 5, 28),
        title="Demo-Probe-Live-Tests vor Meppel-Turnier (Admin-Bootstrap)",
        highlights=[
            "Neue Seed-Datei `webapp/seeds/live_tests.py` mit 12 Demo-"
            "Probe-Live-Tests, die der `main.py:lifespan` beim Cold-Start "
            "idempotent in die `live_tests`-Tabelle einspielt (Idempotenz "
            "via `related_phase='W.demo-probe-meppel'`-Count-Check).",
            "Test-Set: Sprach-Switcher → Login-Seite → Dashboard alle "
            "Karten → Timer-Tab Solve-Flow → Analyse-Tab Charts + Liste "
            "+ Solve-Detail → Verwaltung alle Sub-Tabs → Trainer + "
            "Community → WCA-Profil (ID setzen + echte Zahlen) → "
            "Backup-Download mit wca_id-Feld → Roadmap-Modal DE-Banner "
            "→ Sprach-Persistenz nach Reload + Logout.",
            "Cross-Admin-Visibility (war im Bestand schon korrekt, jetzt "
            "explizit im Code dokumentiert): /admin/live-tests-Endpoint "
            "filtert NICHT nach created_by_user_id — alle Admins sehen "
            "alle Tests. Lesen/Schreiben/Löschen ebenfalls global durch "
            "`require_admin`-Dep geschützt, keine per-User-Gates.",
            "Tests sind `created_by_user_id=None` (System-erstellt) und "
            "haben `related_tag='v2.0.0-alpha.W.demo-probe-meppel'` als "
            "Anker. Bei FAIL + Notiz → automatisches GitHub-Issue über "
            "den bestehenden Workflow (W.live-tests Phase 3).",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.wca-profile-bugfix",
        released=date(2026, 5, 28),
        title="WCA-Profil: Wettkampf-Count + Medaillen + Ränge zeigten 0",
        highlights=[
            "User-Befund (live nach Deploy): WCA-Profil-Karte funktionierte "
            "soweit, aber Wettkampf-Count + Medaillen-Counter + Rekord-"
            "Counter + Recent-Comps zeigten überall 0 oder waren leer.",
            "Ursache: 4 Mismatches zwischen unserem Code und der echten "
            "WCA-API-v0-Response (post-deploy verifiziert gegen "
            "2009ZEMD01-Live-Daten):",
            "1) Top-Level-Feld heißt `competition_count` (Singular!), "
            "nicht `competitions_count` — daher 0.",
            "2) `/persons/{id}` enthält gar KEIN `competitions`-Feld — "
            "die Wettkampf-Historie kommt aus dem separaten Endpoint "
            "`/persons/{id}/competitions`. Wird jetzt parallel "
            "abgerufen + 6h gecached.",
            "3) Records-Keys: WCA liefert `world` / `continental` / "
            "`national` / `total` (lowercase) — wir hatten WR / CR / NR "
            "erwartet.",
            "4) PR-Rank-Keys: WCA liefert `continent_rank` / "
            "`country_rank` — wir hatten `continental_rank` / "
            "`national_rank` erwartet. Backend mappt das jetzt auf "
            "unsere stabilen Output-Keys (Frontend unverändert).",
            "Lesson: API-Quirks IMMER mit echter Live-Response gegen-"
            "checken bevor man Slim-Mappers baut. Smoke-Test gegen "
            "Zemdegs jetzt im /abschluss-Workflow.",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.qa-polish",
        released=date(2026, 5, 28),
        title="QA-Polish: getIntlLocale-Utility extrahiert",
        highlights=[
            "QA-Nachbearbeitung: 6 Konsumenten hatten jeweils ein "
            "hartkodiertes `locale === 'en' ? 'en-GB' : 'de-DE'` — "
            "fehleranfällig wenn eine dritte Sprache dazukommt.",
            "Neue Funktion getIntlLocale(resolvedLanguage) in "
            "lib/format.ts mit prefix-Match (case-insensitive). "
            "Migriert: BackupPanel, NewsCard, WcaProfileCard, "
            "LeaderboardTab, PatchNotesPanel, WcaUpcomingCard.",
            "Helper bewusst nur in user-facing Komponenten gezogen — "
            "AdminStatsPanel + AdminUsersPanel sind admin-only (hart-"
            "kodiertes „de-DE\" Demo-irrelevant). timer-sound.ts nutzt "
            "absichtlich „en-US\" statt „en-GB\" (Web-Speech-Voices "
            "brauchen US-English).",
            "Ein weiterer QA-Befund („inspectionAudioModeDe\"-Quote-"
            "Kosmetik) war false-positive — DE „acht\" + EN \"acht\" "
            "sind die korrekten typografischen Anführungszeichen pro "
            "Sprache, kein Bug.",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.wca-profile-qa",
        released=date(2026, 5, 28),
        title="QA-Hotfix nach WCA-Profil-Light (4 SOLLTE + 1 NICE)",
        highlights=[
            "QA-Sub-Agent fand 4 SOLLTE + 3 NICE + 4 POSITIV, kein "
            "KRITISCH (Cross-User-Sicherheit + Defense-in-Depth via "
            "Whitelist+Pydantic-extra-forbid + Backup-Restore-Verhalten "
            "alle sauber).",
            "Demo-relevant gefixt: Cache-Invalidation in AccountSettings."
            "WcaIdSection — ohne den Fix zeigte das Dashboard 6h das alte "
            "Profil nachdem User die WCA-ID geändert hatte. Jetzt: ID "
            "speichern → Karte aktualisiert sofort.",
            "bestRankBadge-Logik in WcaProfileCard repariert: bei selbem "
            "Tier (z.B. zwei NR-Ränge) wird jetzt korrekt der niedrigere "
            "(= bessere) Rang gezeigt. Vorher konnte NR-Single #10 statt "
            "NR-Average #2 erscheinen.",
            "Negative-Cache für 404-WCA-IDs von 6h auf 30min reduziert. "
            "Tippfehler bei der Live-Eingabe sperrt den User nicht mehr "
            "stundenlang aus.",
            "backendDetail-String in WcaProfileCard wird vor Render auf "
            "200 chars gekappt — verhindert dass httpx-Stack-traces / "
            "interne URLs im DOM landen (defensive).",
            "WcaPersonRecentComp.url: nullable Type + Null-Guard im "
            "Frontend — WCA-API liefert in seltenen Fällen Comps ohne "
            "URL, der Link wird dann nicht gerendert.",
            "Dashboard-Layout-Polish: NewsCard nimmt volle Breite statt "
            "halb-leerer Zeile zu rechten Seite.",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.wca-profile-light",
        released=date(2026, 5, 28),
        title="🌍 WCA-Profil: deine offiziellen Bestzeiten + letzten Wettkämpfe",
        highlights=[
            "Neues Demo-Feature für den Turnier-Sprint: Hinterlege deine "
            "offizielle WCA-ID in den Account-Einstellungen — die App "
            "holt dann deine offiziellen WCA-PRs (Single + Average pro "
            "Disziplin), Medaillen-Count, Rekord-Count und letzte 5 "
            "Wettkämpfe direkt aus der World-Cube-Association-API und "
            "zeigt sie als neue Karte „WCA-Profil\" im Dashboard.",
            "WCA-Karte zeigt pro Event: Single + Average mit echten "
            "Wettkampf-Zeiten und besten World/Continental/National-Rank "
            "als farbiges Badge. Klick auf den Namen / einen Wettkampf "
            "öffnet das offizielle WCA-Profil.",
            "Komplett optional: ohne WCA-ID bleibt die Karte mit einem "
            "freundlichen Empty-State + Link zu den Account-Einstellungen "
            "sichtbar. ID-Format wird sowohl im Frontend (Eingabe-"
            "Validierung) als auch im Backend (Pydantic-Regex) geprüft.",
            "Daten-Quelle: api.worldcubeassociation.org (Read-only, "
            "kein Login). Backend cached pro WCA-ID 6 Stunden — die "
            "WCA-API wird damit nicht unnötig belastet. Bei Ausfall "
            "der WCA-API zeigt die Karte einen klaren Hinweis statt zu "
            "crashen.",
            "Voll DE/EN — alle 32 neuen Strings in beiden Sprachen "
            "(symmetrische 1137/1137 Keys).",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.wca-profile-backend",
        released=date(2026, 5, 28),
        title="WCA-Profil-Light: Backend (Schema + API)",
        highlights=[
            "Phase 1 (Backend) für das WCA-Profil-Light-Feature: User "
            "kann seine offizielle WCA-ID hinterlegen und die App ruft "
            "darüber offizielle WCA-PRs + Wettkampf-Historie ab.",
            "Schema: users.wca_id-Spalte (VARCHAR(10), nullable, mit "
            "Index für Friend-Lookup-Vorbereitung). Mini-Migration via "
            "ALTER TABLE IF NOT EXISTS in main.py:lifespan.",
            "UserRead + UserUpdate erweitert: wca_id mit Pattern-Regex "
            "^([12][0-9]{3}[A-Za-z]{4}[0-9]{2})?$ (WCA-Format „2024SMIT01\" "
            "oder leer = unsetzen). Endpoint update_me whitelist-erweitert "
            "+ Normalisierung (uppercase + trim).",
            "WCA-Client (wca/client.py): neue fetch_person()-Funktion "
            "ruft /api/v0/persons/{wca_id} ab, mit eigenem Cache-Slot "
            "(TTL 6h — PRs ändern sich selten). 404 → negative-cached. "
            "Slim-Response mit person-meta, medals, records, "
            "personal_records (sortiert nach WCA-Event-Reihenfolge mit "
            "world/continental/national rank pro single+average), "
            "recent_competitions (letzte 5).",
            "Neuer Endpoint GET /wca/me/profile mit Rate-Limit 30/min, "
            "422 wenn keine WCA-ID gesetzt, 404 wenn unbekannte ID, "
            "503 bei WCA-Outage.",
            "Backup-Export erweitert: user_wca_id mit-exportiert "
            "(Info-Feld analog user_email; kein Auto-Restore — User "
            "tippt es manuell wieder ein).",
            "Frontend-Welle folgt direkt — Backend-Endpoint alleine "
            "noch nicht nutzbar.",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.i18n-roadmap-notice",
        released=date(2026, 5, 28),
        title="Roadmap-Modal: DE-Only-Hinweis bei EN-UI",
        highlights=[
            "QA-Befund SOLLTE: Roadmap-Inhalte (Phase-Titel, Item-Titel, "
            "Notes, INTRO) sind in lib/roadmap-data.ts hartkodiert "
            "deutsch — EN-User sah beim Footer-Klick ein komplett "
            "deutsches Modal.",
            "Demo-pragmatische Lösung: bei i18n.resolvedLanguage !== 'de' "
            "zeigt das Modal oben einen amber Hinweis-Banner („Roadmap "
            "content is currently only available in German…\"). Modal "
            "bleibt nutzbar — der Trust-Signal („App ist in aktiver "
            "Entwicklung\") bleibt erhalten.",
            "Volle Roadmap-Übersetzung (~50 items + 30 notes + 6 phases) "
            "ist post-Demo-Item — würde im Sprint zu viel Zeit kosten.",
            "Neuer Key roadmap.germanOnlyNotice in beiden Locales.",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.i18n-qa",
        released=date(2026, 5, 28),
        title="QA-Hotfix nach i18n-en-release (2 KRITISCH)",
        highlights=[
            "QA-Sub-Agent-Review nach der Konsolidierungs-Welle fand 2 "
            "KRITISCH + 1 SOLLTE + 2 NICE. KRITISCH-Findings sofort "
            "gefixt.",
            "CubeStateView (Alg-Trainer Cube-Placeholder + Bild-alt-Text): "
            "title und alt waren hartkodiert deutsch („Kein Diagramm "
            "verfügbar für PLL-T\" + „Cube-State-Diagramm für ...\"). "
            "EN-User sah deutschen Tooltip auf jeder PLL-Case-Kachel. "
            "Neue Keys algTrainer.noImage + diagramAlt.",
            "ScrambleNet (2D-Cube-Net unter dem Scramble): aria-label "
            "„2D-Cube-Net nach Scramble: gelöst\" wurde von Screen-"
            "Readern auf EN deutsch vorgelesen. Neue Keys scramble."
            "netAriaLabel + scramble.netSolvedFallback.",
            "POSITIV-Findings: JSON-Validität sauber (Mi-Bug nicht "
            "zurück), Interpolations-Konsistenz 0 Mismatches über alle "
            "1100 Keys, Bundle live + vollständig, 153 identische "
            "DE=EN-Werte alle legit (Cubing/Tech/Symbol/Eigennamen) — "
            "keine Übersetzungs-Lücke in den Locales.",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.i18n-en-release",
        released=date(2026, 5, 28),
        title="🇬🇧 Englische Version verfügbar — App komplett zweisprachig",
        highlights=[
            "Cubetracker ist jetzt vollständig auf Englisch nutzbar. "
            "Im Header oben (und auf der Login-Seite oben rechts) liegt "
            "ein 1-Klick-Sprach-Switcher mit Flaggen 🇩🇪 DE · 🇬🇧 EN — "
            "deine Wahl wird im Browser gespeichert und beim nächsten "
            "Besuch übernommen.",
            "Beim allerersten Aufruf erkennt die App deine Browser-"
            "Sprache automatisch — englischsprachige Speedcuber landen "
            "direkt auf Englisch, alle anderen auf Deutsch. Du kannst "
            "die Sprache jederzeit über den Header umstellen, ohne dich "
            "neu anzumelden.",
            "Was alles übersetzt ist: Login + Register + Passwort-vergessen, "
            "der komplette Timer-Tab (Solve-Eingabe, Spacebar-Modus, Touch-"
            "Modus, Trainings-Sets), das gesamte Dashboard (Stats, Letzte "
            "Rekorde, Activity, News, WCA-Wettkämpfe, Achievements/"
            "Challenges-Übersicht, Multi-Compare), der Analyse-Tab "
            "(alle Charts, Solve-Liste, Filter, Solve-Detail), Trainer "
            "(Algorithm-Trainer, Daily Challenges, Achievements), Community "
            "(Friends, Leaderboard), die ganze Verwaltung (Sessions, "
            "Hardware, Meine Daten inkl. Gefahren-Bereich, Outliers, "
            "Einstellungen, Backup/Restore/Snapshots, Import/Export, "
            "Account-Settings), alle Toaster (Achievement / Challenge / "
            "PB), alle Modals (Feedback, Patch-Notes, Roadmap, Was-kann-"
            "diese-App), Onboarding und der globale Footer.",
            "Datums-Anzeigen folgen jetzt der gewählten Sprache: deutsch "
            "= 28.05.2026, englisch = 28 May 2026. Relative Zeit-Angaben "
            "(„vor 3 Tagen\" / „3 days ago\") ebenfalls. Zahlen-Formate "
            "und Plural-Formen passen sich an.",
            "Backend-Inhalte (z.B. Achievement-Texte, Patch-Notes-Historie) "
            "bleiben in der Sprache der Erstellung — neue Patch-Notes ab "
            "diesem Release ggf. bilingual.",
            "Unter der Haube: react-i18next mit ~1200 Strings in beiden "
            "Sprachen, browser-language-detector und persistenter "
            "Sprach-Wahl im localStorage. Bundle-statisch — keine "
            "Netzwerk-Roundtrips für Sprachwechsel.",
            "Sprint-Bilanz: in 3 Tagen wurden ~30 i18n-Wellen umgesetzt — "
            "der Audit-Trail dieser Einzel-Wellen ist im Admin-Changelog "
            "unter den intern markierten Einträgen einsehbar.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.i18n-footer-modals",
        released=date(2026, 5, 27),
        title="Feedback + Patch-Notes + Roadmap-Modal DE/EN",
        highlights=[
            "FeedbackModal: Header + Close-Aria, Intro, 2-Mode-Tabs "
            "(GitHub-Issue / Per Email), GitHub-Mode mit 3-Bullet-Liste "
            "+ 2 Action-Buttons, Email-Mode mit Type-Selector (3 Optionen "
            "Bug/Feature/Other), Message-Textarea + Placeholder + Char-"
            "Counter, Success/Error-Messages, Send/Cancel-Buttons, Rate-"
            "Limit-Note.",
            "PatchNotesPanel: Loading/Error/Empty-States, Header mit "
            "interpoliertem Entries-Count, „Aktuelle Version vom {date}\"-"
            "Zeile mit lokalisiertem Datum (de-DE vs en-GB), Internal-"
            "Badge + Tooltip, Commit-Hash-Tooltip.",
            "RoadmapModal: Title + Close-Aria + Feedback-Hint mit "
            "strong-Tag für „Feedback\"-Link, ItemRow Internal-Badge + "
            "Tooltip.",
            "Date-Locale für fmtDate() folgt jetzt `i18n.resolvedLanguage`.",
            "Locales-Namespaces neu: feedback + patchNotes + roadmap "
            "(~45 Strings).",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.i18n-solve-detail",
        released=date(2026, 5, 27),
        title="Solve-Detail + Session-Switcher DE/EN",
        highlights=[
            "SessionSwitcher: Loading-State, Label + All-Sessions-Option "
            "mit interpoliertem Count.",
            "SolveDetailModal: Header mit interpolierter Solve-ID + PB-"
            "Badge + Close-Aria, 2 Rolling-Average-Boxen (ao5/ao12 at "
            "time), 5 Meta-Rows (Cube-Type/Hardware/Session/+2/DNF) mit "
            "Ja/Nein/Yes/No-Werten + interpoliertem +2-Wert, Scramble + "
            "Notes-Labels, 5 Action-Buttons (+2 toggle / DNF toggle / "
            "delete with interpoliertem Time-Confirm / close).",
            "Locales-Namespaces neu: sessionSwitcher + solveDetail "
            "(~27 Strings).",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.i18n-friends",
        released=date(2026, 5, 27),
        title="Friends-Tab DE/EN",
        highlights=[
            "FriendsTab komplett übersetzt — 5 Sub-Komponenten + großes "
            "Onboarding-State-Handling.",
            "DiscoverabilityCard: 2 States (aktiv vs onboarding mit "
            "2-Step-Layout), Strong-Header + interpolierter Name, Aktions-"
            "Links (Display-Name ändern, deaktivieren), Step-Headings, "
            "Status-Badges (gesetzt/leer), 2-Mode-Title (need-Name vs "
            "ready), Error-Box mit Prefix.",
            "InlineNameEditor: Placeholder + Save-Button (Busy + ready) + "
            "Cancel-Button.",
            "SearchCard: Heading + InfoButton (multipart mit zwei strong-"
            "Tags für Display-Name/exakte Email-Pfade), 2 Such-Inputs "
            "(Display-Name + Email mit Submit-Button), 2 Result-Listen "
            "mit Loading/Empty-States + interpoliertem Query-String + "
            "Lookup-Not-Found-Text.",
            "SearchResultRow: 4 Relationship-States (none/outgoing_pending "
            "mit Cancel/incoming_pending/accepted), No-Display-Name-"
            "Fallback.",
            "PendingIncomingCard + PendingOutgoingCard: interpolierte "
            "Count-Headings, No-Name-Fallback, Accept/Decline/Withdraw-"
            "Buttons.",
            "FriendsListCard: interpolierte Count-Heading, Loading + "
            "Empty-States, No-Name-Fallback, Unfriend-Button mit Multi-"
            "interpoliertem Confirm-Dialog inkl. Fallback („diesem User\").",
            "Locales-Namespace neu: friends (~55 Strings).",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.i18n-community",
        released=date(2026, 5, 27),
        title="Community-Tab + Bestenliste DE/EN",
        highlights=[
            "CommunityTab: Sub-Tab-Bar lokalisiert (Freunde/Bestenliste) "
            "+ aria-label, useTranslation()-Hook ersetzt statischen "
            "SUB_TABS-Konstanten-Array.",
            "LeaderboardTab: Header + InfoButton + Cube-Type-Picker + "
            "No-Friends-Hinweis (multipart mit strong-Tag) + Error-Box "
            "(„Fehler/Error\" + Fallback-„Unbekannt/Unknown\") + Loading-"
            "State + Footer.",
            "Tabelle: leerer Zustand mit interpoliertem Cube + 8 Column-"
            "Headers (Rang/User/Best Single/Best AO5/Best AO12/Akt. AO5/"
            "Solves 30d/Zuletzt), Self-Badge („du/you\").",
            "fmtRelative(iso, t) nimmt jetzt t-Param: 6 lokalisierte "
            "Strings (heute, gestern, vor Xd/w/mo/y).",
            "Number-Formatter `toLocaleString(numberLocale)` mit "
            "dynamischer Auswahl (`en-GB` vs `de-DE`).",
            "Locales-Namespaces neu: communityTab + leaderboard "
            "(~30 Strings).",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.i18n-alg-trainer",
        released=date(2026, 5, 27),
        title="Algorithm-Trainer DE/EN",
        highlights=[
            "AlgTrainerPanel komplett übersetzt: Header + InfoButton, "
            "Case-Liste mit Never-Practiced-Hint, Empty-State (keine "
            "Case-Auswahl), Footer.",
            "DrillCard: Drill-Label + Scramble-Header + Show/Hide-"
            "Algorithmus-Toggle, Skip-Button mit Tooltip, Save-Button mit "
            "Busy-State, Error-Messages (Ungültige Zeit + Backend-Fehler-"
            "Prefix).",
            "DrillSolveList: Empty-State, Last-N-Header (interpoliert), "
            "+2/DNF/Delete-Tooltips, Delete-Confirm mit interpolierter ID.",
            "Locales-Namespaces neu: algTrainer + drillCard + drillSolves "
            "(~22 Strings total).",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.i18n-trainer-sub",
        released=date(2026, 5, 27),
        title="Trainer-Sub-Panels DE/EN",
        highlights=[
            "TrainerTab Sub-Tab-Bar lokalisiert (Heute / Algs / Erfolge) "
            "mit labelKey-Pattern + lokalisiertem aria-label.",
            "DailyChallengesPanel: Loading/Error-States, Header mit "
            "interpoliertem Count, InfoButton, Regenerate-Button (mit "
            "Busy-State + Tooltip), Empty-State, Footer.",
            "ChallengeCard: completed-Tooltip + Dismiss-Aria/Title.",
            "AchievementsCard: Loading/Error/Header/InfoButton/Recheck-"
            "Button mit Busy-State, Newly-Unlocked-Counter (interpoliert), "
            "5 Category-Labels (Volumen/Speed/Vielseitigkeit/Hardware/"
            "Konsistenz), Category-Counts, Footer, Tile-Tooltips "
            "(locked vs unlocked mit interpoliertem Datum).",
            "Helper-Refactor in lib/challenges.ts: CHALLENGE_LABELS-"
            "Konstante zu challengeLabel(kind, t)-Function, plus "
            "describeChallenge(c, t) + progressLabel(c, t) nehmen jetzt "
            "t-Param. 3 Konsumenten migriert (ChallengeCard, ChallengesMiniCard, "
            "ChallengeCompletionToaster).",
            "Locales-Namespaces neu: trainerTab, dailyChallenges, "
            "challengeCard, challenges, achievements (~50 Strings total).",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.i18n-features",
        released=date(2026, 5, 27),
        title="Marketing/Features-Texte DE/EN",
        highlights=[
            "features-data.ts auf react-i18next-Hook umgebaut: aus drei "
            "Konstanten-Exports (FEATURE_CATEGORIES + APP_TAGLINE + "
            "HERO_HIGHLIGHTS) wird ein `useFeatures()`-Hook der "
            "lokalisierte Daten liefert.",
            "Strukturelle Trennung: Category-Definitionen (titleKey + "
            "icon + bulletKeys) im File; eigentliche Texte in Locales "
            "unter Namespace `features.*`.",
            "8 Categories (Solving + Analyse + Trainer + Community + "
            "Hardware + Welt + Daten + Account) mit insgesamt ~50 Bullets "
            "übersetzt, plus Tagline + 4 Hero-Highlights für LoginPage.",
            "FeatureListPanel migriert: useFeatures()-Hook, plus Modal-"
            "Heading/Subheading/Footer aus Locale.",
            "LoginPage migriert: useFeatures() für Tagline + Hero-"
            "Highlights, behält alles dynamisch lokalisiert.",
            "Locales-Namespace neu: features (~60 Strings inkl. 50 "
            "Bullets, 8 Section-Titles, 1 Tagline, 4 Hero, 3 Modal-Meta).",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.i18n-account-settings",
        released=date(2026, 5, 27),
        title="Account-Settings DE/EN",
        highlights=[
            "AccountSettingsPanel komplett übersetzt: 4 Sektionen "
            "(Profil + Passwort + Email + Account-Löschen) plus "
            "Discoverability-Sub-Section.",
            "Profil: Email-Status-Badges (verifiziert / nicht verifiziert), "
            "Resend-Verify-Button, Anzeige-Name + PLZ + Land-Selector, "
            "WCA-Turnier-Geo-Hinweis (multipart: Intro + Body + Strong + "
            "Tail + Privacy), Speichern-Button.",
            "Discoverability: Heading + multi-em Beschreibung "
            "(Display-Name/Email em-tags) + Toggle-Label + No-Name-Warning "
            "+ 2 Info-Messages (active/inactive).",
            "Passwort/Email-Forms: Card-Titel, Placeholders, Submit-Buttons "
            "mit Busy-State, success-Messages (Password-Changed-Logout-Hint "
            "+ Email-Verify-Sent mit interpoliertem Empfänger).",
            "Danger-Section: Card-Titel + GDPR-Beschreibung + Multiline-"
            "Confirm-Dialog + Submit-Button.",
            "Helper-Refactor: extractErrorMessage(err, t) nimmt jetzt "
            "t-Param für Fallback („Unbekannter Fehler\").",
            "Locales-Namespace neu: accountSettings (~50 Strings).",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.i18n-settings-panel",
        released=date(2026, 5, 27),
        title="Settings-Panel DE/EN",
        highlights=[
            "SettingsPanel komplett übersetzt: 6 Sektionen (Spacebar-"
            "Timer / Inspection / Multi-Phase-Splits / Schrift-Größe "
            "Timer / Scramble-Bild / Schrift-Größe Drill).",
            "Spacebar-Section: InfoButton, Enable-Toggle, Hold-Time-"
            "NumberField.",
            "Inspection-Section: Enable-Toggle, Mode-Heading + zweiteilige "
            "Beschreibung (WCA-Empfehlung/Pragmatisch mit strong-Headern) "
            "+ Hinweis, 2-Mode-Buttons, Dauer-Field, Sound-Toggle, Audio-"
            "Mode-Selector mit 4 Optionen (Beep/DE/EN/Off) + TTS-Hinweis.",
            "Splits-Section: Enable-Toggle + Phasen-Count + Hint mit "
            "interpoliertem Max-Wert.",
            "Font-Sektionen: Beschreibungstexte + Section-Titel.",
            "Scramble-Bild-Section: Toggle mit langem Hint.",
            "Reset-Button mit Confirm-Dialog.",
            "Locales-Namespace neu: settingsPanel (~40 Strings).",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.i18n-outlier-card",
        released=date(2026, 5, 27),
        title="Outlier-Detection DE/EN",
        highlights=[
            "OutlierCard komplett übersetzt: Header mit Plural-aware "
            "Count („1 Solve\" / „N Solves\"), InfoButton + 2-Mode-Toggle "
            "(Median pro Cube / pro Session) mit Tooltips.",
            "Session-Filter-Selector + Empty-States (separate Strings für "
            "„keine Session-Auswahl\" vs „eine Session gewählt\") + Intro-"
            "Texte (zwei Varianten).",
            "Pro Group: Label-Fallback („Ohne Session\" / „Session #N\") + "
            "Median-Summary mit interpolierten Time + Count, pro Outlier "
            "Tooltip mit Faktor („Xx Median\" oder „N% des Medians\") + "
            "Label („verdächtig schnell/langsam\").",
            "Quick-Actions: DNF-Button mit Tooltip, Delete-Button mit "
            "interpoliertem Confirm-Dialog (ID + Zeit).",
            "Cleanup: alter Typo „Verdaechtige\" auf „Verdächtige\" korrigiert.",
            "Locales-Namespace neu: outlierCard (~25 Strings).",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.i18n-hardware-list",
        released=date(2026, 5, 27),
        title="Hardware-Inventar DE/EN",
        highlights=[
            "HardwareList komplett übersetzt: Header + InfoButton + "
            "Active/Total-Count + Add-New-Form (Name + Cube-Type + Create).",
            "Empty-State + Footer + Gruppen-Header mit pro-Cube-Active-"
            "Count im neuen Locale.",
            "Bulk-Aktionen pro Gruppe: aktivieren / deaktivieren / "
            "löschen-mit-Confirm-Dialog (interpolierter Count).",
            "Pro Row: Select-Aria, Rename-Inline-Edit + Notes-Inline-Edit "
            "+ Rename-Button + Active/Inactive-Toggle (mit Tooltips) + "
            "Delete-Confirm-Dialog (interpolierter Hardware-Name).",
            "Locales-Namespace neu: hardwareList (~30 Strings).",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.i18n-session-list",
        released=date(2026, 5, 27),
        title="Session-Verwaltung DE/EN",
        highlights=[
            "SessionList komplett übersetzt: Header + InfoButton + "
            "Add-New-Form (Name + Placeholder + Create-Button) + "
            "Empty-State.",
            "Pro Session-Eintrag: Rename-Inline-Edit + Notes-Inline-Edit "
            "+ csTimer-ID-Tooltip + Merge-/Delete-Buttons mit Titles.",
            "Delete-Modal mit Solve-Migrations-Wahl (orphan vs move to "
            "other session) inkl. Confirm-Buttons.",
            "Merge-Modal mit Target-Picker, „nicht umkehrbar\"-Hinweis, "
            "Cancel-/Submit-Buttons.",
            "Locales-Namespace neu: sessionList (~35 Strings).",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.i18n-backup-panel",
        released=date(2026, 5, 27),
        title="Backup-/Restore-/Snapshot-Panel DE/EN",
        highlights=[
            "BackupPanel komplett übersetzt: Header + InfoButton + "
            "3 Sektionen (Voll-Export / Restore aus Datei / Snapshots).",
            "Restore-Sektion: Mode-Picker (merge/replace), Confirm-"
            "Magic-String-Validation, Preview-vs-Apply-Buttons, "
            "Replace-Confirm-Placeholder mit interpoliertem Magic-String.",
            "Snapshots-Sektion: Max-Counter, Create-Button-State, "
            "Empty/Loading-States, Confirm-Dialogs für Restore + Delete.",
            "RestoreResultBox: Preview-/Done-Header, 4 Category-Lines "
            "(Solves/Sessions/Hardware/Achievements) mit Plural-aware "
            "Duplicate-Suffix, Auto-Snapshot-Notice + Newly-Unlocked-Liste.",
            "Date-Formatter folgt der UI-Sprache, extractErrorMessage "
            "nimmt fallback-Param.",
            "Locales-Namespace neu: backupPanel (~40 Strings).",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.i18n-import-export",
        released=date(2026, 5, 27),
        title="csTimer-Import + csTimer-Export DE/EN",
        highlights=[
            "ImportPanel: Header + InfoButton + Description + Warning + "
            "File-Input-Busy-Hint + Error + Done-Liste (5 Counter-"
            "Zeilen mit Plural).",
            "CsTimerExportPanel: Header + InfoButton + Description + "
            "Button-States (busy/idle) + Done-Message + Footer-Hint.",
            "Locales-Namespaces neu: importPanel / csTimerExport.",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.i18n-charts",
        released=date(2026, 5, 27),
        title="Analyse-Tab Charts (5 Karten) in Englisch",
        highlights=[
            "TrendsChart: Header, InfoButton, Singles-Toggle, Window-"
            "Picker, Y-Achsen-Auto-Range + manuelle Override-Inputs + "
            "Reset, Tooltip-Labels, Line-Namen (Single/ao5/ao12/ao100).",
            "PbProgressionCard: Header mit Plural-Count (Rekord/Rekorde), "
            "InfoButton, Empty-State, Tooltip-Labels, Line-Name.",
            "HistogramChart: Header mit Valid-Count, InfoButton, "
            "Empty-State, Bin-/Count-Tooltips.",
            "ActivityChart: Header, InfoButton, Granularity- + Range-"
            "Picker (Tag/Woche/Monat/30Tage/3Monate/etc.), Summary-Zeile "
            "mit Total/Average/Peak, Tooltip-Labels (Periode/valide/DNF), "
            "Bar-Namen (Valide/DNF), Footer-Hint.",
            "HardwareCompareCard: Header, InfoButton, No-Cube-Filter-"
            "Hint, 8 Spalten-Header (Hardware/PB/Mean/ao5/Best-ao5/ao12/"
            "Best-ao12/Solves), Sort-Indicator, Footer.",
            "Locales-Namespace neu: charts (~80 Strings).",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.i18n-multi-compare",
        released=date(2026, 5, 27),
        title="Vergleichs-Karte (Cube/Session) in Englisch",
        highlights=[
            "Multi-Compare-Karte (im Dashboard unter „Deine Performance\"): "
            "Header, InfoButton, Mode-Toggle (Cube-/Session-Vergleich), "
            "Loading- und Empty-States, Best-Today-Banner — alle Strings "
            "via t().",
            "Drilldown-Sektionen (Hardware pro Cube, Cubes pro Session): "
            "Header + Loading + Empty + PB/Mean-Labels durchgängig "
            "DE/EN.",
            "Form-Factor-Helper (formatFactorText) und Footer-Hint mit "
            "▼/▲-Erklärung übersetzt.",
            "Locales-Namespace neu: multiCompare (~26 Strings).",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.i18n-dashboard-sections",
        released=date(2026, 5, 27),
        title="Dashboard-Sektion-Überschriften in Englisch",
        highlights=[
            "User-Befund: „HEUTE\" und „DEINE PERFORMANCE\" "
            "(uppercase-Sektion-Header im Dashboard) waren noch deutsch.",
            "Vier Dashboard-Sektion-Titel (Heute / Deine Performance / "
            "Trainings-Antrieb / Speedcubing-Welt) standen hartkodiert "
            "in App.tsx — jetzt via dashboard.section*-Keys übersetzt.",
            "Damit ist das Dashboard auch beim Scan über die Sektion-"
            "Header durchgehend DE/EN-konsistent.",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.i18n-danger-zone",
        released=date(2026, 5, 27),
        title="Gefahren-Bereich-Karte in Englisch",
        highlights=[
            "Danger-Zone-Card (unten in Verwaltung → Meine Daten) komplett "
            "übersetzt: Header, Intro (mit „nicht rückgängig\"-Strong-Text), "
            "Backup-Prompt, 3x Done-Messages, generischer Error-Banner.",
            "Alle drei Lösch-Aktionen (Solves zurücksetzen / Tracking-Daten "
            "zurücksetzen / Account komplett löschen) inkl. Title + "
            "Description + Use-Case + Button-Label folgen jetzt der "
            "UI-Sprache.",
            "DangerAction-Sub-Komponente: 3 Tooltip-States (idle/armed/"
            "other-armed) und 3 Button-Label-States (idle/running/"
            "confirm) komplett DE/EN.",
            "Locales-Namespace neu: dangerZone (~26 Strings).",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.i18n-live-card",
        released=date(2026, 5, 27),
        title="Timer-Tab Live-Karte + Letzte-Solves-Tabelle in Englisch",
        highlights=[
            "User-Befund: „Live\" und „Letzte Solves\" Karten waren noch "
            "deutsch. Korrekt — die LastSolvesPreview-Komponente war "
            "bisher nicht übersetzt.",
            "Live-Karte (zeigt letzten Solve + Mo3/AO5/AO12/AO100 + Form-"
            "Vergleich vs. Mittel des Fensters): Header inkl. Cube-Type, "
            "InfoButton, Solve-Label, neue-PB-Badge, Window-Picker (letzte "
            "100/500/alle), Mittel-Anzeige und Quick-Action-Label — alles "
            "via t().",
            "Letzte-Solves-Tabelle: Header, InfoButton, Count-Selector, "
            "Spalten-Header (#/Zeit/Mo3/AO5/AO12), Empty-State, Sort-Hint, "
            "Delete-Confirm und Delete-Title.",
            "Locales-Namespace neu: lastSolvesPreview (~25 Strings).",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.i18n-verwaltung-1",
        released=date(2026, 5, 27),
        title="Verwaltung-Tab Header + Meine-Daten-Card in Englisch",
        highlights=[
            "Verwaltung-Sub-Tab-Bar komplett übersetzt: Sessions / "
            "Hardware / Meine Daten / Outliers / Einstellungen (+ "
            "Admin-Tab für Admin-User) folgen jetzt der UI-Sprache.",
            "Meine-Daten-Card (oben im Daten-Sub-Tab): Header, "
            "Sub-Title, alle 4 Ownership-Bullets, Backup-Download-"
            "Button und Fehler-Meldung — komplett DE/EN.",
            "Format-Hint-Block im Daten-Tab (Cubetracker-Backup vs "
            "csTimer-Export) ebenfalls übersetzt.",
            "Restliche Sub-Panels (Backup/Import/CsTimer-Export/Danger-"
            "Zone/SessionList/HardwareList/Settings/AccountSettings/"
            "Outlier/Admin) folgen in weiteren Wellen.",
            "Locales-Namespaces neu: verwaltung / meineDaten.",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.i18n-toaster",
        released=date(2026, 5, 27),
        title="Achievement-/Challenge-/PB-Toaster in Englisch",
        highlights=[
            "Achievement-Toaster (gelb unten rechts bei Solve-Save): "
            "Header, Close-ARIA und Bulk-Counter (+N weitere Erfolge) "
            "folgen jetzt der UI-Sprache. Achievement-Namen und "
            "Beschreibungen kommen weiterhin vom Backend.",
            "Challenge-Completion-Toaster (grün unten links): Header "
            "mit Challenge-Label, Close-ARIA und Bulk-Counter.",
            "PB-Confetti-Overlay (Mitte oben bei Personal-Best): "
            "Header und Perfect-Storm-Label plus die „Single + Ao5 + "
            "Ao12 PB\"-Zusammensetzung folgen der Sprache.",
            "Locales-Namespaces neu: toasterAchievement / "
            "toasterChallenge / toasterPb (10 neue Strings).",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.i18n-timer-complete",
        released=date(2026, 5, 27),
        title="Timer-Tab wirklich komplett DE/EN (Spacebar/Touch/Set + Info-Popups)",
        highlights=[
            "Spacebar-Timer-Card komplett übersetzt: alle Hint-Labels "
            "für Idle/Inspection/Ready/Running/Stopped (jeweils mit "
            "WCA- und Pragmatisch-Variante), die „Phase X/Y\"-Anzeige "
            "bei Splits-Mode und der „Inspection überschritten\"-Title.",
            "Touch-Timer-Pad (Phone-Eingabe „Tippen & halten — wie "
            "Space\"): Label und ARIA jetzt sprachabhängig.",
            "Session-Plan-Card („Trainings-Set\"): Header + InfoButton-"
            "Text + Plan-Picker + Start-/End-Buttons + Progress-Anzeige "
            "+ End-Feedback-Modal mit allen Stat-Labels und allen "
            "Coaching-Texten (von „Solides Set\" bis „Hohe DNF-Quote — "
            "Konzentration vor Speed\").",
            "InfoButton-Komponente: Default-ARIA-Label „Mehr Info\" + "
            "Mobile-Close-ARIA folgen jetzt der UI-Sprache (vorher hart "
            "deutsch — die Popup-Inhalte waren je nach Card schon "
            "übersetzt, aber Trigger + Close-Button nicht).",
            "Locales-Namespaces neu: info / touchTimer / spacebarTimer "
            "/ trainingSet (44 neue Strings gesamt).",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.i18n-jsonfix-qa",
        released=date(2026, 5, 27),
        title="QA-Hotfix: i18n-Locales-JSON parsbar machen",
        highlights=[
            "Mini-QA fand: 4 un-escaped ASCII-Quotes in de.json:201+203 "
            "(scramble.infoBody1 + scramble.infoBody2 mit „L'\", „Skip\", "
            "„WCA\", „Inoffiziell\"). Python-JSON-Parser bricht dort ab.",
            "Effekt im Live-Bundle: Vite hat den Parse-Error silent "
            "geschluckt, das resulting Object war truncated → alle "
            "Locale-Keys NACH dem Bruch fehlten. Tabs/UserMenu waren "
            "übersetzt (kommen VOR dem Bruch), alles andere blieb DE.",
            "Fix: ASCII-Quotes mit \\\" escaped, analog zu allen anderen "
            "Stellen in der Datei. Beide Locales parsen jetzt sauber, "
            "315 Keys in beiden, symmetrisch.",
            "Symmetrie-Check + Untranslated-Detection: alle 30 identischen "
            "DE=EN-Strings sind legitim (Cubing-Termini, Tech-Begriffe, "
            "Symbol-/Emoji-Strings).",
            "TODO als Backlog-Item: einen JSON-Parser-Lint im pre-commit-"
            "Hook ergänzen, damit das nicht wieder durchrutscht.",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.i18n-dashboard",
        released=date(2026, 5, 27),
        title="Restliche Dashboard-Karten DE/EN — Dashboard komplett",
        highlights=[
            "ActivityCard (Heute + Diese Woche) inkl. Cube-Top-3-Liste, "
            "Mean/ao5-Labels und „+N weitere\"-Counter mit Plural-Form.",
            "NewsCard: Header + InfoButton + Loading/Empty/Error-States, "
            "plus die relative Datums-Anzeige (jetzt / vor Xm / vor Xh / "
            "vor Xd) folgt jetzt der UI-Sprache statt hartkodiert „de-DE\".",
            "WcaUpcomingCard: Header + InfoButton + Distanz-Picker-ARIA, "
            "Profile-Incomplete-Hint, Empty-Worldwide-Hint, Standort/"
            "Total/Länder-Label und Event-Plural — alles übersetzt. "
            "Monatsnamen im DateRange folgen jetzt der gewählten Sprache.",
            "AchievementsMiniCard + ChallengesMiniCard (Trainer-Quick-"
            "Looks im Dashboard): Empty-States, InfoTexte, „Alle ansehen"
            "\"-Links — alle Strings i18n.",
            "Damit ist die Dashboard-First-Look-Sicht (Onboarding + "
            "Stats + Recent-Records + Reminders + Activity + News + WCA "
            "+ Achievements + Challenges) komplett DE/EN-konsistent.",
            "Locales-Namespaces neu: activity / news / wca / "
            "achievementsMini / challengesMini.",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.i18n-auth-pages",
        released=date(2026, 5, 27),
        title="Auth-Folge-Seiten + Onboarding-Banner in Englisch",
        highlights=[
            "Reset-Password-Seite (Landing nach „Passwort vergessen\"-"
            "Mail) komplett übersetzt: Fehlende-Token-Hinweis, Done-"
            "State, Form-Labels + Buttons.",
            "Email-Verify-Seite (Landing nach „Bestätige deine Email\"-"
            "Mail) inkl. Running-/OK-/Fail-States + Retry-Hint.",
            "Onboarding-Banner (zeigt sich bei leerer Datenbank): "
            "Willkommens-Titel, drei Quick-Action-Buttons, csTimer-"
            "Import-Tipp, Dismiss-Aria-Label.",
            "Locales-Namespaces neu: authPages.* + onboarding.*.",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.i18n-list",
        released=date(2026, 5, 27),
        title="Solve-Liste + Filter-Bars in Englisch verfügbar",
        highlights=[
            "SolveList komplett übersetzt — Spalten-Header (#/Zeit/Mo3/"
            "AO5/AO12/AO100/Cube/Hardware/Aktionen), alle Tooltips "
            "(PB-Stern, Old-PB, ao5/ao12-Marker, Inline-Edit-Hint), "
            "Action-Buttons (Details/+2/DNF/Löschen) inkl. Confirm-"
            "Dialog, Limit-Picker und Footer-Tipp.",
            "Filter-Bars im Analyse-Tab und im Dashboard durchgängig "
            "DE/EN: Filter-Label, Cube/Session-Selektoren, „Alle\"-"
            "Options, Reset-Buttons.",
            "Locales-Namespaces neu: solveList.* (35 Strings) + "
            "filters.* (7 Strings, geteilt zwischen Analyse- und "
            "Dashboard-Filter-Bar).",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.i18n-stats",
        released=date(2026, 5, 27),
        title="Dashboard-Statistik-Karten in Englisch verfügbar",
        highlights=[
            "Statistiken-Karte (Best/Worst/Mean + alle aktuellen + "
            "besten Averages inkl. Datums-Suffix bei Best-AOs) komplett "
            "übersetzt. Filter-Label (Cube/Session/Alle Solves) passt "
            "sich der Sprache an.",
            "Letzte-Rekorde-Karte: alle Strings durchgeschaltet inkl. "
            "Empty-State-Erklärung, InfoButton-Text, Age-Label (heute/"
            "gestern/vor X Tagen) und Kind-Badges (Single/ao5/ao12).",
            "Reminders-Karte (Cubes-länger-nicht-trainiert): alle "
            "Strings + die Tage/Wochen/Monate/Jahre-Formatierung in "
            "der jeweiligen Sprache. Plural-Form für Cube-Counter.",
            "Locales-Namespaces neu: stats.*, recentPbs.*, reminders.*.",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.i18n-timer",
        released=date(2026, 5, 27),
        title="Timer-Tab komplett auf Englisch verfügbar",
        highlights=[
            "Der gesamte Solve-Flow ist jetzt durchschaltbar (DE/EN): "
            "Timer-Eingabe (Text-Mode + Spacebar-Mode-Hinweise), Save-/"
            "Penalty-Buttons, Letzter-Solve-Quick-Actions, alle Fehler-"
            "Meldungen.",
            "Scramble-Karte komplett übersetzt: Titel, Skip-Button, "
            "WCA/Inoffiziell-Toggle, Type-Picker, Eigene-Scramble-Eingabe "
            "inklusive Apply/Cancel + Validierungs-Hinweis, Random-Move-"
            "Warnhinweis. Lange Info-Texte ebenfalls.",
            "Timer-Controls (Cube/Session/Hardware-Selektor + Inline-"
            "Session-anlegen + Timer-Modus-Picker mit allen drei Info-"
            "Texten) durchgängig in beiden Sprachen.",
            "Health-Badge + die zwei Close-Buttons in den Modals "
            "(Patch-Notes + Features) jetzt ebenfalls i18n-fähig.",
            "Locales-Namespaces neu: timer.*, scramble.*, timerControls.*, "
            "health.* — jede Komponente hat ihren eigenen Block, damit "
            "die JSON-Files lesbar bleiben.",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.i18n-flags",
        released=date(2026, 5, 27),
        title="Flaggen-Sprach-Switcher im Header + ChatGPT-Logo-Hinweis",
        highlights=[
            "Sprach-Switcher mit Flaggen (🇩🇪 DE · 🇬🇧 EN) im Header — "
            "auf jeder Seite oben sichtbar, 1-Klick zwischen Deutsch und "
            "Englisch. Auch auf der Login-Seite oben rechts in der "
            "Anmelde-Karte, damit englischsprachige Speedcuber den "
            "Switcher schon vor dem Login finden.",
            "Der bisherige Switcher im User-Menu bleibt als zweite "
            "Option erhalten — sichtbar im Header, diskret im Menu.",
            "Hinweis: auf Windows-Chrome werden die Emoji-Flaggen als "
            "Buchstaben-Boxen gerendert (Browser-Eigenheit). Daneben "
            "stehen DE/EN als Text-Kürzel, also bleibt die Bedienung "
            "auch dort eindeutig.",
            "Ergänzung im Impressum: das App-Logo wurde mit "
            "ChatGPT/DALL·E erstellt — Transparenz analog zum bereits "
            "dokumentierten KI-unterstützten Code, auch für visuelle "
            "Marken-Assets.",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.i18n-loginpage",
        released=date(2026, 5, 27),
        title="LoginPage + globaler Footer auf Englisch verfügbar",
        highlights=[
            "Die Anmelde-/Registrierungs-/Passwort-vergessen-Seite ist "
            "jetzt komplett durchschaltbar (DE/EN): Formular-Labels, "
            "Buttons, Tab-Switcher (Login/Registrieren), Forgot-Password-"
            "Hinweis, Logo-Alt-Text — alles durch t().",
            "Auch der globale Footer im eingeloggten Zustand ist "
            "übersetzt: 'Was kann diese App?' / 'Roadmap' / 'Feedback' / "
            "'Impressum' / 'Datenschutz' / 'Mehr Optionen oben rechts im "
            "User-Menu'.",
            "Marketing-Tagline + Hero-Highlights auf der rechten Seite "
            "der Login-Page bleiben in dieser Welle noch deutsch — werden "
            "in einer separaten Welle aus features-data.ts gehoben.",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.i18n-setup",
        released=date(2026, 5, 27),
        title="Erste Englisch-Variante + Sprach-Switcher + KI-Transparenz",
        highlights=[
            "Sprach-Switcher im User-Menu (DE/EN) — Vorbereitung auf das "
            "WCA-Turnier-Demo in Meppel am Wochenende. Erster Teil der "
            "Englisch-Variante: TabBar (Labels + Beschreibungen + ARIA) "
            "und das komplette User-Menu sind durchgängig übersetzt.",
            "Browser-Sprach-Auto-Detect: wenn dein Browser auf Englisch "
            "steht, startet die App jetzt auf Englisch — ansonsten Deutsch. "
            "Deine Wahl wird im localStorage persistiert (Key: "
            "cubetracker_language).",
            "Weitere Übersetzungen (Solve-Flow, Stats-Labels, Trainer, "
            "Verwaltung, Achievements-Titel) folgen in den nächsten "
            "Tagen. Patch-Notes-Historie bleibt deutsch — neue Notes "
            "ab dem englischen Release ggf. bilingual.",
            "KI-Transparenz-Hinweis im Impressum: explizit dokumentiert, "
            "dass die App mit KI-Unterstützung (Claude/Anthropic) "
            "entwickelt wurde, sämtlicher Code aber vom Betreiber "
            "manuell freigegeben wird. Innerhalb der App werden keine "
            "Inhalte durch KI generiert — alles regelbasiert. "
            "Vorbereitung auf Art. 50 EU-KI-Verordnung (anwendbar ab "
            "2. August 2026).",
            "Unter der Haube: react-i18next + i18next-browser-"
            "languagedetector, nested namespaces in locales/de.json + "
            "en.json. Resource-Datei wächst mit jedem Übersetzungs-"
            "Pass — Live-Add ohne Neu-Deploy nicht möglich, dafür "
            "bundle-statisch (schneller).",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.roadmap-intern",
        released=date(2026, 5, 27),
        title="Roadmap aufgeräumt: nur noch User-relevante Items",
        highlights=[
            "Das Roadmap-Modal zeigt jetzt nur User-relevante Features. "
            "Reine Entwickler-/Tech-Schuld-Themen (Backend-Test-Suite "
            "einführen, Alembic statt Inline-Migrations, csTimer-Bundle "
            "dynamic-importen, Random-Move-Fallback) sind aus deiner "
            "Sicht ausgeblendet — sie tauchen nur noch im Admin-View "
            "mit amber intern-Badge auf.",
            "Aufräum-Bonus: das Duplikat in P1 ist weg, und das gestern "
            "gebaute Dashboard-Letzte-Rekorde-Item ist endlich auch in "
            "der Roadmap als erledigt markiert.",
            "Features-Liste wurde unangetastet gelassen — die Bullets "
            "dort sind sowieso reine Marketing-Texte, kein Tech-Kram "
            "zwischendrin.",
            "Kein neuer Backend-Endpoint nötig: der Filter passiert "
            "client-seitig anhand deines Admin-Status. Roadmap ist kein "
            "Secret, sondern eine Sichtbarkeits-Kuration.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.recent-pbs-qa",
        released=date(2026, 5, 27),
        title="QA-Hotfix nach Recent-PBs (3 SOLLTE + 1 NICE)",
        highlights=[
            "Sub-Agent-Review fand 3 SOLLTE + 2 NICE, kein KRITISCH. "
            "Cross-User-Filter ist lueckenlos (POSITIV).",
            "Memory-Footprint: load_only(...) auf das Solve-Select in "
            "/stats/recent-pbs — laedt nur die 6 noetigen Spalten statt "
            "voller ORM-Objekte (Zeitbombe-Pattern bei aktiven Usern mit "
            "50k+ Solves).",
            "Keyboard-Accessibility in RecentRecordsCard: clickable li-"
            "Elemente haben jetzt role=button + tabIndex + Enter/Space-"
            "Handler + focus-ring. Tab-Navigation funktioniert.",
            "Timezone-Guard im Frontend: defensive Z-Suffix-Ergaenzung "
            "beim Age-Label, falls Backend mal naive ISO-Strings liefert "
            "(kein Drift mehr durch Browser-Lokalzeit-Interpretation).",
            "EMPTY_RECENT_PBS-Stub: limit wird jetzt aus dem Hook-Param "
            "uebernommen statt hartkodiert 5 — Stub-Response stimmt mit "
            "Request ueberein.",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.recent-pbs",
        released=date(2026, 5, 27),
        title="Dashboard: Letzte Rekorde auf einen Blick",
        highlights=[
            "Neue Karte Letzte Rekorde oben in der Deine-Performance-Sektion "
            "des Dashboards. Zeigt deine 5 jüngsten persönlichen Bestzeiten "
            "über alle Cubes hinweg — Single, ao5 und ao12 in einem Strang, "
            "chronologisch absteigend.",
            "Pro Eintrag: Metrik-Badge (gold ★ Single, cyan ● ao5, emerald "
            "● ao12), Cube-Type, Zeit, Δ-Verbesserung gegenüber deinem "
            "vorigen PB derselben Metrik, plus Alter (heute / gestern / "
            "vor X Tagen).",
            "Klick auf einen Eintrag wechselt zum Analyse-Tab mit gesetztem "
            "Cube-Filter — dort siehst du den vollen PB-Verlauf-Chart für "
            "diesen Cube.",
            "Unter der Haube: neuer Backend-Endpoint /stats/recent-pbs, der "
            "pro Cube-Type die PB-Progression berechnet und die N jüngsten "
            "Ereignisse chronologisch zusammenführt.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.danger-zone-qa",
        released=date(2026, 5, 27),
        title="QA-Hotfix nach Danger-Zone-Welle",
        highlights=[
            "Sub-Agent-Review fand 3 SOLLTE + 2 NICE — alle gefixt, kein KRITISCH.",
            "Sessions + Achievements-Cache wird nach 'Solves zuruecksetzen' "
            "jetzt invalidiert (vorher zeigten Sessions veraltete Solve-Counts "
            "bis zum Hard-Reload).",
            "Rate-Limit (5/Minute) auf reset-solves + reset-tracking-Endpoints "
            "— verhindert, dass ein kompromittiertes Token in einer Schleife "
            "DELETE-Batches abfeuert.",
            "DangerZoneCard: andere Buttons sind gesperrt waehrend ein Button "
            "armed ist (kein Doppel-Armen moeglich); Backup-Fehler werden jetzt "
            "sichtbar gemeldet; useDeleteAccount nutzt window.location.replace "
            "statt href (kein History-Eintrag fuer den geloeschten Account).",
            "Docstring-Hinweis im reset-tracking-Endpoint zur Hardware-FK-"
            "Semantik (SET NULL, kein separater DELETE noetig).",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.danger-zone",
        released=date(2026, 5, 27),
        title="Meine Daten: Gefahren-Bereich für volle Datenhoheit",
        highlights=[
            "Neue Sektion am Ende des Meine-Daten-Tabs: drei abgestufte "
            "Lösch-Aktionen, jede mit 2-Klick-Bestätigung und prominentem "
            "Backup-Hinweis (5 Sekunden Auto-Reset des armed-Buttons, "
            "falls du den ersten Klick aus Versehen machst).",
            "Solves zurücksetzen — alle deine Solves weg, Sessions, "
            "Hardware und Achievements bleiben. Ideal um nach Test-Imports "
            "mit deinem realen Hardware-Setup neu anzufangen.",
            "Tracking-Daten zurücksetzen (Reset to factory) — Solves + "
            "Sessions + Achievements + Daily-Challenges-Historie weg, "
            "Account und Cube-Sammlung bleiben. Für den kompletten "
            "Neustart mit behaltenem Setup.",
            "Account komplett löschen — DSGVO-konform alle Daten inkl. "
            "Login weg. Funktion gab es bisher nur in den Account-"
            "Einstellungen, jetzt zusätzlich auch hier sichtbar (gehört "
            "thematisch zur Datenhoheit).",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.avg-pb-dots",
        released=date(2026, 5, 27),
        title="ao5- und ao12-Bestzeiten in der Solve-Liste markiert",
        highlights=[
            "Neuer farbiger Punkt an jeder ao5/ao12-Zahl, die zum Zeitpunkt "
            "ihres Setzens ein Best-Avg war: cyan ● bei ao5-PB-Ankern, "
            "emerald ● bei ao12-PB-Ankern. Aktueller best Avg + alle "
            "frueheren (inzwischen ueberbotenen) sind markiert.",
            "Single-PB-Marker (gold ★ aktuell / ☆ alt) bleibt unveraendert. "
            "Damit hat jede der drei wichtigen Solve-Metriken eine eigene "
            "visuelle Markierung in der Solve-Liste.",
            "Tooltip beim Hover zeigt, ob es der aktuelle oder ein "
            "historischer Best-Avg war. Anker = letzter Solve im "
            "Best-Window (= der Solve, mit dem dieser Avg erzielt wurde).",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.patchnotes-intern-qa",
        released=date(2026, 5, 26),
        title="QA-Hotfix nach Patch-Notes-Intern-Welle",
        highlights=[
            "Sub-Agent-Review der Patch-Notes-Intern-Welle hat 3 SOLLTE + "
            "2 NICE gefunden, alle sofort gefixt.",
            "current_version() (Source-of-Truth fuer __version__ + /api/health) "
            "skippt jetzt internal-Eintraege automatisch — kein Leak mehr, "
            "falls ein interner Eintrag mal an Position 0 landet.",
            "get_current_user_optional protokolliert kaputte/manipulierte "
            "Tokens jetzt mit logger.warning (nur Exception-Klassen-Name, "
            "kein Token-Inhalt) — Defense-in-Depth fuer den Audit-Log.",
            "Duplikat-Check-Assert am data.py-Ende faengt versehentliche "
            "doppelte version-Strings beim FastAPI-Import.",
            "Hygiene: list(pn.highlights) raus (Dataclass ist frozen, "
            "defensive copy unnoetig). Doku in patch-notes-writer.md "
            "ergaenzt um die current_version()-Konvention.",
        ],
        internal=True,
    ),
    PatchNote(
        version="2.0.0-alpha.W.patchnotes-intern",
        released=date(2026, 5, 26),
        title="Patch Notes aufgeräumt: nur noch User-relevante Einträge",
        highlights=[
            "Die Patch-Notes-Seite zeigt jetzt nur noch Einträge, die die "
            "App-Erfahrung sichtbar verändern — neue Features, UI-Refactors, "
            "Bug-Fixes mit User-Impact. Rein technische QA-/Methodik-/"
            "Tooling-Wellen sind ausgeblendet, damit der Changelog wieder "
            "wie eine Feature-Geschichte liest und nicht wie ein Build-Log.",
            "25 bestehende Einträge wurden als „intern\" markiert: QA-Wellen "
            "(umlauts-qa, mobile-qa, wca-news-qa, …), Admin-only-Features "
            "(live-tests, admin-toggle, admin-1/-2), Backend-Vorbereitungen "
            "ohne sichtbares Frontend (news-backend, wca-comps-backend) "
            "und Hotfix-Postmortems (deploy-fix, revert-cstimer). Admins "
            "sehen weiterhin alle Einträge inkl. „intern\"-Badge.",
            "Unter der Haube: neues internal-Flag im PatchNote-Schema plus "
            "ein optional-auth-Endpoint, der die Filterung serverseitig "
            "macht (Anonyme sehen nur public-Einträge, Admins alle inkl. Flag).",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.meine-daten",
        released=date(2026, 5, 25),
        title="Meine Daten — deine Daten gehören dir",
        highlights=[
            "Neuer Bereich Verwaltung → 'Meine Daten': ein Klick lädt ein "
            "vollständiges Backup all deiner Solves, Sessions, Hardware und "
            "Achievements als offenes JSON herunter.",
            "Klare Botschaft dahinter: du behältst die volle Kontrolle — "
            "jederzeit exportieren, wieder importieren oder den Account komplett "
            "löschen. Zusätzlich sichern wir die Datenbank täglich automatisch "
            "(Server in Deutschland/EU).",
        ],
        commit="0c1169d",
    ),
    PatchNote(
        version="2.0.0-alpha.W.legal",
        released=date(2026, 5, 25),
        title="Impressum & Datenschutzerklärung",
        highlights=[
            "Impressum und Datenschutzerklärung sind jetzt über die "
            "Footer-Links erreichbar — auch ohne Login.",
            "Kein Cookie-Banner nötig: cubetracker nutzt nur ein technisch "
            "notwendiges Login-Cookie und kein Tracking. Keine Analyse- oder "
            "Werbe-Dienste von Drittanbietern.",
        ],
        commit="5747ea3",
    ),
    PatchNote(
        version="2.0.0-alpha.W.hetzner",
        released=date(2026, 5, 22),
        title="Eigene Infrastruktur (Hetzner Cloud, EU)",
        highlights=[
            "cubetracker läuft jetzt auf einer eigenen Hetzner-Cloud in "
            "Deutschland (EU) — mit eigener Domain, HTTPS und täglichen "
            "Backups. Alle Daten wurden 1:1 übernommen.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.pb-history",
        released=date(2026, 5, 20),
        title="Alle PBs sichtbar + PB-Verlauf-Chart",
        highlights=[
            "User-Wunsch: nicht nur die aktuelle Bestzeit, sondern JEDE Zeit, "
            "die zum Zeitpunkt ihres Setzens ein persönlicher Rekord war, wird "
            "in der Solve-Liste als PB markiert. Aktueller Allzeit-PB kräftig "
            "gold (Stern ★), alte (inzwischen überbotene) PBs dezent (☆).",
            "Neuer 'PB-Verlauf'-Chart im Analyse-Tab: die absteigende Treppe "
            "deiner Rekorde über die Zeit. Umschaltbar zwischen Single, ao5 und "
            "ao12 — so siehst du deine Verbesserung auf einen Blick.",
            "Die PB-Progression wird serverseitig über ALLE Solves des aktuellen "
            "Filters berechnet (nicht nur das geladene Listen-Fenster), damit "
            "auch sehr alte Rekorde korrekt erscheinen. DNF zählt nicht, +2 wird "
            "als Effektivzeit gewertet.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.umlauts-qa",
        internal=True,
        released=date(2026, 5, 19),
        title="Umlaut-Nachzieher (Bestätigung, Lädt, zwölf, …)",
        highlights=[
            "Folge-Welle zur grossen Umlaut-Migration. User-Befunde nach "
            "Deploy: 'Laedt…' im Boot-Splash + Backup-Loading, 'Bestaetigung' "
            "unter /Verwaltung/Daten, 'zwoelf' als Voice-Alert-String.",
            "Audit-Skript extrahiert alle Worte mit ae/ue/oe-Pattern, "
            "filtert english/Code-Identifier raus, listet echte deutsche "
            "Treffer. Damit drei zusätzliche Skript-Pässe mit erweiterter "
            "Wortliste durchgenudelt.",
            "Direkt User-relevante Fixes: Bestaetigung → Bestätigung (5×), "
            "zwoelf → zwölf (Voice-Alert auf DE), Loescht → Löscht, "
            "Empfaenger → Empfänger, Schaetzung → Schätzung. Plus alle "
            "Endungen (noetig/laeuft/zusaetzlich/pruefen/ungueltig/Laender/"
            "zuruecksetzen/druecken/Granularitaet/uebrig/fehlschlaegt/"
            "muehsam/Rueckgabe/faellt/unterstuetzt/zukuenftig/erhoeht/...).",
            "Gesamt 487 weitere Replacements über 102 Files in 3 Pässen, "
            "plus 5 manuelle Edits für die letzten Rest-Vorkommen.",
            "Verbleibende Audit-Treffer sind alle false positives: "
            "englisch (Query/Request/Issue/continue), Code-Identifier "
            "(target_value, requester_id, github_issue_*), und deutsche "
            "Worte ohne Umlaut (neu*/aktuell*/manuell/Quelle/visuell/"
            "Sequenz/feuer*/Dauer).",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.umlauts",
        released=date(2026, 5, 17),
        title="Umlaute zurück (ä, ö, ü, ß) auf der gesamten Webseite",
        highlights=[
            "User-Wunsch: deutsche Texte sollen wieder mit Umlauten "
            "geschrieben werden, nicht mit den ASCII-Substituten "
            "(ae/ue/oe/ss). Betrifft alle User-sichtbaren Strings — "
            "UI-Labels, Tooltips, Patch-Notes, Roadmap, Features-Liste.",
            "1417 Ersetzungen über 140+ Files (Frontend .ts/.tsx + "
            "Backend .py). Skript-getrieben mit kuratierter Wortliste "
            "von ~250 deutschen Worten und deren ASCII-Vorgänger-Form.",
            "Sicher gehalten: Vendor-Files (cstimer-vendor/ + "
            "scrambow-patched.*) bleiben unangetastet — GPL-Code und "
            "3rd-Party-Patches in Originalschreibweise. Tests 158/158 "
            "weiterhin grün, Backend startet sauber.",
            "Konvention ab jetzt: deutsche Texte mit Umlauten + ß. "
            "Code-Identifier (Variablen, Funktionen, Konstanten) "
            "bleiben weiterhin ASCII — kein 'Größe = ...' als "
            "Variable-Name.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.admin-workflow-qa",
        internal=True,
        released=date(2026, 5, 17),
        title="QA-Fixes auf Admin-Workflow (2 KRITISCH + 4 SOLLTE + 2 NICE)",
        highlights=[
            "Sub-Agent-QA der 3 Admin-Phasen hat 2 KRITISCH + 7 SOLLTE + "
            "5 NICE gefunden. Davon 2 KRITISCH + 4 wichtigste SOLLTE + "
            "2 NICE sofort gefixt, 2 SOLLTE als Roadmap.",
            "KRITISCH #1: Race-Condition beim 'letzter Admin'-Safeguard "
            "wurde mit SELECT ... FOR UPDATE behoben. Zwei parallele "
            "Demotes auf den vorletzten Admin können jetzt nicht mehr "
            "beide durchgehen — Lock greift, zweiter Request wartet + "
            "sieht aktualisierten Stand. Postgres-native row-level locking.",
            "KRITISCH #2 (Alembic-Replacement): aufgeschoben als Roadmap-"
            "Item in P6. Risiko aktuell niedrig (IS_PROD-Gate + Postgres-"
            "Prod), aber Lesson notiert.",
            "SOLLTE: responded_at wird jetzt NUR bei Status-Change "
            "überschrieben, nicht bei reinen Notiz-Updates. 'Wann war "
            "der Test wirklich' bleibt stabil.",
            "SOLLTE: GitHub-API-Calls jetzt asynchron via FastAPI-"
            "BackgroundTasks mit eigener DB-Session. User-Response geht "
            "sofort raus, kein Worker-Block bei GitHub-Latenz oder "
            "Rate-Limits.",
            "SOLLTE: GitHub-API-Error-Bodies werden NICHT mehr geloggt "
            "(defense-in-depth gegen hypothetische Token-Reflektion). "
            "Nur Status-Code + Reason + Exception-Klassen-Name.",
            "SOLLTE: confirm()-Dialog in AdminLiveTestsPanel raus, "
            "2-Klick-Pattern rein (analog BigTimerInput-Fix). Button "
            "wechselt zu 'Wirklich?' (rot-pulsierend), 5s-Auto-Reset.",
            "NICE: Skip-Filter-Pill in der Liste ergänzt. "
            "title[:256] statt vorher willkuerlichem [:200].",
            "Roadmap-Items neu: Backend-Test-Suite einfuehren (aktuell "
            "0% Test-Coverage auf Backend!) + Alembic-Migration "
            "statt inline ALTER TABLE.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.live-tests-github",
        internal=True,
        released=date(2026, 5, 17),
        title="Live-Test-FAIL → automatisches GitHub-Issue (Phase 3 von 3)",
        highlights=[
            "Schliesst den Live-Test-Loop. Bei FAIL + Notiz wird "
            "automatisch ein GitHub-Issue im Repo erstellt — der nächste "
            "Fix-Schritt landet sofort als trackbares Issue.",
            "Neues Modul: services/github.py mit create_issue() + "
            "add_comment(). Nutzt httpx (haben wir schon), GitHub-API-"
            "Version 2022-11-28. 8s Timeout.",
            "Konfiguration: Env-Var GITHUB_TOKEN (Personal Access Token "
            "mit repo-Scope) + optional GITHUB_REPO (default "
            "'fischehaus/cubetracker'). Setze auf Render unter "
            "Environment-Tab.",
            "Workflow: Admin markiert Test als FAIL + schreibt Notiz → "
            "Backend baut strukturierten Issue-Body (Beschreibung + "
            "Notiz + Welle/Commit/Tag-Kontext) → create_issue mit "
            "Labels 'live-test-fail' + 'automated' + 'phase:W.xyz'. "
            "Issue-URL + Nummer wird in DB gespeichert.",
            "Update-Logik: bei späteren PATCHes auf einem bereits-FAIL-"
            "Test mit existierendem Issue → add_comment() statt erneutem "
            "create. So bleibt der Issue-Thread synchron mit den Admin-"
            "Notizen.",
            "Graceful Degradation: ohne GITHUB_TOKEN funktioniert alles "
            "normal, nur ohne Issue-Verknüpfung. Bei Network-Errors / "
            "Rate-Limits: Test wird trotzdem gespeichert, nur Warning "
            "im Log.",
            "Damit ist der Admin-Workflow-Refactor (3 Phasen seit "
            "heute Mittag) abgeschlossen: Admin-User-Toggle + Live-Test-"
            "Liste + GitHub-Sync.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.live-tests",
        internal=True,
        released=date(2026, 5, 17),
        title="Live-Test-Liste im Admin-Bereich (Phase 2 von 3)",
        highlights=[
            "Löst ein echtes Workflow-Problem: Test-Hinweise aus Claude-"
            "Deploys ('Phone-Test: X, Y, Z bitte') verlieren sich aktuell "
            "im Chat. Bei Compaction weg, bei nächster Session vergessen. "
            "Phone-Tests passieren oft nicht.",
            "Neuer Panel im Admin-Bereich: Liste aller Live-Tests mit "
            "Filter (Offen / Alle / Pass / Fail). Pro Test: Titel + "
            "Beschreibung + Status-Badge + Notiz + Aktionen "
            "(PASS / FAIL / SKIP / Reopen).",
            "Workflow: Claude sagt im Chat 'teste bitte X'. Du klickst "
            "'+ Neu', paste Title + Beschreibung. Später testest du auf "
            "Phone, klickst PASS oder FAIL+Notiz. Notiz kann jederzeit "
            "editiert werden.",
            "Datenmodell: neue Tabelle live_tests (id, title, description, "
            "related_phase, related_commit_sha, related_tag, status, "
            "user_response, responded_at, responded_by_user_id, "
            "github_issue_url, created_at, created_by_user_id). Wird "
            "automatisch beim ersten Startup via create_all() angelegt.",
            "Backend: 4 neue Endpoints unter /admin/live-tests (GET mit "
            "Status-Filter, POST, PATCH, DELETE). Alle hinter require_admin, "
            "30/min Rate-Limit.",
            "Phase 3 (kommt noch): bei FAIL + Notiz wird automatisch ein "
            "GitHub-Issue erstellt (mit GITHUB_TOKEN-Env-Var). Aktuell "
            "wird github_issue_url-Feld nur für manuelle Einträge "
            "vorbereitet.",
            "Bundle-Impact: +2.3KB gzipped (Panel + Hooks). Total "
            "Bundle jetzt 420KB gz.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.admin-toggle",
        internal=True,
        released=date(2026, 5, 17),
        title="Admin-Status via UI toggeln (statt nur ADMIN_EMAILS-Env-Var)",
        highlights=[
            "Phase 1 von 3 für das Admin-Workflow-Refactor. Vorher: "
            "Admin-Status war computed property aus der ADMIN_EMAILS-Env-"
            "Var auf Render. Wer rein/raus wollte, brauchte Env-Var-Edit "
            "+ Server-Restart. Jetzt: DB-Spalte users.is_admin + Toggle "
            "via Admin-UI.",
            "Mini-Migration in main.py:lifespan: ADD COLUMN is_admin + "
            "Bootstrap-Step (User mit Email in ADMIN_EMAILS bekommen "
            "is_admin=TRUE beim ersten Startup). Idempotent — bestehende "
            "Promotes/Demotes bleiben unangetastet.",
            "Neuer Button in AdminUsersPanel-Tabelle: '★ Admin abnehmen' / "
            "'☆ Admin machen' pro User-Zeile (ausser für sich selbst).",
            "Safeguard: letzter Admin kann sich nicht entzogen werden — "
            "Backend wirft 400 wenn nach Demote keine Admins mehr übrig "
            "wären. Aussperren-Risiko gebannt.",
            "Nächste Phasen: Live-Test-Liste im Admin-Bereich (Phase 2) "
            "+ GitHub-Issue-Auto-Create bei FAIL (Phase 3). Kommen "
            "separat um kleinere Iterationen zu fahren.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.cstimer-more-puzzles-qa",
        internal=True,
        released=date(2026, 5, 17),
        title="QA-Fixes auf csTimer-Erweiterung (8 Befunde behoben)",
        highlights=[
            "Sub-Agent-QA hat 1 KRITISCH + 5 SOLLTE + 4 NICE gefunden. "
            "Davon 1 KRITISCH + 3 SOLLTE + 2 NICE sofort gefixt, 2 SOLLTE "
            "als Roadmap-Items dokumentiert.",
            "KRITISCH #1: COMMON_CUBE_TYPES enthielt die neuen Cubes nicht "
            "— User konnte sie im Scramble-Picker wählen, aber NICHT als "
            "cube_type für Solve-Speicherung setzen. Ergänzt: Ivy, Gear, "
            "Redi, Master Pyraminx, Master Skewb, FTO, Dino, Floppy, Tower. "
            "Plus cubeTypeToScrambowType-Cases.",
            "SOLLTE #2: 'Bandaged 3x3 (Square)'-Label war falsch — csTimer "
            "'bsq' ist tatsaechlich Bandaged-Square-1. Cube war eh broken "
            "(SOLLTE #3) und wurde komplett entfernt.",
            "QA-Runtime-Check hat aufgedeckt: 7 von 11 neuen Cubes "
            "(helicopter/gigaminx/bicube/bandaged-sq1/square-2/curvy-copter/"
            "diamond) returnen leerstring und Megaminx-RS returnt null, "
            "weil src/js/solver/-Files nicht vendored sind. Saubere Lösung: "
            "vorerst raus aus UI, in Roadmap als P6-Item mit Solver-"
            "Vendoring-Aufwand notiert.",
            "Nach Cleanup: inoffizielle Cube-Liste wieder bei 9 (statt 16): "
            "Ivy, Gear, Redi, Master Pyraminx, Master Skewb, FTO, Dino, "
            "Floppy, Tower. Alle 8 davon mit Random-State (master_skewb "
            "weiter Random-Move).",
            "SOLLTE #5: ScrambleNet zeigt jetzt auch 2D-Net für OH + 3BLD "
            "(beides mechanisch 3x3-Scrambles).",
            "SOLLTE #6: Test-Whitelist statt nur 'non-empty' — fängt "
            "Bug-Klassen wie '???' oder leerstring ab. Eigenes mgmso-Test "
            "hat damit den megaminx-Bug aufgedeckt (typeof null === "
            "'object' war Test-Bug).",
            "NICE #7+#8: Code-Hygiene (toter rotateFace180/CCW + void-"
            "ESLint-Trick raus, tote Loop im Sexy-Move-Test raus).",
            "Bundle-Win: -40KB raw / -14KB gz (utilscramble.js + "
            "grouplib.js + poly3dlib.js + megaminx.js entfernt). Total "
            "Bundle jetzt 418KB gz (vorher 432).",
            "Lesson: Vendor-Smoke-Tests nicht nur 'registered' prüfen, "
            "sondern auch 'liefert valide non-empty Output'. Im aktuellen "
            "Test-File ergänzt.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.cstimer-more-puzzles",
        released=date(2026, 5, 17),
        title="11 weitere Scramble-Types via csTimer (Quick-Wins + Exotische)",
        highlights=[
            "Massiv-Erweiterung der inoffiziellen Cube-Liste. Im Scramble-"
            "Picker stehen jetzt 16 inoffizielle Cubes zur Wahl (vorher 6).",
            "Neu via vendored csTimer (kleine Files): Dino Cube, Floppy "
            "Cube (1x3x3), Tower Cube (2x2x3). Plus: Megaminx hat jetzt "
            "echte Random-State (vorher scrambow random-move) — Quality-"
            "Upgrade für den WCA-Cube.",
            "Neu via vendored csTimer (utilscramble.js): Helicopter Cube, "
            "Gigaminx (5x5 Megaminx), Bicube, Bandaged 3x3, Square-2, "
            "Curvy Copter, Diamond Cube. Sammler-Puzzles auf einmal "
            "verfügbar.",
            "Alle 11 neuen Cubes haben Random-State-Scrambles (= Mindest-"
            "Distanz garantiert) — der „nicht WCA-Quality\"-Disclaimer "
            "im Scramble-Picker greift jetzt NUR noch für Master Skewb.",
            "Bundle-Impact: +46KB raw / +16KB gzipped (grouplib + "
            "poly3dlib + utilscramble + 3 Mini-Files). Insgesamt nutzt "
            "Cubetracker jetzt 7 csTimer-Modul-Files (gearcube, redi, "
            "pyraminx, skewb, mgmlsll, megaminx, utilscramble) plus die "
            "Foundation-Files (mathlib, scramble, isaac, grouplib, "
            "poly3dlib).",
            "Geplant für P4 Power-User-Phase: 3x3-/4x4-Trainer-Subsets "
            "via csTimer (ZBLL, ZBLS, VLS, COLL, Roux, EOline, 2gen, CTO, "
            "EDO, ELL, ...). scramble_333_edit.js + scramble_444.js sind "
            "größer (36KB + 77KB) — daher als zukünftige Phase, nicht "
            "als Quick-Win.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.cstimer-ivy-switch",
        internal=True,
        released=date(2026, 5, 17),
        title="Ivy-Cube: Scrambler von Eigenbau auf csTimer umgestellt",
        highlights=[
            "User-Beobachtung: csTimer kann Ivy-Cube scramblen. Bei der "
            "ersten Recherche zum Vendor-Port hatte ich nur nach 'ivy.js' "
            "gesucht — der Ivy-Scrambler ist aber überraschend im "
            "skewb.js-File mit-versteckt (registriert via "
            "`scrMgr.reg(['ivyo', 'ivyso'], ...)` am Ende der Datei).",
            "Konsequenz: Ivy läuft jetzt über csTimer ('ivyso' = Random-"
            "State). Unser Eigenbau-BFS-Solver (ivyScramble.ts mit 29.160-"
            "State-Lookup-Tabelle) bleibt als defensiver Fallback hinter "
            "csTimer im Cascade. Wenn csTimer crashen sollte, springt "
            "automatisch der Eigenbau ein.",
            "Vorteil: Konsistenz mit Gear / Redi / Master Pyraminx. "
            "Identischer Scramble-Style wie bei csTimer-Usern.",
            "Kein 2D-Net für Ivy: unser Renderer (ScrambleNet) kann "
            "aktuell nur 3x3. csTimer rendert Ivy auch nicht in 2D. "
            "Wenn das jemand vermisst, können wir's später selbst bauen "
            "(~1 Tag, Ivy-Geometrie = 4 dreieckige Faces + 4 Eck-Caps).",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.cstimer-vendor",
        released=date(2026, 5, 17),
        title="csTimer-Scrambles für Gear / Redi / Master Pyraminx",
        highlights=[
            "Direkter Folge-Schritt nach der GPL-Migration. csTimer-"
            "Source-Files vendored unter webapp/frontend/src/lib/"
            "cstimer-vendor/ (mathlib, scramble, gearcube, redi, "
            "pyraminx, skewb, mgmlsll, isaac + Mini-jQuery-Shim).",
            "Gear Cube, Redi Cube, Master Pyraminx haben jetzt echte "
            "Random-State-Scrambles (vorher Random-Move-Sequenz). "
            "Identisch zu csTimer-Output, WCA-quality im Sinne "
            "garantierter Mindest-Distanz.",
            "Ivy bleibt auf unserem Eigenbau-BFS-Solver — csTimer hat "
            "kein Ivy-Modul. Master Skewb bleibt auf Random-Move-"
            "Fallback — csTimer hat auch keinen dedizierten Master-"
            "Skewb-Generator (mgmlsll.js ist Megaminx-LSLL, nicht "
            "Master Skewb).",
            "Bundle-Impact: +52KB raw / +19KB gzipped (mathlib+isaac "
            "sind die größten Brocken). Vergleich: cubing.js wäre "
            "~150-500KB gewesen.",
            "Disclaimer 'kein Random-State'-Hinweis wird jetzt NUR "
            "für Master Skewb angezeigt (vorher für alle inoffiziellen "
            "Custom-Puzzles).",
            "Lessons applied: csTimer-Source-Files sind reines pure-JS "
            "(IIFE-Pattern, kein Buffer/Node). Der cstimer_module-NPM-"
            "Crash 2026-05-16 war ein Packaging-Problem, kein Source-"
            "Problem. Direkt-Vendoring umgeht das.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.gpl-license-migration",
        released=date(2026, 5, 17),
        title="Lizenz-Migration auf GPL-3.0-or-later",
        highlights=[
            "Cubetracker steht ab heute unter GNU General Public "
            "License v3 (oder später). Vorher war kein expliziter "
            "Lizenz-Eintrag im Repo, was per Default 'all rights "
            "reserved' bedeutet hat.",
            "Hintergrund: Vorbereitung für die Integration von "
            "csTimer-Scramble-Algorithmen (selbst GPL-v3) für "
            "inoffizielle Puzzles wie Gear, Redi, Master Pyraminx, "
            "Master Skewb. GPL ist Copyleft — alles was csTimer-"
            "Code beinhaltet, muss komplett GPL sein.",
            "Was sich ändert: LICENSE-File im Repo (GPL-v3 "
            "Volltext), license-Field in package.json + pyproject.toml, "
            "README-Sektion umgeschrieben.",
            "Was bleibt: Source ist eh schon public auf GitHub, "
            "die App ist non-commercial. GPL passt zum Speedcubing-"
            "Community-Ethos.",
            "Konsequenz: Forks/Derivate müssen ebenfalls GPL-v3 "
            "(oder kompatibel) sein. Keine proprietaeren Closed-"
            "Source-Forks möglich. Re-Lizenzierung wäre nur mit "
            "Zustimmung aller Contributor möglich — einseitiger "
            "Schritt, bewusst.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.scramble-image-toggle",
        released=date(2026, 5, 17),
        title="Schnell-Toggle für das 2D-Net direkt im /timer-Tab",
        highlights=[
            "Direkter Folge-Iteration zum 2D-Net (scramble-image): "
            "Bild ein/aus geht jetzt mit einem Klick in der "
            "ScrambleCard, ohne den Umweg über /einstellungen/Timer.",
            "Button 'Bild an' / 'Bild aus' sitzt neben 'Eigene' und "
            "'Skip'. Visualer State: aktiviert (lila Highlight) wenn "
            "das Bild eingeblendet ist, dim wenn aus.",
            "Erscheint NUR für Cube-Types, für die das 2D-Net "
            "überhaupt rendert (aktuell nur 3x3). Bei 4x4, Pyraminx "
            "etc. wäre der Toggle wirkungslos und wird ausgeblendet "
            "— vermeidet Verwirrung.",
            "Settings-Panel-Hint mit-aktualisiert: User wird auf den "
            "Schnell-Toggle hingewiesen.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.scramble-image",
        released=date(2026, 5, 17),
        title="2D-Cube-Net unter dem Scramble (visuelle Verifikation)",
        highlights=[
            "P1.5 aus dem Quick-Wins-Sprint. Unter jedem 3x3-Scramble "
            "zeigt sich jetzt das Cross-Layout-Bild des Cubes nach "
            "Anwendung des Scrambles. Standard-Erwartung an Speedcubing-"
            "Timer — endlich Parity mit csTimer.",
            "Komplett Eigenbau (lib/cube-net.ts, ~250 Zeilen): kleiner "
            "Cube-State-Simulator (6×9 Sticker-Array, 18 Basic-Moves) + "
            "SVG-Renderer. Bundle nur +1.7kB gzipped — kein Lib-Dep, "
            "kein cstimer_module-Browser-Polyfill-Risiko.",
            "Logik verifiziert durch 20 Tests (cube-net.test.ts): "
            "Identitäten (R+R'=solved, 4xR=solved), Centers nie "
            "geändert, bekannte Group-Orders (Sune Order 6, T-Perm "
            "Order 2, Sexy-Move Order 6), 5 Random-Scrambles + Inverse.",
            "Aktuell nur 3x3 — andere Cube-Types zeigen kein Bild "
            "(2x2/4x4/Pyra kommen schrittweise, Code ist erweiterbar).",
            "Setting in /einstellungen/Timer: '2D-Net unter dem "
            "Scramble anzeigen' (default an). Power-User können "
            "ausschalten wenn sie pure Notation wollen.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.qa-fixes-p1",
        internal=True,
        released=date(2026, 5, 17),
        title="QA-Fixes zu Voice-Alert / Penalty-Buttons / Quick-Aktionen",
        highlights=[
            "Voice-Alert: globaler speechSynthesis.cancel()-Call entfernt. "
            "Vorher konnte unsere TTS-Ansage Screen-Reader-Ausgaben (NVDA / "
            "VoiceOver) abbrechen. Das Risiko ist real, der Overlap-Schutz "
            "war eh überkonstruiert (4s Abstand zwischen 'acht' und 'zwölf').",
            "Voice-Alert: Safari iOS bekommt jetzt eine 0-Volume-Dummy-"
            "Utterance beim ersten Spacebar-Press, damit die Voice-Engine "
            "warm läuft. Vorher konnte die erste TTS-Ansage stumm bleiben.",
            "Penalty-Quick-Buttons: Klick auf DNF entfernt automatisch ein "
            "vorhandenes +2 (WCA-konform, beides ist nicht kombinierbar). "
            "Dieses Verhalten ist jetzt im Button-Tooltip explizit erklärt, "
            "vorher hat es das Flag still gelöscht.",
            "Penalty-Quick-Buttons: 'Letzter Solve:' zeigt jetzt zusätzlich "
            "den Cube-Type (z.B. 'Letzter Solve (3x3):'), damit klar bleibt "
            "welcher Solve gerade editiert wird.",
            "Löschen-Quick-Aktion: window.confirm() raus, Zwei-Klick-Pattern "
            "rein. Erster Klick aktiviert den Button (rot pulsierend), "
            "zweiter Klick innerhalb 5s löscht. Sicherer auf Mobile + ohne "
            "Browser-Native-Dialog-Abhängigkeit.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.roadmap-frontend",
        released=date(2026, 5, 17),
        title="Roadmap-Anzeige im Frontend (Modal mit Phasen P1-P6)",
        highlights=[
            "P1.4 aus dem Quick-Wins-Sprint. Neues RoadmapModal zeigt "
            "die 6 Phasen mit Items, Aufwand-Schätzung und Status. "
            "Transparent für User was geplant ist + warum.",
            "Triggerbar via Footer-Link 'Roadmap' UND User-Menu oben "
            "rechts. Beide Wege parallel = mehr Sichtbarkeit.",
            "Single-Source webapp/frontend/src/lib/roadmap-data.ts — "
            "Roadmap-Updates brauchen kein Backend-Deploy, nur "
            "Frontend-Build.",
            "Status-Kodierung: aktiv (lila) / geplant (amber) / future "
            "(grau) / ongoing (blau). Bereits abgeschlossene Items pro "
            "Phase mit ✓ + Strikethrough.",
            "Hinweis im Modal: 'fehlt was? Sag's uns via Feedback-Link "
            "oder GitHub' — closed-the-loop zum Feedback-Kanal.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.custom-scramble",
        released=date(2026, 5, 17),
        title="Custom-Scramble eintippen statt random generieren",
        highlights=[
            "P1.3 aus dem Quick-Wins-Sprint. Neuer Edit-Button in der "
            "ScrambleCard. Klick darauf öffnet eine Textarea wo der "
            "User einen eigenen Scramble eintippen kann.",
            "Use-Cases: Wettkampf-Scramble aus der WCA-Live-Anzeige "
            "übernehmen, Algorithmus-Drill mit fixer Sequenz, Scramble "
            "aus einer anderen App fortsetzen.",
            "Bedienung: Enter speichert, Esc bricht ab. Custom-Scramble "
            "überlebt Cube-Type-Wechsel nicht (Auto-Reset). Skip-Button "
            "verwirft Custom + generiert neuen Random.",
            "Visueller Hinweis bei aktivem Custom-Scramble: kleiner "
            "lila Badge ev eigene Eingabe neben dem Scramble.",
            "Keine Validierung der Notation — der User weiss was er "
            "eintippt. Defensive Trim auf Whitespace.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.penalty-quick",
        released=date(2026, 5, 17),
        title="Penalty-Quick-Buttons direkt unter dem Timer",
        highlights=[
            "P1.2 aus dem Quick-Wins-Sprint. Nach jedem Save erscheint "
            "unter dem großen Timer-Display ein Mini-Toolbar mit "
            "+2 / DNF / Löschen — Korrektur ohne den Weg über die "
            "Letzte-Solves-Sidebar.",
            "Funktioniert in beiden Modi (Text + Spacebar). Im Spacebar-"
            "Modus besonders nützlich: wenn die Inspection-Penalty "
            "(automatisch detected) doch nicht passte, schnell "
            "korrigieren.",
            "Buttons zeigen den aktuellen Zustand visuell („✓ +2\” wenn "
            "aktiv) und togglen bei Klick. Löschen mit Confirm-Dialog. "
            "↺-Button blendet die Mini-Toolbar manuell aus.",
            "Auto-Reset bei Cube- oder Session-Wechsel — verhindert dass "
            "die „Letzter Solve war 3x3\”-Anzeige im 4x4-Kontext weiter "
            "blinkt.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.voice-alert",
        released=date(2026, 5, 17),
        title="Voice-Alert für Inspection-Warnings (csTimer-aequivalent)",
        highlights=[
            "Erstes Item aus dem Quick-Wins-Sprint P1: Inspection-Audio-"
            "Calls bei 8s + 12s können jetzt als gesprochene Stimme "
            "statt Sinus-Beep abgespielt werden.",
            "Vier Modi wählbar (Verwaltung → Einstellungen → Inspection):"
            " 🔔 Sinus-Beep (Default, bestehende User merken keinen "
            "Unterschied) — 🇩🇪 Deutsch (acht, zwölf) — 🇬🇧 Englisch "
            "(eight, twelve) — 🔇 Aus.",
            "Voice-Modi nutzen die Browser-Web-Speech-API — kein Asset, "
            "kein Network-Roundtrip, funktioniert offline. Stimme/Akzent "
            "abhängig von Browser + OS.",
            "Fail-soft: wenn TTS nicht verfügbar (alter Browser, "
            "Permission-Block), fällt der Solve-Flow unbeeintraechtigt "
            "weiter.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.feedback-usermenu",
        released=date(2026, 5, 17),
        title="Feedback geben: zusätzlich im User-Menu oben rechts",
        highlights=[
            "Footer-Link war versteckt — viele User scrollen nie ans Ende. "
            "Feedback-Item jetzt auch im User-Menu (Avatar oben rechts) "
            "neben Mein Account / Patch Notes / Was kann diese App.",
            "Funktional identisch: öffnet dasselbe FeedbackModal mit "
            "GitHub-Issue-Tab + Email-Form-Tab.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.feedback",
        released=date(2026, 5, 17),
        title="Feedback-Kanal: GitHub-Issues + Email-Form ohne GitHub-Account",
        highlights=[
            "Neuer Footer-Link 💬 Feedback in der App. Oeffnet ein Modal "
            "mit zwei Wegen: GitHub-Issue (für Profi-User mit Account) "
            "oder Email-Form (für alle anderen).",
            "GitHub-Issue-Templates angelegt unter .github/ISSUE_TEMPLATE/ "
            "für Bug-Reports + Feature-Wünsche. Strukturierte Form-Felder "
            "fuhren Schritt-für-Schritt durch die wichtigen Fragen.",
            "Email-Form-Mode: User schreibt Nachricht (10-4000 Zeichen), "
            "Backend schickt via vorhandene Resend-Infrastruktur an die "
            "erste ADMIN_EMAILS-Adresse. User-Email + Display-Name werden "
            "im Body mitgeschickt, damit Antwort möglich ist.",
            "Hartes Rate-Limit 3/Stunde pro IP gegen Spam. Auth pflicht "
            "(nur eingeloggte User können Feedback schicken).",
            "Vorbereitung: Repo soll public werden, damit die GitHub-"
            "Issue-Links funktionieren. Secret-Audit ist clean (keine "
            ".env-Files, keine hardcoded Tokens, keine echten User-Daten "
            "im Code) — Repo-Switch via GitHub-Settings ohne weitere "
            "Vorarbeit möglich.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.ivy-rs",
        released=date(2026, 5, 17),
        title="Ivy Cube: echte WCA-Quality-Scrambles (Eigenbau-Solver)",
        highlights=[
            "Erster Eigenbau-Random-State-Solver für ein Custom-Puzzle. "
            "Ivy Cube hat seit jetzt echte WCA-Quality-Scrambles (4-10 "
            "Moves, optimal kurz, garantierte Mindest-Distanz von 4).",
            "Implementation als reines TypeScript-Modul (lib/ivyScramble.ts) "
            "ohne externe Deps — kein cstimer_module mehr (das ist beim "
            "vorigen Versuch am Browser-Buffer-Crash gescheitert). Code "
            "vollstaendig lesbar, BFS-Lookup-Table 29.160 States, baut "
            "beim ersten Aufruf in ~50-200ms.",
            "Referenz: csTimer src/js/scramble/skewb.js (Funktion "
            "getScrambleIvy). Gleiche State-Repräsentation (360 Center-"
            "Permutationen × 81 Corner-Twists), gleiche Move-Notation "
            "(R/L/D/B), aber sauber als TypeScript ohne csTimer-mathlib-"
            "Dependency.",
            "Bundle-Size sogar KLEINER als beim cstimer_module-Versuch: "
            "389 KB gzipped (vs 478 KB cstimer-Variante, vs 295 KB "
            "Random-Move-Variante davor). Eigenbau-Code = ~250 Zeilen TS.",
            "Disclaimer in der ScrambleCard angepasst: zeigt sich nur "
            "noch für Gear/Redi/Master Pyra+Skewb. Ivy ist jetzt in der "
            "WCA-Quality-Liga.",
            "Nächster Schritt (falls gewünscht): Gear Cube + Redi Cube "
            "+ Master Pyraminx + Master Skewb mit derselben Template-"
            "Methode. Gear ist als nächstes geplant.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.revert-cstimer",
        internal=True,
        released=date(2026, 5, 17),
        title="HOTFIX-REVERT: cstimer_module wegen Browser-Crash zurueckgerollt",
        highlights=[
            "Sorry — cstimer_module-Einbau (6d7a0eb) hat die Seite gekillt.",
            "Root-Cause: cstimer_module nutzt 12x Node.js-Buffer-Globals "
            "direkt im Top-Level-Init. Im Browser existiert Buffer nicht "
            "ohne Polyfill (vite-plugin-node-polyfills o.ae.) — Bundle "
            "wurde sauber gebaut, crashte aber sofort beim Module-Load "
            "im Browser.",
            "Lokaler Vite-Build + Node-Smoke-Test waren grün weil im "
            "Node-Kontext Buffer immer existiert. Browser-Test hätte "
            "den Bug sofort gezeigt — das machen wir kuenftig vor jedem "
            "neuen NPM-Package mit Headless-Chrome o.ae.",
            "Stand wieder bei 60148cd (Random-Move-Scrambles mit "
            "korrigierter Notation). Ivy/Gear/Redi/Master Pyra+Skewb "
            "sind keine WCA-Quality, aber Notation ist sauber + "
            "Disclaimer in der ScrambleCard ehrlich.",
            "Nächster Versuch (separater Branch zuerst): "
            "vite-plugin-node-polyfills einbauen + cstimer_module "
            "isoliert testen mit Headless-Browser bevor wir Production "
            "antasten.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.scramble-quality",
        released=date(2026, 5, 17),
        title="Inoffizielle Scrambles: Notations-Bugs gefixt + ehrlicher Disclaimer",
        highlights=[
            "User-Befund: einige Custom-Scrambles waren falsch. Recherche "
            "bestätigt zwei echte Bugs in scramble.ts:",
            "GEAR CUBE (kritischer Bug): wegen der Zahnrad-Mechanik sind "
            "physikalisch nur 180-Grad-Drehungen möglich (Quelle: Wikipedia/"
            "Gear-Cube). Meine alte Spec hatte nur 3 Faces (U/R/F) statt 6 "
            "und mischte 90 + 180 Grad. Jetzt: alle 6 Faces (U/D/L/R/F/B), "
            "ausschließlich 2-Suffix.",
            "IVY CUBE: falsche Achse F statt U. Standard-Notation per "
            "Speedsolving-Wiki ist U/L/R/B für die 4 Eck-Achsen. "
            "Scramble-Länge auf csTimer-Default 8 reduziert.",
            "Ehrlicher UI-Disclaimer in der ScrambleCard für inoffizielle "
            "Cubes: 'Random-Move-Sequenzen mit korrekter Notation, kein "
            "Random-State-Solver — gut fürs Training, nicht 100% Wettkampf-"
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
            "Hintergrund: AO100 ändert sich pro Zeile praktisch nicht "
            "(100er-Fenster). In der Tabelle wenig informativ, in der "
            "Live-Karte oben deutlich besser aufgehoben.",
            "Tabelle ohne AO100 hat jetzt nur 5 Spalten (Nr / Zeit / Mo3 / "
            "AO5 / AO12 + Löschen) — passt wieder ohne horizontalen Scroll "
            "in die schmale Sidebar. Das min-w-[420px] + overflow-Scroll "
            "ist raus.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.abschluss-skill",
        internal=True,
        released=date(2026, 5, 16),
        title="Session-Ende-Check: /abschluss-Slash-Command + Stop-Hook-Backstop",
        highlights=[
            "Neuer Slash-Command /abschluss für den User-getriggerten "
            "Session-Ende-Check. Geht eine 8-Punkte-Liste durch: "
            "uncommitted Änderungen, unpushed Commits, fehlende Patch-"
            "Notes-Einträge, fehlende Git-Tags, features-data.ts-Update, "
            "Doku-Aktualität, offene Todos, Backend-Smoke-Test (lokal "
            "Parse + Module-Import). Bei Luecken bietet Fixes an.",
            "Neuer Stop-Hook stop-mini-check.sh: läuft 1x pro Session "
            "(via once:true) als Mini-Backstop wenn Claude zum ersten Mal "
            "antwortet. Meldet nur das absolut Wichtigste (uncommitted + "
            "unpushed) und verweist auf /abschluss für den vollen Check.",
            "Konvention in CLAUDE.md verankert: bei Aussagen wie „Session "
            "beenden\” / „das wars für heute\” → /abschluss proaktiv "
            "aufrufen. Plus Hinweis-Block über Patch-Notes-Konvention, "
            "Tag-Konvention, features-data.ts-Konvention.",
            "Hintergrund: heute (2026-05-16) ist mehrfach was durchge"
            "rutscht: 26 ungetaggte Patch-Notes-Versionen, features-data.ts "
            "wurde erst nach User-Nachfrage aktualisiert, Quote-Bug hat "
            "5 Render-Deploys gekillt. Der /abschluss-Check fängt all das "
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
            "Neue Kategorie Speedcubing-Welt: WCA-Turniere in der Nähe "
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
        internal=True,
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
            "fehlgeschlagenem Render-pip-install), würde Login 500 werfen "
            "obwohl Auth funktioniert. Jetzt: try/except um den Import — "
            "Auto-Refresh ist nice-to-have, Login hat Prio.",
            "Country-Liste erweitert um 8 fehlende Cube-Communities: "
            "Hongkong (HK, >500 WCA-Cuber), VAE (AE), Neuseeland (NZ), "
            "Aegypten (EG), Marokko (MA), Dominikanische Republik (DO), "
            "Costa Rica (CR), Venezuela (VE). Insgesamt 63 Länder.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.country-feld",
        released=date(2026, 5, 16),
        title="Land-Feld im Profil + WCA-Hinweise sauber",
        highlights=[
            "Neues Profil-Feld „Land” (Dropdown mit 55 Cuber-Ländern, "
            "alphabetisch nach dt. Bezeichnung) zusätzlich zur "
            "Postleitzahl. Vorher haben wir das Land aus der PLZ-Struktur "
            "geraten (5-stellig=DE, 4-stellig=AT, sonst nichts) — das "
            "funktionierte nur für DACH-User.",
            "WCA-Turniere-Endpoint nutzt jetzt User.country_iso2 mit "
            "Vorrang vor der PLZ-Heuristik. Damit funktioniert das "
            "Turnier-Feature weltweit: User in USA, Polen, Japan etc. "
            "bekommen die richtigen Turniere ihres Landes (+ Nachbarn "
            "wo definiert).",
            "Sauber kommunizierte Voraussetzungen: AccountSettingsPanel "
            "zeigt einen Amber-Hint dass „PLZ UND Land beide nötig\” "
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
        title="WCA: Nachbarländer + News: weitere Quelle + Auto-Refresh bei Login",
        highlights=[
            "WCA-Turniere: zeigt jetzt nicht nur Turniere im eigenen Land, "
            "sondern auch in direkten Nachbarlaendern. Für DE-User: AT, CH, "
            "NL, BE, LU, FR, DK, PL, CZ. Für AT-User: DE, CH, IT, SI, HU, "
            "SK, CZ, LI. Für CH-User: DE, AT, FR, IT, LI. Parallel-Fetch "
            "via asyncio.gather, daher kaum Latenz-Aufschlag.",
            "Speedcubing-News: dritte Quelle dazu — SpeedCubing.org/blog "
            "(World Records, Competition Coverage). RSS-Recherche ergab "
            "dass SpeedCubeShop + TheCubicle keinen public RSS-Endpoint "
            "anbieten — die kaemen nur via HTML-Scraping ran, kein MVP-Wert.",
            "Auto-Refresh bei Login (User-Wunsch): nach erfolgreichem "
            "Login läuft im Hintergrund (NACH der Response, blockt User "
            "nicht) ein Refresh für News + WCA-Caches. Bei warmen Caches "
            "= no-op, bei stale Caches = stiller Refresh. Effekt: wer sich "
            "nach Pause einloggt, sieht frische Daten ohne Wartezeit.",
            "Backend-Module: webapp/news/refresh.py als zentraler Refresh-"
            "Helper. Wird vom Auth-Login-Endpoint als BackgroundTask "
            "getriggert. News-Refresh = sync, WCA-Warmup = async via "
            "asyncio.run im Background-Thread.",
            "Frontend zeigt in der WCA-Card jetzt die Liste der "
            "gequeryten Länder (z.B. 'Länder: DE, AT, CH, NL, ...') "
            "als Footer-Info, damit der User weiss warum sich z.B. ein "
            "Wiener Turnier in seiner Berliner Liste findet.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.deploy-fix",
        internal=True,
        released=date(2026, 5, 16),
        title="Hotfix: SyntaxError-Quotes in Patch-Notes — alle Render-Deploys grün",
        highlights=[
            "Render-Deploys aller heutigen Welle-Commits sind gescheitert "
            "(5 Fail-Mails: news-backend, news-frontend, dashboard-story, "
            "wca-comps-hardening, wca-news-qa).",
            "Root-Cause: in mehreren Patch-Notes-Strings hatte mein "
            "Bash-Heredoc das deutsche Schliess-Anführungszeichen (U+201D) "
            "fälschlich durch ein ASCII-Quote (U+0022) ersetzt. Das mittlere "
            "ASCII-Quote terminierte den Python-String an einer ungewollten "
            "Stelle, der Rest war Syntaxmuell. 22 solcher Stellen über 13 "
            "Zeilen gefunden.",
            "Fix: alle ASCII-Quotes mitten in Patch-Notes-Strings systematisch "
            "durch das korrekte deutsche Schliess-Anführungszeichen ersetzt. "
            "Backend startet jetzt sauber (lokal mit echten Deps verifiziert).",
            "Konsequenz: zukünftige Patch-Notes nutzen nur ASCII-Quoting "
            "oder explizit-escaped Quotes — kein Mix mehr von deutschen "
            "Anführungszeichen mit Heredoc-faulen Bash-Pipes.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.wca-news-qa",
        internal=True,
        released=date(2026, 5, 16),
        title="QA-Fixes nach WCA/News-Sprint",
        highlights=[
            "Operator-Precedence-Bug im News-Parser behoben: bei feedparser-"
            "Entries ohne `.get`-Methode wurde der link fälschlich None. "
            "Helper `_attr_or_key` mit expliziten Klammern.",
            "Session-Race im News-Fetcher: bei IntegrityError (Multi-Worker-"
            "Race) würde der naive db.rollback() ALLE bisher geflushten "
            "Items derselben Iteration wegrollen. Jetzt: SAVEPOINT pro "
            "Item via `db.begin_nested()` — nur das eine kaputte Item "
            "rollt zurück.",
            "WCA-Sortier-Bug: Turniere mit distance_km = 0.0 (User direkt "
            "am Venue) wurden fälschlich ans Ende sortiert, weil 0.0 in "
            "Python falsy ist. Jetzt expliziter `is None`-Check.",
            "News-Cleanup: N+1-DELETE-Schleife → ein einzelner DELETE WHERE "
            "(SQLAlchemy `delete()`-Construct).",
            "PostalCodeGeo: `Float` explizit als mapped_column-Type — "
            "SQLAlchemy 2.0 sollte das aus dem Python-Type ableiten können, "
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
            "Spacing wide), Karten selbst sind unverändert. Semantisches "
            "<section>-Markup + aria-labelledby für Screenreader.",
            "Speedcubing-Welt-Sektion ist jetzt der „natuerliche\” Ort "
            "für die heute neu hinzugefuegten Karten (WCA-Turniere + "
            "News) statt einer temporaeren Anhang-Reihe.",
            "Spacing zwischen Sektionen leicht größer (space-y-8 statt "
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
            "Nächster Schritt: Phase C — Dashboard-Refactor mit "
            "eigener „Speedcubing-Welt\”-Sektion und neuer Story-"
            "Reihenfolge.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.news-backend",
        internal=True,
        released=date(2026, 5, 16),
        title="Backend für „Speedcubing-News\” gebaut",
        highlights=[
            "Neues Backend-Modul `webapp/news/`: RSS-Aggregator mit "
            "feedparser, persistente DB-Tabelle `news_items` (Dedup über "
            "RSS-Link-URL), on-demand-Refresh-Strategie (wenn letzter "
            "Fetch > 60min alt, sync re-fetch beim nächsten Endpoint-Call).",
            "Konfigurierte Sources (vorerst): WCA Posts (offizielle "
            "Announcements) + r/Cubers (Community-Reddit). Erweiterung "
            "später via `news/sources.py`.",
            "Endpoint `GET /news/latest?limit=10` mit Auth + 60/min-Rate-"
            "Limit. Liefert sortiert nach published_at DESC.",
            "Cleanup: Items > 60 Tage werden im selben Pass gelöscht — "
            "Tabelle bleibt schlank, kein Cron nötig.",
            "Frontend-Card folgt im nächsten Commit.",
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
        internal=True,
        released=date(2026, 5, 16),
        title="Backend für „WCA-Turniere in der Nähe\” gebaut",
        highlights=[
            "Neues Backend-Modul `webapp/wca/`: WCA-API-Client (mit 1h-In-"
            "Memory-Cache), Nominatim-Geocoding-Wrapper (mit persistentem "
            "DB-Cache, TTL 30 Tage), Haversine-Distance-Berechnung, "
            "Country-Detection aus PLZ-Struktur.",
            "Endpoint `GET /wca/competitions/upcoming`: liefert die "
            "nächsten Turniere im Land des Users (PLZ aus Profil), "
            "sortiert nach Datum + Distanz, mit `distance_km` pro Eintrag. "
            "Default: max 300km, 10 Einträge, 6 Monate Vorausschau.",
            "DB-Tabelle `postal_code_geo` (Composite-Key postal_code + "
            "country_iso2): persistenter Geocoding-Cache. Wenn 100 User "
            "dieselbe PLZ haben = nur 1 Nominatim-Call. PLZ-Geo ändert "
            "sich nie, TTL 30 Tage ist konservativ.",
            "Frontend-Card folgt im nächsten Commit.",
            "Hintergrund: User-Wunsch nach „Turniere in deiner Nähe\”. "
            "PLZ-Feld wurde dafür Mai 14 schon im Profil ergänzt — "
            "jetzt ist die andere Haelfte fertig.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.cstimer-bigfile",
        released=date(2026, 5, 16),
        title="csTimer-Import: große Files (30k+ Solves) jetzt importierbar",
        highlights=[
            "Bug-Fix: JSON-Bomb-Pre-Check (Security-Layer K2) hatte das "
            "Limit auf 200.000 strukturelle JSON-Tokens — für csTimer-"
            "Exporte mit > ca. 30.000 Solves zu eng. Limit jetzt auf "
            "2.000.000 hoch, was ca. 300.000 Solves abdeckt.",
            "Sicherheit bleibt: 30MB-Upload-Hardcap macht echte JSON-Bombs "
            "(~30M Tokens) weiterhin unmöglich. Pre-Check greift bei 1/15 "
            "der theoretisch möglichen Token-Last.",
            "Error-Message verstaendlicher: vorher „Möglicher JSON-Bomb-"
            "Angriff\” (verwirrend für normale User), jetzt „Datei zu "
            "komplex — bei normalen csTimer-Exporten reicht das für ca. "
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
            "Redi, Master Pyraminx, Master Skewb, FTO) ergänzt — war "
            "in der Marketing-Liste nicht sichtbar, obwohl seit heute "
            "im Timer-Tab nutzbar.",
            "Solving: Drei-Modi-Picker (Text/WCA/Pragmatisch) + "
            "Trainings-Sets (5/12/25/50/100 + Set-Statistik + Coaching-"
            "Feedback) waren portiert aber nicht erwähnt — jetzt drin.",
            "Analyse: Mo3 in Best-Times-Aufzaehlung dazu (heute neu in "
            "den Tabellen). Best-Avg-Timestamps + Detail-Modal pro "
            "Solve waren portiert aber stumm — jetzt erwähnt.",
            "Trainer: „Algs-Trainer mit Visualisierung\” war "
            "überoptimistisch — gilt nur für OLL (57 Bilder). PLL-"
            "Bilder folgen noch, jetzt ehrlich kommuniziert.",
            "Account: Postleitzahl im Profil dazu (Vorbereitung für "
            "„WCA-Turniere in deiner Nähe\”).",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.welle2-3-qa",
        internal=True,
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
            "gehabt hätte. Defensive Guard rein — bei <2 Bases "
            "deaktivieren wir den „kein-Wiederholen”-Filter automatisch, "
            "damit der Tab nicht hängt.",
            "Scramble-Picker bei Session-Vorgaben (z.B. „pll” aus einer "
            "PLL-Trainings-Session): Toggle/Dropdown würde inkonsistent "
            "wirken, weil pll weder in WCA noch in Inoffiziell ist. "
            "Jetzt: beide Toggle-Buttons un-highlighted, statt Dropdown "
            "ein Hinweis „Aus Session-Vorgabe: pll — Toggle wählen "
            "um zu ändern”. Klick auf einen Toggle wechselt sauber in "
            "die jeweilige Kategorie.",
            "Code-Hygiene: tote Props in ModeButton (disabled/disabled"
            "Title) raus, redundante mt-4 auf TouchTimerPad entfernt "
            "(space-y-4 des Parents reichte), eslint-disable-Kommentar "
            "in ScrambleCard erklärt (Identitaets-stabile Callback-Prop).",
            "Tests: „kein direktes Wiederholen”-Iterationen von 10 auf "
            "100 erhöht — kostet <50ms, schliesst Glueckstreffer bei "
            "kleinen Move-Sets (gear hat nur 3 Bases) aus.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.scramble-picker",
        released=date(2026, 5, 16),
        title="Scramble-Picker: WCA + Inoffiziell (Ivy, Gear, Redi, …)",
        highlights=[
            "ScrambleCard hat jetzt einen Picker: Toggle WCA ↔ "
            "Inoffiziell + Dropdown mit den verfügbaren Typen. Default "
            "folgt weiterhin dem gewählten Cube-Type — bei Override "
            "erscheint ein „↺ auto”-Button um wieder zum Default zu "
            "springen.",
            "WCA-Liste: alle WCA-Cubes (3x3, 4x4, …, Pyraminx, Skewb, "
            "Square-1, Megaminx, Clock) — werden weiterhin von scrambow "
            "generiert (WCA-quality, Mindest-Distanz).",
            "Inoffizielle Cubes (User-Wunsch): Ivy Cube, Gear Cube, "
            "Redi Cube, Master Pyraminx, Master Skewb, FTO. FTO via "
            "scrambow, die anderen via eigenem Random-Move-Generator mit "
            "„kein direktes Wiederholen derselben Achse”-Filter — nicht "
            "WCA-quality, aber sauber fürs Casual-Training.",
            "Cube-Type-Wechsel resettet den Picker automatisch, sodass "
            "der neue Cube wieder seinen passenden Scramble bekommt — "
            "verhindert „Ivy-Scramble für 3x3”-Stolperfallen.",
            "Session.scramble_type (csTimer-Import + PLL/OLL-Trainings-"
            "Sessions) wird weiterhin respektiert — User-Picker schlägt "
            "es aber, falls man manuell ändern will.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.timer-layout",
        released=date(2026, 5, 16),
        title="Mobile-Timer-Layout: Scramble direkt über Timer + Selektoren unten",
        highlights=[
            "Phone-Reihenfolge im Timer-Tab umgebaut: Scramble → Timer-"
            "Display → „Tippen & halten”-Pad → erst danach Cube-/Session-/"
            "Hardware-Selektoren + Timer-Modus. Damit ist beim Solven kein "
            "Scrollen mehr nötig — alles Wichtige sichtbar.",
            "BigTimerInput aufgeteilt: Selektoren leben jetzt in einer "
            "eigenen TimerControlsCard, das Timer-Display ist nur noch das "
            "Solving-Eingabefeld + Save. Klare Verantwortlichkeiten, "
            "leichter zu warten.",
            "hardwareId nach TimerTab hochgezogen — der Save-Pfad in "
            "BigTimerInput nutzt jetzt dieselbe Quelle wie der Selektor-"
            "Block, kein State-Auseinanderdriften mehr möglich.",
            "Desktop unverändert: Live-Solves links (420px), Solving "
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
            "DNF macht Mo3 ungültig) — WCA-Standard für Big-Cubes (6x6, "
            "7x7) wo nur 3 Solves pro Round zählen",
            "AO100 = trimmed mean über 100er-Fenster, WCA-konform (5er-"
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
        internal=True,
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
        internal=True,
        released=date(2026, 5, 14),
        title="Mobile-Fixes nach Phone-Test",
        highlights=[
            "Info-Button-Popover (ⓘ) ragte auf Phone teilweise über den "
            "Bildschirmrand. Jetzt: auf Phone als Bottom-Sheet (klebt unten, "
            "full-width minus Rand) — ragt nie mehr über. Ab Tablet wie "
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
            "Header-Logo auf Phone gefixt — war h-40 (160px Höhe = "
            "~410px Breite) und sprengte jeden Phone-Screen. Jetzt "
            "responsiv gestaffelt: h-16 Phone → h-28 sm → h-52 Desktop "
            "(2.5x-Wunsch bleibt für große Screens)",
            "Container-Padding p-3 auf Phone (war p-6 = 24px, zu viel auf "
            "360px-Screens), p-6 ab Tablet",
            "Charts (Trends/Verteilung/Aktivität) waren bereits responsive "
            "(ResponsiveContainer), Filter-Bars haben flex-wrap — kein Fix "
            "nötig. Mobile-First-Refactor damit abgeschlossen.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.mobile-tables",
        released=date(2026, 5, 14),
        title="Mobile-First Welle 3: Tabellen phone-tauglich",
        highlights=[
            "Analyse → Solves: auf Phone zeigt die Tabelle nur noch #, "
            "Zeit, AO5, Aktionen — AO12/Cube/Hardware ab Tablet-Breite "
            "(Details immer über den ℹ-Button erreichbar)",
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
            "scrollbar (snap-scroll), auf Desktop wie bisher gleichmäßig "
            "verteilt — kein Umbrechen/Quetschen mehr bei 6 Top-Tabs",
            "Top-TabBar + Verwaltung-Sub-Tabs + Community-Sub-Tabs nutzen "
            "alle das gleiche Pattern",
            "Timer-Tab auf Mobile: Solving-Bereich (Scramble + Timer) "
            "kommt jetzt ZUERST, die Letzte-Solves-Historie darunter — "
            "vorher musste man auf dem Phone erst durch die Historie "
            "scrollen. Auf Desktop unverändert (Historie links).",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.postal-code",
        released=date(2026, 5, 14),
        title="Postleitzahl im Profil — Vorbereitung für Turnier-Nähe",
        highlights=[
            "Neues Profil-Feld 'Postleitzahl' in Verwaltung → Einstellungen "
            "→ Account → Profil (optional, multi-country-Format)",
            "Backend: User.postal_code (max 16 Zeichen) + Migration "
            "(idempotent via ALTER TABLE ADD COLUMN IF NOT EXISTS)",
            "PATCH /auth/me Whitelist erweitert — postal_code änderbar",
            "Vorbereitung für kommendes Feature: „Nächste WCA-Turniere "
            "in deiner Nähe\” — Daten werden bewusst jetzt schon gesammelt "
            "damit das Feature später direkt nutzbar ist",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.touch-text-mode",
        released=date(2026, 5, 14),
        title="Touch-Devices: Text-Eingabe erlaubt + WCA als Default",
        highlights=[
            "Auf Phone/Tablet ist Text-Eingabe-Modus jetzt wählbar (war "
            "vorher zwangsgespertt). Sinnvoll wenn man z.B. Bluetooth-"
            "Keyboard hat oder ohne Inspection-Countdown solven will.",
            "Frische Touch-User starten direkt mit WCA-Spacebar als "
            "Default — kein „erst Settings finden\”-Detour mehr.",
            "Bestehende User behalten ihre gespeicherten Settings unangetastet.",
            "Tipp-Hinweis-Text passt sich an: auf Touch + Text-Modus "
            "wird darauf hingewiesen dass Soft-Tastatur mühsam sein "
            "kann; auf Desktop + Text-Modus wird zum Spacebar-Timer "
            "eingeladen.",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.info-buttons-everywhere",
        released=date(2026, 5, 14),
        title="Info-Buttons in allen Karten",
        highlights=[
            "ⓘ-Buttons in 20+ Komponenten ergänzt — jede groessere Card "
            "hat jetzt einen Hover-/Klick-Tooltip mit Erklaerungstext",
            "Dashboard: Statistiken, Activity, Reminders, Challenges-Mini, "
            "Erfolge-Mini, Vergleich",
            "Analyse: Solve-Liste, Trends, Verteilung, Aktivitäts-Chart, "
            "Hardware-Vergleich",
            "Verwaltung: Sessions, Hardware-Inventar, Backup, csTimer-"
            "Import, csTimer-Export, Outliers, Account, Spacebar-Settings",
            "Trainer: Algorithm-Trainer, Erfolge, Tages-Challenges",
            "Community: Bestenliste, Freunde-Suche",
            "Admin: Statistiken, User-Liste, Bulk-Mail",
            "SettingsPanel Section-Helper erweitert — kann optional einen "
            "InfoButton-Slot rendern (Pattern für weitere Sub-Sektionen)",
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
            "Info-Button erklärt die drei Modi: Text-Eingabe / WCA / "
            "Pragmatisch mit konkretem User-Verhalten",
            "Wenn Text-Modus aktiv (Desktop): Tipp-Hinweis weist auf den "
            "Spacebar-Timer hin",
            "Auf Touch-Geräten ist Text-Modus disabled (Soft-Keyboard ist "
            "mühsam) — nur die zwei Spacebar-Varianten klickbar",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.user-menu",
        released=date(2026, 5, 14),
        title="User-Menu oben rechts (klassisches Account-Dropdown)",
        highlights=[
            "Klick auf Email/Avatar oben rechts öffnet jetzt ein Dropdown-"
            "Menu mit den Standard-Aktionen: Mein Account, Patch Notes, "
            "Was kann diese App, Logout",
            "Avatar mit Initialen (Display-Name oder Email-Anfangsbuchstaben), "
            "ADMIN-Badge wenn du Admin bist",
            "„Mein Account & Einstellungen\” springt direkt zum richtigen "
            "Sub-Tab in der Verwaltung (Settings inkl. AccountSettingsPanel)",
            "Patch Notes + Features-Modal sind dadurch über 3 Wege "
            "erreichbar: Version-Badge oben rechts, User-Menu, Footer-Link",
            "Alter Email-Text + nackter Logout-Link entfernt — UserMenu "
            "ersetzt beides",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.logo-kor",
        internal=True,
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
        internal=True,
        released=date(2026, 5, 14),
        title="Logo größer (Header 2.5× / Login 1.5×)",
        highlights=[
            "App-Header-Logo von 64-80px auf 160-208px Höhe "
            "(Faktor ~2.5×) — viel praesenter als Marke",
            "Login-Seite: Card-Breite max-w-md (448px) → max-w-[600px], "
            "Logo waechst proportional mit (~1.5×)",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.logo-info",
        internal=True,
        released=date(2026, 5, 14),
        title="Logo prominenter + Info-Buttons in Karten",
        highlights=[
            "App-Header: Logo ersetzt den separaten „cubetracker\”-"
            "Schriftzug + Tagline (war doppelt — das Logo enthält beides). "
            "Logo-Höhe 64-80px, klickbar zum Dashboard-Tab, mit Hover-"
            "Effekt. H1-Tag bleibt screenreader-only für SEO.",
            "Anmeldeseite: Logo nimmt jetzt die volle Card-Innenbreite ein "
            "(war zu klein im Verhaeltnis zum Whitespace) — Card-Breite "
            "etwas erhöht.",
            "Neue InfoButton-Komponente (ⓘ-Icon) mit Klick-/Hover-Popover. "
            "Schliesst bei Klick ausserhalb oder Esc.",
            "Info-Buttons platziert in: LIVE-Karte, Letzte-Solves-Tabelle, "
            "Trainings-Set, Scramble — erklärt die wichtigsten Begriffe "
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
            "Innerhalb der App: Footer-Link „Was kann diese App?\” öffnet "
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
            "Trainer + Verwaltung bleiben eigenständig (konservative "
            "Konsolidierung — Trainer-Sub-Tabs Heute/Algs/Erfolge sind "
            "konzeptionell zu eigenständig für Zerlegung)",
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
            "Apple-Touch-Icon für Homescreen-Install (vorab für PWA-Setup)",
        ],
    ),
    PatchNote(
        version="2.0.0-alpha.W.ux-quickwins",
        internal=True,
        released=date(2026, 5, 14),
        title="UX-Quick-Wins nach Audit",
        highlights=[
            "Patch Notes raus aus Verwaltung — sind jetzt ein Modal das "
            "via Klick auf den Versions-Badge oben rechts aufgeht "
            "(natuerlicherer Ort für Versions-Info)",
            "Discoverability-Card in Freunde-Tab konsolidiert — "
            "Display-Name jetzt inline editierbar, kein Verweis mehr "
            "nach Verwaltung → Einstellungen nötig",
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
            "Detail-Modal über den ℹ-Button verfügbar)",
            "Hardware-Spalte stattdessen — zeigt den Hardware-Namen "
            "für jeden Solve, oder „—\” wenn keine zugeordnet",
            "Cube-Spalte vereinfacht (Hardware-Sub-Zeile entfernt — "
            "wird ja jetzt eigenständig gezeigt)",
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
            "(default inaktiv) — kein Import-Button mehr nötig",
            "Lifespan-Backfill: bestehende User ohne Hardware kriegen die "
            "Liste beim nächsten Cold-Start nachgepflegt",
            "Pro Cube-Type-Gruppe: Checkbox 'alle markieren' + Bulk-Buttons "
            "(aktivieren, deaktivieren, löschen)",
            "Expliziter Umbenennen-Button bei jedem Eintrag",
            "Header zeigt jetzt 'X aktiv von Y' statt nur Total",
        ],
        commit="8d24cbc",
    ),
    PatchNote(
        version="2.0.0-alpha.W.hardware-seed-fix",
        internal=True,
        released=date(2026, 5, 13),
        title="Bug-Fix: Hardware-Seed-Endpoint im Web-Backend nachgeruestet",
        highlights=[
            "Frontend-Seed-Button war funktionslos (Endpoint existierte nur "
            "im Desktop-Backend) — jetzt multi-user-safe geportet",
            "pyproject.toml packages-Liste um friends/leaderboard/seeds "
            "ergänzt für sauberen Pip-Install",
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
            "Analyse → Solves: zusätzlich Solvenummer-Spalte + Sortierung "
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
            "Anfragen-Workflow: schicken, annehmen, ablehnen, zurücknehmen",
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
            "Manual-Trigger über Actions-Tab",
            "BACKUP.md mit Restore-Anleitung",
        ],
        commit="29074ba",
    ),
    PatchNote(
        version="2.0.0-alpha.W.admin-2",
        internal=True,
        released=date(2026, 5, 13),
        title="Admin User-Management + Ad-hoc-Mail + Bulk-Announcement",
        highlights=[
            "User-Liste mit Solve-Count + Aktivität, Deaktivieren/Aktivieren",
            "Email manuell verifizieren (Support-Hilfe)",
            "DSGVO-Hard-Delete mit Pflicht-Confirm-String",
            "Ad-hoc-Mail an einzelne User",
            "Bulk-Announcement mit Dry-Run-Workflow",
        ],
        commit="faedeec",
    ),
    PatchNote(
        version="2.0.0-alpha.W.admin-1",
        internal=True,
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
        title="Touch-Timer für Phone + F19-Race-Fix",
        highlights=[
            "Auf Touch-Devices erscheint im Timer-Tab ein großer Tap-Pad",
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
            "UTC-aware datetimes für Postgres-Kompatibilitaet",
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
    """Neuester *public* Eintrag = aktuelle App-Version. Wird von main.py
    importiert und ueber /api/health oeffentlich gezeigt. Defensiv:
    internal=True-Eintraege werden uebersprungen, damit kein interner
    Wellen-Name oeffentlich leakt (Fix aus W.patchnotes-intern-qa).

    Konvention: PATCH_NOTES[0] ist konventionell der chronologisch
    neueste Eintrag (egal ob public/internal). Falls dieser internal
    ist, faellt current_version() defensiv auf den ersten public-
    Eintrag zurueck — App-Version bleibt damit immer public.
    """
    return next(
        (pn.version for pn in PATCH_NOTES if not pn.internal),
        PATCH_NOTES[0].version,  # Fallback wenn alle internal (sollte nie passieren)
    )


# Defensive Konsistenz-Pruefung: jeder Versions-String muss unique sein,
# sonst koennten der __version__-Mechanismus oder der Tag-Workflow stille
# Duplikate uebersehen. Greift beim Import (FastAPI-Startup).
assert len({pn.version for pn in PATCH_NOTES}) == len(PATCH_NOTES), (
    "Duplikat-Version in PATCH_NOTES — jeder version-String muss unique sein"
)
