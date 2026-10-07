# syntax=docker/dockerfile:1.7
# ── Build ────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
RUN if [ -f pnpm-lock.yaml ]; then pnpm install --frozen-lockfile; else pnpm install; fi
COPY . .
ARG SITE_URL=http://home-server
ARG PUBLIC_ORDER_API_URL=
ENV SITE_URL=${SITE_URL} PUBLIC_ORDER_API_URL=${PUBLIC_ORDER_API_URL}
RUN pnpm build

# ── Serve ────────────────────────────────────────────────────────────────────
FROM caddy:2-alpine
LABEL org.opencontainers.image.source="https://github.com/thehunfromoz/picklemypaddle-site" \
      org.opencontainers.image.licenses="MIT"
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
# Runtime settings (see deploy/Caddyfile):
#   SITE_ADDRESS  ":80" on staging, "www.picklemypaddle.com" in production (auto HTTPS)
#   ORDER_API_ORIGIN  origin of the integrations service, allowed in connect-src
#   HSTS  "max-age=31536000; includeSubDomains" in production; "max-age=0" on
#         plain-HTTP staging (browsers ignore HSTS over HTTP anyway)
ENV SITE_ADDRESS=":80" ORDER_API_ORIGIN="" HSTS="max-age=0"
EXPOSE 80 443
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -qO- http://127.0.0.1/healthz || exit 1
