/**
 * Optionaler Sendeweg für Gruppenanfragen (Aufgabe 18): Regeln für den Endpunkt aus `venue.json`.
 * Reine Funktionen ohne DOM und ohne Schema-Import; Schema, Build, `content:check` und Header-Erzeugung
 * lesen dieselben Regeln. Solange der Betrieb keinen Endpunkt bestätigt hat, ist der Weg AUS.
 */

/** Betrieblich bestätigter Endpunkt (Ausschnitt aus dem Venue-Schema, ohne interne Felder). */
export interface EndpointFact {
  url: string;
  method: 'POST';
  acceptsInquiries: boolean;
  status: 'confirmed' | 'source-claim' | 'proposal' | 'unknown' | 'historic';
  source?: string | undefined;
  observedAt?: string | undefined;
  verifiedAt?: string | null | undefined;
}

export type UrlCheck = { ok: true; url: string; origin: string } | { ok: false; reason: string };

/**
 * Nur Adressen, die sich als Host-Eintrag in eine CSP (`connect-src`, `form-action`) übernehmen lassen:
 * https, ein DNS-Name mit mindestens einem Punkt (kein localhost, keine IP-Adresse, kein Platzhalter), kein Port,
 * keine Zugangsdaten, keine Query und kein Fragment (dort stünden Schlüssel), nur sichere Pfadzeichen.
 */
const ENDPOINT_URL = /^https:\/\/((?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{0,61}[a-z0-9])((?:\/[A-Za-z0-9._~%@:+,;=&-]*)*)$/i;

export function checkEndpointUrl(raw: string): UrlCheck {
  if (raw.length > 2048) return { ok: false, reason: 'Adresse zu lang' };
  if (!raw.toLowerCase().startsWith('https://')) return { ok: false, reason: 'https:// erwartet' };
  const match = ENDPOINT_URL.exec(raw);
  if (!match) return { ok: false, reason: 'nur https://<Hostname>/<Pfad> ohne Port, Zugangsdaten, Query, Fragment, IP-Adresse oder Platzhalter erlaubt' };
  const host = (match[1] ?? '').toLowerCase();
  const path = match[2] ?? '';
  if (/(^|\/)\.\.?(\/|$)/.test(path)) return { ok: false, reason: 'Pfad darf kein . oder .. enthalten' };
  return { ok: true, url: `https://${host}${path}`, origin: `https://${host}` };
}

/** `https://host` für die CSP oder `null`, wenn die Adresse unzulässig ist. */
export function endpointOrigin(raw: string): string | null {
  const check = checkEndpointUrl(raw);
  return check.ok ? check.origin : null;
}

/**
 * Der Sendeweg ist nur AN, wenn der Betrieb den Endpunkt ausdrücklich bestätigt hat:
 * Status confirmed, `acceptsInquiries`, Quelle und Bestätigungsdatum (`verifiedAt`), gültige Adresse.
 */
export function activeEndpoint(fact: EndpointFact | undefined | null): { url: string; origin: string } | null {
  if (!fact) return null;
  if (fact.status !== 'confirmed' || !fact.acceptsInquiries || fact.method !== 'POST') return null;
  if (!fact.source?.trim() || !fact.verifiedAt) return null;
  const check = checkEndpointUrl(fact.url);
  return check.ok ? { url: check.url, origin: check.origin } : null;
}

/**
 * Fehler, die den Build anhalten. Ein nicht bestätigter Endpunkt ohne Zusage ist kein Fehler, er bleibt wirkungslos
 * (siehe `inactiveEndpointNote`); ein widersprüchlicher oder halb bestätigter ist einer.
 */
export function endpointProblems(fact: EndpointFact | undefined | null): string[] {
  if (!fact) return [];
  const out: string[] = [];
  const check = checkEndpointUrl(fact.url);
  if (!check.ok) out.push(`url: ${check.reason}`);
  if (fact.acceptsInquiries && fact.status !== 'confirmed') out.push('acceptsInquiries ist true, aber der Endpunkt ist nicht „confirmed“ – ein unbestätigter Endpunkt darf keine Anfragen annehmen');
  if (fact.status === 'confirmed') {
    if (!fact.verifiedAt) out.push('„confirmed“ braucht verifiedAt (Datum der ausdrücklichen Bestätigung durch den Betrieb)');
    if (!fact.source?.trim()) out.push('„confirmed“ braucht source (Beleg des Betriebs)');
  }
  return out;
}

/** Hinweis für `content:check`, wenn ein Endpunkt eingetragen, aber (noch) wirkungslos ist; sonst `null`. */
export function inactiveEndpointNote(fact: EndpointFact | undefined | null): string | null {
  if (!fact || activeEndpoint(fact) || endpointProblems(fact).length > 0) return null;
  if (fact.status !== 'confirmed') return 'Sendeweg für Anfragen: Endpunkt eingetragen, aber nicht bestätigt – er bleibt AUS (kein Formularversand, keine CSP-Freigabe).';
  return 'Sendeweg für Anfragen: Endpunkt bestätigt, aber acceptsInquiries ist false – er bleibt AUS.';
}
