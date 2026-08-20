import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import es from './locales/es.json';
import en from './locales/en.json';
import de from './locales/de.json';
import pt from './locales/pt.json';
import ca from './locales/ca.json';
import fr from './locales/fr.json';
import it from './locales/it.json';
import el from './locales/el.json';
import ru from './locales/ru.json';
import ar from './locales/ar.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      es: { translation: es },
      en: { translation: en },
      de: { translation: de },
      pt: { translation: pt },
      ca: { translation: ca },
      fr: { translation: fr },
      it: { translation: it },
      el: { translation: el },
      ru: { translation: ru },
      ar: { translation: ar }
    },
    fallbackLng: 'es',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    }
  });

export default i18n;
