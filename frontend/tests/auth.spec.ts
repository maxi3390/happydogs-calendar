import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test('should display login form', async ({ page }) => {
    await page.goto('/login');

    // Should show sign in heading
    await expect(page.getByText(/sign in/i)).toBeVisible();

    // Should show email and password fields
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    // Should show submit button
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should show app name on login page', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByText(/happy pet nursery/i)).toBeVisible();
  });

  test('should have link to register page', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('link', { name: /sign up/i })).toBeVisible();
  });

  test('should have link back to home', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('link', { name: /back to home/i })).toBeVisible();
  });

  test('should toggle password visibility', async ({ page }) => {
    await page.goto('/login');

    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();

    // Click eye button to show password
    await page.locator('button').filter({ has: page.locator('svg.lucide-eye') }).click();

    // Password input should now be type="text"
    await expect(page.locator('input#password[type="text"]')).toBeVisible();
  });

  test('should show error on invalid login', async ({ page }) => {
    await page.route('**/auth/login/', async route => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid credentials' }),
      });
    });

    await page.goto('/login');

    // Fill in invalid credentials
    await page.locator('input[type="email"]').fill('invalid@example.com');
    await page.locator('input[type="password"]').fill('wrongpassword');

    // Submit
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should show error message
    await expect(page.getByText(/invalid credentials|login failed/i)).toBeVisible({ timeout: 5000 });
  });

  test('should redirect authenticated user away from login', async ({ page }) => {
    // Set up auth state
    await page.goto('/', { waitUntil: 'commit' });
    await page.evaluate(() => {
      localStorage.setItem('auth_user', JSON.stringify({
        id: 1, email: 'test@example.com', first_name: 'Test', last_name: 'User',
        full_name: 'Test User', role: 'user', is_active: true,
        created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z',
      }));
      localStorage.setItem('auth_tokens', JSON.stringify({
        access: 'mock-access-token', refresh: 'mock-refresh-token',
      }));
    });

    // Navigate to login
    await page.goto('/login');

    // Should redirect to home
    await expect(page).toHaveURL('/', { timeout: 5000 });
  });
});

test.describe('Register Page', () => {
  test('should display register form', async ({ page }) => {
    await page.goto('/register');

    // Should show registration heading
    await expect(page.getByText(/sign up|register|create.*account/i)).toBeVisible();

    // Should show form fields
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test('should have link to login page', async ({ page }) => {
    await page.goto('/register');

    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
  });
});
