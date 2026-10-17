/**
 * C2-C4 模拟录入验证·扩展（2026-10-17）
 *
 * 在 c2-form-submit.spec.ts 基础上补齐：
 * - C2e finance 凭证平衡态（借=贷 → 平衡提示，手写校验对照正向分支）
 *   （完整提交闭环：科目表/科目主数据补齐后，后端 curl 平衡凭证 200 已验，见 TODO 登记）
 * - C2f wms 入库单弹窗：填必填 order_number → 提交 → 弹窗关闭 → 列表出现新单（C4）
 * - C2g mes 工单弹窗：填 work_order_no/product_code/product_name/planned_quantity → 提交 → 列表出现（C4）
 * - C2h erp 资产弹窗：填 name + asset_number → 提交 → 列表出现（C4）
 * - C2i qms 检验弹窗：填 product_name（type/quantity 有默认值）→ 提交 → 列表出现（C4）
 *
 * 运行：API_URL=http://localhost:8099 pnpm exec playwright test e2e/ui/c2-form-submit-ext.spec.ts \
 *   --project=chromium --workers=1 --retries=0
 */
import { test, expect } from '@playwright/test';
import { BASE_URL, createAuthenticatedContext } from '../utils/testUtils';

const ts = () => Date.now().toString().slice(-8);

/** 打开列表页的新建弹窗并返回 dialog locator（失败记入 fails） */
async function openCreateDialog(page: any, fails: string[], btnName: RegExp) {
  const btn = page.getByRole('button', { name: btnName }).first();
  try {
    await btn.waitFor({ state: 'visible', timeout: 15_000 });
  } catch {
    fails.push('未找到创建按钮');
    return null;
  }
  await btn.click().catch((e: Error) => fails.push(`创建按钮点击失败 ${String(e).slice(0, 60)}`));
  await page.waitForTimeout(1000);
  const dialog = page.locator('[role="dialog"]');
  if ((await dialog.count()) === 0) {
    fails.push('创建弹窗未出现');
    return null;
  }
  return dialog;
}

/** 点击弹窗内提交按钮（type=submit 优先，文本兜底） */
async function submitDialog(page: any, dialog: any, fails: string[]) {
  let submit = dialog.locator('button[type="submit"]');
  if ((await submit.count()) === 0) {
    submit = dialog.locator('button:has-text("创建"), button:has-text("保存"), button:has-text("确定"), button:has-text("提交")').first();
  }
  if ((await submit.count()) === 0) {
    fails.push('弹窗内提交按钮缺失');
    return;
  }
  await submit.click().catch((e: Error) => fails.push(`提交失败 ${String(e).slice(0, 80)}`));
  // 等待弹窗关闭（成功提交后 ListPageTemplate 关闭弹窗）
  await page.waitForTimeout(1500);
  if ((await dialog.count()) > 0) {
    // 再等一轮（提交可能触发请求中）
    await page.waitForTimeout(2500);
    if ((await dialog.count()) > 0) fails.push('提交后弹窗未关闭');
  }
}

test.describe('C2-C4 模拟录入·扩展', () => {
  test('C2e finance 凭证平衡态：借=贷 → 平衡提示（手写校验正向分支）', async ({ browser }) => {
    test.setTimeout(3 * 60 * 1000);
    const context = await createAuthenticatedContext(browser, 'test_admin', 'admin123');
    const page = await context.newPage();
    const fails: string[] = [];

    await page.goto(`${BASE_URL}/finance/vouchers/create`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForTimeout(1800);

    await page.locator('input').first().fill(`V${ts()}`).catch(() => fails.push('finance: 凭证号填失败'));
    await page.locator('input[type="date"]').first().fill('2026-10-17').catch(() => {});
    await page.locator('input').nth(1).fill('2026-10').catch(() => {});

    // 分录：借 100 + 贷 100 → 平衡
    const amountInputs = page.locator('input[placeholder="0.00"]');
    if ((await amountInputs.count()) < 2) {
      fails.push('finance: 借贷金额输入缺失');
    } else {
      await amountInputs.nth(0).fill('100');
      await amountInputs.nth(1).fill('100');
      await page.waitForTimeout(800);
      const body = await page.locator('body').innerText().catch(() => '');
      if (!/借贷平衡/.test(body)) fails.push('finance: 借=贷未出现平衡提示（手写校验正向分支）');
      if (/借贷不平衡/.test(body)) fails.push('finance: 平衡态仍显示不平衡提示');
    }

    // 完整提交闭环（科目主数据 + 平衡分录 → 后端 200）已在 C2e 补充验证：
    //   POST /api/finance/vouchers（1001 借 100 / 6001 贷 100）→ 200 记2026100004；
    //   前置：迁移 20261017000002 补齐 accounting_subjects 结构（V321 迁移漂移）、
    //   core_finance_accounts 补科目主数据（测试库原为空，见 TODO 登记）。
    // 本轮另修复 UI 文案缺陷：zh/en e1/e2 模板缺 {v1} 占位（借贷平衡 从未渲染），
    // 已改 VoucherCreatePage 单模板调用 + i18n 文案补 {v1}。
    console.log(`\n[C2e finance 平衡] fails=${fails.length ? fails.join('|') : '无'}\n`);
    expect(fails).toEqual([]);
    await context.close();
  });

  test('C2f wms 入库单弹窗：填必填 → 提交 → 列表出现新单（C4）', async ({ browser }) => {
    test.setTimeout(3 * 60 * 1000);
    const context = await createAuthenticatedContext(browser, 'test_admin', 'admin123');
    const page = await context.newPage();
    const orderNo = `IN-E2E-${ts()}`;
    const fails: string[] = [];

    // 注意：/wms/inbound-orders 是旧 mock 页（routes/common.ts）；
    // 真实 schema 页在 /wms/inbound-order（wms/config.ts WMS_PATHS.inboundOrder）。
    await page.goto(`${BASE_URL}/wms/inbound-order`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForTimeout(4500);
    const dialog = await openCreateDialog(page, fails, /新建|新增|创建/);
    if (dialog) {
      const noInput = dialog.locator('input[name="order_number"]');
      if ((await noInput.count()) === 0) fails.push('wms: input[name=order_number] 缺失');
      else await noInput.fill(orderNo);
      await submitDialog(page, dialog, fails);
      await page.waitForTimeout(3000);
      const body = await page.locator('body').innerText().catch(() => '');
      if (!body.includes(orderNo)) fails.push('wms: 列表未出现新入库单');
    }
    console.log(`\n[C2f wms 入库单] order=${orderNo} fails=${fails.length ? fails.join('|') : '无'}\n`);
    expect(fails).toEqual([]);
    await context.close();
  });

  test('C2g mes 工单弹窗：填必填（含产品/数量）→ 提交 → 列表出现（C4）', async ({ browser }) => {
    test.setTimeout(3 * 60 * 1000);
    const context = await createAuthenticatedContext(browser, 'test_admin', 'admin123');
    const page = await context.newPage();
    const woNo = `WO-E2E-${ts()}`;
    const fails: string[] = [];

    await page.goto(`${BASE_URL}/mes/work-orders`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    const dialog = await openCreateDialog(page, fails, /新增|创建|新建/);
    if (dialog) {
      const fields: Array<[string, string]> = [
        ['work_order_no', woNo],
        ['product_code', `P-${ts()}`],
        ['product_name', `产品-${ts()}`],
        ['planned_quantity', '50'],
      ];
      for (const [name, value] of fields) {
        const input = dialog.locator(`input[name="${name}"]`);
        if ((await input.count()) === 0) fails.push(`mes: input[name=${name}] 缺失`);
        else await input.fill(value);
      }
      await submitDialog(page, dialog, fails);
      await page.waitForTimeout(2500);
      const body = await page.locator('body').innerText().catch(() => '');
      if (!body.includes(woNo)) fails.push('mes: 列表未出现新工单');
    }
    console.log(`\n[C2g mes 工单] wo=${woNo} fails=${fails.length ? fails.join('|') : '无'}\n`);
    expect(fails).toEqual([]);
    await context.close();
  });

  test('C2h erp 资产弹窗：填 name + asset_number → 提交 → 列表出现（C4）', async ({ browser }) => {
    test.setTimeout(3 * 60 * 1000);
    const context = await createAuthenticatedContext(browser, 'test_admin', 'admin123');
    const page = await context.newPage();
    const assetNo = `AST-E2E-${ts()}`;
    const fails: string[] = [];

    await page.goto(`${BASE_URL}/erp/asset-management`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    const dialog = await openCreateDialog(page, fails, /新增|创建|新建/);
    if (dialog) {
      await dialog.locator('input[name="name"]').fill(`资产-${ts()}`).catch(() => fails.push('erp: input[name=name] 缺失'));
      const noInput = dialog.locator('input[name="asset_number"]');
      if ((await noInput.count()) === 0) fails.push('erp: input[name=asset_number] 缺失');
      else await noInput.fill(assetNo);
      await submitDialog(page, dialog, fails);
      await page.waitForTimeout(2500);
      const body = await page.locator('body').innerText().catch(() => '');
      if (!body.includes(assetNo)) fails.push('erp: 列表未出现新资产');
    }
    console.log(`\n[C2h erp 资产] asset=${assetNo} fails=${fails.length ? fails.join('|') : '无'}\n`);
    expect(fails).toEqual([]);
    await context.close();
  });

  test('C2i qms 检验弹窗：填 product_name → 提交 → 列表出现（C4）', async ({ browser }) => {
    test.setTimeout(3 * 60 * 1000);
    const context = await createAuthenticatedContext(browser, 'test_admin', 'admin123');
    const page = await context.newPage();
    const prodName = `检验产品-${ts()}`;
    const fails: string[] = [];

    // 注意：/qms/inspection 挂载 QmsInspectionRedesignPage（手写弹窗，字段无 name，
    // 用 id=field-3 产品名称；提交按钮为页脚按钮「创建检验单」，非 type=submit）。
    await page.goto(`${BASE_URL}/qms/inspection`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForTimeout(2500);
    const dialog = await openCreateDialog(page, fails, /新建检验单|新建|创建/);
    if (dialog) {
      const pn = dialog.locator('input[id="field-3"]');
      if ((await pn.count()) === 0) fails.push('qms: input#field-3（产品名称）缺失');
      else await pn.fill(prodName);
      const batch = dialog.locator('input[id="field-4"]');
      if ((await batch.count()) > 0) await batch.fill(`B-E2E-${ts()}`);
      const submit = dialog.locator('button:has-text("创建检验单"), button:has-text("创建"), button:has-text("保存")').first();
      if ((await submit.count()) === 0) fails.push('qms: 创建按钮缺失');
      else await submit.click().catch((e: Error) => fails.push(`qms: 提交失败 ${String(e).slice(0, 60)}`));
      await page.waitForTimeout(1500);
      if ((await dialog.count()) > 0) {
        await page.waitForTimeout(2500);
        if ((await dialog.count()) > 0) fails.push('qms: 提交后弹窗未关闭');
      }
      await page.waitForTimeout(3000);
      const body = await page.locator('body').innerText().catch(() => '');
      if (!body.includes(prodName)) fails.push('qms: 列表未出现新检验单');
    }
    console.log(`\n[C2i qms 检验] product=${prodName} fails=${fails.length ? fails.join('|') : '无'}\n`);
    expect(fails).toEqual([]);
    await context.close();
  });
});
