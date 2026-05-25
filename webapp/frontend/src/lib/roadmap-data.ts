// Roadmap-Daten für das RoadmapModal (Phase W.roadmap-frontend, 2026-05-17).
//
// Single-Source: wenn neue Items dazukommen oder eine Phase fertig wird,
// hier ändern — Modal zeigt's automatisch.
//
// Status:
//   "active"    — gerade dran (P1 typischerweise)
//   "planned"   — kommt als nächstes
//   "future"    — schon geplant aber später
//   "ongoing"   — läuft kontinuierlich (Workflow / Polish)
//   "done"      — abgeschlossen

export type PhaseStatus = "active" | "planned" | "future" | "ongoing" | "done";

export interface RoadmapItem {
  title: string;
  done?: boolean; // bereits erledigt innerhalb dieser Phase
  effort?: string; // grobe Schätzung, optional
  note?: string; // 1-Satz Begründung / Detail, optional
}

export interface RoadmapPhase {
  id: string;
  status: PhaseStatus;
  title: string;
  timeframe: string;
  summary: string;
  items: RoadmapItem[];
}

export const ROADMAP_PHASES: RoadmapPhase[] = [
  {
    id: "P1",
    status: "active",
    title: "Polish & Casual-Onboarding",
    timeframe: "Mai - Juni 2026",
    summary:
      "Quick-Wins die Cubetracker auf csTimer-Niveau heben — sichtbare Mehrwerte, niedriger Aufwand pro Item.",
    items: [
      { title: "Voice-Alert Inspection (8s/12s, DE/EN)", done: true, effort: "1 Tag" },
      {
        title: "Penalty-Quick-Buttons direkt unterm Timer",
        done: true,
        effort: "1 Tag",
      },
      { title: "Custom-Scramble-Input", done: true, effort: "1 Tag" },
      { title: "Roadmap-Anzeige im Frontend (du bist gerade hier)", done: true, effort: "2h" },
      {
        title: "Impressum + Datenschutzerklärung",
        done: true,
        effort: "~1 Tag",
        note: "Rechtliche Pflichtseiten + Footer-Links. Kein Cookie-Banner — wir tracken dich nicht.",
      },
      {
        title: "Meine Daten — Backup & Export sichtbar machen",
        done: true,
        effort: "~0.5 Tag",
        note: "Dein vollständiges Backup jederzeit herunter- und wieder hochladen, direkt in den Konto-Einstellungen.",
      },
      {
        title: "Patch-Notes aufgeräumt (nur das Wesentliche)",
        effort: "~0.5-1 Tag",
        note: "Übersichtlichere Änderungs-Hinweise — ohne internen Technik-Kram.",
      },
      {
        title: "Average-Rekorde in der Solve-Liste markieren",
        effort: "~0.5 Tag",
        note: "Kleiner farbiger Punkt an deinen besten ao5/ao12 in der Solve-Liste.",
      },
      {
        title: "Dashboard: Letzte Rekorde auf einen Blick",
        effort: "~1 Tag",
        note: "Kompakte Liste deiner jüngsten Bestzeiten mit Verbesserung — Klick führt zum PB-Verlauf.",
      },
      {
        title: "Scramble-Bild 2D-Net pro Scramble",
        effort: "~1 Woche",
        note: "Visuelle Verifikation — Standard-Erwartung an Speedcubing-Timer.",
      },
      { title: "PWA-Setup (Phone-Homescreen-Install)", effort: "1 Tag" },
    ],
  },
  {
    id: "P2",
    status: "done",
    title: "Eigene Infrastruktur (Hetzner Cloud)",
    timeframe: "Mai 2026 — erledigt",
    summary:
      "Erledigt: Umzug auf eine eigene Hetzner-Cloud mit Coolify — eigene Domain, HTTPS, tägliche Backups, alle Daten übernommen. Die App läuft jetzt auf eigener Infrastruktur.",
    items: [
      { title: "Server + Coolify aufsetzen", done: true, effort: "1-2 Tage" },
      { title: "Daten-Migration (pg_dump/restore)", done: true, effort: "1 Tag" },
      { title: "DNS-Switch + Let's-Encrypt-SSL", done: true, effort: "1 Tag" },
      { title: "Live-Verifikation + tägliche Backups", done: true, effort: "1 Tag" },
    ],
  },
  {
    id: "P3",
    status: "future",
    title: "Multi-User-USP ausspielen",
    timeframe: "August 2026",
    summary:
      "Cubetrackers strategische Wette: die soziale Cubing-App. csTimer hat das alles NICHT — diese Phase macht uns einzigartig.",
    items: [
      {
        title: "Activity-Feed: was haben Freunde zuletzt gemacht",
        effort: "~3 Tage",
      },
      {
        title: "Public-Profile als teilbare Solving-Card",
        effort: "~2 Tage",
      },
      {
        title: "Online-Battle / Race-Mode (WebSocket)",
        effort: "~2-3 Wochen",
        note: "Killer-Feature. Echtzeit-Race gegen Freunde auf shared scramble.",
      },
      {
        title: "Friend-Challenges (1v1 Best-of-AO5)",
        effort: "~1 Woche",
        note: "Baut auf Battle-Infrastruktur auf.",
      },
    ],
  },
  {
    id: "P4",
    status: "future",
    title: "Power-User-Anschluss",
    timeframe: "September - November 2026",
    summary:
      "Bei den Power-User-Features auf csTimer aufholen. Hoechster Aufwand, aber unverzichtbar wenn Cubetracker ernst genommen werden soll.",
    items: [
      {
        title: "3D-Cube-Visualisierung (cubing.js)",
        effort: "~2-4 Wochen",
        note: "Basis-Investment. Schaltet Reconstruction + Replay frei.",
      },
      {
        title: "Bluetooth Smart Cube (GAN/MoYu via gan-web-bluetooth)",
        effort: "~2-4 Wochen",
        note: "Power-User-Standard. Web-Bluetooth-API.",
      },
      {
        title: "Reconstruction-Tool (Solver findet Lösung zum Solve)",
        effort: "~3-6 Wochen",
        note: "Setzt 3D-Vis voraus. Komplex.",
      },
      {
        title: "3x3- + 4x4-Trainer-Subsets via csTimer (ZBLL/ZBLS/VLS/COLL/Roux/EOline/2gen/CTO/EDO/ELL/...)",
        effort: "~1-2 Wochen",
        note: "csTimer-Files scramble_333_edit.js (36KB, 40+ Subsets) + scramble_444.js (77KB, 14 Subsets) vendoren. Integration als Session.scramble_type-Optionen + Alg-Trainer-UI-Erweiterung. Power-User-Standard.",
      },
    ],
  },
  {
    id: "P5",
    status: "future",
    title: "Reichweite & internationale User",
    timeframe: "Q4 2026",
    summary:
      "Skalierung — Markt-Oeffnung + restliche Custom-Scrambles.",
    items: [
      {
        title: "i18n (Englisch)",
        effort: "~2-3 Tage",
        note: "Globale Cubing-Community spricht Englisch.",
      },
      {
        title: "PLL-Bilder einbinden (analog OLL)",
        effort: "~30 Min",
        note: "Wartet auf User-Lieferung der 21 PNGs.",
      },
      { title: "WCA-Profil-Verknüpfung", effort: "~1 Woche" },
      {
        title: "Gear / Redi / Master Pyra+Skewb Random-State-Solver",
        effort: "je ~2-5 Tage",
        note: "Template aus ivyScramble.ts.",
      },
      { title: "News-Quellen erweitern (HTML-Scraping)", effort: "1-2 Tage" },
      {
        title: "Cookieless-Analytics (Besucherzahlen ohne Cookie-Banner)",
        effort: "~1-2 Tage",
        note: "z.B. self-hosted Umami auf Coolify oder Plausible. Keine Tracking-Cookies, kein Consent-Banner, DSGVO-freundlich. Google Analytics bewusst NICHT (würde ein Cookie-Banner erzwingen).",
      },
    ],
  },
  {
    id: "P6",
    status: "ongoing",
    title: "Nische / Spezial-User (auf Anfrage)",
    timeframe: "offen",
    summary:
      "Features für Tiefen-User die wir bauen wenn jemand konkret danach fragt. Reihenfolge je nach Bedarf.",
    items: [
      {
        title: "csTimer-Vendor dynamic-importen (Bundle-Split)",
        effort: "~1 Tag",
        note: "Aktuell wird csTimer-Vendor (~50KB raw / ~16KB gz) statisch geladen, auch für User die nie inoffizielle Cubes nutzen. Async-Refactor: generateScramble wird Promise-basiert, csTimer-Vendor wird beim ersten Bedarf via dynamic import() geholt. QA-Befund SOLLTE #4 vom 2026-05-17.",
      },
      {
        title: "Backend-Test-Suite (pytest unter webapp/tests/) einfuehren",
        effort: "~1-2 Tage initial",
        note: "Aktuell 0% Test-Coverage auf den Backend-Endpoints (kein webapp/tests/ Folder). pyproject.toml verweist auf testpaths=['tests'] das nicht existiert. Mindestens Smoke-Tests pro Endpoint-Cluster (auth, solves, sessions, admin, live-tests, etc.). QA-Befund 2026-05-17 abends.",
      },
      {
        title: "Alembic statt Inline-Mini-Migrations in main.py",
        effort: "~1 Tag",
        note: "Aktuelle `ALTER TABLE IF NOT EXISTS`-Liste in main.py:lifespan ist Postgres-only-Syntax + Fehler werden silently als WARN geloggt. Alembic löst beide Probleme. Niedrige Prio solange wir nur Postgres-Prod nutzen, aber wenn SQLite-Tests dazukommen muss es kommen. QA-Befund 2026-05-17 abends.",
      },
      {
        title: "csTimer solver/-Files vendoren (schaltet 8 weitere Puzzles frei)",
        effort: "~1-2 Tage",
        note: "Aktuell sind helicopter/gigaminx/bicube/bandaged_square/square_2/curvy_copter/diamond + megaminx-RS aus der UI entfernt weil utilscramble.js + megaminx.js leerstring/null returnen ohne solver/megaminx.js (32KB) + solver/ftocta.js (27KB) + grouplib.js (26KB) + poly3dlib.js (35KB). Zusätzlich braucht jedes Puzzle den passenden solver-state-graph. Re-Vendoring + Smoke-Tests pro Puzzle.",
      },
      {
        title: "Random-Move-Fallback-Specs für Dino/Floppy/Tower (csTimer-Cubes)",
        effort: "1-2h",
        note: "Wenn csTimer-Init crashen sollte, returnt generateScramble für die 3 verbleibenden csTimer-Cubes (Dino/Floppy/Tower) leerstring. Kurze Random-Move-Specs (analog ivy/gear/redi-Specs) wären ein robusterer Fallback. QA-Befund SOLLTE #3 vom 2026-05-17.",
      },
      { title: "Metronom (Trainings-TPS-Hilfe)", effort: "1-2 Tage" },
      { title: "BLD-Helper (Constraint-Scrambler)", effort: "1-2 Wochen" },
      { title: "FMC-Modus (Move-Counter)", effort: "1 Woche" },
      { title: "Stackmat-Hardware-Input (USB/Audio)", effort: "1-2 Wochen" },
      { title: "Cross/EOLine/Roux-Solver", effort: "je 1-2 Wochen" },
      { title: "Gruppen + Coaching (Trainer/Schueler)", effort: "1 Woche+" },
      { title: "VRC-Replay", effort: "2-3 Wochen (braucht 3D-Vis)" },
      { title: "Virtual-Cube-Input (Tastatur-Solve)", effort: "1-2 Wochen" },
      { title: "Multi-BLD", effort: "1 Woche" },
      { title: "Color-Themes (Custom-Farbschemen)", effort: "3-5 Tage" },
    ],
  },
];

export const ROADMAP_INTRO = `Cubetracker ist in aktiver Entwicklung — kein Feature-Freeze. Diese Liste zeigt was als Nächstes kommt + warum. Reihenfolge orientiert sich an User-Wert vs Aufwand vs strategischer Differenzierung von csTimer.`;
