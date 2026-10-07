import { describe, expect, it } from 'vitest';
import { MAX_PADDLES, regritSubtotal, validateOrder, validatePhoto, type OrderInput } from '../../src/lib/order';
import { pairGallery } from '../../src/config/images';

const photo = { name: 'face.jpg', size: 500_000, type: 'image/jpeg' };

const valid = (): OrderInput => ({
  name: 'Test Player',
  email: 'test@example.com',
  phone: '',
  street: '1 Court St',
  suburb: 'Sydney',
  state: 'NSW',
  postcode: '2000',
  consent: true,
  paddles: [{ brand: 'Any brand', front: photo, back: photo }],
});

describe('validateOrder', () => {
  it('accepts a complete order', () => {
    expect(validateOrder(valid())).toEqual({});
  });

  it('requires name, valid email, address and consent', () => {
    const e = validateOrder({ ...valid(), name: ' ', email: 'nope', street: '', suburb: '', state: 'XX', postcode: '200', consent: false });
    expect(Object.keys(e).sort()).toEqual(['consent', 'email', 'name', 'postcode', 'state', 'street', 'suburb']);
  });

  it('allows a blank phone but rejects a malformed one', () => {
    expect(validateOrder({ ...valid(), phone: '' }).phone).toBeUndefined();
    expect(validateOrder({ ...valid(), phone: '0412 345 678' }).phone).toBeUndefined();
    expect(validateOrder({ ...valid(), phone: 'abc' }).phone).toBeDefined();
  });

  it('requires at least one and at most MAX_PADDLES paddles', () => {
    expect(validateOrder({ ...valid(), paddles: [] }).paddles).toBeDefined();
    const many = Array.from({ length: MAX_PADDLES + 1 }, () => valid().paddles[0]);
    expect(validateOrder({ ...valid(), paddles: many }).paddles).toBeDefined();
  });

  it('reports paddle errors by position', () => {
    const e = validateOrder({ ...valid(), paddles: [valid().paddles[0], { brand: '', front: null, back: photo }] });
    expect(Object.keys(e).sort()).toEqual(['paddles.1.brand', 'paddles.1.front']);
  });
});

describe('validatePhoto', () => {
  it('rejects missing, wrong-type and oversized photos', () => {
    expect(validatePhoto(null, 'front')).toMatch(/Add a photo/);
    expect(validatePhoto({ ...photo, type: 'application/pdf' }, 'front')).toMatch(/JPEG/);
    expect(validatePhoto({ ...photo, size: 11 * 1024 * 1024 }, 'back')).toMatch(/10 MB/);
  });
  it('accepts HEIC from iPhones', () => {
    expect(validatePhoto({ ...photo, type: 'image/heic' }, 'front')).toBeNull();
  });
});

describe('regritSubtotal', () => {
  it('multiplies paddles by price', () => {
    expect(regritSubtotal(0, 60)).toBe(0);
    expect(regritSubtotal(3, 60)).toBe(180);
  });
  it('rejects nonsense counts', () => {
    expect(() => regritSubtotal(-1, 60)).toThrow();
    expect(() => regritSubtotal(1.5, 60)).toThrow();
  });
});

describe('pairGallery', () => {
  const img = (src: string) => ({ default: { src, width: 1, height: 1, format: 'jpg' } as never });
  it('pairs before/after files and builds captions', () => {
    const pairs = pairGallery({
      '../assets/images/gallery/club-paddle-after.jpg': img('a'),
      '../assets/images/gallery/club-paddle-before.jpg': img('b'),
      '../assets/images/gallery/random.jpg': img('c'),
    });
    expect(pairs).toHaveLength(1);
    expect(pairs[0].caption).toBe('Club Paddle');
    expect(pairs[0].before).toBeDefined();
    expect(pairs[0].after).toBeDefined();
  });
});
