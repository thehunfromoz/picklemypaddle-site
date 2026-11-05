/**
 * Paying for an accepted order (SCRUM-82). The status page's Pay now asks the integrations service
 * for a fresh Stripe Checkout page. Before leaving for Stripe, the status token is kept in this
 * tab's sessionStorage under PAY_TOKEN_KEY, so the pages Stripe sends the customer back to
 * (/order/paid, or /order/status?payment=cancelled) find the order again. The token itself is
 * never sent to Stripe.
 */
export const PAY_TOKEN_KEY = 'pmp-pay-token';

/**
 * SCRUM-85: the same for a club invoice's "Pay by card": the invoice number and its link's token,
 * so /club/paid can link back to the invoice and a cancelled payment reopens it.
 */
export const CLUB_PAY_KEY = 'pmp-club-pay';

/** What was kept under CLUB_PAY_KEY, if it's still a well-formed invoice link. */
export function clubPayMemory(raw: string | null): { number: string; token: string } | null {
  try {
    const v = JSON.parse(raw ?? 'null') as { number?: unknown; token?: unknown } | null;
    return v && typeof v.number === 'string' && /^PMP-INV-\d{4,}$/.test(v.number) && typeof v.token === 'string' && /^[A-Za-z0-9_-]{43}$/.test(v.token)
      ? { number: v.number, token: v.token }
      : null;
  } catch {
    return null;
  }
}

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
