/**
 * PRIVACY POLICY — first draft by Claude, based on the Australian Privacy
 * Principles and GDPR-aligned practice. Not legal advice: have it reviewed
 * before launch. Lines marked [To confirm: …] need decisions.
 */
export const privacyPolicy = {
  effectiveDate: '[To confirm: date of launch]',

  sections: [
    {
      heading: 'Who we are',
      content: [
        'Pickle My Paddle ("we", "us") provides pickleball paddle re-gritting from Sydney, NSW. [To confirm: business name and ABN once registered.] You can contact us about privacy at hello@picklemypaddle.com.',
      ],
    },
    {
      heading: 'What we collect',
      content: [
        'When you place an order: your name, email address, optional phone number, return postal address, details of each paddle, and photos of the front and back of each paddle.',
        'When you pay: payment is processed by Stripe on its own secure pages. We receive confirmation of payment and the last four digits of the card, but never your full card details.',
        'When clubs use our service, the club keeps its members\' details. We record only the club\'s contact details and the paddles in each batch.',
        'When you visit the site: our analytics are cookieless and record only aggregate information such as pages viewed and the referring site. [To confirm: analytics tool name.]',
      ],
    },
    {
      heading: 'How we use it',
      content: [
        'To assess whether your paddle can be re-gritted, contact you about your order, take payment, return your paddle, keep a record of the paddle\'s condition when we received it, and meet our tax and record-keeping obligations.',
        'We do not sell your information, and we do not send marketing emails unless you ask us to.',
      ],
    },
    {
      heading: 'Who we share it with',
      content: [
        'We use a small number of service providers to run the business: HubSpot (customer records), Stripe (payments), our postal carrier (return delivery) and our website host. They store data on our behalf and may store it outside Australia, including in the United States. [To confirm: list each provider and where it stores data.]',
      ],
    },
    {
      heading: 'How long we keep it',
      content: [
        '[To confirm: retention periods. Suggested: paddle photos 12 months after the order is completed; order and payment records 5 years for tax purposes; enquiries 12 months.]',
      ],
    },
    {
      heading: 'Keeping it secure',
      content: [
        'Our website uses encrypted connections, we limit who can access customer records, and we use reputable providers with strong security practices. If a data breach is likely to cause you serious harm, we will tell you and, where required, the Office of the Australian Information Commissioner.',
      ],
    },
    {
      heading: 'Your choices and rights',
      content: [
        'You can ask to see the information we hold about you, ask us to correct it, or ask us to delete it (unless we must keep it by law). Email hello@picklemypaddle.com and we will respond within 30 days.',
        'If you are not satisfied with how we handle a privacy concern, you can contact the Office of the Australian Information Commissioner at oaic.gov.au.',
      ],
    },
  ],
} as const;
