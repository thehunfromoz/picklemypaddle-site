/**
 * Today's pricing for the browser (SCRUM-81).
 *
 *  - loadPricing(): one GET /api/pricing per page, used by the order form for its postage hint.
 *    Only called once the form has reached the service, so a page view never logs an error when
 *    the service is closed or absent.
 *  - GST wording: elements with data-gst-from="YYYY-MM-DD" swap to data-gst-text-registered on
 *    and after that Sydney day, so the wording changes on the GST date without a rebuild on the
 *    day. The date is siteData.pricing.gstRegisteredFrom, set to the same value as the
 *    integrations service's GST_REGISTERED_FROM.
 */
import { parsePricing, pricingUrlFrom, sydneyToday, type PricingResponse } from '../lib/pricing';
import { DEFAULT_ORDER_API_URL } from '../lib/order';

let pending: Promise<PricingResponse | null> | undefined;

export function loadPricing(orderEndpoint: string = DEFAULT_ORDER_API_URL): Promise<PricingResponse | null> {
  pending ??= fetch(pricingUrlFrom(orderEndpoint), { headers: { Accept: 'application/json' } })
    .then((res) => (res.ok ? res.json() : null))
    .then(parsePricing)
    .catch(() => null);
  return pending;
}

const today = sydneyToday(new Date());
for (const el of document.querySelectorAll<HTMLElement>('[data-gst-from]')) {
  const from = el.dataset.gstFrom ?? '';
  if (from && today >= from && el.dataset.gstTextRegistered) el.textContent = el.dataset.gstTextRegistered;
}
