// WcaStatusBanner (W.wca-503-banner, 2026-05-29).
//
// Globales Banner oben in der App, das warnt wenn der WCA-Service nicht
// erreichbar ist (502/503/504). Damit weiß der User app-weit, dass das
// Stats-/Profil-Bild vorübergehend unvollständig sein kann — nicht nur als
// inline-Fehler in der WcaProfileCard (die evtl. gar nicht sichtbar ist).
//
// Nutzt denselben useMyWcaProfile-Query wie die Card (React-Query dedupt
// per queryKey ["wca-me-profile"] → kein Doppel-Fetch). Auto-Hide sobald
// WCA wieder antwortet (React-Query refetch löscht den Error). Dismiss-
// Button blendet es für die Session aus.

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AxiosError } from "axios";
import { useAuth } from "../auth/AuthContext";
import { useMyWcaProfile } from "../lib/api";

// Service-down-Codes: Gateway/Unavailable. NICHT 404 (WCA-ID-Tippfehler)
// oder 422 (keine WCA-ID) — das sind user-spezifisch, kein Service-Ausfall.
const SERVICE_DOWN_CODES = new Set([502, 503, 504]);

export function WcaStatusBanner() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const hasWcaId = !!user?.wca_id;
  const { error } = useMyWcaProfile(hasWcaId);
  const [dismissed, setDismissed] = useState(false);

  const status = (error as AxiosError | null)?.response?.status;
  if (!hasWcaId || status === undefined || !SERVICE_DOWN_CODES.has(status)) {
    return null;
  }
  if (dismissed) return null;

  return (
    <div
      role="alert"
      className="mb-3 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-200"
    >
      <span aria-hidden="true" className="mt-0.5">
        ⚠
      </span>
      <span className="flex-1">{t("wcaProfile.serviceDownBanner")}</span>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label={t("wcaProfile.serviceDownDismiss")}
        className="shrink-0 rounded px-1.5 text-amber-300/70 hover:text-amber-100 hover:bg-amber-500/20"
      >
        ✕
      </button>
    </div>
  );
}
