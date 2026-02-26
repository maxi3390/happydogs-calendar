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

  test('should navigate to pets page', async ({ page }) => {
    // Click on Pets link in navigation
    await page.getByRole('link', { name: /pets/i }).first().click();

    // Should be on pets page
    await expect(page).toHaveURL('/pets');

    // Page should have pets title
    await expect(page.getByRole('heading', { name: /pets/i })).toBeVisible();
  });

  test('should navigate to owners page', async ({ page }) => {
    // Click on Owners link in navigation
    await page.getByRole('link', { name: /owners/i }).first().click();

    // Should be on owners page
    await expect(page).toHaveURL('/owners');

    // Page should have owners title
    await expect(page.getByRole('heading', { name: /owners/i })).toBeVisible();
  });

  test('should navigate to settings page', async ({ page }) => {
    // Click on Settings link in navigation
    await page.getByRole('link', { name: /settings/i }).first().click();

    // Should be on settings page
    await expect(page).toHaveURL('/settings');

    // Page should have settings title
    await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible();
  });

  test('should navigate back to home from pets page', async ({ page }) => {
    await page.goto('/pets');

    // Click on app logo/title to go back
    await page.getByRole('link', { name: /happy pet nursery/i }).click();

    // Should be on home page
    await expect(page).toHaveURL('/');
  });

  test('should show authenticated user info', async ({ page }) => {
    // Authenticated user name should be visible (on large viewports)
    await expect(page.getByText('Test')).toBeVisible();
  });

  test('should show sign out button when authenticated', async ({ page }) => {
    // Sign out button should be visible
    await expect(page.locator('button').filter({ has: page.locator('svg.lucide-log-out') })).toBeVisible();
  });
});

test.describe('Public Navigation', () => {
  test('should show public view with sign in link when not authenticated', async ({ page }) => {
    await page.goto('/', { waitUntil: 'commit' });
    await page.evaluate(() => localStorage.setItem('preferred_language', 'en'));
    await page.reload({ waitUntil: 'networkidle' });

    // Header should be visible
    await expect(page.locator('header')).toBeVisible();

    // Sign in link should be visible
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
  });

  test('should show public calendar when not authenticated', async ({ page }) => {
    await page.goto('/', { waitUntil: 'commit' });
    await page.evaluate(() => localStorage.setItem('preferred_language', 'en'));
    await page.reload({ waitUntil: 'networkidle' });

    // Should see a welcome/hero section
    await expect(page.getByText(/welcome/i)).toBeVisible();

    // Should see availability calendar
    await expect(page.getByText(/availability calendar/i)).toBeVisible();
  });
});

test.describe('Mobile Navigation', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test.beforeEach(async ({ page }) => {
    await setupAuthAndLanguage(page);
  });

  test('should open mobile menu', async ({ page }) => {
    // Find and click hamburger menu button (Menu icon)
    const menuButton = page.locator('button').filter({ has: page.locator('svg.lucide-menu') });
    await menuButton.click();

    // Mobile menu should be visible with navigation links
    await expect(page.getByRole('link', { name: /owners/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /pets/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /settings/i })).toBeVisible();
  });

  test('should navigate via mobile menu', async ({ page }) => {
    // Open mobile menu
    const menuButton = page.locator('button').filter({ has: page.locator('svg.lucide-menu') });
    await menuButton.click();

    // Click pets link
    await page.getByRole('link', { name: /pets/i }).click();

    // Should navigate to pets page
    await expect(page).toHaveURL('/pets');
  });

  test('should show sign in link in mobile menu when not authenticated', async ({ page }) => {
    // Clear auth state
    await page.evaluate(() => {
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_tokens');
    });
    await page.reload({ waitUntil: 'networkidle' });

    // On public view the sign in link is directly visible, not in mobile menu
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
  });
});
