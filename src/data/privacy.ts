/**
 * PRIVACY POLICY: draft by Claude, written for the Australian Privacy
 * Principles, with the GDPR / UK GDPR points an EU or UK visitor needs.
 * Not legal advice: have it reviewed before launch. Lines marked
 * [To confirm: …] need decisions.
 *
 * Keep it true to what the system does. The order and status services are
 * still being built (SCRUM-8), so this describes the intended design. Revisit
 * it when they ship and when the production host is chosen.
 */
import { siteData } from './siteData';

const contactEmail = siteData.contact.email;

export const privacyPolicy = {
  lastUpdated: '14 October 2026',

  sections: [
    {
      heading: 'Who we are',
      content: [
        `Pickle My Paddle ("we", "us") provides pickleball paddle re-gritting from ${siteData.contact.area}. ${siteData.business.operator}`,
        `You can contact us about privacy at ${contactEmail}.`,
      ],
    },
    {
      heading: 'What we collect',
      content: [
        'When you place an order: your name, email address, return postal address, an optional phone number, details of each paddle, and photos of the front and back of each paddle. Please keep people out of your photos.',
        'When you email us or book a chat: your name, email address and anything you tell us.',
        'When you pay: payment is processed by Stripe on its own secure pages. We receive confirmation that you have paid, but never your card number.',
        "When a club uses our service, the club keeps its members' details. We record only the club's contact details and the paddles in each batch.",
        'When you visit the site: we use Umami, an analytics tool that runs on our own server. It uses no cookies, does not follow you across other sites, and records only aggregate information such as the pages viewed, the site that referred you, and your approximate country, browser and device type. Because it sets no cookies, there is no cookie banner.',
      ],
    },
    {
      heading: 'How we use it',
      content: [
        "To assess whether your paddle can be re-gritted, contact you about your order, take payment, return your paddle, keep a record of the paddle's condition when we received it, and meet our tax and record-keeping obligations.",
        'After an order is complete we may email you once to ask how it went and whether we may quote your feedback. We only publish a testimonial with your permission.',
        'We do not sell your information, and we do not send marketing emails unless you ask us to.',
      ],
    },
    {
      heading: 'Who we share it with',
      content: [
        'We use a few service providers to run the business. They handle your information on our behalf and only for that purpose.',
        'HubSpot keeps our customer records. Our HubSpot account stores data in [To confirm: the HubSpot data hosting region shown in your account settings].',
        'Stripe processes card payments and may handle data in Australia and other countries, including the United States.',
        'Our website and order system run on a server we rent from OVH in [To confirm: the OVH data centre location]. Orders and paddle photos are stored there.',
        'We send and receive email through [To confirm: your email provider and where it stores data].',
        'Our postal carrier receives your name and return address so it can deliver your paddle.',
        'Our analytics run on our own server, so no third party receives them.',
        'Some of these providers store or access information outside Australia. Before sending information overseas we take reasonable steps to make sure the provider handles it consistently with the Australian Privacy Principles. We may also share information where the law requires it.',
      ],
    },
    {
      heading: 'How long we keep it',
      content: [
        'Paddle photos: 12 months after your order is completed, then we delete them.',
        'Order and payment records: 5 years, because tax law requires us to keep business records for that long.',
        'Enquiries that do not become an order: 12 months.',
        'You can ask us to delete your information sooner (see below), unless we must keep it by law.',
      ],
    },
    {
      heading: 'Keeping it secure',
      content: [
        'Our website uses encrypted connections, we limit who can access customer records, and we use reputable providers with strong security practices.',
        "Your order's status page is reached through a private link that is hard to guess. Anyone who has the link can see the order's status, so please do not share it.",
        'If a data breach is likely to cause you serious harm, we will tell you and, where required, the Office of the Australian Information Commissioner.',
      ],
    },
    {
      heading: 'Your choices and rights',
      content: [
        `You can ask to see the information we hold about you, ask us to correct it, or ask us to delete it (unless we must keep it by law). Email ${contactEmail} and we will respond within 30 days.`,
        'If you are not satisfied with how we handle a privacy concern, you can contact the Office of the Australian Information Commissioner at oaic.gov.au.',
      ],
    },
    {
      heading: 'If you are in the EU or UK',
      content: [
        'If you are in the European Economic Area or the United Kingdom, the GDPR or UK GDPR also applies to the personal data you give us.',
        'We use your data to carry out your order (contract), to meet legal obligations such as tax records, and for our legitimate interests in running a small business, such as keeping the site working and preventing fraud. If we ever rely on your consent, you can withdraw it at any time.',
        `You can ask us to access, correct, delete or restrict the use of your data, to object to how we use it, and to receive a copy in a portable format. Email ${contactEmail}.`,
        'Your data is handled in Australia and by providers in other countries, including the United States. Where data leaves the EEA or UK, we rely on safeguards such as the standard contractual clauses our providers offer.',
        "You can also complain to your local data protection authority, such as the Information Commissioner's Office in the UK.",
      ],
    },
    {
      heading: 'Changes to this policy',
      content: ['We may update this policy. The date at the top shows when it last changed.'],
    },
  ],
} as const;
