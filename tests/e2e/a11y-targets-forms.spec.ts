/** WCAG 2.2: 2.5.8 Zielgröße, 1.3.4 Orientierung, 1.4.13 Hover/Fokus, 3.3.x Beschriftungen und Fehlermeldungen (DE/EN/ES). */
import { expect, test } from '@playwright/test';
import { DE_PAGES, SHOT_DIR, hscroll } from './a11y-helpers';

// Die Tests spielen eigene Stylesheets ein (Textabstand, Schriftgröße, Kontrastmodus), wie es Nutzer- oder Assistenz-Software tut;
// die Seiten-CSP gilt dafür nicht. Die CSP selbst prüft tests/e2e/headers.spec.ts.
test.use({ bypassCSP: true });

test.describe('2.5.8 Zielgröße (Minimum)', () => {
  for (const width of [390, 1440]) {
    for (const path of DE_PAGES) {
      test(`jedes Bedienelement ist mindestens 24 x 24 px: ${path} bei ${width} px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(path);
        const small = await page.evaluate(() => {
          const out: string[] = [];
          for (const el of document.querySelectorAll<HTMLElement>('a[href], button, input, select, textarea, summary')) {
            if (el.classList.contains('skip')) continue; // Sprunglink: nur bei Fokus sichtbar
            let hidden = false;
            for (let node: Element | null = el; node; node = node.parentElement) {
              const cs = getComputedStyle(node);
              if (cs.display === 'none' || cs.visibility === 'hidden' || node.hasAttribute('hidden')) hidden = true;
            }
            const box = el.getBoundingClientRect();
            if (hidden || box.width === 0) continue;
            // Fließtext-Links (inline) sind nach 2.5.8 ausgenommen.
            if (getComputedStyle(el).display === 'inline' && el.closest('p, li, address')) continue;
            if (box.width < 24 || box.height < 24) out.push(`${el.tagName} ${(el.textContent ?? '').trim().slice(0, 20)} ${Math.round(box.width)}x${Math.round(box.height)}`);
          }
          return out;
        });
        expect(small).toEqual([]);
      });
    }
  }

  test('mobil: Schaltflächen, Felder, Chips und Tableiste sind mindestens 44 px hoch', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of DE_PAGES) {
      await page.goto(path);
      const small = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('button, input, select, textarea, .tabbar a, .langs a, .btn, .chip')]
          .filter((el) => el.getBoundingClientRect().width > 0 && !el.closest('[hidden]') && getComputedStyle(el).visibility !== 'hidden')
          .filter((el) => el.getBoundingClientRect().height < 44)
          .map((el) => `${el.tagName}.${el.className} ${Math.round(el.getBoundingClientRect().height)}`),
      );
      expect(small, path).toEqual([]);
    }
  });
});

test.describe('1.3.4 Orientierung', () => {
  test('Manifest sperrt die Ausrichtung nicht', async ({ request }) => {
    const manifest = (await (await request.get('/manifest.webmanifest')).json()) as { orientation?: string };
    expect(manifest.orientation ?? 'any').toMatch(/^(any|natural)$/);
  });

  for (const path of DE_PAGES) {
    test(`Querformat 844 x 390: Inhalt vollständig, kein Querscrollen, Navigation erreichbar: ${path}`, async ({ page }) => {
      await page.setViewportSize({ width: 844, height: 390 });
      await page.goto(path);
      expect(await hscroll(page)).toBeLessThanOrEqual(0);
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('nav:visible a').first()).toBeVisible();
      expect(await page.evaluate(() => getComputedStyle(document.body).transform)).toBe('none');
      await expect(page.getByText(/bitte.*dreh|rotate your|gira tu/i)).toHaveCount(0);
      if (path === '/de/') await page.screenshot({ path: `${SHOT_DIR}/landscape-844x390-de.png` });
    });
  }
});

test.describe('1.4.13 Inhalt bei Hover oder Fokus', () => {
  test('Hover und Fokus erzeugen keinen neuen sichtbaren Inhalt (nur native title-Tooltips)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const path of ['/de/', '/de/drinks/', '/de/besuch/']) {
      await page.goto(path);
      const visibleCount = () =>
        page.evaluate(
          () =>
            [...document.body.querySelectorAll('*')].filter((el) => {
              const b = el.getBoundingClientRect();
              const cs = getComputedStyle(el);
              return b.width > 0 && b.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0';
            }).length,
        );
      const base = await visibleCount();
      const targets = page.locator('main a:visible, main button:visible, .masthead a:visible');
      const total = Math.min(await targets.count(), 25);
      for (let i = 0; i < total; i++) {
        await targets.nth(i).hover();
        expect(await visibleCount(), `${path}: Hover auf Element ${i}`).toBe(base);
        await targets.nth(i).focus();
        expect(await visibleCount(), `${path}: Fokus auf Element ${i}`).toBe(base);
      }
    }
  });
});

test.describe('3.3.x Beschriftungen und Fehlermeldungen in drei Sprachen', () => {
  const FORMS = [
    { locale: 'de', group: '/de/gruppe/', visit: '/de/besuch/', foreign: /\b(please|enter|valid|por favor|introduce)\b/i },
    { locale: 'en', group: '/en/group/', visit: '/en/visit/', foreign: /(Bitte|gültig|Uhrzeit|Datum|por favor|válid)/i },
    { locale: 'es', group: '/es/grupo/', visit: '/es/visita/', foreign: /(Bitte|gültig|Uhrzeit|Datum|please|valid date|enter)/i },
  ] as const;

  for (const form of FORMS) {
    test(`Planer ${form.locale}: jedes Feld beschriftet, Fehler als Text, am Feld, in der Seitensprache`, async ({ page }) => {
      await page.clock.install({ time: new Date('2030-01-15T12:00:00Z') });
      await page.goto(form.group);
      for (const field of await page.locator('form input:visible, form textarea:visible').all()) {
        const name = await field.evaluate((el) => (el as HTMLInputElement).labels?.[0]?.textContent?.trim() ?? '');
        expect(name.length, `Feld ${await field.getAttribute('id')} ohne Beschriftung`).toBeGreaterThan(0);
      }
      await page.locator('[data-calendar]').click();
      const message = (await page.locator('[data-status]').textContent())?.trim() ?? '';
      expect(message.length).toBeGreaterThan(10);
      expect(message).not.toMatch(form.foreign);
      const date = page.locator('#plan-date');
      await expect(date).toHaveAttribute('aria-invalid', 'true');
      await expect(date).toBeFocused();
      expect(await date.getAttribute('aria-describedby')).toContain('plan-status');
      await page.screenshot({ path: `${SHOT_DIR}/error-planer-${form.locale}.png` });
    });

    test(`Anfrage ${form.locale}: Fehler am Feld, Beschriftungen, Seitensprache`, async ({ page }) => {
      await page.clock.install({ time: new Date('2030-01-15T12:00:00Z') });
      await page.goto(form.visit);
      const people = page.locator('#inq-people');
      await people.fill('1');
      await page.locator('[data-inquiry] button[type="submit"]').click();
      await expect(people).toHaveAttribute('aria-invalid', 'true');
      await expect(people).toBeFocused();
      const message = (await page.locator('[data-inquiry-status]').textContent())?.trim() ?? '';
      expect(message.length).toBeGreaterThan(10);
      expect(message).not.toMatch(form.foreign);
      for (const id of ['inq-people', 'inq-date', 'inq-time', 'inq-note']) {
        const label = await page.locator(`#${id}`).evaluate((el) => (el as HTMLInputElement).labels?.[0]?.textContent?.trim() ?? '');
        expect(label.length, `#${id} ohne Beschriftung`).toBeGreaterThan(0);
      }
    });
  }

  test('Anfrage: Eingabeart und Autovervollständigung passen zum Feld (1.3.5, 3.3.2)', async ({ page }) => {
    await page.goto('/de/besuch/');
    await expect(page.locator('#inq-people')).toHaveAttribute('inputmode', 'numeric');
    await expect(page.locator('#inq-people')).toHaveAttribute('type', 'number');
    await expect(page.locator('#inq-note')).toHaveAttribute('autocomplete', 'off');
    await expect(page.locator('#inq-note')).toHaveAttribute('maxlength', '140');
  });
});
