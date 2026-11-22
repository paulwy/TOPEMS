# B129 · CRM 客户生命周期状态收口

日期：2026-11-22

## 目标
`crm.customers.status` 统一到 `CustomerStatus` 三值（`active/inactive/archived`），列表接受并严格解析状态筛选，读侧过滤规范集合，写侧保持 `active ↔ inactive`、`active/inactive → archived`、`archived → inactive` 的迁移矩阵，并堵住并发覆盖。

## 数据现状
- 本地 301 行全部 `active`；列 `NOT NULL DEFAULT 'active'`；已有同名 VALID CHECK `ck_customers_status_standard`。
- 生产快照 302 行全部 `active`；列 nullable、无默认、无 CHECK。

## 代码修复（svc/crm/src/modules/customer.rs）
1. `CustomerPaginationParams` 新增 `status`，列表此前完全忽略前端传入的 `status`。
2. 状态筛选严格解析：非法值 400；未传时使用 `CustomerStatus::DB_VALUES` 规范集合兜底，历史非法行不再返回。
3. 列表、COUNT、搜索计数、搜索列表四条 SQL 全部追加 `status = ANY(...)`。
4. 列表缓存 key 增加状态维度，避免不同筛选命中同一份缓存。
5. 创建客户审批初始值由字面量 `"none"` 改为 `CustomerApprovalStatus::DEFAULT`。
6. 编辑客户：
   - 当前状态缺失按默认 `active` 处理，历史 NULL 在保存时归一；
   - 非法当前值 409，非法目标值 400；
   - 迁移矩阵不合法 409；
   - UPDATE 增加 `COALESCE(status, $29) = $29` 起始态谓词，并发改写返回 0 行映射 409；
   - 未传新状态时也回写当前规范值，避免继续保留 NULL。

## 前端修复
`apps/web/src/components/crm/CrmCustomerRedesignPage.tsx`
- 页面 `Customer.status` 由 `active/inactive/potential` 收敛为 `active/inactive/archived`。
- 移除幽灵 `potential`：默认态改 `active`，未知值兜底 `active`。
- 状态色板新增 `archived`，状态页签由「潜在」替换为「已归档」。
- `zh/en` 的 `crm.customer_list_page.status_potential` 替换为 `status_archived`。

## 候选 DDL
`docs/database/crm-customer-status-check-candidates-2026-11-22.sql`
- 回填 NULL 为 `active`、补默认 `'active'`、设 `NOT NULL`。
- 同名 CHECK 不存在时追加 `NOT VALID` 三值约束；本地已有 VALID 约束则跳过，生产缺失时补齐。
- 未在任何环境应用。

## 本地事务演练（全部 ROLLBACK）
- 模拟生产缺约束后执行候选：新约束 `convalidated=false`，即 `NOT VALID`。
- `active → inactive` 1 行；`inactive → archived` 1 行。
- 非法 `potential`：23514，被约束拦下。
- NULL 回填：1 行 NULL → `active` → `SET NOT NULL` 通过。
- ROLLBACK 后：301 行仍全 `active`、列 `NOT NULL DEFAULT 'active'`、原 VALID 约束恢复。

## 门禁
- `cargo check -p topems-crm`：通过
- `cargo clippy -p topems-crm --all-targets -- -D warnings`：通过
- `cargo test -p topems-crm --lib`：505 passed
- `apps/web pnpm run typecheck`：通过
- `apps/web pnpm run lint`：0 error，156 warnings（存量）
- `check-request-txn`：1651 全局 / CRM 192，未增长
- `check-scope-api`：未标记 176 / `Db::new` 144，未增长
- `check-txn-write-non2xx`：通过
- 盘点：203 枚举 / 190 值 / 151 不在 DB CHECK / 205 前端键，色板缺口 0
- 队列：139 枚举 / 151 值，分桶一致
- glossary 与 i18n quality：通过
