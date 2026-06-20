# Plan: Verbindungs-Karten → Einstellungen + Stackmat-Timer-Modus mit Live-Display

> Quelle: Design-Panel vom **2026-06-20** (10 Agenten: Recon → 3 Architektur-
> Entwürfe → Jury/Synthese → adversarialer Angriff → Plan). Dieses Dokument ist
> die durable Zusammenfassung — das Workflow-Roh-Ergebnis lag nur in einem
> Temp-File. **Resume-Anker für die nächste Session.**

## Status (Stand 2026-06-20)

| Stage | Inhalt | Status |
|---|---|---|
| 0 | GroupHeader-Pille (Lesbarkeit Einstellungen-Überschriften) | ✅ **live** — Tag `v2.0.0-alpha.W.einstellungen-groupheader-pille` |
| 1 | Settings-Feld `timer_input_source` (Fundament) | ✅ **live** — Tag `v2.0.0-alpha.W.timer-input-source` |
| 2 | Hardware-Singleton-Stores + Hook-Adapter (Architektur-Kern) | ⏳ offen — **QA-Pflicht + G5/GAN-Live-Test** |
| 3 | Karten → Einstellungen + Hinweis-Link im Timer (F1+F5) | ⏳ offen |
| 4 | Auto-Save-Quellen entkoppeln (KRITISCH-Fix #1) | ⏳ offen — **QA-Pflicht** |
| 5 | Stackmat-Modus-Button + Auto-Engage + großes Live-Display (F3+F4) | ⏳ offen — **QA-Pflicht + G5-Live** |
| 6 | Logout-Disconnect (KRITISCH-Fix #2, Datenschutz) | ⏳ offen — **QA-Pflicht** |

**Pausiert nach Stage 1** (User-Entscheidung 2026-06-20): Stage 2 ist die große,
riskante Etappe und ihr Go-Live braucht zwingend den Test am echten **G5 + GAN**
(Verbindung muss den Tab-Wechsel überstehen — nicht automatisierbar). Fortsetzen,
wenn der User Hardware + Zeit hat.

## User-Entscheidungen (verbindlich)

1. Karten (Smart-Cube + Stackmat) ziehen aus dem Timer-Tab in die **Einstellungen**
   (neue Gruppe „Geräte" nach „Timer & Eingabe").
2. Im Timer-Tab nur ein **dezenter Hinweis-Link** „→ in Einstellungen verbinden",
   wenn Stackmat-Modus gewählt aber nicht verbunden. Kein voller Connect im Timer.
3. **Auto-Engage:** verbindet sich ein Stackmat, springt der Timer-Modus
   automatisch auf „Stackmat" — **bei jedem frischen Verbinden neu** (nicht nach
   manueller Rückwahl unterdrückt). Manuell zurückwählbar.
4. **Modus-Wechsel weg von Stackmat → Verbindung bleibt bestehen** (csTimer-artig);
   Mic bleibt an, Auto-Save ist sauber gegated (kein Phantom-Save).
5. Live-Optik: **kein Browser-Install** — Code ist die Wahrheitsquelle (alle
   Beobachtungen im Code bestätigt).

## Architektur-Entscheidung (Jury-Sieger 8.7/10)

**Zwei Modul-Singleton-Stores** `lib/stackmatStore.ts` + `lib/smartCubeStore.ts`
nach dem **`lib/toast.ts`-Vorbild** (`let snapshot` + `Set<Listener>` + notify),
gelesen via **`useSyncExternalStore` mit Feld-Selektoren** (Muster existiert real
im Repo: `ToastHost.tsx`).

Warum: löst den Tab-Wechsel-Bug **strukturell** (State lebt außerhalb des
React-Trees → kein Unmount kann die Verbindung mehr killen) und die
Render-Isolation gegen ~10 setState/s ist by-construction die schärfste (ein
Primitive-Selektor `liveMs` → nur die eine Live-Ziffer rendert neu).

- Hooks (`useStackmatTimer`/`useSmartCube`) werden dünne Selektor-Adapter,
  behalten Namen + Return-Shape (kein Import-Churn). **Unmount-Cleanup entfällt**
  (genau das war der Bug).
- Connect-UI-Karten (`StackmatConnect.tsx`/`SmartCubeConnect.tsx`) bleiben
  **unverändert** (prop-getrieben).
- **Risiko-Fallback** (aus Entwurf 1): falls der Hook-Rewrite zu heikel ist —
  `<StackmatWorker/>` mit `return null` ruft den unveränderten Hook 1× im
  MainLayout auf und spiegelt in denselben Store. Beide enden bei derselben
  Store-API.

## KRITISCHE Findings des Angriffs (müssen in den Stages umgesetzt sein)

1. **Doppel-/Phantom-Save (Stage 4):** Sobald die Verbindung persistiert, würde
   ein verbundener Stackmat *auch im Tastatur-Modus* speichern. Beide Auto-Save-
   Listener in `BigTimerInput` (stackmat-solve Z.172-203, smart-cube-solve
   Z.129-165) **strikt an `timer_input_source` gaten** (stackmat-Listener nur bei
   `==='stackmat'`; smart-cube stumm bei `==='stackmat'`).
2. **Mic/BLE nach Logout aktiv (Stage 6):** `logout()` in `AuthContext.tsx`
   (Z.217-221) feuert **kein** `cubetracker:logged-out` (nur der api.ts-Refresh-
   Interceptor Z.159 tut das). `disconnect()` **direkt in `logout()`** rufen +
   zusätzlich am `logged-out`-Listener.

Weitere SOLLTE-Fixes (in Stage 2/5 eingeplant): Snapshot-Referenzstabilität
(No-Op-Guards 1:1 in `setState` → sonst `useSyncExternalStore`-Endlos-Render);
Auto-Engage nur auf `disconnected→listening`-Flanke (nicht `connecting→listening`
nach Gerätewechsel), Flanken-Flag **im Store** (StrictMode-sicher);
`track.onended/onmute` → `status='error'` (Mic-Entzug); Display bei Disconnect
während `running` nicht still auf 0.00 springen (Overlay „Verbindung verloren");
Mobile-Hardening des großen Displays (xxxxl=15rem overflow, Hinweis-Link eigene
Zeile).

## Verifizierte Fakten (wichtig fürs Bauen)

- **React ist 19.2.5** (nicht 18 — `CLAUDE.md` Tech-Stack-Sektion ist veraltet;
  bei Gelegenheit korrigieren). `useSyncExternalStore` ist nativ.
- **`@testing-library/react` ist NICHT installiert** — nur `vitest` + `happy-dom`.
  → Tests primär **DOM-frei** (Pure-Helper + Store-Unit-Tests); DOM-Tests brauchen
  `// @vitest-environment happy-dom` als Datei-Pragma (Konvention im Repo).
- Settings sind **client-only (localStorage)**, kein Backend/Backup. Backwards-
  Compat via Spread-Merge in `loadSettings()`.
- Patch-Note-Deploy-Kopplung ist **kein Problem**: FE-Code + `changelog/data.py`
  aus einem Push redeployen beide Apps korrekt (am 2026-06-20 verifiziert).

## Offene Detail-Entscheidungen (vom Plan vorbelegt, beim Bau bestätigen)

- Trainer (`AlgTrainerPanel`) + Stackmat: mischen sich nicht (erster Wurf:
  Trainer ignoriert den Stackmat-Singleton). Bestätigen.
- Display bei Verbindungsverlust während `running`: Overlay „Verbindung verloren"
  (Variante a). Bestätigen.

## Dateien (Stage 2-6)

**NEU:** `lib/stackmatStore.ts`, `lib/smartCubeStore.ts`,
`components/StackmatBigDisplay.tsx`, `lib/stackmatStore.test.ts`,
`lib/smartCubeStore.test.ts`, `components/BigTimerInput.test.ts`,
`auth/AuthContext.test.ts`.
**EDIT:** `hooks/useStackmatTimer.ts`, `hooks/useSmartCube.ts` (→ Adapter),
`components/EinstellungenView.tsx` (Geräte-Gruppe), `App.tsx` (Wrapper-Blöcke
Z.505/509/543-572 raus, Auto-Engage in MainLayout, `onOpenSettings` durchreichen),
`components/TimerControlsCard.tsx` (4. Modus-Button), `components/BigTimerInput.tsx`
(stackmat-Zweig + gateter Auto-Save + Hinweis-Link), `auth/AuthContext.tsx`
(Logout-Disconnect), `lib/settings.ts` (fertig in Stage 1), `i18n/locales/de.json`
+ `en.json`, `lib/features-data.ts` (Bullets Stage 3 + 5), `webapp/changelog/data.py`.

**i18n-Disziplin:** kein Hook prüft Vollständigkeit (`fallbackLng=de`) — alle neuen
Keys in **beide** Locale-Dateien, vor Stage-3/5-Deploy beide Sprachen durchklicken.

**Patch-Note-Wellen:** Stage 2 `W.hardware-singleton-store` (internal),
Stage 3 `W.hardware-in-einstellungen` (public + features-Bullet),
Stage 4 `W.timer-autosave-gating` (internal), Stage 5 `W.stackmat-live-timer`
(public + features-Bullet), Stage 6 `W.logout-hardware-disconnect` (internal).
