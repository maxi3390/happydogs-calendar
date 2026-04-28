/**
 * Tests for the admin-user-management feature: filters, bulk select,
 * deactivation/activation, promote/demote, delete-with-impact-summary.
 *
 * Each test stubs the relevant `/api/users/...` endpoints with
 * `page.route` and bookkeeps state in a local closure; we never hit
 * the real backend here. The aim is to lock in UI behaviour (filter
 * round-trips include the right query params, bulk bar appears on
 * selection, delete is disabled while active, etc.) without coupling
 * the test to a specific seed dataset.
 */
import { test, expect, Page, Route } from '@playwright/test';
import { setupAuthAndLanguage } from './helpers';

interface UserRow {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: 'admin' | 'user';
  is_active: boolean;
  language: 'en' | 'es';
  created_at: string;
  updated_at: string;
}

function makeUser(over: Partial<UserRow> & { id: number; email: string }): UserRow {
  return {
    first_name: 'Test',
    last_name: `User${over.id}`,
    full_name: `Test User${over.id}`,
    role: 'user',
    is_active: true,
    language: 'en',
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
    ...over,
  };
}

/** Full users-API mock backed by an in-memory map. Returns helpers
 *  the test can use to assert on captured calls (filter params,
 *  bulk-action bodies). The mock honours the filter query params on
 *  GET /api/users/ so list filter assertions are end-to-end. */
function mockUsersApi(page: Page, initial: UserRow[]) {
  const store = new Map<number, UserRow>(initial.map(u => [u.id, u]));
  const captures = {
    listQueries: [] as Record<string, string>[],
    bulk: [] as { url: string; body: unknown }[],
    actions: [] as { url: string; method: string }[],
  };

  page.route('**/api/users/**', async (route: Route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();

    // List
    if (method === 'GET' && url.pathname.endsWith('/api/users/')) {
      const params: Record<string, string> = {};
      url.searchParams.forEach((v, k) => { params[k] = v; });
      captures.listQueries.push(params);
      let rows = Array.from(store.values());
      if (params.role) rows = rows.filter(u => u.role === params.role);
      if (params.is_active === 'true') rows = rows.filter(u => u.is_active);
      else if (params.is_active === 'false') rows = rows.filter(u => !u.is_active);
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify(rows),
      });
      return;
    }

    // Deletion impact
    const impactMatch = url.pathname.match(/\/api\/users\/(\d+)\/deletion_impact\/$/);
    if (method === 'GET' && impactMatch) {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ notifications: 3, audit_log_entries: 7 }),
      });
      return;
    }

    // Bulk actions
    if (method === 'POST' && url.pathname.match(/\/api\/users\/bulk_/)) {
      const body = JSON.parse(route.request().postData() || '{}');
      captures.bulk.push({ url: url.pathname, body });
      const ids: number[] = body.ids || [];
      if (url.pathname.endsWith('bulk_activate/')) {
        for (const id of ids) {
          const u = store.get(id); if (u) store.set(id, { ...u, is_active: true });
        }
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ updated: ids.length }) });
      } else if (url.pathname.endsWith('bulk_deactivate/')) {
        for (const id of ids) {
          const u = store.get(id); if (u) store.set(id, { ...u, is_active: false });
        }
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ updated: ids.length }) });
      } else if (url.pathname.endsWith('bulk_set_role/')) {
        for (const id of ids) {
          const u = store.get(id); if (u) store.set(id, { ...u, role: body.role });
        }
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ updated: ids.length }) });
      } else if (url.pathname.endsWith('bulk_delete/')) {
        for (const id of ids) store.delete(id);
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ deleted: ids.length }) });
      } else {
        await route.fallback();
      }
      return;
    }

    // Per-user state actions
    const actionMatch = url.pathname.match(/\/api\/users\/(\d+)\/(deactivate|activate|promote|demote)\/$/);
    if (method === 'POST' && actionMatch) {
      captures.actions.push({ url: url.pathname, method });
      const id = parseInt(actionMatch[1], 10);
      const verb = actionMatch[2];
      const u = store.get(id);
      if (u) {
        const next = { ...u };
        if (verb === 'deactivate') next.is_active = false;
        else if (verb === 'activate') next.is_active = true;
        else if (verb === 'promote') next.role = 'admin';
        else if (verb === 'demote') next.role = 'user';
        store.set(id, next);
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(next) });
      } else {
        await route.fulfill({ status: 404, body: '{}' });
      }
      return;
    }

    // DELETE /api/users/<id>/
    const deleteMatch = url.pathname.match(/\/api\/users\/(\d+)\/$/);
    if (method === 'DELETE' && deleteMatch) {
      const id = parseInt(deleteMatch[1], 10);
      const u = store.get(id);
      if (u && !u.is_active) {
        store.delete(id);
        await route.fulfill({ status: 204, body: '' });
      } else {
        await route.fulfill({
          status: 400, contentType: 'application/json',
          body: JSON.stringify({ detail: 'User must be deactivated before deletion.' }),
        });
      }
      return;
    }

    await route.fallback();
  });

  return { store, captures };
}


test.describe('Admin user management — filters', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthAndLanguage(page, { admin: true });
  });

  test('role filter round-trips to backend as ?role=admin', async ({ page }) => {
    const { captures } = mockUsersApi(page, [
      makeUser({ id: 100, email: 'a@x.com', role: 'admin' }),
      makeUser({ id: 101, email: 'u@x.com', role: 'user' }),
    ]);
    await page.goto('/admin/users');
    await expect(page.locator('tr', { hasText: 'a@x.com' })).toBeVisible();
    await page.getByTestId('filter-role').selectOption('admin');
    // The list refetch is async — wait for the captured query, then
    // assert on the table state.
    await expect.poll(
      () => captures.listQueries[captures.listQueries.length - 1]?.role,
    ).toBe('admin');
    await expect(page.locator('tr', { hasText: 'u@x.com' })).toHaveCount(0);
  });

  test('status filter round-trips to backend as ?is_active=false', async ({ page }) => {
    const { captures } = mockUsersApi(page, [
      makeUser({ id: 200, email: 'active@x.com', is_active: true }),
      makeUser({ id: 201, email: 'inactive@x.com', is_active: false }),
    ]);
    await page.goto('/admin/users');
    await page.getByTestId('filter-status').selectOption('inactive');
    await expect.poll(
      () => captures.listQueries[captures.listQueries.length - 1]?.is_active,
    ).toBe('false');
  });

  test('last-login=never round-trips as last_login_never=true', async ({ page }) => {
    const { captures } = mockUsersApi(page, [makeUser({ id: 300, email: 'x@x.com' })]);
    await page.goto('/admin/users');
    await page.getByTestId('filter-last-login').selectOption('never');
    await expect.poll(
      () => captures.listQueries[captures.listQueries.length - 1]?.last_login_never,
    ).toBe('true');
  });
});


test.describe('Admin user management — bulk select', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthAndLanguage(page, { admin: true });
  });

  test('bulk action bar appears on selection and bulk deactivate posts ids', async ({ page }) => {
    const { captures } = mockUsersApi(page, [
      makeUser({ id: 400, email: 'a@x.com' }),
      makeUser({ id: 401, email: 'b@x.com' }),
    ]);
    await page.goto('/admin/users');
    await expect(page.getByTestId('bulk-action-bar')).toHaveCount(0);
    await page.getByTestId('select-user-400').check();
    await expect(page.getByTestId('bulk-action-bar')).toBeVisible();
    await page.getByTestId('select-user-401').check();
    await expect(page.getByTestId('bulk-action-bar')).toContainText('2 selected');
    await page.getByTestId('bulk-action-bar').getByRole('button', { name: /^deactivate$/i }).click();
    // The list refetched after the bulk call; assert on captures.
    expect(captures.bulk[0].url).toBe('/api/users/bulk_deactivate/');
    expect((captures.bulk[0].body as { ids: number[] }).ids).toEqual([400, 401]);
  });

  test('bulk delete is disabled while any selected user is still active', async ({ page }) => {
    mockUsersApi(page, [
      makeUser({ id: 500, email: 'a@x.com', is_active: true }),
      makeUser({ id: 501, email: 'b@x.com', is_active: false }),
    ]);
    await page.goto('/admin/users');
    await page.getByTestId('select-user-500').check();
    await page.getByTestId('select-user-501').check();
    const deleteBtn = page.getByTestId('bulk-action-bar').getByRole('button', { name: /^delete$/i });
    await expect(deleteBtn).toBeDisabled();
  });
});


test.describe('Admin user management — per-row actions', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthAndLanguage(page, { admin: true });
  });

  test('deactivate opens confirm modal, calls the action, refetches', async ({ page }) => {
    const { captures } = mockUsersApi(page, [makeUser({ id: 600, email: 't@x.com', is_active: true })]);
    await page.goto('/admin/users');
    await page.getByTestId('row-deactivate-600').click();
    await expect(page.getByText(/Deactivate Test User600/)).toBeVisible();
    await page.getByTestId('confirm-action').click();
    expect(captures.actions[0].url).toBe('/api/users/600/deactivate/');
  });

  test('promote replaces with demote after the role flips', async ({ page }) => {
    mockUsersApi(page, [makeUser({ id: 700, email: 't@x.com', role: 'user' })]);
    await page.goto('/admin/users');
    await page.getByTestId('row-promote-700').click();
    await page.getByTestId('confirm-action').click();
    // After list refetch the row now exposes "demote" instead of "promote".
    await expect(page.getByTestId('row-demote-700')).toBeVisible();
    await expect(page.getByTestId('row-promote-700')).toHaveCount(0);
  });

  test('delete button is disabled on active rows, enabled on inactive rows', async ({ page }) => {
    mockUsersApi(page, [
      makeUser({ id: 800, email: 'active@x.com', is_active: true }),
      makeUser({ id: 801, email: 'inactive@x.com', is_active: false }),
    ]);
    await page.goto('/admin/users');
    await expect(page.getByTestId('row-delete-800')).toBeDisabled();
    await expect(page.getByTestId('row-delete-801')).toBeEnabled();
  });

  test('delete modal renders the deletion-impact summary', async ({ page }) => {
    mockUsersApi(page, [makeUser({ id: 900, email: 'gone@x.com', is_active: false })]);
    await page.goto('/admin/users');
    await page.getByTestId('row-delete-900').click();
    // Mock returns {notifications: 3, audit_log_entries: 7}.
    await expect(page.getByText(/3 notifications will be discarded/)).toBeVisible();
    await expect(page.getByText(/7 audit-log entries will be anonymized/)).toBeVisible();
  });
});
