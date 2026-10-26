import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { WCAG, fillOrder, jpegSize, mockOrderApi, parseMultipart, pngFile, TOKEN } from './helpers/orders';

// The order form wired to the integrations service (SCRUM-65 to 68, SCRUM-40). The service is
// mocked here, so these run anywhere: astro preview, the image in CI and staging. The real
// end-to-end order is order-smoke.spec.ts (staging only).

test.describe('Order form → /api/orders', () => {
  test('sends to /api/orders, shrinks photos to a 2560 px JPEG first, then shows the reference, TEST wording and status link', async ({ page }) => {
    let sent: { url: string; parts: ReturnType<typeof parseMultipart> } | undefined;
    await mockOrderApi(page, {
      submit: async (route) => {
        const req = route.request();
        sent = { url: req.url(), parts: parseMultipart(req.postDataBuffer()!, req.headers()['content-type'] ?? '') };
        await route.fulfill({ status: 201, json: { reference: 'PMP-ABCDE', statusToken: TOKEN, test: true } });
      },
    });
    await page.goto('/#order');
    // A 4000 × 3000 photo, as from a phone camera.
    await fillOrder(page, { photo: pngFile('big.png', 4000, 3000) });
    await page.getByRole('button', { name: 'Submit for review' }).click();

    // Decoding and shrinking a 12-megapixel photo twice can take a while on a slow CI runner.
    await expect(page.getByTestId('order-done')).toBeVisible({ timeout: 30_000 });
    expect(new URL(sent!.url).pathname).toBe('/api/orders');
    const field = (name: string) => sent!.parts.find((p) => p.name === name);
    for (const side of ['front', 'back']) {
      const photo = field(`paddles[0][${side}]`)!;
      expect(photo.type).toBe('image/jpeg');
      expect(photo.filename).toMatch(/\.jpg$/);
      const size = jpegSize(photo.data);
      expect(Math.max(size!.width, size!.height)).toBe(2560);
      expect(photo.data.length).toBeLessThan(10 * 1024 * 1024);
    }
    expect(field('formToken')!.data.toString()).toMatch(/^\d+\./);
    expect(field('idempotencyKey')!.data.toString()).toMatch(/^[A-Za-z0-9_-]{16,64}$/);
    expect(field('website')!.data.toString()).toBe('');
    expect(field('consent')!.data.toString()).toBe('yes');

    await expect(page.getByTestId('done-reference')).toHaveText('PMP-ABCDE');
    await expect(page.getByTestId('done-test')).toBeVisible();
    await expect(page.getByTestId('done-status-link')).toHaveAttribute('href', `/order/status#${TOKEN}`);
    await expect(page.locator('#order-form')).toBeHidden();
  });

  test('a production order (no test flag) has no TEST wording', async ({ page }) => {
    await mockOrderApi(page, {
      submit: (route) => route.fulfill({ status: 201, json: { reference: 'PMP-FGHJK', statusToken: TOKEN } }),
    });
    await page.goto('/#order');
    await fillOrder(page);
    await page.getByRole('button', { name: 'Submit for review' }).click();
    await expect(page.getByTestId('done-reference')).toHaveText('PMP-FGHJK');
    await expect(page.getByTestId('done-test')).toBeHidden();
  });

  test('a failed submit keeps every input and offers email', async ({ page }) => {
    await mockOrderApi(page, { submit: (route) => route.fulfill({ status: 500, json: { error: 'internal error' } }) });
    await page.goto('/#order');
    await fillOrder(page);
    await page.getByRole('button', { name: 'Submit for review' }).click();
    await expect(page.locator('#form-status')).toContainText('couldn’t send your order');
    await expect(page.locator('#form-status a[href="mailto:sales@picklemypaddle.com"]')).toBeVisible();
    await expect(page.locator('#name')).toHaveValue('Test Player');
    await expect(page.locator('#paddles-0-brand')).toHaveValue('Selkirk');
    expect(await page.locator('#paddles-0-front').evaluate((i: HTMLInputElement) => i.files?.length)).toBe(1);
    await expect(page.getByRole('button', { name: 'Submit for review' })).toBeEnabled();
  });

  test('shows the server’s field errors on the right fields', async ({ page }) => {
    await mockOrderApi(page, {
      submit: (route) => route.fulfill({ status: 400, json: { errors: { 'paddles.0.front': 'We couldn\'t read the front photo. Please take or choose another one.' } } }),
    });
    await page.goto('/#order');
    await fillOrder(page);
    await page.getByRole('button', { name: 'Submit for review' }).click();
    await expect(page.locator('#paddles-0-front-error')).toHaveText(/couldn't read the front photo/);
    await expect(page.locator('#paddles-0-front')).toHaveAttribute('aria-invalid', 'true');
  });

  test('shows the rate-limit message (429)', async ({ page }) => {
    const message = 'We’ve received a lot of requests from you recently. Please try again later, or email sales@picklemypaddle.com.';
    await mockOrderApi(page, {
      submit: (route) => route.fulfill({ status: 429, headers: { 'Retry-After': '1200' }, json: { error: 'rate_limited', message, retryAfter: 1200 } }),
    });
    await page.goto('/#order');
    await fillOrder(page);
    await page.getByRole('button', { name: 'Submit for review' }).click();
    await expect(page.locator('#form-status')).toHaveText(message);
    await expect(page.locator('#name')).toHaveValue('Test Player');
  });

  test('ordering closed (the service answers 503): the "opens soon" notice and an email fallback', async ({ page }) => {
    let posted = false;
    await mockOrderApi(page, { open: false, submit: async (route) => { posted = true; await route.abort(); } });
    await page.goto('/');
    await expect(page.getByTestId('ordering-closed')).toBeHidden();
    await page.locator('#name').focus();
    await expect(page.getByTestId('ordering-closed')).toBeVisible();
    await fillOrder(page);
    await page.getByRole('button', { name: 'Submit for review' }).click();
    await expect(page.locator('#form-status')).toContainText('opens soon');
    expect(posted).toBe(false);
  });

  test('"Send another order" brings back an empty form', async ({ page }) => {
    await mockOrderApi(page);
    await page.goto('/#order');
    await fillOrder(page);
    await page.getByRole('button', { name: 'Submit for review' }).click();
    await page.getByRole('button', { name: 'Send another order' }).click();
    await expect(page.locator('#order-form')).toBeVisible();
    await expect(page.locator('#name')).toHaveValue('');
    await expect(page.locator('fieldset.paddle')).toHaveCount(1);
  });
});

test.describe('Order form abuse protection (SCRUM-67)', () => {
  test('the honeypot is neither visible nor reachable by keyboard', async ({ page }) => {
    await page.goto('/#order');
    const hp = page.locator('#website');
    await expect(hp).toHaveAttribute('tabindex', '-1');
    await expect(page.getByTestId('honeypot')).toHaveAttribute('aria-hidden', 'true');
    const box = await hp.boundingBox();
    expect(box === null || box.x + box.width < 0).toBe(true);
    await page.locator('#name').focus();
    const visited: string[] = [];
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('Tab');
      visited.push(await page.evaluate(() => document.activeElement?.id ?? ''));
    }
    expect(visited).not.toContain('website');
  });

  test('the form passes axe, honeypot included', async ({ page }) => {
    await page.goto('/#order');
    const results = await new AxeBuilder({ page }).withTags(WCAG).include('#order').analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});

test.describe('Brand and model suggestions (SCRUM-40)', () => {
  test('typing "Sel" offers Selkirk; Enter picks it; the model list narrows to Selkirk', async ({ page }) => {
    await page.goto('/#order');
    const brand = page.locator('#paddles-0-brand');
    await brand.pressSequentially('Sel');
    const brandList = page.locator('#paddles-0-brand-listbox');
    await expect(brandList).toBeVisible();
    await expect(brand).toHaveAttribute('aria-expanded', 'true');
    await expect(brandList.getByRole('option', { name: 'Selkirk' })).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await expect(brand).toHaveAttribute('aria-activedescendant', 'paddles-0-brand-listbox-0');
    await page.keyboard.press('Enter');
    await expect(brand).toHaveValue('Selkirk');
    await expect(brandList).toBeHidden();
    await expect(page.locator('#form-status')).not.toContainText('Please fix'); // Enter picked, didn't submit

    const model = page.locator('#paddles-0-model');
    await model.focus();
    await page.keyboard.press('ArrowDown');
    const modelList = page.locator('#paddles-0-model-listbox');
    await expect(modelList.getByRole('option', { name: 'Vanguard Power Air' })).toBeVisible();
    await expect(modelList.getByRole('option', { name: /Perseus/ })).toHaveCount(0);
    await modelList.getByRole('option', { name: 'Vanguard Power Air' }).click();
    await expect(model).toHaveValue('Vanguard Power Air');
  });

  test('free text is kept for paddles not on the list', async ({ page }) => {
    await page.goto('/#order');
    const brand = page.locator('#paddles-0-brand');
    await brand.pressSequentially('Homemade Paddle Co');
    await expect(page.locator('#paddles-0-brand-listbox')).toBeHidden();
    await page.keyboard.press('Escape');
    await expect(brand).toHaveValue('Homemade Paddle Co');
  });

  test('Escape closes the suggestions; passes axe while they are open', async ({ page }) => {
    await page.goto('/#order');
    const brand = page.locator('#paddles-0-brand');
    await brand.pressSequentially('jo');
    await expect(page.locator('#paddles-0-brand-listbox')).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(WCAG).include('#order').analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(page.locator('#paddles-0-brand-listbox')).toBeHidden();
    await expect(brand).toHaveValue('jo');
  });

  test('a second paddle gets its own suggestions', async ({ page }) => {
    await page.goto('/#order');
    await page.getByRole('button', { name: '+ Add another paddle' }).click();
    const second = page.locator('fieldset.paddle').nth(1).locator('input[name$="[brand]"]');
    await second.pressSequentially('crb');
    await expect(page.locator('fieldset.paddle').nth(1).getByRole('option', { name: 'CRBN' })).toBeVisible();
  });
});
