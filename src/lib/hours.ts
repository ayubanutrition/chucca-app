/**
 * Öffnungsstatus ausschließlich aus bestätigten Daten.
 * Ohne bestätigte Zeiten lautet das Ergebnis immer „unconfirmed“ –
 * es wird nie ein Status aus Annahmen berechnet.
 */
import { addDays, madridDate, madridTime, madridWeekday, toInstant } from './time';

export interface DayRange {
  /** Öffnung HH:MM (Madrid). */
  open: string;
  /** Schließung HH:MM (Madrid); kleiner als open bedeutet: nach Mitternacht. */
  close: string;
}

export interface HoursData {
  status: 'confirmed' | 'unconfirmed';
  /** Gültigkeit der bestätigten Angaben (YYYY-MM-DD, inklusive). */
  validFrom?: string | null | undefined;
  validUntil?: string | null | undefined;
  /** Index 0 = Sonntag … 6 = Samstag; null = geschlossen. */
  regular?: (DayRange | null)[] | null | undefined;
  /** Ausnahmen je Kalendertag: null = geschlossen. */
  exceptions?: Record<string, DayRange | null> | null | undefined;
}

export type OpenStatus =
  | { state: 'unconfirmed' }
  | { state: 'open'; closesAt: Date }
  | { state: 'closed'; opensAt: Date | null };

function rangeFor(hours: HoursData, date: string, weekday: number): DayRange | null {
  if (hours.exceptions && date in hours.exceptions) return hours.exceptions[date] ?? null;
  return hours.regular?.[weekday] ?? null;
}

function instants(date: string, range: DayRange): { open: Date; close: Date } | null {
  const open = toInstant(date, range.open);
  const close = toInstant(range.close <= range.open ? addDays(date, 1) : date, range.close);
  return open && close ? { open, close } : null;
}

export function openStatus(hours: HoursData, now: Date = new Date()): OpenStatus {
  if (hours.status !== 'confirmed' || !hours.regular || hours.regular.length !== 7) return { state: 'unconfirmed' };
  const today = madridDate(now);
  if ((hours.validFrom && today < hours.validFrom) || (hours.validUntil && today > hours.validUntil)) {
    return { state: 'unconfirmed' };
  }
  const weekday = madridWeekday(now);
  // Gestern begonnene Schicht kann nach Mitternacht noch laufen.
  for (const offset of [-1, 0]) {
    const date = addDays(today, offset);
    const range = rangeFor(hours, date, (weekday + offset + 7) % 7);
    const span = range && instants(date, range);
    if (span && now >= span.open && now < span.close) return { state: 'open', closesAt: span.close };
  }
  for (let offset = 0; offset <= 7; offset++) {
    const date = addDays(today, offset);
    if (hours.validUntil && date > hours.validUntil) break;
    const range = rangeFor(hours, date, (weekday + offset) % 7);
    const span = range && instants(date, range);
    if (span && span.open > now) return { state: 'closed', opensAt: span.open };
  }
  return { state: 'closed', opensAt: null };
}

export { madridTime };
