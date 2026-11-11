/** Kleine DOM-Helfer für die Interaktionsskripte. */
export function strings<T>(root: Element | Document, selector = 'script[data-strings]'): T {
  const node = root.querySelector(selector);
  return JSON.parse(node?.textContent ?? '{}') as T;
}

export const one = <T extends Element>(root: ParentNode, selector: string): T => {
  const node = root.querySelector<T>(selector);
  if (!node) throw new Error(`Element fehlt: ${selector}`);
  return node;
};

let toastTimer: ReturnType<typeof setTimeout> | undefined;

/** Kurze Statusmeldung; mit Aktion bleibt sie stehen, bis sie genutzt wird. */
export function toast(text: string, action?: { label: string; run: () => void }): void {
  const box = document.querySelector<HTMLElement>('[data-toast]');
  if (!box) return;
  const label = one<HTMLElement>(box, '[data-toast-text]');
  const button = one<HTMLButtonElement>(box, '[data-toast-action]');
  label.textContent = text;
  button.hidden = !action;
  button.textContent = action?.label ?? '';
  button.onclick = action ? () => action.run() : null;
  box.dataset.open = 'true';
  clearTimeout(toastTimer);
  if (!action) toastTimer = setTimeout(() => (box.dataset.open = 'false'), 5000);
}

/** Zeigt den Text zum Markieren an, wenn weder Teilen noch Zwischenablage funktionieren. */
export function showManualCopy(container: HTMLElement, text: string): void {
  const field = one<HTMLTextAreaElement>(container, 'textarea');
  field.value = text;
  container.hidden = false;
  field.focus();
  field.select();
}

export const reducedMotion = (): boolean => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
