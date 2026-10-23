// @ts-check
// Build config for the Keystatic blog editor ONLY (SCRUM-34): `pnpm build:editor`, used by
// Dockerfile.editor. It runs on staging behind the gateway, reachable over Tailscale only.
// The public site is built from astro.config.mjs, which has none of this, so the live
// site and its image never contain /keystatic.
import { defineConfig, passthroughImageService } from 'astro/config';
import node from '@astrojs/node';
import react from '@astrojs/react';
import keystatic from '@keystatic/astro';
import site from './astro.config.mjs';

// The address the editor is opened at (Tailscale Serve, HTTPS). GitHub sends the sign-in back to
// <this>/api/keystatic/github/oauth/callback, so it must match the GitHub App's callback URL.
// Astro only trusts the gateway's X-Forwarded-* headers for this host.
const host = process.env.EDITOR_HOST ?? 'home-server.tail8bc7ae.ts.net';
const port = process.env.EDITOR_PORT ?? '8444';

export default defineConfig({
  // The same site settings as the public build (so the editor's pages and links match it).
  site: site.site,
  trailingSlash: site.trailingSlash,
  build: site.build,
  prefetch: site.prefetch,
  output: 'static', // the site pages stay prerendered; only Keystatic's routes run on demand
  outDir: './dist-editor',
  adapter: node({ mode: 'standalone' }),
  integrations: [react(), keystatic()],
  // The editor shows images from GitHub, so it doesn't need sharp at runtime.
  image: { service: passthroughImageService() },
  security: {
    checkOrigin: true,
    allowedDomains: [{ hostname: host, protocol: 'https', port }],
  },
  vite: {
    ...site.vite,
    // Bundle every dependency into the server build, so the runtime image needs no node_modules.
    ssr: { noExternal: true },
  },
});
