/**
 * TEST-FIXTURE, keine Venue-Fakten: bestätigte Getränkekarte ausschließlich für den Testbuild `dist-menu`
 * (`npm run build:menu`, Schalter `CHUCCA_TEST_MENU=1`, nur im Vorschau-Modus wirksam).
 * Namen, Zutaten, Preise und Datum sind erfunden. `updatedAt` liegt bewusst im Jahr 2099, Namen und Kategorien tragen die
 * Kennung `TESTFIXTURE-MENU`, damit nichts davon mit einer echten Karte verwechselt wird. Die Karte gelangt nie in `dist`,
 * `dist-public`, `dist-sub`, `dist-hours` oder `dist-inquiry` (Absicherung: `tests/e2e/menu-fixture.spec.ts`,
 * `tests/build-output/menu-guard.test.ts`, `integrations/chucca-build.ts`).
 *
 * Sie deckt die Darstellungsfälle ab: mehrere Größen (3, 2, 1 Preis), Preis ohne Cent und mit Cent, Drink ohne Preis,
 * alkoholfrei in gemischter und in rein alkoholfreier Kategorie (mit Notiz), Sonderzeichen (Ñ, ß, Ä, &, spitze Klammern),
 * alle Geschmacksrichtungen. Alle Drinks sind verfügbar: Die Fixture behauptet keinen Tagesstatus.
 */
import type { Menu } from '../../lib/content/schema';

/** Kennung, nach der die Leak-Tests in den regulären Builds suchen; steht nur im Testbuild im HTML. */
export const MENU_FIXTURE_MARKER = 'TESTFIXTURE-MENU';
export const MENU_FIXTURE_NOTICE = `${MENU_FIXTURE_MARKER}: Erfundene Testkarte, keine Karte von CHUCCA. Namen, Zutaten und Preise sind frei erfunden.`;
/** Erfundenes Datum „Stand der Karte“ (Jahr 2099). */
export const MENU_FIXTURE_UPDATED_AT = '2099-03-14';

const m = (name: string): { de: string; en: string; es: string } => ({ de: `${MENU_FIXTURE_MARKER} ${name}`, en: `${MENU_FIXTURE_MARKER} ${name}`, es: `${MENU_FIXTURE_MARKER} ${name}` });
const eur = (amountCents: number, size?: string) => ({ amountCents, currency: 'EUR' as const, ...(size ? { size } : {}) });

export const testMenu: Menu = {
  kind: 'published',
  status: 'confirmed',
  updatedAt: MENU_FIXTURE_UPDATED_AT,
  categories: [
    { id: 'tf-sprudel', name: { de: `${MENU_FIXTURE_MARKER} Sprudel`, en: `${MENU_FIXTURE_MARKER} Fizz`, es: `${MENU_FIXTURE_MARKER} Burbujas` } },
    { id: 'tf-klassik', name: { de: `${MENU_FIXTURE_MARKER} Klassik`, en: `${MENU_FIXTURE_MARKER} Classics`, es: `${MENU_FIXTURE_MARKER} Clásicos` } },
    {
      id: 'tf-null',
      name: { de: `${MENU_FIXTURE_MARKER} Null`, en: `${MENU_FIXTURE_MARKER} Zero`, es: `${MENU_FIXTURE_MARKER} Cero` },
      note: { de: 'Erfundene Kategorienotiz für den Test.', en: 'Invented category note for the test.', es: 'Nota de categoría inventada para la prueba.' },
    },
  ],
  items: [
    {
      id: 'tf-nandu-fizz',
      category: 'tf-sprudel',
      name: m('Ñandú Fizz'),
      description: { de: 'Erfunden: leicht, spritzig & ohne Gewähr.', en: 'Invented: light, bubbly & without guarantee.', es: 'Inventado: ligero, burbujeante y sin garantía.' },
      ingredients: [
        { de: 'Ananas', en: 'pineapple', es: 'piña' },
        { de: 'Zitronengras', en: 'lemongrass', es: 'hierba luisa' },
        { de: 'Soda', en: 'soda water', es: 'soda' },
      ],
      prices: [eur(700, '200 ml'), eur(950, '300 ml'), eur(1300, '500 ml')],
      alcoholFree: false,
      tastes: ['fruity', 'fresh'],
      available: true,
    },
    {
      id: 'tf-straussen-sour',
      category: 'tf-sprudel',
      name: m('Straußen-Sour'),
      description: { de: 'Erfunden: <i>nicht</i> kursiv gemeint.', en: 'Invented: <i>not</i> meant in italics.', es: 'Inventado: <i>no</i> va en cursiva.' },
      ingredients: [
        { de: 'Zitrone', en: 'lemon', es: 'limón' },
        { de: 'Eiweiß', en: 'egg white', es: 'clara de huevo' },
      ],
      prices: [eur(1200)],
      alcoholFree: false,
      tastes: ['classic'],
      available: true,
    },
    {
      id: 'tf-null-minze',
      category: 'tf-sprudel',
      name: m('Null Minze'),
      description: { de: 'Erfunden: ohne Alkohol, mit Minze.', en: 'Invented: no alcohol, with mint.', es: 'Inventado: sin alcohol, con menta.' },
      ingredients: [
        { de: 'Minze', en: 'mint', es: 'menta' },
        { de: 'Limette', en: 'lime', es: 'lima' },
      ],
      prices: [eur(500, '300 ml'), eur(800, '500 ml')],
      alcoholFree: true,
      tastes: ['fresh', 'free'],
      available: true,
    },
    {
      id: 'tf-grauer-gin',
      category: 'tf-klassik',
      name: m('Grauer Gin Tonic'),
      description: { de: 'Erfunden: trocken und klar.', en: 'Invented: dry and clear.', es: 'Inventado: seco y claro.' },
      ingredients: [
        { de: 'Wacholder', en: 'juniper', es: 'enebro' },
        { de: 'Tonic', en: 'tonic', es: 'tónica' },
      ],
      prices: [eur(1300)],
      alcoholFree: false,
      tastes: ['classic'],
      available: true,
    },
    {
      id: 'tf-bitter-aepfel',
      category: 'tf-klassik',
      name: m('Bitter Äpfel'),
      ingredients: [{ de: 'Äpfel', en: 'apples', es: 'manzanas' }],
      prices: [eur(950)],
      alcoholFree: false,
      tastes: ['classic', 'fruity'],
      available: true,
    },
    {
      id: 'tf-preislos',
      category: 'tf-klassik',
      name: m('Preislos'),
      description: { de: 'Erfunden: ein Drink ohne Preisangabe.', en: 'Invented: a drink without a price.', es: 'Inventado: una bebida sin precio.' },
      ingredients: [],
      prices: [],
      alcoholFree: false,
      tastes: ['classic'],
      available: true,
    },
    {
      id: 'tf-null-beere',
      category: 'tf-null',
      name: m('Null Beere'),
      description: { de: 'Erfunden: Beeren, kein Alkohol.', en: 'Invented: berries, no alcohol.', es: 'Inventado: bayas, sin alcohol.' },
      ingredients: [{ de: 'Beeren', en: 'berries', es: 'bayas' }],
      prices: [eur(650)],
      alcoholFree: true,
      tastes: ['fruity', 'free'],
      available: true,
    },
    {
      id: 'tf-null-zimt',
      category: 'tf-null',
      name: m('Null Zimt'),
      ingredients: [{ de: 'Zimt', en: 'cinnamon', es: 'canela' }],
      prices: [eur(750, '300 ml'), eur(1050, '500 ml')],
      alcoholFree: true,
      tastes: ['classic', 'free'],
      available: true,
    },
  ],
};
