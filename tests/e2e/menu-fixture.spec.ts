/**
 * Getränkekarte mit BESTÄTIGTEM Bestand – gegen den Testbuild `dist-menu` (npm run build:menu) mit der gekennzeichneten
 * Test-Fixture `src/content/fixtures/menu-test.ts` (erfundene Namen `TESTFIXTURE-MENU …`, erfundene Preise, Stand 2099-03-14,
 * keine Venue-Fakten). Dazu Leak-Tests: Die Fixture darf in keinem regulären Build vorkommen.
 *
 * Fixture-Karte (8 Drinks): Sprudel 3 (Ñandú Fizz 7/9,50/13 €, Straußen-Sour 12 €, Null Minze 5/8 € alkoholfrei) ·
 * Klassik 3 (Grauer Gin Tonic 13 €, Bitter Äpfel 9,50 €, Preislos ohne Preis) · Null 2 (Null Beere 6,50 €, Null Zimt 7,50/10,50 €, beide
 * alkoholfrei, mit Kategorienotiz). Geschmack: frisch 2 · fruchtig 3 · klassisch 5 · alkoholfrei 3.
 * Der öffentliche Modus mit bestätigter Karte lässt sich nicht als Build testen (Schalter + public sind verboten);
 * dafür belegt `tests/unit/menu-fixture.test.ts`, dass `menuFor('public', bestätigteKarte)` „published“ liefert.
 */
import { readdir, readFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { hscroll, scanTextLoss } from './a11y-helpers';
import { ORIGIN } from './ports';

const MARKER = 'TESTFIXTURE-MENU';
type L = 'de' | 'en' | 'es';
const LOCALES: L[] = ['de', 'en', 'es'];

interface Texts {
  path: string;
  count: (n: number) => string;
  cats: [string, string, string];
  updated: string;
  taste: Record<'fresh' | 'fruity' | 'classic' | 'free', string>;
  empty: string;
  reset: string;
  clear: (name: string) => string;
  zero: string;
  priceMissing: string;
  prices: { nandu: string[]; sour: string[]; minze: string[]; gin: string; aepfel: string; beere: string; zimt: string[] };
  nanduIngredients: string;
  note: string;
  mint: string;
  statusWords: string[];
}
const T: Record<L, Texts> = {
  de: {
    path: '/de/drinks/',
    count: (n) => (n === 1 ? '1 Drink' : `${n} Drinks`),
    cats: [`${MARKER} Sprudel`, `${MARKER} Klassik`, `${MARKER} Null`],
    updated: 'Stand der Karte: Samstag, 14. März 2099',
    taste: { fresh: 'Frisch', fruity: 'Fruchtig', classic: 'Klassisch', free: 'Alkoholfrei' },
    empty: 'Nichts gefunden.',
    reset: 'Filter zurücksetzen',
    clear: (name) => `Kategorie ${name} entfernen`,
    zero: 'alkoholfrei',
    priceMissing: 'Preis an der Bar erfragen',
    prices: { nandu: ['7 €', '9,50 €', '13 €'], sour: ['12 €'], minze: ['5 €', '8 €'], gin: '13 €', aepfel: '9,50 €', beere: '6,50 €', zimt: ['7,50 €', '10,50 €'] },
    nanduIngredients: 'Ananas · Zitronengras · Soda',
    note: 'Erfundene Kategorienotiz für den Test.',
    mint: 'minze',
    statusWords: ['nicht verfügbar', 'Verfügbar heute', 'heute verfügbar', 'ausverkauft'],
  },
  en: {
    path: '/en/drinks/',
    count: (n) => (n === 1 ? '1 drink' : `${n} drinks`),
    cats: [`${MARKER} Fizz`, `${MARKER} Classics`, `${MARKER} Zero`],
    updated: 'Menu as of Saturday, 14 March 2099',
    taste: { fresh: 'Fresh', fruity: 'Fruity', classic: 'Classic', free: 'Alcohol-free' },
    empty: 'Nothing found.',
    reset: 'Reset filters',
    clear: (name) => `Remove category ${name}`,
    zero: 'alcohol-free',
    priceMissing: 'Ask at the bar for the price',
    prices: { nandu: ['€7', '€9.50', '€13'], sour: ['€12'], minze: ['€5', '€8'], gin: '€13', aepfel: '€9.50', beere: '€6.50', zimt: ['€7.50', '€10.50'] },
    nanduIngredients: 'pineapple · lemongrass · soda water',
    note: 'Invented category note for the test.',
    mint: 'mint',
    statusWords: ['not available', 'available today', 'sold out'],
  },
  es: {
    path: '/es/bebidas/',
    count: (n) => (n === 1 ? '1 bebida' : `${n} bebidas`),
    cats: [`${MARKER} Burbujas`, `${MARKER} Clásicos`, `${MARKER} Cero`],
    updated: 'Carta actualizada el sábado, 14 de marzo de 2099',
    taste: { fresh: 'Fresco', fruity: 'Afrutado', classic: 'Clásico', free: 'Sin alcohol' },
    empty: 'No hay resultados.',
    reset: 'Quitar filtros',
    clear: (name) => `Quitar la categoría ${name}`,
    zero: 'sin alcohol',
    priceMissing: 'Precio: pregúntalo en la barra',
    prices: { nandu: ['7 €', '9,50 €', '13 €'], sour: ['12 €'], minze: ['5 €', '8 €'], gin: '13 €', aepfel: '9,50 €', beere: '6,50 €', zimt: ['7,50 €', '10,50 €'] },
    nanduIngredients: 'piña · hierba luisa · soda',
    note: 'Nota de categoría inventada para la prueba.',
    mint: 'menta',
    statusWords: ['no está disponible', 'disponible hoy', 'hoy disponible', 'agotado'],
  },
};
const IDS = ['tf-nandu-fizz', 'tf-straussen-sour', 'tf-null-minze', 'tf-grauer-gin', 'tf-bitter-aepfel', 'tf-preislos', 'tf-null-beere', 'tf-null-zimt'];

const go = async (page: Page, locale: L, query = '', origin: string = ORIGIN.menu) => {
  await page.goto(`${origin}${T[locale].path}${query}`);
};
const norm = (text: string | null) => (text ?? '').replace(/\s+/g, ' ').trim();
const visibleIds = (page: Page) => page.locator('[data-drink]:not([hidden])').evaluateAll((els) => els.map((el) => (el as HTMLElement).dataset.drink));
const count = (page: Page) => page.locator('[data-menu-count]');
const chip = (page: Page, taste: string) => page.locator(`[data-taste="${taste}"]`);
const prices = async (page: Page, id: string) => (await page.locator(`[data-drink="${id}"] .drink__price > span`).evaluateAll((spans) => spans.map((s) => s.textContent ?? ''))).map(norm);

test.describe('Testbuild mit bestätigter Karte: Kennzeichnung', () => {
  for (const locale of LOCALES) {
    test(`${locale}: Test-Karte ist sichtbar gekennzeichnet, kein Beispielkarten-Etikett, Build ist noindex`, async ({ page, request }) => {
      await go(page, locale);
      await expect(page.locator('[data-test-fixture]')).toHaveCount(1);
      await expect(page.locator('[data-test-fixture]')).toContainText(MARKER);
      await expect(page.locator('[data-test-fixture]')).toBeVisible();
      await expect(page.locator('.badge--pink')).toHaveCount(0);
      await expect(page.locator('[data-menu-pending]')).toHaveCount(0);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,nofollow');
      await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
      expect(await (await request.get(`${ORIGIN.menu}/robots.txt`)).text()).toContain('Disallow: /');
      expect((await request.get(`${ORIGIN.menu}/sitemap.xml`)).status()).toBe(404);
      const headers = (await request.get(`${ORIGIN.menu}${T[locale].path}`)).headers();
      expect(headers['x-robots-tag']).toContain('noindex');
    });
  }
  test('andere Seiten tragen keine Kennung der Test-Karte', async ({ page }) => {
    for (const path of ['/de/', '/de/besuch/', '/en/group/', '/es/galeria/']) {
      await page.goto(`${ORIGIN.menu}${path}`);
      await expect(page.locator('body')).not.toContainText(MARKER);
    }
  });
});

test.describe('Darstellung', () => {
  for (const locale of LOCALES) {
    const t = T[locale];
    test(`${locale}: Kategorien, Anzahl, Sprunglinks und Notiz`, async ({ page }) => {
      await go(page, locale);
      await expect(page.locator('.menu__cat-title')).toHaveText(t.cats);
      await expect(page.locator('[data-menu-category] [data-cat-count]')).toHaveText([t.count(3), t.count(3), t.count(2)]);
      await expect(page.locator('[data-menu-count]')).toHaveText(t.count(8));
      await expect(page.locator('.menu__jump-link')).toHaveText(t.cats);
      await expect(page.locator('.menu__cat-note')).toHaveCount(1);
      await expect(page.locator('[data-menu-category="tf-null"] .menu__cat-note')).toHaveText(t.note);
      expect(await visibleIds(page)).toEqual(IDS);
      await expect(page.locator('[data-menu-category="tf-null"]')).toHaveAttribute('data-all-free', 'true');
      await expect(page.locator('[data-menu-category="tf-sprudel"]')).toHaveAttribute('data-all-free', 'false');
    });

    test(`${locale}: Preisformat der Sprache, glatte Beträge ohne Cent, mehrere Größen mit Größenangabe`, async ({ page }) => {
      await go(page, locale);
      expect(await prices(page, 'tf-nandu-fizz')).toEqual(['200 ml ' + t.prices.nandu[0], '300 ml ' + t.prices.nandu[1], '500 ml ' + t.prices.nandu[2]]);
      expect(await prices(page, 'tf-null-minze')).toEqual(['300 ml ' + t.prices.minze[0], '500 ml ' + t.prices.minze[1]]);
      expect(await prices(page, 'tf-null-zimt')).toEqual(['300 ml ' + t.prices.zimt[0], '500 ml ' + t.prices.zimt[1]]);
      expect(await prices(page, 'tf-straussen-sour')).toEqual(t.prices.sour);
      expect(await prices(page, 'tf-grauer-gin')).toEqual([t.prices.gin]);
      expect(await prices(page, 'tf-bitter-aepfel')).toEqual([t.prices.aepfel]);
      expect(await prices(page, 'tf-null-beere')).toEqual([t.prices.beere]);
      // Größe in <small>, nur bei mehreren Größen.
      await expect(page.locator('[data-drink="tf-nandu-fizz"] .drink__price small')).toHaveText(['200 ml', '300 ml', '500 ml']);
      await expect(page.locator('[data-drink="tf-grauer-gin"] .drink__price small')).toHaveCount(0);
      // Kein krummer Betrag in Fremdformat, keine Nachkommastellen bei glatten Beträgen.
      const all = norm(await page.locator('.menu__list').textContent());
      expect(all).not.toMatch(/\d[,.]00\b/);
    });

    test(`${locale}: Drink ohne Preis nennt den Hinweis statt eines Preises`, async ({ page }) => {
      await go(page, locale);
      await expect(page.locator('[data-drink="tf-preislos"] .drink__price--none')).toHaveText(t.priceMissing);
      await expect(page.locator('[data-drink="tf-preislos"]')).not.toContainText('€');
    });

    test(`${locale}: alkoholfrei gekennzeichnet (drei im Markup, sichtbar nur in gemischter Kategorie), Zutaten mit Mittelpunkt, Beschreibung als Text`, async ({ page }) => {
      await go(page, locale);
      await expect(page.locator('.drink__zero')).toHaveCount(3);
      await expect(page.locator('.drink__zero')).toHaveText([t.zero, t.zero, t.zero]);
      // In einer Kategorie, die nur alkoholfreie Drinks führt (data-all-free), wäre das Etikett Wiederholung und bleibt unsichtbar.
      await expect(page.locator('.drink__zero:visible')).toHaveCount(1);
      await expect(page.locator('[data-drink="tf-null-minze"] .drink__zero')).toBeVisible();
      for (const id of ['tf-null-beere', 'tf-null-zimt']) await expect(page.locator(`[data-drink="${id}"] .drink__zero`)).toBeHidden();
      await expect(page.locator('[data-drink="tf-nandu-fizz"] .drink__ing')).toContainText(t.nanduIngredients);
      await expect(page.locator('[data-drink="tf-preislos"] .drink__ing')).toHaveCount(0);
      await expect(page.locator('[data-drink="tf-bitter-aepfel"] .drink__desc')).toHaveCount(0);
      // Erfundene spitze Klammern in der Beschreibung werden als Text ausgegeben, nie als Element.
      await expect(page.locator('[data-drink="tf-straussen-sour"] .drink__desc i')).toHaveCount(0);
      await expect(page.locator('[data-drink="tf-straussen-sour"] .drink__desc')).toContainText('<i>');
      await expect(page.locator('[data-drink="tf-nandu-fizz"] .drink__name')).toContainText(`${MARKER} Ñandú Fizz`);
    });

    test(`${locale}: „Stand der Karte“ aus updatedAt, lokalisiert und datumsgenau`, async ({ page }) => {
      await go(page, locale);
      const stand = page.locator('[data-menu-updated]');
      await expect(stand).toHaveCount(1);
      await expect(stand).toHaveText(t.updated);
      await expect(stand).toBeVisible();
    });

    test(`${locale}: kein erfundener Status – kein „heute nicht verfügbar“, kein Tagesangebot, alle als verfügbar markiert`, async ({ page }) => {
      await go(page, locale);
      await expect(page.locator('[data-available="false"]')).toHaveCount(0);
      await expect(page.locator('.drink__off')).toHaveCount(0);
      const text = (await page.locator('body').innerText()).toLowerCase();
      for (const word of t.statusWords) expect(text, word).not.toContain(word.toLowerCase());
    });
  }

  test('„Stand der Karte“ verschiebt sich in keiner Zeitzone (Datum steckt im HTML, nicht im Browser)', async ({ browser }) => {
    for (const timezoneId of ['Pacific/Kiritimati', 'America/Los_Angeles', 'Pacific/Pago_Pago']) {
      const context = await browser.newContext({ timezoneId });
      const page = await context.newPage();
      for (const locale of LOCALES) {
        await go(page, locale);
        await expect(page.locator('[data-menu-updated]'), `${timezoneId} ${locale}`).toHaveText(T[locale].updated);
      }
      await context.close();
    }
  });

  test('ohne JavaScript vollständig lesbar: 8 Drinks, Preise, Stand der Karte, keine Filter-Steuerung', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL: ORIGIN.menu });
    const page = await context.newPage();
    for (const locale of LOCALES) {
      await page.goto(T[locale].path);
      await expect(page.locator('[data-drink]')).toHaveCount(8);
      await expect(page.locator('[data-drink]:visible')).toHaveCount(8);
      await expect(page.locator('[data-drink="tf-grauer-gin"]')).toContainText(T[locale].prices.gin);
      await expect(page.locator('[data-menu-updated]')).toHaveText(T[locale].updated);
      await expect(page.locator('.menu__tools')).toBeHidden();
    }
    await context.close();
  });
});

test.describe('Filter: Suche, Geschmack, alkoholfrei, leere Trefferliste', () => {
  for (const locale of LOCALES) {
    const t = T[locale];
    test(`${locale}: Suche ignoriert Groß-/Kleinschreibung und Akzente (Ñandú, ß, Ä)`, async ({ page }) => {
      await go(page, locale);
      const search = page.getByRole('searchbox');
      for (const query of ['nandu', 'ÑANDÚ', 'ñandú fizz']) {
        await search.fill(query);
        expect(await visibleIds(page), query).toEqual(['tf-nandu-fizz']);
        await expect(count(page)).toHaveText(t.count(1));
      }
      for (const query of ['strauss', 'Straußen', 'STRAUSSEN sour']) {
        await search.fill(query);
        expect(await visibleIds(page), query).toEqual(['tf-straussen-sour']);
      }
      await search.fill('aepfel');
      expect(await visibleIds(page)).toEqual([]); // „ä“ wird zu „a“, nicht zu „ae“
      await search.fill('apfel');
      expect(await visibleIds(page)).toEqual(['tf-bitter-aepfel']);
      await search.fill('eiweiss');
      expect(await visibleIds(page)).toEqual(locale === 'de' ? ['tf-straussen-sour'] : []);
    });

    test(`${locale}: mehrere Suchbegriffe (alle müssen passen), Zutaten und Beschreibung werden durchsucht, Leerraum ist wirkungslos`, async ({ page }) => {
      await go(page, locale);
      const search = page.getByRole('searchbox');
      await search.fill(`  ${t.mint}   null `);
      expect(await visibleIds(page)).toEqual(['tf-null-minze']);
      await search.fill('null fizz');
      expect(await visibleIds(page)).toEqual([]);
      await search.fill('   ');
      await expect(count(page)).toHaveText(t.count(8));
      expect(await visibleIds(page)).toEqual(IDS);
      await expect(page.locator('[data-menu-empty]')).toBeHidden();
    });

    test(`${locale}: Sonderzeichen in der Suche (HTML, Regex, Backslash, Emoji, lange Eingabe) – 0 Treffer, kein Fehler, kein Einschleusen`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
      let dialogs = 0;
      page.on('dialog', async (dialog) => {
        dialogs++;
        await dialog.dismiss();
      });
      await go(page, locale);
      const search = page.getByRole('searchbox');
      for (const query of ['<script>alert(1)</script>', '<img src=x onerror=alert(1)>', '(.*)', '[a-z]+', '\\', '"\' ; --', '🍹', 'a'.repeat(200), '%', '{count}']) {
        await search.fill(query);
        expect(await visibleIds(page), query).toEqual([]);
        await expect(count(page)).toHaveText(t.count(0));
        await expect(page.getByRole('heading', { name: t.empty })).toBeVisible();
      }
      await expect(page.locator('img[src="x"]')).toHaveCount(0);
      await search.fill('');
      expect(await visibleIds(page)).toEqual(IDS);
      expect(dialogs).toBe(0);
      expect(errors).toEqual([]);
      // Das Suchfeld begrenzt die Länge (maxlength 60).
      await search.fill('b'.repeat(200));
      expect((await search.inputValue()).length).toBeLessThanOrEqual(60);
    });

    test(`${locale}: Geschmacksfilter – Anzahl je Richtung, Einfachauswahl, erneuter Klick hebt auf`, async ({ page }) => {
      await go(page, locale);
      const expected: Record<string, string[]> = {
        fresh: ['tf-nandu-fizz', 'tf-null-minze'],
        fruity: ['tf-nandu-fizz', 'tf-bitter-aepfel', 'tf-null-beere'],
        classic: ['tf-straussen-sour', 'tf-grauer-gin', 'tf-bitter-aepfel', 'tf-preislos', 'tf-null-zimt'],
        free: ['tf-null-minze', 'tf-null-beere', 'tf-null-zimt'],
      };
      for (const [taste, ids] of Object.entries(expected)) {
        await chip(page, taste).click();
        expect(await visibleIds(page), taste).toEqual(ids);
        await expect(count(page)).toHaveText(t.count(ids.length));
        await expect(chip(page, taste)).toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator('.chip[data-taste][aria-pressed="true"]')).toHaveCount(1);
        await expect(page.locator('[data-taste-headline]')).toBeVisible();
      }
      await chip(page, 'free').click(); // zweiter Klick auf die aktive Richtung
      await expect(page.locator('.chip[data-taste][aria-pressed="true"]')).toHaveCount(0);
      expect(await visibleIds(page)).toEqual(IDS);
      await expect(page.locator('[data-taste-headline]')).toBeHidden();
    });

    test(`${locale}: alkoholfrei blendet leere Kategorien samt Sprunglink aus und aktualisiert Kategoriezahlen`, async ({ page }) => {
      await go(page, locale);
      await expect(chip(page, 'free')).toHaveText(t.taste.free);
      await chip(page, 'free').click();
      await expect(page.locator('[data-menu-category="tf-klassik"]')).toBeHidden();
      await expect(page.locator('[data-jump="tf-klassik"]')).toBeHidden();
      await expect(page.locator('[data-menu-category="tf-sprudel"] [data-cat-count]')).toHaveText(t.count(1));
      await expect(page.locator('[data-menu-category="tf-null"] [data-cat-count]')).toHaveText(t.count(2));
      await expect(page.locator('.drink__zero:visible')).toHaveCount(1);
    });

    test(`${locale}: Suche und Geschmack kombinieren; leere Trefferliste zeigt Hinweis, blendet Liste aus und lässt sich zurücksetzen`, async ({ page }) => {
      await go(page, locale);
      await chip(page, 'classic').click();
      await page.getByRole('searchbox').fill('null');
      expect(await visibleIds(page)).toEqual(['tf-null-zimt']);
      await expect(count(page)).toHaveText(t.count(1));
      await chip(page, 'fresh').click(); // null + frisch = Null Minze
      expect(await visibleIds(page)).toEqual(['tf-null-minze']);
      await page.getByRole('searchbox').fill('gin');
      expect(await visibleIds(page)).toEqual([]);
      await expect(page.getByRole('heading', { name: t.empty })).toBeVisible();
      await expect(page.locator('.menu__list')).toBeHidden();
      await expect(count(page)).toHaveText(t.count(0));
      await expect(page.locator('[data-menu-category]:visible')).toHaveCount(0);
      await page.getByRole('button', { name: t.reset }).click();
      await expect(page.getByRole('searchbox')).toHaveValue('');
      await expect(page.getByRole('searchbox')).toBeFocused();
      await expect(page.locator('.chip[data-taste][aria-pressed="true"]')).toHaveCount(0);
      expect(await visibleIds(page)).toEqual(IDS);
      await expect(page.locator('.menu__list')).toBeVisible();
      await expect(page).toHaveURL(new RegExp(`${t.path.replace(/\//g, '\\/')}$`));
    });

    test(`${locale}: die Zählung ist als Statusmeldung ausgezeichnet und die Filtersteuerung benannt`, async ({ page }) => {
      await go(page, locale);
      await expect(count(page)).toHaveAttribute('role', 'status');
      await expect(page.getByRole('searchbox')).toHaveAccessibleName(/.+/);
      await expect(page.getByRole('group').filter({ has: chip(page, 'fresh') })).toHaveAccessibleName(/.+/);
    });
  }
});

test.describe('Deep-Link-Parameter g, k, q', () => {
  for (const locale of LOCALES) {
    const t = T[locale];
    test(`${locale}: g, k und q setzen den Zustand; Zustand und URL bleiben im Gleichklang`, async ({ page }) => {
      await go(page, locale, '?g=free');
      expect(await visibleIds(page)).toEqual(['tf-null-minze', 'tf-null-beere', 'tf-null-zimt']);
      await expect(chip(page, 'free')).toHaveAttribute('aria-pressed', 'true');

      await go(page, locale, '?k=tf-null');
      expect(await visibleIds(page)).toEqual(['tf-null-beere', 'tf-null-zimt']);
      await expect(page.locator('[data-category-clear]')).toBeVisible();
      await expect(page.locator('[data-category-clear]')).toHaveText(`${MARKER} ${locale === 'de' ? 'Null' : locale === 'en' ? 'Zero' : 'Cero'}`);
      await expect(page.locator('[data-category-clear]')).toHaveAttribute('aria-label', t.clear(`${MARKER} ${locale === 'de' ? 'Null' : locale === 'en' ? 'Zero' : 'Cero'}`));
      await page.locator('[data-category-clear]').click();
      expect(await visibleIds(page)).toEqual(IDS);
      await expect(page).toHaveURL(new RegExp(`${t.path.replace(/\//g, '\\/')}$`));
      await expect(page.getByRole('searchbox')).toBeFocused();

      await go(page, locale, `?q=${encodeURIComponent(t.mint)}`);
      await expect(page.getByRole('searchbox')).toHaveValue(t.mint);
      expect(await visibleIds(page)).toEqual(['tf-null-minze']);

      await go(page, locale, `?g=fresh&k=tf-sprudel&q=${encodeURIComponent(t.mint)}`);
      expect(await visibleIds(page)).toEqual(['tf-null-minze']);
      await expect(chip(page, 'fresh')).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('[data-category-clear]')).toBeVisible();
      await page.getByRole('searchbox').fill('');
      await expect(page).toHaveURL(/\?k=tf-sprudel&g=fresh$/);
      expect(await visibleIds(page)).toEqual(['tf-nandu-fizz', 'tf-null-minze']);
    });

    test(`${locale}: geklickter Filter schreibt Link-Parameter (URL zum Teilen), der beim Laden denselben Zustand ergibt`, async ({ page }) => {
      await go(page, locale);
      await chip(page, 'fruity').click();
      await page.getByRole('searchbox').fill(t.mint === 'minze' ? 'beere' : t.mint === 'mint' ? 'berries' : 'bayas');
      await expect(page).toHaveURL(/\?q=(beere|berries|bayas)&g=fruity$/);
      const shared = page.url();
      expect(await visibleIds(page)).toEqual(['tf-null-beere']);
      await page.evaluate(() => localStorage.clear());
      await page.goto('about:blank');
      await page.goto(shared);
      expect(await visibleIds(page)).toEqual(['tf-null-beere']);
      await expect(chip(page, 'fruity')).toHaveAttribute('aria-pressed', 'true');
    });

    test(`${locale}: ungültige Parameter werden verworfen (Geschmack, Kategorie), zu lange Suche gekürzt`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      for (const query of ['?g=gift', '?g=%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E', '?k=gibtsnicht', '?k=__proto__', '?g=&k=&q=', '?g=free&g=fresh', '?k=tf-null&k=tf-klassik']) {
        await go(page, locale, query);
        const ids = await visibleIds(page);
        // Zulässig sind genau die Zustände, die ein gültiger Wert ergäbe; ungültiges ändert nichts.
        if (query === '?g=free&g=fresh') expect(ids).toEqual(['tf-null-minze', 'tf-null-beere', 'tf-null-zimt']);
        else if (query === '?k=tf-null&k=tf-klassik') expect(ids).toEqual(['tf-null-beere', 'tf-null-zimt']);
        else expect(ids, query).toEqual(IDS);
        await expect(page.locator('.chip[aria-pressed="true"]'), query).toHaveCount(query.startsWith('?g=free') ? 1 : 0);
        await expect(page.locator('img[src="x"]')).toHaveCount(0);
      }
      await go(page, locale, `?q=${'x'.repeat(150)}`);
      expect((await page.getByRole('searchbox').inputValue()).length).toBe(60);
      await go(page, locale, '?q=%3Cb%3Efett%3C%2Fb%3E');
      await expect(page.getByRole('searchbox')).toHaveValue('<b>fett</b>');
      await expect(page.locator('[data-menu-empty]')).toBeVisible();
      await expect(page.locator('main b')).toHaveCount(0);
      expect(errors).toEqual([]);
    });

    test(`${locale}: ein Link mit Filtern gilt unverändert, die gespeicherte Vorliebe mischt sich nicht ein`, async ({ page }) => {
      await go(page, locale);
      await chip(page, 'classic').click();
      await go(page, locale, '?k=tf-sprudel');
      expect(await visibleIds(page)).toEqual(['tf-nandu-fizz', 'tf-straussen-sour', 'tf-null-minze']);
      await expect(page.locator('.chip[data-taste][aria-pressed="true"]')).toHaveCount(0);
      // Ohne Parameter greift die gemerkte Vorliebe, mit gültigem Wert.
      await go(page, locale);
      await expect(chip(page, 'classic')).toHaveAttribute('aria-pressed', 'true');
      await page.evaluate(() => localStorage.setItem('chucca-taste', 'gift'));
      await go(page, locale);
      await expect(page.locator('.chip[data-taste][aria-pressed="true"]')).toHaveCount(0);
      expect(await visibleIds(page)).toEqual(IDS);
    });
  }

  test('Sprachwechsel nimmt Suche, Geschmack und Kategorie mit; der Zustand gilt in der Zielsprache', async ({ page }) => {
    await go(page, 'de', '?g=fresh&k=tf-sprudel&q=null');
    expect(await visibleIds(page)).toEqual(['tf-null-minze']);
    await page.locator('.langs').getByRole('link', { name: /EN/ }).click();
    await expect(page).toHaveURL(/\/en\/drinks\/\?q=null&k=tf-sprudel&g=fresh$/);
    expect(await visibleIds(page)).toEqual(['tf-null-minze']);
    await expect(page.locator('[data-menu-count]')).toHaveText('1 drink');
    await page.locator('.langs').getByRole('link', { name: /ES/ }).click();
    await expect(page).toHaveURL(/\/es\/bebidas\/\?q=null&k=tf-sprudel&g=fresh$/);
    await expect(page.locator('[data-menu-count]')).toHaveText('1 bebida');
    await expect(chip(page, 'fresh')).toHaveText('Fresco');
  });
});

test.describe('Tastatur', () => {
  for (const locale of LOCALES) {
    test(`${locale}: Suchfeld und Geschmacks-Chips sind in logischer Reihenfolge per Tab erreichbar und mit Enter/Leertaste bedienbar`, async ({ page }) => {
      await go(page, locale);
      await page.getByRole('searchbox').focus();
      await page.keyboard.press('Tab');
      await expect(chip(page, 'fresh')).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(chip(page, 'fresh')).toHaveAttribute('aria-pressed', 'true');
      await expect(count(page)).toHaveText(T[locale].count(2));
      await page.keyboard.press('Tab');
      await expect(chip(page, 'fruity')).toBeFocused();
      await page.keyboard.press('Space');
      await expect(chip(page, 'fruity')).toHaveAttribute('aria-pressed', 'true');
      await expect(chip(page, 'fresh')).toHaveAttribute('aria-pressed', 'false');
      await expect(count(page)).toHaveText(T[locale].count(3));
      await page.keyboard.press('Tab');
      await expect(chip(page, 'classic')).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(chip(page, 'free')).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(count(page)).toHaveText(T[locale].count(3));
      await page.keyboard.press('Space'); // Fokus bleibt auf dem Chip, erneut gedrückt hebt auf
      await expect(chip(page, 'free')).toBeFocused();
      await expect(chip(page, 'free')).toHaveAttribute('aria-pressed', 'false');
      await expect(count(page)).toHaveText(T[locale].count(8));
      await page.keyboard.press('Shift+Tab');
      await expect(chip(page, 'classic')).toBeFocused();
    });

    test(`${locale}: Fokus ist sichtbar (Umriss) und die Chips sind mindestens 44 px hoch`, async ({ page }) => {
      await go(page, locale);
      await chip(page, 'fresh').focus();
      await page.keyboard.press('Tab');
      const outline = await chip(page, 'fruity').evaluate((el) => {
        const style = getComputedStyle(el);
        return { width: parseFloat(style.outlineWidth), style: style.outlineStyle };
      });
      // :focus-visible nach Tastaturbedienung
      expect(outline.style).not.toBe('none');
      expect(outline.width).toBeGreaterThan(0);
      for (const taste of ['fresh', 'fruity', 'classic', 'free']) {
        const box = await chip(page, taste).boundingBox();
        expect(box!.height, taste).toBeGreaterThanOrEqual(44);
      }
    });
  }

  test('leere Trefferliste: „zurücksetzen“ per Tastatur, Fokus kehrt ins Suchfeld zurück', async ({ page }) => {
    await go(page, 'de');
    await page.getByRole('searchbox').fill('gibtsnicht');
    await page.getByRole('button', { name: 'Filter zurücksetzen' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('searchbox')).toBeFocused();
    expect(await visibleIds(page)).toEqual(IDS);
  });
});

test.describe('Zugänglichkeit, Konsole, Layout', () => {
  for (const locale of LOCALES) {
    test(`${locale}: axe (WCAG 2.2 A/AA) ohne Verstöße – Ausgangszustand, Filter aktiv und leere Trefferliste`, async ({ page }) => {
      const run = async (label: string) => {
        const results = await new AxeBuilder({ page } as unknown as ConstructorParameters<typeof AxeBuilder>[0]).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
        expect(results.violations.map((v) => `${label} ${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
      };
      await go(page, locale);
      await run('start');
      await chip(page, 'free').click();
      await run('free');
      await page.getByRole('searchbox').fill('gibtsnicht');
      await run('leer');
    });

    test(`${locale}: keine Konsolenfehler, keine Anfragen an Dritte beim Laden und Filtern`, async ({ page }) => {
      const foreign: string[] = [];
      const errors: string[] = [];
      page.on('request', (request) => {
        const url = request.url();
        if (!url.startsWith(ORIGIN.menu) && !url.startsWith('data:') && !url.startsWith('blob:')) foreign.push(url);
      });
      page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(`${ORIGIN.menu}${T[locale].path}`, { waitUntil: 'networkidle' });
      await chip(page, 'fruity').click();
      await page.getByRole('searchbox').fill('beere');
      await page.getByRole('searchbox').fill('zzz');
      expect(foreign).toEqual([]);
      expect(errors).toEqual([]);
    });

    for (const width of [390, 1440]) {
      test(`${locale}: ${width} px – kein horizontales Scrollen, kein abgeschnittener Text (Start, Filter, leer)`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await go(page, locale);
        expect(await hscroll(page)).toBeLessThanOrEqual(0);
        expect(await page.evaluate(scanTextLoss)).toEqual([]);
        await chip(page, 'classic').click();
        expect(await hscroll(page)).toBeLessThanOrEqual(0);
        await page.getByRole('searchbox').fill('gibtsnicht');
        expect(await hscroll(page)).toBeLessThanOrEqual(0);
        expect(await page.evaluate(scanTextLoss)).toEqual([]);
        await go(page, locale, '?q=' + 'W'.repeat(60));
        expect(await hscroll(page)).toBeLessThanOrEqual(0);
      });
    }
  }
});

test.describe('Reguläre Builds behalten ihr Verhalten (Gegenprobe)', () => {
  const builds = [
    { name: 'Vorschau', origin: ORIGIN.preview, prefix: '', pending: false },
    { name: 'öffentlich', origin: ORIGIN.public, prefix: '', pending: true },
    { name: 'Unterpfad', origin: ORIGIN.sub, prefix: '/preview/app', pending: true },
  ];
  for (const build of builds) {
    for (const locale of LOCALES) {
      test(`${build.name} ${locale}: ${build.pending ? '„Karte folgt“' : 'Beispielkarte'}, keine Kennung der Test-Karte, kein Stand der Karte`, async ({ page }) => {
        await page.goto(`${build.origin}${build.prefix}${T[locale].path}`);
        await expect(page.locator('[data-test-fixture]')).toHaveCount(0);
        await expect(page.locator('[data-menu-updated]')).toHaveCount(0);
        await expect(page.locator('body')).not.toContainText(MARKER);
        if (build.pending) {
          await expect(page.locator('[data-menu-pending]')).toBeVisible();
          await expect(page.locator('[data-drink]')).toHaveCount(0);
          await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,nofollow');
        } else {
          await expect(page.locator('.badge--pink')).toHaveCount(1);
          await expect(page.locator('[data-drink]')).toHaveCount(16);
        }
      });
    }
  }
});

test.describe('Test-Karte gelangt nie in reguläre Builds', () => {
  const walk = async (dir: URL): Promise<URL[]> => {
    const out: URL[] = [];
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) out.push(...(await walk(new URL(`${entry.name}/`, dir))));
      else if (/\.(html|js|css|json|webmanifest|txt|xml|ics)$|^_headers$/.test(entry.name)) out.push(new URL(entry.name, dir));
    }
    return out;
  };
  for (const dir of ['dist', 'dist-public', 'dist-sub', 'dist-hours', 'dist-inquiry']) {
    test(`${dir}: weder Kennung noch Fixture-Daten in irgendeiner Textdatei`, async () => {
      const files = await walk(new URL(`../../${dir}/`, import.meta.url));
      expect(files.length).toBeGreaterThan(20);
      for (const file of files) {
        const text = await readFile(file, 'utf8');
        for (const needle of [MARKER, '2099-03-14', 'tf-nandu-fizz', 'Ñandú', 'Straußen-Sour']) expect(text, `${file.pathname}: ${needle}`).not.toContain(needle);
      }
    });
  }
  test('dist-menu trägt die Kennung (Test sucht am richtigen Ort), bleibt Vorschau und enthält die Karte nicht im Skript', async () => {
    const html = await readFile(new URL('../../dist-menu/de/drinks/index.html', import.meta.url), 'utf8');
    expect(html).toContain(MARKER);
    expect(html).toContain('noindex');
    expect(await readFile(new URL('../../dist-menu/robots.txt', import.meta.url), 'utf8')).toContain('Disallow: /');
    const scripts = (await walk(new URL('../../dist-menu/', import.meta.url))).filter((file) => file.pathname.endsWith('.js'));
    for (const file of scripts) expect(await readFile(file, 'utf8'), file.pathname).not.toContain(MARKER);
  });
});
