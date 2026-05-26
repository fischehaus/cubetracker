// RecentRecordsCard (W.recent-pbs) — kompakte Liste der letzten ~5 PB-
// Ereignisse im Dashboard. Liest /stats/recent-pbs (ueber alle Cube-Types
// des Users). Pro Event: Kind-Badge + Cube + Zeit + Δ-Verbesserung + Alter.
//
// Klick auf einen Eintrag wechselt zum Analyse-Tab mit gesetztem Cube-Filter
// (zeigt dort den PB-Verlauf-Chart). Optionaler Handler vom Parent.

import {
  useRecentPbs,
  type RecentPbEvent,
  type RecentPbKind,
} from "../lib/api";
import { formatTime } from "../lib/format";
import { InfoButton } from "./InfoButton";

interface Props {
  /** Klick auf einen Eintrag fuehrt zum Analyse-Tab mit gesetztem Cube-Filter. */
  onClickCube?: (cubeType: string) => void;
}

export function RecentRecordsCard({ onClickCube }: Props) {
  const { data, isLoading, error } = useRecentPbs(5);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6 text-sm text-gray-400">
        Lade letzte Rekorde …
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-6 text-sm text-red-300">
        Fehler beim Laden: {error.message}
      </div>
    );
  }
  if (!data || data.events.length === 0) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6">
        <h3 className="text-xl font-semibold text-gray-100 mb-2 flex items-center gap-2">
          🏆 Letzte Rekorde
        </h3>
        <p className="text-sm text-gray-400">
          Noch keine Bestzeiten — sobald du Solves speicherst, erscheinen
          hier deine letzten persönlichen Rekorde (Single, ao5, ao12) mit
          Verbesserung gegenüber dem vorigen PB.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-xl font-semibold text-gray-100">
          🏆 Letzte Rekorde
        </h3>
        <InfoButton>
          <p className="font-medium mb-1">Letzte Rekorde</p>
          <p>
            Deine jüngsten persönlichen Bestzeiten über alle Cubes hinweg.
            Gold ★ = Single-PB, cyan ● = ao5-PB, emerald ● = ao12-PB.
            Die Δ-Zahl zeigt, um wie viel du den vorigen PB unterboten
            hast. Klick auf einen Eintrag öffnet den PB-Verlauf im
            Analyse-Tab.
          </p>
        </InfoButton>
      </div>
      <ul className="space-y-2">
        {data.events.map((e) => (
          <RecentPbRow
            key={`${e.kind}-${e.cube_type}-${e.solve_id}`}
            event={e}
            onClick={onClickCube}
          />
        ))}
      </ul>
    </div>
  );
}

function RecentPbRow({
  event,
  onClick,
}: {
  event: RecentPbEvent;
  onClick?: (cubeType: string) => void;
}) {
  const daysAgo = event.at
    ? Math.floor((Date.now() - new Date(event.at).getTime()) / 86_400_000)
    : null;
  const ageLabel =
    daysAgo === null
      ? "—"
      : daysAgo <= 0
        ? "heute"
        : daysAgo === 1
          ? "gestern"
          : `vor ${daysAgo} Tagen`;
  const deltaLabel =
    event.delta_ms_vs_prev !== null && event.delta_ms_vs_prev > 0
      ? `−${formatTime(event.delta_ms_vs_prev)}`
      : null;

  const clickable = !!onClick;

  return (
    <li
      onClick={clickable ? () => onClick!(event.cube_type) : undefined}
      className={`flex items-center justify-between gap-3 rounded border border-gray-700/60 bg-gray-800/40 px-3 py-2 ${
        clickable ? "cursor-pointer hover:bg-gray-800/70" : ""
      }`}
      title={
        clickable ? "Klick zeigt den PB-Verlauf im Analyse-Tab" : undefined
      }
    >
      <div className="flex items-center gap-3 min-w-0 flex-wrap">
        <KindBadge kind={event.kind} />
        <span className="text-sm text-gray-400">{event.cube_type}</span>
        <span className="font-mono text-base text-gray-100">
          {formatTime(event.ms)}
        </span>
        {deltaLabel && (
          <span
            className="text-xs text-emerald-300 font-medium"
            title="Verbesserung gegenüber dem vorigen PB derselben Metrik"
          >
            {deltaLabel}
          </span>
        )}
      </div>
      <span className="text-xs text-gray-500 whitespace-nowrap">
        {ageLabel}
      </span>
    </li>
  );
}

function KindBadge({ kind }: { kind: RecentPbKind }) {
  if (kind === "single") {
    return (
      <span
        className="text-yellow-300 font-bold text-sm flex-shrink-0"
        title="Single-PB"
      >
        ★ Single
      </span>
    );
  }
  if (kind === "ao5") {
    return (
      <span
        className="text-cyan-300 font-medium text-sm flex-shrink-0"
        title="ao5-PB"
      >
        ● ao5
      </span>
    );
  }
  return (
    <span
      className="text-emerald-300 font-medium text-sm flex-shrink-0"
      title="ao12-PB"
    >
      ● ao12
    </span>
  );
}
