/**
 * Eingeschränkte Umgebungen: (a) ohne JavaScript, (b) Speicher/Cookies gesperrt, (c) offline (erster Besuch und mit Service Worker),
 * (d) langsames Netz (Slow 3G), (e) Druck. Läuft in allen drei Engines, mit zwei Ausnahmen (Offline mit Service Worker, PDF-Erzeugung nur Chromium); Ergebnisse in docs/06_QA.md, Abschnitt „Eingeschränkte Umgebungen“.
 */
import { expect, test, type Page } from '@playwright/test';
import { ALL_PAGES, PAGES, localeOf } from './a11y-helpers';
import { ORIGIN } from './ports';

/** Wortlaut des Hinweises ohne JavaScript je Sprache (Quelle: src/i18n/*.ts, `common.noscript`). */
const NOSCRIPT = {
  de: /Für Filter, Teilen und Kalender braucht diese Seite JavaScript/,
  en: /Filters, sharing and calendar need JavaScript/,
  es: /Los filtros, compartir y el calendario necesitan JavaScript/,
};
/** Seiten mit Bedienelementen, die JavaScript brauchen (Drinks, Besuch, Gruppe) und damit den Hinweis tragen. */
const needsHint = (path: string) => /\/(drinks|bebidas|besuch|visit|visita|gruppe|group|grupo)\/$/.test(path);
const PLACEHOLDER = /lädt|laden…|loading|cargando|\.\.\.|…/i;

const BUILDS = [
  { name: 'Vorschau', origin: ORIGIN.preview },
  { name: 'öffentlich', origin: ORIGIN.public },
  { name: 'Zeiten-Fixture', origin: ORIGIN.hours },
] as const;

/** Sichtbare Bedienelemente (Schaltflächen, Felder), die ohne Skript nichts tun. `summary` (details) funktioniert nativ. */
const deadControls = (page: Page) =>
  page.evaluate(() => {
    const visible = (el: Element): boolean => {
      for (let node: Element | null = el; node; node = node.parentElement) {
        const cs = getComputedStyle(node);
        if (cs.display === 'none' || cs.visibility === 'hidden' || node.hasAttribute('hidden')) return false;
      }
      const box = el.getBoundingClientRect();
      return box.width > 0 && box.height > 0;
    };
    return [...document.querySelectorAll('button, input, select, textarea')].filter(visible).map((el) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}`);
  });

test.describe('(a) JavaScript aus', () => {
  test.use({ javaScriptEnabled: false });

  for (const build of BUILDS) {
    // Zeiten-Fixture: nur Heute und Besuch (Öffnungszeiten-Logik); der Rest ist textgleich zur Vorschau.
    const paths = build.name === 'Zeiten-Fixture' ? ['/de/', '/de/besuch/', '/en/visit/', '/es/visita/'] : ALL_PAGES;
    for (const path of paths) {
      test(`${build.name} ${path}: lesbar, ohne Platzhalter und ohne tote Bedienelemente, Hinweis lokalisiert`, async ({ page }) => {
        await page.goto(build.origin + path);
        await expect(page.locator('h1')).toBeVisible();
        const text = (await page.locator('main').innerText()).trim();
        expect(text.length).toBeGreaterThan(120);
        expect(text.match(PLACEHOLDER), 'Platzhalter wie „lädt…“').toBeNull();
        expect(await deadControls(page), 'sichtbare Bedienelemente ohne Funktion').toEqual([]);
        const notice = page.locator('[data-nojs]');
        if (needsHint(path)) {
          await expect(notice).toBeVisible();
          await expect(notice).toHaveText(NOSCRIPT[localeOf(path)]);
        } else {
          await expect(notice).toHaveCount(0);
        }
        // Ohne Skript bleibt die Tabbar/Topnav bedienbar und der Sprachwechsel verlinkt die gleiche Seite.
        await expect(page.locator('.tabbar:visible a, .topnav:visible a').first()).toBeVisible();
        const langs = await page.locator('.langs a[data-lang-link]').evaluateAll((links) => links.map((a) => `${a.getAttribute('data-lang-link')}=${a.getAttribute('href')}`));
        expect(langs.length).toBe(3);
      });
    }
  }

  test('Sprachwechsel führt je Seite in die Partnerseite der anderen Sprache (alle Paare, Vorschau)', async ({ page }) => {
    const pairs = PAGES.de.map((_, i) => [PAGES.de[i], PAGES.en[i], PAGES.es[i]] as const);
    for (const [de, en, es] of pairs) {
      for (const [from, targets] of [
        [de, [en, es]],
        [en, [de, es]],
        [es, [de, en]],
      ] as ReadonlyArray<readonly [string, readonly string[]]>) {
        for (const target of targets) {
          await page.goto(ORIGIN.preview + from);
          await page.locator(`.langs a[data-lang-link="${localeOf(target)}"]`).click();
          await expect(page).toHaveURL(new RegExp(`${target}$`));
        }
      }
    }
  });

  test('Drinks: ohne Filter vollständige Karte, Sprungmarken lösen auf, kein Suchfeld und keine Chips', async ({ page }) => {
    for (const path of ['/de/drinks/', '/en/drinks/', '/es/bebidas/']) {
      await page.goto(ORIGIN.preview + path);
      expect(await page.locator('[data-drink]').count()).toBeGreaterThanOrEqual(10);
      expect(await page.locator('[data-drink]:visible').count()).toBe(await page.locator('[data-drink]').count());
      await expect(page.locator('#menu-search')).toBeHidden();
      await expect(page.locator('[data-taste]').first()).toBeHidden();
      const jumps = await page.locator('.menu__jump-link').evaluateAll((links) => links.map((a) => a.getAttribute('href')!.slice(1)));
      expect(jumps.length).toBeGreaterThan(0);
      for (const id of jumps) await expect(page.locator(`[id="${id}"]`)).toHaveCount(1);
    }
  });

  test('Galerie: jedes Vorschaubild ist ein Link auf eine erreichbare Bilddatei; der Dialog bleibt zu', async ({ page, request }) => {
    for (const path of ['/de/galerie/', '/en/gallery/', '/es/galeria/']) {
      await page.goto(ORIGIN.preview + path);
      const hrefs = await page.locator('[data-shot]').evaluateAll((links) => links.map((a) => (a as HTMLAnchorElement).href));
      expect(hrefs.length).toBeGreaterThan(0);
      for (const href of new Set(hrefs)) expect((await request.get(href)).status(), href).toBe(200);
      await expect(page.locator('dialog[data-lightbox]')).toBeHidden();
      // Vorschaubilder tragen Alternativtext und Maße (kein Layoutsprung ohne Skript).
      expect(await page.locator('[data-shot] img:not([alt]), [data-shot] img:not([width])').count()).toBe(0);
    }
  });

  test('Besuch: Adresse und Karten-Links lesbar, Planer/Anfrage ausgeblendet, Gruppe: Hinweis statt leerem Ticket', async ({ page }) => {
    await page.goto(ORIGIN.preview + '/de/besuch/');
    await expect(page.locator('address.address')).toContainText('Carrer del Llaüt 23');
    await expect(page.getByRole('link', { name: /Google Maps/ })).toBeVisible();
    await expect(page.locator('[data-inquiry]')).toBeHidden();
    await page.goto(ORIGIN.preview + '/de/gruppe/');
    await expect(page.locator('[data-ticket]')).toBeHidden();
    await expect(page.locator('[data-nojs]')).toBeVisible();
    await expect(page.locator('.facts')).toBeVisible();
  });

  test('404 ohne JavaScript: Status 404, genau eine Sprache je Block lesbar, Link zurück', async ({ page }) => {
    const response = await page.goto(ORIGIN.preview + '/de/gibt-es-nicht/');
    expect(response?.status()).toBe(404);
    await expect(page.locator('h1').first()).toBeVisible();
    expect(await page.locator('main a').count()).toBeGreaterThan(0);
  });

  test('Sprachwahl (Startseite) ohne JavaScript: drei Links, keine Weiterleitung nötig', async ({ page }) => {
    await page.goto(ORIGIN.preview + '/');
    await expect(page.locator('[data-locale]')).toHaveCount(3);
    await page.locator('[data-locale="es"]').click();
    await expect(page).toHaveURL(/\/es\/$/);
  });
});

/** Speicher (local/session/IndexedDB) und Cookies werfen beim Zugriff, wie im strengen Privatmodus oder bei gesperrten Websitedaten. */
async function blockStorage(page: Page): Promise<string[]> {
  const problems: string[] = [];
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    // Ein absichtlich aufgerufener 404-Pfad meldet der Browser selbst als Konsolenfehler (Ressource, nicht Skript).
    if (message.type() === 'error' && !/status of 404/.test(message.text())) problems.push(`console: ${message.text()}`);
  });
  await page.addInitScript(() => {
    const deny = (): never => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    };
    for (const name of ['localStorage', 'sessionStorage', 'indexedDB'] as const) Object.defineProperty(window, name, { configurable: true, get: deny });
    Object.defineProperty(document, 'cookie', { configurable: true, get: deny, set: deny });
    Object.defineProperty(navigator, 'cookieEnabled', { configurable: true, get: () => false });
    // Zwischenablage verweigert (wie ohne Recht): Chromium headless tut das von selbst, Firefox und WebKit erlauben writeText auf Klick.
    Object.defineProperty(navigator, 'clipboard', { configurable: true, get: () => ({ writeText: () => Promise.reject(new DOMException('denied', 'NotAllowedError')) }) });
  });
  return problems;
}

test.describe('(b) Speicher gesperrt, Cookies blockiert', () => {
  test('alle Seiten laden ohne Fehlerseite, Skript- oder Konsolenfehler', async ({ page }) => {
    const problems = await blockStorage(page);
    for (const origin of [ORIGIN.preview, ORIGIN.public]) {
      for (const path of ALL_PAGES) {
        const response = await page.goto(origin + path);
        expect(response?.status(), path).toBe(200);
        await expect(page.locator('h1')).toBeVisible();
      }
    }
    expect(problems).toEqual([]);
  });

  test('Sprachwahl: Klick führt weiter, ohne zu merken; 404 und Sprachwechsel funktionieren', async ({ page }) => {
    const problems = await blockStorage(page);
    await page.goto(ORIGIN.preview + '/');
    await page.locator('[data-locale="en"]').click();
    await expect(page).toHaveURL(/\/en\/$/);
    await page.goto(ORIGIN.preview + '/');
    await expect(page).toHaveURL(/\/$/); // nichts gemerkt, keine Zwangsweiterleitung, aber auch kein Fehler
    await page.goto(ORIGIN.preview + '/es/gibt-es-nicht/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await page.goto(ORIGIN.preview + '/de/drinks/');
    await page.locator('.langs a[data-lang-link="es"]').click();
    await expect(page).toHaveURL(/\/es\/bebidas\//);
    expect(problems).toEqual([]);
  });

  test('Planer: Datum/Uhrzeit, Ticket, Kalender, Kopieren (manuell) und Sprachwechsel mit Übergabe per Adresse', async ({ page }) => {
    const problems = await blockStorage(page);
    await page.clock.install({ time: new Date('2030-01-15T12:00:00Z') });
    await page.goto(ORIGIN.preview + '/de/gruppe/');
    await page.getByLabel('Datum').fill('2030-01-16');
    await page.getByLabel('Uhrzeit').fill('20:00');
    await expect(page.locator('[data-ticket-time]')).toHaveText('20:00');
    const [download] = await Promise.all([page.waitForEvent('download'), page.locator('[data-calendar]').click()]);
    expect(download.suggestedFilename()).toBe('chucca-meetup.ics');
    // Ohne Zwischenablage-Recht (headless) fällt Kopieren auf das Textfeld zum manuellen Kopieren zurück.
    await page.locator('[data-copy]').click();
    await expect(page.locator('[data-manual]')).toBeVisible();
    await expect(page.locator('#plan-text')).toHaveValue(/20:00/);
    await page.locator('.langs a[data-lang-link="en"]').click();
    await expect(page.locator('#plan-time')).toHaveValue('20:00');
    expect(problems).toEqual([]);
  });

  test('Besuch: Anfrage, Kopieren der Adresse und Toast bei gesperrtem Speicher', async ({ page }) => {
    const problems = await blockStorage(page);
    await page.clock.install({ time: new Date('2030-01-15T12:00:00Z') });
    await page.goto(ORIGIN.preview + '/de/besuch/');
    await page.locator('#inq-date').fill('2030-01-16');
    await page.locator('#inq-time').fill('20:00');
    await page.locator('[data-inquiry] button[type="submit"]').click();
    await expect(page.locator('#inq-text')).toHaveValue(/6/);
    await page.locator('[data-copy-address]').click();
    await expect(page.locator('[data-place-manual]')).toBeVisible();
    // Toast (z. B. „neue Version“) lässt sich ohne Speicher einblenden: dieselbe Funktion wie im Service-Worker-Pfad.
    await page.evaluate(() => {
      const box = document.querySelector<HTMLElement>('[data-toast]')!;
      box.dataset.open = 'true';
    });
    await expect(page.locator('[data-toast]')).toBeVisible();
    expect(problems).toEqual([]);
  });

  test('Drinks: Geschmack, Suche und Filter funktionieren, Auswahl bleibt nur im Tab', async ({ page }) => {
    const problems = await blockStorage(page);
    await page.goto(ORIGIN.preview + '/de/drinks/');
    await page.locator('[data-taste]').nth(1).click();
    await page.locator('#menu-search').fill('a');
    await expect(page.locator('[data-menu-count]')).toBeVisible();
    await expect(page.locator('[data-taste]').nth(1)).toHaveAttribute('aria-pressed', 'true');
    expect(problems).toEqual([]);
  });

  test('Service Worker: Registrierung bei gesperrtem Speicher ohne Fehler, Seite bleibt nutzbar', async ({ browser }) => {
    const context = await browser.newContext({ serviceWorkers: 'allow', baseURL: ORIGIN.public });
    const page = await context.newPage();
    const problems = await blockStorage(page);
    await page.goto('/de/besuch/');
    await expect(page.locator('h1')).toBeVisible();
    await page.waitForTimeout(500);
    expect(problems).toEqual([]);
    await context.close();
  });
});

test.describe('(c) Offline', () => {
  test('erster Besuch ohne Service Worker: Browser meldet den Netzfehler, nichts hängt', async ({ page, context }) => {
    await context.setOffline(true);
    await expect(page.goto(ORIGIN.public + '/de/')).rejects.toThrow(/ERR_INTERNET_DISCONNECTED|net::|NS_ERROR_OFFLINE|internal error/);
    await context.setOffline(false);
    await page.goto(ORIGIN.public + '/de/');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('nach Service-Worker-Installation: besuchte Seite offline, unbekannte und 404-Pfade zeigen die dreisprachige Offline-Seite', async ({ browser, browserName }) => {
    // Playwright-Firefox lässt Netzanfragen des Service Workers trotz setOffline durch (Server liefert die echte 404-Seite), Playwright-WebKit
    // bricht jede Navigation offline ab, auch die vom Service Worker beantwortete. Der Offline-Pfad ist dort nicht prüfbar (docs/06_QA.md).
    test.skip(browserName !== 'chromium', 'setOffline erreicht den Service Worker nur in Chromium');
    const context = await browser.newContext({ serviceWorkers: 'allow', baseURL: ORIGIN.public, locale: 'es-ES' });
    const page = await context.newPage();
    await page.goto('/es/visita/');
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
    await page.reload();
    await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
    await context.setOffline(true);
    await page.goto('/es/visita/');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('[data-offline]')).toBeVisible();
    for (const path of ['/es/gibt-es-nicht/', '/en/nope/', '/de/nope/']) {
      await page.goto(path).catch(() => undefined);
      for (const phrase of [/Du bist offline/, /You are offline/, /Estás sin conexión/]) await expect(page.getByText(phrase), path).toBeVisible();
      await expect(page.locator('h1')).toBeVisible();
    }
    await context.setOffline(false);
    await context.close();
  });
});

test.describe('(d) Langsames Netz (Slow 3G)', () => {
  test('Heute: Text sichtbar und stabil, bevor die Skripte fertig sind; keine Layoutverschiebung; Schrift mit font-display', async ({ page, context, browserName }) => {
    test.setTimeout(90_000);
    if (browserName === 'chromium') {
      const cdp = await context.newCDPSession(page);
      await cdp.send('Network.enable');
      await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 400, downloadThroughput: (500 * 1024) / 8, uploadThroughput: (400 * 1024) / 8 });
    } else {
      // Firefox/WebKit kennen keine Netzdrosselung per Protokoll: Skripte und Schriften verzögert ausliefern (Latenz wie Slow 3G).
      await page.route(/\.(js|woff2?)(\?.*)?$/, async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        await route.continue();
      });
    }
    await page.addInitScript(() => {
      const w = window as unknown as { __cls: number; __h1: number; __h1Style: string };
      w.__cls = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as unknown as Array<{ value: number; hadRecentInput: boolean }>) if (!entry.hadRecentInput) w.__cls += entry.value;
      }).observe({ type: 'layout-shift', buffered: true });
      // Beim ersten Zeichnen: ist die Überschrift schon da, sichtbar (Deckkraft, Sichtbarkeit) und mit Text?
      new PerformanceObserver((list, observer) => {
        if (!list.getEntriesByName('first-contentful-paint').length) return;
        const h1 = document.querySelector('h1');
        const cs = h1 ? getComputedStyle(h1) : null;
        w.__h1 = performance.now();
        w.__h1Style = h1 && cs ? `${(h1.textContent ?? '').trim().length}|${cs.opacity}|${cs.visibility}|${cs.display}` : 'none';
        observer.disconnect();
      }).observe({ type: 'paint', buffered: true });
    });
    await page.goto(ORIGIN.preview + '/de/', { waitUntil: 'commit' });
    await expect(page.locator('h1')).toBeVisible({ timeout: 30_000 });
    await page.waitForLoadState('load', { timeout: 60_000 });
    const result = await page.evaluate(() => {
      const w = window as unknown as { __cls: number; __h1: number; __h1Style: string };
      const scripts = performance.getEntriesByType('resource').filter((e) => (e as PerformanceResourceTiming).initiatorType === 'script' || /\.js(\?|$)/.test(e.name));
      const lastScript = Math.max(0, ...scripts.map((e) => (e as PerformanceResourceTiming).responseEnd));
      const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? -1;
      return { cls: w.__cls, h1Style: w.__h1Style, fcp, lastScript, scripts: scripts.length };
    });
    const [length, opacity, visibility, display] = result.h1Style.split('|');
    expect(Number(length), 'Überschrift beim ersten Zeichnen vorhanden').toBeGreaterThan(3);
    expect(Number(opacity)).toBeGreaterThan(0.99);
    expect(visibility).toBe('visible');
    expect(display).not.toBe('none');
    expect(result.cls, `Layoutverschiebung ${result.cls}`).toBeLessThan(0.1);
    expect(result.fcp, `erstes Zeichnen ${Math.round(result.fcp)} ms`).toBeGreaterThan(0);
    // Inhalt steht vor dem letzten Skript: das erste Zeichnen wartet nicht auf JavaScript.
    if (result.scripts > 0) expect(result.fcp, `FCP ${Math.round(result.fcp)} ms, letztes Skript ${Math.round(result.lastScript)} ms`).toBeLessThanOrEqual(result.lastScript);
  });

  test('alle @font-face-Regeln sind font-display swap oder optional (kein unsichtbarer Text)', async ({ page }) => {
    await page.goto(ORIGIN.preview + '/de/');
    const displays = await page.evaluate(async () => {
      const out: string[] = [];
      for (const sheet of document.styleSheets) {
        let rules: CSSRuleList;
        try {
          rules = sheet.cssRules;
        } catch {
          continue;
        }
        for (const rule of rules) if (rule instanceof CSSFontFaceRule && /url\(/.test(rule.style.getPropertyValue('src'))) out.push(rule.style.getPropertyValue('font-display') || 'auto');
      }
      return out;
    });
    expect(displays.length).toBeGreaterThan(0);
    for (const value of displays) expect(['swap', 'optional', 'fallback']).toContain(value);
  });
});

test.describe('(e) Druck', () => {
  test.use({ viewport: { width: 794, height: 1123 } });

  for (const path of ['/de/', '/de/besuch/', '/de/gruppe/', '/en/visit/', '/es/visita/']) {
    test(`${path}: Navigation, Tabbar, Toast ausgeblendet; dunkle Schrift auf Papier; Adresse sichtbar; keine Querüberläufe`, async ({ page, browserName }) => {
      await page.goto(ORIGIN.preview + path);
      // Nach dem Laden setzen: Playwright-Firefox übernimmt die Emulation sonst nicht für das neu geladene Dokument.
      await page.emulateMedia({ media: 'print' });
      // Der Medienwechsel löst CSS-Übergänge (Hintergrund der Schaltflächen) aus; ohne Abwarten misst WebKit Zwischenwerte (dunkel auf dunkel).
      await page.evaluate(() => Promise.all(document.getAnimations().map((a) => (a.finish(), a.finished.catch(() => undefined)))));
      await page.evaluate(() => {
        const toast = document.querySelector<HTMLElement>('[data-toast]');
        if (toast) toast.dataset.open = 'true';
        const offline = document.querySelector<HTMLElement>('[data-offline]');
        if (offline) offline.hidden = false;
      });
      for (const selector of ['.tabbar', '.topnav', '.masthead', '.toast', '.offline', '.skip', 'button']) {
        const shown = await page.locator(selector).evaluateAll((els) => els.filter((el) => getComputedStyle(el).display !== 'none').length);
        expect(shown, `${selector} sichtbar im Druck`).toBe(0);
      }
      const report = await page.evaluate(() => {
        const luminance = (rgb: string): number => {
          const [r, g, b] = (rgb.match(/[\d.]+/g) ?? ['0', '0', '0']).slice(0, 3).map((v) => {
            const c = Number(v) / 255;
            return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
          });
          return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
        };
        const backdrop = (el: Element): string => {
          for (let node: Element | null = el; node; node = node.parentElement) {
            const bg = getComputedStyle(node).backgroundColor;
            if (bg && !/rgba?\(\s*\d+,\s*\d+,\s*\d+,\s*0\s*\)|transparent/.test(bg)) return bg;
          }
          return 'rgb(255, 255, 255)';
        };
        const low: string[] = [];
        const walker = document.createTreeWalker(document.querySelector('main')!, NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          const text = (n.textContent ?? '').trim();
          const el = n.parentElement;
          if (!text || !el || el.closest('svg, noscript, [hidden]')) continue;
          let hidden = false;
          for (let node: Element | null = el; node; node = node.parentElement) if (getComputedStyle(node).display === 'none') hidden = true;
          if (hidden) continue;
          const l1 = luminance(getComputedStyle(el).color);
          const l2 = luminance(backdrop(el));
          const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
          if (ratio < 4.5) low.push(`${text.slice(0, 30)} (${ratio.toFixed(1)})`);
        }
        const address = document.querySelector('address');
        return {
          low,
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          address: address ? (address as HTMLElement).innerText : '',
          addressVisible: address ? getComputedStyle(address).display !== 'none' : false,
          pageBg: getComputedStyle(document.body).backgroundColor,
        };
      });
      expect(report.low, 'Text mit zu wenig Kontrast im Druck').toEqual([]);
      expect(report.overflow).toBeLessThanOrEqual(0);
      expect(report.pageBg).toBe('rgb(255, 255, 255)');
      if (/besuch|visit/.test(path)) {
        expect(report.addressVisible).toBe(true);
        expect(report.address).toContain('Carrer del Llaüt 23');
        expect(report.address).toContain('07610');
      }
      // PDF entsteht ohne Fehler und hat mindestens eine Seite (page.pdf gibt es nur in Chromium; Firefox/WebKit prüfen die Druck-Medienabfrage oben).
      if (browserName !== 'chromium') return;
      const pdf = await page.pdf({ format: 'A4', printBackground: false });
      expect(pdf.length).toBeGreaterThan(2000);
      expect(pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g)?.length ?? 0).toBeGreaterThanOrEqual(1);
    });
  }
});
