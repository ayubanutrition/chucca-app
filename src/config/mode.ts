/**
 * Betriebsmodus des Builds.
 * preview: private Vorschau – noindex, Konzeptmotive und Beispieldaten sichtbar und gekennzeichnet.
 * public:  öffentlicher Stand – ausschließlich bestätigte Inhalte, indexierbar.
 */
export type Mode = 'preview' | 'public';
export const MODE: Mode = typeof __CHUCCA_MODE__ === 'undefined' ? 'preview' : __CHUCCA_MODE__;
export const IS_PUBLIC = MODE === 'public';
export const IS_PREVIEW = MODE === 'preview';
