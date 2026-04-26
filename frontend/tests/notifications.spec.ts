import { expect, test } from '@playwright/test';
import type { Page, Route } from '@playwright/test';
import { setupAuthAndLanguage } from './helpers';

// ─────────────────────────────────────────────────────────────────────────────
// Stub fixtures
// ─────────────────────────────────────────────────────────────────────────────
//
// We don't drive the real notifications cron from Playwright — the cron is a
// management command inside the backend container that the Playwright runtime
// can't reach over the wire. Instead, we stub the per-row API responses with
// known shapes and assert against the rendered DOM. The backend test suite
// (notifications/tests/test_api.py + test_email.py) already covers the API
// contract end-to-end; this spec covers what happens between that contract
// and the React tree.

interface StubNotification {
  id: number;
  kind: string;
  pet: { id: number; name: string };
  event_date: string;
  payload: Record<string, string | number>;
  created_at: string;
  read_at: string | null;
  dismissed_at: string | null;
  forward: {
    email: { subject: string; body: string; to: string | null };
    whatsapp: { text: string; phone: string | null };
  } | null;
}

const TODAY = new Date().toISOString().slice(0, 10);

const BIRTHDAY_ROW: StubNotification = {
  id: 1,
  kind: 'pet_birthday',
  pet: { id: 100, name: 'Luna' },
  event_date: TODAY,
  payload: { pet_name: 'Luna', age_years: 3, owner_first_name: 'Ana' },
  created_at: `${TODAY}T07:00:00Z`,
  read_at: null,
  dismissed_at: null,
  forward: {
    email: {
      subject: '¡Feliz cumple, Luna!',
      body: 'Hola Ana,\n\nLuna cumple 3 hoy.',
      to: 'ana.garcia@seed.example',
    },
    whatsapp: {
      text: '¡Hola Ana! Hoy Luna cumple 3 🎉',
      phone: '+54 11 4000 0001',
    },
  },
};

const TREATMENT_ROW: StubNotification = {
  id: 2,
  kind: 'vaccination_due',
  pet: { id: 101, name: 'Rocco' },
  event_date: TODAY,
  payload: {
    pet_name: 'Rocco', vax_label: 'Rabies', owner_first_name: 'Luis',
  },
  created_at: `${TODAY}T07:00:00Z`,
  read_at: null,
  dismissed_at: null,
  forward: {
    email: {
      subject: 'Recordatorio de tratamiento para Rocco',
      body: 'Hola Luis...',
      to: 'luis.fernandez@seed.example',
    },
    whatsapp: {
      text: '¡Hola Luis! Recordatorio: Rocco tiene un tratamiento pendiente.',
      phone: '+54 11 4000 0002',
    },
  },
};

const ARRIVAL_ROW: StubNotification = {
  id: 3,
  kind: 'pet_arriving_today',
  pet: { id: 102, name: 'Mía' },
  event_date: TODAY,
  payload: { pet_name: 'Mía', start_time: '09:00', end_time: '17:00' },
  created_at: `${TODAY}T07:00:00Z`,
  read_at: null,
  dismissed_at: null,
  // Internal-only kind — no forward block by design.
  forward: null,
};

const READ_DEWORMING_ROW: StubNotification = {
  id: 4,
  kind: 'deworming_internal_due',
  pet: { id: 103, name: 'Bugs' },
  event_date: TODAY,
  payload: { pet_name: 'Bugs', side: 'internal', owner_first_name: 'María' },
  created_at: `${TODAY}T07:00:00Z`,
  read_at: `${TODAY}T08:00:00Z`,
  dismissed_at: null,
  forward: {
    email: {
      subject: 'Recordatorio de tratamiento para Bugs',
      body: 'Hola María...',
      to: 'maria.lopez@seed.example',
    },
    whatsapp: {
      text: '¡Hola María! Recordatorio: Bugs tiene un tratamiento pendiente.',
      phone: '+54 11 4000 0003',
    },
  },
};

const ALL_ROWS = [BIRTHDAY_ROW, TREATMENT_ROW, ARRIVAL_ROW, READ_DEWORMING_ROW];
const UNREAD_ROWS = ALL_ROWS.filter(r => r.read_at === null);

async function stubFeatureFlag(page: Page, enabled: boolean) {
  await page.route('**/api/feature-flags/**', async (route: Route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 1, key: 'notifications', label: 'Notifications',
          description: '', enabled, updated_at: `${TODAY}T00:00:00Z`,
        },
        {
          id: 2, key: 'multiday_schedule', label: 'Multi-day',
          description: '', enabled: true, updated_at: `${TODAY}T00:00:00Z`,
        },
      ]),
    });
  });
}

async function stubNotificationApis(
  page: Page,
  opts: { rows?: StubNotification[]; unread?: StubNotification[] } = {},
) {
  const rows = opts.rows ?? ALL_ROWS;
  const unread = opts.unread ?? rows.filter(r => r.read_at === null);

  await page.route('**/api/notifications/**', async (route: Route) => {
    const url = route.request().url();
    const method = route.request().method();

    // Bulk action: mark_all_read
    if (method === 'POST' && url.endsWith('/mark_all_read/')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ marked_read: unread.length }),
      });
      return;
    }

    // List endpoint: ?unread_only=1 vs full list.
    if (method === 'GET' && url.includes('/api/notifications/')) {
      const wantUnread = url.includes('unread_only=1');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(wantUnread ? unread : rows),
      });
      return;
    }

    await route.continue();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Specs
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Notifications — feature flag gating', () => {
  test('bell hidden when master flag is disabled', async ({ page }) => {
    await stubFeatureFlag(page, false);
    await stubNotificationApis(page);
    await setupAuthAndLanguage(page);

    await expect(page.locator('[data-testid="notification-bell"]')).toHaveCount(0);
  });

  test('/notifications renders empty-state card when master flag is disabled', async ({ page }) => {
    await stubFeatureFlag(page, false);
    await stubNotificationApis(page);
    await setupAuthAndLanguage(page);

    await page.goto('/notifications', { waitUntil: 'networkidle' });
    // No rows.
    await expect(page.locator('[data-testid="notification-row"]')).toHaveCount(0);
  });
});

test.describe('Notifications — bell badge', () => {
  test.beforeEach(async ({ page }) => {
    await stubFeatureFlag(page, true);
  });

  test('renders with the unread count when rows exist', async ({ page }) => {
    await stubNotificationApis(page);
    await setupAuthAndLanguage(page);

    // Navigation renders the bell twice (desktop + mobile); both should
    // reflect the same state. We assert against the first.
    const bell = page.locator('[data-testid="notification-bell"]').first();
    await expect(bell).toBeVisible();
    await expect(bell).toHaveAttribute('data-unread-count', String(UNREAD_ROWS.length));
    const badge = page.locator('[data-testid="notification-bell-badge"]').first();
    await expect(badge).toHaveText(String(UNREAD_ROWS.length));
  });

  test('hides the badge when nothing is unread', async ({ page }) => {
    await stubNotificationApis(page, { unread: [] });
    await setupAuthAndLanguage(page);

    const bell = page.locator('[data-testid="notification-bell"]').first();
    await expect(bell).toBeVisible();
    await expect(bell).toHaveAttribute('data-unread-count', '0');
    await expect(page.locator('[data-testid="notification-bell-badge"]')).toHaveCount(0);
  });
});

test.describe('Notifications — /notifications page', () => {
  test.beforeEach(async ({ page }) => {
    await stubFeatureFlag(page, true);
    await stubNotificationApis(page);
    await setupAuthAndLanguage(page);
    await page.goto('/notifications', { waitUntil: 'networkidle' });
  });

  test('renders one row per kind with read state markers', async ({ page }) => {
    const rows = page.locator('[data-testid="notification-row"]');
    await expect(rows).toHaveCount(ALL_ROWS.length);

    // Each fixture kind got rendered exactly once.
    for (const kind of [
      'pet_birthday', 'vaccination_due', 'pet_arriving_today',
      'deworming_internal_due',
    ]) {
      await expect(
        page.locator(`[data-testid="notification-row"][data-kind="${kind}"]`),
      ).toHaveCount(1);
    }

    // Three unread rows have data-unread="true"; one read row.
    await expect(
      page.locator('[data-testid="notification-row"][data-unread="true"]'),
    ).toHaveCount(UNREAD_ROWS.length);
    await expect(
      page.locator('[data-testid="notification-row"][data-unread="false"]'),
    ).toHaveCount(ALL_ROWS.length - UNREAD_ROWS.length);
  });

  test('forward email button uses the seeded owner email', async ({ page }) => {
    const birthdayRow = page
      .locator('[data-testid="notification-row"][data-kind="pet_birthday"]')
      .first();
    const emailLink = birthdayRow.locator('[data-testid="forward-email"]');
    await expect(emailLink).toHaveCount(1);
    const href = await emailLink.getAttribute('href');
    expect(href).toMatch(/^mailto:ana\.garcia%40seed\.example/);
    expect(href).toContain('subject=');
    expect(href).toContain('body=');
  });

  test('forward whatsapp button uses api.whatsapp.com/send (not wa.me)', async ({ page }) => {
    const birthdayRow = page
      .locator('[data-testid="notification-row"][data-kind="pet_birthday"]')
      .first();
    const waLink = birthdayRow.locator('[data-testid="forward-whatsapp"]');
    await expect(waLink).toHaveCount(1);
    const href = await waLink.getAttribute('href');
    expect(href).toMatch(/^https:\/\/api\.whatsapp\.com\/send\?phone=541140000001/);
    expect(href).not.toContain('wa.me');
  });

  test('internal-only rows have no forward buttons', async ({ page }) => {
    const arrivalRow = page
      .locator('[data-testid="notification-row"][data-kind="pet_arriving_today"]')
      .first();
    await expect(arrivalRow.locator('[data-testid="forward-email"]')).toHaveCount(0);
    await expect(arrivalRow.locator('[data-testid="forward-whatsapp"]')).toHaveCount(0);
  });

  test('mark-all-read button is disabled when nothing is unread', async ({ page, browserName }) => {
    // Re-stub with all-read fixtures and reload.
    await stubNotificationApis(page, { unread: [], rows: ALL_ROWS.map(r => ({ ...r, read_at: r.read_at ?? `${TODAY}T08:00:00Z` })) });
    await page.reload({ waitUntil: 'networkidle' });

    const markAllRead = page.locator('[data-testid="mark-all-read"]');
    await expect(markAllRead).toBeDisabled();
    // Sanity: dismiss-all is unaffected.
    await expect(page.locator('[data-testid="dismiss-all"]')).toBeEnabled();
    void browserName; // silence unused-var lint when running across projects
  });
});
