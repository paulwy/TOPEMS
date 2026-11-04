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
| 宏查询相对 prod 的新鲜度 | 依赖 `scripts/ci/check-sqlx-cache-freshness.cjs` 与离线编译；未做全量 `cargo sqlx prepare`（既有 schema drift 阻塞，超出本次范围） |
| 复杂 CTE/别名漏报 | 扫描器按 `FROM/JOIN` 表名 + 字段名匹配；若列经 CTE/表达式别名返回且字段名与列名不同，按"未判定"跳过，未实证 |
| 前端展示 | f64 输出格式不变，无需改前端；如后续改 Decimal 字符串输出，须先评审 API 契约 |
