# B131 · CRM 销售预测状态收口

日期：2026-11-22

## 目标
`crm.sales_forecasts.status` 统一到 `SalesForecastStatus` 三值（`draft/generated/archived`），列表筛选严格解析并始终过滤规范集合，创建与自动生成不再写裸字符串，编辑补齐当前态、迁移矩阵与并发起始态谓词，前端类型与色板补齐。

## 数据现状
- 本地 0 行；列 `NOT NULL DEFAULT 'draft'`；无 CHECK。
- 生产快照 0 行；列 nullable、默认 `draft`、无 CHECK。

## 代码修复
`svc/crm/src/modules/sales_forecast_status.rs`（新增）
- `SalesForecastStatus::{Draft, Generated, Archived}`，DB 值 `draft/generated/archived`，默认 `Draft`。
- `draft ↔ generated`，`draft/generated → archived`，`archived` 为终态。
- 单测覆盖 DB 值 roundtrip、非法值、默认、迁移与终态。

`svc/crm/src/modules/sales_forecast.rs`
1. 列表状态筛选由裸字符串透传改为规范集合：
   - 传 `status` 时严格解析，非法值 400；
   - 未传时使用 `DB_VALUES` 三值兜底。
2. 列表与 COUNT 均改为 `status = ANY($2::text[])`。
3. 列表 SELECT 补 `deleted_at IS NULL`：原列表会返回软删行而 COUNT 排除，分页计数不一致。
4. 创建预测原写死 `'draft'`，改为 `$8` 绑定 `SalesForecastStatus::DEFAULT`。
5. `generate_forecast` 原写死 `'generated'`，改为 `$11` 绑定 `SalesForecastStatus::Generated`；这是真实系统写入，本批纳入枚举。
6. 编辑预测：
   - 当前状态严格解析，非法当前值 409；
   - 目标状态严格解析，迁移矩阵不允许 409；
   - 未传状态时回写当前规范值；
   - UPDATE 增加 `deleted_at IS NULL` 与 `COALESCE(status, $10) = $10` 起始态谓词，并发 0 行映射 409。

## 前端修复
- `apps/web/src/api/crm/types.ts`：`SalesForecast.status` 与 `SalesForecastQueryParams.status` 由 `string` 收敛为 `'draft' | 'generated' | 'archived'`。
- `apps/web/src/utils/status.ts`：统一色板补 `generated: 'info'`，消除 `generated` 落到灰色 fallback。

## 候选 DDL
`docs/database/crm-sales-forecast-status-check-candidates-2026-11-22.sql`
- 回填 NULL 为 `draft`、补默认 `'draft'`、设 `NOT NULL`。
- 同名 CHECK `ck_sales_forecasts_status_standard` 不存在时追加 `NOT VALID` 三值约束。
- 未在任何环境应用。

## 本地事务演练（全部 ROLLBACK）
- 模拟生产：解除 `NOT NULL` 并手工插入 1 行 NULL。
- 执行候选：NULL 回填为 `draft`，`SET NOT NULL` 通过。
- 新约束 `convalidated=false`，即 `NOT VALID`。
- `draft → generated → archived` 通过。
- 非法 `published`：23514，被约束拦下。
- ROLLBACK 后：0 行、约束 0、列恢复 `NOT NULL DEFAULT 'draft'`。

## 门禁
- `cargo check -p topems-crm`：通过
- `cargo clippy -p topems-crm --all-targets -- -D warnings`：通过
- `cargo test -p topems-crm --lib`：506 passed
- `apps/web pnpm run typecheck`：通过
- `apps/web pnpm run lint`：0 error，156 warnings（存量）
- `check-request-txn`：1651 全局 / CRM 192，未增长
- `check-scope-api`：未标记 176 / `Db::new` 144，未增长
- `check-txn-write-non2xx`：通过
- 盘点：204 枚举 / 191 值 / 152 不在 DB CHECK / 206 前端键，色板缺口 0
- 队列：140 枚举 / 152 值，resolved 108，分桶一致
- glossary 与 i18n quality：通过
