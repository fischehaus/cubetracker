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
import { AxiosError } from "axios";
import { useUpcomingCompetitions, type WcaCompetition } from "../lib/api";
import { InfoButton } from "./InfoButton";

// Aufsteigende Distanz-Toggles für "Distanz erweitern" — User kann mit
// einem Klick die Suche vergrößern wenn die nächstgelegene Comp zu
// weit weg ist.
const DISTANCE_OPTIONS = [100, 300, 500, 1000, 5000] as const;

export function WcaUpcomingCard() {
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
    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-5">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span aria-hidden="true" className="text-lg">
          🏆
        </span>
        <h3 className="text-lg font-semibold text-purple-300">WCA-Turniere</h3>
        <InfoButton>
          <p className="font-medium mb-1">WCA-Turniere</p>
          <p className="mb-2">
            Liste der nächsten offiziellen WCA-Wettkaempfe in deiner Nähe,
            sortiert nach Datum. Distanz wird basierend auf deiner Profil-PLZ
            (Verwaltung → Account) berechnet (Luftlinie).
          </p>
          <p>
            Daten kommen direkt von der offiziellen World Cube Association
            API. Click auf den Turnier-Namen öffnet die WCA-Detailseite mit
            Anmelde-Status, Events, Venue.
          </p>
        </InfoButton>
        <div className="ml-auto flex items-center gap-2 text-xs text-gray-400">
          <span>max</span>
          <select
            value={maxDistanceKm}
            onChange={(e) => setMaxDistanceKm(parseInt(e.target.value, 10))}
            className="rounded border border-gray-700 bg-gray-800 px-2 py-0.5 text-gray-200 focus:border-purple-500 focus:outline-none"
            aria-label="Maximale Distanz"
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
        <p className="text-sm text-gray-500">Lade Turniere von der WCA-API …</p>
      )}

      {isProfileIncomplete && (
        <div className="rounded border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-amber-200">
          <p className="font-medium">Profil unvollstaendig</p>
          <p className="mt-1 text-amber-300/80">
            Damit „Turniere in deiner Nähe" funktioniert, setze{" "}
            <strong>Postleitzahl und Land</strong> unter{" "}
            <strong>Verwaltung → Einstellungen → Account → Profil</strong>.
            Die Distanz wird per Luftlinie berechnet, deine genaue Adresse
            bleibt privat.
          </p>
          <p className="mt-1 text-amber-300/60">
            Genaue Backend-Meldung: {errMsg}
          </p>
        </div>
      )}

      {error && !isProfileIncomplete && (
        <div className="rounded border border-red-500/40 bg-red-500/5 p-3 text-sm text-red-200">
          <p className="font-medium">Konnte WCA-Turniere nicht laden</p>
          <p className="mt-1 text-red-300/80">{errMsg}</p>
        </div>
      )}

      {data && !isProfileIncomplete && (
        <>
          {data.competitions.length === 0 ? (
            <p className="text-sm text-gray-500">
              Keine WCA-Turniere innerhalb {maxDistanceKm} km in den
              nächsten {Math.round(data.filter.days_ahead / 30)} Monaten.{" "}
              {maxDistanceKm < 5000 && (
                <button
                  type="button"
                  onClick={() => setMaxDistanceKm(5000)}
                  className="underline text-purple-300 hover:text-purple-100"
                >
                  Weltweit suchen
                </button>
              )}
            </p>
          ) : (
            <ul className="space-y-2">
              {data.competitions.map((c) => (
                <CompetitionItem key={c.id} comp={c} />
              ))}
            </ul>
          )}
          <p className="mt-3 text-[11px] text-gray-500">
            Standort: {data.user_location.postal_code}
            {data.user_location.country_iso2
              ? ` (${data.user_location.country_iso2})`
              : ""}
            {" — "}
            {data.total_found} Turniere im Filter, {data.competitions.length}{" "}
            angezeigt.
            {data.filter.countries_queried &&
              data.filter.countries_queried.length > 1 && (
                <>
                  {" Laender: "}
                  <span className="text-gray-400">
                    {data.filter.countries_queried.join(", ")}
                  </span>
                  .
                </>
              )}{" "}
            Daten via offizielle WCA-API.
          </p>
        </>
      )}
    </div>
  );
}

function CompetitionItem({ comp }: { comp: WcaCompetition }) {
  const dateLabel = formatDateRange(comp.start_date, comp.end_date);
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
            {comp.events_count === 1 ? "Event" : "Events"}
          </span>
        )}
      </div>
    </li>
  );
}

function formatDateRange(startIso: string, endIso: string): string {
  try {
    const s = new Date(startIso);
    const e = new Date(endIso);
    const sDay = s.getDate();
    const sMon = s.toLocaleString("de-DE", { month: "short" });
    const sYear = s.getFullYear();
    if (startIso === endIso) {
      return `${sDay}. ${sMon} ${sYear}`;
    }
    const eDay = e.getDate();
    const eMon = e.toLocaleString("de-DE", { month: "short" });
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
