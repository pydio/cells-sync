/**
 * Copyright 2019 Abstrium SAS
 *
 *  This file is part of Cells Sync.
 *
 *  Cells Sync is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  Cells Sync is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with Cells Sync.  If not, see <https://www.gnu.org/licenses/>.
 */
import i18n from "i18next";
import en from "./i18n/en"
import fr from "./i18n/fr"
import de from "./i18n/de"
import { initReactI18next } from "react-i18next";

// the translations
// (tip move them in a JSON file and import them)
const resources = {
    en: {
        translation: en
    },
    fr: {
        translation: fr
    },
    de: {
        translation: de
    }
};
let local = localStorage.getItem('language');
if(!local || (local !== 'fr' && local !== 'en' && local !== 'de')){
    local = 'en'
}
i18n
    .use(initReactI18next) // passes i18n down to react-i18next
    .init({
        resources,
        lng: local,

        keySeparator: false, // we do not use keys in form messages.welcome
        debug: false,
        interpolation: {
            escapeValue: false // react already safes from xss
        }
    });

export default i18n;