// FriendProfileModal (W.friend-profile, 2026-06-06) — zeigt die Solving-Card
// eines akzeptierten Freundes beim Klick auf dessen Namen in der Friends-Liste.
// KEIN öffentliches Opt-in nötig (authentifizierter /friends/{id}/profile-
// Endpoint, der nur accepted-Friends erlaubt). Rendert die geteilte
// <SolvingCard>. Schliessen: Backdrop, Esc, X-Button.

import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { useFriendProfile } from "../lib/api";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { SolvingCard } from "./SolvingCard";

interface Props {
  userId: number;
  name: string | null;
  onClose: () => void;
}

export function FriendProfileModal({ userId, name, onClose }: Props) {
  const { t } = useTranslation();
  const query = useFriendProfile(userId);
  // Fokus-Trap + Esc-zum-Schließen + Fokus-Restore (a11y, W.modal-focus-trap).
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, onClose);

  const displayName = name || t("publicProfile.anonymousCuber");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="friend-profile-title"
    >
      <div
        ref={dialogRef}
        className="rounded-lg border border-gray-700 bg-gray-900 p-4 md:p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <h2
            id="friend-profile-title"
            className="text-sm uppercase tracking-wide text-gray-500"
          >
            {t("friendProfile.title", { name: displayName })}
          </h2>
          <button
            onClick={onClose}
            aria-label={t("friendProfile.close")}
            className="text-gray-400 hover:text-gray-100 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {query.isLoading && (
          <p className="text-sm text-gray-400">{t("publicProfile.loading")}</p>
        )}
        {query.isError && (
          <p className="text-sm text-gray-400">{t("friendProfile.errorBody")}</p>
        )}
        {query.data && <SolvingCard profile={query.data} />}
      </div>
    </div>
  );
}
