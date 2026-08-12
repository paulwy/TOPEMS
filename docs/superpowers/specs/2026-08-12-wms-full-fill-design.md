# WMS 全量业务逻辑填充 — 设计规范 (V199)

> **对标**: MES V191-V197 + QMS V198（6 大任务垂直推进 · 五重验收全绿）
> **方案**: 方案 A（垂直 6 任务 · 四层契约对齐 · 双轨并行执行）
> **版本**: v1.0.0 | **日期**: 2026-08-12

---

## 1. 目标

将 WMS 模块从「业务逻辑骨架 + 内嵌 DTO + 手工状态字符串流转」升级为：

- **四层契约 100% 对齐**：Schema ← Model/DTO ← Route/Handler ← Frontend API Client
- **7 套 FSM 有限状态机**：含 ≥42 单测，状态颜色+可达性映射前端组件
- **6 BI 深度分析页** + **6 实体 Detail 页**
- **4 类审批工作流**：APV-1~4 共 12 个端点 + audit 日志 + 审批单测
- **五重验收全绿**：TSC 0 error · Rust 0/0 · 导航三联 2/2 · vitest ≥25 · cargo test ≥60

---

## 2. 当前状态诊断

### 2.1 后端 (svc/wms/)

| 项 | 状态 | 缺口 |
|---|---|---|
| DTO 模型 | 14 个 models/*.rs 已声明，内嵌 struct 无 ToSchema derive | 缺 ToSchema 标注；缺 order_item + discrepancy 模型；缺 pub use * re-export（部分已完成） |
| 状态流转 | 5 个模块有硬编码 status 字符串（inbound/outbound/stocktake/transfer/wavepick） | 无 FSM 封装，无审批标记，非法转换零阻断 |
| 审批端点 | 0 个 | 需新增 4 类 × 3 = 12 个 |
| audit 日志 | audit_log.rs 已有 | 需审批端点写入 |
| Cargo.toml 依赖 | 缺 utoipa ToSchema derive on structs；缺 thiserror（FsmError） | 按需补 |
| FSM 共享模块 | shared/mod.rs 只有 cache + permission | 需新增 pub mod fsm; |

### 2.2 前端 (apps/web/)

| 项 | 状态 | 缺口 |
|---|---|---|
| types/wms.ts | 空 stub（2 行 export {}） | 需完整 10+ 实体 DTO + 7 FSM 状态枚举 |
| api/wms/_mock.ts | 不存在 | 需 useWmsMock hook + 全量 mock |
| api/wms/index.ts | 206 行（部分模块完成） | 需追加 approval 导出 |
| api/wms/types.ts | 1063 行（部分完成） | 需追加 7 FSM 枚举 + 4 审批 DTO + BI 聚合类型 |
| StatusBadge/FSMActionButtons | 不存在（无 components/wms/） | 需新建 2 组件 + 单测 |
| 页面 | 22 页（列表/表单/设置） | 缺 6 BI 分析页 + 6 实体 Detail 页 |
| 路由 | 43 routes（config.ts 已有） | 需 +12 routes（6 BI + 6 Detail） |
| vitest | wms-api.test.ts 90 tests（单层目录合规） | 需 +25 tests（19 组件 + 6 BI 页） |

---

## 3. 架构

### 3.1 四层契约栈

```
┌──────────────────────────────────────────────────┐
│  Layer 4 · Frontend API Client                    │
│  apps/web/src/{types/wms.ts, api/wms/}            │
│  SSOT types, mock hook, StatusBadge, BI pages     │
├──────────────────────────────────────────────────┤
│  Layer 3 · Route + Handler                         │
│  svc/wms/src/modules/*.rs                         │
│  axum 0.8 {id} + utoipa + FSM gate + audit write  │
├──────────────────────────────────────────────────┤
│  Layer 2 · Model / DTO                             │
│  svc/wms/src/models/*.rs                          │
│  16 实体 + ToSchema + Query/Create/Update/ListResp│
├──────────────────────────────────────────────────┤
│  Layer 1 · Schema                                 │
│  TABLE_DEFS（schema_defense.rs 已覆盖 100%）       │
└──────────────────────────────────────────────────┘
```

### 3.2 任务图

```
Task 1 TS 类型底座 ──► ┌───────────────┐
                         │  Frontend Track │──► Task 4 6BI+6Detail
Task 3 前端组件 ────────► └───────────────┘
                                          │
                     Parallel Dispatch    ▼
                                         Task 6 五重验收
                                          ▲
Task 2 Rust 契约对齐 ───► ┌───────────────┐
                         │  Backend Track  │──► Task 5 审批 12 endpoints
Task 3 后端 FSM+单测 ───► └───────────────┘
```

---

## 4. 7 套 FSM 状态机定义

### FSM-1 InboundOrder
- 状态: `created → confirmed → received → completed / cancelled`
- 终端: `completed, cancelled`
- 审批: `received → completed` (APV-1)

### FSM-2 OutboundOrder
- 状态: `created → confirmed → picking → packing → shipping → completed / cancelled`
- 终端: `completed, cancelled`
- 审批: `packing → shipping` (APV-2)

### FSM-3 StockTake
- 状态: `planned → in_progress → completed / cancelled`
- 终端: `completed, cancelled`
- 审批: `in_progress → completed`（差异数 > 阈值时，APV-3）

### FSM-4 TransferOrder
- 状态: `pending → confirmed → shipped → received → completed / cancelled`
- 终端: `completed, cancelled`
- 审批: `confirmed → shipped` (APV-4)

### FSM-5 WavePick
- 状态: `created → assigned → picking → completed / cancelled`
- 终端: `completed, cancelled`
- 审批: 无（高周转轻量流程）

### FSM-6 InventoryMovement
- 状态: `draft → posted → completed / cancelled`
- 终端: `completed, cancelled`
- 审批: `posted → completed`（数量 > 阈值，归入 APV-3）

### FSM-7 SerialNumber
- 状态: `pending → assigned → used → archived`
- 终端: `archived`
- 审批: 无（自动流转）

---

## 5. 12 个审批端点（APV-1~4）

| APV | 路由（axum 0.8 `{id}`） | 状态流转 | 说明 |
|-----|-----------------------------|----------|------|
| 1-start | POST /wms/inbound-orders/{id}/approval/start | received | 提交入库质检审批 |
| 1-approve | POST /wms/inbound-orders/{id}/approval/approve | received → completed | 入库上架审批通过 |
| 1-reject | POST /wms/inbound-orders/{id}/approval/reject | received → confirmed（退货复检） | 入库审批退回 |
| 2-start | POST /wms/outbound-orders/{id}/approval/start | packing | 提交出库发货审批 |
| 2-approve | POST /wms/outbound-orders/{id}/approval/approve | packing → shipping | 发货审批通过 |
| 2-reject | POST /wms/outbound-orders/{id}/approval/reject | packing → picking | 发货审批退回（重新拣货） |
| 3-start | POST /wms/stock-takes/{id}/approval/start | in_progress | 提交盘点差异审批 |
| 3-approve | POST /wms/stock-takes/{id}/approval/approve | in_progress → completed | 盘点审批通过（系统自动调账） |
| 3-reject | POST /wms/stock-takes/{id}/approval/reject | in_progress（重新盘点） | 盘点审批退回 |
| 4-start | POST /wms/transfer-orders/{id}/approval/start | confirmed | 提交调拨发货审批 |
| 4-approve | POST /wms/transfer-orders/{id}/approval/approve | confirmed → shipped | 调拨发货审批通过 |
| 4-reject | POST /wms/transfer-orders/{id}/approval/reject | confirmed → pending | 调拨审批退回 |

---

## 6. BI 分析页规格

| 页面 | 图表类型 | 指标/维度 | 数据来源 hook |
|------|----------|-----------|---------------|
| WmsInventoryTurnoverPage | LineChart + BarChart（组合） | 月度周转率、库存周转天数（按仓库） | useWmsMock.turnover() |
| WmsAgeParetoPage | ComposedChart（Bar+Line 帕累托） | SKU 库龄分布 80/20 | useWmsMock.agePareto() |
| WmsFlowTrendPage | AreaChart（多系列） | 日出入库单量、件数（最近 30 天） | useWmsMock.flowTrend() |
| WmsAbcAnalysisPage | PieChart + DataGrid | A/B/C 分类金额占比 + Top10 SKU 明细 | useWmsMock.abcAnalysis() |
| WmsLocationUtilizationPage | Heatmap（Bar 颜色渐变） | 库区/库位利用率、空置率、滞销占比 | useWmsMock.locationUtil() |
| WmsOrderFulfillmentPage | RadialBarChart + BarChart | 准时履约率、平均出库时长、SLA 达标率 | useWmsMock.fulfillment() |

---

## 7. Detail 页规格

| 页面 | 核心模块 | 组件装配 |
|------|----------|----------|
| WmsInboundDetailPage | 入库单明细 + 行项 + StatusBadge + FSMActionButtons + 质量检验项 + 操作日志时间线 | DetailPageTemplate |
| WmsOutboundDetailPage | 出库单明细 + 行项 + 拣货进度 + 包装/物流信息 + StatusBadge + FSMActionButtons | DetailPageTemplate |
| WmsStockTakeDetailPage | 盘点单 + 差异清单（系统/实盘/差额/调整原因）+ StatusBadge + FSMActionButtons + 差异审批历史 | DetailPageTemplate |
| WmsTransferDetailPage | 调拨单 + 调入/调出仓库 + 运输信息 + 状态流转 + StatusBadge + FSMActionButtons | DetailPageTemplate |
| WmsWavePickDetailPage | 波次单 + 拣货员分配 + 波次包含订单明细 + 拣货进度条 + StatusBadge | DetailPageTemplate |
| WmsInventoryMovementDetailPage | 库存移动单 + 源库位/目标库位 + 批次/序列号 + StatusBadge + 审批日志 | DetailPageTemplate |

---

## 8. 验收基准（五重）

| # | 项 | 命令 | 阈值 |
|---|---|------|------|
| 1 | TSC | `npx tsc --noEmit` | 0 error |
| 2 | Rust check | `cargo check -p topems-wms` | 0 error 0 warning |
| 3 | 导航三联 | `npx vitest run navigation.test.tsx` | 2/2 passed |
| 4 | vitest（components/wms + analytics） | 自定义 run | ≥25 passed |
| 5 | cargo test -p topems-wms | 自定义 run | ≥60 passed |

---

## 9. 交付物对照

| 项 | MES V197 | QMS V198 | WMS V199（目标） |
|---|---|---|---|
| Rust DTO 文件 | 7 new | 8 new | 6 new（order_item/discrepancy/cycle_count/wave_pick + 2 transfer + 补全 8 existing ToSchema） |
| FSM 套 | 7 | 7 | 7 |
| FSM 单测 | 42+ | 42+ | ≥42 |
| 审批端点 | 12 | 12 | 12 |
| 审批单测 | 8 | 12 | 12 |
| cargo test 总数 | 81 | 85 | ≥60 |
| 前端 2 组件 + 单测 | StatusBadge(13) | StatusBadge(19) | ≥19 |
| BI 分析页 | 6 | 6 | 6 |
| Detail 页 | 6 (FSM相关) | 6 | 6 |
| 路由 + nav 注册 | 12 | 12 | 12 |
| vitest（前端） | 39 | 25 | ≥25 |
