/**
 * Service Worker im echten Browser (Chromium), gegen den öffentlichen Build.
 * Prüft Registrierung, Offline-Navigation, Offline-Seite und dass die Vorschau kein HTML speichert.
 */
import { expect, test } from '@playwright/test';
import { ORIGIN } from './ports';

test.use({ serviceWorkers: 'allow' });

async function ready(page: import('@playwright/test').Page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // Erst nach der Übernahme der Seite durch den Worker gilt Offline-Verhalten.
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
}

test.describe('öffentlicher Build (öffentlich)', () => {
  test.use({ baseURL: ORIGIN.public });

  test('liefert besuchte Seiten offline und eine neutrale Offline-Seite für unbekannte', async ({ page, context }) => {
    await page.goto('/de/besuch/');
    await ready(page);
    await page.goto('/de/gruppe/');
    await context.setOffline(true);
    await page.goto('/de/besuch/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Kommt');
    await expect(page.locator('[data-offline]')).toBeVisible();
    // Stylesheet kam aus dem Cache: Navigation ist sichtbar gestaltet.
    expect(await page.locator('.tabbar').evaluate((el) => getComputedStyle(el).position)).not.toBe('static');
    await page.goto('/en/visit/').catch(() => undefined);
    await expect(page.getByText('You are offline')).toBeVisible();
    await context.setOffline(false);
  });
});

test.describe('Vorschau (Vorschau-Build)', () => {
  test('speichert niemals HTML', async ({ page, context }) => {
    await page.goto('/de/');
    await ready(page);
    await page.goto('/de/drinks/');
    const cached = await page.evaluate(async () => {
      const out: string[] = [];
      for (const name of await caches.keys()) for (const request of await (await caches.open(name)).keys()) out.push(request.url);
      return out;
    });
    expect(cached.length).toBeGreaterThan(5);
    expect(cached.filter((url) => /\/de\/|\/en\/|\/es\/|\/$/.test(new URL(url).pathname) && !/\.(css|js|svg|png|woff2|webmanifest)$/.test(url))).toEqual([]);
    await context.setOffline(true);
    await page.goto('/de/drinks/').catch(() => undefined);
    await expect(page.getByText('Du bist offline')).toBeVisible();
    await context.setOffline(false);
  });
});
