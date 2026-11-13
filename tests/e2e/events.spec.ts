import { expect, test } from '@playwright/test';

/**
 * Event-Zustände auf „Heute“ (Vorschau-Build, Beispieltermine aus `src/content/fixtures/events.ts`).
 * Der öffentliche Build ohne bestätigte Termine ist in `public.spec.ts` geprüft („Modul fehlt“).
 */
const NOTICE = {
  de: 'Beispieltermine für die Vorschau – kein bestätigtes Programm.',
  en: 'Sample dates for the preview – not a confirmed programme.',
  es: 'Fechas de ejemplo para la vista previa: no es un programa confirmado.',
} as const;
const BADGE = { de: 'Beispiel', en: 'Sample', es: 'Ejemplo' } as const;

const addOneDay = (day: string): string => new Date(Date.parse(`${day}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);

for (const locale of ['de', 'en', 'es'] as const) {
  test(`${locale}: Beispieltermine sind gekennzeichnet, ohne Buchungs- oder Reservierungsversprechen`, async ({ page }) => {
    await page.goto(`/${locale}/`);
    const section = page.locator('[data-events]');
    await expect(section).toBeVisible();
    await expect(section.locator('[data-event]')).toHaveCount(2);
    await expect(section.locator('.notice')).toHaveText(NOTICE[locale]);
    await expect(section.locator('.badge')).toHaveText([BADGE[locale], BADGE[locale]]);
    await expect(section.getByRole('heading', { level: 2 })).toHaveCount(1);
    await expect(section.getByRole('heading', { level: 3 })).toHaveCount(2);
    // Termine sind reine Information: keine Links, keine Schaltflächen, kein Buchungsvokabular.
    await expect(section.locator('a, button')).toHaveCount(0);
    expect(await section.innerText()).not.toMatch(/reserv|buchen|book|ticket/i);
    for (const item of await section.locator('time').all()) await expect(item).toHaveAttribute('datetime', /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });
}

test('abgelaufene Termine verschwinden im Browser auch ohne neuen Build, zuletzt das ganze Modul', async ({ page }) => {
  await page.clock.install();
  await page.goto('/de/');
  const section = page.locator('[data-events]');
  const days = await section.locator('[data-event]').evaluateAll((items) => items.map((item) => (item as HTMLElement).dataset.hideAfter ?? ''));
  expect(days).toHaveLength(2);
  expect(days.every((day) => /^\d{4}-\d{2}-\d{2}$/.test(day))).toBe(true);
  const [first, second] = [...days].sort();
  expect(first).toBeDefined();
  expect(second).toBeDefined();
  await expect(section.locator('[data-event]:visible')).toHaveCount(2);

  // Am Tag nach dem ersten Termin (Mittag UTC = Nachmittag in Madrid) bleibt nur der zweite sichtbar.
  await page.clock.setSystemTime(new Date(`${addOneDay(first ?? '')}T12:00:00Z`));
  await page.clock.runFor(30_000);
  await expect(section.locator('[data-event]:visible')).toHaveCount(1);
  await expect(section).toBeVisible();

  // Nach dem letzten Termin ist das Modul weg, keine leere Überschrift bleibt stehen.
  await page.clock.setSystemTime(new Date(`${addOneDay(second ?? '')}T12:00:00Z`));
  await page.clock.runFor(30_000);
  await expect(section.locator('[data-event]:visible')).toHaveCount(0);
  await expect(section).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Demnächst bei CHUCCA' })).toBeHidden();
});
