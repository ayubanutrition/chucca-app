import { defineConfig } from 'vitest/config';

/** Prüfungen der Build-Ausgabe (Dist-Ordner); braucht `npm run build:test` davor. */
export default defineConfig({
  define: { __CHUCCA_MODE__: JSON.stringify('preview'), __CHUCCA_BUILD_ID__: JSON.stringify('test') },
  test: { include: ['tests/build-output/**/*.test.ts'], environment: 'node', testTimeout: 60_000 },
});
