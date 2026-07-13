import { test, expect, Browser, Page } from '@playwright/test';
import { TEST_ACCOUNTS, apiLogin, BASE_URL } from '../utils/testUtils';

async function createAuthenticatedContext(browser: Browser, username: string, password: string) {
  const token = await apiLogin(username, password).catch(() => '');
  
  return browser.newContext({
    storageState: {
      cookies: [],
      origins: [
        {
          origin: BASE_URL,
          localStorage: [
            { name: 'token', value: token },
          ],
        },
      ],
    },
  });
}

test.describe('认证流程测试', () => {
  test('登录后应能访问 dashboard', async ({ browser }) => {
    const context = await createAuthenticatedContext(browser, TEST_ACCOUNTS.superadmin.username, TEST_ACCOUNTS.superadmin.password);
    const page = await context.newPage();
    
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    expect(page.url()).not.toContain('/login');
    
    await context.close();
  });

  test('登录后页面应包含页面内容', async ({ browser }) => {
    const context = await createAuthenticatedContext(browser, TEST_ACCOUNTS.superadmin.username, TEST_ACCOUNTS.superadmin.password);
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
    const context = await createAuthenticatedContext(browser, TEST_ACCOUNTS.superadmin.username, TEST_ACCOUNTS.superadmin.password);
    const page = await context.newPage();
    
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const sidebar = page.locator('[data-testid="sidebar"], aside, .MuiDrawer-root');
    const isSidebarVisible = await sidebar.first().isVisible().catch(() => false);
    expect(isSidebarVisible).toBe(true);
    
    await context.close();
  });

  test('移动端登录后页面应正常渲染', async ({ browser }) => {
    const context = await createAuthenticatedContext(browser, TEST_ACCOUNTS.superadmin.username, TEST_ACCOUNTS.superadmin.password);
    const page = await context.newPage();
    
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    expect(page.url()).not.toContain('/login');
    
    await context.close();
  });

  test('认证状态应在页面刷新后保持', async ({ browser }) => {
    const context = await createAuthenticatedContext(browser, TEST_ACCOUNTS.superadmin.username, TEST_ACCOUNTS.superadmin.password);
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