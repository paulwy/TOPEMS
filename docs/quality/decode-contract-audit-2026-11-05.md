# DB 列类型 ↔ Rust 解码契约审计（2026-11-05）

> 对象：`topems_prod`（1402→1391 表，PostgreSQL 17.11）与仓库 `svc/` `lib/` Rust 代码。
> 触发：`crm.rfm_results.monetary / rfm_score` 的 numeric vs `f64` 相邻风险。
> 口径：**以代码契约 + 线上实际行为为准，谁破损改谁**；不改语义、不对 prod 收窄、不使用 `CASCADE`、不执行 `sqlx migrate run`。

## 0. 结论

| 项 | 结论 |
|---|---|
| `crm.rfm_results.monetary` | **prod 权威**：`numeric(15,2)`（金额语义 + 迁移 `20261029200000` 明文目标）；prod 不动 |
| `crm.rfm_results.rfm_score` | **prod 权威**：`numeric(10,2)`（分值语义 + 同上迁移）；prod 不动 |
| 代码侧 | `RfmResultRow` 详情查询原先直接解 `f64` ← NUMERIC，**必失败**；补显式 `::float8`（API 仍为 f64 number，契约不变） |
| test 侧 | `double precision` → `numeric(15,2) / numeric(10,2)`（DB-24，37 行值域校验通过） |
| 全仓扫描 | 唯一高危组合 **21**，人工复核后 **13 真 / 8 误报**；13 项全部修复；修复后复扫 **high=0** |
| prod 变更 | **无**（类型/行数不变，`/health` = 200，账本不新增） |
| 账本 | 未新增（DB-24 仅 test 定向，test 账本沿用现有管理口径） |

## 1. 扫描方法（4 种，交叉验证）

1. **宏查询（编译期保证）**：3155 处 `query!/query_as!/query_scalar!` 由 `.sqlx` 离线缓存 + `SQLX_OFFLINE=true cargo check`（pre-push 已执行）做类型断言；宏路径若类型不符会在编译期报错。缓存 295 个文件列类型分布：`Numeric 163 / Float8 45 / Int8 53 / Int4 61 / Uuid 440 / Jsonb 92 / Text 359`。
2. **动态查询静态扫描（本仓脚本）**：[check-decode-contract.mjs](scripts/ci/check-decode-contract.mjs) 将 prod 列目录（`pg_attribute` + `format_type` dump）与源码中 1818 处 `query_as::<_, Struct>` 的字段类型交叉比对，识别 f64↔NUMERIC/INT、i64↔FLOAT、String↔UUID 等不兼容组合，并跳过已有显式 `::float8 / ::text` cast 的安全路径。
3. **运行时探针（实证）**：本地 5432 临时表 + sqlx 二进制协议，直接观察解码结果（见 §3）。
4. **迁移 DDL 交叉**：对照 `20261029200000_schema_defense_type_align.sql`、`20260923000014_mes_column_type_fixes.sql` 等明文目标类型，以及 `scripts/check_migration_column_types.py` 的类型映射规则。

## 2. 高危清单（13 项，全部已修）

| # | 模块 | 表列 | DB 类型 | Rust 类型 | 风险 | 证据 | 动作 |
|---|---|---|---|---|---|---|---|
| 1 | crm | `crm.rfm_results.monetary` | numeric(15,2) | `f64` | 高 | 探针：NUMERIC→f64 `ColumnDecode` | 读路径 `::float8` |
| 2 | crm | `crm.rfm_results.rfm_score` | numeric(10,2) | `f64` | 高 | 同上 | 读路径 `::float8` |
| 3 | mes | `mes.demand_forecasts.forecast_quantity` | numeric(14,2) | `Option<f64>` | 高 | 静态扫描（9 处查询） | `::float8` |
| 4 | mes | `mes.demand_forecasts.actual_quantity` | numeric(14,2) | `Option<f64>` | 高 | 同上 | `::float8` |
| 5 | mes | `mes.demand_forecasts.accuracy_rate` | numeric(5,2) | `Option<f64>` | 高 | 同上 | `::float8` |
| 6 | mes | `mes.demand_forecasts.confidence_level` | numeric(5,2) | `Option<f64>` | 高 | 同上 | `::float8` |
| 7 | mes | `mes.production_plans.target_quantity` | numeric(14,2) | `Option<f64>` | 高 | 静态扫描（11 处查询） | `::float8` |
| 8 | rd | `rs.projects.budget` | double precision | `Option<i64>` | 高 | 探针类：i64 只解 INT 系 | 结构体改 `Option<f64>` |
| 9 | rd | `rs.projects.actual_cost` | double precision | `Option<i64>` | 高 | 同上 | 结构体改 `Option<f64>` |
| 10 | rd | `rs.material_tests.tested_by` | uuid（可空） | `String` | 高 | 探针：UUID→String `ColumnDecode` | 结构体改 `Option<Uuid>` |
| 11 | rd | `rs.patents.created_by` | uuid（可空） | `String` | 高 | 同上 | 结构体改 `Option<Uuid>` |
| 12 | rd | `rs.research_costs.created_by` | uuid（可空） | `String` | 高 | 同上 | 结构体改 `Option<Uuid>` |
| 13 | scm(test) | `scm.purchase_orders.total_amount` | numeric(15,2) | `Option<f64>` | 高 | 静态扫描（测试代码） | 测试查询 `::float8` |

**影响面（prod 实测行数，2026-11-05）**：`rfm_results 0 / demand_forecasts 0 / production_plans 0 / rs.projects 0 / material_tests 0 / patents 0 / research_costs 0 / purchase_orders 1`。即目前数据量下多数未触发；一旦写入非空行，上述端点会 500（而非静默错值）。

## 3. 实证输出（运行时探针）

本地 5432，`CREATE TEMP TABLE decode_probe (v numeric(15,2), u uuid)` 后直接解码（协议与线上一致）：

```
PROBE numeric(15,2) -> f64 = Err(ColumnDecode { index: "0", source: "mismatched types; Rust type `f64` (as SQL type `FLOAT8`) is not compatible with SQL type `NUMERIC`" })
PROBE uuid -> String = Err(ColumnDecode { index: "0", source: "mismatched types; Rust type `alloc::string::String` (as SQL type `TEXT`) is not compatible with SQL type `UUID`" })
test result: ok. 1 passed
```

结论：sqlx 0.8 会对类型做显式校验，故为**必然解码失败**（不是静默截断）；风险等级"高"成立。

## 4. 误报（8 项）与中/低风险

**误报（已显式 cast，验证安全）**：

| # | 位置 | 说明 |
|---|---|---|
| 1-3 | `svc/mes/src/modules/capacity.rs:155-158` | `available_hours::float8` 等内联 cast，安全 |
| 4-7 | `svc/pm/src/modules/project_type_config.rs:96` | `default_phases::text` 等内联 cast，安全 |
| 8 | `lib/shared-db/src/audit.rs:158` | `user_id::TEXT`，安全 |

**中风险（不改）**：`crm.rfm_results.monetary`、mes 数量/比率列以 `::float8` 输出时，超过 f64 有效位数（约 15-17 位）可能舍入；**DB 保留 NUMERIC 原值**，API 契约本就是 JSON number，不影响存储精度。若未来要求"金额字符串精确输出"，需单独评审 API 契约。

**低风险（语义等价，不改）**：`String` ← `varchar/text`、`i64` ← `int4/int8`、`f64` ← `float4/float8`。

## 5. 修复清单（文件#行）

| 文件 | 行 | 改动 |
|---|---|---|
| [rfm.rs](svc/crm/src/modules/rfm.rs#L617) | 617 | `monetary::float8, rfm_score::float8` |
| [demand_forecast.rs](svc/mes/src/modules/demand_forecast.rs#L157) | 157/241/281/322/355/433/460/503/530/571/593 | 4 列 `::float8`，并把 4 处 `SELECT *` 改为显式列清单 |
| [production_plan.rs](svc/mes/src/modules/production_plan.rs#L141) | 141/215/251/290/325/400/418/456/474/512/530 | `target_quantity::float8`，3 处 `SELECT *` 与 3 处 `RETURNING *` 改显式列清单 |
| [project_report.rs](svc/rd/src/modules/project_report.rs#L405-L406) | 405-406 | `budget / actual_cost`：`Option<i64>` → `Option<f64>`（JSON 仍为 number） |
| [material.rs](svc/rd/src/modules/material.rs#L70) | 70 | `tested_by: String` → `Option<Uuid>`（DB 列可空 uuid；JSON 仍为字符串/ null） |
| [patent.rs](svc/rd/src/modules/patent.rs#L80) | 80 | `created_by: String` → `Option<Uuid>` |
| [research_cost.rs](svc/rd/src/modules/research_cost.rs#L28) | 28 | `created_by: String` → `Option<Uuid>` |
| [integration_tests.rs](svc/scm/tests/integration_tests.rs#L198) | 198 | 测试查询 `total_amount::float8` |

**API 契约兼容性**：f64 字段数值不变；`i64 → f64` 与 `String → Option<Uuid>` 的 JSON 序列化仍分别为 number / uuid 字符串，仅在 NULL 场景由"崩溃"变为 `null`（原先任何行都会崩溃，故非可用契约的回退）。

**未执行的 `cargo sqlx prepare`**：本次修改的 SQL 均位于动态 `query_as`，不产生缓存条目；宏查询未改，无需重生成。全量 prepare 仍受既有 schema drift 阻塞（见 `numeric-family-62-2026-11-05.md`）。

## 6. test 定向迁移（DB-24）

- 文件：[20261105180000_db24_test_rfm_numeric_2cols.sql](database/migrations/20261105180000_db24_test_rfm_numeric_2cols.sql)
- 事务内预演：`ALTERED monetary / rfm_score` → `ROLLBACK`；正式执行 `psql -1` exit 0。
- 值域校验：`monetary` min=max=0，`rfm_score` 3..15，均整数、无 NaN/±Infinity、在目标精度内；守卫不满足即 NOTICE 跳过。
- 执行后：`monetary numeric(15,2)`、`rfm_score numeric(10,2)`，**37 行不变**，抽样 `0.00 / 3.00 / 15.00` 不变。
- prod 已是目标类型，**不执行任何 prod DDL**。

## 7. 复扫与产物

- 复扫：`node scripts/ci/check-decode-contract.mjs /tmp/prod_cols.psv` → `high=0`。
- 编译：`SQLX_OFFLINE=true cargo check -p topems-mes -p topems-crm -p topems-rd` exit 0；`cargo check -p topems-scm --tests` exit 0；`cargo fmt --check` exit 0。

## 8. 复现路径

```bash
# 1) prod 列目录（只读）
ssh xingzhai@192.168.110.115 "/opt/homebrew/bin/psql -d topems_prod -tA -F'|' -c \"SELECT n.nspname, c.relname, a.attname, format_type(a.atttypid,a.atttypmod) FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN ('r','p','v','m') AND a.attnum>0 AND NOT a.attisdropped AND n.nspname NOT IN ('pg_catalog','information_schema','pg_toast')\"" > /tmp/prod_cols.psv
# 2) 静态扫描
node scripts/ci/check-decode-contract.mjs /tmp/prod_cols.psv
# 3) 缓存类型统计（宏查询覆盖面）
python3 -c "import json,glob,collections;c=collections.Counter();[c.update(x['type_info'] for f in glob.glob('.sqlx/query-*.json') for x in json.load(open(f))['describe']['columns']);print(c)"
```

## 9. 未实证 / 待确认

| 项 | 说明 |
|---|---|
| 宏查询相对 prod 的新鲜度 | 全量 prepare 已于本日 39/39 成功（见 [sqlx-cache-baseline-2026-11-05.md](sqlx-cache-baseline-2026-11-05.md)）；本轮无 `query!` 宏改动，缓存无需刷新 |
| 复杂 CTE/别名漏报 | 扫描器按 `FROM/JOIN` 表名 + 字段名匹配；若列经 CTE/表达式别名返回且字段名与列名不同，按"未判定"跳过，未实证 |
| 前端展示 | f64 输出格式不变，无需改前端；如后续改 Decimal 字符串输出，须先评审 API 契约 |

## 10. 第二轮：动态解码点全仓审计（同日）

> 触发：`svc/wms/src/modules/stock_take.rs` 的 `try_get::<f64>` 解 prod `numeric`。本轮把扫描口径从 `query_as` 静态结构扩展到**动态解码点**，并覆盖 raw `GET`/`try_get`。

### 10.1 单点核实（stock_take）

| 项 | 结论 |
|---|---|
| 真实列 | prod：`wms.stock_take_items.system_quantity / counted_quantity / discrepancy_quantity` 均为 `numeric(15,2)` 可空；`wms.stock_takes.total_quantity / counted_quantity / discrepancy_quantity` 为 `numeric(15,2)`、`accuracy_rate numeric(5,2)` |
| 行数 | `wms.stock_take_items` = 0，`wms.stock_takes` = 0（2026-11-05 实测） |
| test 侧 | 实测已为 `numeric(15,2)` / `accuracy_rate numeric(5,2)`，与 prod 一致；迁移 `20261029200000_schema_defense_type_align` 已应用（见 §10.9） |
| 运行时探针 | sqlx 0.9 二进制协议：`numeric -> f64` 返回 `Err(ColumnDecode { index: "\"v\"", source: "mismatched types; Rust type f64 (as SQL type FLOAT8) is not compatible with SQL type NUMERIC" })`；`numeric -> i64`、`uuid -> String`、`jsonb -> String`、`bigint -> BigDecimal` 同类。**必然解码失败，不是静默截断** |
| 权威判定 | DB 权威（金额/数量/分值保 NUMERIC，迁移 `20261029200000_schema_defense_type_align.sql` 明文目标）；代码用 API JSON number（f64），故**只读路径加 `::float8`**，不降 DB 精度、不改字段类型 |
| 修复 | `stock_take.rs` 9 处 SELECT/RETURNING/`query_scalar`/SUM 表达式补 `::float8`（L813/926/1053/1134/1192/1254/1462-1464/1640） |

### 10.2 扫描器扩展（`scripts/ci/check-decode-contract.mjs`）

1. 新增动态点：`row.try_get::<T,_>("col")`、`row.get::<T,_>("col")`、`query_scalar::<_, T>`；helper 无 SQL 时回溯调用方 SQL（含多调用方并集）。
2. 别名表达式回溯：`AS name`、内联 `::type`、`CAST`、`SUM/AVG/COUNT/MAX/MIN`、`CASE ... THEN`。
3. **类型标注式推断解码**：`let x: T = row.try_get("col")`（无 turbofish，容易被遗漏）；仅认 `row/r/rec/record/pg_row/sql_row` 接收者，避免把 `req.get("fiscal_year")` 之类的 JSON 取值误判为行解码。
4. **修复三类系统性误报**：`SELECT` 列表范围收敛（不把 WHERE / INSERT 列清单当解码来源）；调用方仅取 SELECT/RETURNING；`query_scalar` 跳过 `let ... = format!(...)` 的后续动态 SQL；新增 `const X: &str = "..."` 展开（原先 `{PRODUCT_COLS}` 会遮住 cast 与列类型）。

### 10.3 结果

| 指标 | 值 |
|---|---|
| 修前 high | **156**（wms 58 / lims 40 / mes 13 / ehs 12 / master-data 8 / crm 6 / analytics 5 / qms 3 / unified-core 2 / scm 2 / pm 2 / finance 2 / erp 2 / mobile 1） |
| 常量展开后新暴露 | 11 列同类隐患（master-data 5 个 `*_COLS` 常量内 uuid/timestamptz 列，已一并修复） |
| 推断式解码新暴露 | 7 个字段 13 条 high：ehs `emergency_plan` 各表 `id`（9 个查询）、finance `cqrs_events.aggregate_id`、mes `equipment_inspections.temperature/vibration/noiselevel`、unified-core `audit_logs.status`、wms 低库存 `current_quantity/threshold_quantity`；全部已修 |
| 修后 high | **3（均为已人工核实的扫描器误报）**；medium 633（可空性差异，非本轮范围）；动态点 3895 / 可定位 462 / 未定位 200 |
| 修复方式 | 读路径显式 cast：`numeric→::float8`、`uuid/timestamptz/int→::text`、`int8/float→::numeric`；SQL 里对 `Option<Uuid>` 误加的 `::text` 删除；无 `unwrap_or`/`Option<>` 放宽 |
| 编译/门禁 | `SQLX_OFFLINE=true cargo check --workspace` exit 0；13 个受影响 crate `clippy --all-targets -D warnings` exit 0；`cargo fmt --all --check` exit 0 |
| 缓存 | 本轮未改 `query!`/`query_as!` 宏 → 无 `.sqlx` 变化，无需 prepare |

### 10.4 逐文件处置（文件#行 → 动作）

| 文件 | 行 | prod 证据 | 处置 |
|---|---|---|---|
| wms/inbound_order.rs | 59-61/796/979/1378 | `inbound_order_items.expected_quantity/received_quantity/rejected_quantity numeric(15,2)` | list/create RETURNING/update RETURNING/明细校验 `::float8` |
| wms/inventory_alert.rs | 953/1054/1151/1245/1485/1560 | `inventory_alert_rules.threshold_value`、`inventory_alert_records.current_quantity` numeric(15,2) | 6 处 `::float8`；2 处 `RETURNING *` 改显式列 |
| wms/inventory.rs | 163/584/587/604/610/657/965/969 | `inventory.quantity/available_quantity/min_quantity/max_quantity/total_value`、`warehouses.utilization_rate` numeric | `AVG(...)::float8`；消费 f64 的查询加 cast；BigDecimal helper 保留原列，另取 `_f8` 别名 |
| wms/outbound_order.rs | 680/693/694/806/911 | `outbound_order_items.requested_quantity/shipped_quantity numeric(15,2)` | `::float8` |
| wms/smart_replenishment/{orders,rules,safety_stock,suggestions}.rs | 28-31/76/77-80/155-158/263-266/284/374/511-512/30-37 | `replenishment_orders/replenishment_order_items/replenishment_rules/replenishment_suggestions/safety_stock_settings` numeric(18,4)/(10,4) | 所有 list/get/create/update/confirm 行源 `::float8`（suggestions 额外补前置查询 1 处） |
| wms/wave_pick.rs | 1135-1136/1213-1215 | `wave_pick_items.planned_quantity/picked_quantity numeric(15,2)` | `::float8`；list 查询额外补 1 处 |
| wms/stock_take.rs | 813/926/1053/1134/1192/1254/1462-1464/1640 | `stock_take_items/takes` numeric(15,2)/(5,2) | 9 处 `::float8` |
| lims/instrument_data/collection_tasks.rs | 45 | `qa_lims_collection_tasks.instrument_id uuid` | 删除误加 `::text`（字段 `Option<Uuid>`） |
| lims/proficiency_testing.rs | 1135/1138 | `qa_lims_pt_results.sample_id uuid`、`test_result numeric(18,6)` | 删 `::text`；`test_result::float8` |
| lims/instrument.rs | 720/776 | `qa_lab_instruments.id uuid`（别名 instrument_id） | `id::text` |
| lims/report.rs | 92-103/140-151/275-286/372-383/426 | `public.qa_lab_inspection_reports.id/sample_id uuid`、`inspection_date/created_at timestamptz` | 5 组查询 `::text` |
| lims/sample_barcode.rs | 1116/1121/1153/1156 | `qa_lab_samples.id uuid / quantity numeric(12,2)`；`qa_lims_barcode_scan_records.id/sample_id uuid` | `::text` / `quantity::float8` |
| lims/uncertainty.rs | 1313/1364/1429-1444/1465-1470/1497-1504 | 项目/来源/分量三表 uuid + numeric(18,6)/(10,4) | 1313 推断式解码三列补 `::float8`；其余 `::text` + `::float8` |
| mes/anomaly_detection.rs | 487/694/961-966 | `equipment_inspections.temperature/vibration/noiselevel numeric`；`equipment_oee.oee double precision`；`production_orders.quantity/completed_quantity bigint` | 巡检三列 `::float8`；`AVG(oee)::numeric`；`quantity::numeric`；删除失效的 i64 兜底 |
| mes/aps_scheduling.rs | 756/761/1147 | `production_orders.quantity bigint`、`priority varchar(20)` | `::numeric`；`priority` 字段 `Option<i32>` → `Option<String>`（列为枚举文本，JSON 由 number 变 string/null） |
| mes/material_plan.rs | 107 | `material_plans.tenant_id uuid` | 5 处行源 `tenant_id::text` |
| mes/process_flow.rs | 341 | `process_flows.capacity double precision` | `::numeric` |
| mes/production_cost.rs | 550 | `production_orders.quantity bigint` | `::numeric` |
| mes/production_record.rs | 264 | `production_records.rejected_quantity integer` | `::numeric AS quantity_defective` |
| mes/quality_management/standard.rs | 276 | `quality_standards.version integer` | `::text` |
| mes/work_order.rs | 464 | `work_orders.priority integer` | `::text` |
| crm/sales_forecast.rs | 725/859-860/1011-1012 | `crm.sales_forecasts.accuracy/confidence_level numeric(6,3)` | `::float8` |
| crm/analytics.rs | 72 | `billing_records.amount` 的 float8 行只走 `rows_to_name_value_f64` | **no-change（已核误报）** |
| ehs/emergency_plan.rs | 234/283/326/345/360/375/469/532/573 | `qa_ehs_emergency_plans/supplies/versions/approvals.id uuid` | 9 个 SELECT/RETURNING `id::text`（字段为 String，JSON 契约不变） |
| ehs/emergency_drill.rs | 383/495/612 | `qa_ehs_drill_plans/qa_ehs_drill_evaluations.tenant_id uuid` | 删除 SELECT/RETURNING 的 `::text`（WHERE 过滤保留） |
| ehs/environmental_compliance.rs | 2305/2341 | `qa_ehs_env_monitor_records/qa_ehs_environment_incidents.tenant_id uuid` | 行源（3+4 处）删除 `::text` |
| ehs/health.rs | 466 | `health_records.tenant_id uuid` | 4 处删除 `::text` |
| ehs/risk.rs | 946/1101/1236 | `qa_ehs_risk_controls.created_at timestamptz` | `created_at::text` |
| ehs/hazard.rs | 1589/1636 | 行源已 `id::text`/`updated_at::text` | **no-change（已核误报）** |
| ehs/safety.rs | 1318 | mapper 消费的 `qa_ehs_inspection_records` 已 `created_at::text` | **no-change（已核误报，表名同文件误归类）** |
| erp/master_data_audit.rs | 177/182 | `erp_master_data_audit_trail.master_data_id/changed_by uuid` | `::text` |
| finance/operational.rs | 1275 | `budgets.fiscal_year integer` | 4 处 `fiscal_year::text` |
| finance/periods.rs | 237 | `core_finance_periods.status period_status`（枚举） | `status::text` |
| mobile/workbench.rs | 219 | `shortcuts.id uuid` | `id::text` |
| wms/event_handlers/mod.rs | 319/322 | `inventory.quantity/min_quantity/reorder_point numeric(15,2)` | `quantity::float8`、`COALESCE(...)::float8` |
| finance/domain/pg_event_store.rs | 38/74/82/128/207/236/246 | `finance.cqrs_events.aggregate_id uuid` | 7 个 SELECT/RETURNING `aggregate_id::text`（字段 String，JSON 契约不变） |
| unified-core/iam/user/access_log.rs | 188/270 | `public.audit_logs.status varchar(20)`（值为 `success`/`failed`） | `Option<i16>` → `Option<String>`，success 判断兼容文本与 HTTP 码 |
| analytics/report/report.rs | 79/277 | `bi.reports.created_by uuid` | `created_by::text` |
| analytics/report/subscription.rs | 123/169/221 | `analytics.report_subscriptions.user_id uuid` | `user_id::text` |
| scm/incoming_inspection.rs | 1331-1332 | `inspection_records.quantity/samplesize numeric(15,3)` | 4 个行源 `::float8` |
| pm/report.rs | 273-274 | `budgets.total_amount/spent_amount double precision` | `::numeric`（Decimal 解码） |
| master-data/commercial_v55.rs | 71-74/1688-1699 | `mdm_api_products/mdm_subscriptions/mdm_usage_records/mdm_rate_cards/mdm_billing_records/mdm_sla_configs/mdm_sla_measurements/mdm_sla_incidents`：uuid / timestamptz / text 混合 | 5 个 `*_COLS` 常量补齐 `id/tenant_id/expires_at/measured_at/window_*::text`（常量展开后新暴露的 11 列） |
| unified-core/audit/audit_query.rs | 833/838/862 | `permission_audit_logs.id bigint`、`audit_logs.user_id uuid` | permission 分支 `id` 改 `i64`；audit_logs 分支 SELECT `user_id::text`；login_logs 分支 `Option<Uuid>` **no-change（已核误报，分支级扫描器不可区分）** |
| qms/inspection_standard.rs | 255/514/760 | `COUNT(*)::bigint`（非 `qa_*_plans.id`） | **no-change（已核误报，scalar 后紧跟 fetch SQL）** |

### 10.5 剩余未实证 / 待治理

| 项 | 说明 |
|---|---|
| 3 条 high 残留 | `crm/analytics.rs:72`、`unified-core/audit_query.rs:833/862`，均为扫描器按函数级/尾随 SQL 归因的误报；代码已核实正确（见 10.4） |
| medium 635 | 已分级：test 80 / prod 空表 596 / 未知表 3 / 活跃非测试 35（18 列对，prod NULL=0）；**实际需改 0 条**（见 §10.7） |
| 未定位 95 + 目录无列 504 | 未定位已由 200 降至 95；另 504 条 SQL 已定位但列类型来自表达式/CTE/动态拼接，全部标注原因（见 §10.8） |
| test 库 stock_take numeric | **已核实对齐**（`numeric(15,2)` / `numeric(5,2)`），无需迁移（见 §10.9） |
| unified-core permission 分支 | **已修复**：重写列清单与绑定，探针证明旧实现 `target_id` 短路、新实现正常（见 §10.6） |
| 无单测覆盖 | 动态解码错误只能在运行时触发；本轮以 prod 列目录交叉 + 编译 + 运行时探针（§3）验证，未新增集成测试 |

### 10.6 A：permission 导出分支列契约修复

**位置**：[audit_query.rs](svc/unified-core/src/modules/audit/audit_query.rs#L744-L758)（SELECT）+ [#L832-L859](svc/unified-core/src/modules/audit/audit_query.rs#L832-L859)（解码）。对应提交 `233e3136d5`。

**`information_schema` 实测（prod 与 test 列集合一致或 test 为其子集）**：

| 列 | prod 类型 | 可空 | test |
|---|---|---|---|
| `id` | `bigint` | NO | 同 |
| `tenant_id` | `uuid` | NO | 同 |
| `user_id` | `varchar(64)` | NO | 同 |
| `action` | `varchar(32)` | NO | 同 |
| `old_value` / `new_value` | `jsonb` | YES | 同 |
| `changed_by` | `varchar(64)` | NO | 同 |
| `changed_at` | `timestamptz` | NO | 同 |
| `ip_address` | `inet` | YES | 同 |
| `user_agent` | `text` | YES | 同 |
| `details` | `jsonb` | YES | 同 |
| `metadata` | `jsonb` | NO | **test 无此列**（导出未使用） |
| `deleted_at` | `timestamptz` | YES | 同 |

**不存在** `target_type / target_id / reason`（两库均无）。

**缺陷与修复**：
- 旧 SELECT 取 `old_value/new_value`，但解码按统一 `ExportRow` 读 `target_type/target_id/reason`；`row.try_get::<Option<Uuid>, _>("target_id")?` 因列不存在直接返回 `Err`，整个导出分支短路（空结果/500）。
- 新 SELECT 改为该分支真实可用的 `id, tenant_id, user_id, action, changed_by, host(ip_address) AS ip_address, user_agent, changed_at AS created_at`；`host(ip_address)` 去掉 inet 文本中的 `/32` 掩码。
- 解码只读真实列；`entity_type/entity_id/resource/status/success/error_message` 按分支真实可用性返回 `None`（不是伪造常量），`username` 语义为 `changed_by`，`created_at` 语义为 `changed_at`。字段语义差异已在代码注释与本节点说明。

**运行时探针（真二进制协议，本地 test 库；探针表数据已 DELETE 清理）**：

```
OLD rows=1
OLD decode=Err(no column found for name: target_id)
NEW rows=1
NEW decode=ok id=2 tenant=Some("00000000-0000-0000-0000-000000000001") user=Some("probe_user") action=create changed_by=Some("__decode_probe__") ip=Some("127.0.0.1") ua=Some("decode-probe") created_at=2026-11-05T01:55:43.149150+00:00
```

**真实数据**：prod `public.permission_audit_logs` = 0 行；test = 0 行（只读 `count(*)` 实测），无生产抽样。

### 10.7 B：medium 635 分级（prod 可空 + Rust 非 Option）

**分桶（扫描器 `medium` 635 条，按 prod `pg_stat_user_tables.n_live_tup` 与路径判定）**：

| 桶 | 条数 | 判定 |
|---|---|---|
| `svc/*/tests/` 测试代码 | 80 | 非生产路径，不改 |
| prod 表 `n_live_tup=0`（空表） | 596 | 无数据可触发 NULL，不改 |
| prod 目录无该表 | 3 | 扫描器别名/跨 crate 映射，不改 |
| 活跃非测试表 | **35**（去重 **18** 个表列对） | 逐对实测 NULL |

**18 个活跃表列对的 prod 实测（只读 `count(*) FILTER (WHERE col IS NULL)`）**：

| 表列 | 行数 | NULL | 语义类 |
|---|---|---|---|
| `ehs.qa_ehs_reviews.tenant_id` | 17 | 0 | 外键 |
| `ehs.qa_ehs_incident_actions.title` | 17 | 0 | 展示 |
| `ehs.qa_ehs_incident_actions.created_at` | 17 | 0 | 时间 |
| `ehs.qa_ehs_investigations.tenant_id` | 17 | 0 | 外键 |
| `ehs.training_programs.tenant_id` / `created_at` | 13 / 13 | 0 / 0 | 外键/时间 |
| `ehs.qa_ehs_training_certificates.tenant_id` / `created_at` / `updated_at` | 18 | 0 | 外键/时间 |
| `ehs.training_records.tenant_id` / `created_at` / `updated_at` | 13 | 0 | 外键/时间 |
| `ehs.qa_ehs_trainings.status` / `tenant_id` | 13 | 0 | 状态/外键 |
| `finance.erp_collection_records.amount` | 35 | 0 | 金额 |
| `public.core_tenant_settings.setting_value` | 4 | 0 | 展示 |
| `wms.replenishment_orders.total_quantity` / `total_amount` | 18 | 0 | 金额 |

**结论：635 → 实际需改 0 条**。18 对在 prod 当前数据中无 NULL，`Option<T>` 放宽不会带来正确性收益，反而弱化契约；`title` / `setting_value` 属展示类，NULL 语义合理，标「确认无害」。后续若需收口，应由 DB 侧 `NOT NULL` 或写入校验治理，而不是批量放宽 Rust 类型。

### 10.8 C：未定位 200 → 95，另 504 条目录无列逐条标注

**扫描器口径调整**（[check-decode-contract.mjs](scripts/ci/check-decode-contract.mjs)）：
1. `unmapped` 从「静默计数」改为逐条输出 `file:line|列|Rust 类型|原因`；
2. 新增同文件兜底：helper 无调用方时，取同文件含该列的 SELECT/RETURNING，仅在解析出**唯一**目标列时采信；
3. 新增 `nocatalog` 桶：SQL 已找到、但列类型来自表达式/聚合/CTE/动态拼接，prod 目录无对应列；单独计数并逐条标注原因，不再静默丢弃。

**结果（2026-11-05 复扫）**：

| 指标 | 修前 | 修后 |
|---|---|---|
| 动态解码点 | 3895 | 3895 |
| 可定位（解析到 prod 列） | 462（仅统计产生 finding 的点） | **3296** |
| 未定位（无 SQL / 兜底歧义） | 200 | **95** |
| 目录无列（SQL 已定位、列类型不可由目录解析） | 未统计 | **504** |

**未定位 95 原因分布**：同文件兜底候选歧义 70（master-data 82 / ehs 11 / integration 1 / erp 1）；helper 无调用方且同文件无 SQL 25。同文件兜底新定位 105 条，其中 2 条落入 medium（`ehs.qa_ehs_emergency_plan_approvals.order_num`、`ehs.qa_ehs_emergency_plan_supplies.quantity`，两表 prod 均 0 行）。

**目录无列 504 原因分布**：表达式/聚合/函数别名 303；动态列名/跨 crate 156；CTE/子查询 29；表未限定或 prod 目录无同名表（宏包装/跨 schema）16。

**人工抽查（样本）**：
- `finance/sales_invoice.rs:1480 invoice_date`：SQL 为 `to_char(invoice_date, …) AS invoice_date`，输出 text ↔ `String`，安全。
- `ai/model_admin_handlers.rs:178-180 d/count/tokens`：`to_char` / `COUNT(*)` / `SUM(...)` 表达式，输出 text/bigint/bigint ↔ `String/i64/i64`，安全。
- `communication/notification.rs:4344-4391`：`format!` 拼 `delivery_select_sql()` + 过滤条件，列清单含 `id/notification_id/user_id/...`，Rust 类型与列类型一致（uuid/String/Option<Uuid>），安全。
- `master-data/commercial_v55.rs:1704-1712`：`USAGE_COLS` 已 `id::text/tenant_id::text/recorded_at::text`，其余 `text/bigint/float8` ↔ `String/i64/f64`，安全。
- `ehs/emergency_plan.rs:671-681`：调用方 SQL（L345）已 `id::text/plan_id::text/created_at::text/tenant_id::text`，`quantity integer` ↔ `i32`，安全。

未定位剩余项不阻断：扫描器已逐条输出原因与位置，保留待后续按业务抽查。

### 10.9 D：test 库 stock_take 列类型核实（DB 治理，仅 test）

| 侧 | `stock_take_items` | `stock_takes` | 结论 |
|---|---|---|---|
| prod | `system_quantity/counted_quantity/discrepancy_quantity numeric(15,2)` | `total_quantity/counted_quantity/discrepancy_quantity numeric(15,2)`、`accuracy_rate numeric(5,2)` | 权威 |
| test（5432 `topems`） | 同 `numeric(15,2)` | 同 `numeric(15,2)` / `numeric(5,2)` | **已对齐** |

- 迁移账本：`_sqlx_migrations` 中 `20261029200000 schema_defense_type_align` `success=t`（test）。
- 差异仅为可空性：test `stock_take_items.system_quantity` 为 `NO`，prod 为 `YES`；不影响 Rust `f64` 解码（非 NULL）。
- **处置**：无迁移缺失、无历史手工残留；**不新增迁移、不改 prod**。原 §10.1/§10.5 的「test 仍 double precision」为过期结论，已更正。
