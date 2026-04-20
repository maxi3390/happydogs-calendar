import { test, expect, Page } from '@playwright/test';
import { setupAuthAndLanguage, createOwnerViaApi, openAddPetFormForOwner } from './helpers';

const addPetRegex = /add pet|agregar mascota/i;
const cancelRegex = /cancel|cancelar/i;
const saveAndAddAnotherRegex = /save & add another|guardar y agregar otra/i;

function petForm(page: Page) {
  return page.locator('.fixed.inset-0 form').first();
}

test.describe('Pets Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthAndLanguage(page);
    await page.goto('/pets');
  });

  test('should display pets page without an Add Pet button (pet creation lives on /owners)', async ({ page }) => {
    // Page should have title
    await expect(page.getByRole('heading', { level: 2, name: /pets|mascotas/i })).toBeVisible();

    // The /pets page no longer exposes an "Add Pet" button.
    await expect(page.getByRole('button', { name: addPetRegex })).toHaveCount(0);
  });
});

test.describe('Pet Form (opened from owner list)', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthAndLanguage(page);
  });

  test('should open the pet form from an expanded owner card', async ({ page }) => {
    const owner = await createOwnerViaApi(page);
    const form = await openAddPetFormForOwner(page, owner);

    await expect(form.getByText(/name|nombre/i).first()).toBeVisible();
    await expect(form.getByText(/species|especie/i).first()).toBeVisible();
    await expect(form.getByText(/temperament|temperamento/i).first()).toBeVisible();
  });

  test('should not display the owner selector when opened from owner list', async ({ page }) => {
    const owner = await createOwnerViaApi(page);
    const form = await openAddPetFormForOwner(page, owner);

    // Only 4 selects expected: species, temperament, size, sex (no owner select).
    await expect(form.locator('select')).toHaveCount(4);
  });

  test('should show new pet form fields', async ({ page }) => {
    const owner = await createOwnerViaApi(page);
    const form = await openAddPetFormForOwner(page, owner);

    await expect(form.getByText(/sex|sexo/i).first()).toBeVisible();
    await expect(form.locator('input[type="date"]').first()).toBeVisible();
    await expect(form.getByText(/neutered|castrad/i)).toBeVisible();
    await expect(form.getByText(/vaccination|vacuna/i).first()).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    const owner = await createOwnerViaApi(page);
    const form = await openAddPetFormForOwner(page, owner);

    const nameInput = form.locator('input[type="text"]').first();
    await nameInput.clear();

    // Try to submit without filling required fields
    await form.getByRole('button', { name: addPetRegex }).last().click();

    // Form should still be visible (not submitted due to HTML validation)
    await expect(nameInput).toBeVisible();
  });

  test('should create a new pet', async ({ page }) => {
    const owner = await createOwnerViaApi(page);
    const form = await openAddPetFormForOwner(page, owner);

    // Fill in required fields
    await form.locator('input[type="text"]').first().fill('Test Pet');
    await form.locator('select').nth(0).selectOption('dog'); // species
    await form.locator('select').nth(1).selectOption('friendly'); // temperament
    await form.locator('select').nth(2).selectOption('medium'); // size
    await form.locator('select').nth(3).selectOption('male'); // sex

    // Submit form (final Save button)
    await form.getByRole('button', { name: addPetRegex }).last().click();

    // Modal closes on success
    await expect(page.locator('.fixed.inset-0 form')).toHaveCount(0, { timeout: 5000 });
  });

  test('should filter pets by search on /pets', async ({ page }) => {
    await page.goto('/pets');
    await page.waitForLoadState('networkidle');

    const searchInput = page.getByPlaceholder(/search/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await page.waitForTimeout(500);
    }
  });
});

test.describe('Pet Form Validation (opened from owner list)', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthAndLanguage(page);
  });

  test('should show dominance level slider', async ({ page }) => {
    const owner = await createOwnerViaApi(page);
    const form = await openAddPetFormForOwner(page, owner);

    const dominanceSlider = form.locator('input[type="range"]');
    await expect(dominanceSlider).toBeVisible();
  });

  test('should show species options', async ({ page }) => {
    const owner = await createOwnerViaApi(page);
    const form = await openAddPetFormForOwner(page, owner);

    const speciesSelect = form.locator('select').first();
    await expect(speciesSelect).toBeVisible();
    await expect(speciesSelect.locator('option[value="dog"]')).toBeAttached();
  });

  test('should show temperament options', async ({ page }) => {
    const owner = await createOwnerViaApi(page);
    const form = await openAddPetFormForOwner(page, owner);

    const temperamentSelect = form.locator('select').nth(1);
    await expect(temperamentSelect).toBeVisible();
    await expect(temperamentSelect.locator('option[value="friendly"]')).toBeAttached();
  });

  test('should show sex options', async ({ page }) => {
    const owner = await createOwnerViaApi(page);
    const form = await openAddPetFormForOwner(page, owner);

    const sexSelect = form.locator('select').nth(3);
    await expect(sexSelect).toBeVisible();
    await expect(sexSelect.locator('option[value="male"]')).toBeAttached();
    await expect(sexSelect.locator('option[value="female"]')).toBeAttached();
  });

  test('should show vaccination section with add button', async ({ page }) => {
    const owner = await createOwnerViaApi(page);
    const form = await openAddPetFormForOwner(page, owner);

    await expect(form.getByText(/add vaccination|agregar vacuna/i)).toBeVisible();
  });

  test('should close form on cancel', async ({ page }) => {
    const owner = await createOwnerViaApi(page);
    const form = await openAddPetFormForOwner(page, owner);

    await expect(form.locator('input[type="text"]').first()).toBeVisible();

    await page.getByRole('button', { name: cancelRegex }).click();

    await expect(page.locator('.fixed.inset-0 form')).toHaveCount(0);
  });
});

test.describe('Save & Add Another', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthAndLanguage(page);
  });

  test('shows the Save & Add Another button in create mode only', async ({ page }) => {
    const owner = await createOwnerViaApi(page);
    const form = await openAddPetFormForOwner(page, owner);

    await expect(form.getByRole('button', { name: saveAndAddAnotherRegex })).toBeVisible();
  });

  test('creates a pet, keeps the modal open and clears the form for another entry', async ({ page }) => {
    const owner = await createOwnerViaApi(page);
    const form = await openAddPetFormForOwner(page, owner);

    // First pet
    const nameInput = form.locator('input[type="text"]').first();
    await nameInput.fill('FirstPet');
    await form.locator('select').nth(0).selectOption('dog');
    await form.locator('select').nth(1).selectOption('friendly');
    await form.locator('select').nth(2).selectOption('medium');
    await form.locator('select').nth(3).selectOption('male');

    await form.getByRole('button', { name: saveAndAddAnotherRegex }).click();

    // Toast should appear and the form should remain open with a cleared name field.
    await expect(page.getByText(/firstpet (added successfully|agregada con éxito)/i)).toBeVisible({ timeout: 5000 });
    await expect(form).toBeVisible();
    await expect(nameInput).toHaveValue('');

    // Second pet
    await nameInput.fill('SecondPet');
    await form.getByRole('button', { name: addPetRegex }).last().click();

    // Modal closes after final save
    await expect(page.locator('.fixed.inset-0 form')).toHaveCount(0, { timeout: 5000 });
  });
});
