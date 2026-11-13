/**
 * Besuch: Treffpunkt teilen, Adresse kopieren und eine Gruppennachricht vorbereiten. Gesendet wird sie von der Person
 * selbst, außer der Betrieb hat einen Endpunkt bestätigt: dann gibt es zusätzlich einen Senden-Knopf (Aufgabe 18).
 */
import { fill } from '../i18n';
import { buildPayload, sendInquiry, type InquiryPayload } from '../lib/inquiry-send';
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
  /** Nur vorhanden, wenn der Betrieb einen Endpunkt für Anfragen bestätigt hat (Aufgabe 18). */
  send?: { url: string } & Record<'sending' | 'sent' | 'rejected' | 'server' | 'timeout' | 'offline', string>;
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
  // Ausnahmetage: vergangene verschwinden auch ohne neuen Build; ein heutiger Eintrag wird hervorgehoben.
  const exceptions = root.querySelector<HTMLElement>('[data-exceptions]');
  if (exceptions) {
    const day = madridDate();
    let visible = 0;
    for (const cell of exceptions.querySelectorAll<HTMLElement>('[data-exception]')) {
      const date = cell.dataset.exception ?? '';
      cell.hidden = date < day;
      if (date === day) cell.dataset.today = 'true';
      if (!cell.hidden) visible++;
    }
    // Ist die ganze Wochentabelle nicht mehr bestätigt (Zeitraum vorbei), entfallen auch die Ausnahmen.
    exceptions.hidden = visible === 0 || !root.querySelector('[data-hours]');
  }

  // Gruppennachricht: wird vorbereitet. Gesendet wird sie von der Person selbst oder, nur mit bestätigtem Endpunkt, über den Senden-Knopf.
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
  const sendButton = form.querySelector<HTMLButtonElement>('[data-inquiry-send]');
  const sendConfig = sendButton ? data.send : undefined;
  /** Angaben der zuletzt vorbereiteten Nachricht; nur diese können gesendet werden. */
  let pending: InquiryPayload | null = null;
  /** Genau ein Versand zugleich, und nach einem Erfolg kein zweiter für dieselben Angaben. */
  let busy = false;
  let delivered = false;
  const setSendLocked = (locked: boolean): void => {
    if (!sendButton) return;
    if (locked) sendButton.setAttribute('aria-disabled', 'true');
    else sendButton.removeAttribute('aria-disabled');
  };
  const setFieldsLocked = (locked: boolean): void => {
    for (const field of [people, date, time, note]) field.readOnly = locked;
    if (locked) form.setAttribute('aria-busy', 'true');
    else form.removeAttribute('aria-busy');
  };

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
    if (busy) return;
    clear();
    output.hidden = true;
    pending = null;
    delivered = false;
    setSendLocked(false);
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (busy) return;
    clear();
    pending = null;
    delivered = false;
    setSendLocked(false);
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
    pending = buildPayload({ people: count, date: date.value, time: time.value, note: extra, locale: data.locale });
    output.hidden = false;
    inquiryStatus.textContent = s.prepared ?? '';
    text.focus();
  });
  if (sendButton && sendConfig) {
    const messages = sendConfig;
    sendButton.addEventListener('click', async () => {
      // Busy-Flag vor dem ersten await: ein zweiter Klick (auch ein Doppelklick) löst keinen zweiten Versand aus.
      if (busy || delivered || !pending) return;
      busy = true;
      setSendLocked(true);
      setFieldsLocked(true);
      delete inquiryStatus.dataset.kind;
      inquiryStatus.textContent = messages.sending;
      const outcome = await sendInquiry({ url: messages.url, payload: pending });
      busy = false;
      setFieldsLocked(false);
      // Erfolg nur nach HTTP 2xx. Jeder andere Ausgang bewahrt die Eingabe und den Text zum Kopieren.
      if (outcome === 'sent') {
        delivered = true;
        delete inquiryStatus.dataset.kind;
        inquiryStatus.textContent = messages.sent;
      } else {
        setSendLocked(false);
        inquiryStatus.dataset.kind = 'error';
        inquiryStatus.textContent = messages[outcome];
      }
    });
  }
  one<HTMLButtonElement>(form, '[data-inquiry-copy]').addEventListener('click', async () => {
    // Nach erfolgreichem Versand bleibt die Erfolgsmeldung stehen („noch nicht gesendet“ wäre dann falsch).
    if ((await copyText(text.value)) === 'copied') {
      if (!delivered) inquiryStatus.textContent = s.copied ?? '';
    } else {
      text.focus();
      text.select();
    }
  });
}
