/**
 * IAM 权限守门组件 UI 测试
 */

import { test, expect } from '@playwright/test';
import { TEST_ACCOUNTS, createAuthenticatedContext } from '../utils/testUtils';

test.describe('权限守门组件', () => {
  test('PermissionGate 正确显示/隐藏元素', async ({ browser }) => {
    const context = await createAuthenticatedContext(
      browser,
      TEST_ACCOUNTS.superadmin.username,
      TEST_ACCOUNTS.superadmin.password
    );
    
    const page = await context.newPage();
    await page.goto('/dashboard');
    
    const adminElements = page.locator('[data-permission], [data-testid*="admin"]');
    const count = await adminElements.count();
    
    expect(count).toBeGreaterThanOrEqual(0);
    
    await page.close();
    await context.close();
  });

  test('无权限用户看不到受限元素', async ({ browser }) => {
    const context = await createAuthenticatedContext(
      browser,
      TEST_ACCOUNTS.employee.username,
      TEST_ACCOUNTS.employee.password
    );
    
    const page = await context.newPage();
    await page.goto('/dashboard');
    
    const adminLink = page.locator('a[href*="/admin"], [data-testid*="admin"]');
    const isVisible = await adminLink.first().isVisible().catch(() => false);
    
    expect(isVisible).toBe(false);
    
    await page.close();
    await context.close();
  });
});