/**
 * Budget-Wächter: Gewicht des ersten Besuchs je Seite und Dist-Ordner, ausschließlich aus den Dateien des Builds
 * (kein Browser, kein Server). Er ersetzt keine Labormessung (`scripts/measure.mjs`, `docs/06_QA.md`), fängt aber
 * Gewichtssprünge beim Build ab: ein neuer Import im Seitenskript, ein gewachsenes Stylesheet, eine zusätzliche Schrift.
 *
 * Was zum „ersten Besuch“ einer Seite zählt (kalter Cache, ohne Service Worker):
 *  - das HTML-Dokument selbst,
 *  - jedes `<link rel="stylesheet">` und `<link rel="modulepreload">`,
 *  - jedes `<script src>` samt seinen statischen Importen (`import … from "./x.js"`, rekursiv),
 *  - jede Schrift, auf die ein geladenes Stylesheet per `url(….woff2)` verweist (alle deklarierten; im Browser
 *    laden die Seiten tatsächlich alle drei, daher keine Teilmenge),
 *  - jedes `<img src>` ohne `loading="lazy"` (Bilder mit `srcset` zählen mit ihrer `src`-Datei).
 * Nicht gezählt: Inline-Skripte/-Stile (stecken im HTML), `data:`-URLs, spät geladene Bilder, Service Worker, Manifest.
 *
 * Gewicht „roh“ = Dateigröße auf der Platte (so liefert `scripts/serve.mjs` aus und so misst `measure.mjs`);
 * „gzip“ = gzip Stufe 9 für Text (JS, CSS, HTML) als Näherung an einen komprimierenden Host (Brotli ist kleiner).
 * Schriften (woff2) und Bilder sind schon komprimiert und zählen roh.
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { beforeAll, describe, expect, it } from 'vitest';
import { assertBuilt, BUILDS, type Build, htmlFiles, read, resolveInternal, tags } from './helpers';

const KB = 1024;

/**
 * Grenzwerte. Gemessen am 13.11.2026 auf 1aabc22 in allen fünf Dist-Ordnern (rohe Bytes, ungünstigste Seite):
 * JS 11,4 kB (gzip 5,6 kB), CSS 35,2 kB (gzip 9,0 kB), Schriften 82,8 kB, HTML 21,2 kB (Vorschau) bzw. 15,3 kB (öffentlich),
 * Gesamt 144 kB ohne Bilder, 234 kB mit eifrigen Bildern (Vorschau). Die engen Grenzen liegen etwa 1,5–2× darüber:
 * so viel Wachstum wäre ein bewusster Schritt und ein Anlass, Grenze und Doku (`docs/06_QA.md`) zusammen anzupassen.
 * Die harten Grenzen sind die Budgets aus der Doku. (`measure.mjs` zeigt höhere Zahlen, weil dort die Antwort-Header
 * jeder Anfrage mitzählen; hier zählen nur die Dateien.)
 */
const LIMITS = {
  /** Doku-Budget: ≤ 1 MB Transfer je Seite (hart; wird nie überschritten, auch nicht „mit Begründung“). */
  totalHard: 1024 * KB,
  /** Doku-Budget: ≤ 100 kB JS je Seite (hart). */
  jsHard: 100 * KB,
  /** Eng: heute ≤ 11,4 kB roh. Seitenskripte sind klein; über 24 kB wäre ein Fremdpaket oder ein Sendeweg-Umbau im Bundle. */
  jsRaw: 24 * KB,
  /** Eng: heute ≤ 5,6 kB gzip. */
  jsGzip: 11 * KB,
  /** Eng: heute ≤ 35,2 kB roh (ein gemeinsames Bündel plus Schriftdeklarationen und Druckstile). */
  cssRaw: 52 * KB,
  /** Eng: heute ≤ 9,0 kB gzip. */
  cssGzip: 14 * KB,
  /** Doku: Erstbesuch-Schriften ca. 83 kB (Zeichenbestand aus den Quelltexten, drei Dateien); heute 82,8 kB. Spielraum für neue Zeichen. */
  fonts: 92 * KB,
  /** Eng: HTML einer Seite roh (heute ≤ 21,2 kB im Vorschau-Build mit Beispielinhalten). */
  htmlRaw: 36 * KB,
  /** Eng, Gesamtgewicht roh für Seiten ohne eifrige Bilder: heute ≤ 144 kB. */
  totalNoImages: 220 * KB,
  /** Eng, Gesamtgewicht roh mit eifrigen Bildern (Vorschau-Builds; heute ≤ 234 kB). */
  totalWithImages: 340 * KB,
  /** Ein einzelnes eifrig geladenes Bild (Hero heute 14 kB, größtes Galeriebild deutlich darunter). */
  imageEach: 100 * KB,
} as const;

interface Resource {
  file: string;
  kind: 'html' | 'js' | 'css' | 'font' | 'img';
  raw: number;
  gzip: number;
}

const fmt = (n: number) => `${(n / KB).toFixed(1)} kB`;
const measure = (b: Build, rel: string, kind: Resource['kind'], buf: Buffer): Resource => ({
  file: `${b.name}/${rel}`,
  kind,
  raw: buf.length,
  gzip: kind === 'html' || kind === 'js' || kind === 'css' ? gzipSync(buf, { level: 9 }).length : buf.length,
});

/** Statische Importe eines Moduls: `from"./x.js"` und `import"./x.js"` (minifizierte und lesbare Form). */
function staticImports(code: string): string[] {
  return [...code.matchAll(/(?:\bfrom|\bimport)\s*["'](\.{1,2}\/[^"']+\.js)["']/g)].map((m) => m[1]!);
}

function pageResources(b: Build, htmlFile: string): { resources: Resource[]; problems: string[] } {
  const html = read(b, htmlFile);
  const problems: string[] = [];
  const seen = new Map<string, Resource>();
  const add = (rel: string, kind: Resource['kind']): Buffer | null => {
    const abs = path.join(b.dir, rel);
    if (!existsSync(abs)) {
      problems.push(`${b.name}/${htmlFile}: ${rel} fehlt im Build`);
      return null;
    }
    const buf = readFileSync(abs);
    if (!seen.has(rel)) seen.set(rel, measure(b, rel, kind, buf));
    return buf;
  };
  const resolve = (url: string): string | null => {
    const r = resolveInternal(b, url);
    return r?.file ?? null;
  };
  const addModule = (rel: string): void => {
    if (seen.has(rel)) return;
    const buf = add(rel, 'js');
    if (!buf) return;
    for (const imp of staticImports(buf.toString('utf8'))) addModule(path.posix.normalize(path.posix.join(path.posix.dirname(rel), imp)));
  };

  seen.set(htmlFile, measure(b, htmlFile, 'html', Buffer.from(html, 'utf8')));
  for (const t of tags(html)) {
    if (t.name === 'link' && (t.attrs.rel ?? '').split(/\s+/).includes('stylesheet') && t.attrs.href) {
      const rel = resolve(t.attrs.href);
      if (!rel) continue;
      const buf = add(rel, 'css');
      if (!buf) continue;
      for (const m of buf.toString('utf8').matchAll(/url\(\s*["']?([^"')]+\.woff2)["']?\s*\)/g)) {
        // Schrift-URLs im Stylesheet sind relativ zum Stylesheet oder absolut (mit Basispfad).
        const url = new URL(m[1]!, `https://chucca.example${b.base}${rel}`).pathname;
        const font = resolve(url);
        if (font) add(font, 'font');
        else problems.push(`${b.name}/${rel}: Schrift ${m[1]} nicht im Build`);
      }
    } else if (t.name === 'link' && t.attrs.rel === 'modulepreload' && t.attrs.href) {
      const rel = resolve(t.attrs.href);
      if (rel) addModule(rel);
    } else if (t.name === 'script' && t.attrs.src) {
      const rel = resolve(t.attrs.src);
      if (rel) addModule(rel);
    } else if (t.name === 'img' && t.attrs.src && t.attrs.loading !== 'lazy' && !t.attrs.src.startsWith('data:')) {
      const rel = resolve(t.attrs.src);
      if (rel) add(rel, 'img');
    }
  }
  return { resources: [...seen.values()], problems };
}

const sum = (rs: Resource[], kind: Resource['kind'] | null, field: 'raw' | 'gzip') =>
  rs.filter((r) => kind === null || r.kind === kind).reduce((a, r) => a + r[field], 0);

/** Meldet Datei und Größe der größten Beiträge, damit ein Fehlschlag sofort die Ursache nennt. */
const top = (rs: Resource[], kind: Resource['kind'] | null, field: 'raw' | 'gzip') =>
  rs
    .filter((r) => kind === null || r.kind === kind)
    .sort((a, b) => b[field] - a[field])
    .slice(0, 4)
    .map((r) => `${r.file} ${fmt(r[field])}`)
    .join(', ');

function check(label: string, value: number, limit: number, rs: Resource[], kind: Resource['kind'] | null, field: 'raw' | 'gzip', page: string): void {
  expect(value, `${page}: ${label} ${fmt(value)} > Grenze ${fmt(limit)} (${field}). Größte: ${top(rs, kind, field)}`).toBeLessThanOrEqual(limit);
}

describe.each(BUILDS)('Budgets in $name', (b: Build) => {
  beforeAll(assertBuilt);
  const pages = () => htmlFiles(b).filter((f) => f !== '404.html' && f !== 'gallery.html').map((f) => ({ f, ...pageResources(b, f) }));

  it('alle Ressourcen, auf die Seiten verweisen, liegen im Build', () => {
    const problems = pages().flatMap((p) => p.problems);
    expect(problems).toEqual([]);
  });

  it('der Wächter sieht je Seite Stylesheets, Schriften und Skripte (Selbsttest der Erfassung)', () => {
    const home = pages().find((p) => p.f === 'de/index.html');
    expect(home, 'de/index.html fehlt').toBeDefined();
    const kinds = new Set(home!.resources.map((r) => r.kind));
    for (const k of ['html', 'css', 'js', 'font'] as const) expect(kinds.has(k), `${b.name}/de/index.html: keine ${k}-Ressource erfasst`).toBe(true);
    expect(home!.resources.filter((r) => r.kind === 'font').length, `${b.name}: erwartet drei Schriftdateien`).toBe(3);
  });

  it('JS je Seite: Doku-Budget 100 kB und enge Grenzen (roh und gzip)', () => {
    for (const p of pages()) {
      const raw = sum(p.resources, 'js', 'raw');
      const gz = sum(p.resources, 'js', 'gzip');
      check('JS', raw, LIMITS.jsHard, p.resources, 'js', 'raw', `${b.name}/${p.f}`);
      check('JS', raw, LIMITS.jsRaw, p.resources, 'js', 'raw', `${b.name}/${p.f}`);
      check('JS', gz, LIMITS.jsGzip, p.resources, 'js', 'gzip', `${b.name}/${p.f}`);
    }
  });

  it('CSS und HTML je Seite unter den Grenzen', () => {
    for (const p of pages()) {
      check('CSS', sum(p.resources, 'css', 'raw'), LIMITS.cssRaw, p.resources, 'css', 'raw', `${b.name}/${p.f}`);
      check('CSS', sum(p.resources, 'css', 'gzip'), LIMITS.cssGzip, p.resources, 'css', 'gzip', `${b.name}/${p.f}`);
      check('HTML', sum(p.resources, 'html', 'raw'), LIMITS.htmlRaw, p.resources, 'html', 'raw', `${b.name}/${p.f}`);
    }
  });

  it('Schriften je Seite unter der Grenze (Erstbesuch ca. 83 kB)', () => {
    for (const p of pages()) check('Schriften', sum(p.resources, 'font', 'raw'), LIMITS.fonts, p.resources, 'font', 'raw', `${b.name}/${p.f}`);
  });

  it('Gesamt-Initialtransfer je Seite: Doku-Budget 1 MB und enge Grenze', () => {
    for (const p of pages()) {
      const total = sum(p.resources, null, 'raw');
      const hasImages = p.resources.some((r) => r.kind === 'img');
      check('Gesamt', total, LIMITS.totalHard, p.resources, null, 'raw', `${b.name}/${p.f}`);
      check('Gesamt', total, hasImages ? LIMITS.totalWithImages : LIMITS.totalNoImages, p.resources, null, 'raw', `${b.name}/${p.f}`);
      for (const r of p.resources.filter((x) => x.kind === 'img')) {
        expect(r.raw, `${b.name}/${p.f}: Bild ${r.file} ${fmt(r.raw)} > Grenze ${fmt(LIMITS.imageEach)}`).toBeLessThanOrEqual(LIMITS.imageEach);
      }
    }
  });
});
