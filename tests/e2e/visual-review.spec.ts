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
