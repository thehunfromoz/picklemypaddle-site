// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// SITE_URL drives canonical URLs, /sitemap.xml and /robots.txt (src/pages) and OG tags. The published image is
// built with the production address (ci.yml), because staging and production run the same
// image; local development sets its own in .env.
const site = process.env.SITE_URL ?? 'https://www.picklemypaddle.com';

export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'ignore',

  // Security: never inline scripts or styles, so the Content-Security-Policy
  // can stay strict (script-src 'self'; style-src 'self'). See Caddyfile.
  build: {
    inlineStylesheets: 'never',
  },

  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },

  vite: {
    plugins: [tailwindcss()],
    build: {
      assetsInlineLimit: 0,
      cssMinify: 'lightningcss',
    },
  },
});
