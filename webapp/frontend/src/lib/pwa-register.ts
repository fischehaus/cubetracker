/**
 * Service-Worker-Registration + Update-Flow (W.pwa-offline, 2026-05-30).
 *
 * Registriert /sw.js (nur in PROD — siehe unten), erkennt neue SW-Versionen
 * und zeigt einen Toast „neue Version – neu laden". Klickt der User, wird
 * der wartende SW aktiviert und die Seite genau einmal neu geladen.
 *
 * Warum nur PROD:
 *  - Das Projekt verbietet lokale Dev-Server (App ist live). In DEV gäbe es
 *    ohnehin keinen gebauten SW + HMR würde mit SW-Caching kollidieren.
 *  - Ein SW auf localhost würde Assets cachen und HMR-Updates verschlucken.
 */

import i18n from "../i18n";
import { toast } from "./toast";

const UPDATE_TOAST_DEDUP = "pwa-update";

export function registerPwa(): void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return; // Browser ohne SW-Support — App läuft normal als reine SPA.
  }
  if (!import.meta.env.PROD) {
    return; // Nur Produktion (siehe Doku oben).
  }

  // controllerchange feuert, wenn ein neuer SW die Kontrolle übernimmt
  // (nach SKIP_WAITING). Der Guard verhindert einen doppelten Reload,
  // falls das Event innerhalb derselben Tab-Lifetime mehrfach feuert
  // (z.B. User klickt den Update-Toast zweimal schnell). Nach dem echten
  // reload() ist das Modul neu geladen → hasReloaded wieder false, aber
  // dann kommt auch kein weiteres controllerchange mehr (SW ist aktiv).
  let hasReloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (hasReloaded) return;
    hasReloaded = true;
    window.location.reload();
  });

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        // Falls beim Laden schon ein SW wartet (Tab war vorher offen, neuer
        // Deploy kam, User öffnet erneut): direkt Update anbieten.
        if (registration.waiting && navigator.serviceWorker.controller) {
          promptUpdate(registration);
        }

        // Neuer SW wird installiert → wenn fertig UND es gibt bereits einen
        // aktiven Controller, ist das ein echtes UPDATE (nicht der Erst-
        // Install). Dann Toast zeigen.
        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            // Echtes Update nur, wenn der neue SW "installed" ist UND es
            // schon einen aktiven Controller gibt UND eine aktive
            // Registration existiert. registration.active schließt den
            // seltenen Erst-Install-Race aus (controller noch nicht
            // gesetzt → sonst „neue Version" beim allerersten Besuch).
            if (
              installing.state === "installed" &&
              navigator.serviceWorker.controller &&
              registration.active
            ) {
              promptUpdate(registration);
            }
          });
        });
      })
      .catch(() => {
        // Registration fehlgeschlagen (z.B. unsicherer Context) — App
        // funktioniert ohne SW ganz normal weiter. Bewusst still.
      });

    // Wenn die App in den Vordergrund kommt, auf neue SW-Version prüfen.
    // So bekommt ein lange offener Tab Updates mit, ohne Hard-Reload.
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible") return;
      navigator.serviceWorker.ready
        .then((reg) => reg.update())
        .catch(() => {
          /* update() kann offline werfen — egal, nächster Versuch */
        });
    });
  });
}

/** Zeigt den „neue Version"-Toast. Klick aktiviert den wartenden SW. */
function promptUpdate(registration: ServiceWorkerRegistration): void {
  toast.info(i18n.t("pwa.updateAvailable"), {
    title: i18n.t("pwa.updateTitle"),
    icon: "🔄",
    autoDismissMs: 0, // bleibt offen, bis der User entscheidet
    position: "TR",
    dedupKey: UPDATE_TOAST_DEDUP, // verhindert Toast-Stapel bei mehreren Events
    onClick: () => {
      // Wartenden SW zum Aktivieren auffordern. Der controllerchange-
      // Listener oben löst dann den einmaligen Reload aus.
      registration.waiting?.postMessage({ type: "SKIP_WAITING" });
    },
  });
}
