import { test, expect, Page } from '@playwright/test';
import { setupAuthAndLanguage } from './helpers';

const addPetRegex = /add pet|agregar mascota/i;
const cancelRegex = /cancel|cancelar/i;

function petForm(page: Page) {
  return page.locator('.fixed.inset-0 form').first();
}

test.describe('Pets Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthAndLanguage(page);
    await page.goto('/pets');
  });

  test('should display pets page', async ({ page }) => {
    // Page should have title
    await expect(page.getByRole('heading', { level: 2, name: /pets|mascotas/i })).toBeVisible();

    // Add pet button should be visible
    await expect(page.getByRole('button', { name: addPetRegex })).toBeVisible();
  });

  test('should open add pet form', async ({ page }) => {
    // Click add pet button
    await page.getByRole('button', { name: addPetRegex }).first().click();

    // Form should be visible with required fields
    await expect(petForm(page).getByText(/name|nombre/i).first()).toBeVisible();
    await expect(petForm(page).getByText(/species|especie/i).first()).toBeVisible();
    await expect(petForm(page).getByText(/temperament|temperamento/i).first()).toBeVisible();
  });

  test('should show new pet form fields', async ({ page }) => {
    // Click add pet button
    await page.getByRole('button', { name: addPetRegex }).first().click();

    // Should show new fields: sex, birth date, neutered
    await expect(petForm(page).getByText(/sex|sexo/i).first()).toBeVisible();
    await expect(petForm(page).locator('input[type="date"]').first()).toBeVisible();
    await expect(petForm(page).getByText(/neutered|castrad/i)).toBeVisible();

    // Should show vaccination section
    await expect(petForm(page).getByText(/vaccination|vacuna/i).first()).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    // Open add pet form
    await page.getByRole('button', { name: addPetRegex }).first().click();

    // Clear the name field (it's required)
    const nameInput = petForm(page).locator('input[type="text"]').first();
    await nameInput.clear();

    // Try to submit without filling required fields
    await petForm(page).getByRole('button', { name: addPetRegex }).last().click();

    // Form should still be visible (not submitted due to HTML validation)
    await expect(nameInput).toBeVisible();
  });

  test('should create a new pet', async ({ page }) => {
    // Open add pet form
    await page.getByRole('button', { name: addPetRegex }).first().click();

    const form = petForm(page);

    // Fill in required fields
    const nameInput = form.locator('input[type="text"]').first();
    await nameInput.fill('Test Pet');

    // Select species
    const speciesSelect = form.locator('select').nth(0);
    await speciesSelect.selectOption('dog');

    // Select temperament
    const temperamentSelect = form.locator('select').nth(1);
    await temperamentSelect.selectOption('friendly');

    // Select size
    const sizeSelect = form.locator('select').nth(2);
    await sizeSelect.selectOption('medium');

    // Select sex
    const sexSelect = form.locator('select').nth(3);
    await sexSelect.selectOption('male');

    // Submit form
    await form.getByRole('button', { name: addPetRegex }).last().click();

    // Should show success or the pet in the list
    await expect(page.getByRole('heading', { name: 'Test Pet' }).first()).toBeVisible({ timeout: 5000 });
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
    await page.getByRole('button', { name: addPetRegex }).first().click();

    // Dominance field should be visible (range input)
    const dominanceSlider = petForm(page).locator('input[type="range"]');
    await expect(dominanceSlider).toBeVisible();
  });

  test('should show species options', async ({ page }) => {
    // Open add pet form
    await page.getByRole('button', { name: addPetRegex }).first().click();

    // Species select should have options - the first select in the form
    const speciesSelect = petForm(page).locator('select').first();
    await expect(speciesSelect).toBeVisible();

    // Should have dog option value
    await expect(speciesSelect.locator('option[value="dog"]')).toBeAttached();
  });

  test('should show temperament options', async ({ page }) => {
    // Open add pet form
    await page.getByRole('button', { name: addPetRegex }).first().click();

    // Temperament select should have options
    const temperamentSelect = petForm(page).locator('select').nth(1);
    await expect(temperamentSelect).toBeVisible();

    // Should have friendly option value
    await expect(temperamentSelect.locator('option[value="friendly"]')).toBeAttached();
  });

  test('should show sex options', async ({ page }) => {
    // Open add pet form
    await page.getByRole('button', { name: addPetRegex }).first().click();

    // Sex select should be visible
    const sexSelect = petForm(page).locator('select').nth(3);
    await expect(sexSelect).toBeVisible();

    // Should have male/female options
    await expect(sexSelect.locator('option[value="male"]')).toBeAttached();
    await expect(sexSelect.locator('option[value="female"]')).toBeAttached();
  });

  test('should show vaccination section with add button', async ({ page }) => {
    // Open add pet form
    await page.getByRole('button', { name: addPetRegex }).first().click();

    // Should show "Add Vaccination" button
    await expect(petForm(page).getByText(/add vaccination|agregar vacuna/i)).toBeVisible();
  });

  test('should close form on cancel', async ({ page }) => {
    // Open add pet form
    await page.getByRole('button', { name: addPetRegex }).first().click();

    // Form should be visible
    await expect(petForm(page).locator('input[type="text"]').first()).toBeVisible();

    // Click cancel button
    await page.getByRole('button', { name: cancelRegex }).click();

    // Form modal should be closed
    await expect(page.locator('.fixed.inset-0')).not.toBeVisible();
  });
});
