/**
 * Erzeugt den Service Worker als Text. Regeln:
 * - nur GET und nur eigene Herkunft
 * - Assets mit Hash (/_astro/) cache-first, übrige Assets network-first
 * - Navigation immer network-first; HTML wird nur im öffentlichen Modus gespeichert,
 *   nie in der privaten (authentifizierten) Vorschau
 * - Seiten-Cache trägt die Build-Kennung: alte HTML-Kopien verschwinden mit ihren Assets
 * - neue Version wartet, bis die Seite sie per Nachricht aktiviert (kein erzwungenes skipWaiting)
 */
export interface ServiceWorkerOptions {
  mode: 'preview' | 'public';
  buildId: string;
  base: string;
  assets: string[];
}

const OFFLINE_HTML =
  '<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>CHUCCA · Offline</title>' +
  '<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#180d14;color:#f7ecdc;font:18px/1.5 system-ui,sans-serif"><main style="padding:32px;max-width:32rem">' +
  '<h1 style="font-size:2rem;margin:0 0 16px">CHUCCA</h1>' +
  '<p lang="de">Du bist offline. Verbinde dich wieder, um CHUCCA zu öffnen.</p>' +
  '<p lang="en">You are offline. Reconnect to open CHUCCA.</p>' +
  '<p lang="es">Estás sin conexión. Vuelve a conectarte para abrir CHUCCA.</p>' +
  '<p><a href="" style="color:#ff8f45">Erneut versuchen · Try again · Reintentar</a></p></main></body></html>';

export function buildServiceWorker({ mode, buildId, base, assets }: ServiceWorkerOptions): string {
  return `// CHUCCA V4 Service Worker · ${mode} · ${buildId}
const PREFIX = 'chucca-v4:' + ${JSON.stringify(base)} + ':';
const CACHE = PREFIX + 'assets-${buildId}';
const PAGES = PREFIX + 'pages-${buildId}';
const MODE = ${JSON.stringify(mode)};
const BASE = ${JSON.stringify(base)};
const ASSETS = ${JSON.stringify(assets)};
const OFFLINE = ${JSON.stringify(OFFLINE_HTML)};
const scopeUrl = (path) => new URL(BASE + path, self.location.origin).href;
const known = new Set(ASSETS.map(scopeUrl));
const storable = (response) => response.ok && response.type === 'basic' && !response.redirected;
const isHtml = (response) => (response.headers.get('content-type') || '').includes('text/html');

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then(async (cache) => {
    await Promise.all(ASSETS.map(async (path) => {
      try {
        const response = await fetch(scopeUrl(path), { cache: 'reload' });
        if (storable(response) && !isHtml(response)) await cache.put(scopeUrl(path), response);
      } catch (error) { /* einzelnes Asset fehlt: Installation trotzdem abschließen */ }
    }));
  }));
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    // Eigene ältere Stände dieses Pfads und die Caches aus V3; andere Installationen derselben Herkunft bleiben unberührt.
    keys.filter((key) => (key.startsWith(PREFIX) || key.startsWith('chucca-x-')) && key !== CACHE && key !== PAGES).map((key) => caches.delete(key))
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const key = url.origin + url.pathname;
      try {
        const response = await fetch(request);
        if (MODE === 'public' && storable(response) && isHtml(response)) {
          const cache = await caches.open(PAGES);
          await cache.put(key, response.clone());
        }
        return response;
      } catch (error) {
        const cached = MODE === 'public' ? await caches.match(key) : undefined;
        return cached || new Response(OFFLINE, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      }
    })());
    return;
  }

  const key = url.origin + url.pathname;
  if (!known.has(key)) return;
  const hashed = url.pathname.includes('/_astro/');
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (hashed) {
      const hit = await cache.match(key);
      if (hit) return hit;
    }
    try {
      const response = await fetch(request);
      if (storable(response) && !isHtml(response)) await cache.put(key, response.clone());
      return response;
    } catch (error) {
      return (await cache.match(key)) || Response.error();
    }
  })());
});
`;
}
