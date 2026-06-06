// SolvingCard (W.friend-profile, 2026-06-06) — die reine Solving-Card:
// Identität (Name/Land/Mitglied-seit/WCA-Badge) + Headline-Zahlen + PBs pro
// Cube + letzte PBs. GETEILT zwischen der anonymen PublicProfilePage
// (/u/<slug>) und dem FriendProfileModal (Klick auf Freundes-Namen). Enthält
// bewusst KEINE Seiten-Chrome (Back-Link, „made with"-Footer) — das liegt beim
// jeweiligen Container.
//
// Beide Quellen liefern dieselbe PublicProfile-Struktur (Backend: identischer
// Composer build_public_profile_card), nur der Berechtigungs-Pfad unterscheidet
// sich (anonym-opt-in vs. accepted-friend).

import { useTranslation } from "react-i18next";
import { formatTime } from "../lib/format";
import {
  usePublicWcaProfile,
  type PublicCubeStat,
  type PublicProfile,
} from "../lib/api";
import { Card } from "./ui";
import { WcaProfileBody } from "./WcaProfileBody";

/** ISO-3166-alpha-2 → Flaggen-Emoji (Regional-Indicator-Symbole). */
function flagEmoji(iso2: string | null): string {
  if (!iso2 || iso2.length !== 2) return "";
  const cc = iso2.toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return "";
  return cc.replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

/** ms → Anzeige, null → „–" (statt „DNF" für fehlende Avgs). */
function fmt(ms: number | null): string {
  return ms == null ? "–" : formatTime(ms);
}

export function SolvingCard({ profile }: { profile: PublicProfile }) {
  const { t, i18n } = useTranslation();
  // Öffentliches WCA-Profil (anonymer Proxy) — nur aktiv, wenn eine WCA-ID
  // hinterlegt ist. Lädt unabhängig von der Card (eigene Lade-/Fehler-States).
  const wca = usePublicWcaProfile(profile.wca_id);

  const dateFmt = (iso: string): string => {
    try {
      return new Date(iso).toLocaleDateString(i18n.language || undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return iso.slice(0, 10);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header-Card: Identität */}
      <Card padding="md">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-50">
              {flagEmoji(profile.country_iso2)}{" "}
              {profile.display_name || t("publicProfile.anonymousCuber")}
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              {t("publicProfile.memberSince", {
                date: dateFmt(profile.member_since),
              })}
            </p>
          </div>
          {profile.wca_id && (
            <a
              href={`https://www.worldcubeassociation.org/persons/${profile.wca_id}`}
              target="_blank"
              rel="noreferrer"
              className="rounded border border-blue-500/40 bg-blue-500/10 px-2.5 py-1 text-xs font-mono text-blue-200 hover:bg-blue-500/20"
              title={t("publicProfile.wcaBadgeTitle")}
            >
              WCA · {profile.wca_id}
            </a>
          )}
        </div>

        {/* Headline-Zahlen */}
        <div className="mt-4 flex flex-wrap gap-4">
          <Stat
            label={t("publicProfile.totalSolves")}
            value={profile.total_solves.toLocaleString(i18n.language || undefined)}
          />
          <Stat
            label={t("publicProfile.achievements")}
            value={String(profile.achievements_unlocked)}
          />
          <Stat
            label={t("publicProfile.cubeTypes")}
            value={String(profile.cubes.length)}
          />
        </div>
      </Card>

      {/* PBs pro Cube */}
      <Card padding="md">
        <h2 className="text-sm uppercase tracking-wide text-gray-500 mb-3">
          {t("publicProfile.bestsTitle")}
        </h2>
        {profile.cubes.length === 0 ? (
          <p className="text-sm text-gray-500">{t("publicProfile.noSolves")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-700">
                  <th className="py-1.5 pr-3">{t("publicProfile.colCube")}</th>
                  <th className="py-1.5 px-2 text-right">{t("publicProfile.colSingle")}</th>
                  <th className="py-1.5 px-2 text-right">Ao5</th>
                  <th className="py-1.5 px-2 text-right">Ao12</th>
                  <th className="py-1.5 px-2 text-right">Ao100</th>
                  <th className="py-1.5 pl-2 text-right">{t("publicProfile.colCount")}</th>
                </tr>
              </thead>
              <tbody className="font-mono text-gray-200">
                {profile.cubes.map((c: PublicCubeStat) => (
                  <tr key={c.cube_type} className="border-b border-gray-800/60">
                    <td className="py-1.5 pr-3 font-sans text-gray-300">{c.cube_type}</td>
                    <td className="py-1.5 px-2 text-right text-yellow-300">{fmt(c.best_ms)}</td>
                    <td className="py-1.5 px-2 text-right">{fmt(c.best_ao5)}</td>
                    <td className="py-1.5 px-2 text-right">{fmt(c.best_ao12)}</td>
                    <td className="py-1.5 px-2 text-right">{fmt(c.best_ao100)}</td>
                    <td className="py-1.5 pl-2 text-right text-gray-500">{c.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-[11px] text-gray-600">
              {t("publicProfile.bestsHint")}
            </p>
          </div>
        )}
      </Card>

      {/* Letzte PBs */}
      {profile.recent_pbs.length > 0 && (
        <Card padding="md">
          <h2 className="text-sm uppercase tracking-wide text-gray-500 mb-3">
            {t("publicProfile.recentPbsTitle")}
          </h2>
          {/* Tabelle statt flex-justify-between → Zeit + Datum stehen in
              ausgerichteten Spalten (rechtsbündig), wie die Bests-Tabelle oben.
              Mit flex „schwamm" die Zeit je nach Cube-Namens-Breite. */}
          <table className="w-full text-sm">
            <tbody>
              {profile.recent_pbs.map((pb, i) => (
                <tr key={`${pb.cube_type}-${pb.at}-${i}`}>
                  <td className="py-1 pr-3 text-gray-300 w-full">{pb.cube_type}</td>
                  <td className="py-1 px-2 text-right font-mono text-yellow-300 whitespace-nowrap">
                    {formatTime(pb.time_ms)}
                  </td>
                  <td className="py-1 pl-3 text-right text-xs text-gray-500 whitespace-nowrap">
                    {dateFmt(pb.at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Offizielles WCA-Profil (PRs/Wettkämpfe) — nur wenn WCA-ID gesetzt. */}
      {profile.wca_id && (
        <Card padding="md">
          <h2 className="text-sm uppercase tracking-wide text-gray-500 mb-3">
            {t("publicProfile.wcaSectionTitle")}
          </h2>
          {wca.isLoading && (
            <p className="text-sm text-gray-400">{t("publicProfile.wcaLoading")}</p>
          )}
          {wca.isError && (
            <p className="text-sm text-gray-500">{t("publicProfile.wcaError")}</p>
          )}
          {wca.data && <WcaProfileBody data={wca.data} />}
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xl font-bold text-gray-100">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}
