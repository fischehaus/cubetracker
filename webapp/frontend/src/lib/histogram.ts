// Pure Funktion: Solve-Zeiten in Bins gruppieren fuer Histogramm.
// DNFs werden ausgeschlossen, +2 wird in die effektive Zeit eingerechnet.

import type { SolvePoint } from "./rolling";

export interface HistogramBin {
  /** Untere Grenze des Bins in ms (inklusiv) */
  from_ms: number;
  /** Obere Grenze des Bins in ms (exklusiv, ausser beim letzten Bin) */
  to_ms: number;
  /** Mittelpunkt des Bins (fuer X-Achse), in ms */
  center_ms: number;
  /** Anzahl Solves im Bin */
  count: number;
  /** Label fuer Anzeige (z.B. "10.0–11.0s") */
  label: string;
}

/**
 * Berechnet sinnvolle Bin-Breite via Sturges-Regel + Snap auf
 * „runde" Sekunden-/Hundertstel-Werte. Fuer typische Cube-Zeiten
 * landet man bei 0.5s, 1s oder 2s breiten Bins.
 */
export function suggestBinWidthMs(
  minMs: number,
  maxMs: number,
  n: number
): number {
  if (n < 2 || maxMs <= minMs) return 1000; // Fallback: 1s
  const range = maxMs - minMs;
  const sturges = Math.ceil(Math.log2(n) + 1); // ~ Anzahl Bins
  const raw = range / Math.max(sturges, 1);
  // Snap auf gaengige Buckets
  const candidates = [50, 100, 200, 250, 500, 1000, 2000, 5000, 10000];
  for (const c of candidates) {
    if (c >= raw) return c;
  }
  return 30000;
}

/**
 * Bucket-Solves in Histogramm-Bins. Liefert leeres Array bei leerem Input
 * oder wenn alle DNFs sind.
 */
export function buildHistogram(
  solves: SolvePoint[],
  binWidthMs?: number
): HistogramBin[] {
  const valid = solves
    .filter((s) => !s.dnf)
    .map((s) => s.time_ms + (s.plus_two ? 2000 : 0));
  if (valid.length === 0) return [];

  const minMs = Math.min(...valid);
  const maxMs = Math.max(...valid);
  const width = binWidthMs ?? suggestBinWidthMs(minMs, maxMs, valid.length);

  // Bin-Start am naechsten Vielfachen von `width` unterhalb minMs
  const start = Math.floor(minMs / width) * width;
  const end = Math.ceil((maxMs + 1) / width) * width;
  const numBins = Math.max(1, Math.round((end - start) / width));

  const bins: HistogramBin[] = [];
  for (let i = 0; i < numBins; i++) {
    const from = start + i * width;
    const to = from + width;
    bins.push({
      from_ms: from,
      to_ms: to,
      center_ms: from + width / 2,
      count: 0,
      label: formatBinLabel(from, to),
    });
  }

  for (const t of valid) {
    let idx = Math.floor((t - start) / width);
    if (idx >= numBins) idx = numBins - 1; // letzter Bin inklusiv
    bins[idx].count++;
  }

  return bins;
}

/** Kompaktes Label "10.0–11.0s" oder "1:00–1:05" fuer eine Bin-Spanne. */
function formatBinLabel(fromMs: number, toMs: number): string {
  return `${fmt(fromMs)}–${fmt(toMs)}`;
}

function fmt(ms: number): string {
  const sec = ms / 1000;
  if (sec < 60) return sec.toFixed(1);
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, "0")}`;
}
