"""Haversine-Distance + Helpers (Phase W.wca-comps).

Pure Funktionen, kein DB-Zugriff, kein HTTP — testbar ohne Mocks.
"""

from __future__ import annotations

from math import asin, cos, radians, sin, sqrt

EARTH_RADIUS_KM = 6371.0


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Grosskreis-Distanz zwischen zwei Lat/Lng-Punkten in Kilometern.

    Genauigkeit: ca. 0.5% (Erde ist nicht perfekt sphaerisch). Für
    „Turniere in 200km Entfernung"-Filter mehr als ausreichend.
    """
    rlat1, rlat2 = radians(lat1), radians(lat2)
    dlat = radians(lat2 - lat1)
    dlng = radians(lng2 - lng1)
    a = sin(dlat / 2) ** 2 + cos(rlat1) * cos(rlat2) * sin(dlng / 2) ** 2
    c = 2 * asin(sqrt(a))
    return EARTH_RADIUS_KM * c


# Nachbarländer-Mapping (Phase W.wca-neighbors, 2026-05-16):
# Welche Länder bekommt ein User zu sehen, basierend auf seinem
# Profil-Land? „In der Nähe" heisst praktisch: eigenes Land + direkt
# angrenzende. Aktuell nur für DACH definiert — andere User sehen
# nur ihr eigenes Land. Später erweiterbar pro Bedarf.
NEIGHBORING_COUNTRIES: dict[str, list[str]] = {
    # Deutschland: alle direkten Landgrenzen
    "DE": ["DE", "AT", "CH", "NL", "BE", "LU", "FR", "DK", "PL", "CZ"],
    # Oesterreich: Nachbarn inkl. DE (User-Wunsch: DACH-Region zusammen)
    "AT": ["AT", "DE", "CH", "IT", "SI", "HU", "SK", "CZ", "LI"],
    # Schweiz: Nachbarn inkl. DE
    "CH": ["CH", "DE", "AT", "FR", "IT", "LI"],
}


def countries_with_neighbors(country_iso2: str | None) -> list[str]:
    """Liefert User-Land + direkte Nachbarn (wenn bekannt), sonst nur User-Land.

    Beispiel: DE -> [DE, AT, CH, NL, BE, LU, FR, DK, PL, CZ].
    Unknown country -> [country] oder [] wenn None.
    """
    if not country_iso2:
        return []
    upper = country_iso2.upper()
    return NEIGHBORING_COUNTRIES.get(upper, [upper])


def detect_country_from_postal_code(postal_code: str) -> str | None:
    """Heuristische Erkennung des Landes aus der Postleitzahl-Struktur.

    Kein Locking — User kann im Profil manuell ein Land setzen wenn das mal
    relevant wird. Hier nur Best-Effort Default für Nominatim-Lookup.

    Aktuell unterstützte Heuristiken (DACH-Fokus):
      - 5-stellige numerische PLZ ohne Leerzeichen → DE
      - 4-stellige numerische PLZ → AT oder CH (Default AT, weil
        OpenStreetMap die meisten AT-PLZs besser indexiert hat als CH)
      - Kein Match → None (Caller lässt country_iso2 frei → Nominatim sucht weltweit)

    Hinweis: das ist KEINE perfekte Disambiguierung. CH 4-stellige PLZs
    wie 8001 (Zuerich) werden fälschlich als AT erkannt. Realistisch ist
    DE 99% der User → akzeptables Restrisiko bis User-Profil ein
    `country_iso2`-Feld bekommt.
    """
    cleaned = postal_code.strip().replace(" ", "")
    if not cleaned.isdigit():
        return None
    if len(cleaned) == 5:
        return "DE"
    if len(cleaned) == 4:
        return "AT"
    return None
