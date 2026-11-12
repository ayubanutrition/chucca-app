/** Hosting im Unterpfad (/preview/app/): Links, Assets, Manifest, Sprachwahl, 404, Service Worker. */
import { expect, test } from '@playwright/test';
import { ORIGIN } from './ports';

const BASE = '/preview/app';
test.use({ baseURL: ORIGIN.sub, serviceWorkers: 'allow' });

test('alle Seiten laden mit Assets, ohne Fehler und ohne Verweise außerhalb des Unterpfads', async ({ page }) => {
  const failed: string[] = [];
  const errors: string[] = [];
  page.on('response', (response) => response.status() >= 400 && !response.url().endsWith('favicon.ico') && failed.push(`${response.status()} ${response.url()}`));
  page.on('pageerror', (error) => errors.push(error.message));
  for (const path of ['/de/', '/en/drinks/', '/es/visita/', '/de/gruppe/']) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
    const hrefs = await page.locator('a[href^="/"], link[href^="/"], img[src^="/"], script[src^="/"]').evaluateAll((nodes) => nodes.map((n) => n.getAttribute('href') ?? n.getAttribute('src') ?? ''));
    expect(hrefs.filter((h) => !h.startsWith(`${BASE}/`)), path).toEqual([]);
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(27, 15, 23)');
  }
  expect(failed).toEqual([]);
  expect(errors).toEqual([]);
});

test('Navigation, Sprachwechsel, Sprachwahl, Hash-Weiterleitung und 404 bleiben im Unterpfad', async ({ page }) => {
  await page.goto(`${BASE}/de/`);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator('.topnav').getByRole('link', { name: 'Drinks' }).click();
  await expect(page).toHaveURL(`${ORIGIN.sub}${BASE}/de/drinks/`);
  await page.locator('.langs').getByRole('link', { name: /ES/ }).click();
  await expect(page).toHaveURL(`${ORIGIN.sub}${BASE}/es/bebidas/`);
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE}/`);
  await expect(page.getByRole('link', { name: /English/ })).toHaveAttribute('href', `${BASE}/en/`);
  await page.goto('about:blank'); // frischer Aufruf wie über einen alten V3-Link
  await page.goto(`${BASE}/#besuch`);
  await expect(page).toHaveURL(/\/preview\/app\/(de|en|es)\/(besuch|visit|visita)\/$/);
  const response = await page.goto(`${BASE}/en/nope/`);
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'This page does not exist.' })).toBeVisible();
  await page.getByRole('link', { name: 'Go to home' }).click();
  await expect(page).toHaveURL(`${ORIGIN.sub}${BASE}/en/`);
});

test('Manifest, Service Worker und Sitemap tragen den Unterpfad', async ({ page, request }) => {
  const manifest = await (await request.get(`${BASE}/manifest.webmanifest`)).json();
  expect(manifest).toMatchObject({ start_url: `${BASE}/`, scope: `${BASE}/`, id: `${BASE}/` });
  expect(manifest.icons.every((icon: { src: string }) => icon.src.startsWith(`${BASE}/`))).toBe(true);
  const sitemap = await (await request.get(`${BASE}/sitemap.xml`)).text();
  expect(sitemap).toContain('<loc>https://chucca.example/preview/app/de/besuch/</loc>');
  await page.goto(`${BASE}/de/`);
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  expect(scope).toBe(`${ORIGIN.sub}${BASE}/`);
  expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toBe('https://chucca.example/preview/app/de/');
});
