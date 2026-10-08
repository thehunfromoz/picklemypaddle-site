import { describe, expect, it } from 'vitest';
import { completePairs, showGallery, showTestimonials } from '../../src/lib/visibility';

const pair = { before: 1, after: 2 };

describe('gallery visibility', () => {
  it('needs three complete before/after pairs', () => {
    expect(showGallery([])).toBe(false);
    expect(showGallery([pair, pair])).toBe(false);
    expect(showGallery([pair, pair, pair])).toBe(true);
  });

  it('ignores pairs missing a photo', () => {
    const half = { before: 1 };
    expect(completePairs([pair, half, pair])).toHaveLength(2);
    expect(showGallery([pair, half, pair, half])).toBe(false);
  });
});

describe('testimonials visibility', () => {
  it('needs three testimonials', () => {
    expect(showTestimonials([])).toBe(false);
    expect(showTestimonials([1, 2])).toBe(false);
    expect(showTestimonials([1, 2, 3])).toBe(true);
  });
});
