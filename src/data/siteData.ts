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
    turnaround: '[To confirm: turnaround time, e.g. 5 business days from receipt]',
  },

  socials: {
    instagram: '',
    facebook: '',
    google: '',
  },

  /** Header navigation. Hash links jump to sections on the landing page. */
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
      title: 'Pay and post it in',
      body: 'Pay securely by card through the link in our email, then post your paddle to the address we send you.',
    },
    {
      title: 'We re-grit it',
      body: 'Your paddle joins the queue. Your private status link shows where it is and when to expect it back.',
    },
    {
      title: 'Back in the game',
      body: 'We post your paddle back with fresh grip on the face, ready for your next session.',
    },
  ],

  /** Leave empty to hide the testimonials section. Real quotes only, with permission. */
  testimonials: [
    {
      quote: '[To confirm: first customer testimonial, used with permission]',
      name: '[To confirm: customer first name]',
      context: '[To confirm: suburb or club]',
    },
    {
      quote: '[To confirm: second customer testimonial, used with permission]',
      name: '[To confirm: customer first name]',
      context: '[To confirm: suburb or club]',
    },
  ] as { quote: string; name: string; context: string }[],

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
