import { test, expect } from '@playwright/test';

test.describe('Schedule Creation', () => {
  test('should open schedule form from header button', async ({ page }) => {
    await page.goto('/');

    // Click New Schedule button
    await page.getByRole('button', { name: /new schedule/i }).click();

    // Form should be visible
    await expect(page.getByText(/create schedule|new schedule/i)).toBeVisible();
  });

  test('should show pet selection in schedule form', async ({ page }) => {
    await page.goto('/');

    // Click New Schedule button
    await page.getByRole('button', { name: /new schedule/i }).click();

    // Pet dropdown should be visible
    await expect(page.getByLabel(/pet/i)).toBeVisible();
  });

  test('should show date and time fields', async ({ page }) => {
    await page.goto('/');

    // Click New Schedule button
    await page.getByRole('button', { name: /new schedule/i }).click();

    // Date fields should be visible
    await expect(page.getByLabel(/start date/i)).toBeVisible();
    await expect(page.getByLabel(/end date/i)).toBeVisible();

    // Time fields should be visible
    await expect(page.getByLabel(/start time/i)).toBeVisible();
    await expect(page.getByLabel(/end time/i)).toBeVisible();
  });

  test('should close form on cancel', async ({ page }) => {
    await page.goto('/');

    // Click New Schedule button
    await page.getByRole('button', { name: /new schedule/i }).click();

    // Form should be visible
    await expect(page.getByLabel(/pet/i)).toBeVisible();

    // Click cancel button
    await page.getByRole('button', { name: /cancel/i }).click();

    // Form should be closed
    await expect(page.getByLabel(/pet/i)).not.toBeVisible();
  });
});

test.describe('Multi-Pet Schedule', () => {
  test('should open multi-pet schedule form', async ({ page }) => {
    await page.goto('/');

    // Click Multi-Pet button
    await page.getByRole('button', { name: /multi-pet/i }).click();

    // Form should be visible
    await expect(page.getByText(/multi-pet schedule|batch schedule/i)).toBeVisible();
  });

  test('should show owner filter in multi-pet form', async ({ page }) => {
    await page.goto('/');

    // Click Multi-Pet button
    await page.getByRole('button', { name: /multi-pet/i }).click();

    // Owner filter should be visible
    await expect(page.getByLabel(/owner|filter/i)).toBeVisible();
  });

  test('should show select all pets option', async ({ page }) => {
    await page.goto('/');

    // Click Multi-Pet button
    await page.getByRole('button', { name: /multi-pet/i }).click();

    // Select all button/checkbox should be visible
    await expect(page.getByText(/select all/i)).toBeVisible();
  });

  test('should close multi-pet form on cancel', async ({ page }) => {
    await page.goto('/');

    // Click Multi-Pet button
    await page.getByRole('button', { name: /multi-pet/i }).click();

    // Wait for form to be visible
    await expect(page.getByText(/multi-pet schedule|batch schedule/i)).toBeVisible();

    // Click cancel button
    await page.getByRole('button', { name: /cancel/i }).click();

    // Form should be closed
    await expect(page.getByText(/multi-pet schedule|batch schedule/i)).not.toBeVisible();
  });
});

test.describe('Day Schedule Panel', () => {
  test('should display day schedule panel', async ({ page }) => {
    await page.goto('/');

    // Day schedule panel should be visible
    const daySchedule = page.locator('.bg-gradient-to-r.from-indigo-500');
    await expect(daySchedule).toBeVisible();
  });

  test('should show selected date in panel', async ({ page }) => {
    await page.goto('/');

    // Panel should show a date format
    await expect(page.getByText(/\d+ schedule|no schedule/i)).toBeVisible();
  });

  test('should update status dropdown for schedules', async ({ page }) => {
    await page.goto('/');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // If there are schedules, status dropdown should be visible
    const statusDropdown = page.locator('select').filter({ hasText: /scheduled|checked in|completed|cancelled/i }).first();

    if (await statusDropdown.isVisible()) {
      // Click on dropdown
      await statusDropdown.click();

      // Options should be available
      await expect(page.getByRole('option', { name: /scheduled/i })).toBeVisible();
    }
  });
});
