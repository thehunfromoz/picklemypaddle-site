# syntax=docker/dockerfile:1.7
# ── Build ────────────────────────────────────────────────────────────────────
FROM node:26-alpine AS build
WORKDIR /app
# Node 26 no longer ships corepack, so pnpm is installed directly. Keep the version equal to
# "packageManager" in package.json (pnpm refuses to run on a mismatch).
RUN npm install --global pnpm@10.18.0
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
RUN if [ -f pnpm-lock.yaml ]; then pnpm install --frozen-lockfile; else pnpm install; fi
COPY . .
# Baked into canonical links, og:url, the sitemap and robots.txt. The same image runs on staging
# and production, so this is the production address (CI passes it too).
ARG SITE_URL=https://www.picklemypaddle.com
ARG PUBLIC_ORDER_API_URL=
ENV SITE_URL=${SITE_URL} PUBLIC_ORDER_API_URL=${PUBLIC_ORDER_API_URL}
RUN pnpm build

# ── Serve ────────────────────────────────────────────────────────────────────
FROM caddy:2-alpine
LABEL org.opencontainers.image.source="https://github.com/thehunfromoz/picklemypaddle-site" \
      org.opencontainers.image.licenses="MIT"
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
# Which commit is live: http://<host>/version.txt (set by CI; "dev" for local builds).
ARG GIT_SHA=dev
RUN printf '%s\n' "$GIT_SHA" > /srv/version.txt
# Runtime settings (see deploy/Caddyfile):
#   SITE_ADDRESS  ":80" on staging, "www.picklemypaddle.com" in production (auto HTTPS)
#   ORDER_API_ORIGIN  origin of the integrations service, allowed in connect-src
#   HSTS  "max-age=31536000; includeSubDomains" in production; "max-age=0" on
#         plain-HTTP staging (browsers ignore HSTS over HTTP anyway)
ENV SITE_ADDRESS=":80" ORDER_API_ORIGIN="" HSTS="max-age=0"
EXPOSE 80 443
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -qO- http://127.0.0.1/healthz || exit 1
