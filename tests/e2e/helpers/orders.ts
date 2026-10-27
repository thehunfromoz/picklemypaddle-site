/**
 * Helpers for the order tests (SCRUM-65 to 70). Node built-ins only: the smoke-test image that
 * runs these against staging has Playwright and axe, nothing else.
 */
import { deflateSync, crc32 } from 'node:zlib';
import type { Page, Route } from '@playwright/test';

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** A real, decodable PNG of one colour (court blue by default). */
export function solidPng(width: number, height: number, rgb: [number, number, number] = [69, 101, 166]): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolour RGB
  const row = Buffer.alloc(1 + width * 3);
  for (let x = 0; x < width; x++) row.set(rgb, 1 + x * 3);
  const raw = Buffer.alloc(row.length * height);
  for (let y = 0; y < height; y++) row.copy(raw, y * row.length);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 1 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

export const pngFile = (name: string, width = 1200, height = 900) => ({ name, mimeType: 'image/png', buffer: solidPng(width, height) });

/** Width and height from a JPEG's start-of-frame marker, or null if it isn't a JPEG. */
export function jpegSize(buf: Buffer): { width: number; height: number } | null {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) return null;
    const marker = buf[i + 1]!;
    const len = buf.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + len;
  }
  return null;
}

export interface Part {
  name: string;
  filename?: string;
  type?: string;
  data: Buffer;
}

/** Splits a multipart/form-data body into its parts. */
export function parseMultipart(body: Buffer, contentType: string): Part[] {
  const boundary = /boundary=(?:"([^"]+)"|([^;]+))/.exec(contentType);
  if (!boundary) return [];
  const sep = Buffer.from(`--${boundary[1] ?? boundary[2]}`);
  const parts: Part[] = [];
  let start = body.indexOf(sep);
  while (start !== -1) {
    const next = body.indexOf(sep, start + sep.length);
    if (next === -1) break;
    const part = body.subarray(start + sep.length + 2, next - 2); // drop CRLFs around it
    const headEnd = part.indexOf('\r\n\r\n');
    const head = part.subarray(0, headEnd).toString('utf8');
    const name = /name="([^"]*)"/.exec(head)?.[1] ?? '';
    const filename = /filename="([^"]*)"/.exec(head)?.[1];
    const type = /content-type:\s*([^\r\n]+)/i.exec(head)?.[1];
    parts.push({ name, filename, type, data: part.subarray(headEnd + 4) });
    start = next;
  }
  return parts;
}

/** The same WCAG 2.2 AA rule set as the site's page-level accessibility tests. */
export const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

export const TOKEN = 'T'.repeat(20) + '_-' + 'a1'.repeat(10) + 'Z'; // 43 URL-safe characters

/** Fills in a valid order (one paddle unless more are added), without submitting. */
export async function fillOrder(page: Page, opts: { email?: string; photo?: ReturnType<typeof pngFile> } = {}) {
  await page.fill('#name', 'Test Player');
  await page.fill('#email', opts.email ?? 'player@test.picklemypaddle.com');
  await page.fill('#street', '1 Court St');
  await page.fill('#suburb', 'Sydney');
  await page.selectOption('#state', 'NSW');
  await page.fill('#postcode', '2000');
  await page.fill('#paddles-0-brand', 'Selkirk');
  await page.fill('#paddles-0-model', 'Vanguard Power Air');
  const photo = opts.photo ?? pngFile('paddle.png');
  await page.setInputFiles('#paddles-0-front', { ...photo, name: 'front.png' });
  await page.setInputFiles('#paddles-0-back', { ...photo, name: 'back.png' });
  await page.check('#consent');
  await page.check('#tournamentAck');
}

/** Stands in for the integrations service: the form-token call, and the order POST. */
export async function mockOrderApi(
  page: Page,
  opts: { open?: boolean; submit?: (route: Route) => Promise<void> } = {},
) {
  await page.route('**/api/orders/form', (route) =>
    opts.open === false
      ? route.fulfill({ status: 503, contentType: 'text/plain', body: 'Online ordering opens soon.' })
      : route.fulfill({ json: { open: true, formToken: `${Date.now()}.${'s'.repeat(43)}` } }),
  );
  await page.route('**/api/orders', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    if (opts.submit) return opts.submit(route);
    return route.fulfill({ status: 201, json: { reference: 'PMP-ABCDE', statusToken: TOKEN, test: true } });
  });
}
