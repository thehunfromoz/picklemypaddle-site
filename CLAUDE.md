# picklemypaddle-site

Astro 7 + Tailwind v4 static site, served by Caddy. How we work, and the rules for every repo:
`../picklemypaddle-infra/docs/working-with-claude.md`. Which tests guard what:
`../picklemypaddle-infra/docs/qa-gates.md`. Product decisions are in this repo's `README.md`.

## Checks (the same as CI, in this order)

```bash
pnpm install --frozen-lockfile
pnpm lint && pnpm check && pnpm test:unit && pnpm test:e2e && pnpm check:lighthouse && pnpm check:secrets && pnpm check:links
```

`pnpm check:placeholders` must pass before a release (not for merging). The image build, container
test and Trivy scan run in CI; on the Mac `docker build .` works for a quick check, but the image is
built for home-server's amd64 in CI.

## Rules for this repo

- **Strict CSP:** no inline scripts, no third-party origins (fonts are self-hosted). A new page needs
  the CSP and axe checks in its e2e spec.
- Staging-only behaviour lives in the infra gateway (`/env.css`), never in the build.
- `src/lib/service-area.ts` and `service-area-suburbs.json` are OWNED here and copied byte-for-byte into
  integrations `src/clubs/` (its parity test checks against this repo's `main`): change them here first.
- `src/lib/order-rules.ts` is a byte-identical copy of integrations `src/orders/rules.ts`; the parity
  test compares it with integrations `main`, so merge the integrations change first.
- Copy: Claude drafts, Attila approves on staging; unknown facts are `[To confirm: …]`.
- `pnpm-workspace.yaml` keeps a 3-day `minimumReleaseAge`; don't remove it (Dependabot, SCRUM-59).
