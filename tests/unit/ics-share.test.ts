import { describe, expect, it, vi } from 'vitest';
import { buildCalendar, escapeText, fold, unfold } from '../../src/lib/ics';
import { copyText, plainText, shareOrCopy } from '../../src/lib/share';

describe('ICS (RFC 5545)', () => {
  const ics = buildCalendar({
    uid: 'chucca-meetup-abc@guest.local',
    start: new Date('2030-01-15T19:00:00Z'),
    durationMinutes: 120,
    summary: 'CHUCCA · Quedada',
    location: 'CHUCCA, Riu Center, Carrer del Llaüt 23, 07610 Palma, Mallorca',
    description: 'Una quedada privada, no una reserva; cóctel ñ 🍹.\nhttps://example.com/map?a=1,2',
    now: new Date('2030-01-01T08:00:00Z'),
  });
  it('enthält die Pflichtangaben mit UTC-Zeiten und CRLF', () => {
    const text = unfold(ics);
    for (const line of ['BEGIN:VCALENDAR', 'VERSION:2.0', 'UID:chucca-meetup-abc@guest.local', 'DTSTAMP:20300101T080000Z', 'DTSTART:20300115T190000Z', 'DTEND:20300115T210000Z', 'END:VEVENT', 'END:VCALENDAR']) {
      expect(text.split('\r\n')).toContain(line);
    }
    expect(text).toMatch(/^PRODID:.+$/m);
    expect(ics.endsWith('\r\n')).toBe(true);
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
    expect(ics).not.toContain('TZID');
  });
  it('maskiert Sonderzeichen und Zeilenumbrüche', () => {
    expect(escapeText('a\\b;c,d\ne')).toBe('a\\\\b\;c\\,d\\ne');
    expect(unfold(ics)).toContain('LOCATION:CHUCCA\\, Riu Center\\, Carrer del Llaüt 23\\, 07610 Palma\\, Mallorca');
    expect(unfold(ics)).toContain('no una reserva\; cóctel ñ 🍹.\\nhttps://example.com/map?a=1\\,2');
  });
  it('faltet auf höchstens 75 Oktette, ohne UTF-8-Zeichen zu zerteilen', () => {
    const encoder = new TextEncoder();
    for (const line of ics.split('\r\n')) expect(encoder.encode(line).length).toBeLessThanOrEqual(75);
    const long = 'DESCRIPTION:' + 'ñ🍹ü'.repeat(60);
    expect(unfold(fold(long))).toBe(long);
    expect(fold(long)).not.toContain('�');
  });
  it('schreibt ohne Dauer kein DTEND', () => {
    expect(buildCalendar({ uid: 'u', start: new Date(0), summary: 's', location: 'l', description: 'd' })).not.toContain('DTEND');
  });
});

describe('Teilen', () => {
  const payload = { title: 'T', text: 'Text', url: 'https://example.com' };
  const abort = Object.assign(new Error('cancel'), { name: 'AbortError' });
  const denied = Object.assign(new Error('nope'), { name: 'NotAllowedError' });

  it('meldet natives Teilen nur nach Abschluss als geteilt', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    expect(await shareOrCopy(payload, { share })).toBe('shared');
    expect(share).toHaveBeenCalledWith(payload);
  });
  it('behandelt Abbruch ohne Erfolgsmeldung und ohne Ersatzaktion', async () => {
    const writeText = vi.fn();
    expect(await shareOrCopy(payload, { share: vi.fn().mockRejectedValue(abort), writeText })).toBe('aborted');
    expect(writeText).not.toHaveBeenCalled();
  });
  it('weicht bei fehlendem oder verweigertem Teilen auf die Zwischenablage aus', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    expect(await shareOrCopy(payload, { writeText })).toBe('copied');
    expect(writeText).toHaveBeenCalledWith('Text\nhttps://example.com');
    expect(await shareOrCopy(payload, { share: vi.fn().mockRejectedValue(denied), writeText })).toBe('copied');
  });
  it('fordert manuelles Kopieren, wenn nichts verfügbar ist oder die Zwischenablage scheitert', async () => {
    expect(await shareOrCopy(payload, {})).toBe('manual');
    expect(await shareOrCopy(payload, { writeText: vi.fn().mockRejectedValue(denied) })).toBe('manual');
    expect(await copyText('x', {})).toBe('manual');
    expect(plainText({ title: 'T', text: 'nur Text' })).toBe('nur Text');
  });
  it('funktioniert ohne Browser-APIs (kein navigator.share, kein clipboard)', async () => {
    expect(await shareOrCopy(payload)).toBe('manual');
  });
});
