# TOPEMS 项目任务规划与路线图

> 版本: 3.2 | 更新日期: 2026-06-28
> 服务总数: 21 个 | 已实现: 6 个 | 部分实现: 10 个 | 规划中: 5 个
> **前后端API对比报告已更新** - 详见"完成度统计"章节

---

## 📋 项目总览

TOPEMS 是一个基于微服务架构的企业级数字化平台，采用 Rust + React 技术栈。
当前处于 **V3.1 迭代开发阶段**。

### 服务实现状态

| 状态 | 数量 | 模块 |
|------|------|------|
| ✅ 核心已实现 | 1 | unified-core (IAM/Doc/Flow/File/Mail/IM/Notify) |
| ✅ 完整实现 | 5 | hrm, qms, lims, ehs, rs |
| 🔶 部分实现 | 10 | erp, pm, crm, pdm, wms, srm, report, monitor, ai, integration |
| 📋 规划中 | 5 | mes, scm, bi, mobile, gis |
| **总计** | **21** | |

### 文档状态

| 类别 | 数量 | 状态 |
|------|------|------|
| API 文档 | 15 | ✅ 完整 |
| 架构设计 | 6 | ✅ 已更新 |
| 部署文档 | 2 | ✅ 完整 |
| 开发指南 | 6 | ✅ 完整 |
| DevOps 指南 | 19 | ✅ 完整 |
| UI 开发指南 | 14 | ✅ 完整 |
| 服务文档 | 19 | 🔶 部分完整 |
| 用户指南 | 16 | 🔶 需补充 |
| 报告与分析 | 4 | ✅ 已归档 |

---

## 🎯 当前阶段目标 (V3.1)

### 阶段主题：导航系统完善 + 文档体系整合

**目标时间**: 2026-06-27
**核心任务**:
1. 修复 NavigationRegistry 导航系统问题
2. 整合项目文档体系，清除冗余
3. 完善架构设计文档
4. 补充缺失的页面和功能

---

## 🔴 P0 高优先级任务（已完成）

### 1. 导航系统修复 ✅

> 问题：NavigationRegistry 中有 37 条导航指向不存在的路由 — **已全部修复**

| 模块 | 问题数 | 主要问题 | 状态 |
|------|--------|---------|------|
| PM 项目管理 | 5 | 路由不存在 (tasks/gantt/risk/timeline) | ✅ 已完成 |
| MES 生产执行 | 5 | 单复数不一致 + 路由不存在 | ✅ 已完成 |
| Finance 财务 | 5 | 单复数不一致 + 路由缺失 | ✅ 已完成 |
| SCM 供应链 | 4 | 路由不存在/与 WMS 重叠 | ✅ 已完成 |
| AI 智能助手 | 2 | 路由不存在 | ✅ 已完成 |
| GIS 地理信息 | 2 | 路由不存在 | ✅ 已完成 |
| IM 即时通讯 | 3 | 路由不存在 | ✅ 已完成 |
| ERP 企业资源 | 3 | 路由重定向问题 | ✅ 已完成 |
| CRM 客户关系 | 2 | 路由不存在 | ✅ 已完成 |
| App.tsx | 1 | dashboardRoutes 重复渲染 | ✅ 已完成 |
| **小计** | **32** | | ✅ |

### 2. 页面路由补全 ✅

> 问题：7 个页面已开发但未配置路由 — **已全部补全**

| 页面文件 | 模块 | 建议路由 | 状态 |
|----------|------|---------|------|
| AccountManagementPage | iam | `/iam/accounts` | ✅ 已完成 |
| BankAccountManagementPage | iam | `/iam/bank-accounts` | ✅ 已完成 |
| DocumentsPage | common | `/common/documents` | ✅ 已完成 |
| VoucherTemplatePage | finance | `/finance/voucher-templates` | ✅ 已完成 |
| QualityTraceabilityPage | mes | `/mes/quality-traceability` | ✅ 已完成 |
| WIPPage | mes | `/mes/wip` | ✅ 已完成 |
| **小计** | **6** | | ✅ |

---

## 🟡 P1 中优先级任务

### 1. 导航菜单补全

> 问题：路由和页面存在，但侧边栏导航没有入口

#### HRM 人力资源 ✅
- [x] 公司管理 `/hrm/companies`
- [x] 部门管理 `/hrm/departments`
- [x] 组织架构图 `/hrm/organization`
- [x] 职位管理 `/hrm/positions`
- [x] 考勤管理 `/hrm/attendance`
- [x] 请假管理 `/hrm/leave`
- [x] 合同管理 `/hrm/contracts`
- [x] 薪酬管理 `/hrm/payroll`
- [x] 人事报表 `/hrm/reports`

#### Finance 财务管理 ✅
- [x] 总账管理 `/finance/ledger`
- [x] 发票管理 `/finance/invoices`
- [x] 税务管理 `/finance/tax`
- [x] 费用管理 `/finance/expense`
- [x] 成本管理 `/finance/cost`
- [x] 应收管理 `/finance/receivable`
- [x] 应付管理 `/finance/payable`
- [x] 收款管理 `/finance/receipts`
- [x] 付款管理 `/finance/payments`
- [x] 合并报表 `/finance/consolidation`
- [x] 期初余额 `/finance/opening-balance`
- [x] 预算管理 `/finance/budget`

#### 其他模块 ✅
- [x] CRM: 联系人/互动/账单/评分/预测 (5项)
- [x] SCM: 采购物料/供应商评估 (2项)
- [x] GIS: 地理围栏/轨迹追踪 (2项)
- [x] BI: 数据分析 (1项)
- [x] 其他: 5项

### 2. 后端 API 对应前端功能补全

#### 高优先级缺失模块

| 模块 | 后端 API 数 | 缺失功能 | 状态 |
|------|------------|---------|------|
| unified-core | ~200 | 工作流引擎、文件服务、插件市场、租户管理 | 📋 规划中 |
| analytics/BI | ~50 | 行级权限、数据钻取、多维分析、预测分析 | 📋 规划中 |
| mobile | ~35 | 移动审批、推送通知、条码扫描 | 📋 规划中 |
| monitor | ~18 | 告警规则、告警历史、通知渠道 | 📋 规划中 |
| ai | ~30 | 向量搜索、多模态、推荐系统 | 📋 规划中 |

---

## 🟢 P2 低优先级优化

### 1. 导航一致性优化 ✅

- [x] 统一 9 个模块 sidebar_nav 与 module_tabs 一致性（erp/finance/hrm/iam/docs/integration/report/erp-oa/lims）

### 2. 重复路由清理 ✅

- [x] `/budget` → `/finance/budget-management` 重定向
- [x] `/assets` → `/finance/assets` 重定向
- [x] `/equipment` → `/mes/equipment` 重定向
- [x] 13 个废弃 import 清理

### 3. 废弃代码清理

- [x] 迁移 navigation-v2.ts 的 15 个引用到 NavigationRegistry
- [x] 删除废弃的 navigation-v2.ts 文件（删除3文件+标记7文件）

---

## 📅 路线图

### V3.0 ✅ 已完成 (2026-06-23)
- [x] 微服务架构基础搭建
- [x] unified-core 核心服务 (IAM/Doc/Flow/File/Mail/IM/Notify)
- [x] HRM/QMS/LIMS/EHS/RS 五个完整业务模块
- [x] 基础前端框架 (React + Vite + Tailwind)
- [x] 数据库 Schema 隔离设计
- [x] 基础 API 文档

### V3.1 ✅ 已完成 (2026-06-28)
- [x] 文档体系整合与去重
- [x] 架构设计文档完善
- [x] 导航系统全面修复 (P0)
- [x] 缺失路由与页面补全 (P1)
- [x] 前后端功能对齐
- [x] 代码质量优化
- [x] 测试覆盖完善 (shared-utils/hooks 63+ tests)
- [x] 首屏性能优化 (dns-prefetch, i18n懒加载, vite分包)

### V3.2 ✅ 已完成 (2026-06-28)
- [x] 前后端API全面对比分析
- [x] ERP/MES 模块完善 (ERP+6页面, MES+6页面)
- [x] SCM/WMS/SRM 供应链整合 (SCM+3页, WMS+2页, SRM+3页)
- [x] 工作流引擎API补全与页面增强 (9个API模块, 3页面增强)
- [x] AI 智能助手深度集成 (6新页面+7API模块)
- [x] 移动端适配 (5新页面+响应式优化)

### V4.0 ✅ 已完成 (2026-06-28)
- [x] 微前端架构 (Module Federation) - 7微应用+共享状态
- [x] 插件市场 - 4页面+5API模块+4组件
- [x] 多租户支持 - 4页面+完整租户API
- [x] 高级 BI 分析 - 13页面+14组件+完整API
- [x] 低代码平台 - 表单/页面设计器+数据模型+应用管理

---

## 📊 完成度统计

### 按模块

| 模块 | 后端 API | 前端 API | 前端页面 | 导航菜单 | 整体完成度 |
|------|---------|---------|---------|---------|-----------|
| unified-core | ~312 | ~180 | 70% | 60% | 80% |
| HRM | ~150 | ~120 | 90% | 60% | 85% |
| QMS | ~124 | ~130 | 90% | 80% | 90% |
| LIMS | ~100 | ~140 | 90% | 80% | 85% |
| EHS | ~100 | ~80 | 90% | 80% | 85% |
| RS | ~50 | ~50 | 90% | 70% | 85% |
| WMS | ~80 | ~70 | 75% | 65% | 70% |
| ERP | ~60 | ~70 | 70% | 60% | 65% |
| CRM | ~40 | ~30 | 60% | 50% | 50% |
| Finance | ~70 | ~60 | 70% | 30% | 50% |
| PM | ~50 | ~40 | 50% | 40% | 45% |
| PDM | ~40 | ~20 | 40% | 30% | 35% |
| MES | ~50 | ~65 | 75% | 65% | 70% |
| BI | ~134 | ~80 | 75% | 65% | 70% |
| SRM | ~40 | ~25 | 50% | 50% | 45% |
| SCM | ~40 | ~35 | 65% | 55% | 55% |
| GIS | ~30 | ~30 | 40% | 40% | 40% |
| AI | ~20 | ~18 | 70% | 65% | 65% |
| Workflow | ~90 | ~55 | 75% | 70% | 70% |
| Mobile | ~35 | ~25 | 80% | 70% | 70% |
| Plugin | ~23 | ~20 | 75% | 70% | 70% |
| Tenant | ~11 | ~15 | 70% | 60% | 65% |
| LowCode | ~30 | ~25 | 70% | 65% | 65% |

### 前后端API实现对比

#### 后端Rust服务统计
| 服务 | 路由数量 | 模块数 | 主要功能 |
|------|---------|-------|---------|
| unified-core | ~312 | 11 | IAM, Doc, Flow, File, Communication, Tenant, Billing, Plugin, Finance, AI, Sync |
| qms | ~124 | 14 | quality_standard, inspection, issue, dashboard, corrective_action, audit, spc, eight_d, fmea, apqp等 |
| analytics/BI | ~134 | 5 | 数据分析, 报表, 仪表盘, 数据源, 同步 |
| hrm | ~150 | 18 | employee, department, contract, attendance, position, leave, recruitment, payroll, performance, training等 |
| lims | ~100 | 13 | sample, inspection_task, instrument, reagent, statistics, data_sync, barcode, test_method等 |
| ehs | ~100 | 13 | environmental_compliance, occupational_disease, hazardous_material, emergency_plan, accident, safety等 |
| wms | ~80 | 10 | warehouse, inventory, inventory_alert, inbound_order, outbound_order, stock_take等 |
| erp | ~60 | 12 | accounting, asset, budget, receivablePayable, bank, voucher, vehicle, meeting等 |
| scm | ~40 | 11 | supplier, purchase_order, supplier_evaluation, mrp, incoming_inspection等 |
| mes | ~50 | 12 | production_order, work_station, equipment, production_record, quality等 |
| pdm | ~40 | 12 | document, product, material, version, workflow, change_notice等 |

#### 前端API模块统计
| 模块 | API文件数 | 主要子模块 |
|------|----------|-----------|
| qms | 14 | standard, inspection, issue, improvement, spc, qualityCost, eightD, fmea, dashboard, sync, correctiveAction, audit, apqp, types |
| ehs | 16 | sync, occupationalHealth, safetyCheck, compliance, incident, inspection, emergency, occupationalDisease, hazard, environment, hazardousMaterial, risk, accident, safetyIssue, training, index |
| finance | 8 | counterparty, receivablePayable, voucherTemplate, report, account, period, voucher, index |
| hrm | 15+ | company, department, employee, contract, attendance, leave, recruitment, payroll, performance, training, types |
| scm | 15 | supplier, purchaseOrder, purchaseItem, supplierEvaluation, mrpPlan, mrpSuggestion, incomingInspection, inspectionRecord, inventoryTurnover, supplyChainDashboard, priceComparison, syncRecord, auditLog, deliveryAppointment, index |
| mes | 13 | processFlow, equipment, productionProcess, material, productionRecord, workStation, productionOrder, productionSchedule, wip, process, traceability, quality, index |
| pm | 12+ | project, phase, milestone, approval, member, resource, expense, benefit, contract, budget, risk, quality, acceptance, settlement, document, report, notification, dashboard |
| wms | 10+ | inventory, warehouse, location, inbound, outbound, stocktake, transfer, replenishment, sync, audit |
| bi | 6 | dataSource, sync, comparison, analytics, report, widget, dashboard, index |
| lims | 13 | sample, inspection, instrument, reagent, barcode, testMethod, proficiencyTesting, uncertainty, collection, sync, audit, types, utils |

#### 关键发现

1. **前后端API覆盖率较高的模块**: QMS(90%), LIMS(85%), HRM(85%), EHS(85%), RS(85%)
2. **后端强但前端弱的模块**: BI(后端134路由/前端10API), SRM(后端40路由/前端10API), MES(后端50路由/前端40API)
3. **前端有API但后端需完善的模块**: PDM(前端20API/后端40路由), ERP(前端50API/后端60路由)
4. **unified-core核心模块**: 约312个路由，是最大的后端服务，前端API覆盖率约58%

### 按功能域

| 功能域 | 完成度 | 说明 |
|--------|-------|------|
| 认证与权限 | 85% | JWT + RBAC 已实现 |
| 系统管理 | 70% | 用户/角色/权限完整，字典/审计需完善 |
| 文档管理 | 60% | 基础功能可用，知识库待完善 |
| 工作流 | 40% | 引擎已实现，可视化设计器待开发 |
| 通知中心 | 75% | 站内信/邮件已实现，推送待完善 |
| 文件管理 | 50% | 上传下载可用，版本/分享待完善 |
| AI 集成 | 30% | 基础对话可用，向量搜索待完善 |

---

## 🔧 技术债务

| 债务 | 优先级 | 状态 |
|------|--------|------|
| TypeScript 类型错误 (~47个) | P1 | ✅ 已修复（0 错误） |
| 代码重复 (页面组件结构) | P2 | ✅ 13 个模板 + MasterDetailPageTemplate |
| 测试覆盖不足 | P2 | 📋 |
| 首屏加载时间 | P2 | 📋 |
| 大列表无虚拟滚动 | P2 | 📋 |
| eslint-plugin-jsx-a11y 缺失 | P3 | ✅ 已集成 |

---

## 📚 相关文档

- [架构设计](docs/architecture/overview.md) - 系统架构总览
- [数据库设计](docs/architecture/database.md) - 数据库 Schema 设计
- [部署指南](docs/deployment-guide.md) - 部署说明
- [API 文档](docs/api/README.md) - RESTful API 接口
- [贡献指南](CONTRIBUTING.md) - 开发贡献规范
- [文档中心](docs/README.md) - 完整文档索引
- [报告与分析](docs/reports/) - 项目分析报告

---

*最后更新: 2026-06-28 | 版本: 3.2*
