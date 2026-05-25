// Single-Source für die rechtlichen Pflichtangaben (Impressum + Datenschutz).
// Impressum- und Datenschutz-Seite lesen ausschliesslich hier raus.
//
// Daten ausgefüllt 2026-05-25 (Privatperson, Hobby). Bei Änderungen NUR hier.
// Kontakt datenschutz@cubetracker.de laeuft ueber Forward Email (Weiterleitung
// ans Betreiber-Postfach, verschluesselter DNS-TXT). Telefon bewusst leer.
//
// Hinweis: Die Datenschutzerklärung (DatenschutzPage.tsx) ist eine sorgfältig
// auf diese App zugeschnittene Vorlage. Vor der Veröffentlichung idealerweise
// mit einem Generator (z. B. e-recht24) oder rechtlicher Beratung abgleichen.
// Dies ist kein Rechtsrat.

export interface ImpressumData {
  name: string;
  street: string;
  zipCity: string;
  country: string;
  email: string;
  phone?: string; // optional — leer lassen, dann wird nichts angezeigt
}

export const IMPRESSUM: ImpressumData = {
  name: "Henning Fietz",
  street: "Eichendorffstraße 12g",
  zipCity: "26131 Oldenburg",
  country: "Deutschland",
  email: "datenschutz@cubetracker.de",
  phone: "",
};

// Stand der Datenschutzerklärung (bei inhaltlichen Änderungen aktualisieren).
export const DATENSCHUTZ_STAND = "Mai 2026";

// Auftragsverarbeiter / eingesetzte Dienste (im Datenschutztext referenziert).
export const HOSTING_PROVIDER =
  "Hetzner Online GmbH, Rechenzentrum Falkenstein (Deutschland, EU)";
export const EMAIL_PROVIDER = "Resend (Resend, Inc.)";

// true, solange noch Platzhalter eingetragen sind (für eine Dev-Warnung nutzbar).
export const LEGAL_DATA_INCOMPLETE = IMPRESSUM.name.startsWith("[");
