/** Fehlertoleranter Zugriff auf Web Storage (gesperrter Speicher, Private Mode, SSR). */
type Area = 'local' | 'session';

function area(kind: Area): Storage | null {
  try {
    return kind === 'local' ? globalThis.localStorage : globalThis.sessionStorage;
  } catch {
    return null;
  }
}

export function readStored(key: string, kind: Area = 'local'): string | null {
  try {
    return area(kind)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: string, kind: Area = 'local'): boolean {
  try {
    const store = area(kind);
    if (!store) return false;
    store.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeStored(key: string, kind: Area = 'local'): void {
  try {
    area(kind)?.removeItem(key);
  } catch {
    /* gesperrter Speicher: nichts zu entfernen */
  }
}
