# NEXT_SESSION — Übergabe-Kopf

_Wird per SessionStart-Hook in jede Session geladen (auch nach `/compact`). **Nur
Zustand, keine Regeln** — Regeln stehen in `CLAUDE.md`. Wird beim `/abschluss`
**ersetzt statt ergänzt** (mit Verlustprobe); der Verlauf gehört ans Ende von
`docs/session-journal.md`. Budget: Die gesamte Hook-Ausgabe muss unter 10.000
Zeichen bleiben — jede Ergänzung hier braucht eine Streichung._

**Zuletzt aktualisiert:** 2026-09-27 (Abschluss: Notizen, Hook, Maintenance, Backlog, Scramble-Net)

## 📍 Stand

- Live: `v2.0.0-alpha.W.scramble-net-type` (27.09.2026), Frontend-Bundle
  `index-BHN_4xyu.js`. Backend mit festen Versionen (`webapp/constraints.txt`).
- Server 27.09.: OS-Updates + Reboot (Kernel 6.8.0-124); Docker-Pakete per
  `apt-mark hold` gesperrt → backlog#1. MAINTENANCE-🤖-Teil 27.09. grün.
- Betrieb: Coolify 4.3.23 (Netz `coolify` am 25.09. repariert), UptimeRobot
  überwacht `/api/health` (5 min, Mail), CI startet die App vor jedem Deploy
  gegen Postgres 16, Hetzner-Server-Backups täglich (7), Hetzner-2FA aktiv.
- Details zum 25.09. (Ausfall, Hotfix, Coolify-Brüche): Journal + Lessons.

## 🔜 Offen

**Technik:** maßgeblich ist der private Backlog `fischehaus/cubetracker-backlog`
(seit 27.09.; Top 5 zeigt der Start-Hook). Hier nur Zeiger `backlog#N`.

**Jetzt:** – (nichts in Arbeit)

**Bald:** Session/Hardware fixieren statt Auto (Roadmap #49) · Roadmap #22
(Stackmat: Audio live, USB nicht) und #7 (Bluetooth teils live) umbenennen —
nur mit User im Admin-UI.

**Wartet auf dich:**
- **Off-Site-Backup backlog#3:** Anleitung steht im Issue (Kommentar 27.09.). Du:
  Backblaze-Konto (Region EU Central!) + Bucket + Key, dann Coolify S3 + Notification
  (Schritte A+B) → „backup eingerichtet" → ich prüfe, Doku, Issue schließen. Auf
  Wunsch des Users 27.09. verschoben.
- Activity-Feed (P1): Plan steht (`docs/session-journal.md`, Block „IN ARBEIT —
  Activity-Feed"). Wartet auf die Fragebogen-Ergebnisse (`.tmp/Cubetracker-
  Fragebogen-Activity-Feed.docx`, nur lokal).
- 8 Roadmap-Items existieren nur live, nicht in `webapp/seeds/roadmap.py` —
  Stand 27.09.: 7 erledigt, aktiv nur noch #49. Empfehlung: nichts in den
  Seed nachtragen (Schutz gegen DB-Verlust = Backups, backlog#3).
- Produktfrage Zen-Pille (Mattis): nur im Spacebar-Modus sichtbar; Desktop-
  Default bzw. Zen im Text-Modus ändern? (kein Bug)
- 15 OLL-Diagramme zeigen den Fall um 90/180/270° verdreht (Empfehlung: lassen;
  reproduzierbar via `.tmp/qa-oll/verify_oll.py`, Sicherung: backlog#24).
- Duplikat-Solves aus den Stackmat-Tests (Juni): Aufräumhilfe anbieten, falls
  noch vorhanden.
- MAINTENANCE 👤-Teil (Abschnitte 4/8/10): Coolify-/Hetzner-Backup-Dashboards,
  INWX-Auto-Renew, Kosten. Lokal 21 winget-Updates (Claude kann, UAC-Stopp).

## 📌 Zeiger

- Produkt-Backlog + Prioritäten: Live-Roadmap (`/roadmap`), nicht diese Datei.
- Verlauf aller Sessions: `docs/session-journal.md` (Altbestand bis 21.06.
  neueste oben; ab 25.09. neue Blöcke am Dateiende).
- Lessons: `docs/lessons-archive.md` · Sichtbarkeit: `docs/permissions-matrix.md`.
- Server-Zugang: SSH-Schlüssel dieses PCs (`root@178.105.103.78`); Coolify-Admin
  siehe backlog#2.
- Wiederaufnahme nach Kompaktierung: `.tmp/last-compact-checkpoint.md` (git-Stand).
