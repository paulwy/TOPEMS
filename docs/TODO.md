# TOPEMS 待办事项

> 最后更新：2026-06-27

## 当前阶段：V5.0.0 - 长尾功能与优化

---

## V4.2.0 - 页面审查与功能完善 ✅

### 第一阶段：P0 问题修复 ✅

| 事项 | 状态 | 说明 |
|---|---|---|
| `/srm/sourcing` 路由缺失 | ✅ | 删除菜单项（无后端功能） |
| DictionaryManagementPage 对接后端 | ✅ | 已对接真实 API |
| DatabaseStructurePage 对接后端 | ✅ | 已对接真实 API |
| AuditLogPage 对接后端 | ✅ | 已对接真实 API |
| MigrationAdminPage 对接后端 | ✅ | 已对接真实 API |
| `/crm/dashboard` 添加菜单 | ✅ | CRM 仪表盘 |
| `/crm/contacts` 添加菜单 | ✅ | 联系人管理 |
| `/crm/interactions` 添加菜单 | ✅ | 交互记录 |
| `/crm/forecast` 添加菜单 | ✅ | 销售预测 |
| `/crm/scoring` 添加菜单 | ✅ | 客户评分 |
| `/crm/billing` 添加菜单 | ✅ | 账单管理 |
| `/finance/budget-management` 添加菜单 | ✅ | 预算管理 |
| `/finance/opening-balance` 添加菜单 | ✅ | 期初余额 |
| `/finance/consolidation-reports` 添加菜单 | ✅ | 合并报表 |
| `/scm/purchase-items` 添加菜单 | ✅ | 采购物料 |
| `/scm/evaluations` 添加菜单 | ✅ | 供应商评估 |
| `/pm/dashboard` 添加菜单 | ✅ | PM 仪表盘 |
| 库位管理页面 | ✅ | LocationPage.tsx |
| 库存调拨页面 | ✅ | TransferPage.tsx |
| 补货管理页面 | ✅ | ReplenishmentPage.tsx |
| 环境管理页面 | ✅ | EnvironmentPage.tsx |
| 职业健康管理页面 | ✅ | HealthManagementPage.tsx |
| 应急管理页面 | ✅ | EmergencyPage.tsx |
| 产品管理页面 | ✅ | ProductPage.tsx |
| 物料管理页面 | ✅ | MaterialPage.tsx |
| 变更管理页面 | ✅ | ChangePage.tsx |

### 第二阶段：P1 核心功能完善 ✅

| 事项 | 状态 | 说明 |
|---|---|---|
| SPC 统计过程控制页面 | ✅ | QmsSpcPage.tsx |
| 8D 问题解决页面 | ✅ | QmsEightDPage.tsx |
| FMEA 失效模式分析页面 | ✅ | QmsFmeaPage.tsx |
| 质量成本分析页面 | ✅ | QmsQualityCostPage.tsx |
| 工单详情页面 | ✅ | ProductionOrderDetailPage.tsx |
| 物料追溯详情页面 | ✅ | TraceabilityDetailPage.tsx |
| 设备维护详情页面 | ✅ | EquipmentMaintenanceDetailPage.tsx |
| MRP 计划页面 | ✅ | MrpPlanPage.tsx |
| MRP 建议页面 | ✅ | MrpSuggestionPage.tsx |
| 试剂管理页面 | ✅ | 已存在 |
| 仪器管理页面 | ✅ | 已存在 |
| 条码管理页面 | ✅ | 已存在 |

### 第三阶段：P2 规范优化 ✅

| 事项 | 状态 | 说明 |
|---|---|---|
| /system/* → /iam/* 统一 | ✅ | 删除 6 个重复路径 |
| /meeting-room → /meeting-rooms 统一 | ✅ | 统一复数形式 |
| /finance/financial-reports → /finance/reports | ✅ | 统一标准路径 |
| OA 模块归属清晰化 | ✅ | OA 菜单项归属 ERP 模块 |
| 跨模块入口整理 | ✅ | 删除 5 个 ERP 下的重复入口 |
| 移动端 Mock 对接 | ✅ | 首页/任务/审批对接真实 API |

---

## V5.0.0 - 长尾功能与优化 ✅

> 目标：完善长尾模块功能，提升代码质量和性能

### 第一阶段：长尾模块功能完善 ✅

#### 1. WMS 模块完善（完整度 ~50%）

| 事项 | 优先级 | 状态 | 说明 |
|---|---|---|---|
| 入库管理页面 | P1 | ✅ | InboundPage.tsx |
| 出库管理页面 | P1 | ✅ | OutboundPage.tsx |
| 库存报表页面 | P2 | ✅ | InventoryReportPage.tsx |

#### 2. MES 模块完善（完整度 ~50%）

| 事项 | 优先级 | 状态 | 说明 |
|---|---|---|---|
| 工序管理页面 | P1 | ✅ | ProcessRoutePage.tsx |
| 工艺路线页面 | P1 | ✅ | ProcessFlowPage.tsx |
| MES 质检管理页面 | P1 | ✅ | MesQualityPage.tsx |

#### 3. EHS 模块完善（完整度 ~50%）

| 事项 | 优先级 | 状态 | 说明 |
|---|---|---|---|
| 培训管理页面 | P1 | ✅ | TrainingPage.tsx |
| 合规管理页面 | P1 | ✅ | CompliancePage.tsx |
| 隐患管理页面 | P1 | ✅ | HazardPage.tsx |
| 安全检查页面 | P2 | 安全检查/整改跟踪 |

#### 4. PDM 模块完善（完整度 ~50%）

| 事项 | 优先级 | 状态 | 说明 |
|---|---|---|---|
| BOM 管理页面 | P1 | ✅ | BomPage.tsx |
| 项目管理页面 | P1 | ✅ | PdmProjectPage.tsx |
| 文档管理页面 | P1 | ✅ | DocumentPage.tsx |
| 配置管理页面 | P2 | | 产品配置/选项管理 |

#### 5. LIMS 模块完善（完整度 ~50%）

| 事项 | 优先级 | 状态 | 说明 |
|---|---|---|---|
| 样本接收页面 | P1 | ✅ | SampleReceivePage.tsx |
| 检验任务页面 | P1 | ✅ | InspectionTaskPage.tsx |
| 检验结果页面 | P2 | | 结果录入/审核 |

### 第二阶段：代码质量优化

| 事项 | 优先级 | 状态 | 说明 |
|---|---|---|---|
| ESLint 警告清理 | P1 | 🔄 | 剩余 ~3997 个警告（warnings，非 errors），主要为 no-unused-vars / no-explicit-any |
| TypeScript 类型完善 | P1 | ✅ | TypeScript 编译 0 errors |
| 组件 PropTypes 补充 | P2 | | 运行时类型检查 |
| 注释和文档完善 | P3 | | JSDoc 注释补充 |

### 第三阶段：性能优化

| 事项 | 优先级 | 状态 | 说明 |
|---|---|---|---|
| Bundle 大小分析 | P1 | ✅ | 已分析，react-vendor 2.5M，最大页面 AIPage 797K |
| 路由懒加载优化 | P2 | ✅ | 277 个页面全部懒加载 |
| 图片懒加载 | P2 | | 非首屏图片延迟加载 |
| API 请求优化 | P2 | | 请求缓存/去重 |

### 第四阶段：用户体验提升

| 事项 | 优先级 | 状态 | 说明 |
|---|---|---|---|
| 移动端适配完善 | P1 | ✅ | useMediaQuery/useResponsive 广泛使用 |
| 加载状态优化 | P2 | ✅ | MobileSkeleton/BISkeleton/LoadingFallback 已实现 |
| 错误边界处理 | P2 | ✅ | ErrorBoundary（Page/Module/Component）已完善 |
| 空状态页面 | P2 | ✅ | EmptyState 含 List/Search/Permission/Error 预设 |

---

## 已完成 ✅

### V4.1.0 - 视觉一致性与代码质量优化

- [x]  页面头部视觉一致性（22 个主页面统一 pageIcon + pageGradient）
- [x]  代码质量优化（修复约 913 个 ESLint 警告）
- [x]  文档更新（page-unification-plan.md v1.1.0）

### V4.0.0 - 组件库统一与架构优化

- [x]  MUI v9 + React v19 升级
- [x]  组件库统一收敛（mui/ 目录删除，迁移到 common/）
- [x]  废弃组件清理
- [x]  导入路径统一
- [x]  路由级懒加载全覆盖

### V3.2.0 - 导航与路由优化

- [x]  NavigationRegistry 统一配置
- [x]  面包屑路径逻辑重写
- [x]  路由权限配置全覆盖
- [x]  根路由重定向统一

### V3.1.0 - 页面统一布局

- [x]  PageContainer 统一容器
- [x]  ListPageTemplate 列表页模板
- [x]  FormPageTemplate 表单页模板
- [x]  页面头部统一规范
