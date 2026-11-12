/**
 * Randfälle der Kernlogik (Lückenschluss nach Coverage-Messung):
 * Zeitumstellung Madrid, Betriebszeiten über Mitternacht, ICS-Faltung,
 * Kalenderränder, korrupte Speicherdaten, Menüsuche, Teilen.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildCalendar, escapeText, fold, stamp, unfold } from '../../src/lib/ics';
import { isVisible } from '../../src/lib/events';
import { openStatus, type DayRange, type HoursData } from '../../src/lib/hours';
import { emptyFilter, filterMenu, isFilterActive, matches, normalize, toEntry, matchesEntry, formatPrice } from '../../src/lib/menu';
import { DRAFT_KEY, draftFromParams, draftToParams, emptyDraft, loadDraft, newUid, saveDraft, updateDraft, validatePlan } from '../../src/lib/planner';
import { copyText, plainText, shareOrCopy } from '../../src/lib/share';
import { readStored, removeStored, writeStored } from '../../src/lib/storage';
import { civilDusk, skyPhase, sunrise, sunset } from '../../src/lib/sun';
import {
  MAX_PLAN_DATE,
  addDays,
  deviceTimeZone,
  formatClock,
  formatLongDate,
  formatShortDate,
  intlLocale,
  madridDate,
  madridTime,
  madridWeekday,
  toInstant,
  toInstantLenient,
} from '../../src/lib/time';
import type { Drink } from '../../src/lib/content/schema';

afterEach(() => vi.unstubAllGlobals());

// Madrid 2026: Umstellung auf Sommerzeit am 29.03. (02:00 -> 03:00),
// zurück auf Winterzeit am 25.10. (03:00 -> 02:00).
describe('Zeitumstellung Madrid', () => {
  it('toInstant: Frühjahrslücke und doppelte Herbststunde sind nicht eindeutig', () => {
    expect(toInstant('2026-03-29', '02:30')).toBeNull();
    expect(toInstant('2026-10-25', '02:30')).toBeNull();
    expect(toInstant('2026-03-29', '01:59')).toEqual(new Date('2026-03-29T00:59:00Z'));
    expect(toInstant('2026-03-29', '03:00')).toEqual(new Date('2026-03-29T01:00:00Z'));
    expect(toInstant('2026-10-25', '01:59')).toEqual(new Date('2026-10-24T23:59:00Z'));
    expect(toInstant('2026-10-25', '03:00')).toEqual(new Date('2026-10-25T02:00:00Z'));
  });
  it('toInstantLenient: Lücke rückt auf 03:00, doppelte Stunde meint das erste Vorkommen', () => {
    expect(toInstantLenient('2026-03-29', '02:30')).toEqual(new Date('2026-03-29T01:00:00Z'));
    expect(toInstantLenient('2026-10-25', '02:30')).toEqual(new Date('2026-10-25T00:30:00Z'));
    expect(toInstantLenient('2026-06-01', '12:00')).toEqual(new Date('2026-06-01T10:00:00Z'));
    expect(toInstantLenient('2026-02-30', '12:00')).toBeNull();
    expect(toInstantLenient('2026-06-01', '24:00')).toBeNull();
    expect(toInstantLenient('2026-06-01', '9:00')).toBeNull();
  });
  it('Planer lehnt Umstellungszeiten mit Code dst ab, Nachbarzeiten gelten', () => {
    const now = new Date('2026-03-01T12:00:00Z');
    expect(validatePlan({ date: '2026-03-29', time: '02:00' }, now)).toEqual({ ok: false, field: 'time', code: 'dst' });
    expect(validatePlan({ date: '2026-03-29', time: '02:59' }, now)).toEqual({ ok: false, field: 'time', code: 'dst' });
    expect(validatePlan({ date: '2026-03-29', time: '03:00' }, now)).toEqual({ ok: true, instant: new Date('2026-03-29T01:00:00Z') });
    expect(validatePlan({ date: '2026-10-25', time: '02:00' }, now)).toEqual({ ok: false, field: 'time', code: 'dst' });
    expect(validatePlan({ date: '2026-10-25', time: '02:59' }, now)).toEqual({ ok: false, field: 'time', code: 'dst' });
    expect(validatePlan({ date: '2026-10-25', time: '01:59' }, now).ok).toBe(true);
    expect(validatePlan({ date: '2026-10-25', time: '03:00' }, now).ok).toBe(true);
  });
  it('Planer: "heute" und "vergangen" richten sich nach Madrid, nicht nach UTC', () => {
    // 23:30 UTC am 28.03. = 00:30 Madrid am 29.03. (noch Winterzeit: UTC+1)
    const now = new Date('2026-03-28T23:30:00Z');
    expect(madridDate(now)).toBe('2026-03-29');
    expect(validatePlan({ date: '2026-03-28', time: '23:00' }, now)).toEqual({ ok: false, field: 'date', code: 'invalidDate' });
    expect(validatePlan({ date: '2026-03-29', time: '00:00' }, now)).toEqual({ ok: false, field: 'time', code: 'past' });
    expect(validatePlan({ date: '2026-03-29', time: '01:00' }, now).ok).toBe(true);
  });
  it('Madrider Uhrzeit rund um die Umstellung', () => {
    expect(madridTime(new Date('2026-03-29T00:59:00Z'))).toBe('01:59');
    expect(madridTime(new Date('2026-03-29T01:00:00Z'))).toBe('03:00');
    expect(madridTime(new Date('2026-10-25T00:30:00Z'))).toBe('02:30');
    expect(madridTime(new Date('2026-10-25T01:30:00Z'))).toBe('02:30');
    expect(madridTime(new Date('2026-10-25T02:00:00Z'))).toBe('03:00');
  });
});

describe('Öffnungszeiten über Mitternacht und Zeitumstellung', () => {
  const nightly = (range: DayRange | null): HoursData => ({ status: 'confirmed', regular: Array.from({ length: 7 }, () => range) });
  const late = nightly({ open: '22:00', close: '04:00' });

  it('Schicht in der Herbstnacht ist eine Stunde länger', () => {
    // Sa 24.10. 22:00 (UTC+2 = 20:00Z) bis So 25.10. 04:00 (UTC+1 = 03:00Z)
    const s = openStatus(late, new Date('2026-10-24T21:00:00Z'));
    expect(s).toEqual({ state: 'open', closesAt: new Date('2026-10-25T03:00:00Z') });
    expect(openStatus(late, new Date('2026-10-25T02:59:00Z')).state).toBe('open');
    expect(openStatus(late, new Date('2026-10-25T03:00:00Z')).state).toBe('closed');
  });
  it('Schicht in der Frühjahrsnacht ist eine Stunde kürzer', () => {
    // Sa 28.03. 22:00 (UTC+1 = 21:00Z) bis So 29.03. 04:00 (UTC+2 = 02:00Z)
    const s = openStatus(late, new Date('2026-03-28T22:00:00Z'));
    expect(s).toEqual({ state: 'open', closesAt: new Date('2026-03-29T02:00:00Z') });
    expect(openStatus(late, new Date('2026-03-29T02:00:00Z')).state).toBe('closed');
  });
  it('Schließzeit in der Frühjahrslücke rückt auf 03:00', () => {
    const h = nightly({ open: '22:00', close: '02:30' });
    expect(openStatus(h, new Date('2026-03-28T22:00:00Z'))).toEqual({ state: 'open', closesAt: new Date('2026-03-29T01:00:00Z') });
  });
  it('Öffnungszeit in der Frühjahrslücke rückt auf 03:00', () => {
    const h = nightly({ open: '02:30', close: '08:00' });
    expect(openStatus(h, new Date('2026-03-29T00:30:00Z'))).toEqual({ state: 'closed', opensAt: new Date('2026-03-29T01:00:00Z') });
  });
  it('close == open bedeutet 24 Stunden, close "00:00" ist Mitternacht des Folgetags', () => {
    const round = nightly({ open: '10:00', close: '10:00' });
    expect(openStatus(round, new Date('2026-06-10T08:00:00Z'))).toEqual({ state: 'open', closesAt: new Date('2026-06-11T08:00:00Z') });
    const mid = nightly({ open: '18:00', close: '00:00' });
    expect(openStatus(mid, new Date('2026-06-10T20:00:00Z'))).toEqual({ state: 'open', closesAt: new Date('2026-06-10T22:00:00Z') });
    expect(openStatus(mid, new Date('2026-06-10T22:00:00Z')).state).toBe('closed');
  });
  it('Ausnahme "geschlossen" am Vortag beendet keine laufende Nachtschicht von heute, wohl aber die von gestern', () => {
    const h: HoursData = { ...late, exceptions: { '2026-06-10': null } };
    // 11.06. 01:00 Madrid: Schicht von gestern (10.06.) ist per Ausnahme gestrichen
    expect(openStatus(h, new Date('2026-06-10T23:00:00Z')).state).toBe('closed');
    // 10.06. 23:00 Madrid: ebenfalls zu
    expect(openStatus(h, new Date('2026-06-10T21:00:00Z')).state).toBe('closed');
    // 11.06. 23:00 Madrid: offen
    expect(openStatus(h, new Date('2026-06-11T21:00:00Z')).state).toBe('open');
  });
  it('Ausnahme mit abweichender Zeit ersetzt die regulären Zeiten des Tages', () => {
    const h: HoursData = { ...late, exceptions: { '2026-06-11': { open: '12:00', close: '14:00' } } };
    expect(openStatus(h, new Date('2026-06-11T10:30:00Z'))).toEqual({ state: 'open', closesAt: new Date('2026-06-11T12:00:00Z') });
  });
  it('Gültigkeitsfenster: außerhalb unbestätigt, am Rand gültig', () => {
    const h: HoursData = { ...nightly({ open: '10:00', close: '20:00' }), validFrom: '2026-06-10', validUntil: '2026-06-20' };
    expect(openStatus(h, new Date('2026-06-09T10:00:00Z')).state).toBe('unconfirmed');
    expect(openStatus(h, new Date('2026-06-10T10:00:00Z')).state).toBe('open');
    expect(openStatus(h, new Date('2026-06-20T10:00:00Z')).state).toBe('open');
    expect(openStatus(h, new Date('2026-06-21T10:00:00Z')).state).toBe('unconfirmed');
  });
  it('Schicht, die vor validFrom begann, läuft nicht in die Gültigkeit hinein', () => {
    const h: HoursData = { ...late, validFrom: '2026-06-10' };
    // 10.06. 01:00 Madrid: die Schicht vom 09.06. liegt vor validFrom
    expect(openStatus(h, new Date('2026-06-09T23:00:00Z')).state).toBe('closed');
    // 11.06. 01:00 Madrid: die Schicht vom 10.06. gilt
    expect(openStatus(h, new Date('2026-06-10T23:00:00Z')).state).toBe('open');
  });
  it('nach dem letzten gültigen Tag wird keine Öffnung mehr genannt', () => {
    const h: HoursData = { ...nightly({ open: '10:00', close: '20:00' }), validUntil: '2026-06-10' };
    // 10.06. 21:00 Madrid: geschlossen, nächste Öffnung läge außerhalb der Gültigkeit
    expect(openStatus(h, new Date('2026-06-10T19:30:00Z'))).toEqual({ state: 'closed', opensAt: null });
  });
  it('komplett geschlossene Woche ergibt opensAt null; falsche Länge ist unbestätigt', () => {
    expect(openStatus(nightly(null), new Date('2026-06-10T10:00:00Z'))).toEqual({ state: 'closed', opensAt: null });
    expect(openStatus({ status: 'confirmed', regular: [null, null] }, new Date())).toEqual({ state: 'unconfirmed' });
  });
  it('unlesbare Zeiten im Datensatz führen nie zu "offen"', () => {
    const bad = nightly({ open: '25:00', close: '04:00' });
    expect(openStatus(bad, new Date('2026-06-10T21:00:00Z'))).toEqual({ state: 'closed', opensAt: null });
  });
  it('Ausnahme mit Protoype-Schlüsselnamen wirkt nicht (Datum ist immer YYYY-MM-DD)', () => {
    const h: HoursData = { ...nightly({ open: '10:00', close: '20:00' }), exceptions: null };
    expect(openStatus(h, new Date('2026-06-10T10:00:00Z')).state).toBe('open');
  });
});

describe('Kalenderränder', () => {
  it('addDays über Schaltjahre und Jahrhundertregel', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2028-02-29', 1)).toBe('2028-03-01');
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01');
    expect(addDays('2100-02-28', 1)).toBe('2100-03-01'); // 2100 ist kein Schaltjahr
    expect(addDays('2000-02-28', 1)).toBe('2000-02-29'); // 2000 schon
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2026-03-29', 0)).toBe('2026-03-29');
  });
  it('Planer: 29.02. nur in Schaltjahren, Obergrenze 2100-12-31', () => {
    const now = new Date('2026-01-01T12:00:00Z');
    expect(validatePlan({ date: '2028-02-29', time: '20:00' }, now).ok).toBe(true);
    expect(validatePlan({ date: '2027-02-29', time: '20:00' }, now)).toEqual({ ok: false, field: 'date', code: 'invalidDate' });
    expect(validatePlan({ date: '2100-02-29', time: '20:00' }, now)).toEqual({ ok: false, field: 'date', code: 'invalidDate' });
    expect(validatePlan({ date: '2026-04-31', time: '20:00' }, now)).toEqual({ ok: false, field: 'date', code: 'invalidDate' });
    expect(validatePlan({ date: '2026-13-01', time: '20:00' }, now)).toEqual({ ok: false, field: 'date', code: 'invalidDate' });
    expect(validatePlan({ date: '2026-00-10', time: '20:00' }, now)).toEqual({ ok: false, field: 'date', code: 'invalidDate' });
    expect(validatePlan({ date: MAX_PLAN_DATE, time: '20:00' }, now).ok).toBe(true);
    expect(validatePlan({ date: '2101-01-01', time: '20:00' }, now)).toEqual({ ok: false, field: 'date', code: 'invalidDate' });
  });
  it('Planer: ungültige Formate', () => {
    const now = new Date('2026-01-01T12:00:00Z');
    for (const date of ['', '2026-1-5', '26-01-05', '2026/01/05', ' 2026-01-05', '2026-01-05T10:00']) {
      expect(validatePlan({ date, time: '20:00' }, now)).toEqual({ ok: false, field: 'date', code: 'invalidDate' });
    }
    for (const time of ['', '24:00', '23:60', '7:00', '20:0', '20:00:00', '2000']) {
      expect(validatePlan({ date: '2026-02-01', time }, now)).toEqual({ ok: false, field: 'time', code: 'invalidTime' });
    }
  });
  it('Planer: Grenze zwischen "jetzt" und "vergangen"', () => {
    const now = new Date('2026-06-10T18:00:00Z'); // 20:00 Madrid
    expect(validatePlan({ date: '2026-06-10', time: '20:00' }, now)).toEqual({ ok: false, field: 'time', code: 'past' });
    expect(validatePlan({ date: '2026-06-10', time: '20:01' }, now).ok).toBe(true);
  });
  it('toInstant weist Unmögliches zurück', () => {
    expect(toInstant('2026-02-30', '12:00')).toBeNull();
    expect(toInstant('2026-02-28', '25:00')).toBeNull();
    expect(toInstant('2026-02-28', '12:60')).toBeNull();
    expect(toInstant('abc', '12:00')).toBeNull();
    expect(toInstant('2026-02-28', '1200')).toBeNull();
  });
  it('Madrider Datum und Wochentag am Jahreswechsel', () => {
    const nye = new Date('2026-12-31T23:30:00Z'); // 00:30 Madrid, 01.01.2027 (Freitag)
    expect(madridDate(nye)).toBe('2027-01-01');
    expect(madridWeekday(nye)).toBe(5);
    expect(madridWeekday(new Date('2026-06-14T12:00:00Z'))).toBe(0); // Sonntag
  });
  it('Formatierer sind an Madrid gebunden', () => {
    const t = new Date('2026-12-31T23:30:00Z');
    expect(formatClock(t, 'de')).toBe('00:30');
    expect(formatClock(t, 'de', 'UTC')).toBe('23:30');
    expect(formatLongDate(t, 'en')).toContain('2027');
    expect(formatLongDate(t, 'de')).toContain('Freitag');
    expect(formatLongDate(t, 'es')).toContain('viernes');
    expect(formatShortDate(t, 'en')).toMatch(/Fri/);
    expect(intlLocale('de')).toBe('de-DE');
    expect(intlLocale('fr')).toBe('en-GB');
    expect(intlLocale('')).toBe('en-GB');
  });
  it('deviceTimeZone liefert Namen oder null', () => {
    const tz = deviceTimeZone();
    expect(tz === null || typeof tz === 'string').toBe(true);
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => {
      throw new Error('kaputt');
    });
    expect(deviceTimeZone()).toBeNull();
    vi.restoreAllMocks();
  });
});

describe('ICS-Faltung und Maskierung', () => {
  const octets = (s: string) => new TextEncoder().encode(s).length;
  const physical = (ics: string) => ics.split('\r\n').filter((l) => l !== '');

  for (const [name, ch] of [['2-Byte (ñ)', 'ñ'], ['3-Byte (€)', '€'], ['4-Byte (Emoji)', '🍹'], ['CJK', '漢'], ['kombiniert (e + Akzent)', 'é']] as const) {
    it(`bricht ${name} nie mitten im Zeichen, jede Zeile <= 75 Oktette, Rückweg verlustfrei`, () => {
      for (let n = 1; n < 60; n++) {
        const line = `DESCRIPTION:${ch.repeat(n)}`;
        const folded = fold(line);
        for (const part of folded.split('\r\n')) expect(octets(part)).toBeLessThanOrEqual(75);
        expect(folded.replace(/\r\n /g, '')).toBe(line);
        // Jede Teilzeile ist gültiges UTF-8 (keine Ersatzzeichen)
        expect(folded).not.toContain('�');
      }
    });
  }
  it('Mischung aus ein- und mehrbytigen Zeichen an jeder Grenze', () => {
    const unit = 'aä€🍹';
    for (let pad = 0; pad < 8; pad++) {
      const line = `X:${'a'.repeat(pad)}${unit.repeat(12)}`;
      const parts = fold(line).split('\r\n');
      for (const p of parts) expect(octets(p)).toBeLessThanOrEqual(75);
      expect(unfold(fold(line))).toBe(line);
    }
  });
  it('kurze Zeilen bleiben unverändert, leere Zeile bleibt leer', () => {
    expect(fold('SUMMARY:kurz')).toBe('SUMMARY:kurz');
    expect(fold('')).toBe('');
  });
  it('genau 73 Oktette bleiben ungefaltet, 74 werden gefaltet (konservative Grenze)', () => {
    expect(fold('a'.repeat(73))).toBe('a'.repeat(73));
    expect(fold('a'.repeat(74))).toBe(`${'a'.repeat(73)}\r\n a`);
  });
  it('vollständiger Kalender mit langem Mehrbyte-Text: alle physischen Zeilen <= 75 Oktette', () => {
    const ics = buildCalendar({
      uid: 'chucca-meetup-abcdefgh@guest.local',
      start: new Date('2030-01-15T19:00:00Z'),
      summary: 'Quedada 🍹'.repeat(10),
      location: 'ñ'.repeat(100),
      description: '€, ;\\ \n'.repeat(20),
      url: 'https://example.com/' + 'x'.repeat(200),
      now: new Date('2030-01-01T00:00:00Z'),
    });
    for (const l of physical(ics)) expect(octets(l)).toBeLessThanOrEqual(75);
    expect(unfold(ics)).toContain(`SUMMARY:${escapeText('Quedada 🍹'.repeat(10))}`);
    expect(unfold(ics)).toContain('URL:https://example.com/' + 'x'.repeat(200));
    expect(unfold(ics)).not.toContain('DTEND');
  });
  it('DTEND nur bei positiver Dauer', () => {
    const base = { uid: 'u', start: new Date('2030-01-15T19:00:00Z'), summary: 's', location: 'l', description: 'd', now: new Date('2030-01-01T00:00:00Z') };
    expect(buildCalendar({ ...base, durationMinutes: 0 })).not.toContain('DTEND');
    expect(buildCalendar({ ...base, durationMinutes: -5 })).not.toContain('DTEND');
    expect(buildCalendar({ ...base, durationMinutes: 90 })).toContain('DTEND:20300115T203000Z');
    expect(buildCalendar(base)).not.toContain('URL:');
  });
  it('stamp: UTC ohne Millisekunden, auch an Umstellungstagen', () => {
    expect(stamp(new Date('2026-03-29T01:00:00.789Z'))).toBe('20260329T010000Z');
  });
  it('escapeText: alleinstehendes CR darf keinen Zeilenumbruch erzeugen', () => {
    expect(escapeText('a\rb')).toBe('a\\nb');
    expect(escapeText('a\r\nb\nc\rd')).toBe('a\\nb\\nc\\nd');
    expect(escapeText('')).toBe('');
    expect(escapeText('\\n')).toBe('\\\\n'); // Backslash-n im Klartext bleibt Text
  });
  it('Beschreibung mit CR erzeugt keine losen CR im Ergebnis', () => {
    const ics = buildCalendar({ uid: 'u', start: new Date(0), summary: 's', location: 'l', description: 'x\ry', now: new Date(0) });
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
  });
});

function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    data,
  };
}

describe('Speicher: leer, korrupt, gesperrt', () => {
  it('liest, schreibt und löscht in local und session getrennt', () => {
    const local = fakeStorage();
    const session = fakeStorage();
    vi.stubGlobal('localStorage', local);
    vi.stubGlobal('sessionStorage', session);
    expect(writeStored('k', 'a')).toBe(true);
    expect(writeStored('k', 'b', 'session')).toBe(true);
    expect(readStored('k')).toBe('a');
    expect(readStored('k', 'session')).toBe('b');
    removeStored('k');
    expect(readStored('k')).toBeNull();
    expect(readStored('k', 'session')).toBe('b');
    expect(readStored('fehlt')).toBeNull();
  });
  it('leerer String bleibt ein String (nicht null)', () => {
    vi.stubGlobal('localStorage', fakeStorage({ k: '' }));
    expect(readStored('k')).toBe('');
  });
  it('Zugriff auf den Speicher wirft (Private Mode / Cookies gesperrt)', () => {
    vi.stubGlobal('localStorage', undefined);
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      get() {
        throw new DOMException('denied', 'SecurityError');
      },
    });
    try {
      expect(readStored('k', 'session')).toBeNull();
      expect(writeStored('k', 'v', 'session')).toBe(false);
      expect(() => removeStored('k', 'session')).not.toThrow();
      expect(loadDraft().date).toBe('');
      expect(saveDraft(emptyDraft())).toBe(false);
    } finally {
      // @ts-expect-error Testaufräumen
      delete globalThis.sessionStorage;
    }
  });
  it('Methoden werfen (Quota voll, Zugriff verweigert)', () => {
    const boom = () => {
      throw new DOMException('quota', 'QuotaExceededError');
    };
    vi.stubGlobal('localStorage', { getItem: boom, setItem: boom, removeItem: boom });
    expect(readStored('k')).toBeNull();
    expect(writeStored('k', 'v')).toBe(false);
    expect(() => removeStored('k')).not.toThrow();
  });
});

describe('Entwurf: korrupte Speicherdaten', () => {
  const goodUid = 'chucca-meetup-abcd1234@guest.local';
  const load = (raw: string | null) => {
    vi.stubGlobal('sessionStorage', fakeStorage(raw === null ? {} : { [DRAFT_KEY]: raw }));
    return loadDraft();
  };
  const isEmpty = (d: { date: string; time: string; uid: string }) => d.date === '' && d.time === '' && /^chucca-meetup-.+@guest\.local$/.test(d.uid);

  it('lädt einen gültigen Entwurf unverändert', () => {
    expect(load(JSON.stringify({ date: '2026-06-10', time: '20:00', uid: goodUid }))).toEqual({ date: '2026-06-10', time: '20:00', uid: goodUid });
    expect(load(JSON.stringify({ date: '', time: '', uid: goodUid }))).toEqual({ date: '', time: '', uid: goodUid });
  });
  it('korrupte Eingaben ergeben einen leeren Entwurf mit frischer Kennung', () => {
    const corrupt = [
      null,
      '',
      '{',
      'null',
      'true',
      '42',
      '"text"',
      '[]',
      '{}',
      JSON.stringify({ date: 20260610, time: '20:00', uid: goodUid }),
      JSON.stringify({ date: '2026-06-10', time: null, uid: goodUid }),
      JSON.stringify({ date: '10.06.2026', time: '20:00', uid: goodUid }),
      JSON.stringify({ date: '2026-06-10', time: '25:00', uid: goodUid }),
      JSON.stringify({ date: '2026-06-10', time: '20:00', uid: 'x' }),
      JSON.stringify({ date: '2026-06-10', time: '20:00', uid: 'chucca-meetup-short@guest.local' }),
      JSON.stringify({ date: '2026-06-10', time: '20:00', uid: `chucca-meetup-${'a'.repeat(81)}@guest.local` }),
      JSON.stringify({ date: '2026-06-10', time: '20:00', uid: 'chucca-meetup-ABCDEFGH@guest.local' }),
      JSON.stringify({ date: '2026-06-10', time: '20:00', uid: `${goodUid}\r\nATTENDEE:x` }),
    ];
    for (const raw of corrupt) expect(isEmpty(load(raw)), String(raw)).toBe(true);
  });
  it('speichern und laden ergibt denselben Entwurf', () => {
    vi.stubGlobal('sessionStorage', fakeStorage());
    const d = { date: '2026-06-10', time: '20:00', uid: goodUid };
    expect(saveDraft(d)).toBe(true);
    expect(loadDraft()).toEqual(d);
  });
  it('Kennungen sind eindeutig und passen zum Muster', () => {
    const a = newUid();
    const b = newUid();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^chucca-meetup-[a-z0-9-]{8,80}@guest\.local$/);
  });
  it('Kennung ohne crypto.randomUUID (Fallback) ist musterkonform', () => {
    vi.stubGlobal('crypto', {});
    expect(newUid()).toMatch(/^chucca-meetup-[a-z0-9-]{8,80}@guest\.local$/);
    vi.stubGlobal('crypto', undefined);
    expect(newUid()).toMatch(/^chucca-meetup-[a-z0-9-]{8,80}@guest\.local$/);
  });
  it('updateDraft behält die Kennung nur bei unveränderten Werten', () => {
    const d = { date: '2026-06-10', time: '20:00', uid: goodUid };
    expect(updateDraft(d, '2026-06-10', '20:00')).toBe(d);
    const next = updateDraft(d, '2026-06-10', '20:30');
    expect(next.uid).not.toBe(goodUid);
    expect(next.time).toBe('20:30');
  });
});

describe('Entwurf in URL-Parametern', () => {
  const uid = 'chucca-meetup-abcd1234@guest.local';
  it('Rundreise', () => {
    const params = draftToParams({ date: '2026-06-10', time: '20:00', uid });
    expect(params.toString()).toBe('d=2026-06-10&t=20%3A00&id=abcd1234');
    expect(draftFromParams(params)).toEqual({ date: '2026-06-10', time: '20:00', uid });
  });
  it('nur Datum: keine Kennung im Link, beim Lesen entsteht eine neue', () => {
    const params = draftToParams({ date: '2026-06-10', time: '', uid });
    expect(params.has('id')).toBe(false);
    const back = draftFromParams(params);
    expect(back?.date).toBe('2026-06-10');
    expect(back?.time).toBe('');
    expect(back?.uid).not.toBe(uid);
  });
  it('leere oder manipulierte Parameter', () => {
    expect(draftFromParams(new URLSearchParams())).toBeNull();
    expect(draftFromParams(new URLSearchParams('d=kaputt&t=20:00'))).toBeNull();
    expect(draftFromParams(new URLSearchParams('d=2026-06-10&t=99:99'))).toBeNull();
    // ungültige Kennung wird ersetzt, Datum und Zeit bleiben
    const d = draftFromParams(new URLSearchParams('d=2026-06-10&t=20:00&id=%0D%0AX'));
    expect(d).toMatchObject({ date: '2026-06-10', time: '20:00' });
    expect(d?.uid).toMatch(/^chucca-meetup-[a-z0-9-]{8,80}@guest\.local$/);
    const e = draftFromParams(new URLSearchParams('d=2026-06-10&t=20:00&id=ABC'));
    expect(e?.uid).not.toContain('ABC');
    expect(draftFromParams(new URLSearchParams('t=20:00'))).toMatchObject({ date: '', time: '20:00' });
  });
  it('leerer Entwurf ergibt keine Parameter', () => {
    expect(draftToParams(emptyDraft()).toString()).toBe('');
  });
});

interface DrinkSpec {
  id?: string;
  category?: string;
  name: string;
  ingredients?: string[];
  description?: string;
  alcoholFree?: boolean;
  tastes?: string[];
}
const drink = (over: DrinkSpec): Drink => {
  const l = (v: string) => ({ de: v, en: v, es: v });
  return {
    id: over.id ?? 'x',
    category: over.category ?? 'cocktails',
    name: l(over.name),
    ...(over.description ? { description: l(over.description) } : {}),
    ingredients: (over.ingredients ?? []).map(l),
    alcoholFree: over.alcoholFree ?? false,
    tastes: over.tastes ?? [],
  } as unknown as Drink;
};

describe('Menüsuche mit Sonderzeichen', () => {
  const items = [
    drink({ id: 'a', name: 'Piña Colada', ingredients: ['Kokos', 'Ananas'], tastes: ['fruity'] }),
    drink({ id: 'b', name: 'Caipirinha (klassisch)', ingredients: ['Limette'], tastes: ['classic', 'fresh'] }),
    drink({ id: 'c', name: 'Straße 66 [Spezial]', description: 'Süß & scharf', alcoholFree: true, tastes: ['free'], category: 'alkoholfrei' }),
    drink({ id: 'd', name: 'Gin+Tonic *extra* $5 ^x', ingredients: ['a.b'] }),
    drink({ id: 'e', name: "O'Neill's \"Mule\" \\ slash" }),
  ];
  const find = (query: string, extra: Partial<ReturnType<typeof emptyFilter>> = {}) =>
    filterMenu(items, { ...emptyFilter(), query, ...extra }, 'de').map((i) => i.id);

  it('normalisiert Akzente, ß und Groß-/Kleinschreibung', () => {
    expect(normalize('  Piña  ')).toBe('pina');
    expect(normalize('STRASSE')).toBe('strasse');
    expect(normalize('Straße')).toBe('strasse');
    expect(normalize('ÜBER')).toBe('uber');
    expect(normalize('')).toBe('');
    // NFC und NFD gleich
    expect(normalize('ñ')).toBe(normalize('ñ'));
  });
  it('findet mit und ohne Akzent, ß und ss', () => {
    expect(find('pina')).toEqual(['a']);
    expect(find('PIÑA')).toEqual(['a']);
    expect(find('strasse')).toEqual(['c']);
    expect(find('straße')).toEqual(['c']);
    expect(find('suss')).toEqual(['c']);
    expect(find('süß')).toEqual(['c']);
  });
  it('Regex-Zeichen werden wörtlich gesucht und werfen nie', () => {
    for (const q of ['(', ')', '[', ']', '*', '+', '?', '\\', '^', '$', '.', '|', '{', '}', '(klassisch', '[spez', '.*', '(?<', '\\d']) {
      expect(() => find(q), q).not.toThrow();
    }
    expect(find('(klassisch)')).toEqual(['b']);
    expect(find('[spezial]')).toEqual(['c']);
    expect(find('*extra*')).toEqual(['d']);
    expect(find('gin+tonic')).toEqual(['d']);
    expect(find('$5')).toEqual(['d']);
    expect(find('a.b')).toEqual(['d']);
    expect(find('.*')).toEqual([]); // kein Wildcard
    expect(find('\\')).toEqual(['e']);
    expect(find("o'neill")).toEqual(['e']);
    expect(find('"mule"')).toEqual(['e']);
    expect(find('&')).toEqual(['c']);
  });
  it('mehrere Begriffe müssen alle passen; Leerraum und Tabs trennen', () => {
    expect(find('kokos ananas')).toEqual(['a']);
    expect(find('kokos\tananas')).toEqual(['a']);
    expect(find('  kokos   ')).toEqual(['a']);
    expect(find('kokos limette')).toEqual([]);
  });
  it('leere, leerraumhaltige Suche und Emoji', () => {
    expect(find('')).toHaveLength(items.length);
    expect(find('   ')).toHaveLength(items.length);
    expect(find('🍹')).toEqual([]);
  });
  it('kombiniert Kategorie, alkoholfrei und Geschmack mit der Suche', () => {
    expect(find('', { category: 'alkoholfrei' })).toEqual(['c']);
    expect(find('', { alcoholFree: true })).toEqual(['c']);
    expect(find('', { taste: 'fresh' })).toEqual(['b']);
    expect(find('gin', { taste: 'fresh' })).toEqual([]);
    expect(find('', { category: 'gibtsnicht' })).toEqual([]);
  });
  it('Suche nutzt die gewählte Sprache; fehlende Beschreibung stört nicht', () => {
    const d = drink({ name: 'x' });
    const multi = { ...d, name: { de: 'Wasser', en: 'Water', es: 'Agua' } } as Drink;
    expect(matches(multi, { ...emptyFilter(), query: 'water' }, 'en')).toBe(true);
    expect(matches(multi, { ...emptyFilter(), query: 'water' }, 'de')).toBe(false);
    expect(matches(multi, { ...emptyFilter(), query: 'agua' }, 'es')).toBe(true);
  });
  it('Suchindex kann direkt gegen Filter geprüft werden', () => {
    const entry = toEntry(items[0] as Drink, 'de');
    expect(entry).toMatchObject({ category: 'cocktails', alcoholFree: false, tastes: ['fruity'] });
    expect(matchesEntry(entry, { ...emptyFilter(), query: 'kokos' })).toBe(true);
    expect(matchesEntry(entry, { ...emptyFilter(), taste: 'free' })).toBe(false);
  });
  it('isFilterActive erkennt jede Einschränkung, Leerraum zählt nicht', () => {
    expect(isFilterActive(emptyFilter())).toBe(false);
    expect(isFilterActive({ ...emptyFilter(), query: '   ' })).toBe(false);
    expect(isFilterActive({ ...emptyFilter(), query: 'x' })).toBe(true);
    expect(isFilterActive({ ...emptyFilter(), category: 'a' })).toBe(true);
    expect(isFilterActive({ ...emptyFilter(), alcoholFree: true })).toBe(true);
    expect(isFilterActive({ ...emptyFilter(), taste: 'fresh' })).toBe(true);
  });
  it('Preise: glatt, mit Cent, null, groß', () => {
    const f = (c: number, l = 'de') => formatPrice(c, l).replace(/\s/g, ' ');
    expect(f(1100)).toBe('11 €');
    expect(f(1150)).toBe('11,50 €');
    expect(f(0)).toBe('0 €');
    expect(f(5)).toBe('0,05 €');
    expect(f(1100, 'en')).toBe('€11');
    expect(f(1050, 'en')).toBe('€10.50');
  });
});

describe('Sonne', () => {
  const lat = 39.57;
  const lon = 2.65;
  const minutesOfDay = (d: Date) => d.getUTCHours() * 60 + d.getUTCMinutes();
  it('Sonnenuntergang im Sommer später als im Winter, Aufgang vor Untergang', () => {
    const summer = sunset('2026-06-21', lat, lon);
    const winter = sunset('2026-12-21', lat, lon);
    expect(summer && winter).toBeTruthy();
    expect(minutesOfDay(summer as Date)).toBeGreaterThan(minutesOfDay(winter as Date) + 120);
    const rise = sunrise('2026-06-21', lat, lon) as Date;
    expect(rise.getTime()).toBeLessThan((summer as Date).getTime());
    expect((civilDusk('2026-06-21', lat, lon) as Date).getTime()).toBeGreaterThan((summer as Date).getTime());
  });
  it('liegt am Tag selbst (UTC), auch an den Umstellungstagen und am Jahreswechsel', () => {
    for (const date of ['2026-03-29', '2026-10-25', '2026-12-31', '2028-02-29']) {
      const s = sunset(date, lat, lon) as Date;
      expect(s.toISOString().slice(0, 10)).toBe(date);
    }
  });
  it('ungültiges Datum ergibt null', () => {
    expect(sunset('kaputt', lat, lon)).toBeNull();
    expect(sunset('2026-02-30', lat, lon)).toBeNull();
    expect(sunrise('', lat, lon)).toBeNull();
  });
  it('Polartag und Polarnacht: kein Ereignis, Phase night', () => {
    expect(sunset('2026-06-21', 80, 0)).toBeNull();
    expect(sunrise('2026-12-21', 80, 0)).toBeNull();
    expect(skyPhase(new Date('2026-06-21T12:00:00Z'), '2026-06-21', 80, 0)).toBe('night');
  });
  it('Tagesphasen in der richtigen Reihenfolge', () => {
    const date = '2026-06-21';
    const set = sunset(date, lat, lon) as Date;
    const dusk = civilDusk(date, lat, lon) as Date;
    const rise = sunrise(date, lat, lon) as Date;
    const at = (t: number) => skyPhase(new Date(t), date, lat, lon);
    expect(at(rise.getTime() - 60_000)).toBe('night');
    expect(at(rise.getTime())).toBe('day');
    expect(at(set.getTime() - 61 * 60_000)).toBe('day');
    expect(at(set.getTime() - 60 * 60_000)).toBe('golden');
    expect(at(set.getTime() - 1)).toBe('golden');
    expect(at(set.getTime())).toBe('dusk');
    expect(at(dusk.getTime() - 1)).toBe('dusk');
    expect(at(dusk.getTime())).toBe('night');
  });
});

describe('Termine: Ränder', () => {
  const base = { status: 'confirmed' as const, start: '21:00' };
  it('Madrider Mitternacht entscheidet, nicht UTC', () => {
    // 22:30Z = 00:30 Madrid am 11.06. (Sommerzeit)
    const now = new Date('2026-06-10T22:30:00Z');
    expect(isVisible({ ...base, date: '2026-06-10' }, now)).toBe(false);
    expect(isVisible({ ...base, date: '2026-06-11' }, now)).toBe(true);
    // 21:30Z = 23:30 Madrid am 10.06.
    expect(isVisible({ ...base, date: '2026-06-10' }, new Date('2026-06-10T21:30:00Z'))).toBe(true);
  });
  it('hideAfter vor dem Datum verkürzt die Sichtbarkeit', () => {
    const now = new Date('2026-06-10T12:00:00Z');
    expect(isVisible({ ...base, date: '2026-06-12', hideAfter: '2026-06-09' }, now)).toBe(false);
    expect(isVisible({ ...base, date: '2026-06-12', hideAfter: '2026-06-10' }, now)).toBe(true);
  });
});

describe('Teilen und Kopieren: Fehlerwege', () => {
  const payload = { title: 'T', text: 'Text' };
  it('plainText mit und ohne Link', () => {
    expect(plainText(payload)).toBe('Text');
    expect(plainText({ ...payload, url: 'https://x.test/' })).toBe('Text\nhttps://x.test/');
  });
  it('ohne Teilen und ohne Zwischenablage: manual', async () => {
    expect(await shareOrCopy(payload, {})).toBe('manual');
    expect(await copyText('x', {})).toBe('manual');
  });
  it('Zwischenablage verweigert: manual statt falscher Erfolgsmeldung', async () => {
    const writeText = vi.fn().mockRejectedValue(new DOMException('denied', 'NotAllowedError'));
    expect(await copyText('x', { writeText })).toBe('manual');
    expect(await shareOrCopy(payload, { writeText })).toBe('manual');
  });
  it('Teilen scheitert (nicht Abbruch): Rückfall auf Zwischenablage', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('no', 'NotAllowedError'));
    const writeText = vi.fn().mockResolvedValue(undefined);
    expect(await shareOrCopy({ ...payload, url: 'https://x.test/' }, { share, writeText })).toBe('copied');
    expect(writeText).toHaveBeenCalledWith('Text\nhttps://x.test/');
    // Nicht-Error-Wurf
    const share2 = vi.fn().mockRejectedValue('kaputt');
    expect(await shareOrCopy(payload, { share: share2, writeText })).toBe('copied');
    // Teilen scheitert und es gibt keine Zwischenablage
    expect(await shareOrCopy(payload, { share })).toBe('manual');
  });
  it('Abbruch meldet aborted und kopiert nichts', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('cancel', 'AbortError'));
    const writeText = vi.fn();
    expect(await shareOrCopy(payload, { share, writeText })).toBe('aborted');
    expect(writeText).not.toHaveBeenCalled();
  });
  it('Teilen ohne url übergibt kein url-Feld', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    expect(await shareOrCopy(payload, { share })).toBe('shared');
    expect(share).toHaveBeenCalledWith({ title: 'T', text: 'Text' });
    expect(Object.keys(share.mock.calls[0]?.[0] as object)).not.toContain('url');
  });
  it('Standardumgebung liest navigator.share und navigator.clipboard', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { share, clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
    expect(await shareOrCopy(payload)).toBe('shared');
    expect(share).toHaveBeenCalled();
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
    expect(await shareOrCopy(payload)).toBe('copied');
    expect(await copyText('x')).toBe('copied');
    vi.stubGlobal('navigator', {});
    expect(await shareOrCopy(payload)).toBe('manual');
    vi.stubGlobal('navigator', undefined);
    expect(await shareOrCopy(payload)).toBe('manual');
  });
});
