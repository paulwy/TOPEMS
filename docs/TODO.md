# TOPEMS 待办事项

> 最后更新：2026-06-29

## 当前阶段：V6.0.0 - 架构优化与设计系统升级 🚧

> 目标：简化架构、统一规范、提升可维护性。基于全量代码库深度分析，分四阶段实施。

### Phase 0：紧急止血（1天）⚡

| 事项 | 优先级 | 状态 | 说明 |
|---|---|---|---|
| .env 密码泄露处理 | P0 | ✅ | 已替换 .env.example 中的真实密码为占位符 |
| MIME 错误修复（tokens + core-modules） | P0 | ✅ | Vite alias + 移除 MF 远程导入 |
| 废弃服务目录清理 | P0 | ✅ | 删除 4 个废弃目录（84 个文件）：bi.deprecated/manufacturing/quality-assurance/config-center |

### Phase 1：架构简化（2周）🔧

**目标：消除最严重的架构冗余，降低维护成本**

| 事项 | 优先级 | 状态 | 说明 |
|---|---|---|---|
| 导航系统统一（NavigationRegistry 唯一真相源） | P0 | ✅ | sidebar_nav + module_tabs 从 Registry 派生，29 模块已注册 |
| Token 四重去重（packages/tokens 为唯一源） | P0 | ✅ | 移除 780+ 行重复代码，gradients 迁移到 tokens 包 |
| MUI v9 CSS Variables 启用 | P0 | ✅ | cssVarPrefix 改为 topems，137 处变量引用统一 |
| Module Federation 移除 + DynamicRouter 简化 | P1 | ✅ | 净减少 298 行代码，MIME 错误彻底解决 |
| useAppStore 上帝对象拆分 | P1 | ✅ | 拆分为 authStore/themeStore/notificationStore/uiStore/shortcutsStore/workflowStore |

### Phase 2：规范统一（4周）📋

**目标：建立统一的开发规范，减少技术债务**

| 事项 | 优先级 | 状态 | 说明 |
|---|---|---|---|
| API 路由前缀统一 + 权限命名规范 | P1 | ✅ | /api/v1/{service}/{resource} 格式，API 客户端已支持版本前缀 |
| 数据库迁移统一（sqlx migrations） | P1 | ✅ | scm/wms 内联 init_db 已移除，迁移到 sqlx migrations |
| ESLint warning 分阶段清零 | P1 | ✅ | 修复 naming-convention 数字属性名规则 + unicorn/custom-error-definition |
| 硬编码颜色自动化替换 | P1 | ✅ | COLORS 常量定义完善，支持 theme token 替换 |
| 样式范式统一规范 | P2 | ✅ | styled() 仅用于需要 shouldForwardProp 的动态自定义 props 场景，其余使用 sx prop |
| 页面治理（Dashboard 整合 + 废弃清理） | P2 | ✅ | shared/DashboardPage.tsx 已作为统一工作台入口，删除 7 个 .bak 废弃文件 |

### Phase 3：能力提升（8周）🚀

**目标：提升系统质量和开发体验**

| 事项 | 优先级 | 状态 | 说明 |
|---|---|---|---|
| 多租户行级隔离完善 | P1 | ✅ | QMS 25 张表 + EHS 39 张表添加 tenant_id 字段和索引，lib 层添加 RLS 中间件支持 |
| unified-core 边界重构 | P1 | ✅ | Finance/Doc/AI 移出 core，core 保留 8 基础模块（IAM/Flow/File/Communication/Tenant/Billing/Plugin/Sync） |
| 事件驱动架构深化 | P2 | ✅ | 添加 RabbitMQ 发布者/订阅者实现（lapin），支持 Topic Exchange 和消息确认 |
| 测试体系建设 | P2 | ✅ | 53 个测试文件（287 用例）运行成功，覆盖率阈值配置完成 |
| CI/CD 流水线完善 + 质量门禁 | P2 | ✅ | 添加覆盖率门禁（statements≥60%, branches≥50%, functions≥60%, lines≥60%）和 Bundle size 监控 |

---

## V5.0.0 - 已完成 ✅

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
| 安全检查页面 | P2 | ✅ | EhsCheckPage.tsx（安全检查/整改跟踪） |

#### 4. PDM 模块完善（完整度 ~50%）

| 事项 | 优先级 | 状态 | 说明 |
|---|---|---|---|
| BOM 管理页面 | P1 | ✅ | BomPage.tsx |
| 项目管理页面 | P1 | ✅ | PdmProjectPage.tsx |
| 文档管理页面 | P1 | ✅ | DocumentPage.tsx |
| 配置管理页面 | P2 | ✅ | PdmProductConfigPage.tsx（产品配置/选项管理） |

#### 5. LIMS 模块完善（完整度 ~50%）

| 事项 | 优先级 | 状态 | 说明 |
|---|---|---|---|
| 样本接收页面 | P1 | ✅ | SampleReceivePage.tsx |
| 检验任务页面 | P1 | ✅ | InspectionTaskPage.tsx |
| 检验结果页面 | P2 | ✅ | InspectionResultPage.tsx（结果录入/审核） |

### 第二阶段：代码质量优化 ✅

| 事项 | 优先级 | 状态 | 说明 |
|---|---|---|---|
| ESLint 警告清理 | P1 | ✅ | 剩余 2 个警告（文件名命名规范，可保留） |
| TypeScript 类型完善 | P1 | ✅ | TypeScript 编译 0 errors |
| 组件 PropTypes 补充 | P2 | ✅ | TypeScript 类型系统已覆盖运行时检查需求 |
| 注释和文档完善 | P3 | ✅ | 核心组件和工具函数已完善 |

### 第三阶段：性能优化 ✅

| 事项 | 优先级 | 状态 | 说明 |
|---|---|---|---|
| Bundle 大小分析 | P1 | ✅ | 已分析，react-vendor 2.5M，最大页面 AIPage 797K |
| 路由懒加载优化 | P2 | ✅ | 277 个页面全部懒加载 |
| 图片懒加载 | P2 | ✅ | LazyImage.tsx 组件已实现，支持 IntersectionObserver |
| API 请求优化 | P2 | ✅ | apiCache.ts 缓存/去重工具 + useCrud 内置缓存 |

### 第四阶段：用户体验提升 ✅

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
- [x]  文档更新（page-unification-plan.md v1.2.0）

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
