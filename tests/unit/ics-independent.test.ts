/**
 * Unabhängige Gegenprobe des ICS-Exports: Die Ausgabe von buildCalendar wird mit
 * einem fremden Parser (node-ical, Apache-2.0, nur devDependency) gelesen und
 * gegen die Eingabe verglichen. Die Prüfung nutzt weder unfold() noch
 * escapeText() aus src/lib/ics.ts, damit ein Fehler dort nicht mitgetestet wird.
 * Grenze: node-ical ist ein Parser, kein Validator, und ersetzt keinen Import in Apple/Google/Outlook.
 */
import { describe, expect, it } from 'vitest';
import ical from 'node-ical';
import type { VEvent } from 'node-ical';
import { buildCalendar, type CalendarEvent } from '../../src/lib/ics';
import { toInstant } from '../../src/lib/time';

const UID = 'chucca-meetup-0b6f1c52-7d1e-4c3a-9a55-1f2e3d4c5b6a@guest.local';
const NOW = new Date('2026-01-01T08:00:00Z');
const base: CalendarEvent = {
  uid: UID,
  start: new Date('2026-06-15T17:00:00Z'),
  durationMinutes: 120,
  summary: 'CHUCCA · Treffen',
  location: 'CHUCCA, Riu Center, Carrer del Llaüt 23, 07610 Palma, Mallorca',
  description: 'Private Verabredung, keine Reservierung.\nhttps://maps.example/?q=39.5,2.7',
  url: 'https://chucca.example/plan/?d=2026-06-15&t=19:00&id=0b6f1c52',
  now: NOW,
};

function parse(event: CalendarEvent): { raw: string; ev: VEvent; keys: string[]; calendar: Record<string, unknown> } {
  const raw = buildCalendar(event);
  const data = ical.sync.parseICS(raw) as Record<string, { type: string } & Record<string, unknown>>;
  const events = Object.values(data).filter((entry) => entry.type === 'VEVENT');
  expect(events).toHaveLength(1);
  const calendar = data.vcalendar as Record<string, unknown>;
  expect(calendar).toBeDefined();
  return { raw, ev: events[0] as unknown as VEvent, keys: Object.keys(events[0] as object), calendar };
}

const lineBreaks = (text: string) => text.replace(/\r\n|[\r\u2028\u2029]/g, '\n');
const rawLines = (raw: string) => raw.split('\r\n');

/** Strukturprüfung ohne Hilfsfunktionen aus ics.ts. */
function expectWellFormed(raw: string): void {
  expect(raw.endsWith('\r\n')).toBe(true);
  const body = raw.slice(0, -2);
  expect(body).not.toMatch(/\r(?!\n)|(?<!\r)\n/); // nur CRLF
  const lines = rawLines(body);
  for (const line of lines) {
    expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    expect(line).not.toMatch(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/);
    expect(line).not.toContain('\ufffd');
  }
  expect(lines[0]).toBe('BEGIN:VCALENDAR');
  expect(lines.at(-1)).toBe('END:VCALENDAR');
  // Genau ein VEVENT, genau die erwarteten logischen Zeilen (keine eingeschleusten Eigenschaften).
  const logical = body.replace(/\r\n[ \t]/g, '').split('\r\n');
  const names = logical.map((l) => l.slice(0, l.search(/[:;]/)));
  expect(names.filter((n) => n === 'BEGIN')).toHaveLength(2);
  expect(names.filter((n) => n === 'END')).toHaveLength(2);
  for (const required of ['VERSION', 'PRODID', 'UID', 'DTSTAMP', 'DTSTART', 'SUMMARY']) {
    expect(names.filter((n) => n === required)).toHaveLength(1);
  }
  const allowed = new Set(['BEGIN', 'END', 'VERSION', 'PRODID', 'CALSCALE', 'METHOD', 'UID', 'DTSTAMP', 'DTSTART', 'DTEND', 'SUMMARY', 'LOCATION', 'DESCRIPTION', 'URL']);
  for (const n of names) expect(allowed.has(n), `unerwartete Eigenschaft ${n}`).toBe(true);
}

function expectRoundTrip(event: CalendarEvent): void {
  const { raw, ev, keys, calendar } = parse(event);
  expectWellFormed(raw);
  expect(calendar).toMatchObject({ version: '2.0', prodid: '-//CHUCCA Playa de Palma//Guest Meetup//EN', method: 'PUBLISH', calscale: 'GREGORIAN' });
  expect(ev.uid).toBe(event.uid);
  // node-ical liefert für leere Werte undefined statt ''.
  expect(ev.summary ?? '').toBe(lineBreaks(event.summary));
  expect(ev.location ?? '').toBe(lineBreaks(event.location));
  expect(ev.description ?? '').toBe(lineBreaks(event.description));
  expect(ev.start.toISOString()).toBe(event.start.toISOString());
  expect(ev.dtstamp.toISOString()).toBe((event.now ?? NOW).toISOString());
  if (event.durationMinutes && event.durationMinutes > 0) {
    expect(ev.end?.toISOString()).toBe(new Date(event.start.getTime() + event.durationMinutes * 60_000).toISOString());
  } else {
    expect(raw).not.toContain('DTEND'); // node-ical setzt end dann selbst auf start
  }
  if (event.url) expect(ev.url).toBe(event.url);
  expect(keys.filter((k) => ['rrule', 'attendee', 'organizer', 'alarms'].includes(k))).toEqual([]);
}

describe('ICS gegen unabhängigen Parser (node-ical)', () => {
  it('Grundfall: Kopf, Pflichtfelder, UTC, CRLF', () => {
    const { raw } = parse(base);
    expectRoundTrip(base);
    expect(raw).toContain('\r\nDTSTART:20260615T170000Z\r\n');
    expect(raw).toContain('\r\nDTEND:20260615T190000Z\r\n');
    expect(raw).not.toContain('TZID');
  });

  it('UID bleibt bei wiederholtem Export identisch, auch mit anderem DTSTAMP', () => {
    const a = parse(base).ev.uid;
    const b = parse({ ...base, now: new Date('2027-05-05T05:05:05Z') }).ev.uid;
    expect([a, b]).toEqual([UID, UID]);
  });

  const texts: Record<string, string> = {
    umlaute: 'Äpfel, Öl & Übermut – größer als Straße ß',
    spanisch: 'Quedada: ¿cañas, tapas y piña? ¡Sí! Ñandú',
    emoji: 'Cóctel 🍹 y 🎉 ❤️ 👨\u200d👩\u200d👧\u200d👦 🇪🇸',
    kombiniert: 'e\u0301 (e + Akzent) vs. é, ǅ, ﬁ',
    cjk: '乾杯 カンパイ 건배',
    sonderzeichen: 'a,b;c\\d:e"f\'g',
    unicodeZeilentrenner: 'a\u2028b\u2029c',
    nurSonder: ',;\\\n',
    backslashEnde: 'Ende\\',
    backslashN: 'Literal \\n und \\N und \\, und \\; im Text',
    zeilenumbrueche: 'eins\nzwei\r\ndrei\rvier',
    leerzeilen: '\n\nA\n\n',
    leerzeichen: '  vorn und hinten  ',
    tab: 'a\tb',
    leer: '',
    einschleusung: 'x\r\nATTENDEE:mailto:evil@example.com\r\nEND:VEVENT\r\nBEGIN:VEVENT',
    einschleusungKommentar: 'x\nDTSTART:19700101T000000Z\nORGANIZER:mailto:a@b.c',
    fortsetzungsschein: 'a\r\n b\r\n\tc',
    lang75: 'x'.repeat(75),
    lang1000: 'Wort '.repeat(200),
    langUmlaut: 'ü'.repeat(300),
    langEmoji: '🍹'.repeat(200),
    langGemischt: 'aä🍹ñ,;\\\n'.repeat(80),
    langOhneLeerzeichen: 'A'.repeat(5000),
  };

  for (const [name, text] of Object.entries(texts)) {
    it(`Round-Trip SUMMARY/LOCATION/DESCRIPTION: ${name}`, () => {
      expectRoundTrip({ ...base, summary: text || 'leer', location: text, description: text });
    });
  }

  it('jede Faltungsgrenze: Text der Länge 60..90 mit 1-, 2-, 3- und 4-Byte-Zeichen', () => {
    for (const ch of ['a', 'ü', '€', '🍹']) {
      for (let n = 60; n <= 90; n++) {
        const text = ch.repeat(n);
        expectRoundTrip({ ...base, summary: text, location: text, description: text });
      }
    }
  });

  it('entfernt unzulässige Steuerzeichen und ersetzt alleinstehende Surrogate', () => {
    const dirty = 'a\u0000b\u0001c\u0008d\u000be\u000cf\u001bg\u007fh\ud800i\udc00j';
    const { ev, raw } = parse({ ...base, summary: dirty, location: dirty, description: dirty });
    expect(ev.summary).toBe('abcdefgh\ufffdi\ufffdj');
    expect(raw).not.toMatch(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/);
    expect(new TextEncoder().encode(raw).includes(0)).toBe(false);
  });

  it('lehnt UID und URL mit Leer- oder Steuerzeichen ab (keine Kopfzeilen-Einschleusung)', () => {
    for (const bad of ['a b', 'a\r\nATTENDEE:x', 'a\nb', 'a\rb', 'a\u2028b', '', 'a\u0000b', 'a\tb']) {
      expect(() => buildCalendar({ ...base, uid: bad })).toThrow(RangeError);
      if (bad) expect(() => buildCalendar({ ...base, url: bad })).toThrow(RangeError);
    }
    expect(buildCalendar({ ...base, url: '' })).not.toContain('URL:');
  });

  it('URL mit Komma, Semikolon, Prozent und Umlaut-Kodierung bleibt unverändert', () => {
    const url = 'https://chucca.example/plan/?d=2026-06-15&t=19%3A00&x=a,b;c%C3%BC';
    expect(parse({ ...base, url }).ev.url).toBe(url);
  });
});

describe('Zeitpunkte: Europe/Madrid nach UTC', () => {
  const madrid = (d: Date) =>
    new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Madrid', dateStyle: 'short', timeStyle: 'short' }).format(d).replace(/\s/g, ' ');

  // [Datum, Uhrzeit Madrid, erwartetes DTSTART (UTC), erwartetes DTEND (UTC)]
  const cases: [string, string, string, string][] = [
    ['2026-03-29', '01:59', '2026-03-29T00:59:00.000Z', '2026-03-29T02:59:00.000Z'], // vor Umstellung (CET, +1)
    ['2026-03-29', '03:00', '2026-03-29T01:00:00.000Z', '2026-03-29T03:00:00.000Z'], // nach Umstellung (CEST, +2)
    ['2026-03-29', '23:30', '2026-03-29T21:30:00.000Z', '2026-03-29T23:30:00.000Z'],
    ['2026-03-28', '23:00', '2026-03-28T22:00:00.000Z', '2026-03-29T00:00:00.000Z'], // Ende über die Umstellungsnacht
    ['2026-10-25', '01:59', '2026-10-24T23:59:00.000Z', '2026-10-25T01:59:00.000Z'], // vor Rückstellung (CEST)
    ['2026-10-25', '03:00', '2026-10-25T02:00:00.000Z', '2026-10-25T04:00:00.000Z'], // nach Rückstellung (CET)
    ['2026-10-25', '22:00', '2026-10-25T21:00:00.000Z', '2026-10-25T23:00:00.000Z'],
    ['2027-03-28', '03:00', '2027-03-28T01:00:00.000Z', '2027-03-28T03:00:00.000Z'],
    ['2027-10-31', '03:00', '2027-10-31T02:00:00.000Z', '2027-10-31T04:00:00.000Z'],
    ['2026-07-01', '22:00', '2026-07-01T20:00:00.000Z', '2026-07-01T22:00:00.000Z'],
    ['2026-07-01', '00:00', '2026-06-30T22:00:00.000Z', '2026-07-01T00:00:00.000Z'],
    ['2026-07-01', '22:00', '2026-07-01T20:00:00.000Z', '2026-07-01T22:00:00.000Z'],
    ['2026-07-01', '23:59', '2026-07-01T21:59:00.000Z', '2026-07-01T23:59:00.000Z'],
    ['2026-12-31', '23:30', '2026-12-31T22:30:00.000Z', '2027-01-01T00:30:00.000Z'], // Jahreswechsel im Ende
    ['2027-01-01', '00:00', '2026-12-31T23:00:00.000Z', '2027-01-01T01:00:00.000Z'], // Start nach Madrider Silvester-Mitternacht
    ['2026-12-31', '22:00', '2026-12-31T21:00:00.000Z', '2026-12-31T23:00:00.000Z'],
    ['2028-02-29', '12:00', '2028-02-29T11:00:00.000Z', '2028-02-29T13:00:00.000Z'], // Schaltjahr
  ];

  for (const [date, time, start, end] of cases) {
    it(`${date} ${time} Madrid -> ${start}`, () => {
      const instant = toInstant(date, time);
      expect(instant, 'toInstant muss die Ortszeit eindeutig auflösen').not.toBeNull();
      const { ev, raw } = parse({ ...base, start: instant as Date });
      expect(ev.start.toISOString()).toBe(start);
      expect(ev.end?.toISOString()).toBe(end);
      // Rückprobe unabhängig von time.ts: Intl liefert wieder die Madrider Eingabe.
      expect(madrid(ev.start)).toBe(`${date} ${time}`);
      expect(raw).toMatch(/\r\nDTSTART:\d{8}T\d{6}Z\r\n/);
    });
  }

  it('Ortszeiten in der Umstellungslücke und der doppelten Stunde werden vom Planer nicht exportiert', () => {
    expect(toInstant('2026-03-29', '02:30')).toBeNull();
    expect(toInstant('2026-10-25', '02:30')).toBeNull();
  });

  it('DTSTAMP ohne Angabe ist ein gültiger UTC-Zeitpunkt nahe jetzt', () => {
    const { ev } = parse({ ...base, now: undefined as unknown as Date });
    expect(Math.abs(ev.dtstamp.getTime() - Date.now())).toBeLessThan(60_000);
  });

  it('ohne Dauer kein DTEND und keine Dauer 0 oder negativ', () => {
    for (const durationMinutes of [undefined, 0, -30]) {
      const event: CalendarEvent = { ...base, ...(durationMinutes === undefined ? {} : { durationMinutes }) };
      if (durationMinutes === undefined) delete (event as { durationMinutes?: number }).durationMinutes;
      expectRoundTrip(event);
    }
  });
});

describe('Zufalls-Round-Trip (fester Seed)', () => {
  function mulberry32(seed: number): () => number {
    let a = seed;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const alphabet = [
    ...'abcXYZ019 .:-_/?&=%#@!"\'()[]{}<>|~^*+',
    ',', ';', '\\', '\n', '\r', '\r\n', '\t', ' ', ' ',
    'ä', 'Ö', 'ü', 'ß', 'ñ', 'Ñ', '¿', '¡', 'é', '€', '–', '·',
    '🍹', '🎉', '👨\u200d👩\u200d👧', '🇪🇸', '\u0301', '\u200d', '乾', 'カ', '\u2028', '\u00a0',
    'BEGIN:VEVENT', '\r\nEND:VEVENT', '\nATTENDEE:x', '\\n', '\\,', '\\;',
  ];

  it('1000 zufällige Texte (Länge 0-400) bleiben exakt erhalten', () => {
    const random = mulberry32(20260615);
    for (let i = 0; i < 1000; i++) {
      const make = () => {
        const length = Math.floor(random() ** 2 * 400);
        let text = '';
        for (let k = 0; k < length; k++) text += alphabet[Math.floor(random() * alphabet.length)];
        return text;
      };
      const summary = make() || 'x';
      const start = new Date(Date.UTC(2026, 0, 1) + Math.floor(random() * 5 * 365 * 24 * 60) * 60_000);
      expectRoundTrip({ ...base, summary, location: make(), description: make(), start, durationMinutes: 1 + Math.floor(random() * 600) });
    }
  });
});
