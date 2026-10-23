# picklemypaddle-site

Website for **PickleMyPaddle**, a pickleball paddle re-grit service: one scrolling landing page
(how it works, pricing, before-and-after gallery, testimonials, order form) plus About, FAQ, Clubs,
Blog, Privacy and Terms pages.

Built with Astro 7 and Tailwind CSS v4, starting from
[Small Business Starter v2](https://github.com/alancuenca/small-business-starter-v2) (MIT).
Jira epic: SCRUM-7 · Platform: SCRUM-6.

## Run it on the Mac

```bash
npm install --global pnpm@10.18.0   # once (Node 25+ has no corepack; on Node 22-24 `corepack enable` also works)
pnpm install             # first run creates pnpm-lock.yaml: commit it
pnpm dev                 # http://localhost:4321
```

## Edit content

| What | Where |
| --- | --- |
| Prices, how-it-works steps, nav, testimonials | `src/data/siteData.ts` |
| FAQ | `src/data/faq.ts` |
| Privacy policy / terms (drafts, need legal review) | `src/data/privacy.ts`, `src/data/terms.ts` |
| Blog posts | `src/content/blog/<lang>/<slug>.md` (only `en/` today), or the blog editor below |
| Colours, fonts, spacing (brand C3b) | `src/styles/theme.css` |
| Photos | `src/assets/images/{hero,about,gallery}/` (see `src/config/images.ts`) |

Text written as `[To confirm: …]` is a placeholder. It shows highlighted on staging, and
`pnpm check:placeholders` (run on release) fails while any remain.

Gallery photos are paired by name: `my-paddle-before.jpg` + `my-paddle-after.jpg`.

### Blog editor (Keystatic, staging only; SCRUM-34)

Write posts in a browser from any device on the tailnet:
**https://home-server.tail8bc7ae.ts.net:8444/keystatic**, signed in with GitHub.

- Saving works on a `blog/…` branch (`main` is protected). When a post is ready, open a pull
  request from the editor; CI checks it, and merging publishes it to staging (and to production
  with the next release).
- Fields: title (and the web address made from it), short SEO title, summary (70 to 160
  characters, the search-result description), date, author, tags, optional cover image (its
  alt text is required; the build fails without it), draft, body. The body's headings start at
  Heading 2: the title is the page's only top-level heading.
- English posts are at `/blog/<slug>`, as before. Languages are listed in
  `src/config/i18n.ts`; adding one gives it `src/content/blog/<lang>/`, its own editor
  collection, and `/<lang>/blog/<slug>` pages with `hreflang` links between translations.
- The feed is `/rss.xml`.
- The editor is a separate image (`Dockerfile.editor`, `pnpm build:editor`), built from
  `astro.editor.config.mjs` and `keystatic.config.ts`. The public build (`astro.config.mjs`)
  never includes it, and CI fails if the public image answers `/keystatic`. How it runs on
  staging, and how to set up its GitHub App: `picklemypaddle-infra/runbooks/staging-home-server.md`.

## Tests

```bash
pnpm test:unit                         # order-form rules, pricing, gallery pairing (Vitest)
pnpm test:e2e                          # builds, then functional + accessibility tests (Playwright)
BASE_URL=http://home-server:8088 pnpm test:e2e   # same tests plus security headers, against staging
```

## Search and sharing

Titles are `<page> · PickleMyPaddle` (60 characters at most; a blog post can set `seoTitle` in its front
matter) and every page has its own 70 to 160 character description. `/sitemap.xml` and `/robots.txt` are
generated from `SITE_URL` (`src/pages/sitemap.xml.ts`, `robots.txt.ts`) and a new page is listed
automatically. Structured data (Organization and Service on the home page, FAQPage from `src/data/faq.ts`)
is built in `src/lib/schema.ts`, typed with schema-dts so `pnpm check` rejects properties schema.org does
not have. `tests/e2e/seo.spec.ts` checks all of it. Staging is kept out of search by its gateway, not by
this image: see the infra repo.

## Performance budget

`pnpm check:lighthouse` audits the built site (`dist/`, so run `pnpm build` first or let it build) in
Lighthouse's mobile emulation and fails if the median of three runs breaks `lighthouse-budget.json`:
Performance ≥90, Accessibility 100, Best practices ≥95, SEO ≥95, LCP <2.5 s, CLS <0.1, and on `/`
under 50 KB of JavaScript and under 1 MB in total. It also caps the page structure (at most 2
render-blocking requests, 20 requests, nothing from another origin, fonts with `font-display`,
responsive images), which a score alone does not show. CI runs it on every pull request; on failure the
full HTML reports are attached to the run as the `report` artifact.

```bash
pnpm check:lighthouse                         # all pages, 3 runs each
pnpm check:lighthouse --runs=1 --only=/,/faq  # a quicker look
```

It needs Node 22.19 or newer (Lighthouse 13). A score cannot see script-gated behaviour such as a menu
that only works once JavaScript has loaded (SCRUM-39); `tests/e2e/mobile-menu.spec.ts` guards that.

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
