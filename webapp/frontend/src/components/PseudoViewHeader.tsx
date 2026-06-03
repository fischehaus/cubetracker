// PseudoViewHeader (W.skin-pseudo-header-pills, 2026-05-31) — der Kontext-Header
// der UserMenu-Pseudo-Bereiche (Profil / Einstellungen / Nachrichten / Konto &
// Daten / Admin / Tester). Diese Bereiche haben KEINEN Eintrag in der Haupt-
// TabBar; der Header (Titel + „Zurück zur App") sagt dem User, wo er ist und
// wie er zurück in die App kommt.
//
// Warum eigene Komponente + Pillen-Backing: der Header liegt NICHT in einer
// Card, sondern direkt auf dem Seiten-Hintergrund. Bei aktivem Skin (Background-
// Bild) waren der helle Titel-Text + der randlose Ghost-Zurück-Button kaum
// lesbar (User-Befund 2026-05-31). Lösung — beide bekommen ein „Pillen"-Backing:
//   - Titel: bg-gray-900/60-Pille. Die Skin-CSS (index.css) schiebt
//     bg-gray-900/60 bei aktivem Skin auf deckend dunkel (die Regel gilt für
//     Nicht-Button-Elemente) → lesbar auf jedem Skin.
//   - Zurück-Button: „secondary" (gefüllt grau) statt „ghost" (transparent).
//
// Vorher war dieser Header in 6 Views wortgleich dupliziert.

import { Button } from "./ui";

interface Props {
  /** Emoji/Icon links vom Titel. */
  icon: string;
  /** Bereits übersetzter Titel (z.B. t("profilView.title")). */
  title: string;
  /** Bereits übersetztes Zurück-Label (z.B. t("profilView.back")). */
  backLabel: string;
  /** Zurück in die App — die Pseudo-Bereiche haben keine Haupt-TabBar. */
  onBack: () => void;
  /**
   * Optionaler Einleitungstext unter dem Titel. Bekommt ein dezentes Backing
   * (bg-gray-900/50 → von der Skin-CSS auf deckend geschaltet), damit er auf
   * Skin-Hintergründen lesbar bleibt statt nackt drauf zu liegen.
   */
  intro?: string;
}

export function PseudoViewHeader({
  icon,
  title,
  backLabel,
  onBack,
  intro,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-900/60 px-3 py-1.5 text-lg font-semibold text-gray-100 shadow-sm">
          <span aria-hidden="true">{icon}</span>
          {title}
        </h2>
        <Button variant="secondary" size="sm" onClick={onBack}>
          {backLabel}
        </Button>
      </div>
      {intro && (
        <p className="max-w-2xl rounded-lg bg-gray-900/50 px-3 py-2 text-sm text-gray-300">
          {intro}
        </p>
      )}
    </div>
  );
}
