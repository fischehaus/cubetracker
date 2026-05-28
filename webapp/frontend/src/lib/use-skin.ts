// useSkin-Hook (W.skin-cyberpunk-mvp).
//
// localStorage-Persistenz + Custom-Event-Sync analog zu lib/settings.ts.
// Setzt zusaetzlich body.classList["skin-active"] und body-data-attribute
// damit CSS-Selektoren (siehe index.css) reagieren koennen.
//
// Bewusst getrennt von lib/skins.ts (data-only) — dieser File ist Hook +
// DOM-Side-Effects.

import { useEffect, useState } from "react";
import { DEFAULT_SKIN_ID, getSkin } from "./skins";

const STORAGE_KEY = "cubetracker.skin.v1";
const CHANGE_EVENT = "cubetracker:skin-changed";

/**
 * Legacy-Mapping fuer umbenannte Skin-IDs. User die einen Skin in
 * localStorage gespeichert haben, dessen ID inzwischen umbenannt wurde,
 * werden transparent auf die neue ID gemappt.
 *
 * Reihenfolge der Renames:
 *   - 2026-05-28: legendary-partymodus -> cyberpunk-laser
 */
const LEGACY_SKIN_ID_MAP: Record<string, string> = {
  "legendary-partymodus": "cyberpunk-laser",
};

function mapLegacySkinId(id: string): string {
  return LEGACY_SKIN_ID_MAP[id] ?? id;
}

/**
 * Liest aktive Skin-ID aus localStorage, Fallback auf Default.
 * Defensive: bei Storage-Block (Private-Mode) wird Default zurueckgegeben.
 */
export function loadSkinId(): string {
  if (typeof window === "undefined") return DEFAULT_SKIN_ID;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SKIN_ID;
    // Defensive: nur den ID-String zulassen, kein JSON-Parse-Risiko.
    // Plus Legacy-Mapping fuer umbenannte Skin-IDs.
    // Plus Whitelist-Validierung gegen Registry via getSkin() (Fallback
    // auf Default wenn unbekannt).
    const mapped = mapLegacySkinId(raw.trim() || DEFAULT_SKIN_ID);
    return getSkin(mapped).id;
  } catch {
    return DEFAULT_SKIN_ID;
  }
}

/**
 * Speichert die Skin-ID + notifiziert alle Hook-Konsumenten + setzt
 * body-Attribute fuer CSS-Selektoren.
 */
export function saveSkinId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: id }));
    applySkinToBody(id);
  } catch {
    // Storage kann blockiert sein — body-class trotzdem setzen damit
    // der aktuelle Tab visuell stimmt (verfaellt beim Reload).
    applySkinToBody(id);
  }
}

/**
 * Setzt body.classList["skin-active"] + body[data-skin] passend zur Skin-ID.
 * Wird vom Hook beim Initial-Mount + nach saveSkinId() aufgerufen.
 */
function applySkinToBody(id: string): void {
  if (typeof document === "undefined") return;
  const body = document.body;
  if (!body) return;
  if (id && id !== DEFAULT_SKIN_ID) {
    body.classList.add("skin-active");
    body.setAttribute("data-skin", id);
  } else {
    body.classList.remove("skin-active");
    body.removeAttribute("data-skin");
  }
}

/**
 * Hook: liefert aktuelle Skin-ID + Setter. Synct ueber Custom-Event
 * (mehrere Hook-Konsumenten in der App bleiben konsistent) und ueber
 * native storage-Event (Multi-Tab-Konsistenz).
 */
export function useSkin(): {
  skinId: string;
  setSkinId: (id: string) => void;
  skin: ReturnType<typeof getSkin>;
} {
  const [skinId, setSkinIdState] = useState<string>(loadSkinId);

  // Initial-Apply auf Body (wichtig nach Page-Load + bei SSR-Hydration)
  useEffect(() => {
    applySkinToBody(skinId);
  }, [skinId]);

  // Custom-Event-Sync (gleicher Tab, andere Komponente schreibt)
  useEffect(() => {
    function onChange(e: Event) {
      const ce = e as CustomEvent<string>;
      setSkinIdState(ce.detail);
    }
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CHANGE_EVENT, onChange);
  }, []);

  // Storage-Event-Sync (anderer Tab schreibt)
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) return;
      const next = e.newValue?.trim() || DEFAULT_SKIN_ID;
      setSkinIdState(next);
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function setSkinId(id: string) {
    setSkinIdState(id);
    saveSkinId(id);
  }

  return { skinId, setSkinId, skin: getSkin(skinId) };
}
