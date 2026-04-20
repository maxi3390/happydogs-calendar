import { test, expect } from '@playwright/test';
import { setupAuthAndLanguage } from './helpers';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthAndLanguage(page);
  });

  test('should load home page with calendar', async ({ page }) => {
    // Check header is visible
    await expect(page.locator('header')).toBeVisible();

    // Check app title is present
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Check calendar is visible
    await expect(page.locator('.rounded-xl.shadow-lg').first()).toBeVisible();
  });

  test('should expose Calendar link in the desktop header', async ({ page }) => {
    // A dedicated Calendar top-level link must be reachable without clicking the logo.
    await page.goto('/pets');
    const calendarLink = page.getByRole('banner').getByRole('link', { name: /^calendar$|^calendario$/i });
    await expect(calendarLink.first()).toBeVisible();
    await calendarLink.first().click();
    await expect(page).toHaveURL('/');
  });

  test('should mark the active destination with aria-current="page"', async ({ page }) => {
    await page.goto('/pets');
    await expect(page.getByRole('banner').locator('a[href="/pets"][aria-current="page"]').first()).toBeVisible();
    // And the other destinations should not be marked current.
    await expect(page.getByRole('banner').locator('a[href="/owners"][aria-current="page"]')).toHaveCount(0);
  });

  test('should navigate to pets page', async ({ page }) => {
    // Click on Pets link in navigation
    await page.locator('a[href="/pets"]').first().click();
    await expect(page).toHaveURL('/pets');
    await expect(page.getByRole('heading', { level: 2, name: /pets|mascotas/i })).toBeVisible();
  });

  test('should navigate to owners page', async ({ page }) => {
    // Click on Owners link in navigation
    await page.locator('a[href="/owners"]').first().click();
    await expect(page).toHaveURL('/owners');
    await expect(page.getByRole('heading', { name: /owners|dueños/i })).toBeVisible();
  });

  test('should navigate to settings page', async ({ page }) => {
    // Open profile menu and click settings link
    await page.getByRole('button').filter({ hasText: 'Test' }).first().click();
    await page.getByRole('link', { name: /settings/i }).click();

    await expect(page).toHaveURL('/settings');
    await expect(page.getByRole('heading', { level: 2, name: /settings|configuraci[oó]n/i })).toBeVisible();
  });

  test('should navigate back to home from pets page', async ({ page }) => {
    await page.goto('/pets');

    // Click on app logo/title to go back
    await page.getByRole('link', { name: /happy pet nursery/i }).click();
    await expect(page).toHaveURL('/');
  });

  test('should show authenticated user info', async ({ page }) => {
    // Authenticated user name should be visible (on large viewports)
    await expect(page.getByText('Test')).toBeVisible();
  });

  test('should show sign out button when authenticated', async ({ page }) => {
    await page.getByRole('button').filter({ hasText: 'Test' }).first().click();
    await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible();
  });

  test('should close the profile dropdown with Escape', async ({ page }) => {
    await page.getByRole('button').filter({ hasText: 'Test' }).first().click();
    // Sign out visible → dropdown is open.
    await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible();

    await page.keyboard.press('Escape');

    // Dropdown closed → sign out button no longer reachable.
    await expect(page.getByRole('button', { name: /sign out/i })).toHaveCount(0);
  });

  test('should NOT expose the Admin top-level link for non-admin users', async ({ page }) => {
    // Default setupAuthAndLanguage creates a regular user.
    const adminLink = page.getByRole('banner').getByRole('link', { name: /^admin$|^administraci[oó]n$/i });
    await expect(adminLink).toHaveCount(0);
  });

  test('should NOT expose UI System in the profile dropdown for non-admin users', async ({ page }) => {
    await page.getByRole('button').filter({ hasText: 'Test' }).first().click();
    await expect(page.getByRole('link', { name: /ui system|sistema de ui/i })).toHaveCount(0);
  });
});

test.describe('Navigation (admin)', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthAndLanguage(page, { admin: true });
  });

  test('should expose the Admin top-level link for admin users', async ({ page }) => {
    const adminLink = page.getByRole('banner').getByRole('link', { name: /^admin$|^administraci[oó]n$/i });
    await expect(adminLink.first()).toBeVisible();
    await adminLink.first().click();
    await expect(page).toHaveURL('/admin/users');
  });

  test('should expose UI System in the profile dropdown for admin users', async ({ page }) => {
    await page.getByRole('button').filter({ hasText: 'Test' }).first().click();
    const uiSystemLink = page.getByRole('link', { name: /ui system|sistema de ui/i });
    await expect(uiSystemLink.first()).toBeVisible();
    await uiSystemLink.first().click();
    await expect(page).toHaveURL('/ui-system');
  });
});

test.describe('Public Navigation', () => {
  test('should show public view with sign in link when not authenticated', async ({ page }) => {
    await page.goto('/', { waitUntil: 'commit' });
    await page.evaluate(() => localStorage.setItem('preferred_language', 'en'));
    await page.reload({ waitUntil: 'networkidle' });

    await expect(page.locator('header')).toBeVisible();
    await expect(page.getByRole('banner').getByRole('link', { name: /sign in|iniciar sesi[oó]n/i })).toBeVisible();
  });

  test('should show public calendar when not authenticated', async ({ page }) => {
    await page.goto('/', { waitUntil: 'commit' });
    await page.evaluate(() => localStorage.setItem('preferred_language', 'en'));
    await page.reload({ waitUntil: 'networkidle' });

    await expect(page.getByText(/welcome/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /availability calendar/i })).toBeVisible();
  });

  test('should NOT expose authenticated destinations when signed out', async ({ page }) => {
    await page.goto('/', { waitUntil: 'commit' });
    await page.evaluate(() => {
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_tokens');
      localStorage.setItem('preferred_language', 'en');
    });
    await page.reload({ waitUntil: 'networkidle' });

    await expect(page.getByRole('banner').getByRole('link', { name: /^owners$/i })).toHaveCount(0);
    await expect(page.getByRole('banner').getByRole('link', { name: /^pets$/i })).toHaveCount(0);
  });
});

test.describe('Mobile Navigation', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test.beforeEach(async ({ page }) => {
    await setupAuthAndLanguage(page);
  });

  test('should open mobile menu', async ({ page }) => {
    const menuButton = page.locator('button').filter({ has: page.locator('svg.lucide-menu') });
    await menuButton.click();

    await expect(page.getByRole('link', { name: /owners/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /pets/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /settings/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /calendar|calendario/i })).toBeVisible();
  });

  test('should navigate via mobile menu', async ({ page }) => {
    const menuButton = page.locator('button').filter({ has: page.locator('svg.lucide-menu') });
    await menuButton.click();

    await page.getByRole('link', { name: /pets/i }).click();
    await expect(page).toHaveURL('/pets');
  });

  test('should close the mobile menu with Escape', async ({ page }) => {
    const menuButton = page.locator('button').filter({ has: page.locator('svg.lucide-menu') });
    await menuButton.click();
    await expect(page.getByRole('link', { name: /settings/i })).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(page.getByRole('link', { name: /settings/i })).toHaveCount(0);
  });

  test('should show sign in link in mobile menu when not authenticated', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_tokens');
    });
    await page.reload({ waitUntil: 'networkidle' });

    await expect(page.getByRole('link', { name: /sign in|iniciar sesi[oó]n/i }).first()).toBeVisible();
  });
});

test.describe('Mobile Navigation (admin)', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test.beforeEach(async ({ page }) => {
    await setupAuthAndLanguage(page, { admin: true });
  });

  test('should list Admin and UI System in the mobile menu for admin users', async ({ page }) => {
    const menuButton = page.locator('button').filter({ has: page.locator('svg.lucide-menu') });
    await menuButton.click();

    await expect(page.getByRole('link', { name: /^admin$|^administraci[oó]n$/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /ui system|sistema de ui/i })).toBeVisible();
  });
});
