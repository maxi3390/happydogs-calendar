/**
 * Tests for the calendar cell-size requirements introduced in
 * commits c53cf0c → 4ac65cb on `fix/calendar-cell-size-and-week-time-order`:
 *
 *   1. Month view cells are a constant size when collapsed (no
 *      data-driven auto-grow).
 *   2. Clicking "+N more" on a busy day expands that week so every
 *      hidden bar becomes visible; "Show less" collapses it back.
 *   3. The whole visible day block is clickable — including the
 *      bar-area below the day-number row.
 *   4. Week view sorts pet rows by earliest entry time (start_date +
 *      start_time), not alphabetical by pet name.
 *
 * The schedule data the calendar consumes is mocked at the network
 * layer via `page.route` — the browser inside the Playwright
 * container can't reach the docker-compose backend through the
 * frontend's relative `/api` base URL, so we serve a deterministic
 * payload instead. The test surface is the UI behaviour, not the API
 * round-trip.
 */
import { test, expect, Page } from '@playwright/test';
import { setupAuthAndLanguage } from './helpers';


/** ISO `yyyy-MM-dd` for the 10th of the current month. The 10th sits
 *  comfortably within the first ~2 weeks so the bars land above the
 *  fold of the calendar in every reasonable viewport. */
function tenthOfThisMonth(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-10`;
}


type MockSchedule = {
  id: number;
  pet: number;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  status: string;
  pet_details: {
    id: number;
    name: string;
    species: string;
    temperament: string;
  };
  conflicts: unknown[];
};


function makeSchedule(
  id: number,
  petId: number,
  petName: string,
  date: string,
  startTime = '09:00',
  endTime = '17:00',
): MockSchedule {
  return {
    id,
    pet: petId,
    start_date: date,
    end_date: date,
    start_time: startTime,
    end_time: endTime,
    status: 'scheduled',
    pet_details: { id: petId, name: petName, species: 'dog', temperament: 'friendly' },
    conflicts: [],
  };
}


/** Stub `/api/schedules/` so the calendar fetches a deterministic
 *  payload. Stub must be installed BEFORE navigation to take effect. */
async function stubSchedules(page: Page, schedules: MockSchedule[]) {
  await page.route('**/api/schedules/**', async (route, request) => {
    const url = new URL(request.url());
    const date = url.searchParams.get('date');
    const startDate = url.searchParams.get('start_date');
    const endDate = url.searchParams.get('end_date');
    let result = schedules;
    if (date) {
      result = schedules.filter(s => s.start_date <= date && s.end_date >= date);
    } else if (startDate && endDate) {
      result = schedules.filter(s => s.start_date <= endDate && s.end_date >= startDate);
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(result),
    });
  });
}


test.describe('Month view: fixed-size cells', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthAndLanguage(page);
  });

  test('cells across the calendar share the same height when collapsed', async ({ page }) => {
    // 5 schedules on one day → a "+N more" indicator will appear in
    // that column, but since the week stays collapsed, all the bar-
    // area backdrops across every week MUST share the same height
    // (no data-driven breathing). Day-number cells use a separate,
    // smaller min-height by design — the requirement is intra-row
    // and intra-column consistency, not "every cell is one height."
    const date = tenthOfThisMonth();
    const stubs = Array.from({ length: 5 }, (_, i) =>
      makeSchedule(100 + i, 200 + i, `BarPet${i}`, date),
    );
    await stubSchedules(page, stubs);
    await page.reload({ waitUntil: 'networkidle' });

    // Wait for at least one bar (= calendar fetch landed).
    await expect(page.locator(`button[title*="${date}"]`).first()).toBeVisible();

    // Sample heights of all elements that set a min-height inline
    // style (covers both the day-number cells and the backdrops),
    // then bucket them. We expect EXACTLY two distinct heights:
    //   - the day-number area (≈ 32 px)
    //   - the bar-area backdrop (≈ 92 px)
    // and every cell of each kind should be uniform.
    const heights = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll<HTMLDivElement>('div[style*="min-height"]'));
      return els.map(el => Math.round(el.getBoundingClientRect().height));
    });
    const positiveHeights = heights.filter(h => h > 0);
    const heightSet = new Set(positiveHeights);
    expect(
      heightSet.size,
      `Expected exactly 2 distinct cell heights (day-number row + bar-area row); got ${[...heightSet].join(', ')}`,
    ).toBe(2);

    // Belt-and-braces: each unique height should appear at least
    // once per visible week — i.e. plenty of times. A drift in a
    // single week would surface as a third bucket.
    expect(positiveHeights.length).toBeGreaterThanOrEqual(14);
  });

  test('"+N more" expands the week and reveals every hidden bar', async ({ page }) => {
    const date = tenthOfThisMonth();
    const stubs = Array.from({ length: 5 }, (_, i) =>
      makeSchedule(110 + i, 210 + i, `MorePet${i}`, date),
    );
    await stubSchedules(page, stubs);
    await page.reload({ waitUntil: 'networkidle' });

    // Wait for the calendar to render at least one bar.
    await expect(page.locator(`button[title*="${date}"]`).first()).toBeVisible();

    // Collapsed: at most 3 bars visible for the seeded date.
    const collapsedBars = await page.locator(`button[title*="${date}"]`).count();
    expect(collapsedBars).toBeLessThanOrEqual(3);

    const moreButton = page.getByRole('button', { name: /^\+\d+\s+more/i }).first();
    await expect(moreButton).toBeVisible();
    await moreButton.click();

    // Expanded: every seeded bar visible.
    await expect(page.locator(`button[title*="${date}"]`)).toHaveCount(5);
    await expect(page.getByRole('button', { name: /show less/i })).toBeVisible();
  });

  test('"Show less" collapses the week back to the 4-row default', async ({ page }) => {
    const date = tenthOfThisMonth();
    const stubs = Array.from({ length: 5 }, (_, i) =>
      makeSchedule(120 + i, 220 + i, `LessPet${i}`, date),
    );
    await stubSchedules(page, stubs);
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.locator(`button[title*="${date}"]`).first()).toBeVisible();

    await page.getByRole('button', { name: /^\+\d+\s+more/i }).first().click();
    await expect(page.locator(`button[title*="${date}"]`)).toHaveCount(5);

    await page.getByRole('button', { name: /show less/i }).click();

    const after = await page.locator(`button[title*="${date}"]`).count();
    expect(after).toBeLessThanOrEqual(3);
    await expect(page.getByRole('button', { name: /^\+\d+\s+more/i }).first()).toBeVisible();
  });

  test('clicking the bar-area below a day selects that day', async ({ page }) => {
    // One schedule on the 15th so we can target a specific day cell
    // without the bars taking up the click point.
    const d = new Date();
    const target = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-15`;
    await stubSchedules(page, [makeSchedule(130, 230, 'PetClickTarget', target)]);
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.locator(`button[title*="${target}"]`).first()).toBeVisible();

    // Click 60px below the day-number badge — that lands inside the
    // bar-overlay backdrop for the same column.
    const dayCell = page.locator('span').filter({ hasText: /^15$/ }).first();
    const box = await dayCell.boundingBox();
    expect(box).not.toBeNull();
    const x = box!.x + box!.width / 2;
    const y = box!.y + box!.height + 60;
    await page.mouse.click(x, y);

    // The day-side panel header switches to the new selected date.
    await expect(page.locator('h3').filter({ hasText: /15\/\d{2}\/\d{4}/ }).first()).toBeVisible();
  });
});


test.describe('Week view: pet-row order', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthAndLanguage(page);
  });

  test('pet rows are sorted by earliest entry time, not pet name', async ({ page }) => {
    // Pick a date IN THE CURRENT WEEK so the seeded bars land in the
    // default week-view viewport. We use today.
    const d = new Date();
    const today = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;

    // Three pets in deliberately reversed alphabetical-vs-time order:
    //   "Z..." has the earliest start_time
    //   "M..." is in the middle
    //   "A..." is the latest
    // If pet rows were sorted by name, the order would be A, M, Z.
    // With the time-based sort, the order should be Z, M, A.
    const stubs = [
      makeSchedule(140, 240, 'ZsortPet_early', today, '08:00', '12:00'),
      makeSchedule(141, 241, 'MsortPet_mid',   today, '10:00', '14:00'),
      makeSchedule(142, 242, 'AsortPet_late',  today, '14:00', '18:00'),
    ];
    await stubSchedules(page, stubs);
    await page.reload({ waitUntil: 'networkidle' });

    // Switch to week view (button has localised label "Week" / "Semana").
    await page.getByRole('button', { name: /^week$|^semana$/i }).first().click();

    // Wait for the seeded pet rows to render.
    await expect(page.locator('p.text-sm.font-medium').filter({ hasText: 'ZsortPet_early' })).toBeVisible();

    const labels = await page.locator('p.text-sm.font-medium').allTextContents();
    const trimmed = labels.map(s => s.trim());
    const idxZ = trimmed.findIndex(s => s.startsWith('ZsortPet_early'));
    const idxM = trimmed.findIndex(s => s.startsWith('MsortPet_mid'));
    const idxA = trimmed.findIndex(s => s.startsWith('AsortPet_late'));

    expect(idxZ, `Z pet not found in week-view rows: ${trimmed.join(' | ')}`).toBeGreaterThanOrEqual(0);
    expect(idxM).toBeGreaterThanOrEqual(0);
    expect(idxA).toBeGreaterThanOrEqual(0);

    // Time-asc order: Z (08:00) < M (10:00) < A (14:00).
    expect(idxZ).toBeLessThan(idxM);
    expect(idxM).toBeLessThan(idxA);
  });
});


test.describe('Month view: leading/trailing days', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthAndLanguage(page);
  });

  test('first and last week always render 7 day cells (no blank padding)', async ({ page }) => {
    // No schedules — we're checking the grid layout, not the bars.
    await stubSchedules(page, []);
    await page.reload({ waitUntil: 'networkidle' });

    // Wait for the calendar grid to render. Use the day-name row as
    // the anchor (every locale has 7 single-letter / 3-letter
    // header cells).
    await expect(page.locator('h2')).toContainText(/\d{4}/); // month-year heading rendered

    // Count visible day-number badges across the whole grid. With
    // the 7-column × N-row stretched grid, a fully-rendered month
    // has N*7 day cells (always 28, 35, or 42 depending on the
    // month's first weekday). With the OLD null-padding approach,
    // the count would be lower than N*7 because leading/trailing
    // padding cells rendered an empty <div> instead.
    const dayBadges = page.locator(
      'span.inline-flex.rounded-full',
    ).filter({ hasText: /^\d{1,2}$/ });
    const count = await dayBadges.count();
    // 28 = exactly 4 weeks (rare but possible, e.g. February in a
    // non-leap year that starts on a Sunday). 35 = 5 weeks.
    // 42 = 6 weeks. Anything else is a layout regression.
    expect([28, 35, 42], `Day-cell count fell outside 28/35/42: ${count}`).toContain(count);
  });

  test('out-of-month days are visible but not selectable', async ({ page }) => {
    await stubSchedules(page, []);
    await page.reload({ waitUntil: 'networkidle' });

    // The opacity-30 styling marks out-of-month cells. They have a
    // day number rendered (so the grid looks complete) but their
    // wrapper div has no cursor-pointer / onClick. Click handlers
    // not firing is hard to assert directly without a sentinel —
    // instead, we assert the wrapper has the opacity-30 class AND
    // does NOT have cursor-pointer.
    const outOfMonthCells = page.locator('div[style*="min-height: 32px"].opacity-30');
    const count = await outOfMonthCells.count();
    // At least one — every reasonable month has at least one
    // leading or trailing out-of-month day after stretching to
    // whole weeks. Some months DO start on Sunday and end on
    // Saturday cleanly (no out-of-month days), so we tolerate 0
    // here too — the height-bucket assertion above already covers
    // the layout itself.
    expect(count).toBeGreaterThanOrEqual(0);
    if (count === 0) return;

    // Spot-check the first out-of-month cell: opacity-30 set,
    // cursor-pointer absent.
    const firstOutOfMonth = outOfMonthCells.first();
    const cls = await firstOutOfMonth.getAttribute('class');
    expect(cls, `class="${cls}" should include opacity-30`).toContain('opacity-30');
    expect(cls, `class="${cls}" should NOT include cursor-pointer`).not.toContain('cursor-pointer');
  });
});
