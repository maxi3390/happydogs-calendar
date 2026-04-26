import { test, expect } from '@playwright/test';
import { setupAuthAndLanguage } from './helpers';

// Covers the per-user-language-preference change. The contract is:
//
//   1. user.language wins over localStorage.preferred_language.
//   2. setLanguage() while authenticated PATCHes /api/users/me/language/
//      and persists the new value back into auth_user.
//   3. Logout + log back in restores the user's stored preference (which
//      this spec exercises by simulating a fresh page load with only the
//      user-level value present).

test.describe('Per-user language preference', () => {
  test('user.language overrides a stale localStorage value', async ({ page }) => {
    // Authenticated user with language='es' but localStorage saying 'en'.
    await setupAuthAndLanguage(page, { lang: 'en' });
    // Patch only the cached user object to flip language to Spanish,
    // without touching localStorage.preferred_language. Reload.
    await page.evaluate(() => {
      const raw = localStorage.getItem('auth_user');
      if (raw) {
        const u = JSON.parse(raw);
        u.language = 'es';
        localStorage.setItem('auth_user', JSON.stringify(u));
      }
      // localStorage.preferred_language stays 'en' (set by setupAuthAndLanguage).
    });
    await page.reload({ waitUntil: 'networkidle' });

    // The user's stored 'es' wins over the device's 'en'.
    await expect(page.locator('header select').first()).toHaveValue('es');
  });

  test('changing language while authenticated persists to the user', async ({ page }) => {
    await setupAuthAndLanguage(page, { lang: 'en' });

    // Capture the PATCH so we can assert it goes out.
    const patchPromise = page.waitForRequest(
      req => req.method() === 'PATCH'
        && req.url().endsWith('/api/users/me/language/'),
    );

    // Switch to Spanish via the LanguageSwitcher.
    await page.locator('header select').first().selectOption('es');

    const patch = await patchPromise;
    expect(patch.postDataJSON()).toEqual({ language: 'es' });

    // Eventually the cached user reflects the new language.
    await expect.poll(async () => {
      return await page.evaluate(() => {
        const raw = localStorage.getItem('auth_user');
        return raw ? JSON.parse(raw).language : null;
      });
    }).toBe('es');
  });
});
