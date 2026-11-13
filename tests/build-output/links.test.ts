/**
 * (2) Linkprüfer über die Build-Ausgabe: interne Verweise lösen auf Dateien auf (mit Basispfad),
 * Fragmente existieren, hreflang ist selbstbezüglich und gegenseitig, Canonical zeigt auf eine
 * indexierbare Seite, noindex-Seiten fehlen in der Sitemap, robots.txt verweist auf die Sitemap.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { LEGACY_HASHES } from '../../src/i18n';
import { assertBuilt, BUILDS, type Build, htmlFiles, ids, pageUrl, read, resolveInternal, tags, walk } from './helpers';

const URL_ATTRS: Array<[tag: string, attr: string]> = [
  ['a', 'href'],
  ['link', 'href'],
  ['script', 'src'],
  ['img', 'src'],
  ['source', 'src'],
  ['form', 'action'],
  ['iframe', 'src'],
];

/** Alle URL-Werte eines Dokuments: [Quelle, URL]. */
function references(html: string): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const t of tags(html)) {
    for (const [name, attr] of URL_ATTRS) {
      const v = t.attrs[attr];
      if (t.name === name && v !== undefined) out.push([`<${name} ${attr}>`, v]);
    }
    for (const attr of ['srcset', 'imagesrcset']) {
      const v = t.attrs[attr];
      if (v !== undefined) {
        for (const candidate of v.split(',')) {
          const u = candidate.trim().split(/\s+/)[0];
          if (u) out.push([`<${t.name} ${attr}>`, u]);
        }
      }
    }
    if (t.name === 'meta') {
      const prop = t.attrs.property ?? t.attrs.name ?? '';
      if (/^(og:(image|url)|twitter:image)$/.test(prop) && t.attrs.content) out.push([`<meta ${prop}>`, t.attrs.content]);
      if (t.attrs['http-equiv']?.toLowerCase() === 'refresh') {
        const m = /url=(.+)$/i.exec(t.attrs.content ?? '');
        if (m) out.push(['<meta refresh>', m[1]!.trim()]);
      }
    }
  }
  return out;
}

interface Alt {
  hreflang: string;
  href: string;
}
const alternates = (html: string): Alt[] =>
  tags(html)
    .filter((t) => t.name === 'link' && t.attrs.rel === 'alternate' && t.attrs.hreflang)
    .map((t) => ({ hreflang: t.attrs.hreflang!, href: t.attrs.href ?? '' }));
const canonicalOf = (html: string) => tags(html).find((t) => t.name === 'link' && t.attrs.rel === 'canonical')?.attrs.href;
const robotsOf = (html: string) => tags(html).find((t) => t.name === 'meta' && t.attrs.name === 'robots')?.attrs.content ?? '';
const langOf = (html: string) => /<html[^>]*\blang="([^"]+)"/i.exec(html)?.[1];
const isIndexable = (html: string) => !/noindex/i.test(robotsOf(html));

describe.each(BUILDS)('Links in $name', (b: Build) => {
  beforeAll(assertBuilt);
  const files = htmlFiles(b);
  const docs = new Map(files.map((f) => [f, read(b, f)]));

  it('jeder interne Verweis (href, src, srcset, Meta) trifft eine Datei unter dem Basispfad', () => {
    const problems: string[] = [];
    let checked = 0;
    for (const [f, html] of docs) {
      for (const [src, url] of references(html)) {
        if (/^(mailto:|tel:|data:|javascript:)/i.test(url)) continue;
        if (url.startsWith('#')) continue;
        if (/^\/\//.test(url)) {
          problems.push(`${f} ${src}: protokollrelative URL ${url}`);
          continue;
        }
        const r = resolveInternal(b, url);
        if (r === null) continue; // extern
        checked += 1;
        if (r.outsideBase) problems.push(`${f} ${src}: ${url} liegt außerhalb von ${b.base}`);
        else if (!r.file) problems.push(`${f} ${src}: ${url} löst auf keine Datei auf`);
      }
    }
    expect(problems).toEqual([]);
    expect(checked).toBeGreaterThan(300);
  });

  it('URLs im Seitenquelltext sind unter dem Basispfad, nicht an der Wurzel (nur Unterpfad)', () => {
    if (b.base === '/') return;
    for (const [f, html] of docs) {
      for (const [src, url] of references(html)) {
        if (url.startsWith('/') && !url.startsWith('//')) expect(url.startsWith(b.base), `${f} ${src}: ${url}`).toBe(true);
      }
    }
  });

  it('jedes Fragment (#id) existiert auf der Zielseite', () => {
    const idCache = new Map<string, Set<string>>();
    const idsOf = (f: string) => idCache.get(f) ?? idCache.set(f, ids(docs.get(f) ?? read(b, f))).get(f)!;
    const problems: string[] = [];
    let checked = 0;
    for (const [f, html] of docs) {
      for (const [src, url] of references(html)) {
        if (url === '#') continue;
        let target: string | undefined = f;
        let hash = '';
        if (url.startsWith('#')) hash = decodeURIComponent(url.slice(1));
        else {
          const r = resolveInternal(b, url);
          if (!r || !r.hash) continue;
          target = r.file;
          hash = r.hash;
        }
        if (!target || !docs.has(target)) continue;
        // Alte V3-Hash-Links auf der Sprachwahl (/#galerie) löst deren Skript per LEGACY_HASHES auf.
        if (target === 'index.html' && Object.hasOwn(LEGACY_HASHES, hash)) continue;
        checked += 1;
        if (!idsOf(target).has(hash)) problems.push(`${f} ${src}: #${hash} fehlt in ${target}`);
      }
    }
    expect(problems).toEqual([]);
    expect(checked).toBeGreaterThan(10);
  });

  it('Verweise aus ARIA und Formularen (for, aria-labelledby, -describedby, -controls) treffen eine id', () => {
    const problems: string[] = [];
    for (const [f, html] of docs) {
      const have = ids(html);
      for (const t of tags(html)) {
        for (const attr of ['for', 'aria-labelledby', 'aria-describedby', 'aria-controls', 'list']) {
          const v = t.attrs[attr];
          if (v === undefined) continue;
          for (const id of v.split(/\s+/).filter(Boolean)) if (!have.has(id)) problems.push(`${f}: ${attr}="${id}" ohne Ziel`);
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it('ids sind je Seite eindeutig', () => {
    for (const [f, html] of docs) {
      const seen = new Set<string>();
      for (const t of tags(html)) {
        if (t.attrs.id === undefined) continue;
        expect(seen.has(t.attrs.id), `${f}: id="${t.attrs.id}" doppelt`).toBe(false);
        seen.add(t.attrs.id);
      }
    }
  });

  it('CSS-Dateien verweisen nur auf vorhandene Dateien', () => {
    const problems: string[] = [];
    for (const f of walk(b.dir).filter((x) => x.endsWith('.css'))) {
      const css = readFileSync(path.join(b.dir, f), 'utf8');
      for (const m of css.matchAll(/url\(\s*(?!["']?data:)["']?([^"')\s]+)["']?\s*\)/g)) {
        const r = resolveInternal(b, m[1]!);
        if (r && !r.file) problems.push(`${f}: ${m[1]}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('Service-Worker-Vorspeicher (ASSETS) verweist nur auf vorhandene Dateien', () => {
    const sw = read(b, 'sw.js');
    const list = JSON.parse(/const ASSETS = (\[.*?\]);/s.exec(sw)![1]!) as string[];
    expect(list.length).toBeGreaterThan(10);
    for (const a of list) expect(existsSync(path.join(b.dir, a)), a).toBe(true);
  });

  if (!b.isPublic) {
    it('nicht öffentlich: alle Seiten noindex, robots.txt sperrt, keine Sitemap, kein Canonical/hreflang', () => {
      for (const [f, html] of docs) {
        expect(robotsOf(html), f).toMatch(/noindex/);
        expect(canonicalOf(html), f).toBeUndefined();
        expect(alternates(html), f).toEqual([]);
      }
      expect(read(b, 'robots.txt')).toMatch(/Disallow: \//);
      expect(existsSync(path.join(b.dir, 'sitemap.xml'))).toBe(false);
    });
    return;
  }

  describe('öffentlicher Modus', () => {
    const indexable = files.filter((f) => isIndexable(docs.get(f)!));
    const noindex = files.filter((f) => !isIndexable(docs.get(f)!));

    it('es gibt indexierbare und noindex-Seiten (Drinks/Galerie ohne Freigabe, 404, Weiterleitung)', () => {
      expect(indexable.length).toBeGreaterThanOrEqual(7);
      expect(noindex).toEqual(expect.arrayContaining(['404.html', 'gallery.html']));
    });

    it('indexierbare Seiten haben Canonical auf sich selbst; noindex-Seiten verweisen nicht weg', () => {
      for (const f of indexable) expect(canonicalOf(docs.get(f)!), f).toBe(pageUrl(b, f));
      for (const f of noindex) {
        const c = canonicalOf(docs.get(f)!);
        if (c === undefined) continue;
        expect(c, f).toBe(pageUrl(b, f));
      }
    });

    it('Canonical zeigt auf eine vorhandene, indexierbare Seite', () => {
      for (const f of indexable) {
        const r = resolveInternal(b, canonicalOf(docs.get(f)!)!);
        expect(r?.file, f).toBeDefined();
        expect(isIndexable(docs.get(r!.file!)!), `${f} -> ${r!.file}`).toBe(true);
      }
    });

    it('hreflang: selbstbezüglich, gegenseitig, x-default, Ziele vorhanden und indexierbar', () => {
      let withAlternates = 0;
      for (const f of indexable) {
        const html = docs.get(f)!;
        const alts = alternates(html);
        if (alts.length === 0) continue;
        withAlternates += 1;
        const self = pageUrl(b, f);
        const lang = langOf(html);
        const isChooser = f === 'index.html';
        const map = new Map(alts.map((a) => [a.hreflang, a.href]));
        expect(map.size, `${f}: doppelte hreflang-Werte`).toBe(alts.length);
        expect([...map.keys()].sort(), f).toEqual(['de', 'en', 'es', 'x-default']);
        // Selbstbezug: die Sprachfassung zeigt sich selbst; die Wurzelseite ist x-default.
        if (isChooser) expect(map.get('x-default'), f).toBe(self);
        else expect(map.get(lang!), `${f}: Selbstverweis`).toBe(self);
        for (const [hl, href] of map) {
          const r = resolveInternal(b, href);
          expect(r?.file, `${f}: ${hl} ${href}`).toBeDefined();
          const target = docs.get(r!.file!)!;
          expect(isIndexable(target), `${f}: ${hl} -> ${r!.file} ist noindex`).toBe(true);
          if (hl === 'x-default') continue;
          expect(langOf(target), `${f}: ${hl} -> ${r!.file}: lang`).toBe(hl);
          // Gegenseitig: die Zielseite verweist mit ihrer Sprache bzw. x-default zurück, und zwar mit demselben Satz.
          const back = new Map(alternates(target).map((a) => [a.hreflang, a.href]));
          expect(back.get(lang!) ?? back.get('x-default'), `${f}: ${r!.file} verweist nicht zurück`).toBeDefined();
          expect([...back.entries()].sort(), `${f} <-> ${r!.file}: ungleiche Alternativenmenge`).toEqual([...map.entries()].sort());
        }
      }
      expect(withAlternates).toBe(indexable.length);
    });

    it('Sprachumschalter (a[hreflang]) zeigen auf Seiten der jeweiligen Sprache', () => {
      for (const f of files) {
        for (const t of tags(docs.get(f)!)) {
          if (t.name !== 'a' || !t.attrs.hreflang || !t.attrs.href) continue;
          const r = resolveInternal(b, t.attrs.href);
          if (!r?.file) continue;
          expect(langOf(docs.get(r.file)!), `${f}: ${t.attrs.href}`).toBe(t.attrs.hreflang);
        }
      }
    });

    const sitemap = () => read(b, 'sitemap.xml');
    const locs = () => [...sitemap().matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!);

    it('Sitemap: jede Adresse ist vorhanden, indexierbar, Canonical, ohne Duplikate', () => {
      const l = locs();
      expect(l.length).toBeGreaterThanOrEqual(6);
      expect(new Set(l).size).toBe(l.length);
      for (const loc of l) {
        const r = resolveInternal(b, loc);
        expect(r?.file, loc).toBeDefined();
        const html = docs.get(r!.file!)!;
        expect(isIndexable(html), `${loc} ist noindex`).toBe(true);
        expect(canonicalOf(html), loc).toBe(loc);
      }
    });

    it('Sitemap: keine noindex-Seite, jede Sprachseite mit hreflang-Satz enthalten', () => {
      const l = new Set(locs());
      for (const f of noindex) expect(l.has(pageUrl(b, f)), `${f} steht in der Sitemap`).toBe(false);
      for (const f of indexable) {
        if (f === 'index.html') continue; // Sprachwahl: nur als x-default
        expect(l.has(pageUrl(b, f)), `${f} fehlt in der Sitemap`).toBe(true);
      }
    });

    it('Sitemap: xhtml:link-Alternativen lösen auf, sind gegenseitig und stimmen mit dem HTML überein', () => {
      const entries = [...sitemap().matchAll(/<url>(.*?)<\/url>/gs)].map((m) => ({
        loc: /<loc>([^<]+)</.exec(m[1]!)![1]!,
        alts: [...m[1]!.matchAll(/<xhtml:link rel="alternate" hreflang="([^"]+)" href="([^"]+)"\/>/g)].map((a) => ({ hreflang: a[1]!, href: a[2]! })),
      }));
      for (const e of entries) {
        const r = resolveInternal(b, e.loc);
        const htmlAlts = alternates(docs.get(r!.file!)!);
        expect(e.alts.map((a) => `${a.hreflang} ${a.href}`).sort(), e.loc).toEqual(htmlAlts.map((a) => `${a.hreflang} ${a.href}`).sort());
        const self = e.alts.find((a) => a.href === e.loc);
        expect(self, `${e.loc}: kein Selbstverweis`).toBeDefined();
      }
    });

    it('robots.txt: erlaubt, Sitemap-Adresse löst auf die vorhandene Datei auf', () => {
      const robots = read(b, 'robots.txt');
      expect(robots).toMatch(/^User-agent: \*$/m);
      expect(robots).not.toMatch(/^Disallow:\s*\//m);
      const m = /^Sitemap: (\S+)$/m.exec(robots);
      expect(m, 'Sitemap-Zeile').not.toBeNull();
      expect(resolveInternal(b, m![1]!)?.file).toBe('sitemap.xml');
    });
  });
});
