/** „Jetzt an der Playa de Palma“: Uhr, Sonnenuntergang, Öffnungsstatus und abgelaufene Termine. */
import { fill } from '../i18n';
import { openStatus, type HoursData } from '../lib/hours';
import { skyPhase, sunset } from '../lib/sun';
import { addDays, formatClock, intlLocale, madridDate, VENUE_TIME_ZONE } from '../lib/time';
import { strings } from './dom';

interface Data {
  locale: string;
  geo: { lat: number; lon: number };
  hours: HoursData;
  strings: Record<string, string>;
}

const root = document.querySelector<HTMLElement>('[data-today]');
if (root) {
  const data = strings<Data>(root);
  const s = data.strings;
  const clock = root.querySelector<HTMLElement>('[data-now-clock]');
  const phase = root.querySelector<HTMLElement>('[data-now-phase]');
  const sun = root.querySelector<HTMLElement>('[data-now-sunset]');
  const sunLabel = root.querySelector<HTMLElement>('[data-now-sunset-label]');
  const hours = root.querySelector<HTMLElement>('[data-now-hours]');
  const dayFormat = new Intl.DateTimeFormat(intlLocale(data.locale), { timeZone: VENUE_TIME_ZONE, weekday: 'short', day: 'numeric', month: 'short' });
  const weekday = new Intl.DateTimeFormat(intlLocale(data.locale), { timeZone: VENUE_TIME_ZONE, weekday: 'long' });

  const duration = (ms: number): string => {
    const minutes = Math.max(1, Math.round(ms / 60_000));
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return [h ? `${h} ${s.hoursUnit}` : '', m || !h ? `${m} ${s.minutesUnit}` : ''].filter(Boolean).join(' ');
  };

  const render = (): void => {
    const now = new Date();
    const today = madridDate(now);
    const set = sunset(today, data.geo.lat, data.geo.lon);
    const sky = skyPhase(now, today, data.geo.lat, data.geo.lon);
    document.documentElement.dataset.sky = sky;
    if (clock) clock.textContent = `${dayFormat.format(now)} · ${formatClock(now, data.locale)}`;
    // Nach Sonnenuntergang zählt der nächste: die Angabe soll nach vorn zeigen.
    const passed = Boolean(set && now.getTime() > set.getTime());
    const shown = passed ? sunset(addDays(today, 1), data.geo.lat, data.geo.lon) : set;
    if (sun) sun.textContent = shown ? formatClock(shown, data.locale) : '–';
    if (sunLabel) sunLabel.textContent = (passed ? s.sunsetTomorrow : s.sunset) ?? '';
    if (phase) {
      const untilSet = set ? set.getTime() - now.getTime() : 0;
      const text = { day: s.phaseDay, golden: s.phaseGolden, dusk: s.phaseDusk, night: s.phaseNight }[sky] ?? '';
      phase.textContent = fill(text, { duration: duration(untilSet) });
    }
    if (hours) {
      const status = openStatus(data.hours, now);
      if (status.state === 'open') hours.textContent = fill(s.open ?? '', { time: formatClock(status.closesAt, data.locale) });
      else if (status.state === 'closed') {
        hours.textContent = status.opensAt
          ? fill(s.closedOpens ?? '', { day: weekday.format(status.opensAt), time: formatClock(status.opensAt, data.locale) })
          : (s.closed ?? '');
      }
      // „unconfirmed“: der statische Hinweis aus dem HTML bleibt stehen.
    }
    // Termine, deren Tag vorbei ist, verschwinden auch ohne neuen Build.
    const section = document.querySelector<HTMLElement>('[data-events]');
    if (section) {
      let visible = 0;
      for (const item of section.querySelectorAll<HTMLElement>('[data-event]')) {
        item.hidden = (item.dataset.hideAfter ?? '') < today;
        if (!item.hidden) visible++;
      }
      section.hidden = visible === 0;
    }
  };
  render();
  setInterval(render, 30_000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) render();
  });
}
