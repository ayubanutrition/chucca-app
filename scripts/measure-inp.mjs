/**
 * Labormessung der Interaktionslatenz (Näherung an INP, KEINE Felddaten): Event Timing API, echte Eingaben über Playwright.
 * Bedingungen wie `scripts/measure.mjs` (390×844, CPU 4× gedrosselt, Netz gedrosselt, kalter Cache, ohne Service Worker).
 * Gemeldet wird je Seite die längste Interaktion (so berechnet INP bei weniger als 50 Interaktionen). Ziel ≤ 200 ms.
 * Aufruf: node scripts/measure-inp.mjs http://127.0.0.1:4321   (Vorschau-Build, z. B. `npm run build && npm run serve`)
 */
import { chromium } from '@playwright/test';

const [, , base] = process.argv;
if (!base) throw new Error('Aufruf: node scripts/measure-inp.mjs <basis-url>');

/** Je Seite: Schritte mit Beschriftung. Jeder Schritt ist eine echte Eingabe (Klick, Tasten). */
const SCENARIOS = [
  {
    path: '/de/drinks/',
    steps: [
      ['Chip „Alkoholfrei“', (p) => p.getByRole('button', { name: 'Alkoholfrei', exact: true }).first().click()],
      ['Chip „Fruchtig“', (p) => p.getByRole('button', { name: 'Fruchtig' }).click()],
      ['Suche tippen (5 Zeichen)', (p) => p.getByRole('searchbox').pressSequentially('gibts', { delay: 40 })],
      ['Filter zurücksetzen', (p) => p.getByRole('button', { name: 'Filter zurücksetzen' }).click()],
    ],
  },
  {
    path: '/de/gruppe/',
    steps: [
      ['Datum tippen (Segmente mm/dd/yyyy der Testumgebung)', async (p) => { await p.getByLabel('Datum').click(); await p.keyboard.type('01152031', { delay: 40 }); }],
      ['Uhrzeit tippen (hh:mm AM/PM)', async (p) => { await p.getByLabel('Uhrzeit').click(); await p.keyboard.type('0800PM', { delay: 40 }); }],
      ['Einladung teilen (Rückfall Zwischenablage)', (p) => p.getByRole('button', { name: 'Einladung teilen' }).click()],
    ],
  },
  {
    path: '/de/besuch/',
    steps: [
      ['Adresse kopieren', (p) => p.getByRole('button', { name: /Adresse kopieren/ }).first().click()],
      ['Personenzahl tippen', (p) => p.locator('[data-inquiry]').getByLabel('Personen').pressSequentially('8', { delay: 40 })],
    ],
  },
  {
    path: '/de/galerie/',
    steps: [
      ['Bildansicht öffnen', (p) => p.locator('[data-shot]').nth(1).click()],
      ['Pfeil rechts', (p) => p.keyboard.press('ArrowRight')],
      ['Escape', (p) => p.keyboard.press('Escape')],
    ],
  },
];

const browser = await chromium.launch();
const rows = [];
for (const { path, steps } of SCENARIOS) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block', locale: 'de-DE' });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.addInitScript(() => {
    window.__events = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) if (entry.interactionId) window.__events.push({ name: entry.name, duration: entry.duration, id: entry.interactionId });
    }).observe({ type: 'event', durationThreshold: 16, buffered: true });
  });
  await page.goto(base + path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  for (const [label, run] of steps) {
    await page.evaluate(() => { window.__events = []; });
    await run(page);
    await page.waitForTimeout(400); // Event-Timing-Einträge werden nach dem nächsten Frame gemeldet
    const events = await page.evaluate(() => window.__events);
    // Je Interaktion (gleiche id) zählt der längste Eintrag.
    const byId = new Map();
    for (const e of events) byId.set(e.id, Math.max(byId.get(e.id) ?? 0, e.duration));
    const worst = Math.max(0, ...byId.values());
    rows.push({ Seite: path, Schritt: label, Interaktionen: byId.size, 'längste ms': Math.round(worst), '≤ 200 ms': worst <= 200 ? 'ja' : 'NEIN' });
  }
  await context.close();
}
await browser.close();
console.table(rows);
const worst = Math.max(...rows.map((r) => r['längste ms']));
console.log(`Längste gemessene Interaktion: ${worst} ms (Labor, CPU 4× gedrosselt; Event-Timing-Auflösung 8 ms; Felddaten nicht vorhanden)`);
process.exitCode = worst > 200 ? 1 : 0;
