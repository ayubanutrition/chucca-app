/**
 * Zusätzliche WCAG-2.2-Prüfungen, die axe nicht abdeckt (Textabstand, Reflow, Fokus nicht verdeckt,
 * Zielgröße, Orientierung, Fehlermeldungen). Screenshots für Sichtprüfung: /tmp/chucca-agent-a11y/.
 *
 * Alle hier belegten Mängel sind behoben; die Tests sichern den Fix.
 * Die zugehörigen „Fix-Beweis“-Tests injizieren den vorgeschlagenen CSS-Fix und laufen grün.
 */
import { expect, test, type Page } from '@playwright/test';
import { ALL_PAGES, DE_PAGES, SHOT_DIR, TEXT_SPACING_CSS } from './a11y-helpers';

// Die Tests spielen eigene Stylesheets ein (Textabstand, Schriftgröße, Kontrastmodus), wie es Nutzer- oder Assistenz-Software tut;
// die Seiten-CSP gilt dafür nicht. Die CSP selbst prüft tests/e2e/headers.spec.ts.
test.use({ bypassCSP: true });

/** Text, der durch Abschneiden (overflow hidden/clip) verloren geht, und Text, der aus seiner Schaltfläche/Marke läuft. */
const scanTextLoss = (): string[] => {
  const out: string[] = [];
  const visible = (el: Element): boolean => {
    for (let node: Element | null = el; node; node = node.parentElement) {
      const cs = getComputedStyle(node);
      if (cs.display === 'none' || cs.visibility === 'hidden' || node.hasAttribute('hidden') || node.classList.contains('visually-hidden')) return false;
    }
    return true;
  };
  const textRects = (el: Element): DOMRect[] => {
    const rects: DOMRect[] = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!(n.textContent ?? '').trim()) continue;
      const parent = n.parentElement;
      if (!parent || !visible(parent)) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      for (const r of range.getClientRects()) if (r.width > 0 && r.height > 0) rects.push(r);
    }
    return rects;
  };
  for (const el of document.body.querySelectorAll('*')) {
    if (['TEXTAREA', 'INPUT', 'SCRIPT', 'STYLE', 'svg'].includes(el.tagName) || !visible(el)) continue;
    const cs = getComputedStyle(el);
    const box = el.getBoundingClientRect();
    const clipX = ['hidden', 'clip'].includes(cs.overflowX);
    const clipY = ['hidden', 'clip'].includes(cs.overflowY);
    const control = el.matches('.btn, .chip, .badge, .iconbtn, .tabbar a, .langs a, .topnav a, .eyebrow');
    if (!clipX && !clipY && !control) continue;
    for (const r of textRects(el)) {
      const lostX = (clipX || control) && (r.left < box.left - 1 || r.right > box.right + 1);
      const lostY = (clipY || control) && (r.top < box.top - 1 || r.bottom > box.bottom + 1);
      if (lostX || lostY) {
        out.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} „${(el.textContent ?? '').trim().slice(0, 24)}“`);
        break;
      }
    }
  }
  return [...new Set(out)];
};

const hscroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test.describe('1.4.12 Textabstand', () => {
  for (const width of [390, 1440]) {
    for (const path of ALL_PAGES) {
      test(`nichts abgeschnitten oder überlaufend bei ${width} px: ${path}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(path);
        const before = await page.evaluate(scanTextLoss);
        await page.addStyleTag({ content: TEXT_SPACING_CSS });
        const after = await page.evaluate(scanTextLoss);
        expect(after.filter((entry) => !before.includes(entry)), 'durch Textabstand neu abgeschnittener Text').toEqual([]);
        expect(await hscroll(page), 'horizontales Scrollen durch Textabstand').toBeLessThanOrEqual(0);
        if (path === '/de/gruppe/' || path === '/de/drinks/') await page.screenshot({ path: `${SHOT_DIR}/textspacing-${width}${path.replace(/\//g, '_')}.png`, fullPage: true });
      });
    }
  }
});

test.describe('1.4.10 Reflow und 1.4.4 Textgröße', () => {
  for (const path of ALL_PAGES) {
    test(`320 px ohne horizontales Scrollen, auch bei Textabstand: ${path}`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 640 });
      await page.goto(path);
      expect(await hscroll(page)).toBeLessThanOrEqual(0);
      await page.addStyleTag({ content: TEXT_SPACING_CSS });
      expect(await hscroll(page)).toBeLessThanOrEqual(0);
    });
  }

  for (const path of DE_PAGES) {
    test(`Schrift 200 % bei 390 px: kein Querscrollen, Tableiste vollständig: ${path}`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 800 });
      await page.goto(path);
      await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
      expect(await hscroll(page)).toBeLessThanOrEqual(0);
      const lastTab = await page.locator('.tabbar a').last().boundingBox();
      expect(lastTab && lastTab.x + lastTab.width).toBeLessThanOrEqual(391);
    });
  }

  test('Schrift 200 % bei 1280 px: Kopfzeile bricht um, Sprachwahl erreichbar', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/de/');
    await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
    expect(await hscroll(page)).toBeLessThanOrEqual(0);
    const langs = await page.locator('.langs').boundingBox();
    expect(langs && langs.x + langs.width).toBeLessThanOrEqual(1281);
  });

  test('Fix-Beweis: umbrechende Kopfzeile löst den Überlauf bei 200 % Schrift (1280 px)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/de/');
    await page.addStyleTag({
      content: `html { font-size: 200% !important; }
        .masthead__row { flex-wrap: wrap; }
        .langs { margin-inline-start: auto; }`,
    });
    expect(await hscroll(page)).toBeLessThanOrEqual(0);
    await page.screenshot({ path: `${SHOT_DIR}/fixproof-masthead-wrap-1280.png` });
  });

  test('280 px: Sprachwahl bleibt im Fenster', async ({ page }) => {
    await page.setViewportSize({ width: 280, height: 600 });
    await page.goto('/de/');
    expect(await hscroll(page)).toBeLessThanOrEqual(0);
  });
});

/** Fokussiertes Element liegt (mit seiner Mitte) unter der festen Leiste oder dem Toast. Erster Treffer wird fotografiert. */
async function tabThroughObscured(page: Page, shot?: string, limit = 140): Promise<string[]> {
  const problems: string[] = [];
  for (let i = 0; i < limit; i++) {
    await page.keyboard.press('Tab');
    // WebKit und Firefox scrollen zum Fokus animiert bzw. verzögert: gilt ein Element erst als verdeckt, wenn es auch nach kurzer Wartezeit noch verdeckt ist (Endlage statt Zwischenstand).
    const state = await page.evaluate(
      () =>
        new Promise<null | { name: string; covered: boolean; tabbar: number; top: number; bottom: number }>((resolve) => {
          let rounds = 0;
          const measure = () => {
            const el = document.activeElement as HTMLElement | null;
            if (!el || el === document.body) return resolve(null);
            const box = el.getBoundingClientRect();
            const x = Math.min(Math.max(box.left + box.width / 2, 0), innerWidth - 1);
            const y = Math.min(Math.max(box.top + box.height / 2, 0), innerHeight - 1);
            const covering = document.elementFromPoint(x, y)?.closest('.tabbar, .toast, .ribbon');
            const name = (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 30);
            const covered = Boolean(covering) && !el.closest('.tabbar');
            if (covered && ++rounds <= 25) return void setTimeout(measure, 60);
            resolve({ name, covered, tabbar: Math.round(document.querySelector('.tabbar')?.getBoundingClientRect().top ?? 0), top: Math.round(box.top), bottom: Math.round(box.bottom) });
          };
          measure();
        }),
    );
    if (!state) break;
    if (state.covered) {
      if (shot && problems.length === 0) await page.screenshot({ path: shot });
      problems.push(`${state.name} [${state.top}-${state.bottom}] unter Leiste ab ${state.tabbar}`);
    }
  }
  return problems;
}

/** Seiten, auf denen der Mangel im aktuellen Stand belegt ist (Tab-Durchlauf bei 390 x 844). */
const OBSCURED_TODAY = new Set(['/de/drinks/', '/de/besuch/', '/de/gruppe/', '/de/galerie/', '/en/drinks/', '/en/visit/', '/en/group/', '/en/gallery/', '/es/bebidas/', '/es/visita/', '/es/grupo/', '/es/galeria/']);
/** Vorgeschlagener Fix (src/styles/global.css): Platz für die feste Leiste beim Scrollen zum Fokus lassen. */
const SCROLL_PADDING_FIX = 'html { scroll-padding-bottom: calc(var(--tabbar) + env(safe-area-inset-bottom) + 1rem); }';

test.describe('2.4.11 Fokus nicht verdeckt (feste untere Leiste, 390 px)', () => {
  for (const path of ALL_PAGES) {
    const run = async (page: Page, css?: string) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(path);
      if (css) await page.addStyleTag({ content: css });
      return tabThroughObscured(page, css ? undefined : `${SHOT_DIR}/focus-obscured${path.replace(/\//g, '_')}.png`);
    };
    const title = `kein fokussiertes Element liegt unter der Tableiste: ${path}`;
    if (OBSCURED_TODAY.has(path)) {
      // BELEGT: `html` hat nur scroll-padding-top. Der Browser scrollt Fokusziele nur bis zum Fensterrand, nicht über die Leiste.
      // Betroffen u. a. die Formularfelder der Anfrage auf „Besuch“ (komplett verdeckt, 54 px hoch ab y=780 bei Leiste ab y=775).
      test(title, async ({ page }) => {
        expect(await run(page)).toEqual([]);
      });
    } else {
      test(title, async ({ page }) => {
        expect(await run(page)).toEqual([]);
      });
    }
    test(`Fix-Beweis scroll-padding-bottom: ${path}`, async ({ page }) => {
      expect(await run(page, SCROLL_PADDING_FIX)).toEqual([]);
    });
  }

  test('Querformat 844 x 390: Leiste ist nicht fixiert, Fokus nie verdeckt', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    for (const path of DE_PAGES) {
      await page.goto(path);
      expect(await page.locator('.tabbar').evaluate((el) => getComputedStyle(el).position), path).toBe('static');
      expect(await tabThroughObscured(page), path).toEqual([]);
    }
  });
});
