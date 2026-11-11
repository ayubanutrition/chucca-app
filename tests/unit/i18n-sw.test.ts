import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { LEGACY_HASHES, LOCALES, PAGES, SLUGS, dictionary, fill, matchPath, pagePath, pickLocale } from '../../src/i18n';
import { fixtureMenu } from '../../src/lib/content';
import { buildServiceWorker } from '../../src/lib/sw-template';

type Tree = { [key: string]: Tree | string | string[] };
function flatten(tree: Tree, prefix = ''): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') out.set(path, value);
    else if (Array.isArray(value)) value.forEach((item, index) => out.set(`${path}.${index}`, item));
    else for (const [k, v] of flatten(value, path)) out.set(k, v);
  }
  return out;
}
const placeholders = (text: string): string[] => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1] ?? '').sort();

describe('Sprachen', () => {
  const reference = flatten(dictionary('de') as unknown as Tree);
  it.each(LOCALES)('%s: gleiche Schlüssel, keine leeren Texte, gleiche Platzhalter', (locale) => {
    const entries = flatten(dictionary(locale) as unknown as Tree);
    expect([...entries.keys()].sort()).toEqual([...reference.keys()].sort());
    for (const [key, value] of entries) {
      expect(value.trim(), key).not.toBe('');
      expect(placeholders(value), key).toEqual(placeholders(reference.get(key) ?? ''));
    }
  });
  it('übersetzt wirklich: EN und ES übernehmen keine deutschen Sätze', () => {
    const de = reference;
    for (const locale of ['en', 'es'] as const) {
      const same = [...flatten(dictionary(locale) as unknown as Tree)].filter(([key, value]) => value === de.get(key) && value.split(' ').length > 3);
      // Eigennamen und Adressen bleiben in allen Sprachen gleich.
      const properNames = ['meta.siteName', 'meta.titles.drinks', 'common.place', 'today.addressLine', 'group.inviteAddress'];
      expect(same.map(([key]) => key).filter((key) => !properNames.includes(key))).toEqual([]);
    }
  });
  it('führt die Beispielkarte vollständig in allen Sprachen', () => {
    for (const drink of fixtureMenu.items) for (const locale of LOCALES) expect(drink.name[locale].length).toBeGreaterThan(1);
  });
});

describe('Routen', () => {
  it('bildet jede Seite jeder Sprache eindeutig und umkehrbar ab', () => {
    const seen = new Set<string>();
    for (const locale of LOCALES) {
      for (const page of PAGES) {
        const path = pagePath(locale, page);
        expect(path.startsWith(`/${locale}/`) && path.endsWith('/')).toBe(true);
        expect(seen.has(path)).toBe(false);
        seen.add(path);
        expect(matchPath(path)).toEqual({ locale, page });
      }
    }
    expect(seen.size).toBe(15);
    expect(SLUGS.es.drinks).toBe('bebidas');
  });
  it('weist unbekannte Pfade ab', () => {
    for (const path of ['/', '/fr/', '/de/unbekannt/', '/de/drinks/extra/', '/es/drinks/']) expect(matchPath(path)).toBeNull();
  });
  it('kennt die alten V3-Hash-Routen', () => {
    expect(LEGACY_HASHES).toMatchObject({ heute: 'today', drinks: 'drinks', besuch: 'visit' });
  });
  it('wählt die Sprache aus Browservorgaben und füllt Platzhalter', () => {
    expect(pickLocale(['fr-FR', 'es-MX', 'de'])).toBe('es');
    expect(pickLocale(['EN-us'])).toBe('en');
    expect(pickLocale([null, undefined, 'ja'])).toBe('de');
    expect(fill('{a} und {b} und {c}', { a: 1, b: 'zwei' })).toBe('1 und zwei und {c}');
  });
});

/** Führt den erzeugten Service Worker mit nachgebauten Browser-Schnittstellen aus. */
function runWorker(mode: 'preview' | 'public', network: (url: string) => Response | null) {
  const stores = new Map<string, Map<string, Response>>();
  const listeners: Record<string, (event: unknown) => void> = {};
  const open = async (name: string) => {
    const store = stores.get(name) ?? new Map<string, Response>();
    stores.set(name, store);
    return {
      put: async (key: string | Request, response: Response) => void store.set(typeof key === 'string' ? key : key.url, response),
      match: async (key: string) => store.get(key)?.clone(),
    };
  };
  let skipped = false;
  const context = {
    URL,
    Response,
    Promise,
    Set,
    JSON,
    caches: {
      open,
      keys: async () => [...stores.keys()],
      delete: async (name: string) => stores.delete(name),
      match: async (key: string) => {
        for (const store of stores.values()) if (store.has(key)) return store.get(key)?.clone();
        return undefined;
      },
    },
    fetch: async (input: string | { url: string }) => {
      const response = network(typeof input === 'string' ? input : input.url);
      if (!response) throw new TypeError('offline');
      Object.defineProperty(response, 'type', { value: 'basic' });
      return response;
    },
    self: {
      location: { origin: 'https://chucca.test' },
      addEventListener: (type: string, fn: (event: unknown) => void) => void (listeners[type] = fn),
      skipWaiting: () => void (skipped = true),
      clients: { claim: async () => undefined },
    },
  };
  runInNewContext(buildServiceWorker({ mode, buildId: 'b1', base: '/', assets: ['_astro/app.css', 'icon.svg'] }), context);
  const dispatch = async (type: string, event: Record<string, unknown> = {}) => {
    let pending: Promise<unknown> | undefined;
    let responded = false;
    listeners[type]?.({ ...event, waitUntil: (p: Promise<unknown>) => void (pending = p), respondWith: (p: Promise<unknown>) => ((responded = true), void (pending = p)) });
    return { responded, result: (await pending) as Response | undefined };
  };
  const request = (path: string, navigate = false, method = 'GET') => ({ request: { url: `https://chucca.test${path}`, method, mode: navigate ? 'navigate' : 'cors' } });
  return { stores, dispatch, request, skipped: () => skipped };
}
const html = () => new Response('<h1>Seite</h1>', { headers: { 'content-type': 'text/html' } });
const css = () => new Response('body{}', { headers: { 'content-type': 'text/css' } });

describe('Service Worker', () => {
  it('speichert in der privaten Vorschau niemals HTML und zeigt offline eine neutrale Seite', async () => {
    let online = true;
    const sw = runWorker('preview', (url) => (!online ? null : url.endsWith('.css') || url.endsWith('.svg') ? css() : html()));
    await sw.dispatch('install');
    await sw.dispatch('fetch', sw.request('/de/', true));
    const cached = [...sw.stores.values()].flatMap((store) => [...store.keys()]);
    expect(cached.sort()).toEqual(['https://chucca.test/_astro/app.css', 'https://chucca.test/icon.svg']);
    online = false;
    const offline = await sw.dispatch('fetch', sw.request('/de/', true));
    expect(offline.result?.status).toBe(503);
    expect(await offline.result?.text()).toContain('offline');
  });
  it('liefert im öffentlichen Modus die zuletzt geladene Seite, sonst die Offline-Seite', async () => {
    let online = true;
    const sw = runWorker('public', (url) => (!online ? null : url.endsWith('.css') ? css() : html()));
    await sw.dispatch('fetch', sw.request('/de/drinks/?q=minze', true));
    online = false;
    expect(await (await sw.dispatch('fetch', sw.request('/de/drinks/', true))).result?.text()).toBe('<h1>Seite</h1>');
    expect((await sw.dispatch('fetch', sw.request('/de/besuch/', true))).result?.status).toBe(503);
  });
  it('fasst fremde Herkunft, unbekannte Pfade und Nicht-GET nicht an', async () => {
    const sw = runWorker('public', () => css());
    expect((await sw.dispatch('fetch', { request: { url: 'https://maps.example/x', method: 'GET', mode: 'cors' } })).responded).toBe(false);
    expect((await sw.dispatch('fetch', sw.request('/api/anfrage'))).responded).toBe(false);
    expect((await sw.dispatch('fetch', sw.request('/_astro/app.css', false, 'POST'))).responded).toBe(false);
    expect((await sw.dispatch('fetch', sw.request('/_astro/app.css'))).responded).toBe(true);
  });
  it('räumt alte Caches (auch aus V3) und übernimmt nur auf Anforderung', async () => {
    const sw = runWorker('preview', () => css());
    sw.stores.set('chucca-x-v4', new Map());
    sw.stores.set('chucca-v4-alt', new Map());
    sw.stores.set('fremd', new Map());
    await sw.dispatch('install');
    expect(sw.skipped()).toBe(false);
    await sw.dispatch('activate');
    expect([...sw.stores.keys()].sort()).toEqual(['chucca-v4-b1', 'fremd']);
    await sw.dispatch('message', { data: 'SKIP_WAITING' });
    expect(sw.skipped()).toBe(true);
  });
});
