/** Sprachen, lokalisierte Routen und Wörterbücher. */
import { de, type Dictionary } from './de';
import { en } from './en';
import { es } from './es';

export const LOCALES = ['de', 'en', 'es'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'de';
export const LOCALE_NAMES: Record<Locale, string> = { de: 'Deutsch', en: 'English', es: 'Español' };
export const OG_LOCALES: Record<Locale, string> = { de: 'de_DE', en: 'en_GB', es: 'es_ES' };

export const PAGES = ['today', 'drinks', 'visit', 'group', 'gallery'] as const;
export type PageKey = (typeof PAGES)[number];

/** Lokalisierte URL-Segmente. Leerer Wert = Startseite der Sprache. */
export const SLUGS: Record<Locale, Record<PageKey, string>> = {
  de: { today: '', drinks: 'drinks', visit: 'besuch', group: 'gruppe', gallery: 'galerie' },
  en: { today: '', drinks: 'drinks', visit: 'visit', group: 'group', gallery: 'gallery' },
  es: { today: '', drinks: 'bebidas', visit: 'visita', group: 'grupo', gallery: 'galeria' },
};

const dictionaries: Record<Locale, Dictionary> = { de, en, es };
export const dictionary = (locale: Locale): Dictionary => dictionaries[locale];
export type { Dictionary };

export const isLocale = (value: unknown): value is Locale => typeof value === 'string' && (LOCALES as readonly string[]).includes(value);

/** Pfad ohne Basis, immer mit abschließendem Schrägstrich: /de/besuch/ */
export function pagePath(locale: Locale, page: PageKey): string {
  const slug = SLUGS[locale][page];
  return slug ? `/${locale}/${slug}/` : `/${locale}/`;
}

/** Findet Seite und Sprache zu einem Pfad ohne Basis. */
export function matchPath(path: string): { locale: Locale; page: PageKey } | null {
  const [first, second, ...rest] = path.split('/').filter(Boolean);
  if (!isLocale(first) || rest.length > 0) return null;
  const page = PAGES.find((key) => SLUGS[first][key] === (second ?? ''));
  return page ? { locale: first, page } : null;
}

/** Ersetzt {platzhalter} in einem Text. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}

/** Beste Sprache aus Browser-Vorgaben, sonst Standardsprache. */
export function pickLocale(candidates: readonly (string | null | undefined)[]): Locale {
  for (const candidate of candidates) {
    const short = candidate?.toLowerCase().split('-')[0];
    if (isLocale(short)) return short;
  }
  return DEFAULT_LOCALE;
}

/** V3 nutzte Hash-Routen (#heute, #drinks, #besuch) und gallery.html. */
export const LEGACY_HASHES: Record<string, PageKey> = {
  heute: 'today',
  drinks: 'drinks',
  besuch: 'visit',
  galerie: 'gallery',
  gruppe: 'group',
};
