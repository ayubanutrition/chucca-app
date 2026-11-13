/**
 * Kern des Review-Blatts für Muttersprachler (`npm run i18n:review`, Aufgabe 17).
 * Reine Funktionen ohne Dateizugriff außer dem Lesen der Quellen in `collectRows`; Ausgabe schreibt `i18n-review-sheet.mjs`.
 * Das Blatt entsteht aus den Quellen und ist nie Teil des Produktbuilds (Ziel: `reports/`, gitignored).
 *
 * Wichtig: Die Längenhinweise sind Faustregeln, keine Layoutmessung. Sie sagen nur, wo man am Gerät genauer hinsehen sollte.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { LOCALES, dictionary, type Locale } from '../src/i18n';
import { fixtureEvents } from '../src/content/fixtures/events';

export type RowKind = 'ui' | 'fixture-menu' | 'fixture-event' | 'concept-media' | 'unconfirmed-venue';

export const KIND_LABELS: Record<RowKind, string> = {
  ui: 'Oberfläche',
  'fixture-menu': 'Beispielkarte (Fixture, nicht von CHUCCA)',
  'fixture-event': 'Beispieltermin (Fixture, nicht von CHUCCA)',
  'concept-media': 'Bildtext Konzeptmotiv (keine Aufnahme aus dem Lokal)',
  'unconfirmed-venue': 'Ortsangabe, unbestätigt',
};

export interface ReviewRow {
  key: string;
  /** Datei, in der die Texte stehen (für den Rückfluss von Korrekturen). */
  file: string;
  kind: RowKind;
  context: string;
  de: string;
  en: string;
  es: string;
  lengths: string;
  /** Längen- und Layouthinweise (Faustregeln). */
  hints: string[];
  /** Bereits bekannte Zweifelsfälle aus docs/10_TEXTPRUEFUNG.md. */
  known: string[];
}

type Tree = { [key: string]: Tree | string | string[] };

/** Gleiche Schlüsselbildung wie `tests/unit/i18n-sw.test.ts`: Punktpfade, Listen mit Index. */
export function flatten(tree: Tree, prefix = ''): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') out.set(path, value);
    else if (Array.isArray(value)) value.forEach((item, index) => out.set(`${path}.${index}`, item));
    else for (const [k, v] of flatten(value, path)) out.set(k, v);
  }
  return out;
}

/** Seite beziehungsweise Bereich, in dem ein Schlüssel erscheint. Längster passender Präfix gewinnt. */
const CONTEXTS: [prefix: string, label: string][] = [
  ['meta.titles', 'Seitentitel (Browser-Tab, Suchergebnis), alle Seiten'],
  ['meta.descriptions', 'Seitenbeschreibung (Suchergebnis, Link-Vorschau), alle Seiten'],
  ['meta', 'Seitenkopf, alle Seiten'],
  ['nav', 'Navigation und Tabbar, alle Seiten'],
  ['common', 'Allgemein, mehrere Seiten (Hinweise, Kopieren, Offline, Update)'],
  ['today.now', 'Heute · Kasten „Jetzt an der Playa de Palma“ (Uhrzeit, Sonne, Status)'],
  ['today.paths', 'Heute · drei Fragen'],
  ['today.events', 'Heute · Programm'],
  ['today.gallery', 'Heute · Galerie-Teaser'],
  ['today.closing', 'Heute · Schlussband'],
  ['today', 'Heute'],
  ['drinks.taste', 'Drinks · Geschmacksrichtung'],
  ['drinks.filter', 'Drinks · Suche und Filter'],
  ['drinks.item', 'Drinks · einzelner Drink'],
  ['drinks.fixture', 'Drinks · Kennzeichnung Beispielkarte'],
  ['drinks.pending', 'Drinks · Karte noch nicht bestätigt'],
  ['drinks', 'Drinks'],
  ['visit.way', 'Besuch · Der Weg hinein (Skizze)'],
  ['visit.hours', 'Besuch · Öffnungszeiten'],
  ['visit.contact', 'Besuch · Kontakt'],
  ['visit.inquiry', 'Besuch · Gruppenanfrage (vorbereitete Nachricht)'],
  ['visit.send', 'Besuch · Sendeweg der Anfrage (nur sichtbar, wenn der Betrieb einen Endpunkt bestätigt; derzeit unbenutzt)'],
  ['visit.install', 'Besuch · Hinweis „Zum Startbildschirm“'],
  ['visit', 'Besuch'],
  ['group.facts', 'Gruppe · drei Fakten'],
  ['group', 'Gruppe · Planer, Einladung, Kalender'],
  ['gallery', 'Galerie und Bildansicht'],
  ['footer', 'Fußzeile, alle Seiten'],
  ['notFound', 'Seite 404'],
  ['offlinePage', 'Offline-Seite (nur im Browser-Dialog, ohne Netz)'],
];

export function contextFor(key: string): string {
  let best = '';
  let label = 'Sonstiges';
  for (const [prefix, text] of CONTEXTS) {
    if ((key === prefix || key.startsWith(`${prefix}.`)) && prefix.length > best.length) {
      best = prefix;
      label = text;
    }
  }
  return label;
}

/** Längenschwellen (Zeichen). Faustregeln, in docs/15_TEXTREVIEW.md erklärt. */
export const LIMITS = { title: 60, description: 155, tab: 10, button: 28, long: 200, ratio: 1.5, ratioMin: 12, ratioMax: 80 } as const;
const BUTTON_KEY = /(?:^|\.)(share|calendar|copy|prepare|reset|reload|retry|button|cta|close|next|previous|route|googleMaps|appleMaps|copyAddress|drinksCta|visitCta|plannerCta|reserveLink|instagram)$/;
const TAB_KEY = /^nav\.(today|drinks|visit|group|gallery)$/;

export function lengthHints(key: string, text: Record<Locale, string>): string[] {
  const hints: string[] = [];
  const len = (locale: Locale): number => [...text[locale]].length;
  const longest = Math.max(...LOCALES.map(len));
  const tag = (limit: number): string => LOCALES.filter((l) => len(l) > limit).map((l) => l.toUpperCase()).join('/');
  if (key.startsWith('meta.titles.') && longest > LIMITS.title) hints.push(`Titel länger als ${LIMITS.title} Zeichen (${tag(LIMITS.title)}): Suchmaschinen kürzen.`);
  if (key.startsWith('meta.descriptions.') && longest > LIMITS.description) hints.push(`Beschreibung länger als ${LIMITS.description} Zeichen (${tag(LIMITS.description)}): Suchmaschinen kürzen.`);
  if (TAB_KEY.test(key) && longest > LIMITS.tab) hints.push(`Tabbar: fünf Einträge teilen sich die Breite; länger als ${LIMITS.tab} Zeichen (${tag(LIMITS.tab)}), Umbruch oder Abschneiden am Gerät prüfen.`);
  if (BUTTON_KEY.test(key) && !TAB_KEY.test(key) && longest > LIMITS.button) hints.push(`Knopf oder Link länger als ${LIMITS.button} Zeichen (${tag(LIMITS.button)}): Umbruch bei 390 px Breite prüfen.`);
  if (!key.startsWith('meta.') && longest > LIMITS.long) hints.push(`Langer Text (bis ${longest} Zeichen): Zeilenumbruch und Höhe prüfen.`);
  const de = len('de');
  if (de >= LIMITS.ratioMin && de <= LIMITS.ratioMax) {
    const wider = (['en', 'es'] as const).filter((l) => len(l) > de * LIMITS.ratio);
    for (const l of wider) hints.push(`${l.toUpperCase()} ist ${(len(l) / de).toFixed(1)}× so lang wie DE: Umbruch prüfen.`);
  }
  return hints;
}

/** Zuordnung offener Punkte aus docs/10_TEXTPRUEFUNG.md („Bitte vor Ort prüfen“) zu Schlüsseln. */
interface OpenPoint {
  n: number;
  text: string;
  keys?: RegExp;
  /** Prüft den Text einer Sprache (z. B. „a las“). */
  match?: (text: Record<Locale, string>) => boolean;
}
export const OPEN_POINTS: OpenPoint[] = [
  { n: 1, text: 'Adresse, Innenhof und „Balneario 7“ stammen aus Verzeichnissen und sind nicht vor Ort bestätigt.', keys: /^(visit\.way\.(unconfirmed|mapAlt|mapCaption|beach|courtyard)|today\.addressLine|venue\.entrance\.note)$/ },
  { n: 2, text: 'Spanische Uhrzeiten: „a las {time}“ ist bei 01:xx falsch („a la 1:00“).', match: (t) => /\ba las\b/i.test(t.es) },
  { n: 3, text: 'ES „Hora de cierre: {time}“ ist korrekt, aber nüchterner als „hasta las …“.', keys: /^today\.now\.open$/ },
  { n: 4, text: 'Anrede: Hero und Gruppenseite sprechen die Gruppe an (euch/vosotros), Formulare den Einzelnen (du/tú). Bitte bestätigen, ob gewünscht.', keys: /^(today\.(intro|titleB)|group\.(intro|zone|titleA|titleB))$/ },
  { n: 5, text: 'Artikel: ES „la Playa de Palma“ im Fließtext, in Aufzählungen und Titeln ohne Artikel.', keys: /^(meta\.titles\..+|common\.place|today\.eyebrow|footer\.tagline)$/ },
  { n: 8, text: '„Preis an der Bar erfragen“ setzt voraus, dass Preise dort genannt werden.', keys: /^drinks\.item\.priceMissing$/ },
  { n: 9, text: 'Fußzeilen-Aussagen („keine Cookies, kein Tracking“, „Alkohol nur für Erwachsene“) fachlich nicht geprüft.', keys: /^footer\.(privacy|drinkResponsibly)$/ },
  { n: 10, text: 'Mallorquinische Begriffe („Roba de llengües“, „Zungenstoffe“, „tela de lenguas“): Schreibung und Übersetzung mit lokalem Wissen prüfen.', match: (t) => /roba de lleng|zungenstoff|tela de lenguas/i.test(`${t.de} ${t.en} ${t.es}`) },
  { n: 11, text: 'EN „Today“ statt „Tonight“ bewusst für Konsistenz mit DE/ES.', keys: /^(nav\.today|meta\.titles\.today)$/ },
  { n: 12, text: 'Alternativtexte nicht mit echtem Screenreader gehört; Länge und Detailgrad prüfen.', keys: /(^|\.)(mapAlt|alt)$/ },
  { n: 13, text: 'Britisches Englisch („fancy“, „agree a time“, „flavour“) nicht von Muttersprachlern gegengelesen.', keys: /^(today\.intro|drinks\.taste\.(hint|hintNoMenu)|meta\.descriptions\.drinks)$/ },
  { n: 14, text: 'Ausnahmetage („An diesen Tagen anders“ / „Different on these days“ / „Estos días es distinto“): nach dem Lektorat entstanden, ungelesen.', keys: /^visit\.hours\.exceptionsTitle$/ },
];

/** Zeilen der Änderungstabelle in docs/10_TEXTPRUEFUNG.md: Sprache, Schlüssel, Grund. */
export function parseTextCheckChanges(markdown: string): { lang: string; key: string; reason: string }[] {
  const out: { lang: string; key: string; reason: string }[] = [];
  for (const line of markdown.split('\n')) {
    const cells = line.split(/(?<!\\)\|/).map((c) => c.trim());
    // | Sprache | `schlüssel` | vorher | nachher | Grund |  (führendes und abschließendes Leerfeld)
    if (cells.length < 7) continue;
    const [, lang, keyCell, , , reason] = cells;
    const key = /^`([^`]+)`$/.exec(keyCell ?? '')?.[1];
    if (!key || !lang || !reason || !/^(EN|ES|DE|Beispielkarte|Medien)$/.test(lang)) continue;
    out.push({ lang, key, reason });
  }
  return out;
}

/** Schlüssel der Textprüfung auf Blattschlüssel abbilden: Sprachsuffix und Listenindizes entfallen. */
const normalize = (key: string): string => key.replace(/\.(de|en|es)$/, '').replace(/\.\d+(?=\.|$)/g, '');

function dedupe<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function annotate(rows: ReviewRow[], changes: ReturnType<typeof parseTextCheckChanges>): void {
  const byKey = new Map<string, string[]>();
  for (const c of changes) {
    const k = normalize(c.key);
    const label = c.lang === 'Beispielkarte' || c.lang === 'Medien' ? 'KI-Änderung' : `KI-Änderung (${c.lang})`;
    byKey.set(k, [...(byKey.get(k) ?? []), `${label}: ${c.reason}`]);
  }
  for (const row of rows) {
    const known: string[] = [...(byKey.get(normalize(row.key)) ?? [])];
    for (const point of OPEN_POINTS) {
      const text: Record<Locale, string> = { de: row.de, en: row.en, es: row.es };
      if ((point.keys?.test(row.key) ?? false) || (point.match?.(text) ?? false)) known.push(`Offener Punkt ${point.n}: ${point.text}`);
    }
    row.known = dedupe(known);
  }
}

interface Trilingual {
  de: string;
  en: string;
  es: string;
}
const isTrilingual = (v: unknown): v is Trilingual =>
  typeof v === 'object' && v !== null && LOCALES.every((l) => typeof (v as Record<string, unknown>)[l] === 'string');

/** Alle dreisprachigen Blätter eines JSON-Baums mit Pfad. Listenelemente tragen ihren Index. */
function trilingualLeaves(node: unknown, path: string[]): { path: string[]; value: Trilingual }[] {
  if (isTrilingual(node)) return [{ path, value: node }];
  if (Array.isArray(node)) return node.flatMap((item, i) => trilingualLeaves(item, [...path, String(i)]));
  if (typeof node === 'object' && node !== null) {
    return Object.entries(node).flatMap(([k, v]) => trilingualLeaves(v, [...path, k]));
  }
  return [];
}

function makeRow(partial: Pick<ReviewRow, 'key' | 'file' | 'kind' | 'context'> & { text: Trilingual }): ReviewRow {
  const { text, ...rest } = partial;
  return {
    ...rest,
    de: text.de,
    en: text.en,
    es: text.es,
    lengths: LOCALES.map((l) => [...text[l]].length).join('/'),
    hints: lengthHints(partial.key, text),
    known: [],
  };
}

interface MenuFile {
  categories: { id: string }[];
  items: { id: string }[];
}
interface MediaEntry {
  id: string;
  kind: string;
  alt?: unknown;
  caption?: unknown;
}

export interface CollectOptions {
  /** Wurzel des Repos; Standard: aktuelles Verzeichnis. */
  root?: string;
}

/** Sammelt alle Texte: Oberfläche (de/en/es.ts) und, deutlich gekennzeichnet, Beispiel- und Ortsdaten. */
export function collectRows(options: CollectOptions = {}): ReviewRow[] {
  const root = options.root ?? process.cwd();
  const readJson = <T>(file: string): T => JSON.parse(readFileSync(resolve(root, file), 'utf8')) as T;
  const rows: ReviewRow[] = [];

  // 1. Oberfläche: Referenz ist Deutsch (definiert den Typ); fehlende Schlüssel anderer Sprachen werden leer gezeigt und fallen im Test auf.
  const flat = Object.fromEntries(LOCALES.map((l) => [l, flatten(dictionary(l) as unknown as Tree)])) as Record<Locale, Map<string, string>>;
  const keys = dedupe([...flat.de.keys(), ...flat.en.keys(), ...flat.es.keys()]);
  for (const key of keys) {
    const text = { de: flat.de.get(key) ?? '', en: flat.en.get(key) ?? '', es: flat.es.get(key) ?? '' };
    rows.push(makeRow({ key, file: 'src/i18n/de.ts, src/i18n/en.ts, src/i18n/es.ts', kind: 'ui', context: contextFor(key), text }));
  }

  // 2. Beispielkarte (nur Vorschau-Build; erscheint nie öffentlich).
  const menuFile = 'src/content/fixtures/menu.json';
  const menu = readJson<MenuFile>(menuFile);
  for (const category of menu.categories) {
    for (const leaf of trilingualLeaves(category, [])) {
      rows.push(makeRow({ key: `menu.category.${category.id}.${leaf.path.join('.')}`, file: menuFile, kind: 'fixture-menu', context: 'Drinks · Kategorie der Beispielkarte', text: leaf.value }));
    }
  }
  for (const item of menu.items) {
    for (const leaf of trilingualLeaves(item, [])) {
      rows.push(makeRow({ key: `menu.${item.id}.${leaf.path.join('.')}`, file: menuFile, kind: 'fixture-menu', context: `Drinks · Beispiel-Drink „${item.id}“`, text: leaf.value }));
    }
  }

  // 3. Beispieltermine (Texte sind vom Datum unabhängig).
  for (const event of fixtureEvents(new Date('2026-01-01T12:00:00Z'))) {
    for (const field of ['title', 'summary'] as const) {
      rows.push(makeRow({ key: `events.${event.id}.${field}`, file: 'src/content/fixtures/events.ts', kind: 'fixture-event', context: 'Heute · Programm (nur Vorschau)', text: event[field] }));
    }
  }

  // 4. Bildtexte: nur alt und caption (öffentliche Felder); Rechtebelege und Quellen bleiben draußen.
  const mediaFile = 'src/content/media/catalogue.json';
  for (const entry of readJson<MediaEntry[]>(mediaFile)) {
    for (const field of ['alt', 'caption'] as const) {
      const value = entry[field];
      if (!isTrilingual(value)) continue;
      const kind: RowKind = 'concept-media';
      rows.push(makeRow({ key: `media.${entry.id}.${field}`, file: mediaFile, kind, context: field === 'alt' ? 'Galerie · Alternativtext (Screenreader)' : 'Galerie · Bildunterschrift', text: value }));
    }
  }

  // 5. Ortsangabe zum Eingang (Quellenangabe in venue.json, Status unbestätigt).
  const venueFile = 'src/content/published/venue.json';
  const venue = readJson<{ entrance?: { note?: unknown } }>(venueFile);
  if (isTrilingual(venue.entrance?.note)) {
    rows.push(makeRow({ key: 'venue.entrance.note', file: venueFile, kind: 'unconfirmed-venue', context: 'Besuch · Eingangshinweis (aus Verzeichnissen, nicht bestätigt)', text: venue.entrance.note }));
  }

  annotate(rows, parseTextCheckChanges(readFileSync(resolve(root, 'docs/10_TEXTPRUEFUNG.md'), 'utf8')));
  return rows;
}

// ---------- Ausgabe ----------

export const CSV_COLUMNS = [
  'Schlüssel',
  'Kontext/Seite',
  'DE',
  'EN',
  'ES',
  'Freigabe (ja/nein)',
  'Korrekturvorschlag',
  'Kommentar',
  'Sprache der Rückmeldung (DE/EN/ES)',
  'Art',
  'Datei',
  'Zeichen DE/EN/ES',
  'Längenhinweis',
  'Bekannter Zweifel',
] as const;

const csvCell = (value: string): string => (/[;"\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

/** CSV für Excel und Google Tabellen: Semikolon, UTF-8 mit BOM, CRLF (wie `docs/templates/menu-vorlage.csv`). */
export function toCsv(rows: ReviewRow[]): string {
  const lines = [CSV_COLUMNS.map(csvCell).join(';')];
  for (const r of rows) {
    lines.push(
      [r.key, r.context, r.de, r.en, r.es, '', '', '', '', KIND_LABELS[r.kind], r.file, r.lengths, r.hints.join(' '), r.known.join(' | ')].map(csvCell).join(';'),
    );
  }
  return `﻿${lines.join('\r\n')}\r\n`;
}

export const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** Eigenständige HTML-Seite zum Lesen im Browser: kein Netz, keine Schrift- oder Skriptquelle von außen. */
export function toHtml(rows: ReviewRow[], meta: { generatedAt: string }): string {
  const fixtureCount = rows.filter((r) => r.kind !== 'ui').length;
  const flagged = rows.filter((r) => r.hints.length > 0).length;
  const known = rows.filter((r) => r.known.length > 0).length;
  const body = rows
    .map((r) => {
      const fixture = r.kind !== 'ui';
      const note = [
        fixture ? `<p class="tag">${escapeHtml(KIND_LABELS[r.kind])}</p>` : '',
        ...r.hints.map((h) => `<p class="hint">${escapeHtml(h)}</p>`),
        ...r.known.map((k) => `<p class="known">${escapeHtml(k)}</p>`),
      ].join('');
      return `<tr id="${escapeHtml(r.key)}" data-kind="${r.kind}" data-hint="${r.hints.length > 0}" data-known="${r.known.length > 0}">
<th scope="row"><code>${escapeHtml(r.key)}</code><span class="ctx">${escapeHtml(r.context)}</span><span class="file">${escapeHtml(r.file)}</span></th>
<td lang="de">${escapeHtml(r.de)}</td><td lang="en">${escapeHtml(r.en)}</td><td lang="es">${escapeHtml(r.es)}</td>
<td class="len">${escapeHtml(r.lengths)}</td><td class="note">${note}</td></tr>`;
    })
    .join('\n');
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>CHUCCA Textreview DE/EN/ES</title>
<style>
:root{--bg:#fbf7f0;--ink:#2a1a22;--mute:#6b5560;--line:#d9cdbd;--accent:#a8420f;--warn:#7a4a00;--warnbg:#fff1d6;--knownbg:#efe6f5;--tagbg:#e3ecf5}
@media (prefers-color-scheme:dark){:root{--bg:#1b0f17;--ink:#f3e8d8;--mute:#bfa9b0;--line:#4a3640;--accent:#ff9a5c;--warn:#ffd9a0;--warnbg:#3f2b10;--knownbg:#33263d;--tagbg:#22313f}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 system-ui,sans-serif;padding:1rem 1rem 4rem}
h1{font-size:1.4rem;margin:.2rem 0 .6rem}
.intro{max-width:70ch;color:var(--mute)}
.intro strong{color:var(--ink)}
.bar{position:sticky;top:0;background:var(--bg);padding:.6rem 0;border-bottom:1px solid var(--line);display:flex;flex-wrap:wrap;gap:.6rem 1rem;align-items:center;z-index:2}
.bar input[type=search]{font:inherit;padding:.4rem .6rem;border:1px solid var(--line);border-radius:.4rem;background:transparent;color:inherit;min-width:14rem}
.bar label{display:inline-flex;gap:.35rem;align-items:center}
table{border-collapse:collapse;width:100%;margin-top:1rem}
th,td{border-bottom:1px solid var(--line);padding:.55rem .6rem;vertical-align:top;text-align:left}
thead th{position:sticky;top:3.4rem;background:var(--bg);font-size:.8rem;text-transform:uppercase;letter-spacing:.04em;color:var(--mute);z-index:1}
tbody th{font-weight:400;min-width:13rem;max-width:18rem}
code{font-size:.85rem;color:var(--accent);word-break:break-all}
.ctx,.file{display:block;font-size:.78rem;color:var(--mute)}
.len{white-space:nowrap;font-variant-numeric:tabular-nums;color:var(--mute);font-size:.85rem}
.note p{margin:0 0 .3rem;font-size:.82rem;padding:.2rem .4rem;border-radius:.3rem}
.hint{background:var(--warnbg);color:var(--warn)}
.known{background:var(--knownbg)}
.tag{background:var(--tagbg)}
tr[hidden]{display:none}
@media (max-width:900px){thead{display:none}tr{display:block;border-bottom:2px solid var(--line);padding:.4rem 0}th,td{display:block;border:0;padding:.2rem 0;max-width:none}td[lang]::before{content:attr(lang);display:inline-block;width:2rem;text-transform:uppercase;font-size:.75rem;color:var(--mute)}}
@media print{.bar{display:none}thead th{position:static}tr{break-inside:avoid}}
</style>
</head>
<body>
<h1>CHUCCA Playa de Palma · Textreview DE / EN / ES</h1>
<p class="intro">Erzeugt am ${escapeHtml(meta.generatedAt)} aus den Quelldateien (<code>npm run i18n:review</code>). ${rows.length} Texte, davon ${fixtureCount} Beispiel-, Konzept- oder unbestätigte Angaben (gekennzeichnet; sie erscheinen nur in der Vorschau oder gar nicht öffentlich), ${flagged} mit Längenhinweis, ${known} mit bekanntem Zweifel. <strong>Dies ist eine Lesefassung.</strong> Rückmeldungen bitte in die CSV-Datei eintragen (Anleitung: <code>docs/15_TEXTREVIEW.md</code>). Die Längenhinweise sind Faustregeln, keine Layoutmessung; ob ein Text passt, zeigt erst das Gerät. Platzhalter wie <code>{time}</code> bitte unverändert lassen.</p>
<div class="bar">
<input type="search" id="q" placeholder="Schlüssel oder Text suchen" aria-label="Schlüssel oder Text suchen">
<label><input type="checkbox" id="onlyHints"> nur mit Längenhinweis</label>
<label><input type="checkbox" id="onlyKnown"> nur bekannte Zweifel</label>
<label><input type="checkbox" id="noFixture"> Beispieldaten ausblenden</label>
<span id="count" role="status"></span>
</div>
<table>
<thead><tr><th scope="col">Schlüssel</th><th scope="col">Deutsch</th><th scope="col">English</th><th scope="col">Español</th><th scope="col">Zeichen DE/EN/ES</th><th scope="col">Hinweise</th></tr></thead>
<tbody>
${body}
</tbody>
</table>
<script>
(function(){
var rows=[].slice.call(document.querySelectorAll('tbody tr'));
var q=document.getElementById('q'),h=document.getElementById('onlyHints'),k=document.getElementById('onlyKnown'),f=document.getElementById('noFixture'),c=document.getElementById('count');
function run(){
var s=q.value.trim().toLowerCase(),n=0;
rows.forEach(function(r){
var ok=(!s||r.textContent.toLowerCase().indexOf(s)>-1)&&(!h.checked||r.dataset.hint==='true')&&(!k.checked||r.dataset.known==='true')&&(!f.checked||r.dataset.kind==='ui');
r.hidden=!ok;if(ok)n++;
});
c.textContent=n+' von '+rows.length+' Zeilen';
}
[q,h,k,f].forEach(function(e){e.addEventListener('input',run);});run();
})();
</script>
</body>
</html>
`;
}
