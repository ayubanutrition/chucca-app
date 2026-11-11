/**
 * Beispieltermine für die private Vorschau. Die Daten liegen relativ zum
 * Bauzeitpunkt in der Zukunft, damit die Darstellung prüfbar bleibt.
 * Sie erscheinen niemals im öffentlichen Build.
 */
import type { VenueEvent } from '../../lib/content/schema';
import { addDays, madridDate } from '../../lib/time';

export function fixtureEvents(now: Date = new Date()): VenueEvent[] {
  const today = madridDate(now);
  return [
    {
      id: 'fixture-sundowner',
      kind: 'fixture',
      status: 'confirmed',
      title: { de: 'Sundowner-Abend', en: 'Sundowner evening', es: 'Aperitivo al atardecer' },
      summary: {
        de: 'Beispieltext: Aperitif-Karte und ruhige Musik zum Sonnenuntergang.',
        en: 'Sample text: aperitif menu and mellow music at sunset.',
        es: 'Texto de ejemplo: carta de aperitivos y música tranquila al atardecer.',
      },
      date: addDays(today, 3),
      start: '19:00',
      end: '22:00',
    },
    {
      id: 'fixture-dj',
      kind: 'fixture',
      status: 'confirmed',
      title: { de: 'DJ-Nacht', en: 'DJ night', es: 'Noche de DJ' },
      summary: {
        de: 'Beispieltext: So sähe ein bestätigter Termin mit Uhrzeit aus.',
        en: 'Sample text: this is how a confirmed date with a time would look.',
        es: 'Texto de ejemplo: así se vería una fecha confirmada con su hora.',
      },
      date: addDays(today, 9),
      start: '21:00',
    },
  ];
}
