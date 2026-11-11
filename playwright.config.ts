import { defineConfig } from '@playwright/test';

/** Browsertests laufen gegen die gebauten Stände: Vorschau (dist) und öffentlich (dist-public). */
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:4331', locale: 'de-DE', timezoneId: 'Europe/London', serviceWorkers: 'block' },
  webServer: [
    { command: 'node scripts/serve.mjs dist 4331', url: 'http://127.0.0.1:4331/de/', reuseExistingServer: !process.env.CI },
    { command: 'node scripts/serve.mjs dist-public 4332', url: 'http://127.0.0.1:4332/de/', reuseExistingServer: !process.env.CI },
  ],
});
