import { describe, expect, it } from 'vitest';
import { dictionary } from '../../src/i18n';
import { menuUpdatedText } from '../../src/lib/menu';

// E14 „Stand der Karte“: ausschließlich synthetische Testdaten, keine Venue-Daten.
describe('Stand der Karte (E14)', () => {
  const dict = { de: dictionary('de'), en: dictionary('en'), es: dictionary('es') };
  const text = (locale: 'de' | 'en' | 'es', at: string | null, published = true) => menuUpdatedText(at, published, dict[locale].drinks.updated, locale);

  it('gibt ohne Datum oder ohne bestätigte Karte nichts aus', () => {
    for (const l of ['de', 'en', 'es'] as const) {
      expect(text(l, null)).toBeNull();
      expect(text(l, '2030-01-15', false)).toBeNull();
      expect(text(l, 'kein-datum')).toBeNull();
    }
  });
  it('setzt das Datum lokalisiert in die Vorlage jeder Sprache', () => {
    expect(text('de', '2030-01-15')).toBe('Stand der Karte: Dienstag, 15. Januar 2030');
    expect(text('en', '2030-01-15')).toBe('Menu as of Tuesday, 15 January 2030');
    expect(text('es', '2030-01-15')).toBe('Carta actualizada el martes, 15 de enero de 2030');
  });
  it('verschiebt den Kalendertag nicht (Jahreswechsel, Schalttag, Zeitumstellung)', () => {
    expect(text('de', '2030-01-01')).toContain('1. Januar 2030');
    expect(text('de', '2032-02-29')).toContain('29. Februar 2032');
    expect(text('en', '2030-03-31')).toContain('31 March 2030');
    expect(text('en', '2030-10-27')).toContain('27 October 2030');
  });
  it('nennt auch ein altes Datum unverändert (der Hinweis „älter als 90 Tage“ gehört dem Inhaltsbericht, tests/unit/content-check.test.ts)', () => {
    expect(text('en', '2020-06-01')).toBe('Menu as of Monday, 1 June 2020');
  });
  it('jede Sprachvorlage enthält genau einen {date}-Platzhalter', () => {
    for (const l of ['de', 'en', 'es'] as const) expect(dict[l].drinks.updated.match(/\{date\}/g)).toHaveLength(1);
  });
});
