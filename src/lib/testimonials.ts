/**
 * Testimonials (SCRUM-33): real reviews only, published with the customer's permission.
 *
 * They live in one data file, src/data/testimonials.json, added by hand (by pull request) from
 * the review alerts the integrations service sends Attila. Each entry records the permission:
 * which order the review came from and when permission was given. The section shows them as
 * first name and suburb, and stays hidden until there are at least 3 (MIN_TESTIMONIALS).
 *
 * Anyone can ask for their testimonial to be removed (privacy policy): delete the entry.
 */
import data from '../data/testimonials.json';

export interface Testimonial {
  quote: string;
  firstName: string;
  suburb: string;
  /** When the review was given, YYYY-MM-DD. */
  date: string;
  permission: {
    /** Always true: an entry without permission must not be here at all. */
    given: true;
    /** When it was given, YYYY-MM-DD. */
    at: string;
    /** The order it came from, e.g. PMP-7K3QX. */
    reference: string;
  };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const REFERENCE_RE = /^PMP-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{5}$/;
const NAME_RE = /^[\p{L}][\p{L}\p{M} '’.-]*$/u;

/** Problems with the data file, one line each; an empty list means it's valid. */
export function testimonialProblems(list: unknown): string[] {
  if (!Array.isArray(list)) return ['testimonials.json must be a list'];
  const problems: string[] = [];
  list.forEach((raw, i) => {
    const t = (raw ?? {}) as Record<string, unknown>;
    const p = (t.permission ?? {}) as Record<string, unknown>;
    const at = `entry ${i + 1}`;
    if (typeof t.quote !== 'string' || t.quote.trim().length < 10 || t.quote.length > 600) problems.push(`${at}: quote must be 10 to 600 characters`);
    if (typeof t.firstName !== 'string' || !NAME_RE.test(t.firstName) || t.firstName.length > 40) problems.push(`${at}: firstName must be a first name`);
    if (typeof t.suburb !== 'string' || !NAME_RE.test(t.suburb) || t.suburb.length > 60) problems.push(`${at}: suburb must be a suburb or town`);
    if (typeof t.date !== 'string' || !DATE_RE.test(t.date)) problems.push(`${at}: date must be YYYY-MM-DD`);
    if (p.given !== true) problems.push(`${at}: permission.given must be true (no permission, no testimonial)`);
    if (typeof p.at !== 'string' || !DATE_RE.test(p.at)) problems.push(`${at}: permission.at must be YYYY-MM-DD`);
    if (typeof p.reference !== 'string' || !REFERENCE_RE.test(p.reference)) problems.push(`${at}: permission.reference must be an order reference (PMP-…)`);
    const extra = Object.keys(t).filter((k) => !['quote', 'firstName', 'suburb', 'date', 'permission'].includes(k));
    if (extra.length) problems.push(`${at}: unexpected field(s) ${extra.join(', ')} (no surnames, emails or other details)`);
  });
  return problems;
}

/** The published testimonials, newest first. The build fails if the data file is invalid. */
export function loadTestimonials(list: unknown = data): Testimonial[] {
  const problems = testimonialProblems(list);
  if (problems.length) throw new Error(`src/data/testimonials.json is invalid:\n${problems.join('\n')}`);
  return [...(list as Testimonial[])].sort((a, b) => b.date.localeCompare(a.date));
}
