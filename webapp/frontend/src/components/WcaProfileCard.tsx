// WcaProfileCard (Phase W.wca-profile-light, 2026-05-28) — offizielles
// WCA-Profil des Users (Personal-Records + letzte Wettkämpfe).
//
// Voraussetzung: User hat wca_id im Profil gesetzt. Sonst Empty-State mit
// Link zur Verwaltung -> Account-Settings.
//
// Backend: GET /wca/me/profile (Cache 6h pro WCA-ID, slim-Response mit
// medals/records/personal_records/recent_competitions). Datenquelle:
// offizielle WCA-API v0 (/persons/{wca_id}).

import { useTranslation } from "react-i18next";
import { AxiosError } from "axios";
import { useAuth } from "../auth/AuthContext";
import {
  useMyWcaProfile,
  type WcaPersonalRecord,
  type WcaPersonRecentComp,
} from "../lib/api";
import { getIntlLocale } from "../lib/format";
import { InfoButton } from "./InfoButton";
import { Card } from "./ui";

// WCA-Event-IDs → User-sichtbarer Label. Cubing-Standard-Notation
// (sprachunabhängig — alle Cuber weltweit nutzen diese Kürzel).
const EVENT_LABEL: Record<string, string> = {
  "333": "3x3",
  "222": "2x2",
  "444": "4x4",
  "555": "5x5",
  "666": "6x6",
  "777": "7x7",
  "333bf": "3x3 BLD",
  "333fm": "3x3 FMC",
  "333oh": "3x3 OH",
  clock: "Clock",
  minx: "Megaminx",
  pyram: "Pyraminx",
  skewb: "Skewb",
  sq1: "Square-1",
  "444bf": "4x4 BLD",
  "555bf": "5x5 BLD",
  "333mbf": "3x3 Multi-BLD",
};

function eventLabel(eventId: string): string {
  return EVENT_LABEL[eventId] || eventId;
}

/**
 * WCA-Time in Centiseconds → Display-String.
 * 1234 → "12.34", 567 → "5.67", 12345 → "2:03.45" (für > 60s).
 * Spezialfälle:
 *  - FMC (333fm): Wert ist die Move-Count, nicht ms. Wir zeigen den
 *    raw-Wert + " moves".
 *  - Multi-BLD (333mbf): Format ist {DDTTTTTTCCCC} (encoding). Wir
 *    zeigen den raw-Wert (User klickt zum WCA-Profil für Details).
 */
function formatWcaResult(
  ms: number | null,
  eventId: string,
): string {
  if (ms == null || ms <= 0) return "—";
  if (eventId === "333fm") return `${ms} moves`;
  if (eventId === "333mbf") return `${ms}`; // Multi-BLD encoded
  const seconds = ms / 100;
  if (seconds < 60) return seconds.toFixed(2);
  const m = Math.floor(seconds / 60);
  const s = (seconds - m * 60).toFixed(2).padStart(5, "0");
  return `${m}:${s}`;
}

function bestRankBadge(
  single: WcaPersonalRecord["single"],
  average: WcaPersonalRecord["average"],
): { label: string; color: string; tier: number; rank: number } | null {
  // Best-Rank über Single + Average: bevorzuge höheren Tier (WR > CR > NR)
  // ODER bei selbem Tier: niedrigere Rank-Zahl (= bessere Platzierung).
  // QA-Fix W.wca-profile-qa: vorher wurde bei selbem Tier nie überschrieben,
  // also zeigte NR-Single #10 statt NR-Average #2.
  // Tier-Numerierung: 3 = WR, 2 = CR, 1 = NR (höhere Zahl = besserer Tier).
  const candidates: Array<{ tier: number; rank: number; label: string; color: string }> = [];
  const pushCandidate = (
    rank: number | null | undefined,
    tier: number,
    prefix: "WR" | "CR" | "NR",
    color: string,
  ) => {
    if (rank == null) return;
    candidates.push({ tier, rank, label: `${prefix} #${rank}`, color });
  };
  for (const slot of [single, average]) {
    pushCandidate(slot?.world_rank, 3, "WR", "bg-amber-500/20 text-amber-200 border-amber-500/40");
    pushCandidate(slot?.continental_rank, 2, "CR", "bg-purple-500/20 text-purple-200 border-purple-500/40");
    pushCandidate(slot?.national_rank, 1, "NR", "bg-blue-500/20 text-blue-200 border-blue-500/40");
  }
  if (candidates.length === 0) return null;
  // Sortierung: höchster Tier zuerst, bei Gleichstand niedrigste Rank-Zahl.
  candidates.sort((a, b) => (b.tier - a.tier) || (a.rank - b.rank));
  return candidates[0];
}

export function WcaProfileCard() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const hasWcaId = !!user?.wca_id;
  const { data, isLoading, error } = useMyWcaProfile(hasWcaId);

  // 422 = keine WCA-ID (sollte mit hasWcaId-Guard nicht passieren, aber defensive),
  // 404 = WCA-ID nicht gefunden (Tippfehler / abgemeldeter Cuber),
  // 503 = WCA-API down.
  const axiosErr = error as AxiosError<{ detail?: string }> | null;
  const httpStatus = axiosErr?.response?.status;
  const backendDetail = axiosErr?.response?.data?.detail ?? "";

  const dateLocale = getIntlLocale(i18n.resolvedLanguage);
  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(dateLocale, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  };

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
          <p className="text-xs text-gray-500">
            {t("wcaProfile.emptyNoIdHint")}
          </p>
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

      {hasWcaId && data && (
        <div className="space-y-4">
          {/* Person-Header */}
          <div className="flex items-center gap-3">
            {data.avatar_thumb_url ? (
              <img
                src={data.avatar_thumb_url}
                alt={data.name ?? data.wca_id}
                className="w-12 h-12 rounded-full border border-gray-700 bg-gray-800 object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-12 h-12 rounded-full border border-gray-700 bg-gray-800 flex items-center justify-center text-gray-500 text-xl">
                👤
              </div>
            )}
            <div className="flex-1 min-w-0">
              <a
                href={data.url ?? `https://www.worldcubeassociation.org/persons/${data.wca_id}`}
                target="_blank"
                rel="noreferrer"
                className="text-base font-semibold text-gray-100 hover:text-purple-300 underline-offset-2 hover:underline truncate block"
              >
                {data.name ?? data.wca_id}
              </a>
              <div className="text-xs text-gray-500 flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                <span className="font-mono">{data.wca_id}</span>
                {data.country_iso2 && <span>{data.country_iso2}</span>}
                {data.delegate_status && (
                  <span className="text-amber-400">
                    {t("wcaProfile.delegate")}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stats-Zeile: Wettkampf-Count + Medals + Records */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
            <StatCell
              icon="🏟"
              value={String(data.competitions_count)}
              label={t("wcaProfile.statComps")}
            />
            <StatCell
              icon="🏅"
              value={`${data.medals.gold}/${data.medals.silver}/${data.medals.bronze}`}
              label={t("wcaProfile.statMedals")}
              tooltip={t("wcaProfile.statMedalsTitle", {
                g: data.medals.gold,
                s: data.medals.silver,
                b: data.medals.bronze,
              })}
            />
            <StatCell
              icon="📊"
              value={String(data.records.total)}
              label={t("wcaProfile.statRecords")}
              tooltip={t("wcaProfile.statRecordsTitle", {
                wr: data.records.world,
                cr: data.records.continental,
                nr: data.records.national,
              })}
            />
            <StatCell
              icon="🎯"
              value={String(data.personal_records.length)}
              label={t("wcaProfile.statEvents")}
            />
          </div>

          {/* PB-Tabelle: pro Event Single + Average + bestes Rank-Badge */}
          {data.personal_records.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                {t("wcaProfile.prsHeading")}
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-gray-500">
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-1 pr-2 font-medium">
                        {t("wcaProfile.colEvent")}
                      </th>
                      <th className="text-right py-1 px-2 font-medium">
                        {t("wcaProfile.colSingle")}
                      </th>
                      <th className="text-right py-1 px-2 font-medium">
                        {t("wcaProfile.colAverage")}
                      </th>
                      <th className="text-left py-1 pl-2 font-medium">
                        {t("wcaProfile.colRank")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.personal_records.map((pr) => {
                      const badge = bestRankBadge(pr.single, pr.average);
                      return (
                        <tr
                          key={pr.event}
                          className="border-b border-gray-800/50 hover:bg-gray-800/30"
                        >
                          <td className="py-1 pr-2 text-gray-300 font-medium">
                            {eventLabel(pr.event)}
                          </td>
                          <td className="py-1 px-2 text-right font-mono text-gray-200">
                            {formatWcaResult(pr.single?.best ?? null, pr.event)}
                          </td>
                          <td className="py-1 px-2 text-right font-mono text-gray-200">
                            {formatWcaResult(pr.average?.best ?? null, pr.event)}
                          </td>
                          <td className="py-1 pl-2">
                            {badge && (
                              <span
                                className={`inline-block text-[10px] rounded border px-1.5 py-0.5 font-medium ${badge.color}`}
                              >
                                {badge.label}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recent Comps */}
          {data.recent_competitions.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                {t("wcaProfile.recentHeading")}
              </h4>
              <ul className="space-y-1.5 text-sm">
                {data.recent_competitions.map((c: WcaPersonRecentComp) => (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-baseline gap-x-2"
                  >
                    {c.url ? (
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-gray-200 hover:text-purple-300 underline-offset-2 hover:underline"
                      >
                        {c.name}
                      </a>
                    ) : (
                      <span className="text-gray-200">{c.name}</span>
                    )}
                    {c.city && (
                      <span className="text-xs text-gray-500">
                        · {c.city}
                        {c.country_iso2 ? ` (${c.country_iso2})` : ""}
                      </span>
                    )}
                    <span className="text-xs text-gray-500 ml-auto">
                      {fmtDate(c.start_date)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-xs text-gray-500 italic">
            {t("wcaProfile.footer")}
          </p>
        </div>
      )}
    </Card>
  );
}

function StatCell({
  icon,
  value,
  label,
  tooltip,
}: {
  icon: string;
  value: string;
  label: string;
  tooltip?: string;
}) {
  return (
    <div
      className="rounded border border-gray-700 bg-gray-800/40 px-2 py-1.5"
      title={tooltip}
    >
      <div className="text-base text-gray-200 font-semibold">
        <span aria-hidden="true" className="mr-1">
          {icon}
        </span>
        {value}
      </div>
      <div className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5">
        {label}
      </div>
    </div>
  );
}
