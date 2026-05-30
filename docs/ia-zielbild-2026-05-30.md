# IA-Zielbild & Umbau-Plan — flow-orientierte Navigation

> **Status:** beschlossen 2026-05-30 (User-Entscheidungen). Umsetzung
> schrittweise über mehrere Wellen. Dies ist die verbindliche Referenz —
> bei Wiederaufnahme (auch in frischer Session) hier weiterlesen.
>
> **Vorarbeit:** `docs/ux-audit-2026-05-30.md` (Ist-Zustand + Probleme P1–P10).

## Beschlossene Richtung

- **Tab-Umbau: „neu denken (flow-orientiert)"** — nicht nur vereinheitlichen.
- **Admin: eigener Top-Level-Bereich** (raus aus Verwaltung).
- **Konto & Daten: ins UserMenu** (radikal aufgeräumte Haupt-Nav).
- **Dashboard + Analyse → ein Tab „Statistik"**, Übersicht→Detail-Drill-down.

## Zielbild

```
HAUPT-NAVIGATION (TabBar) = der tägliche Cubing-Loop, nur 4 Tabs:

  ⏱ Timer        →   📊 Statistik       →   🏆 Training      →   🤝 Community
  solven             Übersicht (default)     Algs                Freunde
                     ↓ Drill-down            Challenges          Bestenliste
                     Detail-Charts +         Erfolge
                     SolveList (ex-Analyse)

META (NICHT in der Haupt-Nav — über UserMenu oben rechts):

  👤 Konto & Daten   — Sessions · Hardware · Backup/Import · Outliers ·
                       Einstellungen (inkl. Aussehen/Skins)
  🛡 Admin           — nur is_admin. Eigene Sub-Navigation für die 6 Panels
                       (AdminStats/FeedbackInbox/LiveTests/Roadmap/Users/Announce)
                       statt 6 gestapelt + Scrollen.
  🧪 Tester          — nur is_tester (analog, klein).
```

### Mapping alt → neu

| Heute | Zielbild |
|---|---|
| ⏱ Timer | ⏱ Timer (unverändert) |
| 📊 Dashboard | 📊 Statistik — Übersicht (Default-Ansicht) |
| 📈 Analyse | 📊 Statistik — Detail (Drill-down aus der Übersicht) |
| ⚙ Verwaltung › Sessions/Hardware/Daten/Outliers/Einstellungen | 👤 Konto & Daten (UserMenu) |
| ⚙ Verwaltung › Admin | 🛡 Admin (eigener Bereich, UserMenu-Einstieg) |
| ⚙ Verwaltung › Tester | 🧪 Tester (eigener Bereich, UserMenu-Einstieg) |
| 🏆 Trainer | 🏆 Training (unverändert, evtl. umbenannt) |
| 🤝 Community | 🤝 Community (unverändert) |

## Umbau-Plan (Wellen, schrittweise — nie alles auf einmal)

Reihenfolge bewusst: erst Inhalte umziehen, dann die Navigation
anpassen. Jede Welle einzeln deploybar + QA.

1. **W.ia-statistik-merge** — neue `StatistikTab`-Komponente: Dashboard-
   Übersicht als Default + Umschalter/Drill-down zu den Analyse-Detail-
   Charts + SolveList. Dashboard- + Analyse-Tab-Inhalte zusammenführen.
   Reduziert 6→5 sichtbare Tabs. *Größte Einzel-Welle.*
2. **W.ia-konto-usermenu** — Verwaltung-Inhalte (Sessions, Hardware,
   Daten, Outliers, Einstellungen) aus dem Tab-System lösen und über
   das UserMenu erreichbar machen (eigene „Konto & Daten"-Ansicht).
3. **W.ia-admin-bereich** — Admin (+ Tester) als eigenen Bereich mit
   eigener Sub-Navigation, UserMenu-Einstieg, nur rollensichtbar.
   Behebt P4.
4. **W.ia-tabbar-flow** — TabBar final auf die 4 Flow-Tabs reduzieren.
   Tab-IDs/Hash-Routing/localStorage-Migration für Bestands-User
   (alte gespeicherte Tab-Wahl `verwaltung`/`analyse` → sinnvoll
   umleiten).
5. **W.ia-subtab-routing** — Sub-Tabs (Training-, Community-, Konto-,
   Admin-Sub-Tabs) in den URL-Hash aufnehmen (`#training/algs`),
   bookmarkbar + back-fähig. Behebt P5.
6. **W.ia-nav-entdopplung** — Footer/UserMenu-Redundanz auflösen
   (P6): eine kanonische Stelle pro Aktion. LanguageSwitcher
   vereinheitlichen.

## Risiken / Sorgfalt

- **localStorage-Tab-Migration:** Bestands-User haben evtl.
  `cubetracker.tab = "verwaltung"` / `"analyse"` / `"dashboard"`
  gespeichert. Beim Wegfall dieser Tab-IDs sauber umleiten (z.B.
  analyse/dashboard → statistik, verwaltung → timer + UserMenu-Hinweis),
  sonst landet der User auf einem toten Tab.
- **Custom-Event-Sprünge:** `cubetracker:goto-verwaltung-section` &
  Co. (App.tsx) zeigen auf die alte Struktur — bei jedem Umzug
  mitführen.
- **Deep-Links extern:** `/impressum` etc. (pathname-Routing) sind
  unabhängig, bleiben.
- **Parallel zu Workstream 1** (Design-System-Migration der Cards):
  die IA-Wellen verschieben Komponenten, ändern sie aber inhaltlich
  nicht — Reihenfolge zu Workstream 1 ist unkritisch, aber nicht
  dieselbe Datei gleichzeitig anfassen.

## Workstream 1 (Design-System) — Querverweis

Läuft parallel, unabhängig. Fortschritt:
- ✅ Foundation: `src/components/ui/` (Card, CardTitle/SectionLabel/
  SubTitle, Button, EmptyState) + `lib/cn.ts`.
- ✅ StatsCard (Proof).
- ✅ 9 Dashboard-Cards (W.design-system-dashboard).
- ⬜ Restliche Tabs tab-weise (Timer, Analyse-Charts, Verwaltung/Admin-
  Panels, Trainer, Community). + Heading-2.-Runde (h3-Titel-
  Vereinheitlichung) + Button-Migration der Spezialfälle + FilterBar-
  Konsolidierung (P10).
```
