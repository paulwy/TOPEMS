# Group D 供应链/物流/人力资源 模块组 全量5维度实测评估报告

- 评估日期：2026-09-09
- 评估范围：
  - 后端服务：`svc/scm`、`svc/srm`、`svc/wms`、`svc/tms`、`svc/hrm`
  - 前端 API 目录：`apps/web/src/api/{scm,srm,wms,tms,hrm}`
  - 前端模块配置：`apps/web/src/modules/{scm,srm,wms,tms,hrm}/config.ts`
- 实测方法：仓库内 grep/find 取证，所有数字均附 `file:line` 证据；无法取证处标注"未取证"。
- 口径说明：
  - "后端路由数" = `grep -rn "\.route(" svc/<svc>/src` 匹配行数（含多行路由的起始行）；另给出去重路径数。
  - "前端 API 方法数" = `grep -rn "apiClient\." apps/web/src/api/<dir>` 匹配行数（含 `__tests__`，下钻表排除测试）。
  - "页面消费" = 在 `apps/web/src` 中统计 barrel 键（如 `scmApi.xxx`）与命名导入（如 `xxxApi`）的使用；跨模块同名符号已按模块隔离复核。

---

## 1. 模块×5维总览表

| 模块 | 后端路由数 (唯一路径) | 前端API方法数 | 页面消费概览 | D1 前后端完整度 | D2 前后端API对应 | D3 菜单前后端覆盖 | D4 设置合理性 | D5 冗余判定 |
|---|---|---|---|---|---|---|---|---|
| **scm** | 84 (82) | 134 | 15/17 子API组被消费 | **部分**：主体完整，2 组预埋悬空（syncRecord/inspectionRecord），1 处真实路径错位（abc-classification） | **部分**：大部分对应；`/inventory-turnover/abc-classification`≠后端`/abc-analysis`（真实缺口）；`/sync-records`≠后端`/sync/sync-logs`（预埋+错位）；`/inspection-records`后端无路由（预埋） | **部分**：19 项菜单全部有页面；但 4 个设置菜单指向纯占位页 | **不合理**：4 个设置页无后端接口/表，纯模板占位 | **高**：MRP 双路由组+双前端文件；price_comparison 绝对路径重复注册；与 srm 双 supplier/purchase-order |
| **srm** | 76 (74) | 159 | 高（index.ts 65 个函数几乎全被消费） | **完整**：业务面广且消费充分 | **部分-高风险**：supplier.rs 绝对路径 `/api/srm/suppliers*` 与整体 nest `/api/srm` 叠加，实际可达路径疑似 `/api/srm/api/srm/suppliers`，前端调 `/api/srm/suppliers`（路径错位风险，需运行时验证）；其余模块相对路径正常 | **完整**：16 项菜单均有页面且 API 真实 | **无设置项**（不适用） | **中**：与 scm 重复 supplier 主数据、purchase-orders、data_sync 双向同步；供应商 CRUD 存在绝对/相对两套路径风格 |
| **wms** | 136 (131) | 295 | 15 个 barrel 键消费；**≥12 个页面使用 mock 数据** | **缺口**：后端模块最全（136 路由）但前端 12 个文件预埋悬空（putaway/manifest/wavePick/kitting/labor/picking/discrepancy/inventoryMovement/smartReplenishment/sync/audit），且 12 个页面假数据 | **部分**：2 处真实缺口（slotting 被 LocationRulePage 消费但后端无路由；cycle-counts 被 InventoryCyclePage 消费但后端注册被注释）；putaway/manifest/slotting/kitting/labor/picking 后端无路由；/alerts 与 /inventory-alerts 双套并存 | **部分**：34 项路由均有页面，但多个详情页/分析页为 mock 假数据，菜单指向"看起来存在实则无后端"的功能 | **不合理**：4 设置页中 2 个真实缺口（LocationRule/InventoryCycle）、1 个占位（FifoPolicy）、1 个可用（InventoryThreshold） | **严重**：双 transfer 实现（transfer.rs 死代码）、cycle_count/discrepancy 死模块（文件在注册被注释）、/alerts+/inventory-alerts 双告警、前端 mock 与真实 API 并存 |
| **tms** | 30 (30) | 43 | 8 个 tmsApi 键被页面消费；3 个优化接口预埋 | **部分**：核心 CRUD 完整；优化类接口预埋悬空 | **完整**：前端 URL 与后端路由一一对应 | **部分**：18 项菜单有页面；TransportPlanDetailPage 无任何 API 数据源（半成品页） | **无设置项**（不适用） | **低**：无明显重复；`/routes/optimize`、`/assignments/plan`、`/freight/quote` 三接口后端有、页面无消费 |
| **hrm** | 84 (84) | 147 | 28+ 页面文件消费；hrmSetup 预埋 | **部分**：主体完整；setup 系列预埋+路径错位；部分后端路由无前端消费（payroll-details/payroll-slips/generate-voucher） | **部分**：大部分对应；`/hrm/setup/*` 后端与 `/api/hrm` 前缀叠加疑似双前缀（`/api/hrm/hrm/setup/*`），前端调 `/api/hrm/setup/*`（预埋+错位） | **部分**：25 项菜单有页面；4 个设置菜单指向纯占位页 | **不合理**：4 个设置页无后端接口/表，纯模板占位；hrmSetup 预埋且路径错位 | **低-中**：无重大重复；`/health` 与标准路由并存 |

---

## 2. 逐模块详细评估卡

### 2.1 scm（供应链管理，svc/scm）

#### 后端路由（84 处 `.route(`，82 个唯一路径）
主要注册文件：
- `svc/scm/src/main.rs:126-127` — `/api/plugins/info`、`/api/plugins/health`（public）
- `svc/scm/src/modules/purchase_contract.rs:20-38` — `/purchase-contracts` CRUD + submit/approve/reject/cancel/renew/terminate
- `svc/scm/src/modules/purchase_order.rs:24-30` — `/purchase-orders` CRUD + approve/reject
- `svc/scm/src/modules/purchase_requisition.rs:21-39` — `/purchase-requisitions` CRUD + submit/approve/reject/cancel/convert-to-order
- `svc/scm/src/modules/supplier.rs:110` — `/suppliers` CRUD
- `svc/scm/src/modules/audit.rs:30-31` — `/audit-logs`、`/audit-logs/{id}`
- `svc/scm/src/modules/data_sync.rs:72-86` — `/sync/*` 8 条
- `svc/scm/src/modules/supplier_delivery_appointment.rs:303-333` — `/delivery-appointments` 系列
- `svc/scm/src/modules/mrp.rs:143-150` — **双套**：`/mrp/suggestions` 与 `/mrp-suggestions`（同一 handler `list_suggestions`）
- `svc/scm/src/modules/inventory_turnover.rs:212-215` — `/inventory-turnover`、`/days`、**`/abc-analysis`**、`/trend`
- `svc/scm/src/modules/incoming_inspection.rs:172-183` — `/incoming-notices`、`/incoming-inspections` + pass/fail
- `svc/scm/src/modules/price_comparison.rs:343-352` — **绝对路径（绕过前缀）**：`/api/inquiries/{id}/publish`、`/api/quotes/{id}`、`/api/comparisons/{id}`、`/api/comparisons/{id}/approve`
- 前缀挂载：`main.rs:39` `api_prefix: "/api/scm"`，`legacy_prefixes: ["/api/v1/scm"]`；`lib/shared-core/src/api_version.rs:96-110` 将 protected 路由整体 nest 于前缀下

#### 前端 API（134 处 `apiClient.`，含测试；下钻排除测试）
| 文件 | 方法数 | 文件 | 方法数 |
|---|---|---|---|
| purchaseContract.ts | 11 | deliveryAppointment.ts | 11 |
| supplierAdmission.ts | 10 | purchaseRequisition.ts | 10 |
| purchaseOrder.ts | 9 | priceComparison.ts | 8 |
| syncRecord.ts | 7 | incomingInspection.ts | 7 |
| mrpPlan.ts | 6 | supplierEvaluation.ts | 5 |
| supplier.ts | 5 | inspectionRecord.ts | 5 |
| factory.ts | 5 | purchaseItem.ts | 4 |
| inventoryTurnover.ts | 4 | supplyChainDashboard.ts | 3 |
| mrpSuggestion.ts | 3 | auditLog.ts | 2 |
| index.ts | 1 | | |

#### 页面消费清单（barrel 键 `scmApi.*` 使用次数，排除测试）
- 消费：suppliers(9)、purchaseContracts(8)、deliveryAppointments(7)、purchaseRequisitions(6)、purchaseOrders(6)、supplierAdmissions(5)、purchaseItems(3)、mrpPlans(3)、priceComparisons(2)、mrpSuggestions(2)、inventoryTurnover(2)、auditLogs(2)、supplyChainDashboard(1)、incomingInspections(1)、evaluations(1)、health(1)
- 消费页面：`pages/scm/*` 16 个页面 + `pages/wms/SupplierManagementPage.tsx`、`pages/wms/SupplierDetailPage.tsx`（跨模块消费 scm 供应商）
- **未消费（预埋悬空）**：`syncRecords`（0 处；`syncRecordApi` 的 20 处引用经复核全部属于 `api/lims`，非 scm）、`inspectionRecords`（0 处）

#### 菜单覆盖（`modules/scm/config.ts`）
- `SCM_PATHS`（config.ts:181-199）19 个路径：dashboard/purchase-orders/purchase-requisition/purchase-items/suppliers/supplier-admission/supplier-evaluation/contracts/delivery-appointment/mrp-plan/mrp-suggestion/overview/inventory-turnover/price-comparison/purchase-contract + 4 个设置页
- 双导航段（config.ts:209-471 与 493-708）均引用同一组路径；所有菜单路径均存在对应页面 → 无"菜单指向不存在页面"，但 4 个设置页无后端支撑（见下）

#### 设置项检查（D4）
- 4 个设置页：`pages/scm/setting/{SourcingStrategy,QuotaTemplate,PurchaseThreshold,SupplierTier}Page.tsx`
- 3 个页面 import 仅含 `SettingsPageTemplate`/`PageContainer`/`i18n`，**无任何 API/状态/localStorage**（`PurchaseThresholdPage.tsx:1-6` 等）
- 后端 scm 检索 `sourcing-strategy|quota-template|purchase-threshold|supplier-tier` → **0 命中**（无路由、无表、无模型）
- 结论：**设置项无实际作用，纯占位页**（挂菜单、不接后端）

#### 冗余发现（D5）
1. **MRP 双实现**：后端 `mrp.rs:143-150` 同时注册 `/mrp/suggestions` 与 `/mrp-suggestions`（同一 handler）；前端 `mrpPlan.ts`（6 方法，走 `/mrp/suggestions`）与 `mrpSuggestion.ts`（3 方法，走 `/mrp-suggestions`）并存，功能重叠。
2. **绝对路径重复注册**：`price_comparison.rs:343-352` 以 `/api/inquiries|quotes|comparisons` 绝对路径注册，与 `inquiry.rs`/`quotation.rs`/`comparison` 的相对路径注册形成同一能力两套 URL。
3. **与 srm 边界模糊**：scm 有 `/suppliers` CRUD（supplier.rs:110）+ `/supplier-admissions`；srm 有 `/api/srm/suppliers*` CRUD+审批。两服务同时持有供应商主数据，靠 `data_sync.rs` 双向同步（scm `/sync/supplier-from-srm`、srm `/sync/supplier-to-scm`），主数据归属不清。
4. **采购订单双实现**：scm `purchase_order.rs` 与 srm `purchase_order.rs` 均提供 `/purchase-orders` CRUD。

#### 真实缺口/预埋清单（scm）
| 类型 | 内容 | 证据 |
|---|---|---|
| 真实缺口（路径错位） | 前端 `inventoryTurnover.ts:26` 调 `/inventory-turnover/abc-classification`，后端为 `/inventory-turnover/abc-analysis`（inventory_turnover.rs:214）；`scmApi.inventoryTurnover` 有 2 处消费 | 前端 404 |
| 真实缺口（子路由缺失） | 前端 `incomingInspection.ts` 调 `/incoming-inspections/{inspectionId}/records`，后端无该子路由（incoming_inspection.rs:172-183 仅有 pass/fail） | 前端 404 |
| 预埋悬空（有封装无消费） | `syncRecord.ts`（7 方法，调 `/sync-records`、`/sync/srm/*`、`/sync/wms/*`）0 处页面消费，且路径与后端 `/sync/sync-logs`、`/sync/supplier-from-srm` 不匹配 | 预埋+错位 |
| 预埋悬空（有封装无消费） | `inspectionRecord.ts`（5 方法，调 `/inspection-records`）0 处页面消费，后端无此路由 | 预埋 |

---

### 2.2 srm（供应商关系管理，svc/srm）

#### 后端路由（76 处 `.route(`，74 个唯一路径）
- `svc/srm/src/modules/supplier.rs:63-94` — **绝对路径** `/api/srm/suppliers`、`/{id}`、`/{id}/products`、`/{id}/contracts`、`/{id}/performance`、`/{id}/approval/{start,approve,reject}`
- `svc/srm/src/modules/purchase_order.rs:39-44` — `/purchase-orders` CRUD
- `svc/srm/src/modules/inquiry.rs:35-41` — `/inquiries` CRUD + publish/close
- `svc/srm/src/modules/quotation.rs:31-39` — `/quotations` CRUD + award/reject
- `svc/srm/src/modules/bid_price.rs:60-78` — `/bid-requests`、`/biddings`、`/bids/{id}`、`/bid-comparisons/{request_id}`
- `svc/srm/src/modules/supplier_category.rs:39-43`、`supplier_product.rs` — 品类/产品 CRUD
- `svc/srm/src/modules/supplier_contract.rs:40-50` — `/supplier-contracts` CRUD + terms
- `svc/srm/src/modules/supplier_evaluation.rs:60` — `/supplier-evaluations` + `/suppliers/{id}/score-trend`
- `svc/srm/src/modules/supplier_performance.rs:52-57` — `/performance/*` 5 条
- `svc/srm/src/modules/supplier_portal.rs:26-42` — `/supplier-portal/*` + `/supplier-portal/announcements`
- `svc/srm/src/modules/data_sync.rs:54-61` — `/sync/*` 5 条
- `svc/srm/src/modules/tender.rs`、`statistics.rs:167`（`/suppliers-with-stats`）、`scoring_dimension.rs`
- 前缀挂载：`main.rs:43` `api_prefix: "/api/srm"`；protected_routes（main.rs:101-123）包含 supplier 绝对路径路由

#### 前端 API（159 处 `apiClient.`）
- `index.ts`（65 方法，扁平函数式：listSuppliers/getSupplier/listPurchaseOrders/getStatistics/listPerformanceReports 等）+ `bidPrice.ts`(11) + `tender.ts`(9) + `supplierProduct.ts`(6) + `supplierCategory.ts`(6)

#### 页面消费清单
- 消费页面：`pages/srm/*` 18 个页面 + `pages/shared/DashboardPage.tsx`、`pages/shared/hooks/UseDashboardData.tsx`、`modules/srm/config.ts`
- 消费函数示例：listPurchaseOrders(5)、createPurchaseOrder(5)、listSuppliers(4)、listQuotations(4)、listContracts(4)、createContract(4)、updateContract(3)、awardQuotation(3)、getPerformanceReports(3)、getStatistics(3)、listScoringDimensions(3) 等；supplier-portal 系列 1×
- 整体消费充分，无整文件悬空

#### 菜单覆盖（`modules/srm/config.ts`）
- `SRM_PATHS`（config.ts:84）16 项：dashboard/supplier/category/product/contract/order/evaluation/performance/scoringDimension/inquiry/bidding/finance/portal/quotation + 2 个详情隐藏路由
- 全部指向存在页面；finance 为组合页（`SrmFinancePage.tsx:34-35` 用 listContracts+listPurchaseOrders 聚合，无独立 finance API）→ 合理

#### 设置项检查（D4）
- srm 菜单无设置项；后端无 settings/config 接口 → 不适用（无违规）

#### 冗余发现（D5）
1. **供应商绝对/相对路径两套风格**：supplier.rs 用 `/api/srm/...` 绝对路径，其余模块用相对路径（如 `/inquiries`）。绝对路径被整体 nest 后实际可达路径为 `/api/srm/api/srm/suppliers*`（`api_version.rs:96-110` 的 nest 行为），而前端 `api/srm/index.ts:517` 调 `/suppliers` → `/api/srm/suppliers` → **与后端注册不一致（高度疑似路径错位/真实缺口，需运行时验证确认网关是否改写）**。
2. **与 scm 重复能力**：供应商主数据、采购订单、数据同步（scm↔srm 双向）三处重复（详见 scm D5）。

#### 真实缺口/预埋清单（srm）
| 类型 | 内容 | 证据 |
|---|---|---|
| 疑似真实缺口（路径错位） | 前端供应商 CRUD 调 `/api/srm/suppliers`；后端注册为绝对路径 `/api/srm/suppliers` 且被 nest 于 `/api/srm` 下（最终 `/api/srm/api/srm/suppliers`） | supplier.rs:63-94 + api_version.rs:96-110 + api/srm/index.ts:516-532；标注：需运行时验证 |

---

### 2.3 wms（仓储管理，svc/wms）— 本组重灾区

#### 后端路由（136 处 `.route(`，131 个唯一路径）
- 已注册模块（`modules/mod.rs:62-78`）：warehouse、batch、location、serial_number、transfer_order、inventory、inventory_alert、inventory_movement、inbound_order、outbound_order、stock_take、smart_replenishment、wave_pick、audit、data_sync
- **被注释未注册（死模块）**：`mod.rs:14-15` `// pub mod cycle_count; // pub mod discrepancy;`；`mod.rs:75-76` `// .merge(cycle_count::create_routes()) // .merge(discrepancy::create_routes())` —— 但 `cycle_count.rs:34-45`、`discrepancy.rs:35-42` 的路由代码仍存在
- **双 transfer 实现**：`transfer_order.rs:26-43`（已注册 `/transfers` 全套）与 `transfer.rs:38-49`（同样定义 `/transfers` CRUD，**未被 mod.rs 注册 → 死代码**）
- **双告警体系**：`inventory_alert.rs:90-95` 注册 `/alerts*`（list/get/acknowledge/statistics/summary/by-warehouse），同文件另注册 `/inventory-alerts*` 系列（rules/records/statistics）→ 同一能力两套 URL
- `wms_compat.rs` 仅 OpenAPI 文档条目（文件头注释：`OpenAPI-only contract entries`），不注册路由，未被 mod.rs 声明
- 前缀挂载：`main.rs:35` `api_prefix: "/api/wms"`

#### 前端 API（295 处 `apiClient.`，5 模块中最大）
| 文件 | 方法数 | 文件 | 方法数 |
|---|---|---|---|
| smartReplenishment.ts | 23 | inventory.ts | 20 |
| putaway.ts | 18 | manifest.ts | 18 |
| inventoryAlert.ts | 18 | replenishment.ts | 17 |
| picking.ts | 16 | stocktake.ts | 14 |
| outbound.ts | 14 | index.ts | 12 |
| inbound.ts | 12 | serialNumber.ts | 11 |
| wavePick.ts | 10 | transfer.ts | 10 |
| slotting.ts | 10 | batch.ts | 10 |
| sync.ts | 9 | location.ts | 9 |
| kitting.ts | 9 | labor.ts | 7 |
| cycleCount.ts | 7 | inventoryMovement.ts | 6 |
| discrepancy.ts | 6 | warehouse.ts | 5 |
| audit.ts | 3 | dashboard.ts | 1 |
| mock.ts / mockData.ts | 测试/假数据 | | |

#### 页面消费清单（barrel 键 `wmsApi.*` 使用次数，排除测试）
- 消费（15 键）：inboundOrders(14)、warehouses(13)、stockTakes(12)、outboundOrders(12)、smartReplenishment(10，映射 `replenishment.ts`)、transfers(6)、inventoryStats(4)、locations(3)、serialNumbers(2)、inventory(2)、slotting(1，LocationRulePage)、inventoryAlerts(1)、inventoryAlert(1)、cycleCounts(1，InventoryCyclePage)、batches(1)
- **未消费（预埋悬空）**：discrepancies(0)、wavePicks(0)、syncRecords/sync(0)、auditLogs(0)、inventoryMovements(0)、advancedReplenishment(0，`smartReplenishment.ts`)、kitting(0)、labor(0)、picking(0)、putaway(0)、manifests(0)
- **12 个页面使用 `useWmsMock` 假数据**（`api/wms/mockData.ts:825` 种子 RNG 生成器，无后端调用）：
  - 详情页：`WmsInboundDetailPage.tsx`、`WmsOutboundDetailPage.tsx`、`WmsTransferDetailPage.tsx`、`WmsStockTakeDetailPage.tsx`、`WmsWavePickDetailPage.tsx:48`、`WmsInventoryMovementDetailPage.tsx:5`
  - 分析页：`analytics/WmsInventoryTurnoverPage.tsx`、`WmsAgeParetoPage.tsx`、`WmsFlowTrendPage.tsx`、`WmsAbcAnalysisPage.tsx`、`WmsLocationUtilizationPage.tsx`、`WmsOrderFulfillmentPage.tsx`

#### 菜单覆盖（`modules/wms/config.ts`）
- `WMS_PATHS`（config.ts:44）34 项，全部存在页面文件；但其中多个页面为 mock/占位（见上）→ **菜单指向"有页面无真实后端"的功能**
- 菜单含 `settingLocationRule`/`settingFifoPolicy`/`settingInventoryCycle`/`settingInventoryThreshold` 4 个设置入口

#### 设置项检查（D4）
| 设置页 | 数据源 | 后端支撑 | 结论 |
|---|---|---|---|
| `setting/LocationRulePage.tsx:14` | `wmsApi.slotting.listRules()` → `/slotting/rules` | 后端无 slotting 模块/路由 | **真实缺口** |
| `setting/InventoryCyclePage.tsx:14` | `wmsApi.cycleCounts.listConfigs()` → `/cycle-counts` | `cycle_count.rs` 存在但 mod.rs 注册被注释 | **真实缺口**（路由未生效） |
| `setting/InventoryThresholdPage.tsx:14` | `wmsApi.inventoryAlert.listAlertRules()` → `/inventory-alerts/rules` | 后端有 `/inventory-alerts/rules`（inventory_alert.rs） | 可用 |
| `setting/FifoPolicyPage.tsx` | 无任何 API | 后端无 FIFO 策略接口 | 纯占位 |

#### 冗余发现（D5）
1. **悬空前端模块（有封装+类型，无后端、无页面）**：putaway（注释声称后端 `modules/putaway.rs`，该文件不存在）、manifest、slotting（部分）、kitting、labor、picking、discrepancy、inventoryMovement、smartReplenishment.ts —— 其中 putaway/manifest/kitting/labor/picking/slotting 后端连路由都没有（`svc/wms/src/modules/` 无对应模块文件），是"前端预埋了整套未来功能"。
2. **死后端模块**：`cycle_count.rs`、`discrepancy.rs` 路由代码在但注册被注释（mod.rs:14-15,75-76）；`transfer.rs` 与 `transfer_order.rs` 双实现且 transfer.rs 未注册。
3. **双告警体系**：`/alerts*` 与 `/inventory-alerts*`（inventory_alert.rs:90-95 及同文件后续）功能重叠。
4. **mock 与真实 API 并存**：12 页面消费 `useWmsMock` 假数据（mockData.ts），与真实 API 封装并存，容易造成"看似有功能实则假数据"。
5. **scm↔wms 同步链**：scm `/sync/purchase-to-inbound`（data_sync.rs:72）↔ wms `/sync/inbound-from-scm`（data_sync.rs:54），跨服务耦合。

#### 真实缺口/预埋清单（wms）
| 类型 | 内容 | 证据 |
|---|---|---|
| 真实缺口 | LocationRulePage 消费 `/slotting/rules`，后端无 slotting 路由 | LocationRulePage.tsx:14 + 后端 grep 0 命中 |
| 真实缺口 | InventoryCyclePage 消费 `/cycle-counts`，后端注册被注释 | InventoryCyclePage.tsx:14 + mod.rs:14,75 |
| 预埋悬空（前端有、后端无路由） | putaway/manifest/slotting/kitting/labor/picking | 各前端文件 + 后端 grep 0 命中 |
| 预埋悬空（前端有、后端有但未注册） | cycleCount.ts、discrepancy.ts | mod.rs 注释 |
| 预埋悬空（前端有、后端有、页面无消费） | wavePick.ts、inventoryMovement.ts、sync.ts、audit.ts、smartReplenishment.ts | barrel 键 0 使用 |
| 假数据 | 12 页面 mock 数据替代真实 API | mockData.ts:825 |

---

### 2.4 tms（运输管理，svc/tms）— 本组最健康

#### 后端路由（30 处 `.route(`，30 个唯一路径）
- `svc/tms/src/modules/`：carriers、drivers、vehicles、routes、shipments、optimization（`/assignments/plan`、`/routes/optimize`、`/freight/quote`）
- 前缀挂载：`main.rs:31` `api_prefix: "/api/tms"`

#### 前端 API（43 处 `apiClient.`）
- shipment.ts(11)、vehicle.ts(8)、driver.ts(8)、carrier.ts(8)、route.ts(5)、optimization.ts(3)

#### 页面消费清单
- 消费（`tmsApi.*`）：listShipments(3)、listCarriers(3)、dispatchShipment(3)、createShipment(3)、listVehicles(2)、listRoutes(2)、listDrivers(2)、arriveShipment(2)
- 消费页面：`pages/tms/*` 17 个页面（管理页+详情页+6 个 analytics 页，analytics 页如 `FreightCostPage.tsx:13` 导入 tmsApi）
- **未消费（预埋悬空）**：planAssignments、optimizeRoutes、quoteFreight（仅 `api/tms/index.ts:65-67` 桶内引用，0 处页面使用；后端 3 条路由存在但前端无人消费）

#### 菜单覆盖（`modules/tms/config.ts`）
- `TMS_PATHS`（config.ts:9）18 项，全部有页面；`transportPlanDetail` → `TransportPlanDetailPage.tsx` 仅 useParams+模板，**无任何 API 数据源（半成品页）**

#### 设置项检查（D4）
- 无设置菜单/设置页 → 不适用（无违规）

#### 冗余发现（D5）
- 无明显重复注册；主要问题为优化类接口预埋（后端有、页面无消费）

#### 真实缺口/预埋清单（tms）
| 类型 | 内容 | 证据 |
|---|---|---|
| 预埋悬空 | planAssignments/optimizeRoutes/quoteFreight 三接口无页面消费 | index.ts:65-67 + 0 处页面引用 |
| 半成品页 | TransportPlanDetailPage 无数据源 | TransportPlanDetailPage.tsx:8,105 |

---

### 2.5 hrm（人力资源，svc/hrm）

#### 后端路由（84 处 `.route(`，84 个唯一路径）
- 模块（`modules/mod.rs:84` 等）：attendance、leave、contract、company、department、position、employee、recruitment（candidates/interviews/job-openings）、training（courses/plans/records）、performance（goals/reviews）、payroll（runs/items/slips/details/salary-adjustments）、reports、audit、setup
- **setup 模块双前缀疑点**：`modules/setup.rs:109-114` 注册 `/hrm/setup/progress|company|departments|positions|admin|complete`；`main.rs:34` `api_prefix: "/api/hrm"`；`lib/shared-core/src/api_version.rs:96-110` 整体 nest → 实际可达 `/api/hrm/hrm/setup/*`；前端 `hrmSetup.ts:116-140` 调 `/setup/*` → `/api/hrm/setup/*` → **路径错位**（且 hrmSetup 无页面消费 → 预埋+错位）
- **无前端消费的后端路由**：`/payroll-details`、`/payroll-slips`、`/payroll-runs/{id}/generate-voucher`（全仓 grep 0 处前端调用；`HrmReportsPage.tsx:642` 仅 id 文本 'payroll-details'，非 API 调用）

#### 前端 API（147 处 `apiClient.`）
- training.ts(19)、recruitment.ts(18)、payroll.ts(15)、contract.ts(14)、employee.ts(12)、performance.ts(8)、leave.ts(7)、attendance.ts(7)、hrmSetup.ts(6)、hrmReports.ts(6)、department.ts(5)、company.ts(5)、hrmAudit.ts(2)、index.ts(1)、dashboard.ts(1)

#### 页面消费清单
- 消费页面：`pages/hrm/*` 26 个页面 + `components/hrm/{DepartmentSelector,EmployeeForm}.tsx` + `hooks/useOrganization.ts` + `pages/finance/BudgetManagementPage.tsx` + `schemas/hrm/*`
- barrel 键使用：employees(2)、attendance(2)、trainingPlans(1)、performanceReviews(1)、leave(1)、jobOpenings(1)、departments(1)、contracts(1)
- **未消费（预埋悬空）**：`hrmApi.setup`（hrmSetup.ts 6 方法，0 处页面使用；仅 `api/hrm/index.ts:60` 桶键挂载）

#### 菜单覆盖（`modules/hrm/config.ts`）
- `HRM_PATHS`（config.ts:8）25 项：dashboard/employees/employeeCreate/employeeDetail/employeeEdit/departments/organization/positions/contracts/contractDetail/company/attendance/leave/payroll/salaryAdjustment/recruitment/training/performance/reports/overview + 4 设置项
- 全部有页面；4 个设置页为占位（见下）

#### 设置项检查（D4）
- 4 个设置页 `pages/hrm/setting/{AttendanceRule,PayrollTemplate,RecruitmentFlow,TrainingPlan}Page.tsx`：import 仅 `SettingsPageTemplate`/`PageContainer`/`i18n`，**无 API/状态** → 纯占位，后端无对应接口/表
- `hrmSetup.ts` 预埋且路径错位（见上）

#### 冗余发现（D5）
- 无明显重复模块；`/health`（标准健康路由）与 `create_standard_health_routes` 并存属正常
- 跨模块：`pages/finance/BudgetManagementPage.tsx` 与 `schemas/finance/budget.ts` 消费 hrm 员工/组织 API，属合理复用

#### 真实缺口/预埋清单（hrm）
| 类型 | 内容 | 证据 |
|---|---|---|
| 预埋+路径错位 | hrmSetup.ts 调 `/setup/*`；后端 `/hrm/setup/*` + `/api/hrm` 前缀 → 疑似 `/api/hrm/hrm/setup/*` | setup.rs:109-114 + main.rs:34 + hrmSetup.ts:116-140 |
| 死路由（后端有、前端无消费） | `/payroll-details`、`/payroll-slips`、`/payroll-runs/{id}/generate-voucher` | hrm 路由清单 + 前端 0 引用 |
| 预埋悬空 | hrmSetup（6 方法）0 页面消费 | api/hrm/index.ts:60 + 0 处页面引用 |

---

## 3. 缺口/冗余汇总清单

### 3.1 真实缺口（页面消费了，但后端无路由/路由未生效/路径错位）
| # | 模块 | 缺口 | 证据 | 影响 |
|---|---|---|---|---|
| 1 | scm | `/inventory-turnover/abc-classification`（前端）≠ `/inventory-turnover/abc-analysis`（后端） | inventoryTurnover.ts:26 vs inventory_turnover.rs:214 | ABC 分析页 404 |
| 2 | scm | `/incoming-inspections/{id}/records` 后端无子路由 | incomingInspection.ts vs incoming_inspection.rs:172-183 | 检验记录子接口 404（页面仅 1 处消费） |
| 3 | srm | 供应商 CRUD 前端 `/api/srm/suppliers` vs 后端绝对路径+前缀嵌套（疑似 `/api/srm/api/srm/suppliers`） | api/srm/index.ts:516-532 + supplier.rs:63-94 + api_version.rs:96-110 | 供应商 CRUD 疑似不可达（需运行时验证） |
| 4 | wms | LocationRulePage 消费 `/slotting/rules`，后端无 slotting 模块 | LocationRulePage.tsx:14 + 后端 grep 0 命中 | 上架规则设置页 404 |
| 5 | wms | InventoryCyclePage 消费 `/cycle-counts`，后端注册被注释 | InventoryCyclePage.tsx:14 + mod.rs:14,75 | 盘点周期设置页 404 |

### 3.2 预埋悬空（有封装有类型，无任何页面 import 消费；部分后端也不存在）
| # | 模块 | 悬空前端文件（方法数） | 后端状态 |
|---|---|---|---|
| 1 | scm | syncRecord.ts(7)、inspectionRecord.ts(5) | sync 路径错位；inspection-records 无路由 |
| 2 | wms | putaway.ts(18)、manifest.ts(18)、kitting.ts(9)、labor.ts(7)、picking.ts(16)、slotting.ts(10，仅 1 页消费但后端无) | 后端无对应模块 |
| 3 | wms | wavePick.ts(10)、inventoryMovement.ts(6)、discrepancy.ts(6)、smartReplenishment.ts(23)、sync.ts(9)、audit.ts(3) | 后端有路由（wave/inventory-movement/sync/audit）；discrepancy/cycle_count 注册被注释 |
| 4 | tms | optimization.ts 的 planAssignments/optimizeRoutes/quoteFreight | 后端有 3 条路由 |
| 5 | hrm | hrmSetup.ts(6) | 后端有 setup 路由但路径错位 |

### 3.3 冗余/死代码
| # | 模块 | 冗余 | 证据 |
|---|---|---|---|
| 1 | scm | MRP 双路由组（/mrp/suggestions 与 /mrp-suggestions）+ 双前端文件（mrpPlan.ts/mrpSuggestion.ts） | mrp.rs:143-150 |
| 2 | scm | price_comparison 绝对路径 `/api/inquiries|quotes|comparisons` 与相对路径重复 | price_comparison.rs:343-352 |
| 3 | scm/srm | 双供应商主数据（scm /suppliers + srm /api/srm/suppliers）、双采购订单（/purchase-orders 两端都有）、双向 data_sync | supplier.rs(scm:110 / srm:63-94)、purchase_order.rs(scm/srm)、data_sync.rs(scm:77 / srm:54-60) |
| 4 | wms | 双 transfer 实现：transfer_order.rs 已注册 vs transfer.rs 未注册（死代码） | mod.rs:66 vs transfer.rs:38 |
| 5 | wms | cycle_count.rs/discrepancy.rs 路由代码在但注册被注释（死模块） | mod.rs:14-15,75-76 |
| 6 | wms | /alerts 与 /inventory-alerts 双套告警体系 | inventory_alert.rs:90-95 |
| 7 | wms | 前端 mock（useWmsMock）与真实 API 并存，12 页面假数据 | mockData.ts:825 |
| 8 | hrm | 后端 /payroll-details、/payroll-slips、/generate-voucher 死路由 | hrm 路由清单 + 前端 0 引用 |
| 9 | scm/wms | 跨服务同步链路（purchase-to-inbound ↔ inbound-from-scm）双端各自实现 | data_sync.rs(scm:72 / wms:54) |

### 3.4 设置项问题（D4）
| 模块 | 设置页 | 状态 |
|---|---|---|
| scm | SourcingStrategy / QuotaTemplate / PurchaseThreshold / SupplierTier | 4 页全占位，无后端接口/表 |
| wms | LocationRule（缺口）、InventoryCycle（缺口）、FifoPolicy（占位）、InventoryThreshold（可用） | 2 缺口 1 占位 1 可用 |
| hrm | AttendanceRule / PayrollTemplate / RecruitmentFlow / TrainingPlan | 4 页全占位，无后端接口/表 |

---

## 4. 附注与未取证项

- 未取证项：
  1. srm 供应商绝对路径的实际运行时可达性（未启动服务实测，标注"需运行时验证"）。
  2. hrm setup 双前缀的实际网关转发行为（未启动服务实测）。
  3. 前端 API 方法数含 `__tests__` 目录（wms 的 mock.ts/mockData.ts 计入 API 目录 grep 范围，已在消费口径中单独标注）。
- 口径说明：`grep "\.route("` 会命中部分多行路由的起始行与极少数非路由调用（如测试断言），去重路径数已另行给出，结论以路径清单为准。
- 前端页面文件数量：scm 20、srm 18、wms 34、tms 17、hrm 26（含设置页/详情页，按 pages/<m> 目录 ls 统计）。
