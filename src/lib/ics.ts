/**
 * Minimaler iCalendar-Export (RFC 5545) für einen einzelnen Termin.
 * Zeiten werden als UTC geschrieben; dadurch ist kein VTIMEZONE-Block nötig
 * und der Termin ist auf jedem Gerät derselbe Zeitpunkt.
 */
export interface CalendarEvent {
  uid: string;
  start: Date;
  /** Dauer in Minuten; ohne Angabe wird kein DTEND geschrieben. */
  durationMinutes?: number;
  summary: string;
  location: string;
  description: string;
  url?: string;
  /** Zeitpunkt der Erzeugung (DTSTAMP). */
  now?: Date;
}

export const stamp = (date: Date): string =>
  date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

export const escapeText = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\;');

const encoder = new TextEncoder();

/** Faltet Inhaltszeilen auf höchstens 75 Oktette, ohne UTF-8-Zeichen zu trennen. */
export function fold(line: string): string {
  let result = '';
  let current = '';
  let bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (bytes + size > 73) {
      result += `${current}\r\n `;
      current = '';
      bytes = 1;
    }
    current += char;
    bytes += size;
  }
  return result + current;
}

export function buildCalendar(event: CalendarEvent): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CHUCCA Playa de Palma//Guest Meetup//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${stamp(event.now ?? new Date())}`,
    `DTSTART:${stamp(event.start)}`,
  ];
  if (event.durationMinutes && event.durationMinutes > 0) {
    lines.push(`DTEND:${stamp(new Date(event.start.getTime() + event.durationMinutes * 60_000))}`);
  }
  lines.push(
    `SUMMARY:${escapeText(event.summary)}`,
    `LOCATION:${escapeText(event.location)}`,
    `DESCRIPTION:${escapeText(event.description)}`,
  );
  if (event.url) lines.push(`URL:${event.url}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return `${lines.map(fold).join('\r\n')}\r\n`;
}

/** Entfaltet eine ICS-Datei wieder (für Tests und Prüfungen). */
export const unfold = (text: string): string => text.replace(/\r\n /g, '');
