// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import robotsTxt from 'astro-robots-txt';

// SITE_URL is set per environment (staging: http://home-server, production:
// https://www.picklemypaddle.com). It drives canonical URLs, sitemap and OG tags.
const site = process.env.SITE_URL ?? 'https://www.picklemypaddle.com';

export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'ignore',

  integrations: [sitemap(), robotsTxt()],

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
