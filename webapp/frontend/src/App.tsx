/**
 * App-Shell mit Tabs + AuthGuard.
 *
 * - Nicht eingeloggt -> LoginPage
 * - Eingeloggt -> Header (Email + Logout) + Tabs Solves/Sessions/Hardware
 *
 * Sessions + Hardware werden im App-Level geladen damit SolvesView die Listen
 * fuer die Dropdowns ohne extra Query bekommt.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./auth/AuthContext";
import { LoginPage } from "./pages/LoginPage";
import { SolvesView } from "./views/SolvesView";
import { SessionsView } from "./views/SessionsView";
import { HardwareView } from "./views/HardwareView";
import { listHardware, listSessions } from "./api/resources";

type Tab = "solves" | "sessions" | "hardware";

export function App() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [tab, setTab] = useState<Tab>("solves");

  const sessionsQuery = useQuery({
    queryKey: ["sessions"],
    queryFn: listSessions,
    enabled: isAuthenticated,
  });
  const hardwareQuery = useQuery({
    queryKey: ["hardware"],
    queryFn: listHardware,
    enabled: isAuthenticated,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        Laedt…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-slate-900">cubetracker</h1>
            <nav className="flex gap-1">
              <NavTab active={tab === "solves"} onClick={() => setTab("solves")}>
                Solves
              </NavTab>
              <NavTab active={tab === "sessions"} onClick={() => setTab("sessions")}>
                Sessions
              </NavTab>
              <NavTab active={tab === "hardware"} onClick={() => setTab("hardware")}>
                Hardware
              </NavTab>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500 hidden md:inline">{user?.email}</span>
            <button
              onClick={() => void logout()}
              className="text-sm text-slate-600 hover:text-slate-900 underline"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
        {tab === "solves" && (
          <SolvesView
            sessions={sessionsQuery.data ?? []}
            hardware={hardwareQuery.data ?? []}
          />
        )}
        {tab === "sessions" && <SessionsView />}
        {tab === "hardware" && <HardwareView />}
      </main>
    </div>
  );
}

function NavTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
        active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}
