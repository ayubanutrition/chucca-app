import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const PAGES = {
  de: ['/de/', '/de/drinks/', '/de/besuch/', '/de/gruppe/', '/de/galerie/'],
  en: ['/en/', '/en/drinks/', '/en/visit/', '/en/group/', '/en/gallery/'],
  es: ['/es/', '/es/bebidas/', '/es/visita/', '/es/grupo/', '/es/galeria/'],
} as const;

const topnav = (page: Page) => page.locator('.topnav');

test.describe('Kernstrecke', () => {
  test('Heute → Drinks → Besuch über die Navigation, Route früh erreichbar', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/de/');
    await expect(page).toHaveTitle(/Heute bei CHUCCA/);
    await expect(page.locator('h1')).toContainText('Der Abend');
    const route = page.getByRole('link', { name: /Route öffnen/ }).first();
    await expect(route).toBeInViewport();
    await expect(route).toHaveAttribute('href', /google\.com\/maps/);
    await expect(route).toHaveAttribute('rel', /noopener/);
    await topnav(page).getByRole('link', { name: 'Drinks' }).click();
    await expect(page).toHaveURL(/\/de\/drinks\/$/);
    await expect(topnav(page).getByRole('link', { name: 'Drinks' })).toHaveAttribute('aria-current', 'page');
    await topnav(page).getByRole('link', { name: 'Besuch' }).click();
    await expect(page.locator('address').first()).toContainText('Carrer del Llaüt 23');
  });

  test('mobil: Hauptaktionen oberhalb der Falz, Leiste unten, kein Querscrollen', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/de/');
    await expect(page.getByRole('link', { name: /Route öffnen/ }).first()).toBeInViewport();
    await expect(page.getByRole('link', { name: /Drinks ansehen/ })).toBeInViewport();
    await expect(page.locator('.tabbar')).toBeVisible();
    await expect(topnav(page)).toBeHidden();
    await page.locator('.tabbar').getByRole('link', { name: 'Gruppe' }).click();
    await expect(page).toHaveURL(/\/de\/gruppe\/$/);
  });

  test('„Jetzt“ zeigt Madrider Uhrzeit und Sonnenuntergang, aber keinen erfundenen Öffnungsstatus', async ({ page }) => {
    await page.clock.install({ time: new Date('2030-07-15T16:00:00Z') });
    await page.goto('/de/');
    await expect(page.locator('[data-now-clock]')).toContainText('18:00'); // Gerät: London 17:00
    await expect(page.locator('[data-now-sunset]')).toHaveText(/^21:\d\d$/);
    await expect(page.locator('[data-now-hours]')).toContainText('noch nicht bestätigt');
    await expect(page.locator('html')).toHaveAttribute('data-sky', 'day');
    await expect(page.getByText(/Jetzt geöffnet|Gerade geschlossen/)).toHaveCount(0);
  });

  test('alte V3-Links: Hash-Routen und gallery.html führen ans Ziel', async ({ page }) => {
    await page.goto('/#besuch');
    await expect(page).toHaveURL(/\/de\/besuch\/$/);
    await page.goto('/#drinks');
    await expect(page).toHaveURL(/\/de\/drinks\/$/);
    await page.goto('/gallery.html');
    await expect(page).toHaveURL(/\/de\/galerie\/$/);
  });

  test('Einstieg ist eine Sprachwahl ohne Zwangsumleitung; die Wahl wird gemerkt', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/:4331\/$/);
    await expect(page.getByRole('link', { name: /Deutsch/ })).toHaveAttribute('data-suggested', 'true');
    await page.getByRole('link', { name: /Español/ }).click();
    await expect(page).toHaveURL(/\/es\/$/);
    await page.goto('/');
    await expect(page).toHaveURL(/\/es\/$/);
  });

  test('unbekannte Seiten liefern eine verständliche 404 in der Sprache des Pfads', async ({ page }) => {
    const response = await page.goto('/es/no-existe/');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'Esta página no existe.' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Diese Seite gibt es nicht.' })).toBeHidden();
    await page.getByRole('link', { name: 'Ir al inicio' }).click();
    await expect(page).toHaveURL(/\/es\/$/);
  });
});

test.describe('Sprachen', () => {
  for (const [locale, paths] of Object.entries(PAGES)) {
    test(`${locale}: alle Seiten mit eigener Sprache, Titel, Beschreibung und noindex der Vorschau`, async ({ page }) => {
      const titles = new Set<string>();
      for (const path of paths) {
        const response = await page.goto(path);
        expect(response?.status(), path).toBe(200);
        await expect(page.locator('html')).toHaveAttribute('lang', locale);
        titles.add(await page.title());
        expect((await page.locator('meta[name="description"]').getAttribute('content'))?.length).toBeGreaterThan(20);
        await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,nofollow');
        await expect(page.locator('h1')).toHaveCount(1);
        await expect(page.locator('.langs a[aria-current="true"]')).toHaveText(new RegExp(locale.toUpperCase()));
      }
      expect(titles.size).toBe(paths.length);
    });
  }

  test('keine Mischsprache: englische und spanische Seiten enthalten keine deutschen Bedientexte', async ({ page }) => {
    for (const path of [...PAGES.en, ...PAGES.es]) {
      await page.goto(path);
      const text = await page.locator('body').innerText();
      for (const german of ['Route öffnen', 'Einladung', 'Öffnungszeiten', 'Besuch', 'Getränkekarte', 'Konzeptmotiv', 'Vorschau', 'kopieren']) {
        expect(text, `${path}: ${german}`).not.toContain(german);
      }
    }
  });

  test('Sprachwechsel bleibt auf derselben Seite und behält Filter und Geschmack', async ({ page }) => {
    await page.goto('/de/drinks/');
    await page.getByRole('button', { name: 'Alkoholfrei', exact: true }).first().click();
    await page.getByRole('searchbox').fill('tonic');
    await expect(page.locator('[data-menu-count]')).toHaveText('1 Drink');
    await page.locator('.langs').getByRole('link', { name: /ES/ }).click();
    await expect(page).toHaveURL(/\/es\/bebidas\/\?q=tonic&g=free$/);
    await expect(page.getByRole('searchbox')).toHaveValue('tonic');
    await expect(page.getByRole('button', { name: 'Sin alcohol', exact: true }).first()).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-menu-count]')).toHaveText('1 bebida');
  });
});

test.describe('Getränkekarte', () => {
  test('ist ohne JavaScript vollständig lesbar', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL: 'http://127.0.0.1:4331' });
    const page = await context.newPage();
    await page.goto('/de/drinks/');
    await expect(page.locator('[data-drink]')).toHaveCount(16);
    await expect(page.locator('[data-drink="mojito"]')).toContainText('11,00 €');
    await context.close();
  });

  test('Kategorien, Suche, Nulltreffer und Zurücksetzen', async ({ page }) => {
    await page.goto('/de/drinks/');
    await expect(page.getByText('Beispielkarte', { exact: true })).toBeVisible();
    await expect(page.locator('[data-menu-count]')).toHaveText('16 Drinks');
    await page.getByRole('button', { name: 'Klassiker' }).click();
    await expect(page.locator('[data-drink]:visible')).toHaveCount(6);
    await expect(page.getByRole('heading', { name: 'Alkoholfrei', exact: true })).toBeHidden();
    await page.getByRole('searchbox').fill('gibtsnicht');
    await expect(page.getByRole('heading', { name: 'Nichts gefunden.' })).toBeVisible();
    await expect(page.locator('[data-menu-count]')).toHaveText('0 Drinks');
    await page.getByRole('button', { name: 'Filter zurücksetzen' }).click();
    await expect(page.locator('[data-drink]:visible')).toHaveCount(16);
    await expect(page.getByRole('searchbox')).toBeFocused();
  });

  test('zeigt fehlenden Preis, Größen, Nichtverfügbarkeit und alkoholfreie Auswahl gleichwertig', async ({ page }) => {
    await page.goto('/de/drinks/');
    await expect(page.locator('[data-drink="sangria"]')).toContainText('Preis an der Bar');
    await expect(page.locator('[data-drink="gin-tonic"] .drink__price')).toContainText('0,3 l');
    await expect(page.locator('[data-drink="whiskey-sour"]')).toContainText('Heute nicht verfügbar');
    await page.getByRole('button', { name: 'Alkoholfrei', exact: true }).first().click();
    await expect(page.locator('[data-drink]:visible')).toHaveCount(6);
    await expect(page.locator('[data-taste-headline]')).toHaveText('Dein Abend. Alkoholfrei.');
  });

  test('merkt den Geschmack über das Neuladen und verwirft manipulierte Werte', async ({ page }) => {
    await page.goto('/de/drinks/');
    await page.getByRole('button', { name: 'Fruchtig' }).click();
    await page.goto('/de/drinks/');
    await expect(page.getByRole('button', { name: 'Fruchtig' })).toHaveAttribute('aria-pressed', 'true');
    await page.evaluate(() => localStorage.setItem('chucca-taste', '<img onerror=alert(1)>'));
    await page.goto('/de/drinks/?k=unbekannt');
    await expect(page.locator('.chip[aria-pressed="true"]')).toHaveCount(1); // nur „Alle“
    await expect(page.locator('[data-drink]:visible')).toHaveCount(16);
  });

  test('funktioniert bei gesperrtem Speicher', async ({ page }) => {
    await page.addInitScript(() => {
      const blocked = { get: () => { throw new DOMException('denied', 'SecurityError'); } };
      Object.defineProperty(window, 'localStorage', blocked);
      Object.defineProperty(window, 'sessionStorage', blocked);
    });
    const errors: string[] = [];
    // Ein abgebrochener Seitenübergang ist kein Fehler der Anwendung.
    page.on('pageerror', (error) => !/Transition was aborted/.test(error.message) && errors.push(error.message));
    await page.goto('/de/drinks/');
    await page.getByRole('button', { name: 'Frisch' }).click();
    await expect(page.getByRole('button', { name: 'Frisch' })).toHaveAttribute('aria-pressed', 'true');
    await page.goto('/de/gruppe/');
    await page.getByLabel('Datum').fill('2031-05-02');
    await page.getByLabel('Treffzeit').fill('20:00');
    await expect(page.locator('[data-ticket-time]')).toHaveText('20:00');
    await page.locator('.langs').getByRole('link', { name: /EN/ }).click();
    await expect(page.getByLabel('Meeting time')).toHaveValue('20:00'); // Übergabe per URL statt Speicher
    expect(errors).toEqual([]);
  });
});

test.describe('Zugänglichkeit und Layout', () => {
  for (const path of [...PAGES.de, '/en/visit/', '/es/bebidas/', '/']) {
    test(`axe (WCAG 2.2 A/AA) ohne Verstöße: ${path}`, async ({ page }) => {
      await page.goto(path);
      // axe bringt eigene Playwright-Typen mit; zur Laufzeit ist es dieselbe Seite.
      const results = await new AxeBuilder({ page } as unknown as ConstructorParameters<typeof AxeBuilder>[0]).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
    });
  }

  for (const width of [320, 390, 430, 768, 1440]) {
    test(`kein horizontales Scrollen bei ${width}px in allen Sprachen`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      for (const path of Object.values(PAGES).flat()) {
        await page.goto(path);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow, `${path} @${width}`).toBeLessThanOrEqual(0);
      }
    });
  }

  test('200 % Zoom (Reflow bei 320 CSS-Pixel Breite und niedriger Höhe): Inhalte bleiben bedienbar', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 400 });
    await page.goto('/de/gruppe/');
    await expect(page.locator('.tabbar')).toHaveCSS('position', 'static');
    await page.getByLabel('Datum').scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', { name: 'Einladung teilen' })).toBeEnabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  });

  test('Tastatur: Sprunglink zuerst, sichtbarer Fokus, Tastaturreihenfolge beginnt in der Kopfzeile', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/de/');
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Zum Inhalt springen' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press('Enter');
    await expect(page.locator('main')).toBeFocused();
    await page.keyboard.press('Tab');
    const focused = page.locator(':focus');
    await expect(focused).toHaveText(/Route öffnen/);
    expect(await focused.evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe('none');
  });

  test('Touch-Ziele der Hauptbedienung sind mindestens 44 × 44 CSS-Pixel', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of ['/de/', '/de/drinks/', '/de/besuch/', '/de/gruppe/']) {
      await page.goto(path);
      const small = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('.btn, .chip, .tabbar a, .langs a, .link, .iconbtn, .input, summary')]
          .filter((el) => el.offsetParent !== null)
          .map((el) => ({ text: el.textContent?.trim().slice(0, 30), box: el.getBoundingClientRect() }))
          .filter(({ box }) => box.height < 43.5 || box.width < 43.5)
          .map(({ text, box }) => `${text} ${Math.round(box.width)}×${Math.round(box.height)}`),
      );
      expect(small, path).toEqual([]);
    }
  });

  test('reduzierte Bewegung schaltet Übergänge ab', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/de/');
    const duration = await page.locator('.btn').first().evaluate((el) => getComputedStyle(el).transitionDuration);
    expect(Math.max(...duration.split(',').map((d) => parseFloat(d)))).toBeLessThan(0.01);
  });

  test('keine Anfragen an Dritte und keine Konsolenfehler beim Laden', async ({ page }) => {
    const foreign: string[] = [];
    const errors: string[] = [];
    page.on('request', (request) => {
      if (!request.url().startsWith('http://127.0.0.1:4331') && !request.url().startsWith('data:') && !request.url().startsWith('blob:')) foreign.push(request.url());
    });
    page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
    page.on('pageerror', (error) => !/Transition was aborted/.test(error.message) && errors.push(error.message));
    for (const path of PAGES.de) await page.goto(path, { waitUntil: 'networkidle' });
    expect(foreign).toEqual([]);
    expect(errors).toEqual([]);
  });
});
