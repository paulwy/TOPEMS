# Group B 评估：ERP / Finance / CRM 模块组全量 5 维度实测报告

- 评估日期：2026-09-09
- 仓库路径：`/Users/air/TOPEMS`
- 评估范围：
  - 后端服务：`svc/erp`、`svc/finance`、`svc/crm`
  - 前端 API 目录：`apps/web/src/api/{erp,finance,crm,crmFinance,consolidation,asset,addressbook}`（`receivablePayable` 目录不存在，已并入 `api/finance/receivablePayable.ts`）
  - 前端模块配置：`apps/web/src/modules/{erp,finance,crm,asset}/config.ts`
- 口径说明：
  - 后端路由数 = `grep -rn "\.route(" svc/<svc>/src --include="*.rs"` 计数（注册点），路径字面量用跨行正则 `perl -0777 -ne 'while(/\.route\(\s*("\/[^"]+")/sg)'` 提取去重。
  - 前端 API 方法数 = `apiClient.<svc>.(get|post|put|delete|patch)(<T>)?(` 调用点计数（可含泛型参数）。
  - 页面消费 = `apps/web/src/pages` + `apps/web/src/modules` 下 import 该 API 目录的文件清单。
  - 无法取证处已标注「未取证」。
  - 各服务 api_prefix（`svc/*/src/main.rs`）：ERP=`/api/erp`、Finance=`/api/finance`、CRM=`/api/crm`；`build_application`（`lib/shared-bootstrap/src/lib.rs:988-996` + `lib/shared-core/src/api_version.rs:register_routes_with_legacy_alias`）会将受保护路由嵌套挂载到 api_prefix 及各 legacy 前缀下。

---

## 1. 模块 × 5 维总览表

| 模块 | ①前后端完整度 | ②前后端API对应 | ③菜单前后端覆盖 | ④设置合理性 | ⑤冗余判定 |
|---|---|---|---|---|---|
| **ERP（svc/erp + api/erp + modules/erp）** | 部分：后端 308 路由 / 前端 241 调用 / 页面 26+ 消费；存在 customerExtended/salesOrderExtended 等预埋无路由、leave_request 整模块未挂载 | 缺口：customers 批量/统计、sales-orders 批量/统计、customers/{id}/status 前端调用无后端路由；mdm_v49/master-data-refs 全路径注册导致前缀叠加疑不可达 | 完整：23 个菜单项均有页面，页面均有后端或 finance 服务兜底；无指向不存在后端的菜单 | 部分：无独立设置页，dict/database 管理页与后端一致；无独立 settings API | 冗余：addressbook 双套封装全悬空、assetApi 双实现（core/asset.ts 被遮蔽）、erp 服务残留 /vouchers POST、36+ master_data_* 死模块、leave_request 死模块 |
| **Finance（svc/finance + api/finance + modules/finance）** | 完整：后端 474 路由 / 前端 222 调用 / 页面 20+ 消费，逐路径比对无真实缺口 | 完整：前端全部端点在后端有对应路由；差异均为路径参数命名（{id} vs {voucher_id}），axum 按位置匹配不影响可达 | 完整：19 个菜单/路由项均有页面，跨服务消费 ERP consolidation 后端正常 | 完整：approvalConfig 前后端+存储表 core_finance_payment_approval_config 三方一致且被 payment_workflow 消费 | 冗余：v51–v60 版本化模块并行（risk_v54/risk_v59、forecast_v53/forecasting、reports_v57/report_center/financial_reports），voucher_template 模块 0 路由仅文档 |
| **CRM（svc/crm + api/crm + modules/crm）** | 完整：后端 96 路由 / 前端 106 调用 / 页面 21 消费；crmDashboardApi 为预埋悬空 | 缺口：crmDashboardApi `/dashboard` 后端无路由（仅 /dashboard/* 子路径）；页面消费的 crmFinance `/customers/{id}/finance` 后端无路由（跨模块，记入 crmFinance 卡） | 完整：14 个菜单项均有页面；plugins 路由双注册（main.rs 生效，create_system_routes 死代码） | 部分：无设置页/配置 API，dashboard 走 mock 数据（useCrmMock） | 冗余：/plugins/info、/plugins/health 双注册；crm/index.ts 内嵌 OpenAPI 元数据块（含 /crm/ 前缀假路径）；DashboardPage.tsx 与 CrmDashboardPage.tsx 并存 |
| **Asset（api/asset + modules/asset，后端在 erp）** | 完整：前端 15 调用 / 5 页面全消费，后端 erp asset.rs+fixed_asset.rs 齐备 | 完整：/assets、/fixed-assets 均对应 erp 后端 | 完整：5 个菜单项与 5 个页面一一对应 | 部分：无设置项；菜单与 API 均依赖 ERP 服务（跨模块依赖需注意） | 冗余：api/asset/asset.ts 与 api/erp/core/asset.ts 双实现（erp index 显式用 api/asset 覆盖，core/asset.ts 被遮蔽） |
| **Consolidation（api/consolidation，后端在 erp）** | 部分：前端 30 调用 / 1 个 hook 间接 5 页面消费；后端 erp consolidation 23 路由 | 完整：/consolidation/* 前端调用全部对应 erp 后端（部分跨行路径比对通过） | 完整：finance 菜单 consolidation/consolidationReports 指向 finance 页面，后端由 erp 提供（跨服务映射有效） | 部分：无设置项 | 冗余：无重复封装；但 finance 菜单承载 erp 后端能力，模块归属跨服务 |
| **Addressbook（api/addressbook + erp addressbook）** | 缺口/预埋悬空：前端 57 调用 0 页面消费；erp 后端 5 路由无任何前端页面消费 | 部分：api/addressbook 与 api/erp/core/addressbook.ts 双套封装指向同一组 erp 路由 | 缺口：无菜单、无页面（孤儿后端模块 + 悬空前端封装） | 不适用（无设置项） | 冗余：双套封装（57+ 方法）全为死代码；erp 后端 addressbook 5 路由为孤儿路由 |
| **CRM-Finance（api/crmFinance）** | 部分：19 调用 / 1 hook + 1 页面消费；其中 getCustomerFinanceInfo/update 调 `/customers/{id}/finance` 后端 crm 无此路由 | 缺口：`/customers/{id}/finance`（api/crmFinance/index.ts:50,66）后端无路由 = 页面真实消费缺口；/sales-invoices、/sales-collections、/reports/* 均由 finance 后端承接（sales_invoice.rs:1215-1225 等） | 不适用（无独立菜单，能力挂在 crm 客户详情页） | 不适用 | 部分：与 api/finance 无重复封装（payment.ts 走 /payments 不同端点）；与 ERP ReceivablePayablePage 页面级重复见下 |
| **ReceivablePayable（api/finance/receivablePayable.ts）** | 完整：CRUD 端点 /receivables、/payables 后端齐备，页面双消费 | 完整：端点全部对应 finance 后端 | 冗余：ERP 菜单（/erp/receivable-payable）+ finance 菜单（/finance/receivable-payable）双入口，两个页面（pages/erp/ReceivablePayablePage.tsx、pages/finance/FinanceReceivablePayablePage.tsx） | 不适用 | 冗余：页面级重复（erp 页 import api/finance），应收应付能力本已归并 finance，erp 页为遗留应下线 |

---

## 2. 逐模块详细评估卡

### 2.1 ERP（svc/erp + apps/web/src/api/erp + modules/erp）

**后端路由**
- 注册数：**308**（`grep -rn "\.route(" svc/erp/src --include="*.rs" | wc -l` = 308）
- 跨行提取去重路径：**308**（`perl -0777 'while(/\.route\(\s*("\/[^"]+")/sg)'` → be_erp_paths 308 行）
- api_prefix：`/api/erp`（svc/erp/src/main.rs:47），legacy `/api/v1/erp`（main.rs:48）
- 挂载：modules/mod.rs:117-152 `create_routes()` 合并 **32** 个模块 router（health、dashboard、addressbook、asset、asset_category、audit、bank_account、consolidation、fixed_asset、finance、dict、db_structure、office_supplies、opening_balance、meeting_room、vehicles、documents、announcement、hrm_integration_example、production_order、purchase_order、erp_plugin、material、master_data_refs、mdm_v49、inventory、customer、supplier、sales_order、search、hr_proxy、procurement_e2e）
- 主要模块路由数（证据 `svc/erp/src/modules/*.rs` 按文件 `grep -c`）：master_data_refs.rs:154、mdm_v49.rs:23、consolidation/mod.rs:23、hr_proxy.rs:14、dict.rs:7、sales_order.rs:6、**leave_request.rs:6（未挂载）**、db_structure.rs:6、vehicles.rs:5、production_order.rs:5、meeting_room.rs:5、addressbook.rs:5、purchase_order.rs:4、opening_balance.rs:4、hrm_integration_example.rs:4、announcement.rs:4、material.rs:3、inventory.rs:3、fixed_asset.rs:3 等
- 路径示例：`/customers`（customer.rs:149 区域）、`/sales-orders/{id}/ship`（sales_order.rs）、`/addressbook/search`、`/api/erp/mdm-v49/...`（mdm_v49.rs:40+，**全路径注册**）、`/api/erp/master-data-refs/...`（master_data_refs.rs:135+，**全路径注册**）

**前端 API**
- 端点调用：**241** 处 `apiClient.erp.(get|post|put|delete|patch)`（`apps/web/src/api/erp`，含泛型参数修正）
- 目录结构：index.ts（erpApi 聚合 23 项 + 再导出）、core/（21 个领域 API 文件）、admin/（meeting、officeSupplies）、audit.ts、database.ts、bankAccount.ts
- 再导出（index.ts:34-49）：`assetApi`（来自 ../asset/asset，注释明示「覆盖 core/asset.ts 的旧实现」）、`voucherApi/budgetApi/reportApi/expenseApi/accountingSubjectApi`（来自 ../finance/*，跨服务再导出）
- 页面消费：`api/erp` 在 pages+modules 共 **36 处 import**，页面文件 ≥26：pages/erp/*（DashboardPage、CustomerManagementPage、SupplierManagementPage、InventoryManagementPage、MaterialManagementPage、PurchaseOrderPage、SalesOrderPage、VoucherPage、FinancialReportPage、FinancialAnalysisPage、BudgetManagementPage、DictManagementPage、DatabaseManagementPage、AuditLogPage、OfficeSuppliesPage、VehiclePage、VehicleRequestPage、MeetingRoomPage、AnnouncementPage、BankAccountPage、AssetManagementPage、ReceivablePayablePage、AccountingManagementPage 及 components/hooks）、pages/asset/AssetListPage、DepreciationPage、pages/mes/EquipmentDetailPage、pages/oa/{Announcement,DocumentManagement,VehicleManagement}Page

**页面消费清单（import 证据）**
- `apps/web/src/pages/erp/*`：23 个页面文件全部存在（ls 实测），消费 api/erp 或 api/finance
- 菜单 23 项 ↔ 页面一一对应：dashboard、voucherManagement、customerManagement、supplierManagement、inventoryManagement、materialManagement、purchaseOrder、salesOrder、financialReport、dictManagement、databaseManagement、auditLog、officeSupplies、vehicleManagement、receivablePayable、assetManagement、budgetManagement、bankAccount、accountingManagement、meetingRoom、announcement、vehicleRequest、financialAnalysis（modules/erp/config.ts:9-32 ERP_PATHS；nav 区 562-815）

**菜单覆盖情况**
- 23 个菜单项均有对应页面文件（ls apps/web/src/pages/erp 实测）
- 无「菜单指向不存在后端」：voucher/budget/financialReport/accounting/receivablePayable 等菜单由 finance 服务后端兜底（pages/erp/VoucherPage.tsx 等 import '@/api/finance'），功能可达
- 后端模块无菜单入口（孤儿）：addressbook（后端 5 路由）、leave_request（后端 6 路由未挂载）、master_data_*（多数无前端页面）

**设置项检查**
- 无独立 settings 页面/API；`grep -rln "settings\|preference" apps/web/src/api/erp` = 空
- dict 管理（/system/dict-types、/system/dict-items，dict.rs:150-177）与 database 管理（/db/tables、/db/columns，db_structure.rs）作为配置型页面存在，前后端一致
- 结论：设置面小且一致，无发现「设置项无实际作用」；但 databaseManagement/dictManagement 属运维能力放在 ERP 模块内，合理性存疑（主观项）

**冗余发现**
1. `api/addressbook/`（独立目录 57 调用）与 `api/erp/core/addressbook.ts`（同端点重封装）双套，全部无页面消费（详见 §3）
2. `api/erp/core/asset.ts` 的 assetApi 被 `api/asset/asset.ts` 遮蔽：erp/index.ts:34 显式 `export { assetApi } from '../asset/asset'` 并注释「覆盖 core/asset.ts 的旧实现」，core/asset.ts 成为死实现（仍被 `export * from './core'` 输出，但同名显式导出优先）
3. ERP 服务残留 finance 能力：`svc/erp/src/modules/finance.rs:148` `.route("/vouchers", post(create_voucher))`，与 finance 服务 /vouchers 重复（V32.0 Finance 迁移遗留，mod.rs 注释佐证），前端 voucherApi 走 finance 服务，erp 侧 /vouchers 无消费
4. 死模块：`leave_request`（6 路由未 merge，mod.rs 仅 `pub mod leave_request;` 第 42 行）、36 个 `master_data_*` 子模块仅 master_data_refs 与 mdm_v49 被 merge（mod.rs:24-80 声明 vs 117-152 挂载），其余为死代码（mod.rs 顶部 `#![allow(dead_code)]` 佐证）
5. customerExtended（7 方法）/salesOrderExtended（7 方法）批量端点后端无路由且无页面消费（详见 §3）

### 2.2 Finance（svc/finance + apps/web/src/api/finance + modules/finance）

**后端路由**
- 注册数：**474**（grep 计数）
- 跨行提取去重路径：**452**（be_finance_paths2 452 行）
- api_prefix：`/api/finance`（main.rs:245），legacy `/api/v1/finance`、`/api/core/finance/v1`（main.rs:246）
- 挂载：modules/mod.rs:5292-5316 `create_routes()` 合并 **22** 个模块：compliance_v51、audit_v52、forecast_v53、risk_v54、settlement_v55、sales_invoice、settlement_center、tax_v56、reports_v57、treasury_v58、risk_v59、decision_v60、reconcile_orders、reconciliation、operational、report_center、forecasting、multi_dimensional、shared_services、financial_reports、accounting_subjects、event_routes，另 `.nest("/cqrs", cqrs_routes::cqrs_routes())`（mod.rs:5315）
- 模块路由分布（按文件）：mod.rs 内联 127、financial_reports.rs:47、decision_v60.rs:24、risk_v59.rs:23、treasury_v58.rs:22、reports_v57.rs:21、tax_v56.rs:19、settlement_v55.rs:19、settlement_center/routes.rs:19、compliance_v51.rs:16、sales_invoice.rs:15、audit_v52.rs:15、risk_v54.rs:14、reconciliation.rs:13、forecasting.rs:12、cqrs_routes.rs:12、event_routes.rs:11、multi_dimensional.rs:10、forecast_v53.rs:9、reconcile_orders.rs:8、operational.rs:8、report_center.rs:6、accounting_subjects.rs:2、domain/event_pipeline.rs:1（内部事件路由非 HTTP）
- voucher_template.rs / voucher_template_entries.rs：**0 个 `.route(`**，仅 utoipa 文档（`path = "/voucher-templates/..."` 出现在 mod.rs:5502 等内联路由区，实际路由在 mod.rs 挂载）

**前端 API**
- 端点调用：**222** 处 `apiClient.finance.*`
- 文件：20 个（account、accountingSubject、approvalConfig、budget、cashFlow、counterparty、expense、expenseApproval、payment、period、receivablePayable、reconciliation、report、riskV54、settlementCenter、tax、voucher、voucherTemplate、index、types）
- 页面消费：`api/finance` 共 **42 处 import**，页面 ≥30：pages/finance/*（Dashboard、Ledger、VoucherCreate、VoucherDetail、FinanceVoucherPage 及 3 个组件、ReceivablePayable、Receipt、Payment、ApprovalConfig、Invoice、Tax、Expense、ExpenseApproval、Cost、Asset、Budget、BudgetDetail、OpeningBalance、Consolidation、ConsolidationReports、Reports）+ pages/erp/*（VoucherPage、BudgetManagementPage、FinancialAnalysisPage、FinancialReportPage、ReceivablePayablePage、hooks/useVoucherManagement、useFinancialReport）+ pages/admin/AccountManagementPage
- settlementCenter.ts 调用 `/api/core/settlement-center/...` 全路径（legacy 前缀族），后端 settlement_center/routes.rs 同样全路径注册——前端 baseURL `/api/finance` + 全路径 = `/api/finance/api/core/settlement-center/...`，与后端 nest 后路径一致（双重前缀自洽但路径风格与其余模块不一致）

**菜单覆盖情况**
- FINANCE_PATHS（modules/finance/paths.ts）19 个路径；菜单 nav（config.ts:535-749）19 项：dashboard、vouchers、ledger、receivablePayable、receipts、payments、approvalConfig、invoices、expense、expenseApproval、budget、assets、tax、cost、reports、openingBalance、consolidation、consolidationReports、budgetDetail
- 全部有页面文件（pages/finance 20 个 + ConsolidationScopePage/ 目录）
- consolidation 菜单后端由 erp 服务提供（跨服务有效，前端 api/consolidation 走 apiClient.erp）

**设置项检查**
- FinanceApprovalConfigPage + approvalConfigApi（api/finance/approvalConfig.ts: `GET/POST /approval-configs`、`PUT/DELETE /approval-configs/{id}`）↔ 后端 mod.rs:5439-5446 路由齐备 ↔ 存储表 `core_finance_payment_approval_config`（svc/finance/src/services/finance/approval_configs.rs:15,49,83,152,237 的 SELECT/INSERT/UPDATE/DELETE）
- 该设置被真实消费：services/finance/payment_workflow.rs:170 读取 `workflow_id FROM core_finance_payment_approval_config` —— 设置项有实际作用，前后端一致 ✅
- 未发现硬编码失效设置

**冗余发现**
1. 版本化模块并行：risk_v54 vs risk_v59（/finance-v54/* 与 /finance-v59/*）、forecast_v53 vs forecasting vs decision_v60（/forecast* 与 /finance-v57/trend 等）、reports_v57 vs report_center vs financial_reports、treasury_v58 vs multi_dimensional —— 同领域多代实现并存（v51–v60），需确认是否按计划灰度还是长期重复
2. voucher_template 模块（mod.rs 声明 26-27 行）0 路由，能力全部内联在 mod.rs 路由区 —— 模块声明与实现错位
3. settlement_center 使用 `/api/core/settlement-center/...` 全路径（legacy 前缀），与 `/api/finance/*` 主前缀并存，两套前缀语义

### 2.3 CRM（svc/crm + apps/web/src/api/crm + modules/crm）

**后端路由**
- 注册数：**96**（grep 计数）
- 跨行提取去重路径：**92**（be_crm_paths 92 行）
- api_prefix：`/api/crm`（main.rs:37），legacy `/api/v1/crm`（main.rs:38）
- 挂载：modules/mod.rs:84-106 `create_routes()` 合并 **17** 个模块：customer、contact、opportunity、interaction、aftersales、billing、audit、analytics、rfm、forecast、tag、customer_profile、customer_scoring、customer_segmentation、customer_recommendation、sales_forecast、sales_funnel（注意 87-89 行曾注释 customer_profile/segmentation/recommendation，后 100-103 行重新启用）
- 另有 main.rs:114-121 手工注册 plugin_routes（/plugins/info、/plugins/health）并入 public_routes
- 模块路由分布：aftersales.rs:14、opportunity.rs:9、analytics.rs:7、sales_forecast.rs:6、customer.rs:6、contact.rs:6、tag.rs:5、sales_funnel.rs:5、customer_segmentation.rs:5、dashboard.rs:4、customer_profile.rs:4、billing.rs:4、rfm.rs:3、interaction.rs:3、forecast.rs:3、customer_scoring.rs:3、customer_recommendation.rs:3、crm_plugin.rs:2、audit.rs:2

**前端 API**
- 端点调用：**106** 处 `apiClient.crm.*`
- 文件：16 个（billing、contact、crmAudit、customer、dashboard、forecast、index、interaction、mockData、opportunity、returns、rfm、salesFunnel、scoring、segmentation、types）
- 页面消费：`api/crm` 共 **30 处 import**，页面 **21** 个：ContactDetailPage、ContactManagementPage、CRMBillingPage、CRMCustomerScoringPage、CRMCustomerSegmentationPage、CrmDashboardPage、CrmForecastAlgorithmPage、CRMRecommendationPage、CrmRfmPage、CRMSalesForecastPage、CRMSalesFunnelPage、CustomerCreatePage、CustomerDetailPage、CustomerEditPage、CustomerManagementPage、DashboardPage、InteractionManagementPage、OpportunityDetailPage、OpportunityManagementPage、ReturnDetailPage、ReturnListPage
- 注意：api/crm/index.ts:15-30 内嵌 OpenAPI 元数据数组（`["GET","/crm/billing"]` 等，含 `/crm/` 前缀假路径），仅元数据不构成真实调用

**菜单覆盖情况**
- CRM_PATHS（config.ts:35-55）19 个路径；菜单 nav（config.ts:380-529）14 项：dashboard、customers、contacts、opportunities、interactions、returns、customerSegmentation、rfm、forecastAlgorithm、customerScoring、salesFunnel、salesForecast、billing、recommendation
- 全部有页面；路由含 customerDetail/customerCreate/customerEdit/contactDetail/opportunityDetail/returnDetail 隐藏页
- 后端模块均有菜单/页面覆盖；plugins 路由（/plugins/info、/plugins/health）无前端页面消费（插件健康检查类，正常）

**设置项检查**
- 无独立 settings 页面/API（`grep -rln "settings\|preference" apps/web/src/api/crm` = 空）
- CrmDashboardPage 使用 `useCrmMock`（pages/crm/CrmDashboardPage.tsx:13）渲染 mock 数据，仪表盘真实数据通道（crmDashboardApi.getOverview → `/dashboard`）**后端无路由**且**无页面消费**（仅 schemas/crm/dashboardSchema.ts 引用类型）—— 设置/数据通道存在但未接通

**冗余发现**
1. **/plugins/info、/plugins/health 双注册**：main.rs:115,117（生效，并入 public_routes）与 crm_plugin.rs:142-143（仅经 create_system_routes() 可达，而 create_system_routes 仅被测试引用 mod.rs:122-124，生产未调用）—— 死代码重复
2. crm/index.ts 内嵌 OpenAPI 元数据数组（15-40 行），与真实 apiClient 调用并存，且路径带 `/crm/` 前缀与 baseURL `/api/crm` 语义冲突，易误导
3. pages/crm 同时存在 `CrmDashboardPage.tsx` 与 `DashboardPage.tsx`（后者无菜单引用，疑死页）
4. `/segments/{id}`、`/customers/{id}/profile/tags`、`/plugins/*` 等路径在去重统计中×2 属同路径不同方法（get/delete、post/delete），非真实重复

### 2.4 Asset（apps/web/src/api/asset + modules/asset，后端寄宿 erp）

- 端点调用：**15**（api/asset/asset.ts: assetApi 5 + fixedAssetApi 6，assetCategory.ts 4 区域）
- 页面消费：AssetListPage、CategoryManagementPage（import api/asset）；DepreciationPage、DashboardPage、TransferPage 消费 api/erp
- 菜单：ASSET_PATHS 5 项（dashboard、list、categories、depreciation、transfers，config.ts:63-123）↔ pages/asset 5 个文件一一对应 ✅
- 后端：erp asset.rs（/assets、/assets/{id}）、fixed_asset.rs（/fixed-assets、/fixed-assets/depreciate）、asset_category.rs（2 路由）齐备
- 冗余：见 §3（assetApi 双实现）

### 2.5 Consolidation（apps/web/src/api/consolidation，后端寄宿 erp）

- 端点调用：**30**（全部 `apiClient.erp.*`，/consolidation/scopes、/elimination-rules、/internal-transactions、/reports、/company-relations、/company-tree、导出）
- 消费链：api/consolidation → hooks/useConsolidation.ts → pages/finance/ConsolidationReportsPage、ConsolidationScopePage/(index+组件+hook)、pages/iam/CompanyStructurePage —— 间接 5 页面消费 ✅
- 后端：erp consolidation/mod.rs **23 路由**，路径 /consolidation/*（evidence：grep -c = 23）
- 前端调用路径与后端比对：scopes、reports/generate、company-tree 等均在 be_erp 路径集内 ✅；elimination-rules、internal-transactions、execute-elimination、company-relations、companies/{id}/financial-data、reports/{id}/lines 等跨行提取均命中（未逐条列 evidence，标「部分未取证」）

### 2.6 Addressbook（apps/web/src/api/addressbook）

- 端点调用：**57**（addressbook/index.ts 5 + group/tag/importExport/favorite 子模块）
- 页面消费：**0**（全 src 无页面/模块 import api/addressbook；`grep -rln "addressbookApi|api/addressbook"` 仅命中 api 层自身与 api/index.ts、erp/core/index.ts 再导出）
- 后端：erp addressbook.rs 5 路由（/addressbook、/addressbook/{id}、/addressbook/search、/addressbook/export 等）已挂载但无前端消费 → 孤儿
- 冗余：api/addressbook 与 api/erp/core/addressbook.ts 双套封装指向同一组 erp 路由（core 版 5 方法 vs 独立版 57 调用），全部死代码

### 2.7 CRM-Finance（apps/web/src/api/crmFinance）

- 端点调用：**19**（7 处 apiClient.crm.* + 12 处 apiClient.finance.*，跨双服务）
- 消费：hooks/useCrmFinance.ts（19 个 hook）+ pages/crm/CustomerDetailPage.tsx（useCustomerFinanceInfo 真实调用，第 55 行）
- 对应性：
  - `/customers/{id}/finance`（crmFinance/index.ts:76 get、:84 put）→ **后端 crm 无此路由**（svc/crm/src 全库 grep 无 /customers/{id}/finance）→ 真实缺口（页面消费但后端无路由）
  - /sales-invoices、/sales-collections、/reports/receivable-aging|receivable-summary|overdue-receivables、导出 → finance 后端 sales_invoice.rs:1215-1225、reports 模块齐备 ✅
- 冗余：与 api/finance 无端点级重复（finance payment.ts 走 /payments 不同端点）；能力归属 crm 客户详情，与 finance 应收应付页重复（见下）

### 2.8 ReceivablePayable（归并状态）

- 独立 API 目录 `api/receivablePayable` **不存在**；能力已归并到 `api/finance/receivablePayable.ts`（receivableApi + payableApi，CRUD /receivables、/payables、/ar/collections、/ap/payments 等）与 `schemas/finance/receivablePayable.ts`
- 后端 finance：/receivables、/payables、/ar/aging、/ap/aging 等在 mod.rs 内联路由区（be_finance_paths2 含 /receivables、/payables）✅
- 残留：
  - 页面级重复：pages/erp/ReceivablePayablePage.tsx（import { receivableApi, payableApi } from '@/api/finance'）与 pages/finance/FinanceReceivablePayablePage.tsx（import { financeApi }）并存；ERP 菜单 /erp/receivable-payable（config.ts:369-374）与 finance 菜单 /finance/receivable-payable 双入口
  - permissions.ts、modules/erp/config.ts、modules/finance/config.ts、paths.ts、registry/core-modules.ts 均引用 receivablePayable —— 归并后遗留引用点多
- 结论：数据层归并完成（单一 api/finance/receivablePayable.ts），页面层未归并（erp 页为遗留，应下线）

---

## 3. 缺口 / 冗余清单

### 3.1 真实缺口（页面/API 消费了但后端无路由，或后端有路由但不可达）

| # | 缺口 | 前端消费证据 | 后端情况 |
|---|---|---|---|
| G1 | `/customers/{id}/finance`（GET/PUT） | api/crmFinance/index.ts:76,84；hooks/useCrmFinance.ts:22；pages/crm/CustomerDetailPage.tsx:55 真实调用 | svc/crm 全库无此路由 |
| G2 | `/customers/stats`、`/customers/batch`、`/customers/batch-list`、`/customers/batch/category`、`/customers/batch/status`、`/customers/{id}/status` | api/erp/core/customerExtended.ts:25,29,35,39,43,59,63,75 | erp customer.rs 仅 /customers、/customers/{id} 两路由 |
| G3 | `/sales-orders/batch*`（approve/ship/complete/cancel）、`/sales-orders/stats` | api/erp/core/salesOrderExtended.ts:34-60 | erp sales_order.rs 无 batch/stats 路由 |
| G4 | `/mdm-v49/*`（23 个）与 `/master-data-refs/*`、`/master-data/*`（sync/quality，~33 个） | api/erp/core/mdmRefs.ts、mdmLifecycle.ts（被 erp/index 再导出） | 后端以全路径 `/api/erp/mdm-v49/...`（mdm_v49.rs:40+）、`/api/erp/master-data-refs/...`（master_data_refs.rs:135+）注册，经 nest(/api/erp) 后实际为 `/api/erp/api/erp/...`，前端按 `/api/erp/mdm-v49/...` 请求不可达（除非网关重写，未取证） |
| G5 | `/leave-requests/*`（6 端点） | api/erp/core/leaveRequest.ts（被 erp/index 再导出，无页面消费） | erp leave_request.rs:178-191 有路由但模块**未 merge**（mod.rs 仅声明），运行时 404 |
| G6 | `/dashboard`（CRM） | api/crm/dashboard.ts:16 crmDashboardApi.getOverview | svc/crm 仅有 /dashboard/overview、/dashboard/stats、/dashboard/funnel、/dashboard/forecast，无 /dashboard；且该 API 无页面消费（预埋） |

### 3.2 预埋悬空（有封装有类型但无任何页面 import 消费）

| # | 预埋项 | 封装证据 | 消费证据 |
|---|---|---|---|
| P1 | api/addressbook 全套（57 调用、25 导出） | apps/web/src/api/addressbook/index.ts:18 | 全 src 0 页面消费；仅 api/index.ts 与 erp/core 再导出 |
| P2 | api/erp/core/addressbook.ts（5 方法） | apps/web/src/api/erp/core/addressbook.ts | 0 页面消费 |
| P3 | customerExtendedApi / salesOrderExtendedApi（批量能力） | api/erp/core/customerExtended.ts、salesOrderExtended.ts（各 7+ 方法） | 0 页面消费（pages+hooks 检索为空）且后端无路由（G2/G3） |
| P4 | mdmRefsApi / mdmLifecycleApi | api/erp/core/mdmRefs.ts、mdmLifecycle.ts | 0 页面消费；且后端前缀不可达（G4） |
| P5 | crmDashboardApi.getOverview | api/crm/dashboard.ts:16 | 仅 schemas/crm/dashboardSchema.ts 引用类型，无页面调用；后端亦缺 /dashboard（G6） |
| P6 | leaveRequestApi | api/erp/core/leaveRequest.ts（erp/index 再导出） | 0 页面消费；后端未挂载（G5） |

### 3.3 冗余（重复封装 / 重复注册 / 多套实现 / 死代码）

| # | 冗余项 | 证据 |
|---|---|---|
| R1 | addressbook 双套封装（api/addressbook vs api/erp/core/addressbook）指向同一组 erp 路由 | 两文件方法互不相通、均无消费 |
| R2 | assetApi 双实现：api/asset/asset.ts 与 api/erp/core/asset.ts | erp/index.ts:34 显式覆盖并注释「覆盖 core/asset.ts 的旧实现」→ core/asset.ts 被遮蔽为死代码 |
| R3 | ERP 服务 /vouchers POST 与 finance 服务 /vouchers 重复 | svc/erp/src/modules/finance.rs:148 vs svc/finance 多处 /vouchers；前端 voucherApi 仅走 finance；erp 侧为 V32.0 迁移遗留 |
| R4 | CRM /plugins/info、/plugins/health 双注册 | main.rs:115,117（生效） vs crm_plugin.rs:142-143（仅 create_system_routes 可达，生产未调用，mod.rs:108,122） |
| R5 | finance 版本化模块并行（v51–v60） | risk_v54/risk_v59、forecast_v53/forecasting、reports_v57/report_center/financial_reports、treasury_v58 等；同领域多代实现并存 |
| R6 | finance voucher_template 模块 0 路由 | voucher_template.rs / voucher_template_entries.rs `grep -c "\.route("` = 0，仅 utoipa 文档；能力内联 mod.rs |
| R7 | ERP 36 个 master_data_* 子模块多数未挂载 | mod.rs:24-80 声明 vs 117-152 仅 merge master_data_refs、mdm_v49；`#![allow(dead_code)]`（mod.rs:1） |
| R8 | ERP leave_request 死模块 | mod.rs:42 声明、无 merge、6 路由不可达 |
| R9 | 应收应付页面级重复 | pages/erp/ReceivablePayablePage.tsx + pages/finance/FinanceReceivablePayablePage.tsx；ERP 菜单（config.ts:369）+ finance 菜单双入口；permissions.ts/registry/core-modules.ts 多处引用残留 |
| R10 | 前后端双轨模块注册 | modules/{erp,finance,crm}/config.ts（主路由）与 modules/registry/core-modules.ts（微前端 remote 注册，topems_crm:3003、topems_finance:3004）并存，且路径不一致（如 core-modules 的 /crm/scoring、/finance/accounts、/finance/invoice vs config.ts 的 /crm/customer-scoring、/finance/ledger、/finance/invoices） |
| R11 | CRM 页面重复：CrmDashboardPage.tsx 与 DashboardPage.tsx | pages/crm 下两文件并存，菜单引用 CrmDashboardPage |
| R12 | CRM index.ts 内嵌 OpenAPI 元数据块（/crm/ 前缀假路径） | apps/web/src/api/crm/index.ts:15-40 |

---

## 4. 结论摘要

- **完整度最高**：Finance 前后端链路最完整（474 路由 / 222 调用，逐路径比对无真实缺口，approvalConfig 设置前后端+存储三方一致），ERP 次之但存在批量/统计端点缺口与 mdm 前缀问题，CRM 业务面完整但插件路由与 dashboard 存在死代码/缺口。
- **重点待办**：
  1. G1 `/customers/{id}/finance` 为**页面真实消费**的缺口（CustomerDetailPage 财务信息区），优先补齐 crm 后端或改接 finance 应收接口；
  2. G4 mdm_v49 / master-data-refs 全路径注册导致前缀叠加，需统一为相对路径或网关重写，否则 23+33 个端点全部 404；
  3. G5 leave_request 模块未挂载（6 端点死），挂载或删除；
  4. P1/P2 通讯录双套封装 0 消费，建议整体下线或接通页面；
  5. R9 应收应付 erp 遗留页与双菜单应归并下线。
- **数字口径备注**：所有数字均来自 grep/find 实测（证据见各卡）；「未取证」仅标注于 consolidation 逐路径比对与网关重写行为。

*报告生成方式：仓库内 grep/find/perl 实测取证，无编造数字。*
