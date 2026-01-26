import { test, expect } from '@playwright/test';

test.describe('Pets Page', () => {
  test('should display pets page', async ({ page }) => {
    await page.goto('/pets');

    // Page should have title
    await expect(page.getByRole('heading', { name: /pets/i })).toBeVisible();

    // Add pet button should be visible
    await expect(page.getByRole('button', { name: /add pet/i })).toBeVisible();
  });

  test('should open add pet form', async ({ page }) => {
    await page.goto('/pets');

    // Click add pet button
    await page.getByRole('button', { name: /add pet/i }).click();

    // Form should be visible with required fields
    await expect(page.getByLabel(/name/i)).toBeVisible();
    await expect(page.getByLabel(/species/i)).toBeVisible();
    await expect(page.getByLabel(/temperament/i)).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/pets');

    // Open add pet form
    await page.getByRole('button', { name: /add pet/i }).click();

    // Try to submit without filling required fields
    await page.getByRole('button', { name: /save|create|add/i }).click();

    // Form should still be visible (not submitted)
    await expect(page.getByLabel(/name/i)).toBeVisible();
  });

  test('should create a new pet', async ({ page }) => {
    await page.goto('/pets');

    // Open add pet form
    await page.getByRole('button', { name: /add pet/i }).click();

    // Fill in required fields
    await page.getByLabel(/name/i).fill('Test Pet');
    await page.getByLabel(/species/i).selectOption('dog');
    await page.getByLabel(/temperament/i).selectOption('friendly');
    await page.getByLabel(/size/i).selectOption('medium');
    await page.getByLabel(/dominance/i).fill('5');

    // Submit form
    await page.getByRole('button', { name: /save|create|add/i }).click();

    // Should show success or the pet in the list
    await expect(page.getByText('Test Pet')).toBeVisible({ timeout: 5000 });
  });

  test('should open edit form for existing pet', async ({ page }) => {
    await page.goto('/pets');

    // Wait for pets to load
    await page.waitForLoadState('networkidle');

    // Click edit button on first pet (if exists)
    const editButton = page.locator('button').filter({ has: page.locator('svg.lucide-edit') }).first();

    if (await editButton.isVisible()) {
      await editButton.click();

      // Edit form should be visible
      await expect(page.getByLabel(/name/i)).toBeVisible();
    }
  });

  test('should filter pets by search', async ({ page }) => {
    await page.goto('/pets');

    // Wait for pets to load
    await page.waitForLoadState('networkidle');

    // Find search input if exists
    const searchInput = page.getByPlaceholder(/search/i);

    if (await searchInput.isVisible()) {
      await searchInput.fill('test');

      // Wait for filter to apply
      await page.waitForTimeout(500);
    }
  });
});

test.describe('Pet Form Validation', () => {
  test('should show dominance level slider', async ({ page }) => {
    await page.goto('/pets');

    // Open add pet form
    await page.getByRole('button', { name: /add pet/i }).click();

    // Dominance field should be visible
    const dominanceField = page.getByLabel(/dominance/i);
    await expect(dominanceField).toBeVisible();
  });

  test('should show species options', async ({ page }) => {
    await page.goto('/pets');

    // Open add pet form
    await page.getByRole('button', { name: /add pet/i }).click();

    // Species select should have options
    const speciesSelect = page.getByLabel(/species/i);
    await speciesSelect.click();

    // Should have dog option
    await expect(page.getByRole('option', { name: /dog/i })).toBeVisible();
  });

  test('should show temperament options', async ({ page }) => {
    await page.goto('/pets');

    // Open add pet form
    await page.getByRole('button', { name: /add pet/i }).click();

    // Temperament select should have options
    const temperamentSelect = page.getByLabel(/temperament/i);
    await temperamentSelect.click();

    // Should have friendly option
    await expect(page.getByRole('option', { name: /friendly/i })).toBeVisible();
  });

  test('should close form on cancel', async ({ page }) => {
    await page.goto('/pets');

    // Open add pet form
    await page.getByRole('button', { name: /add pet/i }).click();

    // Form should be visible
    await expect(page.getByLabel(/name/i)).toBeVisible();

    // Click cancel button
    await page.getByRole('button', { name: /cancel/i }).click();

    // Form should be closed
    await expect(page.getByLabel(/name/i)).not.toBeVisible();
  });
});
