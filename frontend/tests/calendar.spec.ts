import { test, expect } from '@playwright/test';

test.describe('Calendar', () => {
  test('should display current month', async ({ page }) => {
    await page.goto('/');

    // Calendar should show current month name
    const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    await expect(page.getByText(currentMonth, { exact: false })).toBeVisible();
  });

  test('should navigate to previous month', async ({ page }) => {
    await page.goto('/');

    // Get current month display
    const currentDate = new Date();
    const prevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1);
    const prevMonthName = prevMonth.toLocaleString('default', { month: 'long' });

    // Click previous month button (left chevron)
    await page.locator('button').filter({ has: page.locator('svg.lucide-chevron-left') }).click();

    // Should show previous month
    await expect(page.getByText(prevMonthName, { exact: false })).toBeVisible();
  });

  test('should navigate to next month', async ({ page }) => {
    await page.goto('/');

    // Get next month
    const currentDate = new Date();
    const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1);
    const nextMonthName = nextMonth.toLocaleString('default', { month: 'long' });

    // Click next month button (right chevron)
    await page.locator('button').filter({ has: page.locator('svg.lucide-chevron-right') }).click();

    // Should show next month
    await expect(page.getByText(nextMonthName, { exact: false })).toBeVisible();
  });

  test('should return to today when clicking Today button', async ({ page }) => {
    await page.goto('/');

    // Navigate away from current month
    await page.locator('button').filter({ has: page.locator('svg.lucide-chevron-left') }).click();
    await page.locator('button').filter({ has: page.locator('svg.lucide-chevron-left') }).click();

    // Click Today button
    await page.getByRole('button', { name: /today/i }).click();

    // Should show current month again
    const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    await expect(page.getByText(currentMonth, { exact: false })).toBeVisible();
  });

  test('should switch between month and week views', async ({ page }) => {
    await page.goto('/');

    // Click Week button
    await page.getByRole('button', { name: /week/i }).first().click();

    // Week view should show "Week of" text
    await expect(page.getByText(/week of/i)).toBeVisible();

    // Click Month button to go back
    await page.getByRole('button', { name: /month/i }).first().click();

    // Should show monthly calendar grid (7 days header)
    await expect(page.getByText('Sun', { exact: false })).toBeVisible();
  });

  test('should select a day and show day schedule', async ({ page }) => {
    await page.goto('/');

    // Click on a day in the calendar (today's date)
    const today = new Date().getDate().toString();
    await page.locator(`button:has-text("${today}")`).first().click();

    // Day schedule panel should update to show selected date
    const daySchedule = page.locator('.bg-gradient-to-r.from-indigo-500');
    await expect(daySchedule).toBeVisible();
  });
});

test.describe('Week View', () => {
  test('should display week view with all days', async ({ page }) => {
    await page.goto('/');

    // Switch to week view
    await page.getByRole('button', { name: /week/i }).first().click();

    // Should show all 7 days of the week
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (const day of dayNames) {
      await expect(page.getByText(day, { exact: false })).toBeVisible();
    }
  });

  test('should navigate weeks', async ({ page }) => {
    await page.goto('/');

    // Switch to week view
    await page.getByRole('button', { name: /week/i }).first().click();

    // Get initial week display
    const weekText = await page.getByText(/week of/i).textContent();

    // Navigate to next week
    await page.locator('button').filter({ has: page.locator('svg.lucide-chevron-right') }).click();

    // Week text should change
    const newWeekText = await page.getByText(/week of/i).textContent();
    expect(newWeekText).not.toBe(weekText);
  });

  test('should return to current week with This Week button', async ({ page }) => {
    await page.goto('/');

    // Switch to week view
    await page.getByRole('button', { name: /week/i }).first().click();

    // Navigate away
    await page.locator('button').filter({ has: page.locator('svg.lucide-chevron-left') }).click();
    await page.locator('button').filter({ has: page.locator('svg.lucide-chevron-left') }).click();

    // Click This Week button
    await page.getByRole('button', { name: /this week/i }).click();

    // Should be back to current week (check for today's date)
    const today = new Date().getDate().toString();
    await expect(page.getByText(today, { exact: false })).toBeVisible();
  });
});
