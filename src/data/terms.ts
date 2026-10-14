/**
 * TERMS OF SERVICE: draft by Claude. Not legal advice: have it reviewed
 * before launch. Lines marked [To confirm: …] need decisions.
 *
 * GST: the business is not registered, so prices are stated without GST.
 * tests/unit/legal.test.ts fails if siteData.pricing.gstRegistered is switched
 * on, so this wording gets rewritten (GST-inclusive prices, tax invoices, ABN)
 * once an ABN and GST registration exist.
 */
import { siteData } from './siteData';

const { pricing } = siteData;
const contactEmail = siteData.contact.email;

export const termsOfService = {
  lastUpdated: '14 October 2026',

  sections: [
    {
      heading: 'About these terms',
      content: [
        `These terms apply when you use picklemypaddle.com or send us a paddle to re-grit. They are between you and Pickle My Paddle, ${siteData.contact.area}. ${siteData.business.operator}`,
        'By submitting an order you agree to them. Nothing in these terms limits your rights under the Australian Consumer Law.',
      ],
    },
    {
      heading: 'Ordering and assessment',
      content: [
        `Submitting the order form is a request, not a contract. We review your photos and email you within ${pricing.replyTime} to accept the paddle, ask questions, or explain why we cannot re-grit it. The contract starts when you pay using the payment link we send. You can cancel at any time before you pay, at no cost.`,
        "Your photos are a record of the paddle's condition before re-gritting. Please make sure they clearly show the whole face on each side.",
      ],
    },
    {
      heading: 'Price and payment',
      content: [
        `Re-gritting costs A$${pricing.regritPerPaddle} per paddle, covering ${pricing.covers}, plus return postage, which is calculated for your order and added to your payment link. Prices are in Australian dollars.`,
        'We are not currently registered for GST, so our prices do not include GST and none is charged. If that changes, we will update these terms and our prices.',
        'Payment is taken by card through Stripe after we accept your paddle and before you post it.',
      ],
    },
    {
      heading: 'Turnaround',
      content: [
        'We expect to post your paddle back within 10 business days of it reaching us. Business days are Monday to Friday, excluding NSW public holidays. This is an estimate, not a guarantee, and it does not include postage time each way.',
        'We are not responsible for delays caused by carriers or other events outside our control. Nothing here limits your rights under the Australian Consumer Law.',
      ],
    },
    {
      heading: 'Sending and returning paddles',
      content: [
        'You pay to post your paddle to us, and it is your responsibility until it reaches us. Please pack it so it cannot be damaged, and use a tracked service.',
        'We post your paddle back to the address you give us using [To confirm: return postage service, for example a tracked parcel]. The cost is the return postage added to your payment.',
        '[To confirm: what you will do if a paddle is lost or damaged while in our care or in the post back to you, for example refund the re-grit fee and the reasonable replacement cost up to a stated amount]',
      ],
    },
    {
      heading: 'Our work and your paddle',
      content: [
        "Re-gritting renews the surface texture of the paddle face. It can slightly change a paddle's weight, balance and feel, and results vary by paddle. We assess your paddle from photos, so we cannot promise in advance that it will suit re-gritting.",
        'Re-gritted paddles are not allowed in sanctioned tournaments. Our service is for social, club and practice play, and it is your responsibility to check the equipment rules of any event you enter.',
        "Re-gritting may affect your paddle's manufacturer warranty. Please check with the manufacturer before you send it.",
        'If we find a problem with your paddle after you pay that means we cannot safely re-grit it, we will contact you, refund the re-grit fee in full and post the paddle back to you using the return postage you paid.',
      ],
    },
    {
      heading: 'Cancellations, refunds and problems',
      content: [
        'If you change your mind after paying but before we start work on your paddle, email us and we will refund your payment in full and post your paddle back to you if we already have it.',
        'Once we have re-gritted a paddle the work cannot be undone, so we cannot refund a change of mind after that point.',
        `If you are unhappy with the result, email ${contactEmail} within 14 days of receiving your paddle, with photos. We will look at it promptly and, where our work was not up to standard, re-do it or refund the re-grit fee.`,
        'These terms do not limit your rights under the Australian Consumer Law, including your right to a remedy where a service is not provided with due care and skill.',
      ],
    },
    {
      heading: 'Clubs',
      content: [
        'Clubs using our batch pickup service do so under a separate written club agreement, which applies alongside these terms.',
      ],
    },
    {
      heading: 'Governing law',
      content: ['These terms are governed by the laws of New South Wales, Australia.'],
    },
    {
      heading: 'Changes to these terms',
      content: [
        'We may update these terms. The date at the top shows when they last changed, and the version in force when you order is the one that applies to that order.',
      ],
    },
  ],
} as const;
