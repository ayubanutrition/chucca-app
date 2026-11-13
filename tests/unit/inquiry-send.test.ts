/**
 * Optionaler Sendeweg für Gruppenanfragen (Aufgabe 18): Endpunkt-Regeln, Schema, Venue-Sicht, Inhaltsprüfung,
 * CSP und die Sendelogik ohne DOM. Browserverhalten: tests/e2e/inquiry-send.spec.ts, Build-Ausgabe:
 * tests/build-output/inquiry-csp.test.ts.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import venueRaw from '../../src/content/published/venue.json';
import { fixtureInquiryEndpoint, INQUIRY_FIXTURE_URL } from '../../src/content/fixtures/inquiry';
import { dictionary, LOCALES } from '../../src/i18n';
import { venueFor, venueInternal } from '../../src/lib/content';
import { buildReport, reviewVenue } from '../../src/lib/content/report';
import { incompleteConfirmations, unbackedConfirmations, venueSchema, type Venue } from '../../src/lib/content/schema';
import { buildHeadersFile, collectInquiryOrigins, contentSecurityPolicy } from '../../src/lib/headers';
import { activeEndpoint, checkEndpointUrl, endpointOrigin, endpointProblems, inactiveEndpointNote, type EndpointFact } from '../../src/lib/inquiry-endpoint';
import { buildPayload, classifyStatus, SEND_TIMEOUT_MS, sendInquiry } from '../../src/lib/inquiry-send';

const GOOD = 'https://anfragen.chucca-palma.example/v1/gruppe';
const confirmed = (patch: Partial<EndpointFact> = {}): EndpointFact => ({ url: GOOD, method: 'POST', acceptsInquiries: true, status: 'confirmed', source: 'Mail des Betriebs vom 13.11.2026', observedAt: '2026-11-13', verifiedAt: '2026-11-13', ...patch });
const venueWith = (inquiryEndpoint: unknown): Venue => venueSchema.parse({ ...venueRaw, ...(inquiryEndpoint === undefined ? {} : { inquiryEndpoint }) });

describe('Endpunkt-Adresse', () => {
  it.each([
    ['https://example.com/path', 'https://example.com'],
    ['https://Anfragen.Example.COM/v1/a-b_c', 'https://anfragen.example.com'],
    ['https://a.b.example.org', 'https://a.b.example.org'],
    ['https://xn--brse-5qa.example/x', 'https://xn--brse-5qa.example'],
  ])('akzeptiert %s', (url, origin) => {
    const check = checkEndpointUrl(url);
    expect(check.ok).toBe(true);
    expect(endpointOrigin(url)).toBe(origin);
  });

  it.each([
    ['http://example.com/x', 'kein https'],
    ['HTTP://example.com/x', 'kein https (Großschreibung)'],
    ['//example.com/x', 'schemalos'],
    ['https://localhost/x', 'localhost ohne Punkt'],
    ['https://127.0.0.1/x', 'IPv4'],
    ['https://[::1]/x', 'IPv6'],
    ['https://*.example.com/x', 'Platzhalter'],
    ['https://example.com:8443/x', 'Port'],
    ['https://user:pw@example.com/x', 'Zugangsdaten'],
    ['https://user@example.com/x', 'Benutzername'],
    ['https://example.com/x?key=abc', 'Query'],
    ['https://example.com/x#frag', 'Fragment'],
    ['https://example.com/../x', 'Pfad mit ..'],
    ['https://example.com/a b', 'Leerzeichen'],
    ['https://example.com/a\\b', 'Backslash'],
    ['https://-bad.example.com/', 'Label beginnt mit Bindestrich'],
    ['https://example..com/', 'leeres Label'],
    ['https://example.123/', 'numerische Endung'],
    ['javascript:alert(1)', 'javascript:'],
    ['mailto:info@example.com', 'mailto'],
    ['https://' + 'a'.repeat(2100) + '.example.com/', 'zu lang'],
    ['', 'leer'],
  ])('lehnt %s ab (%s)', (url) => {
    expect(checkEndpointUrl(url).ok).toBe(false);
    expect(endpointOrigin(url)).toBeNull();
  });
});

describe('Wann der Sendeweg AN ist', () => {
  it('nur mit bestätigtem, belegtem und zugesagtem Endpunkt', () => {
    expect(activeEndpoint(confirmed())).toEqual({ url: GOOD, origin: 'https://anfragen.chucca-palma.example' });
  });
  it.each([
    ['nicht vorhanden', undefined],
    ['null', null],
    ['Status source-claim', confirmed({ status: 'source-claim' })],
    ['Status proposal', confirmed({ status: 'proposal' })],
    ['Status unknown', confirmed({ status: 'unknown' })],
    ['Status historic', confirmed({ status: 'historic' })],
    ['acceptsInquiries false', confirmed({ acceptsInquiries: false })],
    ['ohne Quelle', confirmed({ source: undefined })],
    ['Quelle nur Leerzeichen', confirmed({ source: '   ' })],
    ['ohne verifiedAt', confirmed({ verifiedAt: undefined })],
    ['verifiedAt null (nur observedAt genügt hier nicht)', confirmed({ verifiedAt: null })],
    ['Adresse ungültig', confirmed({ url: 'http://example.com/x' })],
  ] as const)('AUS bei: %s', (_name, fact) => {
    expect(activeEndpoint(fact as EndpointFact | undefined | null)).toBeNull();
  });

  it('meldet Widersprüche als Fehler, einen bloß unbestätigten Eintrag nur als Hinweis', () => {
    expect(endpointProblems(undefined)).toEqual([]);
    expect(endpointProblems(confirmed())).toEqual([]);
    expect(endpointProblems(confirmed({ status: 'proposal', acceptsInquiries: true })).join()).toContain('unbestätigter Endpunkt darf keine Anfragen annehmen');
    expect(endpointProblems(confirmed({ verifiedAt: undefined })).join()).toContain('verifiedAt');
    expect(endpointProblems(confirmed({ source: '' })).join()).toContain('source');
    expect(endpointProblems(confirmed({ url: 'https://localhost/x' })).join()).toContain('url:');
    const proposal = confirmed({ status: 'proposal', acceptsInquiries: false });
    expect(endpointProblems(proposal)).toEqual([]);
    expect(inactiveEndpointNote(proposal)).toContain('nicht bestätigt');
    expect(inactiveEndpointNote(confirmed({ acceptsInquiries: false }))).toContain('acceptsInquiries ist false');
    expect(inactiveEndpointNote(confirmed())).toBeNull();
    expect(inactiveEndpointNote(undefined)).toBeNull();
  });
});

describe('Schema und Inhalte', () => {
  it('venue.json im Repo enthält KEINEN Endpunkt (keine erfundene Adresse)', () => {
    expect('inquiryEndpoint' in venueRaw).toBe(false);
    expect(venueInternal.inquiryEndpoint).toBeUndefined();
    expect(JSON.stringify(venueRaw)).not.toMatch(/inquiryEndpoint/);
  });

  it('der Standard (ohne Endpunkt) liefert in Vorschau und öffentlich: kein Sendeweg', () => {
    expect(venueFor('preview').inquiry).toBeNull();
    expect(venueFor('public').inquiry).toBeNull();
  });

  it('akzeptiert einen vollständigen Endpunkt und lehnt unbekannte Felder, falsche Methode und schlechte Adressen ab', () => {
    expect(venueWith(confirmed()).inquiryEndpoint?.url).toBe(GOOD);
    expect(venueSchema.safeParse({ ...venueRaw, inquiryEndpoint: { ...confirmed(), method: 'GET' } }).success).toBe(false);
    expect(venueSchema.safeParse({ ...venueRaw, inquiryEndpoint: { ...confirmed(), extra: 1 } }).success).toBe(false);
    for (const url of ['http://example.com/x', 'https://127.0.0.1/x', 'https://example.com/x?token=1', '']) {
      expect(venueSchema.safeParse({ ...venueRaw, inquiryEndpoint: confirmed({ url }) }).success, url).toBe(false);
    }
    expect(venueSchema.safeParse({ ...venueRaw, inquiryEndpoint: { ...confirmed(), privacyNote: { de: 'x', en: 'x', es: '' } } }).success).toBe(false);
  });

  it('„confirmed“ ohne Quelle oder Datum zählt in unbackedConfirmations', () => {
    expect(unbackedConfirmations(venueWith(confirmed()))).toEqual([]);
    expect(unbackedConfirmations(venueWith(confirmed({ source: undefined })))).toEqual(['inquiryEndpoint']);
    expect(unbackedConfirmations(venueWith(confirmed({ verifiedAt: undefined, observedAt: undefined })))).toEqual(['inquiryEndpoint']);
    expect(unbackedConfirmations(venueWith(confirmed({ status: 'proposal', acceptsInquiries: false, source: undefined })))).toEqual([]);
  });

  it('halb bestätigte oder widersprüchliche Endpunkte halten den Build an (incompleteConfirmations)', () => {
    expect(incompleteConfirmations(venueWith(undefined))).toEqual([]);
    expect(incompleteConfirmations(venueWith(confirmed()))).toEqual([]);
    expect(incompleteConfirmations(venueWith(confirmed({ verifiedAt: undefined }))).join()).toContain('inquiryEndpoint: „confirmed“ braucht verifiedAt');
    expect(incompleteConfirmations(venueWith(confirmed({ status: 'source-claim' }))).join()).toContain('acceptsInquiries ist true');
  });

  it('die Test-Fixture ist ein gültiger, aktiver Endpunkt mit Host .invalid und erfundenen Daten', () => {
    const v = venueWith(fixtureInquiryEndpoint);
    expect(incompleteConfirmations(v)).toEqual([]);
    expect(activeEndpoint(v.inquiryEndpoint)?.origin).toBe('https://inquiries.chucca-test.invalid');
    expect(INQUIRY_FIXTURE_URL).toMatch(/\.invalid\//);
    expect(fixtureInquiryEndpoint.source).toContain('TESTFIXTURE-INQUIRY');
  });

  it('venueFor gibt bei bestätigtem Endpunkt nur Adresse und Datenschutzhinweis weiter, keine Belege', () => {
    const note = { de: 'Datenschutz de', en: 'Privacy en', es: 'Privacidad es' };
    const view = venueFor('public', venueWith({ ...confirmed(), privacyNote: note }));
    expect(view.inquiry).toEqual({ url: GOOD, origin: 'https://anfragen.chucca-palma.example', privacyNote: note });
    const json = JSON.stringify(view);
    expect(json).not.toContain('Mail des Betriebs');
    expect(json).not.toContain('verifiedAt');
    expect(venueFor('preview', venueWith(confirmed())).inquiry?.privacyNote).toBeNull();
  });

  it('venueFor ignoriert unbestätigte Endpunkte (AUS)', () => {
    for (const patch of [{ status: 'proposal' as const, acceptsInquiries: false }, { status: 'source-claim' as const, acceptsInquiries: false }, { acceptsInquiries: false }, { source: undefined, observedAt: undefined, verifiedAt: undefined }]) {
      const v = venueWith(confirmed(patch));
      expect(venueFor('public', v).inquiry, JSON.stringify(patch)).toBeNull();
    }
  });
});

describe('content:check', () => {
  const today = '2026-11-13';
  const text = (v: Venue) => reviewVenue(v, today).flatMap((s) => s.lines.map((l) => `${l.level}: ${l.text}`)).join('\n');
  const report = (v: Venue) => buildReport({ today, schemaErrors: [], venue: v, menu: null, fixtureMenu: null, events: null, media: null, existingMediaFiles: null });

  it('ohne Endpunkt: Sendeweg AUS als Lücke gemeldet, kein Fehler', () => {
    const r = report(venueWith(undefined));
    expect(r.failed).toBe(false);
    expect(r.publicGaps.join('\n')).toContain('Sendeweg für Anfragen: AUS');
  });

  it('unbestätigter Endpunkt: Hinweis, bleibt AUS, kein Fehler', () => {
    const v = venueWith(confirmed({ status: 'proposal', acceptsInquiries: false }));
    expect(text(v)).toContain('warn: Sendeweg für Anfragen: Endpunkt eingetragen, aber nicht bestätigt');
    const r = report(v);
    expect(r.failed).toBe(false);
    expect(r.publicGaps.join('\n')).toContain('Sendeweg für Anfragen: AUS');
  });

  it('fehlerhafter oder widersprüchlicher Endpunkt: Fehler und Build-Blocker', () => {
    const v = venueWith(confirmed({ status: 'proposal', acceptsInquiries: true }));
    expect(text(v)).toContain('error: Anfrage-Endpunkt: acceptsInquiries ist true');
    const r = report(v);
    expect(r.failed).toBe(true);
    expect(r.hardBlockers.join()).toContain('inquiryEndpoint');
  });

  it('bestätigter Endpunkt ohne Datenschutzhinweis: AN, aber Lücke Platzhalter', () => {
    const v = venueWith(confirmed());
    expect(text(v)).toContain('ok: Anfrage-Endpunkt ist bestätigt');
    expect(text(v)).toContain('privacyNote');
    const r = report(v);
    expect(r.failed).toBe(false);
    expect(r.publicGaps.join('\n')).toContain('Datenschutzhinweis des Betriebs (privacyNote) fehlt');
    expect(r.publicGaps.join('\n')).not.toContain('Gruppenanfragen: kein betreuter Kanal');
    const withNote = report(venueWith({ ...confirmed(), privacyNote: { de: 'a', en: 'b', es: 'c' } }));
    expect(withNote.publicGaps.join('\n')).not.toContain('Sendeweg für Anfragen');
  });
});

describe('CSP und _headers', () => {
  const hashes = { scripts: ["'sha256-AAA='"], styles: ["'sha256-BBB='"] };
  const directive = (csp: string, name: string) => csp.split('; ').find((d) => d.startsWith(`${name} `)) ?? '';

  it('ohne Endpunkt unverändert strikt', () => {
    for (const csp of [contentSecurityPolicy(hashes), contentSecurityPolicy(hashes, null), contentSecurityPolicy(hashes, undefined)]) {
      expect(directive(csp, 'connect-src')).toBe("connect-src 'self'");
      expect(directive(csp, 'form-action')).toBe("form-action 'none'");
    }
  });

  it('mit bestätigtem Endpunkt genau dieser eine Host in connect-src und form-action, sonst nichts geöffnet', () => {
    const csp = contentSecurityPolicy(hashes, 'https://anfragen.chucca-palma.example');
    expect(directive(csp, 'connect-src')).toBe("connect-src 'self' https://anfragen.chucca-palma.example");
    expect(directive(csp, 'form-action')).toBe('form-action https://anfragen.chucca-palma.example');
    expect(csp.match(/chucca-palma\.example/g)).toHaveLength(2);
    expect(directive(csp, 'default-src')).toBe("default-src 'none'");
    expect(directive(csp, 'script-src')).toBe("script-src 'self' 'sha256-AAA='");
    expect(csp.split('; ').filter((d) => !d.startsWith('style-src-attr')).join('; ')).not.toMatch(/unsafe-|\*/);
  });

  it.each(['http://x.example', 'https://x.example/pfad', 'https://x.example:8443', 'https://*.example', 'https://127.0.0.1', "https://x.example; script-src *", 'x.example', ''])('weigt die Herkunft %j ab', (origin) => {
    expect(() => contentSecurityPolicy(hashes, origin)).toThrow(/Ungültige Herkunft/);
  });

  it('_headers: Endpunkt nur im Block /* und nur wenn übergeben', () => {
    const files = ['index.html', 'de/index.html', 'sw.js', '_headers'];
    const without = buildHeadersFile({ files, hashes, noindex: true });
    const withHost = buildHeadersFile({ files, hashes, noindex: true, inquiryOrigin: 'https://anfragen.chucca-palma.example' });
    expect(without).not.toContain('chucca-palma');
    expect(withHost.match(/chucca-palma/g)).toHaveLength(2);
    expect(withHost.replace(/https:\/\/anfragen\.chucca-palma\.example/g, '')).toBe(without.replace("connect-src 'self'", "connect-src 'self' ").replace("form-action 'none'", 'form-action '));
  });

  it('liest die Herkunft aus den erzeugten Seiten', () => {
    expect(collectInquiryOrigins(['<form data-inquiry data-inquiry-origin="https://a.example" novalidate>', '<form data-inquiry-origin="https://a.example">', '<p>nichts</p>'])).toEqual(['https://a.example']);
    expect(collectInquiryOrigins(['<form data-inquiry>'])).toEqual([]);
    expect(collectInquiryOrigins(['data-inquiry-origin="https://b.example"', 'data-inquiry-origin="https://a.example"'])).toEqual(['https://a.example', 'https://b.example']);
  });
});

describe('Sendelogik', () => {
  afterEach(() => vi.useRealTimers());
  const payload = buildPayload({ people: 8, date: '2030-01-18', time: '21:00', note: ' Geburtstag ', locale: 'de' });
  const respond = (status: number) => vi.fn(async () => new Response(null, { status }));

  it('sendet nur das Nötige: Personenzahl, Datum, Uhrzeit, Anmerkung, Sprache – nichts sonst', () => {
    expect(payload).toEqual({ people: 8, date: '2030-01-18', time: '21:00', note: 'Geburtstag', locale: 'de' });
    expect(Object.keys(buildPayload({ people: 2, date: 'd', time: 't', note: '   ', locale: 'es' })).sort()).toEqual(['date', 'locale', 'people', 'time']);
    expect(buildPayload({ people: 2, date: 'd', time: 't', note: 'x'.repeat(300), locale: 'en' }).note).toHaveLength(140);
  });

  it('klassifiziert Statuscodes: nur 2xx ist Erfolg', () => {
    for (const status of [200, 201, 202, 204, 299]) expect(classifyStatus(status), String(status)).toBe('sent');
    for (const status of [400, 401, 403, 404, 409, 422, 429, 499]) expect(classifyStatus(status), String(status)).toBe('rejected');
    for (const status of [500, 502, 503, 504, 599, 300, 302, 304, 199, 100, 0, 600]) expect(classifyStatus(status), String(status)).toBe('server');
  });

  it('Erfolg erst nach 2xx; genau ein fetch mit JSON, ohne Cookies, Referrer, Weiterleitung', async () => {
    const fetchImpl = respond(204);
    expect(await sendInquiry({ url: GOOD, payload, fetchImpl: fetchImpl as unknown as typeof fetch, isOnline: () => true })).toBe('sent');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(GOOD);
    expect(init).toMatchObject({ method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'omit', cache: 'no-store', redirect: 'error', referrerPolicy: 'no-referrer' });
    expect(JSON.parse(String(init.body))).toEqual(payload);
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it.each([
    [400, 'rejected'],
    [422, 'rejected'],
    [429, 'rejected'],
    [500, 'server'],
    [503, 'server'],
  ] as const)('HTTP %i ergibt %s', async (status, outcome) => {
    expect(await sendInquiry({ url: GOOD, payload, fetchImpl: respond(status) as unknown as typeof fetch, isOnline: () => true })).toBe(outcome);
  });

  it('Netzfehler (fetch wirft) ergibt offline; offline vorab sendet gar nicht', async () => {
    const failing = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    expect(await sendInquiry({ url: GOOD, payload, fetchImpl: failing as unknown as typeof fetch, isOnline: () => true })).toBe('offline');
    const never = vi.fn();
    expect(await sendInquiry({ url: GOOD, payload, fetchImpl: never as unknown as typeof fetch, isOnline: () => false })).toBe('offline');
    expect(never).not.toHaveBeenCalled();
  });

  it('bricht nach der Zeitgrenze ab (timeout), räumt den Timer auf und meldet nie Erfolg', async () => {
    vi.useFakeTimers();
    const hanging = vi.fn((_url: string, init: RequestInit) => new Promise<Response>((_resolve, reject) => init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))));
    const pending = sendInquiry({ url: GOOD, payload, fetchImpl: hanging as unknown as typeof fetch, isOnline: () => true });
    await vi.advanceTimersByTimeAsync(SEND_TIMEOUT_MS - 1);
    expect(vi.getTimerCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(await pending).toBe('timeout');
    expect(vi.getTimerCount()).toBe(0);
    expect(hanging).toHaveBeenCalledTimes(1);
  });

  it('eine späte Antwort nach der Zeitgrenze ändert das Ergebnis nicht; eine rechtzeitige räumt den Timer ab', async () => {
    vi.useFakeTimers();
    const slow = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 2_000));
      return new Response(null, { status: 200 });
    });
    const result = sendInquiry({ url: GOOD, payload, fetchImpl: slow as unknown as typeof fetch, isOnline: () => true, timeoutMs: 5_000 });
    await vi.advanceTimersByTimeAsync(2_000);
    expect(await result).toBe('sent');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('Zeitgrenze: 10 Sekunden, und die Texte nennen sie', () => {
    expect(SEND_TIMEOUT_MS).toBe(10_000);
    for (const locale of LOCALES) expect(dictionary(locale).visit.send.timeout, locale).toContain('10');
  });
});

describe('Texte DE/EN/ES', () => {
  const noReservation = { de: /keine Reservierung/, en: /not a reservation/, es: /no es una reserva|no confirma/ };
  it.each(LOCALES)('%s: Erfolg ist keine Reservierungsbestätigung, Fehler bewahren die Eingabe und bieten den Rückfall', (locale) => {
    const send = dictionary(locale).visit.send;
    expect(send.sent).toMatch(noReservation[locale]);
    expect(send.sent).not.toMatch(/reservada|reserviert|booked|reservation confirmed|Reservierung bestätigt/i);
    const keepsInput = { de: /Eingaben sind noch da/, en: /entries are still here/, es: /sigue aquí/ }[locale];
    const fallback = { de: /Text selbst an CHUCCA|kopiere den Text/, en: /text to CHUCCA yourself|copy the text/, es: /texto a CHUCCA|copia el texto/ }[locale];
    for (const key of ['rejected', 'server', 'timeout', 'offline'] as const) {
      expect(send[key], `${locale}.${key}`).toMatch(keepsInput);
      expect(send[key], `${locale}.${key}`).toMatch(fallback);
      expect(send[key], `${locale}.${key}`).not.toMatch(/übermittelt|passed on|transmitido/);
    }
    expect(send.privacyPlaceholder).toMatch(/PLATZHALTER|PLACEHOLDER|MARCADOR/);
  });
});
