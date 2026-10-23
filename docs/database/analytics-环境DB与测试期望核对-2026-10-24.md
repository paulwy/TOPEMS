# analytics 集成测试失败：环境 DB 与测试期望核对（2026-10-24）

> 范围：仅 psql **只读**核对 + 登记。本轮**未执行任何 DDL/DML**，未改 DB。
> 涉及测试：`svc/analytics/tests/integration_tests.rs` 的
> `test_analytics_dashboard_crud`、`test_bi_schema_table_count`。

## 0. 关键前提：测试连的是哪个库

`integration_tests.rs:12` 硬编码：

```rust
const TEST_DATABASE_URL: &str = "postgres://topems:topems_secret@localhost:5432/topems";
```

即测试连 **`topems` 库**，**不是** `.env` 中服务运行时用的 `topems_test` 库。
两个库的 bi schema 状态差异很大，这是本次根因判定的基础。

## 1. 现状核对（只读 psql，2026-10-24）

### 1.1 bi schema 表数量

| 库 | bi 表数 | 明细 |
|---|---|---|
| `topems`（测试实际连接） | **9** | analytics_dashboards, analytics_datasets, bi_datasets, report_execution_records, report_schedules, report_subscriptions, report_templates, reports, schema_defense_ledger |
| `topems_test`（服务运行时） | **21** | 上述 9 张 + analytics_comparison_analyses, analytics_comparison_results, analytics_dashboard_shares, analytics_dashboard_templates, analytics_datasources, analytics_drilldown_history, analytics_drilldown_paths, analytics_row_level_permissions, analytics_self_service_reports, analytics_sync_records, analytics_widgets, audit_logs |

- `test_bi_schema_table_count` 断言 `count >= 10`：`topems`=9 → **失败**；`topems_test`=21 → 通过。

### 1.2 bi.analytics_dashboards.tenant_id 列差异

| 项 | `topems` 实际 | migrations 期望 |
|---|---|---|
| tenant_id | `uuid NOT NULL`，**无 DEFAULT** | `uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'` |

- 依据：
  - `database/migrations/20261007000004_align_missing_columns_selfheal.sql:54`
    `ALTER TABLE "bi"."analytics_dashboards" ADD COLUMN IF NOT EXISTS "tenant_id" uuid NOT NULL DEFAULT '000...001'::uuid;`
  - `database/migrations/20261007000009_align_orphan_tables_selfheal3.sql:80`
    `CREATE TABLE IF NOT EXISTS bi.analytics_dashboards (... tenant_id uuid DEFAULT '000...001' NOT NULL)`
- `test_analytics_dashboard_crud` 的 INSERT 不带 tenant_id（依赖迁移定义的默认值兜底）：
  `topems` 该列无默认 → INSERT 违反 NOT NULL → **失败**。
- 注意 `ADD COLUMN IF NOT EXISTS` 语义：若列已存在（topems 旧表就是这种情况），
  迁移是 no-op，**不会**给已有列补 DEFAULT——所以即便该迁移"跑过"，旧表仍无默认。

### 1.3 迁移台账状态

- `topems`：`_sqlx_migrations` 表存在但**为空**（未登记任何迁移历史，属自助自愈/bootstrap 建库）。
- `topems_test`：迁移已登记至 `20261019000001_notification_templates_tenant_id.sql`。

## 2. 根因判定

**两个失败均属环境问题（`topems` 库落后于 migrations），不是代码缺陷，也不是测试期望过期：**

1. `test_bi_schema_table_count`：migrations 中 `CREATE TABLE IF NOT EXISTS bi.*` 覆盖
   ≥16 张表（grep 全量迁移文件确认），`topems_test` 实测 21 张。测试断言 ≥10 是保守下限，
   期望合理；`topems` 仅 9 张是**该库未重放后续建表迁移**。
2. `test_analytics_dashboard_crud`：测试 INSERT 省略 tenant_id、依赖迁移默认值，写法与
   migrations 定义一致；`topems` 表缺 DEFAULT 是**旧表结构未被 selfheal 对齐迁移修补**。

## 3. 建议（本轮不执行，待决策后手动/迁移流程落地）

按风险从低到高：

1. **补 tenant_id 默认值**（对齐 selfheal 期望）：
   `ALTER TABLE bi.analytics_dashboards ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';`
2. **重放缺失建表迁移**：让 `topems` 的 bi schema 补齐到 `topems_test` 同代
   （重点核对 `20261007000004/06/09/14` selfheal 批次及后续 analytics 建表迁移）。
3. 或：为 `topems` 库补登记/重跑 sqlx 迁移台账，使其与 `topems_test` 同口径。

**不建议**修改测试断言来迁就旧库（≥10 表、省略 tenant_id 的 INSERT 均与 migrations 一致）。

## 4. 结论

- 测试代码：**不动**（期望与 migrations 一致，属环境落后）。
- DB：本轮按约束**不自动执行 DDL/DML**，差异已在上文登记，待决策项确认后由迁移流程补。
