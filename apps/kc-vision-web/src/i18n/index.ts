import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import he from './locales/he.json'

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      he: { translation: he },
      en: { translation: en },
    },
    fallbackLng: 'he',
    interpolation: { escapeValue: false },
  })

export function setDocumentDirection(lng: string) {
  document.documentElement.lang = lng
  document.documentElement.dir = lng === 'he' ? 'rtl' : 'ltr'
}

i18n.on('languageChanged', (lng) => setDocumentDirection(lng))
setDocumentDirection(i18n.language || 'he')

export default i18n
