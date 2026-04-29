/**
 * Feature flag gating for ``/ui-system`` and ``/admin/activity``.
 *
 * Both surfaces used to be always-on for admins; the change in
 * ``feat/feature-flag-ui-system-and-activity-logs`` puts each behind a
 * dedicated feature flag so an operator can hide them on the
 * ``/admin/feature-flags`` page without a code deploy. These specs lock
 * in the contract — when the flag is off:
 *   1. The nav entry in the admin profile dropdown is absent.
 *   2. Visiting the page directly renders the empty-state card
 *      (``data-testid="ui-system-disabled"`` / ``"activity-disabled"``).
 *
 * Backend gating for ``activity_logs`` (404 on the API endpoint) is
 * locked in by ``audit_log/tests/test_activity_feed.py``.
 */
import { test, expect } from '@playwright/test';
import { setupAuthAndLanguage, stubFeatureFlags } from './helpers';

test.describe('UI System feature flag', () => {
  test('admin profile dropdown hides the link when ui_system is off', async ({ page }) => {
    await stubFeatureFlags(page, { ui_system: false });
    await setupAuthAndLanguage(page, { admin: true });

    await page.getByRole('button').filter({ hasText: 'Test' }).first().click();
    await expect(
      page.getByRole('menuitem', { name: /ui system|sistema de ui/i }),
    ).toHaveCount(0);
  });

  test('admin profile dropdown shows the link when ui_system is on', async ({ page }) => {
    await stubFeatureFlags(page, { ui_system: true });
    await setupAuthAndLanguage(page, { admin: true });

    await page.getByRole('button').filter({ hasText: 'Test' }).first().click();
    await expect(
      page.getByRole('menuitem', { name: /ui system|sistema de ui/i }).first(),
    ).toBeVisible();
  });

  test('/ui-system renders the empty-state card when ui_system is off', async ({ page }) => {
    await stubFeatureFlags(page, { ui_system: false });
    await setupAuthAndLanguage(page, { admin: true });

    await page.goto('/ui-system', { waitUntil: 'networkidle' });
    await expect(page.getByTestId('ui-system-disabled')).toBeVisible();
    // The full reference page has the "UI Components Library" heading;
    // confirm it does not render under the disabled branch.
    await expect(
      page.getByRole('heading', { name: /ui components library/i }),
    ).toHaveCount(0);
  });
});

test.describe('Activity logs feature flag', () => {
  test('admin profile dropdown hides the link when activity_logs is off', async ({ page }) => {
    await stubFeatureFlags(page, { activity_logs: false });
    await setupAuthAndLanguage(page, { admin: true });

    await page.getByRole('button').filter({ hasText: 'Test' }).first().click();
    await expect(
      page.getByRole('menuitem', { name: /^activity$|^actividad$/i }),
    ).toHaveCount(0);
  });

  test('admin profile dropdown shows the link when activity_logs is on', async ({ page }) => {
    await stubFeatureFlags(page, { activity_logs: true });
    await setupAuthAndLanguage(page, { admin: true });

    await page.getByRole('button').filter({ hasText: 'Test' }).first().click();
    await expect(
      page.getByRole('menuitem', { name: /^activity$|^actividad$/i }).first(),
    ).toBeVisible();
  });

  test('/admin/activity renders the empty-state card when activity_logs is off', async ({ page }) => {
    await stubFeatureFlags(page, { activity_logs: false });
    await setupAuthAndLanguage(page, { admin: true });

    await page.goto('/admin/activity', { waitUntil: 'networkidle' });
    await expect(page.getByTestId('activity-disabled')).toBeVisible();
    // Filter row + activity table belong to the enabled branch only.
    await expect(page.getByTestId('activity-table')).toHaveCount(0);
  });
});
