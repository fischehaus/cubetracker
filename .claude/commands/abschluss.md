---
description: Session-Ende-Check fuer Cubetracker — geht eine 10-Punkte-Checkliste durch und meldet Luecken (Git, Patch-Notes, Tags, Features-Liste, Doku, Todos, Backend-Smoke, Live-Deploy-Verifikation, MAINTENANCE-Faelligkeit).
allowed-tools: Bash, Read, Grep, Glob, TodoWrite
---

# /abschluss — Cubetracker Session-Ende-Check

Du wurdest vom User per `/abschluss` aufgerufen. **Geh die folgende 10-Punkte-Checkliste systematisch durch, jeden Punkt explizit reporten (✓ oder ⚠), am Ende eine Zusammenfassung.** Wenn etwas fehlt: konkret nachfragen ob du es jetzt fixt.

Halte dich knapp — keine ausschweifenden Erklärungen, nur Checks + Befunde.

---

## Reihenfolge

Führe diese Schritte aus dem Cubetracker-Repo (`D:\Projekte\cubetracker\`) aus:

### 1. Git: uncommitted Änderungen?

```bash
git status --porcelain | head -20
```

- **Wenn leer:** ✓ Working-Tree clean.
- **Wenn nicht leer:** ⚠ Auflisten + fragen: „Sollen wir das committen?"

### 2. Git: ungepushte Commits?

```bash
git log --oneline @{u}..HEAD 2>/dev/null
```

- **Wenn leer:** ✓ Alles gepusht.
- **Wenn nicht leer:** ⚠ Auflisten + Push anbieten.

### 3. Patch-Notes-Eintrag pro signifikantem Commit seit letztem Tag?

```bash
# letztes Tag finden
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null)
echo "Letztes Tag: $LAST_TAG"
# alle feat()-/fix()-Commits seit dem Tag
git log "$LAST_TAG..HEAD" --oneline --grep="^feat\|^fix"
```

Pro Commit den Patch-Notes-Eintrag prüfen (extract `W.<name>` aus der Commit-Message, dann in `webapp/changelog/data.py` nach diesem Versions-String suchen):

```bash
grep -F "version=\"2.0.0-alpha.<name>\"" webapp/changelog/data.py
```

- **Alle haben Eintrag:** ✓.
- **Mindestens einer fehlt:** ⚠ Auflisten welche, fragen ob du sie ergänzt.

### 4. Git-Tags für jeden Patch-Notes-Eintrag seit letztem Tag?

```bash
# alle Patch-Notes-Versions im File
grep -oE 'version="[^"]+"' webapp/changelog/data.py | head -10
# fuer jede: existiert ein Git-Tag mit Praefix "v"?
git tag -l "v2.0.0-alpha.W.*" | sort
```

- **Alle Patch-Notes-Strings als Tags vorhanden + gepusht:** ✓.
- **Mindestens einer fehlt:** ⚠ Liste + Tag-Befehle generieren, fragen ob du das nachholst.

Prüfung „gepusht?":

```bash
git ls-remote --tags origin "refs/tags/v*" 2>&1 | grep -v '\^{}' | awk -F/ '{print $NF}' | sort
```

### 5. `features-data.ts` aktualisiert wenn neue User-facing Features?

Heuristik: wenn ein `feat(W.<name>)`-Commit seit letztem Tag KEIN `qa`, `fix`, `hardening`, `deploy-fix`, `welle*-qa`, `hotfix` im Namen hat → vermutlich User-facing-Feature.

```bash
git log "$LAST_TAG..HEAD" --name-only --pretty=format:"COMMIT:%h %s" \
  | grep -E "^(COMMIT:|webapp/frontend/src/lib/features-data\.ts)"
```

- **Für jeden User-facing-feat()-Commit wurde auch `features-data.ts` mit-geändert:** ✓.
- **Mindestens eine User-facing-Welle ohne `features-data.ts`-Update:** ⚠ Auflisten, fragen ob du Bullets ergänzt.

### 6. STATUS.md / NEXT_SESSION.md veraltet?

```bash
# letzte Modifikation der Doku
git log -1 --format="%h %ai %s" -- ROADMAP.md NEXT_SESSION.md 2>&1
git log -1 --format="%h %ai %s" -- D:/Claude-Projekte/STATUS.md 2>&1 || true
# letzter Commit insgesamt
git log -1 --format="%h %ai %s"
```

- **Doku-Modifikation neuer als letzter signifikanter Commit:** ✓.
- **Doku veraltet (Lücke > 3 Commits):** ⚠ Erinnern dass STATUS.md / NEXT_SESSION.md ein Update vertragen würde, aber nicht zwingend fixen.

### 7. Offene Todos in der aktuellen Session?

Nutze das `TodoWrite`-Tool oder lies aus dem aktuellen Kontext den Stand der Todo-Liste:

- **Alle Items `completed`:** ✓.
- **Items `in_progress` oder `pending`:** ⚠ Auflisten + fragen pro Item: ist das wirklich offen, oder kann es als „spätere Session" markiert werden?

### 8. Backend-Smoke-Test (lokal)

Damit Deploy-Fails (z.B. Syntax-/Quote-Bugs) BEVOR dem Push gefangen werden — der Coolify-Build bricht sonst ab.

```bash
(cd webapp && python -c "import ast; ast.parse(open('changelog/data.py', encoding='utf-8').read()); print('Parse OK')")
```

Wenn ein venv mit allen Deps existiert (`webapp/.venv/Scripts/python.exe`):

```bash
(cd webapp && .venv/Scripts/python.exe -c "
import sys, os
sys.path.insert(0, '.')
os.environ.setdefault('JWT_SECRET', 'test'*16)
os.environ.setdefault('DATABASE_URL', 'sqlite:///./test-abschluss.db')
import main
from db.database import Base, engine
import db.models
Base.metadata.create_all(engine)
print('Backend startet sauber')
" 2>&1 | tail -5; rm -f test-abschluss.db 2>/dev/null)
```

- **Beides grün:** ✓.
- **Parse-Error / Import-Error:** ⚠ HARD STOP — das wäre im Coolify-Build gescheitert. Fix bevor du die Session beendest.

### 9. Live-Deploy-Verifikation (ist der Push wirklich live?)

Seit der Hetzner-Migration ist der Auto-Deploy NICHT garantiert (Monorepo-Dedup —
Coolify deployt pro Push nur eine App; siehe Task #37 / NEXT_SESSION). Darum am
Session-Ende prüfen, dass die Live-App läuft UND gepushte Frontend-Änderungen
wirklich draußen sind. Live-Host = **www.cubetracker.de** (Hetzner).

```bash
# App erreichbar? (erwartet: 200 bzw. {"status":"ok",...})
curl -s -o /dev/null -w "Frontend www: %{http_code}\n" https://www.cubetracker.de/
curl -s -w "\nHealth: %{http_code}\n" https://www.cubetracker.de/api/health

# Wurden in dieser Session Frontend-Files gepusht?
LAST_TAG=$(git -C "D:/Projekte/cubetracker" describe --tags --abbrev=0 2>/dev/null)
git -C "D:/Projekte/cubetracker" log "$LAST_TAG..HEAD" --name-only --pretty=format:"%h %s" \
  | grep -E "webapp/frontend/" | head
```

- **App 200 + Health ok + KEINE Frontend-Commits seit letztem Tag:** ✓.
- **Frontend-Commits vorhanden:** ⚠ Verifizieren, dass das Live-Bundle die Änderung
  enthält — am verlässlichsten per String-Check auf einen Text, den du in dieser
  Session NEU ins Frontend gebracht hast:

```bash
b=$(curl -s https://www.cubetracker.de/ | grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' | head -1)
curl -s "https://www.cubetracker.de/$b" | grep -c "HIER_EINEN_NEUEN_STRING_AUS_DIESER_SESSION"
```

  - **Treffer > 0:** ✓ Deploy ist live.
  - **Treffer = 0:** ⚠ Push ist NICHT deployt → in Coolify die **Frontend-App
    manuell „Redeploy"** + Build-Log prüfen. Dauerlösung: Task #37 (per-App-Webhook).

### 10. MAINTENANCE-Lauf fällig?

`MAINTENANCE.md` ist der periodische Tiefen-Check (~monatlich). Hier NUR die
Fälligkeit prüfen, nicht den ganzen Lauf machen.

```bash
# jüngstes Datum im Lauf-Protokoll von MAINTENANCE.md (Eintraege "- YYYY-MM-DD ..."):
grep -oE "^- 202[0-9]-[0-9]{2}-[0-9]{2}" "D:/Projekte/cubetracker/MAINTENANCE.md" | sort | tail -1
```

- **Letzter Lauf < 4 Wochen her:** ✓.
- **Letzter Lauf > 4 Wochen her / noch nie:** ⚠ anbieten: „Voller MAINTENANCE-Lauf
  ist fällig — jetzt durchgehen? (`lauf MAINTENANCE.md durch`)". Nicht erzwingen.

---

## Am Ende: Zusammenfassung

Tabellarisch:

| # | Check | Status |
|---|---|---|
| 1 | uncommitted | ✓ / ⚠ |
| 2 | unpushed | … |
| 3 | Patch-Notes | … |
| 4 | Git-Tags | … |
| 5 | features-data.ts | … |
| 6 | Doku | … |
| 7 | Todos | … |
| 8 | Backend-Smoke | … |
| 9 | Live-Deploy | … |
| 10 | MAINTENANCE faellig | … |

**Wenn alles grün:** „Session kann sauber beendet werden."
**Wenn ⚠:** „Ich empfehle folgendes vor Session-Ende zu fixen: [Liste]. Soll ich?"
