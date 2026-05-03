// Helper fuer Daily-Challenges-UI (Phase 7b).
//
// Backend liefert die Roh-Felder kind/cube_type/target_value/progress,
// die menschen-lesbare Beschreibung wird hier im Frontend zusammengesetzt.
// So koennen wir Texte ohne Backend-Deploy aendern.

import { formatTime } from "./format";
import type { ChallengeItem, ChallengeKind } from "./types";

export const CHALLENGE_ICONS: Record<ChallengeKind, string> = {
  volume: "📈",
  speed: "⚡",
  comeback: "🔄",
  diversity: "🎲",
};

export const CHALLENGE_LABELS: Record<ChallengeKind, string> = {
  volume: "Volumen",
  speed: "Speed",
  comeback: "Comeback",
  diversity: "Vielseitigkeit",
};

/**
 * Liefert eine Aufgaben-Beschreibung fuer eine Challenge.
 * Bewusst kompakt — die Karte zeigt zusaetzlich Icon + Label.
 */
export function describeChallenge(c: ChallengeItem): string {
  switch (c.kind) {
    case "volume":
      return c.cube_type
        ? `Mache heute ${c.target_value} ${c.cube_type}-Solves`
        : `Mache heute ${c.target_value} Solves (egal welcher Cube)`;
    case "speed": {
      const target = formatTime(c.target_value);
      return `Schaffe einen ${c.cube_type ?? "Cube"}-Solve unter ${target}s`;
    }
    case "comeback":
      return `Mache mind. einen ${c.cube_type ?? "Cube"}-Solve — er wurde laenger nicht trainiert`;
    case "diversity":
      return `Trainiere heute ${c.target_value} verschiedene Cube-Types`;
    default:
      return "Unbekannte Challenge";
  }
}

/**
 * Progress als 0-100-prozent-Wert (zum Rendern der bar).
 * Cap bei 100, weil monotonic-Progress > target moeglich ist.
 */
export function progressPercent(c: ChallengeItem): number {
  if (c.target_value <= 0) return 0;
  const pct = (c.progress / c.target_value) * 100;
  return Math.max(0, Math.min(100, pct));
}

/**
 * Kurz-Label fuer den progress-Status: "3/10", "✓ erfuellt".
 */
export function progressLabel(c: ChallengeItem): string {
  if (c.completed_at) return "✓ erfuellt";
  return `${c.progress}/${c.target_value}`;
}
