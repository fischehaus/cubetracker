/**
 * Datenschutzerklärung — öffentlich erreichbar (ohne Login), gerendert via
 * pathname-Check (/datenschutz) in App.tsx.
 *
 * ⚠️ Vorlage, zugeschnitten auf das tatsächliche Verhalten dieser App
 * (Account-Login, funktionales Cookie, kein Tracking, Resend-Mailversand,
 * Hetzner-Hosting). Vor Veröffentlichung mit einem Generator (e-recht24) oder
 * rechtlicher Beratung abgleichen. Kein Rechtsrat.
 */
import {
  IMPRESSUM,
  DATENSCHUTZ_STAND,
  HOSTING_PROVIDER,
  EMAIL_PROVIDER,
} from "../lib/legal-data";
import { LegalShell, LegalHeading } from "./LegalShell";

export function DatenschutzPage() {
  return (
    <LegalShell title="Datenschutzerklärung">
      <section className="space-y-2">
        <p>
          Der Schutz deiner Daten ist uns wichtig. cubetracker verzichtet
          bewusst auf Tracking, Werbe-Cookies und Analyse-Dienste von
          Drittanbietern. Es werden ausschliesslich die Daten verarbeitet, die
          für den Betrieb der App nötig sind.
        </p>
      </section>

      <section className="space-y-1">
        <LegalHeading>1. Verantwortlicher</LegalHeading>
        <p>{IMPRESSUM.name}</p>
        <p>{IMPRESSUM.street}</p>
        <p>{IMPRESSUM.zipCity}</p>
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

      <section className="space-y-2">
        <LegalHeading>2. Welche Daten wir verarbeiten</LegalHeading>

        <p>
          <strong className="text-gray-200">a) Account-Daten.</strong> Bei der
          Registrierung speichern wir deine E-Mail-Adresse, dein Passwort
          (ausschliesslich als kryptografischer Hash, niemals im Klartext) und
          optional einen Anzeigenamen. Zweck: Bereitstellung und Verwaltung
          deines Kontos. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO
          (Vertragserfüllung).
        </p>

        <p>
          <strong className="text-gray-200">b) Deine Cubing-Daten.</strong> Die
          von dir erfassten Solves (Zeiten, Scrambles, Notizen, Zeitstempel),
          Sessions, Statistiken, Hardware-Angaben sowie Trainings-Fortschritt
          und Achievements. Zweck: die Kernfunktion der App. Rechtsgrundlage:
          Art. 6 Abs. 1 lit. b DSGVO.
        </p>

        <p>
          <strong className="text-gray-200">c) Optionale Profilangaben.</strong>{" "}
          Anzeigename, Sichtbarkeit für die Freunde-Funktion sowie Postleitzahl
          und Land (nur, um WCA-Turniere in deiner Nähe anzuzeigen). Diese
          Angaben sind freiwillig. Rechtsgrundlage: Art. 6 Abs. 1 lit. a
          (Einwilligung) bzw. lit. b DSGVO.
        </p>

        <p>
          <strong className="text-gray-200">
            d) Funktionale Cookies &amp; lokaler Speicher.
          </strong>{" "}
          Für die Anmeldung setzen wir ein technisch notwendiges, sicheres
          (HttpOnly-)Cookie zur Aufrechterhaltung deiner Login-Sitzung
          (Token-Refresh). Zusätzlich speichern wir einige funktionale
          Einstellungen (z. B. den zuletzt geöffneten Tab und Anzeige-Optionen)
          im lokalen Browser-Speicher (localStorage) deines Geräts. Es findet
          kein Tracking und keine Werbung statt; daher ist kein Cookie-Banner
          erforderlich. Rechtsgrundlage: § 25 Abs. 2 TDDDG (unbedingt
          erforderlich) sowie Art. 6 Abs. 1 lit. f DSGVO (sicherer Betrieb des
          Logins).
        </p>

        <p>
          <strong className="text-gray-200">e) Server-Logfiles.</strong> Beim
          Aufruf der App erhebt unser Hosting-Dienstleister automatisch
          technische Zugriffsdaten (u. a. IP-Adresse, Datum und Uhrzeit, die
          abgerufene Ressource sowie Browser-/Geräteinformationen) zur
          Auslieferung und Absicherung des Dienstes. Rechtsgrundlage: Art. 6
          Abs. 1 lit. f DSGVO.
        </p>

        <p>
          <strong className="text-gray-200">f) E-Mail-Versand.</strong> Für
          Verifizierungs- und Passwort-Reset-Mails (und ggf. Antworten auf
          Feedback) nutzen wir den Versanddienst {EMAIL_PROVIDER}. Dabei werden
          deine E-Mail-Adresse und der Nachrichteninhalt verarbeitet.
          Rechtsgrundlage: Art. 6 Abs. 1 lit. b bzw. lit. f DSGVO.
        </p>
      </section>

      <section className="space-y-2">
        <LegalHeading>3. Hosting &amp; Auftragsverarbeiter</LegalHeading>
        <p>
          Die App wird gehostet bei: {HOSTING_PROVIDER}. Für den E-Mail-Versand
          setzen wir {EMAIL_PROVIDER} ein. Mit diesen Dienstleistern bestehen,
          soweit erforderlich, Verträge zur Auftragsverarbeitung nach Art. 28
          DSGVO.
        </p>
      </section>

      <section className="space-y-2">
        <LegalHeading>4. Speicherdauer</LegalHeading>
        <p>
          Account- und Cubing-Daten speichern wir, bis du deinen Account
          löschst. Sicherungskopien (Backups) werden rollierend vorgehalten und
          turnusmässig überschrieben. Server-Logfiles werden nach kurzer Frist
          gelöscht.
        </p>
      </section>

      <section className="space-y-2">
        <LegalHeading>5. Deine Rechte</LegalHeading>
        <p>
          Du hast jederzeit das Recht auf Auskunft (Art. 15), Berichtigung
          (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung
          (Art. 18), Datenübertragbarkeit (Art. 20) sowie Widerspruch (Art. 21
          DSGVO).
        </p>
        <p>
          Praktisch: Du kannst deinen Account samt aller Daten jederzeit selbst
          in der App löschen und vorab ein vollständiges Backup deiner Daten als
          JSON-Datei exportieren.
        </p>
        <p>
          Zudem steht dir ein Beschwerderecht bei einer
          Datenschutz-Aufsichtsbehörde zu (Art. 77 DSGVO).
        </p>
      </section>

      <section className="space-y-2">
        <LegalHeading>6. Keine automatisierte Entscheidungsfindung</LegalHeading>
        <p>
          Es findet keine automatisierte Entscheidungsfindung und kein Profiling
          zu Werbezwecken statt.
        </p>
      </section>

      <section className="space-y-2">
        <LegalHeading>7. Kontakt</LegalHeading>
        <p>
          Bei Fragen zum Datenschutz erreichst du uns unter{" "}
          <a
            href={`mailto:${IMPRESSUM.email}`}
            className="text-purple-400 hover:text-purple-300 underline"
          >
            {IMPRESSUM.email}
          </a>
          .
        </p>
      </section>

      <p className="text-xs text-gray-500">Stand: {DATENSCHUTZ_STAND}</p>
    </LegalShell>
  );
}
