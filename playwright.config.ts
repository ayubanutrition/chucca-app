import { defineConfig, devices } from '@playwright/test';
import { ORIGIN, PORT } from './tests/e2e/ports';

/** Zusatzbrowser nur auf Anforderung (`npm run test:e2e:cross` bzw. `CROSS_BROWSER=1`), damit `npm run check` bei Chromium bleibt. */
const cross = process.env.CROSS_BROWSER === '1';

/** Browsertests laufen gegen die gebauten Stände: Vorschau (dist) und öffentlich (dist-public). */
export default defineConfig({
  testDir: 'tests/e2e',
  // Eigener Lauf mit zwei Build-Ständen: playwright.update.config.ts (npm run test:sw-update).
  testIgnore: 'sw-update.spec.ts',
  fullyParallel: true,
  // Firefox hängt auf 4 Kernen gelegentlich (ca. 1 % der Tests, je Lauf andere, Ursache im Seitenaufbau/Fixture nicht bei der Seite: einzeln und im Schleifentest 280 Ladevorgänge ohne Ausreißer).
  // Im Zusatzlauf deshalb weniger Worker und zwei Wiederholungen; Playwright weist Wiederholungen als „flaky“ aus. Chromium (`npm run check`) bleibt ohne Wiederholung.
  workers: cross ? 2 : undefined,
  retries: cross ? 2 : 0,
  timeout: cross ? 45_000 : 30_000,
  forbidOnly: Boolean(process.env.CI),
  projects: [
    { name: 'chromium', use: { ...devices["Desktop Chrome"] } },
    ...(cross
      ? [
          { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
          { name: 'webkit', use: { ...devices['Desktop Safari'] } },
        ]
      : []),
  ],
  reporter: [['list']],
  use: { baseURL: ORIGIN.preview, locale: 'de-DE', timezoneId: 'Europe/London', serviceWorkers: 'block' },
  webServer: [
    { command: `node scripts/serve.mjs dist ${PORT.preview}`, url: `${ORIGIN.preview}/de/`, reuseExistingServer: !process.env.CI },
    { command: `node scripts/serve.mjs dist-public ${PORT.public}`, url: `${ORIGIN.public}/de/`, reuseExistingServer: !process.env.CI },
    { command: `node scripts/serve.mjs dist-sub ${PORT.sub} /preview/app/`, url: `${ORIGIN.sub}/preview/app/de/`, reuseExistingServer: !process.env.CI },
    // Test-Fixture mit erfundenen Öffnungszeiten (nur dieser Stand, nur tests/e2e/hours-fixture.spec.ts).
    { command: `node scripts/serve.mjs dist-hours ${PORT.hours}`, url: `${ORIGIN.hours}/de/`, reuseExistingServer: !process.env.CI },
    // Test-Karte mit bestätigtem Bestand (nur tests/e2e/menu-fixture.spec.ts).
    { command: `node scripts/serve.mjs dist-menu ${PORT.menu}`, url: `${ORIGIN.menu}/de/`, reuseExistingServer: !process.env.CI },
    // Test-Endpunkt für den Sendeweg der Gruppenanfrage (nur tests/e2e/inquiry-send.spec.ts, Anfragen fängt ein Mock ab).
    { command: `node scripts/serve.mjs dist-inquiry ${PORT.inquiry}`, url: `${ORIGIN.inquiry}/de/`, reuseExistingServer: !process.env.CI },
  ],
});
