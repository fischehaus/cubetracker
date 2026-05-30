// WcaUpcomingCard (Phase W.wca-comps) — die nächsten WCA-Turniere in der
// Nähe des Users.
//
// Voraussetzung: User hat Postleitzahl im Profil. Sonst Hint-Empty-State
// mit Link zur Verwaltung -> Account.
//
// Backend: GET /wca/competitions/upcoming, default max 300km, 10 Einträge,
// 6 Monate vorausschauend. Geocoding via Nominatim (DB-cached), WCA via
// offizielle API v0 (1h-Cache).

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AxiosError } from "axios";
import { useUpcomingCompetitions, type WcaCompetition } from "../lib/api";
import { getIntlLocale } from "../lib/format";
import { InfoButton } from "./InfoButton";
import { Card } from "./ui";

// Aufsteigende Distanz-Toggles für "Distanz erweitern" — User kann mit
// einem Klick die Suche vergrößern wenn die nächstgelegene Comp zu
// weit weg ist.
const DISTANCE_OPTIONS = [100, 300, 500, 1000, 5000] as const;

export function WcaUpcomingCard() {
  const { t, i18n } = useTranslation();
  const [maxDistanceKm, setMaxDistanceKm] = useState<number>(300);
  const { data, isLoading, error, isFetching } = useUpcomingCompetitions({
    maxDistanceKm,
    limit: 10,
  });

  // 422-Fall: keine Postleitzahl im Profil
  // QA-Fix H1 (2026-05-16): Axios setzt error.message bei HTTP-Errors auf
  // den generischen String „Request failed with status code 422" — die
  // ECHTE Detail-Message vom Backend liegt in error.response.data.detail.
  // Wir extrahieren beides + matchen die Detail-Message gegen die
  // Profil-Hint-Patterns. Ohne diesen Fix triggert der Empty-State NIE +
  // der User sieht den nutzlosen „Request failed"-Banner statt der
  // freundlichen Anleitung zum Profil-Setup.
  const axiosErr = error as AxiosError<{ detail?: string }> | null;
  const httpStatus = axiosErr?.response?.status;
  const backendDetail = axiosErr?.response?.data?.detail ?? "";
  const errMsg =
    backendDetail || (error instanceof Error ? error.message : String(error || ""));
  const isProfileIncomplete =
    httpStatus === 422 && /Postleitzahl|Land|country|PLZ/i.test(backendDetail);

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span aria-hidden="true" className="text-lg">
          🏆
        </span>
        <h3 className="text-lg font-semibold text-purple-300">
          {t("wca.title")}
        </h3>
        <InfoButton>
          <p className="font-medium mb-1">{t("wca.infoTitle")}</p>
          <p className="mb-2">{t("wca.infoBody1")}</p>
          <p>{t("wca.infoBody2")}</p>
        </InfoButton>
        <div className="ml-auto flex items-center gap-2 text-xs text-gray-400">
          <span>{t("wca.maxLabel")}</span>
          <select
            value={maxDistanceKm}
            onChange={(e) => setMaxDistanceKm(parseInt(e.target.value, 10))}
            className="rounded border border-gray-700 bg-gray-800 px-2 py-0.5 text-gray-200 focus:border-purple-500 focus:outline-none"
            aria-label={t("wca.maxDistanceAria")}
            disabled={isLoading || isProfileIncomplete}
          >
            {DISTANCE_OPTIONS.map((km) => (
              <option key={km} value={km}>
                {km} km
              </option>
            ))}
          </select>
          {isFetching && <span className="text-purple-300">…</span>}
        </div>
      </div>

      {isLoading && (
        <p className="text-sm text-gray-500">{t("wca.loading")}</p>
      )}

      {isProfileIncomplete && (
        <div className="rounded border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-amber-200">
          <p className="font-medium">{t("wca.profileIncompleteTitle")}</p>
          <p className="mt-1 text-amber-300/80">
            {t("wca.profileIncompleteBody")}
          </p>
          <p className="mt-1 text-amber-300/60">
            {t("wca.profileIncompleteBackend", { message: errMsg })}
          </p>
        </div>
      )}

      {error && !isProfileIncomplete && (
        <div className="rounded border border-red-500/40 bg-red-500/5 p-3 text-sm text-red-200">
          <p className="font-medium">{t("wca.errorTitle")}</p>
          <p className="mt-1 text-red-300/80">{errMsg}</p>
        </div>
      )}

      {data && !isProfileIncomplete && (
        <>
          {data.competitions.length === 0 ? (
            <p className="text-sm text-gray-500">
              {t("wca.noCompetitions", {
                km: maxDistanceKm,
                months: Math.round(data.filter.days_ahead / 30),
              })}{" "}
              {maxDistanceKm < 5000 && (
                <button
                  type="button"
                  onClick={() => setMaxDistanceKm(5000)}
                  className="underline text-purple-300 hover:text-purple-100"
                >
                  {t("wca.searchWorldwide")}
                </button>
              )}
            </p>
          ) : (
            <ul className="space-y-2">
              {data.competitions.map((c) => (
                <CompetitionItem
                  key={c.id}
                  comp={c}
                  locale={i18n.resolvedLanguage ?? "de"}
                />
              ))}
            </ul>
          )}
          <p className="mt-3 text-[11px] text-gray-500">
            {t("wca.locationLabel", {
              postal: data.user_location.postal_code,
              country: data.user_location.country_iso2
                ? ` (${data.user_location.country_iso2})`
                : "",
            })}
            {" — "}
            {t("wca.totalsLabel", {
              total: data.total_found,
              shown: data.competitions.length,
            })}
            {data.filter.countries_queried &&
              data.filter.countries_queried.length > 1 && (
                <>
                  {" "}
                  {t("wca.countriesLabel")}:{" "}
                  <span className="text-gray-400">
                    {data.filter.countries_queried.join(", ")}
                  </span>
                  .
                </>
              )}{" "}
            {t("wca.dataSource")}
          </p>
        </>
      )}
    </Card>
  );
}

function CompetitionItem({
  comp,
  locale,
}: {
  comp: WcaCompetition;
  locale: string;
}) {
  const { t } = useTranslation();
  const dateLabel = formatDateRange(comp.start_date, comp.end_date, locale);
  const distLabel =
    comp.distance_km !== null ? `${comp.distance_km.toFixed(0)} km` : "—";
  return (
    <li className="rounded border border-gray-700 bg-gray-800/40 p-3 hover:border-purple-500/40 transition-colors">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <a
          href={comp.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-purple-200 hover:text-purple-100 underline-offset-2 hover:underline break-words"
        >
          {comp.name}
        </a>
        <span className="text-xs font-mono text-emerald-300/80">
          {distLabel}
        </span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
        <span>{dateLabel}</span>
        {comp.city && (
          <span>
            📍 {comp.city}
            {comp.country_iso2 ? `, ${comp.country_iso2}` : ""}
          </span>
        )}
        {comp.events_count > 0 && (
          <span title={comp.event_ids.join(", ")}>
            🧊 {comp.events_count}{" "}
            {comp.events_count === 1
              ? t("wca.eventSingular")
              : t("wca.eventPlural")}
          </span>
        )}
      </div>
    </li>
  );
}

function formatDateRange(
  startIso: string,
  endIso: string,
  locale: string,
): string {
  try {
    const intlLocale = getIntlLocale(locale);
    const s = new Date(startIso);
    const e = new Date(endIso);
    const sDay = s.getDate();
    const sMon = s.toLocaleString(intlLocale, { month: "short" });
    const sYear = s.getFullYear();
    if (startIso === endIso) {
      return `${sDay}. ${sMon} ${sYear}`;
    }
    const eDay = e.getDate();
    const eMon = e.toLocaleString(intlLocale, { month: "short" });
    const eYear = e.getFullYear();
    if (sYear === eYear && sMon === eMon) {
      return `${sDay}.–${eDay}. ${sMon} ${sYear}`;
    }
    if (sYear === eYear) {
      return `${sDay}. ${sMon} – ${eDay}. ${eMon} ${sYear}`;
    }
    return `${sDay}. ${sMon} ${sYear} – ${eDay}. ${eMon} ${eYear}`;
  } catch {
    return `${startIso} – ${endIso}`;
  }
}
