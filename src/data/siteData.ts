/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SITE DATA — business details, prices and navigation in one place.
 *
 * Text inside [To confirm: …] is a placeholder. It renders highlighted on
 * staging, and `pnpm check:placeholders` fails the release build while any
 * remain.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const siteData = {
  name: 'Pickle My Paddle',

  contact: {
    email: 'hello@picklemypaddle.com',
    area: 'Sydney, NSW',
  },

  pricing: {
    currency: 'AUD',
    regritPerPaddle: 60,
    gstRegistered: false,
    returnPostageNote: 'Return postage is added at payment and depends on how many paddles you send.',
    /** Shown on the landing page and in the FAQ. */
    turnaround: 'within 10 business days of it reaching us, plus postage time each way',
    /** How quickly we reply to an order with the photo check and payment link. */
    replyTime: '1 business day',
    covers: 'both faces',
  },

  socials: {
    instagram: '',
    facebook: '',
    google: '',
  },

  /**
   * Header navigation. Hash links jump to sections on the landing page.
   * The Gallery link only shows once the gallery itself is visible (Header.astro).
   */
  nav: [
    { label: 'How it works', href: '/#how-it-works' },
    { label: 'Pricing', href: '/#pricing' },
    { label: 'Gallery', href: '/#gallery' },
    { label: 'Clubs', href: '/clubs' },
    { label: 'FAQ', href: '/faq' },
    { label: 'Blog', href: '/blog' },
    { label: 'About', href: '/about' },
  ],

  orderCta: { label: 'Send in your paddle', href: '/#order' },

  howItWorks: [
    {
      title: 'Tell us about your paddle',
      body: 'Fill in the order form with your details and a photo of the front and back of each paddle.',
    },
    {
      title: 'We check it can be re-gritted',
      body: 'We review the photos and email you to confirm, or to ask a question if anything is unclear.',
    },
    {
      title: 'Pay and send it in',
      body: 'Pay securely by card through the link in our email, then post your paddle to us. Club members can hand it in for their club\'s next pickup instead.',
    },
    {
      title: 'We re-grit it',
      body: 'We clean and prep both faces, then apply and cure a fresh textured grit coat. Your private status link shows where it\'s up to.',
    },
    {
      title: 'Back in the game',
      body: 'We post your paddle back with fresh grip on both faces, ready for your next session.',
    },
  ],

  /**
   * Real quotes only, from the review request after each job, with the customer's
   * permission (SCRUM-33). The section stays hidden until there are at least 3.
   */
  testimonials: [] as { quote: string; name: string; context: string }[],

  footerNav: [
    {
      title: 'Service',
      links: [
        { label: 'How it works', href: '/#how-it-works' },
        { label: 'Pricing', href: '/#pricing' },
        { label: 'Order', href: '/#order' },
        { label: 'For clubs', href: '/clubs' },
      ],
    },
    {
      title: 'About',
      links: [
        { label: 'About us', href: '/about' },
        { label: 'FAQ', href: '/faq' },
        { label: 'Blog', href: '/blog' },
        { label: 'Privacy', href: '/privacy' },
        { label: 'Terms', href: '/terms' },
      ],
    },
  ],
};

export type SiteData = typeof siteData;
