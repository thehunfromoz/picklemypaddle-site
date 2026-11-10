/**
 * The Clubs page's "Talk to us about your club" form (SCRUM-93). The same rules as the integrations
 * service (`src/clubs/leads.ts`), so a mistake shows beside the field before anything is sent; the
 * service checks again and has the last word. Nothing about members or a street address is asked for.
 */
/** Relative, so one image serves staging, the tailnet and production (like the order form). */
export const CLUB_LEAD_API_URL = '/api/clubs/lead';

export const LEAD_FIELDS = ['clubName', 'suburb', 'postcode', 'contactName', 'contactEmail', 'contactPhone', 'memberCount', 'message', 'preferredTimes'] as const;
export type LeadField = (typeof LEAD_FIELDS)[number];
export type LeadValues = Partial<Record<LeadField, string>>;
export type LeadErrors = Partial<Record<LeadField | 'form', string>>;

export const MAX_MESSAGE = 2000;
export const MAX_PREFERRED_TIMES = 300;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9 +()\-.]{6,25}$/;

export function validateLeadForm(v: LeadValues): LeadErrors {
  const t = (k: LeadField) => (v[k] ?? '').trim();
  const errors: LeadErrors = {};
  if (!t('clubName') || t('clubName').length > 120) errors.clubName = 'Tell us the club’s name (up to 120 characters).';
  if (!t('suburb') || t('suburb').length > 80) errors.suburb = 'Tell us the suburb (up to 80 characters).';
  if (!/^\d{4}$/.test(t('postcode').replace(/\s+/g, ''))) errors.postcode = 'Enter the 4-digit postcode of the club’s venue.';
  if (!t('contactName') || t('contactName').length > 120) errors.contactName = 'Tell us your name (up to 120 characters).';
  if (!EMAIL_RE.test(t('contactEmail')) || t('contactEmail').length > 254) errors.contactEmail = 'Enter a valid email address.';
  if (t('contactPhone') && !PHONE_RE.test(t('contactPhone'))) errors.contactPhone = 'Enter a phone number, or leave it empty.';
  const n = /^\d{1,6}$/.test(t('memberCount')) ? Number(t('memberCount')) : NaN;
  if (!(n >= 1 && n <= 100_000)) errors.memberCount = 'Roughly how many members play? A number, like 40.';
  if (t('message').length > MAX_MESSAGE) errors.message = `Your message can be up to ${MAX_MESSAGE} characters.`;
  if (t('preferredTimes').length > MAX_PREFERRED_TIMES) errors.preferredTimes = `Up to ${MAX_PREFERRED_TIMES} characters, please.`;
  return errors;
}

/** What the service sent back: field errors to show, or a plain message, or nothing useful. */
export function readLeadErrors(status: number, body: unknown): { errors: LeadErrors; message: string } {
  const b = (body && typeof body === 'object' ? body : {}) as { errors?: Record<string, unknown>; message?: unknown };
  const errors: LeadErrors = {};
  for (const [k, msg] of Object.entries(b.errors ?? {})) {
    if (typeof msg === 'string' && ([...LEAD_FIELDS, 'form'] as string[]).includes(k)) errors[k as LeadField | 'form'] = msg;
  }
  if (Object.keys(errors).length) return { errors, message: '' };
  if (status === 429) return { errors: {}, message: typeof b.message === 'string' ? b.message : 'We’ve had a lot of requests from you. Please try again later.' };
  return { errors: {}, message: 'We couldn’t send that just now. Please try again in a minute, or email us.' };
}
