/**
 * Impressum — öffentlich erreichbar (ohne Login), gerendert via pathname-Check
 * (/impressum) in App.tsx. Inhalt aus lib/legal-data.ts.
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
        <p>{IMPRESSUM.country}</p>
      </section>

      <section className="space-y-1">
        <LegalHeading>Kontakt</LegalHeading>
        <p>
          E-Mail:{" "}
          <a
            href={`mailto:${IMPRESSUM.email}`}
            className="text-purple-400 hover:text-purple-300 underline"
          >
            {IMPRESSUM.email}
          </a>
        </p>
        {IMPRESSUM.phone ? <p>Telefon: {IMPRESSUM.phone}</p> : null}
      </section>

      <section className="space-y-1">
        <LegalHeading>
          Verantwortlich für den Inhalt (§ 18 Abs. 2 MStV)
        </LegalHeading>
        <p>{IMPRESSUM.name} (Anschrift wie oben)</p>
      </section>

      <section className="space-y-1">
        <LegalHeading>Hinweis</LegalHeading>
        <p className="text-gray-400">
          cubetracker ist ein nicht-kommerzielles, privat betriebenes
          Hobby-Projekt. Der Quellcode ist quelloffen unter der GNU GPL-3.0
          verfügbar.
        </p>
      </section>
    </LegalShell>
  );
}
