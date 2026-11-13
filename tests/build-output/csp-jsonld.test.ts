/**
 * (4) JSON-LD: parsebar, nur bestätigte Fakten aus venue.json.
 * (5) _headers/CSP: jeder ausführbare Inline-Script/-Style hat einen passenden Hash, keine Altlasten.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { assertBuilt, BUILDS, type Build, htmlFiles, inlineBlocks, pageUrl, read, ROOT, tags } from './helpers';

interface Venue {
  name: string;
  address: { building: string; street: string; postalCode: string; city: string; region: string; countryCode: string; status: string };
  channels: Array<{ type: string; label: string; href: string; status: string }>;
  hours: { status: string };
}
const venue = JSON.parse(readFileSync(path.join(ROOT, 'src/content/published/venue.json'), 'utf8')) as Venue;

const sha = (text: string) => `'sha256-${createHash('sha256').update(text).digest('base64')}'`;

describe.each(BUILDS)('JSON-LD in $name', (b: Build) => {
  beforeAll(assertBuilt);
  const blocks = () =>
    htmlFiles(b).flatMap((f) =>
      inlineBlocks(read(b, f))
        .filter((x) => x.kind === 'script' && x.attrs.type === 'application/ld+json')
        .map((x) => ({ f, text: x.text })),
    );

  it('jeder Block ist gültiges JSON mit schema.org-Kontext', () => {
    for (const { f, text } of blocks()) {
      const data = JSON.parse(text) as Record<string, unknown>;
      expect(data['@context'], f).toBe('https://schema.org');
      expect(typeof data['@type'], f).toBe('string');
    }
  });

  it(b.isPublic ? 'steht auf den drei Startseiten der Sprachen (und nur dort)' : 'kommt nur dort vor, wo erwartet', () => {
    const files = blocks().map((x) => x.f).sort();
    if (b.isPublic) expect(files).toEqual(['de/index.html', 'en/index.html', 'es/index.html']);
    else expect(files.every((f) => /^(de|en|es)\/index\.html$/.test(f))).toBe(true);
  });

  it('enthält nur bestätigte Angaben aus venue.json', () => {
    expect(venue.address.status).toBe('confirmed');
    const confirmedChannels = venue.channels.filter((c) => c.status === 'confirmed').map((c) => c.href);
    const allowedKeys = new Set(['@context', '@type', 'name', 'url', 'address', 'sameAs']);
    // Ohne Bestätigung dürfen diese Eigenschaften nie erscheinen (nicht erfinden: Zeiten, Preise, Kontakt, Bewertungen).
    const phone = venue.channels.find((c) => c.type === 'phone');
    const email = venue.channels.find((c) => c.type === 'email');
    for (const { f, text } of blocks()) {
      const data = JSON.parse(text) as Record<string, unknown> & { address: Record<string, string>; sameAs: string[] };
      for (const k of Object.keys(data)) expect(allowedKeys.has(k), `${f}: Eigenschaft ${k} nicht freigegeben`).toBe(true);
      if (phone?.status !== 'confirmed') expect(text, f).not.toMatch(/telephone|\+34|tel:/i);
      if (email?.status !== 'confirmed') expect(text, f).not.toMatch(/"email"|@chucca\.com|mailto:/i);
      if (venue.hours.status !== 'confirmed') expect(text, f).not.toMatch(/"(openingHours\w*|opens|closes|priceRange|aggregateRating|review|geo|hasMenu|menu)"/);
      expect(data['@type']).toBe('BarOrPub');
      expect(data.name).toBe(venue.name);
      expect(data.address).toEqual({
        '@type': 'PostalAddress',
        streetAddress: `${venue.address.building}, ${venue.address.street}`,
        postalCode: venue.address.postalCode,
        addressLocality: venue.address.city,
        addressRegion: 'Illes Balears',
        addressCountry: venue.address.countryCode,
      });
      for (const s of data.sameAs) expect(confirmedChannels, `${f}: sameAs ${s}`).toContain(s);
      expect(data.url, f).toBe(pageUrl(b, f));
    }
  });
});

describe.each(BUILDS)('CSP in $name', (b: Build) => {
  beforeAll(assertBuilt);
  const headers = () => read(b, '_headers');
  const csp = () => /^\s+Content-Security-Policy: (.+)$/m.exec(headers())![1]!;
  const directive = (name: string) => csp().split('; ').find((d) => d === name || d.startsWith(`${name} `)) ?? '';
  const hashesOf = (name: string) => new Set(directive(name).match(/'sha256-[^']+'/g) ?? []);

  it('genau eine CSP, im Block /*, ohne unsafe-inline/unsafe-eval für Skripte und style-Elemente', () => {
    expect(headers().match(/Content-Security-Policy:/g)).toHaveLength(1);
    expect(headers()).toMatch(/^\/\*\n(?:\s+.+\n)*?\s+Content-Security-Policy:/m);
    expect(directive('script-src')).not.toMatch(/unsafe-/);
    expect(directive('style-src')).not.toMatch(/unsafe-/);
    expect(csp()).not.toMatch(/unsafe-eval/);
  });

  it('jeder ausführbare Inline-Script hat einen passenden sha256 in script-src', () => {
    const allowed = hashesOf('script-src');
    let n = 0;
    for (const f of htmlFiles(b)) {
      for (const x of inlineBlocks(read(b, f)).filter((i) => i.kind === 'script')) {
        const type = x.attrs.type ?? '';
        if (x.attrs.src !== undefined) continue;
        // Datenblöcke werden nicht ausgeführt und brauchen keinen Hash.
        if (type === 'application/json' || type === 'application/ld+json') continue;
        expect(['', 'module', 'text/javascript'], `${f}: unbekannter script-Typ ${type}`).toContain(type);
        n += 1;
        expect(allowed.has(sha(x.text)), `${f}: Inline-Script ohne Hash ${sha(x.text)}`).toBe(true);
      }
    }
    expect(n).toBeGreaterThan(0);
  });

  it('jeder Inline-<style> hat einen passenden sha256 in style-src', () => {
    const allowed = hashesOf('style-src');
    for (const f of htmlFiles(b)) {
      for (const x of inlineBlocks(read(b, f)).filter((i) => i.kind === 'style')) {
        expect(allowed.has(sha(x.text)), `${f}: Inline-Style ohne Hash ${sha(x.text)}`).toBe(true);
      }
    }
  });

  it('keine ungenutzten Hashes (Altlasten) in script-src und style-src', () => {
    const used = { script: new Set<string>(), style: new Set<string>() };
    for (const f of htmlFiles(b)) {
      for (const x of inlineBlocks(read(b, f))) if (x.kind === 'style' || (x.attrs.src === undefined && !/json/.test(x.attrs.type ?? ''))) used[x.kind].add(sha(x.text));
    }
    expect([...hashesOf('script-src')].filter((h) => !used.script.has(h))).toEqual([]);
    expect([...hashesOf('style-src')].filter((h) => !used.style.has(h))).toEqual([]);
  });

  it('keine Inline-Ereignisattribute, keine javascript:-URLs, keine fremden Ressourcen-Hosts', () => {
    for (const f of htmlFiles(b)) {
      for (const t of tags(read(b, f))) {
        for (const [k, v] of Object.entries(t.attrs)) {
          expect(/^on[a-z]+$/.test(k), `${f}: <${t.name} ${k}>`).toBe(false);
          if (['href', 'src', 'action'].includes(k)) expect(v, `${f}: <${t.name} ${k}>`).not.toMatch(/^\s*javascript:/i);
        }
        const loaded = (t.name === 'script' || t.name === 'img' || t.name === 'iframe' || (t.name === 'link' && t.attrs.rel !== 'canonical' && t.attrs.rel !== 'alternate')) && (t.attrs.src ?? t.attrs.href);
        if (loaded && /^(https?:)?\/\//.test(loaded) && !t.attrs.rel?.includes('apple')) {
          expect(new URL(loaded, 'https://chucca.example').host, `${f}: <${t.name}>`).toBe('chucca.example');
        }
      }
    }
  });

  it('_headers erreicht jede Datei-Art: Cache-Regel für HTML, Skripte, Manifest und sw.js', () => {
    const text = headers();
    expect(text).toMatch(/\/_astro\/\*\n\s+Cache-Control: public, max-age=31536000, immutable/);
    expect(text).toMatch(/\/sw\.js\n\s+Cache-Control: no-cache/);
    expect(text).toMatch(/\/manifest\.webmanifest\n\s+Cache-Control: no-cache/);
  });
});
