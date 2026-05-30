/*
 * Cubetracker Service-Worker (W.pwa-offline, 2026-05-30).
 *
 * Hand-gerollt (NICHT vite-plugin-pwa): Vite 8 ist Rolldown-basiert und
 * hatte hier schon UMD-Parse-Probleme — das Workbox-Build-Plugin wäre ein
 * Dependency-Risiko. Ein hand-gerollter SW gibt zudem volle Kontrolle über
 * die Caching-Strategie (kritisch: /api/* darf NIEMALS gecacht werden) und
 * ist für QA transparent lesbar. public/sw.js wird von Vite 1:1 nach
 * /sw.js durchgereicht (Scope "/").
 *
 * ============================ STRATEGIE ============================
 *
 *  /api/*           → NETWORK-ONLY. Nie cachen. Sonst sähe der User alte
 *                     Solves/Stats/Achievements. Daten müssen immer frisch
 *                     vom Backend kommen.
 *  Navigation (HTML)→ NETWORK-FIRST. Online = immer die neueste App-Shell;
 *                     offline = letzte gecachte index.html (App-Gerüst lädt,
 *                     API-Calls schlagen dann fehl → leere/Lade-States).
 *  Static Assets    → STALE-WHILE-REVALIDATE. Sofort aus Cache (instant),
 *  (same-origin)      im Hintergrund aktualisiert. Assets sind content-
 *                     gehasht (index-<hash>.js) → sicher zu cachen.
 *  Cross-origin     → PASSTHROUGH. Nicht anfassen (Fonts/CDN/WCA-API etc.).
 *
 * ========================== UPDATE-FLOW ===========================
 *
 *  Wir rufen NICHT automatisch skipWaiting() im install — sonst würde ein
 *  neuer SW sofort übernehmen und mitten in einer Session die Assets unter
 *  dem laufenden Code wegtauschen (Update-Loop / Inkonsistenz-Risiko).
 *  Stattdessen: neuer SW geht in "waiting", der Client (pwa-register.ts)
 *  erkennt das und zeigt einen Toast „neue Version – neu laden". Erst wenn
 *  der User klickt, schickt der Client SKIP_WAITING → wir aktivieren →
 *  controllerchange im Client → genau ein reload.
 */

// Version manuell bumpen, wenn sich die SW-LOGIK (diese Datei) ändert.
// Reine App-Asset-Updates brauchen das NICHT — die kommen via network-first
// (Navigation) bzw. stale-while-revalidate (Assets) transparent beim Reload.
const SW_VERSION = "2026-05-30-1";
const CACHE = `cubetracker-${SW_VERSION}`;
const APP_SHELL = "/";

// --- install: App-Shell vorcachen, aber NICHT sofort aktiv werden ---
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(APP_SHELL))
      .catch(() => {
        // Shell-Precache fehlgeschlagen (offline beim allerersten Install) —
        // kein Drama, runtime-Caching füllt den Cache beim nächsten Online-Hit.
      }),
  );
  // KEIN self.skipWaiting() hier — siehe UPDATE-FLOW oben.
});

// --- activate: alte Cache-Versionen löschen + Kontrolle übernehmen ---
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("cubetracker-") && k !== CACHE)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

// --- message: Client bittet um sofortige Aktivierung (User klickte Toast) ---
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// --- fetch: Routing nach Strategie ---
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Nur GET ist cachebar. POST/PATCH/DELETE (Mutations) durchreichen.
  if (req.method !== "GET") return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return; // unparsebare URL — Browser-Default
  }

  // Cross-origin (Fonts, WCA-API, externe Bilder) → nicht anfassen.
  if (url.origin !== self.location.origin) return;

  // API → network-only. NIEMALS cachen.
  if (url.pathname.startsWith("/api/")) return;

  // Den Service-Worker selbst nie cachen (sonst Update-Erkennung kaputt).
  if (url.pathname === "/sw.js") return;

  // Navigation (HTML-Dokument) → network-first.
  if (req.mode === "navigate") {
    event.respondWith(networkFirst(req));
    return;
  }

  // Übrige same-origin GETs (JS/CSS/Bilder/Fonts/manifest) → SWR.
  event.respondWith(staleWhileRevalidate(req));
});

/**
 * Network-first: frisch holen, bei Erfolg App-Shell-Cache aktualisieren.
 * Offline → gecachte Shell (konkrete URL, sonst APP_SHELL als SPA-Fallback).
 */
async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const fresh = await fetch(req);
    // Erfolgreiche Navigation cachen (für späteres Offline). Wir cachen
    // sowohl die konkrete URL als auch APP_SHELL, weil der Static-Host
    // für jeden Pfad dieselbe index.html liefert (SPA-Fallback-Routing).
    // fresh.ok = nur 2xx cachen (kein 4xx/5xx im Cache). fresh selbst
    // bleibt ungelesen → wird unten zurückgegeben; jedes put() bekommt
    // einen eigenen clone(), ein Response-Body wird nie doppelt gelesen.
    if (fresh && fresh.ok) {
      await Promise.all([
        cache.put(req, fresh.clone()),
        cache.put(APP_SHELL, fresh.clone()),
      ]).catch(() => {
        // Cache-Write fehlgeschlagen (z.B. Quota voll) — egal, der
        // fresh-Response geht trotzdem an die Seite.
      });
    }
    return fresh;
  } catch {
    const cached = (await cache.match(req)) || (await cache.match(APP_SHELL));
    return (
      cached ||
      new Response("Offline — keine gecachte Version verfügbar.", {
        status: 503,
        statusText: "Offline",
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    );
  }
}

/**
 * Stale-while-revalidate: sofort aus Cache (falls da), parallel frische
 * Version holen und Cache aktualisieren. Erster Besuch (kein Cache) wartet
 * aufs Netzwerk.
 */
async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req);
  // QA-Fix W.pwa-offline-qa: Wenn offline UND nichts im Cache, darf NIE
  // undefined zurückgegeben werden — event.respondWith(undefined) wäre
  // ein Spec-Verstoß und würde den Fetch-Handler crashen. Daher 503-
  // Fallback in beiden Ästen.
  const offlineFallback = () =>
    new Response("Offline — Ressource nicht im Cache.", {
      status: 503,
      statusText: "Offline",
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  const network = fetch(req)
    .then((res) => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => cached || offlineFallback());
  return cached || network;
}
