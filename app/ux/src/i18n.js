import i18n from "i18next";
import en from "./i18n/en"
import fr from "./i18n/fr"
import { initReactI18next } from "react-i18next";

// the translations
// (tip move them in a JSON file and import them)
const resources = {
    en: {
        translation: en
    },
    fr: {
        translation: fr
    }
};

i18n
    .use(initReactI18next) // passes i18n down to react-i18next
    .init({
        resources,
        lng: "fr",

        keySeparator: false, // we do not use keys in form messages.welcome
        debug: false,
        interpolation: {
            escapeValue: false // react already safes from xss
        }
    });

export default i18n;