/**
 * `npm run content:check` – prüft src/content/** gegen die Schemata und gibt eine
 * deutsche Zusammenfassung aus. Dateizugriff und Ausgabe hier, Auswertung in src/lib/content/report.ts.
 * Exit-Code 1 bei Schema-Verstößen, sonst 0 (Warnungen sind keine Fehler).
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { eventsSchema, mediaCatalogueSchema, menuSchema, venueSchema } from '../src/lib/content/schema';
import { buildReport, describeIssues, renderReport, type IssueLike, type ReportInput } from '../src/lib/content/report';

const root = resolve(import.meta.dirname, '..');

type Parsed<T> = { success: true; data: T } | { success: false; error: { issues: readonly IssueLike[] } };

function load<T>(file: string, parse: (raw: unknown) => Parsed<T>, errors: ReportInput['schemaErrors']): T | null {
  const full = resolve(root, file);
  if (!existsSync(full)) {
    errors.push({ file, lines: [`${file}: Datei fehlt.`] });
    return null;
  }
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(full, 'utf8'));
  } catch (error) {
    errors.push({ file, lines: [`${file}: keine gültige JSON-Datei (${(error as Error).message}). Häufig: fehlendes Komma oder Anführungszeichen.`] });
    return null;
  }
  const result = parse(raw);
  if (result.success) return result.data;
  errors.push({ file, lines: describeIssues(file, result.error.issues) });
  return null;
}

export function main(): number {
  const schemaErrors: ReportInput['schemaErrors'] = [];
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Madrid' }).format(new Date());
  const mediaDir = resolve(root, 'src/assets/media');
  const input: ReportInput = {
    today,
    schemaErrors,
    venue: load('src/content/published/venue.json', (r) => venueSchema.safeParse(r), schemaErrors),
    menu: load('src/content/published/menu.json', (r) => menuSchema.safeParse(r), schemaErrors),
    fixtureMenu: load('src/content/fixtures/menu.json', (r) => menuSchema.safeParse(r), schemaErrors),
    events: load('src/content/published/events.json', (r) => eventsSchema.safeParse(r), schemaErrors),
    media: load('src/content/media/catalogue.json', (r) => mediaCatalogueSchema.safeParse(r), schemaErrors),
    existingMediaFiles: existsSync(mediaDir) ? new Set(readdirSync(mediaDir)) : null,
  };
  const report = buildReport(input);
  console.log(renderReport(report, today));
  return report.failed ? 1 : 0;
}
