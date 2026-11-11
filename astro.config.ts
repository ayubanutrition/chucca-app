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
const buildId = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);

export default defineConfig({
  ...(site ? { site } : {}),
  base,
  trailingSlash: 'always',
  build: { format: 'directory' },
  // Astro 7 entfernt mit dem Standard 'jsx' Leerzeichen zwischen Inline-Elementen (z. B. Name/Preis).
  compressHTML: true,
  devToolbar: { enabled: false },
  integrations: [chuccaBuild({ mode, buildId })],
  vite: {
    define: {
      __CHUCCA_MODE__: JSON.stringify(mode),
      __CHUCCA_BUILD_ID__: JSON.stringify(buildId),
    },
  },
});
