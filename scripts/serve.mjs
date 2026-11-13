/**
 * Kleiner statischer Server für Tests und lokale Abnahme: node scripts/serve.mjs <ordner> <port> [/prefix/]
 *
 * Header: Liegt im Ordner eine `_headers` (Format Netlify / Cloudflare Pages, vom Build erzeugt),
 * sendet der Server dieselben Header wie ein Host mit dieser Datei. Unterstützt wird nur, was der Build
 * schreibt: Pfadmuster ohne Einrückung (`*` passt auf beliebig viel, auch `/`), darunter eingerückte
 * `Name: Wert`-Zeilen, `#`-Kommentare. Treffen mehrere Muster zu, werden gleichnamige Header wie bei
 * Cloudflare Pages mit ", " zusammengeführt. Muster gelten für den Pfad relativ zum Ordner (ohne Präfix).
 * Das ist eine Simulation für Tests, kein Ersatz für die Prüfung auf dem echten Host.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve(process.argv[2] ?? 'dist');
const port = Number(process.argv[3] ?? 4321);
const prefix = (process.argv[4] ?? '/').replace(/\/?$/, '/');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.ics': 'text/calendar; charset=utf-8' };

/** `_headers` → [{ pattern: RegExp, headers: [[name, value]] }]; ohne Datei leer. */
async function readRules() {
  const text = await readFile(join(root, '_headers'), 'utf8').catch(() => '');
  const rules = [];
  for (const line of text.split(/\r?\n/)) {
    if (line.trim() === '' || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      const source = line.trim().split('*').map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*');
      rules.push({ pattern: new RegExp(`^${source}$`), headers: [] });
    } else if (rules.length > 0) {
      const at = line.indexOf(':');
      if (at > 0) rules.at(-1).headers.push([line.slice(0, at).trim().toLowerCase(), line.slice(at + 1).trim()]);
    }
  }
  return rules;
}

async function headersFor(path) {
  const merged = {};
  for (const rule of await readRules()) {
    if (!rule.pattern.test(path)) continue;
    for (const [name, value] of rule.headers) merged[name] = merged[name] ? `${merged[name]}, ${value}` : value;
  }
  return merged;
}

createServer(async (request, response) => {
  let raw;
  try {
    raw = decodeURIComponent(new URL(request.url ?? '/', 'http://x').pathname);
  } catch {
    // Fehlerhafte Prozentkodierung (z. B. `%E0%A4%A`) darf den Testserver nicht beenden.
    response.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Bad request');
    return;
  }
  // Hosting im Unterpfad: außerhalb des Präfixes gibt es nichts.
  const path = normalize(raw.startsWith(prefix) ? `/${raw.slice(prefix.length)}` : '/__außerhalb__');
  const extra = await headersFor(path);
  let file = join(root, path);
  try {
    if (!file.startsWith(root)) throw new Error('outside');
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    const body = await readFile(file);
    // Ohne `_headers` gilt wie bisher `no-cache`.
    response.writeHead(200, { 'cache-control': 'no-cache', 'content-type': types[extname(file)] ?? 'application/octet-stream', ...extra });
    response.end(body);
  } catch {
    const body = await readFile(join(root, '404.html')).catch(() => 'Not found');
    response.writeHead(404, { 'content-type': 'text/html; charset=utf-8', ...extra });
    response.end(body);
  }
}).listen(port, '127.0.0.1', () => console.log(`${root} → http://127.0.0.1:${port}`));
