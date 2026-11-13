/**
 * QA-Hilfe: erzeugt die Belegbilder in `docs/evidence/` aus dem laufenden Build neu: alle Seiten in drei Sprachen und fünf Breiten
 * (Abschnitt 1) sowie einzelne Zustände wie Fehler, Fallbacks, Bildansicht, Termine (Abschnitt 2).
 * Aufruf: node scripts/screenshot-states.mjs <vorschau-url> <zielordner> [<oeffentlich-url>]
 *   <vorschau-url>     Server auf dist/ (z. B. `node scripts/serve.mjs dist 4321`)
 *   <oeffentlich-url>  Server auf dist-public/ (nach `npm run build:test`); ohne ihn entfallen die drei `public-*`-Bilder
 * Die Zustände entsprechen den Browsertests (`tests/e2e/flows.spec.ts`, `events.spec.ts`). Bilder: JPEG, ohne Service Worker,
 * Seiten über 1000 px Breite werden auf 1000 px verkleinert. Zeitabhängige Inhalte (Beispieltermine, Uhr) zeigen den Tag der Aufnahme.
 */
import * as pw from '@playwright/test';
import sharp from 'sharp';

const [, , base, out, publicBase] = process.argv;
if (!base || !out) throw new Error('Aufruf: node scripts/screenshot-states.mjs <vorschau-url> <zielordner> [<oeffentlich-url>]');

const browser = await pw.chromium.launch();

/** Teilen und Zwischenablage abschalten, damit der Rückfall „Text zum manuellen Kopieren“ erscheint. */
const noSharing = () => {
  Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
  Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
};

const tomorrow = () => new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);

async function shoot(name, width, setup, { height = width < 700 ? 844 : 900, clip } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, serviceWorkers: 'block', locale: 'de-DE' });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  await setup(page);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
  const target = clip ? page.locator(clip) : page;
  await target.screenshot({ path: `${out}/${name}.jpg`, type: 'jpeg', quality: 80 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  console.log(name, `overflowX=${overflow}`, errors.length ? `ERRORS ${errors.join(' | ')}` : '');
  await context.close();
}

// ---------- Abschnitt 1: Seiten ----------
/** Ganze Seite (nachladende Bilder vorher durchscrollen) oder nur der erste Bildschirm. */
async function shootPage(name, root, path, width, { full = true, search = '' } = {}) {
  const context = await browser.newContext({ viewport: { width, height: width < 700 ? 844 : 900 }, serviceWorkers: 'block', locale: 'de-DE' });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(root + path, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  if (search) {
    await page.getByRole('searchbox').fill(search);
    await page.getByRole('heading', { name: 'Nichts gefunden.' }).scrollIntoViewIfNeeded();
  }
  if (full) {
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) {
        scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 60));
      }
      scrollTo(0, 0);
    });
    await page.waitForTimeout(300);
  }
  let buffer = await page.screenshot({ type: 'jpeg', quality: 80, fullPage: full });
  if (width > 1000) buffer = await sharp(buffer).resize({ width: 1000 }).jpeg({ quality: 80 }).toBuffer();
  await sharp(buffer).toFile(`${out}/${name}.jpg`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  console.log(name, `overflowX=${overflow}`, errors.length ? `ERRORS ${errors.join(' | ')}` : '');
  await context.close();
}

for (const [name, path, width, opts] of [
  ['heute-es-320', '/es/', 320],
  ['heute-de-390', '/de/', 390],
  ['gruppe-en-430', '/en/group/', 430],
  ['heute-en-768', '/en/', 768],
  ['heute-de-1440', '/de/', 1440],
  ['drinks-de-390', '/de/drinks/', 390],
  ['drinks-en-1440', '/en/drinks/', 1440],
  ['drinks-nulltreffer-de-390', '/de/drinks/', 390, { full: false, search: 'gibtsnicht' }],
  ['besuch-es-390', '/es/visita/', 390],
  ['besuch-de-1440', '/de/besuch/', 1440],
  ['gruppe-de-1440', '/de/gruppe/', 1440],
  ['galerie-es-390', '/es/galeria/', 390],
  ['galerie-de-1440', '/de/galerie/', 1440],
  ['404-es-390', '/es/diese-seite-gibt-es-nicht/', 390, { full: false }],
  ['sprachwahl-1440', '/', 1440],
]) await shootPage(name, base, path, width, opts);
if (publicBase) {
  await shootPage('public-heute-de-1440', publicBase, '/de/', 1440);
  await shootPage('public-drinks-de-390', publicBase, '/de/drinks/', 390);
  await shootPage('public-galerie-de-390', publicBase, '/de/galerie/', 390, { full: false });
}

// ---------- Abschnitt 2: Zustände ----------
// 1. Planer: Fehler am Feld (leere Eingabe), Fokus und Meldung sichtbar
await shoot('zustand-gruppe-fehler-de-390', 390, async (page) => {
  await page.goto(`${base}/de/gruppe/`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Im Kalender speichern' }).click();
  await page.getByLabel('Datum').scrollIntoViewIfNeeded();
}, { height: 1480 }); // hoch genug, dass Feld, Karte und Fehlermeldung zugleich sichtbar sind

// 2. Planer: weder Teilen noch Zwischenablage, Text zum manuellen Kopieren
await shoot('zustand-gruppe-manuell-en-390', 390, async (page) => {
  await page.addInitScript(noSharing);
  await page.goto(`${base}/en/group/`, { waitUntil: 'networkidle' });
  await page.getByLabel('Date').fill(tomorrow());
  await page.getByLabel('Meeting time').fill('20:00');
  await page.getByRole('button', { name: 'Copy invitation' }).click();
  await page.getByLabel('Text to copy').scrollIntoViewIfNeeded();
});

// 3. Besuch: vorbereitete Nachricht, ausdrücklich „noch nicht gesendet“
await shoot('zustand-besuch-nachricht-es-390', 390, async (page) => {
  await page.addInitScript(noSharing);
  await page.goto(`${base}/es/visita/`, { waitUntil: 'networkidle' });
  const form = page.locator('[data-inquiry]');
  await form.getByLabel('Personas').fill('8');
  await form.getByLabel('Fecha').fill(tomorrow());
  await form.getByLabel('Hora', { exact: true }).fill('21:00');
  await form.getByRole('button').first().click();
  await form.locator('[data-inquiry-status]').scrollIntoViewIfNeeded();
});

// 4. Galerie: Bildansicht mobil und Desktop
for (const [width, name] of [[390, 'zustand-galerie-bildansicht-de-390'], [1440, 'zustand-galerie-bildansicht-de-1440']]) {
  await shoot(name, width, async (page) => {
    await page.goto(`${base}/de/galerie/`, { waitUntil: 'networkidle' });
    await page.locator('[data-shot]').nth(1).click();
    await page.getByRole('dialog', { name: 'Bildansicht' }).waitFor();
    await page.waitForFunction(() => document.querySelector('[data-lightbox-image]')?.complete === true);
  });
}

// 5. Heute: Beispieltermine mit Kennzeichnung (nur Vorschau)
await shoot('zustand-heute-termine-de-1440', 1440, async (page) => {
  await page.goto(`${base}/de/`, { waitUntil: 'networkidle' });
  await page.locator('[data-events]').scrollIntoViewIfNeeded();
}, { clip: '[data-events]' });

// 6. Drinks: gefilterte Karte „Alkoholfrei“ (gleichwertige Auswahl)
await shoot('zustand-drinks-alkoholfrei-de-390', 390, async (page) => {
  await page.goto(`${base}/de/drinks/`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Alkoholfrei', exact: true }).first().click();
  await page.locator('[data-taste-headline]').scrollIntoViewIfNeeded();
});

await browser.close();
