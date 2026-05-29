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

Das Skript liest `.tmp/admin-token` (gitignored) und ruft
`GET /api/roadmap` mit `Authorization: Bearer <token>` auf.

**Wenn die Ausgabe „keine .tmp/admin-token-Datei" zeigt:** sag dem User
einmal kurz wie er den Token hinterlegt (als Admin auf cubetracker.de
einloggen → DevTools → Application → Local Storage →
`cubetracker_access_token` kopieren → in `.tmp/admin-token` ablegen) und
stoppe hier — ohne Token kein Abruf.

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
- Frag dann offen: **„Welches Item nehmen wir als Nächstes — oder hast du
  was anderes im Kopf?"**

Wenn der User ein Item wählt: leg ggf. eine Task-Liste an (TaskCreate),
denk den Modul-Check (`.claude/rules/discipline.md`) durch, und los.

---

## Hinweis zur Mechanik

- Reihenfolge ändern: im App-Tab **Verwaltung → Admin → Roadmap** per
  ▲/▼ (oben zuerst). Sichtbarkeit pro Item per „Öffentlich"-Toggle.
- Der Code-Seed (`webapp/seeds/roadmap.py`) ist der Cold-Start-Bootstrap;
  die Live-DB ist die laufende Wahrheit. `/roadmap` zeigt die Live-DB.
- Phasen-Struktur P1..P6: `webapp/frontend/src/lib/roadmap-phases.ts`.
