/**
 * The private order status page (SCRUM-70). Reads the token from the URL fragment and asks the
 * service for the order's minimal view with a POST, so the token never appears in a URL that is
 * sent anywhere. Unknown, expired and malformed links all get the same message and the
 * "email me my links" form.
 */
import { DEFAULT_ORDER_API_URL } from '../lib/order';

interface StatusView {
  reference: string;
  status: string;
  statusLabel: string;
  history: { label: string; at: string }[];
  paddles: { brand: string; model: string | null }[];
  trackingNumber: string | null;
  backInPostBy: string | null;
  queuePosition: number | null;
  test: boolean;
  /** SCRUM-33: 'open' once posted back, 'received' once reviewed, null before. */
  review?: 'open' | 'received' | null;
}

/** The token of the order on screen (needed to send a review). */
let currentToken = '';

const api = DEFAULT_ORDER_API_URL;
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null;
const show = (id: string, on = true) => {
  const el = $(id);
  if (el) el.hidden = !on;
};

const when = (iso: string) =>
  new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Australia/Sydney' }).format(new Date(iso));
const day = (iso: string) =>
  new Intl.DateTimeFormat('en-AU', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Australia/Sydney' }).format(new Date(iso));

function render(v: StatusView) {
  $('status-reference')!.textContent = v.reference;
  $('status-label')!.textContent = v.statusLabel;
  show('status-test', v.test);
  // While the photos are still being checked, say when they'll hear from us (the confirmation
  // screen says the same).
  show('status-next', v.status === 'submitted');
  if (v.backInPostBy) {
    const eta = $('status-eta')!;
    eta.textContent = `Back in the post by ${day(v.backInPostBy)}${v.queuePosition ? ` (number ${v.queuePosition} in the queue)` : ''}.`;
    eta.hidden = false;
  }
  if (v.trackingNumber) {
    const t = $('status-tracking')!;
    t.textContent = `Tracking number: ${v.trackingNumber}`;
    t.hidden = false;
  }
  $('status-paddles')!.replaceChildren(
    ...v.paddles.map((p) => {
      const li = document.createElement('li');
      li.textContent = p.model ? `${p.brand} ${p.model}` : p.brand;
      return li;
    }),
  );
  $('status-history')!.replaceChildren(
    ...v.history.map((h) => {
      const li = document.createElement('li');
      const time = document.createElement('time');
      time.dateTime = h.at;
      time.className = 'text-sm text-text-muted';
      time.textContent = when(h.at);
      li.append(time, ` ${h.label}`);
      return li;
    }),
  );
  show('review', v.review === 'open');
  show('review-thanks', v.review === 'received');
  show('status-loading', false);
  show('status-view');
  // From the Posted back email's "Leave a short review" link.
  if (v.review === 'open' && new URLSearchParams(location.search).has('review')) {
    const heading = $('review-heading');
    heading?.scrollIntoView({ block: 'start' });
    heading?.focus({ preventScroll: true });
  }
}

function invalid() {
  show('status-loading', false);
  show('status-view', false);
  show('status-invalid');
}

async function load() {
  const token = location.hash.slice(1);
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return invalid();
  currentToken = token;
  try {
    const res = await fetch(`${api}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ token }),
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
    });
    if (!res.ok) return invalid();
    render((await res.json()) as StatusView);
  } catch {
    invalid();
  }
}

const linksForm = $<HTMLFormElement>('links-form');
linksForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = $<HTMLInputElement>('links-email')!;
  const err = $('links-email-error')!;
  const out = $('links-status')!;
  const email = input.value.trim();
  err.hidden = true;
  input.removeAttribute('aria-invalid');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    err.textContent = 'Enter a valid email address.';
    err.hidden = false;
    input.setAttribute('aria-invalid', 'true');
    input.focus();
    return;
  }
  out.textContent = 'Sending…';
  try {
    const res = await fetch(`${api}/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email }),
      referrerPolicy: 'no-referrer',
    });
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    out.textContent =
      res.ok || res.status === 429
        ? (data.message ?? 'If we have orders for that address, we’ve emailed the links.')
        : 'Sorry, that didn’t work. Please email us with your order reference.';
  } catch {
    out.textContent = 'Sorry, that didn’t work. Please email us with your order reference.';
  }
});

// ── Review (SCRUM-33) ─────────────────────────────────────────────────────────

const REVIEW_FIELDS = { quote: 'review-quote', firstName: 'review-first-name', suburb: 'review-suburb', permission: 'review-permission' } as const;
type ReviewField = keyof typeof REVIEW_FIELDS;
const NAME_RE = /^[\p{L}][\p{L}\p{M} '’.-]*$/u;

function reviewErrors(errors: Partial<Record<ReviewField, string>>) {
  let first: HTMLElement | null = null;
  for (const [field, id] of Object.entries(REVIEW_FIELDS) as [ReviewField, string][]) {
    const msg = errors[field];
    const err = $(`${id}-error`);
    const input = field === 'permission' ? document.querySelector<HTMLInputElement>('#review-form input[name=permission]') : $(id);
    if (err) {
      err.textContent = msg ?? '';
      err.hidden = !msg;
    }
    if (msg) input?.setAttribute('aria-invalid', 'true');
    else input?.removeAttribute('aria-invalid');
    if (msg && !first) first = input;
  }
  first?.focus();
}

function reviewDone() {
  show('review', false);
  show('review-thanks');
  $('review-thanks')?.focus();
}

$<HTMLFormElement>('review-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.currentTarget as HTMLFormElement;
  const out = $('review-status')!;
  const data = new FormData(form);
  const quote = String(data.get('quote') ?? '').trim();
  const firstName = String(data.get('firstName') ?? '').trim();
  const suburb = String(data.get('suburb') ?? '').trim();
  const choice = data.get('permission');
  const errors: Partial<Record<ReviewField, string>> = {};
  if (quote.length < 10) errors.quote = 'Tell us a little more (a sentence or two).';
  if (!firstName) errors.firstName = 'Enter your first name.';
  else if (!NAME_RE.test(firstName)) errors.firstName = 'Enter just your first name.';
  if (!suburb) errors.suburb = 'Enter your suburb or town.';
  else if (!NAME_RE.test(suburb)) errors.suburb = 'Enter just your suburb or town.';
  if (choice !== 'yes' && choice !== 'no') errors.permission = 'Choose whether we may quote you.';
  reviewErrors(errors);
  if (Object.keys(errors).length) return;

  out.textContent = 'Sending…';
  try {
    const res = await fetch(`${api}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ token: currentToken, quote, firstName, suburb, permission: choice === 'yes' }),
      referrerPolicy: 'no-referrer',
    });
    const reply = (await res.json().catch(() => ({}))) as { errors?: Partial<Record<ReviewField, string>>; error?: string; message?: string };
    if (res.status === 201 || reply.error === 'already_received') {
      out.textContent = '';
      return reviewDone();
    }
    if (res.status === 400 && reply.errors) {
      out.textContent = '';
      return reviewErrors(reply.errors);
    }
    if (res.status === 404) return invalid();
    out.textContent = reply.message ?? 'Sorry, that didn’t work. Please try again, or email us your review.';
  } catch {
    out.textContent = 'Sorry, that didn’t work. Please try again, or email us your review.';
  }
});

// A new fragment (another link pasted into the same tab) loads that order.
window.addEventListener('hashchange', () => {
  show('status-view', false);
  show('review', false);
  show('review-thanks', false);
  show('status-invalid', false);
  show('status-loading');
  void load();
});
void load();
