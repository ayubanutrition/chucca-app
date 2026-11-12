/** Regressionen aus dem visuellen Review (11/2026): Umbruch langer ES/EN-Texte, Ausrichtung in Formular und Zeitentabellen. */
import { expect, test } from '@playwright/test';
import { ORIGIN } from './ports';

test('Karte: „Preis auf Anfrage“ bricht in höchstens zwei Zeilen um (ES, 390 px)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/es/bebidas/');
  const lines = await page.locator('.drink__price--none').evaluateAll((els) =>
    els.map((el) => Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight))),
  );
  expect(lines.length).toBeGreaterThan(0);
  for (const n of lines) expect(n).toBeLessThanOrEqual(2);
});

for (const lang of [
  { path: '/es/visita/', name: 'ES' },
  { path: '/de/besuch/', name: 'DE' },
]) {
  test(`Gruppenformular: Personenzahl, Datum und Uhrzeit liegen auf einer Linie (${lang.name}, 1440 px)`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${ORIGIN.public}${lang.path}`);
    const bottoms = await page.locator('.fields--trio .input').evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().bottom)));
    expect(bottoms).toHaveLength(3);
    expect(new Set(bottoms).size).toBe(1);
  });
}

test('Besuch (Zeiten-Fixture): Wochentabelle und Ausnahmeliste teilen die Zeitenspalte', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.setFixedTime(new Date('2099-03-12T20:00:00Z'));
  await page.goto(`${ORIGIN.hours}/es/visita/`);
  const lefts = await page.locator('dl.hours dd').evaluateAll((els) => els.filter((el) => el.getBoundingClientRect().width > 0).map((el) => Math.round(el.getBoundingClientRect().left)));
  expect(lefts.length).toBeGreaterThan(7);
  expect(new Set(lefts).size).toBe(1);
});

/* ---------- Review 2 (11/2026): EN-Seiten und Tablet-/Desktop-Breiten ---------- */

test('Besuch (Zeiten-Fixture, 1440 px): Zeiten stehen rechts neben der Überschrift, ohne Umbruch', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.clock.setFixedTime(new Date('2099-06-17T18:00:00Z'));
  await page.goto(`${ORIGIN.hours}/en/visit/`);
  const heading = await page.locator('#hours-title').boundingBox();
  const table = await page.locator('dl.hours[data-hours]').boundingBox();
  const exceptions = await page.locator('[data-exceptions]').boundingBox();
  expect(heading && table && exceptions).toBeTruthy();
  // Tabelle und Ausnahmen beginnen in der Inhaltsspalte rechts von der Überschrift
  expect(table!.x).toBeGreaterThan(heading!.x + heading!.width);
  expect(Math.round(exceptions!.x)).toBe(Math.round(table!.x));
  // Eine Zeit wie „18:00–23:00“ bricht nicht um (eine Zeile hoch)
  const lineBreaks = await page.locator('dl.hours[data-hours] dd').evaluateAll((els) =>
    els.map((el) => Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight))),
  );
  for (const n of lineBreaks) expect(n).toBe(1);
});

test('Besuch (Zeiten-Fixture, 1440 px): Hinweis „nicht bestätigt“ steht neben der Überschrift, nicht darunter', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${ORIGIN.hours}/en/visit/`); // reale Uhr: die Fixture-Zeiten (2099) gelten nicht
  const heading = await page.locator('#hours-title').boundingBox();
  const text = await page.locator('section[aria-labelledby="hours-title"] > p:not(.notice)').boundingBox();
  expect(text!.x).toBeGreaterThan(heading!.x + heading!.width);
});

test('Karte (1440 px): „Preis auf Anfrage“ steht in einer Zeile', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/en/drinks/');
  const lines = await page.locator('.drink__price--none').evaluateAll((els) =>
    els.map((el) => Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight))),
  );
  expect(lines.length).toBeGreaterThan(0);
  for (const n of lines) expect(n).toBe(1);
});

test('Karte: Name steht bündig oben, auch wenn der Preis zweizeilig ist (Gin & Tonic, 768 px)', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto('/en/drinks/');
  const item = page.locator('.drink', { hasText: 'Gin & Tonic' });
  const name = await item.locator('.drink__name').boundingBox();
  const price = await item.locator('.drink__price').boundingBox();
  expect(Math.abs(name!.y - price!.y)).toBeLessThanOrEqual(8);
});

test('Karte (öffentlich, 1440 px): „Karte folgt“ ist kleiner als die Abschnittsüberschrift', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${ORIGIN.public}/en/drinks/`);
  const sizes = await page.evaluate(() => ({
    section: parseFloat(getComputedStyle(document.querySelector('#menu-title')!).fontSize),
    pending: parseFloat(getComputedStyle(document.querySelector('[data-menu-pending] h3')!).fontSize),
  }));
  expect(sizes.pending).toBeLessThan(sizes.section * 0.8);
});

test('Heute (öffentlich, 1440 px): ohne Bild keine leere Hälfte, Überschrift höchstens zwei Zeilen', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${ORIGIN.public}/en/`);
  const lines = await page.locator('h1').evaluate((el) => Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)));
  expect(lines).toBeLessThanOrEqual(2);
  const hero = await page.locator('.hero').boundingBox();
  expect(hero!.height).toBeLessThan(680);
});

test('Besuch: Beschriftung „CHUCCA“ in der Skizze berührt den Rahmen des Riu Centers nicht (EN/DE/ES)', async ({ page }) => {
  for (const path of ['/en/visit/', '/de/besuch/', '/es/visita/']) {
    await page.goto(path);
    const gap = await page.evaluate(() => {
      const svg = document.querySelector('.way__map svg')!;
      const box = svg.querySelector('rect[width="390"]') as SVGRectElement;
      const labels = [...svg.querySelectorAll('text')].filter((el) => el.getAttribute('x') === '486') as SVGTextElement[];
      const right = box.x.baseVal.value + box.width.baseVal.value;
      return Math.min(...labels.map((el) => right - (el.getBBox().x + el.getBBox().width)));
    });
    expect(gap, path).toBeGreaterThanOrEqual(12);
  }
});

test('Galerie (390 px): kein halb leeres Raster, einzelne Hochformate füllen die Zeile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/en/gallery/');
  const boxes = await page.locator('.gallery .shot').evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return { top: Math.round(r.top + window.scrollY), width: Math.round(r.width) };
    }),
  );
  const full = Math.max(...boxes.map((b) => b.width));
  const rows = new Map<number, number>();
  // Zeilen über die Oberkante gruppieren (Toleranz 4 px); Halbbreite zählt 1, volle Breite 2
  for (const b of boxes) {
    const key = [...rows.keys()].find((k) => Math.abs(k - b.top) <= 4) ?? b.top;
    rows.set(key, (rows.get(key) ?? 0) + (b.width < full * 0.75 ? 1 : 2));
  }
  for (const units of rows.values()) expect(units).toBe(2);
});
