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
- **状态**: ✅ 已完成基础
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
  - ✅ Mail - 邮件发送、接收、模板管理
  - ✅ IM - 即时通讯、聊天室、消息
  - ✅ Notification - 通知推送、已读管理
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
- **状态**: ✅ 已完成基础
- **描述**: 完善供应链三方数据同步
- **待优化**:
  - 实时同步性能优化
  - [x] 同步失败重试机制 - ✅ 指数退避 + 熔断器模式
  - 数据一致性校验
- **预计**: 1 周

---

## 🟡 P2 中优先级任务

### 1. QMS-LIMS-EHS 数据联动
- **状态**: ✅ 已完成基础
- **描述**: 完善质量-实验室-环境健康安全数据联动
- **待优化**:
  - 数据流转规则完善
  - 自动触发机制
  - [x] 异常告警机制 - ✅ 多级别告警规则引擎
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

## 🔵 前端完善计划 (2026-06-24)

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

#### 阶段一：Monorepo 重构 📋 规划中
```
□ 1. 配置 pnpm workspace
□ 2. 创建 packages/shared-types
□ 3. 创建 packages/shared-utils
□ 4. 创建 packages/shared-hooks
□ 5. 创建 packages/shared-constants
□ 6. 创建 apps/host (主应用)
□ 7. 创建 apps/core (核心模块)
□ 8. 配置共享依赖
```
**预计**: 1-2 周

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

#### 阶段三：业务模块抽取 📋 规划中
```
□ 1. HRM 模块 (2-3周)
□ 2. CRM 模块 (2-3周)
□ 3. PM 模块 (2-3周)
□ 4. SC 模块 (2-3周)
□ 5. FIN 模块 (2-3周)
□ 6. QMS 模块 (1-2周)
```
**预计**: 8-12 周

#### 阶段四：Host 整合 📋 规划中
```
□ 1. 完善动态路由加载
□ 2. 实现模块加载状态管理
□ 3. 实现全局错误边界
□ 4. 实现模块间通信
□ 5. 完善导航菜单
□ 6. 完善主题切换
□ 7. 完善加载动画
□ 8. 性能优化
□ 9. 安全审计
□ 10. 文档完善
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
