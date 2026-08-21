#!/usr/bin/env node
import { chromium } from '@playwright/test';
import path from 'node:path';

const url = process.argv[2] || 'http://localhost:5173/wms/inbound-orders/inb-001';
const outputPath =
  process.argv[3] ||
  '/Users/air/TOPEMS/scripts/design-system-audit/reports/wms-inbound-detail-migrated.png';

const tokenPayload = {
  sub: '1',
  username: 'admin',
  exp: 9999999999,
  iat: Math.floor(Date.now() / 1000),
};

const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }))
  .replace(/=/g, '')
  .replace(/\+/g, '-')
  .replace(/\//g, '_');
const payload = btoa(JSON.stringify(tokenPayload))
  .replace(/=/g, '')
  .replace(/\+/g, '-')
  .replace(/\//g, '_');
const token = `${header}.${payload}.`;

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.goto('http://localhost:5173/login');
  await page.evaluate(
    ({ token }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('token_expiry', '9999999999000');
      localStorage.setItem(
        'user',
        JSON.stringify({
          id: '1',
          username: 'admin',
          email: 'admin@example.com',
          is_active: true,
          is_superuser: true,
        })
      );
      localStorage.setItem('roles', JSON.stringify(['admin']));
      localStorage.setItem('permissions', JSON.stringify(['wms:admin']));
    },
    { token }
  );

  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  await page.screenshot({ path: outputPath, fullPage: true });
  console.log(`Screenshot saved to: ${outputPath}`);

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
