/**
 * TEST-FIXTURE, kein Betreiberfakt: Anfrage-Endpunkt ausschließlich für den Testbuild `dist-inquiry`
 * (`npm run build:inquiry`, Schalter `CHUCCA_TEST_INQUIRY=1`, nur im Vorschau-Modus wirksam).
 * Der Host endet auf `.invalid` (RFC 2606) und löst nie auf; die Browsertests fangen die Anfrage mit einem Mock ab.
 * Die Fixture gelangt nie in `dist`, `dist-public`, `dist-sub` oder `dist-hours`
 * (Absicherung: `tests/e2e/inquiry-send.spec.ts`, `integrations/chucca-build.ts`).
 */
import type { Venue } from '../../lib/content/schema';

/** Kennung, nach der die Leak-Tests in den regulären Builds suchen; steht nur im Testbuild im HTML. */
export const INQUIRY_FIXTURE_MARKER = 'TESTFIXTURE-INQUIRY';
export const INQUIRY_FIXTURE_NOTICE = `${INQUIRY_FIXTURE_MARKER}: Testendpunkt, keine Angabe von CHUCCA. Es wird nichts an CHUCCA gesendet.`;
/** Host der Fixture; die Tests fangen Anfragen an diesen Host ab. */
export const INQUIRY_FIXTURE_URL = 'https://inquiries.chucca-test.invalid/v1/group-inquiry';

export const fixtureInquiryEndpoint: NonNullable<Venue['inquiryEndpoint']> = {
  url: INQUIRY_FIXTURE_URL,
  method: 'POST',
  acceptsInquiries: true,
  status: 'confirmed',
  source: `${INQUIRY_FIXTURE_MARKER} (erfunden, nur Testbuild)`,
  observedAt: '2099-01-01',
  verifiedAt: '2099-01-01',
};
