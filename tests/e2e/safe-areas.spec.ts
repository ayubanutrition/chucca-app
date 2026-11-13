import { expect, test, type Page } from '@playwright/test';

/**
 * Safe Areas (Notch, Home-Indikator) mit der Chromium-Emulation `Emulation.setSafeAreaInsetsOverride`.
 * Das ist Emulation, kein Gerätetest: Wie iOS-Safari die Insets im Standalone-Modus tatsächlich meldet, bleibt Aufgabe 14
 * (`docs/14_GERAETETEST.md`). Geprüft wird, dass unsere Regeln die gemeldeten Insets auch verwenden.
 */
const PAGES = ['/de/', '/de/drinks/', '/de/besuch/', '/de/gruppe/', '/de/galerie/', '/en/visit/', '/es/galeria/'];
const PORTRAIT = { top: 47, bottom: 34, left: 0, right: 0 }; // iPhone mit Notch/Dynamic Island, Hochformat
const LANDSCAPE = { top: 0, bottom: 21, left: 47, right: 47 }; // Querformat

async function setInsets(page: Page, insets: typeof PORTRAIT): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets });
}

test.beforeEach(({ browserName }) => {
  test.skip(browserName !== 'chromium', 'Safe-Area-Emulation gibt es nur über das Chromium-DevTools-Protokoll.');
});

test.describe('Hochformat (oben 47, unten 34 px)', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  for (const path of PAGES) {
    test(`${path}: Leiste, Kopfband und Seitenende berücksichtigen die Insets, kein Querscrollen`, async ({ page }) => {
      await setInsets(page, PORTRAIT);
      await page.goto(path);
      const tabbar = page.locator('.tabbar');
      expect(await tabbar.evaluate((el) => parseFloat(getComputedStyle(el).paddingBottom))).toBeGreaterThanOrEqual(34);
      // Das Vorschauband liegt ganz oben und rückt unter die Statusleiste/Notch.
      expect(await page.locator('.ribbon').evaluate((el) => parseFloat(getComputedStyle(el).paddingTop))).toBeGreaterThanOrEqual(47);
      // Ende der Seite: der Fuß liegt vollständig über der Leiste.
      await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
      const [footerBottom, tabbarTop, viewportBottom] = await page.evaluate(() => [
        document.querySelector('.footer')?.getBoundingClientRect().bottom ?? 0,
        document.querySelector('.tabbar')?.getBoundingClientRect().top ?? 0,
        innerHeight,
      ]);
      expect(footerBottom).toBeLessThanOrEqual(tabbarTop + 3); // Toleranz: die Leistenhöhe ist ein Token, die gemessene Höhe weicht je Seite um 1–2 px ab; der Fuß hat darunter eigenes Innenpolster
      expect(tabbarTop + (await tabbar.evaluate((el) => el.getBoundingClientRect().height))).toBeGreaterThanOrEqual(viewportBottom - 0.5);
      // Beschriftungen der Leiste liegen oberhalb des Home-Indikators.
      for (const link of await tabbar.locator('a').all()) {
        const box = await link.boundingBox();
        expect(box, 'Leistenziel sichtbar').not.toBeNull();
        expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(844 - 34 + 0.5);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
    });
  }

  test('Bildansicht: Kopfzeile unter der Notch, Fuß über dem Home-Indikator, Schließen erreichbar', async ({ page }) => {
    await setInsets(page, PORTRAIT);
    await page.goto('/de/galerie/');
    await page.locator('[data-shot]').nth(1).click();
    const dialog = page.getByRole('dialog', { name: 'Bildansicht' });
    await expect(dialog).toBeVisible();
    const close = dialog.getByRole('button', { name: 'Bildansicht schließen' });
    expect((await close.boundingBox())?.y ?? 0).toBeGreaterThanOrEqual(47);
    const foot = await page.locator('.lightbox__foot').evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return { bottom: rect.bottom, padding: parseFloat(getComputedStyle(el).paddingBottom) };
    });
    expect(foot.padding).toBeGreaterThanOrEqual(34);
    for (const name of ['Vorheriges Bild', 'Nächstes Bild']) {
      const box = await dialog.getByRole('button', { name }).boundingBox();
      expect((box?.y ?? 0) + (box?.height ?? 0), name).toBeLessThanOrEqual(844 - 34 + 0.5);
    }
  });

  test('Toast steht über Leiste und Home-Indikator', async ({ page }) => {
    await setInsets(page, PORTRAIT);
    await page.goto('/de/besuch/');
    expect(await page.locator('.toast').evaluate((el) => parseFloat(getComputedStyle(el).bottom))).toBeGreaterThanOrEqual(34);
  });
});

test.describe('Querformat (links/rechts 47 px)', () => {
  test.use({ viewport: { width: 844, height: 390 } });
  for (const path of ['/de/', '/de/besuch/', '/de/galerie/']) {
    test(`${path}: Inhalt und Leiste halten Abstand zu den seitlichen Insets, kein Querscrollen`, async ({ page }) => {
      await setInsets(page, LANDSCAPE);
      await page.goto(path);
      const wrapLeft = await page.locator('main .wrap').first().evaluate((el) => el.getBoundingClientRect().left);
      expect(wrapLeft).toBeGreaterThanOrEqual(0);
      expect(await page.locator('main .wrap').first().evaluate((el) => parseFloat(getComputedStyle(el).paddingLeft))).toBeGreaterThanOrEqual(47);
      expect(await page.locator('main .wrap').first().evaluate((el) => parseFloat(getComputedStyle(el).paddingRight))).toBeGreaterThanOrEqual(47);
      expect(await page.locator('.tabbar').evaluate((el) => parseFloat(getComputedStyle(el).paddingLeft))).toBeGreaterThanOrEqual(47);
      expect(await page.locator('.tabbar').evaluate((el) => parseFloat(getComputedStyle(el).paddingRight))).toBeGreaterThanOrEqual(47);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
    });
  }
});
