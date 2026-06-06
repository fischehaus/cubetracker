// FriendsTab (Phase W.9) — Friend-System Top-Tab.
//
// Bereiche (untereinander gestackt):
//   1. Discoverability-Status-Card (Hinweis falls is_discoverable=false)
//   2. User-Suche (Display-Name + Email-Lookup)
//   3. Eingehende Anfragen (Accept/Decline)
//   4. Ausgehende Anfragen (Cancel)
//   5. Eigene Friends-Liste (Unfriend)
//
// Privacy-Hinweis: Suche und Email-Lookup laufen ausschließlich gegen
// Backend-Endpoints, die User-Status + Self-Filtering enforcen.

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { FriendProfileModal } from "./FriendProfileModal";
import { InfoButton } from "./InfoButton";
import { Card, EmptyState } from "./ui";
import {
  useAcceptFriend,
  useEmailLookup,
  useFriendSearch,
  useFriendsList,
  useRemoveFriendship,
  useSendFriendRequest,
  useUpdateProfile,
  type Friendship,
  type FriendSearchResult,
} from "../lib/api";

export function FriendsTab() {
  const { user, isAuthenticated } = useAuth();
  const enabled = isAuthenticated;
  const { data, isLoading } = useFriendsList(enabled);
  // W.friend-profile: ausgewählter Freund für die Profil-Card (Modal).
  const [profileTarget, setProfileTarget] = useState<{
    id: number;
    name: string | null;
  } | null>(null);

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <DiscoverabilityCard
        isDiscoverable={user.is_discoverable}
        displayName={user.display_name}
      />
      <SearchCard />
      {data && data.incoming_pending.length > 0 && (
        <PendingIncomingCard items={data.incoming_pending} />
      )}
      {data && data.outgoing_pending.length > 0 && (
        <PendingOutgoingCard items={data.outgoing_pending} />
      )}
      <FriendsListCard
        items={data?.friends ?? []}
        isLoading={isLoading}
        onViewProfile={(id, name) => setProfileTarget({ id, name })}
      />
      {profileTarget && (
        <FriendProfileModal
          userId={profileTarget.id}
          name={profileTarget.name}
          onClose={() => setProfileTarget(null)}
        />
      )}
    </div>
  );
}

// ============================================================
// Discoverability-Card
// ============================================================

function DiscoverabilityCard({
  isDiscoverable,
  displayName,
}: {
  isDiscoverable: boolean;
  displayName: string | null;
}) {
  const { t } = useTranslation();
  const update = useUpdateProfile();
  const hasName = !!displayName?.trim();

  // Inline-Edit-State für Display-Name (UX-Refactor 2026-05-14: war
  // vorher nur in Verwaltung→Einstellungen, das forcierte einen Tab-
  // Wechsel — jetzt direkt hier, wo man's braucht).
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(displayName ?? "");

  function saveName() {
    const trimmed = nameDraft.trim();
    if (!trimmed) return;
    update.mutate(
      { display_name: trimmed },
      { onSuccess: () => setEditingName(false) },
    );
  }

  // Aktivierter Auffindbar-State: kompakt-grüne Bestätigungs-Card.
  if (isDiscoverable && hasName) {
    return (
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-200 space-y-1">
        <div>
          <strong>{t("friends.discoverableHeaderPrefix")}</strong>
          {t("friends.discoverableHeaderSuffix", { name: displayName })}
        </div>
        <div className="flex flex-wrap gap-3 text-xs">
          <button
            onClick={() => {
              setNameDraft(displayName ?? "");
              setEditingName(true);
            }}
            className="underline hover:text-emerald-100"
          >
            {t("friends.changeDisplayName")}
          </button>
          <button
            onClick={() => update.mutate({ is_discoverable: false })}
            disabled={update.isPending}
            className="underline hover:text-emerald-100 disabled:opacity-50"
          >
            {t("friends.deactivateDiscoverable")}
          </button>
        </div>
        {editingName && (
          <InlineNameEditor
            value={nameDraft}
            onChange={setNameDraft}
            onSave={saveName}
            onCancel={() => setEditingName(false)}
            pending={update.isPending}
          />
        )}
      </div>
    );
  }

  // Nicht-auffindbar-State: Onboarding-Card mit allen Aktionen inline.
  return (
    <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4 text-sm text-blue-100 space-y-3">
      <div>
        <p className="font-medium text-blue-200">
          {t("friends.onboardingHeading")}
        </p>
        <p className="mt-1">
          {t("friends.onboardingBodyPrefix")}{" "}
          <strong>{t("friends.onboardingBodyStrong")}</strong>
          {t("friends.onboardingBodySuffix")}
        </p>
      </div>

      {/* Schritt 1: Display-Name inline setzen */}
      <div className="rounded border border-blue-500/20 bg-blue-500/5 p-3 space-y-2">
        <div className="text-xs font-medium text-blue-200">
          {t("friends.stepDisplayNameHeading")}
          {hasName ? (
            <span className="ml-2 text-emerald-300">
              {t("friends.stepDisplayNameSet", { name: displayName })}
            </span>
          ) : (
            <span className="ml-2 text-amber-300">
              {t("friends.stepDisplayNameMissing")}
            </span>
          )}
        </div>
        {editingName || !hasName ? (
          <InlineNameEditor
            value={nameDraft}
            onChange={setNameDraft}
            onSave={saveName}
            onCancel={() => {
              setEditingName(false);
              setNameDraft(displayName ?? "");
            }}
            pending={update.isPending}
          />
        ) : (
          <button
            onClick={() => {
              setNameDraft(displayName ?? "");
              setEditingName(true);
            }}
            className="text-xs underline text-blue-200 hover:text-blue-100"
          >
            {t("friends.changeButton")}
          </button>
        )}
      </div>

      {/* Schritt 2: Auffindbar aktivieren */}
      <div className="rounded border border-blue-500/20 bg-blue-500/5 p-3">
        <div className="text-xs font-medium text-blue-200 mb-2">
          {t("friends.stepDiscoverHeading")}
        </div>
        <button
          onClick={() => update.mutate({ is_discoverable: true })}
          disabled={!hasName || update.isPending}
          className="rounded bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed"
          title={
            !hasName
              ? t("friends.enableTitleNeedName")
              : t("friends.enableTitleReady")
          }
        >
          {update.isPending
            ? t("friends.enableDiscoverableBusy")
            : t("friends.enableDiscoverableButton")}
        </button>
      </div>

      {update.isError && (
        <div className="text-xs text-red-300">
          {t("friends.errorPrefix")}
          {update.error?.message}
        </div>
      )}
    </div>
  );
}

function InlineNameEditor({
  value,
  onChange,
  onSave,
  onCancel,
  pending,
}: {
  value: string;
  onChange: (s: string) => void;
  onSave: () => void;
  onCancel: () => void;
  pending: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave();
          if (e.key === "Escape") onCancel();
        }}
        maxLength={64}
        autoFocus
        placeholder={t("friends.namePlaceholder")}
        className="rounded border border-gray-600 bg-gray-800 px-2 py-1 text-sm text-gray-100 focus:border-purple-500 focus:outline-none"
      />
      <button
        onClick={onSave}
        disabled={pending || !value.trim()}
        className="rounded bg-purple-600 px-3 py-1 text-xs text-white hover:bg-purple-700 disabled:opacity-40"
      >
        {pending ? t("friends.saveBusy") : t("friends.saveButton")}
      </button>
      <button
        onClick={onCancel}
        className="rounded bg-gray-700 px-3 py-1 text-xs text-gray-300 hover:bg-gray-600"
      >
        {t("friends.cancelButton")}
      </button>
    </div>
  );
}

// ============================================================
// Search-Card
// ============================================================

function SearchCard() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const search = useFriendSearch(query);
  const lookup = useEmailLookup();
  const sendReq = useSendFriendRequest();
  const accept = useAcceptFriend();

  const submitEmailLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const email = emailInput.trim();
    if (!email) return;
    lookup.mutate({ email });
  };

  // Bei Email-Lookup-Success rendern wir das Ergebnis als zusätzlichen
  // Search-Result darueber. Bei not-found zeigen wir Hinweis.
  const lookupResult = lookup.data;

  const handleAddFriend = (target_user_id: number) => {
    sendReq.mutate({ target_user_id });
  };
  const handleAccept = (friendship_id: number) => {
    accept.mutate({ friendship_id });
  };

  return (
    <Card padding="sm" className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-medium text-purple-300">
          {t("friends.searchHeading")}
        </h3>
        <InfoButton>
          <p className="font-medium mb-1">{t("friends.searchHeading")}</p>
          <p>
            {t("friends.searchInfoPrefix")}{" "}
            <strong>{t("friends.searchInfoDisplayName")}</strong>{" "}
            {t("friends.searchInfoDisplayNameRest")}
            <strong> {t("friends.searchInfoEmail")}</strong>{" "}
            {t("friends.searchInfoEmailRest")}
          </p>
        </InfoButton>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Display-Name-Suche */}
        <label className="flex flex-col text-xs text-gray-400">
          {t("friends.searchDisplayNameLabel")}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={64}
            className="mt-1 rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-purple-500 focus:outline-none"
            placeholder={t("friends.searchDisplayNamePlaceholder")}
          />
        </label>

        {/* Email-Lookup */}
        <form onSubmit={submitEmailLookup} className="flex flex-col text-xs text-gray-400">
          {t("friends.searchEmailLabel")}
          <div className="mt-1 flex gap-2">
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              maxLength={255}
              className="flex-1 rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-purple-500 focus:outline-none"
              placeholder={t("friends.searchEmailPlaceholder")}
            />
            <button
              type="submit"
              disabled={lookup.isPending || !emailInput.trim()}
              className="rounded bg-gray-700 px-3 py-2 text-sm text-gray-200 hover:bg-gray-600 disabled:opacity-50"
            >
              {lookup.isPending
                ? t("friends.searchEmailBusy")
                : t("friends.searchEmailButton")}
            </button>
          </div>
        </form>
      </div>

      {/* Such-Ergebnisse */}
      {query.trim().length >= 2 && (
        <div className="rounded border border-gray-700 bg-gray-800/40 p-3 space-y-1.5">
          <div className="text-xs text-gray-500">
            {t("friends.searchResultsLabel", { query })}
          </div>
          {search.isLoading && (
            <p className="text-sm text-gray-400">
              {t("friends.searchInProgress")}
            </p>
          )}
          {search.data && search.data.results.length === 0 && (
            <p className="text-sm text-gray-500">{t("friends.searchEmpty")}</p>
          )}
          {search.data?.results.map((r) => (
            <SearchResultRow
              key={r.id}
              result={r}
              onAdd={() => handleAddFriend(r.id)}
              onAccept={(fid) => handleAccept(fid)}
              busy={sendReq.isPending || accept.isPending}
            />
          ))}
        </div>
      )}

      {/* Email-Lookup-Ergebnis */}
      {lookupResult && (
        <div className="rounded border border-gray-700 bg-gray-800/40 p-3 space-y-1">
          <div className="text-xs text-gray-500">
            {t("friends.lookupResultsLabel")}
          </div>
          {!lookupResult.found && (
            <p className="text-sm text-gray-500">
              {t("friends.lookupNotFound")}
            </p>
          )}
          {lookupResult.found && lookupResult.user && (
            <SearchResultRow
              result={lookupResult.user}
              onAdd={() => handleAddFriend(lookupResult.user!.id)}
              onAccept={(fid) => handleAccept(fid)}
              busy={sendReq.isPending || accept.isPending}
            />
          )}
        </div>
      )}

      {sendReq.isError && (
        <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {sendReq.error?.message}
        </div>
      )}
    </Card>
  );
}

function SearchResultRow({
  result,
  onAdd,
  onAccept,
  busy,
}: {
  result: FriendSearchResult;
  onAdd: () => void;
  onAccept: (friendship_id: number) => void;
  busy: boolean;
}) {
  const { t } = useTranslation();
  // QA-Fix M4: Cancel-Button bei outgoing_pending — User muss nicht zum
  // anderen Card runterscrollen
  const remove = useRemoveFriendship();
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <div className="text-sm text-gray-200">
        {result.display_name || (
          <span className="italic text-gray-500">
            {t("friends.noDisplayName")}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {result.relationship === "none" && (
          <button
            onClick={onAdd}
            disabled={busy}
            className="rounded bg-purple-600/30 px-3 py-1 text-xs text-purple-200 hover:bg-purple-600/50 disabled:opacity-50"
          >
            {t("friends.addRequestButton")}
          </button>
        )}
        {result.relationship === "outgoing_pending" && result.friendship_id && (
          <>
            <span className="rounded bg-yellow-500/20 px-2 py-1 text-[10px] text-yellow-300">
              {t("friends.requestOpen")}
            </span>
            <button
              onClick={() =>
                remove.mutate({ friendship_id: result.friendship_id! })
              }
              disabled={busy || remove.isPending}
              className="rounded bg-gray-700 px-2 py-1 text-[10px] text-gray-300 hover:bg-gray-600 disabled:opacity-50"
            >
              {t("friends.withdrawRequest")}
            </button>
          </>
        )}
        {result.relationship === "incoming_pending" && result.friendship_id && (
          <button
            onClick={() => onAccept(result.friendship_id!)}
            disabled={busy}
            className="rounded bg-emerald-600/30 px-3 py-1 text-xs text-emerald-200 hover:bg-emerald-600/50 disabled:opacity-50"
          >
            {t("friends.acceptButton")}
          </button>
        )}
        {result.relationship === "accepted" && (
          <span className="rounded bg-emerald-500/20 px-2 py-1 text-[10px] text-emerald-300">
            {t("friends.alreadyFriends")}
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Pending-Cards
// ============================================================

function PendingIncomingCard({ items }: { items: Friendship[] }) {
  const { t } = useTranslation();
  const accept = useAcceptFriend();
  const remove = useRemoveFriendship();
  return (
    <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-4 space-y-2">
      <h3 className="text-lg font-medium text-purple-300">
        {t("friends.incomingHeading", { count: items.length })}
      </h3>
      <ul className="space-y-1.5">
        {items.map((fs) => (
          <li
            key={fs.id}
            className="flex items-center justify-between gap-2 rounded bg-gray-800/40 px-3 py-2"
          >
            <div className="text-sm text-gray-200">
              {fs.other.display_name || (
                <span className="italic text-gray-500">
                  {t("friends.noName")}
                </span>
              )}
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => accept.mutate({ friendship_id: fs.id })}
                disabled={accept.isPending}
                className="rounded bg-emerald-600/30 px-3 py-1 text-xs text-emerald-200 hover:bg-emerald-600/50 disabled:opacity-50"
              >
                {t("friends.acceptButton")}
              </button>
              <button
                onClick={() => remove.mutate({ friendship_id: fs.id })}
                disabled={remove.isPending}
                className="rounded bg-gray-700 px-3 py-1 text-xs text-gray-300 hover:bg-gray-600 disabled:opacity-50"
              >
                {t("friends.declineButton")}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PendingOutgoingCard({ items }: { items: Friendship[] }) {
  const { t } = useTranslation();
  const remove = useRemoveFriendship();
  return (
    <Card padding="sm" className="space-y-2">
      <h3 className="text-lg font-medium text-gray-300">
        {t("friends.outgoingHeading", { count: items.length })}
      </h3>
      <ul className="space-y-1.5">
        {items.map((fs) => (
          <li
            key={fs.id}
            className="flex items-center justify-between gap-2 rounded bg-gray-800/40 px-3 py-2"
          >
            <div className="text-sm text-gray-300">
              {fs.other.display_name || (
                <span className="italic text-gray-500">
                  {t("friends.noName")}
                </span>
              )}
            </div>
            <button
              onClick={() => remove.mutate({ friendship_id: fs.id })}
              disabled={remove.isPending}
              className="rounded bg-gray-700 px-3 py-1 text-xs text-gray-300 hover:bg-gray-600 disabled:opacity-50"
            >
              {t("friends.withdrawRequest")}
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

// ============================================================
// Friends-Liste
// ============================================================

function FriendsListCard({
  items,
  isLoading,
  onViewProfile,
}: {
  items: Friendship[];
  isLoading: boolean;
  onViewProfile: (id: number, name: string | null) => void;
}) {
  const { t } = useTranslation();
  const remove = useRemoveFriendship();
  return (
    <Card padding="sm" className="space-y-2">
      <h3 className="text-lg font-medium text-purple-300">
        {t("friends.listHeading", { count: items.length })}
      </h3>
      {isLoading && (
        <p className="text-sm text-gray-400">{t("friends.listLoading")}</p>
      )}
      {!isLoading && items.length === 0 && (
        <EmptyState size="sm" title={t("friends.listEmpty")} />
      )}
      <ul className="space-y-1.5">
        {items.map((fs) => (
          <li
            key={fs.id}
            className="flex items-center justify-between gap-2 rounded bg-gray-800/40 px-3 py-2"
          >
            <div className="flex items-baseline gap-2">
              <button
                type="button"
                onClick={() => onViewProfile(fs.other.id, fs.other.display_name)}
                className="text-sm font-medium text-gray-100 hover:text-purple-300 hover:underline text-left"
                title={t("friends.viewProfileTitle")}
              >
                {fs.other.display_name || (
                  <span className="italic text-gray-500">
                    {t("friends.noName")}
                  </span>
                )}
              </button>
              {fs.other.email && (
                <span className="text-xs text-gray-500 font-mono">
                  {fs.other.email}
                </span>
              )}
            </div>
            <button
              onClick={() => {
                if (
                  window.confirm(
                    t("friends.unfriendConfirm", {
                      name:
                        fs.other.display_name ??
                        t("friends.unfriendFallback"),
                    }),
                  )
                ) {
                  remove.mutate({ friendship_id: fs.id });
                }
              }}
              disabled={remove.isPending}
              className="rounded bg-gray-700 px-3 py-1 text-xs text-gray-300 hover:bg-red-600/50 hover:text-white disabled:opacity-50"
            >
              {t("friends.unfriendButton")}
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
