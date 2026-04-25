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
    await expect(page.getByText(/week of|semana de/i)).toBeVisible();

    // Click Month button to go back
    await page.getByRole('button', { name: /month/i }).first().click();

    // Month view should expose Today button (week view uses This Week)
    await expect(page.getByRole('button', { name: /today|hoy/i })).toBeVisible();
  });

  test('should select a day and show day schedule', async ({ page }) => {
    // Click on a day in the calendar (today's date)
    const today = new Date().getDate().toString();
    await page.locator(`[class*="cursor-pointer"]:has-text("${today}")`).first().click();

    // Day schedule panel should update to show selected date
    await expect(page.getByText(/\d+\s+schedules?/i).first()).toBeVisible();
  });

  test('Today button snaps the selected day to today, not just the displayed month', async ({ page }) => {
    // Navigate forward two months so we can click a non-today cell
    // without the date colliding with today.
    const calendarHeader = page.locator('.bg-card.text-card-foreground.rounded-xl.shadow-lg').first();
    const nextMonthButton = calendarHeader.locator('button').nth(4);
    await nextMonthButton.click();
    await nextMonthButton.click();

    // Click day "15" in the future month — the day-schedule panel
    // should anchor on that date (heading is `EEEE, dd/MM/yyyy`).
    await page.locator('[class*="cursor-pointer"]').filter({ hasText: /^15$/ }).first().click();
    const panelHeading = page.getByRole('heading', { level: 3 }).first();
    await expect(panelHeading).toContainText(/15\//);

    // Click the Today button. The displayed month resets AND the
    // panel's selected-day heading must follow.
    await page.getByRole('button', { name: /^(today|hoy)$/i }).click();

    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    await expect(panelHeading).toContainText(`${dd}/${mm}/${yyyy}`);
  });

  test('Today button + day-panel "+ New Schedule" pre-fills the form with today', async ({ page }) => {
    // Drift the selected day by clicking some other date first, then
    // click Today, then open the create-schedule form from the day
    // panel. The form's start/end date inputs must read today's ISO
    // date — proving the Today button reset the selected day.
    const calendarHeader = page.locator('.bg-card.text-card-foreground.rounded-xl.shadow-lg').first();
    const nextMonthButton = calendarHeader.locator('button').nth(4);
    await nextMonthButton.click();
    await page.locator('[class*="cursor-pointer"]').filter({ hasText: /^20$/ }).first().click();

    await page.getByRole('button', { name: /^(today|hoy)$/i }).click();

    // Open the day-panel's "+ New Schedule" button (uniquely keyed by
    // its translated aria-label).
    await page.getByRole('button', { name: /new schedule|nuevo horario/i }).first().click();

    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    const isoToday = `${yyyy}-${mm}-${dd}`;

    await expect(page.locator('form input[type="date"]').nth(0)).toHaveValue(isoToday);
    await expect(page.locator('form input[type="date"]').nth(1)).toHaveValue(isoToday);
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

    // Should be back to current week (today marker should be highlighted)
    await expect(page.locator('.text-lg.font-bold.text-primary').first()).toBeVisible();
  });
});
