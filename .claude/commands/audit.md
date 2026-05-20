---
description: Doku-vs-Setup-Audit fuer eine Claude-Code-Doku-Sektion. Vergleicht die offizielle Doku mit unserem .claude/-Setup und liefert einen 5-Felder-Report (Doku-Kern / Status-Quo / Gap / konkrete Vorschlaege / Effort+Risiko). Macht den Audit reproduzierbar (quartalsweise).
argument-hint: <sektion> (z.B. hooks | subagents | settings | memory | slash-commands | skills | mcp | output-styles | status-line | background-tasks | plugins | context-management)
allowed-tools: Read, Glob, Grep, WebFetch, WebSearch
---

# /audit — Doku-vs-Setup-Audit fuer Cubetracker

Auditiere die Claude-Code-Doku-Sektion(en): **$ARGUMENTS**

Falls kein Argument: frag, welche Sektion auditiert werden soll, und biete die
Liste aus dem `argument-hint` an. Schon auditiert (Welle 1+2, siehe
`docs/audit-2026-05-20.md`): hooks, subagents, settings, memory, slash-commands,
skills, background-tasks, context-management. Offen u.a.: mcp, output-styles,
status-line, plugins.

## Ablauf

1. **Doku lesen.** Finde + lies die kanonische Seite zur Sektion auf
   https://code.claude.com/docs (per WebFetch; bei Unsicherheit erst die
   Index-Seite / WebSearch nutzen). Keine Drittquellen.

2. **Unser Setup lesen** (Read/Glob/Grep) — relevant je nach Sektion:
   - `D:\Projekte\cubetracker\.claude\settings.json` (Hooks + Permissions + Env)
   - `D:\Projekte\cubetracker\.claude\hooks\` (alle Hook-Scripts)
   - `D:\Projekte\cubetracker\.claude\agents\` (qa-reviewer, patch-notes-writer)
   - `D:\Projekte\cubetracker\.claude\commands\` (abschluss, audit)
   - `D:\Projekte\cubetracker\.claude\rules\discipline.md`
   - `D:\Projekte\cubetracker\CLAUDE.md`, `NEXT_SESSION.md`
   - `C:\Users\Nutzer\.claude\settings.json` (User-Level)

3. **Report schreiben** — strukturiertes Markdown mit GENAU diesen 5 Feldern
   (Tonalitaet + Format an `docs/audit-2026-05-20.md` orientieren):
   1. **Was sagt die Doku?** (3-5 Saetze Kern + Best-Practices)
   2. **Was machen wir aktuell?** (Status-Quo mit konkreten File-Pfaden)
   3. **Gap-Analyse** (wo weichen wir ab / nutzen ein Feature nicht / suboptimal)
   4. **Konkrete Vorschlaege** (als Diff-Vorschau / konkrete Datei-Aenderung,
      NICHT generisch; je Vorschlag eine ID, z.B. `MCP1`, `MCP2`)
   5. **Effort + Risiko + Schwelle** je Vorschlag — Effort (Min/Std/Tage),
      Risiko (0/niedrig/mittel/hoch), Schwelle (✅ Autopilot wenn <15min+Risiko0 /
      🤔 Praesentation / 🛑 Strategie). Schliesse mit Vorschlags-Tabelle.

4. **Persistieren.** Haenge den Report unten an `docs/audit-2026-05-20.md` an
   (neue `## Welle N`-Sektion oder `### Sektion: <name>`), damit spaetere
   Sessions die Baseline lesen koennen. Frag NICHT, ob du persistieren sollst —
   tu es, das ist der Zweck.

## Schwelle fuer Umsetzung (nach dem Report)

- ✅ **Autopilot** (Effort <15min + Risiko 0): direkt umsetzen + im Sammel-Commit
  melden. ABER: Aenderungen an `settings.json` / `.claude/agents/` /
  `.claude/commands/` sind Self-Modification → brauchen explizite User-Freigabe
  im Chat-Text (der Auto-Mode-Classifier blockt sonst, siehe Lesson im Audit-Doc).
- 🤔 **Praesentation** (>15min ODER workflow-relevant): dem User vorlegen.
- 🛑 **Strategie** (Architektur-Implikation): User entscheidet.

## Stil

Konkret statt generisch. Ehrlich: wenn wir in einem Bereich schon gut sind oder
ein Feature fuer unser Solo-CLI-Setup keinen Mehrwert hat, sag das klar (kein
erfundener Verbesserungsbedarf). Pro Sektion max ~1200 Woerter.
