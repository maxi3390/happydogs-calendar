/**
 * Password-strength meter UX (`feat/password-strength-meter`).
 *
 * The meter is advisory — it doesn't block submission — so these tests
 * just lock in the visible severity label transitions on `/profile` and
 * the admin reset modal. The scoring rules live in
 * `src/components/PasswordStrengthMeter.tsx`'s `scorePassword`; we
 * exercise them through the rendered DOM rather than unit-testing the
 * function in isolation, which keeps the test resilient to future
 * scorer swaps (zxcvbn-ts, etc.) as long as the labels stay stable.
 */
import { test, expect } from '@playwright/test';
import { setupAuthAndLanguage } from './helpers';

test.describe('Password-strength meter on /profile', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthAndLanguage(page);
    await page.goto('/profile');
  });

  test('meter is hidden on empty input and surfaces severity as the user types', async ({ page }) => {
    const meter = page.getByTestId('profile-strength-meter');
    const newPassword = page.getByLabel(/^new password$/i);

    // Empty: meter not in the DOM.
    await expect(meter).toHaveCount(0);

    // < 8 chars → Very weak.
    await newPassword.fill('abc');
    await expect(meter).toBeVisible();
    await expect(meter).toContainText(/very weak|muy d[eé]bil/i);

    // 8 chars, lowercase only → Weak.
    await newPassword.fill('abcdefgh');
    await expect(meter).toContainText(/^(?!.*very).*weak|^(?!.*muy).*d[eé]bil/i);

    // 8 chars, lowercase + digits → Fair.
    await newPassword.fill('abcdefg1');
    await expect(meter).toContainText(/fair|aceptable/i);

    // 8 chars, three classes → Strong.
    await newPassword.fill('Abcdefg1');
    await expect(meter).toContainText(/^(?!.*very).*strong|^(?!.*muy).*fuerte/i);

    // 12+ chars, four classes → Very strong.
    await newPassword.fill('Abcdefg1!XYZ');
    await expect(meter).toContainText(/very strong|muy fuerte/i);

    // Clear → meter disappears.
    await newPassword.fill('');
    await expect(meter).toHaveCount(0);
  });

  test('meter does not block the submit button (server validates)', async ({ page }) => {
    // The Save button stays enabled even when the score is "Very weak"
    // — server-side validators have final say. The meter is just UX.
    await page.getByLabel(/current password/i).fill('OldPass123!');
    await page.getByLabel(/^new password$/i).fill('weak');
    await page.getByLabel(/confirm new password/i).fill('weak');
    const save = page.getByRole('button', { name: /save (new )?password|guardar/i });
    await expect(save).toBeEnabled();
  });
});

test.describe('Password-strength meter on the admin reset modal', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthAndLanguage(page, { admin: true });
  });

  test('meter renders inside the reset-password modal', async ({ page }) => {
    // Stub the user list so the row is present without any backend
    // shape assumptions; reset-password endpoint is also stubbed so
    // the test never round-trips for real.
    const TARGET_ID = 1234;
    const TARGET_EMAIL = 'meterme@example.com';

    await page.route('**/api/users/**', async (route) => {
      const url = new URL(route.request().url());
      if (route.request().method() === 'GET' && url.pathname.endsWith('/api/users/')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: TARGET_ID,
              email: TARGET_EMAIL,
              role: 'user',
              first_name: 'Meter',
              last_name: 'Me',
              full_name: 'Meter Me',
              is_active: true,
              language: 'en',
              created_at: '2026-04-01T00:00:00Z',
              updated_at: '2026-04-01T00:00:00Z',
            },
          ]),
        });
        return;
      }
      await route.fallback();
    });

    await page.goto('/admin/users');

    const row = page.locator('tr', { hasText: TARGET_EMAIL });
    await row.getByRole('button', { name: /reset password/i }).click();

    const meter = page.getByTestId('admin-reset-strength-meter');
    await expect(meter).toHaveCount(0);

    await page.getByLabel(/^new password$/i).fill('weak');
    await expect(meter).toBeVisible();
    await expect(meter).toContainText(/very weak|muy d[eé]bil/i);

    await page.getByLabel(/^new password$/i).fill('Abcdefg1!XYZ');
    await expect(meter).toContainText(/very strong|muy fuerte/i);
  });
});
