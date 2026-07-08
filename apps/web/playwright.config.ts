import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // Chromium - 桌面
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // Firefox - 桌面
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    // WebKit - 桌面
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // iPhone 12 - 移动端
    {
      name: 'mobile-iphone',
      use: { ...devices['iPhone 12'] },
    },

    // iPad - 平板
    {
      name: 'tablet-ipad',
      use: { ...devices['iPad (gen 7)'] },
    },

    // Pixel 5 - Android
    {
      name: 'mobile-android',
      use: { ...devices['Pixel 5'] },
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
