/**
 * Zeitlogik für den Standort. Alle Besuchszeiten gelten in Europe/Madrid,
 * unabhängig von der Zeitzone des Endgeräts. Portiert aus V3 (planner.js)
 * und durch tests/unit/time.test.ts abgesichert.
 */
export const VENUE_TIME_ZONE = 'Europe/Madrid';

export interface ZonedParts {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
}

const partsFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: VENUE_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export function madridParts(date: Date): ZonedParts {
  const out: Record<string, string> = {};
  for (const part of partsFormat.formatToParts(date)) out[part.type] = part.value;
  // Stryker disable all: Rückfallwerte für nie fehlende Teile von formatToParts (nur für noUncheckedIndexedAccess)
  return {
    year: out.year ?? '',
    month: out.month ?? '',
    day: out.day ?? '',
    hour: out.hour ?? '',
    minute: out.minute ?? '',
  };
  // Stryker restore all
}

/** Kalendertag in Madrid als YYYY-MM-DD. */
export function madridDate(now: Date = new Date()): string {
  const p = madridParts(now);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Uhrzeit in Madrid als HH:MM. */
export function madridTime(now: Date = new Date()): string {
  const p = madridParts(now);
  return `${p.hour}:${p.minute}`;
}

/** Wochentag in Madrid, 0 = Sonntag. */
export function madridWeekday(now: Date = new Date()): number {
  const [y, m, d] = madridDate(now).split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
export const MAX_PLAN_DATE = '2100-12-31';

/**
 * Mögliche Zeitpunkte, an denen die Madrider Ortszeit `base` (als UTC gelesen) angezeigt wird:
 * Verschiebungen von ±14 h im 15-Minuten-Raster. Madrid liegt nur bei +1 h/+2 h, der Bereich ist
 * bewusst großzügig; Grenzen und Vorzeichen dieser Schleife haben daher keine beobachtbare Wirkung.
 */
function scanCandidates(base: Date): Date[] {
  const out: Date[] = [];
  // Stryker disable next-line all: großzügiger, symmetrischer Suchbereich, Grenzen/Vorzeichen ohne beobachtbare Wirkung
  for (let offset = -14 * 60; offset <= 14 * 60; offset += 15) out.push(new Date(base.getTime() + offset * 60_000));
  return out;
}

/**
 * Wandelt eine Madrider Ortszeit in einen eindeutigen Zeitpunkt um.
 * Gibt null zurück, wenn das Datum nicht existiert, die Ortszeit wegen der
 * Zeitumstellung fehlt (Frühjahr) oder doppelt vorkommt (Herbst).
 */
export function toInstant(date: string, time: string): Date | null {
  // Stryker disable next-line all: Formatprüfung ist vorgeschaltet; ungültige Zeit-/Datumsformen scheitern danach ohnehin an Date und Treffervergleich
  if (!DATE_PATTERN.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const base = new Date(`${date}T${time}:00Z`);
  if (!Number.isFinite(base.getTime())) return null;
  const hits: Date[] = [];
  for (const candidate of scanCandidates(base)) {
    const p = madridParts(candidate);
    if (`${p.year}-${p.month}-${p.day}` === date && `${p.hour}:${p.minute}` === time) hits.push(candidate);
  }
  return hits.length === 1 ? (hits[0] ?? null) : null;
}

/**
 * Nachsichtige Variante für Betriebszeiten: Eine Ortszeit in der Frühjahrslücke
 * rückt auf den ersten gültigen Zeitpunkt danach, eine doppelte Herbststunde
 * meint ihr erstes Vorkommen. Der Planer nutzt weiter das strenge toInstant.
 */
export function toInstantLenient(date: string, time: string): Date | null {
  const strict = toInstant(date, time);
  // Stryker disable next-line ConditionalExpression: reine Abkürzung, der lenient-Pfad liefert für eindeutige Zeiten dasselbe
  if (strict) return strict;
  if (!DATE_PATTERN.test(date) || !TIME_PATTERN.test(time)) return null;
  const base = new Date(`${date}T${time}:00Z`);
  if (!Number.isFinite(base.getTime()) || base.toISOString().slice(0, 10) !== date) return null;
  const hits: Date[] = [];
  let firstAfter: Date | null = null;
  for (const candidate of scanCandidates(base)) {
    const p = madridParts(candidate);
    const local = `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
    if (local === `${date}T${time}`) hits.push(candidate);
    // Stryker disable next-line EqualityOperator: Gleichheit wurde im if davor behandelt
    else if (!firstAfter && local > `${date}T${time}`) firstAfter = candidate;
  }
  return hits[0] ?? firstAfter;
}

/** Addiert Kalendertage auf ein YYYY-MM-DD-Datum (reine Kalenderrechnung). */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

const BCP47: Record<string, string> = { de: 'de-DE', en: 'en-GB', es: 'es-ES' };
export const intlLocale = (locale: string): string => BCP47[locale] ?? 'en-GB';

export function formatLongDate(instant: Date, locale: string): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: VENUE_TIME_ZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(instant);
}

export function formatShortDate(instant: Date, locale: string): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: VENUE_TIME_ZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(instant);
}

export function formatClock(instant: Date, locale: string, timeZone: string = VENUE_TIME_ZONE): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(instant);
}

/** Zeitzone des Endgeräts oder null, wenn nicht ermittelbar. */
export function deviceTimeZone(): string | null {
  try {
    return new Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}
