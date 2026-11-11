/**
 * Regression aus V3 (scripts/check-planner.cjs): Madrid/DST, stabile Kalenderkennung,
 * Validierung. Die Fälle sind bewusst identisch übernommen und um Parameter/Speicher ergänzt.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildCalendar, unfold } from '../../src/lib/ics';
import { draftFromParams, draftToParams, emptyDraft, loadDraft, saveDraft, updateDraft, validatePlan } from '../../src/lib/planner';
import { addDays, formatLongDate, madridDate, madridTime, madridWeekday, toInstant } from '../../src/lib/time';

const NOW = new Date('2030-01-15T12:00:00Z');
const uidOf = (ics: string): string => unfold(ics).match(/^UID:(.+)$/m)?.[1]?.trim() ?? '';

describe('Europe/Madrid', () => {
  it('rechnet Winter- und Sommerzeit um', () => {
    expect(toInstant('2030-01-15', '20:00')?.toISOString()).toBe('2030-01-15T19:00:00.000Z');
    expect(toInstant('2030-07-15', '20:00')?.toISOString()).toBe('2030-07-15T18:00:00.000Z');
  });
  it('lehnt unmögliche Daten, die Frühjahrslücke und die doppelte Herbststunde ab', () => {
    expect(toInstant('2030-02-30', '20:00')).toBeNull();
    expect(toInstant('2030-03-31', '02:30')).toBeNull();
    expect(toInstant('2030-10-27', '02:30')).toBeNull();
    expect(toInstant('2030-10-27', '03:30')).not.toBeNull();
    expect(toInstant('morgen', '20:00')).toBeNull();
  });
  it('liefert Datum, Uhrzeit und Wochentag des Standorts – nicht des Geräts', () => {
    const lateUtc = new Date('2030-06-30T22:30:00Z'); // in Madrid schon 1. Juli, 00:30
    expect(madridDate(lateUtc)).toBe('2030-07-01');
    expect(madridTime(lateUtc)).toBe('00:30');
    expect(madridWeekday(lateUtc)).toBe(1);
    expect(addDays('2030-12-31', 1)).toBe('2031-01-01');
  });
  it('formatiert Daten je Sprache in Ortszeit', () => {
    const instant = toInstant('2030-01-15', '20:00') as Date;
    expect(formatLongDate(instant, 'de')).toBe('Dienstag, 15. Januar 2030');
    expect(formatLongDate(instant, 'en')).toMatch(/^Tuesday,? 15 January 2030$/);
    expect(formatLongDate(instant, 'es')).toBe('martes, 15 de enero de 2030');
  });
});

describe('Treffplan', () => {
  it('behält die Kalenderkennung desselben Entwurfs und wechselt sie bei jeder Änderung', () => {
    const calendar = (uid: string, time = '20:00') =>
      buildCalendar({ uid, start: toInstant('2030-01-15', time) as Date, summary: 'CHUCCA', location: 'x', description: 'y', now: NOW });
    let draft = updateDraft(emptyDraft(), '2030-01-15', '20:00');
    const first = uidOf(calendar(draft.uid));
    expect(uidOf(calendar(draft.uid))).toBe(first);
    expect(calendar(draft.uid)).toMatch(/DTSTART:20300115T190000Z/);
    // Unveränderte Eingabe (z. B. nach Sprachwechsel) ist derselbe Entwurf.
    expect(updateDraft(draft, '2030-01-15', '20:00')).toBe(draft);
    draft = updateDraft(draft, '2030-01-15', '21:00');
    expect(draft.uid).not.toBe(first);
    const back = updateDraft(draft, '2030-01-15', '20:00');
    expect(back.uid).not.toBe(first);
    expect(updateDraft(back, '2030-01-16', '20:00').uid).not.toBe(back.uid);
  });

  it('meldet Feld und Grund jedes Eingabefehlers', () => {
    expect(validatePlan({ date: '', time: '20:00' }, NOW)).toEqual({ ok: false, field: 'date', code: 'invalidDate' });
    expect(validatePlan({ date: '2030-01-14', time: '20:00' }, NOW)).toEqual({ ok: false, field: 'date', code: 'invalidDate' });
    expect(validatePlan({ date: '2101-01-01', time: '20:00' }, NOW)).toEqual({ ok: false, field: 'date', code: 'invalidDate' });
    expect(validatePlan({ date: '2030-02-30', time: '20:00' }, NOW)).toEqual({ ok: false, field: 'date', code: 'invalidDate' });
    expect(validatePlan({ date: '2030-01-15', time: '' }, NOW)).toEqual({ ok: false, field: 'time', code: 'invalidTime' });
    expect(validatePlan({ date: '2030-01-15', time: '25:00' }, NOW)).toEqual({ ok: false, field: 'time', code: 'invalidTime' });
    expect(validatePlan({ date: '2030-01-15', time: '12:00' }, NOW)).toEqual({ ok: false, field: 'time', code: 'past' });
    expect(validatePlan({ date: '2030-03-31', time: '02:30' }, NOW)).toEqual({ ok: false, field: 'time', code: 'dst' });
    expect(validatePlan({ date: '2030-10-27', time: '02:30' }, NOW)).toEqual({ ok: false, field: 'time', code: 'dst' });
    const ok = validatePlan({ date: '2030-01-16', time: '20:00' }, NOW);
    expect(ok.ok && ok.instant.toISOString()).toBe('2030-01-16T19:00:00.000Z');
  });

  it('übergibt den Entwurf verlustfrei per URL und verwirft manipulierte Werte', () => {
    const draft = updateDraft(emptyDraft(), '2030-01-16', '20:30');
    const params = draftToParams(draft);
    expect([...params.keys()]).toEqual(['d', 't', 'id']);
    expect(draftFromParams(params)).toEqual(draft);
    expect(draftFromParams(new URLSearchParams())).toBeNull();
    expect(draftFromParams(new URLSearchParams('d=2030-01-16&t=99:99'))).toBeNull();
    expect(draftFromParams(new URLSearchParams('d=<script>&t=20:00'))).toBeNull();
    const forged = draftFromParams(new URLSearchParams('d=2030-01-16&t=20:00&id=%0D%0AATTENDEE:x'));
    expect(forged?.uid).toMatch(/^chucca-meetup-[a-z0-9-]+@guest\.local$/);
  });
});

describe('Entwurf im Sitzungsspeicher', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('übersteht fehlenden und gesperrten Speicher', () => {
    expect(loadDraft().date).toBe('');
    expect(saveDraft(emptyDraft())).toBe(false);
    vi.stubGlobal('sessionStorage', {
      getItem() {
        throw new Error('SecurityError');
      },
      setItem() {
        throw new Error('QuotaExceededError');
      },
    });
    expect(loadDraft().uid).toMatch(/^chucca-meetup-/);
    expect(saveDraft(emptyDraft())).toBe(false);
  });
  it('lädt gespeicherte Entwürfe und ignoriert beschädigte Daten', () => {
    const store = new Map<string, string>();
    vi.stubGlobal('sessionStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) });
    const draft = updateDraft(emptyDraft(), '2030-01-16', '20:00');
    expect(saveDraft(draft)).toBe(true);
    expect(loadDraft()).toEqual(draft);
    store.set('chucca-plan-draft', '{"date":"gestern"');
    expect(loadDraft().date).toBe('');
    store.set('chucca-plan-draft', JSON.stringify({ date: '2030-01-16', time: '20:00', uid: 'fremd' }));
    expect(loadDraft().date).toBe('');
  });
});
