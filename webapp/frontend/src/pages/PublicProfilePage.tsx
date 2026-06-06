// PublicProfilePage (W.public-profile, 2026-06-06) — die anonyme, teilbare
// Solving-Card unter /u/<slug>. Wird im AuthGuard VOR dem Login-Check
// gerendert (pathname-Route), funktioniert also ohne Account. Zeigt NUR
// Aggregate (Single/Avg-PBs pro Cube, Counts, Achievements, letzte PBs) —
// nie Email/PLZ/Einzel-Solves (Backend liefert nur das aus).
//
// 404 (Slug unbekannt / Card privat / User inaktiv) → freundliche
// „nicht gefunden / privat"-Ansicht, kein Stacktrace.

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { usePublicProfile, type PublicCubeStat } from "../lib/api";
import { formatTime } from "../lib/format";
import { Card } from "../components/ui";

interface Props {
  slug: string;
}

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

export function PublicProfilePage({ slug }: Props) {
  const { t, i18n } = useTranslation();
  const query = usePublicProfile(slug);
  const profile = query.data;

  // Tab-Titel für Teilbarkeit (z.B. in Browser-History / geteilten Tabs).
  useEffect(() => {
    const name = profile?.display_name?.trim();
    document.title = name
      ? `${name} — cubetracker`
      : "cubetracker";
    return () => {
      document.title = "cubetracker";
    };
  }, [profile?.display_name]);

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
    <div className="min-h-screen px-4 py-8 flex flex-col items-center">
      <div className="w-full max-w-2xl">
        <a
          href="/"
          className="inline-flex items-center gap-1 text-sm text-purple-300 hover:text-purple-200 mb-4"
        >
          ← cubetracker.de
        </a>

        {query.isLoading && (
          <Card padding="md">
            <p className="text-gray-400 text-sm">{t("publicProfile.loading")}</p>
          </Card>
        )}

        {query.isError && (
          <Card padding="md">
            <h1 className="text-lg font-semibold text-gray-100 mb-1">
              {t("publicProfile.notFoundTitle")}
            </h1>
            <p className="text-gray-400 text-sm">
              {t("publicProfile.notFoundBody")}
            </p>
            <a
              href="/"
              className="mt-3 inline-block text-sm text-purple-300 hover:text-purple-200 underline"
            >
              {t("publicProfile.toApp")}
            </a>
          </Card>
        )}

        {profile && (
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
                <ul className="space-y-1.5">
                  {profile.recent_pbs.map((pb, i) => (
                    <li
                      key={`${pb.at}-${i}`}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-gray-300">{pb.cube_type}</span>
                      <span className="font-mono text-yellow-300">{formatTime(pb.time_ms)}</span>
                      <span className="text-xs text-gray-500">{dateFmt(pb.at)}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <p className="text-center text-xs text-gray-600">
              {t("publicProfile.madeWith")}{" "}
              <a href="/" className="text-purple-400 hover:text-purple-300 underline">
                cubetracker.de
              </a>
            </p>
          </div>
        )}
      </div>
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
