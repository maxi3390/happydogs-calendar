/**
 * Logo shape feature: square / circle toggle.
 *
 * The shape lives on ``NurserySetting.logo_shape`` and applies to every
 * surface that renders the system logo:
 *   - Navigation header (every authenticated page).
 *   - Login page.
 *   - Settings page upload preview.
 *
 * These specs mock ``GET /api/settings/`` so we can flip the persisted
 * shape value without round-tripping through the backend, and assert
 * that the matching ``data-shape`` attribute is set on each surface.
 * The PATCH path (toggle button -> persisted change) is asserted by
 * intercepting ``PATCH /api/settings/update/`` and checking the body.
 *
 * The localStorage cache (``nursery_logo_cache`` key) is exercised by
 * the "first paint matches persisted shape" specs at the bottom — they
 * pre-seed the cache via ``addInitScript`` so the lazy ``useState``
 * initialiser hydrates synchronously, and they delay the GET response
 * so a regression that drops the cache fails the assertion before the
 * fetch resolves.
 */
import { test, expect, Page, Route } from '@playwright/test';
import { setupAuthAndLanguage } from './helpers';

const LOGO_CACHE_KEY = 'nursery_logo_cache';

type Shape = 'square' | 'circle';

interface SettingsBody {
  logo_shape?: Shape;
  logo_url?: string | null;
}

const TODAY = '2026-04-29T00:00:00Z';

function buildSettings(overrides: SettingsBody = {}) {
  return {
    daily_booking_limit: 0,
    logo_url: overrides.logo_url ?? null,
    logo_shape: overrides.logo_shape ?? 'circle',
    notifications_run_time: '07:00:00',
    deworming_default_due_days: 90,
    notifications_vaccination_enabled: true,
    notifications_arrivals_enabled: true,
    notifications_egress_enabled: true,
    notifications_birthdays_enabled: true,
    notifications_deworming_enabled: true,
    notification_recipient_lookback_days: 30,
    updated_at: TODAY,
  };
}

/**
 * Stub the settings endpoints. Returns the mutable ``state`` so a test
 * that flips the shape can assert later GETs see the new value, and a
 * ``patches`` array so a test that toggles in the UI can assert the
 * outgoing PATCH body. ``getDelayMs`` lets a test slow down GET so it
 * can assert the localStorage cache hydrates the initial render
 * before the fetch resolves.
 */
function stubSettings(
  page: Page,
  initial: SettingsBody = {},
  opts: { getDelayMs?: number } = {},
) {
  const state: SettingsBody = { logo_shape: 'circle', logo_url: null, ...initial };
  const patches: SettingsBody[] = [];

  page.route('**/api/settings/', async (route: Route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    if (opts.getDelayMs) {
      await new Promise(r => setTimeout(r, opts.getDelayMs));
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(buildSettings(state)),
    });
  });

  page.route('**/api/settings/update/', async (route: Route) => {
    if (!['PATCH', 'PUT'].includes(route.request().method())) {
      await route.continue();
      return;
    }
    const body = JSON.parse(route.request().postData() || '{}') as SettingsBody;
    patches.push(body);
    if (body.logo_shape) state.logo_shape = body.logo_shape;
    if ('logo_url' in body) state.logo_url = body.logo_url;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(buildSettings(state)),
    });
  });

  return { state, patches };
}

/**
 * Pre-populate the localStorage cache before any page script runs.
 * Used by the "first paint matches persisted shape" specs.
 */
async function seedLogoCache(page: Page, cache: { shape: Shape; url: string | null }) {
  const json = JSON.stringify(cache);
  await page.addInitScript(
    ({ key, value }) => window.localStorage.setItem(key, value),
    { key: LOGO_CACHE_KEY, value: json },
  );
}

test.describe('Logo shape — Settings page', () => {
  test('toggle reflects the persisted value (circle)', async ({ page }) => {
    stubSettings(page, { logo_shape: 'circle' });
    await setupAuthAndLanguage(page);
    await page.goto('/settings', { waitUntil: 'networkidle' });

    await expect(page.getByTestId('logo-shape-toggle')).toBeVisible();
    await expect(page.getByTestId('logo-shape-circle')).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByTestId('logo-shape-square')).toHaveAttribute('aria-checked', 'false');
    await expect(page.getByTestId('picture-preview')).toHaveAttribute('data-shape', 'circle');
  });

  test('toggle reflects the persisted value (square)', async ({ page }) => {
    stubSettings(page, { logo_shape: 'square' });
    await setupAuthAndLanguage(page);
    await page.goto('/settings', { waitUntil: 'networkidle' });

    await expect(page.getByTestId('logo-shape-square')).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByTestId('logo-shape-circle')).toHaveAttribute('aria-checked', 'false');
    await expect(page.getByTestId('picture-preview')).toHaveAttribute('data-shape', 'square');
  });

  test('clicking the inactive option PATCHes the new shape and re-clips the preview', async ({ page }) => {
    const { patches } = stubSettings(page, { logo_shape: 'circle' });
    await setupAuthAndLanguage(page);
    await page.goto('/settings', { waitUntil: 'networkidle' });

    await page.getByTestId('logo-shape-square').click();

    // PATCH lands.
    await expect.poll(
      () => patches.some(p => p.logo_shape === 'square'),
    ).toBe(true);

    // Preview re-clips immediately (optimistic update).
    await expect(page.getByTestId('picture-preview')).toHaveAttribute('data-shape', 'square');
    await expect(page.getByTestId('logo-shape-square')).toHaveAttribute('aria-checked', 'true');
  });
});

test.describe('Logo shape — Navigation header', () => {
  test('header logo reflects the persisted shape (circle)', async ({ page }) => {
    stubSettings(page, { logo_shape: 'circle' });
    await setupAuthAndLanguage(page);
    await page.goto('/', { waitUntil: 'networkidle' });

    await expect(page.getByTestId('nav-logo')).toHaveAttribute('data-shape', 'circle');
  });

  test('header logo reflects the persisted shape (square)', async ({ page }) => {
    stubSettings(page, { logo_shape: 'square' });
    await setupAuthAndLanguage(page);
    await page.goto('/', { waitUntil: 'networkidle' });

    await expect(page.getByTestId('nav-logo')).toHaveAttribute('data-shape', 'square');
  });

  // Regression for the "image doesn't fill its container" issue: in
  // both shapes, the rendered <img> SHALL be ``w-full h-full`` so the
  // logo fills the navigation slot exactly the way the settings
  // preview does. Tied to the ``data-shape`` attribute so a future
  // refactor that reverts the fix breaks loudly.
  test('square logo fills the nav container (object-contain)', async ({ page }) => {
    stubSettings(page, { logo_shape: 'square', logo_url: 'http://localhost/test-logo.png' });
    await setupAuthAndLanguage(page);
    await page.goto('/', { waitUntil: 'networkidle' });

    const img = page.locator('[data-testid="nav-logo"] img');
    await expect(img).toBeVisible();
    const cls = await img.getAttribute('class');
    expect(cls).toContain('w-full');
    expect(cls).toContain('h-full');
    expect(cls).toContain('object-contain');
  });

  test('circle logo fills the nav container (object-cover)', async ({ page }) => {
    stubSettings(page, { logo_shape: 'circle', logo_url: 'http://localhost/test-logo.png' });
    await setupAuthAndLanguage(page);
    await page.goto('/', { waitUntil: 'networkidle' });

    const img = page.locator('[data-testid="nav-logo"] img');
    await expect(img).toBeVisible();
    const cls = await img.getAttribute('class');
    expect(cls).toContain('w-full');
    expect(cls).toContain('h-full');
    expect(cls).toContain('object-cover');
  });
});

test.describe('Logo shape — Login page', () => {
  test('login logo reflects the persisted shape (square)', async ({ page }) => {
    stubSettings(page, { logo_shape: 'square' });
    // Login page is unauthenticated; visit directly without setupAuth
    // but still mock the i18n endpoints so the page renders English.
    await page.goto('/login', { waitUntil: 'networkidle' });
    await expect(page.getByTestId('login-logo')).toHaveAttribute('data-shape', 'square');
  });

  test('login logo defaults to circle when settings expose circle', async ({ page }) => {
    stubSettings(page, { logo_shape: 'circle' });
    await page.goto('/login', { waitUntil: 'networkidle' });
    await expect(page.getByTestId('login-logo')).toHaveAttribute('data-shape', 'circle');
  });
});

test.describe('Logo shape — first-paint cache', () => {
  // The localStorage cache (``nursery_logo_cache``) survives reloads so
  // the first paint matches the operator's persisted choice — without
  // it, every load shows ``circle`` for a frame before the fetch
  // resolves. These specs delay the GET so a regression that drops
  // the cache fails before the network update lands.

  test('navigation header hydrates from cache before GET resolves', async ({ page }) => {
    // Cache says ``square``; server says ``square`` (consistent so the
    // assertion stays clean).  Delay the GET by 1 s so the initial
    // paint is the only thing we measure.
    await seedLogoCache(page, { shape: 'square', url: null });
    stubSettings(page, { logo_shape: 'square' }, { getDelayMs: 1_000 });

    await setupAuthAndLanguage(page);
    await page.goto('/', { waitUntil: 'commit' });

    // ``commit`` returns as soon as the navigation commits, well before
    // the delayed GET fulfils. The data-shape attribute SHALL already
    // reflect the cached value.
    await expect(page.getByTestId('nav-logo')).toHaveAttribute('data-shape', 'square');
  });

  test('login page hydrates from cache before GET resolves', async ({ page }) => {
    await seedLogoCache(page, { shape: 'square', url: null });
    stubSettings(page, { logo_shape: 'square' }, { getDelayMs: 1_000 });

    await page.goto('/login', { waitUntil: 'commit' });
    await expect(page.getByTestId('login-logo')).toHaveAttribute('data-shape', 'square');
  });

  test('cache is refreshed after the GET resolves', async ({ page }) => {
    // No initial cache; server says ``square``. The fetch SHALL
    // populate the cache so the next mount paints square synchronously.
    stubSettings(page, { logo_shape: 'square' });
    await setupAuthAndLanguage(page);
    await page.goto('/', { waitUntil: 'networkidle' });

    const cached = await page.evaluate(
      (key) => window.localStorage.getItem(key),
      LOGO_CACHE_KEY,
    );
    expect(cached).not.toBeNull();
    const parsed = JSON.parse(cached!) as { shape: Shape };
    expect(parsed.shape).toBe('square');
  });

  test('settings PATCH refreshes the cache so a later mount paints fresh', async ({ page }) => {
    stubSettings(page, { logo_shape: 'circle' });
    await setupAuthAndLanguage(page);
    await page.goto('/settings', { waitUntil: 'networkidle' });

    await page.getByTestId('logo-shape-square').click();

    // Cache reflects the new value once the PATCH resolves.
    await expect.poll(async () => {
      const raw = await page.evaluate(
        (key) => window.localStorage.getItem(key),
        LOGO_CACHE_KEY,
      );
      if (!raw) return null;
      return (JSON.parse(raw) as { shape: Shape }).shape;
    }).toBe('square');
  });
});
