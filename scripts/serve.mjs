/** Kleiner statischer Server für Tests und lokale Abnahme: node scripts/serve.mjs <ordner> <port> [/prefix/] */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve(process.argv[2] ?? 'dist');
const port = Number(process.argv[3] ?? 4321);
const prefix = (process.argv[4] ?? '/').replace(/\/?$/, '/');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.ics': 'text/calendar; charset=utf-8' };

createServer(async (request, response) => {
  const raw = decodeURIComponent(new URL(request.url ?? '/', 'http://x').pathname);
  // Hosting im Unterpfad: außerhalb des Präfixes gibt es nichts.
  const path = normalize(raw.startsWith(prefix) ? `/${raw.slice(prefix.length)}` : '/__außerhalb__');
  let file = join(root, path);
  try {
    if (!file.startsWith(root)) throw new Error('outside');
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    const body = await readFile(file);
    response.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' });
    response.end(body);
  } catch {
    const body = await readFile(join(root, '404.html')).catch(() => 'Not found');
    response.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(body);
  }
}).listen(port, '127.0.0.1', () => console.log(`${root} → http://127.0.0.1:${port}`));
