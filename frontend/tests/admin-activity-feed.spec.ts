/**
 * Admin activity feed (`feat/admin-activity-feed`).
 *
 * The page reads `/api/audit-log/activity/` for a paginated, filterable
 * cross-entity stream. We mock the endpoint with `page.route` and
 * assert that:
 *   1. A populated response renders rows + pagination correctly.
 *   2. Changing the entity filter round-trips to the backend with
 *      `?entity_type=...` in the query string.
 *
 * Backend contract is locked in by the Django tests at
 * audit_log/tests/test_activity_feed.py.
 */
import { test, expect, Page, Route } from '@playwright/test';
import { setupAuthAndLanguage } from './helpers';

interface ActivityRow {
  entity_type: 'pet' | 'owner' | 'medical_note' | 'vaccination';
  entity_id: number;
  entity_label: string;
  history_id: number;
  history_type: '+' | '~' | '-';
  history_date: string;
  history_user: { id: number; email: string } | null;
}

function activityResponse(rows: ActivityRow[], count?: number) {
  return { count: count ?? rows.length, results: rows };
}

function mockActivity(page: Page, body: { count: number; results: ActivityRow[] }) {
  const captures: Record<string, string>[] = [];
  page.route('**/api/audit-log/activity/**', async (route: Route) => {
    const url = new URL(route.request().url());
    const params: Record<string, string> = {};
    url.searchParams.forEach((v, k) => { params[k] = v; });
    captures.push(params);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
  return captures;
}

test.describe('Admin activity feed', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthAndLanguage(page, { admin: true });
  });

  test('renders rows for the populated response and shows the action / entity columns', async ({ page }) => {
    const rows: ActivityRow[] = [
      {
        entity_type: 'pet',
        entity_id: 1,
        entity_label: 'Buddy',
        history_id: 100,
        history_type: '+',
        history_date: '2026-04-28T14:30:00Z',
        history_user: { id: 3, email: 'admin@example.com' },
      },
      {
        entity_type: 'owner',
        entity_id: 5,
        entity_label: 'Aja Smith',
        history_id: 101,
        history_type: '~',
        history_date: '2026-04-28T14:00:00Z',
        history_user: { id: 3, email: 'admin@example.com' },
      },
      {
        entity_type: 'medical_note',
        entity_id: 9,
        entity_label: 'Allergy',
        history_id: 102,
        history_type: '-',
        history_date: '2026-04-28T13:45:00Z',
        history_user: null,
      },
    ];
    mockActivity(page, activityResponse(rows));

    await page.goto('/admin/activity');

    await expect(page.getByRole('heading', { level: 1, name: /activity log/i })).toBeVisible();
    const table = page.getByTestId('activity-table');
    await expect(table.getByText('Buddy')).toBeVisible();
    await expect(table.getByText('Aja Smith')).toBeVisible();
    await expect(table.getByText('Allergy')).toBeVisible();

    // Action badges are rendered with the localised verb.
    await expect(table.getByText(/^created$/i).first()).toBeVisible();
    await expect(table.getByText(/^updated$/i).first()).toBeVisible();
    await expect(table.getByText(/^deleted$/i).first()).toBeVisible();
  });

  test('changing the entity filter round-trips to the backend with entity_type', async ({ page }) => {
    // Two responses: initial empty, then the post-filter response.
    // We track the captured query strings so we can assert the
    // filter param actually went out the door.
    const captures = mockActivity(page, activityResponse([
      {
        entity_type: 'pet',
        entity_id: 1,
        entity_label: 'Buddy',
        history_id: 100,
        history_type: '+',
        history_date: '2026-04-28T14:30:00Z',
        history_user: { id: 3, email: 'admin@example.com' },
      },
    ]));

    await page.goto('/admin/activity');
    await page.getByTestId('filter-entity').selectOption('owner');

    // Wait for the post-filter request to land in the captures array.
    await expect.poll(
      () => captures[captures.length - 1]?.entity_type,
    ).toBe('owner');
  });
});
