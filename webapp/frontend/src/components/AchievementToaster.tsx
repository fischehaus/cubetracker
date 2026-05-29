// AchievementToaster (W.toast-manager, 2026-05-30): nur noch Trigger-
// Listener. Lauscht auf onAchievementUnlocked (axios-Interceptor) und
// pushed pro Achievement einen Toast via die zentrale Engine
// (lib/toast.ts). Das Render passiert in <ToastHost />.
//
// Vorher rendete diese Komponente selbst die JSX-Karten + managete
// State/Auto-Dismiss/Stacking — jetzt ~10× kürzer und nur noch die
// "wann taucht der Toast auf"-Logik.
//
// Komponente returnt null (pure Side-Effect via useEffect).

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { onAchievementUnlocked, useAchievements } from "../lib/api";
import { toast } from "../lib/toast";

export function AchievementToaster() {
  const { t } = useTranslation();
  // Definitions-Cache für Name/Icon/Description-Lookup.
  // queryKey shared mit dem Tab — kein Extra-Call.
  const { data: definitions } = useAchievements();

  useEffect(() => {
    const unsub = onAchievementUnlocked((codes) => {
      if (!definitions) return; // ohne defs: ignorieren (sehr selten)
      for (const code of codes) {
        const def = definitions.find((a) => a.code === code);
        if (!def) continue;
        toast.achievement({
          title: t("toasterAchievement.unlockedLabel"),
          message: `${def.name} — ${def.description}`,
          icon: def.icon,
        });
      }
    });
    return unsub;
  }, [definitions, t]);

  return null;
}
