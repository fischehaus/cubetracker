// Gemeinsamer Voll-Backup-Download (JSON) — genutzt von MeineDatenCard
// (Roadmap #6) und BackupPanel. Holt /backup/json und stößt einen
// Datei-Download im Browser an. Wirft bei Fehlern (Caller behandelt).
import { api } from "./api";

interface BackupExport {
  user_email?: string;
  [key: string]: unknown;
}

export async function downloadFullBackup(): Promise<void> {
  const r = await api.get<BackupExport>("/backup/json");
  const data = r.data;
  const ts = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 15);
  const userPart = (data.user_email || "user").split("@")[0];
  const filename = `cubetracker_${userPart}_${ts}.json`;
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
