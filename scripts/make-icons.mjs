/** Erzeugt App-Icons und das Social-Vorschaubild aus dem Zeichen (zwei gekreuzte Lichtbalken). */
import sharp from 'sharp';
import { writeFile, mkdir } from 'node:fs/promises';

const out = new URL('../public/', import.meta.url);
const mark = (pad, radius) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="${radius}" fill="#1b0f17"/><g stroke-linecap="round" stroke-width="${62 - pad * 0.12}" fill="none"><path d="M${150 + pad},${150 + pad} L${362 - pad},${362 - pad}" stroke="#f27aa5"/><path d="M${362 - pad},${150 + pad} L${150 + pad},${362 - pad}" stroke="#ff8f45"/></g></svg>`;
await mkdir(out, { recursive: true });
await writeFile(new URL('icon.svg', out), mark(0, 112));
const png = (svg, size, file) => sharp(Buffer.from(svg), { density: 300 }).resize(size, size).png().toFile(new URL(file, out).pathname);
await png(mark(0, 112), 192, 'icon-192.png');
await png(mark(0, 112), 512, 'icon-512.png');
await png(mark(40, 0), 512, 'icon-maskable-512.png');
await png(mark(10, 0), 180, 'apple-touch-icon.png');
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#160c12"/><stop offset=".55" stop-color="#5a1f42"/><stop offset=".85" stop-color="#e6602a"/><stop offset="1" stop-color="#ffc27a"/></linearGradient></defs><rect width="1200" height="630" fill="url(#g)"/><circle cx="880" cy="560" r="170" fill="#f7ecdc"/><rect y="560" width="1200" height="70" fill="#160c12"/><g stroke-linecap="round" stroke-width="30" fill="none"><path d="M110,110 L230,230" stroke="#f27aa5"/><path d="M230,110 L110,230" stroke="#ff8f45"/></g></svg>`;
await sharp(Buffer.from(og)).png().toFile(new URL('og.png', out).pathname);
console.log('icons ok');
