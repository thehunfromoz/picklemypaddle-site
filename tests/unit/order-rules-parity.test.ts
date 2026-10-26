/**
 * SCRUM-65: the site and the integrations service validate orders with the same code.
 * src/lib/order-rules.ts must be byte-identical to integrations' src/orders/rules.ts on main.
 *
 * CI always checks (it fails if GitHub can't be reached). Elsewhere the check is skipped when
 * offline. When integrations changes its rules, copy the file here in a site PR.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ACCEPTED_PHOTO_TYPES, MAX_PHOTO_BYTES, MAX_PHOTO_EDGE, MAX_REQUEST_BYTES } from '../../src/lib/order';

const UPSTREAM = 'https://raw.githubusercontent.com/thehunfromoz/picklemypaddle-integrations/main/src/orders/rules.ts';
const local = readFileSync(new URL('../../src/lib/order-rules.ts', import.meta.url), 'utf8');

describe('order rules parity with the integrations service', () => {
  it('is byte-identical to integrations src/orders/rules.ts on main', async () => {
    let upstream: string;
    try {
      const res = await fetch(UPSTREAM, { signal: AbortSignal.timeout(15_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      upstream = await res.text();
    } catch (err) {
      if (process.env.CI) throw new Error(`couldn't fetch ${UPSTREAM}: ${(err as Error).message}`);
      console.warn(`parity check skipped (offline): ${(err as Error).message}`);
      return;
    }
    expect(local, 'copy integrations src/orders/rules.ts to src/lib/order-rules.ts').toBe(upstream);
  });

  it('accepts the same photo types and limits as the server (SCRUM-66)', () => {
    expect(ACCEPTED_PHOTO_TYPES).toEqual(['image/jpeg', 'image/png', 'image/webp']);
    expect([MAX_PHOTO_BYTES, MAX_REQUEST_BYTES, MAX_PHOTO_EDGE]).toEqual([10 * 1024 * 1024, 60 * 1024 * 1024, 2560]);
  });
});
