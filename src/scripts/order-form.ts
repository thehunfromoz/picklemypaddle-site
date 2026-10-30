/**
 * The order form (SCRUM-29, wired to the integrations service by SCRUM-65 to 68, SCRUM-40).
 *
 *  - Paddles are added and removed in place; each keeps a stable index in its field names.
 *  - When someone first touches the form (or arrives at #order) it asks the service for a form
 *    token (GET /api/orders/form). Not on page load: a closed or absent service would put an error
 *    in the console of every page view. If it fails, ordering is closed (production until it's
 *    switched on) and the "opens soon" email notice shows.
 *  - On submit: check with the shared rules, shrink the photos, upload with progress, then show the
 *    reference and the private status link, or the server's field errors, or a friendly message.
 *    The details stay in the form whenever the order didn't go through.
 *  - Brand and model fields suggest from a curated list; free text always works.
 */
import { MAX_PHOTO_BYTES, validateOrder, type OrderErrors, type OrderInput, type PhotoInfo } from '../lib/order';
import { brandNames, matchSuggestions, modelsFor, MAX_SUGGESTIONS } from '../lib/suggest';
import { postageHint, type PricingResponse } from '../lib/pricing';
import { attachCombobox } from './combobox';
import { loadPricing } from './pricing';
import { shrinkPhoto } from './photo-resize';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null;

const form = $<HTMLFormElement>('order-form');
const list = $('paddle-list');
const tpl = $<HTMLTemplateElement>('paddle-template');
const addBtn = $<HTMLButtonElement>('add-paddle');
const estimate = $('estimate');
const postageEstimate = $('postage-estimate');
const status = $('form-status');
const closedNotice = $('ordering-closed');
const done = $('order-done');

if (form && list && tpl && addBtn && estimate && status && done) {
  const endpoint = form.dataset.endpoint ?? '';
  const contact = form.dataset.contact ?? 'sales@picklemypaddle.com';
  const price = Number(form.dataset.price);
  const max = Number(form.dataset.max);
  const submitBtn = $<HTMLButtonElement>('order-submit')!;
  const submitHint = $('submit-hint')!;
  const tokenField = form.elements.namedItem('formToken') as HTMLInputElement;
  const keyField = form.elements.namedItem('idempotencyKey') as HTMLInputElement;
  let next = 0;
  let open = false;
  /** SCRUM-81: today's postage per paddle count, fetched once ordering is known to be open. */
  let pricing: PricingResponse | null = null;
  let sending = false;

  const paddles = () => [...list.querySelectorAll<HTMLFieldSetElement>('fieldset.paddle')];

  const refresh = () => {
    const items = paddles();
    items.forEach((fs, i) => {
      fs.querySelector('.paddle-number')!.textContent = String(i + 1);
      (fs.querySelector('.remove-paddle') as HTMLElement).hidden = items.length === 1;
    });
    addBtn.hidden = items.length >= max;
    estimate.textContent = `A$${items.length * price}`;
    if (postageEstimate) postageEstimate.textContent = postageHint(pricing, items.length);
  };

  const addPaddle = (focus: boolean) => {
    const i = next++;
    const wrap = document.createElement('div');
    wrap.innerHTML = tpl.innerHTML.replaceAll('__i__', String(i)).replaceAll('__n__', String(i + 1));
    const fs = wrap.firstElementChild as HTMLFieldSetElement;
    fs.querySelector('.remove-paddle')!.addEventListener('click', () => {
      fs.remove();
      refresh();
      addBtn.focus();
    });
    list.appendChild(fs);
    const brand = fs.querySelector<HTMLInputElement>(`[name="paddles[${i}][brand]"]`)!;
    const model = fs.querySelector<HTMLInputElement>(`[name="paddles[${i}][model]"]`)!;
    attachCombobox(brand, { suggest: (text) => matchSuggestions(brandNames(), text) });
    attachCombobox(model, {
      suggest: (text, all) => {
        const models = modelsFor(brand.value);
        return all ? models.slice(0, MAX_SUGGESTIONS) : matchSuggestions(models, text);
      },
    });
    refresh();
    if (focus) brand.focus();
  };

  // Submit stays disabled until both boxes are ticked. Set here rather than in the HTML,
  // so the form still works (with validation) if this script doesn't load.
  const ticks = ['consent', 'tournamentAck'].map((id) => $<HTMLInputElement>(id)!);
  const syncSubmit = () => {
    const ready = ticks.every((t) => t.checked);
    submitBtn.disabled = !ready || sending;
    submitHint.hidden = ready;
  };
  ticks.forEach((t) => t.addEventListener('change', syncSubmit));
  syncSubmit();

  addBtn.addEventListener('click', () => addPaddle(true));
  addPaddle(false);

  const newKey = () =>
    typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');

  /** Asks the service for a fresh form token; false means ordering is closed or unreachable. */
  const fetchToken = async (): Promise<boolean> => {
    if (!endpoint) return false;
    try {
      const res = await fetch(`${endpoint}/form`, { headers: { Accept: 'application/json' }, cache: 'no-store' });
      if (!res.ok) return false;
      const data = (await res.json()) as { open?: boolean; formToken?: string };
      if (!data.open || !data.formToken) return false;
      tokenField.value = data.formToken;
      return true;
    } catch {
      return false;
    }
  };

  const setOpen = (isOpen: boolean) => {
    open = isOpen;
    if (closedNotice) closedNotice.hidden = isOpen;
    form.dataset.ordering = isOpen ? 'open' : 'closed';
  };

  const photoFile = (input: HTMLInputElement | null) => input?.files?.[0] ?? null;
  const info = (f: File | null): PhotoInfo | null => (f ? { name: f.name, size: f.size, type: f.type } : null);

  const collect = (): { input: OrderInput; idx: string[] } => {
    const v = (n: string) => (form.elements.namedItem(n) as HTMLInputElement | null)?.value ?? '';
    const items = paddles();
    return {
      idx: items.map((fs) => fs.dataset.index!),
      input: {
        name: v('name'),
        email: v('email'),
        phone: v('phone'),
        street: v('street'),
        suburb: v('suburb'),
        state: v('state'),
        postcode: v('postcode'),
        consent: ticks[0]!.checked,
        tournamentAck: ticks[1]!.checked,
        paddles: items.map((fs) => {
          const i = fs.dataset.index!;
          return {
            brand: (fs.querySelector(`[name="paddles[${i}][brand]"]`) as HTMLInputElement).value,
            model: (fs.querySelector(`[name="paddles[${i}][model]"]`) as HTMLInputElement).value,
            front: info(photoFile(fs.querySelector(`[name="paddles[${i}][front]"]`))),
            back: info(photoFile(fs.querySelector(`[name="paddles[${i}][back]"]`))),
          };
        }),
      },
    };
  };

  const showErrors = (errors: OrderErrors, idx: string[]) => {
    form.querySelectorAll<HTMLElement>('[id$="-error"]').forEach((p) => {
      p.hidden = true;
      p.textContent = '';
    });
    form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
    let first: HTMLElement | null = null;
    for (const [key, msg] of Object.entries(errors)) {
      // paddles.<position>.<field> → element ids use the stable data-index
      const id = key.startsWith('paddles.')
        ? (() => {
            const [, pos, f] = key.split('.');
            return f ? `paddles-${idx[Number(pos)]}-${f}` : 'paddles';
          })()
        : key;
      const p = $(`${id}-error`);
      if (p) {
        p.textContent = msg;
        p.hidden = false;
      }
      const input = $(id);
      if (input) {
        input.setAttribute('aria-invalid', 'true');
        first ??= input;
      }
    }
    first?.focus();
  };

  const say = (msg: string, ok: boolean, html?: (el: HTMLElement) => void) => {
    status.className = `rounded-md p-4 text-sm ${ok ? 'bg-tint-green' : 'bg-tint-blue'}`;
    status.textContent = msg;
    html?.(status);
  };

  /** "…email us at sales@…" with a real link, built without innerHTML. */
  const withEmail = (before: string, after = '.') => (el: HTMLElement) => {
    el.textContent = before;
    const a = document.createElement('a');
    a.href = `mailto:${contact}`;
    a.className = 'font-semibold text-primary underline';
    a.textContent = contact;
    el.append(a, after);
  };

  type Reply = { status: number; data: Record<string, unknown> };

  /** XMLHttpRequest rather than fetch: it reports upload progress. */
  const upload = (body: FormData, onProgress: (pct: number) => void): Promise<Reply> =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', endpoint);
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.timeout = 120_000;
      xhr.upload.addEventListener('progress', (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100)));
      xhr.addEventListener('load', () => {
        let data: Record<string, unknown> = {};
        try {
          data = JSON.parse(xhr.responseText || '{}') as Record<string, unknown>;
        } catch {
          // not JSON (a gateway error page): handled by status below
        }
        resolve({ status: xhr.status, data });
      });
      xhr.addEventListener('error', () => reject(new Error('network')));
      xhr.addEventListener('timeout', () => reject(new Error('timeout')));
      xhr.send(body);
    });

  const showDone = (reference: string, token: string, test: boolean) => {
    const link = `/order/status#${token}`;
    $('done-reference')!.textContent = reference;
    const a = $<HTMLAnchorElement>('done-status-link')!;
    a.href = link;
    a.textContent = `${location.origin}${link}`;
    $('done-test')!.hidden = !test;
    form.hidden = true;
    done.hidden = false;
    $('done-heading')!.focus();
  };

  const resetForAnother = async () => {
    form.reset();
    list.innerHTML = '';
    addPaddle(false);
    showErrors({}, []);
    status.className = 'hidden';
    status.textContent = '';
    keyField.value = newKey();
    syncSubmit();
    done.hidden = true;
    form.hidden = false;
    setOpen(await fetchToken());
    $('name')?.focus();
  };
  $('order-another')?.addEventListener('click', () => void resetForAnother());

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (sending) return;
    const { input, idx } = collect();
    const errors = validateOrder(input);
    showErrors(errors, idx);
    if (Object.keys(errors).length > 0) {
      say(`Please fix ${Object.keys(errors).length} item(s) highlighted below.`, false);
      return;
    }
    await ensureProbe();
    if (!open) {
      say('', false, withEmail('Thanks! Online ordering opens soon. In the meantime, please email ', '.'));
      return;
    }

    sending = true;
    syncSubmit();
    try {
      say('Preparing your photos…', true);
      const body = new FormData();
      for (const name of ['name', 'email', 'phone', 'street', 'suburb', 'state', 'postcode', 'website', 'formToken', 'idempotencyKey']) {
        body.set(name, (form.elements.namedItem(name) as HTMLInputElement | null)?.value ?? '');
      }
      body.set('consent', ticks[0]!.checked ? 'yes' : '');
      body.set('tournamentAck', ticks[1]!.checked ? 'yes' : '');
      const shrinkErrors: OrderErrors = {};
      for (const [pos, i] of idx.entries()) {
        const fs = list.querySelector(`fieldset.paddle[data-index="${i}"]`)!;
        body.set(`paddles[${i}][brand]`, (fs.querySelector(`[name="paddles[${i}][brand]"]`) as HTMLInputElement).value);
        body.set(`paddles[${i}][model]`, (fs.querySelector(`[name="paddles[${i}][model]"]`) as HTMLInputElement).value);
        for (const side of ['front', 'back'] as const) {
          const original = photoFile(fs.querySelector(`[name="paddles[${i}][${side}]"]`))!;
          const small = await shrinkPhoto(original);
          if (small.size > MAX_PHOTO_BYTES) shrinkErrors[`paddles.${pos}.${side}`] = `The ${side} photo must be 10 MB or smaller.`;
          body.set(`paddles[${i}][${side}]`, small, small.name);
        }
      }
      if (Object.keys(shrinkErrors).length > 0) {
        showErrors(shrinkErrors, idx);
        say(`Please fix ${Object.keys(shrinkErrors).length} item(s) highlighted below.`, false);
        return;
      }

      say('Uploading photos…', true);
      const reply = await upload(body, (pct) => say(`Uploading photos… ${pct}%`, true));
      const d = reply.data;
      if (reply.status === 201 && typeof d.reference === 'string' && typeof d.statusToken === 'string') {
        showDone(d.reference, d.statusToken, d.test === true);
        return;
      }
      if (reply.status === 400 && d.errors && typeof d.errors === 'object') {
        const errs = d.errors as OrderErrors;
        if (errs.form) {
          setOpen(await fetchToken());
          say(errs.form, false);
          return;
        }
        showErrors(errs, idx);
        say(`Please fix ${Object.keys(errs).length} item(s) highlighted below.`, false);
        return;
      }
      if ((reply.status === 429 || reply.status === 413) && typeof d.message === 'string') {
        say(d.message, false);
        return;
      }
      if (reply.status === 503) {
        // Ordering was switched off (production's gateway) while the page was open.
        setOpen(false);
        say('', false, withEmail('Sorry, online ordering isn’t open yet. Your details are still here; please email ', ' and we’ll take your order that way.'));
        return;
      }
      throw new Error(String(reply.status));
    } catch {
      // Network trouble, a closed or broken service: keep everything they typed, offer email.
      say('', false, withEmail('Sorry, we couldn’t send your order just now. Your details are still here, so please try again in a moment, or email ', '.'));
    } finally {
      sending = false;
      syncSubmit();
    }
  });

  // Ask once, on first interest; every later ask (after an order, a stale token) is explicit.
  let probe: Promise<void> | null = null;
  const ensureProbe = () =>
    (probe ??= fetchToken()
      .then(setOpen)
      // Only once the service answers (never on page load, never while ordering is closed).
      .then(() => (open ? loadPricing(endpoint) : null))
      .then((p) => {
        pricing = p;
        refresh();
      }));
  form.addEventListener('focusin', () => void ensureProbe(), { once: true });
  form.addEventListener('pointerdown', () => void ensureProbe(), { once: true });
  const atOrder = () => location.hash === '#order' && void ensureProbe();
  window.addEventListener('hashchange', atOrder);
  atOrder();

  keyField.value = newKey();
  form.dataset.ordering = 'unknown';
}
