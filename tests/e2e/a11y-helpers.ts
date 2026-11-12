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
