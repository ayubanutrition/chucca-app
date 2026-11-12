import { defineConfig } from '@playwright/test';
import { ORIGIN, PORT } from './tests/e2e/ports';

/**
 * Update-Pfad des Service Workers: zwei Build-Stände (dist-update/, scripts/build-update.mjs) werden nacheinander
 * vom selben Ursprung ausgeliefert. Der Server hält den aktuellen Stand im Speicher, darum läuft alles seriell.
 */
const serve = (mode: 'preview' | 'public', port: number, origin: string) => ({
  command: `node scripts/serve-update.mjs dist-update/${mode}-v1 dist-update/${mode}-v2 ${port}`,
  url: `${origin}/de/`,
  env: { CHUCCA_ALLOW_SWITCH: '1' },
  reuseExistingServer: false,
});

export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: 'sw-update.spec.ts',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  reporter: [['list']],
  use: { locale: 'de-DE', timezoneId: 'Europe/London', serviceWorkers: 'allow' },
  webServer: [serve('preview', PORT.updatePreview, ORIGIN.updatePreview), serve('public', PORT.updatePublic, ORIGIN.updatePublic)],
});
