/** Getränkekarte: Geschmack, Kategorie und Suche. Die Karte ist ohne JavaScript vollständig lesbar. */
import { fill } from '../i18n';
import { TASTES, type Taste } from '../lib/tastes';
import { emptyFilter, matchesEntry, type MenuFilter } from '../lib/menu';
import { readStored, removeStored, writeStored } from '../lib/storage';
import { strings } from './dom';

interface Data {
  hasMenu: boolean;
  headlines: Record<Taste, string>;
  texts: Record<Taste, string>;
  hint: string;
  title: string;
  countOne: string;
  countMany: string;
}

const TASTE_KEY = 'chucca-taste';
const isTaste = (value: unknown): value is Taste => typeof value === 'string' && (TASTES as readonly string[]).includes(value);

const root = document.querySelector<HTMLElement>('[data-menu]');
if (root) {
  const data = strings<Data>(root);
  const params = new URLSearchParams(location.search);
  const filter: MenuFilter = emptyFilter();
  // Reihenfolge: Link-Parameter vor gespeicherter Vorliebe; beides wird geprüft.
  const initialTaste = params.get('g') ?? readStored(TASTE_KEY);
  let taste: Taste | null = isTaste(initialTaste) ? initialTaste : null;
  filter.query = (params.get('q') ?? '').slice(0, 60);

  const search = root.querySelector<HTMLInputElement>('[data-menu-search]');
  const count = root.querySelector<HTMLElement>('[data-menu-count]');
  const empty = root.querySelector<HTMLElement>('[data-menu-empty]');
  const list = root.querySelector<HTMLElement>('.menu__list');
  const items = [...root.querySelectorAll<HTMLElement>('[data-drink]')];
  const categoryButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-category]:not([data-drink])')].filter((el) => el.tagName === 'BUTTON');
  const tasteButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-taste]')];
  const headline = root.querySelector<HTMLElement>('[data-taste-headline]');
  const text = root.querySelector<HTMLElement>('[data-taste-text]');
  const knownCategories = new Set(categoryButtons.map((button) => button.dataset.category ?? ''));
  const wanted = params.get('k');
  filter.category = wanted && knownCategories.has(wanted) ? wanted : null;
  if (search) search.value = filter.query;

  const apply = (): void => {
    filter.alcoholFree = taste === 'free';
    filter.taste = taste && taste !== 'free' ? taste : null;
    for (const button of tasteButtons) button.setAttribute('aria-pressed', String(button.dataset.taste === taste));
    for (const button of categoryButtons) button.setAttribute('aria-pressed', String((button.dataset.category || null) === filter.category));
    if (headline) {
      headline.textContent = taste ? data.headlines[taste] : '';
      headline.hidden = !taste;
    }
    if (text) text.textContent = taste ? data.texts[taste] : data.hint;

    let visible = 0;
    for (const item of items) {
      const show = matchesEntry(
        {
          category: item.dataset.category ?? '',
          alcoholFree: item.dataset.free === 'true',
          tastes: (item.dataset.tastes ?? '').split(' '),
          haystack: item.dataset.search ?? '',
        },
        filter,
      );
      item.hidden = !show;
      if (show) visible++;
    }
    for (const section of root.querySelectorAll<HTMLElement>('[data-menu-category]')) {
      section.hidden = section.querySelectorAll('[data-drink]:not([hidden])').length === 0;
    }
    if (count) count.textContent = visible === 1 ? data.countOne : fill(data.countMany, { count: visible });
    if (empty) empty.hidden = visible > 0 || items.length === 0;
    if (list) list.hidden = visible === 0 && items.length > 0;

    const next = new URLSearchParams();
    if (filter.query.trim()) next.set('q', filter.query.trim());
    if (filter.category) next.set('k', filter.category);
    if (taste) next.set('g', taste);
    const query = next.toString();
    try {
      history.replaceState(null, '', `${location.pathname}${query ? `?${query}` : ''}${location.hash}`);
    } catch {
      /* z. B. in eingebetteten Ansichten: Filter funktioniert trotzdem */
    }
  };

  for (const button of tasteButtons) {
    button.addEventListener('click', () => {
      const value = button.dataset.taste;
      taste = isTaste(value) && value !== taste ? value : null;
      if (taste) writeStored(TASTE_KEY, taste);
      else removeStored(TASTE_KEY);
      apply();
    });
  }
  for (const button of categoryButtons) {
    button.addEventListener('click', () => {
      filter.category = button.dataset.category || null;
      apply();
    });
  }
  search?.addEventListener('input', () => {
    filter.query = search.value;
    apply();
  });
  root.querySelector<HTMLButtonElement>('[data-menu-reset]')?.addEventListener('click', () => {
    taste = null;
    removeStored(TASTE_KEY);
    filter.query = '';
    filter.category = null;
    if (search) search.value = '';
    apply();
    search?.focus();
  });

  apply();
}
