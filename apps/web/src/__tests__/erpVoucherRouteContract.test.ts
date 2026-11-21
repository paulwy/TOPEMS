/**
 * 批 21 契约测试：ERP 凭证入口 → finance 权威页
 *
 * 背景：原 `pages/erp/VoucherPage.tsx`（114 行，纯 CrudPage + 统计卡片）是
 * `pages/finance/FinanceVoucherPage/index.tsx`（807 行，含科目 Tab / 导入 / 详情 / 分录 / 批量）的子集，
 * 且两者数据都走 `apiClient.finance`。凭证本质属财务域实体，收敛至 finance 权威页。
 *
 * 本测试锁住收敛后的契约，防止：
 *   1. 删除的 erp 页 / schema 回潮；
 *   2. ERP 入口路径丢失（用户入口不能丢）；
 *   3. 路由权限码与后端实际鉴权码（finance:voucher:read）脱节，导致"菜单可见但接口 403"。
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(here, '../..');
const erpConfig = readFileSync(resolve(webRoot, 'src/module-configs/erp/config.ts'), 'utf-8');

/** 取出 `const voucherRoute: RouteConfigV2<...> = { ... };` 这一段 */
function voucherRouteBlock(): string {
  const start = erpConfig.indexOf('const voucherRoute');
  expect(start).toBeGreaterThan(-1);
  const end = erpConfig.indexOf('};', start);
  return erpConfig.slice(start, end + 2);
}

describe('ERP 凭证入口收敛契约', () => {
  it('ERP 入口路径保持不变（用户入口不丢）', () => {
    expect(voucherRouteBlock()).toContain('path: ERP_PATHS.voucherManagement');
  });

  it('ERP 入口落点指向 finance 权威页', () => {
    const block = voucherRouteBlock();
    expect(block).toContain("import('@/components/finance/FinanceVoucherPage')");
    expect(block).toContain("'FinanceVoucherPage'");
    expect(block).not.toContain('@/components/erp/VoucherPage');
  });

  it('路由权限码与后端鉴权一致（finance:voucher:read，避免可见但 403）', () => {
    const block = voucherRouteBlock();
    expect(block).toContain("'finance:voucher:read'");
    expect(block).not.toContain("'erp:general_ledger:read'");
  });

  it('菜单 permission 与路由 requiredPermissions 一致（防"可见但进不去"）', () => {
    const src = readFileSync(resolve(webRoot, 'src/module-configs/erp/config.ts'), 'utf8');
    // 取 path: ERP_PATHS.voucherManagement 之后的 navItem permission 声明
    const navMatches = [
      ...src.matchAll(/path: ERP_PATHS\.voucherManagement,[\s\S]{0,400}?permission: '([^']+)'/g),
    ];
    expect(navMatches.length).toBeGreaterThan(0);
    for (const m of navMatches) {
      expect(m[1]).toBe('finance:voucher:read');
    }
  });

  it('已删除的 erp 重复实现不再存在（防回潮）', () => {
    expect(existsSync(resolve(webRoot, 'src/pages/erp/VoucherPage.tsx'))).toBe(false);
    expect(existsSync(resolve(webRoot, 'src/schemas/erp/voucher.ts'))).toBe(false);
  });

  it('finance 权威页仍然存在且为默认导出', () => {
    const financePage = readFileSync(
      resolve(webRoot, 'src/pages/finance/FinanceVoucherPage/index.tsx'),
      'utf-8'
    );
    expect(financePage).toContain('export default FinanceVoucherPage');
  });
});
