import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should load home page with calendar', async ({ page }) => {
    await page.goto('/');

    // Check header is visible
    await expect(page.locator('header')).toBeVisible();

    // Check app title is present
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Check calendar is visible
    await expect(page.locator('.bg-white.rounded-xl.shadow-lg').first()).toBeVisible();
  });

  test('should navigate to pets page', async ({ page }) => {
    await page.goto('/');

    // Click on Pets link in navigation
    await page.getByRole('link', { name: /pets/i }).first().click();

    // Should be on pets page
    await expect(page).toHaveURL('/pets');

    // Page should have pets title
    await expect(page.getByRole('heading', { name: /pets/i })).toBeVisible();
  });

  test('should navigate to owners page', async ({ page }) => {
    await page.goto('/');

    // Click on Owners link in navigation
    await page.getByRole('link', { name: /owners/i }).first().click();

    // Should be on owners page
    await expect(page).toHaveURL('/owners');

    // Page should have owners title
    await expect(page.getByRole('heading', { name: /owners/i })).toBeVisible();
  });

  test('should navigate back to home from pets page', async ({ page }) => {
    await page.goto('/pets');

    // Click on app logo/title to go back
    await page.getByRole('link', { name: /happy pet nursery/i }).click();

    // Should be on home page
    await expect(page).toHaveURL('/');
  });
});

test.describe('Mobile Navigation', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should open mobile menu', async ({ page }) => {
    await page.goto('/');

    // Find and click hamburger menu button
    const menuButton = page.locator('button').filter({ has: page.locator('svg') }).last();
    await menuButton.click();

    // Mobile menu should be visible with navigation links
    await expect(page.getByRole('link', { name: /owners/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /pets/i })).toBeVisible();
  });

  test('should navigate via mobile menu', async ({ page }) => {
    await page.goto('/');

    // Open mobile menu
    const menuButton = page.locator('button').filter({ has: page.locator('svg') }).last();
    await menuButton.click();

    // Click pets link
    await page.getByRole('link', { name: /pets/i }).click();

    // Should navigate to pets page
    await expect(page).toHaveURL('/pets');
  });
});
