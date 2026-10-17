/**
 * B4 导航链路巡检（2026-10-17）
 *
 * 验证 V3 布局（GlobalLayoutV3）下：
 * - 侧栏渲染：nav[aria-label="Main navigation"] 存在且含各模块顶级项
 * - 侧栏导航：展开模块组 → 点子项 → URL 正确跳转 + 页面渲染
 * - 面包屑：深层页显示 首页 > 上级 > 当前（PageHeader nav ol li）
 * - 浏览器返回：跨模块跳转后 goBack 回到前页
 * - 顶栏：header 存在（含搜索入口）
 *
 * 运行：
 *   API_URL=http://localhost:8099 pnpm exec playwright test e2e/ui/b4-navigation.spec.ts \
 *     --project=chromium --workers=1 --retries=0
 */
import { test, expect } from '@playwright/test';
import { BASE_URL, createAuthenticatedContext } from '../utils/testUtils';

const NAV_SELECTOR = 'nav[aria-label="Main navigation"]';

test.describe('B4 导航链路', () => {
  test('侧栏/顶栏/面包屑/返回 全链路', async ({ browser }) => {
    test.setTimeout(5 * 60 * 1000);
    const context = await createAuthenticatedContext(browser, 'test_admin', 'admin123');
    const page = await context.newPage();
    const fails: string[] = [];
    const notes: string[] = [];

    const check = (name: string, fn: () => Promise<boolean>) =>
      fn()
        .then((ok) => {
          if (!ok) fails.push(name);
          else notes.push(`✓ ${name}`);
        })
        .catch((e) => fails.push(`${name}: ${String(e).slice(0, 100)}`));

    const nav = page.locator(NAV_SELECTOR);
    const header = page.locator('header').first();

    // 1. 打开 /dashboard → 侧栏/顶栏渲染 + 顶级模块项存在
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await nav.waitFor({ state: 'attached', timeout: 60_000 }).catch(() => {});
    await page.waitForTimeout(1500);

    await check('侧栏渲染', async () => (await nav.count()) > 0);
    await check('顶栏渲染', async () => (await header.count()) > 0);
    await check(
      '侧栏含核心模块项',
      async () => {
        const text = await nav.innerText().catch(() => '');
        return ['客户管理', '制造执行', '质量管理', '财务', '人力资源'].every((m) => text.includes(m));
      }
    );

    // 2. 侧栏导航：展开「客户管理」→ 点子项「联系人」→ URL /crm/contacts
    await check('展开客户管理', async () => {
      await nav.getByRole('button', { name: '客户管理' }).click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(600);
      const expanded = await nav.getByRole('button', { name: '联系人' }).count();
      return expanded > 0;
    });
    await check('点子项联系人跳转', async () => {
      await nav.getByRole('button', { name: '联系人' }).click({ timeout: 5000 }).catch(() => {});
      await page.waitForURL('**/crm/contacts*', { timeout: 15_000 }).catch(() => {});
      await page.waitForTimeout(1200);
      return page.url().includes('/crm/contacts');
    });

    // 3. 面包屑：首页 > 客户关系管理 > 联系人管理（MUI Breadcrumbs / PageHeader nav）
    {
      const crumbSel = '[class*="MuiBreadcrumbs"] ol li, nav ol li';
      const crumbCount = await page.locator(crumbSel).count().catch(() => -1);
      const crumbText = await page.locator('[class*="MuiBreadcrumbs"], nav ol').first().innerText().catch(() => 'NO_CRUMB');
      console.log(`\n[B4-DIAG] crumbCount=${crumbCount} crumbText=${crumbText.slice(0, 120).replace(/\n/g, '|')}\n`);
    }
    await check('面包屑层级', async () => {
      const crumb = page.locator('[class*="MuiBreadcrumbs"] ol li, nav ol li');
      if ((await crumb.count()) < 3) return false;
      const text = await page.locator('[class*="MuiBreadcrumbs"], nav ol').first().innerText().catch(() => '');
      return text.includes('首页') && text.includes('客户管理') && text.includes('联系人');
    });

    // 4. 跨模块导航：展开「人力资源」→ 点子项（员工/含 employee 的项）→ URL /hrm/employees
    await check('展开人力资源', async () => {
      await nav.getByRole('button', { name: '人力资源' }).click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(600);
      return (await nav.getByRole('button', { name: /员工/ }).count()) > 0;
    });
    await check('点子项跳转 /hrm/employees', async () => {
      await nav.getByRole('button', { name: /员工/ }).first().click({ timeout: 5000 }).catch(() => {});
      await page.waitForURL('**/hrm/employees*', { timeout: 15_000 }).catch(() => {});
      await page.waitForTimeout(1200);
      return page.url().includes('/hrm/employees');
    });

    // 5. 浏览器返回 → 回到 /crm/contacts
    await check('浏览器返回', async () => {
      await page.goBack({ timeout: 10_000 }).catch(() => {});
      await page.waitForTimeout(1500);
      return page.url().includes('/crm/contacts');
    });

    // 6. 顶栏搜索入口存在
    await check('顶栏搜索入口', async () => {
      const text = await header.innerText().catch(() => '');
      return text.includes('搜索');
    });

    await context.close();
    console.log(`\n=== B4 导航链路 ===\n${notes.join('\n')}\n${fails.length ? 'FAIL:\n' + fails.join('\n') : '全部通过'}\n`);
    expect(fails, `B4 失败项:\n${fails.join('\n')}`).toEqual([]);
  });
});
