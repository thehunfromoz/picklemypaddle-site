/** Website side of SCRUM-82: the Stripe return URL and where Pay now may send the browser. */
import { describe, expect, it } from 'vitest';
import { clubPayMemory, isCheckoutUrl, sessionIdFrom } from '../../src/lib/payment';

describe('paying from the status page', () => {
  it('reads only a real Checkout Session id from the return URL', () => {
    expect(sessionIdFrom('?session_id=cs_test_a1B2c3D4e5F6g7H8')).toBe('cs_test_a1B2c3D4e5F6g7H8');
    expect(sessionIdFrom('?session_id=cs_live_a1B2c3D4e5F6g7H8')).toBe('cs_live_a1B2c3D4e5F6g7H8');
    for (const bad of ['', '?session_id=', '?session_id={CHECKOUT_SESSION_ID}', '?session_id=pi_test_123456789012', '?session_id=cs_test_<script>']) {
      expect(sessionIdFrom(bad), bad).toBeNull();
    }
  });

  it('club invoices (SCRUM-85): only a well-formed invoice link comes back from the tab’s memory', () => {
    const token = 'a'.repeat(43);
    expect(clubPayMemory(JSON.stringify({ number: 'PMP-INV-0042', token }))).toEqual({ number: 'PMP-INV-0042', token });
    for (const bad of [null, '', 'not json', 'null', '{}', JSON.stringify({ number: 'PMP-CN-0001', token }), JSON.stringify({ number: 'PMP-INV-0042', token: 'short' }), JSON.stringify({ number: 'PMP-INV-0042', token: `${token}#x` })]) {
      expect(clubPayMemory(bad), String(bad)).toBeNull();
    }
  });

  it('sends the browser only to Stripe’s own https pages', () => {
    expect(isCheckoutUrl('https://checkout.stripe.com/c/pay/cs_test_abc')).toBe(true);
    for (const bad of ['http://checkout.stripe.com/c/pay/x', 'https://checkout.stripe.com.evil.example/x', 'https://evil.example/stripe.com', 'javascript:alert(1)', null, 42]) {
      expect(isCheckoutUrl(bad), String(bad)).toBe(false);
    }
  });
});
