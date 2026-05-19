// AdminLiveTestsPanel — Liste offener Live-Tests im Admin-Bereich.
//
// Wenn Claude ein Feature deployed, gibt's oft Test-Hinweise wie
// "Phone-Test: X, Y, Z bitte". Diese landen jetzt hier (vom Admin manuell
// per "+ Neu"-Button eingetragen, basierend auf den Hinweisen aus dem
// Chat). Der Admin arbeitet sie nacheinander ab: PASS / FAIL / SKIP +
// Notiz.
//
// Phase 3 (kommt noch): bei FAIL + Notiz wird automatisch ein GitHub-
// Issue erstellt damit die nächste Welle den Fix aufnehmen kann.

import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { InfoButton } from "./InfoButton";
import {
  useAdminCreateLiveTest,
  useAdminDeleteLiveTest,
  useAdminLiveTests,
  useAdminUpdateLiveTest,
  type LiveTest,
  type LiveTestStatus,
} from "../lib/api";

function fmtRelative(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const min = Math.floor((Date.now() - d.getTime()) / 60_000);
    if (min < 1) return "gerade eben";
    if (min < 60) return `vor ${min}min`;
    if (min < 60 * 24) return `vor ${Math.floor(min / 60)}h`;
    const days = Math.floor(min / 60 / 24);
    if (days < 7) return `vor ${days}d`;
    if (days < 30) return `vor ${Math.floor(days / 7)}w`;
    return `vor ${Math.floor(days / 30)}mo`;
  } catch {
    return iso;
  }
}

const STATUS_COLORS: Record<LiveTestStatus, { bg: string; text: string; label: string }> = {
  open: { bg: "bg-blue-500/20", text: "text-blue-300", label: "offen" },
  pass: { bg: "bg-emerald-500/20", text: "text-emerald-300", label: "✓ PASS" },
  fail: { bg: "bg-red-500/20", text: "text-red-300", label: "✗ FAIL" },
  skip: { bg: "bg-gray-500/20", text: "text-gray-300", label: "↷ SKIP" },
};

export function AdminLiveTestsPanel() {
  const { user: me } = useAuth();
  const isAdmin = me?.is_admin ?? false;
  const [filter, setFilter] = useState<LiveTestStatus | "all">("open");
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading, error, refetch, isFetching } = useAdminLiveTests(
    isAdmin,
    filter,
  );

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6">
        <p className="text-gray-400">Lade Live-Tests …</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-6">
        <p className="text-red-300">
          Fehler: {error instanceof Error ? error.message : "unbekannt"}
        </p>
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6 space-y-3">
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-medium text-purple-300">
            Live-Tests{" "}
            <span className="text-sm text-gray-500">({data.count})</span>
          </h3>
          <InfoButton>
            <p className="font-medium mb-1">Live-Tests (Admin-QA-Checkliste)</p>
            <p className="mb-2">
              Test-Hinweise aus Claude-Deploys oder eigene QA-Items. Pro Test
              kannst du PASS / FAIL / SKIP setzen und eine Notiz schreiben.
            </p>
            <p>
              <strong>Workflow:</strong> Claude sagt im Chat „Phone-Test: X".
              Du klickst hier „+ Neu", paste Title + Beschreibung. Später
              testest du auf Phone, klickst PASS oder FAIL+Notiz. Bei FAIL
              wird (Phase 3) automatisch ein GitHub-Issue erstellt.
            </p>
          </InfoButton>
        </div>
        <div className="flex items-center gap-2">
          <FilterPill
            label="Offen"
            active={filter === "open"}
            onClick={() => setFilter("open")}
          />
          <FilterPill
            label="Alle"
            active={filter === "all"}
            onClick={() => setFilter("all")}
          />
          <FilterPill
            label="Pass"
            active={filter === "pass"}
            onClick={() => setFilter("pass")}
          />
          <FilterPill
            label="Fail"
            active={filter === "fail"}
            onClick={() => setFilter("fail")}
          />
          <FilterPill
            label="Skip"
            active={filter === "skip"}
            onClick={() => setFilter("skip")}
          />
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded bg-gray-700 px-2 py-1 text-xs text-gray-200 hover:bg-gray-600 disabled:opacity-50"
            title="Refresh"
          >
            {isFetching ? "…" : "↻"}
          </button>
          <button
            onClick={() => setCreateOpen(true)}
            className="rounded bg-purple-600 px-3 py-1 text-xs font-medium text-white hover:bg-purple-700"
          >
            + Neu
          </button>
        </div>
      </div>

      {data.tests.length === 0 && (
        <div className="rounded border border-dashed border-gray-700 px-4 py-8 text-center text-gray-500 text-sm">
          {filter === "open"
            ? "Keine offenen Tests. Wenn Claude im Chat einen Test-Hinweis gibt: '+ Neu' klicken."
            : `Keine Tests mit Filter '${filter}'.`}
        </div>
      )}

      <div className="space-y-3">
        {data.tests.map((t) => (
          <TestRow key={t.id} test={t} />
        ))}
      </div>

      {createOpen && <CreateDialog onClose={() => setCreateOpen(false)} />}
    </div>
  );
}

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded px-2 py-1 text-xs transition-colors ${
        active
          ? "bg-purple-600 text-white"
          : "bg-gray-700 text-gray-300 hover:bg-gray-600"
      }`}
    >
      {label}
    </button>
  );
}

// ============================================================
// Test-Zeile
// ============================================================

function TestRow({ test }: { test: LiveTest }) {
  const update = useAdminUpdateLiveTest();
  const del = useAdminDeleteLiveTest();
  const [response, setResponse] = useState(test.user_response ?? "");
  const [editing, setEditing] = useState(false);
  // QA-Fix (2026-05-17 abends): 2-Klick-Pattern statt confirm() —
  // confirm() ist Mobile-unzuverlaessig (gleicher Fix wie BigTimerInput).
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const colors = STATUS_COLORS[test.status];

  // Auto-Reset delete-Confirm nach 5s ohne 2. Klick
  useEffect(() => {
    if (!deleteConfirm) return;
    const t = setTimeout(() => setDeleteConfirm(false), 5000);
    return () => clearTimeout(t);
  }, [deleteConfirm]);

  const setStatus = (status: LiveTestStatus) => {
    update.mutate({
      id: test.id,
      patch: { status, user_response: response.trim() || null },
    });
  };

  const saveResponse = () => {
    update.mutate(
      { id: test.id, patch: { user_response: response.trim() || null } },
      {
        onSuccess: () => setEditing(false),
      },
    );
  };

  const remove = () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    del.mutate({ id: test.id });
  };

  return (
    <div
      className={`rounded-lg border ${
        test.status === "open" ? "border-blue-500/30" : "border-gray-700"
      } bg-gray-900/40 p-4 space-y-2`}
    >
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <h4 className="text-base font-semibold text-gray-100">{test.title}</h4>
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${colors.bg} ${colors.text}`}>
              {colors.label}
            </span>
            {test.related_phase && (
              <span className="rounded bg-gray-700/50 px-1.5 py-0.5 text-[10px] font-mono text-gray-400">
                {test.related_phase}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-400 whitespace-pre-wrap">
            {test.description}
          </p>
        </div>
        <div className="text-right text-[10px] text-gray-500 shrink-0">
          <div title={test.created_at}>angelegt {fmtRelative(test.created_at)}</div>
          {test.responded_at && (
            <div title={test.responded_at}>
              bearbeitet {fmtRelative(test.responded_at)}
            </div>
          )}
        </div>
      </div>

      {/* Antwort-Bereich: zeigen wenn vorhanden, oder Edit-Mode */}
      {(test.user_response || editing) && (
        <div className="rounded border border-gray-700/50 bg-gray-800/40 p-2">
          {editing ? (
            <>
              <textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                rows={3}
                maxLength={4000}
                placeholder="Notiz zum Test (z.B. was nicht funktioniert hat, wie's vorging)"
                className="w-full rounded border border-gray-600 bg-gray-900 px-2 py-1 text-xs text-gray-100 focus:border-purple-500 focus:outline-none"
                autoFocus
              />
              <div className="mt-1 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setEditing(false);
                    setResponse(test.user_response ?? "");
                  }}
                  className="rounded bg-gray-700 px-2 py-1 text-[11px] text-gray-200 hover:bg-gray-600"
                >
                  Abbrechen
                </button>
                <button
                  onClick={saveResponse}
                  disabled={update.isPending}
                  className="rounded bg-purple-600 px-2 py-1 text-[11px] text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  {update.isPending ? "…" : "Speichern"}
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs text-gray-300 whitespace-pre-wrap flex-1">
                {test.user_response}
              </p>
              <button
                onClick={() => setEditing(true)}
                className="text-[11px] text-gray-400 hover:text-gray-200"
              >
                ✏ edit
              </button>
            </div>
          )}
        </div>
      )}

      {/* Action-Leiste */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex flex-wrap gap-1.5">
          {test.status !== "pass" && (
            <button
              onClick={() => setStatus("pass")}
              disabled={update.isPending}
              className="rounded bg-emerald-600/30 px-2 py-1 text-xs text-emerald-200 hover:bg-emerald-600/50 disabled:opacity-50"
              title="Test bestanden"
            >
              ✓ PASS
            </button>
          )}
          {test.status !== "fail" && (
            <button
              onClick={() => setStatus("fail")}
              disabled={update.isPending}
              className="rounded bg-red-600/30 px-2 py-1 text-xs text-red-200 hover:bg-red-600/50 disabled:opacity-50"
              title="Test fehlgeschlagen (mit Notiz oben optional)"
            >
              ✗ FAIL
            </button>
          )}
          {test.status !== "skip" && (
            <button
              onClick={() => setStatus("skip")}
              disabled={update.isPending}
              className="rounded bg-gray-600/30 px-2 py-1 text-xs text-gray-300 hover:bg-gray-600/50 disabled:opacity-50"
              title="Test übersprungen (nicht relevant / später)"
            >
              ↷ SKIP
            </button>
          )}
          {test.status !== "open" && (
            <button
              onClick={() => setStatus("open")}
              disabled={update.isPending}
              className="rounded bg-blue-600/30 px-2 py-1 text-xs text-blue-200 hover:bg-blue-600/50 disabled:opacity-50"
              title="Zurück zu offen"
            >
              ↺ Reopen
            </button>
          )}
          {!editing && !test.user_response && (
            <button
              onClick={() => setEditing(true)}
              className="rounded bg-gray-700 px-2 py-1 text-xs text-gray-200 hover:bg-gray-600"
            >
              💬 Notiz
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {test.github_issue_url && (
            <a
              href={test.github_issue_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-purple-300 hover:text-purple-200"
            >
              GitHub #{test.github_issue_number} ↗
            </a>
          )}
          <button
            onClick={remove}
            disabled={del.isPending}
            className={`rounded px-2 py-1 text-xs transition-colors disabled:opacity-50 ${
              deleteConfirm
                ? "bg-red-700 text-red-100 animate-pulse"
                : "bg-red-700/40 text-red-300 hover:bg-red-700/60"
            }`}
            title={
              deleteConfirm
                ? "Erneut klicken zum endgueltigen Löschen"
                : "Test löschen"
            }
          >
            {deleteConfirm ? "Wirklich?" : "🗑"}
          </button>
        </div>
      </div>
      {update.isError && (
        <div className="text-[10px] text-red-300">{update.error?.message}</div>
      )}
    </div>
  );
}

// ============================================================
// Create-Dialog
// ============================================================

function CreateDialog({ onClose }: { onClose: () => void }) {
  const create = useAdminCreateLiveTest();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [relatedPhase, setRelatedPhase] = useState("");

  const submit = () => {
    if (!title.trim() || !description.trim()) return;
    create.mutate(
      {
        title: title.trim(),
        description: description.trim(),
        related_phase: relatedPhase.trim() || null,
      },
      {
        onSuccess: onClose,
      },
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-lg border border-purple-500/40 bg-gray-900 p-6 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <h4 className="text-lg font-semibold text-purple-300">Neuer Live-Test</h4>
        <label className="flex flex-col text-xs text-gray-400">
          Titel (kurz, z.B. "Voice-Alert 8s/12s testen")
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            autoFocus
            className="mt-1 rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-purple-500 focus:outline-none"
          />
        </label>
        <label className="flex flex-col text-xs text-gray-400">
          Beschreibung (was zu pruefen, was du erwartest)
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            maxLength={4000}
            className="mt-1 rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-purple-500 focus:outline-none font-mono"
            placeholder={
              "Cube auf 3x3 stellen, Inspection-Countdown starten.\n" +
              "Erwartung: bei 8s eine Stimme 'acht', bei 12s 'zwoelf'.\n" +
              "Wenn DE/EN: passend zur Einstellung."
            }
          />
          <span className="mt-0.5 text-[10px] text-gray-500">
            {description.length} / 4000
          </span>
        </label>
        <label className="flex flex-col text-xs text-gray-400">
          Welle (optional, z.B. "W.voice-alert")
          <input
            type="text"
            value={relatedPhase}
            onChange={(e) => setRelatedPhase(e.target.value)}
            maxLength={64}
            placeholder="W.feature-name"
            className="mt-1 rounded border border-gray-600 bg-gray-800 px-3 py-2 text-xs text-gray-100 font-mono focus:border-purple-500 focus:outline-none"
          />
        </label>
        {create.isError && (
          <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {create.error?.message}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="rounded bg-gray-700 px-4 py-2 text-sm text-gray-200 hover:bg-gray-600"
          >
            Abbrechen
          </button>
          <button
            onClick={submit}
            disabled={create.isPending || !title.trim() || !description.trim()}
            className="rounded bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {create.isPending ? "Lege an …" : "Anlegen"}
          </button>
        </div>
      </div>
    </div>
  );
}
