import { test, expect } from '@playwright/test';
import { setupAuthAndLanguage } from './helpers';

test.describe('Language Switching', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthAndLanguage(page);
  });

  test('should display language switcher', async ({ page }) => {
    // Language switcher should be visible in header (select with Globe icon)
    const languageSwitcher = page.locator('select').filter({ hasText: /english|español/i });
    await expect(languageSwitcher).toBeVisible();
  });

  test('should default to Spanish when no preference is set', async ({ page }) => {
    // Clear localStorage language preference
    await page.evaluate(() => localStorage.removeItem('preferred_language'));
    await page.reload({ waitUntil: 'networkidle' });

    // Default language state is 'es'
    const languageSwitcher = page.locator('select').filter({ hasText: /english|español/i });
    await expect(languageSwitcher).toHaveValue('es');
  });

  test('should switch to Spanish', async ({ page }) => {
    // Find language switcher
    const languageSwitcher = page.locator('select').filter({ hasText: /english|español/i });

    // Switch to Spanish
    await languageSwitcher.selectOption('es');

    // Wait for translation to load
    await page.waitForTimeout(500);

    // UI should show Spanish text
    await expect(page.getByText(/mascotas|propietarios/i)).toBeVisible();
  });

  test('should switch back to English', async ({ page }) => {
    const languageSwitcher = page.locator('select').filter({ hasText: /english|español/i });

    // Switch to Spanish first
    await languageSwitcher.selectOption('es');
    await page.waitForTimeout(500);

    // Switch back to English
    await languageSwitcher.selectOption('en');
    await page.waitForTimeout(500);

    // UI should show English text again
    await expect(page.getByText(/pets|owners/i)).toBeVisible();
  });

  test('should persist language preference', async ({ page }) => {
    const languageSwitcher = page.locator('select').filter({ hasText: /english|español/i });

    // Switch to Spanish
    await languageSwitcher.selectOption('es');
    await page.waitForTimeout(500);

    // Reload the page
    await page.reload({ waitUntil: 'networkidle' });

    // Language should still be Spanish
    await expect(page.getByText(/mascotas|propietarios/i)).toBeVisible();
  });

  test('should translate calendar view buttons', async ({ page }) => {
    const languageSwitcher = page.locator('select').filter({ hasText: /english|español/i });

    // Check English buttons first
    await expect(page.getByRole('button', { name: /month/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /today/i })).toBeVisible();

    // Switch to Spanish
    await languageSwitcher.selectOption('es');
    await page.waitForTimeout(500);

    // Buttons should be in Spanish
    await expect(page.getByRole('button', { name: /mes/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /hoy/i })).toBeVisible();
  });

  test('should translate navigation links', async ({ page }) => {
    const languageSwitcher = page.locator('select').filter({ hasText: /english|español/i });

    // Switch to Spanish
    await languageSwitcher.selectOption('es');
    await page.waitForTimeout(500);

    // Navigation should be in Spanish
    await expect(page.getByText(/propietarios/i)).toBeVisible();
    await expect(page.getByText(/mascotas/i)).toBeVisible();
  });

  test('should translate app title and tagline', async ({ page }) => {
    const languageSwitcher = page.locator('select').filter({ hasText: /english|español/i });

    // Check English title
    await expect(page.getByText(/happy pet nursery/i)).toBeVisible();

    // Switch to Spanish
    await languageSwitcher.selectOption('es');
    await page.waitForTimeout(500);

    // Title should be in Spanish
    await expect(page.getByText(/guardería de mascotas feliz/i)).toBeVisible();
  });
});

test.describe('Language Persistence', () => {
  test('should load with saved language from localStorage', async ({ page }) => {
    // Set Spanish in localStorage before navigation
    await page.goto('/', { waitUntil: 'commit' });
    await page.evaluate(() => localStorage.setItem('preferred_language', 'es'));
    await page.reload({ waitUntil: 'networkidle' });

    // Should show Spanish content
    await expect(page.getByText(/mascotas|propietarios/i)).toBeVisible();
  });

  test('should work across page navigation', async ({ page }) => {
    await setupAuthAndLanguage(page, { lang: 'es' });

    const languageSwitcher = page.locator('select').filter({ hasText: /english|español/i });
    await expect(languageSwitcher).toHaveValue('es');

    // Navigate to pets page
    await page.getByRole('link', { name: /mascotas/i }).first().click();
    await expect(page).toHaveURL('/pets');

    // Language should still be Spanish on new page
    await expect(page.getByText(/mascotas/i)).toBeVisible();
  });
});
