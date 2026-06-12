# App-Analyse 2026-06-12 (Modell-Test Fable 5)

6 parallele Analyse-Agenten über die gesamte Webapp (~12,5k LOC Backend,
~33k LOC Frontend, Live-Messungen, Doku-Abgleich). Gesamtnote **7,1/10**.

## Noten pro Kategorie

| Kategorie | Note | Kernbefund |
|---|---|---|
| i18n | 9,0 | de/en exakte Parität (1525/1525 Keys) |
| Frontend-Architektur | 8,0 | 0× any, React-Query-Disziplin; api.ts/App.tsx-Monolithen |
| UX & Features | 8,0 | features-data 1:1 belegt, PWA solide; Error-States dünn |
| Backend-Architektur | 7,5 | Multi-Tenant lückenlos; Lifespan-Migrations silent-fail |
| Sicherheit & Privacy | 7,5 | App-Layer stark; Betriebs-Layer war die Lücke (→ Welle A) |
| Performance (heute) | 7,5 | Indizes gut; Bundle ok |
| Accessibility | 6,5 | Focus-Trap top; dialog-Rollen, reduced-motion fehlen |
| Betrieb & Monitoring | 6,0 | war: 0 Monitoring, 0 Error-Tracking (→ Welle A teilw.) |
| Tests & QA | 4,0 | Kernlogik ungetestet, Deploy war ungegated (→ Welle A) |
| Skalierung (1000 User) | 3,0 | Python-Vollscan auf Write+Read-Pfad, 1 Worker |

## Kritischste Befunde

1. **Rate-Limit hinter Proxy kaputt** (Login-DoS-Hebel): `get_remote_address`
   liest XFF nicht; alle Clients teilten die Proxy-IP als Limiter-Key.
   ✅ GEFIXT in W.ops-hardening (uvicorn --proxy-headers + RFC-1918-Ranges).
2. **Push deployte ungetestet** trotz 245 grüner Tests.
   ✅ GEFIXT: CI-Test-Gate (pytest+tsc+vitest, needs: test).
3. **Solve-POST skaliert linear mit Historie**: jeder Timer-Stop lädt alle
   Solves des Cube-Types, compute_stats 2×, plus 2 Achievement-Scans.
   ❌ OFFEN (Welle B #6).
4. **Kein Monitoring/Error-Tracking/Off-Site-Backup**.
   ✅ TEILGEFIXT: Health-Check-Cron + ntfy, ErrorBoundary. ❌ OFFEN:
   Off-Site-Backup, Sentry.
5. **Kernlogik ungetestet**: csTimer-Import, Backup/Restore, Owner-Checks
   PATCH/DELETE, Backend-Ao5/Ao12, Timer-Statemachine. ❌ OFFEN (Welle B #7).

Nebenfunde: permissions-matrix.md weicht an 5 Stellen vom Code ab (u.a.
Friend-Profil liefert country/wca_id/member_since entgegen §2.1; Roadmap-CRUD
ist require_admin, Matrix sagt Tester ✓). python-jose unmaintained (CVEs,
Nutzung nicht verwundbar) → PyJWT. passlib tot in pyproject. 5 Komponenten
nutzen noch window.confirm(). `<html lang="en">` statisch trotz de-Default.
Coolify-API nur HTTP (Token im Klartext) — braucht Instanz-Domain mit TLS.

## Welle A — ✅ ERLEDIGT 2026-06-12 (W.ops-hardening)

1. CI-Test-Gate in deploy.yml (test-Job vor beiden Deploys)
2. health-check.yml: Cron */10min auf FE+/api/health, ntfy via Secret NTFY_TOPIC
3. Rate-Limit-Proxy-Fix (Dockerfile-CMD, lokal gegen uvicorn 0.46 verifiziert)
4. nginx: CSP/HSTS/nosniff/frame-ancestors/Referrer-/Permissions-Policy als
   Snippet (add_header-Vererbungsfalle!) + Cache-Control (assets immutable,
   index.html+sw.js no-cache)
5. ErrorBoundary (Root + compact um 4 Lazy-Chart-Suspenses, Chunk-Load-Erkennung)

Live-verifiziert: Header + Caching aktiv, App rendert unter CSP ohne
Violations (Chrome-Check), Health = W.ops-hardening, Bundle index-K3VKeVCj.js.

## Welle B — Substanz (je 1–3 Tage, OFFEN)

6. Solve-POST-Hot-Path: PB-Detection per SELECT MIN() statt Doppel-compute_stats
7. Tests: Ownership (PATCH/DELETE cross-user), csTimer-Import, Ao5/Ao12-calc
   (alte Desktop-Tests als Vorlage portieren)
8. Stats-Endpoints auf SQL-Aggregation (/stats/temporal lädt ALLE Solves für
   „heute+Woche" — eine WHERE-Zeile)
9. Off-Site-Backup (Backblaze/S3) + dokumentierte Restore-Probe
10. permissions-matrix nachziehen + confirm()-Rest (5 Dateien) + A11y-Bundle
    (lang-Attribut, role=dialog, prefers-reduced-motion)

## Welle C — Strategisch (OFFEN)

11. Pre-Aggregat-Tabelle user_cube_stats (Stats + Leaderboard + PB-Detection)
12. Alembic statt Lifespan-Mini-Migrations
13. Sentry Free-Tier (FE+BE)
