import { getViteConfig } from 'astro/config';
import type { ViteUserConfig } from 'vitest/config';

// getViteConfig lets unit tests render .astro components with Astro's container (SCRUM-33).
// The settings are typed with Vitest's own config type: Astro's copy of Vite's types doesn't
// know about `test`, so they're passed through with a cast.
const config: ViteUserConfig = {
  test: {
    include: ['tests/unit/**/*.test.ts'],
  },
};

export default getViteConfig(config as Parameters<typeof getViteConfig>[0]);
