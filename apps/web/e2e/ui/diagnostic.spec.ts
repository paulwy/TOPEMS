/**
 * 诊断测试：检查组件加载失败的原因
 */

import { test as base, expect } from '@playwright/test';
import { createAuthenticatedContext } from '../utils/testUtils';

const test = base.extend<{ authedPage: any }>({
  authedPage: async ({ browser }, use) => {
    const context = await createAuthenticatedContext(browser);
    const page = await context.newPage();
    await page.setViewportSize({ width: 1440, height: 900 });
    
    // 收集所有控制台错误
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.log(`[CONSOLE ERROR] ${msg.text()}`);
      }
    });
    
    page.on('pageerror', error => {
      pageErrors.push(error.message);
      console.log(`[PAGE ERROR] ${error.message}`);
      console.log(`[PAGE ERROR STACK] ${error.stack}`);
    });
    
    console.log('Navigating to /ai/business-copilot...');
    await page.goto('/ai/business-copilot', { waitUntil: 'domcontentloaded' });
    
    // 等待页面渲染
    await page.waitForTimeout(10000);
    
    // 输出页面内容
    const bodyText = await page.locator('body').innerText();
    console.log(`\n=== Page body text ===`);
    console.log(bodyText.substring(0, 1000));
    console.log(`=== End body text ===\n`);
    
    // 输出所有错误
    console.log(`\n=== Console errors (${consoleErrors.length}) ===`);
    consoleErrors.forEach((e, i) => console.log(`${i + 1}. ${e}`));
    console.log(`=== Page errors (${pageErrors.length}) ===`);
    pageErrors.forEach((e, i) => console.log(`${i + 1}. ${e}`));
    
    await use(page);
    await context.close();
  },
});

test('诊断组件加载失败', async ({ authedPage: page }) => {
  console.log('Test completed');
  expect(true).toBeTruthy();
});
