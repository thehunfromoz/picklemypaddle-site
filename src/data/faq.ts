/**
 * FAQ content. Answers marked [To confirm: …] need Attila's input before launch.
 * Prices, turnaround and reply time come from siteData so they can't drift from the landing page.
 */
import { siteData } from './siteData';

const { pricing } = siteData;

export const faq: { q: string; a: string }[] = [
  {
    q: 'What is re-gritting?',
    a: 'Over time the textured surface of a paddle face wears smooth, so it grips the ball less and generates less spin. Re-gritting restores a gritty texture to the face so the paddle grips the ball again.',
  },
  {
    q: 'Can every paddle be re-gritted?',
    a: "Most can, but not all. That's why we ask for photos of the front and back first. If a paddle has cracks, delamination or core damage, we'll tell you before you pay anything.",
  },
  {
    q: "What if my paddle can't be re-gritted?",
    a: "We'll tell you before you pay, and you owe nothing. If a problem only shows once the paddle reaches us, we'll contact you, refund the re-grit fee in full and post the paddle back to you using the return postage you've already paid.",
  },
  // REVIEW (SCRUM-30), early Nov 2026: the ~20 g figure is an estimate. Replace it with measured grams once
  // the application methods have been evaluated, and keep the About page in line.
  {
    q: 'Will re-gritting change how my paddle plays?',
    a: 'It adds some weight. We estimate the bonding agent and grit add about 20 grams across both faces, slightly more than a 50c coin. The finish is designed to feel close to a factory paddle rather than the extra-coarse bite of DIY grit, and you should notice the grip and spin come back.',
  },
  {
    q: 'Can I use a re-gritted paddle in sanctioned tournaments?',
    a: "No. Re-gritted paddles aren't approved for sanctioned tournaments, because the surface no longer matches the paddle's certification. Re-gritting is for social, club and practice play. If you play sanctioned events, keep a tournament-legal paddle for those.",
  },
  {
    q: 'How much does it cost?',
    a: `A$${pricing.regritPerPaddle} per paddle, ${pricing.covers}, plus return postage, which depends on how many paddles you send. You only pay after we have checked your photos and accepted the paddle.${pricing.gstRegistered ? '' : ' We are not registered for GST, so no GST is charged.'}`,
  },
  {
    q: 'How do I pay?',
    a: 'Once we accept your paddle, we email you a secure payment link. Card payments are handled by Stripe; we never see or store your card details.',
  },
  {
    q: 'What about postage?',
    a: "Return postage is added when we send your payment link, and depends on how many paddles you send. You pay to post your paddle to us. We recommend a tracked service and sturdy packaging.",
  },
  {
    q: 'How long does it take?',
    a: `We reply to your order within ${pricing.replyTime} with the photo check and a payment link, and your paddle is back in the post ${pricing.turnaround}.`,
  },
  {
    q: 'How do I track my paddle?',
    a: 'Your confirmation email includes a private link to a status page showing where your paddle is in the queue and when to expect it back. There are no accounts to create.',
  },
  {
    q: 'Can my club organise paddles for its members?',
    a: 'Yes. Clubs collect paddles from members and we pick up and return them in batches, with no postage. See the clubs page for how it works.',
  },
  {
    q: 'What happens to my photos and details?',
    a: 'We use them only to assess and process your order. See our privacy policy for how long we keep them and how to ask us to delete them.',
  },
];
