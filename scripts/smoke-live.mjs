/**
 * Smoke-Test gegen eine ausgelieferte Website (Vorschau oder Live-URL). Nur lesend: ausschließlich GET und HEAD,
 * ausschließlich gegen den Host der angegebenen Basis-URL, keine Weiterleitung wird verfolgt, nichts wird gesendet.
 *
 * Aufruf: node scripts/smoke-live.mjs <Basis-URL> [--mode public|preview] [--json] [--verbose] [--timeout <ms>]
 *   Basis-URL  z. B. https://example.org oder https://example.org/unterpfad/ (mit Unterpfad, wenn so gehostet)
 *   --mode     public (Standard): Canonical, hreflang, Sitemap, robots.txt mit Sitemap, kein noindex erwartet.
 *              preview: noindex (Meta und X-Robots-Tag) und `Disallow: /` erwartet.
 *   --json     Ergebnis als JSON statt Text
 *   --verbose  auch die bestandenen Prüfungen (OK) im Text ausgeben; sonst nur WARN und FAIL
 * Exit-Code: 0 = kein FAIL (WARN erlaubt), 1 = mindestens ein FAIL, 2 = falscher Aufruf.
 *
 * Geprüft wird, was von außen sichtbar ist (docs/17_GOLIVE.md, Abschnitt „Smoke-Test“). Das ersetzt weder den Browsertest
 * (docs/11_HOSTING.md) noch einen Gerätetest (docs/14_GERAETETEST.md).
 */
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const LOCALES = ['de', 'en', 'es'];
const NO_CACHE = /(?:^|[\s,])(?:no-cache|no-store|max-age=0)(?:$|[\s,])/i;
const LOCAL_HOST = /^(?:localhost|127\.0\.0\.1|\[::1\])$/;

/** Schlägt bei einem Aufruf mit unzulässiger Methode fehl, bevor irgendetwas gesendet wird. */
function guardedFetch(fetchImpl, timeoutMs) {
  return async (url, method) => {
    if (method !== 'GET' && method !== 'HEAD') throw new Error(`Methode ${method} ist im Smoke-Test nicht erlaubt`);
    const response = await fetchImpl(url, {
      method,
      redirect: 'manual',
      signal: AbortSignal.timeout(timeoutMs),
      headers: { 'user-agent': 'chucca-smoke-live/1 (nur lesend)', accept: '*/*' },
    });
    const headers = Object.fromEntries([...response.headers.entries()].map(([k, v]) => [k.toLowerCase(), v]));
    const text = method === 'GET' ? await response.text() : '';
    return { status: response.status, headers, text };
  };
}

/** Attribute eines Tags (`<link rel=… href=…>`) als Objekt, Namen klein. */
function attributes(tag) {
  const out = {};
  for (const m of tag.matchAll(/([a-zA-Z:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) out[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? '';
  return out;
}

const sha256 = (text) => `'sha256-${createHash('sha256').update(text, 'utf8').digest('base64')}'`;

/** Hashes aller ausführbaren Inline-Skripte und <style>-Blöcke, wie sie `src/lib/headers.ts` beim Build berechnet. */
export function inlineHashes(html) {
  const scripts = new Set();
  const styles = new Set();
  for (const [, attrs = '', body = ''] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/\bsrc\s*=/i.test(attrs)) continue;
    const type = attributes(`<script ${attrs}>`).type ?? '';
    if (/^\s*(application\/(ld\+)?json|text\/json)\s*$/i.test(type)) continue;
    if (body.trim() !== '') scripts.add(sha256(body));
  }
  for (const [, , body = ''] of html.matchAll(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi)) if (body.trim() !== '') styles.add(sha256(body));
  return { scripts: [...scripts], styles: [...styles] };
}

/** @param {string} html @param {string} rel */
function linkTags(html, rel) {
  return [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => attributes(m[0])).filter((a) => (a.rel ?? '').toLowerCase() === rel);
}

/**
 * @param {{ base: string, mode?: 'public' | 'preview', timeoutMs?: number, fetchImpl?: typeof fetch }} options
 * @returns {Promise<{ results: { level: 'OK' | 'WARN' | 'FAIL', name: string, detail: string }[], failed: number, warned: number }>}
 */
export async function runSmoke({ base, mode = 'public', timeoutMs = 10_000, fetchImpl = fetch }) {
  const root = new URL(base);
  if (root.protocol !== 'https:' && root.protocol !== 'http:') throw new Error('Basis-URL muss http(s) sein');
  if (root.username || root.password) throw new Error('Basis-URL darf keine Zugangsdaten enthalten');
  root.search = '';
  root.hash = '';
  if (!root.pathname.endsWith('/')) root.pathname += '/';
  const origin = root.origin;
  const basePath = root.pathname; // z. B. "/" oder "/unterpfad/"
  const at = (path) => new URL(path.replace(/^\//, ''), root).toString();
  const get = guardedFetch(fetchImpl, timeoutMs);
  const results = [];
  const add = (level, name, detail = '') => results.push({ level, name, detail });
  const check = (ok, name, detail = '', level = 'FAIL') => add(ok ? 'OK' : level, name, ok ? '' : detail);
  const safe = async (url, method = 'GET') => {
    try {
      return await get(url, method);
    } catch (error) {
      add('FAIL', `Abruf ${method} ${url}`, error instanceof Error ? error.message : String(error));
      return null;
    }
  };

  // Transport
  if (root.protocol === 'https:') {
    // HSTS gehört zur Domain-Entscheidung (docs/11_HOSTING.md); fehlt er, ist das eine Warnung, kein Abbruch.
  } else if (mode === 'public' && !LOCAL_HOST.test(root.hostname)) {
    add('FAIL', 'HTTPS', 'Öffentlicher Betrieb über http (außer localhost) ist nicht zulässig');
  } else if (!LOCAL_HOST.test(root.hostname)) {
    add('WARN', 'HTTPS', 'Vorschau über http');
  }

  const checkHeaders = (name, res) => {
    const h = res.headers;
    check(h['x-content-type-options']?.toLowerCase() === 'nosniff', `${name}: X-Content-Type-Options nosniff`, `ist „${h['x-content-type-options'] ?? 'fehlt'}“`);
    check(h['referrer-policy'] === 'strict-origin-when-cross-origin', `${name}: Referrer-Policy`, `ist „${h['referrer-policy'] ?? 'fehlt'}“`);
    const csp = h['content-security-policy'] ?? '';
    check(csp !== '', `${name}: Content-Security-Policy vorhanden`, 'fehlt');
    if (csp) {
      check(/(?:^|;\s*)default-src 'none'/.test(csp), `${name}: CSP default-src 'none'`, "default-src ist nicht 'none'");
      check(!/'unsafe-eval'/.test(csp) && !/script-src[^;]*'unsafe-inline'/.test(csp), `${name}: CSP ohne unsafe-eval und Skript-unsafe-inline`, 'unsafe-eval oder unsafe-inline in script-src');
      const hashes = inlineHashes(res.text);
      const scriptSrc = /script-src([^;]*)/.exec(csp)?.[1] ?? '';
      const styleSrc = /(?:^|;\s*)style-src([^;]*)/.exec(csp)?.[1] ?? '';
      const missing = [...hashes.scripts.filter((x) => !scriptSrc.includes(x)), ...hashes.styles.filter((x) => !styleSrc.includes(x))];
      check(missing.length === 0, `${name}: CSP-Hashes der Inline-Skripte und -Styles passen`, `${missing.length} Hash(es) fehlen in der CSP (Host liefert veraltete oder fremde CSP?)`);
    }
    const cache = h['cache-control'] ?? '';
    check(NO_CACHE.test(cache), `${name}: Cache-Control revalidiert (no-cache)`, `ist „${cache || 'fehlt'}“`);
    if (mode === 'preview') check(/noindex/i.test(h['x-robots-tag'] ?? ''), `${name}: X-Robots-Tag noindex (Vorschau)`, `ist „${h['x-robots-tag'] ?? 'fehlt'}“`);
    else check(!/noindex/i.test(h['x-robots-tag'] ?? ''), `${name}: kein X-Robots-Tag noindex (öffentlich)`, `ist „${h['x-robots-tag']}“`);
  };

  /** Seite abrufen, Status, Header, Robots-Meta, Canonical und hreflang prüfen. @returns Antwort oder null */
  const checkPage = async (url, { strictLinks }) => {
    const label = new URL(url).pathname;
    const res = await safe(url);
    if (!res) return null;
    if (res.status !== 200) {
      add('FAIL', `${label}: Status 200`, `Status ${res.status}${res.headers.location ? ` (Weiterleitung nach ${res.headers.location}, nicht verfolgt)` : ''}`);
      return null;
    }
    add('OK', `${label}: Status 200`);
    check(/text\/html/i.test(res.headers['content-type'] ?? ''), `${label}: Content-Type HTML`, `ist „${res.headers['content-type'] ?? 'fehlt'}“`);
    checkHeaders(label, res);
    const robotsMeta = (/<meta\b[^>]*name=["']robots["'][^>]*>/i.exec(res.text) ?? [''])[0];
    const content = attributes(robotsMeta).content ?? '';
    if (mode === 'preview') check(/noindex/i.test(content), `${label}: Meta robots noindex (Vorschau)`, `ist „${content || 'fehlt'}“`);
    else if (strictLinks) {
      check(content !== '' && !/noindex/i.test(content), `${label}: Meta robots ohne noindex`, `ist „${content || 'fehlt'}“`);
      const canon = linkTags(res.text, 'canonical');
      check(canon.length === 1 && canon[0].href === url, `${label}: Canonical zeigt auf sich selbst`, `ist „${canon.map((c) => c.href).join(', ') || 'fehlt'}“, erwartet „${url}“`);
      const alts = linkTags(res.text, 'alternate').filter((a) => a.hreflang);
      const langs = new Set(alts.map((a) => a.hreflang));
      check([...LOCALES, 'x-default'].every((l) => langs.has(l)), `${label}: hreflang de, en, es, x-default`, `vorhanden: ${[...langs].join(', ') || 'keine'}`);
      check(alts.every((a) => a.href?.startsWith(origin + basePath)), `${label}: hreflang-Ziele auf eigenem Host und Pfad`, `abweichend: ${alts.filter((a) => !a.href?.startsWith(origin + basePath)).map((a) => a.href).join(', ')}`);
      const self = alts.find((a) => a.hreflang === new URL(url).pathname.slice(basePath.length).split('/')[0]);
      if (self) check(self.href === url, `${label}: hreflang der eigenen Sprache = Canonical`, `${self.href} ≠ ${url}`);
    }
    return res;
  };

  // Startseite und Sprachseiten
  const home = await safe(at('/'));
  if (home) {
    check(home.status === 200, 'Start: Status 200', `Status ${home.status}${home.headers.location ? ` (Weiterleitung nach ${home.headers.location}, nicht verfolgt)` : ''}`);
    if (home.status === 200) checkHeaders('Start', home);
  }
  const pages = new Map();
  for (const locale of LOCALES) {
    const url = at(`/${locale}/`);
    pages.set(url, await checkPage(url, { strictLinks: true }));
  }

  // robots.txt
  const robots = await safe(at('/robots.txt'));
  if (robots) {
    check(robots.status === 200, 'robots.txt: Status 200', `Status ${robots.status}`);
    if (mode === 'preview') check(/^Disallow:\s*\/\s*$/m.test(robots.text), 'robots.txt: Disallow / (Vorschau)', 'Disallow: / fehlt');
    else {
      check(!/^Disallow:\s*\/\s*$/m.test(robots.text), 'robots.txt: sperrt nicht alles', 'enthält „Disallow: /“');
      const sm = /^Sitemap:\s*(\S+)\s*$/m.exec(robots.text)?.[1];
      check(sm === at('/sitemap.xml'), 'robots.txt: Sitemap-Zeile zeigt auf diese Basis-URL', `ist „${sm ?? 'fehlt'}“, erwartet „${at('/sitemap.xml')}“`);
      if (basePath !== '/') add('WARN', 'robots.txt im Unterpfad', 'Suchmaschinen lesen robots.txt nur an der Wurzel der Domain');
    }
  }

  // Sitemap (nur öffentlich)
  if (mode === 'public') {
    const sitemap = await safe(at('/sitemap.xml'));
    if (sitemap) {
      check(sitemap.status === 200, 'sitemap.xml: Status 200', `Status ${sitemap.status}`);
      const locs = [...sitemap.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
      check(locs.length > 0, 'sitemap.xml: enthält URLs', 'keine <loc>-Einträge');
      const foreign = locs.filter((l) => !l.startsWith(origin + basePath));
      check(foreign.length === 0, 'sitemap.xml: alle URLs auf dieser Basis-URL', `${foreign.length} URL(s) auf anderem Host oder Pfad, nicht abgerufen (z. B. ${foreign[0]}). Build mit falscher CHUCCA_SITE_URL/CHUCCA_BASE?`);
      for (const loc of locs.filter((l) => l.startsWith(origin + basePath))) {
        if (!pages.has(loc)) pages.set(loc, await checkPage(loc, { strictLinks: true }));
      }
      if (locs.length > 0) add('OK', `sitemap.xml: ${locs.length} URL(s) geprüft`, `${locs.length - foreign.length} abgerufen`);
    }
  }

  // Manifest und Icons
  const manifestRes = await safe(at('/manifest.webmanifest'));
  if (manifestRes) {
    check(manifestRes.status === 200, 'manifest.webmanifest: Status 200', `Status ${manifestRes.status}`);
    check(/manifest\+json/i.test(manifestRes.headers['content-type'] ?? ''), 'manifest.webmanifest: Content-Type application/manifest+json', `ist „${manifestRes.headers['content-type'] ?? 'fehlt'}“`);
    try {
      const manifest = JSON.parse(manifestRes.text);
      check(manifest.start_url === basePath, 'Manifest: start_url = Basispfad', `ist „${manifest.start_url}“, erwartet „${basePath}“`);
      check(manifest.scope === basePath, 'Manifest: scope = Basispfad', `ist „${manifest.scope}“, erwartet „${basePath}“`);
      check(manifest.display === 'standalone', 'Manifest: display standalone', `ist „${manifest.display}“`);
      for (const icon of manifest.icons ?? []) {
        const url = new URL(icon.src, origin).toString();
        if (!url.startsWith(origin + basePath)) {
          add('FAIL', `Manifest-Icon ${icon.src}`, 'liegt außerhalb von Host oder Basispfad, nicht abgerufen');
          continue;
        }
        const res = await safe(url, 'HEAD');
        if (res) check(res.status === 200 && /^image\//i.test(res.headers['content-type'] ?? ''), `Manifest-Icon ${icon.src}`, `Status ${res.status}, Typ „${res.headers['content-type'] ?? 'fehlt'}“`);
      }
    } catch {
      add('FAIL', 'manifest.webmanifest: gültiges JSON', 'nicht parsebar');
    }
  }

  // Service Worker
  const sw = await safe(at('/sw.js'));
  if (sw) {
    check(sw.status === 200, 'sw.js: Status 200', `Status ${sw.status}`);
    check(/javascript/i.test(sw.headers['content-type'] ?? ''), 'sw.js: Content-Type JavaScript', `ist „${sw.headers['content-type'] ?? 'fehlt'}“`);
    check(NO_CACHE.test(sw.headers['cache-control'] ?? ''), 'sw.js: Cache-Control no-cache (sonst kommen Updates nicht an)', `ist „${sw.headers['cache-control'] ?? 'fehlt'}“`);
    check(sw.headers['x-content-type-options']?.toLowerCase() === 'nosniff', 'sw.js: nosniff', `ist „${sw.headers['x-content-type-options'] ?? 'fehlt'}“`);
  }

  // Hash-benannte Assets: unveränderlich cachebar
  const sample = [...pages.values()].find((p) => p)?.text ?? '';
  const asset = /(?:href|src)=["']([^"']*\/_astro\/[^"']+\.(?:css|js))["']/.exec(sample)?.[1];
  if (asset) {
    const url = new URL(asset, at('/de/')).toString();
    if (url.startsWith(origin + basePath)) {
      const res = await safe(url, 'HEAD');
      if (res) {
        check(res.status === 200, `Asset ${new URL(url).pathname}: Status 200`, `Status ${res.status}`);
        check(/immutable/i.test(res.headers['cache-control'] ?? '') && /max-age=31536000/.test(res.headers['cache-control'] ?? ''), 'Asset: Cache-Control immutable, ein Jahr', `ist „${res.headers['cache-control'] ?? 'fehlt'}“`);
      }
    }
  } else if (sample) add('WARN', 'Asset-Stichprobe', 'kein /_astro/-Asset in der Seite gefunden');

  // 404-Verhalten und Steuerdatei
  const missing = await safe(at(`/__smoke-${Date.now().toString(36)}-nicht-vorhanden/`));
  if (missing) {
    check(missing.status === 404, '404: unbekannter Pfad liefert Status 404 (kein Soft-404)', `Status ${missing.status}`);
    check(/<html/i.test(missing.text) && missing.text.length > 200, '404: eigene Fehlerseite statt leerer Antwort', 'Antwort ohne HTML-Seite');
  }
  const headersFile = await safe(at('/_headers'));
  if (headersFile) check(headersFile.status !== 200 || !/Content-Security-Policy/i.test(headersFile.text), '_headers wird nicht ausgeliefert', 'Die Steuerdatei ist öffentlich lesbar (kein Geheimnis, aber nicht gewollt; scripts/serve.mjs liefert sie als Simulation immer aus)', 'WARN');

  // HSTS (Warnung, gehört zur Domain-Entscheidung)
  if (root.protocol === 'https:') {
    const hsts = (await safe(at('/de/'), 'HEAD'))?.headers['strict-transport-security'];
    check(Boolean(hsts), 'Strict-Transport-Security', 'fehlt (Wert gehört zur Domain-Entscheidung, docs/11_HOSTING.md)', 'WARN');
  }

  return { results, failed: results.filter((r) => r.level === 'FAIL').length, warned: results.filter((r) => r.level === 'WARN').length };
}

async function main() {
  const args = process.argv.slice(2);
  const take = (flag, hasValue) => {
    const i = args.indexOf(flag);
    if (i === -1) return null;
    const value = hasValue ? args[i + 1] : true;
    args.splice(i, hasValue ? 2 : 1);
    return value ?? null;
  };
  const mode = take('--mode', true) ?? 'public';
  const json = take('--json', false) === true;
  const verbose = take('--verbose', false) === true;
  const timeout = Number(take('--timeout', true) ?? 10_000);
  if (args.length !== 1 || !['public', 'preview'].includes(mode) || !Number.isFinite(timeout) || timeout <= 0) {
    console.error('Aufruf: node scripts/smoke-live.mjs <Basis-URL> [--mode public|preview] [--json] [--verbose] [--timeout <ms>]');
    process.exit(2);
  }
  let report;
  try {
    report = await runSmoke({ base: args[0], mode, timeoutMs: timeout });
  } catch (error) {
    console.error(`Smoke-Test nicht gestartet: ${error instanceof Error ? error.message : error}`);
    process.exit(2);
  }
  if (json) console.log(JSON.stringify(report, null, 2));
  else {
    for (const r of report.results) if (verbose || r.level !== 'OK') console.log(`${r.level.padEnd(4)} ${r.name}${r.detail ? ` — ${r.detail}` : ''}`);
    console.log(`\nSmoke-Test ${mode} gegen ${args[0]}: ${report.results.length} Prüfung(en), ${report.failed} FAIL, ${report.warned} WARN`);
  }
  process.exit(report.failed > 0 ? 1 : 0);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
