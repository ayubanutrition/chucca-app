/**
 * Test-Karte (`CHUCCA_TEST_MENU`, `dist-menu`) in der Build-Ausgabe: Kennung und Fixture-Daten stehen in keinem regulären
 * Dist-Ordner; `dist-menu` bleibt noindex ohne Sitemap und behauptet keinen Tagesstatus. Dazu: Der Schalter lässt sich nicht
 * in reguläre Builds umlenken (Modus public, andere Test-Schalter, anderer Ausgabeordner).
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { assertBuilt, BUILDS, htmlFiles, read, ROOT, walk, type Build } from './helpers';

const MARKER = 'TESTFIXTURE-MENU';
const TEXT = /\.(html|js|css|json|webmanifest|txt|xml|ics)$|^_headers$/;
const DRINKS = ['de/drinks/index.html', 'en/drinks/index.html', 'es/bebidas/index.html'];
const LEAKS = [MARKER, '2099-03-14', 'tf-nandu-fizz', 'tf-null-zimt', 'Ñandú', 'Straußen-Sour'];

describe.each(BUILDS.filter((b) => b.name !== 'dist-menu'))('Reguläre Ausgabe $name: keine Test-Karte', (b: Build) => {
  beforeAll(assertBuilt);
  it('weder Kennung noch Fixture-Daten in irgendeiner Textdatei (inkl. sw.js, _headers, sitemap.xml)', () => {
    const files = walk(b.dir).filter((f) => TEXT.test(path.basename(f)));
    expect(files.length).toBeGreaterThan(20);
    for (const f of files) {
      const text = read(b, f);
      for (const needle of LEAKS) expect(text, `${f}: ${needle}`).not.toContain(needle);
    }
  });
  it('Drinks-Seiten tragen weder data-test-fixture noch einen Stand der Karte', () => {
    for (const f of DRINKS) {
      const html = read(b, f);
      expect(html).not.toContain('data-test-fixture');
      expect(html).not.toContain('data-menu-updated');
    }
  });
});

describe('Testbuild dist-menu', () => {
  const b = BUILDS.find((x) => x.name === 'dist-menu')!;
  beforeAll(assertBuilt);
  it('trägt die Kennung nur auf den Drinks-Seiten: mit Hinweis, Stand der Karte, ohne Beispielkarten-Etikett', () => {
    for (const f of htmlFiles(b)) {
      const html = read(b, f);
      if (DRINKS.includes(f)) {
        expect(html, f).toContain(MARKER);
        expect(html, f).toContain('data-test-fixture');
        expect(html, f).toContain('data-menu-updated');
        expect(html, f).toContain('2099');
        expect(html, f).not.toContain('badge--pink');
      } else {
        expect(html, f).not.toContain(MARKER);
      }
    }
  });
  it('bleibt Vorschau: jede Seite noindex, robots sperrt alles, keine Sitemap, kein JSON-LD, X-Robots-Tag gesetzt', () => {
    for (const f of htmlFiles(b)) {
      const html = read(b, f);
      expect(html, f).toMatch(/<meta name="robots" content="noindex/);
      expect(html, f).not.toContain('application/ld+json');
      expect(html, f).not.toContain('rel="canonical"');
    }
    expect(read(b, 'robots.txt')).toContain('Disallow: /');
    expect(walk(b.dir)).not.toContain('sitemap.xml');
    expect(read(b, '_headers')).toContain('X-Robots-Tag: noindex, nofollow');
  });
  it('behauptet keinen Tagesstatus: kein „nicht verfügbar“-Hinweis, kein data-available=false', () => {
    for (const f of DRINKS) {
      const html = read(b, f);
      expect(html, f).not.toContain('data-available="false"');
      expect(html, f).not.toContain('drink__off');
      expect(html.match(/data-available="true"/g)).toHaveLength(8);
    }
  });
  it('Browserskripte enthalten keine Fixture-Daten', () => {
    for (const f of walk(b.dir).filter((name) => name.endsWith('.js'))) expect(read(b, f), f).not.toContain(MARKER);
  });
});

describe('Test-Schalter CHUCCA_TEST_MENU ist in reguläre Builds nicht umlenkbar', () => {
  const run = (env: Record<string, string>, outDir: string) =>
    spawnSync('npx', ['astro', 'build', '--outDir', outDir], { cwd: ROOT, env: { ...process.env, ...env }, encoding: 'utf8', timeout: 90_000 });
  const out = (result: ReturnType<typeof run>) => `${result.stdout}${result.stderr}`;

  it('mit CHUCCA_MODE=public bricht ab', () => {
    const result = run({ CHUCCA_TEST_MENU: '1', CHUCCA_MODE: 'public' }, 'dist-guard-menu');
    expect(result.status).not.toBe(0);
    expect(out(result)).toMatch(/CHUCCA_TEST_MENU ist nur im Vorschau-Modus erlaubt/);
    expect(existsSync(path.join(ROOT, 'dist-guard-menu'))).toBe(false);
  }, 120_000);
  it('zusammen mit CHUCCA_TEST_HOURS=1 oder CHUCCA_TEST_INQUIRY=1 bricht ab', () => {
    for (const other of ['CHUCCA_TEST_HOURS', 'CHUCCA_TEST_INQUIRY']) {
      const result = run({ CHUCCA_TEST_MENU: '1', [other]: '1' }, 'dist-guard-menu');
      expect(result.status, other).not.toBe(0);
      expect(out(result), other).toMatch(/schließ(t|en) sich/);
    }
    expect(existsSync(path.join(ROOT, 'dist-guard-menu'))).toBe(false);
  }, 120_000);
  it('mit anderem Ausgabeordner als dist-menu bricht ab, bevor etwas geschrieben wird', () => {
    const result = run({ CHUCCA_TEST_MENU: '1' }, 'dist-guard-menu');
    expect(result.status).not.toBe(0);
    expect(out(result)).toMatch(/baut ausschließlich den Vorschau-Testbuild nach dist-menu/);
    expect(existsSync(path.join(ROOT, 'dist-guard-menu'))).toBe(false);
  }, 120_000);
});
