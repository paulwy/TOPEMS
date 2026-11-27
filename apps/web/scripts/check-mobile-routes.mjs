/**
 * 移动端路由/接口回归：确认 scan-page、settings-app 不再落 404，profile 接口不再 404。
 * 用法：node scripts/check-mobile-routes.mjs
 */
import { chromium } from 'playwright';
import { login, installAuth } from './lib/auth-session.mjs';

const BASE = process.env.WEB_BASE || 'https://www.topmap.net';
const TENANT = process.env.TENANT_ID || '00000000-0000-0000-0000-000000000001';

const creds = await login({
  apiBase: BASE,
  tenantId: TENANT,
  username: process.env.USERNAME || 'reviewer',
  password: process.env.PASSWORD || 'Topems@2026',
});

const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  timezoneId: 'Asia/Shanghai',
});
await installAuth(context, creds, TENANT);

const targets = ['/mobile/scan-page', '/mobile/settings-app', '/mobile/profile'];
let failures = 0;

for (const path of targets) {
  const page = await context.newPage();
  const errors = [];
  const bad = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 160)));
  page.on('response', (r) => {
    if (r.status() >= 400 && r.url().includes('/api/')) bad.push(`${r.status()} ${r.url()}`);
  });
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(6000);
  const text = (await page.locator('body').innerText()).replace(/\s+/g, ' ').trim();
  const is404 = text.includes('404') && text.includes('未找到');
  const ok = !is404 && bad.length === 0;
  if (!ok) failures += 1;
  console.log(
    `${ok ? 'PASS' : 'FAIL'} ${path} 404页=${is404} 4xx=${bad.length} consoleErr=${errors.length} text="${text.slice(0, 90)}"`
  );
  if (bad.length) console.log(`  4xx: ${bad.slice(0, 3).join(' | ')}`);
  if (errors.length) console.log(`  err: ${errors.slice(0, 3).join(' | ')}`);
  await page.close();
}

await browser.close();
console.log(`EXIT=${failures === 0 ? 0 : 1}`);
process.exit(failures === 0 ? 0 : 1);
