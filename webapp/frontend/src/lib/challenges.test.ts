// Speed-Challenges: target_value ist die Zielzeit (ms), progress nur 0/1.
// Vorher zeigte die Karte „0/12600" und 0 % (W.challenge-plausible-pb).
import { describe, expect, it } from "vitest";
import { progressGoal, progressLabel, progressPercent } from "./challenges";
import type { ChallengeItem } from "./types";

const t = (k: string) => k;

function item(over: Partial<ChallengeItem>): ChallengeItem {
  return {
    id: 1,
    kind: "volume",
    cube_type: null,
    target_value: 10,
    progress: 0,
    generated_for_date: "2026-09-25T00:00:00Z",
    completed_at: null,
    dismissed: false,
    ...over,
  };
}

describe("challenges: Fortschritt", () => {
  it("Speed: Ziel ist 1, nicht die Zielzeit", () => {
    const c = item({ kind: "speed", cube_type: "3x3", target_value: 12_600 });
    expect(progressGoal(c)).toBe(1);
    expect(progressLabel(c, t)).toBe("0/1");
    expect(progressPercent({ ...c, progress: 1 })).toBe(100);
  });

  it("Volume: Ziel bleibt target_value", () => {
    const c = item({ kind: "volume", target_value: 10, progress: 4 });
    expect(progressGoal(c)).toBe(10);
    expect(progressLabel(c, t)).toBe("4/10");
    expect(progressPercent(c)).toBe(40);
  });
});
