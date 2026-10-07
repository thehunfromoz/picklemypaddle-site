/**
 * Site identity used by layouts and SEO metadata.
 * Colours, fonts and radius live in src/styles/theme.css.
 */
export const brand = {
  name: 'Pickle My Paddle',
  wordmark: 'pickle my paddle',
  tagline: 'Pickled, not retired.',
  description:
    'Pickleball paddle re-gritting in Australia. Send in your worn paddle by post or through your club and get it back with fresh grip. A$60 per paddle.',
  locale: 'en_AU',
} as const;

export type Brand = typeof brand;
