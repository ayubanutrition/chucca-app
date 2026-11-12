/**
 * `npm run menu:import -- karte.csv [--out pfad.json]`
 * Wandelt eine ausgefüllte Getränkekarten-Tabelle (docs/templates/menu-vorlage.csv) in das Format
 * von src/content/published/menu.json um, prüft sie gegen das Schema und bricht bei Fehlern mit
 * Zeilen- und Spaltenangabe ab. Ohne --out geht das Ergebnis nach STDOUT; die echte menu.json
 * wird nie automatisch überschrieben.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { formatIssue, menuFromCsv } from '../src/lib/content/csv';

function usage(): string {
  return ['Aufruf: npm run menu:import -- <datei.csv> [--out <ziel.json>]', '', '  ohne --out: JSON auf dem Bildschirm (STDOUT), nichts wird überschrieben.', '  mit --out src/content/published/menu.json: Karte übernehmen (bestehende Datei wird ersetzt).'].join('\n');
}

export function main(args: string[]): number {
  let input: string | null = null;
  let out: string | null = null;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i] as string;
    if (arg === '--out') out = args[++i] ?? null;
    else if (arg.startsWith('--out=')) out = arg.slice(6);
    else if (arg === '--help' || arg === '-h') {
      console.log(usage());
      return 0;
    } else if (!input) input = arg;
    else {
      console.error(`Unerwartetes Argument: ${arg}\n\n${usage()}`);
      return 2;
    }
  }
  if (!input || (args.includes('--out') && !out)) {
    console.error(usage());
    return 2;
  }
  const path = resolve(process.cwd(), input);
  if (!existsSync(path)) {
    console.error(`Datei nicht gefunden: ${input}`);
    return 2;
  }
  const text = readFileSync(path, 'utf8');
  if (text.includes('�')) {
    console.error('Die Datei ist nicht UTF-8-kodiert (Umlaute sind kaputt). In Excel: „Speichern unter“ → „CSV UTF-8 (durch Trennzeichen getrennt)“.');
    return 1;
  }
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Madrid' }).format(new Date());
  const result = menuFromCsv(text, { today });
  for (const w of result.warnings) console.error(`Hinweis  ${formatIssue(w)}`);
  if (!result.menu) {
    for (const e of result.errors) console.error(`Fehler   ${formatIssue(e)}`);
    console.error(`\n${result.errors.length} Fehler – es wurde nichts geschrieben. Bitte die Tabelle korrigieren und erneut ausführen.`);
    return 1;
  }
  const json = `${JSON.stringify(result.menu, null, 2)}\n`;
  if (out) {
    const target = resolve(process.cwd(), out);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, json, 'utf8');
    console.error(`✔ ${result.menu.items.length} Drinks in ${result.menu.categories.length} Kategorien nach ${out} geschrieben (Stand ${result.menu.updatedAt}). Bitte Karte vom Betrieb gegenlesen lassen, dann: npm run content:check`);
  } else {
    process.stdout.write(json);
    console.error(`✔ ${result.menu.items.length} Drinks gelesen (nur Anzeige – mit --out <pfad> speichern).`);
  }
  return 0;
}
