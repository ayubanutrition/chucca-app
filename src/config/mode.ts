/**
 * Betriebsmodus des Builds.
 * preview: private Vorschau – noindex, Konzeptmotive und Beispieldaten sichtbar und gekennzeichnet.
 * public:  öffentlicher Stand – ausschließlich bestätigte Inhalte, indexierbar.
 */
export type Mode = 'preview' | 'public';
export const MODE: Mode = typeof __CHUCCA_MODE__ === 'undefined' ? 'preview' : __CHUCCA_MODE__;
export const IS_PUBLIC = MODE === 'public';
export const IS_PREVIEW = MODE === 'preview';
/**
 * Test-Schalter (CHUCCA_TEST_HOURS=1, `npm run build:hours`): ersetzt die unbestätigten Öffnungszeiten durch die
 * gekennzeichnete Test-Fixture `src/content/fixtures/hours.ts`. Nur im Vorschau-Modus und nur für den Testbuild
 * `dist-hours`; `astro.config.ts` und `integrations/chucca-build.ts` lehnen jede andere Kombination ab.
 */
export const TEST_HOURS: boolean = IS_PREVIEW && typeof __CHUCCA_TEST_HOURS__ !== 'undefined' && __CHUCCA_TEST_HOURS__;
/**
 * Test-Schalter (CHUCCA_TEST_INQUIRY=1, `npm run build:inquiry`): setzt nur im Vorschau-Modus einen gekennzeichneten
 * Test-Endpunkt (`src/content/fixtures/inquiry.ts`, Host `.invalid`), damit der Sendeweg im Browser gegen einen Mock
 * geprüft werden kann. Wie `TEST_HOURS`: `astro.config.ts` und `integrations/chucca-build.ts` lehnen jede andere Kombination
 * (Modus public, anderer Ausgabeordner als `dist-inquiry`) ab.
 */
export const TEST_INQUIRY: boolean = IS_PREVIEW && typeof __CHUCCA_TEST_INQUIRY__ !== 'undefined' && __CHUCCA_TEST_INQUIRY__;
