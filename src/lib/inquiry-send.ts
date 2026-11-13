/**
 * Optionaler Sendeweg für Gruppenanfragen (Aufgabe 18), Logik ohne DOM. Wird nur benutzt, wenn der Betrieb einen
 * Endpunkt bestätigt hat (`src/lib/inquiry-endpoint.ts`); sonst bleibt das Formular beim Vorbereiten des Textes.
 *
 * Grundsätze: genau ein Versand je Aufruf, Erfolg ausschließlich nach HTTP 2xx, Abbruch nach Zeitgrenze,
 * keine Cookies, kein Referrer, keine Weiterleitungen. Der Erfolg ist KEINE Reservierung.
 */

export const SEND_TIMEOUT_MS = 10_000;

/** Nur das Nötige für eine Gruppenanfrage. Kein Name, keine Kontaktdaten: das Formular hat kein Kontaktfeld. */
export interface InquiryPayload {
  people: number;
  /** JJJJ-MM-TT, Ortszeit Madrid */
  date: string;
  /** HH:MM, Ortszeit Madrid */
  time: string;
  /** Anlass/Anmerkung, höchstens 140 Zeichen; leer entfällt. */
  note?: string;
  /** Sprache der Seite (de, en, es), damit der Betrieb sie in der passenden Sprache lesen kann. */
  locale: string;
}

export type SendOutcome = 'sent' | 'rejected' | 'server' | 'timeout' | 'offline';

export function buildPayload(input: { people: number; date: string; time: string; note: string; locale: string }): InquiryPayload {
  const note = input.note.trim().slice(0, 140);
  return { people: input.people, date: input.date, time: input.time, ...(note ? { note } : {}), locale: input.locale };
}

/** 2xx = angenommen; 4xx = abgelehnt; alles andere (5xx, unerwartete Codes) = Fehler des Dienstes. */
export function classifyStatus(status: number): 'sent' | 'rejected' | 'server' {
  if (status >= 200 && status <= 299) return 'sent';
  if (status >= 400 && status <= 499) return 'rejected';
  return 'server';
}

export interface SendOptions {
  url: string;
  payload: InquiryPayload;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  /** Zum Testen; Standard: `navigator.onLine`. */
  isOnline?: () => boolean;
}

/** Sendet genau eine Anfrage und löst nie mit einer Ausnahme auf. */
export async function sendInquiry({ url, payload, timeoutMs = SEND_TIMEOUT_MS, fetchImpl, isOnline }: SendOptions): Promise<SendOutcome> {
  const online = isOnline ?? (() => (typeof navigator === 'undefined' ? true : navigator.onLine !== false));
  if (!online()) return 'offline';
  const doFetch = fetchImpl ?? globalThis.fetch.bind(globalThis);
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  try {
    const response = await doFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'error',
      referrerPolicy: 'no-referrer',
      keepalive: false,
    });
    return classifyStatus(response.status);
  } catch {
    // Abbruch durch die Zeitgrenze oder Netzfehler (DNS, TLS, Verbindung, CORS, blockierte Weiterleitung).
    return timedOut ? 'timeout' : 'offline';
  } finally {
    clearTimeout(timer);
  }
}
