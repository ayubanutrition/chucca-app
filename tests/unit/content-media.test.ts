/**
 * Inhalte und Medienfreigabe. Portiert die sechs V3-Medientests (tests/test_media_library.py)
 * und ergänzt den Vertrag, der den V3-Befund behebt: öffentlich nur eine explizite Feldliste.
 */
import { describe, expect, it } from 'vitest';
import { eventsFor, fixtureMenu, mediaCatalogue, mediaFor, menuFor, publishedEvents, publishedMenu, venueFor, venueInternal } from '../../src/lib/content';
import { mediaInternalSchema, menuSchema, unbackedConfirmations, venueSchema, type MediaInternal } from '../../src/lib/content/schema';
import { PUBLIC_MEDIA_FIELDS, auditMedia, deduplicate, exclusionReasons, selectMedia, toPublicMedia } from '../../src/lib/media';

const L = (text: string) => ({ de: text, en: text, es: text });
const photo = (overrides: Partial<MediaInternal> = {}): MediaInternal =>
  mediaInternalSchema.parse({
    id: 'bar-1',
    kind: 'photograph',
    file: 'bar-1.webp',
    alt: L('Bar'),
    source_url: 'https://example.com/a.jpg',
    authorization: 'owner-supplied',
    authorization_evidence: 'Owner-Mail',
    rights_status: 'approved',
    rights_evidence: 'Schriftliche Freigabe GEHEIM-123',
    venue_name: 'CHUCCA Playa de Palma',
    venue_verified: true,
    venue_evidence: 'Vor Ort geprüft',
    notes: 'interne Notiz',
    local_path: '/Users/intern/fotos/bar-1.jpg',
    ...overrides,
  });

describe('Medienfreigabe (V3-Regression)', () => {
  it('lehnt unbekannte Felder und ungültige Werte im Katalog ab', () => {
    expect(() => mediaInternalSchema.parse({ ...photo(), surprise: true })).toThrow();
    expect(() => mediaInternalSchema.parse({ ...photo(), rights_status: 'vielleicht' })).toThrow();
    expect(() => mediaInternalSchema.parse({ ...photo(), file: '../../etc/passwd' })).toThrow();
  });
  it('gibt nur echte, verifizierte, rechtlich freigegebene Fotos frei', () => {
    expect(exclusionReasons(photo())).toEqual([]);
    expect(exclusionReasons(photo({ rights_status: 'pending' }))).toEqual(['rights_not_approved']);
    expect(exclusionReasons(photo({ venue_verified: false }))).toEqual(['venue_not_verified']);
    expect(exclusionReasons(photo({ kind: 'concept' }))).toEqual(['not_actual_venue_photograph']);
    expect(exclusionReasons(photo({ file: undefined, alt: undefined }))).toEqual(['no_local_file', 'missing_alt']);
  });
  it('erkennt Duplikate über ID, Quelle ohne Fragment, Datei und SHA-256 – der erste Eintrag gewinnt', () => {
    const sha = 'a'.repeat(64);
    const records = [
      photo({ sha256: sha }),
      photo({ id: 'bar-2', file: 'bar-2.webp', source_url: 'https://example.com/a.jpg#crop' }),
      photo({ id: 'bar-3', file: 'bar-3.webp', source_url: 'https://example.com/b.jpg', sha256: sha }),
      photo({ id: 'bar-4', file: 'bar-4.webp', source_url: 'https://example.com/a.jpg?size=2' }),
    ];
    const { unique, duplicates } = deduplicate(records);
    expect(unique.map((r) => r.id)).toEqual(['bar-1', 'bar-4']);
    expect(duplicates).toEqual([
      { id: 'bar-2', duplicateOf: 'bar-1' },
      { id: 'bar-3', duplicateOf: 'bar-1' },
    ]);
  });
  it('filtert vor dem Deduplizieren, damit ein gesperrter Verweis kein freigegebenes Foto verdrängt', () => {
    const blocked = photo({ id: 'ref', rights_status: 'pending' });
    const approved = photo({ id: 'ok', file: 'ok.webp' }); // gleiche source_url
    expect(selectMedia([blocked, approved], 'public').map((r) => r.id)).toEqual(['ok']);
  });
  it('schließt Konzeptmotive öffentlich immer aus und lässt sie nur in der Vorschau zu', () => {
    const concept = photo({ id: 'idea', kind: 'concept', authorization: 'self-made', venue_verified: false, file: 'idea.webp' });
    expect(selectMedia([concept], 'public')).toEqual([]);
    expect(selectMedia([concept], 'preview').map((r) => r.id)).toEqual(['idea']);
    // Ein fremdes, nicht freigegebenes Motiv wird auch in der Vorschau nicht gezeigt.
    expect(selectMedia([photo({ id: 'x', kind: 'concept', rights_status: 'pending' })], 'preview')).toEqual([]);
  });
  it('bewertet den echten Katalog: 4 Referenzen bleiben gesperrt, 0 veröffentlichbare Fotos', () => {
    const audit = auditMedia(mediaCatalogue);
    expect(audit.publishablePhotographs).toBe(0);
    expect(audit.duplicates).toEqual([]);
    const legacy = audit.excluded.filter((entry) => entry.id.startsWith('chucca-palma-mallorcaguide-'));
    expect(legacy).toHaveLength(4);
    for (const entry of legacy) expect(entry.reasons).toEqual(expect.arrayContaining(['rights_not_approved', 'venue_not_verified']));
    expect(mediaFor('public')).toEqual([]);
    expect(mediaFor('preview').every((m) => m.public.kind === 'concept')).toBe(true);
  });
});

describe('Öffentlicher Medienvertrag', () => {
  it('exportiert ausschließlich die erlaubten Felder', () => {
    const exported = toPublicMedia(photo({ credit: 'Foto: Beispiel', caption: L('Abend') }));
    expect(Object.keys(exported).sort()).toEqual([...PUBLIC_MEDIA_FIELDS].sort());
    const json = JSON.stringify(exported);
    for (const secret of ['GEHEIM-123', 'Owner-Mail', 'Vor Ort geprüft', 'interne Notiz', '/Users/', 'example.com', 'rights', 'evidence', 'local_path']) {
      expect(json).not.toContain(secret);
    }
  });
  it('gilt für jeden Eintrag der Vorschau', () => {
    for (const { public: media } of mediaFor('preview')) expect(Object.keys(media).sort()).toEqual([...PUBLIC_MEDIA_FIELDS].sort());
  });
});

describe('Betriebsmodi', () => {
  it('öffentlich: keine Beispielkarte, keine Beispieltermine, keine unbestätigten Angaben', () => {
    expect(menuFor('public').state).toBe('pending');
    expect(menuFor('public').menu.items).toEqual([]);
    expect(eventsFor('public')).toEqual({ events: [], fixture: false });
    const venue = venueFor('public');
    expect(venue.hours).toEqual({ status: 'unconfirmed' });
    expect(venue.entrance).toBeNull();
    expect(venue.channels.map((c) => c.type)).toEqual(['instagram']);
    expect(venue.channels.some((c) => c.acceptsInquiries)).toBe(false);
  });
  it('Vorschau: gekennzeichnete Beispieldaten, aber keine ungeprüften Kontaktwege', () => {
    expect(menuFor('preview').state).toBe('fixture');
    const events = eventsFor('preview', new Date('2030-01-15T12:00:00Z'));
    expect(events.fixture).toBe(true);
    expect(events.events.every((e) => e.kind === 'fixture' && e.date > '2030-01-15')).toBe(true);
    const venue = venueFor('preview');
    expect(venue.entrance).toMatchObject({ confirmed: false });
    expect(JSON.stringify(venue)).not.toMatch(/631|info@|source|observedAt/);
  });
  it('eine bestätigte Karte ersetzt die Beispielkarte in beiden Modi', () => {
    const confirmed = menuSchema.parse({ ...fixtureMenu, kind: 'published', status: 'confirmed', updatedAt: '2030-01-01' });
    expect(menuFor('preview', confirmed).state).toBe('published');
    expect(menuFor('public', confirmed).state).toBe('published');
  });
  it('bestätigte Termine verdrängen Beispieltermine; Entwürfe erscheinen nie', () => {
    const real = { ...eventsFor('preview').events[0]!, id: 'real', kind: 'published' as const };
    expect(eventsFor('preview', new Date(), [real])).toEqual({ events: [real], fixture: false });
    // Abgelaufene Termine stehen gar nicht erst im HTML.
    expect(eventsFor('public', new Date(), [{ ...real, date: '2020-01-01' }]).events).toEqual([]);
    expect(eventsFor('public', new Date(), [{ ...real, status: 'draft' }]).events).toEqual([]);
  });
});

describe('Datenverträge', () => {
  it('trennt veröffentlichten Bestand und Beispieldaten', () => {
    expect(publishedMenu.kind).toBe('published');
    expect(fixtureMenu.kind).toBe('fixture');
    expect(publishedEvents.every((e) => e.kind === 'published')).toBe(true);
  });
  it('verhindert veröffentlichte Drinks ohne Bestätigung und unbekannte Kategorien', () => {
    expect(() => menuSchema.parse({ ...fixtureMenu, kind: 'published', status: 'pending' })).toThrow(/confirmed/);
    expect(() => menuSchema.parse({ ...fixtureMenu, items: [{ ...fixtureMenu.items[0], category: 'nix' }] })).toThrow(/Kategorie/);
    expect(() => menuSchema.parse({ ...fixtureMenu, items: [fixtureMenu.items[0], fixtureMenu.items[0]] })).toThrow(/Doppelte/);
  });
  it('verlangt jede Übersetzung und lehnt erfundene Felder ab', () => {
    const drink = fixtureMenu.items[0]!;
    expect(() => menuSchema.parse({ ...fixtureMenu, items: [{ ...drink, name: { de: 'x', en: 'x' } }] })).toThrow();
    expect(() => venueSchema.parse({ ...venueInternal, rating: 4.9 })).toThrow();
    // Nur Web-, Mail- und Telefonlinks; kein Skript-Schema in Inhaltsdateien.
    expect(() => venueSchema.parse({ ...venueInternal, maps: { ...venueInternal.maps, google: 'javascript:alert(1)' } })).toThrow();
    const [first, ...others] = venueInternal.channels;
    expect(() => venueSchema.parse({ ...venueInternal, channels: [{ ...first, href: 'javascript:alert(1)' }, ...others] })).toThrow();
  });
  it('akzeptiert „confirmed“ nur mit Quelle und Datum', () => {
    expect(unbackedConfirmations(venueInternal)).toEqual([]);
    const bare = venueSchema.parse({ ...venueInternal, hours: { regular: null, status: 'confirmed' } });
    expect(unbackedConfirmations(bare)).toEqual(['hours']);
  });
  it('führt ungeprüfte Fakten als solche', () => {
    expect(venueInternal.hours.status).not.toBe('confirmed');
    expect(venueInternal.channels.filter((c) => c.status !== 'confirmed').map((c) => c.type)).toEqual(['email', 'phone']);
    expect(fixtureMenu.items.some((d) => d.alcoholFree)).toBe(true);
  });
});
