import type { Page } from '@playwright/test';

/** Alle 15 Seiten der Vorschau (Pfade relativ zum Vorschau-Server). */
export const PAGES = {
  de: ['/de/', '/de/drinks/', '/de/besuch/', '/de/gruppe/', '/de/galerie/'],
  en: ['/en/', '/en/drinks/', '/en/visit/', '/en/group/', '/en/gallery/'],
  es: ['/es/', '/es/bebidas/', '/es/visita/', '/es/grupo/', '/es/galeria/'],
} as const;
export const ALL_PAGES: string[] = Object.values(PAGES).flat();
export const DE_PAGES: string[] = [...PAGES.de];

export const SHOT_DIR = '/tmp/chucca-agent-a11y';

/** Texte, die dem Nutzer Abstand/Typografie aufzwingen (WCAG 1.4.12), ohne die Seite zu verändern. */
export const TEXT_SPACING_CSS = `
  * { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }
  p { margin-block-end: 2em !important; }
`;

/** Überstand der Seite über das Fenster (> 0 heißt horizontales Scrollen). */
export const hscroll = (page: Page): Promise<number> => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

/** Namen der Sprachen je Pfad (nur Pfade, die einer Seite entsprechen). */
export const localeOf = (path: string): 'de' | 'en' | 'es' => path.slice(1, 3) as 'de' | 'en' | 'es';

/** Sichtbarkeit wie ein Nutzer: nicht display:none, nicht visibility:hidden, nicht in [hidden]/inert, Fläche > 0. */
export async function installVisibilityHelper(page: Page): Promise<void> {
  await page.addInitScript(() => {
    (window as unknown as { __isVisible: (el: Element) => boolean }).__isVisible = (el: Element): boolean => {
      for (let node: Element | null = el; node; node = node.parentElement) {
        const cs = getComputedStyle(node);
        if (cs.display === 'none' || cs.visibility === 'hidden') return false;
        if (node.hasAttribute('hidden') || node.hasAttribute('inert')) return false;
      }
      const box = el.getBoundingClientRect();
      return box.width > 0 && box.height > 0;
    };
  });
}

/** Text, der durch Abschneiden (overflow hidden/clip) verloren geht, und Text, der aus seiner Schaltfläche/Marke läuft. */
export const scanTextLoss = (): string[] => {
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
