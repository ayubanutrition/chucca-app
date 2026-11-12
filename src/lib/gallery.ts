/** Galeriebestand für den Build: nur Medien, deren Datei tatsächlich vorhanden ist. */
import type { ImageMetadata } from 'astro';
import { MODE } from '../config/mode';
import { imageFor } from './assets';
import { mediaFor } from './content';
import type { MediaPublic } from './media';

export interface GalleryItem {
  media: MediaPublic;
  image: ImageMetadata;
}

/** Gezählt werden renderbare Einträge – nicht bloß Katalogzeilen (Befund aus dem V3-Audit). */
export function galleryItems(): GalleryItem[] {
  const items: GalleryItem[] = [];
  for (const { record, public: media } of mediaFor(MODE)) {
    const image = imageFor(record.file);
    // Freigegebenes Foto ohne Datei ist ein Fehler im Katalog (Tippfehler im Dateinamen, Datei nicht kopiert) – nicht still weglassen.
    if (!image) throw new Error(`Inhalte fehlerhaft – der Build wurde angehalten. Die Bilddatei „${record.file ?? '?'}“ zum Foto „${record.id}“ fehlt in src/assets/media (Dateiname prüfen oder Datei dorthin kopieren).`);
    items.push({ media, image });
  }
  return items;
}

export const galleryItem = (id: string): GalleryItem | null => galleryItems().find((item) => item.media.id === id) ?? null;
