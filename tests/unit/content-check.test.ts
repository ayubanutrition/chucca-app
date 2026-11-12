/** Auswertungslogik von `npm run content:check` (src/lib/content/report.ts). */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { buildReport, daysBetween, describeIssues, jsonPath, renderReport, reviewEvents, reviewMedia, reviewMenu, reviewVenue, type ReportInput } from '../../src/lib/content/report';
import { eventsSchema, mediaCatalogueSchema, menuSchema, venueSchema, type MediaInternal, type Menu, type Venue } from '../../src/lib/content/schema';
import venueRaw from '../../src/content/published/venue.json';

const TODAY = '2026-11-12';
const L = (t: string) => ({ de: t, en: `${t} en`, es: `${t} es` });
const venue = (patch: Record<string, unknown> = {}): Venue => venueSchema.parse({ ...venueRaw, ...patch });
const drink = (id: string, patch: Record<string, unknown> = {}) => ({ id, category: 'a', name: L(id), ingredients: [L('x')], prices: [{ amountCents: 900, currency: 'EUR' }], alcoholFree: false, tastes: [], available: true, ...patch });
const menu = (items: unknown[], patch: Record<string, unknown> = {}): Menu =>
  menuSchema.parse({ kind: 'published', status: 'confirmed', updatedAt: '2026-10-30', categories: [{ id: 'a', name: L('Cat') }, { id: 'b', name: L('Leer') }], items, ...patch });
const media = (id: string, patch: Record<string, unknown> = {}): MediaInternal =>
  mediaCatalogueSchema.parse([{ id, kind: 'photograph', file: `${id}.webp`, alt: L('Bar'), authorization: 'owner-supplied', authorization_evidence: 'Mail', rights_status: 'approved', rights_evidence: 'Mail', venue_name: 'CHUCCA', venue_verified: true, venue_evidence: 'vor Ort', ...patch }])[0]!;
const texts = (s: { lines: { text: string }[] }) => s.lines.map((l) => l.text).join('\n');

describe('Pfade und Schema-Verstöße', () => {
  it('formatiert JSON-Pfade lesbar', () => {
    expect(jsonPath(['items', 3, 'prices'])).toBe('items[3].prices');
    expect(jsonPath(['a', 'b', 0, 1])).toBe('a.b[0][1]');
    expect(jsonPath([])).toBe('(Dateiebene)');
  });
  it('beschreibt Verstöße mit Datei und Pfad auf Deutsch', () => {
    const result = menuSchema.safeParse({ kind: 'published', status: 'confirmed', updatedAt: '2026-01-01', categories: [], items: [{ ...drink('x'), prices: 'viel', surprise: 1 }] });
    expect(result.success).toBe(false);
    const lines = describeIssues('src/content/published/menu.json', result.error!.issues);
    expect(lines.some((l) => l.startsWith('src/content/published/menu.json → items[0].prices: falscher Typ'))).toBe(true);
    expect(lines.some((l) => l.includes('unbekanntes Feld: surprise'))).toBe(true);
    expect(describeIssues('x.json', z.object({ a: z.string() }).safeParse({}).error!.issues)[0]).toBe('x.json → a: falscher Typ oder Wert fehlt (erwartet: string)');
  });
  it('rechnet Tage zwischen Daten', () => {
    expect(daysBetween('2026-08-14', '2026-11-12')).toBe(90);
    expect(daysBetween('2026-11-12', '2026-11-12')).toBe(0);
  });
});

describe('Adresse, Zeiten, Eingang', () => {
  it('bewertet die echten Venue-Daten: Adresse ok mit Hinweis, Zeiten unbestätigt mit Widerspruch', () => {
    const [contact, hours, entrance] = reviewVenue(venue(), TODAY);
    expect(texts(contact!)).toContain('Adresse: bestätigt (confirmed: ja');
    expect(texts(contact!)).toContain('verifiedAt leer');
    expect(texts(contact!)).toContain('kein bestätigter, betreuter Kanal'.replace('kein', 'Kein'));
    expect(hours!.status).toBe('warn');
    expect(texts(hours!)).toContain('Widersprüchliche Quellen');
    expect(entrance!.status).toBe('warn');
  });
  it('prüft bestätigte Zeiten: Zeitraum, Ablauf, fehlende Wochentage', () => {
    const regular = Array.from({ length: 7 }, () => ({ open: '19:00', close: '00:00' }));
    const good = reviewVenue(venue({ hours: { status: 'confirmed', source: 'Mail', observedAt: '2026-11-01', verifiedAt: '2026-11-01', regular, validFrom: '2026-04-01', validUntil: '2026-10-31' } }), TODAY)[1]!;
    expect(texts(good)).toContain('Öffnungszeiten sind bestätigt');
    expect(texts(good)).toContain('abgelaufen');
    const broken = reviewVenue(venue({ hours: { status: 'confirmed', source: 'Mail', observedAt: '2026-11-01', regular: null } }), TODAY)[1]!;
    expect(broken.status).toBe('error');
  });
  it('prüft Ausnahmetage: vergangen, außerhalb des Zeitraums, gleiche Uhrzeit, unbestätigte Zeiten', () => {
    const regular = Array.from({ length: 7 }, () => ({ open: '19:00', close: '00:00' }));
    const base = { status: 'confirmed', source: 'Mail', observedAt: '2026-11-01', verifiedAt: '2026-11-01', regular, validFrom: '2026-11-01', validUntil: '2027-03-31' };
    const clean = texts(reviewVenue(venue({ hours: { ...base, exceptions: { '2026-12-24': null, '2026-12-31': { open: '19:00', close: '03:00' } } } }), TODAY)[1]!);
    expect(clean).toContain('2 Ausnahmetag(e) hinterlegt');
    expect(clean).not.toContain('Vergangenheit');
    expect(clean).not.toContain('außerhalb');
    const odd = texts(reviewVenue(venue({ hours: { ...base, exceptions: { '2026-11-05': null, '2027-05-01': null, '2026-12-25': { open: '20:00', close: '20:00' } } } }), TODAY)[1]!);
    expect(odd).toContain('1 Ausnahmetag(e) liegen in der Vergangenheit');
    expect(odd).toContain('2026-11-05');
    expect(odd).toContain('außerhalb des bestätigten Zeitraums (2026-11-01 bis 2027-03-31) werden nicht gezeigt: 2027-05-01');
    expect(odd).toContain('selben Uhrzeit (2026-12-25)');
    const unconfirmed = texts(reviewVenue(venue({ hours: { status: 'unknown', regular: null, exceptions: { '2026-12-24': null } } }), TODAY)[1]!);
    expect(unconfirmed).toContain('öffentlich erscheinen sie nicht');
  });
  it('zeigt einen Betreuungskanal für Gruppenanfragen als erfüllt', () => {
    const v = venue();
    v.channels[0]!.acceptsInquiries = true;
    expect(texts(reviewVenue(v, TODAY)[0]!)).not.toContain('Kein bestätigter, betreuter Kanal');
  });
});

describe('Karte', () => {
  it('zählt je Kategorie, ohne Preis, ohne Zutaten, alkoholfrei und verfügbar', () => {
    const s = reviewMenu(menu([drink('mojito'), drink('free-one', { alcoholFree: true, prices: [], ingredients: [] }), drink('off', { available: false })]), null, TODAY);
    const t = texts(s);
    expect(t).toContain('Cat: 3 Drink(s)');
    expect(t).toContain('Leer: Kategorie ist leer');
    expect(t).toContain('1 Drink(s) ohne Preis: free-one (src/content/published/menu.json → items[1].prices)');
    expect(t).toContain('1 Drink(s) ohne Zutaten');
    expect(t).toContain('Alkoholfrei: 1 Drink(s)');
    expect(s.status).toBe('warn');
  });
  it('erkennt mögliche fehlende Übersetzungen', () => {
    const same = { de: 'Frisch', en: 'Frisch', es: 'Frisch' };
    const t = texts(reviewMenu(menu([drink('a', { description: same })]), null, TODAY));
    expect(t).toContain('items[0].description (EN = DE)');
    expect(t).toContain('items[0].description (ES = DE)');
  });
  it('warnt, wenn der Stand älter als 90 Tage ist', () => {
    expect(texts(reviewMenu(menu([drink('a')], { updatedAt: '2026-08-13' }), null, TODAY))).toContain('älter als 90 Tage');
    expect(texts(reviewMenu(menu([drink('a')], { updatedAt: '2026-08-14' }), null, TODAY))).not.toContain('älter als 90 Tage');
  });
  it('meldet eine leere Karte und die Beispielkarte der Vorschau', () => {
    const empty = menu([], { status: 'pending', updatedAt: null });
    const s = reviewMenu(empty, menu([drink('a'), drink('b')]), TODAY);
    expect(texts(s)).toContain('Noch keine veröffentlichte Karte');
    expect(texts(s)).toContain('Beispielkarte (2 Drinks');
  });
});

describe('Termine', () => {
  const ev = (id: string, patch: Record<string, unknown>) => eventsSchema.parse([{ id, kind: 'published', status: 'confirmed', title: L(id), summary: L('s'), date: '2026-12-01', start: '20:00', ...patch }])[0]!;
  it('unterscheidet kommend, abgelaufen, Entwurf, abgesagt', () => {
    const s = reviewEvents([ev('a', {}), ev('b', { date: '2026-11-01' }), ev('c', { status: 'draft' }), ev('d', { status: 'cancelled' })], TODAY);
    const t = texts(s);
    expect(t).toContain('1 bestätigte, kommende(r) Termin(e)');
    expect(t).toContain('1 abgelaufene(r) Termin(e)');
    expect(t).toContain('1 Entwurf');
    expect(t).toContain('1 abgesagt');
  });
  it('hideAfter verlängert die Sichtbarkeit', () => {
    expect(texts(reviewEvents([ev('b', { date: '2026-11-01', hideAfter: '2026-11-12' })], TODAY))).not.toContain('abgelaufen');
  });
  it('meldet keine Termine', () => {
    expect(texts(reviewEvents([], TODAY))).toContain('Keine Termine');
  });
});

describe('Medien', () => {
  it('zählt veröffentlichbar und gesperrt mit Gründen, Alt-Texte und fehlende Dateien', () => {
    const records = [
      media('ok-1'),
      media('pending', { rights_status: 'pending' }),
      media('nofile', { file: undefined, alt: undefined, venue_verified: false }),
      { ...media('concept-1', { kind: 'concept', authorization: 'self-made' }) },
    ];
    const s = reviewMedia(records, new Set(['ok-1.webp', 'pending.webp']));
    const t = texts(s);
    expect(t).toContain('1 veröffentlichbare(s) Foto(s)');
    expect(t).toContain('1 Konzeptmotiv(e)');
    expect(t).toContain('2 gesperrt');
    expect(t).toContain('Nutzungsrechte nicht freigegeben: 1× (pending)');
    expect(t).toContain('Aufnahmeort nicht bestätigt: 1× (nofile)');
    expect(t).toContain('Alternativtext fehlt in DE, EN und ES bei 1 Medium/Medien: nofile');
    expect(t).toContain('Bilddatei fehlt in src/assets/media: concept-1 → concept-1.webp');
    expect(s.status).toBe('error');
  });
  it('ohne Fotos: Warnung statt Fehler', () => {
    expect(reviewMedia([], null).status).toBe('warn');
  });
});

describe('Gesamtbericht', () => {
  const base = (patch: Partial<ReportInput> = {}): ReportInput => ({
    today: TODAY,
    schemaErrors: [],
    venue: venue(),
    menu: menu([]),
    fixtureMenu: null,
    events: [],
    media: [],
    existingMediaFiles: null,
    ...patch,
  });
  it('Warnungen sind keine Fehler: Exit-Code-Logik', () => {
    const report = buildReport(base());
    expect(report.failed).toBe(false);
    expect(report.hardBlockers).toEqual([]);
    expect(report.publicGaps.join('\n')).toContain('Öffnungszeiten');
    expect(report.publicGaps.join('\n')).toContain('Rechtstexte');
  });
  it('Schema-Verstöße und unbelegte Bestätigungen blockieren', () => {
    expect(buildReport(base({ schemaErrors: [{ file: 'src/content/published/menu.json', lines: ['x'] }] })).failed).toBe(true);
    const unbacked = venue();
    unbacked.address.source = '';
    const report = buildReport(base({ venue: unbacked }));
    expect(report.failed).toBe(true);
    expect(report.hardBlockers.join()).toContain('address');
  });
  it('rendert deutsche Zusammenfassung mit Symbolen', () => {
    const out = renderReport(buildReport(base()), TODAY);
    expect(out).toContain('⚠ Öffnungszeiten');
    expect(out).toContain('Was blockiert den öffentlichen Build?');
    expect(out).toContain('Nichts – der öffentliche Build läuft durch.');
    expect(out).toContain('Ergebnis: keine Fehler');
    const failed = renderReport(buildReport(base({ schemaErrors: [{ file: 'f.json', lines: ['f.json → a: kaputt'] }] })), TODAY);
    expect(failed).toContain('✖ Schema-Verstöße');
    expect(failed).toContain('Exit-Code 1');
  });
});
