# W5-B 状态枚举单一源：B3 试点（finance / voucher_status）

## 1. 范围

B3 先在 finance 里选成本最低、DB 已有单一源的一列：`public.voucher_status`，
对应 `finance.core_finance_vouchers.status`。

DB 枚举标签（7 个）：

`approved / cancelled / draft / posted / rejected / reversed / submitted`

该列是 PostgreSQL ENUM 类型，数据库本身已拒绝集合外值，不需要再补 CHECK。

## 2. 生成链

- 单一源：`docs/database/status-check-catalog.json` → `enum_types.public.voucher_status`
- 生成脚本：`scripts/ci/gen-finance-voucher-status.mjs`
- 生成物：`apps/web/src/components/finance/generated/voucherStatus.ts`
  - `VOUCHER_STATUS_VALUES`（7 值，`as const`）
  - `VoucherStatus` 联合类型
  - `VOUCHER_STATUS_LABELS`（状态 → i18n key）
- 门禁：lefthook `status-codegen`，`--check` 不一致即阻断

## 3. 前端漂移修正

`VoucherDetailPage` 原来手写 6 个状态：

`draft / submitted / approved / posted / reversed / imported`

与 DB 枚举对比：

- `imported` 不在 DB 枚举内，且全仓无任何写入方，是死状态，已删除；
- 缺少 `cancelled`、`rejected`，遇到真实数据会落到原始字符串兜底，已补齐；
- 色板改为显式 `Record<VoucherStatus, ...>`，状态名由生成常量约束。

i18n 补 4 个键（zh/en）：

`status_approved / status_submitted / status_cancelled / status_rejected`

## 4. 验证

- `node scripts/ci/gen-finance-voucher-status.mjs --check` 通过
- `pnpm --dir apps/web typecheck` 通过
- `eslint VoucherDetailPage.tsx generated/voucherStatus.ts` 0 error
- `vitest src/components/finance` 3 files / 7 tests 通过

## 5. 剩余

finance 还有 4 个 PostgreSQL ENUM 状态列：

`period_status`、`match_status`、`reconciliation_status`、`approval_status`

以及 28 个无约束状态列、23 个 Rust `*Status` 枚举。按同一模板逐列映射，不一次性
机械合并。其它模块的生成链复用本结构，只替换 DB 类型与目标文件。
