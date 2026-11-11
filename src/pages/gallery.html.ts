/** V3 hatte eine eigene gallery.html. Alte Links landen über die Sprachwahl in der neuen Galerie. */
import type { APIRoute } from 'astro';
import { withBase } from '../lib/paths';

export const GET: APIRoute = () => {
  const target = `${withBase('/')}#galerie`;
  return new Response(
    `<!doctype html><html lang="de"><meta charset="utf-8"><meta name="robots" content="noindex"><title>CHUCCA</title><meta http-equiv="refresh" content="0;url=${target}"><a href="${target}">CHUCCA · Galerie / Gallery / Galería</a></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
};
