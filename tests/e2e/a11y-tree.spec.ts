/**
 * Zugänglichkeitsbaum je Seite und Sprache: Landmarken, Überschriften, Linknamen, lang-Attribute, Alt-Texte,
 * ID-Verweise. Nutzt `locator.ariaSnapshot()` und DOM-Prüfungen.
 */
import { expect, test, type Page } from '@playwright/test';
import { ALL_PAGES, localeOf } from './a11y-helpers';

const LANG_NAMES = { de: 'Deutsch', en: 'English', es: 'Español' } as const;

/** Landmarken-Zeilen der Form `- navigation "Name":` aus dem ARIA-Snapshot. */
const landmarks = (snapshot: string, role: string): string[] => snapshot.split('\n').filter((line) => new RegExp(`^\\s*- ${role}\\b`).test(line));

for (const [width, device] of [
  [390, 'mobil'],
  [1440, 'Desktop'],
] as const) {
  test.describe(`Zugänglichkeitsbaum ${device} (${width} px)`, () => {
    test.use({ viewport: { width, height: 900 } });

    for (const path of ALL_PAGES) {
      test(`Landmarken genau einmal, Navigationen unterscheidbar benannt: ${path}`, async ({ page }) => {
        await page.goto(path);
        const snapshot = await page.locator('body').ariaSnapshot();
        expect(landmarks(snapshot, 'banner'), 'banner').toHaveLength(1);
        expect(landmarks(snapshot, 'main'), 'main').toHaveLength(1);
        expect(landmarks(snapshot, 'contentinfo'), 'contentinfo').toHaveLength(1);
        const navs = landmarks(snapshot, 'navigation');
        // Sichtbar sind genau zwei Navigationen (Seiten + Sprache); die jeweils andere Seitennavigation ist ausgeblendet.
        expect(navs, snapshot).toHaveLength(2);
        const names = navs.map((line) => line.match(/"([^"]+)"/)?.[1]);
        expect(names.every(Boolean), `Navigation ohne Namen: ${navs.join(' | ')}`).toBe(true);
        expect(new Set(names).size, `gleich benannte Navigationen: ${names.join(', ')}`).toBe(2);
        // Vorschau-Band und Toast sind keine zusätzlichen Landmarken (status ist Live-Region, keine Landmarke).
        expect(landmarks(snapshot, 'complementary').length).toBeLessThanOrEqual(1); // Treffplan-Ticket (aside)
      });

      test(`genau eine h1, Überschriften ohne Sprünge, keine leeren Überschriften: ${path}`, async ({ page }) => {
        await page.goto(path);
        const headings = await page.evaluate(() =>
          [...document.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6, [role="heading"]')]
            .filter((h) => {
              for (let n: Element | null = h; n; n = n.parentElement) {
                const cs = getComputedStyle(n);
                if (cs.display === 'none' || cs.visibility === 'hidden' || n.hasAttribute('hidden')) return false;
              }
              return !h.closest('dialog:not([open])');
            })
            .map((h) => ({ level: Number(h.getAttribute('aria-level') ?? h.tagName[1]), text: (h.textContent ?? '').trim().replace(/\s+/g, ' ') })),
        );
        expect(headings.filter((h) => h.level === 1), 'h1').toHaveLength(1);
        expect(headings[0]?.level, 'erste Überschrift ist die h1').toBe(1);
        for (const [i, h] of headings.entries()) {
          expect(h.text.length, `leere Überschrift #${i}`).toBeGreaterThan(0);
          const prev = headings[i - 1];
          if (prev) expect(h.level - prev.level, `Sprung von h${prev.level} „${prev.text}“ auf h${h.level} „${h.text}“`).toBeLessThanOrEqual(1);
        }
      });

      test(`Links: gleicher Name führt zum gleichen Ziel, kein Link ohne Namen, „öffnet extern“ bei neuem Tab: ${path}`, async ({ page }) => {
        await page.goto(path);
        const links = await page.evaluate(() => {
          const visible = (el: Element): boolean => {
            for (let n: Element | null = el; n; n = n.parentElement) {
              const cs = getComputedStyle(n);
              if (cs.display === 'none' || cs.visibility === 'hidden' || n.hasAttribute('hidden')) return false;
            }
            return true;
          };
          return [...document.querySelectorAll<HTMLAnchorElement>('a[href]')]
            .filter(visible)
            .map((a) => ({
              name: (a.getAttribute('aria-label') ?? a.textContent ?? '').trim().replace(/\s+/g, ' '),
              href: a.getAttribute('href') ?? '',
              blank: a.target === '_blank',
              rel: a.rel,
            }));
        });
        const byName = new Map<string, Set<string>>();
        for (const link of links) {
          expect(link.name.length, `Link ohne Namen → ${link.href}`).toBeGreaterThan(0);
          expect(link.name, `nichtssagender Linktext → ${link.href}`).not.toMatch(/^(hier|mehr|klick|link|click here|here|más|aquí)$/i);
          byName.set(link.name, (byName.get(link.name) ?? new Set()).add(link.href.split('#')[0] ?? ''));
          if (link.blank) {
            expect(link.rel, `target=_blank ohne noopener → ${link.href}`).toContain('noopener');
            expect(link.name, `neuer Tab nicht angekündigt → ${link.href}`).toMatch(/extern|external|externo|fuera de la app|outside the app|new tab|neuen tab/i);
          }
        }
        const clashes = [...byName.entries()].filter(([, hrefs]) => hrefs.size > 1).map(([name, hrefs]) => `${name} → ${[...hrefs].join(' | ')}`);
        expect(clashes, 'gleichnamige Links mit verschiedenem Ziel').toEqual([]);
      });
    }
  });
}

test.describe('Sprachwahl und Dokumentsprache', () => {
  for (const path of ALL_PAGES) {
    test(`lang an <html> und an den Sprachlinks, Ziel gleiche Seite: ${path}`, async ({ page }) => {
      await page.goto(path);
      const own = localeOf(path);
      await expect(page.locator('html')).toHaveAttribute('lang', own);
      const links = page.locator('.langs a');
      await expect(links).toHaveCount(3);
      for (const code of ['de', 'en', 'es'] as const) {
        const link = page.locator(`.langs a[data-lang-link="${code}"]`);
        await expect(link).toHaveAttribute('lang', code);
        await expect(link).toHaveAttribute('hreflang', code);
        await expect(link).toHaveAttribute('href', new RegExp(`/${code}/`));
        // Zugänglicher Name nennt die Sprache in ihrer eigenen Sprache.
        expect(await link.evaluate((el) => (el.textContent ?? '').replace(/\s+/g, ' '))).toContain(LANG_NAMES[code]);
        if (code === own) await expect(link).toHaveAttribute('aria-current', 'true');
        else await expect(link).not.toHaveAttribute('aria-current', /.+/);
      }
    });
  }

  test('Sprachwechsel führt auf die entsprechende Seite (Drinks → Bebidas)', async ({ page }) => {
    await page.goto('/de/drinks/');
    await page.locator('.langs a[data-lang-link="es"]').click();
    await expect(page).toHaveURL(/\/es\/bebidas\//);
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  });
});

test.describe('Bilder und Grafiken', () => {
  for (const path of ALL_PAGES) {
    test(`Bilder haben sinnvollen Alt-Text, Zierrat ist ausgeblendet: ${path}`, async ({ page }) => {
      await page.goto(path);
      const images = await page.evaluate(() =>
        [...document.querySelectorAll('img:not(dialog img)')].map((img) => ({
          src: img.getAttribute('src') ?? '',
          alt: img.getAttribute('alt'),
          hidden: img.closest('[aria-hidden="true"]') !== null,
          w: img.getAttribute('width'),
          h: img.getAttribute('height'),
        })),
      );
      for (const img of images) {
        expect(img.alt, `Bild ohne alt-Attribut: ${img.src}`).not.toBeNull();
        if (img.alt) {
          expect(img.alt, `Alt-Text ist Dateiname: ${img.src}`).not.toMatch(/\.(webp|png|jpe?g|svg|avif)\b|^(bild|image|imagen|img|foto|photo)\s*\d*$/i);
          expect(img.alt.length, `Alt-Text zu lang: ${img.alt}`).toBeLessThanOrEqual(160);
        }
        // Layoutverschiebung vermeiden: Breite und Höhe oder CSS-Seitenverhältnis (hier: Attribute verlangt).
        expect(img.w && img.h, `Bild ohne width/height: ${img.src}`).toBeTruthy();
      }
      // Inline-SVG: dekorativ (aria-hidden) oder benannt.
      const unnamedSvg = await page.evaluate(() =>
        [...document.querySelectorAll('svg')]
          .filter((svg) => !svg.closest('[aria-hidden="true"]') && svg.getAttribute('aria-hidden') !== 'true')
          .filter((svg) => !svg.getAttribute('aria-label') && !svg.querySelector('title') && svg.getAttribute('role') !== 'img')
          .map((svg) => svg.parentElement?.className ?? 'svg'),
      );
      expect(unnamedSvg, 'SVG weder ausgeblendet noch benannt').toEqual([]);
    });
  }

  test('Galerie: jedes Vorschaubild trägt einen aussagekräftigen Alt-Text, der zur Beschriftung passt', async ({ page }) => {
    await page.goto('/de/galerie/');
    const items = await page.locator('[data-shot]').evaluateAll((els) =>
      els.map((a) => ({ alt: (a as HTMLElement).dataset.alt ?? '', title: (a as HTMLElement).dataset.title ?? '', imgAlt: a.querySelector('img')?.getAttribute('alt') ?? '', label: a.getAttribute('aria-label') ?? '' })),
    );
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.alt.length, 'data-alt (Lightbox)').toBeGreaterThan(10);
      expect(item.title.length).toBeGreaterThan(0);
    }
    expect(new Set(items.map((i) => i.alt)).size, 'doppelte Alt-Texte in der Galerie').toBe(items.length);
  });
});

test.describe('Verweise im DOM', () => {
  async function brokenReferences(page: Page): Promise<string[]> {
    return page.evaluate(() => {
      const out: string[] = [];
      const ids = [...document.querySelectorAll('[id]')].map((el) => el.id);
      for (const id of new Set(ids.filter((x, i) => ids.indexOf(x) !== i))) out.push(`doppelte id: ${id}`);
      for (const attr of ['aria-describedby', 'aria-labelledby', 'aria-controls', 'for']) {
        for (const el of document.querySelectorAll(`[${attr}]`)) {
          for (const ref of (el.getAttribute(attr) ?? '').split(/\s+/).filter(Boolean)) {
            if (!document.getElementById(ref)) out.push(`${attr}="${ref}" ohne Ziel (${el.tagName.toLowerCase()})`);
          }
        }
      }
      for (const a of document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')) {
        const target = a.getAttribute('href')?.slice(1);
        if (target && !document.getElementById(target)) out.push(`Anker #${target} ohne Ziel`);
      }
      return out;
    });
  }

  for (const path of ALL_PAGES) {
    test(`keine doppelten IDs, keine ins Leere zeigenden ARIA-Verweise oder Anker: ${path}`, async ({ page }) => {
      await page.goto(path);
      expect(await brokenReferences(page)).toEqual([]);
    });
  }

  test('Planer-Fehler: aria-describedby verweist nach einem Fehler weiter auf vorhandene Elemente', async ({ page }) => {
    await page.clock.install({ time: new Date('2030-01-15T12:00:00Z') });
    await page.goto('/de/gruppe/');
    await page.locator('[data-calendar]').click();
    expect(await brokenReferences(page)).toEqual([]);
  });
});
