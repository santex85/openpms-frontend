import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import id from "./locales/id.json";
import km from "./locales/km.json";
import ms from "./locales/ms.json";
import ru from "./locales/ru.json";
import th from "./locales/th.json";
import vi from "./locales/vi.json";

export const SUPPORTED_LANGS = [
  "ru",
  "en",
  "th",
  "vi",
  "km",
  "id",
  "ms",
] as const;

export type SupportedLang = (typeof SUPPORTED_LANGS)[number];

/** Shown in the language switcher; others stay in resources for gradual rollout. */
export const UI_SELECTABLE_LANGS = ["ru", "en"] as const;

export type UISelectableLang = (typeof UI_SELECTABLE_LANGS)[number];

export function isUISelectableLang(code: string): code is UISelectableLang {
  const base = code.split("-")[0]?.toLowerCase() ?? "";
  return base === "ru" || base === "en";
}

export const LANGUAGE_STORAGE_KEY = "openpms:lang";

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ru: { translation: ru },
      en: { translation: en },
      th: { translation: th },
      vi: { translation: vi },
      km: { translation: km },
      id: { translation: id },
      ms: { translation: ms },
    },
    fallbackLng: "ru",
    supportedLngs: [...SUPPORTED_LANGS],
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
    },
  })
  .then(() => {
    const raw = i18n.resolvedLanguage ?? i18n.language ?? "ru";
    if (!isUISelectableLang(raw)) {
      void i18n.changeLanguage("ru");
    }
  });

export default i18n;
