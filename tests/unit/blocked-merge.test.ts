import { expect, it } from 'vitest';

// THROWAWAY (SCRUM-14): proves a failing check blocks merging. Never merge.
it('fails on purpose', () => {
  expect(1 + 1).toBe(3);
});
