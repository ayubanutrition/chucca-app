// Führt ein TypeScript-Skript aus (z. B. node scripts/run-ts.mjs scripts/content-check.ts [Argumente]).
// Nutzt Vite (kommt mit Astro/Vitest), damit Importe ohne Dateiendung wie im Projekt funktionieren.
// Das Skript exportiert `main(args)` und gibt den Exit-Code zurück.
import { createServer } from 'vite';
import { resolve } from 'node:path';

const [target, ...args] = process.argv.slice(2);
if (!target) {
  console.error('Aufruf: node scripts/run-ts.mjs <skript.ts> [Argumente]');
  process.exit(2);
}
const server = await createServer({ configFile: false, logLevel: 'error', appType: 'custom', server: { middlewareMode: true, hmr: false, watch: null }, optimizeDeps: { noDiscovery: true, include: [] } });
let code = 0;
try {
  const mod = await server.ssrLoadModule(resolve(target));
  if (typeof mod.main === 'function') code = (await mod.main(args)) ?? 0;
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  code = 2;
} finally {
  await server.close();
}
process.exit(code);
