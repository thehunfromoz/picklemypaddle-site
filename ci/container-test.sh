#!/usr/bin/env bash
# Container tests for the site image, run by the shared image workflow
# (picklemypaddle-infra/.github/workflows/image.yml) with IMAGE=<local tag>.
#  1. the image serves the site with its security headers (full Playwright suite
#     against the container, incl. header/CSP tests that only run with BASE_URL);
#  2. builds the smoke-test image (same Playwright/axe versions) and proves it
#     passes against the container. image.yml then publishes it as
#     picklemypaddle-site-smoke:<sha> for home-server (SCRUM-17).
set -euo pipefail

docker rm -f site-under-test >/dev/null 2>&1 || true
docker run -d --name site-under-test -p 8080:80 "$IMAGE" >/dev/null
trap 'docker rm -f site-under-test >/dev/null 2>&1 || true' EXIT
for _ in $(seq 1 20); do curl -fsS http://localhost:8080/healthz >/dev/null 2>&1 && break; sleep 1; done

pnpm exec playwright install --with-deps chromium
BASE_URL=http://localhost:8080 pnpm test:e2e

ver() { node -p "JSON.parse(require('fs').readFileSync('node_modules/$1/package.json','utf8')).version"; }
docker build -q -f tests/smoke/Dockerfile -t picklemypaddle-site-smoke:test \
  --build-arg PW_VERSION="$(ver @playwright/test)" --build-arg AXE_VERSION="$(ver @axe-core/playwright)" \
  --label org.opencontainers.image.revision="${GITHUB_SHA:-dev}" . >/dev/null
docker run --rm --network host --shm-size=1g -e BASE_URL=http://127.0.0.1:8080 picklemypaddle-site-smoke:test

# ── SCRUM-34: the public image has no blog editor ─────────────────────────────
# The Keystatic editor is a separate, staging-only image (Dockerfile.editor). The public image
# must not serve it, nor carry any of its code.
for path in /keystatic /keystatic/ /api/keystatic/github/login; do
  code="$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:8080$path")"
  [ "$code" = 404 ] || { echo "public image answers $path with $code (expected 404)" >&2; exit 1; }
done
# A failure gets its own annotation naming the files: the shared workflow's summary of the last 40
# lines is cut at 4 KB, which once hid this message behind the smoke run's output.
if hits="$(docker run --rm --entrypoint sh "$IMAGE" -c 'grep -rli keystatic /srv')"; then
  echo "::error title=public image mentions Keystatic::${hits//$'\n'/, } (the blog editor is staging-only; nothing in the public site may name it)"
  echo "public image contains Keystatic code under /srv: $hits" >&2; exit 1
fi
echo "public image: no /keystatic route, no Keystatic code"

# ── SCRUM-34: the staging-only editor image ──────────────────────────────────
# Built here so image.yml can publish it (staging-extra-images) as
# picklemypaddle-site-editor:<sha> and :staging for home-server. Checked with dummy secrets:
# it starts as a non-root user, serves /keystatic, and sends GitHub sign-in back to the Tailscale
# address (from the gateway's X-Forwarded-* headers), never to a spoofed one.
docker build -q -f Dockerfile.editor -t picklemypaddle-site-editor:test \
  --label org.opencontainers.image.revision="${GITHUB_SHA:-dev}" . >/dev/null
docker rm -f editor-under-test >/dev/null 2>&1 || true
trap 'docker rm -f site-under-test editor-under-test >/dev/null 2>&1 || true' EXIT
docker run -d --name editor-under-test -p 4321:4321 --read-only --cap-drop ALL \
  --security-opt no-new-privileges \
  -e KEYSTATIC_GITHUB_CLIENT_ID=Iv1.citestclient -e KEYSTATIC_GITHUB_CLIENT_SECRET=ci-test \
  -e KEYSTATIC_SECRET="$(head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')" \
  picklemypaddle-site-editor:test >/dev/null
for _ in $(seq 1 30); do curl -fsS -o /dev/null http://localhost:4321/keystatic 2>/dev/null && break; sleep 1; done
fail() { echo "editor image: $*" >&2; docker logs --tail 20 editor-under-test >&2 || true; exit 1; }
[ "$(docker exec editor-under-test id -u)" != 0 ] || fail "runs as root"
# The page is a doctype and Keystatic's app bundle (it has no <html> tag); capture it first, since
# `curl | grep -q` can fail under pipefail when grep stops reading early.
page="$(curl -fsS http://localhost:4321/keystatic)" || fail "/keystatic doesn't answer"
grep -q 'keystatic-page' <<<"$page" || fail "/keystatic doesn't serve the editor app"
login="$(curl -s -o /dev/null -D - http://localhost:4321/api/keystatic/github/login \
  -H 'X-Forwarded-Proto: https' -H 'X-Forwarded-Host: home-server.tail8bc7ae.ts.net' -H 'X-Forwarded-Port: 8444')"
grep -qi '^location: https://github.com/login/oauth/authorize?client_id=Iv1.citestclient&redirect_uri=https%3A%2F%2Fhome-server.tail8bc7ae.ts.net%3A8444%2Fapi%2Fkeystatic%2Fgithub%2Foauth%2Fcallback' <<<"$login" ||
  fail "sign-in doesn't return to the Tailscale address: $(grep -i '^location' <<<"$login")"
spoofed="$(curl -s -o /dev/null -D - http://localhost:4321/api/keystatic/github/login \
  -H 'X-Forwarded-Proto: https' -H 'X-Forwarded-Host: evil.example')"
! grep -qi 'evil.example' <<<"$spoofed" || fail "trusted a spoofed X-Forwarded-Host"
echo "editor image: starts, serves /keystatic, sign-in returns to the Tailscale address"

# The shared workflow's Trivy step scans only the main image, so scan the editor here with the
# same rule (HIGH/CRITICAL with a fix available fails).
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy:latest image \
  --quiet --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1 picklemypaddle-site-editor:test
