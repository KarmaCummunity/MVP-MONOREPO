import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
// Safe import for expo-localization to avoid native module crash on platforms/builds where it's not linked
type ExpoLocalizationModule = typeof import('expo-localization') | null;
let _Localization: ExpoLocalizationModule = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- optional native module
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
import en_donationResources from '../locales/en/donationResources.json';
import en_discover from '../locales/en/discover.json';

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
import he_donationResources from '../locales/he/donationResources.json';
import he_discover from '../locales/he/discover.json';

/** Locale namespace: key-value map of translation keys to strings */
type LocaleNamespace = Record<string, unknown>;

const resources: Record<string, Record<string, LocaleNamespace>> = {
  en: {
    admin: en_admin as LocaleNamespace,
    auth: en_auth as LocaleNamespace,
    bookmarks: en_bookmarks as LocaleNamespace,
    buttons: en_buttons as LocaleNamespace,
    challenges: en_challenges as LocaleNamespace,
    chat: en_chat as LocaleNamespace,
    comments: en_comments as LocaleNamespace,
    common: en_common as LocaleNamespace,
    donations: en_donations as LocaleNamespace,
    dropdown: en_dropdown as LocaleNamespace,
    errorBoundary: en_errorBoundary as LocaleNamespace,
    errors: en_errors as LocaleNamespace,
    home: en_home as LocaleNamespace,
    items: en_items as LocaleNamespace,
    labels: en_labels as LocaleNamespace,
    donationResources: en_donationResources as LocaleNamespace,
    discover: en_discover as LocaleNamespace,
    landing: en_landing as LocaleNamespace,
    newChatScreen: en_newChatScreen as LocaleNamespace,
    notifications: en_notifications as LocaleNamespace,
    profile: en_profile as LocaleNamespace,
    quickMessage: en_quickMessage as LocaleNamespace,
    rides: en_rides as LocaleNamespace,
    search: en_search as LocaleNamespace,
    settings: en_settings as LocaleNamespace,
    trump: en_trump as LocaleNamespace,
    webOverlay: en_webOverlay as LocaleNamespace,
  },
  he: {
    admin: he_admin as LocaleNamespace,
    auth: he_auth as LocaleNamespace,
    bookmarks: he_bookmarks as LocaleNamespace,
    buttons: he_buttons as LocaleNamespace,
    challenges: he_challenges as LocaleNamespace,
    chat: he_chat as LocaleNamespace,
    comments: he_comments as LocaleNamespace,
    common: he_common as LocaleNamespace,
    donations: he_donations as LocaleNamespace,
    dropdown: he_dropdown as LocaleNamespace,
    errorBoundary: he_errorBoundary as LocaleNamespace,
    errors: he_errors as LocaleNamespace,
    home: he_home as LocaleNamespace,
    items: he_items as LocaleNamespace,
    labels: he_labels as LocaleNamespace,
    donationResources: he_donationResources as LocaleNamespace,
    discover: he_discover as LocaleNamespace,
    landing: he_landing as LocaleNamespace,
    newChatScreen: he_newChatScreen as LocaleNamespace,
    notifications: he_notifications as LocaleNamespace,
    profile: he_profile as LocaleNamespace,
    quickMessage: he_quickMessage as LocaleNamespace,
    rides: he_rides as LocaleNamespace,
    search: he_search as LocaleNamespace,
    settings: he_settings as LocaleNamespace,
    trump: he_trump as LocaleNamespace,
    webOverlay: he_webOverlay as LocaleNamespace,
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
    ns: ['common', 'home', 'profile', 'donations', 'donationResources', 'discover', 'notifications', 'auth', 'errors', 'buttons', 'labels', 'settings', 'comments', 'search', 'bookmarks', 'trump', 'chat', 'landing', 'quickMessage', 'challenges', 'admin', 'errorBoundary', 'dropdown', 'items', 'newChatScreen', 'rides', 'webOverlay'],
    defaultNS: 'common',
    compatibilityJSON: 'v4',
    interpolation: {
      escapeValue: false,
    },
    returnEmptyString: false,
  });

export default i18n;
