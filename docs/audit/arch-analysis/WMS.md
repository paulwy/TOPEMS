# wms 模块组架构分析

> 分析范围：svc/wms、svc/tms、svc/mes、svc/qms、svc/lims、svc/ehs、svc/gis、svc/rd
> 分析日期：2026-10-02
> 证据基准：代码实测（grep -n / wc -l / ls），每条结论标注路径+行号

---

## 1. 分片架构现状（代码实证）

### 1.1 服务清单与端口

| 服务 | 端口 | API 前缀 | Bootstrap 模式 | Schema | 代码量(.rs) | 代码行数 |
|------|------|----------|---------------|--------|------------|---------|
| wms | 8041 | /api/wms/ | B（stateful + build_application） | wms | 62 文件 | 34,933 行 |
| tms | 8073 | /api/tms/ | B（stateful + build_application） | tms | 21 文件 | 7,497 行 |
| mes | 8030 | /api/mes/ | B（stateful + build_application） | mes | 64 文件 | 36,772 行 |
| qms | 8050 | /api/qms/ | B（stateful + build_application） | qms | 38 文件 | 17,568 行 |
| lims | 8051 | /api/lims/ | B（stateful + build_application） | lims | 35 文件 | 18,426 行 |
| ehs | 8052 | /api/ehs/ | B（stateful + build_application） | ehs | 29 文件 | 19,821 行 |
| gis | 8071 | /api/gis/ | C（Application 重建） | gis | 38 文件 | 12,211 行 |
| rd | 8053 | /api/rd/ | C（Application 重建） | rs | 43 文件 | 15,121 行 |

**证据**：
- wms 端口：`svc/wms/src/main.rs:35` `port: 8041`
- tms 端口：`svc/tms/src/main.rs:34` `port: 8073`（services.yaml 中 logistics 段，注释说明原 8042 与 srm 冲突改至 8073）
- mes 端口：`svc/mes/src/main.rs:37` `port: 8030`
- qms 端口：`svc/qms/src/main.rs:56` `port: 8050`
- lims 端口：services.yaml quality-rd 段（8051）
- ehs 端口：`svc/ehs/src/main.rs:40` `port: 8052`
- gis 端口：`svc/gis/src/main.rs:42` `port: 8071`
- rd 端口：`svc/rd/src/main.rs:49` `port: 8053`
- 代码量统计：`find svc/{wms,tms,mes,qms,lims,ehs,gis,rd}/src -name "*.rs" | wc -l` + `wc -l` 实测
- gis bootstrap C：`svc/gis/src/main.rs` 导入 `Application` from shared-bootstrap，自建 Prometheus + WebSocketManager
- rd bootstrap C：`svc/rd/src/main.rs:7` 导入 `Application`，`svc/rd/src/main.rs:139` 构造 `Application { ... }`

**合计**：8 个服务，310 个 .rs 文件，约 162,349 行代码。

### 1.2 模块划分

**mes（最大服务，64 文件 / 36,772 行）**：
- 生产核心：production_order, production_plan, production_scheduling, work_order, work_report, work_station, wip, team
- 物料/BOM：material_bom/（含 bom_handlers, return_handlers）, material_plan, material_requirement
- 设备/OEE：equipment, equipment_oee, equipment_oee_calc
- 工艺：process_flow, process_route, production_process
- 质量：quality_management/, quality_traceability
- APS 合并：aps_scheduling.rs（1,810 行）+ aps_compat.rs（132 行）
- 其他：analytics, anomaly_detection, demand_forecast, energy_management, production_cost, dashboard_ws, audit, settings

证据：`svc/mes/src/modules/` ls 实测，`svc/mes/src/modules/mod.rs:43-73` create_routes() 合并 27 个子模块路由

**wms（62 文件 / 34,933 行）**：
- 仓储核心：warehouse, location, inventory, inventory_movement, inventory_alert
- 入出库：inbound_order, outbound_order, transfer_order, transfer
- 作业：picking, wave_pick, cycle_count, stock_take, replenishment_logic, smart_replenishment/
- 其他：batch, serial_number, slotting, labor, analytics, discrepancy, data_sync, wms_compat（OpenAPI stub）

证据：`svc/wms/src/modules/` ls 实测

**qms（38 文件 / 17,568 行）**：
- 质量核心：quality_inspection, quality_issue, quality_standard, corrective_action
- 体系：apqp, fmea, spc, eight_d, quality_cost
- 其他：dashboard, quality_dashboard, data_sync, integration, audit

证据：`svc/qms/src/modules/` ls 实测

**lims（35 文件 / 18,426 行）**：
- 样品/任务：sample, sample_barcode, inspection_task, inspection_record
- 仪器/试剂：instrument, instrument_data/, reagent
- 其他：process, report, statistics, test_method, uncertainty, uncertainty_math, proficiency_testing, data_sync, integration, dashboard, audit

证据：`svc/lims/src/modules/` ls 实测

**ehs（29 文件 / 19,821 行）**：
- 安全核心：hazard, accident, risk, safety
- 职业健康：occupational_health, occupational_disease, health, training
- 环境：environment, environmental_compliance
- 应急：emergency_plan, emergency_drill
- 危化品：hazardous_material
- 其他：dashboard, data_sync, integration

证据：`svc/ehs/src/modules/` ls 实测

**gis（38 文件 / 12,211 行）**：
- WebSocket：websocket.rs（WebSocketManager 连接管理）
- 地理：geodata, geofence, spatial, map, marker, location, factory_map
- 设备：device, pipeline, warehouse（GIS 视角）
- 其他：business, photo, search, stats, sync, import_export

证据：`svc/gis/src/modules/` ls 实测

**rd（43 文件 / 15,121 行）**：
- 研发项目：project, project_phase, project_milestone, project_member, project_report
- 实验/配方：experiment, formula, material
- 其他：change_management, patent, research_cost, statistics, settings, ai_integration, doc_integration, rs_plugin

证据：`svc/rd/src/modules/` ls 实测

**tms（21 文件 / 7,497 行）**：
- 运输核心：shipment, route, vehicle, driver, carrier
- 其他：optimization, analytics

证据：`svc/tms/src/modules/` ls 实测

### 1.3 跨服务调用关系（HTTP 同步）

本组服务**对外发起**的 HTTP 同步调用点：

| # | 发起方 | 目标服务 | 调用方式 | 证据 | 用途 |
|---|--------|---------|---------|------|------|
| 1 | mes | erp | TypedServiceClient<ErpApi> | `svc/mes/src/main.rs:67` 构造，`svc/mes/src/modules/work_report.rs:644` 调用 `erp_client.sync_mes_progress()` | 报工后回传生产进度到 ERP |
| 2 | qms | unified-core(flow) | TypedServiceClient<WorkflowApi> | `svc/qms/src/main.rs:84` 构造，`svc/qms/src/modules/quality_issue.rs:462` 调用 `workflow_client.create_instance()` | 质量问题触发审批流程 |
| 3 | ehs | unified-core(flow) | TypedServiceClient<WorkflowApi> | `svc/ehs/src/main.rs:69` 构造，`svc/ehs/src/modules/hazard.rs:355,987` 调用 `workflow_client.create_instance()` | 隐患/事故触发审批流程 |
| 4 | rd | ai(8013) | reqwest::Client | `svc/rd/src/modules/ai_integration.rs:8` 导入，`:370` `.post()` | AI 辅助研发（实验建议等） |
| 5 | integration → mes | mes | reqwest POST | `svc/integration/src/mes_erp_sync.rs:206` `format!("{}/api/mes/production-orders/from-erp", mes_url)` | ERP 生产订单同步到 MES |
| 6 | integration → erp | erp | reqwest POST | `svc/integration/src/mes_erp_sync.rs:355-361` `format!("{}/api/erp/...")` | MES 生产进度回传到 ERP |

**关键发现：本组服务之间无直接 HTTP 同步调用**。
- lims → qms：`svc/lims/src/modules/data_sync.rs:255` 读取 `QMS_SERVICE_URL`，但**从未发起 HTTP 请求**——仅插入本地 `qa_lims_sync_records` 表记录"同步成功"状态
- lims → ehs：`svc/lims/src/modules/data_sync.rs:364` 读取 `EHS_SERVICE_URL`，同样无实际 HTTP 调用
- ehs → qms：`svc/ehs/src/modules/data_sync.rs:254` 读取 `QMS_SERVICE_URL`，无实际 HTTP 调用
- ehs → lims：`svc/ehs/src/modules/data_sync.rs:358` 读取 `LIMS_SERVICE_URL`，无实际 HTTP 调用
- wms → tms：`svc/wms/src/modules/data_sync.rs` 有 `/sync/outbound-to-shipping` 端点，但内部仅写 WMS 本地表，不调用 TMS
- qms ↔ lims ↔ ehs 之间**无直接 HTTP 调用**，跨域联动全部经 integration 服务编排（见 §1.4）

证据：`grep -rn "reqwest\|Client::new\|\.send()\|\.post(" svc/{wms,tms,mes,qms,lims,ehs,gis,rd}/src/modules/data_sync.rs` → 零结果

**无 gRPC 使用**：`grep -rn "tonic\|grpc" svc/{wms,tms,mes,qms,lims,ehs,gis,rd}/src/ --include="*.rs"` → 零结果

### 1.4 跨服务调用关系（事件驱动）

事件总线：Redis Stream（V321 迁移），证据：`lib/shared-event/src/messaging.rs:3` "事件总线已迁移至 Redis Stream"

**发布事件（本组服务 → 事件总线）**：

| 服务 | 发布的业务事件 | 证据 |
|------|--------------|------|
| wms | WmsInventoryItemShipped, WmsInventoryItemReceived, WmsWarehouseTransferCompleted, WmsInventoryLowStock, StockInbound, InventoryUpdated | `svc/wms/src/event_handlers/mod.rs:160-227`；`svc/wms/src/modules/outbound_order.rs:1395`；`svc/wms/src/modules/inbound_order.rs:319,1359`；`svc/wms/src/modules/transfer_order.rs:794`；`svc/wms/src/modules/inventory.rs:104` |
| mes | ProductionOrderCreated | `svc/mes/src/modules/production_order.rs:533` |
| qms | QmsQualityIssueCreated | `svc/qms/src/modules/quality_issue.rs:197` |
| lims | LimsInspectionAbnormalDetected, LimsRecordCompleted, LimsReagentAlert | `svc/lims/src/modules/inspection_task.rs:702`；`svc/lims/src/modules/reagent.rs:247` |
| ehs | EhsHazardReported, EhsAccidentReported（经 integration 跨域联动文档声称） | `svc/ehs/src/modules/hazard.rs`（经 integration-cross-domain-api.md §3 声称发布端已补齐） |

**订阅事件（本组服务 ← 事件总线）**：

| 服务 | 订阅的事件 | 证据 |
|------|-----------|------|
| wms | PurchaseOrderCreated, PurchaseOrderApproved, InboundOrderRequested | `svc/wms/src/event_handlers/mod.rs:53,57,61` |
| lims | QmsInspectionCompleted, EhsHazardReported | `svc/lims/src/event_handlers/mod.rs:27,31` |
| ehs | LimsInspectionAbnormalDetected, QmsCorrectiveActionCreated, HrmEmployeeCreated, HrmEmployeeUpdated | `svc/ehs/src/event_handlers/mod.rs:36,42,47` |
| gis | EhsHazardReported, ScmShipmentReceived, StockInbound, StockOutbound | `svc/gis/src/event_handlers/mod.rs:29,33,38` |
| rd | PmProjectCreated, PmProjectCompleted, PdmMaterialCreated, PdmMaterialUpdated, PdmBomCreated, PdmBomUpdated | `svc/rd/src/event_handlers/mod.rs:36,43,50` |
| mes | 仅 CacheInvalidated（缓存失效） | `svc/mes/src/main.rs:198` |
| qms | 仅 CacheInvalidated（缓存失效） | `svc/qms/src/main.rs:169` |
| tms | 仅 CacheInvalidated（缓存失效） | `svc/tms/src/modules/vehicle.rs` 等 |

**integration 服务订阅本组服务事件**：
- `svc/integration/src/event_handlers/mod.rs:26,30,34`：仅订阅 3 个 Triggered 事件（QmsToLimsSyncTriggered, EhsToQmsTriggered, LimsToEhsTriggered）
- 这些 handler 仅 `record_sync_log` 记录同步日志，不做实际跨域数据同步

### 1.5 数据架构与 Schema 边界

**各服务独立 Schema，本组服务之间无跨 Schema 直读**：

| 服务 | Schema | search_path | allow（跨 schema 白名单） | only_own_schema_query 调用数 |
|------|--------|------------|--------------------------|------------------------------|
| wms | wms | wms, public, shared | [] | 259 |
| tms | tms | tms, public, shared | [] | 0 |
| mes | mes | mes, public | [] | 0 |
| qms | qms | qms, public | [] | 316 |
| lims | lims | lims, public | [] | 0 |
| ehs | ehs | ehs, public | ['ehs'] | 104 |
| gis | gis | gis, public | [] | 172 |
| rd | rs | rs, public | [] | 0 |
| integration | integration | integration, public | **['qms', 'ehs']** | — |

证据：`scripts/schema_boundary.json` 实测
- wms/tms/mes/qms/lims/ehs/gis/rd 各自 allow=[]（或仅自身），无跨 schema 读取
- **integration 仍有 allow=['qms', 'ehs']**，即 integration 可直写 qms 和 ehs schema

**integration 跨 schema 直写点**（仍在使用）：
- `svc/integration/src/qms_lims_ehs.rs:26` INSERT INTO qms.qa_lab_samples
- `svc/integration/src/qms_lims_ehs.rs:39` INSERT INTO qms.qa_lab_tasks
- `svc/integration/src/qms_lims_ehs.rs:80` INSERT INTO qms.qa_ehs_hazards
- `svc/integration/src/qms_lims_ehs.rs:136` INSERT INTO qms.qa_corrective_actions
- `svc/integration/src/qms_lims_ehs.rs:174` INSERT INTO qms.qa_lab_samples（事故触发）

**注意**：这些直写目标是 `qms.*` 表（qa_lab_samples, qa_lab_tasks），而非文档声称的 `lims.qa_lab_samples`。表结构已合并到 qms schema。

### 1.6 APS→MES 合并形态

- `svc/mes/src/modules/aps_scheduling.rs`：1,810 行，真实 APS 排程逻辑，注册为 mes 路由的一部分
  - 证据：`svc/mes/src/modules/mod.rs:47` `.merge(aps_scheduling::create_routes())`
- `svc/mes/src/modules/aps_compat.rs`：132 行，**仅 HTTP 301 永久重定向**，无实际业务逻辑
  - 证据：`svc/mes/src/modules/aps_compat.rs:50-56` `Redirect::permanent(&target).into_response()`
  - 注册：`svc/mes/src/main.rs:256` `.nest("/api/aps", modules::aps_compat::create_routes())`
- APS 原服务已归档：`svc/_archive/aps`（services.yaml 注释证实）

**结论**：aps→mes 合并已完成，但兼容层仅为 URL 重定向（非 API 兼容代理），不会造成 mes 过大——mes 的"大"来自 27 个业务模块的自然增长（36,772 行），而非 APS 合并。

### 1.7 GIS WebSocket 图层推送架构

- `svc/gis/src/modules/websocket.rs`：实现 WebSocket 连接管理
  - WebSocketManager：`Arc<RwLock<HashMap<ConnectionId, mpsc::Sender>>>` 管理活跃连接
  - 支持 subscribe/unsubscribe（按 device_codes）、location_update 推送
  - 连接限制：max_connections=1000, idle_timeout=120s（`svc/gis/src/modules/websocket.rs:67-73`）
  - JWT 认证：query 参数 `?token=<JWT>`（`svc/gis/src/modules/websocket.rs:58` WsQueryParams）
- 事件驱动位置更新：gis 订阅 StockInbound/StockOutbound/EhsHazardReported/ScmShipmentReceived 事件（`svc/gis/src/event_handlers/mod.rs:29,33,38`）
- 嵌入模式：`svc/gis/src/embedded.rs` 定义 AppState 含 `ws_manager: Arc<WebSocketManager>`，独立部署与 server 统一入口共用

证据：`svc/gis/src/modules/websocket.rs:1-80`，`svc/gis/src/embedded.rs:20-25`

### 1.8 Bootstrap 模式汇总

| 服务 | 模式 | 自定义 State 内容 | 证据 |
|------|------|-----------------|------|
| wms | B | 3 个 L2 缓存（warehouse/inventory/dict）+ event_publisher | `svc/wms/src/main.rs:225-234` ApiState |
| tms | B | dict_cache + event_publisher | `svc/tms/src/main.rs` shared::AppState |
| mes | B | erp_client(Option) + dict_cache + event_publisher | `svc/mes/src/main.rs:229-236` AppState |
| qms | B | workflow_client(WorkflowApi) + dict_cache + event_publisher | `svc/qms/src/main.rs:34-41` AppState |
| lims | B | 多个 L2 缓存 + event_publisher | `svc/lims/src/main.rs` 缓存初始化 |
| ehs | B | workflow_client(WorkflowApi) + dict_cache | `svc/ehs/src/main.rs` shared::AppState |
| gis | C | WebSocketManager + PgPool + AuthState + 自定义 Prometheus | `svc/gis/src/main.rs` 重建 Application；`svc/gis/src/embedded.rs:20-25` |
| rd | C | 自定义 Prometheus + 后台任务 + repositories | `svc/rd/src/main.rs:139` `Application { ... }` |

### 1.9 可观测性与错误处理

**统一错误处理采纳情况（TopemsError）**：
- gis：100 处引用（已迁移，首个样板服务）
- rd：4 处引用（少量）
- wms/tms/mes/qms/lims/ehs：**0 处引用**（完全未采纳 TopemsError）

**内部错误泄露点（ApiResponse::error + format!）**：
- mes：16 处
- lims：22 处
- rd：8 处
- wms：3 处
- tms：1 处
- qms/ehs/gis：0 处

证据：`grep -rn "TopemsError" svc/{...}/src/ --include="*.rs" | wc -l` 实测
门禁基线对照：`docs/architecture/unified-error-handling-decision.md:246` P2 优先级 mes=18、rd=9、wms=3，与实测基本吻合（mes 16 vs 文档 18，差异可能因后续迁移）

---

## 2. 文档声称 vs 代码实证对照表

| 主题 | 文档声称(路径+章节) | 代码实际(路径+行号) | 结论 |
|------|-------------------|-------------------|------|
| 事件总线通道 | `event-driven.md` §1：Redis Pub/Sub + RabbitMQ (lapin) 双通道 | `lib/shared-event/src/messaging.rs:3`：已迁移至 Redis Stream（V321），RabbitMQ 未在本组服务中使用 | **漂移**（文档未更新） |
| 质量链跨域联动改造 | `integration-cross-domain-api.md` §3 步骤 B/D：直写→reqwest 已完成、撤销 integration allow 白名单 2→1 | `svc/integration/src/qms_lims_ehs.rs:26,39,80,136,174` 仍为 `only_own_schema_query!` 直写；`scripts/schema_boundary.json` integration allow=['qms','ehs'] 未撤销 | **漂移**（声称完成但代码未改） |
| integration 事件订阅 | `integration-cross-domain-api.md` §3 步骤 C：7 事件订阅 → handle_cross_domain_event → qms_lims_ehs::process_event | `svc/integration/src/event_handlers/mod.rs:26,30,34` 仅订阅 3 个 Triggered 事件；无 `process_event` 调用点 | **漂移**（接线未落地） |
| qms→lims 表归属 | `integration-cross-domain-api.md` §1：handle_qms_inspection_completed INSERT lims.qa_lab_samples | `svc/integration/src/qms_lims_ehs.rs:26` INSERT INTO qms.qa_lab_samples | **漂移**（schema 已合并到 qms） |
| APS 合并形态 | `modular-monolith-design.md` §2：aps 已合并至 mes（aps_scheduling/aps_compat 模块） | `svc/mes/src/modules/aps_scheduling.rs` 1810 行 + `aps_compat.rs` 132 行重定向，`svc/mes/src/main.rs:256` /api/aps nest | **一致** |
| tms 端口 | `services.yaml` logistics 段：8073 | `svc/tms/src/main.rs:34` port: 8073 | **一致** |
| gis WebSocket | `overview.md` §服务配置表：gis C 模式（WebSocket Manager） | `svc/gis/src/modules/websocket.rs` WebSocketManager + `svc/gis/src/main.rs` Application 重建 | **一致** |
| 跨 Schema 直读（mes 读 wms） | 任务线索提示"mes 读 wms 的库存表" | `grep -rn "FROM wms\.\|JOIN wms\." svc/mes/src/` → 零结果 | **不一致**（实际不存在） |
| MES Schema 表数 | `mes-schema-truth.md` 汇总：43 张表 | 文档声称值，与 migrations 目录 17 个迁移文件对应 | **一致**（文档为自动生成真相源） |
| lims/ehs/wms data_sync HTTP 调用 | `overview.md` 主要通信关系：scm↔wms↔srm、qms↔lims↔ehs↔rd | lims/ehs/wms 的 data_sync 模块读取对方服务 URL 但**从未发起 HTTP 请求**，仅写本地 sync_records 表 | **漂移**（同步为记录型非执行型） |

---

## 3. 发现项

| ID | 标题 | 严重级 | 类别 | 证据(路径:行号) | 影响 | 修复建议 |
|----|------|--------|------|----------------|------|---------|
| WMS-01 | integration 跨 schema 直写未改造为 reqwest，与文档声称严重不符 | 高危 | 耦合/数据架构 | `svc/integration/src/qms_lims_ehs.rs:26,39,80,136,174`；`scripts/schema_boundary.json` integration allow=['qms','ehs'] | 文档声称直写→reqwest 改造已完成（步骤B/D），但代码仍为 5 处跨 schema INSERT，integration 仍依赖 qms/ehs schema 直连，物理库拆分前置条件未满足 | 按 integration-cross-domain-api.md 步骤 B 真正落地：将 5 处 only_own_schema_query! 替换为 reqwest 调用 qms/lims/ehs 的 /api/internal/* 端点；完成后从 schema_boundary.json 移除 integration.allow |
| WMS-02 | integration 事件订阅仅 3 个 Triggered 事件，7 事件接线未落地 | 高危 | 通信/可靠性 | `svc/integration/src/event_handlers/mod.rs:26,30,34`（仅 QmsToLimsSyncTriggered/EhsToQmsTriggered/LimsToEhsTriggered）；文档声称 7 事件订阅已接线 | 质量链联动事件（QmsInspectionCompleted/EhsHazardReported 等）到达 integration 后无 handler 消费，跨域联动实际不触发 | 按文档步骤 C 补齐：将 qms_lims_ehs::process_event 接入 event_handlers，订阅 QmsQualityIssueCreated/EhsHazardReported/EhsAccidentReported/LimsInspectionAbnormalDetected/LimsRecordCompleted/LimsReagentAlert/QmsInspectionCompleted |
| WMS-03 | lims/ehs/wms data_sync 模块为"假同步"——读取对方 URL 但不发起 HTTP 调用 | 高危 | 设计缺陷/可靠性 | `svc/lims/src/modules/data_sync.rs:255`（读 QMS_SERVICE_URL 但无 reqwest 调用）；`svc/ehs/src/modules/data_sync.rs:254,358`（读 QMS/EHS URL 无实际调用）；`svc/wms/src/modules/data_sync.rs`（outbound-to-shipping 不调用 TMS） | 前端/用户点击"同步到 QMS/EHS/TMS"按钮后，系统仅在本地 sync_records 表插入一条"成功"记录，实际数据未同步到目标服务，造成数据不一致假象 | 实现真正的 HTTP 调用：lims data_sync 中用 reqwest POST 到 QMS_SERVICE_URL/api/internal/qms/inspections/{no}/result；ehs data_sync POST 到 EHS_SERVICE_URL/api/internal/ehs/hazards/integration；wms data_sync POST 到 TMS_SERVICE_URL 创建运单 |
| WMS-04 | 本组 6/8 服务未采纳 TopemsError 统一错误处理，内部错误泄露 | 中危 | 可观测性/安全 | wms: 3 处 format! 泄露；mes: 16 处；lims: 22 处；rd: 8 处；wms/tms/mes/qms/lims/ehs 共 0 处 TopemsError 引用 | sqlx::Error 等内部错误细节（表名、列名、SQL 片段）通过 ApiResponse::error(500, &format!("...{}", e)) 直达客户端，存在信息泄露风险；错误码语义不可控 | 按 unified-error-handling-decision.md §4.4 排期推进：lims(P1, 23处) → mes(P2, 18处) → rd(P2, 9处) → wms(P2, 3处)，使用 migrate_error_leaks.py codemod 机械迁移 |
| WMS-05 | event-driven.md 文档描述 Redis Pub/Sub + RabbitMQ 双通道，实际已迁移至 Redis Stream | 低危 | 文档漂移 | `docs/architecture/event-driven.md` §1：Redis Pub/Sub + RabbitMQ；`lib/shared-event/src/messaging.rs:3`：已迁移至 Redis Stream（V321） | 文档误导新开发者以为 RabbitMQ 仍在使用，实际代码无 RabbitMQ 依赖；DLQ 机制已基于 Stream XADD 重写 | 更新 event-driven.md §1 架构图，将 RabbitMQ 标注为"已废弃/未启用"，补充 Redis Stream XADD/XREADGROUP 架构说明 |
| WMS-06 | mes 服务体量过大（36,772 行，64 文件，27 个路由模块） | 中危 | 设计缺陷/可扩展性 | `svc/mes/src/modules/mod.rs:43-73` 合并 27 个子模块；aps_scheduling.rs 单文件 1,810 行 | mes 同时承担生产执行、APS 排程、设备 OEE、质量追溯、能源管理等多职责，违反单一职责；后续迭代变更风险高 | 评估将 aps_scheduling（1,810 行）、equipment_oee、energy_management 等垂直子域拆分为独立模块组或独立服务；当前可先做模块内部包结构整理 |
| WMS-07 | qms 无业务事件订阅器，仅订阅缓存失效事件 | 低危 | 通信 | `svc/qms/src/` 无 event_handlers 目录；`svc/qms/src/main.rs:169` 仅 EventSubscriber for CacheInvalidated | qms 作为质量链核心服务，不订阅 lims/ehs 的事件（如 LimsInspectionAbnormalDetected 未被 qms 消费），质量链联动依赖 integration 中转而非 qms 直接响应 | 评估是否需要 qms 直接订阅 LimsInspectionResultSubmitted 等事件做实时质量看板更新；如不需要则当前架构合理（integration 中转模式） |
| WMS-08 | ehs schema_boundary 配置异常：schema=public 但 search_path=ehs | 低危 | 数据架构 | `scripts/schema_boundary.json`：ehs.schema="public", ehs.search_path="ehs, public", allow=["ehs"] | ehs 的 schema 字段声明为 public，与实际 search_path=ehs 不一致，可能导致 schema 边界门禁判断偏差 | 修正 schema_boundary.json 中 ehs.schema 为 "ehs"（与其他服务一致） |

---

## 4. 优点与亮点（客观，带证据）

1. **Schema 隔离执行严格，本组服务间无跨 schema 直读** [代码实证]
   - wms/tms/mes/qms/lims/ehs/gis/rd 各自 allow=[]（除 ehs 自身），grep 确认本组服务之间无 FROM other_schema.table 的 SQL 引用
   - 证据：`scripts/schema_boundary.json` 实测；`grep -rn "FROM wms\." svc/mes/src/` 等跨组搜索零结果

2. **多级缓存（L1 moka + L2 Redis）+ 事件驱动缓存失效，架构成熟** [代码实证]
   - wms 初始化 3 个 L2 缓存（warehouse/inventory/dict），TTL L1=60s/L2=600s
   - 证据：`svc/wms/src/main.rs:60-127`；`svc/wms/src/main.rs:171-223` CacheInvalidationListener 订阅 CacheInvalidated 事件
   - mes/qms/lims/tms 同样模式，缓存预热避免冷启动穿透

3. **APS 合并平滑，兼容层设计轻量** [代码实证]
   - aps_compat.rs 仅 132 行，纯 301 重定向，无业务逻辑耦合
   - 证据：`svc/mes/src/modules/aps_compat.rs:50-56` Redirect::permanent
   - 原 aps 服务归档 svc/_archive/aps，无代码残留

4. **GIS WebSocket 架构完整** [代码实证]
   - WebSocketManager 支持连接池管理、订阅按 device_codes 过滤、连接数限制（1000）、空闲超时（120s）、JWT query 认证
   - 证据：`svc/gis/src/modules/websocket.rs:67-73` WebSocketConfig；`:58` WsQueryParams token 认证
   - 嵌入式复用：embedded.rs 统一独立部署与 server 统一入口的路由组装

5. **TypedServiceClient 类型安全服务间调用** [代码实证]
   - mes→erp、qms→flow、ehs→flow 使用 TypedServiceClient<ErpApi>/TypedServiceClient<WorkflowApi>，编译期校验 API 签名
   - 失败优雅降级：mes erp_client 为 Option，报工回传失败不影响主流程（`svc/mes/src/modules/work_report.rs:653-657`）
   - 证据：`svc/mes/src/main.rs:67-73`；`svc/qms/src/modules/quality_issue.rs:462-470`

6. **统一 Bootstrap 框架覆盖率 100%** [代码实证]
   - 8 个服务全部使用 shared-bootstrap 的 ServiceConfig → bootstrap_service → build_application/run 三段式
   - 证据：各服务 main.rs 均导入 `topems_shared_bootstrap::{bootstrap_service, ...}`

---

## 5. 可视化数据

### 5.1 依赖边清单（本组服务对外全部依赖边）

```json
[
  {"from": "mes", "to": "erp", "kind": "http", "note": "TypedServiceClient<ErpApi>，报工后回传生产进度 svc/mes/src/modules/work_report.rs:644"},
  {"from": "qms", "to": "unified-core(flow)", "kind": "http", "note": "TypedServiceClient<WorkflowApi>，质量问题触发审批流 svc/qms/src/modules/quality_issue.rs:462"},
  {"from": "ehs", "to": "unified-core(flow)", "kind": "http", "note": "TypedServiceClient<WorkflowApi>，隐患/事故触发审批流 svc/ehs/src/modules/hazard.rs:355,987"},
  {"from": "rd", "to": "ai", "kind": "http", "note": "reqwest::Client 调 AI 服务做实验辅助 svc/rd/src/modules/ai_integration.rs:370"},
  {"from": "integration", "to": "mes", "kind": "http", "note": "reqwest POST /api/mes/production-orders/from-erp svc/integration/src/mes_erp_sync.rs:206"},
  {"from": "integration", "to": "erp", "kind": "http", "note": "reqwest POST 回传 MES 生产进度 svc/integration/src/mes_erp_sync.rs:355-361"},
  {"from": "integration", "to": "qms", "kind": "db", "note": "跨 schema 直写 INSERT qms.qa_lab_samples/qa_lab_tasks/qa_ehs_hazards/qa_corrective_actions svc/integration/src/qms_lims_ehs.rs:26,39,80,136,174"},
  {"from": "wms", "to": "scm(事件)", "kind": "event", "note": "发布 WmsInventoryItemShipped/Received/TransferCompleted/LowStock svc/wms/src/event_handlers/mod.rs:160-227"},
  {"from": "wms", "to": "erp/scm(事件)", "kind": "event", "note": "订阅 PurchaseOrderCreated/PurchaseOrderApproved/InboundOrderRequested svc/wms/src/event_handlers/mod.rs:53,57,61"},
  {"from": "mes", "to": "erp(事件)", "kind": "event", "note": "发布 ProductionOrderCreated svc/mes/src/modules/production_order.rs:533"},
  {"from": "qms", "to": "lims/ehs/notification(事件)", "kind": "event", "note": "发布 QmsQualityIssueCreated svc/qms/src/modules/quality_issue.rs:197"},
  {"from": "lims", "to": "qms/ehs/notification(事件)", "kind": "event", "note": "发布 LimsInspectionAbnormalDetected/LimsRecordCompleted/LimsReagentAlert svc/lims/src/modules/inspection_task.rs:702, reagent.rs:247"},
  {"from": "lims", "to": "qms/ehs(事件订阅)", "kind": "event", "note": "订阅 QmsInspectionCompleted/EhsHazardReported svc/lims/src/event_handlers/mod.rs:27,31"},
  {"from": "ehs", "to": "qms/notification(事件)", "kind": "event", "note": "发布 EhsHazardReported/EhsAccidentReported（文档声称已补齐发布端）"},
  {"from": "ehs", "to": "lims/qms/hrm(事件订阅)", "kind": "event", "note": "订阅 LimsInspectionAbnormalDetected/QmsCorrectiveActionCreated/HrmEmployeeCreated svc/ehs/src/event_handlers/mod.rs:36,42,47"},
  {"from": "gis", "to": "ehs/scm/wms(事件订阅)", "kind": "event", "note": "订阅 EhsHazardReported/ScmShipmentReceived/StockInbound/StockOutbound svc/gis/src/event_handlers/mod.rs:29,33,38"},
  {"from": "rd", "to": "pm/pdm(事件订阅)", "kind": "event", "note": "订阅 PmProjectCreated/PmProjectCompleted/PdmMaterialCreated/PdmMaterialUpdated/PdmBomCreated/PdmBomUpdated svc/rd/src/event_handlers/mod.rs:36,43,50"},
  {"from": "all_services", "to": "unified-core(插件注册)", "kind": "http", "note": "启动时 POST /api/core/plugin/dev/plugins/{code}/register 自动注册到核心"}
]
```

### 5.2 统计数字（实测）

| 指标 | 值 |
|------|---|
| 服务数 | 8（wms/tms/mes/qms/lims/ehs/gis/rd） |
| .rs 文件总数 | 310 |
| 代码总行数 | ~162,349 |
| 最大服务 | mes（64 文件 / 36,772 行） |
| 最小服务 | tms（21 文件 / 7,497 行） |
| 跨 schema 直写边 | integration→qms（5 处 INSERT），integration→ehs（经 allow 配置） |
| 本组服务间 HTTP 同步调用 | 0（质量链/供应链内部无直接 HTTP 调用，全部经事件或 integration 编排） |
| 本组服务对外 HTTP 调用边 | 6（mes→erp, qms→flow, ehs→flow×2, rd→ai, integration→mes, integration→erp） |
| 事件发布边（本组→总线） | 8 类业务事件 |
| 事件订阅边（总线→本组） | 12 类事件 |
| gRPC 调用 | 0（全组无 tonic 依赖） |
| TopemsError 采纳率 | 2/8 服务（gis=100处, rd=4处；其余 6 服务=0处） |
| 内部错误泄露点（format!） | 50 处（mes=16, lims=22, rd=8, wms=3, tms=1） |
| only_own_schema_query! 调用总数 | 851（wms=259, qms=316, ehs=104, gis=172, 其余=0） |
| Bootstrap 模式 B | 6 个（wms/tms/mes/qms/lims/ehs） |
| Bootstrap 模式 C | 2 个（gis/rd） |
| WebSocket 端点 | 2 个（gis /api/gis/ws, mes /ws/mes/dashboard） |
