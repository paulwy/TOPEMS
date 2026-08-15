# ERP 模块技术文档

## 1. 概述

ERP（企业资源计划）模块是 TOPEMS 平台经营管理域的核心服务，覆盖资产管理、凭证管理、物料管理、采购销售、合并报表、办公行政等业务场景。后端服务位于 `svc/erp/`，前端页面位于 `apps/web/src/pages/erp/`，API 客户端位于 `apps/web/src/api/erp/`。

### 1.1 功能定位

| 功能类别 | 功能描述 |
|----------|----------|
| 资产管理 | 固定资产登记、折旧计算、资产盘点 |
| 凭证管理 | 会计凭证录入、审核、过账 |
| 物料管理 | 物料主数据、库存查询、出入库记录 |
| 采购销售 | 采购订单、销售订单、供应商/客户管理 |
| 合并报表 | 合并范围、抵销规则、内部交易、合并计算 |
| 办公行政 |办公用品、会议室、车辆、公告管理 |
| 主数据引用 | 通过 `erp_master_data_refs` 表引用 MDM 主数据 `[Data-backed]` |

### 1.2 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                      ERP 模块架构                            │
├─────────────────────────────────────────────────────────────┤
│  前端层 (React + TypeScript)                                │
│  ├── pages/erp/                  # 24 条路由对应页面         │
│  └── modules/erp/config.ts       # 路由 + 导航配置           │
│      ├── source: core            # 核心模块                  │
│      ├── suite: enterprise       # 企业管理组                │
│      └── order: 11               # 导航排序                  │
├─────────────────────────────────────────────────────────────┤
│  API 层 (TypeScript)                                        │
│  └── api/erp/index.ts            # 统一 API 客户端入口       │
│      ├── purchaseOrder / salesOrder / inventory / material   │
│      ├── supplier / customer / productionOrder              │
│      ├── asset / fixedAsset / audit / dict                  │
│      ├── consolidation / openingBalance                     │
│      ├── finance 子域: voucher / receivablePayable /         │
│      │   asset / budget / accounting / report / bank        │
│      └── admin 子域: officeSupplies / meeting / vehicle      │
├─────────────────────────────────────────────────────────────┤
│  后端服务 (Rust + PostgreSQL, svc/erp/)                     │
│  ├── main.rs                     # 端口 8010, api_prefix     │
│  │                               # /api/erp                  │
│  ├── modules/                    # 30+ 业务子模块            │
│  │   ├── consolidation/          # 合并报表(8文件)           │
│  │   ├── asset / fixed_asset / inventory / material          │
│  │   ├── purchase_order / sales_order / production_order     │
│  │   ├── supplier / customer / dict                           │
│  │   ├── meeting_room / office_supplies / vehicles           │
│  │   ├── dashboard / search / health                         │
│  │   └── erp_plugin / openapi                                │
│  ├── models/                     # 14 个数据模型             │
│  ├── sagas/                      # Saga 协调                 │
│  │   ├── purchase_order_processing                           │
│  │   └── sales_order_fulfillment                             │
│  ├── services/                                              │
│  │   ├── erp_adapter/            # 外部 ERP 适配器           │
│  │   │   ├── kingdee_adapter    # 金蝶                       │
│  │   │   ├── yonyou_adapter     # 用友                       │
│  │   │   └── sap_adapter        # SAP                        │
│  │   ├── iam_client / mdm_event_service                      │
│  └── shared/permission.rs                                    │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 服务配置

| 配置项 | 值 | 来源 |
|--------|-----|------|
| 服务端口 | 8010 | `architecture/ports.md` `[Data-backed]` |
| API 前缀 | `/api/erp` | `svc/erp/src/main.rs:57` `[Data-backed]` |
| 旧版前缀 | `/api/v1/erp` | 兼容保留 `[Data-backed]` |
| 环境变量 | `ERP_PORT` | `ports.md` `[Data-backed]` |
| 最大数据库连接 | 20 | `main.rs` `[Data-backed]` |
| 事件系统 | 启用 | `main.rs` `[Data-backed]` |
| 跨服务客户端 | Notification(8000) / HRM(8020) / Finance(8011) | `main.rs` `[Data-backed]` |
| 加密服务 | `topems_shared::init_encryption_from_env` | `main.rs` `[Data-backed]` |
| 插件类型 | system | `plugin.yaml` `[Data-backed]` |

---

## 2. 核心功能详解

### 2.1 资产管理

资产管理覆盖固定资产全生命周期：登记、折旧、盘点、处置。后端模块位于 `modules/asset/` 和 `modules/fixed_asset/`，数据模型 `models/asset.rs`。Prometheus 指标 `topems_erp_asset_count` 实时反映资产总数 `[Data-backed]`。

### 2.2 凭证管理

凭证管理提供会计凭证的录入、审核、过账流程。后端模块位于 ERP 服务内（finance 子域），前端路由包括 `voucherManagement`、`receivablePayable`、`financialReport`、`accountingManagement`、`bankAccount`、`budgetManagement`、`financialAnalysis`。凭证状态 Prometheus 指标 `topems_erp_voucher_count` `[Data-backed]`。

> 财务凭证的深度逻辑（CQRS 事件存储、Saga 协调）由 Finance 服务(8011) 承载，ERP 模块通过 HTTP 客户端调用 Finance 服务获取凭证数据 `[Expert judgment]`。

### 2.3 合并报表

合并报表是 ERP 模块中最复杂的子域，后端位于 `modules/consolidation/`，包含 8 个文件：
- `scopes` — 合并范围定义
- `scope_companies` — 合并主体
- `elimination_rules` — 抵销规则
- `internal_transactions` — 内部交易
- `reports` — 合并报告生成
- `consolidation_calc` — 合并计算引擎

前端路由 `consolidation` 和 `consolidationReports` 提供合并报表的配置和查看界面。

### 2.4 采购与销售

采购和销售通过 Saga 模式协调跨服务流程：
- `sagas/purchase_order_processing` — 采购订单处理 Saga
- `sagas/sales_order_fulfillment` — 销售订单履约 Saga

前端路由 `purchaseOrder`、`salesOrder` 分别对应采购和销售管理界面。前端 `config.ts` 中标注了跨模块引用：supplier 关联 SCM/SRM，inventory 关联 WMS，purchaseOrder 关联 SCM/SRM `[Data-backed]`。

### 2.5 外部 ERP 适配器

`services/erp_adapter/` 提供与外部 ERP 系统的对接能力，通过工厂模式(`factory`)支持三种适配器：
- `kingdee_adapter` — 金蝶 ERP
- `yonyou_adapter` — 用友 ERP
- `sap_adapter` — SAP ERP

适配器实现统一的 `traits` 接口，运行时通过配置选择目标系统 `[Data-backed]`。

### 2.6 办公行政

办公行政模块包括办公用品管理、会议室预订、车辆管理、公告发布，后端分别位于 `modules/office_supplies/`、`modules/meeting_room/`、`modules/vehicles/`、`modules/announcement/`。

---

## 3. 前端路由与导航

ERP 模块共 24 条前端路由，按 6 个分组组织 `[Data-backed]`：

| 分组 | 路由 | 说明 |
|------|------|------|
| overview | dashboard | 仪表盘 |
| business | voucherManagement, customerManagement, supplierManagement, inventoryManagement, materialManagement, purchaseOrder, salesOrder | 核心业务 |
| master | dictManagement, databaseManagement | 主数据管理 |
| process | vehicleRequest, meetingRoom, announcement | 流程审批 |
| analytics | financialReport, financialAnalysis, receivablePayable, assetManagement, budgetManagement, bankAccount, accountingManagement | 财务分析 |
| setting | auditLog, officeSupplies, vehicleManagement | 系统设置 |

默认访问权限：`erp:dashboard:read` `[Data-backed]`。

### Dashboard 统计

`ErpDashboardStats` 类型提供以下聚合指标 `[Data-backed]`：
- total_assets / active_assets — 资产总数/在用
- total_orders / pending_orders — 订单总数/待处理
- total_inventory / low_stock_items — 库存总数/低库存
- total_suppliers / active_suppliers — 供应商总数/活跃
- total_customers / active_customers — 客户总数/活跃
- total_vouchers / pending_vouchers — 凭证总数/待审核

---

## 4. Prometheus 指标

后端每 60 秒更新以下业务指标 `[Data-backed]`：

| 指标名 | 说明 |
|--------|------|
| `topems_erp_asset_count` | 资产总数 |
| `topems_erp_voucher_count` | 凭证总数 |
| `topems_erp_financial_transactions_total` | 财务交易总数 |
| `topems_erp_active_users` | 活跃用户数 |
| `topems_erp_api_requests_total` | API 请求总数 |

---

## 5. 权限定义

`plugin.yaml` 定义的权限资源类型 `[Data-backed]`：

| resource_type | 支持动作 | 说明 |
|---------------|---------|------|
| asset | read, write, delete | 资产管理 |
| fixed_asset | read, write, delete | 固定资产 |
| finance | read, write | 财务基础 |
| voucher | read, write, delete, approve | 凭证(含审批) |
| bank | read, write | 银行账户 |
| dict | read, write | 字典管理 |
| vehicle | read, write, delete | 车辆管理 |
| meeting_room | read, write, delete | 会议室 |
| office_supplies | read, write, delete | 办公用品 |
| project_contract | read, write | 项目合同 |
| project_budget | read, write | 项目预算 |

---

## 6. 相关文档

- [ERP API 文档](../../api/API_ERP.md)
- [ERP 用户手册](../../user-guide/modules/erp.md)
- [系统架构总览](../../architecture/overview.md)
- [标准端口分配](../../architecture/ports.md)
- [外部 ERP 适配器设计](../../architecture/code-wiki.md)
