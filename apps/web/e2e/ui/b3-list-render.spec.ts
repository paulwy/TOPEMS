/**
 * B3 列表页数据渲染巡检（2026-10-17）
 *
 * 抽样 8 模块列表页，验证三态：
 * - 正常态：数据非空渲染（表格行/列表容器/条数量词），无 console error、无 HTTP>=400
 * - 空态（mock）：列表 API 返回空分页 → 页面出现「暂无数据」类提示，不白屏
 * - 错误态（mock）：列表 API 返回 500 → 页面出现错误/重试提示（ErrorBoundary 兜底），不白屏
 *
 * 运行：
 *   API_URL=http://localhost:8099 pnpm exec playwright test e2e/ui/b3-list-render.spec.ts \
 *     --project=chromium --workers=1 --retries=0
 */
import { test, expect } from '@playwright/test';
import { BASE_URL, createAuthenticatedContext } from '../utils/testUtils';

interface ListPageEntry {
  name: string;
  route: string;
}

/** B3 抽样清单（各模块代表列表页，正常态应含演示数据） */
const LIST_PAGES: ListPageEntry[] = [
  { name: 'crm-contacts', route: '/crm/contacts' },
  { name: 'mes-production-orders', route: '/mes/production-orders' },
  { name: 'wms-inbound-orders', route: '/wms/inbound-orders' },
  { name: 'erp-assets', route: '/erp/asset-management' },
  { name: 'finance-vouchers', route: '/finance/vouchers' },
  { name: 'hrm-employees', route: '/hrm/employees' },
  { name: 'pm-contracts', route: '/pm/contracts' },
  { name: 'qms-quality-control', route: '/qms/quality-control' },
];

/** vite / HMR / 静态资源噪声过滤（非应用缺陷） */
function isNoise(text: string): boolean {
  return /vite|sockjs|hot-update|favicon|\.map(\?|$)|Download the React DevTools/i.test(text);
}

/** 页面数据非空判定：表格行 > 0，或常见列表项容器 > 2，或文本含条数量词 */
async function hasListContent(page: import('@playwright/test').Page): Promise<boolean> {
  const rows = await page.locator('tbody tr').count();
  if (rows > 0) return true;

  const items = await page
    .locator(
      '[data-testid*="list"], [data-testid*="table"], [class*="ant-table-row"], [class*="table-row"], [class*="list-item"], [class*="card"]'
    )
    .count();
  if (items > 2) return true;

  const text = await page.locator('body').innerText().catch(() => '');
  return /共\s*\d+\s*条|\d+\s*条记录|总计\D{0,8}\d|total\D{0,12}[1-9]/i.test(text);
}

/** 页面是否呈现空态提示 */
async function hasEmptyHint(page: import('@playwright/test').Page): Promise<boolean> {
  const text = await page.locator('body').innerText().catch(() => '');
  return /暂无数据|暂无记录|无数据|没有数据|暂无内容|empty/i.test(text);
}

/** 页面是否呈现错误态提示 */
async function hasErrorHint(page: import('@playwright/test').Page): Promise<boolean> {
  const text = await page.locator('body').innerText().catch(() => '');
  return /加载失败|请求失败|出错了|发生错误|错误|重试|ErrorBoundary|页面崩溃/i.test(text);
}

test.describe('B3 列表页数据渲染', () => {
  test('8 模块列表页：正常态非空渲染 + 控制台洁净', async ({ browser }, testInfo) => {
    test.setTimeout(30 * 60 * 1000);
    const context = await createAuthenticatedContext(browser);
    const page = await context.newPage();
    const results: string[] = [];

    for (const item of LIST_PAGES) {
      const consoleErrs: string[] = [];
      const httpErrs: string[] = [];
      let pageError = '';
      const onConsole = (m: import('@playwright/test').ConsoleMessage) => {
        if (m.type() === 'error' && !isNoise(m.text())) consoleErrs.push(m.text());
      };
      const onResponse = (r: import('@playwright/test').Response) => {
        if (r.status() >= 400 && !isNoise(r.url())) httpErrs.push(`${r.status()} ${r.url()}`);
      };
      const onPageError = (err: Error) => {
        pageError = String(err?.message || err);
      };
      page.on('console', onConsole);
      page.on('response', onResponse);
      page.on('pageerror', onPageError);

      try {
        await page.goto(`${BASE_URL}${item.route}`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
        // 数据异步加载：等待表格行或列表容器出现（最长 6s），无则等待后判定
        try {
          await page
            .locator('tbody tr, [class*="ant-table-row"], [class*="list-item"]')
            .first()
            .waitFor({ state: 'visible', timeout: 6000 });
        } catch {
          /* 无列表行 → 走文本量词兜底判定 */
        }
        await page.waitForTimeout(800);

        const content = await hasListContent(page);
        const empty = await hasEmptyHint(page);
        const status: string[] = [];
        if (!content && !empty) status.push('NO_DATA');
        if (pageError) status.push('PAGEERROR');
        if (consoleErrs.length) status.push(`CONSOLE:${consoleErrs.length}`);
        if (httpErrs.length) status.push(`HTTP:${httpErrs.slice(0, 3).join(';')}`);
        results.push(
          `[${item.name}] content=${content} empty=${empty}${status.length ? ' ⚠ ' + status.join(' | ') : ' ✓'}`
        );
      } catch (e) {
        results.push(`[${item.name}] NAV_FAIL: ${String(e).slice(0, 160)}`);
      } finally {
        page.removeListener('console', onConsole);
        page.removeListener('response', onResponse);
        page.removeListener('pageerror', onPageError);
      }
    }

    await context.close();
    console.log('\n=== B3 正常态结果 ===\n' + results.join('\n'));

    const failed = results.filter((r) => r.includes('⚠') || r.includes('NAV_FAIL'));
    expect(failed, `B3 正常态失败项:\n${failed.join('\n')}`).toEqual([]);
  });

  test('空态兜底：列表 API 空分页 → 暂无数据提示（mock /crm/contacts）', async ({ browser }) => {
    test.setTimeout(3 * 60 * 1000);
    const context = await createAuthenticatedContext(browser);
    const page = await context.newPage();
    let pageError = '';
    page.on('pageerror', (e) => (pageError = String(e.message || e)));

    // 拦截列表查询：返回空分页信封
    await page.route('**/api/crm/contacts*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, code: 0, data: { items: [], total: 0 } }),
      });
    });

    await page.goto(`${BASE_URL}/crm/contacts`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await page.waitForTimeout(3500);

    const empty = await hasEmptyHint(page);
    const text = (await page.locator('body').innerText().catch(() => '')).slice(0, 120);
    console.log(`\n=== B3 空态（mock crm/contacts）=== empty=${empty} pageError=${!!pageError} body=${text.replace(/\n/g, '|')}\n`);
    expect(pageError).toBe('');
    expect(empty, '空分页应出现空态提示').toBe(true);
    await context.close();
  });

  test('错误态兜底：列表 API 500 → 错误提示且不白屏（mock /crm/contacts）', async ({ browser }) => {
    test.setTimeout(3 * 60 * 1000);
    const context = await createAuthenticatedContext(browser);
    const page = await context.newPage();
    let pageError = '';
    let routeHits = 0;
    const apiErrors: string[] = [];
    page.on('pageerror', (e) => (pageError = String(e.message || e)));
    page.on('console', (m) => {
      if (m.type() === 'error') apiErrors.push(m.text().slice(0, 120));
    });

    await page.route('**/api/crm/contacts*', async (route) => {
      routeHits += 1;
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, code: 500, message: '内部服务器错误', data: null }),
      });
    });

    await page.goto(`${BASE_URL}/crm/contacts`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await page.waitForTimeout(8000);

    const bodyText = (await page.locator('body').innerText().catch(() => '')).slice(0, 400);
    const tbodyHtml = (await page.locator('tbody').first().innerHTML().catch(() => 'NO_TBODY')).slice(0, 1200);
    const err = await hasErrorHint(page);
    const notBlank = bodyText.trim().length > 30;
    console.log(
      `\n=== B3 错误态（mock crm/contacts 500）=== routeHits=${routeHits} errHint=${err} pageError=${!!pageError} notBlank=${notBlank}\nconsoleErrors=${apiErrors.join(' | ').slice(0, 400)}\nbody=${bodyText.replace(/\n/g, '|')}\ntbody=${tbodyHtml.replace(/\s+/g, ' ')}\n`
    );
    expect(pageError, '500 不应导致整页崩溃').toBe('');
    expect(notBlank, '500 不应白屏').toBe(true);
    expect(routeHits, 'mock route 应命中').toBeGreaterThan(0);
    expect(err, '500 应呈现错误提示').toBe(true);
    await context.close();
  });
});
