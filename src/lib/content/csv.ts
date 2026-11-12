/**
 * Getränkekarte aus einer Tabelle (CSV, z. B. Excel-Export) in das Format von
 * src/content/published/menu.json umwandeln. Reine Funktionen ohne Dateizugriff;
 * das Skript scripts/menu-from-csv.ts liest und schreibt die Dateien.
 *
 * Spalten (Reihenfolge egal, Überschriften ohne Rücksicht auf Groß-/Kleinschreibung):
 *   Kategorie | Name DE | Name EN | Name ES | Zutaten | Größe | Preis € | alkoholfrei | Allergene | verfügbar
 * Optional zusätzlich: Zutaten EN | Zutaten ES (Übersetzungen; Pflicht, sobald Zutaten angegeben sind) | Geschmack.
 */
import { menuSchema, TASTES, type Localized, type Menu } from './schema';

export interface CsvIssue {
  /** Zeilennummer in der Datei (Überschrift = Zeile 1); 0 = Datei als Ganzes. */
  line: number;
  column: string | null;
  message: string;
}

export interface CsvRecord {
  line: number;
  cells: string[];
}

/** Kategorien, die die Karte kennt. Weitere ergänzt der Entwickler hier. */
export const DEFAULT_CATEGORIES: { id: string; name: Localized; aliases?: string[] }[] = [
  { id: 'classics', name: { de: 'Klassiker', en: 'Classics', es: 'Clásicos' } },
  { id: 'spritz', name: { de: 'Spritz & Longdrinks', en: 'Spritz & long drinks', es: 'Spritz y combinados' }, aliases: ['spritz und longdrinks', 'longdrinks'] },
  { id: 'signature', name: { de: 'Signature Drinks', en: 'Signature drinks', es: 'Cócteles de autor' }, aliases: ['signature'] },
  { id: 'free', name: { de: 'Alkoholfrei', en: 'Alcohol-free', es: 'Sin alcohol' }, aliases: ['alkoholfrei'] },
];

/* ---------- CSV lesen ---------- */

export const stripBom = (text: string): string => (text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);

/** Trennzeichen aus der Überschriftenzeile erkennen (außerhalb von Anführungszeichen): ; , oder Tab. */
export function detectDelimiter(text: string): ';' | ',' | '\t' {
  const first = stripBom(text).split(/\r?\n/, 1)[0] ?? '';
  const counts = { ';': 0, ',': 0, '\t': 0 };
  let quoted = false;
  for (const ch of first) {
    if (ch === '"') quoted = !quoted;
    else if (!quoted && ch in counts) counts[ch as keyof typeof counts]++;
  }
  if (counts[';'] >= counts[','] && counts[';'] >= counts['\t'] && counts[';'] > 0) return ';';
  if (counts['\t'] > counts[',']) return '\t';
  return ',';
}

/** RFC-4180-Parser: Anführungszeichen, doppelte Anführungszeichen als Escape, Zeilenumbrüche in Feldern. */
export function parseCsv(input: string, delimiter: string = detectDelimiter(input)): CsvRecord[] {
  const text = stripBom(input);
  const records: CsvRecord[] = [];
  let cells: string[] = [];
  let cell = '';
  let quoted = false;
  let line = 1;
  let startLine = 1;
  const endCell = () => {
    cells.push(cell);
    cell = '';
  };
  const endRecord = () => {
    endCell();
    records.push({ line: startLine, cells });
    cells = [];
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i] as string;
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else {
        if (ch === '\n') line++;
        cell += ch;
      }
      continue;
    }
    if (ch === '"' && cell === '') quoted = true;
    else if (ch === delimiter) endCell();
    else if (ch === '\r') continue;
    else if (ch === '\n') {
      endRecord();
      line++;
      startLine = line;
    } else cell += ch;
  }
  if (cell !== '' || cells.length > 0) endRecord();
  return records;
}

/* ---------- Werte lesen ---------- */

const fold = (s: string): string =>
  s
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '');

/** Kennung aus einem Namen: „Gin & Tonic“ → „gin-tonic“, „Piña Colada“ → „pina-colada“. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** „9,50“, „9.50“, „9,5 €“, „€ 12“ → Cent. Leer → null. Unlesbar → Fehlertext. */
export function parsePriceCents(raw: string): { cents: number | null } | { error: string } {
  const cleaned = raw.replace(/€|eur(o)?/gi, '').replace(/\s+/g, '');
  if (cleaned === '') return { cents: null };
  if (!/^\d+([.,]\d{1,2})?$/.test(cleaned)) return { error: `„${raw.trim()}“ ist kein Preis. Erlaubt: 9,50 oder 9.50 (ohne Tausenderpunkt).` };
  const cents = Math.round(Number(cleaned.replace(',', '.')) * 100);
  if (cents <= 0) return { error: `Preis „${raw.trim()}“ muss größer als 0 sein. Unbekannten Preis bitte leer lassen.` };
  return { cents };
}

const YES = new Set(['ja', 'j', 'yes', 'y', 'si', 'sí', 'true', 'wahr', 'x', '1']);
const NO = new Set(['nein', 'n', 'no', 'false', 'falsch', '0']);
export function parseYesNo(raw: string): boolean | null {
  const v = raw.trim().toLowerCase();
  if (YES.has(v)) return true;
  if (NO.has(v)) return false;
  return null;
}

const TASTE_WORDS: Record<string, (typeof TASTES)[number]> = { fresh: 'fresh', frisch: 'fresh', fruity: 'fruity', fruchtig: 'fruity', classic: 'classic', klassisch: 'classic', free: 'free', alkoholfrei: 'free' };

/* ---------- Spalten ---------- */

const COLUMNS = {
  category: { label: 'Kategorie', match: (h: string) => h === 'kategorie' || h === 'category', required: true },
  nameDe: { label: 'Name DE', match: (h: string) => h === 'namede', required: true },
  nameEn: { label: 'Name EN', match: (h: string) => h === 'nameen', required: true },
  nameEs: { label: 'Name ES', match: (h: string) => h === 'namees', required: true },
  ingredients: { label: 'Zutaten', match: (h: string) => h === 'zutaten' || h === 'zutatende', required: true },
  ingredientsEn: { label: 'Zutaten EN', match: (h: string) => h === 'zutatenen', required: false },
  ingredientsEs: { label: 'Zutaten ES', match: (h: string) => h === 'zutatenes', required: false },
  size: { label: 'Größe', match: (h: string) => h.startsWith('grosse') || h === 'size', required: true },
  price: { label: 'Preis €', match: (h: string) => h.startsWith('preis') || h === 'price', required: true },
  alcoholFree: { label: 'alkoholfrei', match: (h: string) => h.startsWith('alkoholfrei'), required: true },
  allergens: { label: 'Allergene', match: (h: string) => h.startsWith('allergen'), required: false },
  available: { label: 'verfügbar', match: (h: string) => h.startsWith('verfugbar') || h === 'available', required: true },
  taste: { label: 'Geschmack', match: (h: string) => h.startsWith('geschmack'), required: false },
} as const;
type ColumnKey = keyof typeof COLUMNS;

function mapHeader(cells: string[], issues: CsvIssue[]): Partial<Record<ColumnKey, number>> {
  const map: Partial<Record<ColumnKey, number>> = {};
  cells.forEach((cell, index) => {
    const h = fold(cell);
    if (!h) return;
    const key = (Object.keys(COLUMNS) as ColumnKey[]).find((k) => COLUMNS[k].match(h));
    if (!key) issues.push({ line: 1, column: cell.trim(), message: `Unbekannte Spalte „${cell.trim()}“ – wird ignoriert.` });
    else if (map[key] !== undefined) issues.push({ line: 1, column: cell.trim(), message: `Spalte „${COLUMNS[key].label}“ kommt doppelt vor.` });
    else map[key] = index;
  });
  return map;
}

/* ---------- Umwandlung ---------- */

export interface ConvertOptions {
  /** Datum der Karte (JJJJ-MM-TT), wird als updatedAt gesetzt. */
  today: string;
  categories?: typeof DEFAULT_CATEGORIES;
}

export interface ConvertResult {
  menu: Menu | null;
  /** Fehler: Es wird nichts geschrieben. */
  errors: CsvIssue[];
  /** Hinweise: Die Umwandlung ist trotzdem möglich. */
  warnings: CsvIssue[];
}

const splitList = (raw: string): string[] =>
  raw
    .split(/[,|]/)
    .map((s) => s.trim())
    .filter(Boolean);

interface Draft {
  line: number;
  category: string;
  name: Localized;
  ingredients: { de: string[]; en: string[]; es: string[] };
  prices: { amountCents: number; currency: 'EUR'; size?: string }[];
  alcoholFree: boolean;
  tastes: string[];
  available: boolean;
}

export function menuFromCsv(text: string, options: ConvertOptions): ConvertResult {
  const errors: CsvIssue[] = [];
  const warnings: CsvIssue[] = [];
  const categories = options.categories ?? DEFAULT_CATEGORIES;
  const records = parseCsv(text);
  const [header, ...rows] = records;
  if (!header) return { menu: null, errors: [{ line: 0, column: null, message: 'Die Datei ist leer.' }], warnings };

  const cols = mapHeader(header.cells, warnings);
  for (const key of Object.keys(COLUMNS) as ColumnKey[]) {
    if (COLUMNS[key].required && cols[key] === undefined) errors.push({ line: 1, column: COLUMNS[key].label, message: `Spalte „${COLUMNS[key].label}“ fehlt in der Überschriftenzeile.` });
  }
  if (errors.length > 0) return { menu: null, errors, warnings };

  const cell = (row: CsvRecord, key: ColumnKey): string => (cols[key] === undefined ? '' : (row.cells[cols[key]] ?? '').trim());
  const drafts = new Map<string, Draft>();
  const ids = new Map<string, string>();
  const sizesSeen = new Set<string>();
  let allergenWarned = false;

  for (const row of rows) {
    if (row.cells.every((c) => c.trim() === '')) continue;
    if ((row.cells[0] ?? '').trim().startsWith('#')) continue;
    const at = (key: ColumnKey, message: string) => errors.push({ line: row.line, column: COLUMNS[key].label, message });

    const nameDe = cell(row, 'nameDe');
    if (/beispiel/i.test(nameDe) || /beispiel/i.test(cell(row, 'category'))) {
      at('nameDe', `Zeile enthält „BEISPIEL“ – Beispielzeilen bitte löschen oder durch echte Drinks ersetzen.`);
      continue;
    }

    // Kategorie
    const rawCategory = cell(row, 'category');
    const wanted = fold(rawCategory);
    const category = categories.find((c) => c.id === rawCategory.toLowerCase() || fold(c.name.de) === wanted || fold(c.name.en) === wanted || fold(c.name.es) === wanted || c.aliases?.some((a) => fold(a) === wanted));
    if (!rawCategory) at('category', 'Kategorie fehlt.');
    else if (!category) at('category', `Unbekannte Kategorie „${rawCategory}“. Erlaubt: ${categories.map((c) => c.name.de).join(', ')}.`);

    // Namen
    const name = { de: nameDe, en: cell(row, 'nameEn'), es: cell(row, 'nameEs') };
    if (!name.de) at('nameDe', 'Name DE fehlt.');
    // Weitere Größe eines bekannten Drinks: Übersetzungen dürfen leer bleiben.
    const continuation = Boolean(category && name.de && drafts.has(`${category.id}|${name.de}`));
    if (!name.en && !continuation) at('nameEn', `Übersetzung fehlt: Name EN${name.de ? ` für „${name.de}“` : ''}. Bei gleichen Namen (z. B. Mojito) den Namen in jede Sprache eintragen.`);
    if (!name.es && !continuation) at('nameEs', `Übersetzung fehlt: Name ES${name.de ? ` für „${name.de}“` : ''}.`);

    // Preis, Größe
    const priceResult = parsePriceCents(cell(row, 'price'));
    if ('error' in priceResult) at('price', priceResult.error);
    const size = cell(row, 'size');
    if (size && !('cents' in priceResult && priceResult.cents !== null)) warnings.push({ line: row.line, column: COLUMNS.size.label, message: `Größe „${size}“ ohne Preis – wird nicht übernommen.` });

    // Ja/Nein
    const free = parseYesNo(cell(row, 'alcoholFree'));
    if (free === null) at('alcoholFree', `„${cell(row, 'alcoholFree')}“ ist unklar – bitte „ja“ oder „nein“ eintragen.`);
    const availableRaw = cell(row, 'available');
    const available = availableRaw === '' ? true : parseYesNo(availableRaw);
    if (available === null) at('available', `„${availableRaw}“ ist unklar – bitte „ja“ oder „nein“ eintragen (leer = ja).`);

    // Zutaten
    const ingredients = { de: splitList(cell(row, 'ingredients')), en: splitList(cell(row, 'ingredientsEn')), es: splitList(cell(row, 'ingredientsEs')) };
    if (ingredients.de.length > 0) {
      for (const lang of ['en', 'es'] as const) {
        const col: ColumnKey = lang === 'en' ? 'ingredientsEn' : 'ingredientsEs';
        if (cols[col] === undefined) {
          at('ingredients', `Zutaten sind angegeben, aber die Spalte „${COLUMNS[col].label}“ fehlt (Übersetzung).`);
          break;
        }
        if (ingredients[lang].length === 0) at(col, `Übersetzung fehlt: ${COLUMNS[col].label} für „${name.de}“.`);
        else if (ingredients[lang].length !== ingredients.de.length) at(col, `${COLUMNS[col].label} hat ${ingredients[lang].length} Zutaten, Zutaten (DE) hat ${ingredients.de.length} – gleiche Anzahl und Reihenfolge nötig.`);
      }
    }

    // Geschmack
    const tastes: string[] = [];
    for (const word of splitList(cell(row, 'taste'))) {
      const t = TASTE_WORDS[fold(word)];
      if (t) tastes.push(t);
      else at('taste', `Unbekannter Geschmack „${word}“. Erlaubt: frisch, fruchtig, klassisch.`);
    }
    if (free) tastes.push('free');

    if (cell(row, 'allergens') && !allergenWarned) {
      allergenWarned = true;
      warnings.push({ line: row.line, column: COLUMNS.allergens.label, message: 'Allergene werden gelesen, aber noch nicht in die Karte übernommen (kein Feld in menu.json). Angaben bleiben in der Tabelle.' });
    }

    if (!category || !name.de || free === null || available === null) continue;

    const id = slugify(name.de);
    if (!id) {
      at('nameDe', `Aus „${name.de}“ lässt sich keine Kennung bilden (bitte Buchstaben oder Ziffern verwenden).`);
      continue;
    }
    const known = ids.get(id);
    if (known && known !== `${category.id}|${name.de}`) {
      const first = drafts.get(known);
      at('nameDe', `Doppelte ID „${id}“: „${name.de}“ gibt es schon in Zeile ${first?.line ?? '?'} (andere Kategorie oder ähnlicher Name). Namen eindeutig machen.`);
      continue;
    }
    const key = `${category.id}|${name.de}`;
    ids.set(id, key);
    let draft = drafts.get(key);
    if (!draft) {
      draft = { line: row.line, category: category.id, name, ingredients, prices: [], alcoholFree: free, tastes, available };
      drafts.set(key, draft);
    } else {
      // Weitere Größe desselben Drinks: übrige Felder müssen leer oder gleich sein.
      const sameOrEmpty = (a: string, b: string) => !b || a === b;
      if (!sameOrEmpty(draft.name.en, name.en) || !sameOrEmpty(draft.name.es, name.es)) at('nameEn', `Zeile weicht in den Namen von Zeile ${draft.line} ab (gleicher Drink, mehrere Größen). Namen müssen gleich sein.`);
      if (draft.alcoholFree !== free) at('alcoholFree', `„alkoholfrei“ weicht von Zeile ${draft.line} ab (gleicher Drink).`);
      if (draft.available !== available) at('available', `„verfügbar“ weicht von Zeile ${draft.line} ab (gleicher Drink).`);
      if (ingredients.de.length > 0 && ingredients.de.join('|') !== draft.ingredients.de.join('|')) at('ingredients', `Zutaten weichen von Zeile ${draft.line} ab. Zutaten nur in der ersten Zeile des Drinks eintragen.`);
    }
    if ('cents' in priceResult && priceResult.cents !== null) {
      const sizeKey = `${key}|${size.toLowerCase()}`;
      if (sizesSeen.has(sizeKey)) at('size', `Doppelter Eintrag: „${name.de}“ mit Größe „${size || '(ohne Größe)'}“ steht schon in der Tabelle.`);
      sizesSeen.add(sizeKey);
      draft.prices.push(size ? { amountCents: priceResult.cents, currency: 'EUR', size } : { amountCents: priceResult.cents, currency: 'EUR' });
    }
  }

  if (drafts.size === 0 && errors.length === 0) errors.push({ line: 0, column: null, message: 'Keine Drinks in der Tabelle gefunden.' });
  if (errors.length > 0) return { menu: null, errors, warnings };

  const list = [...drafts.values()];
  const used = new Set(list.map((d) => d.category));
  const candidate = {
    kind: 'published',
    status: 'confirmed',
    updatedAt: options.today,
    categories: categories.filter((c) => used.has(c.id)).map((c) => ({ id: c.id, name: c.name })),
    items: list.map((d) => ({
      id: slugify(d.name.de),
      category: d.category,
      name: d.name,
      ingredients: d.ingredients.de.map((de, i) => ({ de, en: d.ingredients.en[i] ?? '', es: d.ingredients.es[i] ?? '' })),
      prices: d.prices,
      alcoholFree: d.alcoholFree,
      tastes: [...new Set(d.tastes)],
      available: d.available,
    })),
  };
  const parsed = menuSchema.safeParse(candidate);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const index = issue.path[0] === 'items' && typeof issue.path[1] === 'number' ? issue.path[1] : null;
      const draft = index === null ? undefined : list[index];
      errors.push({ line: draft?.line ?? 0, column: null, message: `${draft ? `Drink „${draft.name.de}“: ` : ''}${issue.message} (${issue.path.join('.') || 'Karte'})` });
    }
    return { menu: null, errors, warnings };
  }
  for (const d of list) {
    if (d.prices.length === 0) warnings.push({ line: d.line, column: COLUMNS.price.label, message: `„${d.name.de}“ hat keinen Preis – erscheint ohne Preisangabe.` });
    if (d.ingredients.de.length === 0) warnings.push({ line: d.line, column: COLUMNS.ingredients.label, message: `„${d.name.de}“ hat keine Zutaten.` });
  }
  return { menu: parsed.data, errors, warnings };
}

export function formatIssue(issue: CsvIssue): string {
  const where = issue.line > 0 ? `Zeile ${issue.line}${issue.column ? `, Spalte „${issue.column}“` : ''}` : 'Datei';
  return `${where}: ${issue.message}`;
}
