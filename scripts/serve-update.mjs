/**
 * Testserver für den Update-Pfad des Service Workers: node scripts/serve-update.mjs <ordner-v1> <ordner-v2> <port>
 *
 * Liefert vom SELBEN Ursprung zunächst Stand v1 und nach `GET /__switch?to=v2` (bzw. `to=v1`) Stand v2,
 * als hätte der Betreiber zwischen zwei Besuchen neu veröffentlicht. Der Steuer-Endpunkt existiert nur,
 * wenn CHUCCA_ALLOW_SWITCH=1 gesetzt ist; sonst antwortet er 404 wie jeder unbekannte Pfad.
 * Bewusst ohne `_headers`-Simulation: alles `no-cache`, wie scripts/serve.mjs ohne Headerdatei.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const roots = { v1: resolve(process.argv[2] ?? 'dist-update/public-v1'), v2: resolve(process.argv[3] ?? 'dist-update/public-v2') };
const port = Number(process.argv[4] ?? 4335);
const allowSwitch = process.env.CHUCCA_ALLOW_SWITCH === '1';
let current = 'v1';
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8' };

createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', 'http://x');
  if (allowSwitch && url.pathname === '/__switch') {
    const to = url.searchParams.get('to');
    const valid = to === 'v1' || to === 'v2';
    if (valid) current = to;
    response.writeHead(valid ? 200 : 400, { 'content-type': 'text/plain' });
    response.end(current);
    return;
  }
  const root = roots[current];
  let file = join(root, normalize(decodeURIComponent(url.pathname)));
  try {
    if (!file.startsWith(root)) throw new Error('outside');
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    const body = await readFile(file);
    response.writeHead(200, { 'cache-control': 'no-cache', 'content-type': types[extname(file)] ?? 'application/octet-stream' });
    response.end(body);
  } catch {
    const body = await readFile(join(root, '404.html')).catch(() => 'Not found');
    response.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
    response.end(body);
  }
}).listen(port, '127.0.0.1', () => console.log(`${roots.v1} | ${roots.v2} → http://127.0.0.1:${port}`));
