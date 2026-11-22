# B132 · CRM 交互记录状态收口

日期：2026-11-22

## 目标
`crm.interactions.status` 统一到 `InteractionStatus` 四值（`scheduled/in_progress/completed/cancelled`），列表筛选严格解析并始终过滤规范集合，创建绑定默认态，编辑补齐目标态校验、迁移矩阵与并发起始态谓词，前端类型、表单、色板与筛选补齐 `in_progress`。

## 数据现状
- 本地 1 行，状态为 `in_progress`；列 `NOT NULL DEFAULT 'scheduled'`；无 CHECK；列注释原为 `scheduled, in_progress, completed, cancelled等`。
- 生产快照 0 行；列 nullable、默认 `pending`、无 CHECK。
- 历史 `in_progress` 是唯一真实存量值，本批保留为进行中状态，不做数据改写。

## 代码修复
`svc/crm/src/modules/interaction_status.rs`（新增）
- `InteractionStatus::{Scheduled, InProgress, Completed, Cancelled}`，DB 值 `scheduled/in_progress/completed/cancelled`，默认 `Scheduled`。
- `scheduled ↔ in_progress`，`scheduled/in_progress → completed/cancelled`，`completed/cancelled` 为终态。
- 单测覆盖 DB 值 roundtrip、非法值、默认、迁移与终态。

`svc/crm/src/modules/interaction.rs`
1. 列表状态筛选由裸字符串透传改为规范集合：
   - 传 `status` 时严格解析，非法值 400；
   - 未传时使用 `DB_VALUES` 四值兜底。
2. 列表与 COUNT 的 `($2 IS NULL OR status = $2)` 改为 `status = ANY($2::text[])`，两条 SQL 同步。
3. 创建交互记录原写死 `'scheduled'`，改为 `$12` 绑定 `InteractionStatus::DEFAULT`。
4. 编辑交互记录：
   - 目标状态严格解析，非法值 400；
   - UPDATE 增加 `status = ANY(DB_VALUES)`，历史非法当前态 409；
   - 迁移矩阵内嵌在 UPDATE：同态放行；`scheduled` 可到 `in_progress/completed/cancelled`；`in_progress` 可到 `completed/cancelled`；终态不可回退；
   - 0 行统一映射 409，覆盖不存在、软删与并发改态。

## 前端修复
- `apps/web/src/api/crm/types.ts`：`Interaction.status` 由 `string` 收敛为四值联合；`InteractionQueryParams` 新增 `status`。
- `apps/web/src/schemas/crm/interaction.ts`：表单状态下拉、列表色板、状态标签、筛选下拉全部补 `in_progress`。
- `zh/en shared.json` 新增 `shared.interaction.k40`（进行中 / In Progress）。

## 候选 DDL
`docs/database/crm-interaction-status-check-candidates-2026-11-22.sql`
- 回填 NULL 为 `scheduled`、默认改 `'scheduled'`、设 `NOT NULL`。
- 同名 CHECK `ck_interactions_status_standard` 不存在时追加 `NOT VALID` 四值约束。
- 同步列注释为精确四值，去掉“等”。
- 未在任何环境应用。

## 本地事务演练（全部 ROLLBACK）
- 模拟生产：解除 `NOT NULL`、默认改为 `pending`，把唯一一行置 NULL。
- 执行候选：NULL 回填为 `scheduled`，默认改为 `scheduled`，`SET NOT NULL` 通过。
- 新约束 `convalidated=false`，即 `NOT VALID`。
- `scheduled → in_progress → completed` 各 1 行通过。
- 非法 `no_show`：23514，被约束拦下。
- ROLLBACK 后：1 行恢复 `in_progress`，约束 0，列恢复 `NOT NULL DEFAULT 'scheduled'`。

## 遗留
- 同一行 `interaction_type` 为 `aftersales_ticket`，不在前端 call/email/meeting/visit/other 选项内；属类型字典问题，不在本批状态范围。
- `in_progress` 只保留读侧与手工入口，当前无独立“开始交互”端点。

## 门禁
- `cargo check -p topems-crm`：通过
- `cargo clippy -p topems-crm --all-targets -- -D warnings`：通过
- `cargo test -p topems-crm --lib`：507 passed
- `apps/web pnpm run typecheck`：通过
- `apps/web pnpm run lint`：0 error，156 warnings（存量）
- `check-request-txn`：1651 全局 / CRM 192，未增长
- `check-scope-api`：未标记 176 / `Db::new` 144，未增长
- `check-txn-write-non2xx`：通过
- 盘点：205 枚举 / 191 值 / 152 不在 DB CHECK / 206 前端键，色板缺口 0
- 队列：141 枚举 / 152 值，resolved 109，分桶一致
- glossary 与 i18n quality：通过
