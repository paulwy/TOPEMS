# TOPEMS 变更日志

本文档记录 TOPEMS 项目所有版本的重要变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [未发布]

### 变更

- **Rust TLS 依赖切换**：`lapin`(AMQP 客户端) 的 TLS feature 从 `rustls`（默认 `aws-lc-rs`，需 CMake/Perl/NASM 等 C 工具链）切换为 `rustls--ring`（纯 Rust ring 加密库），CI/本地编译无需额外 C 工具链即可通过。涉及 `lib/Cargo.toml` 与 `lib/shared-event/Cargo.toml`
- **审计日志导出三件套**：实现 gzip 压缩导出（`ExportFormat::Gzip`）、NDJSON 流式导出（`stream_export_audit_logs` 端点，分页查询+逐批 yield）、定时增量导出任务（`AuditExportTask`+`AuditExportController`，周期性增量导出+窗口推进）
- **审计日志导出任务控制 API**：新建 `audit_export_task_api.rs`，提供 6 个 REST 端点（status/start/stop/trigger/config GET+PUT），支持通过 HTTP 控制定时导出任务的启停、手动触发及配置动态更新；AppState 新增 `audit_export_config` + `audit_export_controller` 字段
- **代码冗余清理**：基于 `cargo-machete` 扫描移除 41 个 `Cargo.toml` 中 257 处未使用 Rust 依赖（tower-http/tracing-subscriber/dotenv/axum-prometheus/prometheus/thiserror 等脚手架模板残留，含 `shared-core` prost 误删恢复）；移除 `apps/web` 26 个零引用 npm 依赖（storybook addon 5、eslint 生态 6、vite/imagemin 插件 9、@axe-core/react 等，均经配置文件引用核对）；补 `@topems/api-client`（workspace 包）与 `sharp`（generate-icons 脚本）依赖声明
- **重复与遗留清理**：删除重复 hook `useIntersectionObserver`（统一至 `packages/shared-hooks`）；删除 i18n 连字符命名变体死文件 6 个（zh/en × design-system/dev-platform/intelligent-ops）；清理 `leaflet.heat`/`leaflet-3d-tiles` 无效插件引用；归档 svc/_archive(52)、apps/web/_archive(88)、一次性脚本与 UI 迁移文档
- **废弃组件清理**：审计并移除 `apps/web` 9 个零引用废弃组件（BatchOperations/MasterDataSelector/DraggableWindow/ResponsivePage/MobileRouteAdapter/FormFields/LazyLoadWrapper/AlertPanel/TouchComponents，含跨行 import 复查；TouchComponents 为 TouchFeedbackOptions 的 re-export，hook 定义保留于 `hooks/useTouchFeedback.ts`）；`AdvancedFilter.tsx` 因 FilterCondition 类型被 12 处真实引用而保留；`DateRangeQuickSelect` 按作者注释“备选实现”保留；`storybook-docs.zip` 构建产物移出 git 跟踪（加入 .gitignore）
- **Storybook 组件文档站**：启用 Storybook（最小配置 `apps/web/.storybook/main.ts`，framework=react-vite），新增 autodocs 自动文档（`@storybook/addon-docs@10.5.4`，须与主包同版本）；修复 17 个故事文件与组件 API 失配（含 DesignTokens 非法对象简写语法错误、孤儿 import、命名导入等）；组件描述全部补全（≥30 字）；持续补全使用中组件 story：Common 16/16、Mobile 7/7、Charts 7/7、Templates 4 个全覆盖，当前 75 个组件文档页 + 218 个 stories（Grid/StatusChip/Drawer/UserAvatar/AmountDisplay/PriorityBadge/FormDialog/FormDrawer/MuiStatCard/StatusTimeline/LazyImage/ExtendedTab/HelpButton/RelatedModuleCard/TouchButton/ShortcutsHelpPanel/BottomTabBar/MobileHeader/MobileLayout/PageTransition/MobileSearch/CustomTooltip/LazyChart/ReportDesignerTemplate 等 24 个新增）
- **CI：Storybook 文档自动发布**：新增 `.github/workflows/storybook-docs.yml`，main 分支相关变更后自动构建并发布 GitHub Pages（`https://paulwy.github.io/TOPEMS/`）

### 修复

- **unified-core 编译错误**：修复 V473 暴露的 P0 编译错误（audit trait 对象安全/dns 借用与字段缺失/AppState 初始化缺失字段），`cargo check -p topems-unified-core` 0 error 0 warning
- **SQLX 离线缓存**：为 `database_permission_store.rs` 13 个查询手工生成 `.sqlx` 缓存（LF 规范化 + SHA256 hash，无需 DB 环境运行 `cargo sqlx prepare`），`SQLX_OFFLINE=true` 编译通过
- **MockAuditLogStore 时间过滤缺失**：`MockAuditLogStore::query()` 方法补全 `start_time`/`end_time` RFC3339 字符串比较过滤，修复增量导出窗口测试失败（第二次运行仍返回已导出的旧条目）
- **单元测试**：audit_export（37 个）+ audit 全量（201 个）测试全部通过
- **lefthook / pnpm install 修复**：移除本机 git local 遗留 `core.hooksPath=.husky/_`（husky v2 残留，lefthook 不支持自定义 hooksPath 而拒绝 install），`lefthook install` 与完整 `pnpm install` 恢复正常
- **sccache 缓存重建**：清理误删的 `~/Library/Caches/Mozilla.sccache` 后自动重建，`sccache --stop/--start-server` 重启后 `cargo check` 无需 `RUSTC_WRAPPER` 绕过
- **Storybook 故事文件修复**：修复 17 个 `*.stories.tsx` 与组件 API 失配（DesignTokens 非法对象简写语法、3 个孤儿 import 改引 shared-components、AlertCard/LoadingSpinner/EmptyState 等 API 适配）

### 计划中

- v1.1.0 功能增强版本开发
- v1.2.0 集成扩展版本规划

---

## [1.0.0] - 2026-08-28

### 概述

TOPEMS 1.0.0 是项目的首个正式版本，实现了企业级 AI 赋能平台的完整基础架构和核心功能。

### 新增

#### 架构层

- **Layer 0: MCP 适配层** - 多协议适配，支持 MCP/REST/GraphQL
  - MCP 协议适配器
  - REST API 适配器
  - GraphQL 适配器
  - 协议转换引擎

- **Layer 1: 运行时基座** - 服务运行基础环境
  - 服务注册与发现
  - 配置中心
  - 消息队列集成
  - 缓存服务（Redis）
  - 数据库连接池（SQLx）
  - 日志系统（结构化日志）
  - 健康检查

- **Layer 2: 智能中枢** - AI 核心能力
  - Agent 编排器（orchestrator）
  - 意图识别引擎
  - 知识图谱集成
  - 工具调用框架
  - 上下文管理
  - 提示词管理
  - 多模型支持

- **AI 治理** - AI 使用管控
  - 内容审核（输入/输出审核）
  - 调用监控（用量、成本、性能）
  - 成本管理（预算、告警、分析）
  - 权限控制（API 访问、功能权限）
  - 审计日志（完整操作记录）

- **Layer 3: 业务赋能** - 12 个业务模块 Copilot
  - ERP（企业资源计划）Copilot
  - Finance（财务）Copilot
  - CRM（客户关系管理）Copilot
  - WMS（仓储管理）Copilot
  - HR（人力资源）Copilot
  - OA（办公自动化）Copilot
  - General（通用助手）Copilot
  - QMS（质量管理）Copilot
  - SCM（供应链管理）Copilot
  - APS（高级计划排程）Copilot
  - EHS（环境健康安全）Copilot
  - BI（商业智能）Copilot

#### 后端功能

- **用户认证与授权**
  - 用户注册/登录/登出
  - JWT Token 认证
  - 多因素认证（MFA）支持
  - RBAC 权限模型
  - 角色管理
  - 权限管理
  - 部门管理

- **AI 对话服务**
  - 会话管理（创建、列表、删除）
  - 消息管理（发送、历史、流式输出）
  - 意图识别
  - 实体提取
  - 工具调用
  - 多轮对话

- **AI 治理服务**
  - 内容审核接口
  - 调用统计接口
  - 成本分析接口
  - 治理仪表盘数据

- **业务模块服务**
  - 12 个业务模块的 API 接口
  - 业务工具注册和调用
  - 快捷操作管理
  - FAQ 管理

- **系统管理服务**
  - 系统配置管理
  - 数据字典管理
  - 通知服务
  - 操作审计日志
  - 登录日志

#### 前端功能

- **统一前端框架**
  - React 18 + TypeScript
  - Vite 构建工具
  - Ant Design 组件库
  - Zustand 状态管理
  - React Router 路由
  - Axios HTTP 客户端

- **AI 对话界面**
  - 对话列表
  - 消息展示（支持 Markdown、代码高亮）
  - 流式输出
  - 快捷操作
  - 业务模块切换
  - 会话管理

- **AI 治理仪表盘**
  - 调用量统计
  - 成本分析
  - 性能监控
  - 内容审核统计
  - 趋势图表

- **用户管理界面**
  - 用户列表
  - 用户创建/编辑
  - 角色分配
  - 权限管理

- **系统设置界面**
  - 系统配置
  - 数据字典
  - 通知设置

- **业务模块界面**
  - 12 个业务模块的集成界面
  - 业务数据展示
  - AI 辅助操作

#### 工程化

- **CI/CD 流水线**（6 个工作流）
  - 代码检查（Lint）
  - 单元测试
  - 集成测试
  - 端到端测试
  - 构建和部署
  - 发布管理

- **代码质量**
  - ESLint（前端）
  - Clippy（后端）
  - Prettier（代码格式化）
  - rustfmt（Rust 格式化）
  - 提交规范检查（Commitlint）

- **自动化测试**
  - 后端单元测试（1092+ 个）
  - 前端集成测试（43 个）
  - 端到端测试（170+ 个）
  - 性能测试（5 个套件）
  - 多浏览器测试（Chrome、Firefox、WebKit）
  - 移动端响应式测试

- **容器化部署**
  - Docker 镜像构建
  - Docker Compose 编排
  - 多环境配置（开发、测试、生产）
  - 健康检查
  - 日志收集

- **监控告警**
  - Prometheus 指标采集
  - Grafana 仪表盘（5 个）
  - AlertManager 告警规则（30+）
  - 告警通知渠道（飞书、邮件、Webhook）
  - 告警 Runbook

- **日志管理**
  - 结构化日志
  - 日志分级（DEBUG/INFO/WARN/ERROR）
  - 请求追踪（Trace ID）
  - 日志收集和分析

#### 文档

- **项目文档**（38 份，323KB+）
  - 项目架构设计文档
  - API 文档（OpenAPI 规范）
  - 数据库设计文档（21 张表）
  - 开发指南
  - 部署文档
  - 运维手册
  - 安全最佳实践
  - 贡献指南
  - 项目路线图
  - 变更日志（本文档）

- **用户文档**
  - 用户操作手册
  - 管理员指南
  - 常见问题（FAQ）
  - 快速入门指南

- **培训文档**
  - 培训计划（3 天）
  - 培训材料大纲（34 页 PPT）
  - 实操练习（18 个）

- **交付文档**
  - 项目交付包清单
  - 项目总结报告
  - 最终交付报告
  - 验收清单（250+ 检查点）
  - 上线检查清单

### 修复

- 修复了端到端测试中的认证问题
- 修复了组件加载失败问题
- 修复了元素选择器问题
- 修复了循环导入问题
- 修复了性能测试 API 路径匹配问题
- 修复了前端依赖问题
- 修复了生产环境配置问题

### 性能改进

- 优化了数据库查询性能
- 优化了 API 响应时间
- 优化了前端页面加载速度
- 优化了缓存策略
- 优化了并发处理能力

### 安全改进

- 实现了完整的认证授权机制
- 实现了内容审核功能
- 实现了数据加密存储
- 实现了操作审计日志
- 实现了安全头配置
- 实现了输入验证和输出编码

### 已知问题

- 部分高级 AI 功能（多模态、自主 Agent）将在 v1.1/v2.0 版本中实现
- 第三方系统集成（钉钉、企业微信等）将在 v1.2 版本中实现
- 生产环境部署需要根据实际环境调整配置

### 升级说明

从无到 1.0.0：
- 全新安装，请参考 [部署文档](docs/deployment/deployment-guide.md)
- 数据库初始化，请参考 [数据库设计文档](docs/database/database-design.md)

---

## 版本历史

| 版本 | 发布日期 | 主要变更 | 状态 |
|------|---------|---------|------|
| 1.0.0 | 2026-08-28 | 初始版本，完整基础架构和核心功能 | ✅ 已发布 |
| 1.1.0 | 计划 2026 Q4 | 功能增强，AI 能力提升，体验优化 | 📋 计划中 |
| 1.2.0 | 计划 2027 Q1 | 集成扩展，第三方系统集成，开放平台 | 📋 计划中 |
| 2.0.0 | 计划 2027 Q2 | 智能化升级，自主 Agent，智能分析 | 🔮 规划中 |
| 3.0.0 | 计划 2027 Q4 | 平台生态，多租户，行业解决方案 | 🔮 远期规划 |

---

## 贡献者

感谢所有为 TOPEMS 1.0.0 版本做出贡献的开发者！

- 架构设计
- 后端开发
- 前端开发
- 测试开发
- 文档编写
- 代码审查
- 问题反馈

---

## 联系方式

- **项目地址**：[GitHub Repository](../../)
- **问题反馈**：[Issues](../../issues)
- **讨论区**：[Discussions](../../discussions)
- **邮件**：[topems@example.com](mailto:topems@example.com)

---

*本文档最后更新：2026-08-28*
*变更日志会在每个版本发布时更新，请关注最新版本。*
