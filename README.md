# picklemypaddle-site

Website for **Pickle My Paddle**, a pickleball paddle re-grit service: one scrolling landing page
(how it works, pricing, before-and-after gallery, testimonials, order form) plus About, FAQ, Clubs,
Blog, Privacy and Terms pages.

Built with Astro 7 and Tailwind CSS v4, starting from
[Small Business Starter v2](https://github.com/alancuenca/small-business-starter-v2) (MIT).
Jira epic: SCRUM-7 · Platform: SCRUM-6.

## Run it on the Mac

```bash
corepack enable          # once, provides pnpm
pnpm install             # first run creates pnpm-lock.yaml: commit it
pnpm dev                 # http://localhost:4321
```

## Edit content

| What | Where |
| --- | --- |
| Prices, how-it-works steps, nav, testimonials | `src/data/siteData.ts` |
| FAQ | `src/data/faq.ts` |
| Privacy policy / terms (drafts, need legal review) | `src/data/privacy.ts`, `src/data/terms.ts` |
| Blog posts | `src/content/blog/*.md` |
| Colours, fonts, spacing (brand C3b) | `src/styles/theme.css` |
| Photos | `src/assets/images/{hero,about,gallery}/` (see `src/config/images.ts`) |

Text written as `[To confirm: …]` is a placeholder. It shows highlighted on staging, and
`pnpm check:placeholders` (run on release) fails while any remain.

Gallery photos are paired by name: `my-paddle-before.jpg` + `my-paddle-after.jpg`.

## Tests

```bash
pnpm test:unit                         # order-form rules, pricing, gallery pairing (Vitest)
pnpm test:e2e                          # builds, then functional + accessibility tests (Playwright)
BASE_URL=http://home-server:8088 pnpm test:e2e   # same tests plus security headers, against staging
```

## Deploy

Every merge to `main` runs CI (`.github/workflows/ci.yml`): unit tests, functional and
accessibility tests, secret scan, Docker build, header/CSP tests against the container and an
image vulnerability scan. It then publishes `ghcr.io/thehunfromoz/picklemypaddle-site:staging`,
which home-server picks up automatically within about 2 minutes (see `picklemypaddle-infra/runbooks/staging-home-server.md`).

The image serves the static site with Caddy (`deploy/Caddyfile`) and sets a strict
Content-Security-Policy and other security headers. Runtime settings: `SITE_ADDRESS`,
`ORDER_API_ORIGIN`, `HSTS`.

## Before launch

- [ ] Replace every `[To confirm: …]` placeholder (`pnpm build && pnpm check:placeholders`)
- [ ] Add real photos (hero, about, at least 3 before-and-after pairs)
- [ ] `pnpm brand:og` to generate the social preview image and touch icon; commit the PNGs
- [ ] Legal review of privacy policy and terms
- [ ] Set `PUBLIC_ORDER_API_URL` once picklemypaddle-integrations is running
