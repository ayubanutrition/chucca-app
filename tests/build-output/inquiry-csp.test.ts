/**
 * Anfrage-Endpunkt (Aufgabe 18) in der Build-Ausgabe: Die CSP öffnet sich nur im Testbuild `dist-inquiry` und nur für den
 * einen Test-Host; alle regulären Builds bleiben strikt (`connect-src 'self'`, `form-action 'none'`) und tragen weder
 * Formular-Hooks noch Test-Kennung. Dazu: Die Test-Schalter lassen sich nicht in reguläre Builds umlenken.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { assertBuilt, BUILDS, htmlFiles, read, ROOT, walk, type Build } from './helpers';

const HOST = 'inquiries.chucca-test.invalid';
const directive = (b: Build, name: string) => {
  const csp = /^\s+Content-Security-Policy: (.+)$/m.exec(read(b, '_headers'))![1]!;
  return csp.split('; ').find((d) => d.startsWith(`${name} `)) ?? '';
};

describe.each(BUILDS.filter((b) => b.name !== 'dist-inquiry'))('Reguläre Ausgabe $name: Sendeweg AUS', (b: Build) => {
  beforeAll(assertBuilt);
  it("CSP unverändert strikt: connect-src 'self', form-action 'none'", () => {
    expect(directive(b, 'connect-src')).toBe("connect-src 'self'");
    expect(directive(b, 'form-action')).toBe("form-action 'none'");
    expect(read(b, '_headers')).not.toContain('.invalid');
  });
  it('keine Seite trägt Endpunkt, Senden-Knopf, Datenhinweis oder Test-Kennung', () => {
    for (const f of htmlFiles(b)) {
      const html = read(b, f);
      for (const needle of ['data-inquiry-origin', 'data-inquiry-send', 'data-inquiry-sendbox', 'data-inquiry-privacy', 'TESTFIXTURE-INQUIRY', 'chucca-test.invalid']) expect(html, `${f}: ${needle}`).not.toContain(needle);
    }
  });
  it('kein Skript, kein Manifest, kein Service Worker nennt den Test-Host', () => {
    for (const f of walk(b.dir).filter((name) => /\.(js|json|webmanifest|css)$/.test(name))) expect(read(b, f), f).not.toContain('chucca-test.invalid');
  });
  it('Besuch-Seiten: genau das vorherige Formular (kein Versandknopf, Statuszeile leer)', () => {
    const visit = htmlFiles(b).filter((f) => /(besuch|visit|visita)\/index\.html$/.test(f));
    expect(visit.length).toBeGreaterThanOrEqual(3);
    for (const f of visit) {
      const html = read(b, f);
      expect(html).toContain('data-inquiry-copy');
      expect(html.match(/<form[^>]*data-inquiry[^>]*>/g)).toHaveLength(1);
    }
  });
});

describe('Testbuild dist-inquiry', () => {
  const b = BUILDS.find((x) => x.name === 'dist-inquiry')!;
  beforeAll(assertBuilt);

  it('CSP nennt genau den einen Test-Host in connect-src und form-action und sonst nichts Zusätzliches', () => {
    expect(directive(b, 'connect-src')).toBe(`connect-src 'self' https://${HOST}`);
    expect(directive(b, 'form-action')).toBe(`form-action https://${HOST}`);
    const headers = read(b, '_headers');
    expect(headers.match(/\.invalid/g)).toHaveLength(2);
    for (const name of ['default-src', 'script-src', 'style-src', 'img-src', 'font-src', 'manifest-src', 'worker-src', 'frame-ancestors']) expect(directive(b, name), name).not.toContain('invalid');
  });

  it('nur die Besuch-Seiten tragen das Formular mit Herkunft; die Herkunft ist ein reiner https-Host', () => {
    const withOrigin = htmlFiles(b).filter((f) => read(b, f).includes('data-inquiry-origin'));
    expect(withOrigin.sort()).toEqual(htmlFiles(b).filter((f) => /(besuch|visit|visita)\/index\.html$/.test(f)).sort());
    for (const f of withOrigin) expect(read(b, f)).toContain(`data-inquiry-origin="https://${HOST}"`);
  });

  it('der Platzhalter für den Datenschutztext steht in allen drei Sprachen im HTML', () => {
    expect(read(b, 'de/besuch/index.html')).toContain('[PLATZHALTER, vom Betrieb');
    expect(read(b, 'en/visit/index.html')).toContain('[PLACEHOLDER, to be supplied');
    expect(read(b, 'es/visita/index.html')).toContain('[MARCADOR, que debe aportar');
  });

  it('ist als Test gekennzeichnet und bleibt noindex ohne Sitemap', () => {
    for (const f of htmlFiles(b).filter((name) => /(besuch|visit|visita)\/index\.html$/.test(name))) {
      const html = read(b, f);
      expect(html).toContain('TESTFIXTURE-INQUIRY');
      expect(html).toContain('noindex');
      expect(html).toContain('data-inquiry-privacy');
    }
    expect(read(b, 'robots.txt')).toContain('Disallow: /');
    expect(walk(b.dir)).not.toContain('sitemap.xml');
  });

  it('die Schaltfläche steht im ausgelieferten Besuch-HTML nur im Ausgabeblock (hidden bis zur Vorbereitung)', () => {
    const html = read(b, 'de/besuch/index.html');
    const output = /<div[^>]*data-inquiry-output[\s\S]*?<\/form>/.exec(html)![0];
    expect(output).toContain('data-inquiry-send');
    expect(html.match(/data-inquiry-send(?!box)/g)).toHaveLength(1);
  });
});

describe('Test-Schalter sind in reguläre Builds nicht umlenkbar', () => {
  const run = (env: Record<string, string>, outDir: string) =>
    spawnSync('npx', ['astro', 'build', '--outDir', outDir], { cwd: ROOT, env: { ...process.env, ...env }, encoding: 'utf8', timeout: 90_000 });

  it('CHUCCA_TEST_INQUIRY=1 mit CHUCCA_MODE=public bricht ab', () => {
    const result = run({ CHUCCA_TEST_INQUIRY: '1', CHUCCA_MODE: 'public' }, 'dist-guard-test');
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toMatch(/CHUCCA_TEST_INQUIRY ist nur im Vorschau-Modus erlaubt/);
  });

  it('CHUCCA_TEST_INQUIRY=1 zusammen mit CHUCCA_TEST_HOURS=1 bricht ab', () => {
    const result = run({ CHUCCA_TEST_INQUIRY: '1', CHUCCA_TEST_HOURS: '1' }, 'dist-guard-test');
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toMatch(/schließen sich aus/);
  });

  it('CHUCCA_TEST_INQUIRY=1 mit anderem Ausgabeordner als dist-inquiry bricht ab, bevor etwas geschrieben wird', () => {
    const result = run({ CHUCCA_TEST_INQUIRY: '1' }, 'dist-guard-test');
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toMatch(/baut ausschließlich den Vorschau-Testbuild nach dist-inquiry/);
    expect(existsSync(path.join(ROOT, 'dist-guard-test'))).toBe(false);
  }, 120_000);
});
