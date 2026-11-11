/**
 * Bildansicht auf Basis des nativen <dialog>: showModal() übernimmt Fokusfalle,
 * Escape und die Rückgabe des Fokus an das auslösende Vorschaubild.
 * Ohne JavaScript öffnet der Link schlicht das große Bild.
 */
import { fill } from '../i18n';
import { one, strings } from './dom';

const root = document.querySelector<HTMLElement>('[data-gallery]');
const dialog = root?.querySelector<HTMLDialogElement>('[data-lightbox]');
if (root && dialog && typeof dialog.showModal === 'function') {
  const s = strings<{ counter: string; credit: string }>(root);
  const shots = [...root.querySelectorAll<HTMLAnchorElement>('[data-shot]')];
  const image = one<HTMLImageElement>(dialog, '[data-lightbox-image]');
  const error = one<HTMLElement>(dialog, '[data-lightbox-error]');
  const counter = one<HTMLElement>(dialog, '[data-lightbox-counter]');
  const title = one<HTMLElement>(dialog, '[data-lightbox-title]');
  const note = one<HTMLElement>(dialog, '[data-lightbox-note]');
  const stage = one<HTMLElement>(dialog, '[data-lightbox-stage]');
  let current = 0;

  const show = (index: number): void => {
    current = (index + shots.length) % shots.length;
    const shot = shots[current];
    if (!shot) return;
    error.hidden = true;
    image.hidden = false;
    image.width = Number(shot.dataset.width) || 0;
    image.height = Number(shot.dataset.height) || 0;
    image.alt = shot.dataset.alt ?? '';
    image.src = shot.href;
    counter.textContent = fill(s.counter, { index: current + 1, total: shots.length });
    title.textContent = shot.dataset.title ?? '';
    const credit = shot.dataset.credit ? fill(s.credit, { credit: shot.dataset.credit }) : '';
    note.textContent = [shot.dataset.note, credit].filter(Boolean).join(' · ');
  };

  image.addEventListener('error', () => {
    image.hidden = true;
    error.hidden = false;
  });

  for (const [index, shot] of shots.entries()) {
    shot.addEventListener('click', (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      show(index);
      dialog.showModal();
    });
  }

  one<HTMLButtonElement>(dialog, '[data-lightbox-close]').addEventListener('click', () => dialog.close());
  one<HTMLButtonElement>(dialog, '[data-lightbox-prev]').addEventListener('click', () => show(current - 1));
  one<HTMLButtonElement>(dialog, '[data-lightbox-next]').addEventListener('click', () => show(current + 1));

  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') show(current - 1);
    else if (event.key === 'ArrowRight') show(current + 1);
    else if (event.key === 'Home') show(0);
    else if (event.key === 'End') show(shots.length - 1);
    else return;
    event.preventDefault();
  });

  // Nach dem Schließen den Fokus sicher an das zuletzt gezeigte Vorschaubild geben.
  dialog.addEventListener('close', () => shots[current]?.focus());

  // Wischen als Zusatz; die Schaltflächen bleiben der zugängliche Weg.
  let startX: number | null = null;
  stage.addEventListener('pointerdown', (event) => {
    startX = event.pointerType === 'touch' ? event.clientX : null;
  });
  stage.addEventListener('pointerup', (event) => {
    if (startX === null) return;
    const delta = event.clientX - startX;
    startX = null;
    if (Math.abs(delta) > 50) show(current + (delta < 0 ? 1 : -1));
  });
  stage.addEventListener('pointercancel', () => (startX = null));
}
