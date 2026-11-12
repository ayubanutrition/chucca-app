/**
 * TEST-FIXTURE, keine Venue-Fakten: Öffnungszeiten ausschließlich für den Testbuild `dist-hours`
 * (`npm run build:hours`, Schalter `CHUCCA_TEST_HOURS=1`, nur im Vorschau-Modus wirksam).
 * Die Zeiten sind erfunden und liegen bewusst im Jahr 2099, damit sie nie mit echten Angaben verwechselt werden
 * und Tests mit gefrorener Uhr unabhängig vom Build-Datum sind. Sie gelangen nie in `dist`, `dist-public` oder `dist-sub`
 * (Absicherung: `tests/e2e/hours-fixture.spec.ts`, `integrations/chucca-build.ts`).
 */
import type { Venue } from '../../lib/content/schema';

/** Kennung, nach der die Leak-Tests in den regulären Builds suchen; steht nur im Testbuild im HTML. */
export const HOURS_FIXTURE_MARKER = 'TESTFIXTURE-HOURS';
export const HOURS_FIXTURE_NOTICE = `${HOURS_FIXTURE_MARKER}: Erfundene Testzeiten, keine Angaben von CHUCCA.`;

export const fixtureHours: Venue['hours'] = {
  validFrom: '2099-01-01',
  validUntil: '2099-12-31',
  // Index 0 = Sonntag. So: geschlossen · Mo–Do 18–23 · Fr 18–02 (Nachtschicht) · Sa 17–03 (Nachtschicht).
  regular: [
    null,
    { open: '18:00', close: '23:00' },
    { open: '18:00', close: '23:00' },
    { open: '18:00', close: '23:00' },
    { open: '18:00', close: '23:00' },
    { open: '18:00', close: '02:00' },
    { open: '17:00', close: '03:00' },
  ],
  exceptions: {
    '2099-03-05': { open: '12:00', close: '14:00' },
    '2099-06-18': null,
    '2099-06-20': { open: '12:00', close: '16:00' },
    '2099-07-04': null,
  },
  status: 'confirmed',
  source: HOURS_FIXTURE_NOTICE,
  observedAt: '2099-01-01',
};
