// PbConfettiOverlay (Phase 8.3) — globaler Layer der bei einem PB
// (Backend-Header X-PB-Achieved) eine Konfetti-Animation feuert plus
// einen kleinen Toast-Banner unten oben anzeigt.
//
// Mehrere PB-Typen pro Solve möglich (single + ao5 + ao12 gemeinsam =
// "perfect storm"). Wir spielen dann ein dichteres Konfetti-Pattern.

import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { onPbAchieved, type PbKind } from "../lib/api";

interface PbToast {
  id: number;
  kinds: PbKind[];
}

const AUTO_DISMISS_MS = 4000;

const PB_LABELS: Record<PbKind, string> = {
  single: "Single",
  ao5: "Ao5",
  ao12: "Ao12",
};

export function PbConfettiOverlay() {
  const [toasts, setToasts] = useState<PbToast[]>([]);

  useEffect(() => {
    const unsub = onPbAchieved((kinds) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, kinds }]);

      // Konfetti: bei Mehrfach-PB (perfect storm) intensiver
      const isPerfectStorm = kinds.length >= 3;
      const isDouble = kinds.length === 2;
      fireConfetti(isPerfectStorm ? "storm" : isDouble ? "double" : "single");

      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, AUTO_DISMISS_MS);
    });
    return unsub;
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="rounded-lg border border-yellow-400/60 bg-yellow-500/15 backdrop-blur px-5 py-3 shadow-2xl text-center"
        >
          <div className="text-sm uppercase tracking-wider text-yellow-200/80">
            🏆 Personal Best
          </div>
          <div className="text-lg font-bold text-yellow-100">
            {t.kinds.length === 3
              ? "Perfect Storm — alle drei PBs!"
              : t.kinds.map((k) => PB_LABELS[k]).join(" + ") + "-PB"}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Konfetti-Patterns
// ============================================================

type Intensity = "single" | "double" | "storm";

function fireConfetti(intensity: Intensity) {
  const baseColors = ["#fbbf24", "#f59e0b", "#fde047", "#facc15"]; // gold/yellow

  if (intensity === "single") {
    // Ein einfacher Burst aus der Mitte
    confetti({
      particleCount: 80,
      spread: 70,
      startVelocity: 35,
      origin: { y: 0.5 },
      colors: baseColors,
    });
    return;
  }

  if (intensity === "double") {
    // Zwei Bursts von links + rechts
    confetti({
      particleCount: 100,
      spread: 70,
      startVelocity: 40,
      origin: { x: 0.2, y: 0.5 },
      colors: baseColors,
    });
    confetti({
      particleCount: 100,
      spread: 70,
      startVelocity: 40,
      origin: { x: 0.8, y: 0.5 },
      colors: baseColors,
    });
    return;
  }

  // Perfect Storm: mehrere Bursts in Folge mit verschiedenen Farben
  const colors = [
    "#fbbf24",
    "#a78bfa",
    "#34d399",
    "#f472b6",
    "#fde047",
  ];
  const duration = 2000;
  const animationEnd = Date.now() + duration;
  const interval = window.setInterval(() => {
    if (Date.now() > animationEnd) {
      window.clearInterval(interval);
      return;
    }
    confetti({
      particleCount: 50,
      spread: 80,
      startVelocity: 45,
      origin: { x: Math.random(), y: Math.random() * 0.5 + 0.2 },
      colors,
    });
  }, 200);
}
