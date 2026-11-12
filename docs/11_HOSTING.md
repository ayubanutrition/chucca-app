# Hosting: Header und CSP auf dem Zielhost

Das Hosting-Ziel ist nicht entschieden (Aufgabe 13). Der Build schreibt deshalb in jedes Ausgabeverzeichnis (`dist/`, `dist-public/`, `dist-sub/`) eine hostneutrale `_headers` (Format Netlify / Cloudflare Pages). Quelle: `src/lib/headers.ts`, aufgerufen aus `integrations/chucca-build.ts`. Entscheidung und Begründung: `docs/07_DECISIONS.md` D18; Prüfstand: `docs/06_QA.md`.

## Was der Host leisten muss
1. Statische Dateien ausliefern, `404.html` als Fehlerseite (Status 404).
2. Die Header aus `_headers` senden. Netlify und Cloudflare Pages lesen die Datei selbst; auf anderen Hosts wird sie übersetzt (unten).
3. HTTPS erzwingen und `Strict-Transport-Security` setzen (nicht in `_headers`: nur über HTTPS sinnvoll, Wert gehört zur Domain-Entscheidung).
4. `manifest.webmanifest` als `application/manifest+json`, `sw.js` als JavaScript ausliefern.
5. Die Datei `_headers` selbst nicht ausliefern (Netlify/Cloudflare tun das nicht; nginx/Vercel brauchen sie gar nicht).

## Inhalt der Header
| Pfad | Header |
|---|---|
| `/*` | `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (alles Ungenutzte `=()`: Kamera, Mikrofon, Standort, USB, Sensoren …), `Cross-Origin-Opener-Policy: same-origin`, `Content-Security-Policy` |
| `/*` nur Vorschau-Modus oder ohne Site-URL | `X-Robots-Tag: noindex, nofollow` |
| `/_astro/*` | `Cache-Control: public, max-age=31536000, immutable` (Dateinamen tragen den Inhalts-Hash) |
| `/`, `/de/*`, `/en/*`, `/es/*`, `sw.js`, `manifest.webmanifest`, `robots.txt`, `sitemap.xml`, `404.html`, Icons | `Cache-Control: no-cache` (immer revalidieren) |

Die `Cache-Control`-Regeln überlappen absichtlich nicht: Netlify und Cloudflare führen gleichnamige Header mehrerer Treffer zusammen, ein breites `/*` mit `no-cache` würde `/_astro/*` verderben.

### CSP
`default-src 'none'`; `script-src 'self'` plus SHA-256-Hashes der Inline-Skripte (Sprachwahl in `index.astro`, Weiterleitung in `404.astro`); `style-src 'self'` plus Hash des eingebetteten Stylesheets; `style-src-attr 'unsafe-inline'`; `img-src 'self' data:`; `font-src 'self'`; `connect-src 'self'`; `manifest-src 'self'`; `worker-src 'self'`; `base-uri 'none'`; `form-action 'none'`; `frame-ancestors 'none'`; `object-src 'none'`. Kein `unsafe-eval`, kein `unsafe-inline` für Skripte oder `<style>`-Blöcke.

- **Die Hashes ändern sich mit jedem Build, der ein Inline-Skript oder das eingebettete CSS ändert.** Sie werden aus den erzeugten HTML-Dateien berechnet, nie von Hand gepflegt. Auf Hosts ohne `_headers`-Unterstützung die Zeile `Content-Security-Policy` bei jedem Deployment aus der erzeugten Datei übernehmen (CI-Schritt), nicht einmalig kopieren.
- **`style-src-attr 'unsafe-inline'`** ist nötig, weil Komponenten `style="--stack: …"` und `object-position` als Attribut setzen (`DrinksView`, `VisitView`, `TodayView`, `GroupView`, `GalleryView`, `Art.astro`, `404.astro`, `index.astro`). Style-Attribute führen kein Skript aus; die Lockerung gilt nur für Attribute. Strenger wäre `'unsafe-hashes'` mit je einem Hash pro Attributwert oder der Umbau der Attribute auf Klassen bzw. benutzerdefinierte Eigenschaften in CSS (offener Vorschlag, berührt die Komponenten).
- Maps und Instagram sind Links, keine Ressourcen; sie brauchen keine CSP-Freigabe.
- Ein Unterpfad-Hosting (`CHUCCA_BASE`) ändert die Muster nicht: `_headers` liegt im Ausgabeordner und beschreibt Pfade relativ zu ihm. Netlify/Cloudflare brauchen für einen Unterpfad ohnehin eine eigene Site oder Regeln mit Präfix.

## Abbildung auf andere Hosts
**Netlify / Cloudflare Pages:** `_headers` unverändert deployen. Grenzen bei Cloudflare Pages: höchstens 100 Regeln, 2000 Zeichen je Zeile (die CSP-Zeile hat derzeit rund 800).

**Vercel** (`vercel.json`; `<CSP>` und `<PERMISSIONS>` aus der erzeugten `_headers` einsetzen). Der Lookahead hält `no-cache` von `/_astro/` fern:
```json
{
  "headers": [
    { "source": "/(.*)", "headers": [
      { "key": "X-Content-Type-Options", "value": "nosniff" },
      { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
      { "key": "Permissions-Policy", "value": "<PERMISSIONS>" },
      { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
      { "key": "Content-Security-Policy", "value": "<CSP>" }
    ] },
    { "source": "/_astro/(.*)", "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }] },
    { "source": "/((?!_astro/).*)", "headers": [{ "key": "Cache-Control", "value": "no-cache" }] }
  ]
}
```
Vorschau-Modus zusätzlich `{ "key": "X-Robots-Tag", "value": "noindex, nofollow" }` im ersten Block.

**nginx** (`add_header` in einem `location` verdrängt die des `server`-Blocks, daher eine gemeinsame Include-Datei mit `always`):
```nginx
# /etc/nginx/snippets/chucca-security.conf  (Werte aus der erzeugten _headers)
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "<PERMISSIONS>" always;
add_header Cross-Origin-Opener-Policy "same-origin" always;
add_header Content-Security-Policy "<CSP>" always;
# nur Vorschau: add_header X-Robots-Tag "noindex, nofollow" always;

server {
  root /var/www/chucca;
  error_page 404 /404.html;
  location /_astro/ {
    add_header Cache-Control "public, max-age=31536000, immutable" always;
    include snippets/chucca-security.conf;
  }
  location / {
    add_header Cache-Control "no-cache" always;
    include snippets/chucca-security.conf;
    try_files $uri $uri/index.html =404;
  }
}
```
`types { application/manifest+json webmanifest; }` ergänzen, falls die Standardtabelle es nicht kennt.

## Lokal simuliert
`scripts/serve.mjs` liest `_headers` aus dem ausgelieferten Ordner und sendet dieselben Header; `tests/e2e/headers.spec.ts` prüft damit Header und CSP im Browser. Das ist eine Simulation: Eigenheiten eines echten Hosts (Zusammenführen, Regel-Limits, Proxy/CDN, HSTS, Kompression) sind damit nicht geprüft. Nach dem ersten Deployment: Aufgabe 13/16 mit `curl -I` auf `/de/`, `/_astro/<datei>`, `/sw.js` und einem Seitenaufruf in Chromium mit offener Konsole wiederholen.
