// QR-Aufsteller: node scripts/qr-link.mjs <Basis-URL> <de|en|es> [Kurz-URL] [--out datei.svg]
// Gibt den Deep-Link auf die Drinks-Seite aus und schreibt ein druckbares QR als SVG.
// Ohne Kurz-URL kodiert der Code den Deep-Link, sonst die Kurz-URL (die dorthin weiterleiten muss).
// Erst nach der Hostentscheidung (Plan 13) verwenden; siehe docs/10_BETREIBER.md.
import { createServer } from 'vite';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const outIndex = args.indexOf('--out');
let out = null;
if (outIndex !== -1) {
  out = args[outIndex + 1] ?? null;
  args.splice(outIndex, 2);
}
const [baseUrl, locale, shortUrl] = args;
if (!baseUrl || !locale || args.length > 3 || (outIndex !== -1 && !out)) {
  console.error('Aufruf: node scripts/qr-link.mjs <Basis-URL> <de|en|es> [Kurz-URL] [--out datei.svg]');
  process.exit(2);
}
const server = await createServer({ configFile: false, logLevel: 'error', appType: 'custom', server: { middlewareMode: true, hmr: false, watch: null }, optimizeDeps: { noDiscovery: true, include: [] } });
let code = 0;
try {
  const { buildQrLink, QrLinkError } = await server.ssrLoadModule(resolve(import.meta.dirname, 'qr-link-core.ts'));
  try {
    const { deepLink, encoded, svg } = buildQrLink(baseUrl, locale, shortUrl);
    const file = resolve(out ?? `qr-drinks-${locale}.svg`);
    writeFileSync(file, svg);
    console.log(`Deep-Link: ${deepLink}`);
    console.log(`Kodiert:   ${encoded}`);
    console.log(`SVG:       ${file}`);
  } catch (error) {
    if (!(error instanceof QrLinkError)) throw error;
    console.error(`Fehler: ${error.message}`);
    code = 1;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  code = 2;
} finally {
  await server.close();
}
process.exit(code);
