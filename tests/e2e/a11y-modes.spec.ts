/**
 * Darstellungsmodi: Windows-Kontrastmodus (forced-colors), helles Farbschema (die Seite ist bewusst dunkel),
 * prefers-contrast: more, prefers-reduced-motion. Sichtprüfung: /tmp/chucca-agent-a11y/.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { DE_PAGES, SHOT_DIR } from './a11y-helpers';

type Rgba = [number, number, number, number];
const parse = (css: string): Rgba => {
  const m = css.match(/rgba?\(([^)]+)\)/);
  if (!m?.[1]) return [0, 0, 0, 0];
  const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
  return [p[0] ?? 0, p[1] ?? 0, p[2] ?? 0, p[3] ?? 1];
};
const lum = ([r, g, b]: Rgba): number => {
  const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a: Rgba, b: Rgba): number => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};
const over = (top: Rgba, bottom: Rgba): Rgba => {
  const a = top[3];
  return [top[0] * a + bottom[0] * (1 - a), top[1] * a + bottom[1] * (1 - a), top[2] * a + bottom[2] * (1 - a), 1];
};

async function style(page: Page, selector: string) {
  return page.locator(selector).first().evaluate((el) => {
    const cs = getComputedStyle(el);
    return {
      color: cs.color,
      background: cs.backgroundColor,
      backgroundImage: cs.backgroundImage,
      borderColor: cs.borderTopColor,
      borderWidth: cs.borderTopWidth,
      outlineStyle: cs.outlineStyle,
      outlineWidth: cs.outlineWidth,
      outlineColor: cs.outlineColor,
      textDecoration: cs.textDecorationLine,
      boxShadow: cs.boxShadow,
      fontWeight: cs.fontWeight,
    };
  });
}

test.describe('Windows-Kontrastmodus (forced-colors: active)', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
  });

  test('Emulation greift und Fokus bleibt sichtbar (Kontur, nicht nur Farbe)', async ({ page }) => {
    await page.goto('/de/drinks/');
    expect(await page.evaluate(() => matchMedia('(forced-colors: active)').matches)).toBe(true);
    for (const selector of ['.skip', '.masthead .wordmark', '.chip', '#menu-search', '.langs a']) {
      await page.locator(selector).first().focus();
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Tab');
      const s = await style(page, selector);
      expect(s.outlineStyle, `${selector}: Fokuskontur`).not.toBe('none');
      expect(parseFloat(s.outlineWidth), `${selector}: Breite`).toBeGreaterThanOrEqual(2);
    }
  });

  test('Chips: gedrückt und nicht gedrückt sind ohne Farbe unterscheidbar', async ({ page }) => {
    await page.goto('/de/drinks/');
    await page.locator('[data-category]:not([data-drink])').nth(1).click();
    const on = page.locator('.chip[aria-pressed="true"]').first();
    const off = page.locator('.chip[aria-pressed="false"]').first();
    await page.mouse.move(0, 0);
    const [a, b] = await Promise.all([
      on.evaluate((el) => {
        const cs = getComputedStyle(el);
        const before = getComputedStyle(el, '::before');
        return { border: cs.borderTopWidth + cs.borderTopStyle, deco: cs.textDecorationLine, weight: cs.fontWeight, marker: before.content !== 'none' && before.content !== 'normal', markerImage: before.backgroundImage };
      }),
      off.evaluate((el) => {
        const cs = getComputedStyle(el);
        const before = getComputedStyle(el, '::before');
        return { border: cs.borderTopWidth + cs.borderTopStyle, deco: cs.textDecorationLine, weight: cs.fontWeight, marker: before.content !== 'none' && before.content !== 'normal', markerImage: before.backgroundImage };
      }),
    ]);
    // Es genügt EIN nicht farbiges Merkmal: Zeichen im Chip, andere Linie, Dicke oder Unterstreichung.
    const nonColourDifference = a.marker !== b.marker || a.border !== b.border || a.deco !== b.deco || a.weight !== b.weight;
    await page.screenshot({ path: `${SHOT_DIR}/forced-colors-drinks.png` });
    expect(nonColourDifference, JSON.stringify({ a, b })).toBe(true);
  });

  const NAV_CASES = [
    { name: 'Desktop-Hauptnavigation', width: 1440, active: '.topnav a[aria-current="page"]', other: '.topnav a:not([aria-current])', broken: false },
    { name: 'Tableiste (mobil)', width: 390, active: '.tabbar a[aria-current="page"]', other: '.tabbar a:not([aria-current])', broken: true },
    { name: 'Sprachwahl (aktuelle Sprache)', width: 1440, active: '.langs a[aria-current="true"]', other: '.langs a:not([aria-current])', broken: true },
  ] as const;
  for (const c of NAV_CASES) {
    const run = async (page: Page) => {
      await page.setViewportSize({ width: c.width, height: 900 });
      await page.goto('/de/drinks/');
      const read = (sel: string) =>
        page.locator(sel).first().evaluate((el) => {
          const cs = getComputedStyle(el);
          const kids = [...el.querySelectorAll('span, svg')].map((k) => getComputedStyle(k).fontWeight + getComputedStyle(k).textDecorationLine).join(',');
          return [cs.textDecorationLine, cs.fontWeight, cs.borderTopWidth + cs.borderBottomWidth + cs.borderTopStyle + cs.borderBottomStyle, cs.outlineStyle, getComputedStyle(el, '::before').content, getComputedStyle(el, '::after').content, cs.backgroundImage, cs.boxShadow, kids].join('|');
        });
      const [active, inactive] = [await read(c.active), await read(c.other)];
      await page.screenshot({ path: `${SHOT_DIR}/forced-colors-nav-${c.width}-${c.name.slice(0, 4)}.png` });
      expect(active, `${c.name}: aktiver Eintrag gleicht inaktivem (nur Farbe trägt den Zustand)`).not.toBe(inactive);
    };
    if (c.broken) {
      // BELEGT (P2): im Kontrastmodus werden Farben/Hintergründe vereinheitlicht; der aktive Eintrag unterscheidet sich dann
      // in keiner Eigenschaft vom inaktiven (Screenshots forced-colors-nav-*.png). Fix: @media (forced-colors: active) mit Unterstreichung/Rand.
      test.fixme(`aktiver Eintrag ohne Farbe unterscheidbar: ${c.name}`, async ({ page }) => run(page));
    } else {
      test(`aktiver Eintrag ohne Farbe unterscheidbar: ${c.name}`, async ({ page }) => run(page));
    }
  }

  test('Fix-Beweis: Unterstreichung im Kontrastmodus macht aktive Einträge unterscheidbar', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto('/de/drinks/');
    await page.addStyleTag({
      content: `@media (forced-colors: active) {
        .tabbar a[aria-current='page'], .langs a[aria-current='true'], .topnav a[aria-current='page'] { text-decoration: underline; text-decoration-thickness: 0.18em; font-weight: 800; }
        .tabbar a[aria-current='page'] { border-top: 4px solid Highlight; }
        .langs a[aria-current='true'] { border: 2px solid Highlight; }
      }`,
    });
    const deco = (sel: string) => page.locator(sel).first().evaluate((el) => getComputedStyle(el).textDecorationLine + getComputedStyle(el).fontWeight);
    expect(await deco('.tabbar a[aria-current="page"]')).not.toBe(await deco('.tabbar a:not([aria-current])'));
    expect(await deco('.langs a[aria-current="true"]')).not.toBe(await deco('.langs a:not([aria-current])'));
    await page.screenshot({ path: `${SHOT_DIR}/fixproof-forced-colors-nav.png` });
  });

  test('Eingabefelder behalten eine sichtbare Umrandung', async ({ page }) => {
    await page.goto('/de/besuch/');
    for (const selector of ['#inq-people', '#inq-date', '#inq-note']) {
      const s = await style(page, selector);
      expect(parseFloat(s.borderWidth), selector).toBeGreaterThanOrEqual(1);
    }
    await page.screenshot({ path: `${SHOT_DIR}/forced-colors-besuch.png`, fullPage: true });
  });

  test('Lightbox-Schaltflächen haben eine Umrandung/Kontur und sind erkennbar', async ({ page }) => {
    await page.goto('/de/galerie/');
    await page.locator('[data-shot]').first().click();
    await expect(page.locator('[data-lightbox]')).toBeVisible();
    for (const selector of ['[data-lightbox-close]', '[data-lightbox-prev]', '[data-lightbox-next]']) {
      const s = await style(page, selector);
      const hasEdge = parseFloat(s.borderWidth) >= 1 && s.borderColor !== 'rgba(0, 0, 0, 0)';
      const hasFill = s.background !== 'rgba(0, 0, 0, 0)' && s.background !== 'transparent';
      expect(hasEdge || hasFill, `${selector} hat weder Rand noch Füllung: ${JSON.stringify(s)}`).toBe(true);
    }
    await page.screenshot({ path: `${SHOT_DIR}/forced-colors-lightbox.png` });
  });

  test('Tableiste und Hauptschaltfläche bleiben als Schaltfläche erkennbar (Rand)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/de/');
    const btn = await style(page, '.btn--primary');
    expect(parseFloat(btn.borderWidth)).toBeGreaterThanOrEqual(1);
    await page.screenshot({ path: `${SHOT_DIR}/forced-colors-home-390.png` });
  });
});

test.describe('Farbschema und Kontrast', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test(`prefers-color-scheme: ${scheme}: Seite bleibt dunkel, Text lesbar, axe ohne Verstöße`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      for (const path of DE_PAGES) {
        await page.goto(path);
        const body = await style(page, 'body');
        const bg = parse(body.background);
        expect(lum(bg), `${path}: Hintergrund wird nicht hell`).toBeLessThan(0.05);
        expect(ratio(parse(body.color), bg), `${path}: Haupttext`).toBeGreaterThanOrEqual(7);
        const results = await new AxeBuilder({ page: page as never }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
        expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`), `${path} (${scheme})`).toEqual([]);
      }
      if (scheme === 'light') await page.screenshot({ path: `${SHOT_DIR}/scheme-light-de.png` });
    });
  }

  test('theme-color und color-scheme entsprechen der dunklen Seite', async ({ page }) => {
    await page.goto('/de/');
    await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute('content', 'dark');
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe('dark');
    // Native Bedienelemente (Datumsfeld, Scrollleiste) folgen color-scheme: dark – Eingabefeld ist dunkel, nicht weiß.
    await page.goto('/de/gruppe/');
    const input = await style(page, '#plan-date');
    expect(lum(over(parse(input.background), [27, 15, 23, 1]))).toBeLessThan(0.1);
  });

  test('prefers-contrast: more: axe bleibt grün und nichts bricht (Hinweis: kein eigener Kontrastmodus vorhanden)', async ({ page }) => {
    await page.emulateMedia({ contrast: 'more' });
    for (const path of DE_PAGES) {
      await page.goto(path);
      expect(await page.evaluate(() => matchMedia('(prefers-contrast: more)').matches)).toBe(true);
      const results = await new AxeBuilder({ page: page as never }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      expect(results.violations.map((v) => v.id), path).toEqual([]);
    }
  });

  /** Kontrast der Umrandung (über dem eigenen Hintergrund) gegen den Untergrund, 1.4.11 verlangt 3:1. */
  async function borderContrast(page: Page, path: string, selector: string, css?: string): Promise<number> {
    await page.goto(path);
    if (css) await page.addStyleTag({ content: css });
    const ground = await page.locator(selector).first().evaluate((el) => {
      for (let node: Element | null = el.parentElement; node; node = node.parentElement) {
        const bg = getComputedStyle(node).backgroundColor;
        if (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg;
      }
      return 'rgb(27, 15, 23)';
    });
    const s = await style(page, selector);
    const outer = over(parse(ground), [27, 15, 23, 1]);
    const edge = over(parse(s.borderColor), over(parse(s.background), outer));
    return ratio(edge, outer);
  }

  for (const [path, selector] of [
    ['/de/besuch/', '#inq-people'],
    ['/de/besuch/', '#inq-note'],
    ['/de/gruppe/', '#plan-date'],
    ['/de/gruppe/', '#plan-time'],
  ] as const) {
    test(`1.4.11 Umrandung auf dunklem Grund mindestens 3:1: ${path} ${selector}`, async ({ page }) => {
      expect(await borderContrast(page, path, selector)).toBeGreaterThanOrEqual(3);
    });
  }

  for (const selector of ['.paper .chip[aria-pressed="false"]', '#menu-search']) {
    // BELEGT (P2): --line-strong auf Papier ist rgb(35 19 27 / .4) und erreicht gemessen nur 2,47:1 (Chip) bzw. 2,28:1 (Suchfeld).
    test.fixme(`1.4.11 Umrandung auf Papier mindestens 3:1: ${selector}`, async ({ page }) => {
      expect(await borderContrast(page, '/de/drinks/', selector)).toBeGreaterThanOrEqual(3);
    });
    test(`Fix-Beweis --line-strong .6 auf Papier: ${selector}`, async ({ page }) => {
      const ratioFixed = await borderContrast(page, '/de/drinks/', selector, '.paper { --line-strong: rgb(35 19 27 / 0.6); }');
      expect(ratioFixed).toBeGreaterThanOrEqual(3);
    });
  }
});

test.describe('prefers-reduced-motion: reduce', () => {
  test.use({ reducedMotion: 'reduce' });

  test('keine laufenden oder endlosen Animationen, kein sanftes Scrollen, keine View-Transition-Animation', async ({ page }) => {
    for (const path of DE_PAGES) {
      await page.goto(path);
      const running = await page.evaluate(() =>
        document
          .getAnimations()
          .filter((a) => a.playState === 'running')
          .map((a) => {
            const t = a.effect?.getTiming();
            return { duration: Number(t?.duration ?? 0), iterations: t?.iterations };
          })
          .filter((a) => a.iterations === Infinity || a.duration > 50),
      );
      expect(running, path).toEqual([]);
      expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), path).toBe('auto');
    }
  });

  test('Ausnahme Lightbox-Wechsel und Toast: Zustände wechseln ohne Verzögerung', async ({ page }) => {
    await page.goto('/de/galerie/');
    await page.locator('[data-shot]').first().click();
    const durations = await page.locator('[data-lightbox], [data-lightbox] img, .iconbtn').evaluateAll((els) => els.map((el) => getComputedStyle(el).transitionDuration + '/' + getComputedStyle(el).animationDuration));
    for (const d of durations) for (const part of d.split('/')) expect(Math.max(...part.split(',').map((x) => parseFloat(x))), d).toBeLessThanOrEqual(0.001);
  });
});
