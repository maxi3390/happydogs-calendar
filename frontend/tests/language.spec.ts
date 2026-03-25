import { test, expect, Page } from '@playwright/test';
import { setupAuthAndLanguage } from './helpers';

function languageSwitcher(page: Page) {
  return page.locator('header select').first();
}

test.describe('Language Switching', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthAndLanguage(page);
  });

  test('should display language switcher', async ({ page }) => {
    // Language switcher should be visible in header (select with Globe icon)
    await expect(languageSwitcher(page)).toBeVisible();
  });

  test('should default to Spanish when no preference is set', async ({ page }) => {
    // Clear localStorage language preference
    await page.evaluate(() => localStorage.removeItem('preferred_language'));
    await page.reload({ waitUntil: 'networkidle' });

    // Default language state is 'es'
    await expect(languageSwitcher(page)).toHaveValue('es');
  });

  test('should switch to Spanish', async ({ page }) => {
    // Switch to Spanish
    await languageSwitcher(page).selectOption('es');

    // Wait for translation to load
    await page.waitForTimeout(500);

    // Language selector should reflect Spanish
    await expect(languageSwitcher(page)).toHaveValue('es');
  });

  test('should switch back to English', async ({ page }) => {
    // Switch to Spanish first
    await languageSwitcher(page).selectOption('es');
    await page.waitForTimeout(500);

    // Switch back to English
    await languageSwitcher(page).selectOption('en');
    await page.waitForTimeout(500);

    // Language selector should reflect English
    await expect(languageSwitcher(page)).toHaveValue('en');
  });

  test('should persist language preference', async ({ page }) => {
    // Switch to Spanish
    await languageSwitcher(page).selectOption('es');
    await page.waitForTimeout(500);

    // Reload the page
    await page.reload({ waitUntil: 'networkidle' });

    // Language should still be Spanish
    await expect(languageSwitcher(page)).toHaveValue('es');
  });

  test('should translate calendar view buttons', async ({ page }) => {
    // Check English buttons first
    await expect(page.getByRole('button', { name: /month/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /today/i })).toBeVisible();

    // Switch to Spanish
    await languageSwitcher(page).selectOption('es');
    await page.waitForTimeout(500);

    // Buttons should be in Spanish
    await expect(page.getByRole('button', { name: /mes/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /hoy/i })).toBeVisible();
  });

  test('should translate navigation links', async ({ page }) => {
    // Switch to Spanish
    await languageSwitcher(page).selectOption('es');
    await page.waitForTimeout(500);

    // Navigation should be in Spanish
    await expect(page.getByText(/dueños/i)).toBeVisible();
    await expect(page.getByText(/mascotas/i)).toBeVisible();
  });

  test('should translate app title and tagline', async ({ page }) => {
    // Check English title
    await expect(page.getByText(/happy pet nursery/i)).toBeVisible();

    // Switch to Spanish
    await languageSwitcher(page).selectOption('es');
    await page.waitForTimeout(500);

    // Title should be in Spanish
    await expect(page.getByText(/guarder[ií]a happy dogs/i)).toBeVisible();
  });
});

test.describe('Language Persistence', () => {
  test('should load with saved language from localStorage', async ({ page }) => {
    await setupAuthAndLanguage(page, { lang: 'es' });

    // Should show Spanish content
    await expect(languageSwitcher(page)).toHaveValue('es');
  });

  test('should work across page navigation', async ({ page }) => {
    await setupAuthAndLanguage(page, { lang: 'es' });

    await expect(languageSwitcher(page)).toHaveValue('es');

    // Navigate to pets page
    await page.getByRole('link', { name: /mascotas/i }).first().click();
    await expect(page).toHaveURL('/pets');

    // Language should still be Spanish on new page
    await expect(page.getByRole('heading', { name: /mascotas/i })).toBeVisible();
  });
});
