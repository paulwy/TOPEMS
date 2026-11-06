# MES 集成测试两项失败：根因与修复（2026-11-06）

> 范围：`topems-mes` 集成测试 2 个失败（`ck_batch_records_status_standard` 拒绝 `in_stock`、
> `production_orders.completed_quantity` 的 `NUMERIC` 按 `i64` 解码）+ 1 个既有夹具缺口
> （`work_order_e2e` 缺 `tenant_id`）。测试口径未改；prod 全程只读。

## 0. 结论

| # | 现象 | 根因 | 修法 |
|---|---|---|---|
| 1 | `test_batch_record_crud` 插入 `status='in_stock'` 报 23514 | **约束是模板误加**，不是缺值 | 前向迁移 `DROP` 约束（`20261107000018`） |
| 2 | `test_create_production_order_crud` 读 `completed_quantity` 报 `ColumnDecode` | 本地/test 的 `production_orders` 列类型漂移（`numeric(12,2)` / `integer`），prod 是 `bigint` | 前向迁移对齐 `bigint`（`20261107000017`） |
| 3 | `work_order_e2e` 3 个用例 0/3 失败（既有缺口，非本轮两项） | 测试夹具 `mes.work_orders` 缺 `tenant_id`，handler 已带 `wo.tenant_id` 过滤 | 夹具补列，断言不变 |

新增迁移：

- [20261107000017_mes_production_orders_quantity_bigint.sql](../../database/migrations/20261107000017_mes_production_orders_quantity_bigint.sql)
- [20261107000018_mes_drop_ck_batch_records_status_standard.sql](../../database/migrations/20261107000018_mes_drop_ck_batch_records_status_standard.sql)

---

## 1. `ck_batch_records_status_standard` 不接受 `in_stock`

### 1.1 三处环境的约束与数据（2026-11-06 实测）

| 环境 | 约束是否存在 | 约束定义 | `mes.batch_records` 行数 |
|---|---|---|---|
| prod `topems_prod` | **不存在** | — | 0 |
| test `topems_prepare` | 存在 | `CHECK (status IS NULL OR status::text = ANY('{active,inactive,archived}'))` | 0 |
| 本地 `topems` | 存在（修复前） | 同上 | 0 |

修复前本地约束原文（`/tmp/tz_local_backup/p10/before_misc.txt`）：

```
ck_batch_records_status_standard|CHECK (((status IS NULL) OR ((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying])::text[]))))
```

### 1.2 约束来源：模板批量加约束，0 行表空集通过

- [20260809000002_add_status_check_constraints.sql](../../database/migrations/20260809000002_add_status_check_constraints.sql)
  是**全库模板**：扫描所有含 `status` 文本列、且无 `%status%` 约束的表，仅当
  `status NOT IN ('active','inactive','archived')` 的行数为 0 时批量加
  `ck_{table}_status_standard`。
- `mes.batch_records` 当时 **0 行**，空集判定通过 → 被误加。
- 建表迁移 [20260926120000_app_schema_tables.sql](../../database/migrations/20260926120000_app_schema_tables.sql)
  创建该表时**没有声明任何 status CHECK**（正文仅 `status VARCHAR(...)`）。
- 同源遗留已有处置先例：
  [20261103000002_global_remove_misapplied_status_standard_checks.sql](../../database/migrations/20261103000002_global_remove_misapplied_status_standard_checks.sql)
  （327 张表清单，不含 `mes.batch_records`）与
  [20261104110000_p5b_prod_status_standard_checks_3.sql](../../database/migrations/20261104110000_p5b_prod_status_standard_checks_3.sql)
  （按名删除 prod 遗留 3 条，明确「账本 success ≠ DDL 到位」）。

### 1.3 `in_stock` 写入点与业务语义

- 写入点：[integration_tests.rs](../../svc/mes/tests/integration_tests.rs#L1590-L1620)
  `test_batch_record_crud`：`INSERT ... status='in_stock'` → 领用 `partially_used`
  → 耗尽 `exhausted`，是被测业务状态机的完整生命周期，不是随手造的测试值。
- 同名状态值在其它模块有明确业务约定：
  - WMS 序列号表 DDL 默认值 `status VARCHAR(50) NOT NULL DEFAULT 'in_stock'`
    （[schema_defense.rs](../../svc/wms/src/schema_defense.rs#L775)）；
  - WMS 批次管理页 `statusConfig` 以 `in_stock` 为默认/在库
    （[BatchManagementPage.tsx](../../apps/web/src/pages/wms/BatchManagementPage.tsx#L26)，
    i18n `wms.batch_management_page.in_stock` = 在库）；
  - ERP 办公用品 schema 的 `status` 选项含 `in_stock` 且为默认值
    （[officeSupplies.ts](../../apps/web/src/schemas/erp/officeSupplies.ts#L92-L106)）。
- 历史数据分布：三处环境 `mes.batch_records` 均为 **0 行**，无存量数据约束风险。

### 1.4 判定与修法

**判定：约束缺值？否。代码写错值？否。** 结论是**模板误加约束**——正确的取值集合是
`in_stock / partially_used / exhausted`（以及可能的领用中间态），而模板的
`active/inactive/archived` 与该表业务无关。若"扩约束补 3 个值"，等于把无关模板继续
留在业务表上，也无法证明未来新增状态不被误伤；按既有先例改为 **DROP**。

修法（`20261107000018`）：表/约束不存在只 `NOTICE`，存在则 `DROP CONSTRAINT`，幂等。

---

## 2. `completed_quantity` 的 `NUMERIC` 按 `i64` 解码

### 2.1 语义判定：订单数量是整数件数

| 环境 | `production_orders.quantity` | `contract` | 行数 / 小数行 |
|---|---|---|---|
| prod | `bigint` | `completed_quantity: bigint` | 22 / 0 |
| 本地（修复前） | `integer` | `completed_quantity: numeric(12,2)` | 127 / 0 |
| test（修复前） | `integer` | `completed_quantity: numeric(12,2)` | 0 / 0 |

- prod 基线本来就是 `bigint`；本地/test 是漂移，不是设计。
- 允许小数的数量语义在 **`mes.production_records.completed_quantity`**：prod 为
  `numeric(12,2)`，由
  [20261105160000_p7_prod_type_align_4cols.sql](../../database/migrations/20261105160000_p7_prod_type_align_4cols.sql)
  明确改回 `numeric`（[numeric-family-62-2026-11-05.md](numeric-family-62-2026-11-05.md) 已记录）。
  该列代码用 `BigDecimal` 读，**本轮不动**。
- 写入侧：生产订单接口数量走 `f64`/整数件数（`CreateWorkOrderRequest.planned_quantity: f64`），
  生产看板 [production_kanban.rs](../../svc/mes/src/modules/production_kanban.rs#L299-L304)
  按 `i64` 读取 `quantity` / `completed_quantity`；集成测试亦按 `i64` 断言。
- 前端展示：订单数量为件数整数（进度 = `completed_quantity / quantity * 100`，
  [production_kanban.rs](../../svc/mes/src/modules/production_kanban.rs#L544)）。

### 2.2 漂移原因

本地/test 的 `_sqlx_migrations` 账本声称已执行 `20261029200000`、`20261104040000`，
但 DDL 实际未落地；[20261105140000_p6_numeric_int_to_bigint_3cols.sql](../../database/migrations/20261105140000_p6_numeric_int_to_bigint_3cols.sql)
只处理 `integer/smallint`，遇到 `numeric` 直接跳过 → 本地/test 停在
`quantity integer` / `completed_quantity numeric(12,2)`。

### 2.3 修法选择：改列类型（对齐 prod），不是读路径 cast

- 读路径 `::bigint` / `::float8` 只是掩盖漂移：`float8` 会把件数变成浮点，`bigint` cast
  遇到真正的小数会四舍/截断，且 `.sqlx` 缓存与 prod 契约不一致的问题依旧存在。
- 订单数量业务上是整数件数，prod 基线是 `bigint`，**正确方向是把漂移列对齐为 `bigint`**。
- 迁移 `20261107000017`：
  1. 先断言两列无小数行（`x::numeric <> trunc(x::numeric)` 计数 > 0 即
     `RAISE EXCEPTION`，拒绝静默丢精度）；
  2. `ALTER COLUMN ... TYPE bigint USING ROUND(x::numeric)::bigint`（仅在无小数行后执行）；
  3. 终态断言两列均 `int8`；已在 `bigint` 的列跳过，幂等。

### 2.4 修复前后行为对比

| 场景 | 修复前（本地/test `numeric(12,2)`） | 修复后（`bigint`） |
|---|---|---|
| 整数行（如 `1000`, `0`） | sqlx `i64` 解码失败：`ColumnDecode ... NUMERIC` | 正常解码为 `i64` |
| 小数行（如 `1000.50`） | 解码失败（同上），且迁移会 `RAISE EXCEPTION` 拒绝转换 | 迁移拒绝（不允许静默取整）；若强行写入 `1000.5` 到 `bigint`，PG 会报需要显式 cast |
| 超出 `i64` 范围（> 9.22e18） | `numeric(12,2)` 精度上限 10 位整数，写不进去 | `bigint` 上限 9.22e18；超出报 `bigint out of range` |
| `production_records.completed_quantity` | `numeric(12,2)` + `BigDecimal`（正确） | 不变 |

### 2.5 同类字段清单（顺带核对，未扩散修改）

- `mes.production_orders.quantity`：同一漂移，已在本迁移一并对齐 `bigint`。
- `mes.production_records.completed_quantity`：**允许小数**，prod `numeric(12,2)`，
  代码 `BigDecimal`，保持不动。
- `mes.production_kanban.rs` 对订单数量的 `i64` 读取（2 处：`L299/L304`、`L592/L597`）：
  迁移后自然匹配，无需改代码。
- `anomaly_detection` 对 `production_records` 数量的 `BigDecimal` 读取：语义正确，无需改。
- 其余 `*_quantity` 字段（如 `demand_forecasts`）显式 `::float8` 读取，属浮点语义，不在本轮范围。

---

## 3. 第三个既有失败：`work_order_e2e` 夹具缺列

- 现象：`list_empty_returns_zero` / `list_returns_inserted_row` / `list_filters_by_status`
  3 个用例 0/3 失败，panic 在 `svc/mes/tests/work_order_e2e.rs:93`（handler 失败）。
- 根因：`#[sqlx::test(migrations=false)]` 临时库只执行测试内 `setup_schema`，
  其 `CREATE TABLE mes.work_orders` 缺 `tenant_id`，而
  [work_order.rs](../../svc/mes/src/modules/work_order.rs#L281-L390) 列表 SQL 已带
  `wo.tenant_id` 过滤 → 查询报列不存在。
- 修法：夹具补 `tenant_id UUID` 一列（[work_order_e2e.rs](../../svc/mes/tests/work_order_e2e.rs)），
  断言与测试口径未改。

---

## 4. 验证结果

### 4.1 集成测试前后对比

| 二进制 | 修复前 | 修复后 |
|---|---|---|
| `tests/integration_tests.rs` | 45 passed / **2 failed**（`test_batch_record_crud`、`test_create_production_order_crud`） | **47 passed / 0 failed** |
| `tests/work_order_e2e.rs` | **0 passed / 3 failed**（既有夹具缺口） | **3 passed / 0 failed** |
| `cargo test -p topems-mes`（全部二进制） | 含上述失败 | 370/16/2/3/47/3/2/40/1/12/3/3/0 **全部 0 failed** |

日志：`/tmp/tz_local_backup/p10/mes_integration_after.log`、`mes_all_after.log`、
`work_order_after.log`。

### 4.2 静态检查

- `cargo check -p topems-mes --all-targets`：通过。
- `cargo clippy -p topems-mes --all-targets -- -D warnings`：通过（2026-11-06 本轮复跑）。
- `cargo fmt --check`：通过。

### 4.3 迁移应用与账本

| 环境 | 方式 | 结果 | 账本 |
|---|---|---|---|
| 本地 `topems` | `apply-forward --db topems --anchor 20261107000008 --only 20261107000017,20261107000018 --defer 0709–0716` | 两列 `bigint`；约束已删；127 行保留、0 小数；幂等复跑「已是 bigint，跳过 / 转换 0 列」「不存在（已清理）」 | **552 → 554**（新增 2 行） |
| test `topems_prepare` | 快照库未纳入 `_sqlx_migrations`，直接 `psql -f` 应用两文件 | `integer → bigint`、`numeric(12,2) → bigint`、约束删除；幂等复跑 0 操作 | 未伪造账本 |
| prod `topems_prod` | **全程只读，未执行 DDL** | 本来已是 `bigint` 且无该约束 | 579，两条新迁移 **0 条已应用**（待新窗口） |

- `database/checksums.txt`：`bash scripts/migration/validate.sh` 后 **只新增 2 行**（`git diff --numstat` = `2 0`），
  历史迁移文件字节未改（`git status` 仅本条迁移与 `work_order_e2e.rs`）。
- `validate.sh` 汇总：`Total 613 / Invalid filenames 0 / Checksum errors 0 / Schema drift 0 / Errors 0`。

### 4.4 `openapi_extract` 栈溢出说明（未在本轮修）

- mes 的 `tests/openapi_extract.rs` 本轮 **1 passed**；栈溢出为 `svc/finance` 的
  `extract_openapi_spec` 递归展开导致（既有问题，与本轮改动无关），未强修。

---

## 5. 遗留项

1. **prod 新窗口**：`20261107000017` / `20261107000018` 在 prod 为**空转 + 2 行账本**
   （prod 已是 `bigint`、无该约束），需授权后按白名单窗口执行。
2. **`mes.batch_records.status` 默认值仍是模板值 `active`**（本地/prod 均为
   `'active'::character varying`），与 `in_stock` 业务状态机不一致，本轮未改，待单独确认。
3. **其它 `ck_%_status_standard` 残留**需逐条判断（不是批量删除）：
   本地 **247**、test **618**、prod **4**；prod 4 条均为业务闭合值
   （`crm.audit_logs`、`crm.returns`、`mobile.mobile_tasks`、`srm.inquiries`），属合法约束。
4. **账本 vs DDL 漂移**：本地/test 多条迁移账本 success 但 DDL 未落地（本轮撞到
   `20261029200000`、`20261104040000`、`20261105140000`、`20261105160000`），
   建议后续加 schema 漂移巡检（`validate.sh` 已支持 `DATABASE_URL` 漂移检查，需在 CI 打开）。
