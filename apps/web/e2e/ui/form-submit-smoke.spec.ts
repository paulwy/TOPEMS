/**
 * C2-C4 代表性录入页模拟提交 smoke
 *
 * 覆盖「整页新建表单」（`FormPageTemplate`，全仓仅 7 条 create 路由）：
 *   /crm/customers/create、/hrm/employees/create、/pm/contracts/create、
 *   /pm/projects/create、/rd/experiment/create、/rd/formula/create、/rd/project/create
 * （其余 75 个列表页 CRUD 走 `ListPageTemplate` + 内嵌 `FormDialog`，不在本用例范围。）
 *
 * 每页三步（对应 C2/C3/C4）：
 *   1. C3 校验：空表单直接点 `form button[type=submit]`，断言出现 `.Mui-error`
 *      （校验拦截生效），并抓取未满足的必填字段 label + 提示文案。
 *   2. C2 填写：通用策略填可见的空文本/数字/邮箱输入框（select 多为有默认值的可选项，
 *      不做 MUI combobox 交互），再次提交。
 *   3. C4 提交链路：观察「离开 create 路由（成功重定向）」或「snackbar/alert 反馈」或
 *      「残留校验错误（受必填 select 阻塞）」三类结局。
 *
 * 注意：本用例会**真实写入开发库**（使用「自动化测试」标记的数据），仅供审计，勿在共享环境跑。
 *
 * 运行（单体模式必须显式指定后端地址）：
 *   API_URL=http://localhost:8099 pnpm exec playwright test e2e/ui/form-submit-smoke.spec.ts \
 *     --project=chromium --workers=1 --retries=0
 */
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { createAuthenticatedContext } from '../utils/testUtils';

const CREATE_PAGES: Array<{ group: string; route: string }> = [
  { group: 'crm', route: '/crm/customers/create' },
  { group: 'hrm', route: '/hrm/employees/create' },
  { group: 'pm', route: '/pm/contracts/create' },
  { group: 'pm', route: '/pm/projects/create' },
  { group: 'rd', route: '/rd/experiment/create' },
  { group: 'rd', route: '/rd/formula/create' },
  { group: 'rd', route: '/rd/project/create' },
];

/** 提取当前表单的校验错误：关联 label + 提示文案 */
async function collectErrors(page: any): Promise<Array<{ label: string; message: string }>> {
  return page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll('form .Mui-error'));
    return nodes.map((el) => {
      const tag = (el as HTMLElement).tagName;
      const control =
        tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA'
          ? (el as HTMLElement)
          : (el.closest('.MuiFormControl-root')?.querySelector('input,select,textarea') as HTMLElement | null);
      const id = control?.id;
      const label = id
        ? document.querySelector(`label[for="${id}"]`)?.textContent?.trim() || ''
        : '';
      return { label, message: (el as HTMLElement).textContent?.trim() || '' };
    });
  });
}

/** 通用填充：给可见的空输入框填自动化测试值（文本带唯一后缀，避免唯一键冲突导致重跑失败） */
async function fillInputs(page: any): Promise<number> {
  const handles = await page.locator('form input:not([type=hidden]):not([disabled])').all();
  const uniq = Date.now().toString().slice(-8);
  let filled = 0;
  for (const h of handles) {
    const type = (await h.getAttribute('type')) || 'text';
    if (!['text', 'email', 'number', 'tel', 'url', ''].includes(type)) continue;
    if (await h.inputValue().catch(() => '')) continue;
    const name = ((await h.getAttribute('name')) || '').toLowerCase();
    const value =
      type === 'email'
        ? `auto_test_${uniq}@example.com`
        : type === 'number'
          ? '1'
          : type === 'url' || name.includes('website') || name.includes('url')
            ? 'https://example.com'
            : `自动化测试${uniq}`;
    await h.fill(value).then(() => filled++).catch(() => undefined);
  }
  const areas = await page.locator('form textarea:not([disabled])').all();
  for (const a of areas) {
    if (await a.inputValue().catch(() => '')) continue;
    await a.fill('自动化测试备注').then(() => filled++).catch(() => undefined);
  }
  return filled;
}

function toastText(body: string): string {
  const m = body.match(/[^\n]{0,60}(成功|失败|错误|已创建|已保存|创建成功|保存成功)[^\n]{0,60}/);
  return m ? m[0].trim() : '';
}

test.describe('C2-C4 录入页模拟提交 smoke', () => {
  test('7 个整页新建表单：校验 + 填写 + 提交', async ({ browser }, testInfo) => {
    test.setTimeout(10 * 60 * 1000);
    const context = await createAuthenticatedContext(browser);
    const page = await context.newPage();
    await page.setViewportSize({ width: 1440, height: 900 });

    const report: Array<Record<string, unknown>> = [];

    for (const { group, route } of CREATE_PAGES) {
      const row: Record<string, unknown> = { group, route };
      const pageErrors: string[] = [];
      const onErr = (e: Error) => pageErrors.push(e.message);
      page.on('pageerror', onErr);

      await page.goto(route, { waitUntil: 'domcontentloaded' }).catch(() => undefined);
      // 懒加载 chunk 在 dev 模式首次访问需编译，固定短等待会误判 no-form-rendered；
      // 改为显式等待表单出现（超时再判定）
      await page
        .waitForSelector('form button[type="submit"]', { timeout: 20000 })
        .catch(() => undefined);
      await page.waitForTimeout(500);

      const submit = page.locator('form button[type="submit"]').first();
      const hasForm = (await submit.count()) > 0;
      row.formRendered = hasForm;
      if (!hasForm) {
        row.outcome = 'no-form-rendered';
        row.pageErrors = pageErrors;
        // 记录页面正文摘要，便于区分 403/白屏/编译未完成
        row.bodySnippet = ((await page.locator('body').innerText().catch(() => '')) || '')
          .replace(/\s+/g, ' ')
          .slice(0, 200);
        report.push(row);
        page.off('pageerror', onErr);
        continue;
      }

      // 提交按钮在 select 选项查询 pending 期间为 disabled（loading 属性），
      // 必须等其启用再点击，否则空提交点击是 no-op，C3 指标失真
      await expect(submit).toBeEnabled({ timeout: 20000 }).catch(() => undefined);
      row.submitEnabled = await submit.isEnabled().catch(() => false);

      // C3：空表单提交 → 期望被校验拦截
      await submit.click().catch(() => undefined);
      await page.waitForTimeout(700);
      const emptyErrors = await collectErrors(page);
      row.emptySubmitBlocked = emptyErrors.length > 0;
      row.emptySubmitErrors = emptyErrors.slice(0, 6);

      // C2：通用填充后再提交
      row.fieldsFilled = await fillInputs(page);
      const urlBefore = new URL(page.url()).pathname;
      await expect(submit).toBeEnabled({ timeout: 10000 }).catch(() => undefined);
      await submit.click().catch(() => undefined);
      await page.waitForTimeout(2500);

      const urlAfter = new URL(page.url()).pathname;
      const body = (await page.locator('body').innerText().catch(() => '')) || '';
      const remaining = await collectErrors(page);

      row.outcome =
        urlAfter !== urlBefore
          ? 'submitted:navigated'
          : remaining.length > 0
            ? 'blocked:validation'
            : 'no-feedback';
      row.redirectTo = urlAfter !== urlBefore ? urlAfter : undefined;
      row.remainingErrors = remaining.slice(0, 6);
      row.toast = toastText(body) || undefined;
      row.pageErrors = pageErrors;
      report.push(row);

      page.off('pageerror', onErr);
    }

    await context.close();

    const out = {
      total: report.length,
      formsRendered: report.filter((r) => r.formRendered).length,
      emptySubmitBlocked: report.filter((r) => r.emptySubmitBlocked).length,
      navigated: report.filter((r) => r.outcome === 'submitted:navigated').length,
      blocked: report.filter((r) => r.outcome === 'blocked:validation').length,
      noFeedback: report.filter((r) => r.outcome === 'no-feedback').length,
      rows: report,
    };
    fs.writeFileSync('/tmp/topems-form-smoke.json', JSON.stringify(out, null, 2));

    console.log(`\n[C2-C4] 表单渲染=${out.formsRendered}/${out.total} 空提交被拦截=${out.emptySubmitBlocked} 提交成功跳转=${out.navigated} 校验阻塞=${out.blocked} 无反馈=${out.noFeedback}`);
    for (const r of report) console.log(`  ${r.route}: ${r.outcome}${r.redirectTo ? ' -> ' + r.redirectTo : ''}`);
    console.log('[C2-C4] 报告: /tmp/topems-form-smoke.json');

    expect(out.formsRendered, '所有目标页应渲染出表单').toBe(out.total);
  });
});
