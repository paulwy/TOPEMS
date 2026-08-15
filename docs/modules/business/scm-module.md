# SCM 模块技术文档

## 1. 概述

SCM（供应链管理）模块是 TOPEMS 平台供应链域的核心服务，覆盖供应商管理、采购执行、物料需求计划(MRP)、供应商评估、到货检验、价格比对等业务场景。后端服务位于 `svc/scm/`，前端页面位于 `apps/web/src/pages/scm/`，API 客户端位于 `apps/web/src/api/scm/`。

### 1.1 功能定位

| 功能类别 | 功能描述 |
|----------|----------|
| 供应商管理 | 供应商准入、资质管理、分级评价 |
| 采购执行 | 采购申请、采购订单、采购合同、到货预约 |
| 物料需求计划 | MRP 计算、采购建议生成、库存周转分析 |
| 到货检验 | 来料检验、检验记录管理 |
| 价格比对 | 多供应商报价对比、历史价格趋势 |
| 供应商评估 | 评估指标体系、评分模型 |
| 供应链看板 | 供应链全景指标仪表盘 |
| 数据同步 | MDM 主数据事件同步 |

### 1.2 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                      SCM 模块架构                            │
├─────────────────────────────────────────────────────────────┤
│  前端层 (React + TypeScript)                                │
│  ├── pages/scm/                  # 18 条路由对应页面         │
│  └── modules/scm/config.ts                                   │
│      ├── source: core            # 核心模块                  │
│      ├── suite: supply           # 供应链组                  │
│      └── order: 10                                           │
├─────────────────────────────────────────────────────────────┤
│  API 层 (TypeScript)                                        │
│  └── api/scm/index.ts           # 17 个子 API 聚合          │
│      ├── supplier / supplierAdmission / supplierEvaluation  │
│      ├── purchaseOrder / purchaseRequisition / purchaseItem │
│      ├── purchaseContract / deliveryAppointment             │
│      ├── mrpPlan / mrpSuggestion                            │
│      ├── incomingInspection / inspectionRecord              │
│      ├── inventoryTurnover / priceComparison                │
│      ├── supplyChainDashboard                               │
│      └── syncRecord / auditLog                              │
├─────────────────────────────────────────────────────────────┤
│  后端服务 (Rust + PostgreSQL, svc/scm/)                     │
│  ├── main.rs / lib.rs            # 端口 8040, api_prefix     │
│  │                               # /api/scm (lib+bin 分离)  │
│  ├── modules/                    # 17 个业务模块             │
│  │   ├── supplier                # 供应商管理                │
│  │   ├── supplier_admission      # 供应商准入                │
│  │   ├── supplier_evaluation     # 供应商评估                │
│  │   ├── supplier_delivery_appointment  # 到货预约           │
│  │   ├── purchase_requisition    # 采购申请                  │
│  │   ├── purchase_order          # 采购订单                  │
│  │   ├── purchase_item           # 采购明细                  │
│  │   ├── purchase_contract       # 采购合同                  │
│  │   ├── mrp                     # 物料需求计划              │
│  │   ├── evaluation_logic        # 评估逻辑                  │
│  │   ├── incoming_inspection     # 到货检验                  │
│  │   ├── inventory_turnover      # 库存周转                  │
│  │   ├── price_comparison        # 价格比对                  │
│  │   ├── supply_chain_dashboard  # 供应链看板                │
│  │   ├── data_sync               # 数据同步                  │
│  │   ├── audit / openapi / scm_plugin                        │
│  ├── models/                     # 10 个数据模型             │
│  ├── services/                                              │
│  │   └── mdm_event_service       # MDM 事件服务              │
│  └── shared/                                                │
│      ├── cache                   # 三级 InMemoryCache        │
│      └── permission                                        │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 服务配置

| 配置项 | 值 | 来源 |
|--------|-----|------|
| 服务端口 | 8040 | `architecture/ports.md` `[Data-backed]` |
| API 前缀 | `/api/scm` | `svc/scm/src/main.rs` `[Data-backed]` |
| 旧版前缀 | `/api/v1/scm` | 兼容保留 `[Data-backed]` |
| 环境变量 | `SCM_PORT` | `ports.md` `[Data-backed]` |
| 最大数据库连接 | 50 | 28 服务中最高 `[Data-backed]` |
| 事件系统 | 启用 | `main.rs` `[Data-backed]` |
| Redis 缓存 | 可选 (`REDIS_URL`, max 20 连接) | `main.rs` `[Data-backed]` |
| 请求超时 | 30 秒 (返回 408) | `main.rs` `[Data-backed]` |
| 数据库 SEARCH_PATH | `scm, public, shared` | `main.rs` `[Data-backed]` |
| 插件类型 | business | `plugin.yaml` `[Data-backed]` |
| 架构模式 | lib + bin 分离 | `main.rs` 引用 `topems_scm::modules` `[Data-backed]` |

---

## 2. 核心功能详解

### 2.1 供应商管理

供应商管理覆盖供应商全生命周期：准入申请 → 资质审核 → 分级评定 → 持续评估 → 淘汰退出。

- `modules/supplier` — 供应商基础信息 CRUD
- `modules/supplier_admission` — 准入流程管理
- `modules/supplier_evaluation` — 评估指标与评分
- `modules/evaluation_logic` — 评估计算引擎（含 `evaluation_logic_tests.rs` 单元测试 `[Data-backed]`）

前端路由 `suppliers`、`supplierAdmission`、`supplierEvaluation` 分别对应供应商列表、准入管理、评估管理界面。

### 2.2 采购执行

采购流程按「申请 → 订单 → 合同 → 到货」四阶段组织：

| 阶段 | 后端模块 | 前端路由 |
|------|---------|---------|
| 采购申请 | `purchase_requisition` | purchaseRequisition |
| 采购订单 | `purchase_order` | purchaseOrders |
| 采购明细 | `purchase_item` | purchaseItems |
| 采购合同 | `purchase_contract` | purchaseContract / contracts |
| 到货预约 | `supplier_delivery_appointment` | deliveryAppointment |

### 2.3 物料需求计划(MRP)

`modules/mrp` 提供 MRP 计算能力，根据需求、库存、提前期等因素生成采购建议。包含 `mrp_logic_tests.rs` 单元测试 `[Data-backed]`。

前端路由 `mrpPlan`（MRP 计划）和 `mrpSuggestion`（采购建议）提供 MRP 结果的查看和管理界面。

### 2.4 到货检验

`modules/incoming_inspection` 管理来料检验流程，检验记录通过 `models/purchase_item.rs` 关联采购明细。前端路由对应 `incomingInspection` 和 `inspectionRecord`（通过 API `inspectionRecord` 子模块访问）。

### 2.5 价格比对

`modules/price_comparison` 提供多供应商报价对比功能，数据模型 `models/price_comparison.rs`。前端路由 `priceComparison` 展示比对结果。

### 2.6 库存周转分析

`modules/inventory_turnover` 计算库存周转率，为供应链优化提供数据支撑。前端路由 `inventoryTurnover` 展示分析结果。

---

## 3. 缓存策略

SCM 模块采用三级 InMemoryCache 策略 `[Data-backed]`，可选叠加 Redis 缓存：

| 缓存层 | TTL | 适用场景 |
|--------|-----|---------|
| supplier 缓存 | 300 秒 | 供应商基础信息 |
| purchase 缓存 | 120 秒 | 采购订单/明细 |
| dict 缓存 | 600 秒 | 字典/配置数据 |

Redis 缓存通过 `REDIS_URL` 环境变量启用，最大 20 连接 `[Data-backed]`。当 Redis 不可用时自动降级到 InMemoryCache。

---

## 4. 前端路由与导航

SCM 模块共 18 条前端路由，按 6 个分组组织 `[Data-backed]`：

| 分组 | 路由 | 说明 |
|------|------|------|
| overview | dashboard, overview | 供应链看板 |
| business | purchaseOrders, purchaseRequisition, purchaseItems, deliveryAppointment | 采购执行 |
| master | suppliers, supplierAdmission, supplierEvaluation, contracts, purchaseContract | 供应商管理 |
| process | mrpPlan, mrpSuggestion | 物料需求计划 |
| analytics | inventoryTurnover, priceComparison | 分析报表 |
| setting | settingSourcingStrategy, settingQuotaTemplate, settingPurchaseThreshold, settingSupplierTier | 供应链策略配置 |

默认访问权限：`scm:module:read` `[Data-backed]`。

---

## 5. 权限定义

`plugin.yaml` 定义的权限 `[Data-backed]`：

| resource_type | 支持动作 | 说明 |
|---------------|---------|------|
| supplier | read, write, delete | 供应商管理 |
| purchase_order | read, write, approve | 采购订单(含审批) |
| purchase_item | read, write | 采购明细 |
| supplier_evaluation | read, write | 供应商评估 |

---

## 6. 跨服务协作

SCM 模块通过以下方式与其他服务协作：

| 协作对象 | 机制 | 说明 |
|---------|------|------|
| MDM 主数据 | `mdm_event_service` 事件同步 | 供应商/物料主数据变更同步 `[Data-backed]` |
| WMS 仓储 | 前端跨模块引用 | 库存数据由 WMS(8041) 管理 |
| SRM 供应商 | 前端跨模块引用 | 供应商关系由 SRM(8042) 补充 |
| unified-core | `scm_plugin::auto_register_to_core` | 启动时自动注册插件 `[Data-backed]` |

---

## 7. 相关文档

- [SCM API 文档](../../api/API_SCM.md)
- [SCM 用户手册](../../user-guide/modules/scm.md)
- [系统架构总览](../../architecture/overview.md)
- [标准端口分配](../../architecture/ports.md)
- [事件驱动架构](../../architecture/event-driven.md)
