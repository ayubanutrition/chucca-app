/** Ein einziger Ort für Basis-Pfad und absolute URLs (Hosting im Unterpfad, Canonicals, Manifest). */
import { pagePath, type Locale, type PageKey } from '../i18n';

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, '');

/** Hängt den Basis-Pfad vor einen absoluten App-Pfad (/de/drinks/ → /unterpfad/de/drinks/). */
export const withBase = (path: string): string => `${BASE}${path.startsWith('/') ? path : `/${path}`}`;

export const href = (locale: Locale, page: PageKey): string => withBase(pagePath(locale, page));

/** Absolute URL, sofern eine Site-URL konfiguriert ist; sonst null (private Vorschau ohne feste Adresse). */
export function absoluteUrl(path: string, site: URL | string | undefined = import.meta.env.SITE): string | null {
  if (!site) return null;
  return new URL(withBase(path), site).toString();
}
