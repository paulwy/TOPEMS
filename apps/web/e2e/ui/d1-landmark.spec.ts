import { test, expect } from '@playwright/test';
import { createAuthenticatedContext } from '../utils/testUtils';

// D1 wrap-up: verify main landmark + h1 semantics + no empty headings
test.describe('D1 landmark & heading wrap-up', () => {
  test('login page has main landmark + single h1', async ({ page }) => {
    await page.goto('http://localhost:3001/login');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveCount(1);
    const h1 = (await page.locator('h1').textContent()) ?? '';
    expect(h1.trim().length).toBeGreaterThan(0);
  });

  test('workspace list page keeps main + single h1 + no empty headings', async ({ browser }) => {
    const context = await createAuthenticatedContext(browser);
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto('http://localhost:3001/crm/customers');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await expect(page.locator('main')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveCount(1);
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents();
    for (const h of headings) {
      expect(h.trim().length).toBeGreaterThan(0);
    }
    await context.close();
  });

  test('crm customer detail page: real h1, no empty headings', async ({ browser }) => {
    const context = await createAuthenticatedContext(browser);
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto('http://localhost:3001/crm/customers/new');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await expect(page.locator('h1')).toHaveCount(1);
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents();
    for (const h of headings) {
      expect(h.trim().length).toBeGreaterThan(0);
    }
    await context.close();
  });
});
