import { defineConfig, devices } from '@playwright/test';

/**
 * 跨模块集成测试配置
 *
 * 运行 e2e/integration/ 目录下的跨模块测试
 * 使用: npx playwright test --config=playwright.config.integration.ts
 */
export default defineConfig({
  testDir: './e2e/integration',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'playwright-report/integration' }],
    ['list'],
  ],

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'pnpm dev --port 3001',
    url: 'http://localhost:3001',
    reuseExistingServer: true,
    timeout: 120 * 1000,
    ignoreHTTPSErrors: true,
  },
});
