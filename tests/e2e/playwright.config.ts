import { defineConfig } from '@playwright/test';

/**
 * Playwright configuration for TOPEMS E2E tests.
 *
 * Environment variables (with defaults):
 *   BASE_URL        - Web portal base URL (default: http://localhost:8063)
 *   API_BASE_URL    - Backend API base URL (default: http://localhost:8080)
 *   E2E_USERNAME    - Default login username (default: admin)
 *   E2E_PASSWORD    - Default login password (default: admin123)
 *   E2E_ALLOW_PROD  - 设为 "1" 才允许 API_BASE_URL 指向生产端口 8099（默认拦截）
 *   CI               - Set to "true" on CI to enable retries, single worker.
 *   PW_TEST_TIMEOUT  - Per-test timeout override (ms).
 */
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:8063';
const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:8080';

// 生产端口守护：8099 是生产 BFF，e2e 默认不得指向它（历史上曾把 e2e_admin/e2e-test-* 账号写进生产库）
const PROD_API_PORTS = [8099, 443];
const apiPort = (() => {
  try {
    const u = new URL(API_BASE_URL);
    return u.port ? Number(u.port) : u.protocol === 'https:' ? 443 : 80;
  } catch {
    return -1;
  }
})();
if (PROD_API_PORTS.includes(apiPort) && process.env.E2E_ALLOW_PROD !== '1') {
  throw new Error(
    `[E2E] 拒绝执行：API_BASE_URL=${API_BASE_URL} 指向生产后端（端口 ${apiPort}）。` +
      `请把 API_BASE_URL 指到开发实例（默认 http://localhost:8080）；` +
      `确需对生产验证时显式设置 E2E_ALLOW_PROD=1。`
  );
}
const IS_CI = !!process.env.CI;
const DISABLE_ARTIFACTS = process.env.E2E_DISABLE_ARTIFACTS === 'true';
const BROWSER_CHANNEL = process.env.E2E_BROWSER_CHANNEL;

export default defineConfig({
  testDir: './tests',
  // 每次运行先真实登录刷新会话（.auth/storage-state.json + session.json），
  // 避免提交在仓库里的旧 token 过期后整批用例被踢回登录页
  globalSetup: './global-setup.ts',
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
    storageState: './.auth/storage-state.json',
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
