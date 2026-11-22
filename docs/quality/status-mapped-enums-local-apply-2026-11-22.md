# B155 · 已映射状态枚举候选实际落库（2026-11-22）

## 缺口来源
B154 后用 `status-db-check-catalog.json` 与 `status-db-check-mappings.json` 交叉核对，发现 **27 个已登记映射的状态列仍没有库端 CHECK**：Rust 枚举和读写绑定已存在，但候选 DDL 从未在本地执行。另有 2 条 mapping 的 `table/column` 写成组合字符串，造成假缺口。

## 执行
实际执行 24 份候选 DDL，全部成功，26 个净新增 CHECK，全部 `NOT VALID`：

- Tenant：`public.core_tenants.status` active/suspended/trial/deleted
- ERP：`purchase_orders.status` pending/approved/cancelled；`receivables.status` pending/paid
- AI：`ai.documents.status` pending/processed/empty；`core.knowledge_documents.status` processing/ready/failed
- MES：`work_orders`、`production_orders`（含历史 planned）、`production_schedules`、`work_stations`、`material_issues`
- 同步：`wms.sync_records`（success/completed 并存）、`scm.sync_records`
- EHS：隐患、风险、事故、调查、处理方案/处理动作、事故行动、演练计划/记录、整改、风险控制
- SRM：`suppliers.status` 六值，替换同名旧三值约束
- WMS：`inbound_order_items.quality_status`、`inventory.quality_status`

`mes.work_stations.status` 默认值同步从 `available` 改为 `active`，与创建入口一致。

## 数据核验
执行前对 434 个无约束列逐列扫描数据量与值域：95 列有数据，所有有数据列的现有值均落在对应候选集合内；0 行列直接加约束。`wms.stock_takes` / `wms.stock_take_items` 两个 `adjustment_status` 约束此前已存在，本次只修正 mapping 的组合 table/column 写法。

## 刷新结果
- catalog：**314 条 CHECK / 5 ENUM / 408 个无约束列**（B154 为 288/5/434）
- 盘点：**209 Rust 枚举 / 192 值 / 60 不在 DB CHECK / 206 前端键**；Rust 色板缺口 0
- 队列：**45 枚举 / 60 值全部 `internal_state`**；`persisted_unmapped=0`、`api_projection=0`
- 前端键不在 DB CHECK：**73**
- 已映射状态列缺 CHECK：**0**

## 边界
所有候选只应用到本地 `topems`；生产快照 `topems_prod_verify_20261106` 只读，未应用。正式发布仍需逐条执行候选并按窗口 `VALIDATE`。
