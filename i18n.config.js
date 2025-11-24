import * as Localization from "expo-localization";
import i18next from "i18next";
import { initReactI18next } from "react-i18next";

const getLanguage = () => {
  const locales = Localization.getLocales();
  return locales[0].languageCode;
};

const resources = {
  en: {
    translation: {
      main: require("./i18n/en/main.json"),
      scanner: require("./i18n/en/scanner.json"),
      settings: require("./i18n/en/settings.json"),
      misc: require("./i18n/en/misc.json"),
      credentials: require("./i18n/en/credentials.json"),
      about: require("./i18n/en/about.json"),
    },
  },
  pt: {
    translation: {
      main: require("./i18n/pt/main.json"),
      scanner: require("./i18n/pt/scanner.json"),
      settings: require("./i18n/pt/settings.json"),
      misc: require("./i18n/pt/misc.json"),
      credentials: require("./i18n/pt/credentials.json"),
      about: require("./i18n/pt/about.json"),
    },
  },
};

i18next.use(initReactI18next).init({
  debug: __DEV__,
  resources,
  lng: getLanguage() ?? "pt",
  lazy: true,
  supportedLngs: ["en", "pt"],
  compatibilityJSON: "v3",
  fallbackLng: "pt",
  interpolation: {
    escapeValue: false,
  },
});

export default i18next;
