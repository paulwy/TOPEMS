# 数值族类型差异逐列判定（prod vs test，2026-11-05）

> 对象：`topems_prod` vs `topems_test`（同实例 192.168.110.115，PostgreSQL 17.11）。
> 口径：`pg_attribute` + `format_type()` 同名列比对；本轮只处理 int/smallint/bigint/numeric/real/double precision 之间的差异。
> 实测同列类型差异 **101**（历史记录 99，以实测为准；差额来自新增迁移/新表列），其中数值族 **62**。

## 1. 结论分布

| 类别 | 数量 | 说明 |
|---|---:|---|
| 不动（prod 语义正确或更宽） | **53** | 37 项 prod numeric vs test double（prod 为精确十进制，改 double 属精度降级）；16 项 prod double vs test numeric(p,s)（改 numeric 属范围收窄，禁止） |
| 可安全加宽（已执行） | **3** | `mes.production_orders.quantity`、`mes.production_orders.completed_quantity`、`mobile.documents.file_size`：integer → bigint |
| 需改代码后同步 | **6** | 4 项 integer→numeric/double（mes），2 项 integer→double（crm）；sqlx 解码/编译缓存需配套 |
| 需业务确认 | **0** | 本轮无 |

执行后：同列类型差异 **101 → 98**，数值族 **62 → 59**（减少量 = 实际执行列数 3）。

## 2. 执行记录（prod）

- 迁移：[20261105140000_p6_numeric_int_to_bigint_3cols.sql](database/migrations/20261105140000_p6_numeric_int_to_bigint_3cols.sql#L1-L66)，每列 `to_regclass` + 当前类型守卫，幂等；末尾终态校验。
- test 先行：`topems_test` 三列已是 bigint，迁移为幂等跳过，exit 0。
- prod 备份：`~/topems/backups/topems_prod_pre_p6_20261105.dump`（`pg_dump -Fc`，4,151,097 字节，`pg_restore -l` 8265 行 TOC，可读）。
- prod 执行：单事务 + `lock_timeout=5s` + `statement_timeout=60s`，exit 0；三表均 0 行，行数不变；`/health` = 200。
- 账本：`20261105140000`，`success=true`、`execution_time=0`，checksum `3459695e9acb…`（文件 SHA-384 复算一致）；账本 560→561。
- 依据：三列均无索引、无 RLS 策略、无视图/生成列引用；`completed_quantity` 默认值 `0` 由 `ALTER TYPE` 自动重写。

## 3. 完整 62 项清单

| 列 | prod 类型 | test 类型 | prod 行数 | test 行数 | 判定 |
|---|---|---|---:|---:|---|
| `crm.customers.revenue` | numeric(15,2) | double precision | 0 | 37 | 不动（prod 语义正确/更宽） |
| `crm.rfm_results.frequency` | integer | double precision | 0 | 37 | 需改代码后同步 |
| `crm.rfm_results.monetary` | numeric(15,2) | double precision | 0 | 37 | 不动（prod 语义正确/更宽） |
| `crm.rfm_results.recency_days` | integer | double precision | 0 | 37 | 需改代码后同步 |
| `crm.rfm_results.rfm_score` | numeric(10,2) | double precision | 0 | 37 | 不动（prod 语义正确/更宽） |
| `erp.bank_accounts.balance` | numeric(20,4) | double precision | 0 | 0 | 不动（prod 语义正确/更宽） |
| `erp.fixed_assets.monthly_depreciation` | numeric(20,4) | double precision | 0 | 0 | 不动（prod 语义正确/更宽） |
| `erp.fixed_assets.net_value` | numeric(20,4) | double precision | 0 | 0 | 不动（prod 语义正确/更宽） |
| `mes.equipment_oee.actual_output` | double precision | numeric(12,2) | 0 | 0 | 不动（prod 语义正确/更宽） |
| `mes.equipment_oee.actual_run_time` | double precision | numeric(10,2) | 0 | 0 | 不动（prod 语义正确/更宽） |
| `mes.equipment_oee.availability` | double precision | numeric(5,4) | 0 | 0 | 不动（prod 语义正确/更宽） |
| `mes.equipment_oee.defective_output` | double precision | numeric(12,2) | 0 | 0 | 不动（prod 语义正确/更宽） |
| `mes.equipment_oee.downtime` | double precision | numeric(10,2) | 0 | 0 | 不动（prod 语义正确/更宽） |
| `mes.equipment_oee.good_output` | double precision | numeric(12,2) | 0 | 0 | 不动（prod 语义正确/更宽） |
| `mes.equipment_oee.ideal_cycle_time` | double precision | numeric(10,4) | 0 | 0 | 不动（prod 语义正确/更宽） |
| `mes.equipment_oee.oee` | double precision | numeric(5,4) | 0 | 0 | 不动（prod 语义正确/更宽） |
| `mes.equipment_oee.performance` | double precision | numeric(5,4) | 0 | 0 | 不动（prod 语义正确/更宽） |
| `mes.equipment_oee.planned_production_time` | double precision | numeric(10,2) | 0 | 0 | 不动（prod 语义正确/更宽） |
| `mes.equipment_oee.quality_rate` | double precision | numeric(5,4) | 0 | 0 | 不动（prod 语义正确/更宽） |
| `mes.process_flow_steps.standard_time` | integer | double precision | 0 | 0 | 需改代码后同步 |
| `mes.process_flow_steps.transfer_time` | integer | numeric | 0 | 0 | 需改代码后同步 |
| `mes.process_flow_steps.wait_time` | integer | numeric | 0 | 0 | 需改代码后同步 |
| `mes.production_orders.completed_quantity` | integer | bigint | 0 | 3 | 可安全加宽（已执行） |
| `mes.production_orders.quantity` | integer | bigint | 0 | 3 | 可安全加宽（已执行） |
| `mes.production_records.completed_quantity` | integer | numeric(12,2) | 0 | 0 | 需改代码后同步 |
| `mobile.documents.file_size` | integer | bigint | 0 | 2 | 可安全加宽（已执行） |
| `rs.project_members.actual_hours` | double precision | numeric(10,2) | 0 | 0 | 不动（prod 语义正确/更宽） |
| `rs.project_members.allocation` | double precision | numeric(5,2) | 0 | 0 | 不动（prod 语义正确/更宽） |
| `rs.project_members.budgeted_hours` | double precision | numeric(10,2) | 0 | 0 | 不动（prod 语义正确/更宽） |
| `rs.project_members.cost_rate` | double precision | numeric(10,2) | 0 | 0 | 不动（prod 语义正确/更宽） |
| `rs.project_members.hourly_rate` | double precision | numeric(10,2) | 0 | 0 | 不动（prod 语义正确/更宽） |
| `wms.batches.available_quantity` | numeric(18,4) | double precision | 0 | 0 | 不动（prod 语义正确/更宽） |
| `wms.batches.quantity` | numeric(18,4) | double precision | 0 | 0 | 不动（prod 语义正确/更宽） |
| `wms.batches.total_value` | numeric(18,2) | double precision | 0 | 0 | 不动（prod 语义正确/更宽） |
| `wms.batches.unit_price` | numeric(18,4) | double precision | 0 | 0 | 不动（prod 语义正确/更宽） |
| `wms.discrepancy_records.adjustment_quantity` | numeric(15,2) | double precision | 0 | 0 | 不动（prod 语义正确/更宽） |
| `wms.discrepancy_records.counted_quantity` | numeric(15,2) | double precision | 0 | 0 | 不动（prod 语义正确/更宽） |
| `wms.discrepancy_records.discrepancy_quantity` | numeric(15,2) | double precision | 0 | 0 | 不动（prod 语义正确/更宽） |
| `wms.discrepancy_records.system_quantity` | numeric(15,2) | double precision | 0 | 0 | 不动（prod 语义正确/更宽） |
| `wms.inbound_orders.received_quantity` | numeric(15,2) | double precision | 0 | 21 | 不动（prod 语义正确/更宽） |
| `wms.inbound_orders.rejected_quantity` | numeric(15,2) | double precision | 0 | 21 | 不动（prod 语义正确/更宽） |
| `wms.inbound_orders.total_quantity` | numeric(15,2) | double precision | 0 | 21 | 不动（prod 语义正确/更宽） |
| `wms.inbound_orders.total_value` | numeric(15,2) | double precision | 0 | 21 | 不动（prod 语义正确/更宽） |
| `wms.inbound_orders.total_volume` | numeric(15,2) | double precision | 0 | 21 | 不动（prod 语义正确/更宽） |
| `wms.inbound_orders.total_weight` | numeric(15,2) | double precision | 0 | 21 | 不动（prod 语义正确/更宽） |
| `wms.locations.capacity` | numeric(15,2) | double precision | 0 | 0 | 不动（prod 语义正确/更宽） |
| `wms.replenishment_suggestions.available_stock` | numeric(18,4) | double precision | 0 | 0 | 不动（prod 语义正确/更宽） |
| `wms.replenishment_suggestions.consumption_rate` | numeric(18,4) | double precision | 0 | 0 | 不动（prod 语义正确/更宽） |
| `wms.replenishment_suggestions.current_stock` | numeric(18,4) | double precision | 0 | 0 | 不动（prod 语义正确/更宽） |
| `wms.replenishment_suggestions.max_stock` | numeric(18,4) | double precision | 0 | 0 | 不动（prod 语义正确/更宽） |
| `wms.replenishment_suggestions.reorder_point` | numeric(18,4) | double precision | 0 | 0 | 不动（prod 语义正确/更宽） |
| `wms.replenishment_suggestions.safety_stock` | numeric(18,4) | double precision | 0 | 0 | 不动（prod 语义正确/更宽） |
| `wms.replenishment_suggestions.suggested_quantity` | numeric(18,4) | double precision | 0 | 0 | 不动（prod 语义正确/更宽） |
| `wms.stock_take_items.counted_quantity` | numeric(15,2) | double precision | 0 | 0 | 不动（prod 语义正确/更宽） |
| `wms.stock_take_items.discrepancy_quantity` | numeric(15,2) | double precision | 0 | 0 | 不动（prod 语义正确/更宽） |
| `wms.stock_take_items.discrepancy_value` | numeric(15,2) | double precision | 0 | 0 | 不动（prod 语义正确/更宽） |
| `wms.stock_take_items.system_quantity` | numeric(15,2) | double precision | 0 | 0 | 不动（prod 语义正确/更宽） |
| `wms.stock_take_items.unit_price` | numeric(15,2) | double precision | 0 | 0 | 不动（prod 语义正确/更宽） |
| `wms.stock_takes.accuracy_rate` | numeric(5,2) | double precision | 0 | 0 | 不动（prod 语义正确/更宽） |
| `wms.stock_takes.counted_quantity` | numeric(15,2) | double precision | 0 | 0 | 不动（prod 语义正确/更宽） |
| `wms.stock_takes.discrepancy_quantity` | numeric(15,2) | double precision | 0 | 0 | 不动（prod 语义正确/更宽） |
| `wms.stock_takes.total_quantity` | numeric(15,2) | double precision | 0 | 0 | 不动（prod 语义正确/更宽） |

## 4. 证据（共性）

- **约束**：62 列均未参与 PK/UNIQUE/FK/CHECK；目标表的约束仅落在 `id`、外键列与 `order_no` 等（见 `pg_constraint` 实测）。
- **默认值**：仅 `mes.production_orders.completed_quantity`（0）、`rs.project_members.allocation`（1.0）有默认值；其余无。
- **视图/生成列**：17 张目标表对上述列 **0 视图依赖、0 生成列**。
- **行数（prod / test）**：`crm.customers` 0/37、`crm.rfm_results` 0/37、`mes.production_orders` 0/3、`mobile.documents` 0/2、`wms.inbound_orders` 0/21，其余表 0/0。
- **代码映射（代表）**：
  - WMS 金额/数量：`rust_decimal::Decimal`（[inbound_order.rs#L67](svc/wms/src/modules/inbound_order.rs#L67) `try_get::<Option<Decimal>>`）→ prod numeric 正确；改 double 会破坏精度与解码。
  - ERP 资产：`f64`（[fixed_asset.rs#L27-L29](svc/erp/src/modules/fixed_asset.rs#L27-L29)）配合 DECIMAL(20,4) 定义，仍以 prod numeric 为准。
  - MES 工单：查询显式 `quantity::float8` / `completed_quantity::float8`（[production_order.rs#L329](svc/mes/src/modules/production_order.rs#L329)）→ 加宽 bigint 无影响。
  - MES 工序：`standard_time/wait_time: Option<f64>`、`transfer_time: Option<String>`（[process_flow.rs#L124-L126](svc/mes/src/modules/process_flow.rs#L124-L126)），改 numeric 需同步改写与 sqlx 缓存。
  - CRM RFM：`calc_rfm_score(recency_days: u32, frequency: u32, monetary: f64)`（[util.rs#L200](svc/crm/src/shared/util.rs#L200)），字段为 integer，改 double 需改解码。
  - Mobile 文档：`MobileDocument.file_size: i64`（[document.rs#L38](svc/mobile/src/modules/document.rs#L38)），prod 原 int4 存在解码契约缺口，bigint 修复该缺口。

## 5. 待办（按模块）

| 模块 | 列 | 待办 |
|---|---|---|
| mes | `production_records.completed_quantity` | 代码已用 BigDecimal→f64；改 numeric(12,2) 需调整 `BigDecimal::from(...)` 与 `cargo sqlx prepare` |
| mes | `process_flow_steps.wait_time/standard_time/transfer_time` | `transfer_time` 目前按 String 处理，需统一数值语义（建议 decimal 或明确单位） |
| crm | `rfm_results.recency_days/frequency` | 代码按 u32/int 计算；改 double 需改查询解码与评分入参 |
| wms/erp/rs | 其余 53 项 | 保持 prod 现状；test 侧（double）若要对齐需另评估"double→numeric"的收窄风险，不在本轮 |

## 6. 与基线文档的关系

- 基线：[prod-governance-baseline-2026-11-04.md](docs/quality/prod-governance-baseline-2026-11-04.md) §6.2。
- 本轮未收窄任何列、未改金额/标识类语义、未 `CASCADE`、未 `sqlx migrate run`。
