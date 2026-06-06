// WcaProfileCard (Phase W.wca-profile-light, 2026-05-28) — offizielles
// WCA-Profil des eingeloggten Users (Personal-Records + letzte Wettkämpfe).
//
// Voraussetzung: User hat wca_id im Profil gesetzt. Sonst Empty-State.
//
// Backend: GET /wca/me/profile (Cache 6h pro WCA-ID). Das eigentliche
// Rendering steckt in <WcaProfileBody> (W.wca-on-card, 2026-06-06 — geteilt mit
// der Solving-Card, die fremde WCA-Profile via /wca/profile/{wca_id} zeigt).

import { useTranslation } from "react-i18next";
import { AxiosError } from "axios";
import { useAuth } from "../auth/AuthContext";
import { useMyWcaProfile } from "../lib/api";
import { InfoButton } from "./InfoButton";
import { WcaProfileBody } from "./WcaProfileBody";
import { Card } from "./ui";

export function WcaProfileCard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const hasWcaId = !!user?.wca_id;
  const { data, isLoading, error } = useMyWcaProfile(hasWcaId);

  // 422 = keine WCA-ID (sollte mit hasWcaId-Guard nicht passieren),
  // 404 = WCA-ID nicht gefunden (Tippfehler / abgemeldeter Cuber),
  // 503 = WCA-API down.
  const axiosErr = error as AxiosError<{ detail?: string }> | null;
  const httpStatus = axiosErr?.response?.status;
  const backendDetail = axiosErr?.response?.data?.detail ?? "";

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span aria-hidden="true" className="text-lg">
          👤
        </span>
        <h3 className="text-lg font-semibold text-purple-300">
          {t("wcaProfile.title")}
        </h3>
        <InfoButton>
          <p className="font-medium mb-1">{t("wcaProfile.title")}</p>
          <p className="mb-2">{t("wcaProfile.infoBody1")}</p>
          <p>{t("wcaProfile.infoBody2")}</p>
        </InfoButton>
      </div>

      {!hasWcaId && (
        <div className="text-sm text-gray-400 space-y-2">
          <p>{t("wcaProfile.emptyNoIdIntro")}</p>
          <p className="text-xs text-gray-500">{t("wcaProfile.emptyNoIdHint")}</p>
        </div>
      )}

      {hasWcaId && isLoading && (
        <p className="text-sm text-gray-400">{t("wcaProfile.loading")}</p>
      )}

      {hasWcaId && error && httpStatus === 404 && (
        <div className="text-sm text-gray-400 space-y-2">
          <p className="text-amber-300">
            {t("wcaProfile.errorNotFound", { id: user?.wca_id })}
          </p>
          <p className="text-xs text-gray-500">
            {t("wcaProfile.errorNotFoundHint")}
          </p>
        </div>
      )}

      {hasWcaId && error && httpStatus !== 404 && (
        <div className="text-sm text-amber-300">
          <p>{t("wcaProfile.errorGeneric")}</p>
          {backendDetail && (
            <p className="text-xs text-gray-500 mt-1">
              {/* QA-Fix W.wca-profile-qa: cappen — httpx-Exceptions können
                  lange Stack-traces / interne URLs enthalten. */}
              {backendDetail.slice(0, 200)}
            </p>
          )}
        </div>
      )}

      {hasWcaId && data && <WcaProfileBody data={data} />}
    </Card>
  );
}
