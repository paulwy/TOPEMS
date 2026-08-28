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

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-iphone',
      use: { ...devices['iPhone 12'] },
    },
    {
      name: 'tablet-ipad',
      use: { ...devices['iPad (gen 7)'] },
    },
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