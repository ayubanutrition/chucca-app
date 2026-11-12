/**
 * Lädt und prüft alle Inhalte und wendet den Betriebsmodus an.
 * Öffentlicher Build: ausschließlich bestätigte, veröffentlichte Daten.
 * Private Vorschau: zusätzlich gekennzeichnete Beispieldaten und Konzeptmotive.
 */
import venueRaw from '../../content/published/venue.json';
import menuRaw from '../../content/published/menu.json';
import eventsRaw from '../../content/published/events.json';
import fixtureMenuRaw from '../../content/fixtures/menu.json';
import catalogueRaw from '../../content/media/catalogue.json';
import { fixtureEvents } from '../../content/fixtures/events';
import { upcoming } from '../events';
import { selectMedia, toPublicMedia, type MediaPublic } from '../media';
import { eventsSchema, mediaCatalogueSchema, menuSchema, unbackedConfirmations, venueSchema, type Localized, type MediaInternal, type Menu, type Venue, type VenueEvent } from './schema';
import type { HoursData } from '../hours';
import { TEST_HOURS, type Mode } from '../../config/mode';
import { fixtureHours, HOURS_FIXTURE_NOTICE } from '../../content/fixtures/hours';

export const venueInternal: Venue = venueSchema.parse(venueRaw);
const unbacked = unbackedConfirmations(venueInternal);
if (unbacked.length > 0) throw new Error(`Als bestätigt geführt, aber ohne Quelle/Datum: ${unbacked.join(', ')}`);
export const publishedMenu: Menu = menuSchema.parse(menuRaw);
export const fixtureMenu: Menu = menuSchema.parse(fixtureMenuRaw);
export const publishedEvents: VenueEvent[] = eventsSchema.parse(eventsRaw);
export const mediaCatalogue: MediaInternal[] = mediaCatalogueSchema.parse(catalogueRaw);

if (publishedMenu.kind !== 'published') throw new Error('published/menu.json muss kind=published tragen.');
if (fixtureMenu.kind !== 'fixture') throw new Error('fixtures/menu.json muss kind=fixture tragen.');
if (publishedEvents.some((event) => event.kind !== 'published')) throw new Error('published/events.json darf nur kind=published enthalten.');

/** Besucherdaten ohne interne Quellen- und Prüfvermerke. */
export interface VenuePublic {
  name: string;
  shortName: string;
  place: string;
  timeZone: 'Europe/Madrid';
  address: { building: string; street: string; postalCode: string; city: string; area: string; region: string; countryCode: 'ES' };
  approxGeo: { lat: number; lon: number };
  maps: { google: string; apple: string };
  channels: { type: Venue['channels'][number]['type']; label: string; href: string; acceptsInquiries: boolean }[];
  hours: HoursData;
  /** Nur im Testbuild gesetzt: Kennzeichnung der Test-Fixture für die Seite. */
  testFixtureNotice?: string;
  entrance: { note: Localized; confirmed: boolean } | null;
}

/** Im Testbuild (`CHUCCA_TEST_HOURS`) tragen die Standardinhalte die gekennzeichnete Zeiten-Fixture; sonst unverändert. */
const activeVenue: Venue = TEST_HOURS ? { ...venueInternal, hours: fixtureHours } : venueInternal;

export function venueFor(mode: Mode, venue: Venue = activeVenue): VenuePublic {
  if (venue.address.status !== 'confirmed') throw new Error('Ohne bestätigte Besucheradresse ist kein Build möglich.');
  const { building, street, postalCode, city, area, region, countryCode } = venue.address;
  const entranceVisible = venue.entrance.status === 'confirmed' || (mode === 'preview' && venue.entrance.status === 'source-claim');
  const hoursConfirmed = venue.hours.status === 'confirmed' && venue.hours.regular !== null;
  return {
    name: venue.name,
    shortName: venue.shortName,
    place: venue.place,
    timeZone: venue.timeZone,
    address: { building, street, postalCode, city, area, region, countryCode },
    approxGeo: venue.approxGeo,
    maps: venue.maps,
    // Kontaktwege erscheinen nur bestätigt – auch in der Vorschau, damit niemand einen ungeprüften Kanal nutzt.
    channels: venue.channels
      .filter((channel) => channel.status === 'confirmed')
      .map(({ type, label, href, acceptsInquiries }) => ({ type, label, href, acceptsInquiries })),
    hours: hoursConfirmed
      ? { status: 'confirmed', validFrom: venue.hours.validFrom, validUntil: venue.hours.validUntil, regular: venue.hours.regular, exceptions: venue.hours.exceptions }
      : { status: 'unconfirmed' },
    ...(TEST_HOURS && venue.hours === fixtureHours ? { testFixtureNotice: HOURS_FIXTURE_NOTICE } : {}),
    entrance: entranceVisible ? { note: venue.entrance.note, confirmed: venue.entrance.status === 'confirmed' } : null,
  };
}

export interface MenuView {
  menu: Menu;
  /** published = bestätigte Karte, fixture = Beispielkarte der Vorschau, pending = noch keine Karte. */
  state: 'published' | 'fixture' | 'pending';
}

export function menuFor(mode: Mode, published: Menu = publishedMenu, fixture: Menu = fixtureMenu): MenuView {
  if (published.status === 'confirmed' && published.items.length > 0) return { menu: published, state: 'published' };
  if (mode === 'preview') return { menu: fixture, state: 'fixture' };
  return { menu: published, state: 'pending' };
}

export interface EventsView {
  events: VenueEvent[];
  fixture: boolean;
}

export function eventsFor(mode: Mode, now: Date = new Date(), published: VenueEvent[] = publishedEvents): EventsView {
  // Nur bestätigte, noch nicht abgelaufene Termine – chronologisch, schon im HTML.
  const confirmed = upcoming(published, now);
  if (confirmed.length > 0 || mode === 'public') return { events: confirmed, fixture: false };
  return { events: fixtureEvents(now), fixture: true };
}

export interface MediaSelection {
  record: MediaInternal;
  public: MediaPublic;
}

export function mediaFor(mode: Mode, catalogue: MediaInternal[] = mediaCatalogue): MediaSelection[] {
  return selectMedia(catalogue, mode).map((record) => ({ record, public: toPublicMedia(record) }));
}
