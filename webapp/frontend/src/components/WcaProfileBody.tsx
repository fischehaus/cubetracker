// WcaProfileBody (W.wca-on-card, 2026-06-06) — das reine Rendering eines
// offiziellen WCA-Profils (Header/Avatar, Medaillen-/Record-Stats, PR-Tabelle,
// letzte Wettkämpfe). Extrahiert aus WcaProfileCard, damit es GETEILT wird
// zwischen:
//   - WcaProfileCard (eigenes Profil, self, via /wca/me/profile), und
//   - SolvingCard (fremdes/öffentliches Profil, via /wca/profile/{wca_id}).
// Enthält KEINEN Card-Rahmen + keine Lade-/Fehler-/Empty-States — das liegt
// beim jeweiligen Container (der die Daten holt).

import { useTranslation } from "react-i18next";
import {
  type WcaPersonProfile,
  type WcaPersonalRecord,
  type WcaPersonRecentComp,
} from "../lib/api";
import { getIntlLocale } from "../lib/format";

// WCA-Event-IDs → User-sichtbarer Label (Cubing-Standard, sprachunabhängig).
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
 * FMC (333fm): Move-Count, nicht ms. Multi-BLD (333mbf): encoded raw-Wert.
 */
function formatWcaResult(ms: number | null, eventId: string): string {
  if (ms == null || ms <= 0) return "—";
  if (eventId === "333fm") return `${ms} moves`;
  if (eventId === "333mbf") return `${ms}`;
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
  candidates.sort((a, b) => b.tier - a.tier || a.rank - b.rank);
  return candidates[0];
}

export function WcaProfileBody({ data }: { data: WcaPersonProfile }) {
  const { t, i18n } = useTranslation();
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
    <div className="space-y-4">
      {/* Person-Header */}
      <div className="flex items-center gap-3">
        {data.avatar_thumb_url ? (
          <img
            src={data.avatar_thumb_url}
            alt={data.name ?? data.wca_id}
            className="w-12 h-12 rounded-full border border-gray-700 bg-gray-800 object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
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
              <span className="text-amber-400">{t("wcaProfile.delegate")}</span>
            )}
          </div>
        </div>
      </div>

      {/* Stats-Zeile: Wettkampf-Count + Medals + Records */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
        <StatCell icon="🏟" value={String(data.competitions_count)} label={t("wcaProfile.statComps")} />
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
        <StatCell icon="🎯" value={String(data.personal_records.length)} label={t("wcaProfile.statEvents")} />
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
                  <th className="text-left py-1 pr-2 font-medium">{t("wcaProfile.colEvent")}</th>
                  <th className="text-right py-1 px-2 font-medium">{t("wcaProfile.colSingle")}</th>
                  <th className="text-right py-1 px-2 font-medium">{t("wcaProfile.colAverage")}</th>
                  <th className="text-left py-1 pl-2 font-medium">{t("wcaProfile.colRank")}</th>
                </tr>
              </thead>
              <tbody>
                {data.personal_records.map((pr) => {
                  const badge = bestRankBadge(pr.single, pr.average);
                  return (
                    <tr key={pr.event} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="py-1 pr-2 text-gray-300 font-medium">{eventLabel(pr.event)}</td>
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
              <li key={c.id} className="flex flex-wrap items-baseline gap-x-2">
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
                <span className="text-xs text-gray-500 ml-auto">{fmtDate(c.start_date)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-gray-500 italic">{t("wcaProfile.footer")}</p>
    </div>
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
    <div className="rounded border border-gray-700 bg-gray-800/40 px-2 py-1.5" title={tooltip}>
      <div className="text-base text-gray-200 font-semibold">
        <span aria-hidden="true" className="mr-1">
          {icon}
        </span>
        {value}
      </div>
      <div className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5">{label}</div>
    </div>
  );
}
