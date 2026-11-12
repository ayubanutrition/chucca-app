import { defineConfig } from 'astro/config';
import { chuccaBuild } from './integrations/chucca-build';

/**
 * CHUCCA_MODE=public      → öffentlicher Build (nur bestätigte Inhalte, indexierbar)
 * CHUCCA_SITE_URL=https…  → absolute Basis für Canonicals, hreflang und Sitemap
 * CHUCCA_BASE=/pfad/      → Unterpfad des Hosts (Standard: /)
 */
const mode = process.env.CHUCCA_MODE === 'public' ? 'public' : 'preview';
const site = process.env.CHUCCA_SITE_URL || undefined;
const base = process.env.CHUCCA_BASE || '/';
// Test-Fixture für Öffnungszeiten: nur Vorschau-Modus, nur Ausgabeordner dist-hours (Prüfung in der Integration).
const testHours = process.env.CHUCCA_TEST_HOURS === '1';
if (testHours && mode !== 'preview') throw new Error('CHUCCA_TEST_HOURS ist nur im Vorschau-Modus erlaubt, niemals mit CHUCCA_MODE=public.');
// CHUCCA_BUILD_ID erlaubt feste Kennungen (Update-Test mit zwei Ständen); sonst Zeitstempel.
const buildId = process.env.CHUCCA_BUILD_ID || new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);

export default defineConfig({
  ...(site ? { site } : {}),
  base,
  trailingSlash: 'always',
  build: { format: 'directory' },
  // Astro 7 entfernt mit dem Standard 'jsx' Leerzeichen zwischen Inline-Elementen (z. B. Name/Preis).
  compressHTML: true,
  devToolbar: { enabled: false },
  integrations: [chuccaBuild({ mode, buildId, testHours })],
  vite: {
    define: {
      __CHUCCA_MODE__: JSON.stringify(mode),
      __CHUCCA_BUILD_ID__: JSON.stringify(buildId),
      __CHUCCA_TEST_HOURS__: JSON.stringify(testHours),
    },
  },
});
