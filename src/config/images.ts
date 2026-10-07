/**
 * ─────────────────────────────────────────────────────────────────────────────
 * IMAGES — drop real photos into src/assets/images/… and they are picked up
 * automatically and optimised at build time (WebP, srcset, sized).
 *
 *   gallery/   before-and-after pairs, named <name>-before.jpg and
 *              <name>-after.jpg (e.g. sixzero-before.jpg, sixzero-after.jpg).
 *              The <name> part, with hyphens as spaces, becomes the caption.
 *   hero/      hero.jpg  (landscape, ≥ 1600 × 1200 px)
 *   about/     about.jpg (portrait or square, ≥ 900 × 700 px)
 *
 * No remote images are used: until photos are added the site shows labelled
 * placeholders, which keeps the Content-Security-Policy to 'self'.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import type { ImageMetadata } from 'astro';

type Mod = { default: ImageMetadata };

function single(glob: Record<string, Mod>): ImageMetadata | undefined {
  const first = Object.values(glob)[0];
  return first?.default;
}

export const heroImage = single(
  import.meta.glob<Mod>('../assets/images/hero/*.{jpg,jpeg,png,webp,avif}', { eager: true }),
);

export const aboutImage = single(
  import.meta.glob<Mod>('../assets/images/about/*.{jpg,jpeg,png,webp,avif}', { eager: true }),
);

export interface GalleryPair {
  caption: string;
  before?: ImageMetadata;
  after?: ImageMetadata;
}

const galleryFiles = import.meta.glob<Mod>(
  '../assets/images/gallery/*.{jpg,jpeg,png,webp,avif}',
  { eager: true },
);

/** Groups <name>-before / <name>-after files into pairs, sorted by name. */
export function pairGallery(files: Record<string, { default: ImageMetadata }>): GalleryPair[] {
  const pairs = new Map<string, GalleryPair>();
  for (const [path, mod] of Object.entries(files)) {
    const file = path.split('/').pop()!.replace(/\.[^.]+$/, '');
    const match = file.match(/^(.*)-(before|after)$/i);
    if (!match) continue;
    const key = match[1];
    const pair = pairs.get(key) ?? {
      caption: key.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    };
    pair[match[2].toLowerCase() as 'before' | 'after'] = mod.default;
    pairs.set(key, pair);
  }
  return [...pairs.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, p]) => p);
}

export const galleryPairs: GalleryPair[] = pairGallery(galleryFiles);
