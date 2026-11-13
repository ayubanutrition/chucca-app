/**
 * Öffnungsstatus ausschließlich aus bestätigten Daten.
 * Ohne bestätigte Zeiten lautet das Ergebnis immer „unconfirmed“ –
 * es wird nie ein Status aus Annahmen berechnet.
 */
import { addDays, madridDate, madridWeekday, toInstantLenient } from './time';

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
  // Stryker disable next-line OptionalChaining: openStatus prüft regular vorher, der Zugriff ist nie auf null/undefined
  return hours.regular?.[weekday] ?? null;
}

function instants(date: string, range: DayRange): { open: Date; close: Date } | null {
  const open = toInstantLenient(date, range.open);
  const close = toInstantLenient(range.close <= range.open ? addDays(date, 1) : date, range.close);
  return open && close ? { open, close } : null;
}

export function openStatus(hours: HoursData, now: Date = new Date()): OpenStatus {
  if (hours.status !== 'confirmed' || !hours.regular || hours.regular.length !== 7) return { state: 'unconfirmed' };
  const today = madridDate(now);
  const weekday = madridWeekday(now);
  // Gestern begonnene Schicht kann nach Mitternacht noch laufen.
  for (const offset of [-1, 0]) {
    const date = addDays(today, offset);
    // Eine Schicht zählt nach ihrem Beginn: außerhalb des Zeitraums begonnene Schichten sind nicht bestätigt,
    // eine am letzten gültigen Tag begonnene Schicht läuft aber über Mitternacht hinaus weiter.
    if ((hours.validFrom && date < hours.validFrom) || (hours.validUntil && date > hours.validUntil)) continue;
    const range = rangeFor(hours, date, (weekday + offset + 7) % 7);
    const span = range && instants(date, range);
    if (span && now >= span.open && now < span.close) return { state: 'open', closesAt: span.close };
  }
  if ((hours.validFrom && today < hours.validFrom) || (hours.validUntil && today > hours.validUntil)) return { state: 'unconfirmed' };
  for (let offset = 0; offset <= 7; offset++) {
    const date = addDays(today, offset);
    if (hours.validUntil && date > hours.validUntil) break;
    const range = rangeFor(hours, date, (weekday + offset) % 7);
    const span = range && instants(date, range);
    if (span && span.open > now) return { state: 'closed', opensAt: span.open };
  }
  return { state: 'closed', opensAt: null };
}

export interface HoursException {
  date: string;
  /** null = geschlossen. */
  range: DayRange | null;
}

/**
 * Bestätigte Ausnahmetage ab `today` (inklusive), chronologisch. Ausnahmen außerhalb des
 * bestätigten Zeitraums gelten nicht als bestätigt und erscheinen nicht.
 */
export function upcomingExceptions(hours: HoursData, today: string): HoursException[] {
  if (hours.status !== 'confirmed' || !hours.regular || hours.regular.length !== 7) return [];
  return Object.entries(hours.exceptions ?? {})
    .filter(([date]) => /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= today)
    .filter(([date]) => !(hours.validFrom && date < hours.validFrom) && !(hours.validUntil && date > hours.validUntil))
    .map(([date, range]) => ({ date, range }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

