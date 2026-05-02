// Helper: Zeit-Formatierung + Cube-Type-Liste.

import type { Solve } from "./types";

/**
 * Formatiert Millisekunden im csTimer-Stil:
 * < 60s  → "12.34"
 * >= 60s → "1:23.45"
 * DNF    → "DNF"
 */
export function formatTime(ms: number | null, dnf: boolean = false): string {
  if (dnf || ms === null) return "DNF";
  const totalSeconds = ms / 1000;
  if (totalSeconds < 60) return totalSeconds.toFixed(2);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds - minutes * 60;
  return `${minutes}:${seconds.toFixed(2).padStart(5, "0")}`;
}

/**
 * Formatiert einen Solve mit Strafe-Markern: "12.34+", "DNF".
 */
export function formatSolveTime(s: Solve): string {
  if (s.dnf) return "DNF";
  const base = formatTime(s.effective_time_ms);
  return s.plus_two ? `${base}+` : base;
}

/**
 * Parst einen User-Input-String wie "12.34" oder "1:23.45" zu Millisekunden.
 * Liefert null bei ungueltigem Input.
 */
export function parseTimeInput(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // "1:23.45" oder "1:23" → MM:SS.cc
  if (trimmed.includes(":")) {
    const [minStr, secStr] = trimmed.split(":");
    const min = parseInt(minStr, 10);
    const sec = parseFloat(secStr);
    if (isNaN(min) || isNaN(sec) || min < 0 || sec < 0 || sec >= 60) return null;
    return Math.round((min * 60 + sec) * 1000);
  }

  // "12.34" → SS.cc
  const sec = parseFloat(trimmed);
  if (isNaN(sec) || sec < 0) return null;
  return Math.round(sec * 1000);
}

/**
 * Formatiert ein ISO-Datum kompakt: "02.05.2026 14:23".
 */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}.${mm}.${yyyy} ${hh}:${min}`;
}

/**
 * Standard-Liste haeufiger Cube-Types (Reihenfolge fuer Dropdown-Default).
 * User kann beliebige andere Strings im POST schicken — das hier ist nur UX.
 */
export const COMMON_CUBE_TYPES = [
  "3x3",
  "2x2",
  "4x4",
  "5x5",
  "6x6",
  "7x7",
  "OH",
  "Pyraminx",
  "Skewb",
  "Square-1",
  "Megaminx",
  "Clock",
  "3BLD",
] as const;
