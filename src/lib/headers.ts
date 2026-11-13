/**
 * Auslieferungs-Header: Content-Security-Policy mit Hashes der Inline-Skripte/-Styles und die
 * `_headers`-Datei (Format Netlify / Cloudflare Pages). Reine Funktionen ohne Dateizugriff;
 * `integrations/chucca-build.ts` ruft sie nach dem Build mit den erzeugten Dateien auf.
 */
import { createHash } from 'node:crypto';
import { endpointOrigin } from './inquiry-endpoint';

export interface InlineHashes {
  scripts: string[];
  styles: string[];
}

const sha256 = (text: string) => `'sha256-${createHash('sha256').update(text, 'utf8').digest('base64')}'`;

/** Skripttypen, die der Browser nicht ausführt (Datenblöcke); sie brauchen keinen Hash. */
const DATA_SCRIPT = /^\s*(application\/(ld\+)?json|text\/json)\s*$/i;

/**
 * Sammelt SHA-256-Hashes aller ausführbaren Inline-Skripte und aller Inline-`<style>`-Blöcke.
 * Der Hash gilt für den exakten Text zwischen den Tags, so wie ihn der Browser sieht.
 */
export function collectInlineHashes(htmlDocuments: string[]): InlineHashes {
  const scripts = new Set<string>();
  const styles = new Set<string>();
  for (const html of htmlDocuments) {
    for (const [, attrs = '', body = ''] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
      if (/\bsrc\s*=/i.test(attrs)) continue;
      const type = /\btype\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs);
      if (type && DATA_SCRIPT.test(type[1] ?? type[2] ?? type[3] ?? '')) continue;
      if (body.trim() !== '') scripts.add(sha256(body));
    }
    for (const [, , body = ''] of html.matchAll(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi)) if (body.trim() !== '') styles.add(sha256(body));
  }
  return { scripts: [...scripts].sort(), styles: [...styles].sort() };
}

/**
 * Herkunft (`https://host`) des Anfrage-Endpunkts, die eine erzeugte Seite verwendet: Das Formular trägt sie als
 * `data-inquiry-origin`. Die CSP wird so aus dem tatsächlichen Output abgeleitet (wie die Hashes), nicht aus der Konfiguration.
 */
export function collectInquiryOrigins(htmlDocuments: string[]): string[] {
  const found = new Set<string>();
  for (const html of htmlDocuments) for (const [, value = ''] of html.matchAll(/\bdata-inquiry-origin="([^"]*)"/g)) found.add(value);
  return [...found].sort();
}

/**
 * Strenge CSP. Externe Ziele (Karte, Instagram) sind nur Links, keine Ressourcen.
 * Ausnahme nur bei bestätigtem Anfrage-Endpunkt (`inquiryOrigin`, Aufgabe 18): genau dieser eine Host in
 * `connect-src` (fetch) und `form-action`; sonst bleibt `connect-src 'self'` und `form-action 'none'`.
 * Eine ungültige Herkunft (Pfad, Port, http, Platzhalter) wird nicht eingetragen, sondern bricht ab.
 * `style-src-attr 'unsafe-inline'`: Komponenten setzen `style="--stack: …"` und `object-position`
 * als Attribut; Style-Attribute können kein Skript ausführen. `script-src` bleibt ohne `unsafe-inline`.
 */
export function contentSecurityPolicy({ scripts, styles }: InlineHashes, inquiryOrigin?: string | null): string {
  if (inquiryOrigin != null && endpointOrigin(inquiryOrigin) !== inquiryOrigin) throw new Error(`Ungültige Herkunft für den Anfrage-Endpunkt in der CSP: ${inquiryOrigin} (erwartet: https://<Hostname>)`);
  return [
    "default-src 'none'",
    `script-src 'self' ${scripts.join(' ')}`.trim(),
    `style-src 'self' ${styles.join(' ')}`.trim(),
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    inquiryOrigin ? `connect-src 'self' ${inquiryOrigin}` : "connect-src 'self'",
    "manifest-src 'self'",
    "worker-src 'self'",
    "base-uri 'none'",
    inquiryOrigin ? `form-action ${inquiryOrigin}` : "form-action 'none'",
    "frame-ancestors 'none'",
    "object-src 'none'",
  ].join('; ');
}

/** Die Website nutzt keine dieser Funktionen. Zwischenablage und Teilen bleiben absichtlich erlaubt. */
export const PERMISSIONS_POLICY = [
  'accelerometer',
  'autoplay',
  'browsing-topics',
  'camera',
  'display-capture',
  'encrypted-media',
  'geolocation',
  'gyroscope',
  'hid',
  'idle-detection',
  'magnetometer',
  'microphone',
  'midi',
  'payment',
  'publickey-credentials-get',
  'screen-wake-lock',
  'serial',
  'usb',
  'xr-spatial-tracking',
]
  .map((feature) => `${feature}=()`)
  .join(', ');

export const CACHE_IMMUTABLE = 'public, max-age=31536000, immutable';
export const CACHE_REVALIDATE = 'no-cache';

export interface HeadersFileOptions {
  /** Alle Dateien der Ausgabe, relativ zur Wurzel, mit `/`. */
  files: string[];
  hashes: InlineHashes;
  /** Vorschau-Modus oder keine Site-URL: Suchmaschinen sollen nichts aufnehmen. */
  noindex: boolean;
  /** Bestätigter Anfrage-Endpunkt (`https://host`); ohne Angabe bleibt die CSP unverändert strikt. */
  inquiryOrigin?: string | null;
}

/**
 * Erzeugt den Inhalt von `_headers`. Regeln überlappen bei `Cache-Control` bewusst nicht, weil
 * Netlify/Cloudflare gleichnamige Header mehrerer Treffer zusammenführen: `/_astro/*` ist die
 * einzige Langzeit-Regel, alles andere (Seiten je Sprache, Dateien an der Wurzel) wird einzeln benannt.
 */
export function buildHeadersFile({ files, hashes, noindex, inquiryOrigin }: HeadersFileOptions): string {
  const rule = (path: string, headers: Record<string, string>) =>
    `${path}\n${Object.entries(headers)
      .map(([name, value]) => `  ${name}: ${value}`)
      .join('\n')}\n`;
  const revalidate = { 'Cache-Control': CACHE_REVALIDATE };
  const blocks: string[] = [
    '# Erzeugt von integrations/chucca-build.ts – nicht von Hand ändern. Abbildung auf andere Hosts: docs/11_HOSTING.md.\n',
    rule('/*', {
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': PERMISSIONS_POLICY,
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Content-Security-Policy': contentSecurityPolicy(hashes, inquiryOrigin),
      ...(noindex ? { 'X-Robots-Tag': 'noindex, nofollow' } : {}),
    }),
    rule('/_astro/*', { 'Cache-Control': CACHE_IMMUTABLE }),
    rule('/', revalidate),
  ];
  const dirs = new Set<string>();
  const rootFiles: string[] = [];
  for (const file of files) {
    if (file === '_headers' || file.startsWith('_astro/')) continue;
    const [first = '', ...rest] = file.split('/');
    if (rest.length > 0) dirs.add(first);
    else if (file !== 'index.html') rootFiles.push(file);
  }
  for (const dir of [...dirs].sort()) blocks.push(rule(`/${dir}/*`, revalidate));
  for (const file of rootFiles.sort()) blocks.push(rule(`/${file}`, revalidate));
  return blocks.join('\n');
}
