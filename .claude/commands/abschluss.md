---
description: Session-Ende-Check fuer Cubetracker — 13 Checks (Git, Patch-Notes, Tags, Features-Liste, Todos, Backend-Smoke, Bugs/Feedback, Live-Deploy, MAINTENANCE, Regelebene-Gegenlesung, Werkstatt, zuletzt Übergabe-Kopf ersetzen + Verlustprobe + Journal) und Abschluss-Übersicht mit End-Block.
allowed-tools: Bash, Read, Grep, Glob, Edit, Write, TodoWrite
---

# /abschluss — Cubetracker Session-Ende-Check

Du wurdest per `/abschluss` aufgerufen (oder proaktiv bei „Session beenden"
o. ä.). **Der Aufruf selbst ist die Freigabe — keine Ansage mit Stopp davor.**
Jeden Check explizit reporten (✓ / ⚠ / – entfällt), am Ende Übersicht +
End-Block (Format: `CLAUDE.md` → Antwortformat). Knapp. Checks, die nicht
zutreffen, **entfallen still**. **Reihenfolge einhalten: Check 13 läuft zuletzt**
— die Checks davor sammeln Punkte für den Kopf.

Aus dem Repo-Root `D:\Projekte\cubetracker\`. ⚠️ Shell-Variablen überleben
keinen Bash-Aufruf: jeder Block berechnet `LAST_TAG` selbst und bricht ab,
wenn das nicht klappt (sonst wird `..HEAD` still leer = falsches Grün).

---

### 1. Git: uncommitted Änderungen?

```bash
git status --porcelain --untracked-files=no | head -20
```

- **Leer:** ✓. **Nicht leer:** ⚠ auflisten → End-Block-Zeile „committen?".
  Untracked Dateien behandelt Check 12.

### 2. Git: ungepushte Commits?

```bash
git log --oneline @{u}..HEAD 2>/dev/null
```

- **Leer:** ✓. **Nicht leer:** ⚠ auflisten → End-Block-Zeile „pushen (= live)?".

### 3. Patch-Notes-Eintrag pro `feat`/`fix`-Commit seit letztem Tag?

```bash
LAST_TAG=$(git describe --tags --abbrev=0) || { echo "FEHLER: kein Tag"; exit 1; }
echo "Letztes Tag: $LAST_TAG"; git log "$LAST_TAG..HEAD" --oneline --grep="^feat\|^fix"
```

Pro Commit `W.<name>` extrahieren und prüfen:
`grep -F 'version="2.0.0-alpha.W.<name>"' webapp/changelog/data.py`

- **Alle da:** ✓. **Fehlt einer:** ⚠ → End-Block (Agent `patch-notes-writer`).

### 4. Git-Tags für jeden Patch-Notes-Eintrag — gesetzt und gepusht?

```bash
grep -oE 'version="[^"]+"' webapp/changelog/data.py | head -10
git tag -l "v2.0.0-alpha.W.*" | sort
git ls-remote --tags origin "refs/tags/v*" 2>&1 | grep -v '\^{}' | awk -F/ '{print $NF}' | sort
```

- **Alle als Tag vorhanden + gepusht:** ✓. **Sonst:** ⚠ Tag-Befehle generieren.

### 5. `features-data.ts` bei User-facing Features?

Heuristik: `feat(W.<name>)` ohne `qa`, `fix`, `hardening`, `deploy-fix`,
`hotfix` im Namen → vermutlich User-facing.

```bash
LAST_TAG=$(git describe --tags --abbrev=0) || { echo "FEHLER: kein Tag"; exit 1; }
git log "$LAST_TAG..HEAD" --name-only --pretty=format:"COMMIT:%h %s" \
  | grep -E "^(COMMIT:|webapp/frontend/src/lib/features-data\.ts)"
```

- **Jede User-facing-Welle hat `features-data.ts` mitgeändert:** ✓. **Sonst:** ⚠.

### 6. Offene Todos der Session?

- **Alle `completed`:** ✓. **Offene:** ⚠ → Kandidat für den Kopf („Offen",
  Check 13) — nicht nur im Chat nennen.

### 7. Backend-Smoke-Test (lokal)

```bash
(cd webapp && python -c "import ast; ast.parse(open('changelog/data.py', encoding='utf-8').read()); print('Parse OK')")
```

Mit venv (`webapp/.venv/Scripts/python.exe`) zusätzlich:

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
" > ../.tmp/smoke.txt 2>&1; echo "RC=$?"; tail -5 ../.tmp/smoke.txt; rm -f test-abschluss.db)
```

- **Beides grün (RC=0):** ✓. **Fehler:** ⚠ HARD STOP — wäre im Coolify-Build
  gescheitert. Vor Session-Ende fixen.

### 8. Offene Bugs / Feedback

```bash
command -v gh >/dev/null && gh issue list --state open --limit 5 --json number,title,labels
```

Admin-Feedback-Inbox: App → Verwaltung → Admin → Feedback-Inbox (kein Auto-Scan).

- **Nichts offen:** ✓. **Offene Bugs:** ⚠ → Kandidat für den Kopf („Offen")
  oder bewusst liegen lassen. Nicht erzwingen.

### 9. Live-Deploy-Verifikation

Push ≠ live: Coolify deployt nur die App, deren Pfade der Push ändert, und ein
rot gegateter Push deployt gar nicht. Live-Host: **www.cubetracker.de**.

```bash
LAST_TAG=$(git describe --tags --abbrev=0) || { echo "FEHLER: kein Tag"; exit 1; }
curl -s -o /dev/null -w "Frontend www: %{http_code}\n" https://www.cubetracker.de/
curl -s -w "\nHealth: %{http_code}\n" https://www.cubetracker.de/api/health
git log "$LAST_TAG..HEAD" --name-only --pretty=format:"%h %s" | grep -E "webapp/frontend/" | head
```

- **200 + Health ok + keine Frontend-Commits:** ✓.
- **Frontend-Commits:** Live-Bundle per String-Check auf einen in dieser Session
  NEU eingebauten Text prüfen:

```bash
b=$(curl -s https://www.cubetracker.de/ | grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' | head -1)
curl -s "https://www.cubetracker.de/$b" | grep -c "NEUER_STRING_AUS_DIESER_SESSION"
```

  Treffer > 0: ✓. Treffer = 0: ⚠ → `gh workflow run deploy.yml` (deployt FE+BE),
  danach erneut prüfen. Health-Version **und** Bundle müssen flippen.

### 10. MAINTENANCE-Lauf fällig?

```bash
grep -oE "^- (\*\*)?202[0-9]-[0-9]{2}-[0-9]{2}" MAINTENANCE.md | tr -d '*' | sort | tail -1
```

- **< 4 Wochen:** ✓. **Älter:** ⚠ → End-Block-Zeile „MAINTENANCE-Lauf jetzt?"
  und Kandidat für den Kopf („Offen").

### 11. Regelebene geändert → lief die Gegenlesung?

Nur wenn die Session `CLAUDE.md` oder `.claude/**` geändert hat (Status + eigene
Commits der Session). **Sonst entfällt der Check still.**

- Hat die Änderung eine **Aussage** geändert, gestrichen oder neu eingeführt?
  - **Ja** und die Gegenlesung lief (Opus, frischer Kontext, Critique): ✓, im
    Journal-Block „Gegenleser: opus/<Datum>" vermerken.
  - **Ja, aber ohne Gegenlesung:** ⚠ → jetzt nachholen **oder** als Punkt in den
    Kopf („Offen") — nicht still übergehen.
  - **Nein (Bagatelle):** ansagen und im Journal-Block „Gegenleser: entfallen
    (Bagatelle)" vermerken.
- Hooks geändert → liefen die mechanischen Tests (u. a.
  `.claude/hooks/tests/test_pre_bash_dev_server.py`) **vor** der Gegenlesung?

### 12. Werkstatt: Liegengebliebenes einordnen

```bash
git -c core.quotePath=false status --porcelain -uall | grep '^??'
ls -1 .tmp/ | grep -vE '^(admin-token|roadmap-export-key)'
```

- **Untracked im Repo:** jede Datei in **eine von drei Klassen** einordnen und als
  Liste zeigen: **(1) gehört ins Repo** → committen (welche Welle?) ·
  **(2) lokal behalten** → `.gitignore` oder im Kopf nennen · **(3) Müll** → löschen.
- **`.tmp/`** (gitignored, ohne Sicherung): **nur auflisten, nicht löschen**, nie
  Inhalte von `admin-token*`/`roadmap-export-key*` anzeigen. Dateien, auf die der
  Kopf verweist (z. B. Fragebogen, Prüfskripte), als **„sichern?"** markieren.
- **Löschen ist Risikoklasse:** Jede Löschzeile im End-Block steht als
  `(offene Wahl) — sonst behalten`, nie als `(empfohlen)` — ein bloßes `GO`
  löscht also nichts, nur `GO <n>`. Gelöschte untracked Dateien sind nicht
  wiederherstellbar. Im Zweifel: liegen lassen und im Kopf nennen.

### 13. Übergabe-Kopf ersetzen + Journal fortschreiben (zuletzt)

`NEXT_SESSION.md` ist der Übergabe-Kopf (Stand · Offen · Zeiger), wird beim
Start automatisch geladen und hier **ersetzt statt ergänzt**. Der Verlauf geht
ans Ende von `docs/session-journal.md`.

1. **Alter Kopf = Stand beim letzten Abschluss:**
   `REF=$(git log -1 --format=%h --grep='^docs(session)' -- NEXT_SESSION.md)`;
   leer → `REF=HEAD`. `git show "$REF:NEXT_SESSION.md" > .tmp/kopf-alt.md`.
   (Nicht die Arbeitskopie — die wurde in der Session fortgeschrieben, sonst
   entgehen der Probe Punkte, die unterwegs gestrichen wurden.)
2. **Schlüssel sammeln:** jede Zeile unter „## 🔜 Offen" in `kopf-alt.md` —
   Schlüssel = fettgedruckter Anfang, sonst die ersten fünf Wörter.
3. **Journal-Block anhängen** (Dateiende; nie beim Start geladen):
   `## ✅ JJJJ-MM-TT — <Thema>` · Wellen mit Tag + Commit-Hash · Entscheidungen ·
   für **jeden** alten Schlüssel, der nicht in den neuen Kopf wandert: `✅ <Schlüssel>
   — erledigt (<Hash>)` bzw. `✗ <Schlüssel> — verworfen: <Grund>` · Lessons nur
   als Verweis (die Lesson selbst → `docs/lessons-archive.md`). Anhängen per
   `cat >> docs/session-journal.md <<'EOF'` — die Datei ist groß.
4. **Kopf neu schreiben** (Write, ganzer Kopf, Rahmen-Kopfzeilen beibehalten);
   übernommene Schlüssel **wörtlich**. Kandidaten aus Checks 1–12 aufnehmen.
5. **Verlustprobe (Pflicht — Ersetzen ist destruktiv):** jeden Schlüssel
   (Zeilenumbrüche vorher per `tr '\n' ' '` glätten) per `grep -cF` suchen in
   (a) dem **neuen Kopf** oder (b) dem **Journal-Block dieser Session**
   (`sed -n '/^## ✅ <heute>/,$p' docs/session-journal.md`) mit ✅/✗.
   **Fehlt einer → Abbruch**, Punkt wiederherstellen, erneut prüfen.
6. **Budget-Probe** (simuliert den echten Start, offline, ohne Snapshot):
   `echo '{"source":"startup"}' | CUBETRACKER_HOOK_OFFLINE=1 bash
   .claude/hooks/session-start-context.sh > .tmp/start-probe.txt; wc -m
   .tmp/start-probe.txt` → ≤ 9.000 Zeichen (Reserve für Roadmap/Issues) und
   **kein** „NICHT geladen". Sonst kürzen (Erledigtes → Journal, Regeln →
   `CLAUDE.md`).
7. **Commit nur dieser beiden Pfade:**
   `git commit -m "docs(session): <Thema>" -- NEXT_SESSION.md docs/session-journal.md`.
8. **Push nur, wenn er ausschließlich Doku trägt:**
   `git log @{u}..HEAD --name-only --pretty=format: | sort -u | grep -vxE 'NEXT_SESSION.md|docs/session-journal.md|'`
   → **leer:** `git push` (benannte Ausnahme vom Ansage-Stopp: Root-Doku löst
   laut `.github/workflows/deploy.yml` keinen Deploy aus). **Nicht leer:** nicht
   pushen — der Push enthielte Code (= live) → End-Block-Zeile „Push enthält
   Code-Commits (= live): pushen?".

Wenn `ROADMAP.md` betroffen ist (Phase fertig): mit-aktualisieren. Cross-Projekt-
`D:/Claude-Projekte/STATUS.md` liegt außerhalb des Repos — nur erinnern.
Roadmap-Items, die eine Welle abgeschlossen hat: `--mark-done` (`/roadmap`).

---

## Am Ende: Übersicht + End-Block

| # | Check | Status |
|---|---|---|
| 1 | uncommitted | ✓ / ⚠ / – |
| 2 | unpushed | … |
| 3 | Patch-Notes | … |
| 4 | Git-Tags | … |
| 5 | features-data.ts | … |
| 6 | Todos | … |
| 7 | Backend-Smoke | … |
| 8 | Bugs / Feedback | … |
| 9 | Live-Deploy | … |
| 10 | MAINTENANCE | … |
| 11 | Regelebene-Gegenlesung | … |
| 12 | Werkstatt | … |
| 13 | Kopf ersetzt + Verlustprobe + Journal | … |

Danach drei Zeilen: **erreicht** · **offen** (steht jetzt im Kopf) · **weiter**
(womit die nächste Session beginnt). Dann — nur wenn etwas offen ist — der
End-Block „➡️ Jetzt bei dir" (`CLAUDE.md` → Antwortformat). **Alles grün → kein
Block**; das ist das Erfolgssignal. ntfy-Nachricht entsprechend schreiben.

Wenn `$ARGUMENTS` gesetzt ist: als Schwerpunkt oder Zusatznotiz berücksichtigen.
