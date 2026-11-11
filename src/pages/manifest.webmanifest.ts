/** Web-App-Manifest; Start und Geltungsbereich folgen dem konfigurierten Basis-Pfad. */
import type { APIRoute } from 'astro';
import { withBase } from '../lib/paths';

export const GET: APIRoute = () =>
  new Response(
    JSON.stringify({
      id: withBase('/'),
      name: 'CHUCCA · Playa de Palma',
      short_name: 'CHUCCA',
      description: 'Cocktailbar · Playa de Palma · Mallorca',
      lang: 'de',
      start_url: withBase('/'),
      scope: withBase('/'),
      display: 'standalone',
      background_color: '#1b0f17',
      theme_color: '#1b0f17',
      icons: [
        { src: withBase('/icon-192.png'), sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: withBase('/icon-512.png'), sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: withBase('/icon-maskable-512.png'), sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    }),
    { headers: { 'Content-Type': 'application/manifest+json; charset=utf-8' } },
  );
