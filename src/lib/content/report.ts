/**
 * Auswertung der Inhalte für `npm run content:check`.
 * Reine Funktionen ohne Dateizugriff: Das Skript liest die Dateien, diese Datei bewertet und formatiert.
 * Alle Ausgaben sind für Nicht-Entwickler auf Deutsch formuliert.
 */
import { activeEndpoint, endpointProblems, inactiveEndpointNote } from '../inquiry-endpoint';
import { exclusionReasons, isPreviewConcept, type ExclusionReason } from '../media';
import { incompleteConfirmations, LOCALE_CODES, unbackedConfirmations, type FactStatus, type MediaInternal, type Menu, type Venue, type VenueEvent } from './schema';

export type Level = 'ok' | 'warn' | 'error';
export const ICON: Record<Level, string> = { ok: '✔', warn: '⚠', error: '✖' };

export interface Line {
  level: Level;
  text: string;
}
export interface Section {
  id: string;
  title: string;
  status: Level;
  lines: Line[];
}

/* ---------- Schema-Verstöße verständlich darstellen ---------- */

export interface IssueLike {
  code: string;
  path: PropertyKey[];
  message: string;
}

/** `['items', 3, 'prices']` → `items[3].prices` */
export function jsonPath(path: readonly PropertyKey[]): string {
  let out = '';
  for (const part of path) {
    if (typeof part === 'number') out += `[${part}]`;
    else out += out ? `.${String(part)}` : String(part);
  }
  return out || '(Dateiebene)';
}

function germanMessage(issue: IssueLike): string {
  const extra = issue as unknown as Record<string, unknown>;
  switch (issue.code) {
    case 'invalid_type':
      return `falscher Typ oder Wert fehlt (erwartet: ${String(extra.expected ?? '?')})`;
    case 'unrecognized_keys':
      return `unbekanntes Feld: ${Array.isArray(extra.keys) ? extra.keys.join(', ') : '?'} (Tippfehler?)`;
    case 'invalid_value': {
      const values = Array.isArray(extra.values) ? extra.values.map((v) => JSON.stringify(v)).join(', ') : '?';
      return `ungültiger Wert; erlaubt: ${values}`;
    }
    case 'too_small':
      if (extra.origin === 'number') return extra.inclusive === false ? `Zahl muss größer als ${String(extra.minimum)} sein (Preise in Cent, z. B. 950 für 9,50 €; unbekannter Preis: Eintrag weglassen)` : `Zahl muss mindestens ${String(extra.minimum)} sein`;
      return issue.path.includes('regular') ? 'es müssen genau sieben Einträge sein (Sonntag zuerst, geschlossen = null)' : 'Text fehlt oder ist leer (jeder Text braucht DE, EN und ES)';
    case 'too_big':
      return issue.path.includes('regular') ? 'es müssen genau sieben Einträge sein (Sonntag zuerst, geschlossen = null)' : 'zu lang oder zu viele Einträge';
    case 'invalid_format':
      return 'falsches Format (z. B. Datum JJJJ-MM-TT, Uhrzeit HH:MM, ID nur a-z 0-9 und -)';
    default:
      return issue.message;
  }
}

/** Eine Zeile je Verstoß: „src/content/published/menu.json → items[3].prices: …“ */
export function describeIssues(file: string, issues: readonly IssueLike[]): string[] {
  return issues.map((issue) => `${file} → ${jsonPath(issue.path)}: ${germanMessage(issue)}`);
}

/**
 * Wie `describeIssues`, aber für den Build: wirft einen Fehler mit deutscher Meldung (Datei, Feld, Grund)
 * statt der rohen Schema-Ausgabe.
 */
export function parseOrThrow<T>(file: string, schema: { safeParse(raw: unknown): { success: true; data: T } | { success: false; error: { issues: readonly IssueLike[] } } }, raw: unknown): T {
  const result = schema.safeParse(raw);
  if (result.success) return result.data;
  throw new Error(`Inhalte fehlerhaft – der Build wurde angehalten. Bitte beheben (Prüfung mit „npm run content:check“):\n  ${describeIssues(file, result.error.issues).join('\n  ')}`);
}

/* ---------- Hilfen ---------- */

const MAX_MENU_AGE_DAYS = 90;
const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

export function daysBetween(from: string, to: string): number {
  const ms = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
  return Math.round((ms(to) - ms(from)) / 86_400_000);
}

const STATUS_TEXT: Record<FactStatus, string> = {
  confirmed: 'bestätigt',
  'source-claim': 'nur aus Quelle übernommen, nicht bestätigt',
  proposal: 'Vorschlag',
  unknown: 'unbekannt',
  historic: 'veraltet',
};

export const MEDIA_REASON_TEXT: Record<ExclusionReason, string> = {
  rights_not_approved: 'Nutzungsrechte nicht freigegeben',
  venue_not_verified: 'Aufnahmeort nicht bestätigt',
  not_actual_venue_photograph: 'kein echtes Foto des Lokals',
  no_local_file: 'keine Bilddatei hinterlegt',
  missing_alt: 'Alternativtext fehlt',
};

const worst = (lines: Line[]): Level => (lines.some((l) => l.level === 'error') ? 'error' : lines.some((l) => l.level === 'warn') ? 'warn' : 'ok');
const section = (id: string, title: string, lines: Line[]): Section => ({ id, title, status: worst(lines), lines });
const ok = (text: string): Line => ({ level: 'ok', text });
const warn = (text: string): Line => ({ level: 'warn', text });
const err = (text: string): Line => ({ level: 'error', text });

function provenanceLines(label: string, fact: { status: FactStatus; source?: string | undefined; observedAt?: string | undefined; verifiedAt?: string | null | undefined }): Line[] {
  const lines: Line[] = [];
  const when = fact.observedAt ? `beobachtet am ${fact.observedAt}` : 'ohne Beobachtungsdatum';
  const source = fact.source?.trim() ? 'Quelle genannt' : 'keine Quelle';
  const text = `${label}: ${STATUS_TEXT[fact.status]} (confirmed: ${fact.status === 'confirmed' ? 'ja' : 'nein'}; ${source}; ${when})`;
  lines.push(fact.status === 'confirmed' ? ok(text) : warn(text));
  if (fact.status === 'confirmed' && !fact.verifiedAt) lines.push(warn(`${label}: noch nicht vom Betrieb bestätigt (verifiedAt leer) – Quellenlage genügt für den Build, ein Beleg des Betriebs fehlt.`));
  return lines;
}

/* ---------- Bereiche ---------- */

export function reviewVenue(venue: Venue, today: string): Section[] {
  const contact: Line[] = [...provenanceLines('Adresse', venue.address)];
  for (const channel of venue.channels) {
    const label = `Kontakt ${channel.type} (${channel.label})`;
    contact.push(...provenanceLines(label, channel));
    if (channel.status === 'confirmed' && !channel.acceptsInquiries) contact.push(warn(`${label}: wird nicht für Gruppenanfragen betreut.`));
  }
  const endpoint = venue.inquiryEndpoint;
  if (endpoint) {
    contact.push(...provenanceLines('Anfrage-Endpunkt (Sendeweg)', endpoint));
    for (const problem of endpointProblems(endpoint)) contact.push(err(`Anfrage-Endpunkt: ${problem}`));
    const note = inactiveEndpointNote(endpoint);
    if (note) contact.push(warn(note));
    if (activeEndpoint(endpoint)) {
      contact.push(ok('Anfrage-Endpunkt ist bestätigt: Das Formular zeigt „Anfrage senden“, die CSP erlaubt genau diesen Host (connect-src, form-action).'));
      if (!endpoint.privacyNote) contact.push(warn('Anfrage-Endpunkt ohne privacyNote: Die Seite zeigt statt des Datenschutzhinweises einen markierten Platzhalter. Rechtstext vom Betrieb einholen.'));
    }
  }
  if (!venue.channels.some((c) => c.status === 'confirmed' && c.acceptsInquiries) && !activeEndpoint(endpoint)) {
    contact.push(warn('Kein bestätigter, betreuter Kanal für Gruppenanfragen – die Seite bietet nur eine vorbereitete Nachricht ohne Versand.'));
  }

  const hours: Line[] = [];
  const h = venue.hours;
  if (h.status === 'confirmed' && h.regular) {
    hours.push(ok('Öffnungszeiten sind bestätigt.'));
    const days = h.regular.map((d, i) => (d ? `${WEEKDAYS[i]?.slice(0, 2)} ${d.open}–${d.close}` : `${WEEKDAYS[i]?.slice(0, 2)} zu`));
    hours.push(ok(`Woche: ${days.join(', ')}`));
  } else if (h.status === 'confirmed') {
    hours.push(err('Öffnungszeiten stehen auf „bestätigt“, aber die Wochentage (regular) fehlen.'));
  } else {
    hours.push(warn(`Öffnungszeiten sind nicht bestätigt (${STATUS_TEXT[h.status]}) – öffentlich erscheint „noch nicht bestätigt“.`));
  }
  if (h.validFrom || h.validUntil) {
    hours.push(ok(`Zeitraum: ${h.validFrom ?? 'offen'} bis ${h.validUntil ?? 'offen'}`));
    if (h.validUntil && h.validUntil < today) hours.push(warn(`Der bestätigte Zeitraum ist am ${h.validUntil} abgelaufen – neue Zeiten einholen.`));
    if (h.validFrom && h.validFrom > today) hours.push(warn(`Der Zeitraum beginnt erst am ${h.validFrom}; bis dahin gilt „unbestätigt“.`));
  } else if (h.status === 'confirmed') {
    hours.push(warn('Kein Gültigkeitszeitraum angegeben (Saison?). Die Zeiten gelten dann unbegrenzt.'));
  }
  const exceptions = Object.keys(h.exceptions ?? {});
  if (exceptions.length > 0) {
    hours.push(ok(`${exceptions.length} Ausnahmetag(e) hinterlegt.`));
    const past = exceptions.filter((date) => date < today);
    if (past.length > 0) hours.push(warn(`${past.length} Ausnahmetag(e) liegen in der Vergangenheit und werden nicht mehr gezeigt: ${past.join(', ')} – bei Gelegenheit entfernen.`));
    const outside = exceptions.filter((date) => date >= today && ((h.validFrom && date < h.validFrom) || (h.validUntil && date > h.validUntil)));
    if (outside.length > 0) hours.push(warn(`Ausnahmetag(e) außerhalb des bestätigten Zeitraums (${h.validFrom ?? 'offen'} bis ${h.validUntil ?? 'offen'}) werden nicht gezeigt: ${outside.join(', ')}`));
    if (h.status !== 'confirmed') hours.push(warn('Ausnahmetage sind hinterlegt, aber die Zeiten sind nicht bestätigt – öffentlich erscheinen sie nicht.'));
  }
  const sameTime = [...(h.regular ?? []).map((range, i) => (range ? { where: WEEKDAYS[i] ?? String(i), range } : null)), ...Object.entries(h.exceptions ?? {}).map(([date, range]) => (range ? { where: date, range } : null))].filter((entry) => entry && entry.range.open === entry.range.close);
  if (sameTime.length > 0) hours.push(warn(`Öffnung und Schließung zur selben Uhrzeit (${sameTime.map((entry) => entry?.where).join(', ')}): wird als 24 Stunden gerechnet. Stimmt das, oder fehlt eine Uhrzeit?`));
  if (h.source && /widerspr/i.test(h.source)) hours.push(warn(`Widersprüchliche Quellen: ${h.source.replace(/^Widerspruch:\s*/i, '')}`));
  if (h.status === 'confirmed') hours.push(...provenanceLines('Öffnungszeiten-Beleg', h).filter((l) => l.level !== 'ok'));

  const entrance = provenanceLines('Eingangsbeschreibung', venue.entrance);
  if (venue.entrance.status !== 'confirmed') entrance.push(warn('Öffentlich wird der Eingang erst nach Bestätigung (und Fotos vor Ort) gezeigt.'));

  return [section('contact', 'Adresse und Kontakte', contact), section('hours', 'Öffnungszeiten', hours), section('entrance', 'Eingang', entrance)];
}

function untranslated(menu: Menu): string[] {
  const hits: string[] = [];
  const check = (where: string, text: { de: string; en: string; es: string } | undefined) => {
    if (!text) return;
    for (const lang of ['en', 'es'] as const) if (text[lang].trim() === text.de.trim()) hits.push(`${where} (${lang.toUpperCase()} = DE)`);
  };
  menu.categories.forEach((c, i) => {
    check(`categories[${i}].name`, c.name);
    check(`categories[${i}].note`, c.note);
  });
  menu.items.forEach((item, i) => {
    check(`items[${i}].description`, item.description);
    item.ingredients.forEach((ing, j) => check(`items[${i}].ingredients[${j}]`, ing));
  });
  return hits;
}

export function reviewMenu(menu: Menu, fixture: Menu | null, today: string, file = 'src/content/published/menu.json'): Section {
  const lines: Line[] = [];
  if (menu.items.length === 0) {
    lines.push(warn(`Noch keine veröffentlichte Karte (Status: ${menu.status === 'confirmed' ? 'bestätigt' : 'ausstehend'}). Öffentlich erscheint „Die bestätigte Karte folgt.“`));
    if (fixture) lines.push(ok(`Die Vorschau zeigt stattdessen die Beispielkarte (${fixture.items.length} Drinks, gekennzeichnet).`));
    return section('menu', 'Karte', lines);
  }
  lines.push(menu.status === 'confirmed' ? ok(`Karte bestätigt, ${menu.items.length} Drinks in ${menu.categories.length} Kategorien.`) : err('Karte enthält Drinks, ist aber nicht bestätigt (status).'));
  for (const category of menu.categories) {
    const n = menu.items.filter((i) => i.category === category.id).length;
    lines.push(n > 0 ? ok(`${category.name.de}: ${n} Drink(s)`) : warn(`${category.name.de}: Kategorie ist leer.`));
  }
  const noPrice = menu.items.map((item, i) => ({ item, i })).filter(({ item }) => item.prices.length === 0);
  lines.push(
    noPrice.length === 0
      ? ok('Alle Drinks haben einen Preis.')
      : warn(`${noPrice.length} Drink(s) ohne Preis: ${noPrice.map(({ item, i }) => `${item.name.de} (${file} → items[${i}].prices)`).join('; ')}`),
  );
  const noIngredients = menu.items.map((item, i) => ({ item, i })).filter(({ item }) => item.ingredients.length === 0);
  lines.push(
    noIngredients.length === 0
      ? ok('Alle Drinks haben Zutaten.')
      : warn(`${noIngredients.length} Drink(s) ohne Zutaten: ${noIngredients.map(({ item, i }) => `${item.name.de} (items[${i}].ingredients)`).join('; ')}`),
  );
  lines.push(ok(`Alkoholfrei: ${menu.items.filter((i) => i.alcoholFree).length} Drink(s).`));
  const unavailable = menu.items.filter((i) => !i.available).length;
  if (unavailable > 0) lines.push(ok(`${unavailable} Drink(s) als nicht verfügbar markiert.`));
  const open = untranslated(menu);
  lines.push(
    open.length === 0
      ? ok('Alle Texte unterscheiden sich in DE/EN/ES (keine unübersetzten Texte erkennbar).')
      : warn(`Mögliche fehlende Übersetzungen (Text in EN/ES gleich DE – bei Eigennamen in Ordnung): ${open.slice(0, 8).join('; ')}${open.length > 8 ? ` … (+${open.length - 8})` : ''}`),
  );
  if (menu.updatedAt) {
    const age = daysBetween(menu.updatedAt, today);
    lines.push(age > MAX_MENU_AGE_DAYS ? warn(`Stand der Karte: ${menu.updatedAt} – vor ${age} Tagen, älter als ${MAX_MENU_AGE_DAYS} Tage. Preise beim Betrieb bestätigen lassen.`) : ok(`Stand der Karte: ${menu.updatedAt} (vor ${Math.max(age, 0)} Tagen).`));
  } else lines.push(warn('Kein Stand der Karte (updatedAt) angegeben.'));
  return section('menu', 'Karte', lines);
}

export function reviewEvents(events: VenueEvent[], today: string): Section {
  const lines: Line[] = [];
  if (events.length === 0) {
    lines.push(warn('Keine Termine hinterlegt – das Termin-Modul entfällt öffentlich.'));
    return section('events', 'Termine', lines);
  }
  const confirmed = events.filter((e) => e.status === 'confirmed');
  const expired = confirmed.filter((e) => (e.hideAfter ?? e.date) < today);
  const upcoming = confirmed.length - expired.length;
  lines.push(upcoming > 0 ? ok(`${upcoming} bestätigte, kommende(r) Termin(e).`) : warn('Kein kommender bestätigter Termin.'));
  if (expired.length > 0) lines.push(warn(`${expired.length} abgelaufene(r) Termin(e), werden nicht mehr gezeigt: ${expired.map((e) => `${e.title.de} (${e.date})`).join('; ')}`));
  const draft = events.filter((e) => e.status === 'draft').length;
  const cancelled = events.filter((e) => e.status === 'cancelled').length;
  if (draft > 0) lines.push(warn(`${draft} Entwurf/Entwürfe – nicht öffentlich, bis sie bestätigt sind.`));
  if (cancelled > 0) lines.push(ok(`${cancelled} abgesagt (werden nicht gezeigt).`));
  return section('events', 'Termine', lines);
}

export function reviewMedia(records: MediaInternal[], existingFiles: ReadonlySet<string> | null): Section {
  const lines: Line[] = [];
  const publishable = records.filter((r) => exclusionReasons(r).length === 0);
  const concepts = records.filter(isPreviewConcept);
  const blocked = records.filter((r) => exclusionReasons(r).length > 0 && !isPreviewConcept(r));
  lines.push(publishable.length > 0 ? ok(`${publishable.length} veröffentlichbare(s) Foto(s).`) : warn('Kein veröffentlichbares Foto – der öffentliche Build zeigt keine Bilder.'));
  if (concepts.length > 0) lines.push(ok(`${concepts.length} Konzeptmotiv(e) – nur in der privaten Vorschau, gekennzeichnet.`));
  if (blocked.length > 0) {
    const byReason = new Map<string, string[]>();
    for (const r of blocked) for (const reason of exclusionReasons(r)) byReason.set(MEDIA_REASON_TEXT[reason], [...(byReason.get(MEDIA_REASON_TEXT[reason]) ?? []), r.id]);
    lines.push(warn(`${blocked.length} gesperrt:`));
    for (const [reason, ids] of byReason) lines.push(warn(`   ${reason}: ${ids.length}× (${ids.join(', ')})`));
  }
  const missingAlt = LOCALE_CODES.map((lang) => ({ lang, ids: records.filter((r) => !r.alt?.[lang]?.trim()).map((r) => r.id) }));
  const gaps = missingAlt.filter((m) => m.ids.length > 0);
  if (gaps.length === 0) lines.push(ok(`Alternativtexte DE/EN/ES vorhanden bei allen ${records.length} Medien.`));
  else if (gaps.length === LOCALE_CODES.length && new Set(gaps.map((g) => g.ids.join())).size === 1) lines.push(warn(`Alternativtext fehlt in DE, EN und ES bei ${gaps[0]?.ids.length} Medium/Medien: ${gaps[0]?.ids.join(', ')}`));
  else for (const g of gaps) lines.push(warn(`Alternativtext ${g.lang.toUpperCase()} fehlt bei ${g.ids.length} Medium/Medien: ${g.ids.join(', ')}`));
  if (existingFiles) {
    const missingFiles = records.filter((r) => r.file && !existingFiles.has(r.file));
    if (missingFiles.length > 0) lines.push(err(`Bilddatei fehlt in src/assets/media: ${missingFiles.map((r) => `${r.id} → ${r.file}`).join('; ')}`));
  }
  return section('media', 'Medien', lines);
}

/* ---------- Gesamtbericht ---------- */

export interface ReportInput {
  today: string;
  /** Schema-Verstöße je Datei (bereits formatiert, siehe describeIssues). */
  schemaErrors: { file: string; lines: string[] }[];
  venue: Venue | null;
  menu: Menu | null;
  fixtureMenu: Menu | null;
  events: VenueEvent[] | null;
  media: MediaInternal[] | null;
  existingMediaFiles: ReadonlySet<string> | null;
}

export interface Report {
  sections: Section[];
  schemaErrors: ReportInput['schemaErrors'];
  /** Dinge, die den Build abbrechen. */
  hardBlockers: string[];
  /** Der Build läuft, aber öffentlich fehlt der Inhalt. */
  publicGaps: string[];
  /** Exit-Code-relevant. */
  failed: boolean;
}

export function buildReport(input: ReportInput): Report {
  const sections: Section[] = [];
  const hardBlockers: string[] = [];
  const publicGaps: string[] = [];

  for (const e of input.schemaErrors) hardBlockers.push(`${e.file}: ${e.lines.length} Schema-Verstoß/-Verstöße (siehe oben)`);

  if (input.venue) {
    sections.push(...reviewVenue(input.venue, input.today));
    const unbacked = unbackedConfirmations(input.venue);
    if (unbacked.length > 0) {
      const s = sections[0];
      s?.lines.push(err(`Als bestätigt geführt, aber ohne Quelle oder Datum: ${unbacked.join(', ')} (src/content/published/venue.json)`));
      if (s) s.status = 'error';
      hardBlockers.push(`venue.json: bestätigt ohne Quelle/Datum: ${unbacked.join(', ')}`);
    }
    const incomplete = incompleteConfirmations(input.venue);
    if (incomplete.length > 0) hardBlockers.push(`venue.json: als bestätigt geführt, aber unvollständig: ${incomplete.join(', ')}`);
    if (input.venue.address.status !== 'confirmed') hardBlockers.push('Besucheradresse ist nicht „confirmed“ – ohne sie kein Build.');
    if (!(input.venue.hours.status === 'confirmed' && input.venue.hours.regular)) publicGaps.push('Öffnungszeiten: öffentlich nur „noch nicht bestätigt“.');
    if (input.venue.entrance.status !== 'confirmed') publicGaps.push('Eingang: nicht bestätigt, wird öffentlich nicht gezeigt.');
    const sendPath = activeEndpoint(input.venue.inquiryEndpoint);
    if (!input.venue.channels.some((c) => c.status === 'confirmed' && c.acceptsInquiries) && !sendPath) publicGaps.push('Gruppenanfragen: kein betreuter Kanal, nur vorbereitete Nachricht ohne Versand.');
    if (!sendPath) publicGaps.push('Sendeweg für Anfragen: AUS (kein bestätigter Endpunkt in venue.json, inquiryEndpoint fehlt oder ist unbestätigt).');
    else if (!input.venue.inquiryEndpoint?.privacyNote) publicGaps.push('Sendeweg für Anfragen: AN, aber der Datenschutzhinweis des Betriebs (privacyNote) fehlt – öffentlich steht ein markierter Platzhalter.');
    const hiddenChannels = input.venue.channels.filter((c) => c.status !== 'confirmed').map((c) => c.type);
    if (hiddenChannels.length > 0) publicGaps.push(`Kontaktwege nicht bestätigt, daher nicht öffentlich: ${hiddenChannels.join(', ')}.`);
  }
  if (input.menu) {
    sections.push(reviewMenu(input.menu, input.fixtureMenu, input.today));
    if (!(input.menu.status === 'confirmed' && input.menu.items.length > 0)) publicGaps.push('Karte: keine bestätigte Karte, öffentlich steht „Die bestätigte Karte folgt.“');
    else if (input.menu.items.some((i) => i.prices.length === 0)) publicGaps.push('Karte: Drinks ohne Preis erscheinen ohne Preisangabe.');
  }
  if (input.events) {
    sections.push(reviewEvents(input.events, input.today));
    if (!input.events.some((e) => e.status === 'confirmed' && (e.hideAfter ?? e.date) >= input.today)) publicGaps.push('Termine: keiner bestätigt/kommend, das Modul entfällt.');
  }
  if (input.media) {
    const s = reviewMedia(input.media, input.existingMediaFiles);
    sections.push(s);
    if (s.lines.some((l) => l.level === 'error')) hardBlockers.push('Medien: Bilddatei(en) fehlen (siehe oben).');
    if (!input.media.some((r) => exclusionReasons(r).length === 0)) publicGaps.push('Fotos: kein freigegebenes Foto, öffentlich keine Bilder.');
  }
  publicGaps.push('Rechtstexte (Impressum, Datenschutz): liegen nicht im Repo, müssen vom Betrieb geliefert werden (docs/10_BETREIBER.md, Punkt 7).');

  return { sections, schemaErrors: input.schemaErrors, hardBlockers, publicGaps, failed: hardBlockers.length > 0 };
}

export function renderReport(report: Report, today: string): string {
  const out: string[] = [`CHUCCA · Inhalte-Prüfung vom ${today}`, ''];
  if (report.schemaErrors.length > 0) {
    out.push(`${ICON.error} Schema-Verstöße (müssen behoben werden)`);
    for (const e of report.schemaErrors) for (const line of e.lines) out.push(`   ${line}`);
    out.push('');
  }
  for (const s of report.sections) {
    out.push(`${ICON[s.status]} ${s.title}`);
    for (const l of s.lines) out.push(`   ${l.text.startsWith('   ') ? l.text.trimEnd() : `${ICON[l.level]} ${l.text}`}`);
    out.push('');
  }
  out.push('Was blockiert den öffentlichen Build?');
  if (report.hardBlockers.length === 0) out.push('   Nichts – der öffentliche Build läuft durch.');
  else for (const b of report.hardBlockers) out.push(`   ${ICON.error} ${b}`);
  out.push('', 'Was fehlt im öffentlichen Auftritt (Build läuft trotzdem)?');
  for (const g of report.publicGaps) out.push(`   ${ICON.warn} ${g}`);
  out.push('', report.failed ? `${ICON.error} Ergebnis: Fehler gefunden – bitte beheben (Exit-Code 1).` : `${ICON.ok} Ergebnis: keine Fehler. Warnungen (${ICON.warn}) sind Hinweise, keine Fehler.`);
  return out.join('\n');
}
