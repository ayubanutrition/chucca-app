/** Öffentlicher Build: nur bestätigte Inhalte, sauberes SEO, keine Vorschau-Daten. */
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

test.use({ baseURL: 'http://127.0.0.1:4332' });

const dist = (file: string) => readFile(new URL(`../../dist-public/${file}`, import.meta.url), 'utf8');

test('zeigt keine Beispielkarte, keine Konzeptmotive, keine Termine und kein Vorschauband', async ({ page }) => {
  await page.goto('/de/');
  await expect(page.locator('.ribbon')).toHaveCount(0);
  await expect(page.locator('[data-events]')).toHaveCount(0);
  await expect(page.locator('.art')).toHaveCount(0);
  await expect(page.locator('.topnav a')).toHaveText(['Heute', 'Drinks', 'Besuch', 'Gruppe']);
  await expect(page.getByRole('link', { name: /Route öffnen/ }).first()).toBeVisible();
  await page.goto('/de/drinks/');
  await expect(page.getByRole('heading', { name: 'Die bestätigte Karte folgt.' })).toBeVisible();
  await expect(page.locator('[data-drink]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Alkoholfrei' })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,nofollow');
  await expect(page.locator('[data-taste-text]')).toContainText('an der Bar');
  await page.goto('/de/besuch/');
  await expect(page.getByRole('heading', { name: 'Der Weg hinein' })).toHaveCount(0);
  await expect(page.locator('address').first()).toContainText('Carrer del Llaüt 23');
});

test('leere Galerie ist ehrlich, nicht indexiert und nicht in der Navigation', async ({ page }) => {
  await page.goto('/de/galerie/');
  await expect(page.getByRole('heading', { name: 'Noch keine freigegebenen Fotos.' })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,nofollow');
  expect(await dist('sitemap.xml')).not.toContain('galer');
});

test('SEO: Canonical, wechselseitige hreflang, x-default, strukturierte Daten', async ({ page }) => {
  const sets: string[] = [];
  for (const path of ['/de/besuch/', '/en/visit/', '/es/visita/']) {
    await page.goto(path);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index,follow');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://chucca.example${path}`);
    sets.push((await page.locator('link[rel="alternate"]').evaluateAll((links) => links.map((l) => `${l.getAttribute('hreflang')}=${l.getAttribute('href')}`))).join('|'));
  }
  expect(new Set(sets).size).toBe(1);
  expect(sets[0]).toBe('de=https://chucca.example/de/besuch/|en=https://chucca.example/en/visit/|es=https://chucca.example/es/visita/|x-default=https://chucca.example/en/visit/');
  await page.goto('/es/');
  const data = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? '{}');
  expect(data).toMatchObject({ '@type': 'BarOrPub', address: { streetAddress: 'Riu Center, Carrer del Llaüt 23', postalCode: '07610', addressCountry: 'ES' } });
  expect(data.openingHours ?? data.openingHoursSpecification ?? data.priceRange ?? data.aggregateRating ?? data.telephone).toBeUndefined();
  await page.goto('/');
  await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute('href', 'https://chucca.example/');
});

test('Sitemap, robots und Manifest passen zum öffentlichen Stand', async ({ request }) => {
  const sitemap = await dist('sitemap.xml');
  // Heute, Besuch, Gruppe × 3 Sprachen; Karte und Galerie erst mit Bestand.
  expect(sitemap.match(/<url>/g)).toHaveLength(9);
  expect(sitemap).toContain('<loc>https://chucca.example/es/visita/</loc>');
  expect(sitemap).not.toContain('bebidas');
  expect(await dist('robots.txt')).toContain('Sitemap: https://chucca.example/sitemap.xml');
  const manifest = await (await request.get('/manifest.webmanifest')).json();
  expect(manifest).toMatchObject({ start_url: '/', scope: '/', display: 'standalone' });
  expect(manifest.icons.some((icon: { purpose: string }) => icon.purpose === 'maskable')).toBe(true);
});

test('der Build enthält keine internen Recherche-, Rechte- oder Beispieldaten', async () => {
  const { readdir } = await import('node:fs/promises');
  const root = new URL('../../dist-public/', import.meta.url);
  const files = (await readdir(root, { recursive: true })).filter((file) => /\.(html|js|json|xml|txt|webmanifest)$/.test(file));
  expect(files.length).toBeGreaterThan(15);
  for (const file of files) {
    const text = await readFile(new URL(file, root), 'utf8');
    for (const secret of ['rights_evidence', 'authorization_evidence', 'venue_evidence', 'mallorcaguide', 'lumaguide', 'info@chucca', '631 77', 'Beispielkarte', 'Sample menu', 'Carta de ejemplo', 'fixture-', 'Konzeptillustration']) {
      expect(text.includes(secret), `${file} enthält „${secret}“`).toBe(false);
    }
  }
  // Auch Binärdateien: kein Konzeptmotiv und kein nicht freigegebenes Bild darf im öffentlichen Build liegen.
  const all = await readdir(root, { recursive: true });
  expect(all.filter((file) => /concept-/.test(file))).toEqual([]);
  expect(all.filter((file) => /^_astro\/.*\.(webp|avif|png|jpe?g)$/.test(file))).toEqual([]);
});

test('Einladungen enthalten im öffentlichen Betrieb den Link zum Plan', async ({ page }) => {
  await page.clock.install({ time: new Date('2030-01-15T12:00:00Z') });
  await page.addInitScript(() => {
    const w = window as Window & { __copied?: string[] };
    w.__copied = [];
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (text: string) => void w.__copied?.push(text) }, configurable: true });
  });
  await page.goto('/en/group/');
  await page.getByLabel('Date').fill('2030-01-16');
  await page.getByLabel('Meeting time').fill('20:00');
  await page.getByRole('button', { name: 'Copy invitation' }).click();
  const copied = await page.evaluate(() => (window as Window & { __copied?: string[] }).__copied?.[0] ?? '');
  expect(copied).toMatch(/https:\/\/chucca\.example\/en\/group\/\?d=2030-01-16&t=20%3A00&id=[a-z0-9-]+$/);
  expect(copied).toContain('Directions: https://www.google.com/maps');
});
