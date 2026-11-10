/**
 * The Clubs page's "Talk to us" form (SCRUM-93). On first touch it asks the service for a form
 * token (GET <endpoint>/form), like the order form: not on page load, so a closed or absent service
 * doesn't put an error in the console of every page view. If that fails the email notice shows.
 * On submit: check with the shared rules, post JSON, then say thanks or show the service's errors.
 */
import { LEAD_FIELDS, readLeadErrors, validateLeadForm, type LeadErrors, type LeadField, type LeadValues } from '../lib/club-lead';

const form = document.getElementById('club-lead-form') as HTMLFormElement | null;
const status = document.getElementById('club-lead-status');
const done = document.getElementById('club-lead-done');
const closed = document.getElementById('club-lead-closed');
const submit = document.getElementById('club-lead-submit') as HTMLButtonElement | null;

if (form && status && done && submit) {
  const endpoint = form.dataset.endpoint ?? '';
  const tokenField = form.elements.namedItem('formToken') as HTMLInputElement;
  const honeypot = form.elements.namedItem('website') as HTMLInputElement;
  let token = false;
  let sending = false;

  const value = (name: string) => (form.elements.namedItem(name) as HTMLInputElement | null)?.value ?? '';

  const fetchToken = async (): Promise<boolean> => {
    if (token) return true;
    if (!endpoint) return false;
    try {
      const res = await fetch(`${endpoint}/form`, { headers: { Accept: 'application/json' }, cache: 'no-store' });
      if (!res.ok) return false;
      const data = (await res.json()) as { open?: boolean; formToken?: string };
      if (!data.open || !data.formToken) return false;
      tokenField.value = data.formToken;
      token = true;
      return true;
    } catch {
      return false;
    }
  };

  const showErrors = (errors: LeadErrors) => {
    let first: HTMLElement | null = null;
    for (const f of LEAD_FIELDS) {
      const p = document.getElementById(`${f}-error`)!;
      const input = form.elements.namedItem(f) as HTMLElement;
      const msg = errors[f];
      p.textContent = msg ?? '';
      p.hidden = !msg;
      if (msg) {
        input.setAttribute('aria-invalid', 'true');
        first ??= input;
      } else input.removeAttribute('aria-invalid');
    }
    first?.focus();
  };

  const say = (text: string, kind: 'error' | 'info') => {
    status.textContent = text;
    status.className = `rounded-md p-4 text-sm ${kind === 'error' ? 'border border-[#A12B2B] text-[#A12B2B]' : 'bg-tint-blue'}`;
    status.hidden = !text;
    if (!text) status.className = 'hidden';
  };

  const ensureOpen = async () => {
    if (await fetchToken()) return true;
    if (closed) closed.hidden = false;
    form.hidden = true;
    return false;
  };
  // Once the suburb and postcode are in, say which way batches will travel. Only a default, and
  // never blocks sending. The suburb list loads on first use, so it isn't in the page's first load.
  const areaNote = document.getElementById('service-area-note');
  let areaRun = 0;
  const updateAreaNote = async () => {
    if (!areaNote) return;
    const suburb = value('suburb').trim();
    const postcode = value('postcode').replace(/\s+/g, '');
    if (!suburb || !/^\d{4}$/.test(postcode)) {
      areaNote.hidden = true;
      return;
    }
    const run = ++areaRun;
    const { isInServiceArea } = await import('../lib/service-area');
    if (run !== areaRun) return;
    const inside = isInServiceArea({ suburb, postcode });
    areaNote.textContent = inside ? 'Great, you’re in our local pickup area.' : 'You’re outside our local pickup area, so we’ll use post for your batches.';
    areaNote.className = `text-sm font-semibold ${inside ? 'text-green-text' : 'text-text'}`;
    areaNote.hidden = false;
  };
  form.addEventListener('input', (e) => {
    const name = (e.target as HTMLInputElement | null)?.name;
    if (name === 'suburb' || name === 'postcode') void updateAreaNote();
  });
  form.addEventListener('focusin', () => void ensureOpen(), { once: true });
  if (location.hash === '#club-lead') void ensureOpen();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (sending) return;
    say('', 'info');
    const values: LeadValues = Object.fromEntries(LEAD_FIELDS.map((f: LeadField) => [f, value(f)]));
    const errors = validateLeadForm(values);
    showErrors(errors);
    if (Object.keys(errors).length) return;
    if (!(await ensureOpen())) return;
    sending = true;
    submit.disabled = true;
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ ...values, formToken: tokenField.value, website: honeypot.value }),
      });
      if (res.status === 201) {
        form.hidden = true;
        done.hidden = false;
        return;
      }
      const body = await res.json().catch(() => null);
      const read = readLeadErrors(res.status, body);
      showErrors(read.errors);
      if (read.errors.form) {
        say(read.errors.form, 'error');
        token = false; // a stale form token: ask for a fresh one next time
        tokenField.value = '';
        await fetchToken();
      } else if (read.message) say(read.message, 'error');
    } catch {
      say('We couldn’t send that just now. Please try again in a minute, or email us.', 'error');
    } finally {
      sending = false;
      submit.disabled = false;
    }
  });
}
