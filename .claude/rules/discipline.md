---
description: Cubetracker-Code-Disziplin. Path-scoped Rules — wird automatisch geladen wenn Claude an Python- oder TypeScript-Files arbeitet. Spart Context im Hauptchat wenn nur Docs / Configs angefasst werden.
paths:
  - "**/*.py"
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.test.ts"
  - "**/*.test.tsx"
---

# Code-Disziplin (verbindlich)

1. **Edit statt Write.** Bei Änderungen an bestehenden Files immer
   `Edit`-Tool mit präzisem Anker. NIEMALS `Write` über eine bestehende
   Datei (außer bewusster Komplett-Rewrite).

2. **Type-Hints durchgehend.** Python: alle Funktions-Signaturen
   typisiert. TypeScript: kein `any`, strict-mode aktiv.

3. **Tests vor Merge.** Jedes Feature braucht mindestens Unit-Tests
   für die Kernlogik. Pre-commit muss grün sein.

4. **DB-Migrations sauber.** Jede Schema-Änderung als Alembic-Revision
   (Backend) oder als ALTER-Statement in `webapp/main.py:lifespan`
   (Webapp). Keine direkten DB-Mutationen ohne Migration-Pfad.

5. **Bei Tooling-Ausfall, Quellen-Widerspruch oder Architektur-
   Schnitt-Frage:** nicht eigenmächtig pivotieren, sondern fragen.

6. **Modul-Check vor Bau.** Bei jedem neuen Modul / jeder neuen
   Funktion / jeder Anpassung VOR dem Code drei Dimensionen explizit
   durchdenken — nicht überspringen, auch wenn das Modul "klein" wirkt:

   a) **Layout-Impact:** Wo erscheint das Modul? Braucht es einen neuen
      Reiter? Passt es in eine bestehende Sektion? Ändert sich die
      Tab-Anzahl oder Sub-Tab-Struktur?

   b) **Datensicherung + Export:** Ändert sich das DB-Schema (neue
      Tabelle, neue Spalte)? Müssen Backup-Routinen angepasst werden?
      Wenn JSON-Export existiert: muss das neue Modul mit-exportiert
      werden? Idempotent bei Re-Import?

   c) **Cross-Modul-Auswirkung:** Triggert das neue Modul Änderungen
      in anderen Modulen (z.B. Solve-Save löst Achievement-Check aus)?
      Reagieren bestehende Endpoints / Komponenten anders? Brauchen
      Mutation-Hooks zusätzliche Cache-Invalidierung?

   Ergebnis dieser Überlegung wird in der Antwort an den User sichtbar
   dokumentiert (z.B. „Layout: neuer Tab", „Backup: neue Tabelle muss
   in /export aufgenommen werden", etc.) — und bei strittigen Punkten
   wird gefragt, nicht eigenmächtig entschieden.

## QA nach jeder wesentlichen Änderung (verbindlich seit 2026-05-11)

Nach JEDER wesentlichen Änderung einen QA-Sub-Agent-Review starten —
nicht erst am Ende einer Phase.

**Was ist "wesentlich"** (Trigger für QA-Pass):
- Neue API-Endpoints (POST/PATCH/DELETE die DB schreiben)
- Schema-Änderung (neue Tabelle, neue Spalte, neue FK)
- Auth- oder Permission-relevanter Code (Login, Token, current_user-
  Dep, Cross-User-Filter)
- File-Upload oder External-Service-Integration (Email, Storage,
  Payment, ...)
- Bulk-Operations (Import, Backup-Restore, Achievement-Recheck)
- Komplette Sub-Phase abgeschlossen (z.B. W.4, W.5, W.8)

**Was ist NICHT wesentlich** (kein QA-Pass nötig):
- UI-/Styling-Polish
- Doku-/README-Updates
- Tippfehler- / Kleinst-Fixes
- ENV-Var-Änderungen ohne Code

**QA-Workflow:**
1. Code committed (oder push-bereit)
2. Sub-Agent `qa-reviewer` aufrufen (siehe `.claude/agents/qa-reviewer.md`)
3. KRITISCH-Findings sofort fixen vor Live-Deploy
4. SOLLTE-Findings dokumentieren + priorisieren (oft vor v2.x)
5. NICE-Findings nur falls billig

## Sub-Agent-Nutzung

Bei spezialisierten Aufgaben **bevorzuge Sub-Agents** statt Hauptchat-Inflation:

- **QA-Review** nach wesentlicher Änderung → `.claude/agents/qa-reviewer.md`
- **Architektur-Plan** für nicht-triviale Features → `Plan`-Subagent
- **Codebase-Suche** nach unbekanntem Symbol → `Explore`-Subagent
- **Claude-Code-Doku-Fragen** → `claude-code-guide`-Subagent
- **Allgemeine Recherche** (kein dedizierter Agent verfügbar) → `general-purpose`

Bei kleinen Edits, kurzen Frage-Antwort-Loops oder wenn der Kontext minimal
ist: direkt im Hauptchat, ohne Sub-Agent.
