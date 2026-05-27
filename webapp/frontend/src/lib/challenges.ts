// Helper für Daily-Challenges-UI (Phase 7b).
//
// Backend liefert die Roh-Felder kind/cube_type/target_value/progress,
// die menschen-lesbare Beschreibung wird hier im Frontend zusammengesetzt.
// So können wir Texte ohne Backend-Deploy ändern.
//
// Seit W.i18n-trainer-sub (2026-05-27): describeChallenge + progressLabel
// + CHALLENGE_LABELS nehmen jetzt t() als Parameter und liefern lokali-
// sierte Strings. Die Konsumenten (ChallengeCard etc.) reichen t() aus
// useTranslation() rein.

import { formatTime } from "./format";
import type { ChallengeItem, ChallengeKind } from "./types";

export const CHALLENGE_ICONS: Record<ChallengeKind, string> = {
  volume: "📈",
  speed: "⚡",
  comeback: "🔄",
  diversity: "🎲",
};

/**
 * Lokalisiertes Kategorie-Label. Erwartet einen t-Callback aus
 * useTranslation(); Keys liegen unter `challenges.label*`.
 */
export function challengeLabel(
  kind: ChallengeKind,
  t: (key: string) => string,
): string {
  switch (kind) {
    case "volume":
      return t("challenges.labelVolume");
    case "speed":
      return t("challenges.labelSpeed");
    case "comeback":
      return t("challenges.labelComeback");
    case "diversity":
      return t("challenges.labelDiversity");
  }
}

/**
 * Liefert eine Aufgaben-Beschreibung für eine Challenge.
 * Bewusst kompakt — die Karte zeigt zusätzlich Icon + Label.
 */
export function describeChallenge(
  c: ChallengeItem,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  switch (c.kind) {
    case "volume":
      return c.cube_type
        ? t("challenges.descVolumeCube", {
            count: c.target_value,
            cube: c.cube_type,
          })
        : t("challenges.descVolumeAny", { count: c.target_value });
    case "speed": {
      const target = formatTime(c.target_value);
      return t("challenges.descSpeed", {
        cube: c.cube_type ?? t("challenges.descSpeedFallback"),
        target,
      });
    }
    case "comeback":
      return t("challenges.descComeback", {
        cube: c.cube_type ?? t("challenges.descSpeedFallback"),
      });
    case "diversity":
      return t("challenges.descDiversity", { count: c.target_value });
    default:
      return t("challenges.descUnknown");
  }
}

/**
 * Progress als 0-100-prozent-Wert (zum Rendern der bar).
 * Cap bei 100, weil monotonic-Progress > target möglich ist.
 */
export function progressPercent(c: ChallengeItem): number {
  if (c.target_value <= 0) return 0;
  const pct = (c.progress / c.target_value) * 100;
  return Math.max(0, Math.min(100, pct));
}

/**
 * Kurz-Label für den progress-Status: "3/10", "✓ done".
 */
export function progressLabel(
  c: ChallengeItem,
  t: (key: string) => string,
): string {
  if (c.completed_at) return t("challenges.progressDone");
  return `${c.progress}/${c.target_value}`;
}
