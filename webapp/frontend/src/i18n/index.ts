// i18n-Setup mit react-i18next.
//
// W.i18n-setup (2026-05-27, Turnier-Sprint): Englisch-Variante fuer das
// WCA-Turnier-Demo in Meppel (30.05.). Browser-Sprach-Auto-Detect mit
// localStorage-Override, Switcher liegt im UserMenu.
//
// Konvention:
//   - Resources liegen in locales/{de,en}.json als nested namespaces
//     (common.*, tabs.*, userMenu.*, ...).
//   - Komponenten ziehen Strings mit useTranslation()'s t('namespace.key').
//   - Default = browser-Sprache via LanguageDetector mit Fallback de.
//   - i18nextLng-Key in localStorage persistiert die Wahl ueber Reloads.
//
// Patch-Notes-History wird absichtlich NICHT uebersetzt (deutsch in
// data.py). Lange Achievement-Long-Descs + Trainer-Tutorial-Texte
// kommen in einer spaeteren Welle.

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import de from "./locales/de.json";
import en from "./locales/en.json";

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      de: { translation: de },
      en: { translation: en },
    },
    fallbackLng: "de",
    supportedLngs: ["de", "en"],
    interpolation: { escapeValue: false },
    detection: {
      // Reihenfolge: explizite User-Wahl (localStorage) hat Vorrang,
      // dann Browser-Sprache, dann fallbackLng.
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "cubetracker_language",
    },
  });

export default i18n;
