/**
 * The private order status page (SCRUM-70). Reads the token from the URL fragment and asks the
 * service for the order's minimal view with a POST, so the token never appears in a URL that is
 * sent anywhere. Unknown, expired and malformed links all get the same message and the
 * "email me my links" form.
 */
import { DEFAULT_ORDER_API_URL } from '../lib/order';

interface StatusView {
  reference: string;
  statusLabel: string;
  history: { label: string; at: string }[];
  paddles: { brand: string; model: string | null }[];
  trackingNumber: string | null;
  backInPostBy: string | null;
  queuePosition: number | null;
  test: boolean;
}

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
  show('status-loading', false);
  show('status-view');
}

function invalid() {
  show('status-loading', false);
  show('status-invalid');
}

async function load() {
  const token = location.hash.slice(1);
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return invalid();
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

// A new fragment (another link pasted into the same tab) loads that order.
window.addEventListener('hashchange', () => {
  show('status-view', false);
  show('status-invalid', false);
  show('status-loading');
  void load();
});
void load();
