/**
 * Besuch/Heute mit BESTÄTIGTEN Öffnungszeiten – gegen den Testbuild `dist-hours` (npm run build:hours) mit der
 * gekennzeichneten Test-Fixture `src/content/fixtures/hours.ts` (erfundene Zeiten im Jahr 2099, keine Venue-Fakten)
 * und gefrorener Uhr. Dazu Leak-Tests: Die Fixture darf in keinem regulären Build vorkommen.
 *
 * Fixture-Woche (Ortszeit Madrid): So zu · Mo–Do 18–23 · Fr 18–02 · Sa 17–03.
 * Ausnahmen: 2099-03-05 12–14 · 2099-06-18 zu · 2099-06-20 12–16 · 2099-07-04 zu. Gültig 2099-01-01 bis 2099-12-31.
 * Juni 2099 = MESZ (UTC+2).
 */
import { readdir, readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { ORIGIN } from './ports';

const MARKER = 'TESTFIXTURE-HOURS';
type L = 'de' | 'en' | 'es';
const LOCALES: L[] = ['de', 'en', 'es'];
const VISIT: Record<L, string> = { de: '/de/besuch/', en: '/en/visit/', es: '/es/visita/' };

/** Erwartete Statuszeilen auf „Heute“ je Sprache (aus src/i18n/*.ts). */
const TEXT = {
  de: { open: (t: string) => new RegExp(`^Jetzt geöffnet – bis ${t} Uhr\\.$`), closed: (d: string, t: string) => new RegExp(`^Gerade geschlossen\\. Öffnet am ${d} um ${t} Uhr\\.$`), unconfirmed: /noch nicht bestätigt/, closedWord: 'geschlossen', exceptionsTitle: 'An diesen Tagen anders', sat: 'Samstag' },
  en: { open: (t: string) => new RegExp(`^Open now – until ${t}\\.$`), closed: (d: string, t: string) => new RegExp(`^Closed right now\\. Opens ${d} at ${t}\\.$`), unconfirmed: /have not been confirmed/, closedWord: 'closed', exceptionsTitle: 'Different on these days', sat: 'Saturday' },
  es: { open: (t: string) => new RegExp(`^Abierto ahora\\. Hora de cierre: ${t}\\.$`), closed: (d: string, t: string) => new RegExp(`^Cerrado ahora\\. Vuelve a abrir el ${d} \\(${t}\\)\\.$`), unconfirmed: /aún no está confirmado/, closedWord: 'cerrado', exceptionsTitle: 'Estos días es distinto', sat: 'sábado' },
} as const;
const DAY: Record<L, Record<'mon' | 'fri', string>> = {
  de: { mon: 'Montag', fri: 'Freitag' },
  en: { mon: 'Monday', fri: 'Friday' },
  es: { mon: 'lunes', fri: 'viernes' },
};

const at = async (page: Page, iso: string, path: string, origin = ORIGIN.hours) => {
  await page.clock.setFixedTime(new Date(iso));
  await page.goto(`${origin}${path}`);
};
const status = (page: Page) => page.locator('[data-now-hours]');

test.describe('Testbuild mit Fixture-Zeiten: Kennzeichnung', () => {
  for (const locale of LOCALES) {
    test(`${locale}: Fixture ist sichtbar als Test gekennzeichnet, Build ist noindex`, async ({ page, request }) => {
      await at(page, '2099-06-17T18:00:00Z', `/${locale}/`);
      await expect(page.locator('[data-test-fixture]')).toContainText(MARKER);
      await page.goto(`${ORIGIN.hours}${VISIT[locale]}`);
      await expect(page.locator('[data-test-fixture]')).toContainText(MARKER);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
      expect(await (await request.get(`${ORIGIN.hours}/robots.txt`)).text()).toContain('Disallow: /');
    });
  }
});

test.describe('Heute: Öffnungsstatus mit bestätigten Zeiten', () => {
  for (const locale of LOCALES) {
    const t = TEXT[locale];
    test(`${locale}: offen (Mi 20:00 → bis 23:00)`, async ({ page }) => {
      await at(page, '2099-06-17T18:00:00Z', `/${locale}/`);
      await expect(status(page)).toHaveText(t.open('23:00'));
    });
    test(`${locale}: geschlossen vor Öffnung, nennt nächsten Tag (Mo 12:00 → Mo 18:00)`, async ({ page }) => {
      await at(page, '2099-06-22T10:00:00Z', `/${locale}/`);
      await expect(status(page)).toHaveText(t.closed(DAY[locale].mon, '18:00'));
    });
    test(`${locale}: Nachtschicht über Mitternacht (Sa 01:30 läuft aus Freitag bis 02:00)`, async ({ page }) => {
      await at(page, '2099-06-19T23:30:00Z', `/${locale}/`);
      await expect(status(page)).toHaveText(t.open('02:00'));
    });
    test(`${locale}: Nachtschicht endet (Sa 02:30 geschlossen; Sa 17:00-Schicht erst später)`, async ({ page }) => {
      // Sa 2099-06-20 hat die Ausnahme 12–16; 02:30 Madrid liegt nach dem Ende der Freitagsschicht (02:00).
      await at(page, '2099-06-20T00:30:00Z', `/${locale}/`);
      await expect(status(page)).toHaveText(t.closed(TEXT[locale].sat, '12:00'));
    });
    test(`${locale}: Samstagsschicht läuft bis 03:00 in den Sonntag`, async ({ page }) => {
      await at(page, '2099-06-27T23:00:00Z', `/${locale}/`);
      await expect(status(page)).toHaveText(t.open('03:00'));
      await at(page, '2099-06-28T02:00:00Z', `/${locale}/`); // So 04:00 Madrid: zu, Sonntag geschlossen → Montag
      await expect(status(page)).toHaveText(t.closed(DAY[locale].mon, '18:00'));
    });
    test(`${locale}: Ausnahme „geschlossen“ schlägt die Woche (Do 06-18 20:00)`, async ({ page }) => {
      await at(page, '2099-06-18T18:00:00Z', `/${locale}/`);
      await expect(status(page)).toHaveText(t.closed(DAY[locale].fri, '18:00'));
    });
    test(`${locale}: Ausnahme mit eigenen Zeiten (Sa 06-20 13:00 → bis 16:00)`, async ({ page }) => {
      await at(page, '2099-06-20T11:00:00Z', `/${locale}/`);
      await expect(status(page)).toHaveText(t.open('16:00'));
    });
    test(`${locale}: außerhalb des bestätigten Zeitraums wieder „nicht bestätigt“`, async ({ page }) => {
      for (const iso of ['2098-12-15T12:00:00Z', '2100-01-05T12:00:00Z']) {
        await at(page, iso, `/${locale}/`);
        await expect(status(page)).toHaveText(t.unconfirmed);
      }
    });
  }
});

test.describe('Besuch: Wochentabelle und Ausnahmetage', () => {
  for (const locale of LOCALES) {
    const t = TEXT[locale];
    test(`${locale}: Wochentabelle, heutiger Tag hervorgehoben`, async ({ page }) => {
      await at(page, '2099-06-20T10:00:00Z', VISIT[locale]); // Samstag
      const table = page.locator('dl[data-hours]');
      await expect(table.locator('dd[data-day]')).toHaveText(['18:00–23:00', '18:00–23:00', '18:00–23:00', '18:00–23:00', '18:00–02:00', '17:00–03:00', t.closedWord]);
      await expect(table.locator('[data-today="true"]')).toHaveCount(2);
      await expect(table.locator('dd[data-day="6"]')).toHaveAttribute('data-today', 'true');
      await expect(table.locator('dd[data-day="6"]')).toHaveText('17:00–03:00');
      await expect(table.locator('dt[data-day="6"]')).toHaveText(t.sat);
    });
    test(`${locale}: Ausnahmen – vergangene ausgeblendet, heutige hervorgehoben, künftige sichtbar`, async ({ page }) => {
      await at(page, '2099-06-20T10:00:00Z', VISIT[locale]);
      const box = page.locator('[data-exceptions]');
      await expect(box).toBeVisible();
      await expect(box.getByRole('heading', { level: 3 })).toHaveText(t.exceptionsTitle);
      await expect(box.locator('dd[data-exception="2099-03-05"]')).toBeHidden();
      await expect(box.locator('dt[data-exception="2099-03-05"]')).toBeHidden();
      await expect(box.locator('dd[data-exception="2099-06-18"]')).toBeHidden();
      await expect(box.locator('dd[data-exception="2099-06-20"]')).toBeVisible();
      await expect(box.locator('dd[data-exception="2099-06-20"]')).toHaveText('12:00–16:00');
      await expect(box.locator('dd[data-exception="2099-06-20"]')).toHaveAttribute('data-today', 'true');
      await expect(box.locator('dt[data-exception="2099-06-20"]')).toHaveAttribute('data-today', 'true');
      await expect(box.locator('dd[data-exception="2099-07-04"]')).toBeVisible();
      await expect(box.locator('dd[data-exception="2099-07-04"]')).toHaveText(t.closedWord);
      await expect(box.locator('dd[data-exception="2099-07-04"]')).not.toHaveAttribute('data-today', 'true');
      await expect(box.locator('dd[data-exception]:visible')).toHaveCount(2);
    });
    test(`${locale}: Ausnahmen – Reihenfolge chronologisch, nach dem letzten Ausnahmetag verschwindet der Block`, async ({ page }) => {
      await at(page, '2099-01-10T10:00:00Z', VISIT[locale]);
      const dates = await page.locator('[data-exceptions] dd[data-exception]:visible').evaluateAll((cells) => cells.map((cell) => (cell as HTMLElement).dataset.exception));
      expect(dates).toEqual(['2099-03-05', '2099-06-18', '2099-06-20', '2099-07-04']);
      await expect(page.locator('[data-exceptions] dd[data-today="true"]')).toHaveCount(0);
      await at(page, '2099-07-05T10:00:00Z', VISIT[locale]);
      await expect(page.locator('[data-exceptions]')).toBeHidden();
      await expect(page.locator('dl[data-hours]')).toBeVisible();
    });
    test(`${locale}: außerhalb des bestätigten Zeitraums entfallen Tabelle und Ausnahmen`, async ({ page }) => {
      for (const iso of ['2098-12-15T12:00:00Z', '2100-01-05T12:00:00Z']) {
        await at(page, iso, VISIT[locale]);
        await expect(page.locator('dl[data-hours]')).toHaveCount(0);
        await expect(page.locator('[data-exceptions]')).toBeHidden();
        await expect(page.locator('#hours-title').locator('xpath=..')).toContainText(t.unconfirmed);
      }
    });
  }
});

test.describe('Kein Status ohne bestätigte Zeiten (reguläre Builds)', () => {
  const builds = [
    { name: 'Vorschau', origin: ORIGIN.preview, prefix: '' },
    { name: 'öffentlich', origin: ORIGIN.public, prefix: '' },
    { name: 'Unterpfad', origin: ORIGIN.sub, prefix: '/preview/app' },
  ];
  for (const build of builds) {
    for (const locale of LOCALES) {
      test(`${build.name} ${locale}: keine Statuszeile, keine Tabelle, keine Ausnahmen, keine Fixture – auch mit Uhr in 2099`, async ({ page }) => {
        // 2099-06-17 20:00 wäre in der Fixture „offen“; hier darf dennoch nichts berechnet werden.
        await at(page, '2099-06-17T18:00:00Z', `${build.prefix}/${locale}/`, build.origin);
        await expect(status(page)).toHaveText(TEXT[locale].unconfirmed);
        await expect(page.locator('[data-test-fixture]')).toHaveCount(0);
        await page.goto(`${build.origin}${build.prefix}${VISIT[locale]}`);
        await expect(page.locator('dl[data-hours]')).toHaveCount(0);
        await expect(page.locator('[data-exceptions]')).toHaveCount(0);
        await expect(page.locator('[data-test-fixture]')).toHaveCount(0);
        await expect(page.locator('#hours-title').locator('xpath=..')).toContainText(TEXT[locale].unconfirmed);
      });
    }
  }
});

test.describe('Fixture gelangt nie in reguläre Builds', () => {
  const walk = async (dir: URL): Promise<URL[]> => {
    const out: URL[] = [];
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) out.push(...(await walk(new URL(`${entry.name}/`, dir))));
      else if (/\.(html|js|css|json|webmanifest|txt|xml|ics)$/.test(entry.name)) out.push(new URL(entry.name, dir));
    }
    return out;
  };
  for (const dir of ['dist', 'dist-public', 'dist-sub']) {
    test(`${dir}: weder Kennung noch Fixture-Daten in irgendeiner Textdatei`, async () => {
      const files = await walk(new URL(`../../${dir}/`, import.meta.url));
      expect(files.length).toBeGreaterThan(20);
      for (const file of files) {
        const text = await readFile(file, 'utf8');
        expect(text, file.pathname).not.toContain(MARKER);
        expect(text, file.pathname).not.toContain('2099-06-18');
        expect(text, file.pathname).not.toContain('2099-07-04');
      }
    });
  }
  test('dist-hours trägt die Kennung (Test sucht am richtigen Ort) und bleibt Vorschau', async () => {
    const html = await readFile(new URL('../../dist-hours/de/besuch/index.html', import.meta.url), 'utf8');
    expect(html).toContain(MARKER);
    expect(html).toContain('noindex');
    expect(await readFile(new URL('../../dist-hours/robots.txt', import.meta.url), 'utf8')).toContain('Disallow: /');
  });
});
