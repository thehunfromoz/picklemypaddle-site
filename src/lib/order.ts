/**
 * Order form rules shared by the browser form and the unit tests.
 * The integrations service re-validates everything server-side; these
 * checks only give customers fast, friendly feedback.
 */

export const MAX_PADDLES = 10;
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // 10 MB per photo
export const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
export const AU_STATES = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'] as const;

export interface PhotoInfo {
  name: string;
  size: number;
  type: string;
}

export interface PaddleInput {
  brand: string;
  model?: string;
  front?: PhotoInfo | null;
  back?: PhotoInfo | null;
}

export interface OrderInput {
  name: string;
  email: string;
  phone?: string;
  street: string;
  suburb: string;
  state: string;
  postcode: string;
  consent: boolean;
  paddles: PaddleInput[];
}

/** Map of field key → message. Paddle keys look like `paddles.0.front`. */
export type OrderErrors = Record<string, string>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const POSTCODE_RE = /^\d{4}$/;
const PHONE_RE = /^[+\d][\d\s()-]{7,}$/;

export function validatePhoto(photo: PhotoInfo | null | undefined, label: string): string | null {
  if (!photo || photo.size === 0) return `Add a photo of the ${label} of the paddle.`;
  if (!ACCEPTED_PHOTO_TYPES.includes(photo.type.toLowerCase())) {
    return `The ${label} photo must be a JPEG, PNG, WebP or HEIC image.`;
  }
  if (photo.size > MAX_PHOTO_BYTES) return `The ${label} photo must be 10 MB or smaller.`;
  return null;
}

export function validateOrder(input: OrderInput): OrderErrors {
  const errors: OrderErrors = {};
  const text = (v: string | undefined) => (v ?? '').trim();

  if (!text(input.name)) errors.name = 'Enter your name.';
  if (!EMAIL_RE.test(text(input.email))) errors.email = 'Enter a valid email address.';
  if (text(input.phone) && !PHONE_RE.test(text(input.phone))) errors.phone = 'Enter a valid phone number, or leave it blank.';
  if (!text(input.street)) errors.street = 'Enter your street address.';
  if (!text(input.suburb)) errors.suburb = 'Enter your suburb.';
  if (!(AU_STATES as readonly string[]).includes(input.state)) errors.state = 'Choose your state or territory.';
  if (!POSTCODE_RE.test(text(input.postcode))) errors.postcode = 'Enter a 4-digit postcode.';
  if (!input.consent) errors.consent = 'Please agree so we can store your details and photos to process your order.';

  if (input.paddles.length === 0) errors.paddles = 'Add at least one paddle.';
  if (input.paddles.length > MAX_PADDLES) errors.paddles = `You can send up to ${MAX_PADDLES} paddles per order.`;

  input.paddles.forEach((p, i) => {
    if (!text(p.brand)) errors[`paddles.${i}.brand`] = 'Enter the paddle brand.';
    const front = validatePhoto(p.front, 'front');
    if (front) errors[`paddles.${i}.front`] = front;
    const back = validatePhoto(p.back, 'back');
    if (back) errors[`paddles.${i}.back`] = back;
  });

  return errors;
}

/** Re-grit cost before return postage, in whole dollars. */
export function regritSubtotal(paddleCount: number, pricePerPaddle: number): number {
  if (!Number.isInteger(paddleCount) || paddleCount < 0) throw new RangeError('paddleCount must be a whole number ≥ 0');
  return paddleCount * pricePerPaddle;
}
