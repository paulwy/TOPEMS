import { defineConfig } from '@playwright/test';

/**
 * Playwright configuration for TOPEMS E2E tests.
 *
 * Environment variables (with defaults):
 *   BASE_URL        - Web portal base URL (default: http://localhost:8063)
 *   API_BASE_URL    - Backend API base URL (default: http://localhost:8080)
 *   E2E_USERNAME    - Default login username (default: admin)
 *   E2E_PASSWORD    - Default login password (default: admin123)
 *   CI               - Set to "true" on CI to enable retries, single worker.
 *   PW_TEST_TIMEOUT  - Per-test timeout override (ms).
 */
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:8063';
const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:8080';
const IS_CI = !!process.env.CI;
const DISABLE_ARTIFACTS = process.env.E2E_DISABLE_ARTIFACTS === 'true';
const BROWSER_CHANNEL = process.env.E2E_BROWSER_CHANNEL;

export default defineConfig({
  testDir: './tests',
  fullyParallel: !IS_CI,
  forbidOnly: IS_CI,
  retries: IS_CI ? 2 : 0,
  workers: IS_CI ? 1 : undefined,
  reporter: IS_CI
    ? [
        ['github'],
        ['html', { open: 'never', outputFolder: 'playwright-report' }],
      ]
    : [
        ['list'],
        ['html', { open: 'never', outputFolder: 'playwright-report' }],
      ],
  outputDir: 'test-results',

  use: {
    baseURL: BASE_URL,
    storageState: './storageState.json',
    trace: DISABLE_ARTIFACTS ? 'off' : 'retain-on-failure',
    video: DISABLE_ARTIFACTS ? 'off' : 'retain-on-failure',
    screenshot: DISABLE_ARTIFACTS ? 'off' : 'only-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    extraHTTPHeaders: {
      Accept: 'application/json',
    },
  },

  expect: {
    timeout: 10_000,
  },

  timeout: Number(process.env.PW_TEST_TIMEOUT ?? 60_000),

  projects: [
    {
      name: 'chromium',
      use: {
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        launchOptions: {
          args: ['--disable-crash-reporter', '--disable-crashpad'],
        },
        ...(BROWSER_CHANNEL ? { channel: BROWSER_CHANNEL } : {}),
      },
    },
  ],

  webServer: {
    command: 'pnpm --filter topems-portal dev --port 8063',
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },

  metadata: {
    apiBaseUrl: API_BASE_URL,
    baseUrl: BASE_URL,
    environment: process.env.APP_ENV ?? 'test',
  },
});
