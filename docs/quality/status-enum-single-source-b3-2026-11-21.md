# W5-B 状态枚举单一源：B3 试点（finance / voucher_status）

## 1. 范围

B3 覆盖 finance 的 5 个 PostgreSQL ENUM 状态列，全部已在 DB 层拒绝集合外值，
不需要再补 CHECK：

| 类型                           | 值                                                                      |
| ------------------------------ | ----------------------------------------------------------------------- |
| `public.voucher_status`        | approved / cancelled / draft / posted / rejected / reversed / submitted |
| `public.approval_status`       | approved / cancelled / pending / rejected                               |
| `public.match_status`          | diff / manual / matched / unmatched                                     |
| `public.period_status`         | closed / closing / open                                                 |
| `public.reconciliation_status` | cancelled / completed / pending / processing                            |

## 2. 生成链

- 单一源：`docs/database/status-check-catalog.json` → `enum_types` 中 `public` 的 5 个状态类型
- 生成脚本：`scripts/ci/gen-finance-status.mjs`
- 生成物：`apps/web/src/components/finance/generated/financeStatus.ts`
  - 5 组 `*_VALUES`（`as const`）与联合类型
  - 5 组 `*_LABELS`（状态 → `finance.status.<group>_<value>`）
- 门禁：lefthook `status-codegen`，`--check` 不一致即阻断
- i18n：zh/en 各补 18 个通用状态文案

## 3. 前端漂移修正

`VoucherDetailPage` 与凭证列表原来手写状态：

`draft / pending / approved / posted / imported`（列表）
`draft / submitted / approved / posted / reversed / imported`（详情）

与 DB 枚举对比：

- `imported` 不在 DB 枚举内，且全仓无任何写入方，是死状态，已删除；
- 缺少 `cancelled`、`rejected`，遇到真实数据会落到原始字符串兜底，已补齐；
- 色板改为显式 `Record<VoucherStatus, ...>`，状态名由生成常量约束。

i18n 统一补 18 个 `finance.status.*` 键（zh/en），详情页原有 4 个
`status_approved / status_submitted / status_cancelled / status_rejected` 保留。


## 3.1 Rust 侧重复枚举

`svc/finance/src/domain/value_objects.rs` 另有一份 `VoucherStatus`，只有
`draft/submitted/approved/posted/reversed` 五态，读不到 DB 的 `rejected/cancelled`。
已删除该重复定义，改为 `pub use crate::models::VoucherStatus`，域层聚合与仓储
统一复用带 `sqlx::Type` 的完整七态实现；补 `rejected/cancelled` 序列化往返用例。

## 4. 验证

- `node scripts/ci/gen-finance-status.mjs --check` 通过
- `pnpm --dir apps/web typecheck` 通过
- `eslint apps/web/src/components/finance` 0 error
- `vitest src/components/finance` 3 files / 7 tests 通过

## 5. 剩余

finance 的 5 个 PostgreSQL ENUM 状态列已全部生成。还剩 28 个无约束状态列与
23 个 Rust `*Status` 枚举需要逐列确认真实取值后再纳入，不能把代码枚举直接当
DB 约束。其它模块复用本结构，只替换 DB 类型与目标文件。
