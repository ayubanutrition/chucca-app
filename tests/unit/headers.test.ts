import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { buildHeadersFile, collectInlineHashes, contentSecurityPolicy } from '../../src/lib/headers';

const hash = (text: string) => `'sha256-${createHash('sha256').update(text).digest('base64')}'`;

describe('collectInlineHashes', () => {
  const html = [
    '<style>a{color:red}</style>',
    '<script>console.log(1)</script>',
    '<script type="module">import 1</script>',
    '<script type="application/json" id="x">{"a":1}</script>',
    '<script type="application/ld+json">{"@context":"x"}</script>',
    '<script type="module" src="/_astro/a.js"></script>',
    '<script>  </script>',
  ].join('');

  it('hasht ausführbare Inline-Skripte und Styles über den exakten Text', () => {
    const { scripts, styles } = collectInlineHashes([html]);
    expect(scripts).toEqual([hash('console.log(1)'), hash('import 1')].sort());
    expect(styles).toEqual([hash('a{color:red}')]);
  });

  it('lässt Datenblöcke, externe Skripte und leere Skripte aus', () => {
    const { scripts } = collectInlineHashes([html]);
    expect(scripts).not.toContain(hash('{"a":1}'));
    expect(scripts).toHaveLength(2);
  });

  it('dedupliziert über mehrere Dokumente', () => {
    expect(collectInlineHashes([html, html]).scripts).toHaveLength(2);
  });
});

describe('contentSecurityPolicy', () => {
  const csp = contentSecurityPolicy({ scripts: ["'sha256-AAA='"], styles: ["'sha256-BBB='"] });
  const directives = csp.split('; ');

  it('trägt die Hashes ein und erlaubt weder eval noch inline-Skripte', () => {
    expect(directives).toContain("script-src 'self' 'sha256-AAA='");
    expect(directives).toContain("style-src 'self' 'sha256-BBB='");
    expect(csp).not.toContain('unsafe-eval');
    expect(directives.find((d) => d.startsWith('script-src'))).not.toContain('unsafe-inline');
    expect(directives.find((d) => d.startsWith('style-src '))).not.toContain('unsafe-inline');
  });

  it('beschränkt alles übrige auf die eigene Herkunft', () => {
    for (const d of ["default-src 'none'", "img-src 'self' data:", "font-src 'self'", "connect-src 'self'", "manifest-src 'self'", "worker-src 'self'", "base-uri 'none'", "form-action 'none'", "frame-ancestors 'none'", "object-src 'none'"]) {
      expect(directives).toContain(d);
    }
  });
});

describe('buildHeadersFile', () => {
  const files = ['index.html', 'de/index.html', 'de/besuch/index.html', 'en/index.html', '_astro/a.js', '_astro/b.css', 'sw.js', 'robots.txt', 'manifest.webmanifest', '404.html', '_headers'];
  const hashes = { scripts: ["'sha256-AAA='"], styles: ["'sha256-BBB='"] };
  const text = (noindex: boolean) => buildHeadersFile({ files, hashes, noindex });
  /** Blöcke als { Muster: { name: wert } }. */
  const parse = (source: string) => {
    const out: Record<string, Record<string, string>> = {};
    let current = '';
    for (const line of source.split('\n')) {
      if (line === '' || line.startsWith('#')) continue;
      if (!line.startsWith(' ')) out[(current = line)] = {};
      else out[current]![line.slice(2, line.indexOf(':'))] = line.slice(line.indexOf(':') + 2);
    }
    return out;
  };

  it('setzt Sicherheits-Header auf alle Pfade', () => {
    const all = parse(text(false))['/*']!;
    expect(all['X-Content-Type-Options']).toBe('nosniff');
    expect(all['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(all['Cross-Origin-Opener-Policy']).toBe('same-origin');
    for (const feature of ['geolocation', 'camera', 'microphone', 'usb']) expect(all['Permissions-Policy']).toContain(`${feature}=()`);
    expect(all['Content-Security-Policy']).toContain("script-src 'self' 'sha256-AAA='");
  });

  it('X-Robots-Tag nur bei noindex', () => {
    expect(parse(text(true))['/*']!['X-Robots-Tag']).toBe('noindex, nofollow');
    expect(parse(text(false))['/*']!['X-Robots-Tag']).toBeUndefined();
  });

  it('Cache: /_astro/* ein Jahr immutable, alles andere no-cache, ohne Überlappung', () => {
    const rules = parse(text(false));
    expect(rules['/_astro/*']).toEqual({ 'Cache-Control': 'public, max-age=31536000, immutable' });
    for (const path of ['/', '/de/*', '/en/*', '/sw.js', '/robots.txt', '/manifest.webmanifest', '/404.html']) expect(rules[path], path).toEqual({ 'Cache-Control': 'no-cache' });
    expect(rules['/*']!['Cache-Control']).toBeUndefined();
    expect(Object.keys(rules)).not.toContain('/index.html');
    expect(Object.keys(rules)).not.toContain('/_headers');
  });
});
