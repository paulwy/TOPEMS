import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enTranslation from "./locales/en.json";
import zhTranslation from "./locales/zh.json";

const resources = {
  en: {
    translation: enTranslation,
  },
  zh: {
    translation: zhTranslation,
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: "zh",
  fallbackLng: "zh",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
export const SUPPORTED_LANGUAGES = [
  { code: "zh", name: "中文", flag: "CN" },
  { code: "en", name: "English", flag: "US" },
] as const;
export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];
