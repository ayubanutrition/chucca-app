/**
 * Treffplan einer Gruppe: reiner Zustand ohne DOM.
 * Ein Treffplan ist eine private Verabredung, keine Reservierung.
 * Es werden weder Namen noch Kontaktdaten erfasst.
 */
import { DATE_PATTERN, MAX_PLAN_DATE, TIME_PATTERN, madridDate, toInstant } from './time';
import { readStored, writeStored } from './storage';

export interface Draft {
  date: string;
  time: string;
  /** Stabile Kalenderkennung desselben Entwurfs. */
  uid: string;
}

type PlanErrorCode = 'invalidDate' | 'invalidTime' | 'dst' | 'past';
export type PlanResult =
  | { ok: true; instant: Date }
  | { ok: false; field: 'date' | 'time'; code: PlanErrorCode };

const UID_PATTERN = /^chucca-meetup-[a-z0-9-]{8,80}@guest\.local$/;
export const DRAFT_KEY = 'chucca-plan-draft';

export function newUid(): string {
  const random =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  return `chucca-meetup-${random}@guest.local`;
}

export const emptyDraft = (): Draft => ({ date: '', time: '', uid: newUid() });

/** Jede Änderung von Datum oder Uhrzeit beginnt einen neuen Plan mit neuer Kennung. */
export function updateDraft(draft: Draft, date: string, time: string): Draft {
  if (draft.date === date && draft.time === time) return draft;
  return { date, time, uid: newUid() };
}

export function validatePlan(draft: Pick<Draft, 'date' | 'time'>, now: Date = new Date()): PlanResult {
  const today = madridDate(now);
  if (!DATE_PATTERN.test(draft.date) || draft.date < today || draft.date > MAX_PLAN_DATE) {
    return { ok: false, field: 'date', code: 'invalidDate' };
  }
  if (!TIME_PATTERN.test(draft.time)) return { ok: false, field: 'time', code: 'invalidTime' };
  const instant = toInstant(draft.date, draft.time);
  if (!instant) {
    // Nicht existierendes Kalenderdatum (z. B. 30.02.) gehört zum Datumsfeld.
    const probe = new Date(`${draft.date}T12:00:00Z`);
    const sameDay = Number.isFinite(probe.getTime()) && probe.toISOString().slice(0, 10) === draft.date;
    return sameDay
      ? { ok: false, field: 'time', code: 'dst' }
      : { ok: false, field: 'date', code: 'invalidDate' };
  }
  if (instant.getTime() <= now.getTime()) return { ok: false, field: 'time', code: 'past' };
  return { ok: true, instant };
}

function parseDraft(value: unknown): Draft | null {
  // Stryker disable next-line all: doppelt abgesichert, Destrukturierung von null wirft (in loadDraft gefangen), Nicht-Objekte scheitern an den typeof-Prüfungen darunter
  if (!value || typeof value !== 'object') return null;
  const { date, time, uid } = value as Record<string, unknown>;
  if (typeof date !== 'string' || typeof time !== 'string' || typeof uid !== 'string') return null;
  if (date !== '' && !DATE_PATTERN.test(date)) return null;
  if (time !== '' && !TIME_PATTERN.test(time)) return null;
  if (!UID_PATTERN.test(uid)) return null;
  return { date, time, uid };
}

/** Lädt den Entwurf der laufenden Sitzung; ungültige oder fehlende Daten ergeben einen leeren Entwurf. */
export function loadDraft(): Draft {
  // Stryker disable next-line StringLiteral: jede Art außer 'local' wählt sessionStorage (area), '' ist gleichwertig
  const raw = readStored(DRAFT_KEY, 'session');
  // Stryker disable next-line ConditionalExpression: JSON.parse('null') ergibt ebenfalls den leeren Entwurf
  if (!raw) return emptyDraft();
  try {
    return parseDraft(JSON.parse(raw)) ?? emptyDraft();
  } catch {
    return emptyDraft();
  }
}

// Stryker disable next-line StringLiteral: jede Art außer 'local' wählt sessionStorage (area), '' ist gleichwertig
export const saveDraft = (draft: Draft): boolean => writeStored(DRAFT_KEY, JSON.stringify(draft), 'session');

/**
 * Entwurf in URL-Parametern (für Einladungslinks und als Übergabe beim
 * Sprachwechsel, wenn der Sitzungsspeicher gesperrt ist). Enthält nur
 * Datum, Uhrzeit und Entwurfskennung – keine personenbezogenen Daten.
 */
export function draftToParams(draft: Draft): URLSearchParams {
  const params = new URLSearchParams();
  if (draft.date) params.set('d', draft.date);
  if (draft.time) params.set('t', draft.time);
  if (draft.date && draft.time) params.set('id', draft.uid.slice('chucca-meetup-'.length, -'@guest.local'.length));
  return params;
}

export function draftFromParams(params: URLSearchParams): Draft | null {
  const date = params.get('d') ?? '';
  const time = params.get('t') ?? '';
  if (!date && !time) return null;
  const id = params.get('id');
  const uid = id ? `chucca-meetup-${id}@guest.local` : newUid();
  return parseDraft({ date, time, uid: UID_PATTERN.test(uid) ? uid : newUid() });
}
