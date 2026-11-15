# 后续工单：`wms.purchase_order_snapshots` 列补齐 + 状态约束（K7）

- 状态：待排期（不在 2026-11-15 窗口 E 内）
- 关联缺陷：`topems-table-inventory-2026-11-14.md` §7 K7
- 关联迁移：`20261115000000_w7_b4_status_check_widen_forward.sql`（窗口 E 按 17 表口径已剔除本表）
- 建议 owner：platform-db + WMS 模块负责人
- 建议 ticket：`TOPEMS-W7-B4-WMS-PO-SNAPSHOT-BACKFILL`

## 1. 现状

| 项 | prod | dev |
|---|---|---|
| `wms.purchase_order_snapshots` 列数 | 3（`id`、`deleted_at`、`tenant_id`） | 14 |
| `status` 列 | 不存在 | `character varying(20)`，已有 `ck_purchase_order_snapshots_status_standard` |
| 表行数 | 0 | 0 |
| 真实业务表 | `plugin_wms.purchase_order_snapshots`（13 列，0 行） | 同 prod |

代码契约（prod 必然失败）：

- 写：`svc/wms/src/event_handlers/mod.rs:436-439` 的 `INSERT INTO wms.purchase_order_snapshots (...)` 引用 13 列；
- 读：`svc/wms/src/modules/data_sync.rs:384-390` 的 `SELECT id, order_number, status ... WHERE status = 'approved'`。

prod 目前任何一次采购订单快照写入都会报 `42703 column "order_number" ... does not exist`。

## 2. 目标

1. 把 `wms.purchase_order_snapshots` 补齐到与代码/ dev 一致的列结构；
2. 列补齐单独投递、单独验证后，再单独投递状态约束；
3. 两步都必须先停写，不与其它迁移混批。

## 3. 需补的 11 列（以 dev 为准）

| 列 | 类型 | 约束/默认 |
|---|---|---|
| `order_number` | `character varying(100)` | NOT NULL |
| `supplier_id` | `uuid` | NULL |
| `supplier_name` | `character varying(200)` | NULL |
| `total_amount` | `numeric` | NULL |
| `payable_amount` | `numeric` | NULL |
| `status` | `character varying(20)` | NOT NULL，默认值待确认（dev 与 `plugin_wms` 默认不同：`plugin_wms` 为 `'pending'`） |
| `approved_by` | `uuid` | NULL（dev 为 uuid；`plugin_wms` 为 varchar(200)，需按代码绑定类型确认） |
| `approved_at` | `timestamp with time zone` | NULL |
| `synced_at` | `timestamp with time zone` | NOT NULL，默认 `now()` |
| `created_at` | `timestamp with time zone` | NOT NULL，默认 `now()` |
| `updated_at` | `timestamp with time zone` | NOT NULL，默认 `now()` |

> 表当前 0 行，`ADD COLUMN ... NOT NULL DEFAULT` 无回填风险；但 `approved_by` 与 `status` 的类型/默认值必须在工单内先与代码绑定类型对齐，不能照抄 `plugin_wms`。

## 4. 执行顺序

1. 停写 WMS 采购订单事件（确认无连接写该表）；
2. 投递补列迁移（单版本、`--only`/正常通道，file 内带存在性守卫）；
3. 验证：13 列齐全、代码 INSERT/SELECT 在 dev/prod 各跑一次成功；
4. 再投递状态约束（值域至少覆盖 `active/inactive/archived/pending/approved`，与代码实际写入对齐）；
5. 恢复写入并观测。

## 5. 回滚

- 补列回滚 = `DROP COLUMN`（表为空时安全）；一旦有数据写入，回滚会丢数据，必须停写并确认后再执行。
- 状态约束回滚按旧值域重建，写入过新值时会因存量行校验失败中止，属预期。

## 6. 不做

- 不删除 `plugin_wms.purchase_order_snapshots`（历史表，先保留只读）；
- 不在本工单里改动 WMS 代码或表结构以外的内容；
- 不与 `20261115000000` 混批投递。
