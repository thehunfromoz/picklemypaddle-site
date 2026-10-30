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
  name: 'PickleMyPaddle',

  contact: {
    email: 'sales@picklemypaddle.com',
    area: 'Sydney, NSW',
    /**
     * HubSpot Meetings link for club intro chats. Leave empty until it exists:
     * the Clubs page then shows only the email button.
     */
    clubBookingUrl: '',
  },

  pricing: {
    currency: 'AUD',
    regritPerPaddle: 60,
    gstRegistered: false,
    /**
     * SCRUM-81: the first day GST applies (YYYY-MM-DD), the same value as GST_REGISTERED_FROM on the
     * integrations service; null = not registered. Set it (and release) before the day: the price
     * note then switches on that day by itself. The terms and FAQ are rewritten with SCRUM-87.
     */
    gstRegisteredFrom: null as string | null,
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
   * How the business is described in the privacy policy and terms: "PickleMyPaddle, <description>".
   * It is a small business, so the pages do not name its owner.
   * abnNote is a placeholder until the ABN is issued (not applied for yet: planned after the end of
   * November, ahead of a launch before the new year). Then replace it with "ABN 00 000 000 000."
   */
  business: {
    description: 'a small business operated out of Sydney, NSW',
    abnNote:
      '[To confirm: ABN, to be applied for after the end of November, ahead of a launch before the new year]',
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
      body: 'Pay securely by card through the link in our email, then post your paddle to us. Members of participating clubs can hand it in for their club\'s next pickup instead.',
    },
    {
      title: 'We re-grit it',
      body: 'We clean and prep both faces, then apply and cure a fresh textured grit coat. You\'ll get a private status link to check where it\'s up to.',
    },
    {
      title: 'Back in the game',
      body: 'We post your paddle back with fresh grip on both faces, ready for your next session.',
    },
  ],

  // Testimonials live in src/data/testimonials.json (SCRUM-33, src/lib/testimonials.ts).

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
