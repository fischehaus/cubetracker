// AchievementToaster: globaler Layer der auf onAchievementUnlocked
// hoert (kommt aus axios-response-interceptor) und Toasts unten
// rechts anzeigt.
//
// Mehrere Toasts stacken sich. Jeder verschwindet nach 5s automatisch
// — oder wenn der User auf × klickt. Bei Bulk-import (csTimer) koennen
// es viele auf einmal sein, dann Cap auf 5 sichtbar; rest geht in
// summen-toast „+N weitere".

import { useEffect, useState } from "react";
import { onAchievementUnlocked, useAchievements } from "../lib/api";

interface Toast {
  id: number;
  code: string;
  name: string;
  icon: string;
  description: string;
}

const AUTO_DISMISS_MS = 5000;
const MAX_VISIBLE = 5;

export function AchievementToaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [extraCount, setExtraCount] = useState(0);
  // Wir brauchen die Definitionen, um beim toast den name + icon zu zeigen.
  // Cache via useAchievements (queryKey shared mit dem Tab — kein Extra-call).
  const { data: definitions } = useAchievements();

  useEffect(() => {
    const unsub = onAchievementUnlocked((codes) => {
      if (!definitions) return; // ohne defs: ignorieren (kommt selten vor)
      const newToasts: Toast[] = [];
      for (const code of codes) {
        const def = definitions.find((a) => a.code === code);
        if (!def) continue;
        newToasts.push({
          id: Date.now() + Math.random(),
          code,
          name: def.name,
          icon: def.icon,
          description: def.description,
        });
      }
      if (newToasts.length === 0) return;

      setToasts((prev) => {
        const combined = [...prev, ...newToasts];
        if (combined.length > MAX_VISIBLE) {
          setExtraCount((c) => c + (combined.length - MAX_VISIBLE));
          return combined.slice(combined.length - MAX_VISIBLE);
        }
        return combined;
      });

      // Jeder neue Toast bekommt sein Auto-Dismiss
      newToasts.forEach((t) => {
        window.setTimeout(() => dismiss(t.id), AUTO_DISMISS_MS);
      });
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [definitions]);

  function dismiss(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  function dismissAll() {
    setToasts([]);
    setExtraCount(0);
  }

  if (toasts.length === 0 && extraCount === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-xs">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 backdrop-blur p-4 shadow-lg flex items-start gap-3"
        >
          <span className="text-2xl shrink-0">{t.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-yellow-200/80 uppercase tracking-wide">
              🏆 Erfolg freigeschaltet
            </div>
            <div className="text-base text-yellow-100 font-semibold mt-0.5">
              {t.name}
            </div>
            <div className="text-sm text-yellow-200/80 mt-0.5">
              {t.description}
            </div>
          </div>
          <button
            onClick={() => dismiss(t.id)}
            className="text-xl text-yellow-300/60 hover:text-yellow-200 leading-none -mt-1"
            aria-label="Toast schliessen"
          >
            ×
          </button>
        </div>
      ))}
      {extraCount > 0 && (
        <div className="rounded border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-200 flex items-center gap-2">
          <span>+ {extraCount} weitere Erfolge!</span>
          <button
            onClick={dismissAll}
            className="ml-auto text-xs underline hover:text-yellow-100"
          >
            alle schliessen
          </button>
        </div>
      )}
    </div>
  );
}
