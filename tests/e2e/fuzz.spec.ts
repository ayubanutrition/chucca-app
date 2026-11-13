/**
 * Dynamisches Sicherheits- und Robustheits-Fuzzing im Browser (Chromium; Zusatzlauf Firefox/WebKit), nur gegen die lokalen Testserver.
 * Methode, Fälle und Befunde: docs/06_QA.md, Abschnitt „Fuzzing“. Kein Penetrationstest.
 *
 * Instrumentierung je Seite: `window.__pwned` (Sentinel, den jede Nutzlast zu setzen versucht), `dialog`-Ereignisse
 * (alert/prompt), `pageerror`/Konsolenfehler, `securitypolicyviolation`, Anfragen an fremde Herkünfte, Navigation der
 * Hauptseite weg von der eigenen Herkunft sowie ein DOM-Scan auf eingeschleuste Elemente und Attribute.
 * Die Abläufe laufen einmal mit aktiver CSP (Verstöße zählen) und einmal mit umgangener CSP: Dann würde eine echte
 * Einschleusung tatsächlich ausgeführt, die Seite verteidigt sich also ohne den Header (Verteidigung in der Tiefe).
 *
 * Deterministisch: alle „zufälligen“ Zeichenfolgen kommen aus einem festen Seed (mulberry32), Playwright-Reihenfolge ist fest.
 */
import { request as httpRequest } from 'node:http';
import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { ORIGIN, PORT } from './ports';

// Seitenwechsel-Überblendung (View Transition) aus: Chromium meldet bei rasch aufeinanderfolgenden Navigationen mitten in der Überblendung
// einen eigenen Fehler („Transition was aborted because of invalid state“), der mit den Nutzlasten nichts zu tun hat.
test.use({ reducedMotion: 'reduce' });

// ---------------------------------------------------------------- Werkzeug

const SEED = 0xc4cca;
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const ALPHABET = ['<', '>', '"', "'", '&', '`', '$', '{', '}', '(', ')', '%', '\\', '/', ';', '=', ':', '\u0000', '‮', '‍', '😀', '＜', 'a', '1', ' ', '\n', '\t', '..', '%2e', '%00', '#', '?'];
function randomHostile(next: () => number, length: number): string {
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[Math.floor(next() * ALPHABET.length)];
  return out;
}

/** Jede Nutzlast versucht, den Sentinel zu setzen; `evil.example` markiert fremde Ziele. */
const SENT = 'window.__pwned=1';
const NAMED: string[] = [
  `<img src=x onerror="${SENT}">`,
  `"><svg/onload=${SENT}>`,
  `'><script>${SENT}</script>`,
  `</textarea></title></script><img src=//evil.example/p.png onerror=${SENT}>`,
  `javascript:${SENT}`,
  `JaVa\tScRiPt:${SENT}`,
  `data:text/html,<script>${SENT}</script>`,
  `{{constructor.constructor('${SENT}')()}}\${${SENT}}<%= ${SENT} %>#{${SENT}}`,
  'a\u0000b%00c\u0000',
  '‮evil.example‬⁦x⁩‏',
  '👨‍👩‍👧‍👦🏳️‍🌈‍​﻿  ',
  `%253Cimg%2520src%253Dx%2520onerror%253D${SENT}%253E`,
  `%3Cimg%20src%3Dx%20onerror%3D${SENT}%3E`,
  '//evil.example/x',
  '\\\\evil.example\\x',
  'https://evil.example/',
  '𐀀\ud800', // alleinstehender Surrogat
];
const rand = rng(SEED);
const RANDOM: string[] = Array.from({ length: 4 }, () => randomHostile(rand, 40));
const LONG_QUERY = 'A'.repeat(12_000); // Node-Testserver: Kopfzeilen höchstens 16 KB, deshalb 12 000 Zeichen in der Adresse …
const LONG_FIELD = 'Ä😀'.repeat(50_000); // … und 100 000 Zeichen in Feldern und im Hash (der Hash geht nicht an den Server).
const PAYLOADS = [...NAMED, ...RANDOM, LONG_QUERY];
/** Kleine Auswahl für die Breite (alle 15 Seiten); die Tiefe (alle Nutzlasten) läuft auf den Seiten mit Eingaben. */
const CORE = [NAMED[0]!, NAMED[1]!, NAMED[4]!, NAMED[7]!, NAMED[11]!, NAMED[13]!, RANDOM[0]!];

/** Schlüssel, die Seiten oder Skripte lesen könnten, plus übliche Weiterleitungs- und Prototyp-Schlüssel. */
const KEYS = ['d', 't', 'id', 'n', 'g', 'k', 'q', 'lang', 'locale', 'next', 'redirect', 'url', 'return', 'people', 'date', 'time', 'note', 'utm_source', 'debug', '__proto__[x]', 'constructor[prototype][x]', '__proto__.x', 'toString'];

const PAGES = {
  de: ['/de/', '/de/drinks/', '/de/besuch/', '/de/gruppe/', '/de/galerie/'],
  en: ['/en/', '/en/drinks/', '/en/visit/', '/en/group/', '/en/gallery/'],
  es: ['/es/', '/es/bebidas/', '/es/visita/', '/es/grupo/', '/es/galeria/'],
};
const ALL_PAGES = [...PAGES.de, ...PAGES.en, ...PAGES.es];
const INPUT_PAGES = ['/de/drinks/', '/de/besuch/', '/de/gruppe/', '/en/group/', '/es/bebidas/'];

interface Probe {
  dialogs: string[];
  errors: string[];
  violations: () => Promise<string[]>;
  foreign: string[];
  navigations: string[];
}

/** Hängt alle Beobachter an. `allowed` sind die Herkünfte, die Anfragen stellen dürfen (Testserver, Blob, Data). */
async function instrument(page: Page, allowed: string[]): Promise<Probe> {
  await page.addInitScript(() => {
    const w = window as unknown as { __csp: string[] };
    w.__csp = [];
    document.addEventListener('securitypolicyviolation', (event) => w.__csp.push(`${event.violatedDirective} ${event.blockedURI}`));
  });
  const probe: Probe = {
    dialogs: [],
    errors: [],
    foreign: [],
    navigations: [],
    violations: () => page.evaluate(() => (window as unknown as { __csp?: string[] }).__csp ?? []),
  };
  page.on('dialog', (dialog) => {
    probe.dialogs.push(`${dialog.type()}: ${dialog.message().slice(0, 80)}`);
    void dialog.dismiss();
  });
  page.on('pageerror', (error) => probe.errors.push(`pageerror: ${error.message.slice(0, 200)}`));
  page.on('console', (message) => {
    // „Failed to load resource“ (404 für gewollt unbekannte Pfade) ist kein Skriptfehler.
    if (message.type() === 'error' && !/Failed to load resource|Content Security Policy|ERR_/.test(message.text())) probe.errors.push(`console: ${message.text().slice(0, 200)}`);
  });
  page.on('request', (request) => {
    const url = request.url();
    if (/^(data|blob|about):/.test(url)) return;
    if (!allowed.includes(new URL(url).origin)) probe.foreign.push(url.slice(0, 120));
  });
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame() && !frame.url().startsWith('about:')) probe.navigations.push(frame.url());
  });
  // Nichts verlässt den Rechner: fremde Herkünfte werden abgewiesen (und oben gezählt).
  await page.route(
    (url) => !allowed.includes(url.origin) && !/^(data|blob|about):/.test(url.protocol),
    (route) => route.abort('blockedbyclient'),
  );
  return probe;
}

/** DOM-Scan im Seitenkontext: Ereignisattribute, gefährliche Ziele, Fremdziele, Skripte, Frames. */
const scanDom = (): string[] => {
  const bad: string[] = [];
  const dangerousUrl = /^(javascript|vbscript|data:text\/html)/i;
  for (const el of document.querySelectorAll('*')) {
    for (const attr of el.attributes) {
      if (/^on/i.test(attr.name)) bad.push(`${el.tagName.toLowerCase()}[${attr.name}]`);
      const value = attr.value;
      if (/^(href|src|action|formaction|xlink:href|data|poster|srcdoc|ping)$/i.test(attr.name) && dangerousUrl.test(value.replace(/[\u0000- ]/g, ''))) bad.push(`${el.tagName.toLowerCase()}[${attr.name}]=${value.slice(0, 40)}`);
      if (/evil\.example|__pwned/.test(value)) bad.push(`${el.tagName.toLowerCase()}[${attr.name}] enthält Nutzlast: ${value.slice(0, 60)}`);
    }
  }
  for (const el of document.querySelectorAll('iframe,object,embed,base,meta[http-equiv],frame,applet')) bad.push(`unerwartetes Element ${el.tagName.toLowerCase()}`);
  for (const script of document.scripts) if (!script.src && /__pwned|evil\.example/.test(script.textContent ?? '') && !/json/.test(script.type)) bad.push('Skript mit Nutzlast');
  // Mehr als die Seite je enthält: ein <img src="x"> o. ä. wäre eingeschleust.
  for (const img of document.querySelectorAll('img')) if (/^(x|\/\/|https?:)/i.test(img.getAttribute('src') ?? '') && !/^https?:\/\/127\.0\.0\.1/.test(img.getAttribute('src') ?? '')) bad.push(`img[src]=${img.getAttribute('src')}`);
  const proto = Object.keys(Object.prototype);
  if (proto.length > 0) bad.push(`Object.prototype verändert: ${proto.join(',')}`);
  if (({} as Record<string, unknown>).x !== undefined || ({} as Record<string, unknown>).polluted !== undefined) bad.push('Prototyp-Verschmutzung (x)');
  if ((window as unknown as { __pwned?: unknown }).__pwned !== undefined) bad.push('window.__pwned gesetzt: Skript wurde ausgeführt');
  return bad;
};

/** Fordert von jeder Prüfung dasselbe: sauber, seitenintern funktionsfähig, nichts verlassen. */
async function expectClean(page: Page, probe: Probe, label: string, opts: { csp: boolean; origin: string }): Promise<void> {
  const bad = await page.evaluate(scanDom);
  expect(bad, `${label}: DOM`).toEqual([]);
  expect(probe.dialogs, `${label}: Dialoge`).toEqual([]);
  expect(probe.errors, `${label}: Fehler`).toEqual([]);
  expect(probe.foreign, `${label}: Anfragen an fremde Herkünfte`).toEqual([]);
  for (const url of probe.navigations) expect(new URL(url).origin, `${label}: Navigation ${url.slice(0, 80)}`).toBe(opts.origin);
  if (opts.csp) expect(await probe.violations(), `${label}: CSP-Verstöße`).toEqual([]);
}

/** Seite bleibt benutzbar: Überschrift sichtbar, Hauptbereich vorhanden. */
async function expectUsable(page: Page, label: string): Promise<void> {
  await expect(page.locator('main'), label).toBeVisible();
  await expect(page.locator('h1').first(), label).toBeVisible();
}

const urlWith = (path: string, entries: [string, string][], hash = ''): string => {
  const params = new URLSearchParams();
  for (const [key, value] of entries) params.append(key, value);
  return `${path}?${params.toString()}${hash ? `#${hash}` : ''}`;
};

// ------------------------------------------------------------------ (1) URL-Parameter

for (const csp of [true, false] as const) {
  test.describe(`(1) URL-Parameter, CSP ${csp ? 'aktiv' : 'umgangen'}`, () => {
    test.use({ baseURL: ORIGIN.public, bypassCSP: !csp });

    for (const path of ALL_PAGES) {
      const payloads = INPUT_PAGES.includes(path) ? PAYLOADS : CORE;
      test(`${path}: ${payloads.length} Nutzlasten in allen Schlüsseln, Hash und Duplikaten`, async ({ page }) => {
        const probe = await instrument(page, [ORIGIN.public]);
        for (const [index, payload] of payloads.entries()) {
          const long = payload === LONG_QUERY;
          const keys = long ? ['q'] : KEYS;
          const url = urlWith(path, keys.map((key) => [key, payload]), long ? LONG_FIELD : payload.slice(0, 200));
          const response = await page.goto(url);
          expect(response?.status(), `${index}: Status`).toBe(200);
          await expectUsable(page, `${path} #${index}`);
          await expectClean(page, probe, `${path} #${index}`, { csp, origin: ORIGIN.public });
        }
        // Parameter-Duplikate und doppelt kodierte Werte ändern nichts am Ergebnis.
        const dup = `${path}?d=2030-01-01&d=${encodeURIComponent(NAMED[0]!)}&t=21:00&t=${encodeURIComponent(encodeURIComponent(NAMED[1]!))}&id=${encodeURIComponent(NAMED[2]!)}&q=a&q=b&k=x&k=y&g=free&g=${encodeURIComponent(NAMED[4]!)}`;
        await page.goto(dup);
        await expectUsable(page, `${path} Duplikate`);
        await expectClean(page, probe, `${path} Duplikate`, { csp, origin: ORIGIN.public });
      });
    }
  });
}

test.describe('(1) Vorschau-Build und Unterpfad', () => {
  test('Vorschau: Eingabeseiten mit Kernnutzlasten', async ({ page }) => {
    const probe = await instrument(page, [ORIGIN.preview]);
    for (const path of INPUT_PAGES) {
      // Die Getränkekarte (nur Vorschau) liest die meisten Parameter (g, k, q): sie bekommt alle Nutzlasten.
      for (const payload of path === '/de/drinks/' ? PAYLOADS : CORE) {
        await page.goto(urlWith(path, (payload === LONG_QUERY ? ['q'] : KEYS).map((key) => [key, payload]), payload.slice(0, 100)));
        await expectUsable(page, path);
        await expectClean(page, probe, `Vorschau ${path}`, { csp: true, origin: ORIGIN.preview });
      }
    }
  });

  test('Unterpfad /preview/app/: Kernnutzlasten, Sprachwahl und 404', async ({ page }) => {
    const probe = await instrument(page, [ORIGIN.sub]);
    for (const path of ['/preview/app/de/gruppe/', '/preview/app/en/drinks/', '/preview/app/']) {
      for (const payload of CORE) {
        await page.goto(ORIGIN.sub + urlWith(path, KEYS.map((key) => [key, payload]), payload.slice(0, 100)));
        await expectClean(page, probe, `Unterpfad ${path}`, { csp: true, origin: ORIGIN.sub });
      }
    }
  });

  test('404-Seite spiegelt weder Pfad noch Query', async ({ page }) => {
    const probe = await instrument(page, [ORIGIN.public]);
    for (const payload of CORE) {
      const encoded = encodeURIComponent(payload).slice(0, 300);
      const response = await page.goto(`${ORIGIN.public}/de/${encoded}?x=${encoded}#${encoded}`);
      expect(response?.status()).toBe(404);
      await expect(page.locator('h1').first()).toBeVisible();
      await expectClean(page, probe, '404', { csp: true, origin: ORIGIN.public });
      expect(await page.locator('body').innerText()).not.toContain('evil.example');
    }
  });

  test('Fehlerhafte Prozentkodierung im Pfad beendet den Testserver nicht (Regression)', async ({ request }) => {
    for (const path of ['/de/%E0%A4%A', '/%', '/de/%zz', '/%C0%AE%C0%AE/']) {
      const response = await request.get(`${ORIGIN.public}${path}`, { failOnStatusCode: false });
      expect([400, 404], path).toContain(response.status());
    }
    expect((await request.get(`${ORIGIN.public}/de/`)).status()).toBe(200);
  });
});

// ------------------------------------------------------------------ Planer: Link-Parameter, Teilen, Kopieren, ICS

async function stubShare(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { __shared: unknown[]; __copied: string[] };
    w.__shared = [];
    w.__copied = [];
    Object.defineProperty(navigator, 'share', { value: async (data: unknown) => void w.__shared.push(data), configurable: true });
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (text: string) => void w.__copied.push(text) }, configurable: true });
  });
}

/** Zeilenweise Prüfung der Kalenderdatei: nur erwartete Eigenschaften, keine eingeschleuste Zeile. */
function expectCleanIcs(ics: string, label: string): void {
  expect(ics.startsWith('BEGIN:VCALENDAR\r\n'), label).toBe(true);
  expect(ics.endsWith('END:VCALENDAR\r\n') || ics.endsWith('END:VCALENDAR'), label).toBe(true);
  expect(/[^\r]\n/.test(ics), `${label}: nackter Zeilenvorschub`).toBe(false);
  expect(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(ics), `${label}: Steuerzeichen`).toBe(false);
  const logical = ics.replace(/\r\n[ \t]/g, '').split('\r\n').filter(Boolean);
  const allowed = new Set(['BEGIN', 'END', 'VERSION', 'PRODID', 'CALSCALE', 'METHOD', 'UID', 'DTSTAMP', 'DTSTART', 'DTEND', 'SUMMARY', 'LOCATION', 'DESCRIPTION', 'URL']);
  for (const line of logical) expect(allowed.has(line.split(/[:;]/)[0]!), `${label}: unerwartete Eigenschaft in "${line.slice(0, 50)}"`).toBe(true);
  const count = (name: string) => logical.filter((line) => line.startsWith(`${name}:`)).length;
  expect(count('UID'), label).toBe(1);
  expect(count('DTSTART'), label).toBe(1);
  expect(logical.filter((line) => line.startsWith('BEGIN:VEVENT')).length, label).toBe(1);
  expect(logical.find((line) => line.startsWith('UID:')), label).toMatch(/^UID:chucca-meetup-[a-z0-9-]{8,80}@guest\.local$/);
  expect(/evil\.example|ATTACH|__pwned/i.test(logical.join('\n').replace(/URL:https:\/\/chucca\.example\S*/g, '')), `${label}: Nutzlast in der Datei`).toBe(false);
}

test.describe('(1)(2) Planer: hostile Link-Parameter, Teilen/Kopieren/ICS', () => {
  test.use({ baseURL: ORIGIN.public, bypassCSP: true });
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: new Date('2030-01-15T12:00:00Z') });
    await stubShare(page);
  });

  const HOSTILE_IDS = [
    'abcdefgh%0d%0aATTACH:http://evil.example/x',
    'abcdefgh%0aBEGIN:VALARM',
    '<img src=x onerror=window.__pwned=1>',
    'A'.repeat(500),
    '../../etc/passwd',
    'ab',
    '%00%00%00%00%00%00%00%00%00',
    'ABCDEFGHIJ', // Großbuchstaben passen nicht zum Muster
  ];

  for (const id of HOSTILE_IDS) {
    test(`id=${id.slice(0, 40)}: Kalenderdatei, Teilen-Text und Kopier-Text bleiben sauber`, async ({ page }) => {
      const probe = await instrument(page, [ORIGIN.public]);
      await page.goto(`/de/gruppe/?d=2030-02-01&t=21:00&id=${id}`);
      await expectUsable(page, 'Planer');
      expect(await page.getByLabel('Datum').inputValue()).toBe('2030-02-01');
      const downloadPromise = page.waitForEvent('download');
      await page.locator('[data-calendar]').click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toBe('chucca-meetup.ics');
      const path = await download.path();
      const ics = await readFile(path, 'utf8');
      expectCleanIcs(ics, `ICS id=${id.slice(0, 20)}`);
      // Teilen
      await page.locator('form button[type="submit"]').click();
      await expect.poll(() => page.evaluate(() => (window as unknown as { __shared: unknown[] }).__shared.length)).toBe(1);
      const shared = (await page.evaluate(() => (window as unknown as { __shared: { title: string; text: string; url?: string }[] }).__shared[0]))!;
      expect(`${shared.title}\n${shared.text}\n${shared.url ?? ''}`).not.toMatch(/evil\.example|__pwned|ATTACH|<img/);
      expect(shared.url ?? '').toMatch(/^https:\/\/chucca\.example\/de\/gruppe\/\?d=2030-02-01&t=21%3A00&id=[a-z0-9-]{8,80}$/);
      // Kopieren
      await page.locator('[data-copy]').click();
      await expect.poll(() => page.evaluate(() => (window as unknown as { __copied: string[] }).__copied.length)).toBe(1);
      const copied = await page.evaluate(() => (window as unknown as { __copied: string[] }).__copied[0]!);
      expect(copied).not.toMatch(/evil\.example|__pwned|ATTACH|<img|undefined|NaN|Invalid/);
      await expectClean(page, probe, `Planer id=${id.slice(0, 20)}`, { csp: false, origin: ORIGIN.public });
    });
  }

  test('Datum/Uhrzeit mit Grenz- und Randwerten: Fehler am Feld, nie NaN/Invalid Date/Ausnahme', async ({ page }) => {
    const probe = await instrument(page, [ORIGIN.public]);
    await page.goto('/de/gruppe/');
    const date = page.getByLabel('Datum');
    const time = page.getByLabel('Uhrzeit');
    const status = page.locator('[data-status]');
    const cases: { d: string; t: string; ok: boolean }[] = [
      { d: '0001-01-01', t: '12:00', ok: false },
      { d: '2024-02-29', t: '12:00', ok: false }, // Vergangenheit
      { d: '2100-12-31', t: '23:59', ok: true },
      { d: '2101-01-01', t: '00:00', ok: false },
      { d: '9999-12-31', t: '00:00', ok: false },
      { d: '275760-09-13', t: '00:00', ok: false },
      { d: '2030-03-31', t: '02:30', ok: false }, // Lücke bei Beginn der Sommerzeit
      { d: '2030-10-27', t: '02:30', ok: false }, // doppelte Stunde bei Ende der Sommerzeit: mehrdeutig, wird abgewiesen
      { d: '2030-02-01', t: '', ok: false },
      { d: '', t: '21:00', ok: false },
      { d: '2030-02-30', t: '21:00', ok: false }, // vom Eingabefeld verworfen
    ];
    for (const c of cases) {
      await page.evaluate(([d, t]) => {
        const dateField = document.querySelector<HTMLInputElement>('[name="date"]')!;
        const timeField = document.querySelector<HTMLInputElement>('[name="time"]')!;
        dateField.value = d!;
        timeField.value = t!;
        dateField.dispatchEvent(new Event('input', { bubbles: true }));
      }, [c.d, c.t]);
      await page.locator('[data-copy]').click();
      const ticket = await page.locator('[data-ticket]').innerText();
      expect(ticket, JSON.stringify(c)).not.toMatch(/NaN|Invalid|undefined/);
      if (c.ok) await expect(status).not.toHaveAttribute('data-kind', 'error');
      else await expect(status).toHaveAttribute('data-kind', 'error');
      void date;
      void time;
    }
    await expectClean(page, probe, 'Planer Randwerte', { csp: false, origin: ORIGIN.public });
  });
});

// ------------------------------------------------------------------ (2) Eingabefelder: Suche, Notiz, Personenzahl

const FIELD_PAYLOADS = [...NAMED, ...RANDOM, LONG_FIELD, 'a '.repeat(30_000), '\u0001\u0002\u0007\u001b[31m\u007f\u0085\u009f'];

// Die Getränkekarte hat nur der Vorschau-Build (im öffentlichen Build fehlen bestätigte Getränke, also auch das Suchfeld).
test.describe('(2) Suche (Getränkekarte, Vorschau-Build)', () => {
  test.use({ baseURL: ORIGIN.preview, bypassCSP: true });

  for (const path of ['/de/drinks/', '/en/drinks/', '/es/bebidas/']) {
    test(`${path}: Suchfeld mit ${FIELD_PAYLOADS.length} Nutzlasten, Zeit begrenzt, Adresse bleibt gültig`, async ({ page }) => {
      const probe = await instrument(page, [ORIGIN.preview]);
      await page.goto(path);
      const search = page.locator('[data-menu-search]');
      for (const [index, payload] of FIELD_PAYLOADS.entries()) {
        const started = Date.now();
        await search.fill(payload);
        await expect(page.locator('[data-menu-count]')).not.toBeEmpty();
        expect(Date.now() - started, `Nutzlast ${index}: Dauer`).toBeLessThan(5000);
        expect(await page.evaluate(() => document.querySelectorAll('[data-drink]:not([hidden])').length)).toBeGreaterThanOrEqual(0);
        const url = new URL(page.url());
        expect(url.origin).toBe(ORIGIN.preview);
        expect(url.pathname).toBe(path);
        await expectClean(page, probe, `Suche #${index}`, { csp: false, origin: ORIGIN.preview });
      }
      // Zurücksetzen stellt den Ausgangszustand wieder her.
      await search.fill('');
      expect(await page.evaluate(() => document.querySelectorAll('[data-drink]:not([hidden])').length)).toBeGreaterThan(0);
    });
  }
});

test.describe('(2) Gruppenanfrage (Notiz, Personenzahl, Datum/Uhrzeit) und Sendeweg', () => {
  test.use({ baseURL: ORIGIN.inquiry, bypassCSP: true });
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: new Date('2030-01-15T12:00:00Z') });
    await stubShare(page);
  });

  const HOST = 'inquiries.chucca-test.invalid';
  const NOTES = [...NAMED, ...RANDOM, LONG_FIELD.slice(0, 400), '{people} {date} {time} {note} $& $1 $` $\' ${x}', 'ZWJ 👩‍❤️‍👨 é ​'];

  test('Notiz-Nutzlasten: Ausgabetext, Kopier-Text und gesendete Daten (JSON, höchstens 140 Zeichen)', async ({ page }) => {
    const probe = await instrument(page, [ORIGIN.inquiry, `https://${HOST}`]);
    const bodies: string[] = [];
    await page.route(`https://${HOST}/**`, async (route) => {
      const request = route.request();
      const cors = { 'access-control-allow-origin': ORIGIN.inquiry, 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type' };
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
      bodies.push(request.postData() ?? '');
      return route.fulfill({ status: 200, headers: cors, body: '' });
    });
    await page.goto('/de/besuch/');
    const form = page.locator('[data-inquiry]');
    for (const [index, note] of NOTES.entries()) {
      await form.locator('[name="people"]').fill('6');
      await form.locator('[name="date"]').fill('2030-01-18');
      await form.locator('[name="time"]').fill('21:00');
      await form.locator('[name="note"]').fill(note);
      const stored = await form.locator('[name="note"]').inputValue(); // das Feld darf Zeilenumbrüche entfernen
      await form.locator('button[type="submit"]').click();
      const output = form.locator('[data-inquiry-output] textarea');
      await expect(output, `Notiz #${index}`).not.toHaveValue('');
      const value = await output.inputValue();
      expect(value, `Notiz #${index}`).toContain(stored.trim());
      expect(value, `Notiz #${index}: Platzhalter ersetzt`).not.toMatch(/\{(people|date|time|note)\}.*\{(people|date|time|note)\}.*\{note\}$/s);
      expect(value.split('\n').length).toBeLessThanOrEqual(3);
      // Senden: Nutzlast wird als JSON-Text übertragen, nie als Code ausgewertet.
      await form.locator('[data-inquiry-send]').click();
      await expect.poll(() => bodies.length, { message: `Notiz #${index}: gesendet` }).toBe(index + 1);
      const parsed = JSON.parse(bodies[index]!) as Record<string, unknown>;
      expect(Object.keys(parsed).sort(), `Notiz #${index}: Felder`).toEqual(stored.trim() ? ['date', 'locale', 'note', 'people', 'time'] : ['date', 'locale', 'people', 'time']);
      expect(typeof parsed.note === 'undefined' || [...(parsed.note as string)].length <= 140).toBe(true);
      expect(parsed.people).toBe(6);
      // Für den nächsten Durchlauf entsperren.
      await form.locator('[name="note"]').fill('');
    }
    await expectClean(page, probe, 'Anfrage-Notizen', { csp: false, origin: ORIGIN.inquiry });
  });

  test('Personenzahl: Randwerte werden abgewiesen, gültige erzeugen keinen NaN-Text', async ({ page }) => {
    const probe = await instrument(page, [ORIGIN.inquiry]);
    await page.goto('/de/besuch/');
    const form = page.locator('[data-inquiry]');
    const status = form.locator('[data-inquiry-status]');
    await form.locator('[name="date"]').fill('2030-01-18');
    await form.locator('[name="time"]').fill('21:00');
    const cases: [string, boolean][] = [['1', false], ['2', true], ['40', true], ['41', false], ['0', false], ['-5', false], ['2.5', false], ['1e1', true], ['1e400', false], ['', false], ['abc', false], ['99999999999999999999', false]];
    for (const [value, ok] of cases) {
      await page.evaluate((v) => {
        const field = document.querySelector<HTMLInputElement>('[name="people"]')!;
        field.value = v;
        field.dispatchEvent(new Event('input', { bubbles: true }));
      }, value);
      await form.locator('button[type="submit"]').click();
      if (ok) {
        await expect(form.locator('[data-inquiry-output]'), value).toBeVisible();
        expect(await form.locator('[data-inquiry-output] textarea').inputValue(), value).not.toMatch(/NaN|undefined|Infinity/);
      } else {
        await expect(status, value).toHaveAttribute('data-kind', 'error');
        await expect(form.locator('[data-inquiry-output]'), value).toBeHidden();
      }
    }
    await expectClean(page, probe, 'Personenzahl', { csp: false, origin: ORIGIN.inquiry });
  });
});

// ------------------------------------------------------------------ (3) Speicher-Manipulation

const BIG = 'x'.repeat(4_000_000);
const STORAGE_CASES: { name: string; session?: string; local?: Record<string, string> }[] = [
  { name: 'korruptes JSON', session: '{"date":"2030-', local: { 'chucca-taste': '{', 'chucca-locale': '{' } },
  { name: 'null', session: 'null', local: { 'chucca-taste': 'null', 'chucca-locale': 'null' } },
  { name: 'Array', session: '[]', local: { 'chucca-taste': '[]', 'chucca-locale': '["de"]' } },
  { name: 'Zahl', session: '42', local: { 'chucca-taste': '42' } },
  { name: 'falsche Typen', session: '{"date":1,"time":{},"uid":[]}' },
  { name: 'Prototyp-Schlüssel im Entwurf', session: '{"__proto__":{"date":"2030-02-01","time":"21:00"},"constructor":{"prototype":{"x":1}},"date":"","time":"","uid":"chucca-meetup-abcdefgh@guest.local"}' },
  { name: 'Prototyp-Schlüssel als Werte', local: { 'chucca-taste': '__proto__', 'chucca-locale': 'constructor' } },
  { name: 'Nutzlast in Datum/Kennung', session: JSON.stringify({ date: '<img src=x onerror=window.__pwned=1>', time: '"><svg/onload=1>', uid: 'chucca-meetup-abcdefgh@guest.local\r\nATTACH:http://evil.example' }) },
  { name: 'Kennung mit Zeilenumbruch', session: JSON.stringify({ date: '2030-02-01', time: '21:00', uid: 'chucca-meetup-abcdefgh@guest.local\nBEGIN:VALARM' }) },
  { name: 'riesige Werte (4 MB)', session: JSON.stringify({ date: BIG, time: '', uid: BIG }), local: { 'chucca-taste': BIG, 'chucca-locale': BIG } },
  { name: 'Steuerzeichen/RTL', session: '\u0000‮‍', local: { 'chucca-taste': '\u0000', 'chucca-locale': '‮ed' } },
  { name: 'gültiger Entwurf, ungültiger Geschmack', session: JSON.stringify({ date: '2030-02-01', time: '21:00', uid: 'chucca-meetup-abcdefgh@guest.local' }), local: { 'chucca-taste': 'bitter\u0000' } },
];

test.describe('(3) Manipulierter Speicher', () => {
  test.use({ baseURL: ORIGIN.public, bypassCSP: true });
  for (const c of STORAGE_CASES) {
    test(`${c.name}: alle Seitentypen laden robust`, async ({ page }) => {
      await page.clock.install({ time: new Date('2030-01-15T12:00:00Z') });
      const probe = await instrument(page, [ORIGIN.public]);
      await page.addInitScript(
        ([session, local]) => {
          // Quota darf scheitern; die Seite muss dann ohnehin funktionieren.
          try {
            if (session !== null) sessionStorage.setItem('chucca-plan-draft', session);
          } catch {
            /* Quota */
          }
          for (const [key, value] of Object.entries(JSON.parse(local ?? '{}') as Record<string, string>)) {
            try {
              localStorage.setItem(key, value);
            } catch {
              /* Quota */
            }
          }
        },
        [c.session ?? null, JSON.stringify(c.local ?? {})] as [string | null, string],
      );
      for (const path of ['/', '/de/', '/de/drinks/', '/de/besuch/', '/de/gruppe/', '/en/group/', '/es/bebidas/']) {
        await page.goto(path);
        // Die Sprachwahl darf bei gültigem Wert weiterleiten; ungültige Werte dürfen nichts bewirken.
        await page.waitForLoadState('load');
        await expect(page.locator('h1').first()).toBeVisible();
        await expectClean(page, probe, `${c.name} ${path}`, { csp: false, origin: ORIGIN.public });
        if (path === '/de/gruppe/') {
          const dateValue = await page.getByLabel('Datum').inputValue();
          expect(dateValue === '' || /^\d{4}-\d{2}-\d{2}$/.test(dateValue), `Datum "${dateValue.slice(0, 30)}"`).toBe(true);
          // Ein unbrauchbarer Entwurf darf das Planen nicht blockieren.
          await page.getByLabel('Datum').fill('2030-02-02');
          await page.getByLabel('Uhrzeit').fill('20:00');
          await page.locator('[data-copy]').click();
          await expect(page.locator('[data-ticket]')).not.toContainText(/NaN|Invalid|undefined/);
        }
      }
    });
  }

  test('Speicher wirft bei jedem Zugriff (Private Mode): Seiten bleiben benutzbar', async ({ page }) => {
    const probe = await instrument(page, [ORIGIN.public]);
    await page.addInitScript(() => {
      for (const name of ['localStorage', 'sessionStorage'] as const) {
        Object.defineProperty(window, name, {
          get() {
            throw new DOMException('denied', 'SecurityError');
          },
          configurable: true,
        });
      }
    });
    for (const path of ['/', '/de/drinks/', '/de/gruppe/', '/de/besuch/']) {
      await page.goto(path);
      await expectUsable(page, path);
      await expectClean(page, probe, `Speicher gesperrt ${path}`, { csp: false, origin: ORIGIN.public });
    }
  });
});

// ------------------------------------------------------------------ (4) Service Worker

test.describe('(4) Service Worker: Pfade und Cache-Schlüssel', () => {
  test.use({ baseURL: ORIGIN.public, serviceWorkers: 'allow' });

  test('unbekannte, hostile und überlange Pfade vergiften den Cache nicht', async ({ page, context, browserName }) => {
    const probe = await instrument(page, [ORIGIN.public]);
    await page.goto('/de/besuch/');
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.reload();
    await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

    const hostile = [
      '/de/besuch/?q=<script>window.__pwned=1</script>&next=//evil.example',
      '/de/besuch/?' + 'a=b&'.repeat(1500),
      '/de/%2e%2e/%2e%2e/etc/passwd',
      '/de/..%2f..%2fpackage.json',
      '/de/../de/besuch/',
      '/%2e%2e/',
      '/de/%00/',
      '/de/%E0%A4%A',
      '/' + 'x'.repeat(9000),
      '/_astro/../de/besuch/',
      '/_astro/nicht-vorhanden.js?x=1',
      '/sw.js/../de/',
      '//evil.example/x',
      '/\\evil.example/',
      '/de/besuch/index.html?<img src=x>',
      '/de/GRUPPE/',
    ];
    const outcomes: Record<string, number> = {};
    for (const path of hostile) {
      // Navigation (geht durch den Worker) und fetch (Teil-Anfrage der Seite).
      // Absolute Adresse: ein Pfad mit „//“ wäre sonst eine protokollrelative Adresse auf einen fremden Host.
      const response = await page.goto(ORIGIN.public + path).catch(() => null);
      outcomes[`nav ${path.slice(0, 30)}`] = response?.status() ?? -1;
      await page.waitForLoadState('load').catch(() => undefined);
      await page.goto('/de/besuch/'); // sicherer Ausgangspunkt für die Teil-Anfragen (die 404-Seite kann sich selbst neu laden)
      const status = await page.evaluate((p) => fetch(location.origin + p, { credentials: 'omit' }).then((r) => r.status).catch(() => -1), path);
      outcomes[`fetch ${path.slice(0, 30)}`] = status;
      const cross = await page.evaluate(() => fetch('http://127.0.0.1:1/x', { mode: 'no-cors' }).then(() => 'ok').catch(() => 'blocked'));
      expect(cross, 'Fremde Herkunft über die Seite erreichbar').toBe('blocked');
    }
    const cached = await page.evaluate(async () => {
      const out: { cache: string; url: string }[] = [];
      for (const name of await caches.keys()) for (const request of await (await caches.open(name)).keys()) out.push({ cache: name, url: request.url });
      return out;
    });
    expect(cached.length).toBeGreaterThan(5);
    for (const { cache, url } of cached) {
      const parsed = new URL(url);
      expect(parsed.origin, `Cache-Eintrag ${url}`).toBe(ORIGIN.public);
      expect(parsed.search, `Cache-Schlüssel ohne Query: ${url}`).toBe('');
      expect(parsed.hash).toBe('');
      expect(url, 'Pfad mit Punktsegment oder Prozentkodierung im Schlüssel').not.toMatch(/\/\.\.?(\/|$)|%2e|%2f|%5c|%00/i);
      expect(cache).toMatch(/^chucca-v4:\/:(assets|pages)-/);
    }
    // Gespeicherte Seiten müssen Kopien dessen sein, was der Server unter genau diesem Pfad liefert (keine Vergiftung durch Query oder Pfadform),
    // und es dürfen nicht mehr sein als erfolgreiche Navigationen (404-Antworten werden nie gespeichert).
    const pageEntries = cached.filter((entry) => entry.cache.includes(':pages-'));
    const successful = Object.entries(outcomes).filter(([key, status]) => key.startsWith('nav ') && status === 200).length + 2; // + Ausgangsseite und Neuladen
    expect(pageEntries.length, 'mehr Seiten gespeichert als erfolgreiche Navigationen').toBeLessThanOrEqual(successful);
    for (const entry of pageEntries) {
      const same = await page.evaluate(async ({ cache, url }) => {
        const stored = await (await (await caches.open(cache)).match(url))!.text();
        const fresh = await (await fetch(url, { cache: 'reload' })).text();
        return stored === fresh;
      }, entry);
      expect(same, `Cache-Kopie weicht vom Server ab: ${entry.url}`).toBe(true);
    }
    // Ein erfundener Pfad bekommt offline die neutrale Offline-Seite und nie eine zuvor gespeicherte fremde Seite.
    // Nur Chromium: `setOffline` erreicht in Playwright-Firefox die Netzanfragen des Service Workers nicht. Gemessen: die Navigation ist
    // `fromServiceWorker`, doch der `fetch(request)` im Worker gelingt (sonst käme sein Offline-Zweig mit Status 503); Antwort ist die echte
    // 404-Seite des Servers (404, „Diese Seite gibt es nicht“), obwohl die Seite selbst unter `setOffline` jede Anfrage mit NetworkError
    // abweist. In WebKit scheitert jede Navigation offline. Siehe docs/06_QA.md, „Browserübergreifend“ Befund 9.
    if (browserName === 'chromium') {
      await context.setOffline(true);
      await page.goto('/de/erfunden-offline/').catch(() => undefined);
      await expect(page.getByText('Du bist offline')).toBeVisible();
      await context.setOffline(false);
    } else {
      test.info().annotations.push({ type: 'offline', description: `nicht geprüft in ${browserName}: setOffline erreicht den Service Worker nicht (Befund 9)` });
    }
    expect(probe.dialogs).toEqual([]);
    expect(probe.foreign).toEqual([]);
    expect(await page.evaluate(() => (window as unknown as { __pwned?: unknown }).__pwned)).toBeUndefined();
    void outcomes;
  });

  test('Der Worker beantwortet keine Anfragen fremder Herkunft und keine Nicht-GET-Anfragen', async ({ page }) => {
    await page.goto('/de/besuch/');
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.reload();
    await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
    const src = await (await page.request.get('/sw.js')).text();
    // Die Regeln stehen im Quelltext: Herkunftsprüfung vor jeder Antwort, nur GET.
    expect(src).toMatch(/request\.method !== 'GET'\) return/);
    expect(src).toMatch(/url\.origin !== self\.location\.origin\) return/);
    // Browser: ein POST auf eine Seite geht am Worker vorbei zum Server (Testserver antwortet statisch) und wird nicht gespeichert.
    await page.evaluate(() => fetch('/de/besuch/?post=1', { method: 'POST', body: 'x' }).catch(() => undefined));
    const keys = await page.evaluate(async () => {
      const out: string[] = [];
      for (const name of await caches.keys()) for (const request of await (await caches.open(name)).keys()) out.push(`${request.method} ${request.url}`);
      return out;
    });
    expect(keys.filter((key) => !key.startsWith('GET '))).toEqual([]);
    expect(keys.filter((key) => key.includes('post=1'))).toEqual([]);
  });
});

// ------------------------------------------------------------------ (5) Open Redirect / Sprachwahl / Hash

async function settle(page: Page): Promise<void> {
  await page.waitForLoadState('load');
  await page.waitForTimeout(80); // eine mögliche Weiterleitung per location.replace() braucht einen Augenblick
}

test.describe('(5) Sprachwahl und Hash-Weiterleitungen führen nie extern', () => {
  test.use({ baseURL: ORIGIN.public });
  const HASHES = ['heute', 'HEUTE', 'drinks', 'besuch', 'galerie', 'gruppe', '__proto__', 'constructor', 'toString', 'hasOwnProperty', 'valueOf', '//evil.example', '\\evil.example', 'heute?next=//evil.example', 'heute/../../evil', '%68eute', 'heute%00', 'javascript:window.__pwned=1', '<img src=x onerror=1>', ''];
  const STORED = [null, 'de', 'en', 'es', 'DE', '__proto__', 'constructor', 'toString', '//evil.example', '\\evil.example', 'de/../../evil', 'https://evil.example', 'javascript:window.__pwned=1', 'de\u0000', ' de', 'x'.repeat(10_000)];
  const QUERIES = ['', '?next=//evil.example', '?next=https://evil.example&redirect=\\\\evil.example&url=//evil.example&lang=//evil.example&return=javascript:1'];

  for (const where of [
    { name: 'öffentlich', origin: ORIGIN.public, base: '/' },
    { name: 'Unterpfad', origin: ORIGIN.sub, base: '/preview/app/' },
  ]) {
    test(`${where.name}: Wurzelseite mit ${HASHES.length} Hashes, ${STORED.length} gespeicherten Sprachwerten und ${QUERIES.length} Queries (paarweise)`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.clock.install({ time: new Date('2030-01-15T12:00:00Z') }).catch(() => undefined);
      const probe = await instrument(page, [where.origin]);
      // Paarweise Abdeckung statt vollem Produkt: jeder Hash, jede gespeicherte Sprache und jede Query kommt mehrfach vor (feste Abfolge).
      const sample: [string, string | null, string][] = [];
      for (let i = 0; i < Math.max(HASHES.length, STORED.length); i++) sample.push([HASHES[i % HASHES.length]!, STORED[i % STORED.length]!, QUERIES[i % QUERIES.length]!]);
      for (const [i, stored] of STORED.entries()) sample.push(['besuch', stored, QUERIES[i % QUERIES.length]!]);
      for (const hash of HASHES) sample.push([hash, 'de', '']);
      for (const [hash, stored, query] of sample) {
        // Gespeicherte Sprache über ein Dokument derselben Herkunft setzen (kein Skript der Seite beteiligt), dann frisch laden:
        // about:blank dazwischen, damit der Wechsel keine reine Hash-Navigation ist und die Skripte der Seite wirklich laufen.
        await page.goto(`${where.origin}${where.base}robots.txt`);
        await page.evaluate((value) => {
          localStorage.clear();
          if (value !== null) localStorage.setItem('chucca-locale', value);
        }, stored);
        await page.goto('about:blank');
        await page.goto(`${where.origin}${where.base}${query}#${hash}`);
        await settle(page);
        const url = new URL(page.url());
        expect(url.origin, `Hash "${hash}" gespeichert "${String(stored).slice(0, 20)}" Query "${query.slice(0, 20)}"`).toBe(where.origin);
        expect(url.pathname.startsWith(where.base), url.pathname).toBe(true);
        expect(url.pathname).toMatch(/^(\/preview\/app)?\/((de|en|es)\/([a-z]+\/)?)?$/);
        await expectClean(page, probe, `Wurzel ${hash}`, { csp: true, origin: where.origin });
      }
      // Erwartetes Positivverhalten bleibt erhalten: gültige Sprache + Legacy-Hash leitet intern weiter.
      await page.goto(`${where.origin}${where.base}robots.txt`);
      await page.evaluate(() => localStorage.setItem('chucca-locale', 'en'));
      await page.goto('about:blank');
      await page.goto(`${where.origin}${where.base}#besuch`);
      await expect(page).toHaveURL(new RegExp(`${where.base}en/visit/$`));
    });
  }

  test('Sprachwechsel-Links tragen hostile Query/Hash nur auf die eigene Herkunft', async ({ page }) => {
    const probe = await instrument(page, [ORIGIN.public]);
    const entries: [string, string][] = KEYS.map((key) => [key, '//evil.example/\\evil.example']);
    for (const path of ['/de/drinks/', '/de/besuch/', '/de/gruppe/', '/de/']) {
      await page.goto(urlWith(path, entries, '//evil.example'));
      for (const lang of ['en', 'es']) {
        await page.goto(urlWith(path, entries, '//evil.example'));
        const link = page.locator(`[data-lang-link="${lang}"]:visible`).first();
        await link.click();
        await settle(page);
        const url = new URL(page.url());
        expect(url.origin).toBe(ORIGIN.public);
        expect(url.pathname.startsWith(`/${lang}/`)).toBe(true);
        await expectClean(page, probe, `Sprachwechsel ${path} -> ${lang}`, { csp: true, origin: ORIGIN.public });
      }
    }
  });

  test('404-Seite mit Sprach- und Weiterleitungs-Nutzlasten bleibt auf der Herkunft', async ({ page }) => {
    const probe = await instrument(page, [ORIGIN.public]);
    const paths = ['/de/nix?next=//evil.example#heute', '//evil.example/', '/\\evil.example', '/__proto__/', '/constructor/x', '/%2e%2e//evil.example'];
    for (const [index, path] of paths.entries()) {
      await page.goto(`${ORIGIN.public}/robots.txt`);
      await page.evaluate((value) => localStorage.setItem('chucca-locale', value), ['__proto__', '//evil.example', 'de', 'constructor'][index % 4]!);
      await page.goto('about:blank');
      await page.goto(`${ORIGIN.public}${path}`).catch(() => undefined);
      await settle(page);
      expect(new URL(page.url()).origin, path).toBe(ORIGIN.public);
      await expectClean(page, probe, `404 ${path}`, { csp: true, origin: ORIGIN.public });
    }
  });
});

// Hosts, die doppelte Schrägstriche zusammenfassen, liefern die Seite auch unter `//evil.example/de/gruppe/`. `location.pathname` beginnt dann mit
// `//`; als Adresse für history.replaceState() wäre das eine protokollrelative Adresse auf einen fremden Host. Der Testserver tut das nicht,
// deshalb liefert eine Route die echte Seite unter dem Doppelschrägstrich-Pfad aus.
test.describe('(1) Doppelschrägstrich-Pfad (Hosts, die // zusammenfassen)', () => {
  test.use({ baseURL: ORIGIN.preview });
  for (const [path, origin] of [['/de/gruppe/', ORIGIN.preview], ['/de/drinks/', ORIGIN.preview]] as const) {
    test(`${path}: replaceState bleibt auf der Herkunft, Seite funktioniert`, async ({ page }) => {
      const probe = await instrument(page, [origin]);
      const html = await readFile(`dist${path}index.html`, 'utf8');
      await page.route(`${origin}//evil.example${path}**`, (route) => route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html }));
      await page.goto(`${origin}//evil.example${path}?d=2030-02-01&t=21:00&q=Gin&g=free`);
      await expectUsable(page, path);
      expect(new URL(page.url()).pathname.startsWith('//evil.example/'), 'Route hat die Seite unter dem Doppelschrägstrich-Pfad ausgeliefert').toBe(true);
      await expect(page.locator('[data-planner], [data-menu]')).toHaveCount(1);
      expect(new URL(page.url()).origin).toBe(origin);
      await expectClean(page, probe, `Doppelschrägstrich ${path}`, { csp: true, origin });
      if (path === '/de/drinks/') {
        await page.locator('[data-menu-search]').fill('Gin');
        expect(new URL(page.url()).origin).toBe(origin);
      }
    });
  }
});

// ------------------------------------------------------------------ Selbsttest der Instrumentierung

test.describe('Selbsttest: der DOM-Scan erkennt eingeschleuste Inhalte', () => {
  test.use({ baseURL: ORIGIN.public, bypassCSP: true });
  test('Ereignisattribut, javascript:-Ziel, Fremdziel, iframe und Prototyp-Verschmutzung werden gemeldet', async ({ page }) => {
    await page.goto('/de/');
    expect(await page.evaluate(scanDom)).toEqual([]);
    await page.evaluate(() => {
      const box = document.createElement('div');
      box.innerHTML = '<img src=x onerror="1"><a href="java\tscript:1">a</a><a href="https://evil.example/">b</a><iframe></iframe>';
      document.body.append(box);
      (Object.prototype as Record<string, unknown>).polluted = 1;
    });
    const bad = await page.evaluate(scanDom);
    expect(bad.some((entry) => entry.includes('onerror'))).toBe(true);
    expect(bad.some((entry) => /java\s*script/.test(entry))).toBe(true);
    expect(bad.some((entry) => entry.includes('evil.example'))).toBe(true);
    expect(bad.some((entry) => entry.includes('iframe'))).toBe(true);
    expect(bad.some((entry) => entry.includes('Prototyp') || entry.includes('Object.prototype'))).toBe(true);
  });
});

// ------------------------------------------------------------------ (6) Header unter hostilen Anfragen

/** Rohe Anfrage ohne URL-Normalisierung (Node), damit `..` und Sonderzeichen unverändert beim Server ankommen. */
function rawGet(port: number, path: string): Promise<{ status: number; headers: Record<string, string | string[] | undefined>; body: string }> {
  return new Promise((resolve, reject) => {
    const req = httpRequest({ host: '127.0.0.1', port, path, method: 'GET', headers: { host: `127.0.0.1:${port}` } }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', reject);
    req.end();
  });
}

test.describe('(6) Header auf Antworten für hostile Anfragen', () => {
  const HOSTILE_PATHS = ['/de/?q=%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E', '/de/nix', '/..%2f..%2fpackage.json', '/%2e%2e/%2e%2e/etc/passwd', '/../../package.json', '/de/%00', '/' + 'y'.repeat(5000), '/sw.js', '/manifest.webmanifest', '/_astro/../../package.json', '//evil.example/', '/de/index.html/../../..//package.json'];

  for (const mode of [
    { name: 'öffentlich', port: PORT.public, dir: 'dist-public' },
    { name: 'Vorschau', port: PORT.preview, dir: 'dist' },
  ]) {
    test(`${mode.name}: Sicherheits-Header bleiben, nichts außerhalb des Ausgabeordners wird geliefert`, async () => {
      const pkg = await readFile('package.json', 'utf8');
      for (const path of HOSTILE_PATHS) {
        const res = await rawGet(mode.port, path);
        expect([200, 400, 404], `${path.slice(0, 40)} Status ${res.status}`).toContain(res.status);
        expect(res.body, 'Quelltext des Projekts ausgeliefert').not.toContain('"name": "chucca-app"');
        expect(res.body).not.toContain(pkg.slice(0, 40));
        expect(res.body).not.toMatch(/root:.*:0:0:/);
        if (res.status === 400) continue; // nur der Testserver, keine Header-Datei
        const h = res.headers;
        expect(h['x-content-type-options'], path).toBe('nosniff');
        expect(h['referrer-policy'], path).toBe('strict-origin-when-cross-origin');
        expect(String(h['permissions-policy']), path).toContain('camera=()');
        expect(h['cross-origin-opener-policy'], path).toBe('same-origin');
        const csp = String(h['content-security-policy']);
        expect(csp, path).toContain("default-src 'none'");
        expect(csp, path).toContain("frame-ancestors 'none'");
        expect(csp, path).toContain("object-src 'none'");
        expect(csp, path).toContain("base-uri 'none'");
        const scriptSrc = /script-src ([^;]*)/.exec(csp)?.[1] ?? '';
        expect(scriptSrc, path).not.toMatch(/unsafe-inline|unsafe-eval|\*|https?:|data:/);
        expect(csp, path).not.toMatch(/unsafe-eval/);
        if (/\.html?$|\/$|nix|q=|y{5}/.test(path) && res.status === 404) expect(res.body, 'Pfad im 404-Text gespiegelt').not.toContain('onerror');
      }
    });
  }

  // Der Rahmen muss von einer Seite OHNE eigene CSP aus eingebettet werden. Die Seiten der Anwendung tragen selbst `default-src 'none'`
  // (ohne `frame-src`), und damit verweigert schon die einbettende Seite jeden Rahmen: Einbettung in eine Anwendungsseite beweist
  // `frame-ancestors` nicht (so lief der Test zuerst, in allen drei Engines). Die Einbetter sind deshalb per Route bereitgestellte
  // Seiten ohne Header; Kontrollrahmen zeigt, dass das Werkzeug einen geladenen Rahmen erkennt.
  // Zustände der Engines, wenn der Zielrahmen verweigert wird (beobachtet): Chromium: Rahmen-URL `chrome-error://chromewebdata/`;
  // WebKit: Rahmen-URL bleibt die Zieladresse, Inhalt leer, Konsole „does not appear in the frame-ancestors directive“;
  // Firefox: Rahmen-URL leer, `evaluate` im Rahmen hängt, Konsole „blocked the loading of a resource (frame-ancestors)“.
  async function embed(page: Page, embedderUrl: string, target: string) {
    const consoleLines: string[] = [];
    page.on('console', (message) => consoleLines.push(message.text()));
    await page.route(embedderUrl, (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Einbetter</title><body>Einbetter ohne CSP</body>' }));
    await page.route('http://kontrolle.example/**', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>K</title><body>KONTROLLE-GELADEN</body>' }));
    await page.goto(embedderUrl);
    await page.evaluate((src) => {
      const frame = document.createElement('iframe');
      frame.src = src;
      document.body.append(frame);
    }, target);
    const state = async () => {
      const child = page.frames().find((frame) => frame !== page.mainFrame());
      if (!child) return { url: '(kein Rahmen)', text: '(kein Rahmen)', verdict: 'kein Rahmen' };
      const url = child.url();
      const text = await Promise.race([
        child.evaluate(() => document.body?.innerText ?? '').catch((error: unknown) => `(nicht lesbar: ${String(error).slice(0, 60)})`),
        new Promise<string>((resolve) => setTimeout(() => resolve('(keine Antwort aus dem Rahmen)'), 1500)),
      ]);
      const loaded = /KONTROLLE-GELADEN|CHUCCA/.test(text);
      const refused = !loaded && (url.startsWith('chrome-error:') || consoleLines.some((line) => /frame-ancestors/i.test(line)));
      return { url, text: text.slice(0, 60), verdict: loaded ? 'GELADEN' : refused ? 'verweigert' : 'offen' };
    };
    return { state, consoleLines };
  }

  const FRAME_CASES = [
    { name: 'fremde Herkunft (öffentlicher Stand)', embedder: 'http://einbetter.example/', target: `${ORIGIN.public}/de/` },
    { name: 'fremde Herkunft (Vorschau)', embedder: 'http://einbetter.example/', target: `${ORIGIN.preview}/de/` },
    { name: 'gleiche Herkunft (frame-ancestors \'none\' gilt auch dafür)', embedder: `${ORIGIN.public}/einbetter-fuzz`, target: `${ORIGIN.public}/de/` },
  ];

  test('Kontrolle: das Werkzeug erkennt einen geladenen fremden Rahmen', async ({ page }) => {
    const { state } = await embed(page, 'http://einbetter.example/', 'http://kontrolle.example/ok');
    await expect.poll(async () => (await state()).verdict, { timeout: 10_000 }).toBe('GELADEN');
  });

  for (const frameCase of FRAME_CASES) {
    test(`Einbettung wird vom Browser verweigert (frame-ancestors): ${frameCase.name}`, async ({ page }) => {
      const { state } = await embed(page, frameCase.embedder, frameCase.target);
      const seen: string[] = [];
      try {
        await expect
          .poll(async () => {
            const current = await state();
            seen.push(`${current.verdict} url=${current.url} text=${JSON.stringify(current.text)}`);
            return current.verdict;
          }, { timeout: 15_000 })
          .toBe('verweigert');
      } catch (error) {
        throw new Error(`Rahmen nie verweigert. Beobachtet je Schritt:\n${seen.slice(-12).join('\n')}\n${String(error)}`);
      }
      // Danach bleibt es verweigert: die Seite erscheint nie im Rahmen.
      await page.waitForTimeout(1000);
      expect((await state()).verdict).toBe('verweigert');
    });
  }

  test('Fremdes Skript, fremdes Bild und eingeschleuste Inline-Skripte blockt die CSP (Selbsttest der Instrumentierung)', async ({ page }) => {
    const probe = await instrument(page, [ORIGIN.public, 'https://evil.example']);
    await page.goto(`${ORIGIN.public}/de/`);
    const reports = await page.evaluate(async () => {
      const results: string[] = [];
      const add = (element: HTMLElement) => document.body.append(element);
      const script = document.createElement('script');
      script.textContent = 'window.__pwned=1';
      add(script);
      const external = document.createElement('script');
      external.src = 'https://evil.example/x.js';
      add(external);
      const img = document.createElement('img');
      img.src = 'https://evil.example/p.png';
      add(img);
      const div = document.createElement('div');
      div.innerHTML = '<img src=x onerror="window.__pwned=1">';
      add(div);
      await new Promise((resolve) => setTimeout(resolve, 300));
      results.push(String((window as unknown as { __pwned?: unknown }).__pwned));
      return results;
    });
    expect(reports[0]).toBe('undefined');
    const violations = await probe.violations();
    expect(violations.some((entry) => entry.startsWith('script-src'))).toBe(true);
    expect(violations.some((entry) => entry.startsWith('img-src'))).toBe(true);
  });
});
