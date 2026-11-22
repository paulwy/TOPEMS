# B133 · CRM 客户财务状态收口

日期：2026-11-22

## 目标
`crm.customer_finance.status` 复用 `CustomerStatus` 三值（`active/inactive/archived`），读侧拒绝非法值，写侧补当前态校验与并发起始态谓词，0 行冲突先回滚再 409；前端财务状态类型收敛，详情页移除幽灵 `normal/prospect/blocked` 展示。

## 数据现状
- 本地 1 行 `active`；列 `NOT NULL DEFAULT 'active'`；已有同名 VALID CHECK `ck_customer_finance_status_standard`，约束定义允许 NULL。
- 生产快照 0 行；列 `NOT NULL DEFAULT 'active'`；无 CHECK。
- 历史 B74 已把写入口接上 `CustomerStatus` 迁移矩阵，但读侧未校验、upsert 无并发起始态谓词。

## 代码修复（svc/crm/src/modules/customer.rs）
1. `get_customer_finance` 读到记录后校验 `status`，非法值 409，不再把非法状态返回前端。
2. `CustomerFinanceInfo::default_for` 的初始状态由字面量 `"active"` 改为 `CustomerStatus::DEFAULT`。
3. `update_customer_finance`：
   - 预读后无论请求是否传 `status`，都先严格解析当前状态，非法当前值 409；
   - 未传状态回写当前规范值，避免非法历史值被原样写回；
   - 目标状态仍按 `CustomerStatus` 迁移矩阵校验，非法值 400、非法跳转 409；
   - UPDATE 增加 `status = $23` 起始态谓词；先 UPDATE，0 行时：
     - 预读存在记录 → 说明状态被并发修改，显式 `rollback()` 后返回 409，避免“写入后返回非 2xx”导致事务静默回滚；
     - 预读无记录 → 保持原 upsert 语义，插入新财务记录。

## 前端修复
- `apps/web/src/api/crmFinance/index.ts`：`CustomerFinanceInfo.status` 由 `string` 收敛为 `'active' | 'inactive' | 'archived'`。
- `apps/web/src/components/crm/CustomerDetailPage.tsx`：
  - `getStatusBadge` 移除幽灵 `prospect/blocked`，补 `archived`；
  - 财务状态 Chip 不再判断 `status === 'normal'`，统一走三值色板，未知值仍安全回退原文。
- `zh/en crm.json`：`crm.customerDetail.status_active/inactive/archived` 三键补齐，删除未再使用的 `status_prospect/status_blocked/status_normal`。

## 候选 DDL
`docs/database/crm-customer-finance-status-check-candidates-2026-11-22.sql`
- 回填 NULL 为 `active`、补默认 `'active'`、设 `NOT NULL`。
- 同名 CHECK 不存在时追加 `NOT VALID` 三值约束；本地已有 VALID 约束则跳过。
- 同步列注释为精确三值。
- 未在任何环境应用。

## 本地事务演练（全部 ROLLBACK）
- 模拟生产：删除同名 VALID 约束、解除 `NOT NULL`，把唯一一行置 NULL。
- 执行候选：NULL 回填 `active`，默认 `active`，`SET NOT NULL` 通过。
- 新约束 `convalidated=false`，即 `NOT VALID`。
- `active → inactive → archived` 各 1 行通过。
- 非法 `normal`：23514，被约束拦下。
- ROLLBACK 后：1 行恢复 `active`，原 VALID 约束恢复，列恢复 `NOT NULL DEFAULT 'active'`。

## 门禁
- `cargo check -p topems-crm`：通过
- `cargo clippy -p topems-crm --all-targets -- -D warnings`：通过
- `cargo test -p topems-crm --lib`：507 passed
- `apps/web pnpm run typecheck`：通过
- `apps/web pnpm run lint`：0 error，156 warnings（存量）
- `check-request-txn`：1651 全局 / CRM 192，未增长
- `check-scope-api`：未标记 176 / `Db::new` 144，未增长
- `check-txn-write-non2xx`：通过（并发 409 前已显式 rollback）
- 盘点：205 枚举 / 191 值 / 152 不在 DB CHECK / 206 前端键，色板缺口 0
- 队列：141 枚举 / 152 值，resolved 109，分桶一致
- glossary 与 i18n quality：通过
