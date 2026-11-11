/**
 * Build-Nacharbeit: Service Worker, robots.txt und Sitemap passend zum Betriebsmodus.
 * Private Vorschau: kein HTML im Cache, alles noindex. Öffentlich: Offline-Kopie der
 * öffentlichen Seiten (network-first) und Sitemap mit hreflang aus der Routentabelle.
 */
import type { AstroIntegration } from 'astro';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';
import { LOCALES, PAGES, pagePath } from '../src/i18n';
import { buildServiceWorker } from '../src/lib/sw-template';

async function walk(dir: string, root = dir): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full, root)));
    else out.push(relative(root, full).split('\\').join('/'));
  }
  return out;
}

export function chuccaBuild(options: { mode: 'preview' | 'public'; buildId: string }): AstroIntegration {
  let base = '/';
  let site: string | undefined;
  return {
    name: 'chucca-build',
    hooks: {
      'astro:config:done': ({ config }) => {
        base = config.base.endsWith('/') ? config.base : `${config.base}/`;
        site = config.site;
      },
      'astro:build:done': async ({ dir, logger }) => {
        const root = fileURLToPath(dir);
        const files = await walk(root);
        const precache = files.filter(
          (file) =>
            file !== 'sw.js' &&
            file !== 'og.png' &&
            // Bilder der Galerie werden nicht vorab geladen; Schriften nur in den genutzten lateinischen Teilmengen.
            (/^_astro\/.*\.(css|js)$/.test(file) || /^_astro\/.*-latin-.*\.woff2$/.test(file) || /^[^/]+\.(svg|png|webmanifest)$/.test(file)),
        );
        await writeFile(join(root, 'sw.js'), buildServiceWorker({ ...options, base, assets: precache }));

        const galleryEmpty = (await readFile(join(root, 'de/galerie/index.html'), 'utf8')).includes('data-gallery-empty');
        const indexable = PAGES.filter((page) => !(page === 'gallery' && galleryEmpty));

        if (options.mode === 'public' && site) {
          const abs = (path: string) => new URL(`${base.replace(/\/$/, '')}${path}`, site).toString();
          const urls = indexable.flatMap((page) =>
            LOCALES.map(
              (locale) =>
                `<url><loc>${abs(pagePath(locale, page))}</loc>${LOCALES.map((alt) => `<xhtml:link rel="alternate" hreflang="${alt}" href="${abs(pagePath(alt, page))}"/>`).join('')}<xhtml:link rel="alternate" hreflang="x-default" href="${abs(page === 'today' ? '/' : pagePath('en', page))}"/></url>`,
            ),
          );
          await writeFile(
            join(root, 'sitemap.xml'),
            `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls.join('')}</urlset>\n`,
          );
          await writeFile(join(root, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${abs('/sitemap.xml')}\n`);
        } else {
          // Private Vorschau oder öffentlicher Build ohne Site-URL: nicht indexieren lassen.
          await writeFile(join(root, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
        }
        logger.info(`mode=${options.mode} · sw.js mit ${precache.length} Assets · robots/sitemap geschrieben`);
      },
    },
  };
}
