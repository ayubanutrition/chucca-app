/**
 * Datenverträge für alle Inhalte. Jede Datei unter src/content wird beim
 * Laden gegen diese Schemata geprüft; ein Verstoß bricht Build und Tests ab.
 */
import { z } from 'zod';
import { TASTES } from '../tastes';

export const LOCALE_CODES = ['de', 'en', 'es'] as const;
const text = z.string().trim().min(1);
export const localized = z.object({ de: text, en: text, es: text }).strict();
export type Localized = z.infer<typeof localized>;

/** Nur Web-Links: verhindert `javascript:`/`data:` in Inhaltsdateien (Tiefenverteidigung zur CSP). */
const httpsUrl = z.url().refine((value) => value.startsWith('https://'), 'https:// erwartet');
/** Kanal-Link: https, mailto oder tel. */
const channelHref = text.refine((value) => /^(https:\/\/|mailto:|tel:)/i.test(value), 'https://, mailto: oder tel: erwartet');

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

/** Beleglage einer Angabe. Öffentlich erscheint nur „confirmed“. */
export const factStatus = z.enum(['confirmed', 'source-claim', 'proposal', 'unknown', 'historic']);
export type FactStatus = z.infer<typeof factStatus>;

const provenance = {
  status: factStatus,
  /** Quelle oder Betreiberbeleg (intern, wird nicht ausgeliefert). */
  source: z.string().optional(),
  observedAt: isoDate.optional(),
  verifiedAt: isoDate.nullable().optional(),
};

const dayRange = z.object({ open: clock, close: clock }).strict();

export const venueSchema = z
  .object({
    name: text,
    shortName: text,
    place: text,
    timeZone: z.literal('Europe/Madrid'),
    address: z
      .object({
        building: text,
        street: text,
        postalCode: text,
        city: text,
        area: text,
        region: text,
        countryCode: z.literal('ES'),
        ...provenance,
      })
      .strict(),
    /** Näherungskoordinaten, nur für die Sonnenstandsrechnung (keine Navigation). */
    approxGeo: z.object({ lat: z.number().min(-90).max(90), lon: z.number().min(-180).max(180) }).strict(),
    maps: z.object({ google: httpsUrl, apple: httpsUrl }).strict(),
    channels: z.array(
      z
        .object({
          type: z.enum(['instagram', 'email', 'phone', 'whatsapp']),
          label: text,
          href: channelHref,
          /** Wird dieser Kanal für Gruppenanfragen betreut? Nur nach Betreiberbestätigung. */
          acceptsInquiries: z.boolean(),
          ...provenance,
        })
        .strict(),
    ),
    hours: z
      .object({
        validFrom: isoDate.nullable().optional(),
        validUntil: isoDate.nullable().optional(),
        regular: z.array(dayRange.nullable()).length(7).nullable(),
        exceptions: z.record(isoDate, dayRange.nullable()).nullable().optional(),
        ...provenance,
      })
      .strict(),
    entrance: z.object({ note: localized, ...provenance }).strict(),
  })
  .strict();
export type Venue = z.infer<typeof venueSchema>;

/** „confirmed“ ist keine bloße Behauptung: Es braucht eine benannte Quelle und ein Datum. */
export function unbackedConfirmations(venue: Venue): string[] {
  const groups: [string, { status: FactStatus; source?: string | undefined; observedAt?: string | undefined; verifiedAt?: string | null | undefined }][] = [
    ['address', venue.address],
    ['hours', venue.hours],
    ['entrance', venue.entrance],
    ...venue.channels.map((channel): [string, typeof channel] => [`channel:${channel.type}`, channel]),
  ];
  return groups.filter(([, fact]) => fact.status === 'confirmed' && (!fact.source?.trim() || !(fact.verifiedAt ?? fact.observedAt))).map(([name]) => name);
}

/** „confirmed“ bei den Öffnungszeiten ohne eingetragene Wochentage wäre eine leere Zusage. */
export function incompleteConfirmations(venue: Venue): string[] {
  return venue.hours.status === 'confirmed' && !venue.hours.regular ? ['hours: regular (die sieben Wochentage) fehlt'] : [];
}

export { TASTES, type Taste } from '../tastes';

const price = z
  .object({
    /** Betrag in Cent, um Rundungsfehler auszuschließen. */
    amountCents: z.number().int().positive(),
    currency: z.literal('EUR'),
    /** Größe/Einheit, z. B. „0,3 l“ – nur bei bestätigter Angabe. */
    size: z.string().trim().min(1).optional(),
  })
  .strict();

export const drinkSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    category: z.string().regex(/^[a-z0-9-]+$/),
    name: localized,
    description: localized.optional(),
    ingredients: z.array(localized).default([]),
    /** Mehrere Größen/Preise möglich; leer = Preis nicht bestätigt. */
    prices: z.array(price).default([]),
    alcoholFree: z.boolean(),
    tastes: z.array(z.enum(TASTES)).default([]),
    available: z.boolean().default(true),
  })
  .strict();
export type Drink = z.infer<typeof drinkSchema>;

export const menuSchema = z
  .object({
    /** fixture = Beispieldaten für die private Vorschau, niemals öffentlich. */
    kind: z.enum(['published', 'fixture']),
    status: z.enum(['confirmed', 'pending']),
    /** Stand der Karte laut Betreiber. */
    updatedAt: isoDate.nullable(),
    categories: z.array(z.object({ id: z.string().regex(/^[a-z0-9-]+$/), name: localized, note: localized.optional() }).strict()),
    items: z.array(drinkSchema),
  })
  .strict()
  .superRefine((menu, ctx) => {
    const categories = new Set(menu.categories.map((c) => c.id));
    const seen = new Set<string>();
    for (const item of menu.items) {
      if (!categories.has(item.category)) ctx.addIssue({ code: 'custom', message: `Unbekannte Kategorie: ${item.category} (${item.id})` });
      if (seen.has(item.id)) ctx.addIssue({ code: 'custom', message: `Doppelte Drink-ID: ${item.id}` });
      seen.add(item.id);
    }
    if (menu.kind === 'published' && menu.items.length > 0 && menu.status !== 'confirmed') {
      ctx.addIssue({ code: 'custom', message: 'Veröffentlichte Drinks benötigen status=confirmed.' });
    }
    if (menu.status === 'confirmed' && !menu.updatedAt) ctx.addIssue({ code: 'custom', message: 'Bestätigte Karte benötigt updatedAt.' });
  });
export type Menu = z.infer<typeof menuSchema>;

export const eventSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    kind: z.enum(['published', 'fixture']),
    status: z.enum(['confirmed', 'cancelled', 'draft']),
    title: localized,
    summary: localized,
    /** Ortszeit Madrid. */
    date: isoDate,
    start: clock,
    end: clock.optional(),
    /** Nach diesem Tag wird der Termin nicht mehr gezeigt (Standard: Veranstaltungstag). */
    hideAfter: isoDate.optional(),
  })
  .strict();
export type VenueEvent = z.infer<typeof eventSchema>;
export const eventsSchema = z.array(eventSchema).superRefine((events, ctx) => {
  const seen = new Set<string>();
  events.forEach((event, index) => {
    if (seen.has(event.id)) ctx.addIssue({ code: 'custom', path: [index, 'id'], message: `Doppelte Termin-ID: ${event.id} (jede ID darf nur einmal vorkommen)` });
    seen.add(event.id);
  });
});

/** Interner Medienkatalog – inklusive Rechte- und Rechercheangaben. Wird nie ausgeliefert. */
export const mediaInternalSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    kind: z.enum(['photograph', 'concept', 'illustration']),
    /** Datei unter src/assets/media (ohne Pfad), sofern lokal vorhanden. */
    file: z
      .string()
      .regex(/^[a-z0-9-]+\.(png|jpg|jpeg|webp|avif)$/)
      .optional(),
    focus: z
      .string()
      .regex(/^\d{1,3}% \d{1,3}%$/)
      .default('50% 50%'),
    alt: localized.optional(),
    caption: localized.optional(),
    credit: z.string().trim().min(1).optional(),
    tags: z.array(z.enum(['atmosphere', 'drinks', 'place'])).default([]),
    source_url: z.string().optional(),
    source_page: z.string().optional(),
    sha256: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
    authorization: z.enum(['authorized', 'owner-supplied', 'self-made']),
    authorization_evidence: text,
    rights_status: z.enum(['approved', 'pending', 'rejected']),
    rights_evidence: text,
    venue_name: text,
    venue_verified: z.boolean(),
    venue_evidence: text,
    retrieved_at: isoDate.optional(),
    date_captured: z.string().optional(),
    notes: z.string().optional(),
    local_path: z.string().optional(),
  })
  .strict();
export type MediaInternal = z.infer<typeof mediaInternalSchema>;
export const mediaCatalogueSchema = z.array(mediaInternalSchema).superRefine((records, ctx) => {
  const seen = new Set<string>();
  records.forEach((record, index) => {
    if (seen.has(record.id)) ctx.addIssue({ code: 'custom', path: [index, 'id'], message: `Doppelte Medien-ID: ${record.id} (jede ID darf nur einmal im Katalog stehen)` });
    seen.add(record.id);
  });
});
