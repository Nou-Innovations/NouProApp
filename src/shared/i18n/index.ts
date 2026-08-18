/**
 * Translation setup. English and French.
 *
 * Everything that touches i18next lives in this folder, so the rest of the app imports
 * `t` and `useTranslation` from here and nothing else needs to know what's underneath.
 *
 * ── Why the polyfill, and why it must be imported first ──────────────────────────
 * i18next chooses singular vs plural through `Intl.PluralRules`. Hermes ships `Intl`
 * with real locale data — but only `Collator`, `DateTimeFormat` and `NumberFormat`;
 * `PluralRules` is absent (verified against the binary in ios/Pods, not assumed). Without
 * the polyfill every plural silently resolves to the "other" form, which reads fine in
 * English and wrong in French. `should-polyfill` installs it only where it's missing, so
 * this costs nothing on a runtime that already has it.
 */

// Import order matters: the polyfill has to be in place before i18next reads Intl.
import { shouldPolyfill } from '@formatjs/intl-pluralrules/should-polyfill.js';

if (shouldPolyfill()) {
  require('@formatjs/intl-pluralrules/polyfill-force.js');
  require('@formatjs/intl-pluralrules/locale-data/en');
  require('@formatjs/intl-pluralrules/locale-data/fr');
}

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import type { Language } from '@/shared/types/user';

import en from './locales/en.json';
import fr from './locales/fr.json';

/** App language code → i18next resource key. */
const RESOURCE_KEY: Record<Language, string> = { EN: 'en', FR: 'fr' };

/**
 * The device's language, when we support it.
 *
 * Only consulted the first time — once someone has chosen in Settings, that choice wins
 * even if they later change their phone's language. `getLocales()` is ordered by the
 * user's own preference list, so the first supported hit is the right answer.
 */
export function deviceLanguage(): Language | null {
  try {
    for (const locale of getLocales()) {
      const code = (locale.languageCode || '').toLowerCase();
      if (code === 'fr') return 'FR';
      if (code === 'en') return 'EN';
    }
  } catch {
    // Locale lookup is best-effort; English is a fine answer.
  }
  return null;
}

let initialised = false;

/** Start i18next. Safe to call more than once. */
export function initI18n(language: Language): void {
  if (initialised) {
    setI18nLanguage(language);
    return;
  }
  initialised = true;

  i18n.use(initReactI18next).init({
    // `resources` are bundled rather than fetched: the app must render correctly
    // offline and on first paint, before any network call.
    resources: {
      en: { translation: en },
      fr: { translation: fr },
    },
    lng: RESOURCE_KEY[language] || 'en',
    // Any key not yet translated renders its English text instead of a blank or a raw
    // key. This is what lets French land one line at a time rather than all at once.
    fallbackLng: 'en',
    // React already escapes everything it renders; i18next escaping on top of that
    // turns an apostrophe into `&#39;` on screen.
    interpolation: { escapeValue: false },
    returnNull: false,
  });
}

/** Switch language at runtime. Components re-render; no reload needed. */
export function setI18nLanguage(language: Language): void {
  const key = RESOURCE_KEY[language] || 'en';
  if (i18n.language !== key) void i18n.changeLanguage(key);
}

export { useTranslation, Trans } from 'react-i18next';
export default i18n;

/**
 * Translate outside a component — services, stores, `AppAlert` calls.
 *
 * Prefer `useTranslation()` inside components: this reads the language at call time, so
 * a string captured into a variable won't update when the language changes.
 */
export const t = i18n.t;
