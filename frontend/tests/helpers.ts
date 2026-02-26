import { Page } from '@playwright/test';

/**
 * Mock auth state in localStorage so the frontend renders the authenticated view.
 * Must be called BEFORE navigating to the page (use page.goto after this).
 */
export async function setupAuth(page: Page, opts?: { admin?: boolean }) {
  const role = opts?.admin ? 'admin' : 'user';
  const mockUser = {
    id: 1,
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    full_name: 'Test User',
    role,
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  };
  const mockTokens = {
    access: 'mock-access-token',
    refresh: 'mock-refresh-token',
  };

  // We need to visit a page first to set localStorage on the correct origin
  await page.goto('/', { waitUntil: 'commit' });
  await page.evaluate(
    ({ user, tokens }) => {
      localStorage.setItem('auth_user', JSON.stringify(user));
      localStorage.setItem('auth_tokens', JSON.stringify(tokens));
    },
    { user: mockUser, tokens: mockTokens },
  );
}

/**
 * Set the preferred language in localStorage.
 * Must be called after navigating to the origin (or after setupAuth which does that).
 */
export async function setLanguage(page: Page, lang: 'en' | 'es') {
  await page.evaluate((l) => {
    localStorage.setItem('preferred_language', l);
  }, lang);
}

/**
 * Setup auth + language and reload to apply both.
 */
export async function setupAuthAndLanguage(
  page: Page,
  opts?: { admin?: boolean; lang?: 'en' | 'es' },
) {
  await setupAuth(page, { admin: opts?.admin });
  await setLanguage(page, opts?.lang || 'en');
  await page.reload({ waitUntil: 'networkidle' });
}
