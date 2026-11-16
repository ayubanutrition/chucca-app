import { execFile, spawn, type ChildProcess } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { createServer as createNetServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it } from 'vitest';

/**
 * Smoke-Test gegen eine ausgelieferte Seite (`scripts/smoke-live.mjs`, Runbook `docs/17_GOLIVE.md`).
 * Gegenstand ist ein Mini-Auftritt in einem Temp-Ordner, ausgeliefert von `scripts/serve.mjs` (liest `_headers`).
 */
const run = promisify(execFile);
const cleanup: (() => void)[] = [];
afterEach(() => {
  for (const fn of cleanup.splice(0)) fn();
});

const freePort = () =>
  new Promise<number>((resolve, reject) => {
    const s = createNetServer();
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address() as { port: number };
      s.close(() => resolve(port));
    });
    s.on('error', reject);
  });

const SCRIPT = 'window.__x = 1;';
const hash = `'sha256-${createHash('sha256').update(SCRIPT, 'utf8').digest('base64')}'`;

/** Seite mit Canonical, hreflang, Robots-Meta und einem Inline-Skript. */
function page(origin: string, locale: string, robots = 'index,follow') {
  const alt = ['de', 'en', 'es'].map((l) => `<link rel="alternate" hreflang="${l}" href="${origin}/${l}/">`).join('');
  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><title>t</title><meta name="robots" content="${robots}"><link rel="canonical" href="${origin}/${locale}/">${alt}<link rel="alternate" hreflang="x-default" href="${origin}/en/"><link rel="stylesheet" href="/_astro/a.abc.css"></head><body><script>${SCRIPT}</script><p>${'x'.repeat(50)}</p></body></html>`;
}

const GOOD_HEADERS = (csp: string) => `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Content-Security-Policy: ${csp}
/_astro/*
  Cache-Control: public, max-age=31536000, immutable
/
  Cache-Control: no-cache
/de/*
  Cache-Control: no-cache
/en/*
  Cache-Control: no-cache
/es/*
  Cache-Control: no-cache
/sw.js
  Cache-Control: no-cache
/manifest.webmanifest
  Cache-Control: no-cache
`;

interface SiteOptions {
  headers?: (csp: string) => string;
  csp?: string;
  sitemapHost?: string;
}

/** Legt den Auftritt an und startet `scripts/serve.mjs`; gibt die Basis-URL zurück. */
async function startSite(options: SiteOptions = {}): Promise<string> {
  const port = await freePort();
  const origin = `http://127.0.0.1:${port}`;
  const dir = mkdtempSync(join(tmpdir(), 'smoke-live-'));
  cleanup.push(() => rmSync(dir, { recursive: true, force: true }));
  for (const l of ['de', 'en', 'es']) {
    mkdirSync(join(dir, l));
    writeFileSync(join(dir, l, 'index.html'), page(origin, l));
  }
  mkdirSync(join(dir, '_astro'));
  writeFileSync(join(dir, '_astro', 'a.abc.css'), 'body{}');
  writeFileSync(join(dir, 'index.html'), '<!doctype html><html><body><p>Auswahl</p></body></html>');
  writeFileSync(join(dir, '404.html'), `<!doctype html><html><body><h1>404</h1><p>${'n'.repeat(250)}</p></body></html>`);
  writeFileSync(join(dir, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);
  const host = options.sitemapHost ?? origin;
  writeFileSync(join(dir, 'sitemap.xml'), `<?xml version="1.0"?><urlset>${['de', 'en', 'es'].map((l) => `<url><loc>${host}/${l}/</loc></url>`).join('')}</urlset>`);
  writeFileSync(join(dir, 'manifest.webmanifest'), JSON.stringify({ start_url: '/', scope: '/', display: 'standalone', icons: [{ src: '/icon.png', sizes: '192x192', type: 'image/png' }] }));
  writeFileSync(join(dir, 'icon.png'), 'png');
  writeFileSync(join(dir, 'sw.js'), '// sw');
  const csp = options.csp ?? `default-src 'none'; script-src 'self' ${hash}; style-src 'self'; connect-src 'self'`;
  writeFileSync(join(dir, '_headers'), (options.headers ?? GOOD_HEADERS)(csp));
  const child: ChildProcess = spawn(process.execPath, ['scripts/serve.mjs', dir, String(port)], { stdio: 'ignore' });
  cleanup.push(() => child.kill());
  for (let i = 0; i < 50; i += 1) {
    try {
      await fetch(`${origin}/robots.txt`);
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  return origin;
}

interface Report {
  results: { level: string; name: string; detail: string }[];
  failed: number;
  warned: number;
}

async function smoke(url: string, extra: string[] = []): Promise<{ code: number; report: Report | null; stderr: string }> {
  try {
    const { stdout } = await run(process.execPath, ['scripts/smoke-live.mjs', url, '--json', ...extra]);
    return { code: 0, report: JSON.parse(stdout) as Report, stderr: '' };
  } catch (error) {
    const e = error as { code: number; stdout: string; stderr: string };
    return { code: e.code, report: e.stdout ? (JSON.parse(e.stdout) as Report) : null, stderr: e.stderr };
  }
}

const fails = (report: Report | null) => (report?.results ?? []).filter((r) => r.level === 'FAIL').map((r) => r.name);

describe('smoke-live gegen scripts/serve.mjs', () => {
  it('ein vollständiger Auftritt besteht ohne FAIL (Exit 0); Hash der Inline-Skripte wird live geprüft', async () => {
    const origin = await startSite();
    const { code, report } = await smoke(`${origin}/`);
    expect(fails(report)).toEqual([]);
    expect(code).toBe(0);
    const names = report!.results.map((r) => r.name);
    for (const expected of ['/de/: CSP-Hashes der Inline-Skripte und -Styles passen', 'sw.js: Cache-Control no-cache (sonst kommen Updates nicht an)', '404: unbekannter Pfad liefert Status 404 (kein Soft-404)', 'Manifest: start_url = Basispfad', '/en/: Canonical zeigt auf sich selbst']) {
      expect(names).toContain(expected);
    }
  }, 30_000);

  it('fehlende Header, falsche CSP-Hashes und gecachter sw.js ergeben FAIL und Exit 1', async () => {
    const origin = await startSite({ csp: "default-src 'none'; script-src 'self' 'sha256-AAAA'", headers: (csp) => `/*\n  Content-Security-Policy: ${csp}\n/sw.js\n  Cache-Control: public, max-age=3600\n/\n  Cache-Control: no-cache\n/de/*\n  Cache-Control: no-cache\n/en/*\n  Cache-Control: no-cache\n/es/*\n  Cache-Control: no-cache\n` });
    const { code, report } = await smoke(`${origin}/`);
    expect(code).toBe(1);
    const failed = fails(report);
    expect(failed).toContain('/de/: CSP-Hashes der Inline-Skripte und -Styles passen');
    expect(failed).toContain('/de/: X-Content-Type-Options nosniff');
    expect(failed).toContain('/de/: Referrer-Policy');
    expect(failed).toContain('sw.js: Cache-Control no-cache (sonst kommen Updates nicht an)');
  }, 30_000);

  it('Vorschau-Modus verlangt noindex; ein öffentlicher Auftritt besteht ihn nicht', async () => {
    const origin = await startSite();
    const { code, report } = await smoke(`${origin}/`, ['--mode', 'preview']);
    expect(code).toBe(1);
    expect(fails(report)).toContain('/de/: X-Robots-Tag noindex (Vorschau)');
    expect(fails(report)).toContain('robots.txt: Disallow / (Vorschau)');
  }, 30_000);

  it('Sitemap mit fremdem Host: FAIL, die fremden URLs werden nicht abgerufen', async () => {
    const origin = await startSite({ sitemapHost: 'https://fremd.invalid' });
    const { code, report } = await smoke(`${origin}/`);
    expect(code).toBe(1);
    expect(fails(report)).toContain('sitemap.xml: alle URLs auf dieser Basis-URL');
    // Ein Abruf des fremden Hosts würde als „Abruf GET …“ scheitern; es gibt keinen.
    expect(fails(report).filter((n) => n.startsWith('Abruf'))).toEqual([]);
  }, 30_000);

  it('falscher Aufruf: Exit 2, keine Zugangsdaten in der URL, kein anderes Schema', async () => {
    expect((await smoke('')).code).toBe(2);
    const creds = await smoke('http://user:pass@127.0.0.1:9/');
    expect(creds.code).toBe(2);
    expect(creds.stderr).toContain('Zugangsdaten');
    expect((await smoke('ftp://127.0.0.1/')).code).toBe(2);
    expect((await smoke('http://127.0.0.1:9/', ['--mode', 'bogus'])).code).toBe(2);
  }, 30_000);
});

describe('smoke-live ist nur lesend', () => {
  let server: Server;
  it('sendet ausschließlich GET und HEAD und nur an die Basis-URL', async () => {
    const seen: { method: string; url: string; host: string }[] = [];
    server = createServer((req, res) => {
      seen.push({ method: req.method ?? '', url: req.url ?? '', host: req.headers.host ?? '' });
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('nein');
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    cleanup.push(() => server.close());
    const { port } = server.address() as { port: number };
    const { code, report } = await smoke(`http://127.0.0.1:${port}/unterpfad/`);
    expect(code).toBe(1); // alles 404: der Test prüft nur, was gesendet wurde
    expect(report!.failed).toBeGreaterThan(0);
    expect(seen.length).toBeGreaterThan(5);
    expect([...new Set(seen.map((s) => s.method))].sort()).toEqual(['GET']);
    expect(new Set(seen.map((s) => s.host))).toEqual(new Set([`127.0.0.1:${port}`]));
    expect(seen.every((s) => s.url.startsWith('/unterpfad/'))).toBe(true);
  }, 30_000);

  it('Quelltext kennt keine schreibende Methode', async () => {
    const { readFileSync } = await import('node:fs');
    const text = readFileSync(join(process.cwd(), 'scripts/smoke-live.mjs'), 'utf8');
    expect(text).not.toMatch(/method:\s*['"](?:POST|PUT|PATCH|DELETE)/);
    expect(text).toContain("method !== 'GET' && method !== 'HEAD'");
  });
});
