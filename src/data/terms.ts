/**
 * TERMS OF SERVICE — first draft by Claude. Not legal advice: have it
 * reviewed before launch. Lines marked [To confirm: …] need decisions.
 */
export const termsOfService = {
  effectiveDate: '[To confirm: date of launch]',

  sections: [
    {
      heading: 'About these terms',
      content: [
        'These terms apply when you use picklemypaddle.com or send us a paddle to re-grit. By submitting an order you agree to them. Nothing in these terms limits your rights under the Australian Consumer Law.',
      ],
    },
    {
      heading: 'Ordering and assessment',
      content: [
        'Submitting the order form is a request, not a contract. We review your photos and email you to accept the paddle, ask questions, or explain why we cannot re-grit it. The contract starts when you pay the payment link we send.',
        'Your photos are a record of the paddle\'s condition before re-gritting. Please make sure they clearly show the whole face on each side.',
      ],
    },
    {
      heading: 'Price and payment',
      content: [
        'Re-gritting costs A$60 per paddle, plus return postage calculated for your order. Prices are in Australian dollars. We are not currently registered for GST, so no GST is charged.',
        'Payment is taken by card through Stripe before you post your paddle.',
      ],
    },
    {
      heading: 'Sending and returning paddles',
      content: [
        '[To confirm: who is responsible for the paddle while it is posted to you, recommended packaging, and whether postage to us should be tracked.]',
        'We return paddles to the postal address you give us. [To confirm: return postage service, e.g. tracked parcel.]',
      ],
    },
    {
      heading: 'Our work and your paddle',
      content: [
        'Re-gritted paddles are not allowed in sanctioned tournaments. Our service is for social, club and practice play, and it is your responsibility to check the equipment rules of any event you enter.',
        '[To confirm: what re-gritting does and does not change, and any effect on manufacturer warranty.]',
        'If we find a problem with your paddle after you pay that means we cannot safely re-grit it, we will contact you and refund the re-grit fee in full.',
      ],
    },
    {
      heading: 'If something goes wrong',
      content: [
        '[To confirm: what happens if you are unhappy with the result, and how to contact us about it.]',
      ],
    },
    {
      heading: 'Clubs',
      content: [
        'Clubs using our batch pickup service do so under a separate written club agreement, which applies alongside these terms.',
      ],
    },
  ],
} as const;
