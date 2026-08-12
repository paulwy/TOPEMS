# WMS + TMS + ERP 三联调集成测试 — Implementation Plan (V200)

> **For agentic workers:** REQUIRED SUB-SKILL: subagent-driven-development or executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 验证 WMS（V199 7 FSM + 12 审批端点）、TMS（shipment FSM pending→in_transit→delivered）、ERP（inventory available/reserved + salesOrder/purchaseOrder）三模块跨模块业务流程的端到端正确性，覆盖 6 个核心联调场景。

**Architecture:**
- **前端 vitest 集成测试**：扩展现有 `apps/web/src/__tests__/integration/cross-module-flow.test.ts`（已含 6 场景但未覆盖 WMS+TMS+ERP 联动），新增独立文件 `wms-tms-erp-integration.test.ts` 专测三模块联动；采用 mock apiClient 模式（不依赖真实后端）。
- **后端 cargo 集成测试**：在 `svc/wms/tests/` 新建 `cross_module_integration_tests.rs`，测试 WMS FSM 与外部状态触发的联动逻辑（不连真实 DB，纯 FSM + DTO 校验）；TMS 同款新建 `svc/tms/tests/cross_module_integration_tests.rs`。
- **场景维度**：Order-to-Delivery、Procurement-to-Stock、Transfer-to-Destination、Inventory-Alert、Data-Consistency、Error-Rollback。

**Tech Stack:** Rust + axum 0.8 + vitest 4 + recharts mock + toOpenApiParams helper。

---

## 6 个联调场景

### 场景 1: 销售订单 → ERP → WMS 出库 → TMS 运单（Order-to-Delivery）
- ERP `salesOrder.create` → 触发 WMS `outboundOrder.create` (status=created) → WMS FSM 推进至 packing → 触发 TMS `shipment.create` (status=pending) → TMS dispatch → WMS outbound shipping → TMS delivered → WMS completed
- 关键校验：WMS outbound status 与 TMS shipment status 联动；库存 available_quantity 减少

### 场景 2: 采购订单 → ERP → WMS 入库（Procurement-to-Stock）
- ERP `purchaseOrder.create` → 触发 WMS `inboundOrder.create` (status=created) → WMS FSM 推进至 received → 审批通过 → completed → ERP inventory available_quantity 增加
- 关键校验：WMS inbound FSM received→completed 必须经过审批；库存数量同步

### 场景 3: WMS 调拨 → TMS 运输 → 目的仓入库（Transfer-to-Destination）
- WMS `transferOrder.create` (status=pending) → 确认 confirmed → TMS shipment.create → TMS dispatch (in_transit) → WMS transfer shipped → TMS delivered → WMS transfer received → completed
- 关键校验：Transfer FSM 与 Shipment FSM 状态映射 1:1

### 场景 4: WMS 库存预警 → ERP 物料安全库存校验
- WMS `inventory.list` 返回 quantity < safety_stock → ERP `material.get` 校验 safety_stock → 触发 ERP 自动采购建议
- 关键校验：跨模块数据读取一致性

### 场景 5: 数据一致性 — 三模块库存数量校验
- 同一 material_code 在 ERP inventory、WMS inventory、WMS inventoryMovement 中数量一致
- WMS outbound completed 后，ERP available_quantity 减少；WMS inbound completed 后，ERP available_quantity 增加

### 场景 6: 错误处理与回滚
- WMS outbound 在 packing→shipping 时 TMS shipment.create 失败 → outbound 应回退至 picking；FSM 不可前进时拒绝；非审批态调用审批端点返回错误
- 关键校验：跨模块调用失败时 FSM 状态不被破坏

---

## File Structure

### Frontend
- Create: `apps/web/src/__tests__/integration/wms-tms-erp-integration.test.ts` — 6 场景 × 多步 = 18+ 测试
- 不修改 cross-module-flow.test.ts（已含其它场景，保持单一职责）

### Backend
- Create: `svc/wms/tests/cross_module_integration_tests.rs` — 6 场景后端 FSM 联动校验（≥12 tests）
- Create: `svc/tms/tests/` 目录 + `svc/tms/tests/cross_module_integration_tests.rs` — TMS shipment FSM × WMS transfer/outbound 联动（≥6 tests）

### Documentation
- Modify: `docs/roadmap/TODO.md` — 新增 V200 章节

---

## Task 1 · Frontend: 6 场景 vitest 集成测试

**Files:** Create `apps/web/src/__tests__/integration/wms-tms-erp-integration.test.ts`

- [ ] **Step 1: 创建测试文件，mock apiClient 三模块**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/api/client', () => {
  const createMockModule = () => ({
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  });
  return {
    apiClient: {
      wms: createMockModule(),
      tms: createMockModule(),
      erp: createMockModule(),
    },
    default: {
      wms: createMockModule(),
      tms: createMockModule(),
      erp: createMockModule(),
    },
  };
});
```

- [ ] **Step 2: 场景 1 — Order-to-Delivery（3 tests）**
  - test 1: salesOrder.create → outboundOrder.create → shipment.create 联动，校验三模块 API 被调用且 payload 含关联 ID
  - test 2: WMS outbound FSM packing → shipping 与 TMS shipment dispatch 同步
  - test 3: TMS delivered → WMS outbound completed → ERP inventory available_quantity 扣减

- [ ] **Step 3: 场景 2 — Procurement-to-Stock（3 tests）**
  - test 1: purchaseOrder.create → inboundOrder.create 联动
  - test 2: inbound FSM received → completed 必须经审批（校验 wmsApprovalApi.inbound.approve 被调用）
  - test 3: inbound completed → ERP inventory available_quantity 增加

- [ ] **Step 4: 场景 3 — Transfer-to-Destination（3 tests）**
  - test 1: transferOrder.create → shipment.create 联动
  - test 2: transfer FSM confirmed → shipped 与 TMS dispatch 同步
  - test 3: TMS delivered → transfer received → completed → 目的仓 inventory 增加

- [ ] **Step 5: 场景 4 — Inventory Alert（2 tests）**
  - test 1: WMS inventory.list 返回低库存 → ERP material.get safety_stock 校验
  - test 2: 触发 ERP 自动采购建议（purchaseOrder.create）

- [ ] **Step 6: 场景 5 — Data Consistency（3 tests）**
  - test 1: 同一 material_code 在 ERP/WMS inventory 返回一致 quantity
  - test 2: WMS outbound completed 后 ERP available_quantity 减少
  - test 3: WMS inbound completed 后 ERP available_quantity 增加

- [ ] **Step 7: 场景 6 — Error Rollback（4 tests）**
  - test 1: TMS shipment.create 失败时 WMS outbound 不前进至 shipping（仍为 picking）
  - test 2: WMS FSM 非法转换被拒绝（如 created → completed）
  - test 3: 非审批态调用审批端点返回错误（wmsApprovalApi.inbound.approve 对 created 状态）
  - test 4: TMS shipment.dispatch 对 delivered 状态被拒绝

- [ ] **Step 8: 运行测试**
Run: `cd apps/web && npx vitest run src/__tests__/integration/wms-tms-erp-integration.test.ts 2>&1 | tail -15`
Expected: ≥18 passed

---

## Task 2 · Backend: WMS 跨模块 FSM 联动测试

**Files:** Create `svc/wms/tests/cross_module_integration_tests.rs`

- [ ] **Step 1: 创建测试文件头 + 6 个 describe 模块**
```rust
//! WMS + TMS + ERP 三联调集成测试 — WMS 视角
//! 验证 WMS FSM 在跨模块业务流程中的状态联动正确性
//! 不连真实 DB，纯 FSM + DTO 校验

use topems_wms::shared::fsm::{
    inbound_order_can_transition, inbound_order_requires_approval,
    outbound_order_can_transition, outbound_order_requires_approval,
    transfer_order_can_transition, transfer_order_requires_approval,
    inventory_movement_can_transition,
};
```

- [ ] **Step 2: 场景 1 后端 — Order-to-Delivery WMS 视角（2 tests）**
  - test 1: outbound FSM: created → confirmed → picking → packing → shipping → completed 全路径合法
  - test 2: outbound packing → shipping requires_approval=true（APV-2）

- [ ] **Step 3: 场景 2 后端 — Procurement-to-Stock WMS 视角（2 tests）**
  - test 1: inbound FSM: created → confirmed → received → completed 全路径合法
  - test 2: inbound received → completed requires_approval=true（APV-1）

- [ ] **Step 4: 场景 3 后端 — Transfer-to-Destination WMS 视角（3 tests）**
  - test 1: transfer FSM: pending → confirmed → shipped → received → completed 全路径合法
  - test 2: transfer confirmed → shipped requires_approval=true（APV-4）
  - test 3: transfer reject 回流 confirmed → pending 合法

- [ ] **Step 5: 场景 5 后端 — InventoryMovement FSM（2 tests）**
  - test 1: movement FSM: draft → posted → completed 合法；posted → completed requires_approval=true
  - test 2: movement cancel from draft/posted 合法；completed 终态拒绝

- [ ] **Step 6: 场景 6 后端 — Error Rollback（3 tests）**
  - test 1: outbound created → completed 直接跳跃被 InvalidTransition 拒绝
  - test 2: inbound completed → cancelled 终态被 TerminalState 拒绝
  - test 3: transfer received → pending 反向非法（仅 confirmed → pending 是 reject 回流）

- [ ] **Step 7: 运行测试**
Run: `cargo test -p topems-wms --test cross_module_integration_tests 2>&1 | tail -10`
Expected: ≥12 passed

---

## Task 3 · Backend: TMS 跨模块 FSM 联动测试

**Files:** Create `svc/tms/tests/` 目录 + `svc/tms/tests/cross_module_integration_tests.rs` + 修改 `svc/tms/Cargo.toml` 如缺 test section

- [ ] **Step 1: 创建 svc/tms/tests/ 目录 + 测试文件**
```rust
//! WMS + TMS + ERP 三联调集成测试 — TMS 视角
//! 验证 TMS shipment FSM 与 WMS outbound/transfer 联动
//! 不连真实 DB，纯 FSM 校验

use topems_tms::modules::shipment::shipment_can_transition;
// 若 shipment_can_transition 不导出，先在 svc/tms/src/modules/shipment.rs 添加 pub use 或 pub fn
```

- [ ] **Step 2: 场景 1 — TMS × WMS Outbound 联动（3 tests）**
  - test 1: shipment FSM pending → in_transit → delivered 全路径合法
  - test 2: WMS outbound packing → shipping 时 TMS shipment 必须 in_transit（状态映射校验）
  - test 3: shipment delivered 后 WMS outbound 可 completed

- [ ] **Step 3: 场景 3 — TMS × WMS Transfer 联动（3 tests）**
  - test 1: WMS transfer confirmed → shipped 时 TMS shipment 必须 in_transit
  - test 2: TMS delivered → WMS transfer shipped → received 合法
  - test 3: shipment cancelled → WMS transfer 不可前进至 received

- [ ] **Step 4: 场景 6 — TMS 错误处理（2 tests）**
  - test 1: shipment delivered → in_transit 反向被拒绝
  - test 2: shipment delivered → cancelled 终态拒绝

- [ ] **Step 5: 若 shipment_can_transition 是私有，修改 svc/tms/src/modules/shipment.rs 使之 pub**
- [ ] **Step 6: 运行测试**
Run: `cargo test -p topems-tms --test cross_module_integration_tests 2>&1 | tail -10`
Expected: ≥6 passed

---

## Task 4 · 五重验收 + TODO.md V200 更新

- [ ] **验收 1: TypeScript 型检**
Run: `cd apps/web && npx tsc --noEmit 2>&1 | tail -3` → 0 error

- [ ] **验收 2: Rust check（WMS + TMS）**
Run: `cargo check -p topems-wms -p topems-tms 2>&1 | tail -5` → 0/0

- [ ] **验收 3: 前端 vitest 新增集成测试**
Run: `cd apps/web && npx vitest run src/__tests__/integration/wms-tms-erp-integration.test.ts 2>&1 | tail -10` → ≥18 passed

- [ ] **验收 4: 后端 cargo test（WMS + TMS 跨模块）**
Run: `cargo test -p topems-wms --test cross_module_integration_tests 2>&1 | tail -5 && cargo test -p topems-tms --test cross_module_integration_tests 2>&1 | tail -5` → ≥18 passed total

- [ ] **验收 5: 全量回归** — 确保 V198/V199 测试不被破坏
Run: `cargo test -p topems-wms -p topems-tms -p topems-qms 2>&1 | grep "test result:" | tail -10` → 全 ok

- [ ] **Step 6: TODO.md 新增 V200 章节**
格式对标 V198/V199：五重验收表 + 6 场景说明 + 交付物统计 + 文件清单。
