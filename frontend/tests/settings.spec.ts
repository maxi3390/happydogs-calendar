import { test, expect } from '@playwright/test';
import { setupAuthAndLanguage } from './helpers';

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthAndLanguage(page);
    await page.goto('/settings');
  });

  test('should display settings page with title', async ({ page }) => {
    // Page should have settings title
    await expect(page.getByRole('heading', { level: 2, name: /settings|configuraci[oó]n/i })).toBeVisible();
  });

  test('should show incompatibility rules section', async ({ page }) => {
    // Incompatibility rules section should be visible
    await expect(page.getByText(/incompatibilities|incompatibilidades/i)).toBeVisible();

    // Informational copy should be visible
    await expect(page.getByText(/define custom incompatibility rules|define reglas de incompatibilidad/i)).toBeVisible();
  });

  test('should show add rule button', async ({ page }) => {
    // Add rule button should be visible
    await expect(page.getByText(/add rule/i)).toBeVisible();
  });

  test('should open add rule form', async ({ page }) => {
    // Click add rule button
    await page.getByText(/add rule/i).click();

    // Form should appear with pet selection dropdowns
    await expect(page.getByText(/first pet|primera mascota/i)).toBeVisible();
    await expect(page.getByText(/second pet|segunda mascota/i)).toBeVisible();
    await expect(page.getByText(/reason|raz[oó]n/i).first()).toBeVisible();
  });

  test('should close add rule form on cancel', async ({ page }) => {
    // Open form
    await page.getByText(/add rule/i).click();

    // Should be visible
    await expect(page.getByText(/first pet|primera mascota/i)).toBeVisible();

    // Click cancel
    await page.getByRole('button', { name: /cancel/i }).click();

    // Form fields should be hidden
    await expect(page.getByText(/first pet|primera mascota/i)).not.toBeVisible();
  });

  test('should show vaccination types section', async ({ page }) => {
    // Vaccination types section should be visible
    await expect(page.getByText(/vaccination types/i)).toBeVisible();
  });

  test('should show add vaccination type button', async ({ page }) => {
    // Add vaccination type button should be visible
    await expect(page.getByRole('button', { name: /add type|agregar tipo/i })).toBeVisible();
  });

  test('should open add vaccination type form', async ({ page }) => {
    // Click add vaccination type button
    await page.getByRole('button', { name: /add type|agregar tipo/i }).click();

    // Form should appear with name and label fields
    await expect(page.getByText(/internal name|nombre interno/i)).toBeVisible();
    await expect(page.getByText(/display label|etiqueta/i)).toBeVisible();
  });

  test('should show system conflict rules info', async ({ page }) => {
    // System rules section should be visible
    await expect(page.getByRole('heading', { name: /system.*rules|reglas.*sistema/i })).toBeVisible();

    // Should show rule items (colored dots)
    const ruleDots = page.locator('.rounded-full.bg-red-500, .rounded-full.bg-orange-500, .rounded-full.bg-yellow-500');
    await expect(ruleDots.first()).toBeVisible();
  });

  test('should show navigation on settings page', async ({ page }) => {
    // Navigation header should be visible
    await expect(page.locator('header')).toBeVisible();

    // Open profile menu where settings link is rendered
    await page.getByRole('button').filter({ hasText: 'Test' }).first().click();
    await expect(page.getByRole('link', { name: /settings|configuraci[oó]n/i })).toBeVisible();
  });
});
