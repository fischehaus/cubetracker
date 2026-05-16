// Feature-Liste fuer Anmeldeseite + In-App-Modal.
//
// Single-Source: pflegt sich hier, wird in 2 Komponenten geteilt
// (LoginPage + FeaturesModal). Konvention bei neuem Feature: hier
// einen Bullet ergaenzen statt nur Patch-Notes — Patch-Notes sind
// History, Features-Liste ist Marketing/Onboarding.

export interface FeatureCategory {
  title: string;
  icon: string;
  bullets: string[];
}

export const FEATURE_CATEGORIES: FeatureCategory[] = [
  {
    title: "Solving",
    icon: "⏱",
    bullets: [
      "WCA-konformer Timer mit Spacebar-Modus + Inspection (15s Countdown, +2/DNF-Penalty automatisch)",
      "Drei Timer-Modi direkt im Timer-Tab waehlbar: Text-Eingabe / Spacebar-WCA / Spacebar-Pragmatisch",
      "Touch-Timer fuer Phone: Tippen + Halten ersetzt die Space-Taste",
      "Scramble-Generator fuer alle WCA-Cubes (2x2 bis 7x7, Pyraminx, Skewb, Square-1, Megaminx, Clock) PLUS Inoffizielle (Ivy, Gear, Redi, Master Pyraminx, Master Skewb, FTO) — Picker direkt in der Scramble-Karte",
      "Trainings-Sets: 5/12/25/50/100 Solves planen, am Ende Set-Statistik + Coaching-Feedback",
      "Auto-Preselect: am haeufigsten genutzte Hardware fuer den aktuellen Cube wird vorgeschlagen",
      "Sessions strukturieren das Training (z.B. OH, PLL-Drills, Cold-Solves)",
    ],
  },
  {
    title: "Analyse",
    icon: "📈",
    bullets: [
      "Best Times: Single, Mo3, AO5, AO12, AO100 — alle WCA-konform berechnet (+2 + DNF-Trim)",
      "Best-Avg-Timestamps: zu jedem Best-AO siehst du das Datum an dem es erreicht wurde",
      "Aktuelle Form-Anzeige: Live-AO5/AO12 vs Mittel der letzten 100/500/alle",
      "Sortierbare Solve-Liste mit Solvenummern, Mo3/AO5/AO12/AO100 als Spalten, Hardware-Zuordnung",
      "Detail-Modal pro Solve: vollstaendiger Scramble + Notiz + Kontext via ℹ-Button",
      "Charts: Trends ueber Zeit, Distribution-Verteilung, taegliche Aktivitaet",
      "Hardware-Performance-Vergleich: welcher Cube ist schneller fuer welchen Type",
    ],
  },
  {
    title: "Trainer",
    icon: "🏆",
    bullets: [
      "Achievements: 30+ Erfolge die du nebenbei freischaltest",
      "Daily Challenges: jeden Tag eine neue kleine Aufgabe",
      "Algs-Trainer fuer PLL + OLL mit Selbst-Test-Modus — OLL mit allen 57 Visualisierungen (PLL-Bilder folgen)",
    ],
  },
  {
    title: "Community",
    icon: "🤝",
    bullets: [
      "Freunde-System: User per Display-Name oder Email finden, Anfragen schicken/annehmen",
      "Privacy-Opt-In: nur wer „Auffindbar\" aktiviert ist per Display-Name findbar",
      "Bestenliste: vergleich deine Best Single / AO5 / AO12 mit deinen Freunden",
    ],
  },
  {
    title: "Hardware-Inventar",
    icon: "🧊",
    bullets: [
      "Standard-Liste mit 30 verbreiteten Cubes wird automatisch angelegt (default inaktiv)",
      "Du markierst die Cubes die du wirklich besitzt + bekommst Statistik nach Hardware",
      "Bulk-Aktionen pro Cube-Type (aktivieren / deaktivieren / loeschen)",
      "Eigene Cubes anlegen + frei umbenennen",
    ],
  },
  {
    title: "Speedcubing-Welt",
    icon: "🌍",
    bullets: [
      "WCA-Turniere in deiner Naehe: Liste der naechsten offiziellen Wettkaempfe mit Distanz-Berechnung (Luftlinie) basierend auf deiner Postleitzahl + Land aus dem Profil",
      "DACH-Bonus: User in DE/AT/CH sehen automatisch auch Turniere aus den direkten Nachbarlaendern (DE-User z.B. AT, CH, NL, BE, LU, FR, DK, PL, CZ)",
      "Speedcubing-News aus drei kuratierten Quellen: WCA-Announcements (offizielle Mitteilungen), SpeedCubing.org (World Records + Coverage), r/Cubers (Community)",
      "Auto-Refresh: bei jeder Anmeldung pruefen wir im Hintergrund ob neue News verfuegbar sind — beim ersten Dashboard-Aufruf sind sie da, ohne Wartezeit",
      "Datenquellen sind die offizielle WCA-API + OpenStreetMap-Geocoding (keine Tracker, keine Drittanbieter-Cookies)",
    ],
  },
  {
    title: "Daten",
    icon: "📥",
    bullets: [
      "csTimer-Import: dein bestehender Bestand wird komplett uebernommen (Sessions + Solves + Scrambles + Notizen)",
      "csTimer-kompatibler Export: wechselbare Datenhoheit jederzeit",
      "Voll-Backup als JSON inkl. Achievements + Daily-Challenges-Historie",
      "Automatische Snapshots vor groesseren Aenderungen (Restore/Bulk-Import)",
    ],
  },
  {
    title: "Account + Sicherheit",
    icon: "🔒",
    bullets: [
      "Email-Verifikation + Password-Reset per Mail",
      "Display-Name + Email-Change-Flow mit Re-Verifikation",
      "Postleitzahl + Land im Profil (optional) — speist die WCA-Turniere-Suche im Dashboard. Wird ausschliesslich fuer Distanz-Berechnung genutzt, nie weitergegeben",
      "Account-Loeschung (DSGVO-konform, alle Daten weg)",
      "Multi-User-Isolation: deine Daten sind technisch von anderen getrennt",
    ],
  },
];

/** Kurz-Tagline fuer Anmeldeseite — etwas marketinglastig aber ehrlich. */
export const APP_TAGLINE =
  "Speedcubing-Tracking neu gedacht. Solves messen, Form analysieren, mit Freunden vergleichen.";

/** 3-4 Headline-Features fuer Hero-Zeile auf Anmeldeseite. */
export const HERO_HIGHLIGHTS: string[] = [
  "WCA-konformer Timer mit Spacebar + Touch-Modus",
  "csTimer-Import — kompletter Bestand uebernommen",
  "WCA-Turniere in deiner Naehe + Speedcubing-News auf dem Dashboard",
  "Bestenliste-Vergleich mit Freunden",
];
