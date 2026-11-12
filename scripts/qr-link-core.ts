/**
 * Kern von `scripts/qr-link.mjs`: Deep-Link auf die lokalisierte Drinks-Route und druckbares QR als SVG.
 * Liegt in scripts/ (nicht in src/), damit die devDependency `qrcode-generator` (MIT) nie im Produktbuild landet.
 * Die Route kommt aus der Routentabelle `src/i18n/index.ts` (SLUGS); hier steht kein Pfad doppelt.
 */
import qrcode from 'qrcode-generator';
import { isLocale, LOCALES, pagePath } from '../src/i18n';

export class QrLinkError extends Error {}

function parseHttpUrl(raw: string, label: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new QrLinkError(`${label} ist keine gültige URL: „${raw}“. Erwartet wird eine vollständige Adresse wie https://beispiel.de/`);
  }
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) {
    throw new QrLinkError(`${label} muss mit https:// beginnen (gedruckte Codes sollen nicht auf unverschlüsselte Seiten zeigen): „${raw}“.`);
  }
  if (url.username || url.password) throw new QrLinkError(`${label} darf keine Zugangsdaten enthalten.`);
  for (const key of url.searchParams.keys()) {
    if (key.toLowerCase().startsWith('utm_')) throw new QrLinkError(`${label} enthält den Tracking-Parameter „${key}“. Die Seite arbeitet ohne Tracking; bitte eine URL ohne UTM-Parameter verwenden.`);
  }
  return url;
}

/** Deep-Link auf die Drinks-Seite der Sprache. Die Basis darf einen Unterpfad enthalten; Query und Hash der Basis entfallen. */
export function drinksDeepLink(baseUrl: string, locale: string): string {
  if (!isLocale(locale)) throw new QrLinkError(`Unbekannte Sprache „${locale}“. Erlaubt: ${LOCALES.join(', ')}.`);
  const base = parseHttpUrl(baseUrl, 'Die Basis-URL');
  const prefix = base.pathname.replace(/\/+$/, '');
  return `${base.origin}${prefix}${pagePath(locale, 'drinks')}`;
}

/** Prüft eine optionale Kurz-URL (https, ohne UTM, ohne Zugangsdaten) und gibt sie zurück. */
export function checkShortUrl(shortUrl: string): string {
  return parseHttpUrl(shortUrl, 'Die Kurz-URL').toString();
}

const escapeXml = (text: string): string => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Ein einziger Pfad aus Rechtecken, mit Ruhezone von 4 Modulen (QR-Norm), ohne externe Referenzen. */
export function renderQrSvg(text: string, options: { quietZone?: number; title?: string } = {}): string {
  const quiet = options.quietZone ?? 4;
  const qr = qrcode(0, 'M');
  qr.addData(text, 'Byte');
  qr.make();
  const count = qr.getModuleCount();
  const size = count + quiet * 2;
  let path = '';
  for (let row = 0; row < count; row += 1) {
    let col = 0;
    while (col < count) {
      if (!qr.isDark(row, col)) {
        col += 1;
        continue;
      }
      const start = col;
      while (col < count && qr.isDark(row, col)) col += 1;
      path += `M${start + quiet} ${row + quiet}h${col - start}v1h-${col - start}z`;
    }
  }
  const title = escapeXml(options.title ?? text);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size * 4}mm" height="${size * 4}mm" role="img" aria-label="${title}" shape-rendering="crispEdges">` +
    `<title>${title}</title><rect width="${size}" height="${size}" fill="#fff"/><path d="${path}" fill="#000"/></svg>\n`
  );
}

export interface QrLinkResult {
  deepLink: string;
  encoded: string;
  svg: string;
}

/** Kurz-URL (falls angegeben) wird kodiert, sonst der Deep-Link. Beide werden geprüft. */
export function buildQrLink(baseUrl: string, locale: string, shortUrl?: string): QrLinkResult {
  const deepLink = drinksDeepLink(baseUrl, locale);
  const encoded = shortUrl ? checkShortUrl(shortUrl) : deepLink;
  return { deepLink, encoded, svg: renderQrSvg(encoded) };
}
