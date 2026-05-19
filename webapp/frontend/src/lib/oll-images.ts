// OLL-Visualisierung — Bilder-Map (Phase 8.3.1).
//
// 57 statische PNG-Imports aus src/assets/oll/. Vite bundled die
// automatisch + liefert URL-strings. So wird jedes Bild garantiert
// ins production-build geschnitten und tree-shaking-fest referenziert.
//
// Bild-Quelle: User-generierte OLL-Icons (Konvention: 9 Top-Stickers
// + 12 Side-Indicators, gelb=oriented, grau=not). Dark-Theme-konform.
//
// PLL-Bilder fehlen aktuell — siehe Phase 8.3.2 (TODO).

import oll01 from '../assets/oll/OLL_01.png';
import oll02 from '../assets/oll/OLL_02.png';
import oll03 from '../assets/oll/OLL_03.png';
import oll04 from '../assets/oll/OLL_04.png';
import oll05 from '../assets/oll/OLL_05.png';
import oll06 from '../assets/oll/OLL_06.png';
import oll07 from '../assets/oll/OLL_07.png';
import oll08 from '../assets/oll/OLL_08.png';
import oll09 from '../assets/oll/OLL_09.png';
import oll10 from '../assets/oll/OLL_10.png';
import oll11 from '../assets/oll/OLL_11.png';
import oll12 from '../assets/oll/OLL_12.png';
import oll13 from '../assets/oll/OLL_13.png';
import oll14 from '../assets/oll/OLL_14.png';
import oll15 from '../assets/oll/OLL_15.png';
import oll16 from '../assets/oll/OLL_16.png';
import oll17 from '../assets/oll/OLL_17.png';
import oll18 from '../assets/oll/OLL_18.png';
import oll19 from '../assets/oll/OLL_19.png';
import oll20 from '../assets/oll/OLL_20.png';
import oll21 from '../assets/oll/OLL_21.png';
import oll22 from '../assets/oll/OLL_22.png';
import oll23 from '../assets/oll/OLL_23.png';
import oll24 from '../assets/oll/OLL_24.png';
import oll25 from '../assets/oll/OLL_25.png';
import oll26 from '../assets/oll/OLL_26.png';
import oll27 from '../assets/oll/OLL_27.png';
import oll28 from '../assets/oll/OLL_28.png';
import oll29 from '../assets/oll/OLL_29.png';
import oll30 from '../assets/oll/OLL_30.png';
import oll31 from '../assets/oll/OLL_31.png';
import oll32 from '../assets/oll/OLL_32.png';
import oll33 from '../assets/oll/OLL_33.png';
import oll34 from '../assets/oll/OLL_34.png';
import oll35 from '../assets/oll/OLL_35.png';
import oll36 from '../assets/oll/OLL_36.png';
import oll37 from '../assets/oll/OLL_37.png';
import oll38 from '../assets/oll/OLL_38.png';
import oll39 from '../assets/oll/OLL_39.png';
import oll40 from '../assets/oll/OLL_40.png';
import oll41 from '../assets/oll/OLL_41.png';
import oll42 from '../assets/oll/OLL_42.png';
import oll43 from '../assets/oll/OLL_43.png';
import oll44 from '../assets/oll/OLL_44.png';
import oll45 from '../assets/oll/OLL_45.png';
import oll46 from '../assets/oll/OLL_46.png';
import oll47 from '../assets/oll/OLL_47.png';
import oll48 from '../assets/oll/OLL_48.png';
import oll49 from '../assets/oll/OLL_49.png';
import oll50 from '../assets/oll/OLL_50.png';
import oll51 from '../assets/oll/OLL_51.png';
import oll52 from '../assets/oll/OLL_52.png';
import oll53 from '../assets/oll/OLL_53.png';
import oll54 from '../assets/oll/OLL_54.png';
import oll55 from '../assets/oll/OLL_55.png';
import oll56 from '../assets/oll/OLL_56.png';
import oll57 from '../assets/oll/OLL_57.png';

/**
 * Map: case-id ("OLL-1" .. "OLL-57") → Bild-URL.
 * Liefert null für unbekannte oder noch nicht abgedeckte Cases.
 */
export const OLL_IMAGES: Record<string, string> = {
  'OLL-1': oll01,
  'OLL-2': oll02,
  'OLL-3': oll03,
  'OLL-4': oll04,
  'OLL-5': oll05,
  'OLL-6': oll06,
  'OLL-7': oll07,
  'OLL-8': oll08,
  'OLL-9': oll09,
  'OLL-10': oll10,
  'OLL-11': oll11,
  'OLL-12': oll12,
  'OLL-13': oll13,
  'OLL-14': oll14,
  'OLL-15': oll15,
  'OLL-16': oll16,
  'OLL-17': oll17,
  'OLL-18': oll18,
  'OLL-19': oll19,
  'OLL-20': oll20,
  'OLL-21': oll21,
  'OLL-22': oll22,
  'OLL-23': oll23,
  'OLL-24': oll24,
  'OLL-25': oll25,
  'OLL-26': oll26,
  'OLL-27': oll27,
  'OLL-28': oll28,
  'OLL-29': oll29,
  'OLL-30': oll30,
  'OLL-31': oll31,
  'OLL-32': oll32,
  'OLL-33': oll33,
  'OLL-34': oll34,
  'OLL-35': oll35,
  'OLL-36': oll36,
  'OLL-37': oll37,
  'OLL-38': oll38,
  'OLL-39': oll39,
  'OLL-40': oll40,
  'OLL-41': oll41,
  'OLL-42': oll42,
  'OLL-43': oll43,
  'OLL-44': oll44,
  'OLL-45': oll45,
  'OLL-46': oll46,
  'OLL-47': oll47,
  'OLL-48': oll48,
  'OLL-49': oll49,
  'OLL-50': oll50,
  'OLL-51': oll51,
  'OLL-52': oll52,
  'OLL-53': oll53,
  'OLL-54': oll54,
  'OLL-55': oll55,
  'OLL-56': oll56,
  'OLL-57': oll57,
}

export function getOllImage(caseId: string): string | null {
  return OLL_IMAGES[caseId] ?? null;
}
