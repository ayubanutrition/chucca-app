// Mutationstests der Kernlogik (src/lib). Aufruf: npm run mutation [-- --mutate src/lib/time.ts]
// Bewusst nicht Teil von `npm run check` (Laufzeit, siehe docs/06_QA.md, Abschnitt Mutationstests).
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  testRunner: 'vitest',
  vitest: { configFile: 'vitest.config.ts' },
  mutate: [
    'src/lib/time.ts',
    'src/lib/ics.ts',
    'src/lib/planner.ts',
    'src/lib/hours.ts',
    'src/lib/share.ts',
    'src/lib/storage.ts',
    'src/lib/sun.ts',
    'src/lib/menu.ts',
    'src/lib/events.ts',
  ],
  coverageAnalysis: 'perTest',
  reporters: ['clear-text', 'json', 'html'],
  jsonReporter: { fileName: 'reports/mutation/mutation.json' },
  htmlReporter: { fileName: 'reports/mutation/index.html' },
  tempDirName: '.stryker-tmp',
  concurrency: 4,
  timeoutMS: 10000,
  thresholds: { high: 85, low: 70, break: null },
};
