/** Filter- und Formatlogik der Getränkekarte (ohne DOM). */
import type { Drink } from './content/schema';
import type { Taste } from './tastes';
import { formatLongDate, intlLocale } from './time';

export interface MenuFilter {
  query: string;
  category: string | null;
  alcoholFree: boolean;
  taste: Taste | null;
}

export const emptyFilter = (): MenuFilter => ({ query: '', category: null, alcoholFree: false, taste: null });

/** Vergleichsform: Kleinbuchstaben, ohne Akzente (ñ → n, ü → u), ß → ss. */
export const normalize = (value: string): string =>
  value
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();

export function searchText(drink: Drink, locale: 'de' | 'en' | 'es'): string {
  return normalize([drink.name[locale], drink.description?.[locale] ?? '', ...drink.ingredients.map((i) => i[locale])].join(' '));
}

/** Suchindex eines Drinks – so liegt er auch als data-Attribute im HTML. */
export interface MenuEntry {
  category: string;
  alcoholFree: boolean;
  tastes: readonly string[];
  haystack: string;
}

export const toEntry = (drink: Drink, locale: 'de' | 'en' | 'es'): MenuEntry => ({
  category: drink.category,
  alcoholFree: drink.alcoholFree,
  tastes: drink.tastes,
  haystack: searchText(drink, locale),
});

export function matchesEntry(entry: MenuEntry, filter: MenuFilter): boolean {
  if (filter.category && entry.category !== filter.category) return false;
  if (filter.alcoholFree && !entry.alcoholFree) return false;
  if (filter.taste && !entry.tastes.includes(filter.taste)) return false;
  // Stryker disable next-line Regex,MethodExpression: leere Teilstrings sind für every(includes) wirkungslos (includes('') ist wahr)
  const terms = normalize(filter.query).split(/\s+/).filter(Boolean);
  return terms.every((term) => entry.haystack.includes(term));
}

export const matches = (drink: Drink, filter: MenuFilter, locale: 'de' | 'en' | 'es'): boolean => matchesEntry(toEntry(drink, locale), filter);

export const filterMenu = (items: Drink[], filter: MenuFilter, locale: 'de' | 'en' | 'es'): Drink[] =>
  items.filter((item) => matches(item, filter, locale));

export function formatPrice(amountCents: number, locale: string): string {
  // Glatte Beträge ohne Nachkommastellen: „11 €“ statt „11,00 €“.
  const digits = amountCents % 100 === 0 ? 0 : 2;
  return new Intl.NumberFormat(intlLocale(locale), { style: 'currency', currency: 'EUR', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(amountCents / 100);
}

export const isFilterActive = (filter: MenuFilter): boolean =>
  Boolean(filter.query.trim() || filter.category || filter.alcoholFree || filter.taste);

/**
 * „Stand der Karte“: lokalisierter Satz aus `updatedAt` (JJJJ-MM-TT) und der Textvorlage
 * mit `{date}`. Ohne Datum oder ohne bestätigte Karte (`published` falsch) gibt es keinen
 * Satz, nie ein erfundenes Datum. Mittag UTC, damit die Zeitzone den Kalendertag nicht verschiebt.
 */
export function menuUpdatedText(updatedAt: string | null, published: boolean, template: string, locale: string): string | null {
  if (!published || !updatedAt) return null;
  const instant = new Date(`${updatedAt}T12:00:00Z`);
  if (Number.isNaN(instant.getTime())) return null;
  return template.replace('{date}', formatLongDate(instant, locale));
}
