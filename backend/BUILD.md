# cubetracker — Distribution-Build (Phase 9)

Anleitung wie aus dem Source-Code ein installierbarer Windows-Installer wird.

## Voraussetzungen

- Python 3.14 mit Projekt-venv (`backend/.venv/`)
- Node.js + npm
- PyInstaller (im venv installiert: `pip install pyinstaller`)
- Inno Setup 6 ([Download](https://jrsoftware.org/isdl.php), kostenlos)

## Build-Schritte

```powershell
# 1. Frontend bauen — produziert frontend/dist/
cd frontend
npm run build

# 2. PyInstaller-Bundle bauen — produziert backend/dist/cubetracker/
cd ../backend
.\.venv\Scripts\python.exe -m PyInstaller cubetracker.spec --noconfirm

# 3. Inno-Setup-Installer compilen — produziert backend/installer-output/cubetracker-setup-X.Y.Z.exe
& "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" cubetracker-installer.iss
```

Ergebnis: ein single `.exe`-Installer (~10-15 MB) den User auf jedem Windows-Rechner ausführen können.

## Versions-Bump bei neuem Release

1. `backend/main.py` → `__version__` bumpen
2. `backend/cubetracker-installer.iss` → `MyAppVersion` synchron bumpen
3. Build-Schritte oben durchziehen
4. Tag setzen (`git tag vX.Y.Z`)

## Smoke-Test des Bundles (ohne installieren)

```powershell
# EXE direkt aus dem dist-Ordner starten
.\dist\cubetracker\cubetracker.exe

# Mit suppressed Browser fuer headless-tests
$env:CUBETRACKER_NO_BROWSER="1"; $env:CUBETRACKER_PORT="8766"
.\dist\cubetracker\cubetracker.exe

# In zweitem Terminal:
curl http://127.0.0.1:8766/api/health
# Erwartet: {"app":"cubetracker","version":"X.Y.Z","status":"ok","mode":"prod"}
```

## Datenfluss in der ausgerollten App

- **App-Files** liegen unter `%ProgramFiles%\cubetracker\` (Inno-Setup-Default).
- **User-DB** liegt unter `%LOCALAPPDATA%\cubetracker\solves.db` —
  bleibt bei Updates und Uninstalls erhalten.
- **Port**: 8765 default, faellt durch zum naechsten freien.

## Parallelbetrieb Dev + Prod

Ja, möglich:

| | Dev | Prod (Installer) |
|---|---|---|
| Backend-Port | 8000 | 8765 |
| Frontend-Port | 5173 (Vite) | 8765 (StaticFiles im Backend) |
| DB-Pfad | `backend/data/solves.db` | `%LOCALAPPDATA%\cubetracker\solves.db` |
| `localStorage` | Origin `localhost:5173` | Origin `localhost:8765` |

→ vollkommen unabhängig. Beide gleichzeitig nutzbar.

## Bekannte Stolpersteine

- **Defender / Antivirus-False-Positive**: PyInstaller-Bundles werden
  oft als „verdächtig" geflagt (Heuristik). Lösungen:
  - Code-Signing-Zertifikat kaufen (~70-200€/Jahr) und EXE signieren
  - User akzeptiert SmartScreen-Warnung manuell („Trotzdem ausführen")
- **Bundle-Größe**: ~33 MB unkompressed. Acceptable für Solo-Tool.
- **Erstes Start dauert**: PyInstaller-Bundle entpackt sich beim ersten
  Run einmalig. Danach schnell.

## Restore-Workflow

User-Story „neuer Rechner":
1. Auf altem Rechner: VERWALTUNG → Daten → JSON-Voll-Export herunterladen
2. Auf neuem Rechner: Installer laufen lassen
3. App starten, VERWALTUNG → Daten → „🔄 JSON-Backup wiederherstellen"
4. Datei wählen, Dry-Run prüfen, Bestätigen
5. Browser-Reload — alle Daten sind da
