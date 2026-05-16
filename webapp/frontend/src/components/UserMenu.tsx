// UserMenu — Dropdown oben rechts mit Account-Zugaengen.
//
// Klassisches SaaS-Pattern: Klick auf Email/Avatar oeffnet Menu mit
// Profil, Einstellungen, Hilfe-Links, Logout. Bisher hatten wir nur
// einen Email-Span + Logout-Link nebeneinander — funktional, aber
// versteckt die zugehoerigen Aktionen.

import { useEffect, useRef, useState } from "react";

interface Props {
  email: string;
  displayName: string | null;
  isAdmin: boolean;
  onOpenSettings: () => void;
  onOpenPatchNotes: () => void;
  onOpenRoadmap: () => void;
  onOpenFeatures: () => void;
  onOpenFeedback: () => void;
  onLogout: () => void;
}

export function UserMenu({
  email,
  displayName,
  isAdmin,
  onOpenSettings,
  onOpenPatchNotes,
  onOpenRoadmap,
  onOpenFeatures,
  onOpenFeedback,
  onLogout,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Outside-Click + Esc schliesst
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function run(action: () => void) {
    setOpen(false);
    action();
  }

  // Initialen als Avatar-Fallback — erste 2 Buchstaben des Display-Name
  // bzw. der Email
  const displayInitial =
    (displayName || email)
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 2)
      .toUpperCase() || "??";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full bg-gray-800/60 hover:bg-gray-700/80 transition-colors px-2 py-1 border border-gray-700"
      >
        <span
          className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-purple-600/40 text-purple-100 text-sm font-semibold"
          aria-hidden="true"
        >
          {displayInitial}
        </span>
        <span className="hidden md:inline text-sm text-gray-300 pr-1 max-w-[180px] truncate">
          {displayName || email}
        </span>
        <span aria-hidden="true" className="text-gray-500 pr-1">
          ▾
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-64 rounded-lg border border-gray-700 bg-gray-900 shadow-xl overflow-hidden z-30"
        >
          {/* Header: Display-Name + Email */}
          <div className="px-4 py-3 border-b border-gray-700 bg-gray-800/40">
            <div className="text-sm font-semibold text-gray-100 truncate">
              {displayName || "Kein Display-Name"}
            </div>
            <div className="text-xs text-gray-400 truncate" title={email}>
              {email}
            </div>
            {isAdmin && (
              <div className="mt-1 inline-block rounded bg-purple-500/30 px-1.5 py-0.5 text-[10px] font-medium text-purple-200">
                ADMIN
              </div>
            )}
          </div>

          {/* Menu-Items */}
          <MenuItem onClick={() => run(onOpenSettings)} icon="⚙">
            Mein Account &amp; Einstellungen
          </MenuItem>
          <MenuItem onClick={() => run(onOpenPatchNotes)} icon="📋">
            Patch Notes
          </MenuItem>
          <MenuItem onClick={() => run(onOpenRoadmap)} icon="🗺">
            Roadmap (was kommt als naechstes?)
          </MenuItem>
          <MenuItem onClick={() => run(onOpenFeatures)} icon="ℹ">
            Was kann diese App?
          </MenuItem>
          <MenuItem onClick={() => run(onOpenFeedback)} icon="💬">
            Feedback geben
          </MenuItem>

          <div className="border-t border-gray-700" />
          <MenuItem onClick={() => run(onLogout)} icon="🚪" danger>
            Logout
          </MenuItem>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  children,
  onClick,
  danger,
}: {
  icon: string;
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm text-left transition-colors ${
        danger
          ? "text-red-300 hover:bg-red-600/20 hover:text-red-200"
          : "text-gray-200 hover:bg-purple-600/20 hover:text-purple-100"
      }`}
    >
      <span aria-hidden="true" className="w-5 text-base">
        {icon}
      </span>
      <span>{children}</span>
    </button>
  );
}
