import { describe, expect, it } from 'vitest';
import { menuFor, publishedMenu } from '../../src/lib/content';
import { menuSchema } from '../../src/lib/content/schema';
import { MENU_FIXTURE_MARKER, MENU_FIXTURE_UPDATED_AT, testMenu } from '../../src/content/fixtures/menu-test';
import { TEST_MENU } from '../../src/config/mode';
import { emptyFilter, formatPrice, matches } from '../../src/lib/menu';

// Test-Karte für `dist-menu` (CHUCCA_TEST_MENU): erfundene Daten, nie Teil des regulären Bestands.
describe('Test-Karte (Fixture für dist-menu)', () => {
  it('ist eine gültige, bestätigte Karte mit gesetztem Datum im Jahr 2099', () => {
    const parsed = menuSchema.parse(testMenu);
    expect(parsed.kind).toBe('published');
    expect(parsed.status).toBe('confirmed');
    expect(parsed.updatedAt).toBe(MENU_FIXTURE_UPDATED_AT);
    expect(parsed.updatedAt?.startsWith('2099-')).toBe(true);
  });
  it('trägt die Kennung in jedem Namen und jeder Kategorie, in jeder Sprache', () => {
    for (const locale of ['de', 'en', 'es'] as const) {
      for (const item of testMenu.items) expect(item.name[locale], item.id).toContain(MENU_FIXTURE_MARKER);
      for (const category of testMenu.categories) expect(category.name[locale], category.id).toContain(MENU_FIXTURE_MARKER);
    }
  });
  it('behauptet keinen Tagesstatus: alle Drinks verfügbar, keine Zusätze wie „neu“ oder „heute“', () => {
    expect(testMenu.items.every((item) => item.available)).toBe(true);
    const text = JSON.stringify(testMenu).toLowerCase();
    for (const word of ['heute', 'today', 'hoy', 'bestseller', 'nicht verfügbar', 'ausverkauft']) expect(text, word).not.toContain(word);
  });
  it('deckt die Darstellungsfälle ab: 0/1/2/3 Preise, glatte und krumme Beträge, alle Geschmäcker, alkoholfrei', () => {
    const counts = new Set(testMenu.items.map((item) => item.prices.length));
    expect([...counts].sort()).toEqual([0, 1, 2, 3]);
    expect(testMenu.items.some((item) => item.prices.some((price) => price.amountCents % 100 !== 0))).toBe(true);
    expect(testMenu.items.some((item) => item.prices.some((price) => price.amountCents % 100 === 0))).toBe(true);
    const tastes = new Set(testMenu.items.flatMap((item) => item.tastes));
    expect([...tastes].sort()).toEqual(['classic', 'free', 'fresh', 'fruity']);
    expect(testMenu.items.some((item) => item.alcoholFree)).toBe(true);
  });
  it('ist ohne Schalter nicht der aktive Bestand: publishedMenu ist die leere, unbestätigte Karte aus dem Repo', () => {
    expect(TEST_MENU).toBe(false);
    expect(publishedMenu.items.length).toBe(0);
    expect(publishedMenu.status).toBe('pending');
    expect(JSON.stringify(publishedMenu)).not.toContain(MENU_FIXTURE_MARKER);
  });
  it('menuFor: eine bestätigte Karte gilt als veröffentlicht (öffentlich indexierbar), im Unit-Lauf ohne Test-Hinweis', () => {
    for (const mode of ['preview', 'public'] as const) {
      const view = menuFor(mode, testMenu);
      expect(view.state).toBe('published');
      expect(view.menu).toBe(testMenu);
      expect(view.testNotice).toBeUndefined();
    }
  });
  it('menuFor: unbestätigt bleibt „Beispielkarte“ (Vorschau) bzw. „folgt“ (öffentlich), nie die Test-Karte', () => {
    expect(menuFor('preview', publishedMenu).state).toBe('fixture');
    expect(menuFor('public', publishedMenu).state).toBe('pending');
    expect(menuFor('public', { ...testMenu, status: 'pending' }).state).toBe('pending');
    expect(menuFor('public', { ...testMenu, items: [] }).state).toBe('pending');
  });
  it('Preisformat und Suche mit der Test-Karte', () => {
    const plain = (value: string) => value.replace(/\s/g, ' ');
    expect(plain(formatPrice(1100, 'de'))).toBe('11 €');
    expect(plain(formatPrice(950, 'de'))).toBe('9,50 €');
    const nandu = testMenu.items.find((item) => item.id === 'tf-nandu-fizz')!;
    expect(matches(nandu, { ...emptyFilter(), query: 'nandu' }, 'de')).toBe(true);
    expect(matches(nandu, { ...emptyFilter(), query: 'PIÑA' }, 'es')).toBe(true);
    const sour = testMenu.items.find((item) => item.id === 'tf-straussen-sour')!;
    expect(matches(sour, { ...emptyFilter(), query: 'strauss eiweiss' }, 'de')).toBe(true);
  });
});
