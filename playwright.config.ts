import { defineConfig } from '@playwright/test';
import { ORIGIN, PORT } from './tests/e2e/ports';

/** Browsertests laufen gegen die gebauten Stände: Vorschau (dist) und öffentlich (dist-public). */
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  reporter: [['list']],
  use: { baseURL: ORIGIN.preview, locale: 'de-DE', timezoneId: 'Europe/London', serviceWorkers: 'block' },
  webServer: [
    { command: `node scripts/serve.mjs dist ${PORT.preview}`, url: `${ORIGIN.preview}/de/`, reuseExistingServer: !process.env.CI },
    { command: `node scripts/serve.mjs dist-public ${PORT.public}`, url: `${ORIGIN.public}/de/`, reuseExistingServer: !process.env.CI },
    { command: `node scripts/serve.mjs dist-sub ${PORT.sub} /preview/app/`, url: `${ORIGIN.sub}/preview/app/de/`, reuseExistingServer: !process.env.CI },
  ],
});
