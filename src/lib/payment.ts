/**
 * Paying for an accepted order (SCRUM-82). The status page's Pay now asks the integrations service
 * for a fresh Stripe Checkout page. Before leaving for Stripe, the status token is kept in this
 * tab's sessionStorage under PAY_TOKEN_KEY, so the pages Stripe sends the customer back to
 * (/order/paid, or /order/status?payment=cancelled) find the order again. The token itself is
 * never sent to Stripe.
 */
export const PAY_TOKEN_KEY = 'pmp-pay-token';

/** A Checkout Session id from Stripe's return URL, or null. */
export function sessionIdFrom(search: string): string | null {
  const id = new URLSearchParams(search).get('session_id');
  return id && /^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(id) ? id : null;
}

/** Only ever send the browser to Stripe's own https pages. */
export function isCheckoutUrl(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && (u.hostname === 'checkout.stripe.com' || u.hostname.endsWith('.stripe.com'));
  } catch {
    return false;
  }
}
