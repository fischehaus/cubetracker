// PublicProfilePage (W.public-profile, 2026-06-06) — die anonyme, teilbare
// Solving-Card unter /u/<slug>. Wird im AuthGuard VOR dem Login-Check
// gerendert (pathname-Route), funktioniert also ohne Account. Zeigt NUR
// Aggregate (Backend liefert nur das aus).
//
// Die eigentliche Card steckt in <SolvingCard> (geteilt mit dem
// FriendProfileModal). Hier nur die Seiten-Chrome: Back-Link, „made with"-
// Footer, Lade-/404-Zustände, Tab-Titel.

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { usePublicProfile } from "../lib/api";
import { SolvingCard } from "../components/SolvingCard";
import { Card } from "../components/ui";

interface Props {
  slug: string;
}

export function PublicProfilePage({ slug }: Props) {
  const { t } = useTranslation();
  const query = usePublicProfile(slug);
  const profile = query.data;

  // Tab-Titel für Teilbarkeit (z.B. in Browser-History / geteilten Tabs).
  useEffect(() => {
    const name = profile?.display_name?.trim();
    document.title = name ? `${name} — cubetracker` : "cubetracker";
    return () => {
      document.title = "cubetracker";
    };
  }, [profile?.display_name]);

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
            <SolvingCard profile={profile} />
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
