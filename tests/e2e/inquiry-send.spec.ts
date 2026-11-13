/**
 * Optionaler Sendeweg der Gruppenanfrage (Aufgabe 18) – gegen den Testbuild `dist-inquiry` (npm run build:inquiry) mit dem
 * gekennzeichneten Test-Endpunkt `src/content/fixtures/inquiry.ts` (Host .invalid, löst nie auf). Die Anfragen an diesen Host
 * fängt ein Mock-Endpunkt (page.route) ab: Er beantwortet den CORS-Preflight, zählt jede Anfrage und liefert je Test
 * Status, Verzögerung, Hängen oder Netzfehler. Es verlässt nie eine echte Anfrage den Rechner. Grenze: Playwright beantwortet den
 * CORS-Preflight bei abgefangenen Anfragen selbst; die CORS-Freigabe des echten Endpunkts ist hier NICHT geprüft (docs/10_BETREIBER.md).
 *
 * Dazu Leak-Tests: Fixture, Marker und Test-Host dürfen in keinem regulären Build vorkommen; dort gibt es weder Senden-Knopf
 * noch geöffnete CSP, und eine Anfrage an den Test-Host wird vom Browser blockiert.
 */
import { readdir, readFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route } from '@playwright/test';
import { ORIGIN } from './ports';

const MARKER = 'TESTFIXTURE-INQUIRY';
const HOST = 'inquiries.chucca-test.invalid';
const ENDPOINT = `https://${HOST}/v1/group-inquiry`;
type L = 'de' | 'en' | 'es';
const LOCALES: L[] = ['de', 'en', 'es'];
const VISIT: Record<L, string> = { de: '/de/besuch/', en: '/en/visit/', es: '/es/visita/' };

/** Erwartete Kernaussagen je Sprache (aus src/i18n/*.ts, bewusst nicht importiert). */
const TEXT = {
  de: {
    button: 'Anfrage an CHUCCA senden',
    sending: 'Wird gesendet.',
    sent: /Deine Angaben wurden an CHUCCA übermittelt\. Das ist keine Reservierung und noch keine Zusage/,
    rejected: /CHUCCA hat die Anfrage nicht angenommen/,
    server: /Der Dienst von CHUCCA hat gerade einen Fehler\. Es ist nichts bestätigt/,
    timeout: /Keine Antwort innerhalb von 10 Sekunden\. Es ist unklar, ob die Anfrage angekommen ist/,
    offline: /Keine Verbindung zum Dienst von CHUCCA\. Es ist nichts bestätigt/,
    keeps: /Deine Eingaben sind noch da/,
    placeholder: /PLATZHALTER/,
    data: /Gesendet werden nur Personenzahl, Datum, Uhrzeit und deine Anmerkung/,
    prepare: 'Nachricht vorbereiten',
    copy: 'Text kopieren',
    note: 'Geburtstag',
  },
  en: {
    button: 'Send request to CHUCCA',
    sending: 'Sending.',
    sent: /Your details have been passed on to CHUCCA\. This is not a reservation and not yet a confirmation/,
    rejected: /CHUCCA did not accept the request/,
    server: /CHUCCA’s service has an error right now\. Nothing is confirmed/,
    timeout: /No answer within 10 seconds\. It is unclear whether the request arrived/,
    offline: /No connection to CHUCCA’s service\. Nothing is confirmed/,
    keeps: /Your entries are still here/,
    placeholder: /PLACEHOLDER/,
    data: /Only the number of people, date, time and your note/,
    prepare: 'Prepare message',
    copy: 'Copy text',
    note: 'Birthday',
  },
  es: {
    button: 'Enviar la solicitud a CHUCCA',
    sending: 'Enviando.',
    sent: /Tus datos se han transmitido a CHUCCA\. Esto no es una reserva ni una confirmación/,
    rejected: /CHUCCA no ha aceptado la solicitud/,
    server: /El servicio de CHUCCA tiene ahora un error\. No hay nada confirmado/,
    timeout: /Sin respuesta en 10 segundos\. No se sabe si la solicitud ha llegado/,
    offline: /Sin conexión con el servicio de CHUCCA\. No hay nada confirmado/,
    keeps: /Lo que has escrito sigue aquí/,
    placeholder: /MARCADOR/,
    data: /Solo se envían el número de personas, la fecha, la hora y tu comentario/,
    prepare: 'Preparar mensaje',
    copy: 'Copiar texto',
    note: 'Cumpleaños',
  },
} as const;

type Behavior =
  | { kind: 'status'; status: number; delayMs?: number }
  | { kind: 'hang' }
  | { kind: 'abort'; reason?: 'connectionfailed' | 'internetdisconnected' }
  /** Antwort erst nach `release()`; zeigt, dass vorher keine Erfolgsmeldung erscheint. */
  | { kind: 'gate'; status: number };

interface Recorded {
  method: string;
  headers: Record<string, string>;
  body: string;
}

/** Mock-Endpunkt: CORS-Antwort, Aufzeichnung jeder POST-Anfrage, steuerbares Verhalten. */
async function mockEndpoint(page: Page, initial: Behavior) {
  const state = { behavior: initial, posts: [] as Recorded[], other: [] as string[] };
  let open: (() => void) | undefined;
  const gate = new Promise<void>((resolve) => (open = resolve));
  const cors = { 'access-control-allow-origin': ORIGIN.inquiry, 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type', 'access-control-max-age': '0' };
  await page.route(`https://${HOST}/**`, async (route: Route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if (request.method() !== 'POST') {
      state.other.push(request.method());
      return route.fulfill({ status: 405, headers: cors });
    }
    state.posts.push({ method: request.method(), headers: await request.allHeaders(), body: request.postData() ?? '' });
    const b = state.behavior;
    if (b.kind === 'hang') return; // keine Antwort: der Browser muss selbst abbrechen
    if (b.kind === 'abort') return route.abort(b.reason ?? 'connectionfailed');
    if (b.kind === 'gate') {
      await gate;
      return route.fulfill({ status: b.status, headers: cors, body: '' });
    }
    if (b.delayMs) await new Promise((resolve) => setTimeout(resolve, b.delayMs));
    return route.fulfill({ status: b.status, headers: cors, body: b.status >= 400 ? '{"error":"x"}' : '' });
  });
  return { state, release: () => open?.() };
}

const form = (page: Page) => page.locator('[data-inquiry]');
const status = (page: Page) => page.locator('[data-inquiry-status]');
const sendButton = (page: Page) => page.locator('[data-inquiry-send]');

async function prepare(page: Page, locale: L, withNote = true) {
  const t = TEXT[locale];
  await page.goto(`${ORIGIN.inquiry}${VISIT[locale]}`);
  const f = form(page);
  await f.locator('[name="people"]').fill('8');
  await f.locator('[name="date"]').fill('2030-01-18');
  await f.locator('[name="time"]').fill('21:00');
  if (withNote) await f.locator('[name="note"]').fill(t.note);
  await f.getByRole('button', { name: t.prepare }).click();
  await expect(f.locator('[data-inquiry-output]')).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2030-01-15T12:00:00Z') });
});

test.describe('Sendeweg: Darstellung im Testbuild', () => {
  for (const locale of LOCALES) {
    test(`${locale}: Kennzeichnung, Senden-Knopf erst nach dem Vorbereiten, Datenhinweis, Platzhalter für den Datenschutztext`, async ({ page }) => {
      const mock = await mockEndpoint(page, { kind: 'status', status: 200 });
      const t = TEXT[locale];
      await page.goto(`${ORIGIN.inquiry}${VISIT[locale]}`);
      await expect(page.locator('[data-test-fixture]')).toContainText(MARKER);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
      // Vor dem Vorbereiten gibt es nichts zu senden.
      await expect(sendButton(page)).toBeHidden();
      await prepare(page, locale);
      await expect(sendButton(page)).toBeVisible();
      await expect(sendButton(page)).toHaveText(t.button);
      await expect(page.locator('[data-inquiry-data]')).toHaveText(t.data);
      await expect(page.locator('[data-inquiry-privacy]')).toHaveText(t.placeholder);
      // Vorbereiten allein sendet nichts.
      expect(mock.state.posts).toHaveLength(0);
      // Der Hinweistext widerspricht dem Sendeweg nicht („sendet nichts an CHUCCA“ entfällt).
      const main = await page.locator('main').innerText();
      expect(main).not.toMatch(/sendet nichts an CHUCCA|sends nothing to CHUCCA|no envía nada a CHUCCA/);
    });
  }

  test('Statuszeile vor dem Senden: „noch nicht gesendet“, kein Erfolg', async ({ page }) => {
    await mockEndpoint(page, { kind: 'status', status: 200 });
    await prepare(page, 'de');
    await expect(status(page)).toHaveText('Vorbereitet – noch nicht gesendet. Du kannst die Anfrage jetzt senden oder den Text selbst an CHUCCA schicken.');
  });
});

test.describe('Sendeweg: Erfolg nur nach 2xx, genau ein Versand', () => {
  for (const locale of LOCALES) {
    test(`${locale}: Nutzlast, Meldung „sending“, Erfolg erst nach der Antwort und ohne Reservierungsbehauptung`, async ({ page }) => {
      const mock = await mockEndpoint(page, { kind: 'gate', status: 200 });
      const t = TEXT[locale];
      await prepare(page, locale);
      await sendButton(page).click();
      await expect(status(page)).toHaveText(t.sending);
      await expect(sendButton(page)).toHaveAttribute('aria-disabled', 'true');
      await expect(form(page)).toHaveAttribute('aria-busy', 'true');
      // Noch keine Antwort: keine Erfolgsmeldung.
      expect(await status(page).textContent()).not.toMatch(t.sent);
      expect(mock.state.posts).toHaveLength(1);
      mock.release();
      await expect(status(page)).toHaveText(t.sent);
      await expect(status(page)).not.toHaveAttribute('data-kind', 'error');
      await expect(form(page)).not.toHaveAttribute('aria-busy', 'true');
      // Nutzlast: nur das Nötige, JSON, ohne Cookies und Referrer.
      const post = mock.state.posts[0]!;
      expect(JSON.parse(post.body)).toEqual({ people: 8, date: '2030-01-18', time: '21:00', note: t.note, locale });
      expect(post.headers['content-type']).toBe('application/json');
      expect(post.headers.cookie).toBeUndefined();
      expect(post.headers.referer).toBeUndefined();
      expect(post.headers.authorization).toBeUndefined();
      const visible = await page.locator('main').innerText();
      expect(visible).not.toMatch(/ist reserviert|Reservierung bestätigt|reservation confirmed|has been booked|reserva confirmada|reservado/i);
    });
  }

  test('ohne Anmerkung entfällt das Feld note; HTTP 204 gilt als Erfolg', async ({ page }) => {
    const mock = await mockEndpoint(page, { kind: 'status', status: 204 });
    await prepare(page, 'de', false);
    await sendButton(page).click();
    await expect(status(page)).toHaveText(TEXT.de.sent);
    expect(Object.keys(JSON.parse(mock.state.posts[0]!.body)).sort()).toEqual(['date', 'locale', 'people', 'time']);
  });

  test('Doppelklick und Klicks während des Sendens lösen genau EINE Anfrage aus', async ({ page }) => {
    const mock = await mockEndpoint(page, { kind: 'gate', status: 200 });
    await prepare(page, 'de');
    await sendButton(page).dblclick();
    await sendButton(page).click({ force: true });
    await page.keyboard.press('Enter');
    await expect(status(page)).toHaveText(TEXT.de.sending);
    expect(mock.state.posts).toHaveLength(1);
    mock.release();
    await expect(status(page)).toHaveText(TEXT.de.sent);
    // Nach dem Erfolg löst derselbe Knopf für dieselben Angaben nichts mehr aus.
    // Playwright behandelt aria-disabled als nicht bedienbar; ein echter Nutzer kann trotzdem klicken: erzwingen.
    await sendButton(page).click({ force: true });
    await sendButton(page).click({ force: true });
    await page.waitForTimeout(150);
    expect(mock.state.posts).toHaveLength(1);
    await expect(status(page)).toHaveText(TEXT.de.sent);
  });

  test('geänderte Angaben müssen neu vorbereitet werden; dann ist ein zweiter, bewusster Versand möglich', async ({ page }) => {
    const mock = await mockEndpoint(page, { kind: 'status', status: 200 });
    await prepare(page, 'de');
    await sendButton(page).click();
    await expect(status(page)).toHaveText(TEXT.de.sent);
    await form(page).locator('[name="people"]').fill('10');
    await expect(form(page).locator('[data-inquiry-output]')).toBeHidden();
    await expect(status(page)).toHaveText('');
    await form(page).getByRole('button', { name: 'Nachricht vorbereiten' }).click();
    await sendButton(page).click();
    await expect(status(page)).toHaveText(TEXT.de.sent);
    expect(mock.state.posts.map((p) => JSON.parse(p.body).people)).toEqual([8, 10]);
  });

  test('Felder sind während des Sendens schreibgeschützt und danach wieder bedienbar', async ({ page }) => {
    const mock = await mockEndpoint(page, { kind: 'gate', status: 200 });
    await prepare(page, 'de');
    await sendButton(page).click();
    for (const name of ['people', 'date', 'time', 'note']) await expect(form(page).locator(`[name="${name}"]`)).toHaveJSProperty('readOnly', true);
    mock.release();
    await expect(status(page)).toHaveText(TEXT.de.sent);
    for (const name of ['people', 'date', 'time', 'note']) await expect(form(page).locator(`[name="${name}"]`)).toHaveJSProperty('readOnly', false);
  });
});

test.describe('Sendeweg: Fehlerzustände bewahren die Eingabe und bieten den Rückfall', () => {
  const failures: { name: string; behavior: Behavior; key: 'rejected' | 'server' | 'timeout' | 'offline'; posts: number }[] = [
    { name: '4xx abgelehnt (400)', behavior: { kind: 'status', status: 400 }, key: 'rejected', posts: 1 },
    { name: '4xx abgelehnt (429)', behavior: { kind: 'status', status: 429 }, key: 'rejected', posts: 1 },
    { name: '5xx Serverfehler (500)', behavior: { kind: 'status', status: 500 }, key: 'server', posts: 1 },
    { name: '5xx Serverfehler (503)', behavior: { kind: 'status', status: 503 }, key: 'server', posts: 1 },
    { name: 'Netzfehler (Verbindung abgebrochen)', behavior: { kind: 'abort' }, key: 'offline', posts: 1 },
  ];
  for (const locale of LOCALES) {
    for (const failure of failures) {
      test(`${locale}: ${failure.name}`, async ({ page }) => {
        const mock = await mockEndpoint(page, failure.behavior);
        const t = TEXT[locale];
        await prepare(page, locale);
        await sendButton(page).click();
        await expect(status(page)).toHaveText(t[failure.key]);
        await expect(status(page)).toHaveAttribute('data-kind', 'error');
        await expect(status(page)).toHaveText(t.keeps);
        await expect(status(page)).not.toHaveText(t.sent);
        expect(mock.state.posts).toHaveLength(failure.posts);
        // Eingabe und vorbereiteter Text bleiben; der Kopierweg als Rückfall ist da.
        const f = form(page);
        await expect(f.locator('[name="people"]')).toHaveValue('8');
        await expect(f.locator('[name="date"]')).toHaveValue('2030-01-18');
        await expect(f.locator('[name="time"]')).toHaveValue('21:00');
        await expect(f.locator('[name="note"]')).toHaveValue(t.note);
        await expect(f.locator('[data-inquiry-output] textarea')).not.toHaveValue('');
        await expect(f.locator('[data-inquiry-output]')).toBeVisible();
        await expect(f.getByRole('button', { name: t.copy })).toBeVisible();
        // Der Knopf ist wieder frei (kein stilles Sperren nach einem Fehler).
        await expect(sendButton(page)).not.toHaveAttribute('aria-disabled', 'true');
      });
    }

    test(`${locale}: Timeout nach 10 Sekunden ohne Antwort`, async ({ page }) => {
      const mock = await mockEndpoint(page, { kind: 'hang' });
      const t = TEXT[locale];
      await prepare(page, locale);
      await sendButton(page).click();
      await expect(status(page)).toHaveText(t.sending);
      await expect.poll(() => mock.state.posts.length).toBe(1);
      await page.clock.fastForward(9_000);
      await expect(status(page)).toHaveText(t.sending);
      await page.clock.fastForward(1_500);
      await expect(status(page)).toHaveText(t.timeout);
      await expect(status(page)).toHaveAttribute('data-kind', 'error');
      await expect(form(page).locator('[name="note"]')).toHaveValue(t.note);
      await expect(form(page).locator('[data-inquiry-output] textarea')).not.toHaveValue('');
      await expect(form(page).getByRole('button', { name: t.copy })).toBeVisible();
      expect(mock.state.posts).toHaveLength(1);
    });

    test(`${locale}: offline (Browser ohne Verbindung) sendet gar nicht`, async ({ page, context }) => {
      const mock = await mockEndpoint(page, { kind: 'status', status: 200 });
      const t = TEXT[locale];
      await prepare(page, locale);
      await context.setOffline(true);
      await sendButton(page).click();
      await expect(status(page)).toHaveText(t.offline);
      await expect(status(page)).toHaveAttribute('data-kind', 'error');
      expect(mock.state.posts).toHaveLength(0);
      await expect(form(page).locator('[name="people"]')).toHaveValue('8');
      // Zurück online: erneutes Senden mit denselben, noch vorhandenen Angaben gelingt.
      await context.setOffline(false);
      await sendButton(page).click();
      await expect(status(page)).toHaveText(t.sent);
      expect(mock.state.posts).toHaveLength(1);
    });
  }

  test('nach einem Fehler ist ein bewusster zweiter Versand möglich; der Rückfall „Text kopieren“ funktioniert', async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as Window & { __copied?: string[] };
      w.__copied = [];
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (text: string) => void w.__copied?.push(text) }, configurable: true });
    });
    const mock = await mockEndpoint(page, { kind: 'status', status: 503 });
    await prepare(page, 'de');
    await sendButton(page).click();
    await expect(status(page)).toHaveText(TEXT.de.server);
    await form(page).getByRole('button', { name: 'Text kopieren' }).click();
    await expect(status(page)).toHaveText('Nachricht kopiert – noch nicht gesendet. Füge sie in deine Nachricht an CHUCCA ein.');
    const copied = await page.evaluate(() => (window as Window & { __copied?: string[] }).__copied?.[0]);
    expect(copied).toContain('mit 8 Personen am Freitag, 18. Januar 2030 um 21:00 Uhr');
    mock.state.behavior = { kind: 'status', status: 200 };
    await sendButton(page).click();
    await expect(status(page)).toHaveText(TEXT.de.sent);
    expect(mock.state.posts).toHaveLength(2);
    // Nach Erfolg bleibt die Erfolgsmeldung stehen, auch wenn danach kopiert wird.
    await form(page).getByRole('button', { name: 'Text kopieren' }).click();
    await expect(status(page)).toHaveText(TEXT.de.sent);
  });

  test('eine Antwort mit Weiterleitung (3xx) zählt nicht als Erfolg', async ({ page, browserName }) => {
    // Playwright-WebKit kann keine Antwort mit Weiterleitungsstatus nachbilden (route.fulfill: "Cannot fulfill with redirect status"); Werkzeug-Grenze, kein Produktbefund.
    test.skip(browserName === 'webkit', 'route.fulfill mit 3xx ist in Playwright-WebKit nicht möglich');
    const mock = await mockEndpoint(page, { kind: 'status', status: 302 });
    await prepare(page, 'de');
    await sendButton(page).click();
    await expect(status(page)).not.toHaveText('');
    await expect(status(page)).not.toHaveText(TEXT.de.sent);
    await expect(status(page)).toHaveAttribute('data-kind', 'error');
    expect(mock.state.posts).toHaveLength(1);
  });
});

test.describe('Sendeweg: Bedienbarkeit', () => {
  test('Tastatur: Fokusreihenfolge Kopieren → Senden, Senden per Enter/Leertaste, Status wird angesagt', async ({ page }) => {
    const mock = await mockEndpoint(page, { kind: 'status', status: 200 });
    await prepare(page, 'de');
    await expect(status(page)).toHaveAttribute('role', 'status');
    await form(page).getByRole('button', { name: 'Text kopieren' }).focus();
    await page.keyboard.press('Tab');
    await expect(sendButton(page)).toBeFocused();
    await page.keyboard.press('Space');
    await expect(status(page)).toHaveText(TEXT.de.sent);
    expect(mock.state.posts).toHaveLength(1);
    // Der Fokus bleibt beim Senden-Knopf (aria-disabled statt disabled).
    await expect(sendButton(page)).toBeFocused();
  });

  for (const locale of LOCALES) {
    test(`${locale}: axe (WCAG 2.0–2.2 A/AA) ohne Verstöße vor dem Senden und im Fehlerzustand`, async ({ page }) => {
      await mockEndpoint(page, { kind: 'status', status: 500 });
      await prepare(page, locale);
      const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
      const before = await new AxeBuilder({ page: page as never }).withTags(tags).analyze();
      expect(before.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
      await sendButton(page).click();
      await expect(status(page)).toHaveText(TEXT[locale].server);
      const after = await new AxeBuilder({ page: page as never }).withTags(tags).analyze();
      expect(after.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
    });
  }

  for (const width of [390, 1440]) {
    test(`kein Querscrollen und ausreichend große Ziele bei ${width} px im Fehlerzustand`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await mockEndpoint(page, { kind: 'status', status: 500 });
      await prepare(page, 'es');
      await sendButton(page).click();
      await expect(status(page)).toHaveText(TEXT.es.server);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      const box = await sendButton(page).boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    });
  }
});

test.describe('Sendeweg: CSP erlaubt genau diesen einen Host', () => {
  test('connect-src und form-action im Testbuild nennen den Host; sonstige Hosts bleiben gesperrt', async ({ page, request }) => {
    const headers = (await request.get(`${ORIGIN.inquiry}/de/besuch/`)).headers();
    const csp = headers['content-security-policy']!;
    expect(csp).toContain(`connect-src 'self' https://${HOST};`);
    expect(csp).toContain(`form-action https://${HOST};`);
    await mockEndpoint(page, { kind: 'status', status: 200 });
    await page.goto(`${ORIGIN.inquiry}/de/besuch/`);
    const result = await page.evaluate(async (host) => {
      const attempt = async (url: string) => {
        try {
          await fetch(url, { method: 'POST', mode: 'no-cors', body: '{}' });
          return 'durchgelassen';
        } catch {
          return 'blockiert';
        }
      };
      return { erlaubt: await attempt(`https://${host}/v1/group-inquiry`), fremd: await attempt('https://other.chucca-test.invalid/x'), sameHostHttp: await attempt(`http://${host}/v1/group-inquiry`) };
    }, HOST);
    expect(result).toEqual({ erlaubt: 'durchgelassen', fremd: 'blockiert', sameHostHttp: 'blockiert' });
  });

  test('der Sendeweg erzeugt keine CSP-Verstöße und keine Konsolenfehler', async ({ page }) => {
    const problems: string[] = [];
    page.on('console', (message) => message.type() === 'error' && problems.push(message.text()));
    page.on('pageerror', (error) => problems.push(error.message));
    await mockEndpoint(page, { kind: 'status', status: 200 });
    await prepare(page, 'en');
    await sendButton(page).click();
    await expect(status(page)).toHaveText(TEXT.en.sent);
    expect(problems).toEqual([]);
  });
});

test.describe('Reguläre Builds: Sendeweg AUS, nichts sichtbar anders', () => {
  const stands = [
    { name: 'Vorschau', origin: ORIGIN.preview },
    { name: 'öffentlich', origin: ORIGIN.public },
    { name: 'Unterpfad', origin: `${ORIGIN.sub}/preview/app` },
    { name: 'Zeiten-Fixture', origin: ORIGIN.hours },
  ];
  for (const stand of stands) {
    for (const locale of LOCALES) {
      test(`${stand.name} ${locale}: kein Senden-Knopf, keine Datenhinweise, keine Anfrage an den Test-Host, CSP strikt`, async ({ page, request }) => {
        const hits: string[] = [];
        await page.route(`https://${HOST}/**`, (route) => {
          hits.push(route.request().url());
          return route.abort();
        });
        const url = `${stand.origin}${VISIT[locale]}`;
        await page.goto(url);
        const f = form(page);
        await expect(f).not.toHaveAttribute('data-inquiry-origin', /.*/);
        await f.locator('[name="people"]').fill('8');
        await f.locator('[name="date"]').fill('2030-01-18');
        await f.locator('[name="time"]').fill('21:00');
        await f.locator('button[type="submit"]').click();
        await expect(f.locator('[data-inquiry-output]')).toBeVisible();
        await expect(page.locator('[data-inquiry-send], [data-inquiry-sendbox], [data-inquiry-privacy], [data-inquiry-data]')).toHaveCount(0);
        await expect(status(page)).toContainText({ de: 'noch nicht gesendet', en: 'not sent yet', es: 'aún no enviado' }[locale]);
        expect(await page.locator('main').innerText()).not.toMatch(/PLATZHALTER|PLACEHOLDER|MARCADOR/);
        const csp = (await request.get(url)).headers()['content-security-policy']!;
        expect(csp).toContain("connect-src 'self';");
        expect(csp).toContain("form-action 'none';");
        expect(csp).not.toContain('invalid');
        expect(hits).toEqual([]);
        // Selbst ein gezielter Versuch aus der Seite wird vom Browser blockiert.
        const attempt = await page.evaluate(async (target) => fetch(target, { method: 'POST', mode: 'no-cors', body: '{}' }).then(() => 'durchgelassen', () => 'blockiert'), ENDPOINT);
        expect(attempt).toBe('blockiert');
        expect(hits).toEqual([]);
      });
    }
  }
});

test.describe('Test-Fixture gelangt nie in reguläre Builds', () => {
  const walk = async (dir: URL): Promise<URL[]> => {
    const out: URL[] = [];
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) out.push(...(await walk(new URL(`${entry.name}/`, dir))));
      else if (/\.(html|js|css|json|webmanifest|txt|xml|ics)$/.test(entry.name) || entry.name === '_headers') out.push(new URL(entry.name, dir));
    }
    return out;
  };
  for (const dir of ['dist', 'dist-public', 'dist-sub', 'dist-hours']) {
    test(`${dir}: weder Kennung noch Test-Host noch Sendeweg-Hooks in irgendeiner Datei`, async () => {
      const files = await walk(new URL(`../../${dir}/`, import.meta.url));
      expect(files.length).toBeGreaterThan(20);
      for (const file of files) {
        const text = await readFile(file, 'utf8');
        expect(text, file.pathname).not.toContain(MARKER);
        expect(text, file.pathname).not.toContain('chucca-test.invalid');
        expect(text, file.pathname).not.toContain('data-inquiry-origin');
        // Das Skript kennt den Knopf als Selektor (inaktiver Code); im HTML darf er nirgends stehen.
        if (file.pathname.endsWith('.html')) expect(text, file.pathname).not.toContain('data-inquiry-send');
        // Der Datenhinweis- und Erfolgstext gehört nur in Builds mit Endpunkt.
        expect(text, file.pathname).not.toContain('Deine Angaben wurden an CHUCCA übermittelt');
        expect(text, file.pathname).not.toContain('PLATZHALTER, vom Betrieb');
      }
    });
  }
  test('dist-inquiry trägt die Kennung (Test sucht am richtigen Ort), bleibt Vorschau und öffnet die CSP nur für den Test-Host', async () => {
    const html = await readFile(new URL('../../dist-inquiry/de/besuch/index.html', import.meta.url), 'utf8');
    expect(html).toContain(MARKER);
    expect(html).toContain('noindex');
    expect(html).toContain(`data-inquiry-origin="https://${HOST}"`);
    expect(await readFile(new URL('../../dist-inquiry/robots.txt', import.meta.url), 'utf8')).toContain('Disallow: /');
    const headers = await readFile(new URL('../../dist-inquiry/_headers', import.meta.url), 'utf8');
    expect(headers.match(/chucca-test\.invalid/g)).toHaveLength(2);
    // Andere Seiten tragen den Sendeweg nicht (nur „Besuch“ hat das Formular).
    const today = await readFile(new URL('../../dist-inquiry/de/index.html', import.meta.url), 'utf8');
    expect(today).not.toContain('data-inquiry-origin');
  });
});
