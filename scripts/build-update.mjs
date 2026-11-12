/**
 * Baut die vier Stände für den Update-Test nach dist-update/: {preview,public} × {v1,v2}.
 * Gleicher Quelltext, nur andere Build-Kennung (CHUCCA_BUILD_ID): sw.js, Cache-Namen und
 * <meta name="chucca-build"> unterscheiden sich. Mit warmem Astro-Bildcache ca. 2 s je Stand
 * (kalt einmalig rund 1 min; `npm run build:test` wärmt ihn vor).
 */
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';

rmSync('dist-update', { recursive: true, force: true });
for (const mode of ['preview', 'public']) {
  for (const version of ['v1', 'v2']) {
    const env = { ...process.env, CHUCCA_MODE: mode, CHUCCA_BUILD_ID: `update-${version}`, CHUCCA_SITE_URL: 'https://chucca.example' };
    const result = spawnSync('npx', ['astro', 'build', '--outDir', `dist-update/${mode}-${version}`], { env, stdio: 'inherit' });
    if (result.status !== 0) process.exit(result.status ?? 1);
  }
}
