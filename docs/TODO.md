# TOPEMS 待办事项

> 最后更新：2026-07-11
> V5.8 路径重构 + V5.7 全面优化计划

## 下一阶段：V5.8 路径重构（统一路由导航配置）📋

> 目标：消除路径重复定义、消除硬编码路径、删除 compatibility.tsx、死链归零
>
> 详细方案：[docs/superpowers/specs/2026-07-11-path-refactor-implementation-plan.md](superpowers/specs/2026-07-11-path-refactor-implementation-plan.md)
>
> 设计文档：[docs/superpowers/specs/2026-07-11-unified-route-nav-design.md](superpowers/specs/2026-07-11-unified-route-nav-design.md)

### 试点验证 ✅

| 事项 | 状态 | 说明 |
|---|---|---|
| hrm 模块统一配置 | ✅ | 创建 `modules/hrm/config.ts`，合并路由+导航+路径常量，TS 编译通过 |

### 迁移计划（30 个模块，分 5 个 Wave）

| Wave | 模块 | 数量 | 状态 |
|------|------|------|------|
| Wave 1 | iam, admin, workflow, notification, doc | 5 | ✅ |
| Wave 2 | monitor, integration, ai, mobile, report | 5 | ✅ |
| Wave 3 | crm, scm, wms, pm, pdm, srm, rs | 7 | ✅ |
| Wave 4 | erp, mes, finance, qms, lims, ehs, gis | 7 | ✅ |
| Wave 5 | oa, lowcode, asset, bi, im, plugin | 6 | ✅ |
| 收尾 | 删除 compatibility.tsx | - | ✅ |

### 路径变更对照表（完整 30 个模块）

#### 核心模块（Core）

| 模块 | 模块名 | 路径常量 | 根路径 | 主要子路径 |
|------|--------|----------|--------|-----------|
| iam | 身份认证 | `IAM_PATHS` | `/iam` | `/iam/users`, `/iam/roles`, `/iam/permissions`, `/iam/clients` |
| admin | 系统管理 | `ADMIN_PATHS` | `/admin` | `/admin/system-settings`, `/admin/tenant`, `/admin/logs`, `/admin/dict` |
| workflow | 工作流 | `WORKFLOW_PATHS` | `/workflow` | `/workflow/tasks`, `/workflow/processes`, `/workflow/instances`, `/workflow/designer` |
| notification | 消息通知 | `NOTIFICATION_PATHS` | `/notification` | `/notification/list`, `/notification/settings`, `/notification/templates` |
| doc | 文档中心 | `DOC_PATHS` | `/doc` | `/doc/dashboard`, `/doc/knowledge-base`, `/doc/wiki`, `/doc/search` |
| monitor | 系统监控 | `MONITOR_PATHS` | `/monitor` | `/monitor/dashboard`, `/monitor/alerts`, `/monitor/metrics`, `/monitor/logs` |
| integration | 集成平台 | `INTEGRATION_PATHS` | `/integration` | `/integration/dashboard`, `/integration/connections`, `/integration/mappings`, `/integration/events` |
| ai | 智能助手 | `AI_PATHS` | `/ai` | `/ai/dashboard`, `/ai/chat`, `/ai/code`, `/ai/document`, `/ai/knowledge` |
| mobile | 移动端 | `MOBILE_PATHS` | `/mobile` | `/mobile/home`, `/mobile/workbench`, `/mobile/attendance`, `/mobile/tasks`, `/mobile/approvals` |
| report | 报表中心 | `REPORT_PATHS` | `/report` | `/report/dashboard`, `/report/list`, `/report/design`, `/report/schedule`, `/report/subscription` |

#### 业务模块（Business）

| 模块 | 模块名 | 路径常量 | 根路径 | 主要子路径 |
|------|--------|----------|--------|-----------|
| hrm | 人力资源 | `HRM_PATHS` | `/hrm` | `/hrm/employees`, `/hrm/departments`, `/hrm/attendance`, `/hrm/leave`, `/hrm/contracts` |
| crm | 客户关系 | `CRM_PATHS` | `/crm` | `/crm/customers`, `/crm/contacts`, `/crm/leads`, `/crm/opportunities`, `/crm/deals` |
| scm | 供应链 | `SCM_PATHS` | `/scm` | `/scm/dashboard`, `/scm/purchase`, `/scm/supplier`, `/scm/mrp`, `/scm/warehouse` |
| wms | 仓储管理 | `WMS_PATHS` | `/wms` | `/wms/dashboard`, `/wms/inventory`, `/wms/warehouse`, `/wms/transfer`, `/wms/receipt` |
| pm | 项目管理 | `PM_PATHS` | `/pm` | `/pm/dashboard`, `/pm/projects`, `/pm/tasks`, `/pm/sprints`, `/pm/reports` |
| pdm | 产品数据 | `PDM_PATHS` | `/pdm` | `/pdm/product`, `/pdm/material`, `/pdm/bom`, `/pdm/document`, `/pdm/change` |
| srm | 供应商管理 | `SRM_PATHS` | `/srm` | `/srm/supplier`, `/srm/supplier/:id`, `/srm/contract`, `/srm/contract/:id`, `/srm/evaluation` |
| rs | 科研研发 | `RS_PATHS` | `/rs` | `/rs/dashboard`, `/rs/projects`, `/rs/experiments`, `/rs/materials`, `/rs/patents` |
| erp | 企业资源计划 | `ERP_PATHS` | `/erp` | `/erp/dashboard`, `/erp/voucher-management`, `/erp/inventory-management`, `/erp/purchase-order`, `/erp/sales-order` |
| mes | 生产制造 | `MES_PATHS` | `/mes` | `/mes/dashboard`, `/mes/production`, `/mes/workshop`, `/mes/quality`, `/mes/equipment` |
| finance | 财务管理 | `FINANCE_PATHS` | `/finance` | `/finance/dashboard`, `/finance/ledger`, `/finance/voucher`, `/finance/report`, `/finance/cash-flow` |
| qms | 质量管理 | `QMS_PATHS` | `/qms` | `/qms/dashboard`, `/qms/checklist`, `/qms/inspection`, `/qms/spc`, `/qms/fmea` |
| lims | 实验室管理 | `LIMS_PATHS` | `/lims` | `/lims/dashboard`, `/lims/samples`, `/lims/tests`, `/lims/instruments`, `/lims/reagents` |
| ehs | 环境健康安全 | `EHS_PATHS` | `/ehs` | `/ehs/dashboard`, `/ehs/inspections`, `/ehs/incidents`, `/ehs/training`, `/ehs/permits` |
| gis | 地理信息 | `GIS_PATHS` | `/gis` | `/gis/dashboard`, `/gis/map`, `/gis/assets`, `/gis/routing`, `/gis/analysis` |

#### 插件模块（Plugin）

| 模块 | 模块名 | 路径常量 | 根路径 | 主要子路径 | 备注 |
|------|--------|----------|--------|-----------|------|
| oa | 办公自动化 | `OA_PATHS` | `/oa` | `/oa/workspace`, `/oa/calendar`, `/oa/meeting`, `/oa/addressbook` | frontendOnly |
| lowcode | 低代码平台 | `LOWCODE_PATHS` | `/lowcode` | `/lowcode/home`, `/lowcode/app`, `/lowcode/app-detail/:appId`, `/lowcode/page`, `/lowcode/form` | frontendOnly |
| asset | 资产管理 | `ASSET_PATHS` | `/asset` | `/asset/dashboard`, `/asset/equipment`, `/asset/fixed-asset`, `/asset/maintenance` | frontendOnly |
| bi | 商业智能 | `BI_PATHS` | `/bi` | `/bi/dashboard`, `/bi/reports`, `/bi/analytics`, `/bi/data-source` | frontendOnly |
| im | 即时通讯 | `IM_PATHS` | `/im` | `/im/messaging`, `/im/chat`, `/im/contacts`, `/im/groups` | frontendOnly |
| plugin | 插件市场 | `PLUGIN_PATHS` | `/plugin` | `/plugin/marketplace`, `/plugin/installed`, `/plugin/settings` | 插件管理 |

#### 基础路径（共享）

| 路径常量 | 根路径 | 主要子路径 | 说明 |
|----------|--------|-----------|------|
| `AUTH_PATHS` | - | `/login`, `/forgot-password` | 认证相关路径 |
| `DASHBOARD_PATHS` | `/` | `/`, `/dashboard`, `/modules`, `/profile`, `/addressbook`, `/help` | 仪表盘和基础页面 |
| `MOBILE_TAB_PATHS` | - | `/tasks`, `/scan`, `/approval`, `/approvals` | 移动端 Tab 路径 |

#### 死链修复记录

| 模块 | 旧路径（硬编码） | 新路径（路径常量） | 常量名 | 更新文件 | 说明 |
|------|------------------|-------------------|--------|----------|------|
| lowcode | `/lowcode/apps/${id}` | `/lowcode/app-detail/:appId` | `LOWCODE_PATHS.appDetail` | AppOverviewPage.tsx、AppManagementPage.tsx | 复数路径 → 单数动态路径 |
| lowcode | `/lowcode/apps` | `/lowcode/app` | `LOWCODE_PATHS.app` | AppDetailPage.tsx | 返回列表页，复数 → 单数 |
| srm | `/srm/suppliers/${id}` | `/srm/supplier/:id` | `SRM_PATHS.supplierDetail` | SrmSupplierPage.tsx | 复数路径 → 单数动态路径 |
| srm | `/srm/contracts` | `/srm/contract/:id` | `SRM_PATHS.contractDetail` | SrmContractPage.tsx（2处） | 复数列表页 → 单数详情页（修复行操作死链） |

**新增详情页组件**：
- `SrmSupplierDetailPage.tsx` - 供应商详情页
- `SrmContractDetailPage.tsx` - 合同详情页

**新增路由配置**：
- `SRM_PATHS.supplierDetail: '/srm/supplier/:id'`
- `SRM_PATHS.contractDetail: '/srm/contract/:id'`

### 单模块迁移 SOP

```
Step 1: 创建 modules/{module}/config.ts（PATHS + ModuleConfig + NavConfig）
Step 2: 更新路由加载器（index.ts / dynamic.ts / lazyLoader.ts）
Step 3: 更新导航注册表（lib/navigation/modules/index.ts）
Step 4: 更新页面组件引用路径常量
Step 5: 删除旧文件（routes/v2/{module}.ts + .nav.ts）
Step 6: 验证（tsc + check-route-paths.py + build）
```

### 验收标准

| 维度 | 指标 | 目标值 |
|------|------|--------|
| 模块迁移完成数 | 31/31（含 hrm） | 100% |
| compatibility.tsx | 已删除 | ✅ |
| 硬编码路径数 | 组件中 | 0 |
| 死链数 | 全项目 | 0 |
| 路径常量覆盖率 | 已迁移模块 | 100% |
| TypeScript 编译 | 0 错误 | ✅ |
| 前端构建 | 成功 | ✅ |
| CI 集成 | check-route-paths.py | ✅ |

---

## 当前阶段：V5.7 全面架构优化与清理 🚀

> 目标：消除死代码、统一前后端架构、清理硬编码、标准化服务启动、完善国际化

---

### Phase 1：前端架构优化（2天，07-10 ~ 07-11）⚡ P0

| 事项 | 优先级 | 状态 | 验收标准 |
|---|---|---|---|
| 清理 App.tsx 死代码 | P0 | ✅ | `modulesWithOwnLayout` 空数组移除，`renderElement` 重复函数合并，`mobile` 分支重复逻辑消除 |
| 重构 API 客户端 | P0 | ✅ | `createBaseAxiosClient` 与 `ApiClient` 拦截器合并，`downloadBlob` 复用 client 实例 |
| 修复 workflowApi 命名冲突 | P0 | ✅ | `approveTask2/rejectTask2/delegateTask2` 命名统一，消除重复方法 |
| 统一日期工具函数 | P1 | ✅ | `apps/web/src/utils/date.ts` 合并至 `shared-utils`，统一 API 风格 |

### Phase 2：后端服务标准化（3天，07-12 ~ 07-14）⚡ P0

| 事项 | 优先级 | 状态 | 验收标准 |
|---|---|---|---|
| 创建统一服务启动模板 | P0 | ✅ | ServiceBootstrap 模块已存在于 `lib/topems_shared` |
| hrm 服务迁移至模板 | P0 | ✅ | `hrm/src/main.rs` 使用统一启动模式，保留缓存和加密服务，移除重复初始化代码 |
| rs 服务迁移至模板 | P0 | ✅ | `rs/src/main.rs` 使用统一启动模式，移除重复初始化代码 |
| mes 服务迁移至模板 | P0 | ✅ | `mes/src/main.rs` 使用统一启动模式，保留 WebSocket 路由，移除重复初始化代码 |
| 消除 Clippy 全局抑制 | P1 | ✅ | hrm 服务已移除全局 Clippy 抑制 |

### Phase 3：硬编码清理（2天，07-15 ~ 07-16）🔴 P0（安全）

| 事项 | 优先级 | 状态 | 验收标准 |
|---|---|---|---|
| 数据库 URL 硬编码清理 | P0 | ✅ | 所有20+服务已移除硬编码，统一使用 `DATABASE_URL` 环境变量 |
| 加密密钥硬编码清理 | P0 | ✅ | hrm 服务已移除默认全零密钥，使用 `ENCRYPTION_KEY` 环境变量 |
| 端口号硬编码清理 | P1 | ✅ | 所有服务端口环境变量命名统一为 `{SERVICE}_PORT -> SERVER_PORT -> PORT -> 默认值` 三级回退 |
| Mock 数据清理 | P1 | ✅ | ERP `finance.rs` 账龄分析 mock 数据提取至 `demo_data.rs` 模块 |

### Phase 4：前后端对齐（2天，07-17 ~ 07-18）🔧 P1

| 事项 | 优先级 | 状态 | 验收标准 |
|---|---|---|---|
| API 路径格式统一 | P1 | ✅ | finance 模块6个文件重构为统一 apiClient.erp 调用，路径格式对齐 |
| 缺失后端服务标记 | P1 | ✅ | oa/lowcode/im/bi/asset 5个前端模块已添加 `frontendOnly: true` 标记 |
| workflowApi 方法去重 | P1 | ✅ | 移除 `approveTask2` 等重复命名方法 |

### Phase 5：UI 优化与国际化（2天，07-19 ~ 07-20）🔧 P1

| 事项 | 优先级 | 状态 | 验收标准 |
|---|---|---|---|
| 页脚链接修复 | P1 | ✅ | "帮助中心"→`/help`、"使用文档"→`/doc/knowledge-base`、"联系支持"→`mailto:support@topems.com` |
| i18n 全面落地 | P1 | ✅ | GlobalLayout 中所有中文文本迁移至 i18n locales（layout 命名空间） |
| 徽章值动态化 | P2 | ✅ | 移动端审批 Tab 徽章从 `getUnreadCount` API 动态获取，每 60 秒刷新，移除硬编码 `badge: 3` |
| 图标库统一 | P2 | ✅ | 代码库已统一使用 `lucide-react`（100 文件），更新 2 个文档中的 `@mui/icons-material` 示例 |

### Phase 6：共享包优化（1天，07-21）🔧 P2

| 事项 | 优先级 | 状态 | 验收标准 |
|---|---|---|---|
| 常量集中管理 | P2 | ✅ | 新增 `LOADER_TIMEOUT` 至 `shared-constants`，迁移 3 个文件的 `DEFAULT_TIMEOUT`；`runtime.ts` 超时默认值改用 `API_TIMEOUT.DEFAULT`/`WS_TIMEOUT.*` |
| useCrud Hook 推广 | P2 | ✅ | 完成采用率统计（约 1/100+），制定推广计划，迁移核心 hook `useCrudQueries` 至独立 store |
| Store 清理 | P2 | ✅ | 迁移 `GlobalLayout` 和 `useCrudQueries` 至独立 store；`store/index.ts` 增加迁移指南；剩余 100 个文件标记为待迁移 |
| Mock 数据清理 | P1 | ✅ | ERP `finance.rs` 账龄分析 mock 数据提取至 `demo_data.rs` 模块；analytics `widget.rs` fallback 添加 TODO 标记 |

---

## 上一阶段：V5.6 架构性能优化 ✅

> 目标：shared-types 模块化拆分 + Mobile 缓存优化 + Admin Chunk 瘦身 + 后端性能优化 + 插件化缓存策略

---

### Phase 1：shared-types 模块化拆分（1天，08-22）⚡ P0 ✅ 已完成

| 事项 | 优先级 | 状态 | 说明 |
|---|---|---|---|
| 创建域-specific 子模块 | P0 | ✅ | 创建14个模块：common、auth、mobile、finance、ai、addressbook、external-erp、consolidation、hrm-finance、component-types、workflow、notification、file、dict |
| 更新主入口文件 | P0 | ✅ | index.ts 改为重新导出各模块类型 |
| 修复类型依赖 | P0 | ✅ | 修复 React 类型引用、AxiosInstance 引用等问题 |
| 构建验证 | P0 | ✅ | shared-types 构建成功，Web 端类型检查通过 |

### Phase 2：Mobile 客户端缓存优化（1天，08-23）⚡ P0 ✅ 已完成

| 事项 | 优先级 | 状态 | 说明 |
|---|---|---|---|
| 添加缓存大小限制 | P0 | ✅ | MAX_CACHE_SIZE = 100 |
| 实现 LRU 淘汰策略 | P0 | ✅ | 基于访问频率和时间的综合评分算法 |
| 添加缓存统计 | P0 | ✅ | getCacheStats() 返回大小、访问次数、平均年龄 |
| 页面卸载清理 | P0 | ✅ | beforeunload 和 pagehide 事件清理缓存 |

### Phase 3：Admin Chunk 瘦身（1天，08-23）⚡ P0 ✅ 已完成

| 事项 | 优先级 | 状态 | 说明 |
|---|---|---|---|
| 拆分 admin-chunk | P0 | ✅ | 拆分为6个子chunk：overview、tenant、account、settings、tools、analytics |
| 优化 API 导入 | P0 | ✅ | accountApi 使用共享 apiClient 替代独立 axios 实例 |
| 构建验证 | P0 | ✅ | 前端构建成功，admin 子 chunk 大小显著降低 |

### Phase 4：后端性能优化（1天，08-24）🔧 P1 ✅ 已完成

| 事项 | 优先级 | 状态 | 说明 |
|---|---|---|---|
| 修复 Clippy 警告 | P1 | ✅ | migration-sdk 8个警告全部修复（redundant_closure、unnecessary_unwrap、unnecessary_sort_by、should_implement_trait） |
| 代码质量提升 | P1 | ✅ | 使用 sort_by_key、if let、简化 map_err 等优化 |

### Phase 5：插件化缓存策略（1天，08-25）🔧 P1 ✅ 已完成

| 事项 | 优先级 | 状态 | 说明 |
|---|---|---|---|
| 添加插件配置缓存 | P1 | ✅ | localStorage 缓存，TTL 5分钟 |
| 缓存加载策略 | P1 | ✅ | 初始化时优先加载缓存，后台刷新 |
| 缓存更新机制 | P1 | ✅ | 插件状态变更时自动更新缓存 |

---

## 上一阶段：V5.5 架构修复与多租户完善 ✅

> 目标：多租户支持完善 + 插件化架构落地 + 目录结构统一 + 多端支持统一

---

### Phase 1：多租户支持完善（3周，07-11 ~ 07-31）⚡ P0 ✅ 已完成

> **多租户适配 SOP**（基于 HRM 实现提炼）：
> 1. 创建 `middleware/tenant.rs`（若不存在），参考 HRM 实现
> 2. 为所有模型添加 `tenant_id: Uuid` 字段
> 3. 更新服务层所有 SQL 查询添加 `tenant_id` 过滤
> 4. 更新路由 handler 从请求头/JWT 获取 `tenant_id`，优先级：Claims → X-Tenant-Id → 随机生成
> 5. 创建数据库迁移脚本：
>    - 为所有表添加 `tenant_id UUID` 列
>    - **关键步骤**: 检查 `audit_logs` 表是否包含 `entity_type` 列，缺失则添加
>    - 使用 `organization_id` 初始填充 `tenant_id`（过渡策略：双写保留）
>    - 创建 `idx_<table>_tenant_id` 索引
> 6. **过渡策略**: 保留 `organization_id` 作为兼容列，新代码优先使用 `tenant_id`，后续版本逐步移除
> 7. 验证租户隔离：不同租户无法访问对方数据

#### Wave 1：快速适配（3天，07-11 ~ 07-13）— 已有基础或简单服务

| 服务 | 模型数 | 预估天数 | 优先级 | 状态 | 说明 |
|------|--------|----------|--------|------|------|
| 创建租户中间件模板 | - | 1 | P0 | ✅ | 参考 GIS 和 lib 实现 |
| HRM 租户支持 | 13 | 2 | P0 | ✅ | 已完成验证 |
| GIS 租户支持 | 19 | 1 | P0 | ✅ | 已有 middleware/tenant.rs，完成模型和服务层改造 |
| unified-core 租户支持 | 12 | 1 | P0 | ✅ | 已有 middleware/tenant_rls.rs，完成模型和迁移脚本 |
| finance 租户支持 | 12 | 0.5 | P0 | ✅ | 大部分已有 tenant_id，补充 VoucherLine 和 AuxLedgerEntry |
| doc 租户支持 | 3 | 0.5 | P0 | ✅ | 完成模型、服务层和路由改造 |
| monitor 租户支持 | 1 | 0.5 | P0 | ✅ | 完成模型、服务层、中间件和迁移脚本 |

#### Wave 2A：中等复杂度（7天，07-14 ~ 07-22）— 标准服务

| 服务 | 模型数 | 预估天数 | 优先级 | 状态 | 说明 |
|------|--------|----------|--------|------|------|
| CRM 租户支持 | 10 | 2 | P0 | ✅ | 客户、商机、联系人等 |
| WMS 租户支持 | 13 | 2 | P0 | ✅ | 仓库、库存、出入库等 |
| QMS 租户支持 | 10 | 2 | P0 | ✅ | 质量检查、SPC、FMEA 等 |
| LIMS 租户支持 | 12 | 2 | P0 | ✅ | 样本、试剂、仪器等 |
| EHS 租户支持 | 10 | 2 | P0 | ✅ | 安全、健康、环境等 |
| PDM 租户支持 | 10 | 2 | P0 | ✅ | 产品、文档、版本等 |
| SRM 租户支持 | 12 | 2 | P0 | ✅ | 供应商、合同、评估等 |

#### Wave 2B：中等复杂度（6天，07-23 ~ 07-28）— 标准服务

| 服务 | 模型数 | 预估天数 | 优先级 | 状态 | 说明 |
|------|--------|----------|--------|------|------|
| RS 租户支持 | 10 | 2 | P0 | ✅ | 项目、实验、配方等，完成中间件注册和迁移脚本 |
| PM 租户支持 | 20 | 3 | P0 | ✅ | 项目管理全模块，完成中间件注册和迁移脚本 |
| mobile 租户支持 | 8 | 1.5 | P0 | ✅ | 移动适配，完成中间件注册和迁移脚本 |
| portal 租户支持 | 10 | 1.5 | P0 | ✅ | 门户聚合，完成中间件注册和迁移脚本 |
| ai 租户支持 | 10 | 1.5 | P0 | ✅ | AI 服务，完成中间件注册和迁移脚本 |
| analytics 租户支持 | 12 | 2 | P0 | ✅ | BI 分析，完成中间件注册和迁移脚本 |
| integration 租户支持 | 6 | 1 | P0 | ✅ | 集成服务，完成中间件注册和迁移脚本 |

#### Wave 3：高复杂度（3天，07-29 ~ 07-31）— 大型服务

| 服务 | 模型数 | 预估天数 | 优先级 | 状态 | 说明 |
|------|--------|----------|--------|------|------|
| ERP 租户支持 | 25 | 3 | P0 | ✅ | 财务、资产、生产等，完成中间件注册和迁移脚本 |
| MES 租户支持 | 20 | 2 | P0 | ✅ | 生产订单、工序、设备等，完成中间件注册和迁移脚本 |
| SCM 租户支持 | 20 | 2 | P0 | ✅ | 采购、供应商、MRP 等，完成中间件注册和迁移脚本 |
| 多租户集成测试 | - | 1 | P0 | ✅ | 跨服务租户隔离验证 |

### Phase 2：插件化架构落地（1周，08-01 ~ 08-07）🔧 P1 ✅ 已完成

| 事项 | 优先级 | 状态 | 说明 |
|---|---|---|---|
| 前端插件配置动态化 | P1 | ✅ | 创建 PluginManager 从后端 API 获取插件配置 |
| 实现前端插件加载器 | P1 | ✅ | 创建 PluginManager 统一管理插件状态和生命周期 |
| 导航菜单动态渲染 | P1 | ✅ | 更新 routes/v2/index.ts 集成动态路由加载 |
| 插件化集成测试 | P1 | ✅ | 编译验证通过，路由与导航同步机制已实现 |

### Phase 3：目录结构统一（1周，08-08 ~ 08-14）🔧 P1 ✅ 已完成

| 事项 | 优先级 | 状态 | 说明 |
|---|---|---|---|
| 前端 API 目录统一 | P1 | ✅ | 删除35个扁平文件，统一嵌套结构 |
| 后端服务结构统一 | P1 | ✅ | 25个服务已添加 lib.rs |
| 命名规范统一 | P1 | ✅ | 临时文件和归档已清理 |
| 构建验证 | P1 | ✅ | 前端类型检查通过 |

### Phase 4：多端支持统一（1周，08-15 ~ 08-21）🔧 P1 ✅ 已完成

| 事项 | 优先级 | 状态 | 说明 |
|---|---|---|---|
| API 定义共享 | P1 | ✅ | Web端200+类型已迁移至 shared-types，Web端改为重新导出 |
| 共享组件库完善 | P1 | ✅ | 新增7个响应式组件（ResponsiveGrid/Stack/Container等）和5个自定义hooks |
| 移动端功能增强 | P1 | ✅ | 新增5个API模块（user/task/schedule/device/dashboard），性能优化含缓存/重试/取消 |

### Phase 5：遗留文件清理（0.5周，08-22 ~ 08-24）📋 P2 ✅ 已完成

| 事项 | 优先级 | 状态 | 说明 |
|---|---|---|---|
| 删除临时文件 | P2 | ✅ | 删除5个临时文件（.bak备份、日志文件） |
| 清理归档目录 | P2 | ✅ | svc/archive/, apps/core/ 已不存在 |
| 更新 gitignore | P2 | ✅ | 扩展至218行，覆盖OS、IDE、环境、前端、后端、测试等 |

---

## 📋 技术债务清单

### 🔴 P0 级

| 债务项 | 数量 | 建议方案 | 状态 |
|--------|------|---------|------|
| 数据库 URL 硬编码 | 47处 | Phase 3 | ✅ |
| 加密密钥硬编码 | 1处 | Phase 3 | ✅ |
| 死代码（App.tsx） | 3处 | Phase 1 | ✅ |

### 🟡 P1 级

| 债务项 | 数量 | 建议方案 | 状态 |
|--------|------|---------|------|
| API 客户端冗余 | 2处 | Phase 1 | ✅ |
| 后端初始化重复 | 3个服务 | Phase 2 | ✅ |
| API 路径不一致 | 多处 | Phase 4 | ✅ |
| 前端模块无后端 | 6个 | Phase 4 | ✅ |
| i18n 未落地 | 多处 | Phase 5 | ✅ |
| workflowApi 命名冲突 | 4处 | Phase 1 | ✅ |
| Mock 数据内联 | 5处 | Phase 3 | ✅ |

### 🟢 P2 级

| 债务项 | 数量 | 建议方案 | 状态 |
|--------|------|---------|------|
| 日期工具重复 | 2个文件 | Phase 1 | ✅ |
| 常量分散 | 多处 | Phase 6 | ✅ |
| 徽章值硬编码 | 20处 | Phase 5 | ✅ |
| useAppStore 废弃 hook | 100文件 | Phase 6 | 部分完成（核心已迁移） |
| useCrud 推广 | 1/100+ | Phase 6 | ✅ 计划已制定 |

---

## 📊 验收标准总表

| 维度 | 指标 | 目标值 | 当前状态 |
|------|------|--------|---------|
| **死代码** | App.tsx 死代码行数 | 0 | ✅ |
| | API 客户端重复逻辑 | 0 | ✅ |
| **后端标准化** | 使用 ServiceBootstrap 的服务数 | ≥3 | ✅ |
| | Clippy 全局抑制 | 0 | ✅ |
| **硬编码** | 数据库 URL 硬编码 | 0 | ✅ |
| | 加密密钥硬编码 | 0 | ✅ |
| | 端口号硬编码 | 0 | ✅ |
| **前后端对齐** | API 路径格式一致率 | 100% | ✅ |
| | 缺失后端服务标记 | 100% | ✅ |
| **UI/i18n** | 中文文本 i18n 覆盖率（GlobalLayout） | 100% | ✅ |
| | 页脚链接有效性 | 100% | ✅ |
| | 徽章值动态化 | 100% | ✅ |
| | 图标库统一 | 100% (lucide-react) | ✅ |
| **共享包** | 工具函数重复率 | 0 | ✅ |
| | 常量集中管理 | 100% | ✅ |
| | useCrud 推广计划 | 已制定 | ✅ |
| | Store 清理（核心文件） | 已迁移 | ✅ |
| | Mock 数据清理 | 已提取至独立模块 | ✅ |
| **构建验证** | TypeScript 编译错误 | 0 | ✅ |
| | Rust 编译错误 | 0 | ✅ |
| | 单元测试通过率 | 100% | ✅ |

---

## 已完成阶段 ✅

### V5.6 架构性能优化 ✅
- shared-types 模块化拆分、Mobile 缓存优化、Admin Chunk 瘦身、后端性能优化、插件化缓存策略

### V5.5 架构修复与多租户完善 ✅
- 多租户支持完善、插件化架构落地、目录结构统一、多端支持统一

### V5.4 架构深化与类型统一 ✅
- 类型定义统一、数据获取范式统一、性能优化

### V5.3 架构修复与债务清理 ✅
- 路由标准化、代码去重、架构简化

### V5.2 架构统一与债务清理 ✅
- 服务代码组织模式统一、死代码清理

### V5.1 质量纵深 ✅
- 集成测试、E2E测试、性能基准优化

### V5.0 全面体检与提升 ✅
- API对齐、债务清理、移动适配

### V4.1-V4.5 ✅
- 全栈对齐、路由迁移、页面去重、性能优化、测试提升