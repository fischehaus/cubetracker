// FriendsTab (Phase W.9) — Friend-System Top-Tab.
//
// Bereiche (untereinander gestackt):
//   1. Discoverability-Status-Card (Hinweis falls is_discoverable=false)
//   2. User-Suche (Display-Name + Email-Lookup)
//   3. Eingehende Anfragen (Accept/Decline)
//   4. Ausgehende Anfragen (Cancel)
//   5. Eigene Friends-Liste (Unfriend)
//
// Privacy-Hinweis: Suche und Email-Lookup laufen ausschliesslich gegen
// Backend-Endpoints, die User-Status + Self-Filtering enforcen.

import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { InfoButton } from "./InfoButton";
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
      />
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
  const update = useUpdateProfile();
  const hasName = !!displayName?.trim();

  // Inline-Edit-State fuer Display-Name (UX-Refactor 2026-05-14: war
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

  // Aktivierter Auffindbar-State: kompakt-gruene Bestaetigungs-Card.
  if (isDiscoverable && hasName) {
    return (
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-200 space-y-1">
        <div>
          <strong>Auffindbar</strong> als „{displayName}". Andere User
          koennen dich per Display-Name-Suche finden.
        </div>
        <div className="flex flex-wrap gap-3 text-xs">
          <button
            onClick={() => {
              setNameDraft(displayName ?? "");
              setEditingName(true);
            }}
            className="underline hover:text-emerald-100"
          >
            Display-Name aendern
          </button>
          <button
            onClick={() => update.mutate({ is_discoverable: false })}
            disabled={update.isPending}
            className="underline hover:text-emerald-100 disabled:opacity-50"
          >
            Auffindbar deaktivieren
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
        <p className="font-medium text-blue-200">Wie wirst du gefunden?</p>
        <p className="mt-1">
          Aktuell <strong>nicht auffindbar</strong>. Du kannst trotzdem
          andere per Email-Lookup finden + ihnen Freundes-Anfragen schicken.
          Damit DICH andere per Display-Name finden koennen, brauchst du
          beides:
        </p>
      </div>

      {/* Schritt 1: Display-Name inline setzen */}
      <div className="rounded border border-blue-500/20 bg-blue-500/5 p-3 space-y-2">
        <div className="text-xs font-medium text-blue-200">
          1. Display-Name
          {hasName ? (
            <span className="ml-2 text-emerald-300">✓ gesetzt: „{displayName}"</span>
          ) : (
            <span className="ml-2 text-amber-300">⚠ noch leer</span>
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
            Aendern
          </button>
        )}
      </div>

      {/* Schritt 2: Auffindbar aktivieren */}
      <div className="rounded border border-blue-500/20 bg-blue-500/5 p-3">
        <div className="text-xs font-medium text-blue-200 mb-2">
          2. Auffindbar aktivieren
        </div>
        <button
          onClick={() => update.mutate({ is_discoverable: true })}
          disabled={!hasName || update.isPending}
          className="rounded bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed"
          title={
            !hasName
              ? "Erst Display-Name setzen (Schritt 1)"
              : "Anderen erlauben, dich per Display-Name zu finden"
          }
        >
          {update.isPending ? "…" : "Auffindbar aktivieren"}
        </button>
      </div>

      {update.isError && (
        <div className="text-xs text-red-300">
          Fehler: {update.error?.message}
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
        placeholder="z.B. dein Vorname"
        className="rounded border border-gray-600 bg-gray-800 px-2 py-1 text-sm text-gray-100 focus:border-purple-500 focus:outline-none"
      />
      <button
        onClick={onSave}
        disabled={pending || !value.trim()}
        className="rounded bg-purple-600 px-3 py-1 text-xs text-white hover:bg-purple-700 disabled:opacity-40"
      >
        {pending ? "…" : "Speichern"}
      </button>
      <button
        onClick={onCancel}
        className="rounded bg-gray-700 px-3 py-1 text-xs text-gray-300 hover:bg-gray-600"
      >
        Abbrechen
      </button>
    </div>
  );
}

// ============================================================
// Search-Card
// ============================================================

function SearchCard() {
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

  // Bei Email-Lookup-Success rendern wir das Ergebnis als zusaetzlichen
  // Search-Result darueber. Bei not-found zeigen wir Hinweis.
  const lookupResult = lookup.data;

  const handleAddFriend = (target_user_id: number) => {
    sendReq.mutate({ target_user_id });
  };
  const handleAccept = (friendship_id: number) => {
    accept.mutate({ friendship_id });
  };

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-medium text-purple-300">User finden</h3>
        <InfoButton>
          <p className="font-medium mb-1">User finden</p>
          <p>
            Zwei Suchwege: <strong>Display-Name</strong> (Prefix-Match,
            ab 2 Zeichen, nur User die „Auffindbar\" aktiviert haben);
            <strong> exakte Email</strong> (umgeht die Auffindbar-Sperre —
            wer die Email kennt, kennt den User). Suchergebnisse zeigen
            sofort den Beziehungs-Status (z.B. „bereits Freund\", „Anfrage offen\").
          </p>
        </InfoButton>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Display-Name-Suche */}
        <label className="flex flex-col text-xs text-gray-400">
          Per Display-Name (ab 2 Buchstaben, nur auffindbare User)
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={64}
            className="mt-1 rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-purple-500 focus:outline-none"
            placeholder="z.B. 'Han'"
          />
        </label>

        {/* Email-Lookup */}
        <form onSubmit={submitEmailLookup} className="flex flex-col text-xs text-gray-400">
          Per exakter Email (kein Prefix-Match)
          <div className="mt-1 flex gap-2">
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              maxLength={255}
              className="flex-1 rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-purple-500 focus:outline-none"
              placeholder="freund@example.com"
            />
            <button
              type="submit"
              disabled={lookup.isPending || !emailInput.trim()}
              className="rounded bg-gray-700 px-3 py-2 text-sm text-gray-200 hover:bg-gray-600 disabled:opacity-50"
            >
              {lookup.isPending ? "…" : "Suchen"}
            </button>
          </div>
        </form>
      </div>

      {/* Such-Ergebnisse */}
      {query.trim().length >= 2 && (
        <div className="rounded border border-gray-700 bg-gray-800/40 p-3 space-y-1.5">
          <div className="text-xs text-gray-500">
            Display-Name-Treffer fuer „{query}":
          </div>
          {search.isLoading && (
            <p className="text-sm text-gray-400">Suche …</p>
          )}
          {search.data && search.data.results.length === 0 && (
            <p className="text-sm text-gray-500">
              Keine Treffer. (Andere User sind eventuell nicht auffindbar
              gesetzt.)
            </p>
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
            Email-Lookup-Ergebnis:
          </div>
          {!lookupResult.found && (
            <p className="text-sm text-gray-500">
              Kein User mit dieser Email gefunden — oder der Account ist
              deaktiviert. (Antwort identisch zu „nicht da", kein Probing.)
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
    </div>
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
  // QA-Fix M4: Cancel-Button bei outgoing_pending — User muss nicht zum
  // anderen Card runterscrollen
  const remove = useRemoveFriendship();
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <div className="text-sm text-gray-200">
        {result.display_name || (
          <span className="italic text-gray-500">(kein Display-Name)</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {result.relationship === "none" && (
          <button
            onClick={onAdd}
            disabled={busy}
            className="rounded bg-purple-600/30 px-3 py-1 text-xs text-purple-200 hover:bg-purple-600/50 disabled:opacity-50"
          >
            ➕ Anfragen
          </button>
        )}
        {result.relationship === "outgoing_pending" && result.friendship_id && (
          <>
            <span className="rounded bg-yellow-500/20 px-2 py-1 text-[10px] text-yellow-300">
              Anfrage offen
            </span>
            <button
              onClick={() =>
                remove.mutate({ friendship_id: result.friendship_id! })
              }
              disabled={busy || remove.isPending}
              className="rounded bg-gray-700 px-2 py-1 text-[10px] text-gray-300 hover:bg-gray-600 disabled:opacity-50"
            >
              ↶ Zuruecknehmen
            </button>
          </>
        )}
        {result.relationship === "incoming_pending" && result.friendship_id && (
          <button
            onClick={() => onAccept(result.friendship_id!)}
            disabled={busy}
            className="rounded bg-emerald-600/30 px-3 py-1 text-xs text-emerald-200 hover:bg-emerald-600/50 disabled:opacity-50"
          >
            ✓ Annehmen
          </button>
        )}
        {result.relationship === "accepted" && (
          <span className="rounded bg-emerald-500/20 px-2 py-1 text-[10px] text-emerald-300">
            Bereits Freunde
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
  const accept = useAcceptFriend();
  const remove = useRemoveFriendship();
  return (
    <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-4 space-y-2">
      <h3 className="text-lg font-medium text-purple-300">
        Eingehende Anfragen ({items.length})
      </h3>
      <ul className="space-y-1.5">
        {items.map((fs) => (
          <li
            key={fs.id}
            className="flex items-center justify-between gap-2 rounded bg-gray-800/40 px-3 py-2"
          >
            <div className="text-sm text-gray-200">
              {fs.other.display_name || (
                <span className="italic text-gray-500">(kein Name)</span>
              )}
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => accept.mutate({ friendship_id: fs.id })}
                disabled={accept.isPending}
                className="rounded bg-emerald-600/30 px-3 py-1 text-xs text-emerald-200 hover:bg-emerald-600/50 disabled:opacity-50"
              >
                ✓ Annehmen
              </button>
              <button
                onClick={() => remove.mutate({ friendship_id: fs.id })}
                disabled={remove.isPending}
                className="rounded bg-gray-700 px-3 py-1 text-xs text-gray-300 hover:bg-gray-600 disabled:opacity-50"
              >
                ✗ Ablehnen
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PendingOutgoingCard({ items }: { items: Friendship[] }) {
  const remove = useRemoveFriendship();
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-4 space-y-2">
      <h3 className="text-lg font-medium text-gray-300">
        Verschickte Anfragen ({items.length})
      </h3>
      <ul className="space-y-1.5">
        {items.map((fs) => (
          <li
            key={fs.id}
            className="flex items-center justify-between gap-2 rounded bg-gray-800/40 px-3 py-2"
          >
            <div className="text-sm text-gray-300">
              {fs.other.display_name || (
                <span className="italic text-gray-500">(kein Name)</span>
              )}
            </div>
            <button
              onClick={() => remove.mutate({ friendship_id: fs.id })}
              disabled={remove.isPending}
              className="rounded bg-gray-700 px-3 py-1 text-xs text-gray-300 hover:bg-gray-600 disabled:opacity-50"
            >
              ↶ Zuruecknehmen
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================
// Friends-Liste
// ============================================================

function FriendsListCard({
  items,
  isLoading,
}: {
  items: Friendship[];
  isLoading: boolean;
}) {
  const remove = useRemoveFriendship();
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-4 space-y-2">
      <h3 className="text-lg font-medium text-purple-300">
        Meine Freunde ({items.length})
      </h3>
      {isLoading && <p className="text-sm text-gray-400">Lade …</p>}
      {!isLoading && items.length === 0 && (
        <p className="text-sm text-gray-500">
          Noch keine Freunde. Such oben nach Display-Name oder Email.
        </p>
      )}
      <ul className="space-y-1.5">
        {items.map((fs) => (
          <li
            key={fs.id}
            className="flex items-center justify-between gap-2 rounded bg-gray-800/40 px-3 py-2"
          >
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium text-gray-100">
                {fs.other.display_name || (
                  <span className="italic text-gray-500">(kein Name)</span>
                )}
              </span>
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
                    `Freundschaft mit ${fs.other.display_name ?? "diesem User"} wirklich beenden?`,
                  )
                ) {
                  remove.mutate({ friendship_id: fs.id });
                }
              }}
              disabled={remove.isPending}
              className="rounded bg-gray-700 px-3 py-1 text-xs text-gray-300 hover:bg-red-600/50 hover:text-white disabled:opacity-50"
            >
              Entfreunden
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
