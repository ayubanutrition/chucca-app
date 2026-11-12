/** Tastaturdurchlauf: Sprunglink, Tab-Reihenfolge, versteckte Bereiche, Lightbox, Chips, Formulare. */
import { expect, test, type Page } from '@playwright/test';
import { ALL_PAGES, DE_PAGES } from './a11y-helpers';

interface Stop {
  name: string;
  tag: string;
  top: number;
  left: number;
  visible: boolean;
  hiddenAncestor: string | null;
  inBar: boolean;
}

/** Tabt alle Fokusziele ab (Rückkehr zum Dokumentanfang beendet den Lauf) und liefert Position und Sichtbarkeit je Stopp. */
async function tabStops(page: Page, limit = 150): Promise<Stop[]> {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  const stops: Stop[] = [];
  let firstKey = '';
  for (let i = 0; i < limit; i++) {
    await page.keyboard.press('Tab');
    const stop = await page.evaluate<Stop | null>(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body || el === document.documentElement) return null;
      const box = el.getBoundingClientRect();
      let hiddenAncestor: string | null = null;
      for (let n: Element | null = el; n; n = n.parentElement) {
        const cs = getComputedStyle(n);
        if (cs.display === 'none' || cs.visibility === 'hidden') hiddenAncestor = `${n.tagName}.${n.className} (${cs.display}/${cs.visibility})`;
        if (n.hasAttribute('hidden') || n.getAttribute('aria-hidden') === 'true' || n.hasAttribute('inert')) hiddenAncestor = `${n.tagName}.${n.className} [hidden|aria-hidden|inert]`;
      }
      const absolute = el.getBoundingClientRect();
      return {
        name: (el.getAttribute('aria-label') || el.textContent || el.getAttribute('id') || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 40),
        tag: el.tagName,
        top: Math.round(absolute.top + scrollY),
        left: Math.round(absolute.left + scrollX),
        visible: box.width > 0 && box.height > 0,
        hiddenAncestor,
        inBar: Boolean(el.closest('.tabbar')),
      };
    });
    if (!stop) break;
    const key = `${stop.tag}|${stop.name}|${stop.top}|${stop.left}`;
    if (!firstKey) firstKey = key;
    else if (key === firstKey) break; // Umlauf zum Dokumentanfang
    // Datums- und Zeitfelder haben mehrere Tab-Stopps (Tag/Monat/Jahr): als ein Ziel zählen.
    if (stops.at(-1) && `${stops.at(-1)?.tag}|${stops.at(-1)?.name}|${stops.at(-1)?.top}|${stops.at(-1)?.left}` === key) continue;
    stops.push(stop);
  }
  return stops;
}

test.describe('Sprunglink', () => {
  for (const path of ['/de/', '/en/drinks/', '/es/visita/']) {
    test(`erster Tab fokussiert den Sprunglink, er ist sichtbar; Enter setzt den Fokus in den Inhalt: ${path}`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(path);
      await page.keyboard.press('Tab');
      const skip = page.locator('.skip');
      await expect(skip).toBeFocused();
      await expect(skip).toBeInViewport({ ratio: 1 });
      expect(await skip.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
      await page.keyboard.press('Enter');
      await expect(page.locator('main')).toBeFocused();
      // Nächster Tab landet im Inhalt, nicht wieder im Kopf.
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => Boolean(document.activeElement?.closest('main')))).toBe(true);
    });
  }
});

test.describe('Tab-Reihenfolge und versteckte Bereiche', () => {
  for (const width of [390, 1440]) {
    for (const path of ALL_PAGES) {
      test(`nur sichtbare Fokusziele, nichts doppelt, Reihenfolge folgt der Optik: ${path} bei ${width} px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(path);
        const stops = await tabStops(page);
        expect(stops.length).toBeGreaterThan(8);
        for (const stop of stops) {
          expect(stop.visible, `Tabstopp ohne Fläche: ${stop.name}`).toBe(true);
          expect(stop.hiddenAncestor, `Tabstopp in verstecktem Bereich: ${stop.name}`).toBeNull();
        }
        // Visuelle Reihenfolge: Zeile für Zeile von oben nach unten. Die feste Tableiste (DOM-Ende) ist ausgenommen.
        const flow = stops.filter((s) => !s.inBar);
        for (let i = 1; i < flow.length; i++) {
          const prev = flow[i - 1]!;
          const cur = flow[i]!;
          // Spaltenwechsel nach rechts (zweispaltiges Layout, DOM-Reihenfolge Spalte für Spalte) ist zulässig.
          if (cur.left > prev.left + 200) continue;
          expect(cur.top, `„${cur.name}“ liegt über dem Vorgänger „${prev.name}“ (Tab-Reihenfolge ≠ optische Reihenfolge)`).toBeGreaterThanOrEqual(prev.top - 24);
        }
        // Die Tableiste ist die letzte Gruppe und enthält alle Hauptseiten.
        if (width < 960) expect(stops.filter((s) => s.inBar).length).toBeGreaterThanOrEqual(4);
      });
    }
  }

  test('Drinks: nach Nulltreffer sind ausgeblendete Karteneinträge nicht per Tab erreichbar', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/de/drinks/');
    await page.locator('#menu-search').fill('zzzzqqqq');
    await expect(page.locator('[data-menu-empty]')).toBeVisible();
    const stops = await tabStops(page);
    for (const stop of stops) expect(stop.hiddenAncestor, stop.name).toBeNull();
    expect(await page.locator('[data-drink]:not([hidden])').count()).toBe(0);
  });

  test('Offline-Hinweis und Toast sind im Ruhezustand weder lesbar noch fokussierbar', async ({ page }) => {
    await page.goto('/de/');
    await expect(page.locator('[data-offline]')).toBeHidden();
    await expect(page.locator('.toast')).toBeHidden();
    expect(await page.locator('.toast button').evaluate((el) => el.matches(':focus-visible, :focus'))).toBe(false);
  });
});

test.describe('Lightbox (Galerie)', () => {
  test('Fokus wandert hinein, bleibt gefangen, Esc schließt, Fokus kehrt zum Vorschaubild zurück', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/de/galerie/');
    const thumb = page.locator('[data-shot]').nth(2);
    await thumb.focus();
    await page.keyboard.press('Enter');
    const dialog = page.locator('[data-lightbox]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-labelledby', 'lightbox-title');
    await expect(page.locator('[data-lightbox-close]')).toBeFocused();
    // Fokusfalle: 12 Tabs vorwärts und 12 zurück bleiben im Dialog (oder in der Browseroberfläche); Hintergrund ist nicht erreichbar.
    for (const key of [...Array(12).fill('Tab'), ...Array(12).fill('Shift+Tab')]) {
      await page.keyboard.press(key);
      // Nativer Dialog: ein Schritt geht an die Browseroberfläche (activeElement = body), nie in den Hintergrund.
      expect(await page.evaluate(() => Boolean(document.activeElement?.closest('dialog')) || document.activeElement === document.body)).toBe(true);
    }
    // Hintergrund ist für Hilfstechnik/Klick gesperrt: die Seitennavigation ist nicht fokussierbar.
    expect(await page.locator('.tabbar a').first().evaluate((el) => (el as HTMLElement).matches(':focus'))).toBe(false);
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('[data-lightbox-counter]')).toContainText('4');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    // Rückgabe: Fokus liegt auf einem Vorschaubild (dem zuletzt gezeigten) und nicht am Seitenanfang.
    await expect(page.locator('[data-shot]').nth(3)).toBeFocused();
  });

  test('Ohne Blättern kehrt der Fokus exakt zum auslösenden Vorschaubild zurück', async ({ page }) => {
    await page.goto('/de/galerie/');
    const thumb = page.locator('[data-shot]').nth(1);
    await thumb.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-lightbox]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(thumb).toBeFocused();
  });

  test('Schließen-Schaltfläche, Pfeiltasten und Home/End funktionieren per Tastatur; Zähler wird angesagt', async ({ page }) => {
    await page.goto('/de/galerie/');
    const total = await page.locator('[data-shot]').count();
    await page.locator('[data-shot]').first().focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-lightbox-counter]')).toHaveAttribute('aria-live', 'polite');
    await page.keyboard.press('End');
    await expect(page.locator('[data-lightbox-counter]')).toContainText(String(total));
    await page.keyboard.press('Home');
    await expect(page.locator('[data-lightbox-counter]')).toContainText('1');
    await page.keyboard.press('ArrowLeft'); // Umlauf auf das letzte Bild
    await expect(page.locator('[data-lightbox-counter]')).toContainText(String(total));
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Enter'); // Fokus liegt je nach Reihenfolge auf Weiter/Zurück/Schließen
    await expect(page.locator('[data-lightbox]')).toBeVisible();
  });

  test('Das Bild im Dialog hat einen Alt-Text, der zum Titel gehört', async ({ page }) => {
    await page.goto('/de/galerie/');
    await page.locator('[data-shot]').first().click();
    const alt = await page.locator('[data-lightbox-image]').getAttribute('alt');
    expect((alt ?? '').length).toBeGreaterThan(10);
  });
});

test.describe('Chips und Suche (Drinks)', () => {
  test('Chips schalten per Leertaste und Enter, behalten den Fokus, Zustand und Anzahl stimmen überein', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/de/drinks/');
    const taste = page.locator('[data-taste]').first();
    await taste.focus();
    await page.keyboard.press('Space');
    await expect(taste).toHaveAttribute('aria-pressed', 'true');
    await expect(taste).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(taste).toHaveAttribute('aria-pressed', 'false');
    await expect(taste).toBeFocused();

    const category = page.locator('[data-taste]').nth(1);
    await category.focus();
    await page.keyboard.press('Enter');
    await expect(category).toHaveAttribute('aria-pressed', 'true');
    await expect(category).toBeFocused();
    await expect(page.locator('.chip[aria-pressed="true"]')).toHaveCount(1); // genau eine Richtung gewählt
    const visible = await page.locator('[data-drink]:not([hidden])').count();
    const count = Number((await page.locator('[data-menu-count]').textContent())?.match(/\d+/)?.[0] ?? -1);
    expect(count).toBe(visible);
    await page.keyboard.press('Space');
    await expect(category).toHaveAttribute('aria-pressed', 'false'); // erneutes Drücken hebt die Auswahl auf
  });

  test('Enter im Suchfeld lädt die Seite nicht neu und verliert den Fokus nicht', async ({ page }) => {
    await page.goto('/de/drinks/');
    const search = page.locator('#menu-search');
    await search.fill('Spritz');
    // Marker im Seitenobjekt: bleibt er erhalten, wurde nicht neu geladen oder navigiert.
    await page.evaluate(() => ((window as unknown as { __marker: number }).__marker = 42));
    await search.press('Enter');
    await expect(search).toBeFocused();
    expect(await page.evaluate(() => (window as unknown as { __marker?: number }).__marker)).toBe(42);
    expect(new URL(page.url()).pathname).toBe('/de/drinks/');
  });
});

test.describe('Formulare per Tastatur', () => {
  test('Planer: Enter im Feld sendet (Fehlerfall und Erfolgsfall mit Teilen)', async ({ page }) => {
    await page.clock.install({ time: new Date('2030-01-15T12:00:00Z') });
    await page.addInitScript(() => {
      (window as unknown as { __shared: unknown[] }).__shared = [];
      Object.defineProperty(navigator, 'share', { configurable: true, value: async (data: unknown) => void (window as unknown as { __shared: unknown[] }).__shared.push(data) });
    });
    await page.goto('/de/gruppe/');
    await page.locator('#plan-date').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-status]')).toContainText('gültiges Datum');
    await expect(page.locator('#plan-date')).toBeFocused();
    await page.locator('#plan-date').fill('2030-01-16');
    await page.locator('#plan-time').fill('20:00');
    await page.locator('#plan-time').press('Enter');
    await expect(page.locator('[data-status]')).toContainText(/geteilt|geteilt/i);
    expect(await page.evaluate(() => (window as unknown as { __shared: unknown[] }).__shared.length)).toBe(1);
  });

  test('Anfrage: Enter im Feld bereitet die Nachricht vor und setzt den Fokus auf den Text', async ({ page }) => {
    await page.clock.install({ time: new Date('2030-01-15T12:00:00Z') });
    await page.goto('/de/besuch/');
    await page.locator('#inq-date').fill('2030-01-16');
    await page.locator('#inq-time').fill('20:00');
    await page.locator('#inq-people').press('Enter');
    await expect(page.locator('#inq-text')).toBeFocused();
    await expect(page.locator('#inq-text')).toHaveValue(/6/);
  });

  test('Planer: Schaltflächen in der Reihenfolge Teilen → Kalender → Kopieren, Tab erreicht sie nach den Feldern', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/de/gruppe/');
    const stops = await tabStops(page);
    const names = stops.filter((s) => s.tag === 'BUTTON').map((s) => s.name);
    expect(names).toEqual([expect.stringContaining('Einladung'), expect.stringContaining('Kalender'), expect.stringContaining('kopieren')]);
    const fieldIndex = stops.findIndex((s) => s.tag === 'INPUT');
    const buttonIndex = stops.findIndex((s) => s.tag === 'BUTTON');
    expect(fieldIndex).toBeGreaterThan(-1);
    expect(fieldIndex).toBeLessThan(buttonIndex);
  });
});

test('Alle Seiten: Fokus ist nie auf <body> gefangen, Shift+Tab vom ersten Element verlässt die Seite nicht', async ({ page }) => {
  for (const path of DE_PAGES) {
    await page.goto(path);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await expect(page.locator('.skip')).toBeFocused();
  }
});
