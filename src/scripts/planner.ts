/** Gruppenplaner: Treffzeit in Madrid, Einladung teilen/kopieren, Kalenderdatei. Keine Reservierung, kein Versand. */
import { fill } from '../i18n';
import { buildCalendar } from '../lib/ics';
import { draftFromParams, draftToParams, loadDraft, saveDraft, updateDraft, validatePlan, type Draft, type PlanResult } from '../lib/planner';
import { copyText, shareOrCopy } from '../lib/share';
import { deviceTimeZone, formatClock, formatLongDate, madridDate, toInstant, VENUE_TIME_ZONE } from '../lib/time';
import { one, showManualCopy, strings } from './dom';

interface Data {
  locale: string;
  maps: string;
  planUrl: string | null;
  location: string;
  localTime: string;
  s: Record<string, string>;
}

const root = document.querySelector<HTMLElement>('[data-planner]');
if (root) {
  const data = strings<Data>(root);
  const s = data.s;
  const form = one<HTMLFormElement>(root, 'form');
  const date = one<HTMLInputElement>(form, '[name="date"]');
  const time = one<HTMLInputElement>(form, '[name="time"]');
  const status = one<HTMLElement>(form, '[data-status]');
  const manual = one<HTMLElement>(form, '[data-manual]');
  const incoming = one<HTMLElement>(form, '[data-incoming]');
  const ticket = one<HTMLElement>(root, '[data-ticket]');
  const ticketDate = one<HTMLElement>(ticket, '[data-ticket-date]');
  const ticketTime = one<HTMLElement>(ticket, '[data-ticket-time]');
  const ticketDevice = one<HTMLElement>(ticket, '[data-ticket-device]');

  // Ein Einladungslink (oder der Sprachwechsel bei gesperrtem Speicher) bringt den Plan in der URL mit.
  const fromLink = draftFromParams(new URLSearchParams(location.search));
  const stored = loadDraft();
  // Fremder Plan = Kennung aus dem Link ist nicht der eigene Entwurf dieser Sitzung.
  const foreign = Boolean(fromLink && fromLink.uid !== stored.uid);
  let draft: Draft = fromLink ?? stored;
  if (fromLink) {
    saveDraft(fromLink);
    // Parameter übernehmen und aus der Adresse nehmen: spätere Änderungen sollen nicht vom Link überschrieben werden.
    try {
      history.replaceState(null, '', location.pathname + location.hash);
    } catch {
      /* Adresse bleibt, Funktion nicht betroffen */
    }
  }
  date.value = draft.date;
  time.value = draft.time;
  date.min = madridDate();

  (window as Window & { chuccaCarry?: () => string }).chuccaCarry = () => {
    const query = draftToParams(draft).toString();
    return query ? `?${query}` : '';
  };

  const planUrl = (): string | null => (data.planUrl ? `${data.planUrl}?${draftToParams(draft).toString()}` : null);

  function invitation(instant: Date): { text: string; url: string } {
    const lines = [
      fill(s.inviteLine ?? '', { date: formatLongDate(instant, data.locale), time: draft.time, zone: data.localTime }),
      s.inviteAddress ?? '',
      s.note ?? '',
    ];
    const plan = planUrl();
    if (plan) lines.push(`${s.inviteRoute} ${data.maps}`);
    return { text: lines.join('\n'), url: plan ?? data.maps };
  }

  function clearError(): void {
    status.textContent = '';
    delete status.dataset.kind;
    for (const field of [date, time]) {
      field.removeAttribute('aria-invalid');
      field.setAttribute('aria-describedby', 'plan-zone');
    }
  }

  function renderTicket(): void {
    const instant = toInstant(draft.date, draft.time);
    ticket.dataset.empty = String(!instant);
    ticketDate.textContent = instant ? formatLongDate(instant, data.locale) : (s.previewEmpty ?? '');
    ticketTime.textContent = instant ? draft.time : '–:–';
    const zone = deviceTimeZone();
    const local = instant && zone ? formatClock(instant, data.locale, zone) : null;
    const differs = Boolean(instant && zone && zone !== VENUE_TIME_ZONE && local !== draft.time);
    ticketDevice.hidden = !differs;
    if (differs && local && zone) ticketDevice.textContent = fill(s.deviceTime ?? '', { time: local, zone: zone.replace(/_/g, ' ') });
  }

  function change(): void {
    draft = updateDraft(draft, date.value, time.value);
    saveDraft(draft);
    clearError();
    manual.hidden = true;
    incoming.hidden = true;
    renderTicket();
  }

  function check(): (PlanResult & { ok: true }) | null {
    clearError();
    date.min = madridDate();
    const result = validatePlan(draft);
    if (result.ok) return result;
    const field = result.field === 'date' ? date : time;
    status.textContent = { invalidDate: s.invalidDate, invalidTime: s.invalidTime, dst: s.dst, past: s.past }[result.code] ?? '';
    status.dataset.kind = 'error';
    field.setAttribute('aria-invalid', 'true');
    field.setAttribute('aria-describedby', 'plan-zone plan-status');
    field.focus();
    return null;
  }

  form.addEventListener('input', change);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const result = check();
    if (!result) return;
    const { text, url } = invitation(result.instant);
    manual.hidden = true;
    const outcome = await shareOrCopy({ title: s.inviteTitle ?? '', text, url });
    if (outcome === 'shared') status.textContent = s.shared ?? '';
    else if (outcome === 'copied') status.textContent = s.copied ?? '';
    else if (outcome === 'manual') showManualCopy(manual, `${text}\n${url}`);
  });

  one<HTMLButtonElement>(form, '[data-copy]').addEventListener('click', async () => {
    const result = check();
    if (!result) return;
    const { text, url } = invitation(result.instant);
    manual.hidden = true;
    if ((await copyText(`${text}\n${url}`)) === 'copied') status.textContent = s.copied ?? '';
    else showManualCopy(manual, `${text}\n${url}`);
  });

  one<HTMLButtonElement>(form, '[data-calendar]').addEventListener('click', () => {
    const result = check();
    if (!result) return;
    const plan = planUrl();
    const file = new Blob(
      [
        buildCalendar({
          uid: draft.uid,
          start: result.instant,
          durationMinutes: 120,
          summary: s.calendarSummary ?? 'CHUCCA',
          location: data.location,
          description: `${s.note}\n${data.maps}`,
          ...(plan ? { url: plan } : {}),
        }),
      ],
      { type: 'text/calendar;charset=utf-8' },
    );
    const url = URL.createObjectURL(file);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'chucca-meetup.ics';
    anchor.hidden = true;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    status.textContent = s.calendarDone ?? '';
  });

  renderTicket();
  if (fromLink && foreign) {
    const result = validatePlan(fromLink);
    if (result.ok) {
      one<HTMLElement>(incoming, '[data-incoming-text]').textContent = fill(s.incoming ?? '', { date: formatLongDate(result.instant, data.locale), time: fromLink.time });
      incoming.hidden = false;
    }
  }
}
