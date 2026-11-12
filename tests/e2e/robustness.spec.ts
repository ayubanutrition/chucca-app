/**
 * Robustheit: ohne JavaScript, Bildausfälle, Offline im Formular, Doppelklicks, extreme Eingaben,
 * Zurück/Vor (bfcache), sehr schmale und sehr breite Fenster. Screenshots: /tmp/chucca-agent-a11y/.
 */
import { expect, test, type Page } from '@playwright/test';
import { ALL_PAGES, DE_PAGES, SHOT_DIR } from './a11y-helpers';

// Die Tests spielen eigene Stylesheets ein (Textabstand, Schriftgröße, Kontrastmodus), wie es Nutzer- oder Assistenz-Software tut;
// die Seiten-CSP gilt dafür nicht. Die CSP selbst prüft tests/e2e/headers.spec.ts.
test.use({ bypassCSP: true });

const hscroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test.describe('JavaScript deaktiviert', () => {
  test.use({ javaScriptEnabled: false });

  for (const path of ALL_PAGES) {
    test(`Hauptinhalt sichtbar, Überschrift und Navigation vorhanden: ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('main')).toBeVisible();
      expect((await page.locator('main').innerText()).trim().length).toBeGreaterThan(80);
      await expect(page.locator('.tabbar:visible a, .topnav:visible a').first()).toBeVisible();
      expect(await hscroll(page)).toBeLessThanOrEqual(0);
    });
  }

  test('Navigation führt ohne JavaScript durch alle Seiten (Desktop und mobil)', async ({ page }) => {
    // Seitenwechsel-Überblendung (View Transition) fängt Klicks ~300 ms ab; hier nicht Gegenstand der Prüfung.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const [width, nav] of [
      [1440, '.topnav'],
      [390, '.tabbar'],
    ] as const) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/de/');
      for (const [label, url] of [
        ['Drinks', /\/de\/drinks\/$/],
        ['Besuch', /\/de\/besuch\/$/],
        ['Gruppe', /\/de\/gruppe\/$/],
        ['Galerie', /\/de\/galerie\/$/],
        ['Heute', /\/de\/$/],
      ] as const) {
        await page.locator(nav).getByRole('link', { name: label }).click();
        await expect(page).toHaveURL(url);
        await expect(page.locator('h1')).toBeVisible();
      }
    }
  });

  test('Sprachwechsel funktioniert ohne JavaScript', async ({ page }) => {
    await page.goto('/de/drinks/');
    await page.locator('.langs a[data-lang-link="en"]').click();
    await expect(page).toHaveURL(/\/en\/drinks\/$/);
  });

  test('Karte ist ohne JavaScript vollständig lesbar (Drinks und Preise)', async ({ page }) => {
    await page.goto('/de/drinks/');
    expect(await page.locator('[data-drink]:visible').count()).toBeGreaterThanOrEqual(10);
  });

  test('Galerie: Vorschaubilder sind Links auf das große Bild', async ({ page }) => {
    await page.goto('/de/galerie/');
    const first = page.locator('[data-shot]').first();
    await expect(first).toHaveAttribute('href', /\.(webp|png|jpe?g|avif)/);
    await expect(page.locator('dialog[data-lightbox]')).toBeHidden();
  });

  for (const path of ['/de/gruppe/', '/de/drinks/', '/de/besuch/']) {
    test(`Bedienelemente ohne Funktion sind erklärt oder ausgeblendet: ${path}`, async ({ page }) => {
      // BELEGT (P3): Es gibt kein <noscript> und keinen Hinweis. Ohne JavaScript bleiben „Einladung teilen“, „Im Kalender speichern“,
      // die Filter-Chips und das Suchfeld sichtbar und tot (Formular ohne action sendet nur eine leere GET-Anfrage).
      await page.goto(path);
      const actionable = await page.locator('form button:visible, [data-taste]:visible, [data-category]:visible:not([data-drink]), [data-copy-address]:visible').count();
      const hint = await page.locator('noscript, [data-nojs]').count();
      expect(actionable === 0 || hint > 0).toBe(true);
    });
  }

  test('Gruppenplaner ohne JavaScript: Absenden lädt neu, ohne Fehlerseite', async ({ page }) => {
    await page.goto('/de/gruppe/');
    await page.getByRole('button', { name: /Einladung|teilen/i }).first().click();
    await expect(page.locator('h1')).toBeVisible();
    expect(page.url()).toContain('/de/gruppe/');
  });
});

test.describe('Bilder fehlen oder laden sehr langsam', () => {
  test('Alle Bildanfragen abgebrochen: Text, Navigation und Layout bleiben nutzbar, Höhe der Bildflächen bleibt', async ({ page }) => {
    for (const path of ['/de/', '/de/galerie/', '/de/besuch/']) {
      await page.goto(path);
      const normal = await page.evaluate(() => [...document.querySelectorAll('picture, .art, [data-shot]')].map((el) => Math.round(el.getBoundingClientRect().height)));
      await page.route(/\.(webp|png|jpe?g|avif)(\?.*)?$/, (route) => route.abort());
      await page.goto(path);
      await expect(page.locator('h1')).toBeVisible();
      expect(await hscroll(page)).toBeLessThanOrEqual(0);
      const failed = await page.evaluate(() => [...document.querySelectorAll('picture, .art, [data-shot]')].map((el) => Math.round(el.getBoundingClientRect().height)));
      // Bildflächen behalten ihre Höhe (kein Zusammenfallen, kein Layoutsprung beim späteren Laden).
      failed.forEach((height, index) => expect(height, `${path}: Bildfläche ${index}`).toBeGreaterThanOrEqual((normal[index] ?? 0) * 0.8));
      if (path === '/de/galerie/') await page.screenshot({ path: `${SHOT_DIR}/images-aborted-galerie.png`, fullPage: false });
      await page.unroute(/\.(webp|png|jpe?g|avif)(\?.*)?$/);
    }
  });

  test('Bildfehler in der Lightbox: verständliche Meldung statt leerer Fläche, Schließen bleibt möglich', async ({ page }) => {
    await page.goto('/de/galerie/');
    await page.route('**/*', (route) => (route.request().resourceType() === 'image' ? route.abort() : route.continue()));
    await page.locator('[data-shot]').first().click();
    await expect(page.locator('[data-lightbox-error]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-lightbox]')).toBeHidden();
  });

  test('Sehr langsame Bilder (3 s): keine Layoutverschiebung über 0,1 und Text sofort sichtbar', async ({ page }) => {
    await page.route(/\.(webp|png|jpe?g|avif)(\?.*)?$/, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await route.continue().catch(() => undefined);
    });
    await page.addInitScript(() => {
      (window as unknown as { __cls: number }).__cls = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as unknown as Array<{ value: number; hadRecentInput: boolean }>) if (!entry.hadRecentInput) (window as unknown as { __cls: number }).__cls += entry.value;
      }).observe({ type: 'layout-shift', buffered: true });
    });
    for (const path of ['/de/', '/de/galerie/']) {
      await page.goto(path, { waitUntil: 'commit' });
      await expect(page.locator('h1')).toBeVisible({ timeout: 2000 });
      await page.waitForLoadState('load');
      expect(await page.evaluate(() => (window as unknown as { __cls: number }).__cls), path).toBeLessThan(0.1);
    }
  });
});

test.describe('Offline mitten im Formular', () => {
  test('Planer: Eingaben bleiben, Hinweis erscheint, Kalender und Kopieren funktionieren ohne Netz, Hinweis verschwindet online', async ({ page, context }) => {
    await page.clock.install({ time: new Date('2030-01-15T12:00:00Z') });
    await page.goto('/de/gruppe/');
    await page.getByLabel('Datum').fill('2030-01-16');
    await page.getByLabel('Uhrzeit').fill('20:00');
    const requests: string[] = [];
    page.on('request', (request) => requests.push(request.url()));
    await context.setOffline(true);
    await expect(page.locator('[data-offline]')).toBeVisible();
    await expect(page.locator('[data-offline]')).toHaveAttribute('role', 'status');
    await expect(page.getByLabel('Datum')).toHaveValue('2030-01-16');
    const [download] = await Promise.all([page.waitForEvent('download'), page.locator('[data-calendar]').click()]);
    expect(download.suggestedFilename()).toBe('chucca-meetup.ics');
    await expect(page.locator('[data-status]')).not.toHaveText('');
    expect(requests.filter((url) => !url.startsWith('blob:') && !url.startsWith('data:')), 'keine Netzanfrage beim Speichern im Kalender').toEqual([]);
    await context.setOffline(false);
    await expect(page.locator('[data-offline]')).toBeHidden();
  });

  test('Anfrage: Nachricht entsteht lokal, auch offline, ohne Netzanfrage', async ({ page, context }) => {
    await page.clock.install({ time: new Date('2030-01-15T12:00:00Z') });
    await page.goto('/de/besuch/');
    await page.locator('#inq-date').fill('2030-01-16');
    await page.locator('#inq-time').fill('20:00');
    await context.setOffline(true);
    const requests: string[] = [];
    page.on('request', (request) => requests.push(request.url()));
    await page.locator('[data-inquiry] button[type="submit"]').click();
    await expect(page.locator('#inq-text')).toHaveValue(/6/);
    expect(requests).toEqual([]);
    await context.setOffline(false);
  });
});

test.describe('Doppelklick-Schutz', () => {
  test('Teilen: zweiter schneller Klick öffnet kein zweites Teilen-Menü und meldet kein falsches „kopiert“', async ({ page }) => {
    await page.clock.install({ time: new Date('2030-01-15T12:00:00Z') });
    await page.addInitScript(() => {
      const w = window as unknown as { __calls: number; __release: () => void; __copied: string[] };
      w.__calls = 0;
      w.__copied = [];
      let open = false;
      // Wie im Browser: während ein Teilen-Menü offen ist, lehnt ein zweiter Aufruf mit InvalidStateError ab.
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: () =>
          new Promise<void>((resolve, reject) => {
            w.__calls++;
            if (open) return reject(new DOMException('Share already in progress', 'InvalidStateError'));
            open = true;
            w.__release = () => {
              open = false;
              resolve();
            };
          }),
      });
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text: string) => void w.__copied.push(text) } });
    });
    await page.goto('/de/gruppe/');
    await page.getByLabel('Datum').fill('2030-01-16');
    await page.getByLabel('Uhrzeit').fill('20:00');
    await page.locator('form button[type="submit"]').dblclick();
    await page.waitForTimeout(100);
    const calls = await page.evaluate(() => (window as unknown as { __calls: number }).__calls);
    const copied = await page.evaluate(() => (window as unknown as { __copied: string[] }).__copied.length);
    // BELEGT (P3): der zweite Klick ruft navigator.share erneut auf (calls = 2); die Ablehnung fällt auf die Zwischenablage zurück
    // und meldet „kopiert“, während das Teilen-Menü noch offen ist.
    test.fixme(calls > 1 || copied > 0, `doppelter Aufruf: share=${calls}, Zwischenablage=${copied}`);
    expect(calls).toBe(1);
    expect(copied).toBe(0);
  });

  test('Kalender: Doppelklick erzeugt höchstens zwei Dateien mit gleicher Kennung und keinen Fehler', async ({ page }) => {
    await page.clock.install({ time: new Date('2030-01-15T12:00:00Z') });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/de/gruppe/');
    await page.getByLabel('Datum').fill('2030-01-16');
    await page.getByLabel('Uhrzeit').fill('20:00');
    let downloads = 0;
    page.on('download', () => downloads++);
    await page.locator('[data-calendar]').dblclick();
    await page.waitForTimeout(300);
    expect(downloads).toBeLessThanOrEqual(2);
    expect(errors).toEqual([]);
  });
});

test.describe('Extreme Eingaben', () => {
  test('Suchfeld mit 5000 Zeichen: kein Fehler, kein Querscrollen, Nulltreffer erklärt, Adresse bleibt kurz', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/de/drinks/');
    const search = page.locator('#menu-search');
    await search.fill('x'.repeat(5000));
    await expect(page.locator('[data-menu-empty]')).toBeVisible();
    expect(await hscroll(page)).toBeLessThanOrEqual(0);
    expect(errors).toEqual([]);
    // BELEGT (P3): menu.ts kürzt den Link-Parameter beim Lesen auf 60 Zeichen, schreibt aber die volle Eingabe in die Adresse (5000+ Zeichen);
    // der Sprachlink übernimmt sie, Server/Proxys (8–16 KB) können ablehnen. Fix: search.maxLength = 60 und filter.query beim Tippen kürzen.
    test.fixme(page.url().length > 2000, `Adresse hat ${page.url().length} Zeichen`);
    expect(page.url().length).toBeLessThanOrEqual(2000);
  });

  test('Suchfeld: Emojis, RTL-Zeichen, HTML und Nullbyte-ähnliche Eingaben werden nicht als Markup ausgewertet', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/de/drinks/');
    const search = page.locator('#menu-search');
    for (const value of ['<img src=x onerror=alert(1)>', '🍹🍹🍹', 'שלום', '%00%0d%0a', '"; drop', '\\u0000']) {
      await search.fill(value);
      await expect(page.locator('[data-menu-count]')).toBeVisible();
    }
    expect(await page.locator('main img[src="x"]').count()).toBe(0);
    expect(errors).toEqual([]);
  });

  test('Anfrage-Notiz: maxlength 140 hält bei 5000 getippten Zeichen, lange Wörter sprengen das Layout nicht', async ({ page }) => {
    await page.clock.install({ time: new Date('2030-01-15T12:00:00Z') });
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto('/de/besuch/');
    await page.locator('#inq-note').focus();
    await page.keyboard.insertText('W'.repeat(5000));
    expect((await page.locator('#inq-note').inputValue()).length).toBeLessThanOrEqual(140);
    await page.locator('#inq-date').fill('2030-01-16');
    await page.locator('#inq-time').fill('20:00');
    await page.locator('[data-inquiry] button[type="submit"]').click();
    await expect(page.locator('#inq-text')).toBeVisible();
    expect(await hscroll(page)).toBeLessThanOrEqual(0);
  });

  for (const value of ['1', '41', '-5', '2.5', '1e3', '99999999999999999999', '']) {
    test(`Personenzahl „${value}“ wird mit Fehler am Feld abgewiesen`, async ({ page }) => {
      await page.clock.install({ time: new Date('2030-01-15T12:00:00Z') });
      await page.goto('/de/besuch/');
      await page.locator('#inq-date').fill('2030-01-16');
      await page.locator('#inq-time').fill('20:00');
      await page.locator('#inq-people').fill(value);
      await page.locator('[data-inquiry] button[type="submit"]').click();
      await expect(page.locator('#inq-people')).toHaveAttribute('aria-invalid', 'true');
      await expect(page.locator('[data-inquiry-status]')).not.toHaveText('');
      await expect(page.locator('[data-inquiry-output]')).toBeHidden();
    });
  }

  test('Planer: Datumsgrenzen (0001, 2100, ferne Zukunft) führen zu Fehler oder gültiger Datei, nie zu einem Skriptfehler', async ({ page }) => {
    await page.clock.install({ time: new Date('2030-01-15T12:00:00Z') });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/de/gruppe/');
    for (const date of ['0001-01-01', '2100-12-31', '2099-12-30', '1999-12-31']) {
      await page.getByLabel('Datum').fill(date);
      await page.getByLabel('Uhrzeit').fill('23:59');
      await page.locator('[data-calendar]').click();
      await page.waitForTimeout(50);
    }
    expect(errors).toEqual([]);
  });
});

test.describe('Zurück/Vor und bfcache', () => {
  test('Drinks: Filter, Chip und Suchtext bleiben nach Seitenwechsel und Zurück konsistent', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/de/drinks/');
    await page.locator('[data-taste]').nth(1).click();
    await page.locator('#menu-search').fill('a');
    const snapshot = async () => ({
      search: await page.locator('#menu-search').inputValue(),
      pressed: await page.locator('.chip[aria-pressed="true"]').allTextContents(),
      visible: await page.locator('[data-drink]:not([hidden])').count(),
      count: Number((await page.locator('[data-menu-count]').textContent())?.match(/\d+/)?.[0] ?? -1),
    });
    const before = await snapshot();
    await page.locator('.topnav').getByRole('link', { name: 'Besuch' }).click();
    await expect(page).toHaveURL(/\/besuch\/$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/drinks\/\?/);
    const after = await snapshot();
    expect(after.visible, 'sichtbare Einträge passen zur Zähl-Anzeige').toBe(after.count);
    expect(after.search).toBe(before.search);
    expect(after.pressed).toEqual(before.pressed);
    await page.goForward();
    await expect(page).toHaveURL(/\/besuch\/$/);
    await page.goBack();
    expect((await snapshot()).visible).toBe(before.visible);
  });

  test('Planer: Datum und Uhrzeit bleiben nach Heute → Zurück erhalten, Ticket stimmt mit den Feldern überein', async ({ page }) => {
    await page.clock.install({ time: new Date('2030-01-15T12:00:00Z') });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/de/gruppe/');
    await page.getByLabel('Datum').fill('2030-01-16');
    await page.getByLabel('Uhrzeit').fill('20:00');
    await page.locator('.topnav').getByRole('link', { name: 'Heute' }).click();
    await expect(page).toHaveURL(/\/de\/$/);
    await page.goBack();
    await expect(page.getByLabel('Datum')).toHaveValue('2030-01-16');
    await expect(page.getByLabel('Uhrzeit')).toHaveValue('20:00');
    await expect(page.locator('[data-ticket-time]')).toHaveText('20:00');
    await expect(page.locator('[data-ticket-date]')).toContainText('2030');
  });

  test('Sprachwechsel und Zurück: Seite und Plan bleiben je Sprache stimmig', async ({ page }) => {
    await page.clock.install({ time: new Date('2030-01-15T12:00:00Z') });
    await page.goto('/de/gruppe/');
    await page.getByLabel('Datum').fill('2030-01-16');
    await page.getByLabel('Uhrzeit').fill('20:00');
    await page.locator('.langs a[data-lang-link="en"]').click();
    await expect(page).toHaveURL(/\/en\/group\//);
    await expect(page.locator('#plan-time')).toHaveValue('20:00');
    await page.goBack();
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');
    await expect(page.locator('#plan-time')).toHaveValue('20:00');
    // Der Sprachlink darf nach dem Zurück nicht mit alten Parametern „verklebt“ sein.
    await page.getByLabel('Uhrzeit').fill('21:30');
    await page.locator('.langs a[data-lang-link="es"]').click();
    await expect(page).toHaveURL(/\/es\/grupo\//);
    await expect(page.locator('#plan-time')).toHaveValue('21:30');
  });
});

test.describe('Sehr schmale und sehr breite Fenster', () => {
  test('2560 x 1300: kein Querscrollen, Textzeilen bleiben lesbar lang, Inhalt zentriert', async ({ page }) => {
    await page.setViewportSize({ width: 2560, height: 1300 });
    for (const path of DE_PAGES) {
      await page.goto(path);
      expect(await hscroll(page), path).toBeLessThanOrEqual(0);
      const widest = await page.evaluate(() => Math.max(...[...document.querySelectorAll('main p:not(.eyebrow)')].map((el) => el.getBoundingClientRect().width)));
      expect(widest, `${path}: längste Textzeile ${Math.round(widest)} px`).toBeLessThanOrEqual(900);
      const wrap = await page.locator('main .wrap').first().boundingBox();
      expect(wrap && wrap.width, path).toBeLessThanOrEqual(1400);
      if (path === '/de/') await page.screenshot({ path: `${SHOT_DIR}/wide-2560-de.png` });
    }
  });

  test('280 px: Kerninhalt lesbar, Hauptaktionen erreichbar (Hinweis: Navigation läuft 15 px über)', async ({ page }) => {
    await page.setViewportSize({ width: 280, height: 600 });
    await page.goto('/de/');
    await expect(page.getByRole('link', { name: /Route öffnen/ }).first()).toBeVisible();
    await expect(page.locator('.tabbar')).toBeVisible();
    const box = await page.locator('.tabbar').boundingBox();
    expect(box && box.x + box.width).toBeLessThanOrEqual(281);
  });

  test('Fenstergrößen von 320 bis 1920 px: kein Querscrollen auf Drinks, Besuch und Planer', async ({ page }) => {
    for (const width of [320, 360, 414, 600, 768, 1366, 1920]) {
      await page.setViewportSize({ width, height: 800 });
      for (const path of ['/de/drinks/', '/de/besuch/', '/en/group/', '/es/galeria/']) {
        await page.goto(path);
        expect(await hscroll(page), `${path} bei ${width}`).toBeLessThanOrEqual(0);
      }
    }
  });

  for (const width of [960, 1024]) {
    test(`Besuch (Anfrageformular) bei ${width} px: kein Querscrollen (iPad quer)`, async ({ page }) => {
      // BELEGT (P2): `.fields--trio` nutzt `6.5rem 1fr 1fr`; 1fr = minmax(auto, 1fr), das Datumsfeld (min-content) drückt die Spalten
      // über den Rand: scrollWidth +42 px bei 960, +23 bei 1000, +12 bei 1024 px (alle drei Sprachen).
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/de/besuch/');
      expect(await hscroll(page)).toBeLessThanOrEqual(0);
    });

    test(`Fix-Beweis minmax(0,1fr) für Besuch bei ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/de/besuch/');
      await page.addStyleTag({ content: '@media (min-width: 34rem) { .fields.fields--trio { grid-template-columns: 6.5rem minmax(0, 1fr) minmax(0, 1fr); } }' });
      expect(await hscroll(page)).toBeLessThanOrEqual(0);
    });
  }
});
