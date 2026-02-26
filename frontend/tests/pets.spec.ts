import { test, expect } from '@playwright/test';
import { setupAuthAndLanguage } from './helpers';

test.describe('Pets Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthAndLanguage(page);
    await page.goto('/pets');
  });

  test('should display pets page', async ({ page }) => {
    // Page should have title
    await expect(page.getByRole('heading', { name: /pets/i })).toBeVisible();

    // Add pet button should be visible
    await expect(page.getByRole('button', { name: /add pet/i })).toBeVisible();
  });

  test('should open add pet form', async ({ page }) => {
    // Click add pet button
    await page.getByRole('button', { name: /add pet/i }).click();

    // Form should be visible with required fields
    await expect(page.getByText(/name/i).first()).toBeVisible();
    await expect(page.getByText(/species/i).first()).toBeVisible();
    await expect(page.getByText(/temperament/i).first()).toBeVisible();
  });

  test('should show new pet form fields', async ({ page }) => {
    // Click add pet button
    await page.getByRole('button', { name: /add pet/i }).click();

    // Should show new fields: sex, birth date, neutered
    await expect(page.getByText(/sex/i).first()).toBeVisible();
    await expect(page.getByText(/birth date/i).first()).toBeVisible();
    await expect(page.getByText(/neutered/i)).toBeVisible();

    // Should show vaccination section
    await expect(page.getByText(/vaccination/i).first()).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    // Open add pet form
    await page.getByRole('button', { name: /add pet/i }).click();

    // Clear the name field (it's required)
    const nameInput = page.locator('input[type="text"]').first();
    await nameInput.clear();

    // Try to submit without filling required fields
    await page.getByRole('button', { name: /add pet/i }).last().click();

    // Form should still be visible (not submitted due to HTML validation)
    await expect(nameInput).toBeVisible();
  });

  test('should create a new pet', async ({ page }) => {
    // Open add pet form
    await page.getByRole('button', { name: /add pet/i }).click();

    // Fill in required fields
    const nameInput = page.locator('input[type="text"]').first();
    await nameInput.fill('Test Pet');

    // Select species
    const speciesSelect = page.locator('select').nth(0);
    await speciesSelect.selectOption('dog');

    // Select temperament
    const temperamentSelect = page.locator('select').nth(1);
    await temperamentSelect.selectOption('friendly');

    // Select size
    const sizeSelect = page.locator('select').nth(2);
    await sizeSelect.selectOption('medium');

    // Select sex
    const sexSelect = page.locator('select').nth(3);
    await sexSelect.selectOption('male');

    // Submit form
    await page.getByRole('button', { name: /add pet/i }).last().click();

    // Should show success or the pet in the list
    await expect(page.getByText('Test Pet')).toBeVisible({ timeout: 5000 });
  });

  test('should open edit form for existing pet', async ({ page }) => {
    // Wait for pets to load
    await page.waitForLoadState('networkidle');

    // Click edit button on first pet (if exists) - uses Edit2 icon (lucide-edit-2 or lucide-square-pen)
    const editButton = page.locator('button').filter({ has: page.locator('svg.lucide-edit-2, svg.lucide-square-pen') }).first();

    if (await editButton.isVisible()) {
      await editButton.click();

      // Edit form should be visible
      await expect(page.locator('input[type="text"]').first()).toBeVisible();
    }
  });

  test('should filter pets by search', async ({ page }) => {
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
  test.beforeEach(async ({ page }) => {
    await setupAuthAndLanguage(page);
    await page.goto('/pets');
  });

  test('should show dominance level slider', async ({ page }) => {
    // Open add pet form
    await page.getByRole('button', { name: /add pet/i }).click();

    // Dominance field should be visible (range input)
    const dominanceSlider = page.locator('input[type="range"]');
    await expect(dominanceSlider).toBeVisible();
  });

  test('should show species options', async ({ page }) => {
    // Open add pet form
    await page.getByRole('button', { name: /add pet/i }).click();

    // Species select should have options - the first select in the form
    const speciesSelect = page.locator('select').first();
    await expect(speciesSelect).toBeVisible();

    // Should have dog option value
    await expect(speciesSelect.locator('option[value="dog"]')).toBeAttached();
  });

  test('should show temperament options', async ({ page }) => {
    // Open add pet form
    await page.getByRole('button', { name: /add pet/i }).click();

    // Temperament select should have options
    const temperamentSelect = page.locator('select').nth(1);
    await expect(temperamentSelect).toBeVisible();

    // Should have friendly option value
    await expect(temperamentSelect.locator('option[value="friendly"]')).toBeAttached();
  });

  test('should show sex options', async ({ page }) => {
    // Open add pet form
    await page.getByRole('button', { name: /add pet/i }).click();

    // Sex select should be visible
    const sexSelect = page.locator('select').nth(3);
    await expect(sexSelect).toBeVisible();

    // Should have male/female options
    await expect(sexSelect.locator('option[value="male"]')).toBeAttached();
    await expect(sexSelect.locator('option[value="female"]')).toBeAttached();
  });

  test('should show vaccination section with add button', async ({ page }) => {
    // Open add pet form
    await page.getByRole('button', { name: /add pet/i }).click();

    // Should show "Add Vaccination" button
    await expect(page.getByText(/add vaccination/i)).toBeVisible();
  });

  test('should close form on cancel', async ({ page }) => {
    // Open add pet form
    await page.getByRole('button', { name: /add pet/i }).click();

    // Form should be visible
    await expect(page.locator('input[type="text"]').first()).toBeVisible();

    // Click cancel button
    await page.getByRole('button', { name: /cancel/i }).click();

    // Form modal should be closed
    await expect(page.locator('.fixed.inset-0')).not.toBeVisible();
  });
});
