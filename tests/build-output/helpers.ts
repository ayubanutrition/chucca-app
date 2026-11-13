/**
 * Gemeinsame Helfer für die Prüfung der Build-Ausgabe (tests/build-output/*.test.ts).
 * Die Tests lesen nur Dateien aus den Dist-Ordnern; es läuft weder Browser noch Server.
 * Voraussetzung: `npm run build:test` ist gelaufen.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

export const ROOT = path.resolve(import.meta.dirname, '..', '..');

export interface Build {
  name: 'dist' | 'dist-public' | 'dist-sub' | 'dist-hours' | 'dist-inquiry' | 'dist-menu';
  dir: string;
  /** Basispfad mit abschließendem Schrägstrich. */
  base: string;
  /** Öffentlicher Modus (Canonical, hreflang, Sitemap erwartet). */
  isPublic: boolean;
  /** Site-URL ohne abschließenden Schrägstrich; nur in den öffentlichen Builds gesetzt. */
  site: string | null;
}

export const BUILDS: Build[] = [
  { name: 'dist', dir: path.join(ROOT, 'dist'), base: '/', isPublic: false, site: null },
  { name: 'dist-public', dir: path.join(ROOT, 'dist-public'), base: '/', isPublic: true, site: 'https://chucca.example' },
  { name: 'dist-sub', dir: path.join(ROOT, 'dist-sub'), base: '/preview/app/', isPublic: true, site: 'https://chucca.example' },
  { name: 'dist-hours', dir: path.join(ROOT, 'dist-hours'), base: '/', isPublic: false, site: null },
  { name: 'dist-inquiry', dir: path.join(ROOT, 'dist-inquiry'), base: '/', isPublic: false, site: null },
  { name: 'dist-menu', dir: path.join(ROOT, 'dist-menu'), base: '/', isPublic: false, site: null },
];

export function assertBuilt(): void {
  for (const b of BUILDS) {
    if (!existsSync(path.join(b.dir, 'index.html'))) {
      throw new Error(`${b.name}/ fehlt. Erst \`npm run build:test\` ausführen.`);
    }
  }
}

export function walk(dir: string, rel = ''): string[] {
  return readdirSync(path.join(dir, rel)).flatMap((n) => {
    const r = rel ? `${rel}/${n}` : n;
    return statSync(path.join(dir, r)).isDirectory() ? walk(dir, r) : [r];
  });
}

export const htmlFiles = (b: Build) => walk(b.dir).filter((f) => f.endsWith('.html')).sort();
export const read = (b: Build, rel: string) => readFileSync(path.join(b.dir, rel), 'utf8');

export interface Tag {
  name: string;
  attrs: Record<string, string>;
}

const decode = (s: string) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, '&');

const TAG = /<([a-zA-Z][\w-]*)((?:\s+[^\s=>/"']+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>"']+))?)*)\s*\/?>/g;
const ATTR = /([^\s=>/"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>"']+)))?/g;

function parseAttrs(source: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const a of source.matchAll(ATTR)) attrs[a[1]!.toLowerCase()] = decode(a[2] ?? a[3] ?? a[4] ?? '');
  return attrs;
}

/** Start-Tags eines Dokuments (Kommentare und Inhalte von script/style bleiben außen vor). */
export function tags(html: string): Tag[] {
  const stripped = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/(<(script|style)\b[^>]*>)([\s\S]*?)(<\/\2>)/gi, (_m, open: string, _n, _body, close: string) => open + close);
  return [...stripped.matchAll(TAG)].map((m) => ({ name: m[1]!.toLowerCase(), attrs: parseAttrs(m[2] ?? '') }));
}

export interface Inline {
  kind: 'script' | 'style';
  attrs: Record<string, string>;
  text: string;
}

export function inlineBlocks(html: string): Inline[] {
  return [...html.matchAll(/<(script|style)\b([^>]*)>([\s\S]*?)<\/\1>/gi)].map((m) => ({
    kind: m[1]!.toLowerCase() as 'script' | 'style',
    attrs: parseAttrs(m[2] ?? ''),
    text: m[3]!,
  }));
}

export const ids = (html: string) => new Set(tags(html).flatMap((t) => (t.attrs.id !== undefined ? [t.attrs.id] : [])));

/**
 * Löst eine URL (absolut, pfadabsolut oder mit Site-URL) auf eine Datei im Build auf.
 * `null` = extern (anderer Host oder anderes Schema). `file: undefined` = intern, aber keine Datei.
 */
export function resolveInternal(b: Build, url: string): { file: string | undefined; hash: string; outsideBase: boolean } | null {
  let u: URL;
  try {
    u = new URL(url, `https://chucca.example${b.base}`);
  } catch {
    return { file: undefined, hash: '', outsideBase: true };
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  const host = b.site ? new URL(b.site).host : 'chucca.example';
  if (u.host !== host) return null;
  const outsideBase = !u.pathname.startsWith(b.base);
  if (outsideBase) return { file: undefined, hash: u.hash.slice(1), outsideBase };
  const rel = decodeURIComponent(u.pathname.slice(b.base.length));
  const candidates = rel === '' || rel.endsWith('/') ? [`${rel}index.html`] : [rel, `${rel}/index.html`];
  const file = candidates.find((c) => existsSync(path.join(b.dir, c)) && statSync(path.join(b.dir, c)).isFile());
  return { file, hash: decodeURIComponent(u.hash.slice(1)), outsideBase };
}

/** Absolute URL der Seite zu einer HTML-Datei im Build. */
export function pageUrl(b: Build, file: string): string {
  const rel = file === 'index.html' ? '' : file.endsWith('/index.html') ? file.slice(0, -'index.html'.length) : file;
  return `${b.site ?? 'https://chucca.example'}${b.base}${rel}`;
}
