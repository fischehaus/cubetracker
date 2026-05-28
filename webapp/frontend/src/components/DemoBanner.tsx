// DemoBanner (W.login-redesign-and-demo, 2026-05-28).
//
// Sichtbarer Hinweis ueber der gesamten App-UI wenn der aktuelle User
// der Demo-Account ist. Erklaert klar: read-only Modus + Aufforderung
// einen eigenen Account anzulegen (CTA "Abmelden + Registrieren").
//
// Rendert sich selbst raus wenn !is_demo -- d.h. normaler User sieht
// den Banner nie. Komponente kann unbedingt-mounted bleiben.

import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";

export function DemoBanner() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  if (!user || !user.is_demo) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 md:p-4 mb-4 flex flex-col md:flex-row md:items-center gap-2 md:gap-4"
    >
      <div className="flex items-start gap-2 flex-1">
        <span aria-hidden="true" className="text-xl">🎬</span>
        <div className="text-sm text-amber-100">
          <strong className="text-amber-50">
            {t("demo.bannerTitle")}
          </strong>{" "}
          {t("demo.bannerBody")}
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          void logout();
        }}
        className="rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-100 text-sm font-medium px-4 py-2 transition shrink-0"
      >
        {t("demo.signOutAndRegister")}
      </button>
    </div>
  );
}
