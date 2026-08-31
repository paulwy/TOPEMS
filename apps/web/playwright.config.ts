import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/ui',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'playwright-report/ui' }],
    ['list'],
  ],

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },

  // P1-3 批 1（2026-08-31）：E2E 矩阵 6→2 收敛
  // 说明：CI 实际使用 tests/e2e/playwright.config.ts（单 chromium project），
  //       本配置未被 CI 引用。按 ROI 审视收敛为主力 chromium + 移动端 iPhone 代表，
  //       firefox/webkit/tablet/android 保留为注释（需要时恢复并接入 CI）。
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
    {
      name: 'mobile-iphone',
      use: { ...devices['iPhone 12'] },
    },
    // P1-3 收敛停用（原 6 project 保留参考，恢复时取消注释）：
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
    // {
    //   name: 'tablet-ipad',
    //   use: { ...devices['iPad (gen 7)'] },
    // },
    // {
    //   name: 'mobile-android',
    //   use: { ...devices['Pixel 5'] },
    // },
  ],

  webServer: {
    command: 'pnpm dev --port 3001',
    url: 'http://localhost:3001',
    reuseExistingServer: true,
    timeout: 120 * 1000,
    ignoreHTTPSErrors: true,
  },
});