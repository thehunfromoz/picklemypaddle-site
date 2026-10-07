# Smoke-test image (SCRUM-17): the site's own Playwright suite, packaged so
# home-server can run it against staging after each update without installing
# Node or browsers. Built and published by CI next to the site image, tagged
# with the same commit SHA, so each site build is tested by its own tests.
#
#   docker run --rm --network host -e BASE_URL=http://127.0.0.1:8088 \
#     ghcr.io/thehunfromoz/picklemypaddle-site-smoke:<sha>
ARG PW_VERSION=1.63.0
FROM mcr.microsoft.com/playwright:v${PW_VERSION}-noble
ARG PW_VERSION
ARG AXE_VERSION=4.13.0
LABEL org.opencontainers.image.source="https://github.com/thehunfromoz/picklemypaddle-site" \
      org.opencontainers.image.description="Pickle My Paddle site smoke tests" \
      org.opencontainers.image.licenses="MIT"
WORKDIR /smoke
RUN chown pwuser:pwuser /smoke
USER pwuser
RUN npm init -y >/dev/null \
 && npm install --no-audit --no-fund --loglevel=error \
      "@playwright/test@${PW_VERSION}" "@axe-core/playwright@${AXE_VERSION}"
COPY --chown=pwuser:pwuser playwright.config.ts ./
COPY --chown=pwuser:pwuser tests/e2e ./tests/e2e
ENV CI=1
ENTRYPOINT ["npx", "playwright", "test", "--project=desktop", "--reporter=line"]
