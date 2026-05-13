/**
 * AccountSettingsPanel (Phase W.8) — User-Profil-Management.
 *
 * 4 Sektionen:
 * - Profil (Email-Status, display_name)
 * - Passwort aendern (current + new)
 * - Email aendern (current_pw + new_email -> Verify-Mail an neue Adresse)
 * - Account loeschen (DSGVO, mit Confirm)
 *
 * Resend-Verify-Mail-Button bei email_verified=false.
 */
import { useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import { api } from "../lib/api";
import { InfoButton } from "./InfoButton";

export function AccountSettingsPanel() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-2xl font-semibold text-gray-100">Account</h2>
        <InfoButton>
          <p className="font-medium mb-1">Account</p>
          <p>
            Profil-Daten + Sicherheit. Display-Name aendern, Passwort
            aendern (logged dich automatisch aus), Email-Adresse aendern
            (mit Re-Verifikation der neuen Adresse), Auffindbar-Toggle
            fuer die Freunde-Suche, Account komplett loeschen (DSGVO).
          </p>
        </InfoButton>
      </div>

      <ProfileSection />
      <PasswordSection />
      <EmailSection />
      <DangerSection />

      <p className="text-xs text-gray-500">
        Eingeloggt als <code className="text-gray-300">{user.email}</code>
        {user.display_name && ` (${user.display_name})`}.
        {" · "}
        <button
          onClick={() => void logout()}
          className="text-purple-400 hover:text-purple-300 underline"
        >
          Logout
        </button>
      </p>
    </div>
  );
}

// ============================================================
// Profil
// ============================================================

function ProfileSection() {
  const { user, refreshMe } = useAuth();
  const [displayName, setDisplayName] = useState(user?.display_name ?? "");
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setInfo(null);
    setError(null);
    try {
      await api.patch("/auth/me", { display_name: displayName || null });
      await refreshMe();
      setInfo("Profil aktualisiert.");
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function resendVerify() {
    setBusy(true);
    setInfo(null);
    setError(null);
    try {
      await api.post("/auth/resend-verification");
      setInfo("Verifikations-Mail erneut gesendet. Pruefe deinen Posteingang.");
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Profil">
      <div className="mb-3 text-sm">
        <span className="text-gray-400">Email:</span>{" "}
        <code className="text-gray-200">{user.email}</code>
        {user.email_verified ? (
          <span className="ml-2 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded px-2 py-0.5">
            ✓ verifiziert
          </span>
        ) : (
          <span className="ml-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded px-2 py-0.5">
            ⚠ nicht verifiziert
          </span>
        )}
        {!user.email_verified && (
          <button
            onClick={() => void resendVerify()}
            disabled={busy}
            className="ml-2 text-xs text-purple-400 hover:text-purple-300 underline"
          >
            Verify-Mail erneut senden
          </button>
        )}
      </div>

      <form onSubmit={onSubmit} className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">
          Anzeige-Name (optional)
        </label>
        <input
          type="text"
          maxLength={64}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="z.B. dein Vorname"
          className="w-full max-w-xs rounded-lg border border-gray-600 bg-gray-900 text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-purple-600 text-white text-sm font-medium px-4 py-2 hover:bg-purple-700 disabled:opacity-50"
        >
          {busy ? "…" : "Speichern"}
        </button>
        {info && <FeedbackOk text={info} />}
        {error && <FeedbackErr text={error} />}
      </form>

      {/* Phase W.9: Discoverability-Toggle */}
      <DiscoverabilitySection />
    </Card>
  );
}

function DiscoverabilitySection() {
  const { user, refreshMe } = useAuth();
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const hasName = !!user.display_name?.trim();

  async function toggle(next: boolean) {
    setBusy(true);
    setInfo(null);
    setError(null);
    try {
      await api.patch("/auth/me", { is_discoverable: next });
      await refreshMe();
      setInfo(next ? "Du bist jetzt fuer andere User auffindbar." : "Auffindbarkeit deaktiviert.");
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 border-t border-gray-700 pt-3 space-y-2">
      <div className="text-sm font-medium text-gray-300">
        Auffindbar fuer andere (Freunde-Suche)
      </div>
      <p className="text-xs text-gray-400">
        Wenn aktiv, koennen andere User dich per <em>Display-Name</em> in
        der Freunde-Suche finden. Per <em>Email</em> bist du immer findbar
        (wer die Adresse kennt). Default: aus.
      </p>
      <label className="flex items-center gap-2 text-sm text-gray-200">
        <input
          type="checkbox"
          checked={user.is_discoverable}
          onChange={(e) => void toggle(e.target.checked)}
          disabled={busy || !hasName}
          className="accent-purple-500 w-4 h-4"
        />
        Andere User koennen mich per Display-Name finden
      </label>
      {!hasName && (
        <p className="text-xs text-amber-300">
          ⚠ Erst einen Anzeige-Namen setzen — sonst gibt es nichts zu finden.
        </p>
      )}
      {info && <FeedbackOk text={info} />}
      {error && <FeedbackErr text={error} />}
    </div>
  );
}

// ============================================================
// Passwort aendern
// ============================================================

function PasswordSection() {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setInfo(null);
    setError(null);
    try {
      await api.post("/auth/change-password", {
        current_password: currentPw,
        new_password: newPw,
      });
      setInfo(
        "Passwort geaendert. Du wirst gleich automatisch ausgeloggt — bitte mit neuem Passwort neu einloggen.",
      );
      setCurrentPw("");
      setNewPw("");
      // Backend hat token_version++ gemacht → naechster API-Call kriegt 401
      // → AuthContext bekommt 'cubetracker:logged-out'-Event → LoginPage erscheint.
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Passwort aendern">
      <form onSubmit={onSubmit} className="space-y-2 max-w-xs">
        <input
          type="password"
          required
          autoComplete="current-password"
          placeholder="Aktuelles Passwort"
          value={currentPw}
          onChange={(e) => setCurrentPw(e.target.value)}
          className="w-full rounded-lg border border-gray-600 bg-gray-900 text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="Neues Passwort (>= 8 Zeichen)"
          value={newPw}
          onChange={(e) => setNewPw(e.target.value)}
          className="w-full rounded-lg border border-gray-600 bg-gray-900 text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-purple-600 text-white text-sm font-medium px-4 py-2 hover:bg-purple-700 disabled:opacity-50"
        >
          {busy ? "…" : "Passwort aendern"}
        </button>
        {info && <FeedbackOk text={info} />}
        {error && <FeedbackErr text={error} />}
      </form>
    </Card>
  );
}

// ============================================================
// Email aendern
// ============================================================

function EmailSection() {
  const [currentPw, setCurrentPw] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setInfo(null);
    setError(null);
    try {
      await api.post("/auth/change-email", {
        current_password: currentPw,
        new_email: newEmail,
      });
      setInfo(
        `Verifikations-Mail an ${newEmail} unterwegs. Klick den Link in der Mail um die neue Adresse zu aktivieren.`,
      );
      setCurrentPw("");
      setNewEmail("");
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Email-Adresse aendern">
      <p className="text-sm text-gray-400 mb-2">
        Die alte Email-Adresse bleibt bis zur Bestaetigung der neuen aktiv.
      </p>
      <form onSubmit={onSubmit} className="space-y-2 max-w-xs">
        <input
          type="password"
          required
          autoComplete="current-password"
          placeholder="Aktuelles Passwort"
          value={currentPw}
          onChange={(e) => setCurrentPw(e.target.value)}
          className="w-full rounded-lg border border-gray-600 bg-gray-900 text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <input
          type="email"
          required
          placeholder="Neue Email-Adresse"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          className="w-full rounded-lg border border-gray-600 bg-gray-900 text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-purple-600 text-white text-sm font-medium px-4 py-2 hover:bg-purple-700 disabled:opacity-50"
        >
          {busy ? "…" : "Verify-Mail an neue Adresse senden"}
        </button>
        {info && <FeedbackOk text={info} />}
        {error && <FeedbackErr text={error} />}
      </form>
    </Card>
  );
}

// ============================================================
// Account loeschen (DSGVO)
// ============================================================

function DangerSection() {
  const { logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    if (
      !window.confirm(
        "Konto WIRKLICH loeschen?\n\nALLE deine Daten (Solves, Sessions, Hardware, Achievements, Snapshots) werden unwiderruflich entfernt.\n\nFortfahren?",
      )
    )
      return;
    setBusy(true);
    setError(null);
    try {
      await api.delete("/auth/me");
      await logout();
      window.location.href = "/";
    } catch (err) {
      setError(extractErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Card title="Account loeschen" danger>
      <p className="text-sm text-gray-400 mb-3">
        DSGVO: Du kannst dein Konto + alle Daten jederzeit unwiderruflich
        loeschen. Vorher empfohlen: Voll-Backup unter „Daten" runterladen.
      </p>
      <button
        onClick={() => void onDelete()}
        disabled={busy}
        className="rounded-lg bg-red-600 text-white text-sm font-medium px-4 py-2 hover:bg-red-700 disabled:opacity-50"
      >
        {busy ? "Loesche…" : "Account + alle Daten loeschen"}
      </button>
      {error && <FeedbackErr text={error} />}
    </Card>
  );
}

// ============================================================
// Helpers
// ============================================================

function Card({
  title,
  danger,
  children,
}: {
  title: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-lg border ${
        danger ? "border-red-500/40 bg-red-500/5" : "border-gray-700 bg-gray-900/50"
      } p-4`}
    >
      <h3 className={`text-lg font-semibold mb-2 ${danger ? "text-red-200" : "text-gray-100"}`}>
        {title}
      </h3>
      {children}
    </section>
  );
}

function FeedbackOk({ text }: { text: string }) {
  return (
    <p className="text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded px-3 py-2 mt-2">
      {text}
    </p>
  );
}

function FeedbackErr({ text }: { text: string }) {
  return (
    <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded px-3 py-2 mt-2">
      {text}
    </p>
  );
}

function extractErrorMessage(err: unknown): string {
  if (typeof err === "object" && err !== null) {
    const maybe = err as {
      response?: { data?: { detail?: string } };
      message?: string;
    };
    if (maybe.response?.data?.detail) return maybe.response.data.detail;
    if (maybe.message) return maybe.message;
  }
  return "Unbekannter Fehler.";
}
