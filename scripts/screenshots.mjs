/** QA-Hilfe: Screenshots laufender Seiten. Aufruf: [BROWSER=firefox|webkit] node scripts/screenshots.mjs <basis-url> <zielordner> "name|pfad|breite[|full]" … */
import * as pw from '@playwright/test';
const [,, base, out, ...specs] = process.argv; // spec: name|path|width[|full]
const engine = process.env.BROWSER ?? 'chromium'; // chromium | firefox | webkit
if (!['chromium', 'firefox', 'webkit'].includes(engine)) throw new Error(`BROWSER=${engine} unbekannt`);
const browser = await pw[engine].launch();
for (const spec of specs) {
  const [name, path, width, full] = spec.split('|');
  const page = await browser.newPage({ viewport: { width: +width, height: +width < 700 ? 844 : 900 }, deviceScaleFactor: 1, serviceWorkers: 'block' });
  const errors = [];
  page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(base + path, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  if (full) { // lazy images
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } scrollTo(0, 0); });
    await page.waitForTimeout(300);
  }
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: !!full });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  console.log(name, 'overflowX=' + overflow, errors.length ? 'ERRORS ' + errors.join(' | ') : '');
  await page.close();
}
await browser.close();
