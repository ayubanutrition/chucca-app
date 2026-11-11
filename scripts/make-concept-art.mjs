/**
 * Erzeugt die gekennzeichneten Konzeptillustrationen der privaten Vorschau.
 * Eigenes Werk des Projekts – keine Fotos, keine Abbildung des Lokals.
 * Aufruf: node scripts/make-concept-art.mjs
 */
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const OUT = new URL('../src/assets/media/', import.meta.url);
const C = { ink: '#160c12', plum: '#2b1424', wine: '#5a1f42', magenta: '#b23a6a', pink: '#f27aa5', orange: '#ff8f45', deep: '#e6602a', amber: '#ffc27a', cream: '#f7ecdc', sand: '#e7cba0', leaf: '#3f6b4f', lemon: '#f6d65b' };

let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const between = (a, b) => a + rnd() * (b - a);

const defs = (extra = '') => `<defs>
<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 0.95  0 0 0 0 0.85  0 0 0 0.11 0"/></filter>
<filter id="glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="14"/></filter>
<filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="40"/></filter>
<linearGradient id="dusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.ink}"/><stop offset=".38" stop-color="${C.wine}"/><stop offset=".68" stop-color="${C.magenta}"/><stop offset=".86" stop-color="${C.deep}"/><stop offset="1" stop-color="${C.amber}"/></linearGradient>
<linearGradient id="night" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d070c"/><stop offset=".7" stop-color="${C.plum}"/><stop offset="1" stop-color="${C.wine}"/></linearGradient>
<linearGradient id="drink" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.amber}"/><stop offset="1" stop-color="${C.deep}"/></linearGradient>
<radialGradient id="warm" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${C.amber}" stop-opacity=".95"/><stop offset="1" stop-color="${C.orange}" stop-opacity="0"/></radialGradient>
${extra}</defs>`;
const grain = (w, h) => `<rect width="${w}" height="${h}" filter="url(#grain)" style="mix-blend-mode:overlay"/>`;
const svg = (w, h, body, extra) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${defs(extra)}${body}${grain(w, h)}</svg>`;

/** Palme als Silhouette: gebogener Stamm, gefiederte Wedel. */
function palm(x, y, height, lean = 0, fill = C.ink, fronds = 9) {
  const tx = x + lean, ty = y - height;
  let out = `<path d="M${x - height * 0.022},${y} Q${x + lean * 0.2},${y - height * 0.55} ${tx - height * 0.012},${ty} L${tx + height * 0.012},${ty} Q${x + lean * 0.2 + height * 0.03},${y - height * 0.55} ${x + height * 0.022},${y}Z" fill="${fill}"/>`;
  for (let i = 0; i < fronds; i++) {
    const a = -Math.PI * (0.02 + (i / (fronds - 1)) * 0.96);
    const len = height * between(0.38, 0.5);
    const ex = tx + Math.cos(a) * len, ey = ty + Math.sin(a) * len * 0.62 + len * 0.3;
    const cx = tx + Math.cos(a) * len * 0.55, cy = ty + Math.sin(a) * len * 0.95;
    const droop = len * 0.2;
    out += `<path d="M${tx},${ty} Q${cx},${cy} ${ex},${ey} Q${cx + Math.cos(a) * 8},${cy + droop} ${tx},${ty + height * 0.02}Z" fill="${fill}"/>`;
    for (let k = 1; k <= 7; k++) {
      const t = k / 8;
      const px = (1 - t) * (1 - t) * tx + 2 * (1 - t) * t * cx + t * t * ex;
      const py = (1 - t) * (1 - t) * ty + 2 * (1 - t) * t * cy + t * t * ey;
      out += `<path d="M${px},${py} l${Math.cos(a) * len * 0.07 - 3},${len * 0.2 * (1 - t * 0.5)}" stroke="${fill}" stroke-width="${Math.max(2, height * 0.008)}" stroke-linecap="round" fill="none"/>`;
    }
  }
  return out;
}

/** Lichterkette als Kettenlinie mit glühenden Lampen. */
function lights(x1, y1, x2, y2, sag, n, r = 9) {
  let out = `<path d="M${x1},${y1} Q${(x1 + x2) / 2},${(y1 + y2) / 2 + sag * 2} ${x2},${y2}" stroke="${C.ink}" stroke-opacity=".7" stroke-width="3" fill="none"/>`;
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const x = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * ((x1 + x2) / 2) + t * t * x2;
    const y = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * ((y1 + y2) / 2 + sag * 2) + t * t * y2 + r;
    out += `<circle cx="${x}" cy="${y}" r="${r * 3.2}" fill="${C.amber}" opacity=".5" filter="url(#glow)"/><circle cx="${x}" cy="${y}" r="${r}" fill="${C.cream}"/>`;
  }
  return out;
}

const bokeh = (w, h, n, y0 = 0, y1 = 1) => Array.from({ length: n }, () => {
  const r = between(14, 60);
  return `<circle cx="${between(0, w)}" cy="${between(h * y0, h * y1)}" r="${r}" fill="${rnd() > 0.75 ? C.pink : C.amber}" opacity="${between(0.08, 0.3).toFixed(2)}"/>`;
}).join('');

/** Roba de llengües: versetzte, gestufte Rauten wie beim mallorquinischen Ikat. */
function llengues(w, h, cell = 160) {
  let out = `<rect width="${w}" height="${h}" fill="${C.cream}"/>`;
  const cols = [C.deep, C.orange, C.pink, C.wine];
  let row = 0;
  for (let y = -cell; y < h + cell; y += cell * 0.75, row++) {
    for (let x = -cell + (row % 2 ? cell / 2 : 0); x < w + cell; x += cell) {
      const col = cols[(row + Math.floor(x / cell) + 8) % 2 === 0 ? row % 4 : (row + 2) % 4];
      for (let s = 0; s < 4; s++) {
        const k = 1 - s * 0.24;
        const jitter = (i) => (((row * 7 + s * 3 + i) % 5) - 2) * cell * 0.012;
        out += `<path d="M${x + jitter(1)},${y - cell * 0.72 * k} L${x + cell * 0.3 * k},${y + jitter(2)} L${x + jitter(3)},${y + cell * 0.72 * k} L${x - cell * 0.3 * k},${y + jitter(4)}Z" fill="${s % 2 ? C.cream : col}" opacity="${s % 2 ? 1 : 0.92}"/>`;
      }
    }
  }
  return out;
}

function citrus(cx, cy, r, color, rot = 0) {
  let out = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}"/><circle cx="${cx}" cy="${cy}" r="${r * 0.9}" fill="${C.cream}"/>`;
  for (let i = 0; i < 9; i++) {
    const a0 = rot + (i / 9) * Math.PI * 2 + 0.06, a1 = rot + ((i + 1) / 9) * Math.PI * 2 - 0.06;
    const R = r * 0.84, r0 = r * 0.1;
    out += `<path d="M${cx + Math.cos(a0) * r0},${cy + Math.sin(a0) * r0} L${cx + Math.cos(a0) * R},${cy + Math.sin(a0) * R} A${R},${R} 0 0 1 ${cx + Math.cos(a1) * R},${cy + Math.sin(a1) * R} L${cx + Math.cos(a1) * r0},${cy + Math.sin(a1) * r0}Z" fill="${color}" opacity=".92"/>`;
  }
  return out;
}
const leaf = (x, y, len, rot, color = C.leaf) => `<g transform="translate(${x} ${y}) rotate(${rot})"><path d="M0,0 Q${len * 0.5},${-len * 0.38} ${len},0 Q${len * 0.5},${len * 0.38} 0,0Z" fill="${color}"/><path d="M0,0 L${len},0" stroke="${C.ink}" stroke-opacity=".35" stroke-width="3"/></g>`;

function coupe(cx, top, w, glassH) {
  const bowlH = w * 0.36, stemH = glassH - bowlH;
  return `<ellipse cx="${cx}" cy="${top + glassH + 14}" rx="${w * 0.42}" ry="${w * 0.05}" fill="${C.ink}" opacity=".5"/>
  <path d="M${cx - w / 2},${top} Q${cx - w / 2},${top + bowlH} ${cx},${top + bowlH} Q${cx + w / 2},${top + bowlH} ${cx + w / 2},${top}Z" fill="${C.cream}" opacity=".16"/>
  <path d="M${cx - w * 0.47},${top + bowlH * 0.2} Q${cx - w * 0.44},${top + bowlH * 0.93} ${cx},${top + bowlH * 0.93} Q${cx + w * 0.44},${top + bowlH * 0.93} ${cx + w * 0.47},${top + bowlH * 0.2}Z" fill="url(#drink)"/>
  <ellipse cx="${cx}" cy="${top + bowlH * 0.2}" rx="${w * 0.47}" ry="${w * 0.045}" fill="${C.amber}"/>
  <path d="M${cx - w / 2},${top} Q${cx - w / 2},${top + bowlH} ${cx},${top + bowlH} Q${cx + w / 2},${top + bowlH} ${cx + w / 2},${top}" fill="none" stroke="${C.cream}" stroke-width="7"/>
  <ellipse cx="${cx}" cy="${top}" rx="${w / 2}" ry="${w * 0.05}" fill="none" stroke="${C.cream}" stroke-width="6" opacity=".8"/>
  <rect x="${cx - 5}" y="${top + bowlH}" width="10" height="${stemH}" fill="${C.cream}"/>
  <ellipse cx="${cx}" cy="${top + glassH}" rx="${w * 0.3}" ry="${w * 0.045}" fill="none" stroke="${C.cream}" stroke-width="7"/>`;
}

function highball(cx, top, w, h, liquid = '#f3e2b8') {
  let out = `<ellipse cx="${cx}" cy="${top + h + 10}" rx="${w * 0.6}" ry="${w * 0.08}" fill="${C.ink}" opacity=".45"/>
  <rect x="${cx - w / 2}" y="${top}" width="${w}" height="${h}" rx="${w * 0.08}" fill="${C.cream}" opacity=".13"/>
  <rect x="${cx - w / 2 + 12}" y="${top + h * 0.14}" width="${w - 24}" height="${h * 0.84}" rx="${w * 0.06}" fill="${liquid}" opacity=".55"/>`;
  for (let i = 0; i < 5; i++) out += `<rect x="${-w * 0.2}" y="${-w * 0.2}" width="${w * 0.4}" height="${w * 0.4}" rx="10" fill="${C.cream}" opacity=".38" transform="translate(${cx + between(-w * 0.18, w * 0.18)} ${top + h * (0.25 + i * 0.15)}) rotate(${between(-30, 30)})"/>`;
  out += `<rect x="${cx - w / 2}" y="${top}" width="${w}" height="${h}" rx="${w * 0.08}" fill="none" stroke="${C.cream}" stroke-width="7"/>`;
  return out;
}

const scenes = {
  'concept-dusk': () => {
    const w = 1800, h = 1800;
    return svg(w, h, `<rect width="${w}" height="${h}" fill="url(#dusk)"/>
      ${Array.from({ length: 40 }, () => `<circle cx="${between(0, w)}" cy="${between(0, h * 0.4)}" r="${between(1.5, 4)}" fill="${C.cream}" opacity="${between(0.2, 0.7).toFixed(2)}"/>`).join('')}
      <circle cx="1120" cy="1330" r="400" fill="url(#warm)"/><circle cx="1120" cy="1370" r="170" fill="${C.cream}" opacity=".96"/>
      <rect y="1370" width="${w}" height="120" fill="${C.wine}"/><rect y="1370" width="${w}" height="6" fill="${C.amber}" opacity=".7"/>
      ${Array.from({ length: 10 }, (_, i) => `<rect x="${950 + i * 9}" y="${1384 + i * 9}" width="${340 - i * 18}" height="4" fill="${C.amber}" opacity="${0.65 - i * 0.05}"/>`).join('')}
      ${palm(230, 1560, 1050, 110)}${palm(520, 1540, 700, -50)}${palm(1600, 1570, 1180, -150)}${palm(1380, 1530, 520, 30)}
      <path d="M0,1800 L0,1440 L300,1440 L300,1520 L1500,1520 L1500,1400 L1800,1400 L1800,1800Z" fill="${C.ink}"/>
      ${lights(30, 980, 900, 1040, 80, 10)}${lights(900, 1040, 1770, 930, 90, 10)}
      ${Array.from({ length: 5 }, (_, i) => `<circle cx="${420 + i * 240}" cy="1660" r="46" fill="${C.amber}" opacity=".35" filter="url(#glow)"/><circle cx="${420 + i * 240}" cy="1660" r="9" fill="${C.cream}"/>`).join('')}`);
  },
  'concept-night': () => {
    const w = 1500, h = 1900;
    return svg(w, h, `<rect width="${w}" height="${h}" fill="url(#night)"/>
      ${Array.from({ length: 70 }, () => `<circle cx="${between(0, w)}" cy="${between(0, h * 0.6)}" r="${between(1.5, 4.5)}" fill="${C.cream}" opacity="${between(0.3, 0.9).toFixed(2)}"/>`).join('')}
      <circle cx="1080" cy="400" r="230" fill="${C.pink}" opacity=".22" filter="url(#soft)"/><circle cx="1080" cy="400" r="120" fill="${C.cream}"/><circle cx="1130" cy="370" r="110" fill="#1b0f18"/>
      <rect y="1380" width="${w}" height="520" fill="#0d070c"/>
      ${Array.from({ length: 12 }, (_, i) => `<circle cx="${80 + i * 122}" cy="1378" r="26" fill="${C.amber}" opacity=".55" filter="url(#glow)"/><circle cx="${80 + i * 122}" cy="1378" r="8" fill="${C.cream}"/><rect x="${74 + i * 122}" y="1400" width="12" height="${between(120, 360)}" fill="${C.orange}" opacity=".28"/>`).join('')}
      ${palm(260, 1420, 900, 70, '#0d070c')}${palm(640, 1400, 620, -50, '#0d070c')}${palm(1260, 1430, 1040, -100, '#0d070c')}`);
  },
  'concept-coupe': () => {
    const w = 1500, h = 1900;
    return svg(w, h, `<rect width="${w}" height="${h}" fill="${C.plum}"/>
      <circle cx="750" cy="820" r="560" fill="${C.deep}"/><circle cx="750" cy="820" r="560" fill="url(#warm)" opacity=".7"/>
      <path d="M-100,1650 L1600,250" stroke="${C.pink}" stroke-width="26" opacity=".85"/><path d="M-100,250 L1600,1650" stroke="${C.cream}" stroke-width="6" opacity=".35"/>
      <rect y="1500" width="${w}" height="400" fill="${C.ink}"/><rect y="1500" width="${w}" height="8" fill="${C.amber}" opacity=".5"/>
      ${coupe(750, 640, 760, 860)}
      <path d="M930,690 q120,-150 40,-250 q-70,70 -120,220Z" fill="${C.orange}" stroke="${C.amber}" stroke-width="8"/>`);
  },
  'concept-highball': () => {
    const w = 1500, h = 1900;
    return svg(w, h, `<rect width="${w}" height="${h}" fill="${C.wine}"/>
      <path d="M0,1900 L0,900 A750,750 0 0 1 1500,900 L1500,1900Z" fill="${C.pink}" opacity=".9"/>
      <path d="M150,1900 L150,960 A600,600 0 0 1 1350,960 L1350,1900Z" fill="${C.plum}"/><circle cx="750" cy="1050" r="420" fill="url(#warm)" opacity=".55"/>
      <rect y="1560" width="${w}" height="340" fill="${C.ink}"/>
      ${highball(750, 560, 460, 1000)}
      ${citrus(900, 600, 150, C.lemon, 0.4)}
      <path d="M620,1100 Q600,700 560,330" stroke="${C.leaf}" stroke-width="12" fill="none" stroke-linecap="round"/>
      ${Array.from({ length: 14 }, (_, i) => leaf(612 - i * 3.6, 1000 - i * 48, 86, i % 2 ? -150 - i : -30 + i)).join('')}`);
  },
  'concept-arch': () => {
    const w = 1500, h = 1900;
    return svg(w, h, `<rect width="${w}" height="${h}" fill="${C.sand}"/>
      <rect width="${w}" height="${h}" fill="${C.deep}" opacity=".18"/>
      <path d="M330,1900 L330,900 A420,420 0 0 1 1170,900 L1170,1900Z" fill="url(#dusk)"/>
      <path d="M330,1900 L330,900 A420,420 0 0 1 1170,900 L1170,1900" fill="none" stroke="${C.cream}" stroke-width="26"/>
      <circle cx="750" cy="1250" r="330" fill="url(#warm)"/>
      ${lights(350, 760, 1150, 760, 60, 9, 8)}
      <path d="M330,1900 L330,1560 L1170,1560 L1170,1900Z" fill="${C.plum}"/>
      ${Array.from({ length: 7 }, (_, i) => `<path d="M${330 + i * 140},1560 L${190 + i * 187},1900" stroke="${C.wine}" stroke-width="5"/>`).join('')}
      <path d="M270,1680 L1230,1680 M300,1620 L1200,1620 M230,1780 L1270,1780" stroke="${C.wine}" stroke-width="5"/>
      ${palm(940, 1600, 520, 20, C.ink, 8)}<path d="M880,1590 L1000,1590 L980,1700 L900,1700Z" fill="${C.deep}"/>
      <rect x="0" y="0" width="${w}" height="${h}" fill="${C.ink}" opacity=".12"/>
      ${Array.from({ length: 5 }, (_, i) => `<path d="M${60 + i * 28},${200 + i * 20} q60,-90 130,-20" stroke="${C.ink}" stroke-opacity=".25" stroke-width="10" fill="none"/>`).join('')}`);
  },
  'concept-citrus': () => {
    const w = 2000, h = 1400;
    return svg(w, h, `<rect width="${w}" height="${h}" fill="${C.ink}"/><rect x="60" y="60" width="${w - 120}" height="${h - 120}" rx="40" fill="${C.plum}"/>
      ${citrus(520, 520, 330, C.orange, 0.2)}${citrus(1180, 860, 290, C.lemon, 1)}${citrus(1620, 380, 230, C.deep, 0.6)}${citrus(300, 1130, 180, C.lemon, 2)}
      ${leaf(820, 250, 240, 20)}${leaf(900, 330, 200, 70)}${leaf(1500, 1050, 260, -30)}${leaf(1560, 1130, 200, 15)}${leaf(700, 1050, 220, -60)}
      ${Array.from({ length: 9 }, () => `<rect x="-45" y="-45" width="90" height="90" rx="14" fill="${C.cream}" opacity=".3" transform="translate(${between(200, 1800)} ${between(160, 1240)}) rotate(${between(0, 90)})"/>`).join('')}`);
  },
  'concept-table': () => {
    const w = 2000, h = 1400;
    return svg(w, h, `<rect width="${w}" height="${h}" fill="url(#night)"/>${bokeh(w, h, 46, 0.05, 0.6)}
      <ellipse cx="1000" cy="1130" rx="900" ry="250" fill="${C.wine}"/><ellipse cx="1000" cy="1110" rx="900" ry="250" fill="${C.sand}"/><ellipse cx="1000" cy="1110" rx="900" ry="250" fill="${C.deep}" opacity=".25"/>
      <circle cx="1000" cy="900" r="330" fill="url(#warm)"/>
      ${coupe(560, 560, 400, 520)}${highball(1440, 560, 230, 520, '#f6b06a')}
      <rect x="940" y="900" width="120" height="170" rx="16" fill="${C.cream}" opacity=".25"/><rect x="960" y="960" width="80" height="110" rx="8" fill="${C.cream}"/>
      <path d="M1000,960 q-34,-50 0,-110 q34,60 0,110Z" fill="${C.amber}"/><path d="M1000,955 q-16,-28 0,-60 q16,32 0,60Z" fill="${C.cream}"/>
      ${citrus(1500, 560, 80, C.orange, 0.5)}`);
  },
  'concept-llengues': () => {
    const w = 1500, h = 1900;
    return svg(w, h, llengues(w, h, 190));
  },
};

await mkdir(OUT, { recursive: true });
for (const [name, make] of Object.entries(scenes)) {
  seed = 7 + name.length * 13;
  await sharp(Buffer.from(make())).webp({ quality: 92 }).toFile(new URL(`${name}.webp`, OUT).pathname);
  console.log('ok', name);
}
