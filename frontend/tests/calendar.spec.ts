import { test, expect } from '@playwright/test';
import { setupAuthAndLanguage } from './helpers';

test.describe('Calendar', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthAndLanguage(page);
  });

  test('should display current month', async ({ page }) => {
    // Calendar uses date-fns format(currentMonth, 'MMMM yyyy')
    const currentMonth = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
    await expect(page.getByText(currentMonth, { exact: false })).toBeVisible();
  });

  test('should navigate to previous month', async ({ page }) => {
    // Get current month display
    const currentDate = new Date();
    const prevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1);
    const prevMonthName = prevMonth.toLocaleString('en-US', { month: 'long' });

    // Click previous month button in calendar header
    await page.locator('.bg-card.text-card-foreground.rounded-xl.shadow-lg').first().locator('button').nth(2).click();

    // Should show previous month
    await expect(page.getByText(prevMonthName, { exact: false })).toBeVisible();
  });

  test('should navigate to next month', async ({ page }) => {
    // Get next month
    const currentDate = new Date();
    const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1);
    const nextMonthName = nextMonth.toLocaleString('en-US', { month: 'long' });

    // Click next month button in calendar header
    await page.locator('.bg-card.text-card-foreground.rounded-xl.shadow-lg').first().locator('button').nth(4).click();

    // Should show next month
    await expect(page.getByText(nextMonthName, { exact: false })).toBeVisible();
  });

  test('should return to today when clicking Today button', async ({ page }) => {
    // Navigate away from current month
    await page.locator('.bg-card.text-card-foreground.rounded-xl.shadow-lg').first().locator('button').nth(2).click();
    await page.locator('.bg-card.text-card-foreground.rounded-xl.shadow-lg').first().locator('button').nth(2).click();

    // Click Today button (translated text)
    await page.getByRole('button', { name: /today|hoy/i }).click();

    // Should show current month again
    const currentMonth = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
    await expect(page.getByText(currentMonth, { exact: false })).toBeVisible();
  });

  test('should switch between month and week views', async ({ page }) => {
    // Click Week button
    await page.getByRole('button', { name: /week/i }).first().click();

    // Week view should show "Week of" text
    await expect(page.getByText(/week of/i)).toBeVisible();

    // Click Month button to go back
    await page.getByRole('button', { name: /month/i }).first().click();

    // Should show monthly calendar grid with day-of-week headers
    await expect(page.locator('.grid.grid-cols-7')).toBeVisible();
  });

  test('should select a day and show day schedule', async ({ page }) => {
    // Click on a day in the calendar (today's date)
    const today = new Date().getDate().toString();
    await page.locator(`[class*="cursor-pointer"]:has-text("${today}")`).first().click();

    // Day schedule panel should update to show selected date
    await expect(page.getByText(/\d+\s+schedules?/i).first()).toBeVisible();
  });
});

test.describe('Week View', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthAndLanguage(page);
  });

  test('should display week view with day columns', async ({ page }) => {
    // Switch to week view
    await page.getByRole('button', { name: /week/i }).first().click();

    // Should show "Week of" header
    await expect(page.getByText(/week of/i)).toBeVisible();

    // Should show day column headers (translated short names)
    await expect(page.getByText(/sun|dom/i).first()).toBeVisible();
    await expect(page.getByText(/mon|lun/i).first()).toBeVisible();
  });

  test('should navigate weeks', async ({ page }) => {
    // Switch to week view
    await page.getByRole('button', { name: /week/i }).first().click();

    // Get initial week display
    const weekText = await page.getByText(/week of/i).textContent();

    // Navigate to next week
    await page.locator('button').filter({ hasText: /this week/i }).locator('xpath=following-sibling::button').click();

    // Week text should change
    const newWeekText = await page.getByText(/week of/i).textContent();
    expect(newWeekText).not.toBe(weekText);
  });

  test('should return to current week with This Week button', async ({ page }) => {
    // Switch to week view
    await page.getByRole('button', { name: /week/i }).first().click();

    // Navigate away
    const weekHeader = page.locator('.bg-card.text-card-foreground.rounded-xl.shadow-lg').first();
    await weekHeader.locator('button').nth(2).click();
    await weekHeader.locator('button').nth(2).click();

    // Click This Week button (translated text)
    await page.getByRole('button', { name: /this week/i }).click();

    // Should be back to current week (check for today's date)
    const today = new Date().getDate().toString();
    await expect(page.getByText(today, { exact: false })).toBeVisible();
  });
});
