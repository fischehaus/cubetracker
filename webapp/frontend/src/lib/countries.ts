// ISO-3166-1-alpha-2-Country-Liste (Phase W.country-feld, 2026-05-16).
//
// Curated Subset der relevantesten Cuber-Laender — fokussiert auf
// EU, Nordamerika, große asiatische Cube-Communities. Sortiert nach
// deutscher Bezeichnung (Browser-Locale-agnostisch).
//
// Falls ein User sein Land nicht in der Liste findet: einfach via
// PATCH /auth/me mit beliebigem ISO-Code setzen. Frontend-Dropdown
// kann sicher erweitert werden, ohne Backend-Änderung.

export interface Country {
  iso2: string; // ISO-3166-1-alpha-2 (e.g. "DE")
  label: string; // Deutscher Name (e.g. "Deutschland")
}

/**
 * Wichtigste Cuber-Laender, alphabetisch nach dt. Bezeichnung.
 *
 * Quelle: WCA aktive Laender + EU + große Cubing-Communities.
 * Liste ist keine offizielle Quelle, kann jederzeit erweitert werden.
 */
export const COUNTRIES: Country[] = [
  { iso2: "EG", label: "Aegypten" },
  { iso2: "AR", label: "Argentinien" },
  { iso2: "AU", label: "Australien" },
  { iso2: "BE", label: "Belgien" },
  { iso2: "BR", label: "Brasilien" },
  { iso2: "BG", label: "Bulgarien" },
  { iso2: "CL", label: "Chile" },
  { iso2: "CN", label: "China" },
  { iso2: "CR", label: "Costa Rica" },
  { iso2: "DK", label: "Daenemark" },
  { iso2: "DE", label: "Deutschland" },
  { iso2: "DO", label: "Dominikanische Republik" },
  { iso2: "EE", label: "Estland" },
  { iso2: "FI", label: "Finnland" },
  { iso2: "FR", label: "Frankreich" },
  { iso2: "GR", label: "Griechenland" },
  { iso2: "GB", label: "Grossbritannien" },
  { iso2: "HK", label: "Hongkong" },
  { iso2: "IN", label: "Indien" },
  { iso2: "ID", label: "Indonesien" },
  { iso2: "IE", label: "Irland" },
  { iso2: "IS", label: "Island" },
  { iso2: "IL", label: "Israel" },
  { iso2: "IT", label: "Italien" },
  { iso2: "JP", label: "Japan" },
  { iso2: "CA", label: "Kanada" },
  { iso2: "KZ", label: "Kasachstan" },
  { iso2: "CO", label: "Kolumbien" },
  { iso2: "HR", label: "Kroatien" },
  { iso2: "LV", label: "Lettland" },
  { iso2: "LI", label: "Liechtenstein" },
  { iso2: "LT", label: "Litauen" },
  { iso2: "LU", label: "Luxemburg" },
  { iso2: "MY", label: "Malaysia" },
  { iso2: "MT", label: "Malta" },
  { iso2: "MA", label: "Marokko" },
  { iso2: "MX", label: "Mexiko" },
  { iso2: "NZ", label: "Neuseeland" },
  { iso2: "NL", label: "Niederlande" },
  { iso2: "NO", label: "Norwegen" },
  { iso2: "AT", label: "Oesterreich" },
  { iso2: "PE", label: "Peru" },
  { iso2: "PH", label: "Philippinen" },
  { iso2: "PL", label: "Polen" },
  { iso2: "PT", label: "Portugal" },
  { iso2: "RO", label: "Rumaenien" },
  { iso2: "RU", label: "Russland" },
  { iso2: "SE", label: "Schweden" },
  { iso2: "CH", label: "Schweiz" },
  { iso2: "SG", label: "Singapur" },
  { iso2: "SK", label: "Slowakei" },
  { iso2: "SI", label: "Slowenien" },
  { iso2: "ES", label: "Spanien" },
  { iso2: "ZA", label: "Suedafrika" },
  { iso2: "KR", label: "Suedkorea" },
  { iso2: "TW", label: "Taiwan" },
  { iso2: "TH", label: "Thailand" },
  { iso2: "CZ", label: "Tschechien" },
  { iso2: "TR", label: "Tuerkei" },
  { iso2: "UA", label: "Ukraine" },
  { iso2: "HU", label: "Ungarn" },
  { iso2: "AE", label: "Vereinigte Arabische Emirate" },
  { iso2: "US", label: "Vereinigte Staaten" },
  { iso2: "VE", label: "Venezuela" },
  { iso2: "VN", label: "Vietnam" },
];

/** Returns label for an ISO code, or the code itself as fallback. */
export function countryLabel(iso2: string | null | undefined): string {
  if (!iso2) return "";
  const upper = iso2.toUpperCase();
  return COUNTRIES.find((c) => c.iso2 === upper)?.label ?? upper;
}
