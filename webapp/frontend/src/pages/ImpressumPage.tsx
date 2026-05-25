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
