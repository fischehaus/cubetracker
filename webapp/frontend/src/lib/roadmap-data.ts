// Roadmap-Daten fuer das RoadmapModal (Phase W.roadmap-frontend, 2026-05-17).
//
// Single-Source: wenn neue Items dazukommen oder eine Phase fertig wird,
// hier aenderen — Modal zeigt's automatisch.
//
// Status:
//   "active"    — gerade dran (P1 typischerweise)
//   "planned"   — kommt als naechstes
//   "future"    — schon geplant aber spaeter
//   "ongoing"   — laeuft kontinuierlich (Workflow / Polish)

export type PhaseStatus = "active" | "planned" | "future" | "ongoing";

export interface RoadmapItem {
  title: string;
  done?: boolean; // bereits erledigt innerhalb dieser Phase
  effort?: string; // grobe Schaetzung, optional
  note?: string; // 1-Satz Begruendung / Detail, optional
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
        title: "Scramble-Bild 2D-Net pro Scramble",
        effort: "~1 Woche",
        note: "Visuelle Verifikation — Standard-Erwartung an Speedcubing-Timer.",
      },
      { title: "PWA-Setup (Phone-Homescreen-Install)", effort: "1 Tag" },
    ],
  },
  {
    id: "P2",
    status: "planned",
    title: "Hetzner-Migration",
    timeframe: "Mitte Juli 2026",
    summary:
      "Pflicht: Render-Free-Postgres laeuft nach 90 Tagen aus (~2026-08-08). Coolify-basiertes Setup auf Hetzner Cloud.",
    items: [
      { title: "Coolify-Server aufsetzen", effort: "1-2 Tage" },
      { title: "Daten-Migration via JSON-Backup-Endpoint", effort: "1 Tag" },
      { title: "DNS-Switch + Let's-Encrypt-SSL", effort: "1 Tag" },
      { title: "Live-Verifikation + Render-Abbau", effort: "1 Tag" },
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
        title: "Reconstruction-Tool (Solver findet Loesung zum Solve)",
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
      { title: "WCA-Profil-Verknuepfung", effort: "~1 Woche" },
      {
        title: "Gear / Redi / Master Pyra+Skewb Random-State-Solver",
        effort: "je ~2-5 Tage",
        note: "Template aus ivyScramble.ts.",
      },
      { title: "News-Quellen erweitern (HTML-Scraping)", effort: "1-2 Tage" },
    ],
  },
  {
    id: "P6",
    status: "ongoing",
    title: "Nische / Spezial-User (auf Anfrage)",
    timeframe: "offen",
    summary:
      "Features fuer Tiefen-User die wir bauen wenn jemand konkret danach fragt. Reihenfolge je nach Bedarf.",
    items: [
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

export const ROADMAP_INTRO = `Cubetracker ist in aktiver Entwicklung — kein Feature-Freeze. Diese Liste zeigt was als Naechstes kommt + warum. Reihenfolge orientiert sich an User-Wert vs Aufwand vs strategischer Differenzierung von csTimer.`;
