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
import { parseOrThrow } from './report';
import { eventsSchema, incompleteConfirmations, mediaCatalogueSchema, menuSchema, unbackedConfirmations, venueSchema, type Localized, type MediaInternal, type Menu, type Venue, type VenueEvent } from './schema';
import type { HoursData } from '../hours';
import { TEST_HOURS, TEST_INQUIRY, type Mode } from '../../config/mode';
import { fixtureHours, HOURS_FIXTURE_NOTICE } from '../../content/fixtures/hours';
import { fixtureInquiryEndpoint, INQUIRY_FIXTURE_NOTICE } from '../../content/fixtures/inquiry';
import { activeEndpoint } from '../inquiry-endpoint';

export const venueInternal: Venue = parseOrThrow('src/content/published/venue.json', venueSchema, venueRaw);
const unbacked = unbackedConfirmations(venueInternal);
if (unbacked.length > 0) throw new Error(`Inhalte fehlerhaft – der Build wurde angehalten. In src/content/published/venue.json steht „confirmed“ ohne Quelle oder Datum bei: ${unbacked.join(', ')}. Bitte „source“ und „observedAt“ (oder „verifiedAt“) eintragen oder den Status zurücksetzen.`);
const incomplete = incompleteConfirmations(venueInternal);
if (incomplete.length > 0) throw new Error(`Inhalte fehlerhaft – der Build wurde angehalten. In src/content/published/venue.json sind Angaben unvollständig oder widersprüchlich: ${incomplete.join('; ')}.`);
export const publishedMenu: Menu = parseOrThrow('src/content/published/menu.json', menuSchema, menuRaw);
export const fixtureMenu: Menu = parseOrThrow('src/content/fixtures/menu.json', menuSchema, fixtureMenuRaw);
export const publishedEvents: VenueEvent[] = parseOrThrow('src/content/published/events.json', eventsSchema, eventsRaw);
export const mediaCatalogue: MediaInternal[] = parseOrThrow('src/content/media/catalogue.json', mediaCatalogueSchema, catalogueRaw);

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
  /**
   * Sendeweg für Gruppenanfragen: `null`, solange der Betrieb keinen Endpunkt bestätigt hat (Normalfall).
   * Nur Adresse und Datenschutzhinweis; Quelle und Prüfdaten bleiben intern.
   */
  inquiry: { url: string; origin: string; privacyNote: Localized | null; testNotice?: string } | null;
  entrance: { note: Localized; confirmed: boolean } | null;
}

/** Im Testbuild (`CHUCCA_TEST_HOURS`) tragen die Standardinhalte die gekennzeichnete Zeiten-Fixture; sonst unverändert. */
const hoursVenue: Venue = TEST_HOURS ? { ...venueInternal, hours: fixtureHours } : venueInternal;
/** Im Testbuild `dist-inquiry` (`CHUCCA_TEST_INQUIRY`) trägt die Venue einen gekennzeichneten Test-Endpunkt; sonst unverändert. */
const activeVenue: Venue = TEST_INQUIRY ? { ...hoursVenue, inquiryEndpoint: fixtureInquiryEndpoint } : hoursVenue;

export function venueFor(mode: Mode, venue: Venue = activeVenue): VenuePublic {
  if (venue.address.status !== 'confirmed') throw new Error('Ohne bestätigte Besucheradresse ist kein Build möglich.');
  const { building, street, postalCode, city, area, region, countryCode } = venue.address;
  const entranceVisible = venue.entrance.status === 'confirmed' || (mode === 'preview' && venue.entrance.status === 'source-claim');
  const endpoint = activeEndpoint(venue.inquiryEndpoint);
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
    inquiry: endpoint
      ? { url: endpoint.url, origin: endpoint.origin, privacyNote: venue.inquiryEndpoint?.privacyNote ?? null, ...(TEST_INQUIRY && venue.inquiryEndpoint === fixtureInquiryEndpoint ? { testNotice: INQUIRY_FIXTURE_NOTICE } : {}) }
      : null,
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
