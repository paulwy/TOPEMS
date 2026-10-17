import { test, expect, Browser, Page } from '@playwright/test';
// 复用 testUtils 的 createAuthenticatedContext：完整注入 token/user/roles/permissions/
// token_expiry/topems_user/last_activity/topems-auth-storage（AuthProvider 需完整 auth 状态，
// 仅注入 token 会被判定未登录并踢回 /login）
import { createAuthenticatedContext } from '../utils/testUtils';

test.describe('认证流程测试', () => {
  test('登录后应能访问 dashboard', async ({ browser }) => {
    const context = await createAuthenticatedContext(browser, 'test_admin', 'admin123');
    const page = await context.newPage();
    
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    expect(page.url()).not.toContain('/login');
    
    await context.close();
  });

  test('登录后页面应包含页面内容', async ({ browser }) => {
    const context = await createAuthenticatedContext(browser, 'test_admin', 'admin123');
    const page = await context.newPage();
    
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const pageContent = page.locator('main, [role="main"], .MuiContainer-root');
    const hasContent = await pageContent.first().isVisible().catch(() => false);
    expect(hasContent).toBe(true);
    
    await context.close();
  });

  test('登录后侧边栏应可见', async ({ browser }) => {
    const context = await createAuthenticatedContext(browser, 'test_admin', 'admin123');
    const page = await context.newPage();
    
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // UI V3 壳（GlobalLayoutV3 → SideRail <nav aria-label='Main navigation'>），旧壳选择器已过时
    const sidebar = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(sidebar).toBeVisible();
    
    await context.close();
  });

  test('移动端登录后页面应正常渲染', async ({ browser }) => {
    const context = await createAuthenticatedContext(browser, 'test_admin', 'admin123');
    const page = await context.newPage();
    
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    expect(page.url()).not.toContain('/login');
    
    await context.close();
  });

  test('认证状态应在页面刷新后保持', async ({ browser }) => {
    const context = await createAuthenticatedContext(browser, 'test_admin', 'admin123');
    const page = await context.newPage();
    
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    expect(page.url()).not.toContain('/login');

    await page.reload();
    await page.waitForLoadState('networkidle');

    expect(page.url()).not.toContain('/login');
    
    await context.close();
  });
});