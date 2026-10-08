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
