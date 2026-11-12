/**
 * Update-Pfad des Service Workers im echten Browser (Chromium), mit zwei Build-Ständen derselben Seite.
 *
 * Läuft NICHT im normalen `npm run test:e2e`, sondern über `npm run test:sw-update`
 * (playwright.update.config.ts): scripts/build-update.mjs baut {Vorschau, öffentlich} × {v1, v2} nach dist-update/,
 * scripts/serve-update.mjs liefert sie nacheinander vom selben Ursprung aus (`/__switch?to=v2`).
 * Die Stände unterscheiden sich in der Build-Kennung: sw.js, Cache-Namen, <meta name="chucca-build">.
 *
 * Belegt: neue Version installiert sich und WARTET (kein ungefragtes skipWaiting) → Hinweis in der Sprache der Seite →
 * erst der Klick aktiviert → genau ein Reload → v2 steuert, alte Caches gelöscht; Erstbesuch ohne Hinweis;
 * Planer-Entwurf vor und nach dem Wechsel; HTML-Cache nur im öffentlichen Modus.
 * Grenzen: nur Chromium, ein Tab, lokaler Server ohne CDN/Host-Header.
 */
import { expect, test, type Page } from '@playwright/test';
import { ORIGIN } from './ports';

const MODES = [
  { name: 'öffentlich', origin: ORIGIN.updatePublic, storesHtml: true },
  { name: 'Vorschau', origin: ORIGIN.updatePreview, storesHtml: false },
] as const;

const PLAN = { date: '2030-05-17', time: '20:30' };

const buildOf = (page: Page) => page.locator('meta[name="chucca-build"]').getAttribute('content');
const cacheNames = (page: Page) => page.evaluate(async () => (await caches.keys()).sort());
const loads = (page: Page) => page.evaluate(() => Number(sessionStorage.getItem('__loads') ?? 0));
const worker = (page: Page) =>
  page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    return {
      active: registration?.active?.state ?? null,
      waiting: registration?.waiting?.state ?? null,
      controlled: Boolean(navigator.serviceWorker.controller),
    };
  });
const cachedHtml = (page: Page) =>
  page.evaluate(async () => {
    const out: string[] = [];
    for (const name of await caches.keys()) for (const request of await (await caches.open(name)).keys()) out.push(new URL(request.url).pathname);
    return out.filter((path) => /\/$/.test(path) || path.endsWith('.html'));
  });

test.beforeEach(async ({ page }) => {
  // Zählt Dokument-Ladevorgänge dieser Sitzung (überlebt Reloads): „genau ein Reload“ ist so messbar.
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem('__loads', String(Number(sessionStorage.getItem('__loads') ?? 0) + 1));
    } catch {
      /* about:blank */
    }
  });
});

async function publish(origin: string, to: 'v1' | 'v2'): Promise<void> {
  const response = await fetch(`${origin}/__switch?to=${to}`);
  expect(await response.text()).toBe(to);
}

/** Stand v1 laden, bis der Worker aktiv ist und die Seite steuert (zweiter Besuch). */
async function installV1(page: Page, origin: string, path: string): Promise<void> {
  await publish(origin, 'v1');
  await page.goto(`${origin}${path}`);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect.poll(() => worker(page).then((state) => state.controlled && state.active === 'activated')).toBe(true);
  expect(await buildOf(page)).toBe('update-v1');
}

/** Stand v2 veröffentlichen und die Prüfung auf Updates auslösen; wartet, bis v2 installiert ist und wartet. */
async function releaseV2(page: Page, origin: string): Promise<void> {
  await publish(origin, 'v2');
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    await registration?.update();
  });
  await expect.poll(() => worker(page).then((state) => state.waiting)).toBe('installed');
}

const toastOpen = (page: Page) => page.locator('[data-toast][data-open="true"]');

for (const mode of MODES) {
  test.describe(`Update-Pfad · ${mode.name}`, () => {
    test('v2 wartet, Hinweis, Klick aktiviert, genau ein Reload, alte Caches weg', async ({ page }) => {
      await installV1(page, mode.origin, '/de/gruppe/');

      // (1) v1 steuert; Caches tragen die Kennung v1.
      const before = await cacheNames(page);
      expect(before.some((name) => name.endsWith('assets-update-v1'))).toBe(true);
      expect(before.some((name) => name.endsWith('pages-update-v1'))).toBe(mode.storesHtml);
      expect(before.some((name) => name.includes('update-v2'))).toBe(false);
      expect(await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL)).toBe(`${mode.origin}/sw.js`);

      // (7) offene Eingabe im Planer
      await page.getByLabel('Datum').fill(PLAN.date);
      await page.getByLabel('Uhrzeit').fill(PLAN.time);
      const draft = await page.evaluate(() => sessionStorage.getItem('chucca-plan-draft'));
      expect(draft).toContain(PLAN.date);
      const loadsBefore = await loads(page);

      // (2) v2 veröffentlichen, Update anstoßen
      await releaseV2(page, mode.origin);

      // (3) Hinweis da – aber nichts ist aktiviert, nichts wurde neu geladen
      await expect(toastOpen(page)).toContainText('Eine neue Version ist bereit.');
      await expect(toastOpen(page).getByRole('button', { name: 'Neu laden' })).toBeVisible();
      await page.waitForTimeout(1500);
      expect(await worker(page)).toEqual({ active: 'activated', waiting: 'installed', controlled: true });
      expect(await loads(page)).toBe(loadsBefore);
      expect(await buildOf(page)).toBe('update-v1');
      const waitingCaches = await cacheNames(page);
      expect(waitingCaches.some((name) => name.endsWith('assets-update-v1'))).toBe(true); // v1 noch nicht aufgeräumt
      expect(waitingCaches.some((name) => name.endsWith('assets-update-v2'))).toBe(true); // v2 hat vorab geladen
      // Eingabe unverändert, solange nicht neu geladen wird
      await expect(page.getByLabel('Datum')).toHaveValue(PLAN.date);
      await expect(page.getByLabel('Uhrzeit')).toHaveValue(PLAN.time);

      // (4) Klick → genau ein Reload → v2 steuert
      await toastOpen(page).getByRole('button', { name: 'Neu laden' }).click();
      await page.waitForFunction(() => document.querySelector('meta[name="chucca-build"]')?.getAttribute('content') === 'update-v2');
      await page.waitForTimeout(1500); // ein zweiter (Schleifen-)Reload würde hier auffallen
      expect(await loads(page)).toBe(loadsBefore + 1);
      expect(await worker(page)).toEqual({ active: 'activated', waiting: null, controlled: true });
      expect(await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL)).toBe(`${mode.origin}/sw.js`);
      await expect(page.locator('[data-toast][data-open="true"]')).toHaveCount(0);

      // (5) + (8) Caches: nur noch v2; HTML nur im öffentlichen Modus
      const after = await cacheNames(page);
      expect(after.filter((name) => name.includes('update-v1'))).toEqual([]);
      expect(after.some((name) => name.endsWith('assets-update-v2'))).toBe(true);
      expect(after.some((name) => name.endsWith('pages-update-v2'))).toBe(mode.storesHtml);
      const html = await cachedHtml(page);
      if (mode.storesHtml) expect(html).toContain('/de/gruppe/');
      else expect(html).toEqual([]);

      // (7) Planer-Entwurf bleibt über den Reload erhalten (sessionStorage), das Formular füllt sich daraus wieder.
      await expect(page.getByLabel('Datum')).toHaveValue(PLAN.date);
      await expect(page.getByLabel('Uhrzeit')).toHaveValue(PLAN.time);
    });

    test('neue Navigation statt update(): v2 wartet ebenfalls, Hinweis erscheint', async ({ page }) => {
      await installV1(page, mode.origin, '/de/besuch/');
      const loadsBefore = await loads(page);
      await publish(mode.origin, 'v2');
      await page.goto(`${mode.origin}/de/gruppe/`);
      await expect(toastOpen(page)).toContainText('Eine neue Version ist bereit.');
      expect((await worker(page)).waiting).toBe('installed');
      await page.waitForTimeout(1000);
      expect(await loads(page)).toBe(loadsBefore + 1); // nur die eigene Navigation
      expect((await cacheNames(page)).some((name) => name.endsWith('assets-update-v1'))).toBe(true);
    });
  });
}

test.describe('Sprachen und Erstbesuch', () => {
  const origin = ORIGIN.updatePublic;
  for (const { locale, text, button } of [
    { locale: 'en', text: 'A new version is ready.', button: 'Reload' },
    { locale: 'es', text: 'Hay una versión nueva disponible.', button: 'Recargar' },
  ]) {
    test(`Hinweis auf ${locale.toUpperCase()}`, async ({ page }) => {
      await installV1(page, origin, `/${locale}/`);
      await releaseV2(page, origin);
      await expect(toastOpen(page)).toContainText(text);
      await expect(toastOpen(page).getByRole('button', { name: button })).toBeVisible();
    });
  }

  test('Erstbesuch ohne vorherigen Controller: kein Hinweis, kein Reload', async ({ page }) => {
    await publish(origin, 'v1');
    await page.goto(`${origin}/de/`);
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    // Worker übernimmt die Seite (clients.claim) – das darf weder Reload noch Hinweis auslösen.
    await expect.poll(() => worker(page).then((state) => state.controlled)).toBe(true);
    await page.waitForTimeout(1500);
    expect(await loads(page)).toBe(1);
    await expect(page.locator('[data-toast][data-open="true"]')).toHaveCount(0);
    expect(await page.locator('[data-toast-text]').textContent()).toBe('');
  });
});
