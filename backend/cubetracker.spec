# PyInstaller-Spec fuer cubetracker (Phase 9 Distribution).
#
# Build:
#     cd backend
#     # Vorab: Frontend builden, sodass dist/ existiert:
#     #   cd ../frontend && npm run build
#     "../backend/.venv/Scripts/python.exe" -m PyInstaller cubetracker.spec --noconfirm
#
# Output:
#     backend/dist/cubetracker/cubetracker.exe (one-folder, schneller startup)
#
# Hinweis: one-folder statt one-file gewaehlt weil:
#   - Schnellerer Startup (kein extract bei jedem Run)
#   - Inno-Setup packaged das ganze Verzeichnis ohnehin

# noqa: This is a PyInstaller spec, not normal Python — IDE warnings are OK.

from pathlib import Path

block_cipher = None

# Pfade
SPEC_DIR = Path(SPECPATH).resolve()
PROJECT_ROOT = SPEC_DIR.parent
FRONTEND_DIST = PROJECT_ROOT / "frontend" / "dist"
ALEMBIC_DIR = SPEC_DIR / "alembic"
ALEMBIC_INI = SPEC_DIR / "alembic.ini"

# Frontend-Bundle als Daten mitnehmen (main.py findet das via _find_dist_dir)
datas = []
if FRONTEND_DIST.exists():
    datas.append((str(FRONTEND_DIST), "frontend_dist"))
else:
    raise FileNotFoundError(
        f"Frontend-Build fehlt: {FRONTEND_DIST}. "
        "Vorher 'npm run build' im frontend/ ausfuehren."
    )

# Alembic mitnehmen — main.py macht beim ersten Start `alembic upgrade head`
if ALEMBIC_DIR.exists():
    datas.append((str(ALEMBIC_DIR), "alembic"))
if ALEMBIC_INI.exists():
    datas.append((str(ALEMBIC_INI), "."))

# SQLAlchemy + Alembic brauchen versteckte Imports (Dialekt-Module)
hidden_imports = [
    "sqlalchemy.dialects.sqlite",
    "alembic.runtime.migration",
    "alembic.script",
    "uvicorn.lifespan.on",
    "uvicorn.lifespan.off",
    "uvicorn.loops.auto",
    "uvicorn.protocols.http.auto",
    "uvicorn.protocols.websockets.auto",
]

a = Analysis(
    ["launcher.py"],
    pathex=[str(SPEC_DIR)],
    binaries=[],
    datas=datas,
    hiddenimports=hidden_imports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=["tkinter"],  # nicht noetig, spart ~5MB
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="cubetracker",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,  # kein UPX — laesst Antivirus-Heuristik anschlagen
    console=True,  # Console an: User sieht Logs + Fehler. Spaeter ggf. False
    disable_windowed_traceback=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,  # TODO: icon nachreichen
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name="cubetracker",
)
