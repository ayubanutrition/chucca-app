import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { ORIGIN } from './ports';

/** Simuliert Geräte ohne Teilen-Menü bzw. mit kontrolliertem Verhalten. */
async function stubSharing(page: Page, mode: 'none' | 'share-ok' | 'share-abort' | 'clipboard-ok' | 'clipboard-fail') {
  await page.addInitScript((kind) => {
    const w = window as Window & { __shared?: unknown[]; __copied?: string[] };
    w.__shared = [];
    w.__copied = [];
    const share =
      kind === 'share-ok'
        ? async (data: unknown) => void w.__shared?.push(data)
        : kind === 'share-abort'
          ? async () => {
              throw new DOMException('cancelled', 'AbortError');
            }
          : undefined;
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    const clipboard =
      kind === 'clipboard-ok'
        ? { writeText: async (text: string) => void w.__copied?.push(text) }
        : kind === 'clipboard-fail'
          ? { writeText: async () => Promise.reject(new DOMException('denied', 'NotAllowedError')) }
          : undefined;
    Object.defineProperty(navigator, 'clipboard', { value: clipboard, configurable: true });
  }, mode);
}

test.describe('Gruppenplaner', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: new Date('2030-01-15T12:00:00Z') });
  });

  test('meldet Eingabefehler am richtigen Feld und erholt sich', async ({ page }) => {
    await page.goto('/de/gruppe/');
    const date = page.getByLabel('Datum');
    const time = page.getByLabel('Uhrzeit');
    const status = page.locator('[data-status]');
    await page.getByRole('button', { name: 'Im Kalender speichern' }).click();
    await expect(status).toContainText('gültiges Datum');
    await expect(date).toHaveAttribute('aria-invalid', 'true');
    await expect(date).toHaveAttribute('aria-describedby', 'plan-zone plan-status');
    await expect(date).toBeFocused();
    await date.fill('2030-01-15');
    await page.getByRole('button', { name: 'Im Kalender speichern' }).click();
    await expect(status).toContainText('gültige Treffzeit');
    await expect(time).toBeFocused();
    await time.fill('12:30'); // 12:30 Madrid liegt vor 13:00 Madrid (= 12:00 UTC)
    await page.getByRole('button', { name: 'Im Kalender speichern' }).click();
    await expect(status).toContainText('Vergangenheit');
    await date.fill('2030-03-31');
    await time.fill('02:30');
    await page.getByRole('button', { name: 'Im Kalender speichern' }).click();
    await expect(status).toContainText('Zeitumstellung');
    await time.fill('20:00');
    await expect(status).toHaveText('');
    await expect(time).not.toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('[data-ticket-date]')).toHaveText('Sonntag, 31. März 2030');
  });

  test('zeigt Ortszeit Mallorca und die abweichende Gerätezeit', async ({ page }) => {
    await page.goto('/de/gruppe/');
    await page.getByLabel('Datum').fill('2030-01-16');
    await page.getByLabel('Uhrzeit').fill('20:00');
    await expect(page.locator('[data-ticket-time]')).toHaveText('20:00');
    await expect(page.locator('[data-ticket-device]')).toContainText('19:00'); // Testgerät steht auf Europe/London
  });

  test('erzeugt eine gültige Kalenderdatei mit stabiler Kennung für denselben Entwurf', async ({ page }) => {
    await page.goto('/de/gruppe/');
    await page.getByLabel('Datum').fill('2030-01-16');
    await page.getByLabel('Uhrzeit').fill('20:00');
    const download = async () => {
      const [file] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Kalender|calendar/i }).click()]);
      expect(file.suggestedFilename()).toBe('chucca-meetup.ics');
      return (await readFile(await file.path(), 'utf8')).replace(/\r\n /g, '');
    };
    const first = await download();
    expect(first).toContain('DTSTART:20300116T190000Z');
    expect(first).toContain('DTEND:20300116T210000Z');
    expect(first).toContain('SUMMARY:CHUCCA · Treffen');
    expect(first).toContain('Carrer del Llaüt 23');
    expect(first).toContain('keine Reservierung');
    await expect(page.locator('[data-status]')).toContainText('Kalenderdatei erstellt');
    const uid = (text: string) => text.match(/^UID:(.+)$/m)?.[1];
    expect(uid(await download())).toBe(uid(first));
    // Sprachwechsel: derselbe Entwurf, dieselbe Kennung.
    await page.locator('.langs').getByRole('link', { name: /EN/ }).click();
    await expect(page.getByLabel('Meeting time')).toHaveValue('20:00');
    await expect(page.locator('[data-incoming]')).toBeHidden(); // eigener Plan, kein „über einen Link geöffnet“
    const english = await download();
    expect(uid(english)).toBe(uid(first));
    expect(english).toContain('SUMMARY:CHUCCA · Meetup');
    // Änderung der Zeit: neuer Plan.
    await page.getByLabel('Meeting time').fill('21:00');
    expect(uid(await download())).not.toBe(uid(first));
  });

  test('natives Teilen: Erfolg nur nach Abschluss, Abbruch ohne Meldung', async ({ page }) => {
    await stubSharing(page, 'share-ok');
    await page.goto('/de/gruppe/');
    await page.getByLabel('Datum').fill('2030-01-16');
    await page.getByLabel('Uhrzeit').fill('20:00');
    await page.getByRole('button', { name: 'Einladung teilen' }).click();
    await expect(page.locator('[data-status]')).toHaveText('Einladung geteilt.');
    const shared = await page.evaluate(() => (window as Window & { __shared?: { text: string; url: string }[] }).__shared?.[0]);
    expect(shared?.text).toContain('CHUCCA · Mittwoch, 16. Januar 2030 · 20:00 Uhr (Ortszeit Mallorca)');
    expect(shared?.text).toContain('keine Reservierung');
    expect(shared?.url).toContain('google.com/maps');
    expect(JSON.stringify(shared)).not.toContain('127.0.0.1'); // private Vorschau: kein Link auf die Seite
  });

  test('Abbruch des Teilens zeigt weder Erfolg noch Fehler', async ({ page }) => {
    await stubSharing(page, 'share-abort');
    await page.goto('/de/gruppe/');
    await page.getByLabel('Datum').fill('2030-01-16');
    await page.getByLabel('Uhrzeit').fill('20:00');
    await page.getByRole('button', { name: 'Einladung teilen' }).click();
    await expect(page.locator('[data-status]')).toHaveText('');
    await expect(page.locator('[data-manual]')).toBeHidden();
  });

  test('ohne Teilen: Zwischenablage; scheitert auch sie: Text zum manuellen Kopieren', async ({ page }) => {
    await stubSharing(page, 'clipboard-ok');
    await page.goto('/es/grupo/');
    await page.getByLabel('Fecha').fill('2030-01-16');
    await page.getByLabel('Hora', { exact: true }).fill('20:00');
    await page.getByRole('button', { name: 'Compartir invitación' }).click();
    await expect(page.locator('[data-status]')).toHaveText('Invitación copiada.');
    const copied = await page.evaluate(() => (window as Window & { __copied?: string[] }).__copied?.[0]);
    expect(copied).toContain('miércoles, 16 de enero de 2030 · 20:00 (hora de Mallorca)');
    expect(copied).toContain('no una reserva');
  });

  test('manuelles Kopieren als letzter Ausweg', async ({ page }) => {
    await stubSharing(page, 'clipboard-fail');
    await page.goto('/en/group/');
    await page.getByLabel('Date').fill('2030-01-16');
    await page.getByLabel('Meeting time').fill('20:00');
    await page.getByRole('button', { name: 'Copy invitation' }).click();
    const manual = page.getByLabel('Text to copy');
    await expect(manual).toBeVisible();
    await expect(manual).toBeFocused();
    await expect(manual).toHaveValue(/Wednesday,? 16 January 2030 · 20:00 \(Mallorca local time\)[\s\S]*not a reservation[\s\S]*google\.com\/maps/);
    await expect(page.locator('[data-status]')).toHaveText('');
  });

  test('Einladungslink öffnet den Plan; ungültige Parameter werden ignoriert', async ({ page }) => {
    await page.goto('/de/gruppe/?d=2030-02-01&t=21:15&id=abc12345-test');
    await expect(page.locator('[data-incoming]')).toContainText('Ihr trefft euch am Freitag, 1. Februar 2030 um 21:15 Uhr.');
    await expect(page.getByLabel('Uhrzeit')).toHaveValue('21:15');
    // Der Link wird übernommen und aus der Adresse entfernt; eigene Änderungen überstehen das Neuladen.
    await expect(page).toHaveURL(/\/de\/gruppe\/$/);
    await page.getByLabel('Uhrzeit').fill('22:00');
    await page.reload();
    await expect(page.getByLabel('Uhrzeit')).toHaveValue('22:00');
    await expect(page.locator('[data-incoming]')).toBeHidden();
    await page.evaluate(() => sessionStorage.clear());
    await page.goto('/de/gruppe/?d=<svg/onload=1>&t=99:99');
    await expect(page.locator('[data-incoming]')).toBeHidden();
    await expect(page.locator('[data-ticket-time]')).toHaveText('–:–');
    await expect(page.locator('script:not([src]):not([type])')).toHaveCount(0);
  });
});

test.describe('Besuch', () => {
  test('Treffpunkt teilen und Adresse kopieren mit ehrlichen Rückmeldungen', async ({ page }) => {
    await stubSharing(page, 'clipboard-ok');
    await page.goto('/de/besuch/');
    await page.getByRole('button', { name: 'Adresse kopieren' }).click();
    await expect(page.locator('[data-place-status]')).toHaveText('Adresse kopiert.');
    expect(await page.evaluate(() => (window as Window & { __copied?: string[] }).__copied?.[0])).toBe('CHUCCA · Riu Center, Carrer del Llaüt 23, 07610 Palma, Mallorca');
    await page.getByRole('button', { name: 'Treffpunkt teilen' }).click();
    await expect(page.locator('[data-place-status]')).toContainText('Treffpunkt kopiert');
  });

  test('ohne Teilen und Zwischenablage erscheint der Text zum Kopieren', async ({ page }) => {
    await stubSharing(page, 'none');
    await page.goto('/de/besuch/');
    await page.getByRole('button', { name: 'Treffpunkt teilen' }).click();
    await expect(page.getByLabel('Text zum Kopieren')).toHaveValue(/Treffpunkt: CHUCCA[\s\S]*google\.com\/maps/);
  });

  test('zeigt keine unbestätigten Öffnungszeiten oder Kontaktwege', async ({ page }) => {
    await page.goto('/de/besuch/');
    await expect(page.getByText('noch nicht bestätigt, deshalb zeigen wir hier keine')).toBeVisible();
    const body = await page.locator('body').innerText();
    expect(body).not.toMatch(/631|info@chucca|19[:.]00|20[:.]00/);
    await expect(page.getByText('vor Ort noch nicht bestätigt')).toBeVisible();
    await expect(page.getByRole('img', { name: /Schematische Skizze/ })).toBeVisible();
  });

  test('Gruppennachricht wird nur vorbereitet – nie als gesendet oder reserviert gemeldet', async ({ page }) => {
    await page.clock.install({ time: new Date('2030-01-15T12:00:00Z') });
    await stubSharing(page, 'clipboard-ok');
    const requests: string[] = [];
    page.on('request', (request) => request.method() !== 'GET' && requests.push(request.url()));
    await page.goto('/de/besuch/');
    const form = page.locator('[data-inquiry]');
    await form.getByLabel('Personen').fill('1');
    await form.getByRole('button', { name: 'Nachricht vorbereiten' }).click();
    await expect(form.locator('[data-inquiry-status]')).toContainText('zwischen 2 und 40');
    await expect(form.getByLabel('Personen')).toBeFocused();
    await form.getByLabel('Personen').fill('8');
    await form.getByRole('button', { name: 'Nachricht vorbereiten' }).click();
    await expect(form.locator('[data-inquiry-status]')).toContainText('gültiges Datum');
    await form.getByLabel('Datum').fill('2030-01-18');
    await form.getByLabel('Uhrzeit').fill('21:00');
    await form.getByLabel('Anmerkung (optional)').fill('Geburtstag');
    await form.getByRole('button', { name: 'Nachricht vorbereiten' }).click();
    await expect(form.locator('[data-inquiry-status]')).toHaveText('Vorbereitet – noch nicht gesendet. Schick den Text selbst an CHUCCA.');
    await expect(form.getByLabel('Deine vorbereitete Nachricht')).toHaveValue('Hallo CHUCCA, wir würden gern mit 8 Personen am Freitag, 18. Januar 2030 um 21:00 Uhr (Ortszeit Mallorca) kommen. Habt ihr Platz für uns?\nAnmerkung: Geburtstag');
    await form.getByRole('button', { name: 'Text kopieren' }).click();
    await expect(form.locator('[data-inquiry-status]')).toContainText('noch nicht gesendet');
    expect(requests).toEqual([]);
    expect(await page.locator('body').innerText()).not.toMatch(/ist reserviert|Reservierung bestätigt|erfolgreich gesendet|Anfrage gesendet|wurde gesendet/i);
  });
});

test.describe('Galerie', () => {
  test('Bildansicht: benannter Dialog, Tastatur vor/zurück, Escape, Fokus-Rückgabe', async ({ page }) => {
    await page.goto('/de/galerie/');
    await expect(page.getByText('keine Aufnahmen aus dem Lokal')).toBeVisible();
    const shots = page.locator('[data-shot]');
    await expect(shots).toHaveCount(8);
    await expect(page.locator('.gallery .art__tag')).toHaveCount(8);
    await shots.nth(1).focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Bildansicht' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Bildansicht schließen' })).toBeFocused();
    await expect(dialog.locator('[data-lightbox-counter]')).toHaveText('Bild 2 von 8');
    await expect(dialog.locator('[data-lightbox-image]')).toHaveAttribute('alt', /Cocktailschale/);
    await expect(dialog.locator('[data-lightbox-note]')).toContainText('keine Aufnahme aus dem Lokal');
    await page.keyboard.press('ArrowRight');
    await expect(dialog.locator('[data-lightbox-counter]')).toHaveText('Bild 3 von 8');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await expect(dialog.locator('[data-lightbox-counter]')).toHaveText('Bild 1 von 8');
    await dialog.getByRole('button', { name: 'Vorheriges Bild' }).click();
    await expect(dialog.locator('[data-lightbox-counter]')).toHaveText('Bild 8 von 8');
    await dialog.getByRole('button', { name: 'Nächstes Bild' }).click();
    await expect(dialog.locator('[data-lightbox-counter]')).toHaveText('Bild 1 von 8');
    // Fokus bleibt im Dialog.
    for (let i = 0; i < 6; i++) await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement?.closest('dialog') !== null)).toBe(true);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(shots.nth(0)).toBeFocused();
  });

  test('Bilder laden mit responsiven Varianten; Ladefehler wird benannt', async ({ page }) => {
    await page.goto('/de/galerie/');
    const first = page.locator('.gallery img').first();
    await expect(first).toHaveAttribute('sizes', /vw/);
    expect((await page.locator('.gallery picture source').first().getAttribute('srcset'))?.split(',').length).toBeGreaterThan(2);
    expect(await first.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    await page.route('**/_astro/concept-coupe*', (route) => route.abort());
    await page.locator('[data-shot]').nth(1).click();
    await expect(page.getByText('Dieses Bild konnte nicht geladen werden.')).toBeVisible();
  });

  test('ohne JavaScript führt das Vorschaubild zum großen Bild', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL: ORIGIN.preview });
    const page = await context.newPage();
    await page.goto('/en/gallery/');
    await expect(page.locator('[data-shot]').first()).toHaveAttribute('href', /\/_astro\/.+\.webp$/);
    await context.close();
  });
});
