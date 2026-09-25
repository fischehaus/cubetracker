# /roadmap — Live-Roadmap abrufen + „wie weiter?"

Du wurdest vom User per `/roadmap` aufgerufen. Ziel: die **aktuelle
Live-Roadmap** (inkl. interner Items) aus der Produktion holen, mit dem
Code-Seed abgleichen, und mit dem User klären **was als Nächstes gebaut
wird**.

Halte dich knapp. Kein ausschweifender Prosa-Block — Liste + klare Frage.

---

## Schritt 1 — Live-Roadmap abrufen

Führe aus (Repo-Root):

```bash
python .claude/hooks/roadmap-fetch.py
```

(Kein `--update-snapshot` — `/roadmap` ist read-only und soll den
„neu seit Session-Start"-Marker NICHT verbrauchen. Den setzt nur der
Session-Start-Hook.)

**Auth — zwei Pfade** (aus `CLAUDE.md` hierher verlegt, W.harness-v2):

1. **Bevorzugt, langlebig (W.roadmap-export-key):** Secret aus ENV
   `ROADMAP_EXPORT_KEY` bzw. `.tmp/roadmap-export-key` (gitignored, gleicher
   Wert wie die ENV-Var in Coolify). Endpoint `GET /api/roadmap/export` mit
   Header `X-Roadmap-Key`; `--mark-done` läuft über
   `POST /api/roadmap/export/done`. Kein Ablauf. Serverseitig 404, solange die
   ENV-Var nicht gesetzt ist (safe-by-default).
2. **Fallback, kurzlebig:** Admin-`cubetracker_access_token` aus dem
   Browser-localStorage in `.tmp/admin-token` → `GET /api/roadmap` mit
   `Authorization: Bearer <token>`. Läuft stündlich ab.

**Wenn die Ausgabe meldet, dass weder Key noch Token da ist:** dem User einmal
kurz erklären, wie er den Export-Key (bevorzugt) oder den Token hinterlegt
(als Admin auf cubetracker.de einloggen → DevTools → Application → Local
Storage → `cubetracker_access_token` → in `.tmp/admin-token`) — und hier
stoppen, ohne Auth kein Abruf.

**Wenn „Token abgelaufen (HTTP 401)":** der Access-Token ist kurzlebig.
Bitte den User, einen frischen `cubetracker_access_token` aus dem
localStorage in `.tmp/admin-token` zu legen, dann erneut `/roadmap`.

---

## Schritt 2 — Befund präsentieren

Aus der Skript-Ausgabe für den User aufbereiten (knapp):

1. **Gesamt-Count + Sichtbarkeit** (Admin inkl. intern? sonst Token-
   Problem).
2. **📌 Live-only-Items** (im Admin-Panel angelegt, NICHT im Code-Seed):
   Das ist der wichtige Reconciliation-Befund. Diese Items gehen bei
   einem DB-Wipe / Cold-Start verloren, weil `bootstrap_roadmap` nur die
   Seed-Items wieder anlegt. **Biete an**, sie in
   `webapp/seeds/roadmap.py` (`ROADMAP_SEED` oder `UX_POLISH_ITEMS`)
   aufzunehmen — mit korrekter phase_id + title_de/en + note + effort +
   internal. Frag pro Item ob es in den Seed soll.
3. **🆕 Neue Items** (falls angezeigt): seit dem letzten Session-Start
   dazugekommen.

---

## Schritt 3 — „Wie soll es weitergehen?"

Schlag dem User die nächsten sinnvollen Arbeits-Items vor — orientiere
dich an der **aktiven Phase + WSJF-Reihenfolge** (sort_order, oben
zuerst), die im Reorder schon hinterlegt ist. Konkret:

- Nimm die obersten `active` (nicht `done`) Items der frühesten Phase
  (P1 vor P3 vor P4 …).
- Nenne 2–3 Kandidaten mit Phase + Effort.
- Dann End-Block „➡️ Jetzt bei dir" (`CLAUDE.md` → Antwortformat): die
  Kandidaten als nummerierte Zeilen mit Empfehlungswort, dazu eine Zeile
  „oder etwas anderes?" als `(offene Wahl)`.

Wenn der User ein Item wählt: leg ggf. eine Task-Liste an (TaskCreate),
denk den Modul-Check (`.claude/rules/discipline.md`) durch, dann Ansage +
Stopp (`CLAUDE.md` → Antwortformat).

---

## Hinweis zur Mechanik

- Reihenfolge ändern: im App-Tab **Verwaltung → Admin → Roadmap** per
  ▲/▼ (oben zuerst). Sichtbarkeit pro Item per „Öffentlich"-Toggle.
- Der Code-Seed (`webapp/seeds/roadmap.py`) ist der Cold-Start-Bootstrap;
  die Live-DB ist die laufende Wahrheit. `/roadmap` zeigt die Live-DB.
- Item erledigt → auf done setzen:
  `python .claude/hooks/roadmap-fetch.py --mark-done "<title_de>"` (matcht
  per Titel, idempotent, mehrere möglich; braucht Export-Key (bevorzugt) oder
  gültigen Admin-Token).
  Verbindlich nach Abschluss eines Roadmap-Items — nicht nur erinnern.
- Phasen-Struktur P1..P6: `webapp/frontend/src/lib/roadmap-phases.ts`.
