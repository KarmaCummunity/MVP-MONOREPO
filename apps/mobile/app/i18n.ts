import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
// Safe import for expo-localization to avoid native module crash on platforms/builds where it's not linked
let Localization: any;
try {
   
  Localization = require('expo-localization');
} catch (error) {
  Localization = null;
}
import { I18nManager } from 'react-native';

// Load unified resources per language
import he_all from '../locales/he.json';
import en_all from '../locales/en.json';

const resources = {
  he: he_all as any,
  en: en_all as any,
};

const initialLang = 'he';

if (I18nManager.isRTL !== (initialLang === 'he')) {
  I18nManager.allowRTL(initialLang === 'he');
  I18nManager.forceRTL(initialLang === 'he');
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLang,
    fallbackLng: 'en',
    ns: ['common', 'home', 'profile', 'donations', 'notifications', 'auth', 'errors', 'buttons', 'labels', 'settings', 'comments', 'search', 'bookmarks', 'trump', 'chat', 'landing', 'quickMessage'],
    defaultNS: 'common',
    compatibilityJSON: 'v4',
    interpolation: {
      escapeValue: false,
    },
    returnEmptyString: false,
  });

export default i18n;