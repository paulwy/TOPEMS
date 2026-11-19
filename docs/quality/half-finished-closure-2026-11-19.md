# 11 条功能半成品收口登记（2026-11-19）

- 上游清单：[functional-closure-closure-2026-11-19.md](./functional-closure-closure-2026-11-19.md) 第 2 节
- 口径：每条只走「补齐到可用闭环」或「明确关闭」两个方向，不再挂账
- 本轮结论：**补齐 5 条、明确关闭 6 条**
- 边界：未应用任何迁移、未连生产写入、未 push；新迁移只入库

## 汇总

| 处置 | 条目 |
|---|---|
| 补齐（5） | `core.core_plugin_categories`、`scm.demand_forecast`、`scm.wms_replenishment_suggestion_snapshots`、`srm.bidding_suppliers`、`srm.contract_terms` |
| 关闭（6） | `ai.model_usage_stats`、`erp.consolidation_report_lines`、`gis.track_records`、`gis.track_positions`、`master_data.mdm_data_asset_categories`、`mes.production_costs` |

关闭不等于删表删接口：相关表与已挂路由保留，避免破坏前端与其它并行线；关闭项在本文件登记「未启用」及启用前置条件。

## 逐条处置

### 1. `ai.model_usage_stats` — 关闭

- 读位置：`svc/ai/src/handlers/model_admin_handlers.rs:669` `get_model_usage`
- 路由：`/models/usage`（`svc/ai/src/routes.rs:227,230`），可达
- 缺什么：token 计量写入
- 现状：全仓无任何 `INSERT/UPDATE ai.model_usage_stats`；AI 服务无模型调用代理/网关入口可挂计量
- 阻塞：补齐需新建模型调用计量子系统（网关、token 计数、按模型/租户落账）
- 处置：**关闭**。统计接口保留，返回空/0 属预期；登记为「计费网关未接入前不启用」

### 2. `core.core_plugin_categories` — 补齐

- 读位置：`svc/plugin-registry/src/modules/plugin/handlers/marketplace.rs:82` `get_marketplace_summary`、`:146` `list_categories`
- 现状：表结构 `id/name/code/description/icon/sort_order/plugin_count/is_active/created_at/deleted_at`，无种子、无写入方
- 补齐：新增迁移 `database/migrations/20261119170000_seed_core_plugin_categories.sql`，按 `PLUGIN_CATEGORIES` 灌 9 个分类（code 幂等）
- 验证：迁移未应用；通过 migration-validate 后由迁移窗口统一执行

### 13. `erp.consolidation_report_lines` — 关闭

- 读位置：`svc/erp/src/modules/consolidation/reports.rs:166` `get_report_lines`
- 现状：`generate_report` 固定返回 `not_implemented`（P0 止血），全仓无写 `erp.consolidation_reports`
- 阻塞：合并引擎（法人主体账簿归集 + 内部交易匹配）未实现
- 处置：**关闭**。行项目读接口保留，并补报表存在性校验（不存在返回 404），避免对任意 UUID 返回空数组

### 14 / 15. `gis.track_records` / `gis.track_positions` — 关闭

- 读位置：`svc/gis/src/modules/sync.rs:328`、`:355` `download_offline_data`
- 现状：位置上传实际写 `gis.device_location_records`（`sync.rs:157`）；轨迹表无任何 INSERT
- 阻塞：无轨迹聚合任务（按设备把位置点聚成 track）
- 处置：**关闭**。轨迹表与接口保留，离线下载返回空轨迹属预期；顺带修复该分支 SQL 缺 `SELECT`/`WHERE` 与占位符编号错误（带日期参数时会直接报错）

### 17. `master_data.mdm_data_asset_categories` — 关闭

- 读位置：`svc/master-data/src/modules/knowledge_v53.rs:1235` `list_categories`
- 现状：表 `id/name/parent_id/asset_count/tenant_id`，无种子、无创建/更新接口
- 阻塞：分类是租户维度数据，静态种子不成立；补写入需新增租户级分类管理功能与前端
- 处置：**关闭**。登记为「资产分类字典未启用」；不伪造租户数据

### 18. `mes.production_costs` — 关闭

- 读位置：`svc/mes/src/modules/analytics.rs:355` `get_energy_cost`（另有 `:400`、`:434` 同表聚合）
- 现状：全仓无 `INSERT/UPDATE mes.production_costs`；报工/工单链路不产出成本行
- 阻塞：无工时/能耗成本核算口径（成本科目、分摊规则、单价来源）
- 处置：**关闭**。登记为「成本归集未接入，能耗分析不启用」；前端 `MesEnergyCostPage` 当前为本地模拟数据，不依赖该接口

### 24. `scm.demand_forecast` — 补齐

- 读位置：`svc/scm/src/modules/mrp.rs:609` `compute_mrp`
- 现状：表 `id/tenant_id/material_code/quantity/forecast_date/created_at`，无导入/CRUD
- 补齐：新增 `POST /mrp/demand-forecasts/import` → `import_demand_forecasts`
  - 请求 `{ items: [{ material_code, quantity, forecast_date }] }`
  - 校验：非空、物料编码非空、数量 > 0、日期 `YYYY-MM-DD`
  - 同事务逐条 INSERT，`tenant_id` 取 `require_tenant_bind(&claims)`；失败整体回滚
- 前端：未接，前端接入单列后续任务

### 31. `scm.wms_replenishment_suggestion_snapshots` — 补齐

- 读位置：`svc/scm/src/modules/supply_chain_dashboard.rs:702` `real_time_status`
- 现状：表 `id/suggestion_number/warehouse_id/item_id/item_code/item_name/suggested_quantity/unit/status/tenant_id/synced_at/...`，无生成入口
- 补齐：新增 `POST /dashboard/replenishment-snapshots` → `generate_replenishment_snapshots`
  - 取 `scm.wms_inventory_snapshots` 中每 `(item_code, warehouse_id)` 最新快照
  - `available_quantity < min_quantity` 时生成 `status='draft'` 快照，`suggested_quantity = min - available`
  - 当天草稿整体重算（先删当日 draft 再插入），重复调用幂等
- 前端：未接，前端接入单列后续任务

### 32. `srm.bidding_suppliers` — 补齐

- 读位置：`svc/srm/src/modules/bidding.rs:653` `list_bidding_suppliers`
- 现状：`create_bidding` 只写招标头，不接收供应商列表
- 补齐：新增 `PUT /biddings/{id}/suppliers` → `set_bidding_suppliers`
  - 请求 `{ supplier_ids: [uuid] }`，去重
  - 同事务：校验招标存在 → 校验供应商有效 → 清空旧关联 → 批量 INSERT → 更新 `biddings.supplier_count` → 提交
  - 错误：400（ID 格式/供应商无效）、404（招标不存在）、500（DB 失败）
- 单测：`SetBiddingSuppliersRequest` 反序列化 / 空列表

### 33. `srm.contract_terms` — 补齐

- 读位置：`svc/srm/src/modules/supplier_contract.rs:548` `get_contract_terms`
- 现状：`CreateContractTermRequest` 模型已存在但无写入 handler
- 补齐：新增 `POST /supplier-contracts/{id}/terms` → `create_contract_terms`
  - 请求 `{ terms: [{ contract_id, term_type, title, content?, sort_order }] }`，`contract_id` 以路径参数为准
  - 同事务：校验合同存在 → 校验字段非空/长度 → 批量 INSERT → 提交
  - 错误：400（空列表/字段非法）、404（合同不存在）、500（DB 失败）
- 单测：`CreateContractTermsRequest` 反序列化 / 空列表

## 剩余与前置条件

| 条目 | 后续启用前置 |
|---|---|
| `ai.model_usage_stats` | 模型调用网关 + token 计量落库 |
| `erp.consolidation_report_lines` | 合并引擎（账簿归集 + 内部往来匹配） |
| `gis.track_records` / `gis.track_positions` | 轨迹聚合任务（位置点 → track） |
| `master_data.mdm_data_asset_categories` | 租户级分类管理与前端 |
| `mes.production_costs` | 成本科目/分摊规则/单价来源 |
| 新增 3 个写接口 | 前端页面接入（本轮仅后端闭环） |
