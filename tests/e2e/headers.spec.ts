/**
 * Auslieferungs-Header und CSP, simuliert durch scripts/serve.mjs aus der erzeugten `_headers`.
 * Belegt: (1) Header je Pfadtyp, (2) keine CSP-Verstöße und keine Konsolenfehler auf allen Seiten,
 * (3) die Funktionen laufen unter der strengen CSP weiter. Ein echter Host ist damit NICHT geprüft.
 */
import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { ORIGIN } from './ports';

const MODES = [
  { name: 'Vorschau', origin: ORIGIN.preview, dir: 'dist', indexable: false },
  { name: 'öffentlich', origin: ORIGIN.public, dir: 'dist-public', indexable: true },
] as const;

const PAGES = [
  '/de/', '/de/drinks/', '/de/besuch/', '/de/gruppe/', '/de/galerie/',
  '/en/', '/en/drinks/', '/en/visit/', '/en/group/', '/en/gallery/',
  '/es/', '/es/bebidas/', '/es/visita/', '/es/grupo/', '/es/galeria/',
  '/', // Sprachwahl mit eigenem Inline-Skript
];

/** Sammelt CSP-Verstöße (Ereignis im Dokument) in `window.__csp`. */
async function watchCsp(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __csp: string[] };
    w.__csp = [];
    document.addEventListener('securitypolicyviolation', (event) => w.__csp.push(`${event.violatedDirective} ${event.blockedURI} ${event.sample}`));
  });
  const problems: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console: ${message.text()}`);
    if (message.type() === 'warning' && /Permissions-Policy|Content Security Policy|Unrecognized feature/i.test(message.text())) problems.push(`warning: ${message.text()}`);
  });
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  return {
    problems,
    violations: () => page.evaluate(() => (window as unknown as { __csp?: string[] }).__csp ?? []),
  };
}

for (const mode of MODES) {
  test.describe(`${mode.name}: Header`, () => {
    test.use({ baseURL: mode.origin });

    test('Cache-Control je Pfadtyp', async ({ request, page }) => {
      const cache = async (path: string) => (await request.get(path)).headers()['cache-control'];
      for (const path of ['/', '/de/', '/de/besuch/', '/en/visit/', '/es/visita/', '/sw.js', '/manifest.webmanifest', '/robots.txt', '/404.html', '/icon.svg']) {
        expect(await cache(path), path).toBe('no-cache');
      }
      if (mode.indexable) expect(await cache('/sitemap.xml'), 'sitemap').toBe('no-cache');
      await page.goto('/de/');
      const asset = await page.locator('script[type="module"][src^="/_astro/"]').first().getAttribute('src');
      expect(asset).toMatch(/^\/_astro\/.+\.js$/);
      expect(await cache(asset ?? ''), 'asset').toBe('public, max-age=31536000, immutable');
    });

    test('Sicherheits-Header an HTML, Skript, Bild und 404', async ({ request }) => {
      for (const path of ['/de/', '/sw.js', '/manifest.webmanifest', '/icon-192.png', '/de/gibt-es-nicht/']) {
        const response = await request.get(path);
        const headers = response.headers();
        expect(headers['x-content-type-options'], path).toBe('nosniff');
        expect(headers['referrer-policy'], path).toBe('strict-origin-when-cross-origin');
        expect(headers['cross-origin-opener-policy'], path).toBe('same-origin');
        for (const feature of ['geolocation', 'camera', 'microphone', 'usb']) expect(headers['permissions-policy'], path).toContain(`${feature}=()`);
        expect(headers['content-security-policy'], path).toBeTruthy();
      }
      expect((await request.get('/de/gibt-es-nicht/')).status()).toBe(404);
    });

    test('CSP: streng, ohne unsafe-eval und ohne unsafe-inline für Skripte', async ({ request }) => {
      const csp = (await request.get('/de/')).headers()['content-security-policy'] ?? '';
      const directive = (name: string) => csp.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name} `)) ?? '';
      expect(csp).not.toContain('unsafe-eval');
      expect(directive('script-src')).toMatch(/^script-src 'self'( 'sha256-[A-Za-z0-9+/=]+')+$/);
      expect(directive('style-src')).toMatch(/^style-src 'self'( 'sha256-[A-Za-z0-9+/=]+')+$/);
      expect(directive('style-src')).not.toContain('unsafe-inline');
      for (const required of ["default-src 'none'", "img-src 'self' data:", "font-src 'self'", "connect-src 'self'", "manifest-src 'self'", "worker-src 'self'", "base-uri 'none'", "form-action 'none'", "frame-ancestors 'none'", "object-src 'none'"]) {
        expect(csp.split(';').map((part) => part.trim()), required).toContain(required);
      }
      // Jeder Hash der Datei steht im Header: `_headers` und ausgelieferte Seite stimmen überein.
      const file = await readFile(new URL(`../../${mode.dir}/_headers`, import.meta.url), 'utf8');
      expect(file).toContain(csp);
    });

    test('X-Robots-Tag nur in der Vorschau (bzw. ohne Site-URL)', async ({ request }) => {
      for (const path of ['/de/', '/_astro/', '/robots.txt']) {
        const value = (await request.get(path)).headers()['x-robots-tag'];
        if (mode.indexable) expect(value, path).toBeUndefined();
        else expect(value, path).toBe('noindex, nofollow');
      }
    });
  });

  test.describe(`${mode.name}: keine CSP-Verstöße, Funktionen laufen`, () => {
    test.use({ baseURL: mode.origin });

    for (const path of PAGES) {
      test(`lädt ${path} ohne Verstöße`, async ({ page }) => {
        const watch = await watchCsp(page);
        const response = await page.goto(path);
        expect(response?.headers()['content-security-policy']).toBeTruthy();
        await page.waitForLoadState('networkidle');
        expect(await watch.violations()).toEqual([]);
        expect(watch.problems).toEqual([]);
      });
    }

    test('lädt die 404-Seite ohne Verstöße; ihr Inline-Skript läuft', async ({ page }) => {
      const watch = await watchCsp(page);
      const response = await page.goto('/en/gibt-es-nicht/');
      expect(response?.status()).toBe(404);
      await page.waitForLoadState('networkidle');
      // Das Inline-Skript blendet den Text der passenden Sprache ein.
      await expect(page.locator('[data-notfound="en"]')).toBeVisible();
      expect(await watch.violations()).toEqual([]);
      // Chromium meldet die 404-Antwort des Dokuments selbst als Konsolenfehler; alles andere zählt.
      expect(watch.problems.filter((text) => !/status of 404/.test(text))).toEqual([]);
    });

    test('Sprachwahl: Inline-Skripte merken die Wahl, Sprachwechsel bleibt auf der Seite', async ({ page }) => {
      const watch = await watchCsp(page);
      await page.goto('/');
      await page.locator('[data-locale="es"]').click();
      await expect(page).toHaveURL(/\/es\/$/);
      expect(await page.evaluate(() => localStorage.getItem('chucca-locale'))).toBe('es');
      await page.goto('/de/besuch/');
      await page.locator('.langs').getByRole('link', { name: /EN/ }).click();
      await expect(page).toHaveURL(/\/en\/visit\/$/);
      expect(await watch.violations()).toEqual([]);
      expect(watch.problems).toEqual([]);
    });

    test('Filter (Geschmack) und Planer-Download funktionieren', async ({ page }) => {
      const watch = await watchCsp(page);
      await page.goto('/de/drinks/');
      await page.getByRole('button', { name: 'Alkoholfrei', exact: true }).first().click();
      await expect(page.locator('[data-taste-headline]')).toHaveText('Dein Abend. Alkoholfrei.');
      await page.goto('/de/gruppe/');
      await page.getByLabel('Datum').fill('2030-01-16');
      await page.getByLabel('Uhrzeit').fill('20:00');
      const [file] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Kalender|calendar/i }).click()]);
      expect(file.suggestedFilename()).toBe('chucca-meetup.ics');
      expect(await readFile(await file.path(), 'utf8')).toContain('BEGIN:VCALENDAR');
      await expect(page.locator('[data-status]')).toContainText('Kalenderdatei erstellt');
      expect(await watch.violations()).toEqual([]);
      expect(watch.problems).toEqual([]);
    });

    test('Style-Attribute und eingebettetes CSS wirken (Layout nicht ohne Gestaltung)', async ({ page }) => {
      await page.goto('/de/besuch/');
      expect(await page.locator('.tabbar').evaluate((el) => getComputedStyle(el).position)).not.toBe('static');
      expect(await page.locator('.stack').first().evaluate((el) => el.getAttribute('style'))).toContain('--stack');
      expect(await page.locator('.stack[style*="--stack: var(--space-4)"]').first().evaluate((el) => getComputedStyle(el).getPropertyValue('--stack').trim())).not.toBe('');
    });

    test('Service Worker wird registriert, Seite bleibt ohne Verstöße', async ({ browser }) => {
      const context = await browser.newContext({ serviceWorkers: 'allow', baseURL: mode.origin });
      const page = await context.newPage();
      const watch = await watchCsp(page);
      await page.goto('/de/');
      const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
      expect(scope).toBe(`${mode.origin}/`);
      await page.reload();
      await page.goto('/de/drinks/');
      expect(await watch.violations()).toEqual([]);
      expect(watch.problems).toEqual([]);
      await context.close();
    });
  });
}

test.describe('Vorschau: Bildansicht', () => {
  test('Lightbox öffnet unter der CSP, Bilder laden', async ({ page }) => {
    const watch = await watchCsp(page);
    await page.goto('/de/galerie/');
    await page.locator('[data-shot]').nth(1).click();
    const dialog = page.getByRole('dialog', { name: 'Bildansicht' });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('[data-lightbox-image]')).toHaveJSProperty('complete', true);
    expect(await dialog.locator('[data-lightbox-image]').evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
    await page.keyboard.press('Escape');
    expect(await watch.violations()).toEqual([]);
    expect(watch.problems).toEqual([]);
  });
});
