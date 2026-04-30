import { test, expect } from '@playwright/test';
import { setupAuthAndLanguage, createOwnerViaApi, createPetViaApi } from './helpers';

/**
 * Regression: PetDetailsPopup's ``formatWeight`` used to call
 * ``weight.toFixed(2)`` directly on the value the API returned.
 * Django's ``DecimalField`` serializes to a STRING (``"13.30"``),
 * not a number — so opening the popup for a pet whose weight was
 * set crashed the dialog's body with
 * ``TypeError: e.toFixed is not a function``.
 *
 * The popup catches the error inside the data-driven body, so the
 * dialog frame still renders but the weight cell never paints.
 * This test arranges the exact failing case and asserts both the
 * console stays clean AND the formatted weight shows up.
 */
test.describe('PetDetailsPopup — weight rendering', () => {
  test('renders weight without throwing toFixed on a string', async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => {
      pageErrors.push(err.message);
    });

    await setupAuthAndLanguage(page);
    const owner = await createOwnerViaApi(page);
    await createPetViaApi(page, owner.id, { name: 'WeightyPup', weight: 13.3 });

    await page.goto('/owners', { waitUntil: 'networkidle' });

    // Expand the owner card. Cards are clickable divs (not buttons),
    // matched by text the same way ``openAddPetFormForOwner`` does.
    await page
      .locator('div[class*="bg-card"]')
      .filter({ hasText: `${owner.first_name} ${owner.last_name}` })
      .first()
      .click();

    // Open the pet details popup. The pet button inside the expanded
    // accordion has the pet name as its accessible name (via ``title``).
    const petButton = page.getByRole('button', { name: 'WeightyPup' });
    await petButton.waitFor({ state: 'visible' });
    await petButton.click();

    // The dialog should render with the weight cell visible. Use a regex to
    // match the formatted output (``13.30 kg`` per ``formatWeight``) so a
    // future format change to ``13.30 kg`` vs ``13,30 kg`` (i18n) still
    // matches. Anchored to ``kg`` to disambiguate from the other numeric
    // bits in the dialog (age, dominance, etc.).
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/13\.30 kg/)).toBeVisible();

    expect(
      pageErrors.filter(m => /toFixed is not a function/i.test(m)),
      'pet details popup must not throw on string-shaped weight',
    ).toEqual([]);
    expect(
      consoleErrors.filter(m => /toFixed is not a function/i.test(m)),
      'pet details popup must not log toFixed errors',
    ).toEqual([]);
  });

  test('renders the em-dash placeholder when weight is null', async ({ page }) => {
    await setupAuthAndLanguage(page);
    const owner = await createOwnerViaApi(page);
    await createPetViaApi(page, owner.id, { name: 'NoWeightPup' });

    await page.goto('/owners', { waitUntil: 'networkidle' });
    await page
      .locator('div[class*="bg-card"]')
      .filter({ hasText: `${owner.first_name} ${owner.last_name}` })
      .first()
      .click();
    const petButton = page.getByRole('button', { name: 'NoWeightPup' });
    await petButton.waitFor({ state: 'visible' });
    await petButton.click();

    // Weight cell shows the em-dash. Locate the cell by its label so we
    // don't conflate with other em-dashes that might appear elsewhere
    // (deworming dates, etc.).
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    const weightCell = dialog.locator('div', { hasText: /weight|peso/i }).filter({ has: page.locator('p') }).first();
    await expect(weightCell).toContainText('—');
  });
});
