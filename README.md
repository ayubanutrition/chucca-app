# CHUCCA X · Mallorca

Private interactive website preview, with shared visual direction for a future mobile app. No native iOS/Android project exists yet.

## Run

Serve `dist/` with a static HTTP server. No install or build step is required. Routes: `#heute`, `#drinks`, `#besuch`.

## Current functionality

- German and English throughout; language and flavour preference saved locally, without accounts or analytics.
- Flavour inspiration, location link and native share / clipboard fallback.
- Responsive layout, keyboard navigation, reduced-motion support and mobile safe areas.
- PWA manifest with correctly sized icons. Installation on physical devices remains to be verified.
- Service worker updates assets from network first. Authenticated HTML is never cached; offline navigation shows a reconnect screen. This is not full offline venue access.

## Content boundaries

Images are synthetic concept illustrations, not venue photographs. Current menu, prices, operating hours, events and reservation workflow remain unconfirmed. Do not add fabricated content or enable reservations without venue approval.

## Publication

`.openai/hosting.json` identifies the existing private Site. Use its existing project ID when publishing. GitHub migration is pending user authentication; do not create a duplicate Site.

## Validation · 2026-11-01

- Node syntax checks for app and service worker.
- Browser: German/English switch, alcohol-free selection, state after reload, three mobile pages at 390px.
- Service worker isolated checks: old-cache removal, third-party/auth-path exclusion, offline navigation fallback.
- Physical iOS/Android installation, standalone launch and production auth/cache interaction remain unverified.

## Next release gates

1. Obtain approved brand assets and accurate venue data.
2. Verify PWA on actual iOS and Android devices.
3. Validate native-app scope and establish native project, signing and distribution separately.
4. Add owner-managed content only after confirming the existing operational tools.

## Group planner and image delivery · 2026-11-01

- Private meetup date/time in Europe/Madrid; bilingual invitation sharing with clipboard/manual copy fallback; ICS calendar export. No reservation or messaging backend.
- Selection survives language and page changes in memory only. No guest personal data collected.
- WebP imagery: 342,772 bytes instead of 3,874,811 bytes across the two loaded images (91.15% reduction). Original PNG sources retained.
- Passed timezone tests: winter, summer, invalid date, DST gap and ambiguous autumn time. Passed ICS UTC timestamp, escaping and UTF-8 line folding checks.
- Browser verified date/time preview, language switching with retained values, manual invitation copy fallback and calendar handler status. Browser download-event capture timed out; actual calendar download/import on physical devices remains unverified.

## V3 integration sprint

Work on `integration/v3-foundation`; preserve the existing Sites checkout. GitHub target is `https://github.com/ayubanutrition/chucca-app`, observed public and size zero on 2026-11-07. This source snapshot is being imported to GitHub with user authorization. GitHub branch history is authoritative after import.

Run `npm start`, `npm run check`, `npm test`. No dependency installation or compilation needed. The quality workflow runs syntax checks and planner regression checks; TypeScript and lint are not configured. External Claude/Gemini/Kimi/DeepSeek/Grok sessions are not connected. Assigned prompts do not constitute reviews.

New changes: durable manual location-copy fallback; direct jump to meeting planner; stable unique calendar identity per draft; specific accessible date/time errors. Native device calendar import remains unverified. No production deployment in this sprint.

## Design overhaul
See `docs/DESIGN_OVERHAUL_BRIEF.md`. This is the next assignment, not an already implemented redesign.
