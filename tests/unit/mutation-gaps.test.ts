/**
 * Gezielte Tests gegen überlebende Mutanten (Stryker, siehe docs/06_QA.md, Abschnitt „Mutationstests“).
 * Jeder Test fixiert eine Beobachtung, die die übrigen Unit-Tests nicht erzwingen: Wochentags-Zuordnung
 * von Schichten, inklusive Gültigkeitsgrenzen, Typprüfung gespeicherter Entwürfe, genaue Fehlermeldungen,
 * Sortierung ungeordneter Termine und Sonnenzeiten über das ganze Jahr an mehreren Orten.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildCalendar } from '../../src/lib/ics';
import { upcoming } from '../../src/lib/events';
import { openStatus, upcomingExceptions, type DayRange, type HoursData } from '../../src/lib/hours';
import { searchText } from '../../src/lib/menu';
import { DRAFT_KEY, loadDraft, newUid } from '../../src/lib/planner';
import { copyText, shareOrCopy } from '../../src/lib/share';
import { DATE_PATTERN, deviceTimeZone, toInstantLenient } from '../../src/lib/time';
import type { Drink } from '../../src/lib/content/schema';
import { SUN_REFERENCE } from './fixtures/sun-reference';
import { civilDusk, skyPhase, sunrise, sunset } from '../../src/lib/sun';

afterEach(() => vi.unstubAllGlobals());

const D = (open: string, close: string): DayRange => ({ open, close });
const utc = (iso: string) => new Date(iso);

describe('Betriebszeiten: Wochentage und Gültigkeitsgrenzen', () => {
  // 2026-06-05 ist ein Freitag. Sommerzeit: Madrid = UTC+2.
  const onlyFriday: (DayRange | null)[] = [null, null, null, null, null, D('20:00', '02:00'), null];
  const hours = (over: Partial<HoursData> = {}): HoursData => ({ status: 'confirmed', regular: onlyFriday, ...over });

  it('die Freitagsschicht läuft am Samstag nach Mitternacht weiter, am Sonntag nicht mehr', () => {
    // Sa 06.06. 00:30 Madrid = 05.06. 22:30 UTC
    const sat = openStatus(hours(), utc('2026-06-05T22:30:00Z'));
    expect(sat).toEqual({ state: 'open', closesAt: utc('2026-06-06T00:00:00Z') });
    // So 07.06. 00:30 Madrid: Samstag hat keine Schicht
    expect(openStatus(hours(), utc('2026-06-06T22:30:00Z')).state).toBe('closed');
  });

  it('nächste Öffnung am passenden Wochentag, auch genau eine Woche später', () => {
    // Mo 08.06. 12:00 Madrid -> nächster Freitag 12.06. 20:00
    expect(openStatus(hours(), utc('2026-06-08T10:00:00Z'))).toEqual({ state: 'closed', opensAt: utc('2026-06-12T18:00:00Z') });
    // Fr 05.06. 03:00 Madrid (eine Schicht vom Donnerstag gibt es nicht): heute 20:00
    expect(openStatus(hours(), utc('2026-06-05T01:00:00Z'))).toEqual({ state: 'closed', opensAt: utc('2026-06-05T18:00:00Z') });
    // Sa 06.06. 02:30 Madrid, kurz nach Schichtende: nächste Öffnung erst am Freitag danach
    expect(openStatus(hours(), utc('2026-06-06T00:30:00Z'))).toEqual({ state: 'closed', opensAt: utc('2026-06-12T18:00:00Z') });
  });

  it('Montag-nur-Betrieb: nach Ladenschluss ist die nächste Öffnung genau sieben Tage später', () => {
    const onlyMonday: (DayRange | null)[] = [null, D('10:00', '12:00'), null, null, null, null, null];
    // Mo 08.06. 13:00 Madrid
    expect(openStatus({ status: 'confirmed', regular: onlyMonday }, utc('2026-06-08T11:00:00Z'))).toEqual({
      state: 'closed',
      opensAt: utc('2026-06-15T08:00:00Z'),
    });
  });

  it('validUntil gilt inklusive; danach gibt es keine nächste Öffnung', () => {
    const every = Array.from({ length: 7 }, () => D('10:00', '18:00'));
    const h: HoursData = { status: 'confirmed', regular: every, validUntil: '2026-06-10' };
    // Di 09.06. 20:00 Madrid: nächste Öffnung ist Mi 10.06. (= validUntil) 10:00
    expect(openStatus(h, utc('2026-06-09T18:00:00Z'))).toEqual({ state: 'closed', opensAt: utc('2026-06-10T08:00:00Z') });
    // Mi 10.06. 20:00 Madrid: Donnerstag liegt außerhalb
    expect(openStatus(h, utc('2026-06-10T18:00:00Z'))).toEqual({ state: 'closed', opensAt: null });
    // am letzten Gültigkeitstag selbst ist offen
    expect(openStatus(h, utc('2026-06-10T10:00:00Z')).state).toBe('open');
  });

  it('Schicht mit Beginn vor validFrom zählt nicht, am Starttag schon', () => {
    const every = Array.from({ length: 7 }, () => D('20:00', '02:00'));
    const h: HoursData = { status: 'confirmed', regular: every, validFrom: '2026-06-10' };
    // 10.06. 00:30 Madrid: die Schicht vom 09.06. beginnt vor validFrom
    expect(openStatus(h, utc('2026-06-09T22:30:00Z'))).toEqual({ state: 'closed', opensAt: utc('2026-06-10T18:00:00Z') });
    // 11.06. 00:30 Madrid: Schicht vom 10.06. zählt
    expect(openStatus(h, utc('2026-06-10T22:30:00Z')).state).toBe('open');
  });

  it('Lücke der Sommerzeit: eine Schicht ohne Dauer zählt nicht als bevorstehende Öffnung', () => {
    // 29.03.2026 02:15-02:45 existiert in Madrid nicht, beide Zeiten rücken auf 03:00
    const every = Array.from({ length: 7 }, () => D('12:00', '13:00'));
    const h: HoursData = { status: 'confirmed', regular: every, exceptions: { '2026-03-29': D('02:15', '02:45') } };
    // 03:00 Madrid: nicht „öffnet jetzt“, sondern die nächste echte Öffnung am Folgetag 12:00
    expect(openStatus(h, utc('2026-03-29T01:00:00Z'))).toEqual({ state: 'closed', opensAt: utc('2026-03-30T10:00:00Z') });
  });
});

describe('Ausnahmetage: Filter', () => {
  const regular = Array.from({ length: 7 }, () => D('10:00', '18:00'));
  const base: HoursData = {
    status: 'confirmed',
    regular,
    validFrom: '2026-06-01',
    validUntil: '2026-06-30',
    exceptions: {
      '2026-05-31': null,
      '2026-06-01': null,
      '2026-06-15': D('12:00', '14:00'),
      '2026-06-30': null,
      '2026-07-01': null,
    },
  };
  it('behält die Grenztage von validFrom und validUntil, verwirft Tage außerhalb', () => {
    expect(upcomingExceptions(base, '2026-05-01').map((e) => e.date)).toEqual(['2026-06-01', '2026-06-15', '2026-06-30']);
  });
  it('verwirft vergangene Tage, behält heute', () => {
    expect(upcomingExceptions(base, '2026-06-15').map((e) => e.date)).toEqual(['2026-06-15', '2026-06-30']);
  });
  it('ohne bestätigte, vollständige Wochenzeiten gibt es keine Ausnahmen', () => {
    expect(upcomingExceptions({ ...base, status: 'unconfirmed' }, '2026-05-01')).toEqual([]);
    expect(upcomingExceptions({ ...base, regular: regular.slice(0, 6) }, '2026-05-01')).toEqual([]);
    expect(upcomingExceptions({ ...base, regular: null }, '2026-05-01')).toEqual([]);
  });
  it('nur echte Datumsschlüssel (ohne Präfix oder Anhang)', () => {
    const h: HoursData = { status: 'confirmed', regular, exceptions: { 'x2026-06-02': null, '2026-06-03x': null, '2026-06-04': null } };
    expect(upcomingExceptions(h, '2026-06-01').map((e) => e.date)).toEqual(['2026-06-04']);
  });
});

describe('Zeit: Muster und Geräte-Zeitzone', () => {
  it('DATE_PATTERN ist verankert', () => {
    expect(DATE_PATTERN.test('2026-06-01')).toBe(true);
    expect(DATE_PATTERN.test('x2026-06-01')).toBe(false);
    expect(DATE_PATTERN.test('2026-06-01x')).toBe(false);
  });
  it('toInstantLenient lehnt Datumsformen ab, die Date zwar versteht, die aber kein YYYY-MM-DD sind', () => {
    // Date akzeptiert die Jahresform mit Vorzeichen; ohne Formatprüfung käme ein Zeitpunkt in Jahr 12026 heraus
    expect(toInstantLenient('+012026-06-01', '10:00')).toBeNull();
  });
  it('deviceTimeZone liefert den Namen der Zeitzone des Geräts', () => {
    const expected = new Intl.DateTimeFormat().resolvedOptions().timeZone;
    expect(expected).toBeTruthy();
    expect(deviceTimeZone()).toBe(expected);
  });
});

describe('Termine: Reihenfolge', () => {
  it('upcoming sortiert nach Datum und Beginn, unabhängig von der Eingabereihenfolge', () => {
    const e = (date: string, start: string) => ({ status: 'confirmed' as const, date, start });
    const input = [e('2026-07-03', '10:00'), e('2026-07-02', '10:00'), e('2026-07-01', '21:00'), e('2026-07-01', '09:30'), e('2026-06-30', '23:00')];
    const order = (list: typeof input) => upcoming(list, utc('2026-06-01T10:00:00Z')).map((x) => `${x.date} ${x.start}`);
    const sorted = ['2026-06-30 23:00', '2026-07-01 09:30', '2026-07-01 21:00', '2026-07-02 10:00', '2026-07-03 10:00'];
    expect(order(input)).toEqual(sorted);
    expect(order([...input].reverse())).toEqual(sorted);
    expect(order([input[2]!, input[4]!, input[0]!, input[3]!, input[1]!])).toEqual(sorted);
  });
});

describe('ICS: Fehlermeldungen benennen das Feld', () => {
  const event = { uid: 'abc', start: utc('2026-06-01T10:00:00Z'), summary: 's', location: 'l', description: 'd', now: utc('2026-06-01T00:00:00Z') };
  it('UID', () => {
    expect(() => buildCalendar({ ...event, uid: 'a b' })).toThrow('UID darf nicht leer sein');
    expect(() => buildCalendar({ ...event, uid: '' })).toThrow('UID darf nicht leer sein');
  });
  it('URL', () => {
    expect(() => buildCalendar({ ...event, url: 'https://x/a b' })).toThrow('URL darf nicht leer sein');
  });
  it('URL und UID erscheinen unverändert', () => {
    const ics = buildCalendar({ ...event, url: 'https://x.example/a' });
    expect(ics).toContain('\r\nUID:abc\r\n');
    expect(ics).toContain('\r\nURL:https://x.example/a\r\n');
  });
});

describe('Menü: Suchtext', () => {
  const l = (v: string) => ({ de: v, en: v, es: v });
  const base = { id: 'x', category: 'c', alcoholFree: false, tastes: [] };
  it('verbindet Name, Beschreibung und Zutaten mit Leerzeichen', () => {
    const d = { ...base, name: l('Mojito'), description: l('Frisch'), ingredients: [l('Minze'), l('Rum')] } as unknown as Drink;
    expect(searchText(d, 'de')).toBe('mojito frisch minze rum');
  });
  it('ohne Beschreibung kommt kein Füllwort in den Suchtext', () => {
    const d = { ...base, name: l('Mojito'), ingredients: [l('Minze')] } as unknown as Drink;
    expect(searchText(d, 'de').replace(/\s+/g, ' ')).toBe('mojito minze');
  });
});

describe('Planer: Kennung und gespeicherter Entwurf', () => {
  const goodUid = 'chucca-meetup-abcd1234@guest.local';
  const fakeStorage = (raw: string) => {
    const data = new Map([[DRAFT_KEY, raw]]);
    return { getItem: (k: string) => data.get(k) ?? null, setItem: () => undefined, removeItem: () => undefined };
  };
  const load = (value: unknown) => {
    vi.stubGlobal('sessionStorage', fakeStorage(JSON.stringify(value)));
    return loadDraft();
  };
  it('newUid nutzt crypto.randomUUID, wenn vorhanden', () => {
    expect(newUid()).toMatch(/^chucca-meetup-[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}@guest\.local$/);
  });
  it('Felder, die zu Text umgewandelt gültig aussähen (Arrays), werden verworfen', () => {
    for (const bad of [
      { date: ['2026-06-10'], time: '', uid: goodUid },
      { date: '', time: ['20:00'], uid: goodUid },
      { date: '', time: '', uid: [goodUid] },
    ]) {
      const d = load(bad);
      expect(d.date).toBe('');
      expect(d.time).toBe('');
      expect(typeof d.uid).toBe('string');
      expect(d.uid).not.toBe(goodUid);
    }
  });
  it('Kennung muss vollständig dem Muster entsprechen', () => {
    for (const uid of [`x${goodUid}`, `${goodUid}x`]) {
      expect(load({ date: '', time: '', uid }).uid).not.toBe(uid);
    }
  });
});

describe('Teilen: echter Browser-Zugriff', () => {
  it('copyText reicht den Text an navigator.clipboard.writeText durch', async () => {
    const writeText = vi.fn(async () => undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    expect(await copyText('Hallo')).toBe('copied');
    expect(writeText).toHaveBeenCalledWith('Hallo');
  });
  it('shareOrCopy reicht Titel, Text und Link an navigator.share durch', async () => {
    const share = vi.fn(async () => undefined);
    vi.stubGlobal('navigator', { share });
    expect(await shareOrCopy({ title: 'T', text: 'X', url: 'https://x.example' })).toBe('shared');
    expect(share).toHaveBeenCalledWith({ title: 'T', text: 'X', url: 'https://x.example' });
  });
  it('ohne Teilen und Zwischenablage bleibt nur die manuelle Rückmeldung', async () => {
    vi.stubGlobal('navigator', {});
    expect(await copyText('x')).toBe('manual');
    expect(await shareOrCopy({ title: 'T', text: 'X' })).toBe('manual');
  });
});

describe('Sonne: Referenztabelle über das Jahr', () => {
  // Die Tabelle ist eine Charakterisierung der NOAA-Näherung (Minuten UTC), geprüft gegen die
  // unabhängigen Ankerwerte aus venue-logic.test.ts (±4 min); sie fängt jede Änderung an den
  // Koeffizienten ab, die über die Rundung auf Minuten sichtbar wird. Erzeugung: docs/06_QA.md.
  const minutes = (d: Date | null) => (d ? d.getUTCHours() * 60 + d.getUTCMinutes() : null);
  it.each(SUN_REFERENCE)('$name', ({ lat, lon, dates, rise, set, dusk }) => {
    dates.forEach((date, i) => {
      expect([minutes(sunrise(date, lat, lon)), minutes(sunset(date, lat, lon)), minutes(civilDusk(date, lat, lon))]).toEqual([
        rise[i],
        set[i],
        dusk[i],
      ]);
    });
  });
});

describe('Himmelsphase in hohen Breiten', () => {
  it('Sommernacht ohne Ende der bürgerlichen Dämmerung bleibt nach dem Untergang bei dusk (nicht night)', () => {
    // Reykjavik, Mittsommer: die Sonne geht unter, sinkt aber nie unter -6 Grad
    const [lat, lon, date] = [64.15, -21.94, '2026-06-21'] as const;
    const set = sunset(date, lat, lon) as Date;
    expect(civilDusk(date, lat, lon)).toBeNull();
    expect(skyPhase(utc('2026-06-21T12:00:00Z'), date, lat, lon)).toBe('day');
    expect(skyPhase(new Date(set.getTime() - 30 * 60_000), date, lat, lon)).toBe('golden');
    expect(skyPhase(new Date(set.getTime() + 1), date, lat, lon)).toBe('dusk');
    expect(skyPhase(new Date(set.getTime() + 3 * 3_600_000), date, lat, lon)).toBe('dusk');
  });
});
