/** Sichtbarkeit von Terminen: nur bestätigte, noch nicht abgelaufene Einträge. */
import type { VenueEvent } from './content/schema';
import { madridDate } from './time';

export function isVisible(event: Pick<VenueEvent, 'status' | 'date' | 'hideAfter'>, now: Date = new Date()): boolean {
  if (event.status !== 'confirmed') return false;
  return (event.hideAfter ?? event.date) >= madridDate(now);
}

export function upcoming<T extends Pick<VenueEvent, 'status' | 'date' | 'hideAfter' | 'start'>>(events: T[], now: Date = new Date()): T[] {
  return events
    .filter((event) => isVisible(event, now))
    .sort((a, b) => `${a.date}T${a.start}`.localeCompare(`${b.date}T${b.start}`));
}
