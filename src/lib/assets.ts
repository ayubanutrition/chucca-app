/** Zuordnung der Mediendateien aus src/assets/media zu ihren Bildmetadaten. */
import type { ImageMetadata } from 'astro';

const modules = import.meta.glob<{ default: ImageMetadata }>('../assets/media/*.{webp,png,jpg,jpeg,avif}', { eager: true });

const byFile = new Map<string, ImageMetadata>();
for (const [path, module] of Object.entries(modules)) {
  const file = path.split('/').pop();
  if (file) byFile.set(file, module.default);
}

export const imageFor = (file: string | undefined): ImageMetadata | null => (file ? (byFile.get(file) ?? null) : null);
