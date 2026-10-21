import { test, expect, type Page, type Route } from '@playwright/test';

// SCRUM-39: on 12 Oct the hamburger did nothing for about a minute on a slow phone connection.
// The drawer could only be opened by a deferred module script, and that script cannot run until
// every earlier request (both stylesheets, the prefetch script, itself) has finished, so a single
// slow request froze the menu long after the page had painted. Lighthouse cannot see this (it
// still scored 98 to 99 with a script stalled for 5 s), so these tests are the guard: the menu must
// work from first paint, before any script has run, and with no script at all.
//
// Phones only: the hamburger is hidden from the lg breakpoint up.
//
// "Open" means the About link is fully inside the viewport. toBeVisible() is not enough: Playwright
// counts a link clipped away by a collapsed drawer as visible, which once made these tests pass
// against the broken menu.
const toggle = (page: Page) => page.locator('#menu-toggle');
const aboutLink = (page: Page) => page.locator('#mobile-menu a[href="/about"]');
const expectOpen = (page: Page, timeout?: number) =>
  expect(aboutLink(page)).toBeInViewport({ ratio: 0.99, timeout });
const expectClosed = (page: Page) => expect(aboutLink(page)).not.toBeInViewport();

/** What assistive technology is told about the toggle, read from Chromium's accessibility tree. */
async function toggleAccessibility(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  const { root } = await cdp.send('DOM.getDocument');
  const { nodes } = await cdp.send('Accessibility.queryAXTree', { nodeId: root.nodeId, accessibleName: 'Menu' });
  await cdp.detach();
  const node = nodes.find((n) => n.properties?.some((p) => p.name === 'expanded'));
  return { role: node?.role?.value, expanded: node?.properties?.find((p) => p.name === 'expanded')?.value.value };
}

test.describe('Mobile menu without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('opens on the first tap and the links work', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'the hamburger only shows on phones');
    await page.goto('/');
    await expectClosed(page);
    await toggle(page).tap();
    await expectOpen(page, 1000);
    // Tap by coordinates: Playwright's own "is it stable?" check relies on page scripts, which are
    // off here, and never finishes.
    const box = await aboutLink(page).boundingBox();
    expect(box).not.toBeNull();
    await page.touchscreen.tap(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await expect(page).toHaveURL(/\/about\/?$/);
  });
});

test.describe('Mobile menu while the scripts are still downloading', () => {
  test('opens on the first tap, with every script request stalled', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'the hamburger only shows on phones');

    // Hold every script request (never answer it) to stand in for a slow or stalled connection.
    const held: Route[] = [];
    await page.route('**/*.js', (route) => void held.push(route));

    // 'commit': the load events never fire while their scripts are held.
    await page.goto('/', { waitUntil: 'commit' });
    await expect(toggle(page)).toBeVisible();
    // Guard against a vacuous pass: the scripts really are stalled.
    await expect.poll(() => held.length, { message: 'script requests were held' }).toBeGreaterThan(0);

    await expectClosed(page);
    await toggle(page).tap();
    await expectOpen(page, 1000);

    await Promise.all(held.map((r) => r.abort().catch(() => {})));
  });
});

test.describe('Mobile menu with JavaScript', () => {
  test.beforeEach(async ({ page, isMobile }) => {
    test.skip(!isMobile, 'the hamburger only shows on phones');
    await page.goto('/');
  });

  test('is closed at first and its links are out of the tab order', async ({ page }) => {
    await expectClosed(page);
    for (let i = 0; i < 4; i++) await page.keyboard.press('Tab');
    await expect(page.locator('#mobile-menu :focus')).toHaveCount(0);
  });

  test('is exposed to assistive technology as a "Menu" control that reports open and closed', async ({ page }) => {
    // A <summary> shows up as a disclosure control (Chromium calls the role DisclosureTriangle; Safari and
    // VoiceOver announce it as a button) that carries its own expanded state.
    expect(await toggleAccessibility(page)).toEqual({ role: 'DisclosureTriangle', expanded: false });
    await toggle(page).tap();
    await expectOpen(page);
    expect(await toggleAccessibility(page)).toEqual({ role: 'DisclosureTriangle', expanded: true });
    await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
  });

  test('Escape closes it and returns focus to the toggle', async ({ page }) => {
    await toggle(page).tap();
    await expectOpen(page);
    await page.keyboard.press('Escape');
    await expectClosed(page);
    await expect(toggle(page)).toBeFocused();
  });

  test('tapping a link on the same page closes it', async ({ page }) => {
    await toggle(page).tap();
    await expectOpen(page);
    await page.locator('#mobile-menu a[href="/#pricing"]').tap();
    await expect(page).toHaveURL(/#pricing$/);
    await expectClosed(page);
  });

  test('tapping outside the menu closes it', async ({ page }) => {
    await toggle(page).tap();
    await expectOpen(page);
    await page.touchscreen.tap(5, 650); // the page gutter: no link there
    await expectClosed(page);
  });

  test('tapping the toggle again closes it', async ({ page }) => {
    await toggle(page).tap();
    await expectOpen(page);
    await toggle(page).tap();
    await expectClosed(page);
  });
});
