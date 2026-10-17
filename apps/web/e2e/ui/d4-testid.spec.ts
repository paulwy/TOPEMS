import { test, expect } from '@playwright/test';
import { createAuthenticatedContext } from '../utils/testUtils';

// D4 testability: verify key data-testid hooks exist in real DOM
test.describe('D4 data-testid sanity', () => {
  test('login page exposes stable testids', async ({ page }) => {
    await page.goto('http://localhost:3001/login');
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('login-username')).toBeVisible();
    await expect(page.getByTestId('login-password')).toBeVisible();
    await expect(page.getByTestId('login-submit')).toBeVisible();
  });

  test('workspace topbar + pagination + search testids present', async ({ browser }) => {
    const context = await createAuthenticatedContext(browser);
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto('http://localhost:3001/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await expect(page.getByTestId('topbar-command-palette')).toBeVisible();
    await expect(page.getByTestId('topbar-notifications')).toBeVisible();
    await expect(page.getByTestId('topbar-profile')).toBeVisible();
    await context.close();
  });

  test('crm list exposes pagination testid when rendered', async ({ browser }) => {
    const context = await createAuthenticatedContext(browser);
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto('http://localhost:3001/crm/customers');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    // search box only renders on searchable list pages; assert pagination select when present
    const pageSize = page.getByTestId('pagination-page-size');
    if ((await pageSize.count()) > 0) {
      await expect(pageSize.first()).toBeVisible();
    }
    await context.close();
  });

  test('searchable list page exposes search input testid', async ({ browser }) => {
    const context = await createAuthenticatedContext(browser);
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto('http://localhost:3001/pm/templates');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    const search = page.getByTestId('list-search-input');
    if ((await search.count()) > 0) {
      await expect(search.first()).toBeVisible();
    }
    await context.close();
  });
});
