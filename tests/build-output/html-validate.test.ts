/**
 * (1) HTML-Validität aller Seiten aller Dist-Ordner mit html-validate (MIT, unabhängig vom Generator).
 * Regel-Ausnahmen sind einzeln begründet; alles andere aus `html-validate:recommended` gilt.
 */
import { HtmlValidate, type ConfigData } from 'html-validate';
import { beforeAll, describe, expect, it } from 'vitest';
import { assertBuilt, BUILDS, htmlFiles, read, tags } from './helpers';

export const CONFIG: ConfigData = {
  extends: ['html-validate:recommended'],
  rules: {
    // Bewusst: Die CSP erlaubt Style-Attribute (`style-src-attr 'unsafe-inline'`, docs/11_HOSTING.md);
    // sie setzen Positions- und Variablenwerte je Element (`--stack`, `object-position`). Gültiges HTML.
    'no-inline-style': 'off',
    // Bewusst: `<ul role="list">` stellt die Listensemantik in VoiceOver/Safari wieder her, wenn
    // `list-style: none` gesetzt ist. Ausgenommen ist nur die Rolle list; dass `role="list"` sonst nirgends vorkommt, prüft der Test unten.
    'no-redundant-role': ['error', { exclude: ['list'] }],
    // Bewusst: Obere Navigation und Tableiste tragen denselben Namen, weil CSS je Breite genau eine
    // ausblendet (`display: none`, nie beide im Zugänglichkeitsbaum). Ersatzprüfung weiter unten.
    'unique-landmark': 'off',
  },
};

describe('HTML-Validität (html-validate)', () => {
  beforeAll(assertBuilt);
  const hv = new HtmlValidate(CONFIG);

  for (const b of BUILDS) {
    describe(b.name, () => {
      it('hat Seiten', () => {
        expect(htmlFiles(b).length).toBeGreaterThanOrEqual(17);
      });

      for (const f of htmlFiles(b)) {
        it(`${f} ist gültig`, async () => {
          const report = await hv.validateString(read(b, f), `${b.name}/${f}`);
          const messages = report.results.flatMap((r) => r.messages.map((m) => `${m.ruleId}: ${m.message} (Zeile ${m.line}, Spalte ${m.column})`));
          expect(messages).toEqual([]);
        });
      }

      it('doppelte Landmark-Namen nur bei oberer Navigation und Tableiste', () => {
        for (const f of htmlFiles(b)) {
          const named = new Map<string, string[]>();
          for (const t of tags(read(b, f))) {
            if ((t.name === 'nav' || t.name === 'aside' || t.name === 'section' || t.name === 'form') && t.attrs['aria-label']) {
              const key = `${t.name}:${t.attrs['aria-label']}`;
              named.set(key, [...(named.get(key) ?? []), t.attrs.class ?? '']);
            }
          }
          for (const [key, classes] of named) {
            if (classes.length > 1) expect(classes.sort(), `${f}: ${key}`).toEqual(['tabbar', 'topnav']);
          }
        }
      });

      it('role="list" nur auf ul/ol', () => {
        for (const f of htmlFiles(b)) {
          for (const t of tags(read(b, f))) {
            if (t.attrs.role === 'list') expect(['ul', 'ol'], `${f}: <${t.name}>`).toContain(t.name);
          }
        }
      });
    });
  }
});
