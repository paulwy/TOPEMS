# WMS 全量业务逻辑填充 — Implementation Plan (V199)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 WMS 模块从骨架升级为四层契约 100% 对齐 + 7 FSM + 6 BI + 6 Detail + 12 审批端点，五重验收全绿。

**Architecture:** 双轨并行（Backend Track: Task 2+3+5 / Frontend Track: Task 1+3+4），独立完成后汇合至 Task 6 五重验收。四层契约垂直栈：L1 Schema(已防御 100%) → L2 models/*.rs DTO(ToSchema) → L3 Route+Handler(FSM gate+audit) → L4 Frontend API Client + StatusBadge/FSMActionButtons + BI/Detail Pages。FSM 沿用 `shared/fsm.rs` 函数式 `xxx_can_transition(from, to)` 模式，审批端点 `xxx/{id}/approval/{start,approve,reject}`。

**Tech Stack:**
- **Frontend:** TypeScript 5.6 + React 18 + recharts 2 + vitest（vitest 必须放 src/api/__tests__/ 单层目录，组件测试放 components/wms/__tests__/）
- **Backend:** Rust nightly-2026-07-01 + Axum 0.8（路径参数 `{id}`） + utoipa + sqlx + thiserror（FsmError）
- **FSM:** 函数式 `xxx_can_transition(from, to) -> Result<(), FsmError>` + `xxx_requires_approval(from, to) -> bool` + `is_valid_xxx_status(s) -> bool`
- **Approval gate:** requires_approval=true 的转换需走 start→approve 两阶段，写入 plugin_wms.audit_logs

---

## File Structure（全量清单）

### Backend Track — svc/wms/

**Create:**
- `svc/wms/src/shared/fsm.rs` — 7 FSM（inline code below）
- `svc/wms/src/shared/fsm_test.rs` — 7 × 6 = 42+ 单测
- `svc/wms/tests/approval_endpoints_test.rs` — 12 审批端点单测
- `svc/wms/src/models/order_item.rs` — 提取自 inbound_order/outbound_order 内嵌 DTO
- `svc/wms/src/models/wave_pick.rs` — 提取自 modules/wave_pick.rs 内嵌 DTO
- `svc/wms/src/models/cycle_count.rs` — 提取自 modules/cycle_count.rs 内嵌 DTO

**Modify:**
- `svc/wms/src/models/mod.rs` — 追加 3 个 pub mod + 补全所有 pub use * re-export（现有 14 个已有 mod，补上缺的 re-export）
- `svc/wms/src/models/{warehouse,batch,inbound_order,inventory,inventory_movement,location,outbound_order,serial_number,stock_take,transfer_order}.rs` — 每个 struct 追加 `#[derive(ToSchema)]`（缺什么补什么）
- `svc/wms/src/shared/mod.rs` — 追加 `pub mod fsm;` + `#[cfg(test)] pub mod fsm_test;`
- `svc/wms/src/shared/permission.rs` — 追加 4 WmsApprove 枚举变体 + to_shared Admin 映射
- `svc/wms/src/modules/inbound_order.rs` — 替换内嵌 DTO 为 `use crate::models::inbound_order::*;`；移除重复 struct；新增 3 APV-1 路由
- `svc/wms/src/modules/outbound_order.rs` — 同上；新增 3 APV-2 路由
- `svc/wms/src/modules/stock_take.rs` — 同上；新增 3 APV-3 路由
- `svc/wms/src/modules/transfer_order.rs` — 同上；新增 3 APV-4 路由
- `svc/wms/src/models/audit_log.rs` — 确认 `log_approval_event(pool, user_id, tenant_id, action, details)` 存在，如缺失补之（可直接从 svc/qms 复制）
- `svc/wms/src/services/mod.rs` — 如文件不存在则新建，填充 service 层 trait（Quality*Service → WMS 对应）

### Frontend Track — apps/web/

**Create:**
- `apps/web/src/types/wms.ts` — 10+ 实体全量 DTO + 7 FSM 状态枚举（对标 types/qms.ts）
- `apps/web/src/api/wms/_mock.ts` — useWmsMock hook + 10+ 实体 mock + 6 BI 聚合 mock
- `apps/web/src/components/wms/StatusBadge.tsx` — 7 FSM 颜色徽章
- `apps/web/src/components/wms/FSMActionButtons.tsx` — 7 FSM 转换映射 + 审批按钮
- `apps/web/src/components/wms/__tests__/StatusBadge.test.tsx` — ≥19 组件测试
- `apps/web/src/pages/wms/analytics/WmsInventoryTurnoverPage.tsx` — 库存周转率
- `apps/web/src/pages/wms/analytics/WmsAgeParetoPage.tsx` — 库龄帕累托
- `apps/web/src/pages/wms/analytics/WmsFlowTrendPage.tsx` — 出入库趋势
- `apps/web/src/pages/wms/analytics/WmsAbcAnalysisPage.tsx` — ABC 分类
- `apps/web/src/pages/wms/analytics/WmsLocationUtilizationPage.tsx` — 库位利用率
- `apps/web/src/pages/wms/analytics/WmsOrderFulfillmentPage.tsx` — 订单履约率
- `apps/web/src/pages/wms/analytics/__tests__/WmsAnalyticsPages.test.tsx` — 6 BI 页渲染测试
- `apps/web/src/pages/wms/WmsInboundDetailPage.tsx`
- `apps/web/src/pages/wms/WmsOutboundDetailPage.tsx`
- `apps/web/src/pages/wms/WmsStockTakeDetailPage.tsx`
- `apps/web/src/pages/wms/WmsTransferDetailPage.tsx`
- `apps/web/src/pages/wms/WmsWavePickDetailPage.tsx`
- `apps/web/src/pages/wms/WmsInventoryMovementDetailPage.tsx`

**Modify:**
- `apps/web/src/api/wms/types.ts` — 追加 7 FSM 状态常量 + 审批 DTO + BI 聚合类型
- `apps/web/src/api/wms/index.ts` — 追加 approval 导出（4 类 3端点共 12 个调用封装）
- `apps/web/src/modules/wms/config.ts` — WMS_PATHS 追加 12 路径；路由 +12（6 BI template='stats' group='analytics' + 6 Detail template='detail' group='business'）；navItem +6（仅 BI 分组出导航）
- `apps/web/src/__tests__/setup-mocks.ts` — 如 recharts mock 缺组件（ReferenceArea/ReferenceLine 等），按需补充
- `apps/web/vitest.config.ts` — 如 QMS 同款追加 wms 组件测试 include 路径（如已全局包含则跳过）

---

## Task 1 · Frontend: TypeScript 类型底座（Single Source of Truth）

**Files:** Create `apps/web/src/types/wms.ts` · Create `apps/web/src/api/wms/_mock.ts` · Modify `apps/web/src/api/wms/types.ts` · Modify `apps/web/src/api/wms/index.ts`

- [ ] **Step 1: 创建 apps/web/src/types/wms.ts（600+ 行）**

顶部参考注释 + 7 FSM 状态枚举：

```typescript
// ============================================================================
// WMS 模块全量 DTO 定义 — 单一事实源 (Single Source of Truth)
// 10+ 实体清单：
//   E-1  Warehouse（已存在模型）
//   E-2  Location（已存在模型）
//   E-3  InboundOrder + InboundOrderItem（新增 E-3b）
//   E-4  OutboundOrder + OutboundOrderItem（新增 E-4b）
//   E-5  StockTake + StockTakeItem
//   E-6  TransferOrder + TransferOrderItem（已有）
//   E-7  WavePick + WavePickItem（新增）
//   E-8  InventoryMovement
//   E-9  InventoryItem + InventoryAlert（已有）
//   E-10 SerialNumber（已有）
//   E-11 Batch（已有）
// ============================================================================

// ==================== FSM-1 InboundOrder ====================
export const INBOUND_ORDER_STATES = ['created','confirmed','received','completed','cancelled'] as const;
export type InboundOrderState = (typeof INBOUND_ORDER_STATES)[number];
// ==================== FSM-2 OutboundOrder ====================
export const OUTBOUND_ORDER_STATES = ['created','confirmed','picking','packing','shipping','completed','cancelled'] as const;
export type OutboundOrderState = (typeof OUTBOUND_ORDER_STATES)[number];
// ==================== FSM-3 StockTake ====================
export const STOCK_TAKE_STATES = ['planned','in_progress','completed','cancelled'] as const;
export type StockTakeState = (typeof STOCK_TAKE_STATES)[number];
// ==================== FSM-4 TransferOrder ====================
export const TRANSFER_ORDER_STATES = ['pending','confirmed','shipped','received','completed','cancelled'] as const;
export type TransferOrderState = (typeof TRANSFER_ORDER_STATES)[number];
// ==================== FSM-5 WavePick ====================
export const WAVE_PICK_STATES = ['created','assigned','picking','completed','cancelled'] as const;
export type WavePickState = (typeof WAVE_PICK_STATES)[number];
// ==================== FSM-6 InventoryMovement ====================
export const INVENTORY_MOVEMENT_STATES = ['draft','posted','completed','cancelled'] as const;
export type InventoryMovementState = (typeof INVENTORY_MOVEMENT_STATES)[number];
// ==================== FSM-7 SerialNumber ====================
export const SERIAL_NUMBER_STATES = ['pending','assigned','used','archived'] as const;
export type SerialNumberState = (typeof SERIAL_NUMBER_STATES)[number];
```

然后 11 实体 Response DTO + CreateRequest + UpdateRequest 结构体逐一写出，字段与 svc/wms/src/models/*.rs 1:1 对齐（id/tenant_id 为 string，DateTime 为 string，可空为 `| null`）。

- [ ] **Step 2: 创建 apps/web/src/api/wms/_mock.ts（800+ 行）**，useWmsMock hook 返回：inbound/outbound/stocktake/transfer/wavepick/movement/inventory/serial/batch/warehouse/location 列表数据 + 6 BI 聚合数据（turnover/agePareto/flowTrend/abcAnalysis/locationUtil/fulfillment），全部 deterministic seed。

- [ ] **Step 3: 修改 apps/web/src/api/wms/types.ts（追加 7 FSM 枚举 + 审批 DTO + BI 聚合类型）**，若类型与 types/qms.ts 冲突，优先以 types/wms.ts 为准。追加：
```typescript
// Approval
export interface ApprovalStartRequest { entityId: string; entityType: string; remark?: string; }
export interface ApprovalApproveRequest { entityId: string; entityType: string; approverId: string; remark?: string; }
export interface ApprovalRejectRequest  { entityId: string; entityType: string; rejectorId: string; reason: string; }
// BI 聚合
export interface TurnoverDatum { warehouse: string; month: string; turnoverRate: number; days: number; }
export interface ParetoDatum     { sku: string; amount: number; cumulative: number; }
export interface FlowDatum       { date: string; inboundQty: number; outboundQty: number; }
export interface AbcCategory     { category: 'A'|'B'|'C'; count: number; amount: number; percent: number; }
export interface LocationDatum   { area: string; utilization: number; vacancy: number; deadStock: number; }
export interface FulfillmentDatum{ warehouse: string; onTimeRate: number; avgHours: number; slaPass: number; }
```

- [ ] **Step 4: 修改 apps/web/src/api/wms/index.ts（追加 approval 封装）**
```typescript
// 4 classes × 3 endpoints = 12 calls
export const wmsApprovalApi = {
  inbound: {
    start:   (id: string, body: ApprovalStartRequest)   => client.post(`/wms/inbound-orders/${id}/approval/start`, body),
    approve: (id: string, body: ApprovalApproveRequest) => client.post(`/wms/inbound-orders/${id}/approval/approve`, body),
    reject:  (id: string, body: ApprovalRejectRequest)  => client.post(`/wms/inbound-orders/${id}/approval/reject`, body),
  },
  outbound: { /* same */ },
  stockTake: { /* same with /wms/stock-takes/ */ },
  transferOrder: { /* same with /wms/transfer-orders/ */ },
};
```

- [ ] **Step 5: 验证 tsc**
Run: `cd apps/web && npx tsc --noEmit 2>&1 | grep -E "^src/(types|api)/(wms|wms/index)" | head -10`
Expected: 0 lines

---

## Task 2 · Backend: Rust 契约对齐 + DTO 独立

**Files:** Create 3 models files · Modify mod.rs + 10 existing models/*.rs + shared/mod.rs + permission.rs + 4 modules/*.rs + services/mod.rs

- [ ] **Step 1: 补全 10 个现有 models/*.rs 的 `#[derive(ToSchema)]`**（warehouse/batch/inbound_order/inventory/inventory_movement/location/outbound_order/serial_number/stock_take/transfer_order），缺失即追加。Import: `use utoipa::ToSchema;`

- [ ] **Step 2: 新建 svc/wms/src/models/order_item.rs**，从 modules/inbound_order.rs 和 outbound_order.rs 中提取 `InboundOrderItem + OutboundOrderItem` 及其 Create/Update/Query DTO，全部加 `#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]`（FromRow 仅数据库模型保留）

- [ ] **Step 3: 新建 svc/wms/src/models/wave_pick.rs**，提取自 modules/wave_pick.rs：`WavePick + WavePickItem + CreateWavePickRequest + UpdateWavePickRequest + AssignWavePickRequest`

- [ ] **Step 4: 新建 svc/wms/src/models/cycle_count.rs**，提取自 modules/cycle_count.rs 相关 struct

- [ ] **Step 5: 更新 svc/wms/src/models/mod.rs** 追加 3 pub mod + 补齐所有 pub use *（现有 12 个 re-export 已部分完成，缺漏补齐）

- [ ] **Step 6: 修改 svc/wms/src/shared/mod.rs**
```rust
pub mod cache;
pub mod permission;
pub mod fsm;

#[cfg(test)]
pub mod fsm_test;
```

- [ ] **Step 7: 修改 svc/wms/src/shared/permission.rs**（QMS 同款模式）
追加 4 枚举变体到 WmsPermission：
```rust
    InboundApprove,
    OutboundApprove,
    StockTakeApprove,
    TransferApprove,
```
并在 `to_shared()` 中映射为 `PermissionAction::Admin`。

- [ ] **Step 8: 修改 modules/{inbound_order,outbound_order,stock_take,transfer_order}.rs** — 开头改为：
```rust
use crate::models::inbound_order::*;
use crate::models::order_item::InboundOrderItem;
```
保留所有 handler 函数和路由定义不变；移除内嵌重复 struct 定义；确认没有 `validate_status_transition` 残留（Task 3 FSM 接管）。

- [ ] **Step 9: 如 svc/wms/models/audit_log.rs 缺少 `log_approval_event`，补之**（签名：`pub async fn log_approval_event(pool: &PgPool, user_id: &Uuid, tenant_id: Option<Uuid>, action: &str, details: serde_json::Value) -> Result<(), sqlx::Error>`，INSERT INTO plugin_wms.audit_logs）

- [ ] **Step 10: 新建/填充 svc/wms/src/services/mod.rs**（QMS 同款）
```rust
//! WMS service layer — business logic abstraction
use crate::models::*;
use sqlx::PgPool;

pub trait InboundOrderService: Send + Sync {
    async fn list(&self, pool: &PgPool, q: &InboundOrderQuery) -> Result<ListInboundOrdersResponse, sqlx::Error>;
    async fn get(&self, pool: &PgPool, id: &str) -> Result<Option<InboundOrder>, sqlx::Error>;
}
// 同理 Outbound/StockTake/Transfer/WavePick/InventoryMovement 各 1 trait
```

- [ ] **Step 11: 验证 cargo check**
Run: `cargo check -p topems-wms 2>&1 | tail -20`
Expected: Finished, 0 error 0 warning

---

## Task 3a · Backend: 7 FSM + fsm_test.rs

**Files:** Create svc/wms/src/shared/fsm.rs and svc/wms/src/shared/fsm_test.rs

- [ ] **Step 1: 创建 svc/wms/src/shared/fsm.rs（500+ 行）**，严格按 spec §4 7 套 FSM。FsmError 模板：
```rust
//! WMS 7 状态机定义
#[derive(Debug, thiserror::Error, PartialEq)]
pub enum FsmError {
    #[error("state '{0}' is terminal and cannot transition")]
    TerminalState(String),
    #[error("invalid transition: {from} -> {to}")]
    InvalidTransition { from: String, to: String },
    #[error("unknown status: {0}")]
    UnknownStatus(String),
}

fn validate_status(status: &str, allowed: &[&str]) -> Result<(), FsmError> {
    if allowed.contains(&status) { Ok(()) } else { Err(FsmError::UnknownStatus(status.to_string())) }
}

fn check_pair(from:&str, to:&str, allowed_pairs:&[(&str,&str)], terminal:&[&str], all_states:&[&str]) -> Result<(),FsmError> {
    validate_status(from, all_states)?;
    validate_status(to, all_states)?;
    if terminal.contains(&from) { return Err(FsmError::TerminalState(from.to_string())); }
    if allowed_pairs.contains(&(from, to)) { Ok(()) } else { Err(FsmError::InvalidTransition{from:from.to_string(), to:to.to_string()}) }
}

// ==================== FSM-1 InboundOrder ====================
const INBOUND_ORDER_STATES: &[&str] = &["created","confirmed","received","completed","cancelled"];
const INBOUND_ORDER_TERMINAL: &[&str] = &["completed","cancelled"];
const INBOUND_ORDER_APPROVAL: &[(&str,&str)] = &[("received","completed")];

pub fn inbound_order_can_transition(from:&str, to:&str) -> Result<(),FsmError> {
    let pairs = &[("created","confirmed"),("confirmed","received"),("received","completed"),("confirmed","cancelled"),("created","cancelled"),("received","confirmed")]; // reject回流
    check_pair(from,to,pairs,INBOUND_ORDER_TERMINAL,INBOUND_ORDER_STATES)
}
pub fn inbound_order_requires_approval(from:&str, to:&str)->bool{ INBOUND_ORDER_APPROVAL.contains(&(from,to)) }
pub fn is_valid_inbound_order_status(s:&str)->bool{ INBOUND_ORDER_STATES.contains(&s) }
```
其余 6 套 FSM（OutboundOrder/StockTake/TransferOrder/WavePick/InventoryMovement/SerialNumber）按 spec §4 状态机表逐一翻译。

- [ ] **Step 2: 创建 svc/wms/src/shared/fsm_test.rs（≥42 tests）**，7 FSM × 6 用例模板：
```rust
#[cfg(test)]
mod tests {
    use super::*;

    // ============= InboundOrder (6 tests) =============
    #[test] fn inbound_valid_transitions() { inbound_order_can_transition("created","confirmed").unwrap(); inbound_order_can_transition("confirmed","received").unwrap(); inbound_order_can_transition("received","completed").unwrap(); }
    #[test] fn inbound_terminal_rejects()   { assert!(matches!(inbound_order_can_transition("completed","cancelled"), Err(FsmError::TerminalState(_)))); }
    #[test] fn inbound_invalid_transitions(){ assert!(matches!(inbound_order_can_transition("created","received"), Err(FsmError::InvalidTransition{..}))); }
    #[test] fn inbound_unknown_status()     { assert!(matches!(inbound_order_can_transition("xxx","created"), Err(FsmError::UnknownStatus(_)))); }
    #[test] fn inbound_requires_approval()  { assert!( inbound_order_requires_approval("received","completed")); assert!(!inbound_order_requires_approval("created","confirmed")); }
    #[test] fn inbound_self_transition()    { assert!(matches!(inbound_order_can_transition("confirmed","confirmed"), Err(FsmError::InvalidTransition{..}))); }
}
```
6 × 7 = 42 单测。

- [ ] **Step 3: 运行 cargo test**
Run: `cargo test -p topems-wms --lib shared::fsm_test 2>&1 | tail -10`
Expected: 42 passed

---

## Task 3b · Frontend: StatusBadge + FSMActionButtons 组件

**Files:** Create components/wms/*

- [ ] **Step 1: 创建 apps/web/src/components/wms/StatusBadge.tsx**，读 MES 同款组件作为模板。Props:
```tsx
export type WmsFsm = 'inbound'|'outbound'|'stocktake'|'transfer'|'wavepick'|'movement'|'serial';
export function WmsStatusBadge({ fsm, status }: { fsm: WmsFsm; status: string }) {
  // 颜色映射：初始态(灰) 进行态(蓝) 审批态(橙) 完成态(绿) 取消/拒绝(红)
}
```
- [ ] **Step 2: 创建 apps/web/src/components/wms/FSMActionButtons.tsx**
```tsx
type ActionDef = { action: string; label: string; from: string; to: string; requiresApproval?: boolean };
export function WmsFSMActionButtons({ fsm, currentStatus, onAction }: {...}) {}
```
allowed_transitions_map 与后端 FSM 1:1 对齐（后端 7 × allowed_pairs）。

- [ ] **Step 3: 创建 apps/web/src/components/wms/__tests__/StatusBadge.test.tsx（≥19 tests）**。7 FSM × 2-3 状态 + 未知状态兜底 + fsm 类型切换 = ≥19。

- [ ] **Step 4: vitest 验证**
Run: `cd apps/web && npx vitest run src/components/wms 2>&1 | tail -15`
Expected: 19 passed

---

## Task 4 · Frontend: 6 BI + 6 Detail 页 + 路由注册

**Files:** Create 12 pages + 1 test file · Modify modules/wms/config.ts

- [ ] **Step 1-6: 依次创建 6 BI 分析页（apps/web/src/pages/wms/analytics/*.tsx）**。每页模板 = `DashboardTemplate` + 标题（`<Title heading/>`）+ recharts 图（useWmsMock 数据）。按 spec §6 规格：
  - WmsInventoryTurnoverPage.tsx（Line+Bar 组合）
  - WmsAgeParetoPage.tsx（Bar+Line 帕累托）
  - WmsFlowTrendPage.tsx（Area 多系列）
  - WmsAbcAnalysisPage.tsx（Pie+DataGrid）
  - WmsLocationUtilizationPage.tsx（Bar 颜色渐变堆）
  - WmsOrderFulfillmentPage.tsx（RadialBar+Bar）
  参考 QMS pages/qms/analytics/*.tsx 模式。

- [ ] **Step 7: 创建 apps/web/src/pages/wms/analytics/__tests__/WmsAnalyticsPages.test.tsx**，6 个 BI 页 `it('renders title')` 渲染测试 = 6 tests。

- [ ] **Step 8-13: 依次创建 6 Detail 页**（DetailPageTemplate 或标准布局，含 StatusBadge + FSMActionButtons + 时间线/行项）：
  - WmsInboundDetailPage.tsx（path: `/wms/inbound-orders/:id`）
  - WmsOutboundDetailPage.tsx（`/wms/outbound-orders/:id`）
  - WmsStockTakeDetailPage.tsx（`/wms/stock-takes/:id`）
  - WmsTransferDetailPage.tsx（`/wms/transfer-orders/:id`）
  - WmsWavePickDetailPage.tsx（`/wms/wave-picks/:id`）
  - WmsInventoryMovementDetailPage.tsx（`/wms/inventory-movements/:id`）

- [ ] **Step 14: 修改 apps/web/src/modules/wms/config.ts**，WMS_PATHS 追加 12 路由路径：
```typescript
// BI（analytics 分组）
WmsInventoryTurnover: '/wms/analytics/inventory-turnover',
WmsAgePareto:       '/wms/analytics/age-pareto',
WmsFlowTrend:       '/wms/analytics/flow-trend',
WmsAbcAnalysis:     '/wms/analytics/abc-analysis',
WmsLocationUtil:    '/wms/analytics/location-utilization',
WmsOrderFulfillment:'/wms/analytics/order-fulfillment',
// Detail（business 分组，导航不直接显示，由列表跳转）
WmsInboundDetail:   '/wms/inbound-orders/:id',
WmsOutboundDetail:  '/wms/outbound-orders/:id',
WmsStockTakeDetail: '/wms/stock-takes/:id',
WmsTransferDetail:  '/wms/transfer-orders/:id',
WmsWavePickDetail:  '/wms/wave-picks/:id',
WmsMovementDetail:  '/wms/inventory-movements/:id',
```
routes 数组 +12 项（6 BI template='stats' group='analytics' + 6 Detail template='detail' group='business'），全部 `lazyWithRetry`。navItems +6 BI 放入 analytics 分组。Permission 严格三段式 `wms:inventory_turnover:read`。

- [ ] **Step 15: TSC + vitest 验证**
Run: `cd apps/web && npx tsc --noEmit 2>&1 | grep -E "wms" | head -5` → 0 lines
Run: `cd apps/web && npx vitest run src/pages/wms/analytics 2>&1 | tail -10` → 6 passed

---

## Task 5 · Backend: 4 类审批工作流端点

**Files:** Modify 4 modules/*.rs · Create tests/approval_endpoints_test.rs

- [ ] **Step 1: 修改 svc/wms/src/modules/inbound_order.rs（新增 3 路由）**，放在 `create_routes` Router 末尾：
```rust
    .route("/inbound-orders/{id}/approval/start",   post(start_inbound_approval))
    .route("/inbound-orders/{id}/approval/approve", post(approve_inbound))
    .route("/inbound-orders/{id}/approval/reject",  post(reject_inbound))
```
每端点 handler 六步：读取当前状态 → FSM xxx_can_transition 校验 → requires_approval 校验 + permission → UPDATE 状态 → log_approval_event 审计 → ApiResponse。
utoipa 注解：
```rust
#[utoipa::path(post, path = "/api/wms/inbound-orders/{id}/approval/approve", tag="WMS - Inbound")]
```

- [ ] **Step 2: 修改 outbound_order.rs（3 路由：packing → shipping + reject 回流 picking）**
- [ ] **Step 3: 修改 stock_take.rs（3 路由：in_progress → completed → rework 回流）**
- [ ] **Step 4: 修改 transfer_order.rs（3 路由：confirmed → shipped + reject 回流 pending）**

- [ ] **Step 5: 创建 tests/approval_endpoints_test.rs（12 approval 单测）**，每类 3 端点 = 12 tests，测试：合法 approve 通过、reject 状态回流、非法起始状态拒绝。

- [ ] **Step 6: 全量验证**
Run: `cargo check -p topems-wms 2>&1 | grep -E "^error|^warning" | wc -l` → 0
Run: `cargo test -p topems-wms 2>&1 | grep -E "test result:" | tail -10` → Expect all test result suites passed ≥60

---

## Task 6 · 五重验收

- [ ] **验收 1: TypeScript 型检**
Run: `cd apps/web && npx tsc --noEmit 2>&1 | tail -5; echo "EXIT:$?"` → Expect EXIT:0

- [ ] **验收 2: Rust 严格模式**
Run: `cargo check -p topems-wms 2>&1 | tail -5` → Expect Finished + 0/0

- [ ] **验收 3: 导航三联**
Run: `cd apps/web && npx vitest run src/__tests__/integration/navigation.test.tsx 2>&1 | tail -10` → Expect 2/2

- [ ] **验收 4: 前端 vitest（components + analytics）**
Run: `cd apps/web && npx vitest run src/components/wms src/pages/wms/analytics 2>&1 | tail -15` → Expect ≥25 passed

- [ ] **验收 5: 后端 cargo test**
Run: `cargo test -p topems-wms 2>&1 | grep -E "running|test result:" | tail -20` → Expect ≥60 passed（ignored 集成测试不计）

- [ ] **Step 7: TODO.md 新增 V199 章节**，格式对标 V198 QMS（五重验收表格 + 交付物统计 + 任务执行明细 + 12 审批端点路由表 + 关键修复 + 模块上线状态）。
