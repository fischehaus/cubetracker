// Card-Style-System (W.skin-glassmorphism, 2026-05-28).
//
// Zwei Achsen unabhaengig vom Skin (siehe lib/skins.ts):
//   - "solid" — Cards mit deckender bg-gray-800/900-Fuellung (Status quo,
//     wie in W.skin-cyberpunk-mvp live geht). Hintergrund-Bild scheint
//     NUR am Rand zwischen den Cards durch.
//   - "glass" — Cards mit halbtransparenter Fuellung + backdrop-blur.
//     Hintergrund-Bild scheint durch die Cards durch ("Glassmorphism").
//
// Bewusst getrennt vom Skin-Setting, damit der User mischen kann:
//   - Skin=cyberpunk-neon + solid (= MVP-Look, Cards dominant)
//   - Skin=cyberpunk-neon + glass (= Full-Cyberpunk, Bild ueberall sichtbar)
//   - Skin=none + glass (= sinnvoll wenn ein eigener Tab-Background spaeter
//     mal kommt; aktuell ohne Effekt da nichts durchscheint)
//
// localStorage-Key separat von skin (cubetracker.card-style.v1).

import { useEffect, useState } from "react";

export type CardStyle = "solid" | "glass";

export const CARD_STYLES: { id: CardStyle; labelKey: string }[] = [
  { id: "solid", labelKey: "cardStyle.solid.label" },
  { id: "glass", labelKey: "cardStyle.glass.label" },
];

export const DEFAULT_CARD_STYLE: CardStyle = "solid";

const STORAGE_KEY = "cubetracker.card-style.v1";
const CHANGE_EVENT = "cubetracker:card-style-changed";

function isValidCardStyle(v: unknown): v is CardStyle {
  return v === "solid" || v === "glass";
}

export function loadCardStyle(): CardStyle {
  if (typeof window === "undefined") return DEFAULT_CARD_STYLE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CARD_STYLE;
    const trimmed = raw.trim();
    return isValidCardStyle(trimmed) ? trimmed : DEFAULT_CARD_STYLE;
  } catch {
    return DEFAULT_CARD_STYLE;
  }
}

export function saveCardStyle(style: CardStyle): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, style);
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: style }));
    applyCardStyleToBody(style);
  } catch {
    applyCardStyleToBody(style);
  }
}

function applyCardStyleToBody(style: CardStyle): void {
  if (typeof document === "undefined") return;
  const body = document.body;
  if (!body) return;
  // Bewusst nur ein data-attribute, kein class-toggle — der CSS-Selector
  // body[data-card-style="glass"] ... ist explizit und kann nicht durch
  // andere classes (z.B. tailwind utility) gestoert werden.
  if (style === DEFAULT_CARD_STYLE) {
    body.removeAttribute("data-card-style");
  } else {
    body.setAttribute("data-card-style", style);
  }
}

export function useCardStyle(): {
  cardStyle: CardStyle;
  setCardStyle: (style: CardStyle) => void;
} {
  const [cardStyle, setCardStyleState] = useState<CardStyle>(loadCardStyle);

  // Initial-Apply (wichtig nach Page-Reload — body-Attribute muss gesetzt
  // werden BEVOR die ersten Frames gerendert werden, sonst flash-of-
  // wrong-style fuer den User der glass eingestellt hat).
  useEffect(() => {
    applyCardStyleToBody(cardStyle);
  }, [cardStyle]);

  useEffect(() => {
    function onChange(e: Event) {
      const ce = e as CustomEvent<CardStyle>;
      if (isValidCardStyle(ce.detail)) {
        setCardStyleState(ce.detail);
      }
    }
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CHANGE_EVENT, onChange);
  }, []);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) return;
      const next = e.newValue?.trim();
      if (isValidCardStyle(next)) {
        setCardStyleState(next);
      } else {
        setCardStyleState(DEFAULT_CARD_STYLE);
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function setCardStyle(style: CardStyle) {
    setCardStyleState(style);
    saveCardStyle(style);
  }

  return { cardStyle, setCardStyle };
}
