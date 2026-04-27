import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
// Safe import for expo-localization to avoid native module crash on platforms/builds where it's not linked
let _Localization: any;
try {
  _Localization = require('expo-localization');
} catch (_err) {
  _Localization = null;
}
import { I18nManager } from 'react-native';

// Load unified resources per language
import he from '../locales/he';
import en from '../locales/en';

const resources = {
  he: he as any,
  en: en as any,
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
    ns: ['common', 'home', 'profile', 'donations', 'notifications', 'auth', 'errors', 'buttons', 'labels', 'settings', 'comments', 'search', 'bookmarks', 'trump', 'chat', 'landing', 'quickMessage', 'challenges', 'postDetail'],
    defaultNS: 'common',
    compatibilityJSON: 'v4',
    interpolation: {
      escapeValue: false,
    },
    returnEmptyString: false,
  });

export default i18n;