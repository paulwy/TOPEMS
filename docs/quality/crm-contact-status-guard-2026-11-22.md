# B130 · CRM 联系人生命周期状态收口

日期：2026-11-22

## 目标
`crm.contacts.status` 统一到 `ContactStatus` 三值（`active/inactive/archived`），列表状态筛选严格解析并始终过滤规范集合，编辑补齐当前态校验与并发起始态谓词，前端状态枚举补齐 `archived`。

## 数据现状
- 本地 6 行全部 `active`；列 `NOT NULL DEFAULT 'active'`；已有同名 VALID CHECK `ck_contacts_status_standard`。
- 生产快照 0 行；列 nullable、默认 `active`、无 CHECK。

## 代码修复（svc/crm/src/modules/contact.rs）
1. 列表状态筛选由 `Option<String>` 改为规范集合：
   - 传 `status` 时严格解析，非法值 400；
   - 未传时使用 `ContactStatus::DB_VALUES` 三值兜底，历史非法行不再返回。
2. 列表与 COUNT 的 `($2 IS NULL OR status = $2)` 改为 `status = ANY($2::text[])`，两条 SQL 同步。
3. 编辑联系人：
   - 当前状态严格解析，非法当前值 409；
   - 迁移矩阵 `active ↔ inactive`、`active/inactive → archived`、`archived → inactive`；
   - 未传新状态时回写当前规范值；
   - UPDATE 增加 `COALESCE(status, $12) = $12` 起始态谓词，并发 0 行映射 409。
4. 创建联系人的 `ContactStatus::DEFAULT` 绑定保持原样，无需改动。

## 前端修复
`apps/web/src/schemas/crm/contact.ts`
- `contactStatus` 由 `active/inactive` 扩为 `active/inactive/archived`。
- 表单状态下拉、列表状态色板、状态下拉筛选全部补 `archived`。
- `apps/web/src/api/crm/types.ts` 的 `ContactQueryParams` 新增 `status`，与后端已支持的查询参数对齐。
- `zh/en shared.json` 新增 `shared.contact.k29`（已归档 / Archived）。

## 候选 DDL
`docs/database/crm-contact-status-check-candidates-2026-11-22.sql`
- 回填 NULL 为 `active`、补默认 `'active'`、设 `NOT NULL`。
- 同名 CHECK 不存在时追加 `NOT VALID` 三值约束；本地已有 VALID 约束则跳过，生产缺失时补齐。
- 未在任何环境应用。

## 本地事务演练（全部 ROLLBACK）
- 模拟生产：删除 CHECK、解除 NOT NULL，手工置 1 行 NULL。
- 执行候选：NULL 行回填为 `active`，6 行全部 active；`SET NOT NULL` 通过。
- 新约束 `convalidated=false`，即 `NOT VALID`。
- `active → inactive` 1 行；`inactive → archived` 1 行。
- 非法 `potential`：23514，被约束拦下。
- ROLLBACK 后：6 行仍全 `active`，列 `NOT NULL DEFAULT 'active'`，原 VALID 约束恢复。

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
