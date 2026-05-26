/**
 * Impressum — öffentlich erreichbar (ohne Login), gerendert via pathname-Check
 * (/impressum) in App.tsx. Inhalt aus lib/legal-data.ts.
 *
 * Basis: mit dem e-recht24-Generator erstellt (Quelle in der Seite genannt).
 */
import { IMPRESSUM } from "../lib/legal-data";
import { LegalShell, LegalHeading } from "./LegalShell";

export function ImpressumPage() {
  return (
    <LegalShell title="Impressum">
      <section className="space-y-1">
        <LegalHeading>Angaben gemäß § 5 DDG</LegalHeading>
        <p>{IMPRESSUM.name}</p>
        <p>{IMPRESSUM.street}</p>
        <p>{IMPRESSUM.zipCity}</p>
      </section>

      <section className="space-y-1">
        <LegalHeading>Kontakt</LegalHeading>
        {IMPRESSUM.phone ? <p>Telefon: {IMPRESSUM.phone}</p> : null}
        <p>
          E-Mail:{" "}
          <a
            href={`mailto:${IMPRESSUM.email}`}
            className="text-purple-400 hover:text-purple-300 underline"
          >
            {IMPRESSUM.email}
          </a>
        </p>
      </section>

      <section className="space-y-1">
        <LegalHeading>Hinweis zur Entwicklung mit KI-Unterstützung</LegalHeading>
        <p>
          Diese App wurde unter Mitarbeit von KI-Werkzeugen
          (insbesondere Claude von Anthropic) entwickelt. Sämtlicher
          Code wurde vom Betreiber inhaltlich überprüft und manuell
          freigegeben — die KI dient ausschließlich als Hilfsmittel
          im Sinne der Transparenzpflichten nach Art. 50 der KI-Verordnung
          (EU 2024/1689).
        </p>
        <p>
          Innerhalb der App selbst werden keine Inhalte durch KI generiert:
          Scrambles, Statistiken, Achievements und das Coaching-Feedback
          am Ende von Trainings-Sets sind rein regelbasiert. Sollten in
          Zukunft KI-generierte Inhalte hinzukommen, werden diese als
          solche gekennzeichnet.
        </p>
      </section>

      <p className="text-xs text-gray-500 pt-2">
        Quelle:{" "}
        <a
          href="https://www.e-recht24.de"
          className="text-gray-400 hover:text-gray-200 underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          eRecht24
        </a>
      </p>
    </LegalShell>
  );
}
