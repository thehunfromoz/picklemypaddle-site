/**
 * When the gallery and testimonials sections appear (SCRUM-29/32/33).
 * They stay hidden until there's enough real content to be convincing:
 * no placeholders or invented quotes are ever shown to visitors.
 */
export const MIN_GALLERY_PAIRS = 3;
export const MIN_TESTIMONIALS = 3;

export interface PairLike {
  before?: unknown;
  after?: unknown;
}

/** Pairs that have both a before and an after photo. */
export function completePairs<T extends PairLike>(pairs: T[]): T[] {
  return pairs.filter((p) => p.before && p.after);
}

export function showGallery(pairs: PairLike[]): boolean {
  return completePairs(pairs).length >= MIN_GALLERY_PAIRS;
}

export function showTestimonials(list: unknown[]): boolean {
  return list.length >= MIN_TESTIMONIALS;
}
