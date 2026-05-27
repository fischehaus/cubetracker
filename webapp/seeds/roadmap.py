"""Seed-Daten für Roadmap-Items (Phase W.roadmap-db, 2026-05-28).

Erst-Bootstrap der `roadmap_items`-Tabelle beim Cold-Start. Idempotent:
wenn schon Items in der Tabelle sind, wird nichts angelegt.

Quelle: kuratierte Liste basierend auf `webapp/frontend/src/lib/
roadmap-data.ts` (Stand 2026-05-27), bereinigt um:
- alle `done: true`-Items (Hetzner-Migration komplett, Backlog-Sprint
  fertig, Turnier-Sprint Items done)
- alle veralteten Einträge (i18n + WCA-Profil sind seit dem Sprint live)

Nur ECHT-NOCH-OFFENE Items werden gesäht. Nach dem Seed übernimmt der
Admin via Admin-UI die Pflege (add/edit/delete/internal-toggle).

Format pro Item: dict mit den Pflicht-Feldern für RoadmapItemCreate.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session as OrmSession


# Items sortiert pro Phase. sort_order wird automatisch in 10er-
# Schritten vergeben (10, 20, 30, ...) — lässt Lücken für späteres
# Insert ohne komplettes Re-Ordern.
ROADMAP_SEED: list[dict[str, Any]] = [
    # ============================================================
    # P1 — Polish & Casual-Onboarding (Mai-Juni 2026)
    # ============================================================
    {
        "phase_id": "P1",
        "title_de": "PWA-Setup (Phone-Homescreen-Install)",
        "title_en": "PWA setup (phone home-screen install)",
        "note_de": (
            "Cubetracker als Progressive Web App installierbar machen — "
            "manifest.json + service worker + Icon-Set. Nutzer kann die "
            "App vom Browser auf den Home-Screen legen."
        ),
        "note_en": (
            "Make Cubetracker installable as a Progressive Web App — "
            "manifest.json + service worker + icon set. Users can add "
            "the app to their phone's home screen from the browser."
        ),
        "effort": "1 Tag",
        "internal": False,
    },
    # ============================================================
    # P3 — Multi-User-USP (August 2026)
    # ============================================================
    {
        "phase_id": "P3",
        "title_de": "Activity-Feed: was haben Freunde zuletzt gemacht",
        "title_en": "Activity feed: what have friends been up to",
        "note_de": (
            "Chronologische Liste der letzten Solves + PRs + Achievements "
            "von Freunden. Wichtigstes Differenzierungs-Feature gegenüber "
            "csTimer (die haben kein Multi-User)."
        ),
        "note_en": (
            "Chronological feed of friends' recent solves, PRs and "
            "achievements. Most important differentiator vs. csTimer "
            "(which has no multi-user features)."
        ),
        "effort": "~3 Tage",
        "internal": False,
    },
    {
        "phase_id": "P3",
        "title_de": "Public-Profile als teilbare Solving-Card",
        "title_en": "Public profile as a shareable solving card",
        "note_de": (
            "Pro User eine öffentliche Profil-Seite mit Stats, PRs, "
            "Hardware-Setup. Optional teilbar via Link."
        ),
        "note_en": (
            "Public profile page per user with stats, PRs, hardware "
            "setup. Optionally shareable via link."
        ),
        "effort": "~2 Tage",
        "internal": False,
    },
    {
        "phase_id": "P3",
        "title_de": "Online-Battle / Race-Mode (WebSocket)",
        "title_en": "Online battle / race mode (WebSocket)",
        "note_de": (
            "Killer-Feature. Echtzeit-Race gegen Freunde auf einem "
            "shared Scramble. WebSocket-Infrastruktur."
        ),
        "note_en": (
            "Killer feature. Real-time race against friends on a shared "
            "scramble. WebSocket infrastructure."
        ),
        "effort": "~2-3 Wochen",
        "internal": False,
    },
    {
        "phase_id": "P3",
        "title_de": "Friend-Challenges (1v1 Best-of-AO5)",
        "title_en": "Friend challenges (1v1 best-of-AO5)",
        "note_de": "Baut auf der Battle-Infrastruktur auf.",
        "note_en": "Builds on the battle infrastructure.",
        "effort": "~1 Woche",
        "internal": False,
    },
    # ============================================================
    # P4 — Power-User-Anschluss (September - November 2026)
    # ============================================================
    {
        "phase_id": "P4",
        "title_de": "3D-Cube-Visualisierung (cubing.js)",
        "title_en": "3D cube visualization (cubing.js)",
        "note_de": (
            "Basis-Investment. Schaltet Reconstruction-Tool + Replay-"
            "Feature später frei."
        ),
        "note_en": (
            "Foundation investment. Unlocks the reconstruction tool + "
            "replay feature later."
        ),
        "effort": "~2-4 Wochen",
        "internal": False,
    },
    {
        "phase_id": "P4",
        "title_de": "Bluetooth Smart Cube (GAN/MoYu via gan-web-bluetooth)",
        "title_en": "Bluetooth smart cube (GAN/MoYu via gan-web-bluetooth)",
        "note_de": "Power-User-Standard. Web-Bluetooth-API.",
        "note_en": "Power-user standard. Web Bluetooth API.",
        "effort": "~2-4 Wochen",
        "internal": False,
    },
    {
        "phase_id": "P4",
        "title_de": "Reconstruction-Tool (Solver findet Lösung zum Solve)",
        "title_en": "Reconstruction tool (solver finds solution for a solve)",
        "note_de": "Setzt 3D-Visualisierung voraus. Komplex.",
        "note_en": "Requires 3D visualization first. Complex.",
        "effort": "~3-6 Wochen",
        "internal": False,
    },
    {
        "phase_id": "P4",
        "title_de": "3x3 + 4x4 Trainer-Subsets via csTimer (ZBLL/ZBLS/VLS/COLL/Roux/EOline/2gen/CTO/EDO/ELL/…)",
        "title_en": "3x3 + 4x4 trainer subsets via csTimer (ZBLL/ZBLS/VLS/COLL/Roux/EOline/2gen/CTO/EDO/ELL/…)",
        "note_de": (
            "csTimer-Files scramble_333_edit.js (36KB, 40+ Subsets) + "
            "scramble_444.js (77KB, 14 Subsets) vendoren. Integration "
            "als Session.scramble_type-Optionen + Alg-Trainer-UI-"
            "Erweiterung. Power-User-Standard."
        ),
        "note_en": (
            "Vendor csTimer files scramble_333_edit.js (36KB, 40+ "
            "subsets) + scramble_444.js (77KB, 14 subsets). Integration "
            "as Session.scramble_type options + alg-trainer UI "
            "extension. Power-user standard."
        ),
        "effort": "~1-2 Wochen",
        "internal": False,
    },
    # ============================================================
    # P5 — Reichweite & internationale User (Q4 2026)
    # ============================================================
    {
        "phase_id": "P5",
        "title_de": "PLL-Bilder einbinden (analog OLL)",
        "title_en": "Embed PLL diagrams (analogous to OLL)",
        "note_de": "Wartet auf User-Lieferung der 21 PNGs.",
        "note_en": "Waiting for user to provide the 21 PNGs.",
        "effort": "~30 Min",
        "internal": False,
    },
    {
        "phase_id": "P5",
        "title_de": "Gear / Redi / Master Pyra+Skewb Random-State-Solver",
        "title_en": "Gear / Redi / Master Pyra + Skewb random-state solvers",
        "note_de": "Template aus ivyScramble.ts.",
        "note_en": "Template from ivyScramble.ts.",
        "effort": "je ~2-5 Tage",
        "internal": False,
    },
    {
        "phase_id": "P5",
        "title_de": "News-Quellen erweitern (HTML-Scraping)",
        "title_en": "Extend news sources (HTML scraping)",
        "note_de": None,
        "note_en": None,
        "effort": "1-2 Tage",
        "internal": False,
    },
    {
        "phase_id": "P5",
        "title_de": "Cookieless-Analytics (Besucherzahlen ohne Cookie-Banner)",
        "title_en": "Cookieless analytics (visitor stats without a cookie banner)",
        "note_de": (
            "Z.B. self-hosted Umami auf Coolify oder Plausible. Keine "
            "Tracking-Cookies, kein Consent-Banner, DSGVO-freundlich. "
            "Google Analytics bewusst NICHT (würde ein Cookie-Banner "
            "erzwingen)."
        ),
        "note_en": (
            "E.g. self-hosted Umami on Coolify or Plausible. No "
            "tracking cookies, no consent banner, GDPR-friendly. "
            "Google Analytics is deliberately excluded (it would "
            "force a cookie banner)."
        ),
        "effort": "~1-2 Tage",
        "internal": False,
    },
    # ============================================================
    # P6 — Nische / Spezial-User (offen)
    # ============================================================
    {
        "phase_id": "P6",
        "title_de": "csTimer-Vendor dynamic-importen (Bundle-Split)",
        "title_en": "Dynamic-import the csTimer vendor (bundle split)",
        "note_de": (
            "Aktuell wird der csTimer-Vendor (~50KB raw / ~16KB gz) "
            "statisch geladen, auch für User die nie inoffizielle Cubes "
            "nutzen. Async-Refactor: generateScramble wird Promise-"
            "basiert, csTimer-Vendor wird beim ersten Bedarf via "
            "dynamic import() geholt. QA-Befund SOLLTE #4 vom 2026-05-17."
        ),
        "note_en": (
            "The csTimer vendor (~50KB raw / ~16KB gz) is currently "
            "loaded statically, even for users who never touch "
            "unofficial cubes. Async refactor: generateScramble becomes "
            "Promise-based, csTimer vendor fetched on first need via "
            "dynamic import(). QA finding SHOULD #4 from 2026-05-17."
        ),
        "effort": "~1 Tag",
        "internal": True,
    },
    {
        "phase_id": "P6",
        "title_de": "Backend-Test-Suite einführen (pytest unter webapp/tests/)",
        "title_en": "Add backend test suite (pytest under webapp/tests/)",
        "note_de": (
            "Aktuell 0% Test-Coverage auf den Backend-Endpoints (kein "
            "webapp/tests/-Folder). pyproject.toml verweist auf "
            "testpaths=['tests'] das nicht existiert. Mindestens Smoke-"
            "Tests pro Endpoint-Cluster (auth, solves, sessions, admin, "
            "live-tests, etc.). QA-Befund 2026-05-17."
        ),
        "note_en": (
            "Currently 0% test coverage on the backend endpoints (no "
            "webapp/tests/ folder). pyproject.toml references "
            "testpaths=['tests'] which doesn't exist. At least smoke "
            "tests per endpoint cluster (auth, solves, sessions, admin, "
            "live-tests, etc.). QA finding 2026-05-17."
        ),
        "effort": "~1-2 Tage initial",
        "internal": True,
    },
    {
        "phase_id": "P6",
        "title_de": "Alembic statt Inline-Mini-Migrations in main.py",
        "title_en": "Alembic instead of inline mini-migrations in main.py",
        "note_de": (
            "Die aktuelle `ALTER TABLE IF NOT EXISTS`-Liste in "
            "main.py:lifespan ist Postgres-only-Syntax + Fehler werden "
            "silently als WARN geloggt. Alembic löst beide Probleme. "
            "Niedrige Prio solange wir nur Postgres-Prod nutzen, aber "
            "wenn SQLite-Tests dazukommen muss es kommen."
        ),
        "note_en": (
            "The current `ALTER TABLE IF NOT EXISTS` list in main.py:"
            "lifespan uses Postgres-only syntax and errors are silently "
            "logged as WARN. Alembic solves both. Low priority while "
            "we only run Postgres in prod, but mandatory once SQLite "
            "tests are added."
        ),
        "effort": "~1 Tag",
        "internal": True,
    },
    {
        "phase_id": "P6",
        "title_de": "csTimer solver/-Files vendoren (schaltet 8 weitere Puzzles frei)",
        "title_en": "Vendor more csTimer solver/ files (unlocks 8 more puzzles)",
        "note_de": (
            "Aktuell sind helicopter/gigaminx/bicube/bandaged_square/"
            "square_2/curvy_copter/diamond + megaminx-RS aus der UI "
            "entfernt weil utilscramble.js + megaminx.js leerstring/"
            "null returnen ohne solver/megaminx.js (32KB) + solver/"
            "ftocta.js (27KB) + grouplib.js (26KB) + poly3dlib.js "
            "(35KB). Zusätzlich braucht jedes Puzzle den passenden "
            "solver-state-graph. Re-Vendoring + Smoke-Tests pro Puzzle."
        ),
        "note_en": (
            "helicopter, gigaminx, bicube, bandaged_square, square_2, "
            "curvy_copter, diamond and megaminx-RS are currently "
            "removed from the UI because utilscramble.js + megaminx.js "
            "return empty/null without solver/megaminx.js (32KB) + "
            "solver/ftocta.js (27KB) + grouplib.js (26KB) + poly3dlib.js "
            "(35KB). Each puzzle also needs its solver state graph. "
            "Re-vendor + smoke tests per puzzle."
        ),
        "effort": "~1-2 Tage",
        "internal": False,
    },
    {
        "phase_id": "P6",
        "title_de": "Random-Move-Fallback-Specs für Dino/Floppy/Tower (csTimer-Cubes)",
        "title_en": "Random-move fallback specs for Dino/Floppy/Tower (csTimer cubes)",
        "note_de": (
            "Wenn csTimer-Init crashen sollte, returnt generateScramble "
            "für die 3 verbleibenden csTimer-Cubes (Dino/Floppy/Tower) "
            "leerstring. Kurze Random-Move-Specs (analog ivy/gear/"
            "redi-Specs) wären ein robusterer Fallback. QA-Befund "
            "SOLLTE #3 vom 2026-05-17."
        ),
        "note_en": (
            "If csTimer init crashes, generateScramble returns an "
            "empty string for the 3 remaining csTimer cubes (Dino/"
            "Floppy/Tower). Short random-move specs (analogous to "
            "ivy/gear/redi specs) would be a more robust fallback. "
            "QA finding SHOULD #3 from 2026-05-17."
        ),
        "effort": "1-2h",
        "internal": True,
    },
    {
        "phase_id": "P6",
        "title_de": "Metronom (Trainings-TPS-Hilfe)",
        "title_en": "Metronome (training TPS aid)",
        "note_de": None,
        "note_en": None,
        "effort": "1-2 Tage",
        "internal": False,
    },
    {
        "phase_id": "P6",
        "title_de": "BLD-Helper (Constraint-Scrambler)",
        "title_en": "BLD helper (constraint scrambler)",
        "note_de": None,
        "note_en": None,
        "effort": "1-2 Wochen",
        "internal": False,
    },
    {
        "phase_id": "P6",
        "title_de": "FMC-Modus (Move-Counter)",
        "title_en": "FMC mode (move counter)",
        "note_de": None,
        "note_en": None,
        "effort": "1 Woche",
        "internal": False,
    },
    {
        "phase_id": "P6",
        "title_de": "Stackmat-Hardware-Input (USB/Audio)",
        "title_en": "Stackmat hardware input (USB/audio)",
        "note_de": None,
        "note_en": None,
        "effort": "1-2 Wochen",
        "internal": False,
    },
    {
        "phase_id": "P6",
        "title_de": "Cross / EOLine / Roux-Solver",
        "title_en": "Cross / EOLine / Roux solvers",
        "note_de": None,
        "note_en": None,
        "effort": "je 1-2 Wochen",
        "internal": False,
    },
    {
        "phase_id": "P6",
        "title_de": "Gruppen + Coaching (Trainer/Schüler)",
        "title_en": "Groups + coaching (coach/student)",
        "note_de": None,
        "note_en": None,
        "effort": "1 Woche+",
        "internal": False,
    },
    {
        "phase_id": "P6",
        "title_de": "VRC-Replay",
        "title_en": "VRC replay",
        "note_de": None,
        "note_en": None,
        "effort": "2-3 Wochen (braucht 3D-Vis)",
        "internal": False,
    },
    {
        "phase_id": "P6",
        "title_de": "Virtual-Cube-Input (Tastatur-Solve)",
        "title_en": "Virtual cube input (keyboard solve)",
        "note_de": None,
        "note_en": None,
        "effort": "1-2 Wochen",
        "internal": False,
    },
    {
        "phase_id": "P6",
        "title_de": "Multi-BLD",
        "title_en": "Multi-BLD",
        "note_de": None,
        "note_en": None,
        "effort": "1 Woche",
        "internal": False,
    },
    {
        "phase_id": "P6",
        "title_de": "Color-Themes (Custom-Farbschemen)",
        "title_en": "Color themes (custom color schemes)",
        "note_de": None,
        "note_en": None,
        "effort": "3-5 Tage",
        "internal": False,
    },
]


# ============================================================
# Additive Migrations — Items nachträglich in eine schon befüllte DB
# einspielen. Idempotent pro Item via title_de-Match. Wird in
# main.py:lifespan NACH bootstrap_roadmap aufgerufen.
# ============================================================

# W.ux-demo-polish (2026-05-28): 5 Items aus dem UX-Audit-Schnell-Scan
# als „echte Mängelliste, die wir nach der Meppel-Demo angehen".
UX_POLISH_ITEMS: list[dict[str, Any]] = [
    {
        "phase_id": "P1",
        "title_de": "503-Banner für WCA-Profil (globale Fail-Anzeige)",
        "title_en": "503 banner for WCA profile (global fail indicator)",
        "note_de": (
            "Wenn die WCA-API down ist, zeigt die WcaProfileCard aktuell "
            "nur einen inline-Fehler. Besser: globales Banner oben in der "
            "App ('WCA-Service derzeit nicht erreichbar'), damit der User "
            "weiß dass das Stats-Bild unvollständig sein kann. Analog "
            "zum bestehenden 401-Logout-Pattern."
        ),
        "note_en": (
            "When the WCA API is down, WcaProfileCard currently only "
            "shows an inline error. Better: a global banner at the top "
            "(\"WCA service is currently unavailable\") so the user knows "
            "the stats picture may be incomplete. Analogous to the "
            "existing 401-logout pattern."
        ),
        "effort": "~1h",
        "internal": False,
    },
    {
        "phase_id": "P1",
        "title_de": "Toast-Manager (Severity-Stacking + dedizierte Engine)",
        "title_en": "Toast manager (severity stacking + dedicated engine)",
        "note_de": (
            "Aktuell drei unabhängige Toaster (Achievement / Challenge / "
            "Feedback-Unread) ohne Konkurrenz-Logik. Bei mehreren "
            "gleichzeitigen Events kann die UI überladen wirken. Ein "
            "zentraler Toast-Manager mit Severity (error > warning > "
            "success) und max-N-Cap würde das ordnen."
        ),
        "note_en": (
            "Currently three independent toasters (Achievement / "
            "Challenge / Feedback unread) without competition logic. "
            "When multiple events fire simultaneously, the UI can feel "
            "overloaded. A central toast manager with severity (error > "
            "warning > success) and a max-N cap would fix this."
        ),
        "effort": "~4h",
        "internal": False,
    },
    {
        "phase_id": "P1",
        "title_de": "Solve-Liste: Virtualisierung für 1000+ Solves",
        "title_en": "Solve list: virtualization for 1000+ solves",
        "note_de": (
            "Die SolveList rendert aktuell alle Zeilen gleichzeitig — "
            "bei Limit=1000 oder 'Alle' merkt man das auf älteren "
            "Phones als Scroll-Ruckler. react-window oder ähnliches "
            "rendert nur den sichtbaren Viewport."
        ),
        "note_en": (
            "The SolveList currently renders all rows at once — at "
            "limit=1000 or \"All\" this is noticeable as scroll lag on "
            "older phones. react-window or similar renders only the "
            "visible viewport."
        ),
        "effort": "~3h",
        "internal": False,
    },
    {
        "phase_id": "P1",
        "title_de": "Recharts Code-Splitting (Bundle-Optimierung)",
        "title_en": "Recharts code splitting (bundle optimization)",
        "note_de": (
            "Recharts ist ~80kb gzipped und wird aktuell statisch "
            "geladen, auch für User die nie den Analyse-Tab öffnen. "
            "React.lazy() pro Chart-Komponente würde das initiale "
            "Bundle ~70kb kleiner machen."
        ),
        "note_en": (
            "Recharts is ~80kb gzipped and currently loaded statically, "
            "even for users who never open the analysis tab. React."
            "lazy() per chart component would shrink the initial bundle "
            "by ~70kb."
        ),
        "effort": "~2h",
        "internal": True,
    },
    {
        "phase_id": "P1",
        "title_de": "Cache-Invalidation refactoren (Query-Key-Prefix)",
        "title_en": "Refactor cache invalidation (query-key prefix)",
        "note_de": (
            "useCreateSolve invalidiert aktuell 15 separate React-Query-"
            "Keys (stats, stats-by-cube, stats-by-session, ...). Mit "
            "einem Prefix-Pattern wäre das ein einzelnes invalidate"
            "Queries(['stats']) — weniger Code, weniger Bug-Potenzial "
            "bei neuen Stats-Endpoints."
        ),
        "note_en": (
            "useCreateSolve currently invalidates 15 separate React "
            "Query keys (stats, stats-by-cube, stats-by-session, …). "
            "With a prefix pattern this would be a single "
            "invalidateQueries(['stats']) — less code, fewer bugs when "
            "adding new stats endpoints."
        ),
        "effort": "~3h",
        "internal": True,
    },
]


def bootstrap_ux_polish_items(db: OrmSession) -> int:
    """Additive Migration für die 5 UX-Polish-Items (W.ux-demo-polish).

    Anders als `bootstrap_roadmap` arbeitet diese Funktion per-Item:
    nur Items mit unbekanntem `title_de` werden angelegt. So können wir
    auch in eine bereits gefüllte Live-DB neue Items nachreichen ohne
    den Count-Check zu durchbrechen.

    `sort_order` wird ans Ende der jeweiligen Phase angehängt
    (max(sort_order) + 10).

    Returns: Anzahl neu angelegter Items.
    """
    from db.models import RoadmapItem

    created = 0
    for entry in UX_POLISH_ITEMS:
        existing = db.execute(
            select(RoadmapItem).where(RoadmapItem.title_de == entry["title_de"])
        ).scalar_one_or_none()
        if existing is not None:
            continue
        max_sort = (
            db.execute(
                select(func.max(RoadmapItem.sort_order)).where(
                    RoadmapItem.phase_id == entry["phase_id"]
                )
            ).scalar()
            or 0
        )
        db.add(
            RoadmapItem(
                phase_id=entry["phase_id"],
                sort_order=max_sort + 10,
                title_de=entry["title_de"],
                title_en=entry["title_en"],
                note_de=entry.get("note_de"),
                note_en=entry.get("note_en"),
                effort=entry.get("effort"),
                status=entry.get("status", "active"),
                internal=entry.get("internal", False),
            )
        )
        created += 1
    if created > 0:
        db.commit()
    return created


def bootstrap_roadmap(db: OrmSession) -> int:
    """Idempotenter Seeder für die Roadmap-Items.

    **Geändert in W.roadmap-restore (2026-05-28):** von count-check
    (`if existing > 0: return 0`) auf **per-Item-Idempotenz**
    umgestellt. Grund: am 28.05. trat ein Datenverlust auf (25 von
    28 Items waren in der Live-DB verschwunden, vermutlich Postgres-
    Volume-Issue bei einem Coolify-Deploy). Mit per-Item-Check kommen
    fehlende Items beim nächsten Boot automatisch zurück.

    Idempotenz pro Item: title_de-Match. Wenn ein Item mit demselben
    title_de schon existiert (egal in welcher Phase, mit welchem
    Status), wird es NICHT überschrieben — nur fehlende Items werden
    neu angelegt.

    `sort_order` für neu angelegte Items: ans Ende der jeweiligen
    Phase (max(sort_order) + 10). So bleiben User-eigene sort_order-
    Anpassungen via Admin-UI erhalten.

    **Trade-off:** wenn der Admin ein Item aus ROADMAP_SEED via
    Admin-UI bewusst löscht, kommt es beim nächsten Container-
    Neustart zurück. Mitigation: Item aus ROADMAP_SEED rauseditieren
    (= permanent entfernt) ODER `internal=True` via Admin-UI setzen
    (=für User unsichtbar, aber im Audit-Trail erhalten).

    Returns: Anzahl neu angelegter Items.
    """
    from db.models import RoadmapItem

    created = 0
    for entry in ROADMAP_SEED:
        existing = db.execute(
            select(RoadmapItem).where(RoadmapItem.title_de == entry["title_de"])
        ).scalar_one_or_none()
        if existing is not None:
            continue
        max_sort = (
            db.execute(
                select(func.max(RoadmapItem.sort_order)).where(
                    RoadmapItem.phase_id == entry["phase_id"]
                )
            ).scalar()
            or 0
        )
        db.add(
            RoadmapItem(
                phase_id=entry["phase_id"],
                sort_order=max_sort + 10,
                title_de=entry["title_de"],
                title_en=entry["title_en"],
                note_de=entry.get("note_de"),
                note_en=entry.get("note_en"),
                effort=entry.get("effort"),
                status=entry.get("status", "active"),
                internal=entry.get("internal", False),
            )
        )
        created += 1
    if created > 0:
        db.commit()
    return created
