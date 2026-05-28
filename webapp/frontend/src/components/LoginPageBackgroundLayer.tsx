// LoginPageBackgroundLayer (W.login-redesign-and-demo, 2026-05-28).
//
// Skin-Slideshow speziell fuer die LoginPage -- wechselt automatisch
// alle 6 Sekunden durch die 3 verfuegbaren Skins (Cyberpunk Neon ->
// Cyberpunk Laser -> Party Fun -> repeat). UNABHAENGIG vom User-
// Setting (localStorage), damit auch User die "Kein Hintergrund"
// eingestellt haben den Skin-Showcase auf der LoginPage sehen.
//
// Pro Wechsel ein Fade-Cross-Fade-Effekt via opacity-Transition.
// Resize-aware: pickt pro Viewport die beste Resolution.
//
// Setzt sich von der globalen BackgroundLayer ab indem es nicht den
// User-Skin verwendet, sondern eine eigene Showcase-Liste. Render-
// Container (`.cubetracker-bg-showcase`) uebernimmt das CSS-Layout.

import { useEffect, useState } from "react";
import { resolveSkinImage, SKIN_REGISTRY, type Skin } from "../lib/skins";

const SHOWCASE_INTERVAL_MS = 6000;
const FADE_DURATION_MS = 1200;

function getViewport(): { width: number; height: number } {
  if (typeof window === "undefined") return { width: 1920, height: 1080 };
  return { width: window.innerWidth, height: window.innerHeight };
}

// Nur Skins mit Resolutions (= alle ausser "none") -- in Registry-Reihenfolge.
const SHOWCASE_SKINS: Skin[] = SKIN_REGISTRY.filter(
  (s) => s.resolutions.length > 0,
);

export function LoginPageBackgroundLayer() {
  const [index, setIndex] = useState(0);
  const [viewport, setViewport] = useState(getViewport);

  // Cycle durch Showcase-Skins
  useEffect(() => {
    if (SHOWCASE_SKINS.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % SHOWCASE_SKINS.length);
    }, SHOWCASE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  // Resize-Tracking (rAF-throttle analog zu BackgroundLayer)
  useEffect(() => {
    let rafId: number | null = null;
    function onResize() {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        setViewport(getViewport());
        rafId = null;
      });
    }
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, []);

  if (SHOWCASE_SKINS.length === 0) return null;

  // Rendere ALLE Skins als gestapelte Divs, nur das aktive hat opacity=1.
  // Damit ist der Fade ein simples opacity-Crossfade (CSS-transition),
  // ohne dass das Bild im DOM erst geladen werden muss beim Wechsel.
  return (
    <>
      {SHOWCASE_SKINS.map((skin, i) => {
        const url = resolveSkinImage(skin, viewport.width, viewport.height);
        if (!url) return null;
        const isActive = i === index;
        return (
          <div
            key={skin.id}
            aria-hidden="true"
            data-cubetracker-login-bg={skin.id}
            className="cubetracker-login-bg-layer"
            style={{
              backgroundImage: `url("${url}")`,
              backgroundPosition: skin.position ?? "center bottom",
              opacity: isActive ? 1 : 0,
              transition: `opacity ${FADE_DURATION_MS}ms ease-in-out`,
            }}
          />
        );
      })}
    </>
  );
}
