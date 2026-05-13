// AdminStatsPanel (Phase W.admin) — Cluster-Statistiken fuer App-Betreiber.
//
// Nutzt GET /admin/stats (limit 30/min). Endpoint liefert nur AGGREGAT-
// Daten, keine personenbezogenen Felder — DSGVO-konform.
//
// Sichtbar nur fuer User mit is_admin === true (von /auth/me geliefert,
// abgeleitet aus ADMIN_EMAILS-Env-Var im Backend). Sub-Tab im Verwaltung-
// Tab rendert die Komponente nur conditional — Direkt-Render bei nicht-
// Admin wuerde 404 ergeben.

import { useAuth } from "../auth/AuthContext";
import { useAdminStats } from "../lib/api";
import { InfoButton } from "./InfoButton";

function formatNumber(n: number): string {
  return n.toLocaleString("de-DE");
}

function formatRelative(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function AdminStatsPanel() {
  // Defense-in-Depth (QA-Finding low): enabled=user.is_admin statt true.
  // Aktuell rendert VerwaltungTab die Komponente eh nur fuer Admins, aber
  // falls ein zukuenftiger Caller den Guard vergisst, fetcht der Hook
  // nichts und das Backend 404'd ohnehin.
  const { user } = useAuth();
  const isAdmin = user?.is_admin ?? false;
  const { data, isLoading, error, refetch, isFetching } = useAdminStats(isAdmin);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6">
        <p className="text-gray-400">Lade Admin-Statistiken …</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-6">
        <p className="font-medium text-red-300">Fehler beim Laden</p>
        <p className="mt-1 text-sm text-red-200">
          {error instanceof Error ? error.message : "Unbekannter Fehler"}
        </p>
        <p className="mt-2 text-xs text-red-300/70">
          Falls 404: ADMIN_EMAILS-Env-Var im Backend pruefen.
        </p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* Header: as_of + Refresh */}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-semibold text-gray-100">
            Admin-Statistiken{" "}
            <span className="text-sm text-gray-500">(nur fuer App-Betreiber)</span>
          </h2>
          <InfoButton>
            <p className="font-medium mb-1">Admin-Statistiken</p>
            <p>
              Anonyme Aggregat-Daten zum Cluster: User-Counts (total/aktiv/
              verifiziert/30d-aktiv), Daten-Volumen (Solves/Sessions/
              Hardware/Achievements), Top-10 Cube-Types, Snapshot-Storage.
              Keine personenbezogenen Daten — DSGVO-konform. Caching 60s.
            </p>
          </InfoButton>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>Stand: {formatRelative(data.as_of)}</span>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded bg-gray-700 px-3 py-1 text-gray-200 hover:bg-gray-600 disabled:opacity-50"
          >
            {isFetching ? "…" : "↻ Aktualisieren"}
          </button>
        </div>
      </div>

      {/* User-Kacheln */}
      <section className="rounded-lg border border-gray-700 bg-gray-900/50 p-6">
        <h3 className="mb-4 text-lg font-medium text-purple-300">User</h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <StatTile
            label="Total"
            value={formatNumber(data.users.total)}
            color="purple"
          />
          <StatTile
            label="Aktiv"
            value={formatNumber(data.users.active)}
            sub={`${pct(data.users.active, data.users.total)}%`}
          />
          <StatTile
            label="Email verifiziert"
            value={formatNumber(data.users.email_verified)}
            sub={`${pct(data.users.email_verified, data.users.total)}%`}
          />
          <StatTile
            label="Aktiv 7d"
            value={formatNumber(data.users.recently_active_7d)}
            color="emerald"
            sub={`${pct(data.users.recently_active_7d, data.users.total)}%`}
          />
          <StatTile
            label="Aktiv 30d"
            value={formatNumber(data.users.recently_active_30d)}
            color="emerald"
            sub={`${pct(data.users.recently_active_30d, data.users.total)}%`}
          />
        </div>
      </section>

      {/* Daten-Volumen */}
      <section className="rounded-lg border border-gray-700 bg-gray-900/50 p-6">
        <h3 className="mb-4 text-lg font-medium text-purple-300">Daten-Volumen</h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatTile
            label="Solves"
            value={formatNumber(data.volume.solves)}
            color="purple"
          />
          <StatTile label="Sessions" value={formatNumber(data.volume.sessions)} />
          <StatTile label="Hardware" value={formatNumber(data.volume.hardware)} />
          <StatTile
            label="Achievements"
            value={formatNumber(data.volume.achievements_unlocked)}
          />
        </div>
      </section>

      {/* Top-Cubes */}
      <section className="rounded-lg border border-gray-700 bg-gray-900/50 p-6">
        <h3 className="mb-4 text-lg font-medium text-purple-300">
          Top Cube-Types (nach Solves)
        </h3>
        {data.top_cubes.length === 0 ? (
          <p className="text-sm text-gray-500">Keine Daten.</p>
        ) : (
          <ol className="space-y-1.5 text-sm">
            {data.top_cubes.map((c, i) => {
              const pctVal = pct(c.solves, data.volume.solves);
              return (
                <li
                  key={c.cube_type}
                  className="flex items-center gap-3 rounded bg-gray-800/40 px-3 py-2"
                >
                  <span className="w-6 text-right text-gray-500">{i + 1}.</span>
                  <span className="flex-1 font-mono text-gray-200">
                    {c.cube_type}
                  </span>
                  <span className="text-gray-300">{formatNumber(c.solves)}</span>
                  <span className="w-12 text-right text-xs text-gray-500">
                    {pctVal}%
                  </span>
                  <div className="hidden md:block w-32 bg-gray-700/50 rounded-sm h-2 overflow-hidden">
                    <div
                      className="h-full bg-purple-500"
                      style={{ width: `${pctVal}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* Snapshot-Storage */}
      <section className="rounded-lg border border-gray-700 bg-gray-900/50 p-6">
        <h3 className="mb-4 text-lg font-medium text-purple-300">
          Snapshot-Storage
        </h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <StatTile
            label="Snapshots gesamt"
            value={formatNumber(data.storage.snapshots_count)}
          />
          <StatTile
            label="Speicher gesamt"
            value={`${data.storage.snapshots_total_mb.toFixed(2)} MB`}
            sub={`${formatNumber(data.storage.snapshots_total_bytes)} bytes`}
          />
          <StatTile
            label="Ø pro Snapshot"
            value={
              data.storage.snapshots_count > 0
                ? `${(
                    data.storage.snapshots_total_bytes /
                    data.storage.snapshots_count /
                    1024
                  ).toFixed(1)} KB`
                : "—"
            }
          />
        </div>
      </section>

      {/* DSGVO-Hinweis */}
      <p className="text-xs text-gray-500">
        Endpoint liefert nur anonyme Aggregate (keine Emails, Display-Names
        oder Einzel-Solves). Bei sehr kleinem Cluster (&lt;5 User) sind die
        Top-Cubes theoretisch deanonymisierbar — akzeptables Restrisiko bis
        zur Friends-Phase.
      </p>
    </div>
  );
}

function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 1000) / 10; // 1 Nachkommastelle
}

interface StatTileProps {
  label: string;
  value: string;
  sub?: string;
  color?: "purple" | "emerald" | "default";
}

function StatTile({ label, value, sub, color = "default" }: StatTileProps) {
  const valueColor =
    color === "purple"
      ? "text-purple-200"
      : color === "emerald"
        ? "text-emerald-200"
        : "text-gray-100";
  return (
    <div className="rounded border border-gray-700 bg-gray-800/40 p-3">
      <div className="text-xs uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold ${valueColor}`}>{value}</div>
      {sub && <div className="text-xs text-gray-500">{sub}</div>}
    </div>
  );
}
