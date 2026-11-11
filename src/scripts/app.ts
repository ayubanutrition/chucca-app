/** Läuft auf jeder Seite: Sprachwahl merken, Zustand beim Sprachwechsel mitnehmen, Offline-Hinweis, Service Worker. */
import { writeStored } from '../lib/storage';
import { toast } from './dom';

export const LOCALE_KEY = 'chucca-locale';

// Sprachwechsel: Auswahl merken und Filter/Entwurf (Query und Hash) auf die Zielseite mitnehmen.
for (const link of document.querySelectorAll<HTMLAnchorElement>('[data-lang-link]')) {
  link.addEventListener('click', () => {
    writeStored(LOCALE_KEY, link.dataset.langLink ?? '');
    const carry = (window as Window & { chuccaCarry?: () => string }).chuccaCarry?.() ?? location.search;
    const url = new URL(link.href);
    url.search = carry;
    url.hash = location.hash;
    link.href = url.toString();
  });
}
writeStored(LOCALE_KEY, document.documentElement.lang);

const offline = document.querySelector<HTMLElement>('[data-offline]');
const syncConnection = (): void => {
  if (offline) offline.hidden = navigator.onLine;
};
addEventListener('online', syncConnection);
addEventListener('offline', syncConnection);
syncConnection();

// Sprunglink: Fokus sicher in den Inhalt setzen.
document.querySelector<HTMLAnchorElement>('.skip')?.addEventListener('click', (event) => {
  event.preventDefault();
  document.getElementById('inhalt')?.focus();
});

const config = JSON.parse(document.getElementById('app-strings')?.textContent ?? '{}') as { updateReady: string; reload: string; sw: string; scope: string };

if ('serviceWorker' in navigator && config.sw && import.meta.env.PROD) {
  navigator.serviceWorker
    .register(config.sw, { scope: config.scope, updateViaCache: 'none' })
    .then((registration) => {
      const offer = (worker: ServiceWorker | null): void => {
        // Nur anbieten, wenn bereits eine ältere Version die Seite steuert – nie ungefragt neu laden.
        if (!worker || !navigator.serviceWorker.controller) return;
        toast(config.updateReady, { label: config.reload, run: () => worker.postMessage('SKIP_WAITING') });
      };
      offer(registration.waiting);
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed') offer(worker);
        });
      });
    })
    .catch(() => {
      /* Ohne Service Worker funktioniert die Seite weiter. */
    });
  let reloaded = false;
  const hadController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded || !hadController) return;
    reloaded = true;
    location.reload();
  });
}
