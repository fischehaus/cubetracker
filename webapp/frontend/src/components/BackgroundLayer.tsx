// BackgroundLayer (W.skin-cyberpunk-mvp).
//
// Rendert den aktiven Skin als fixed-positioniertes Hintergrund-Div
// hinter dem App-Content. ARIA-hidden (rein dekorativ).
//
// Logik:
//   - useSkin() liefert die aktive Skin (mit allen Resolutions)
//   - resolveSkinImage() picked die beste Variante fuer den Viewport
//   - Resize-Event triggert Neu-Resolve (z.B. wenn User Fenster
//     auf den Superwide-Monitor zieht)
//   - Skin "none" -> Komponente rendert null, kein Layer aktiv
//
// Performance:
//   - background-image als inline-style — Browser nutzt http-cache,
//     mehrfache Renders mit gleicher URL laden NICHT neu
//   - resize ist throttled (rAF), kein State-Update-Storm
//   - Bei Skin-Wechsel: alte URL bleibt im Cache, naechster Wechsel
//     ist instant

import { useEffect, useState } from "react";
import { resolveSkinImage } from "../lib/skins";
import { useSkin } from "../lib/use-skin";

function getViewport(): { width: number; height: number } {
  if (typeof window === "undefined") return { width: 1920, height: 1080 };
  return { width: window.innerWidth, height: window.innerHeight };
}

export function BackgroundLayer() {
  const { skin } = useSkin();
  const [viewport, setViewport] = useState(getViewport);

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

  const url = resolveSkinImage(skin, viewport.width, viewport.height);
  if (!url) return null;

  return (
    <div
      aria-hidden="true"
      data-cubetracker-background={skin.id}
      className="cubetracker-background-layer"
      style={{
        backgroundImage: `url("${url}")`,
      }}
    />
  );
}
