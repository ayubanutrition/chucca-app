/**
 * Labormessung (keine Felddaten): Transfergewicht, LCP und CLS je Seite.
 * Bedingungen: 390×844, CPU 4× gedrosselt, Netz 1,6 Mbit/s ↓ / 750 kbit/s ↑ / 150 ms RTT, kalter Cache, ohne Service Worker.
 * Aufruf: node scripts/measure.mjs http://127.0.0.1:4321 /de/ /de/drinks/ …
 */
import { chromium } from '@playwright/test';

const [, , base, ...paths] = process.argv;
const browser = await chromium.launch();
const rows = [];
for (const path of paths) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const bytes = { total: 0, js: 0, css: 0, font: 0, img: 0, html: 0, requests: 0 };
  const types = new Map();
  cdp.on('Network.responseReceived', (e) => types.set(e.requestId, e.type));
  cdp.on('Network.loadingFinished', (e) => {
    const kind = { Script: 'js', Stylesheet: 'css', Font: 'font', Image: 'img', Document: 'html' }[types.get(e.requestId)] ?? null;
    bytes.total += e.encodedDataLength;
    bytes.requests++;
    if (kind) bytes[kind] += e.encodedDataLength;
  });
  await page.addInitScript(() => {
    window.__lcp = 0;
    window.__cls = 0;
    new PerformanceObserver((list) => { for (const entry of list.getEntries()) window.__lcp = entry.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((list) => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__cls += entry.value; }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto(base + path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const vitals = await page.evaluate(() => ({ lcp: Math.round(window.__lcp), cls: Number(window.__cls.toFixed(3)) }));
  const kb = (n) => `${(n / 1024).toFixed(1)} kB`;
  rows.push({ path, 'LCP ms': vitals.lcp, CLS: vitals.cls, requests: bytes.requests, total: kb(bytes.total), html: kb(bytes.html), css: kb(bytes.css), js: kb(bytes.js), fonts: kb(bytes.font), images: kb(bytes.img) });
  await context.close();
}
await browser.close();
console.table(rows);
