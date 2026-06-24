# TOPEMS 待办事项与未来规划

> 本文档记录 TOPEMS 项目的未完成任务、规划中和未来工作

## 状态说明

- 🔴 **P0 紧急** - 阻塞性问题，必须立即处理
- 🟠 **P1 高** - 重要功能，1-2 周内完成
- 🟡 **P2 中** - 一般功能，1-2 月内完成
- 🟢 **P3 低** - 优化项，有空时处理
- 📋 **规划中** - 未来规划，未启动

---

## 🔴 P0 紧急任务

### 1. 修复数据库迁移问题
- **状态**: ✅ 已完成
- **描述**: topems-report 服务存在数据库迁移问题（列不存在）
- **影响**: 阻塞 report 服务启动
- **解决方案**:
  - ✅ 检查 `report` 服务的 migration 文件
  - ✅ 对比数据库 schema 和 migration 定义
  - ✅ 添加缺失的列定义
- **预计**: 1-2 天
- **负责人**: TBD

### 2. 完善 unified-core 服务
- **状态**: ✅ 已完成
- **描述**: 统一核心服务需要完善 IAM/Doc/Flow/File/Mail/IM/Notification 7 个模块
- **影响**: 平台基础能力
- **解决方案**:
  - ✅ 完成各模块的 API 实现
  - ✅ 完善模块间的数据流转
  - ✅ 统一错误处理
- **已完成模块**:
  - ✅ IAM - 用户、角色、权限管理
  - ✅ Doc - 文档、模板、文件夹管理
  - ✅ Flow - 工作流、审批、实例、统计
  - ✅ File - 文件上传、下载、文件夹管理
  - ✅ Mail - 邮件发送、接收、模板管理、邮件队列、重试机制
  - ✅ IM - 即时通讯、聊天室、消息
  - ✅ Notification - 通知推送、已读管理、异步邮件发送
- **邮件服务增强**:
  - ✅ 集成 lettre 邮件库实现真实 SMTP 发送
  - ✅ 实现邮件模板 CRUD（数据库存储 + Handlebars 渲染）
  - ✅ 实现邮件发送重试机制（指数退避）
  - ✅ 添加邮件队列支持（内存队列 + 数据库持久化）
  - ✅ 优化通知发送时的异步邮件处理
- **预计**: 1-2 周

---

## 🟠 P1 高优先级任务

### 1. 完善 AI 智能服务
- **状态**: ✅ 已完成基础
- **描述**: AI 服务需要完善更多智能化功能
- **功能列表**:
  - [x] 基础对话（/api/ai/chat）
  - [x] 文本向量化（/api/ai/embedding）
  - [x] 文本摘要（/api/ai/summary）
  - [x] 模型管理（/api/ai/models）
  - [x] 智能推荐（/api/ai/recommend）- ✅ 已完善多种推荐类型
  - [x] 知识库检索（RAG）- ✅ 语义搜索和混合检索
  - [x] 多模态支持（图片理解）- ✅ 质量评估、图表分析、人脸检测、图片比较
  - [x] Agent 工作流 - ✅ 工作流编排器，支持多种预定义工作流
- **预计**: 2-3 周

### 2. 完善 BI 自定义仪表盘
- **状态**: ✅ 已完成基础
- **描述**: BI 服务需要完善自定义仪表盘功能
- **功能列表**:
  - [x] 基础图表展示
  - [x] 数据源配置
  - [x] 拖拽式仪表盘编辑器
  - [x] 实时数据刷新 - ✅ WebSocket 支持
  - [x] 仪表盘分享 - ✅ 链接分享和权限控制
  - [x] 仪表盘导出（PDF/Excel）
- **预计**: 2-3 周

### 3. 完善 CRM 商机管理
- **状态**: ✅ 已完成基础
- **描述**: CRM 服务需要完善商机管理和销售漏斗
- **功能列表**:
  - [x] 客户管理
  - [x] 销售机会
  - [x] 销售漏斗分析
  - [x] 业绩预测 - ✅ 趋势分析和准确率报告
  - [x] 客户画像
  - [x] 智能推荐
- **预计**: 1-2 周

### 4. SCM-WMS-SRM 数据联动
- **状态**: ✅ 已完成
- **描述**: 完善供应链三方数据同步
- **已完成**:
  - ✅ 实时同步性能优化
  - ✅ 同步失败重试机制（指数退避 + 熔断器模式）
  - ✅ 数据一致性校验（采购订单→入库单、供应商双向同步）
  - ✅ 统一同步日志记录（unified_core.inter_module_sync 表）
  - ✅ 批量同步 API（采购订单批量转入库单）
  - ✅ 同步统计 API（总数、成功、失败、待处理、重试中）
- **API 列表**:
  - `POST /api/scm/sync/purchase-to-inbound` - 采购订单转入库单
  - `POST /api/scm/sync/purchase-batch` - 批量同步采购订单
  - `POST /api/scm/sync/supplier-from-srm` - 从 SRM 同步供应商
  - `POST /api/scm/sync/suppliers-from-srm` - 批量同步供应商
  - `POST /api/scm/sync/retry-failed` - 重试失败同步
  - `POST /api/scm/sync/statistics` - 获取同步统计
  - `POST /api/scm/sync/sync-logs` - 查询同步日志
  - `POST /api/wms/sync/outbound-to-shipping` - 出库单转销售订单
  - `POST /api/srm/sync/supplier-from-scm` - 从 SCM 同步供应商
  - `POST /api/srm/sync/supplier-to-scm` - 同步供应商到 SCM
- **预计**: 1 周

---

## 🟡 P2 中优先级任务

### 1. QMS-LIMS-EHS 数据联动
- **状态**: ✅ 已完成
- **描述**: 完善质量-实验室-环境健康安全数据联动
- **已完成**:
  - ✅ 数据流转规则完善（质检→实验室、质量问题→安全检查、检测结果→质量评估）
  - ✅ 自动触发机制（质检完成自动创建实验室样品、质量问题自动触发安全检查）
  - ✅ 异常告警机制（多级别告警规则引擎）
  - ✅ 试剂过期/低库存自动告警到 EHS
  - ✅ 事故报告自动触发实验室检测
  - ✅ 统一同步日志记录（各模块独立同步记录表）
- **数据流转路径**:
  - **QMS → LIMS**: 质检完成 → 创建检验任务 → 生成样品登记
  - **QMS → EHS**: 质量问题创建 → 触发安全隐患检查 → 生成整改任务
  - **LIMS → QMS**: 检测完成 → 更新质检结果 → 质量报告生成
  - **LIMS → EHS**: 试剂过期/低库存 → 生成安全告警 → 通知相关人员
  - **EHS → QMS**: 安全隐患发现 → 创建质量问题 → 启动整改流程
  - **EHS → LIMS**: 事故报告 → 创建检测任务 → 环境样品采集
- **API 列表**:
  - `POST /api/qa/qms/sync/inspection-to-lims` - 质检结果同步到 LIMS
  - `POST /api/qa/qms/sync/issue-to-ehs` - 质量问题触发 EHS 安全检查
  - `POST /api/qa/lims/sync/record-to-qms` - 检测记录同步到 QMS
  - `POST /api/qa/lims/sync/reagent-to-ehs` - 试剂告警同步到 EHS
  - `POST /api/qa/ehs/sync/hazard-to-qms` - 安全隐患同步到 QMS 整改
  - `POST /api/qa/ehs/sync/accident-to-lims` - 事故报告同步到 LIMS 检测
- **预计**: 1-2 周

### 2. 完善 LIMS 样品管理
- **状态**: ✅ 已完成基础
- **描述**: 完善实验室样品、仪器、试剂管理
- **待优化**:
  - [x] 样品全生命周期跟踪 - ✅ 完整的生命周期追溯
  - [x] 仪器校准管理 - ✅ 校准计划和历史记录
  - [x] 试剂库存预警 - ✅ 低库存、过期预警、库存统计
  - [x] 检测报告自动生成 - ✅ 报告生成、审核、PDF 导出
- **预计**: 2 周

### 3. 完善 PDM 产品数据管理
- **状态**: ✅ 已完成基础
- **描述**: PDM 服务需要完善产品、BOM、版本管理
- **功能列表**:
  - [x] 产品管理
  - [x] BOM 管理
  - [x] 变更管理（ECN）- ✅ 完整的变更申请、审批流程
  - [x] 文档管理 - ✅ 审批工作流
  - [x] 工作流集成
  - [x] 审批流程
- **预计**: 2-3 周

### 4. 完善 RS 研发管理
- **状态**: ✅ 已完成基础
- **描述**: RS 服务需要完善研发项目管理
- **功能列表**:
  - [x] 项目管理
  - [x] 配方管理
  - [x] 实验记录
  - [x] 专利管理
  - [x] 研发费用管理 - ✅ 费用记录、统计报表
- **预计**: 2-3 周

---

## 🟢 P3 低优先级任务

### 1. 性能优化
- **数据库连接池优化** - ✅ 重试机制、指数退避、超时配置、状态监控
- **Redis 缓存策略优化** - ✅ Key规范、TTL配置、击穿/穿透/雪崩防护、监控指标
- **API 响应时间优化** - ✅ 索引优化、财务API缓存、导出限制、连接池超时
- **前端打包体积优化** - ✅ Brotli压缩、细粒度代码分割、移除未使用依赖
- **数据库查询优化** - ✅ 慢查询检测、QueryLogger、查询分析、PaginationHelper、预编译缓存
- **前端性能优化** - ✅ React.memo优化、虚拟列表优化、useDebounce优化

### 2. 安全加固
- **限流机制完善** - ✅ Token Bucket 算法实现
- **审计日志完善** - ✅ AuditLog 记录关键操作
- **敏感数据加密** - ✅ AES-256-GCM 字段级加密和数据脱敏
- **API 签名验证** - ✅ HMAC-SHA256 签名验证

### 3. 可观测性
- **Prometheus 指标完善** - ✅ HTTP 指标和业务指标采集
- **Grafana 仪表盘** - ✅ 完整仪表盘JSON、7大类指标、6类告警规则
- **链路追踪（OpenTelemetry）** - ✅ 分布式追踪中间件
- **告警机制** - ✅ QMS-LIMS-EHS 异常告警系统

### 4. 文档完善
- **用户手册完善** - ✅ docs/user-guide/ 目录、10个模块手册、快速入门、管理指南、FAQ
- **API 文档生成（OpenAPI）** - ✅ utoipa集成、5个服务已完成
- **开发文档** - ✅ docs/guides/development/ 6个文档、环境搭建/代码规范/API设计/组件规范/后端规范/调试指南
- **运维手册** - ✅ docs/guides/devops/ 7个文档、部署/数据库/监控/故障排查/日志/脚本指南
- **前端组件库文档** - ✅ Storybook集成、4个组件stories

---

## 📋 未来规划

### 短期规划（1-3 个月）

1. **完善所有 21 个服务的核心功能** - ✅ ERP、MES、SCM、WMS、QMS等核心服务已完善，添加权限检查、CRUD操作、流程状态流转
2. **实现服务间数据流和事件总线** - ✅ RabbitMQ事件总线、发布/订阅模式、死信队列
3. **完善权限管理（RBAC）** - ✅ 后端路由权限中间件、权限分组配置、工厂函数优化
4. **完善审计日志** - ✅ 审计日志查询API、CSV导出、详情查看功能
5. **前端组件库统一** - ✅ components/index.ts统一导出、重复组件标记@deprecated、向后兼容处理、引用迁移（MobileHeader/ExportButton）

### 中期规划（3-6 个月）

1. **微服务治理**
   - 服务注册与发现 - ✅ Consul配置、服务注册客户端、健康检查
   - 配置中心 - ✅ etcd集成、配置热更新、版本管理
   - 链路追踪 - ✅ OpenTelemetry集成、Jaeger部署、Grafana面板
2. **Kubernetes 部署** - ✅ 完整K8s配置、Ingress配置、22个服务部署文件
3. **CI/CD 流水线** - ✅ GitHub Actions CI/CD、22个服务Docker构建、部署脚本
4. **监控告警体系** - ✅ Prometheus规则增强、Alertmanager配置、飞书/Slack/Email通知模板
5. **性能测试和优化** - ✅ Lighthouse配置、Bundle Analyzer、vite性能优化配置

### 长期规划（6-12 个月）

1. **多租户支持** - ✅ 架构方案设计完成、数据库表结构修改建议、API设计文档
2. **国际化（i18n）** - ✅ react-i18next框架已搭建、语言切换UI已完成、各模块翻译内容完善
3. **移动端 App（React Native）** - ✅ 项目初始化完成、路由导航、登录和仪表盘页面
4. **桌面端（Electron/Tauri）** - ✅ Tauri项目完善、窗口配置、菜单、系统托盘、路由页面
5. **插件化架构** - ✅ Module Federation配置、插件市场功能、插件状态管理、健康监控
6. **AI 能力扩展** - ✅ 统一AI客户端、多模型支持、流式响应、知识库问答

---

## 进行中的优化

### 端口一致性优化 ✅
- ✅ 统一端口分配规则（8000-8079）
- ✅ 修复所有端口不一致问题
- ✅ 文档与代码同步
- ⏳ 持续监控新引入的端口变更

### 文档体系完善 ✅
- ✅ 文档分类清理
- ✅ 合并冗余文档
- ✅ 更新所有核心文档
- ⏳ 持续完善模块文档

### 服务管理统一 ✅
- ✅ 推出 topems.sh 统一脚本
- ✅ 删除分散脚本
- ✅ 统一配置文件
- ⏳ 持续优化脚本功能

---

## 🔵 UI 与导航系统优化计划 (2026-06-24)

### 现状分析

#### 已识别问题

| 问题 | 现状 | 影响 | 优先级 |
|------|------|------|--------|
| 导航双重标准 | `navigation-v2.ts` 和 `NavigationRegistry` 两套并存 | 维护困难、行为不一致 | P0 |
| MUI 版本冲突 | 规范 v9.x，实际 v6.x | 功能受限、API 不一致 | P0 |
| Design Token 缺失 | `tokens.ts` 和 `gradients.ts` 不存在 | 主题不一致 | P0 |
| 共享包路径无效 | `packages/` 目录不存在 | 构建错误 | P1 |
| 组件库重复 | `components/ui/` 和 `components/mui/` 并存 | 代码冗余 | P1 |
| 三级导航未实现 | L2 侧边栏未与 Registry 集成 | 插件化不完整 | P1 |
| 插件动态加载未启用 | MF 配置存在但无法访问 | 插件无法动态加载 | P2 |

#### 代码位置对照

| 组件/文件 | 路径 | 说明 |
|-----------|------|------|
| 导航配置 V2 | `apps/web/src/config/navigation-v2.ts` | 静态导航配置（待废弃） |
| 导航注册中心 | `apps/web/src/lib/NavigationRegistry.ts` | 动态注册中心 |
| TopNav 组件 | `apps/web/src/components/layout/TopNav.tsx` | Header 导航 |
| Sidebar 组件 | `apps/web/src/components/layout/Sidebar.tsx` | 侧边栏导航 |
| 主题配置 | `apps/web/src/theme/theme.ts` | MUI 主题 |

---

### 阶段一：统一导航架构（P0）

#### 1.1 合并 NavigationRegistry ✅ 已完成

**完成内容**：
- ✅ 扩展 `PluginNavConfig` 接口，增加 `sidebar_nav` 支持
- ✅ 添加 `EventEmitter` 支持导航更新通知
- ✅ 实现 `getSidebarNavItems(pluginCode)` 方法
- ✅ 添加 `moduleStatuses` 状态管理
- ✅ 所有注册/注销操作触发 `navigationUpdated` 事件
- ✅ 为所有默认模块添加 sidebar_nav 配置

**文件**：`apps/web/src/lib/NavigationRegistry.ts`

#### 1.2 TopNav 组件改造 ✅ 已完成

**完成内容**：
- ✅ TopNav 从 `NavigationRegistry` 动态读取导航项
- ✅ 移除硬编码的 `topNavItems` 导入
- ✅ 使用 `useEffect` 监听 `navigationUpdated` 事件
- ✅ 插件安装状态过滤保持不变
- ✅ 统一使用 `@mui/material/Button`（移除 shadcn/ui）

**文件**：`apps/web/src/components/layout/TopNav.tsx`

#### 1.3 Sidebar 组件改造 ✅ 已完成

**完成内容**：
- ✅ Sidebar 从 `NavigationRegistry` 获取 `sidebar_nav`
- ✅ 支持按 `pluginCode` 筛选特定模块侧边栏
- ✅ 支持所有插件侧边栏的折叠展示
- ✅ 使用 Lucide 图标动态渲染
- ✅ 支持 badge 和 badgeColor 属性
- ✅ 权限过滤正常工作

**文件**：`apps/web/src/components/layout/Sidebar.tsx`

#### 1.4 迁移旧导航配置 ✅ 已完成

**完成内容**：
- ✅ 标记 `navigation-v2.ts` 为 `@deprecated`
- ✅ 添加迁移指南注释
- ✅ 删除 `navigation.ts`（确认无引用后删除）
- ✅ 更新 `ResponsiveHeader.tsx` 直接引用 `types/navigation`

---

### 阶段二：设计 Token 系统（P0）

#### 2.1 创建 tokens.ts ✅ 已完成

**完成内容**：
- ✅ 创建完整颜色系统（primary、secondary、success、warning、error、info、grey、background、surface、text、border、action）
- ✅ 实现字体系统（fontFamily、fontSize、fontWeight、lineHeight、letterSpacing）
- ✅ 实现间距系统（spacing）
- ✅ 实现圆角系统（borderRadius）
- ✅ 实现阴影系统（shadows）
- ✅ 实现断点系统（breakpoints）
- ✅ 实现 zIndex 和 transitions

**文件**：`apps/web/src/theme/tokens.ts`

#### 2.2 创建 gradients.ts ✅ 已完成

**完成内容**：
- ✅ 实现主色调渐变（primary、secondary、success、warning、error、info）
- ✅ 实现模块专属渐变（HRM、CRM、PM、Finance、Flow、BI、GIS、IM）
- ✅ 实现背景渐变（page、card、dark）

**文件**：`apps/web/src/theme/gradients.ts`

#### 2.3 主题配置更新 ✅ 已完成

**完成内容**：
- ✅ 更新 `theme.ts` 导入 tokens 和 gradients
- ✅ 扩展 Theme 接口添加 gradients
- ✅ 配置 MUI 组件全局样式覆盖

**文件**：`apps/web/src/theme/theme.ts`

---

### 阶段三：MUI 版本升级（P1）

#### 3.1 依赖升级 ✅ 已完成

**完成内容**：
- ✅ `@mui/material` 已升级到 v9.1.1
- ✅ `@mui/lab` 已升级到 9.0.0-beta.5
- ✅ `@mui/x-date-pickers` 已升级到 v9.0.0
- ✅ `@mui/x-tree-view` 已升级到 v9.0.0
- ✅ 构建通过（`pnpm build`）
- ✅ TypeScript 类型检查通过（`pnpm typecheck`）
- ✅ ESLint 检查通过（`pnpm lint`）

**文件**：`apps/web/package.json`

**验收标准**：
- ✅ MUI 版本正确（v9.x）
- ✅ 构建通过
- ✅ 功能正常

#### 3.2 Grid v2 迁移 ✅ 已完成

**完成内容**：
- ✅ 检查 Grid v2 API 使用 - 项目已使用自定义 Grid 组件（`components/Grid.tsx` 和 `components/common/Grid.tsx`），支持 `size` prop（Grid2 风格）
- ✅ `size` prop 语法已支持 - 自定义 Grid 组件支持 `size={12}` 和 `size={{ xs: 12, md: 6 }}`
- ✅ 部分页面仍使用 `@mui/material/Grid` - 通过自定义组件兼容，无需修改
- ✅ 响应式布局正常工作

**文件**：
- `apps/web/src/components/Grid.tsx` - CSS Grid 实现，支持 size prop
- `apps/web/src/components/common/Grid.tsx` - Flexbox 实现，支持 size prop

**验收标准**：
- ✅ Grid 语法正确（自定义组件支持 size prop）
- ✅ 响应式正常

---

### 阶段四：组件库统一（P1）

#### 4.1 废弃组件清理 ✅ 已完成

**完成内容**：
- ✅ 标记 `components/ui/shadcn.tsx` 为 `@deprecated`
- ✅ 标记 `components/ui/Button.tsx` 为 `@deprecated`
- ✅ 创建迁移指南（注释形式）
- ✅ 移除 shadcn.tsx 中未使用的 `styled`、`SelectChangeEvent` 导入
- ✅ 批量迁移 302 个文件从 `@/components/ui/Button` 到 `@mui/material`
- ✅ 迁移 PM 模块 2 个文件的 shadcn 引用
- ✅ 迁移核心 layout 组件（GlobalLayout、PageHeader、Sidebar）
- ✅ **删除废弃文件**：`shadcn.tsx`、`Button.tsx`

**文件**：
- `apps/web/src/components/ui/shadcn.tsx`（已删除）
- `apps/web/src/components/ui/Button.tsx`（已删除）

**验收标准**：
- ✅ 废弃组件有 `@deprecated` 标记
- ✅ 无新增使用废弃组件的代码
- ✅ 废弃文件已删除

#### 4.2 组件合并 ✅ 已完成

**审查结果**：
- ✅ `components/ui/` 和 `components/mui/` 无重叠组件
- ✅ `ui/Loading.tsx` - 轻量级加载动画（spinner/dots/pulse）
- ✅ `mui/LoadingState.tsx` - 页面级骨架屏加载状态
- ✅ 功能互补，保持现状

**文件**：`apps/web/src/components/ui/`、`apps/web/src/components/mui/`

**验收标准**：
- ✅ 无重复组件
- ✅ 导出一致

---

### 阶段五：共享包建设（P2）

#### 5.1 packages 目录创建 ✅ 已完成

**完成内容**：
- ✅ 创建 `packages/shared-types/`（已存在）
- ✅ 创建 `packages/shared-utils/`（已存在）
- ✅ 创建 `packages/shared-components/`（已存在）
- ✅ 配置 pnpm workspace（已配置）

**文件**：`pnpm-workspace.yaml`、`packages/*/`

**验收标准**：
- ✅ Workspace 配置正确
- ✅ 包可正确引用

#### 5.2 共享依赖配置 ✅ 已完成

**完成内容**：
- ✅ vite.config.ts 引用路径已配置
- ✅ tsconfig 路径别名已配置
- ✅ 构建通过

**文件**：
- `apps/web/vite.config.ts`
- `apps/web/tsconfig.json`

**验收标准**：
- ✅ 引用路径正确
- ✅ 构建通过

---

### 阶段六：插件动态加载完善（P2）

#### 6.1 生命周期钩子 ✅ 已完成

**完成内容**：
- ✅ 创建 `PluginLifecycleManager` 单例
- ✅ 实现 `loadPlugin` / `unloadPlugin` 方法
- ✅ 实现 `loadAllPlugins` / `unloadAllPlugins` 批量操作
- ✅ 实现 `updatePluginNavConfig` 动态更新导航
- ✅ 集成 `NavigationRegistry` 实现导航自动注册/注销
- ✅ 添加 `EventEmitter` 支持事件通知
  - `pluginLoaded` - 插件加载完成
  - `pluginUnloaded` - 插件卸载
  - `pluginError` - 插件加载/卸载错误
  - `pluginNavUpdated` - 插件导航更新
- ✅ 实现并发加载保护（避免重复加载）

**文件**：`apps/web/src/lib/PluginLifecycleManager.ts`

**验收标准**：
- ✅ 插件加载自动注册
- ✅ 插件卸载自动清理

**使用示例**：

```typescript
import { pluginLifecycleManager } from '@/lib/PluginLifecycleManager';

// 加载单个插件
await pluginLifecycleManager.loadPlugin('erp', {
  code: 'erp',
  name: '企业资源管理',
  version: '1.0.0',
  navConfig: {
    top_nav: [...],
    sidebar_nav: [...],
    module_tabs: [...],
    module_card: {...},
  },
});

// 批量加载
await pluginLifecycleManager.loadAllPlugins([erpConfig, crmConfig, hrmConfig]);

// 监听事件
pluginLifecycleManager.emitter.on('pluginLoaded', (code, info) => {
  console.log(`Plugin ${code} loaded`, info);
});

// 卸载插件
await pluginLifecycleManager.unloadPlugin('erp');
```

#### 6.2 远程模块加载 ✅ 已完成

**完成内容**：
- ✅ 实现远程插件动态 import - 支持 systemjs/module-federation/umd 三种加载方式
- ✅ 添加加载状态管理 - 扩展 PluginInfo 支持 `installing`/`installed`/`running`/`error`/`disabled`/`uninstalling` 状态，添加 `loadedAt`/`lastErrorAt`/`retryCount` 字段
- ✅ 实现错误处理和重试 - 指数退避重试机制
- ✅ 添加事件通知 - 通过 EventEmitter 发送 `pluginInstalling`/`pluginInstalled`/`pluginRunning`/`pluginError`/`pluginUninstalling`/`pluginUninstalled` 事件
- ✅ 添加批量加载 - `loadAllPlugins` 方法
- ✅ 添加插件重载 - `reloadPlugin` 方法
- ✅ 添加状态查询 - `getLoadingStatus` 方法

**文件**：`apps/web/src/modules/loader/PluginLoader.tsx`

**验收标准**：
- ✅ 远程插件可加载
- ✅ 状态显示正常
- ✅ 错误处理正常

---

### 阶段七：模块布局组件（P0）

#### 7.1 ModuleLayout 组件 ✅ 已完成

**完成内容**：
- ✅ 创建 `ModuleLayout` 模块页面布局容器
- ✅ 自动从 `NavigationRegistry` 获取侧边栏和 Tab 导航
- ✅ 动态生成面包屑导航（基于路径解析）
- ✅ 集成 `Sidebar`、`ModuleTabs`、`PageBreadcrumb`、`PageHeader`
- ✅ 响应式适配（移动端隐藏侧边栏）
- ✅ 支持通过 `pluginCode` prop 或 URL 参数解析

**文件**：`apps/web/src/components/layout/ModuleLayout.tsx`

**使用示例**：

```tsx
import { ModuleLayout } from '@/components/layout/ModuleLayout';

// 方式 1：显式指定 pluginCode
<ModuleLayout pluginCode="erp">
  <Outlet />
</ModuleLayout>

// 方式 2：从 URL 参数自动解析
<Route path="/:pluginCode/*" element={<ModuleLayout><Outlet /></ModuleLayout>} />
```

#### 7.2 组件统一导出 ✅ 已完成

**完成内容**：
- ✅ 在 `components/layout/index.ts` 中导出 `ModuleLayout`
- ✅ 在 `components/layout/index.ts` 中导出 `NavDropdown` 相关
- ✅ 统一所有 layout 组件的导入入口

**文件**：`apps/web/src/components/layout/index.ts`

---

### 实施检查清单

#### 代码检查

- ✅ 所有组件从 `@mui/material` 导入（废弃 Button/shadcn 已删除）
- ✅ 所有图标从 `lucide-react` 导入（@mui/icons-material 仅在 shared-components peerDeps）
- ✅ PluginMarketplacePage.tsx Tailwind className 已迁移到 sx prop
- ✅ 无 `shadcn/ui` 组件引用（已清理）
- ✅ pluginStore.ts 修复 8 处 `catch (error: any)` 为类型安全
- ✅ TypeScript 类型检查通过（持续优化中）
- ✅ ESLint 检查通过（待定期运行）
- ✅ 响应式布局适配完成

#### 样式检查

- ✅ 使用 `sx` prop 或 styled 组件
- ✅ 硬编码颜色已批量迁移（159个文件，853处变更）
- ✅ 间距使用 8px 基准
- ✅ 圆角使用设计系统 token
- ✅ 阴影使用设计系统 token

#### 导航检查

- ✅ NavigationRegistry 是唯一数据源
- ✅ TopNav 动态读取导航
- ✅ Sidebar 按模块隔离
- ✅ useTopNav 已迁移到 NavigationRegistry
- ✅ GlobalLayout 已迁移到 NavigationRegistry
- ✅ MobileNav 已迁移到 NavigationRegistry
- ✅ 权限过滤正常
- ✅ 事件通知正常（navigationUpdated、pluginLoaded、pluginUnloaded）

#### 主题检查

- ✅ designTokens 从文件导入（已存在）
- ✅ gradients 从文件导入（已存在）
- ✅ 深色模式颜色正确
- ✅ 主题切换正常

---

### 已完成 ✅

#### 1. WMS 仓库管理系统完善 ✅
- **状态**: ✅ 已完成
- **修改页面**:
  - `InventoryPage.tsx` - 重构为 ListPageTemplate、添加 CRUD 功能、修复 API 导入
  - `InboundOrderPage.tsx` - 完善 CRUD、添加状态筛选
  - `OutboundOrderPage.tsx` - 完善 CRUD、添加状态筛选
  - `StockTakePage.tsx` - 新增页面并添加到路由
  - `WarehouseManagementPage.tsx` - 移除不支持的 selectable 属性
- **统一规范**: 所有页面使用 ListPageTemplate、面包屑导航、useAppStore 通知机制

#### 2. SCM 供应链系统完善 ✅
- **状态**: ✅ 已完成
- **修改页面**:
  - `ScmPurchaseOrderPage.tsx` - 添加编辑、删除功能
  - `ScmPurchaseItemPage.tsx` - 改为 ListPageTemplate、添加编辑删除
  - `ScmEvaluationPage.tsx` - 添加编辑删除、评分 Chip 显示
  - `SupplierDetailPage.tsx` - 改为 DetailPageTemplate、添加 4 个 Tab（基本信息/评估记录/交易历史/付款记录）

#### 3. MES 生产执行系统完善 ✅
- **状态**: ✅ 已完成
- **修改页面**:
  - `ProductionOrderManagementPage.tsx` - 修复分页、添加状态流转功能
  - `ProductionProcessPage.tsx` - 添加搜索、筛选、统计卡片
  - `WorkStationPage.tsx` - 添加搜索、筛选、工站统计
  - `ProductionRecordPage.tsx` - 添加编辑删除、详情对话框

#### 4. BI 模块增强 ✅
- **状态**: ✅ 已完成
- **修改页面**:
  - `BIAnalyticsPage.tsx` - 添加统计卡片、柱状图、饼图
  - `BIComparisonPage.tsx` - 添加统计卡片、指标对比图
  - `BIVisualizationPage.tsx` - 添加统计卡片、三栏布局
  - `BIModuleDetailPage.tsx` - 添加统计卡片、趋势图、分布图

#### 5. 集成页面完善 ✅
- **状态**: ✅ 已完成
- **修改页面**:
  - `IntegrationDashboardPage.tsx` - 添加快捷操作按钮、同步状态饼图、系统对比柱状图、统计卡片优化

#### 6. 路由配置检查 ✅
- **状态**: ✅ 确认无问题
- **结论**: SRM 路由在 professionalRoutes 中正确定义，所有 24 个路由引用都正确

---

## 🔵 插件化架构

### 架构现状

| 组件 | 状态 | 说明 |
|------|------|------|
| **架构文档** | ✅ 完整 | `module-federation-architecture.md` 详细描述了 Module Federation 方案 |
| **PluginLoader** | ✅ 已实现 | `plugin-loader.ts` 使用 SystemJS 实现插件加载 |
| **Plugin API** | ✅ 已实现 | `plugin.ts` 包含插件市场、运行时信息、健康检查等 API |
| **PluginMarketplace** | ✅ 已实现 | 插件市场页面 UI |
| **plugin.yaml** | ✅ 各服务都有 | 各微服务都有插件配置文件 |

### Module Federation 实现阶段（未开始）

#### 阶段一：Monorepo 重构 ✅ 已完成
```
✅ 1. 配置 pnpm workspace - 已配置（pnpm-workspace.yaml）
✅ 2. 创建 packages/shared-types - 已存在
✅ 3. 创建 packages/shared-utils - 已存在
✅ 4. 创建 packages/shared-components - 已存在
✅ 5. 创建 packages/shared-hooks - ✅ 已完成（2026-06-24）
✅ 6. 创建 packages/shared-constants - ✅ 已完成（2026-06-24）
✅ 7. 创建 apps/host (主应用) - apps/web 即为主应用
✅ 8. 创建 apps/core (核心模块) - 已存在
✅ 9. 配置共享依赖 - ✅ 已完成（apps/web、apps/core 已配置路径别名）
```
**预计**: 剩余 1 周

#### 阶段二：Core 模块抽取 📋 规划中
```
□ 1. 抽取 Auth 服务
□ 2. 抽取 IAM 服务
□ 3. 抽取 Workflow 服务
□ 4. 抽取 File 服务
□ 5. 抽取 Notify 服务
□ 6. 抽取 Report 服务
□ 7. Core 模块集成测试
```
**预计**: 4-6 周

#### 阶段三：业务模块抽取 ✅ 已完成
```
✅ 1. HRM 模块 (apps/hrm:3002) - ✅ 已完成（2026-06-24）
   - 17 个 API 集合（公司/部门/员工/考勤/薪资/绩效/培训/招聘）
   - 8 个核心页面
   - 类型检查通过

✅ 2. CRM 模块 (apps/crm:3003) - ✅ 已完成（2026-06-24）
   - 8 个 API 集合（客户/联系人/机会/评分/预测/互动/计费）
   - 10 个核心页面
   - 类型检查通过

✅ 3. Finance 模块 (apps/finance:3004) - ✅ 已完成（2026-06-24）
   - 14 个 API 集合（科目/凭证/应收应付/报表/预算/资产/费用/发票/税务/成本）
   - 15 个核心页面
   - 类型检查通过

✅ 4. PM 模块 (apps/pm:3005) - ✅ 已完成（2026-06-24）
   - 8 个 API 集合（项目/任务/里程碑/甘特图/风险/合同/报表）
   - 9 个核心页面
   - 类型检查通过

✅ 5. MES/LIMS/QMS 模块 (apps/mes:3006) - ✅ 已完成（2026-06-24）
   - MES/LIMS/QMS/EHS 4 套业务 API
   - 12 个核心页面
   - 类型检查通过

✅ 6. SCM/SRM/WMS 模块 (apps/scm:3007) - ✅ 已完成（2026-06-24）
   - SCM/SRM/WMS 3 套业务 API
   - 9 个核心页面
   - 类型检查通过

✅ 7. Module Federation 集成 - ✅ 已完成
   - apps/web vite.config.ts REMOTE_MODULES 更新
   - 8 个远程模块端口映射
```
**预计**: 8-12 周

#### 阶段四：Host 整合 ✅ 已完成
```
✅ 1. 完善动态路由加载 - ✅ 已完成（2026-06-24）
   - 增强 ModuleLoader.tsx
   - 添加加载进度跟踪
   - 添加超时处理
   - 添加预加载/卸载支持

✅ 2. 实现模块加载状态管理 - ✅ 已完成（2026-06-24）
   - moduleLoadingStore.ts
   - 模块状态跟踪
   - 加载进度百分比

✅ 3. 实现全局错误边界增强 - ✅ 已完成（2026-06-24）
   - 详细错误信息收集
   - 错误报告功能
   - 多级别错误边界

✅ 4. 实现模块间通信 - ✅ 已完成（2026-06-24）
   - EventBus.ts 单例事件总线
   - 发布/订阅模式
   - 命名空间支持

✅ 5. 完善导航菜单 - ✅ 已完成（2026-06-24）
   - NavigationRegistry.ts 增强
   - 注册 Finance/MES/SCM 新模块

✅ 6. 完善主题切换 - ✅ 已完成
   - ModeToggle.tsx 已实现

✅ 7. 完善加载动画 - ✅ 已完成（2026-06-24）
   - LoadingProvider.tsx 增强
   - 4种加载模式
   - 骨架屏组件

✅ 8. 性能优化 - ✅ 已完成（2026-06-24）
   - performance.ts 性能工具函数
   - lazyLoadWithRetry 带重试懒加载
   - 路由懒加载优化
   - BundleSizeMonitor 包体积监控

✅ 9. 安全审计 - ✅ 已完成（2026-06-24）
   - security.ts 安全工具函数
   - XSS防护组件（SafeHtml/SafeText/InputSanitizer）
   - CSRF防护中间件
   - 安全配置（CSP/X-Frame-Options/X-XSS-Protection）
   - 权限验证增强（withPermission/RequirePermission/PermissionGuard）
   - 访问日志组件

✅ 10. 文档完善 - ✅ 已完成

✅ 11. 代码清理 - ✅ 已完成（2026-06-24）
   - 删除 11 个 deprecated 根目录组件（ChartCard/BISkeleton/ExportButton/EnhancedExportModal/LoginFormV2/MobileHeader/ImportExportModal/Toast/EmptyState/ExportModal）
   - 更新组件导出（移除 deprecated 别名导出）
   - 替换组件引用（EmptyState/ExportModal）
   - 类型检查验证通过
```
**预计**: 2-3 周

### 相关文件

| 文件 | 路径 |
|------|------|
| 架构文档 | `docs/guides/ui/module-federation-architecture.md` |
| 插件加载器 | `apps/web/src/lib/plugin-loader.ts` |
| 插件 API | `apps/web/src/api/plugin.ts` |
| 插件市场 | `apps/web/src/pages/plugin/PluginMarketplacePage.tsx` |

---

## 风险与挑战

| 风险 | 等级 | 应对措施 |
|------|------|----------|
| 数据库迁移复杂 | 🟠 中 | 建立完善的 migration 测试 |
| AI 模型资源占用 | 🟠 中 | 优化模型量化，按需加载 |
| 微服务部署复杂 | 🟡 中 | 提供 Docker Compose 一键部署 |
| 性能瓶颈 | 🟡 中 | 持续性能测试和优化 |
| 安全漏洞 | 🟠 中 | 定期安全审计和更新 |

---

## 贡献者

- **核心团队**: TOPEMS 平台组
- **贡献方式**: 提交 Issue、PR、文档改进

---

## 更新记录

| 日期 | 更新内容 | 作者 |
|------|----------|------|
| 2026-06-24 | 第十一批并行任务：阶段四 Host 整合完成（ModuleLoader增强/模块状态Store/ErrorBoundary增强/EventBus/导航注册/LoadingProvider增强） | TOPEMS Team |
| 2026-06-24 | 第六批并行任务：密码重置邮件集成、Plugin AuthContext完善、Module Registry完善、TODO文档整理 | TOPEMS Team |
| 2026-06-24 | 完善数据联动模块：SCM-WMS-SRM 数据一致性校验完成、QMS-LIMS-EHS 数据流转规则和自动触发机制完善、EventType Payload 定义补充 | TOPEMS Team |
| 2026-06-24 | 清理旧导航配置：删除 navigation.ts、Grid v2 迁移完成、PluginLoader 增强、硬编码颜色批量迁移 | TOPEMS Team |
| 2026-06-24 | unified-core 邮件服务增强：lettre SMTP 集成、模板 CRUD、重试机制、邮件队列 | TOPEMS Team |
| 2026-06-24 | UI 与导航系统优化计划：导航架构统一、设计 Token 系统、MUI 升级、组件库统一 | TOPEMS 前端团队 |
| 2026-06-24 | 第五批并行任务：完善核心服务（ERP、MES、SCM、WMS、QMS），添加权限检查、CRUD操作、流程状态流转 | TOPEMS Team |
| 2026-06-24 | 第四批6个并行任务：审计日志完善、配置中心、链路追踪、K8s部署、多租户调研、i18n内容填充 | TOPEMS Team |
| 2026-06-24 | 代码风格统一优化：创建.eslintrc.json和.prettierrc.json配置文件 | TOPEMS Team |
| 2026-06-24 | 解决重复问题：formatDate统一、erp-finance合并、Dashboard确认无重复、date.ts精简(311→75行) | TOPEMS Team |
| 2026-06-24 | 完成组件迁移：MobileHeader/ExportButton迁移到规范版本，MobileNav需架构适配 | TOPEMS Team |
| 2026-06-24 | 前端组件库统一清理：components/index.ts统一导出、重复组件标记@deprecated | TOPEMS Team |
| 2026-06-24 | 第三批6个并行任务：运维手册、数据库查询优化、RBAC完善、前端组件库分析、Consul服务注册、监控告警体系 | TOPEMS Team |
| 2026-06-24 | 第二批6个并行任务：数据库连接池、Redis缓存、API响应时间、CI/CD、用户手册、开发文档 | TOPEMS Team |
| 2026-06-24 | 第一批6个并行任务：前端打包优化、API文档生成、组件库文档、i18n框架、性能优化、Grafana仪表盘 | TOPEMS Team |
| 2026-06-24 | 更新前端完善计划、插件化架构现状和 Module Federation 实现阶段规划 | TOPEMS Team |
| 2026-06-23 | 创建 TODO 文档，规划未完成任务 | TOPEMS Team |

---

## 相关文档

- [架构设计](./architecture/overview.md)
- [部署指南](./deployment-guide.md)
- [API 文档](./api/README.md)
- [变更日志](./CHANGELOG.md)
- [故障排查](./TROUBLESHOOTING.md)
