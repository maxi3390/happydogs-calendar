import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { setupAuthAndLanguage } from './helpers';

/**
 * Page-level axe-core scans for the main authenticated routes plus the two
 * unauthenticated entry points. Companion to the manual a11y fixes that
 * landed in ``fix(a11y): resolve label, contrast, and announcement
 * violations``.
 *
 * Threshold strategy:
 *
 * * Hard-fail on ``critical`` (missing accessible names, broken form
 *   labelling, etc.). These are unambiguous bugs that screen-reader users
 *   can't work around; a regression should block the branch.
 *
 * * Log ``serious`` violations to the test report but do NOT fail. The
 *   biggest serious-tier offender is ``color-contrast``, which is mostly
 *   a design-token problem (Tailwind ``text-muted-foreground`` against
 *   ``bg-card``) that needs a wider sweep across the design system. We
 *   want visibility on regressions without blocking unrelated work
 *   while that effort is pending. ``link-in-text-block`` is similar —
 *   it requires changing the link visual treatment app-wide.
 *
 * * Log ``moderate`` and ``minor`` for completeness; they're informational.
 *
 * Once the design-system pass burns down the serious-tier backlog, flip
 * ``HARD_FAIL_IMPACTS`` to include ``serious`` (the change is one line).
 *
 * axe-core is a static DOM analyzer. It does NOT verify screen reader
 * announcements, real keyboard journeys (Tab / Shift+Tab / Enter), or
 * dynamic-state contrast (hover, focus, dark-mode-only bugs). Those
 * gaps need manual testing or a separate keyboard-journey suite.
 *
 * The whole suite runs only on the chromium project. axe analyses the
 * DOM, not the browser, so the same scan on Firefox / mobile-chrome
 * adds no signal — just runtime.
 */

const HARD_FAIL_IMPACTS = ['critical'] as const;

interface AxeViolation {
  id: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor' | null;
  description: string;
  helpUrl: string;
  nodes: Array<{ target: string[] | unknown[]; html: string }>;
}

async function scanPage(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
    .analyze();
  return result.violations as unknown as AxeViolation[];
}

function partition(violations: AxeViolation[]) {
  const blocking: AxeViolation[] = [];
  const informational: AxeViolation[] = [];
  for (const v of violations) {
    if (v.impact && (HARD_FAIL_IMPACTS as readonly string[]).includes(v.impact)) {
      blocking.push(v);
    } else {
      informational.push(v);
    }
  }
  return { blocking, informational };
}

function format(v: AxeViolation): string {
  const targets = v.nodes
    .slice(0, 3)
    .map(n => Array.isArray(n.target) ? n.target.join(' ') : String(n.target));
  const more = v.nodes.length > 3 ? ` (+${v.nodes.length - 3} more nodes)` : '';
  return `[${v.impact}] ${v.id} — ${v.description}\n  see: ${v.helpUrl}\n  on:  ${targets.join(' | ')}${more}`;
}

async function expectClean(page: Page, label: string) {
  const violations = await scanPage(page);
  const { blocking, informational } = partition(violations);

  // Surface moderate/minor in the Playwright report so contributors
  // can see the long tail without having to rerun with --verbose.
  if (informational.length > 0) {
    console.warn(
      `[a11y:${label}] ${informational.length} moderate/minor violation(s):\n` +
        informational.map(format).join('\n'),
    );
  }

  expect(
    blocking,
    `[a11y:${label}] ${blocking.length} critical violation(s):\n` +
      blocking.map(format).join('\n'),
  ).toEqual([]);
}

// Each test runs the full DOM scan after the page reaches a stable
// idle state (so dynamically-rendered components like modals + lists
// are present in the analyzed tree). Tests skip on non-chromium
// projects because axe analyses the DOM, not browser behaviour.
test.describe('Accessibility', () => {
  test.beforeEach(({ browserName }) => {
    test.skip(browserName !== 'chromium', 'axe runs once; same DOM regardless of browser');
  });

  test('login page', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await expectClean(page, 'login');
  });

  test('register page', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    await expectClean(page, 'register');
  });

  test('home / calendar', async ({ page }) => {
    await setupAuthAndLanguage(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expectClean(page, 'home');
  });

  test('pets page', async ({ page }) => {
    await setupAuthAndLanguage(page);
    await page.goto('/pets');
    await page.waitForLoadState('networkidle');
    await expectClean(page, 'pets');
  });

  test('owners page', async ({ page }) => {
    await setupAuthAndLanguage(page);
    await page.goto('/owners');
    await page.waitForLoadState('networkidle');
    await expectClean(page, 'owners');
  });

  test('settings page', async ({ page }) => {
    await setupAuthAndLanguage(page, { admin: true });
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await expectClean(page, 'settings');
  });

  test('profile page', async ({ page }) => {
    await setupAuthAndLanguage(page);
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    await expectClean(page, 'profile');
  });

  test('admin users page', async ({ page }) => {
    await setupAuthAndLanguage(page, { admin: true });
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    await expectClean(page, 'admin-users');
  });

  test('admin activity page', async ({ page }) => {
    await setupAuthAndLanguage(page, { admin: true });
    await page.goto('/admin/activity');
    await page.waitForLoadState('networkidle');
    await expectClean(page, 'admin-activity');
  });

  test('vets page', async ({ page }) => {
    await setupAuthAndLanguage(page);
    await page.goto('/vets');
    await page.waitForLoadState('networkidle');
    await expectClean(page, 'vets');
  });
});
