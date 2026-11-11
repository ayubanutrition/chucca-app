/**
 * Teilen mit ehrlichen Rückmeldungen:
 * shared  – natives Teilen-Menü wurde abgeschlossen
 * copied  – Text liegt in der Zwischenablage
 * aborted – Nutzer hat abgebrochen (keine Erfolgsmeldung, kein Fehler)
 * manual  – weder Teilen noch Zwischenablage verfügbar: Text zum Kopieren anzeigen
 */
export type ShareOutcome = 'shared' | 'copied' | 'aborted' | 'manual';

export interface SharePayload {
  title: string;
  text: string;
  url?: string;
}

interface ShareEnvironment {
  share?: (data: ShareData) => Promise<void>;
  writeText?: (text: string) => Promise<void>;
}

function browserEnvironment(): ShareEnvironment {
  const nav = globalThis.navigator as Navigator | undefined;
  const env: ShareEnvironment = {};
  if (nav && typeof nav.share === 'function') env.share = (data) => nav.share(data);
  if (nav?.clipboard && typeof nav.clipboard.writeText === 'function') {
    env.writeText = (text) => nav.clipboard.writeText(text);
  }
  return env;
}

export const plainText = (payload: SharePayload): string =>
  payload.url ? `${payload.text}\n${payload.url}` : payload.text;

export async function copyText(text: string, env: ShareEnvironment = browserEnvironment()): Promise<'copied' | 'manual'> {
  if (!env.writeText) return 'manual';
  try {
    await env.writeText(text);
    return 'copied';
  } catch {
    return 'manual';
  }
}

export async function shareOrCopy(payload: SharePayload, env: ShareEnvironment = browserEnvironment()): Promise<ShareOutcome> {
  if (env.share) {
    try {
      await env.share(payload.url ? { title: payload.title, text: payload.text, url: payload.url } : { title: payload.title, text: payload.text });
      return 'shared';
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return 'aborted';
      // Teilen nicht erlaubt oder fehlgeschlagen: Zwischenablage versuchen.
    }
  }
  return copyText(plainText(payload), env);
}
