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

// Load split resources per namespace (locales/{lang}/{namespace}.json)
import en_admin from '../locales/en/admin.json';
import en_auth from '../locales/en/auth.json';
import en_bookmarks from '../locales/en/bookmarks.json';
import en_buttons from '../locales/en/buttons.json';
import en_challenges from '../locales/en/challenges.json';
import en_chat from '../locales/en/chat.json';
import en_comments from '../locales/en/comments.json';
import en_common from '../locales/en/common.json';
import en_donations from '../locales/en/donations.json';
import en_dropdown from '../locales/en/dropdown.json';
import en_errorBoundary from '../locales/en/errorBoundary.json';
import en_errors from '../locales/en/errors.json';
import en_home from '../locales/en/home.json';
import en_items from '../locales/en/items.json';
import en_landing from '../locales/en/landing.json';
import en_newChatScreen from '../locales/en/newChatScreen.json';
import en_notifications from '../locales/en/notifications.json';
import en_profile from '../locales/en/profile.json';
import en_quickMessage from '../locales/en/quickMessage.json';
import en_rides from '../locales/en/rides.json';
import en_search from '../locales/en/search.json';
import en_settings from '../locales/en/settings.json';
import en_trump from '../locales/en/trump.json';
import en_webOverlay from '../locales/en/webOverlay.json';
import en_labels from '../locales/en/labels.json';

import he_admin from '../locales/he/admin.json';
import he_auth from '../locales/he/auth.json';
import he_bookmarks from '../locales/he/bookmarks.json';
import he_buttons from '../locales/he/buttons.json';
import he_challenges from '../locales/he/challenges.json';
import he_chat from '../locales/he/chat.json';
import he_comments from '../locales/he/comments.json';
import he_common from '../locales/he/common.json';
import he_donations from '../locales/he/donations.json';
import he_dropdown from '../locales/he/dropdown.json';
import he_errorBoundary from '../locales/he/errorBoundary.json';
import he_errors from '../locales/he/errors.json';
import he_home from '../locales/he/home.json';
import he_items from '../locales/he/items.json';
import he_landing from '../locales/he/landing.json';
import he_newChatScreen from '../locales/he/newChatScreen.json';
import he_notifications from '../locales/he/notifications.json';
import he_profile from '../locales/he/profile.json';
import he_quickMessage from '../locales/he/quickMessage.json';
import he_rides from '../locales/he/rides.json';
import he_search from '../locales/he/search.json';
import he_settings from '../locales/he/settings.json';
import he_trump from '../locales/he/trump.json';
import he_webOverlay from '../locales/he/webOverlay.json';
import he_labels from '../locales/he/labels.json';

const resources = {
  en: {
    admin: en_admin as any,
    auth: en_auth as any,
    bookmarks: en_bookmarks as any,
    buttons: en_buttons as any,
    challenges: en_challenges as any,
    chat: en_chat as any,
    comments: en_comments as any,
    common: en_common as any,
    donations: en_donations as any,
    dropdown: en_dropdown as any,
    errorBoundary: en_errorBoundary as any,
    errors: en_errors as any,
    home: en_home as any,
    items: en_items as any,
    labels: en_labels as any,
    landing: en_landing as any,
    newChatScreen: en_newChatScreen as any,
    notifications: en_notifications as any,
    profile: en_profile as any,
    quickMessage: en_quickMessage as any,
    rides: en_rides as any,
    search: en_search as any,
    settings: en_settings as any,
    trump: en_trump as any,
    webOverlay: en_webOverlay as any,
  },
  he: {
    admin: he_admin as any,
    auth: he_auth as any,
    bookmarks: he_bookmarks as any,
    buttons: he_buttons as any,
    challenges: he_challenges as any,
    chat: he_chat as any,
    comments: he_comments as any,
    common: he_common as any,
    donations: he_donations as any,
    dropdown: he_dropdown as any,
    errorBoundary: he_errorBoundary as any,
    errors: he_errors as any,
    home: he_home as any,
    items: he_items as any,
    labels: he_labels as any,
    landing: he_landing as any,
    newChatScreen: he_newChatScreen as any,
    notifications: he_notifications as any,
    profile: he_profile as any,
    quickMessage: he_quickMessage as any,
    rides: he_rides as any,
    search: he_search as any,
    settings: he_settings as any,
    trump: he_trump as any,
    webOverlay: he_webOverlay as any,
  },
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
    ns: ['common', 'home', 'profile', 'donations', 'notifications', 'auth', 'errors', 'buttons', 'labels', 'settings', 'comments', 'search', 'bookmarks', 'trump', 'chat', 'landing', 'quickMessage', 'challenges', 'admin', 'errorBoundary', 'dropdown', 'items', 'newChatScreen', 'rides', 'webOverlay'],
    defaultNS: 'common',
    compatibilityJSON: 'v4',
    interpolation: {
      escapeValue: false,
    },
    returnEmptyString: false,
  });

export default i18n;
