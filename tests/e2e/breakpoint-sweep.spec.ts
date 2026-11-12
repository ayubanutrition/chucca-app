/**
 * Breakpoint-Sweep: nur DOM-Messung (keine Screenshots). Je Seite wird einmal geladen und die Viewportbreite durchgefahren:
 * 320 bis 1280 px in 40-px-Schritten plus 768 und 1024 (600, 640 und 960 liegen im Raster).
 * Geprüft wird je Breite: kein horizontales Scrollen, kein Text-/Kontrollen-Überlauf (Helfer aus a11y-helpers),
 * keine Elemente außerhalb des Viewports, keine überlappenden Geschwister-Sektionen/-Karten,
 * Navigation (Tabbar bis 959 px, danach Topnav, nie beides oder keins) und 44-px-Ziele in der Tabbar.
 */
import { expect, test, type Page } from '@playwright/test';
import { PAGES, scanTextLoss } from './a11y-helpers';
import { ORIGIN } from './ports';

test.use({ bypassCSP: true });

const WIDTHS = [...new Set([...Array.from({ length: 25 }, (_, i) => 320 + 40 * i), 768, 1024])].sort((a, b) => a - b);
const TOPNAV_FROM = 960; // 60rem in global.css

type Target = { name: string; origin: string; path: string };
const targets: Target[] = [];
for (const locale of ['de', 'en', 'es'] as const) {
  PAGES[locale].forEach((path, i) => {
    targets.push({ name: `dist ${path}`, origin: ORIGIN.preview, path });
    targets.push({ name: `dist-public ${path}`, origin: ORIGIN.public, path });
    // Heute (0) und Besuch (2) zeigen Öffnungszeiten: zusätzlich der Fixture-Stand mit Zeitentabelle.
    if (i === 0 || i === 2) targets.push({ name: `dist-hours ${path}`, origin: ORIGIN.hours, path });
  });
}

/** Messung im Browser; liefert Meldungen als Text. */
const measure = (topnavFrom: number): string[] => {
  const out: string[] = [];
  const vw = document.documentElement.clientWidth;
  const visible = (el: Element): boolean => {
    for (let n: Element | null = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden' || n.hasAttribute('hidden')) return false;
    }
    const b = el.getBoundingClientRect();
    return b.width > 0 && b.height > 0;
  };
  const label = (el: Element) => `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''}`;

  const hs = document.documentElement.scrollWidth - vw;
  if (hs > 0) out.push(`hscroll +${hs}`);

  // Inhalt außerhalb des Viewports (ohne Scrollbereiche und beschnittene Dekoration)
  for (const el of document.querySelectorAll('main *, header *, footer *')) {
    if (!visible(el) || el.closest('.visually-hidden')) continue;
    let inScroller = false;
    for (let n: Element | null = el.parentElement; n && n !== document.body; n = n.parentElement) {
      if (['auto', 'scroll', 'hidden', 'clip'].includes(getComputedStyle(n).overflowX)) inScroller = true; // eigener Scrollbereich oder Beschnitt (Text: scanTextLoss)
    }
    if (inScroller) continue;
    const b = el.getBoundingClientRect();
    if (b.right > vw + 1 || b.left < -1) {
      out.push(`außerhalb ${label(el)} [${Math.round(b.left)}..${Math.round(b.right)}]`);
      break;
    }
  }

  // überlappende Geschwister-Sektionen/Karten
  const card = (el: Element) => /^(SECTION|ARTICLE|LI|FIGURE|ASIDE)$/.test(el.tagName) || /card|panel|tile/.test(String(el.className));
  const parents = [document.querySelector('main'), ...document.querySelectorAll('main *')].filter((p): p is Element => !!p);
  for (const p of parents) {
    const kids = [...p.children].filter((k) => card(k) && visible(k) && !['absolute', 'fixed', 'sticky'].includes(getComputedStyle(k).position));
    for (let i = 0; i < kids.length; i++) {
      for (let j = i + 1; j < kids.length; j++) {
        const a = kids[i]!.getBoundingClientRect();
        const b = kids[j]!.getBoundingClientRect();
        const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (ox > 1 && oy > 1) out.push(`Überlappung ${label(kids[i]!)} × ${label(kids[j]!)} (${Math.round(ox)}×${Math.round(oy)})`);
      }
    }
  }

  // Navigation
  const tab = document.querySelector('.tabbar');
  const top = document.querySelector('.topnav');
  const tabVis = !!tab && visible(tab);
  const topVis = !!top && visible(top);
  const wantTab = vw < topnavFrom;
  if (tabVis !== wantTab || topVis === wantTab) out.push(`Navigation tabbar=${tabVis} topnav=${topVis} bei ${vw}`);
  if (tabVis && tab) {
    const tb = tab.getBoundingClientRect();
    if (tb.left < -1 || tb.right > vw + 1) out.push(`Tabbar außerhalb [${tb.left}..${tb.right}]`);
    for (const a of tab.querySelectorAll('a')) {
      const b = a.getBoundingClientRect();
      if (b.width < 44 || b.height < 44) out.push(`Tabbar-Ziel ${a.textContent?.trim()} ${Math.round(b.width)}×${Math.round(b.height)}`);
    }
  }
  if (topVis && top) {
    const tb = top.getBoundingClientRect();
    if (tb.right > vw + 1) out.push(`Topnav außerhalb [${tb.left}..${tb.right}]`);
  }
  return out;
};

async function sweep(page: Page, t: Target): Promise<Record<number, string[]>> {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(t.origin + t.path);
  await page.evaluate(() => document.fonts.ready);
  const found: Record<number, string[]> = {};
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const res = [...(await page.evaluate(measure, TOPNAV_FROM)), ...(await page.evaluate(scanTextLoss)).map((e) => `Textverlust ${e}`)];
    if (res.length) found[width] = res;
  }
  return found;
}

test.describe('Breakpoint-Sweep', () => {
  for (const t of targets) {
    test(`${WIDTHS.length} Breiten 320–1280: ${t.name}`, async ({ page }) => {
      expect(await sweep(page, t)).toEqual({});
    });
  }
});
