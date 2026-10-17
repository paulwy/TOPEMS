import { test, expect } from '@playwright/test';
import { createAuthenticatedContext } from '../utils/testUtils';

// D2 i18n alignment: verify no raw-key leakage after backfilling zh<->en keys
test.describe('D2 i18n render sanity', () => {
  async function openPage(browser: any, url: string, lang: string) {
    const context = await createAuthenticatedContext(browser, 'test_admin', 'admin123');
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto('http://localhost:3001/');
    await page.evaluate((l) => localStorage.setItem('language', l), lang);
    await page.goto(`http://localhost:3001${url}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    return { context, page };
  }

  test('en HRM dashboard renders without raw keys', async ({ browser }) => {
    const { context, page } = await openPage(browser, '/hrm', 'en');
    const body = await page.locator('body').innerText();
    expect(body).toContain('HR Dashboard');
    expect(body).not.toMatch(/hrm\.[a-z0-9_.]+|hrm_dashboard_page\./i);
    await context.close();
  });

  test('en employee list renders without raw keys', async ({ browser }) => {
    const { context, page } = await openPage(browser, '/hrm/employees', 'en');
    const body = await page.locator('body').innerText();
    expect(body).toMatch(/Home|Employees|HRM/i);
    expect(body).not.toMatch(/hrm_employee_create_page\.|hrm_employee_edit_page\./i);
    await context.close();
  });

  test('zh workspace renders without raw keys', async ({ browser }) => {
    const { context, page } = await openPage(browser, '/', 'zh');
    const body = await page.locator('body').innerText();
    expect(body).toContain('工作台');
    expect(body).not.toMatch(/dashboard\.[a-z0-9_.]+|common\.[a-z0-9_.]+/i);
    await context.close();
  });

  test('en CRM contracts renders without raw keys', async ({ browser }) => {
    const { context, page } = await openPage(browser, '/crm/contracts', 'en');
    const body = await page.locator('body').innerText();
    expect(body).not.toMatch(/contract_redesign\.|opportunity_redesign\./i);
    await context.close();
  });
});
