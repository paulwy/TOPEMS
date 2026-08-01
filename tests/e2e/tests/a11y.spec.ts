/**
 * TOPEMS Accessibility (axe-core) E2E tests — P34-6.
 *
 * Runs axe-core against the most important user-facing pages and asserts
 * there are no serious/critical WCAG violations. Tagged `@a11y` so it can be
 * run in isolation:
 *
 *   npx playwright test --grep "@a11y"
 *
 * Design notes:
 * - The login-page test always runs (no backend required, the form renders
 *   from the Vite dev server started by the Playwright `webServer`).
 * - Authenticated-page tests probe the IAM backend first and skip gracefully
 *   when it is unreachable (e.g. the lightweight CI job that only boots the
 *   web dev server), so the suite stays green without a full backend stack
 *   while still running the full scan in dev / the complete e2e workflow.
 * - Only `critical` and `serious` impacts are treated as failures; minor /
 *   moderate issues are surfaced in the report but do not break the build.
 */

import { test, expect } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';
import { loginViaUi, TEST_USERS } from '../helpers/auth';

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:8080';

interface AxeScanResult {
  violations: Array<{ impact?: string | null }>;
}

/**
 * Quick connectivity probe for the IAM backend. Returns true when the API is
 * reachable — any HTTP status (including 401) proves the service is up.
 */
async function backendReachable(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/core/iam/auth/me`, {
      signal: AbortSignal.timeout(5_000),
    });
    return typeof res?.status === 'number';
  } catch {
    return false;
  }
}

/** Filter axe results to only blocking (serious/critical) violations. */
function blockingViolations(results: AxeScanResult) {
  return results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious'
  );
}

test.describe('Accessibility @a11y', () => {
  // Start every a11y test from a clean session: the login-page test must not be
  // affected by a persisted storageState, and authenticated tests rely solely
  // on loginViaUi() to establish the session.
  test.use({ storageState: { cookies: [], origins: [] } });

  test('login page has no serious/critical a11y violations', async ({ page }) => {
    await page.goto('/login');
    // Ensure the form is interactive before scanning.
    await expect(
      page.getByRole('button', { name: /登录|login|sign in/i })
    ).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    expect(blockingViolations(results)).toEqual([]);
  });

  test('dashboard has no serious/critical a11y violations', async ({ page }) => {
    test.skip(
      !(await backendReachable()),
      'IAM backend unreachable — skipping authenticated a11y check'
    );
    await loginViaUi(page, TEST_USERS.admin);
    await page.goto('/dashboard');

    const results = await new AxeBuilder({ page }).analyze();
    expect(blockingViolations(results)).toEqual([]);
  });

  test('production orders page has no serious/critical a11y violations', async ({
    page,
  }) => {
    test.skip(
      !(await backendReachable()),
      'IAM backend unreachable — skipping authenticated a11y check'
    );
    await loginViaUi(page, TEST_USERS.admin);
    await page.goto('/mes/production-orders');

    const results = await new AxeBuilder({ page }).analyze();
    expect(blockingViolations(results)).toEqual([]);
  });

  test('inventory page has no serious/critical a11y violations', async ({
    page,
  }) => {
    test.skip(
      !(await backendReachable()),
      'IAM backend unreachable — skipping authenticated a11y check'
    );
    await loginViaUi(page, TEST_USERS.admin);
    await page.goto('/wms/inventory');

    const results = await new AxeBuilder({ page }).analyze();
    expect(blockingViolations(results)).toEqual([]);
  });
});
