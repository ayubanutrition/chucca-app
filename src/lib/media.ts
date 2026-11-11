/**
 * Medienfreigabe. Portiert die Gates aus V3 (scripts/media_library.py) und
 * ersetzt dessen Vollexport durch eine explizite öffentliche Feldliste.
 */
import type { Localized, MediaInternal } from './content/schema';

export type ExclusionReason =
  | 'rights_not_approved'
  | 'venue_not_verified'
  | 'not_actual_venue_photograph'
  | 'no_local_file'
  | 'missing_alt';

/** Gründe, aus denen ein Datensatz nicht als echtes Venue-Foto veröffentlicht werden darf. */
export function exclusionReasons(record: MediaInternal): ExclusionReason[] {
  const reasons: ExclusionReason[] = [];
  if (record.rights_status !== 'approved' || !record.rights_evidence.trim()) reasons.push('rights_not_approved');
  if (!record.venue_verified || !record.venue_evidence.trim()) reasons.push('venue_not_verified');
  if (record.kind !== 'photograph') reasons.push('not_actual_venue_photograph');
  if (!record.file) reasons.push('no_local_file');
  if (!record.alt) reasons.push('missing_alt');
  return reasons;
}

const withoutFragment = (url: string): string => url.split('#')[0] ?? url;

function keys(record: MediaInternal): string[] {
  const out = [`id:${record.id}`];
  if (record.source_url) out.push(`url:${withoutFragment(record.source_url)}`);
  if (record.sha256) out.push(`sha:${record.sha256}`);
  if (record.file) out.push(`file:${record.file}`);
  return out;
}

/** Erster Treffer gewinnt; gleiche ID, Quelle (ohne Fragment), Datei oder SHA-256 gelten als Duplikat. */
export function deduplicate(records: MediaInternal[]): { unique: MediaInternal[]; duplicates: { id: string; duplicateOf: string }[] } {
  const seen = new Map<string, string>();
  const unique: MediaInternal[] = [];
  const duplicates: { id: string; duplicateOf: string }[] = [];
  for (const record of records) {
    const hit = keys(record).map((key) => seen.get(key)).find(Boolean);
    if (hit) {
      duplicates.push({ id: record.id, duplicateOf: hit });
      continue;
    }
    for (const key of keys(record)) seen.set(key, record.id);
    unique.push(record);
  }
  return { unique, duplicates };
}

export interface MediaAudit {
  total: number;
  unique: number;
  duplicates: { id: string; duplicateOf: string }[];
  publishablePhotographs: number;
  previewConcepts: number;
  excluded: { id: string; reasons: ExclusionReason[] }[];
}

/** Ein selbst erstelltes, gekennzeichnetes Konzeptmotiv – nur in der privaten Vorschau zulässig. */
export const isPreviewConcept = (record: MediaInternal): boolean =>
  record.kind !== 'photograph' && record.authorization === 'self-made' && record.rights_status === 'approved' && Boolean(record.file) && Boolean(record.alt);

export function auditMedia(records: MediaInternal[]): MediaAudit {
  const { unique, duplicates } = deduplicate(records);
  return {
    total: records.length,
    unique: unique.length,
    duplicates,
    publishablePhotographs: deduplicate(records.filter((r) => exclusionReasons(r).length === 0)).unique.length,
    previewConcepts: unique.filter(isPreviewConcept).length,
    excluded: records.filter((r) => exclusionReasons(r).length > 0).map((r) => ({ id: r.id, reasons: exclusionReasons(r) })),
  };
}

/** Auswahl für den Build: öffentlich nur freigegebene Fotos; in der Vorschau zusätzlich Konzeptmotive. */
export function selectMedia(records: MediaInternal[], mode: 'preview' | 'public'): MediaInternal[] {
  // Erst filtern, dann deduplizieren: ein nicht freigegebener Verweis darf ein freigegebenes Foto nicht verdrängen.
  const eligible = records.filter((r) => exclusionReasons(r).length === 0 || (mode === 'preview' && isPreviewConcept(r)));
  return deduplicate(eligible).unique;
}

/** Der einzige Vertrag, der den Build verlässt. Neue Felder müssen hier bewusst ergänzt werden. */
export interface MediaPublic {
  id: string;
  kind: 'photograph' | 'concept';
  alt: Localized;
  caption: Localized | null;
  credit: string | null;
  focus: string;
  tags: string[];
}

export const PUBLIC_MEDIA_FIELDS = ['id', 'kind', 'alt', 'caption', 'credit', 'focus', 'tags'] as const;

export function toPublicMedia(record: MediaInternal): MediaPublic {
  if (!record.alt) throw new Error(`Medium ${record.id} hat keinen Alternativtext.`);
  return {
    id: record.id,
    kind: record.kind === 'photograph' ? 'photograph' : 'concept',
    alt: record.alt,
    caption: record.caption ?? null,
    credit: record.credit ?? null,
    focus: record.focus,
    tags: [...record.tags],
  };
}
