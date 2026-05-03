; Inno-Setup-Script fuer cubetracker (Phase 9 Distribution).
;
; Build:
;   1. Frontend bauen:   cd ../frontend && npm run build
;   2. PyInstaller:      cd ../backend && python -m PyInstaller cubetracker.spec --noconfirm
;   3. Inno-Setup:       Inno Setup Compiler oeffnen + dieses File compilen,
;                        ODER ueber CLI:
;                        "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" cubetracker-installer.iss
;
; Output: backend/installer-output/cubetracker-setup-X.Y.Z.exe
;
; Was der Installer macht:
;   - Kopiert dist/cubetracker/* nach %ProgramFiles%\cubetracker\ (oder User-pfad)
;   - Start-Menue + Desktop-Verknuepfung
;   - Uninstaller (Standard-Inno-Verhalten)
;   - Wahrt %LOCALAPPDATA%\cubetracker\solves.db beim Uninstall NICHT
;     (User-Daten bleiben — bewusst, damit Reinstall nicht alles wegputzt)

#define MyAppName "cubetracker"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Solo-Dev"
#define MyAppExeName "cubetracker.exe"

[Setup]
; AppId: SHA-stabiler GUID, sodass Updates dieselbe App ueberschreiben
AppId={{8B2F4E15-3A7C-4D9B-A1E0-7C5B2F4E8A91}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
DisableDirPage=auto
OutputDir=installer-output
OutputBaseFilename=cubetracker-setup-{#MyAppVersion}
Compression=lzma
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
; Kein Code-Signing (User-Toleranz bei Defender-FP noetig)
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog

[Languages]
Name: "german"; MessagesFile: "compiler:Languages\German.isl"

[Tasks]
Name: "desktopicon"; Description: "Desktop-Verknuepfung anlegen"; GroupDescription: "Zusaetzliche Verknuepfungen:"

[Files]
; Alle Dateien aus dem PyInstaller-COLLECT-Output mitnehmen
Source: "dist\cubetracker\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
; Nach Install direkt App starten (User-Wahl)
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#MyAppName}}"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
; User-DB bleibt erhalten (im %LOCALAPPDATA%\cubetracker\)
; Nichts loeschen ausser dem App-Verzeichnis selbst
