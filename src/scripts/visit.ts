/** Besuch: Treffpunkt teilen, Adresse kopieren und eine Gruppennachricht vorbereiten (ohne Versand). */
import { fill } from '../i18n';
import { validatePlan } from '../lib/planner';
import { copyText, plainText, shareOrCopy } from '../lib/share';
import { formatLongDate, madridDate, madridWeekday } from '../lib/time';
import { one, showManualCopy, strings } from './dom';

interface Data {
  locale: string;
  addressText: string;
  maps: string;
  shareTitle: string;
  shareText: string;
  shared: string;
  shareCopied: string;
  addressCopied: string;
  inquiry: Record<string, string>;
}

const root = document.querySelector<HTMLElement>('[data-visit]');
if (root) {
  const data = strings<Data>(root);
  const status = one<HTMLElement>(root, '[data-place-status]');
  const manual = one<HTMLElement>(root, '[data-place-manual]');

  let sharing = false;
  one<HTMLButtonElement>(root, '[data-share-place]').addEventListener('click', async () => {
    if (sharing) return;
    const payload = { title: data.shareTitle, text: data.shareText, url: data.maps };
    manual.hidden = true;
    status.textContent = '';
    sharing = true;
    const outcome = await shareOrCopy(payload).finally(() => (sharing = false));
    if (outcome === 'shared') status.textContent = data.shared;
    else if (outcome === 'copied') status.textContent = data.shareCopied;
    else if (outcome === 'manual') showManualCopy(manual, plainText(payload));
    // „aborted“: bewusst keine Meldung.
  });

  one<HTMLButtonElement>(root, '[data-copy-address]').addEventListener('click', async () => {
    manual.hidden = true;
    status.textContent = '';
    if ((await copyText(data.addressText)) === 'copied') status.textContent = data.addressCopied;
    else showManualCopy(manual, data.addressText);
  });

  // Zeiten außerhalb ihres bestätigten Zeitraums gelten nicht mehr als bestätigt.
  const hours = root.querySelector<HTMLElement>('[data-hours]');
  if (hours) {
    const day = madridDate();
    const expired = Boolean((hours.dataset.validFrom && day < hours.dataset.validFrom) || (hours.dataset.validUntil && day > hours.dataset.validUntil));
    if (expired) {
      const note = document.createElement('p');
      note.textContent = hours.dataset.unconfirmed ?? '';
      hours.replaceWith(note);
    } else {
      for (const cell of hours.querySelectorAll<HTMLElement>(`[data-day="${madridWeekday()}"]`)) cell.dataset.today = 'true';
    }
  }

  // Gruppennachricht: wird nur vorbereitet. Gesendet wird sie von der Person selbst.
  const form = one<HTMLFormElement>(root, '[data-inquiry]');
  const s = data.inquiry;
  const people = one<HTMLInputElement>(form, '[name="people"]');
  const date = one<HTMLInputElement>(form, '[name="date"]');
  const time = one<HTMLInputElement>(form, '[name="time"]');
  const note = one<HTMLInputElement>(form, '[name="note"]');
  const inquiryStatus = one<HTMLElement>(form, '[data-inquiry-status]');
  const output = one<HTMLElement>(form, '[data-inquiry-output]');
  const text = one<HTMLTextAreaElement>(output, 'textarea');
  date.min = madridDate();

  const clear = (): void => {
    inquiryStatus.textContent = '';
    delete inquiryStatus.dataset.kind;
    for (const field of [people, date, time]) {
      field.removeAttribute('aria-invalid');
      if (field === people) field.removeAttribute('aria-describedby');
      else field.setAttribute('aria-describedby', 'inq-zone');
    }
  };
  const fail = (field: HTMLInputElement, message: string): void => {
    inquiryStatus.textContent = message;
    inquiryStatus.dataset.kind = 'error';
    field.setAttribute('aria-invalid', 'true');
    field.setAttribute('aria-describedby', field === people ? 'inq-status' : 'inq-zone inq-status');
    output.hidden = true;
    field.focus();
  };
  form.addEventListener('input', () => {
    clear();
    output.hidden = true;
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    clear();
    const count = Number(people.value);
    if (!Number.isInteger(count) || count < 2 || count > 40) return fail(people, s.errorPeople ?? '');
    const result = validatePlan({ date: date.value, time: time.value });
    if (!result.ok) {
      const message = { invalidDate: s.errorDate, invalidTime: s.errorTime, dst: s.errorDst, past: s.errorPast }[result.code] ?? '';
      return fail(result.field === 'date' ? date : time, message);
    }
    const lines = [fill(s.template ?? '', { people: count, date: formatLongDate(result.instant, data.locale), time: time.value })];
    const extra = note.value.trim();
    if (extra) lines.push(fill(s.templateNote ?? '', { note: extra }));
    text.value = lines.join('\n');
    output.hidden = false;
    inquiryStatus.textContent = s.prepared ?? '';
    text.focus();
  });
  one<HTMLButtonElement>(form, '[data-inquiry-copy]').addEventListener('click', async () => {
    if ((await copyText(text.value)) === 'copied') inquiryStatus.textContent = s.copied ?? '';
    else {
      text.focus();
      text.select();
    }
  });
}
