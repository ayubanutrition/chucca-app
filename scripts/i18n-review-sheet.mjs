// `npm run i18n:review` – erzeugt das Review-Blatt für Muttersprachler (Aufgabe 17, docs/15_TEXTREVIEW.md).
// Quellen: src/i18n/{de,en,es}.ts, Beispielkarte und -termine, Bildtexte, Eingangshinweis.
// Ausgabe: reports/i18n-review/ (gitignored, nie im Produktbuild): CSV zum Ausfüllen, HTML zum Lesen (offline, ohne Abhängigkeiten).
// Aufruf: npm run i18n:review [-- --out <Ordner>]
// Läuft über Vite (kommt mit Astro), damit die TypeScript-Quellen ohne zusätzliches Werkzeug gelesen werden können.
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const args = process.argv.slice(2);
const outFlag = args.indexOf('--out');
const outDir = resolve(outFlag >= 0 && args[outFlag + 1] ? args[outFlag + 1] : resolve(root, 'reports/i18n-review'));

const server = await createServer({ root, configFile: false, logLevel: 'error', appType: 'custom', server: { middlewareMode: true, hmr: false, watch: null }, optimizeDeps: { noDiscovery: true, include: [] } });
let code = 0;
try {
  const core = await server.ssrLoadModule(resolve(root, 'scripts/i18n-review-core.ts'));
  const rows = core.collectRows({ root });
  const generatedAt = new Date().toISOString().slice(0, 10);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, 'i18n-review.csv'), core.toCsv(rows));
  writeFileSync(resolve(outDir, 'i18n-review.html'), core.toHtml(rows, { generatedAt }));
  const fixtures = rows.filter((row) => row.kind !== 'ui').length;
  console.log(`Review-Blatt: ${rows.length} Texte (${rows.length - fixtures} Oberfläche, ${fixtures} Beispiel-/Konzept-/unbestätigte Angaben)`);
  console.log(`  ${resolve(outDir, 'i18n-review.csv')}`);
  console.log(`  ${resolve(outDir, 'i18n-review.html')}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  code = 2;
} finally {
  await server.close();
}
process.exit(code);
