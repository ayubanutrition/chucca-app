import { describe, expect, it } from 'vitest';
import { isVisible, upcoming } from '../../src/lib/events';
import { openStatus, upcomingExceptions, type HoursData } from '../../src/lib/hours';
import { emptyFilter, filterMenu, formatPrice, normalize } from '../../src/lib/menu';
import { civilDusk, skyPhase, sunset } from '../../src/lib/sun';
import { fixtureMenu } from '../../src/lib/content';
import { readStored, removeStored, writeStored } from '../../src/lib/storage';

const evening: HoursData = {
  status: 'confirmed',
  // So–Sa; Montag geschlossen; täglich 19:00–02:00
  regular: [{ open: '19:00', close: '02:00' }, null, ...Array.from({ length: 5 }, () => ({ open: '19:00', close: '02:00' }))],
  exceptions: { '2030-01-17': null },
};

describe('Öffnungsstatus', () => {
  it('berechnet ohne bestätigte Daten niemals einen Status', () => {
    expect(openStatus({ status: 'unconfirmed' })).toEqual({ state: 'unconfirmed' });
    expect(openStatus({ status: 'unconfirmed', regular: evening.regular })).toEqual({ state: 'unconfirmed' });
    expect(openStatus({ status: 'confirmed', regular: null })).toEqual({ state: 'unconfirmed' });
  });
  it('erkennt offen, auch nach Mitternacht aus der Schicht des Vortags', () => {
    const open = openStatus(evening, new Date('2030-01-15T19:30:00Z')); // Di 20:30 Madrid
    expect(open).toEqual({ state: 'open', closesAt: new Date('2030-01-16T01:00:00Z') });
    const late = openStatus(evening, new Date('2030-01-16T00:30:00Z')); // Mi 01:30 Madrid
    expect(late.state).toBe('open');
  });
  it('nennt die nächste Öffnung und beachtet Ruhetag und Ausnahme', () => {
    expect(openStatus(evening, new Date('2030-01-15T12:00:00Z'))).toEqual({ state: 'closed', opensAt: new Date('2030-01-15T18:00:00Z') });
    // Mo 14.01. Ruhetag → Dienstag
    expect(openStatus(evening, new Date('2030-01-14T12:00:00Z'))).toEqual({ state: 'closed', opensAt: new Date('2030-01-15T18:00:00Z') });
    // Do 17.01. Ausnahme geschlossen → Freitag
    expect(openStatus(evening, new Date('2030-01-17T12:00:00Z'))).toEqual({ state: 'closed', opensAt: new Date('2030-01-18T18:00:00Z') });
  });
  it('bleibt in den Nächten der Zeitumstellung korrekt (Schluss um 02:00 fällt in Lücke bzw. Doppelstunde)', () => {
    const nightly: HoursData = { status: 'confirmed', regular: Array.from({ length: 7 }, () => ({ open: '20:00', close: '02:30' })) };
    // Herbst 2026: Sa 24.10. 21:00 und So 25.10. 01:30 Madrid
    expect(openStatus(nightly, new Date('2026-10-24T19:00:00Z')).state).toBe('open');
    expect(openStatus(nightly, new Date('2026-10-24T23:30:00Z')).state).toBe('open');
    // Frühjahr 2026: Sa 28.03. 21:00 Madrid; 02:30 existiert am 29.03. nicht → Schluss beim ersten gültigen Zeitpunkt danach
    const spring = openStatus(nightly, new Date('2026-03-28T20:00:00Z'));
    expect(spring).toEqual({ state: 'open', closesAt: new Date('2026-03-29T01:00:00Z') });
    expect(openStatus(nightly, new Date('2026-03-29T10:00:00Z'))).toEqual({ state: 'closed', opensAt: new Date('2026-03-29T18:00:00Z') });
  });
  it('gilt außerhalb des bestätigten Zeitraums als unbestätigt', () => {
    expect(openStatus({ ...evening, validUntil: '2029-10-31' }, new Date('2030-01-15T19:30:00Z'))).toEqual({ state: 'unconfirmed' });
    expect(openStatus({ ...evening, validFrom: '2030-04-01' }, new Date('2030-01-15T19:30:00Z'))).toEqual({ state: 'unconfirmed' });
  });
});

describe('Ausnahmetage der Öffnungszeiten', () => {
  const hours: HoursData = {
    ...evening,
    validFrom: '2030-01-01',
    validUntil: '2030-06-30',
    exceptions: { '2030-12-24': null, '2030-02-14': { open: '18:00', close: '23:00' }, '2030-01-17': null, '2029-12-31': null, '2030-03-01': null },
  };
  it('liefert bestätigte Ausnahmen ab heute chronologisch, ohne vergangene und ohne Tage außerhalb des Zeitraums', () => {
    expect(upcomingExceptions(hours, '2030-01-17')).toEqual([
      { date: '2030-01-17', range: null },
      { date: '2030-02-14', range: { open: '18:00', close: '23:00' } },
      { date: '2030-03-01', range: null },
    ]);
    expect(upcomingExceptions(hours, '2030-01-18').map((e) => e.date)).toEqual(['2030-02-14', '2030-03-01']);
  });
  it('liefert nichts ohne bestätigte Zeiten oder ohne Ausnahmen', () => {
    expect(upcomingExceptions({ status: 'unconfirmed', exceptions: hours.exceptions }, '2030-01-01')).toEqual([]);
    expect(upcomingExceptions({ status: 'confirmed', regular: null, exceptions: hours.exceptions }, '2030-01-01')).toEqual([]);
    expect(upcomingExceptions({ ...evening, exceptions: null }, '2030-01-01')).toEqual([]);
    expect(upcomingExceptions({ ...evening, exceptions: undefined }, '2030-01-01')).toEqual([]);
  });
});

describe('Sonnenstand Playa de Palma', () => {
  const [lat, lon] = [39.52, 2.74];
  const minutes = (date: Date | null) => (date ? date.getUTCHours() * 60 + date.getUTCMinutes() : -1);
  it('trifft bekannte Sonnenuntergänge auf wenige Minuten', () => {
    // Referenz: ca. 17:36 MEZ am 11.11. und ca. 21:21 MESZ zur Sommersonnenwende.
    expect(Math.abs(minutes(sunset('2026-11-11', lat, lon)) - (16 * 60 + 36))).toBeLessThanOrEqual(4);
    expect(Math.abs(minutes(sunset('2026-06-21', lat, lon)) - (19 * 60 + 21))).toBeLessThanOrEqual(4);
    expect(sunset('kein-datum', lat, lon)).toBeNull();
  });
  it('ordnet Tagesphasen in der richtigen Reihenfolge', () => {
    const day = '2026-06-21';
    const set = sunset(day, lat, lon) as Date;
    const dusk = civilDusk(day, lat, lon) as Date;
    expect(dusk.getTime()).toBeGreaterThan(set.getTime());
    expect(skyPhase(new Date('2026-06-21T12:00:00Z'), day, lat, lon)).toBe('day');
    expect(skyPhase(new Date(set.getTime() - 20 * 60_000), day, lat, lon)).toBe('golden');
    expect(skyPhase(new Date(set.getTime() + 5 * 60_000), day, lat, lon)).toBe('dusk');
    expect(skyPhase(new Date(dusk.getTime() + 60_000), day, lat, lon)).toBe('night');
    expect(skyPhase(new Date('2026-06-21T02:00:00Z'), day, lat, lon)).toBe('night');
  });
});

describe('Getränkekarte', () => {
  const items = fixtureMenu.items;
  it('sucht ohne Rücksicht auf Akzente und Großschreibung in Namen und Zutaten', () => {
    expect(normalize('  Piña CÓCTEL Süß ')).toBe('pina coctel suss');
    expect(filterMenu(items, { ...emptyFilter(), query: 'MINZE' }, 'de').map((d) => d.id)).toContain('mojito');
    expect(filterMenu(items, { ...emptyFilter(), query: 'pina' }, 'es').map((d) => d.id)).toEqual(['pina-almond']);
    expect(filterMenu(items, { ...emptyFilter(), query: 'gin tonic' }, 'en').map((d) => d.id)).toEqual(['gin-tonic', 'garden-tonic']);
  });
  it('kombiniert Kategorie, Geschmack und alkoholfrei', () => {
    const free = filterMenu(items, { ...emptyFilter(), alcoholFree: true }, 'de');
    expect(free.length).toBeGreaterThanOrEqual(5);
    expect(free.every((d) => d.alcoholFree)).toBe(true);
    expect(filterMenu(items, { ...emptyFilter(), category: 'classics', taste: 'fruity' }, 'de').map((d) => d.id)).toEqual(['pornstar']);
    expect(filterMenu(items, emptyFilter(), 'de')).toHaveLength(items.length);
  });
  it('liefert bei Nulltreffern eine leere Liste', () => {
    expect(filterMenu(items, { ...emptyFilter(), query: 'gibtsnicht' }, 'de')).toEqual([]);
    expect(filterMenu(items, { ...emptyFilter(), category: 'free', query: 'virgin' }, 'en')).toEqual([{ ...items.find((d) => d.id === 'virgin-mojito')! }]);
  });
  it('formatiert Preise je Sprache', () => {
    expect(formatPrice(1100, 'de').replace(/\s/g, ' ')).toBe('11 €');
    expect(formatPrice(1100, 'en')).toBe('€11');
    expect(formatPrice(950, 'es').replace(/\s/g, ' ')).toBe('9,50 €');
  });
});

describe('Termine', () => {
  const now = new Date('2030-01-15T22:30:00Z'); // 23:30 in Madrid
  const base = { status: 'confirmed' as const, start: '21:00' };
  it('zeigt nur bestätigte Termine bis einschließlich des Veranstaltungstags', () => {
    expect(isVisible({ ...base, date: '2030-01-15' }, now)).toBe(true);
    expect(isVisible({ ...base, date: '2030-01-14' }, now)).toBe(false);
    expect(isVisible({ ...base, date: '2030-01-14', hideAfter: '2030-01-20' }, now)).toBe(true);
    expect(isVisible({ ...base, status: 'draft', date: '2030-02-01' }, now)).toBe(false);
    expect(isVisible({ ...base, status: 'cancelled', date: '2030-02-01' }, now)).toBe(false);
  });
  it('sortiert chronologisch', () => {
    const list = upcoming([{ ...base, date: '2030-03-01' }, { ...base, date: '2030-02-01' }, { ...base, date: '2029-12-31' }], now);
    expect(list.map((e) => e.date)).toEqual(['2030-02-01', '2030-03-01']);
  });
});

describe('Speicherzugriff', () => {
  it('scheitert leise, wenn kein Web Storage existiert', () => {
    expect(readStored('x')).toBeNull();
    expect(writeStored('x', '1')).toBe(false);
    expect(() => removeStored('x')).not.toThrow();
  });
});
