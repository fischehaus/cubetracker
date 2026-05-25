/**
 * Datenschutzerklärung — öffentlich erreichbar (ohne Login), gerendert via
 * pathname-Check (/datenschutz) in App.tsx.
 *
 * Basis: mit dem e-recht24-Generator erstellte Datenschutzerklärung
 * (Stand 2026-05-25, Quelle in der Seite genannt — Pflicht der Free-Nutzung).
 * ERGÄNZT um die cubetracker-spezifischen Verarbeitungen (Account/Registrierung,
 * Nutzerinhalte, Profil/Freunde + Nominatim-Geocoding, Resend-Mailversand),
 * die der Generator nicht abdeckt. Personenbezogene Pflichtangaben aus
 * lib/legal-data.ts (Single-Source).
 */
import type { ReactNode } from "react";
import { IMPRESSUM } from "../lib/legal-data";
import { LegalShell, LegalHeading } from "./LegalShell";

function Sub({ children }: { children: ReactNode }) {
  return <h3 className="text-base font-semibold text-gray-100 mt-4">{children}</h3>;
}

export function DatenschutzPage() {
  return (
    <LegalShell title="Datenschutzerklärung">
      {/* 1 */}
      <section className="space-y-2">
        <LegalHeading>1. Datenschutz auf einen Blick</LegalHeading>
        <Sub>Allgemeine Hinweise</Sub>
        <p>
          Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit
          Ihren personenbezogenen Daten passiert, wenn Sie diese Website besuchen.
          Personenbezogene Daten sind alle Daten, mit denen Sie persönlich
          identifiziert werden können. Ausführliche Informationen zum Thema
          Datenschutz entnehmen Sie unserer unter diesem Text aufgeführten
          Datenschutzerklärung.
        </p>
        <Sub>Datenerfassung auf dieser Website</Sub>
        <p>
          <strong className="text-gray-200">
            Wer ist verantwortlich für die Datenerfassung auf dieser Website?
          </strong>
          <br />
          Die Datenverarbeitung auf dieser Website erfolgt durch den
          Websitebetreiber. Dessen Kontaktdaten können Sie dem Abschnitt „Hinweis
          zur verantwortlichen Stelle" in dieser Datenschutzerklärung entnehmen.
        </p>
        <p>
          <strong className="text-gray-200">Wie erfassen wir Ihre Daten?</strong>
          <br />
          Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese
          mitteilen. Hierbei kann es sich z. B. um Daten handeln, die Sie bei der
          Registrierung, beim Erfassen Ihrer Solves oder in ein Kontaktformular
          eingeben. Andere Daten werden automatisch oder nach Ihrer Einwilligung
          beim Besuch der Website durch unsere IT-Systeme erfasst. Das sind vor
          allem technische Daten (z. B. Internetbrowser, Betriebssystem oder
          Uhrzeit des Seitenaufrufs).
        </p>
        <p>
          <strong className="text-gray-200">Wofür nutzen wir Ihre Daten?</strong>
          <br />
          Ein Teil der Daten wird erhoben, um eine fehlerfreie Bereitstellung der
          Website zu gewährleisten. Andere Daten dienen der Bereitstellung der
          Kernfunktionen (z. B. Speichern und Auswerten Ihrer Solves). Wir setzen
          keine Tracking-, Analyse- oder Werbedienste von Drittanbietern ein.
        </p>
        <p>
          <strong className="text-gray-200">
            Welche Rechte haben Sie bezüglich Ihrer Daten?
          </strong>
          <br />
          Sie haben jederzeit das Recht, unentgeltlich Auskunft über Herkunft,
          Empfänger und Zweck Ihrer gespeicherten personenbezogenen Daten zu
          erhalten. Sie haben außerdem ein Recht, die Berichtigung oder Löschung
          dieser Daten zu verlangen. Wenn Sie eine Einwilligung zur
          Datenverarbeitung erteilt haben, können Sie diese Einwilligung jederzeit
          für die Zukunft widerrufen. Außerdem haben Sie das Recht, unter
          bestimmten Umständen die Einschränkung der Verarbeitung Ihrer
          personenbezogenen Daten zu verlangen. Des Weiteren steht Ihnen ein
          Beschwerderecht bei der zuständigen Aufsichtsbehörde zu.
        </p>
      </section>

      {/* 2 */}
      <section className="space-y-2">
        <LegalHeading>2. Hosting</LegalHeading>
        <p>Wir hosten die Inhalte unserer Website bei folgendem Anbieter:</p>
        <Sub>Hetzner</Sub>
        <p>
          Anbieter ist die Hetzner Online GmbH, Industriestr. 25, 91710
          Gunzenhausen (nachfolgend Hetzner). Details entnehmen Sie der
          Datenschutzerklärung von Hetzner:{" "}
          <a
            href="https://www.hetzner.com/de/legal/privacy-policy/"
            className="text-purple-400 hover:text-purple-300 underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            hetzner.com/de/legal/privacy-policy
          </a>
          . Die Verwendung von Hetzner erfolgt auf Grundlage von Art. 6 Abs. 1
          lit. f DSGVO. Wir haben ein berechtigtes Interesse an einer möglichst
          zuverlässigen Darstellung unserer Website.
        </p>
        <Sub>Auftragsverarbeitung</Sub>
        <p>
          Wir haben einen Vertrag über Auftragsverarbeitung (AVV) zur Nutzung des
          oben genannten Dienstes geschlossen. Hierbei handelt es sich um einen
          datenschutzrechtlich vorgeschriebenen Vertrag, der gewährleistet, dass
          dieser die personenbezogenen Daten unserer Websitebesucher nur nach
          unseren Weisungen und unter Einhaltung der DSGVO verarbeitet.
        </p>
      </section>

      {/* 3 */}
      <section className="space-y-2">
        <LegalHeading>3. Allgemeine Hinweise und Pflichtinformationen</LegalHeading>
        <Sub>Datenschutz</Sub>
        <p>
          Die Betreiber dieser Seiten nehmen den Schutz Ihrer persönlichen Daten
          sehr ernst. Wir behandeln Ihre personenbezogenen Daten vertraulich und
          entsprechend den gesetzlichen Datenschutzvorschriften sowie dieser
          Datenschutzerklärung. Wir weisen darauf hin, dass die Datenübertragung
          im Internet (z. B. bei der Kommunikation per E-Mail) Sicherheitslücken
          aufweisen kann. Ein lückenloser Schutz der Daten vor dem Zugriff durch
          Dritte ist nicht möglich.
        </p>
        <Sub>Hinweis zur verantwortlichen Stelle</Sub>
        <p>
          Die verantwortliche Stelle für die Datenverarbeitung auf dieser Website
          ist:
        </p>
        <p>
          {IMPRESSUM.name}
          <br />
          {IMPRESSUM.street}
          <br />
          {IMPRESSUM.zipCity}
        </p>
        <p>
          {IMPRESSUM.phone ? (
            <>
              Telefon: {IMPRESSUM.phone}
              <br />
            </>
          ) : null}
          E-Mail:{" "}
          <a
            href={`mailto:${IMPRESSUM.email}`}
            className="text-purple-400 hover:text-purple-300 underline"
          >
            {IMPRESSUM.email}
          </a>
        </p>
        <p>
          Verantwortliche Stelle ist die natürliche oder juristische Person, die
          allein oder gemeinsam mit anderen über die Zwecke und Mittel der
          Verarbeitung von personenbezogenen Daten entscheidet.
        </p>
        <Sub>Speicherdauer</Sub>
        <p>
          Soweit innerhalb dieser Datenschutzerklärung keine speziellere
          Speicherdauer genannt wurde, verbleiben Ihre personenbezogenen Daten bei
          uns, bis der Zweck für die Datenverarbeitung entfällt. Wenn Sie ein
          berechtigtes Löschersuchen geltend machen oder eine Einwilligung zur
          Datenverarbeitung widerrufen, werden Ihre Daten gelöscht, sofern wir
          keine anderen rechtlich zulässigen Gründe für die Speicherung Ihrer
          personenbezogenen Daten haben.
        </p>
        <Sub>
          Allgemeine Hinweise zu den Rechtsgrundlagen der Datenverarbeitung
        </Sub>
        <p>
          Sofern Sie in die Datenverarbeitung eingewilligt haben, verarbeiten wir
          Ihre personenbezogenen Daten auf Grundlage von Art. 6 Abs. 1 lit. a
          DSGVO bzw. § 25 Abs. 1 TDDDG. Sind Ihre Daten zur Vertragserfüllung oder
          zur Durchführung vorvertraglicher Maßnahmen erforderlich, verarbeiten
          wir Ihre Daten auf Grundlage des Art. 6 Abs. 1 lit. b DSGVO. Die
          Datenverarbeitung kann ferner auf Grundlage unseres berechtigten
          Interesses nach Art. 6 Abs. 1 lit. f DSGVO erfolgen. Über die jeweils im
          Einzelfall einschlägigen Rechtsgrundlagen wird in den folgenden
          Absätzen dieser Datenschutzerklärung informiert.
        </p>
        <Sub>Empfänger von personenbezogenen Daten</Sub>
        <p>
          Wir geben personenbezogene Daten nur dann an externe Stellen weiter,
          wenn dies im Rahmen einer Vertragserfüllung erforderlich ist, wenn wir
          gesetzlich hierzu verpflichtet sind, wenn wir ein berechtigtes Interesse
          nach Art. 6 Abs. 1 lit. f DSGVO an der Weitergabe haben oder wenn eine
          sonstige Rechtsgrundlage die Datenweitergabe erlaubt. Beim Einsatz von
          Auftragsverarbeitern geben wir personenbezogene Daten nur auf Grundlage
          eines gültigen Vertrags über Auftragsverarbeitung weiter.
        </p>
        <Sub>Widerruf Ihrer Einwilligung zur Datenverarbeitung</Sub>
        <p>
          Viele Datenverarbeitungsvorgänge sind nur mit Ihrer ausdrücklichen
          Einwilligung möglich. Sie können eine bereits erteilte Einwilligung
          jederzeit widerrufen. Die Rechtmäßigkeit der bis zum Widerruf erfolgten
          Datenverarbeitung bleibt vom Widerruf unberührt.
        </p>
        <Sub>
          Widerspruchsrecht gegen die Datenerhebung in besonderen Fällen sowie
          gegen Direktwerbung (Art. 21 DSGVO)
        </Sub>
        <p className="text-sm">
          WENN DIE DATENVERARBEITUNG AUF GRUNDLAGE VON ART. 6 ABS. 1 LIT. E ODER F
          DSGVO ERFOLGT, HABEN SIE JEDERZEIT DAS RECHT, AUS GRÜNDEN, DIE SICH AUS
          IHRER BESONDEREN SITUATION ERGEBEN, GEGEN DIE VERARBEITUNG IHRER
          PERSONENBEZOGENEN DATEN WIDERSPRUCH EINZULEGEN; DIES GILT AUCH FÜR EIN
          AUF DIESE BESTIMMUNGEN GESTÜTZTES PROFILING. WENN SIE WIDERSPRUCH
          EINLEGEN, WERDEN WIR IHRE BETROFFENEN PERSONENBEZOGENEN DATEN NICHT MEHR
          VERARBEITEN, ES SEI DENN, WIR KÖNNEN ZWINGENDE SCHUTZWÜRDIGE GRÜNDE FÜR
          DIE VERARBEITUNG NACHWEISEN, DIE IHRE INTERESSEN, RECHTE UND FREIHEITEN
          ÜBERWIEGEN ODER DIE VERARBEITUNG DIENT DER GELTENDMACHUNG, AUSÜBUNG ODER
          VERTEIDIGUNG VON RECHTSANSPRÜCHEN (WIDERSPRUCH NACH ART. 21 ABS. 1
          DSGVO).
        </p>
        <Sub>Beschwerderecht bei der zuständigen Aufsichtsbehörde</Sub>
        <p>
          Im Falle von Verstößen gegen die DSGVO steht den Betroffenen ein
          Beschwerderecht bei einer Aufsichtsbehörde zu, insbesondere in dem
          Mitgliedstaat ihres gewöhnlichen Aufenthalts, ihres Arbeitsplatzes oder
          des Orts des mutmaßlichen Verstoßes. Das Beschwerderecht besteht
          unbeschadet anderweitiger verwaltungsrechtlicher oder gerichtlicher
          Rechtsbehelfe.
        </p>
        <Sub>Recht auf Datenübertragbarkeit</Sub>
        <p>
          Sie haben das Recht, Daten, die wir auf Grundlage Ihrer Einwilligung
          oder in Erfüllung eines Vertrags automatisiert verarbeiten, an sich oder
          an einen Dritten in einem gängigen, maschinenlesbaren Format aushändigen
          zu lassen. In cubetracker können Sie Ihre Daten jederzeit selbst als
          vollständiges JSON-Backup exportieren.
        </p>
        <Sub>Auskunft, Berichtigung und Löschung</Sub>
        <p>
          Sie haben im Rahmen der geltenden gesetzlichen Bestimmungen jederzeit das
          Recht auf unentgeltliche Auskunft über Ihre gespeicherten
          personenbezogenen Daten, deren Herkunft und Empfänger und den Zweck der
          Datenverarbeitung und ggf. ein Recht auf Berichtigung oder Löschung
          dieser Daten. Ihren Account samt aller Daten können Sie zudem jederzeit
          selbst in der App löschen. Hierzu sowie zu weiteren Fragen können Sie
          sich jederzeit an uns wenden.
        </p>
        <Sub>Recht auf Einschränkung der Verarbeitung</Sub>
        <p>
          Sie haben das Recht, die Einschränkung der Verarbeitung Ihrer
          personenbezogenen Daten zu verlangen. Hierzu können Sie sich jederzeit an
          uns wenden.
        </p>
        <Sub>SSL- bzw. TLS-Verschlüsselung</Sub>
        <p>
          Diese Seite nutzt aus Sicherheitsgründen und zum Schutz der Übertragung
          vertraulicher Inhalte eine SSL- bzw. TLS-Verschlüsselung. Eine
          verschlüsselte Verbindung erkennen Sie daran, dass die Adresszeile des
          Browsers von „http://" auf „https://" wechselt und an dem Schloss-Symbol
          in Ihrer Browserzeile. Wenn die SSL- bzw. TLS-Verschlüsselung aktiviert
          ist, können die Daten, die Sie an uns übermitteln, nicht von Dritten
          mitgelesen werden. Auch der Versand von E-Mails erfolgt
          transportverschlüsselt (TLS), soweit der empfangende Server dies
          unterstützt.
        </p>
      </section>

      {/* 4 */}
      <section className="space-y-2">
        <LegalHeading>4. Datenerfassung auf dieser Website</LegalHeading>

        <Sub>Cookies</Sub>
        <p>
          Diese Website verwendet ausschließlich ein technisch notwendiges Cookie
          für die Anmeldung (Aufrechterhaltung der Login-Sitzung / Token-Refresh,
          HttpOnly). Zusätzlich werden einige funktionale Einstellungen (z. B. der
          zuletzt geöffnete Tab und Anzeige-Optionen) im lokalen Browser-Speicher
          (localStorage) Ihres Geräts gespeichert. Es findet kein Tracking und
          keine Werbung statt; daher ist kein Cookie-Einwilligungs-Banner
          erforderlich. Rechtsgrundlage ist § 25 Abs. 2 TDDDG (unbedingt
          erforderlich) sowie Art. 6 Abs. 1 lit. f DSGVO (sicherer Betrieb des
          Logins).
        </p>

        <Sub>Server-Log-Dateien</Sub>
        <p>
          Der Provider der Seiten erhebt und speichert automatisch Informationen in
          so genannten Server-Log-Dateien, die Ihr Browser automatisch an uns
          übermittelt. Dies sind: Browsertyp und Browserversion, verwendetes
          Betriebssystem, Referrer URL, Hostname des zugreifenden Rechners, Uhrzeit
          der Serveranfrage und IP-Adresse. Eine Zusammenführung dieser Daten mit
          anderen Datenquellen wird nicht vorgenommen. Die Erfassung dieser Daten
          erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO. Der
          Websitebetreiber hat ein berechtigtes Interesse an der technisch
          fehlerfreien Darstellung und der Optimierung seiner Website.
        </p>

        <Sub>Registrierung und Nutzerkonto</Sub>
        <p>
          Für die Nutzung von cubetracker legen Sie ein Konto an. Dabei
          verarbeiten wir Ihre E-Mail-Adresse, Ihr Passwort (ausschließlich als
          kryptografischer Hash, niemals im Klartext) und optional einen
          Anzeigenamen. Zweck ist die Bereitstellung und Verwaltung Ihres Kontos.
          Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO. Diese Daten speichern wir,
          bis Sie Ihr Konto löschen.
        </p>

        <Sub>Von Ihnen erfasste Inhalte (Solves &amp; Statistiken)</Sub>
        <p>
          In Ihrem Konto speichern wir die von Ihnen erfassten Inhalte: Solves
          (Zeiten, Scrambles, Notizen, Zeitstempel), Sessions, Statistiken,
          Hardware-Angaben sowie Trainings-Fortschritt und Achievements. Dies ist
          die Kernfunktion der App. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.
          Sie können diese Daten jederzeit als JSON exportieren oder durch Löschen
          Ihres Kontos entfernen.
        </p>

        <Sub>Profil und Freunde-Funktion</Sub>
        <p>
          Optional können Sie zusätzliche Profilangaben machen: einen Anzeigenamen,
          die Sichtbarkeit für die Freunde-Funktion (Opt-in) sowie Postleitzahl und
          Land. Postleitzahl und Land nutzen wir ausschließlich, um WCA-Turniere in
          Ihrer Nähe anzuzeigen. Dafür wird Ihre Postleitzahl serverseitig über den
          Dienst OpenStreetMap-Nominatim in Koordinaten umgewandelt (mit Cache);
          Ihr Browser kontaktiert Nominatim nicht direkt. Rechtsgrundlage ist
          Art. 6 Abs. 1 lit. a (Einwilligung) bzw. lit. b DSGVO.
        </p>

        <Sub>E-Mail-Versand (Resend)</Sub>
        <p>
          Für den Versand von Verifizierungs- und Passwort-Reset-Mails sowie für
          die Bearbeitung von Feedback nutzen wir den Versanddienst Resend (Resend,
          Inc.). Dabei werden die E-Mail-Adresse und der Nachrichteninhalt
          verarbeitet. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b bzw. lit. f DSGVO.
          Mit dem Anbieter besteht, soweit erforderlich, ein Vertrag zur
          Auftragsverarbeitung.
        </p>

        <Sub>E-Mail-Empfang (Forward Email)</Sub>
        <p>
          Für den Empfang von E-Mails an unsere Kontaktadresse nutzen wir den
          Weiterleitungsdienst Forward Email (Forward Email LLC, USA). Eingehende
          Nachrichten werden an das Postfach des Verantwortlichen weitergeleitet;
          dabei werden die Absenderadresse und der Nachrichteninhalt verarbeitet.
          Forward Email ist quelloffen und speichert weitergeleitete E-Mails nicht
          dauerhaft. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (effektive
          Bearbeitung von Anfragen). Mit dem Anbieter besteht, soweit erforderlich,
          ein Vertrag zur Auftragsverarbeitung; soweit eine Übermittlung in die USA
          erfolgt, geschieht dies auf Grundlage der EU-Standardvertragsklauseln
          (Art. 46 Abs. 2 lit. c DSGVO).
        </p>

        <Sub>Kontaktformular / Feedback</Sub>
        <p>
          Wenn Sie uns über das Feedback-Formular eine Nachricht zukommen lassen,
          werden Ihre Angaben inklusive der von Ihnen angegebenen Kontaktdaten
          zwecks Bearbeitung der Anfrage und für den Fall von Anschlussfragen
          verarbeitet. Diese Daten geben wir nicht ohne Ihre Einwilligung weiter.
          Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO
          (sofern mit einem Vertrag zusammenhängend) bzw. Art. 6 Abs. 1 lit. f
          DSGVO (berechtigtes Interesse an der Bearbeitung der Anfrage).
        </p>

        <Sub>Anfrage per E-Mail</Sub>
        <p>
          Wenn Sie uns per E-Mail kontaktieren, wird Ihre Anfrage inklusive aller
          daraus hervorgehenden personenbezogenen Daten (Name, Anfrage) zum Zwecke
          der Bearbeitung Ihres Anliegens bei uns gespeichert und verarbeitet.
          Diese Daten geben wir nicht ohne Ihre Einwilligung weiter. Die
          Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO bzw.
          Art. 6 Abs. 1 lit. f DSGVO.
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
        </a>{" "}
        — ergänzt um die cubetracker-spezifischen Verarbeitungen.
      </p>
    </LegalShell>
  );
}
