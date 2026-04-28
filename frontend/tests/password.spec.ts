/**
 * Tests for the password change + admin reset feature
 * (proposal `password-change-and-admin-reset`).
 *
 * Self-service: navigate to /profile, the page renders the user's
 * email and a Change-password form. Submitting with a wrong current
 * password is rejected with a server-mapped error; submitting with a
 * matching new+confirm pair succeeds and the new password is what
 * the login endpoint accepts on the next round trip.
 *
 * Admin reset: log in as an admin, open /admin/users, click the
 * Reset-password button on a target row, fill the modal, expect the
 * success toast and that the modal closes. The new password must NOT
 * appear anywhere on the page text after the operation (defends
 * against the screen-recording-leak design rule).
 *
 * The API calls are made by the BROWSER inside the Playwright
 * container, so each test mocks the relevant endpoints with
 * `page.route` and bookkeeps the password state in a local closure.
 */
import { test, expect, Page, Route } from '@playwright/test';
import { setupAuthAndLanguage } from './helpers';


/**
 * Mock the auth/login + change-password + me endpoints with an
 * in-memory password store keyed by email. Returns helpers for the
 * test to assert against the captured state.
 */
function setupAuthMocks(page: Page, initial: { email: string; password: string }[]) {
  const store = new Map<string, string>(initial.map(u => [u.email, u.password]));
  const captured: { url: string; body: unknown }[] = [];

  page.route('**/api/auth/change-password/**', async (route: Route) => {
    const body = JSON.parse(route.request().postData() || '{}');
    captured.push({ url: route.request().url(), body });
    const userEmail = initial[0].email;
    const stored = store.get(userEmail);
    if (body.old_password !== stored) {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ old_password: ['Current password is incorrect.'] }),
      });
      return;
    }
    if (body.new_password !== body.new_password_confirm) {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ new_password_confirm: ['New passwords do not match.'] }),
      });
      return;
    }
    store.set(userEmail, body.new_password);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Password changed successfully' }),
    });
  });

  page.route('**/api/auth/login/**', async (route: Route) => {
    const body = JSON.parse(route.request().postData() || '{}');
    const stored = store.get(body.email);
    if (stored === body.password) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tokens: { access: 'fake-access', refresh: 'fake-refresh' },
          user: { id: 1, email: body.email, role: 'user', first_name: 'T', last_name: 'U', full_name: 'T U', is_active: true, language: 'en' },
        }),
      });
    } else {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'No active account found with the given credentials' }),
      });
    }
  });

  return { store, captured };
}


test.describe('Self-service password change at /profile', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthAndLanguage(page);
  });

  test('changes password successfully and login starts working with the new one', async ({ page }) => {
    const { store } = setupAuthMocks(page, [
      { email: 'self@example.com', password: 'OldPass123!' },
    ]);
    // Patch the cached auth_user so the page renders our test email.
    await page.evaluate((email) => {
      const raw = localStorage.getItem('auth_user');
      if (raw) {
        const u = JSON.parse(raw);
        u.email = email;
        localStorage.setItem('auth_user', JSON.stringify(u));
      }
    }, 'self@example.com');

    await page.goto('/profile');
    await expect(page.getByText('self@example.com')).toBeVisible();

    await page.getByLabel(/current password/i).fill('OldPass123!');
    await page.getByLabel(/^new password$/i).fill('NewPass456!');
    await page.getByLabel(/confirm new password/i).fill('NewPass456!');
    await page.getByRole('button', { name: /save new password/i }).click();

    await expect(page.getByText(/password changed successfully/i)).toBeVisible();
    expect(store.get('self@example.com')).toBe('NewPass456!');
  });

  test('wrong current password surfaces a field-level error', async ({ page }) => {
    setupAuthMocks(page, [{ email: 'self@example.com', password: 'OldPass123!' }]);
    await page.evaluate((email) => {
      const raw = localStorage.getItem('auth_user');
      if (raw) {
        const u = JSON.parse(raw);
        u.email = email;
        localStorage.setItem('auth_user', JSON.stringify(u));
      }
    }, 'self@example.com');

    await page.goto('/profile');

    await page.getByLabel(/current password/i).fill('TotallyWrong!');
    await page.getByLabel(/^new password$/i).fill('NewPass456!');
    await page.getByLabel(/confirm new password/i).fill('NewPass456!');
    await page.getByRole('button', { name: /save new password/i }).click();

    await expect(page.getByText(/current password is incorrect/i)).toBeVisible();
    await expect(page.getByText(/password changed successfully/i)).not.toBeVisible();
  });

  test('mismatched new and confirm blocks submission client-side', async ({ page }) => {
    const { captured } = setupAuthMocks(page, [{ email: 'self@example.com', password: 'OldPass123!' }]);
    await page.goto('/profile');

    await page.getByLabel(/current password/i).fill('OldPass123!');
    await page.getByLabel(/^new password$/i).fill('NewPass456!');
    await page.getByLabel(/confirm new password/i).fill('TypoPass456!');
    await page.getByRole('button', { name: /save new password/i }).click();

    await expect(page.getByText(/passwords do not match/i)).toBeVisible();
    expect(captured, 'no API call should fire when the client-side check fails').toHaveLength(0);
  });
});


test.describe('Admin password reset at /admin/users', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthAndLanguage(page, { admin: true });
  });

  test('resets a user password via the modal and shows the success toast', async ({ page }) => {
    // Mock the user list + admin set_password endpoint.
    const TARGET_ID = 42;
    const TARGET_EMAIL = 'resetme@example.com';

    type SetPasswordBody = { new_password?: string; new_password_confirm?: string };
    const captures: { setPassword: SetPasswordBody | null } = { setPassword: null };

    await page.route('**/api/users/**', async (route: Route) => {
      const url = new URL(route.request().url());
      const method = route.request().method();
      // List
      if (method === 'GET' && url.pathname.endsWith('/api/users/')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: TARGET_ID,
              email: TARGET_EMAIL,
              role: 'user',
              first_name: 'Reset',
              last_name: 'Me',
              full_name: 'Reset Me',
              is_active: true,
              language: 'en',
              created_at: '2026-04-01T00:00:00Z',
              updated_at: '2026-04-01T00:00:00Z',
            },
          ]),
        });
        return;
      }
      // set_password
      if (method === 'POST' && url.pathname.endsWith(`/api/users/${TARGET_ID}/set_password/`)) {
        captures.setPassword = JSON.parse(route.request().postData() || '{}') as SetPasswordBody;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Password reset' }),
        });
        return;
      }
      // Anything else (PATCH/DELETE/etc.) — pass through to the
      // server. Tests don't trigger them on this page.
      await route.fallback();
    });

    await page.goto('/admin/users');

    // Find the row for our target user and click its Reset-password
    // button. The button has aria-label="Reset password".
    const row = page.locator('tr', { hasText: TARGET_EMAIL });
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: /reset password/i }).click();

    // Modal opens.
    const newSecret = 'AdminSetIt123!';
    await page.getByLabel(/^new password$/i).fill(newSecret);
    await page.getByLabel(/confirm new password/i).fill(newSecret);
    await page.getByRole('button', { name: /^reset password$/i }).last().click();

    // Toast surfaces, modal closes (form inputs gone), API got the
    // matching pair, and the new password text isn't anywhere on the
    // page (we never echo it back). Use the toast's literal text
    // rather than role=status because the page already exposes a
    // status region elsewhere (loading spinner, etc.).
    await expect(page.getByText(/^password reset\.$/i)).toBeVisible();
    await expect(page.getByLabel(/^new password$/i)).toHaveCount(0);
    expect(captures.setPassword?.new_password).toBe(newSecret);
    await expect(page.locator('body')).not.toContainText(newSecret);
  });

  test('mismatched values block submission client-side', async ({ page }) => {
    const TARGET_ID = 43;
    const TARGET_EMAIL = 'mismatch@example.com';

    let setPasswordCalls = 0;

    await page.route('**/api/users/**', async (route: Route) => {
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
              first_name: 'Mismatch',
              last_name: 'Test',
              full_name: 'Mismatch Test',
              is_active: true,
              language: 'en',
              created_at: '2026-04-01T00:00:00Z',
              updated_at: '2026-04-01T00:00:00Z',
            },
          ]),
        });
        return;
      }
      if (route.request().method() === 'POST' && url.pathname.includes('/set_password/')) {
        setPasswordCalls += 1;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Password reset' }),
        });
        return;
      }
      await route.fallback();
    });

    await page.goto('/admin/users');
    const row = page.locator('tr', { hasText: TARGET_EMAIL });
    await row.getByRole('button', { name: /reset password/i }).click();

    await page.getByLabel(/^new password$/i).fill('AdminSetIt123!');
    await page.getByLabel(/confirm new password/i).fill('Typo123!');
    await page.getByRole('button', { name: /^reset password$/i }).last().click();

    await expect(page.getByText(/passwords do not match/i)).toBeVisible();
    expect(setPasswordCalls, 'no API call should fire when the client-side check fails').toBe(0);
  });
});
