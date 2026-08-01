# TOPEMS 项目架构与质量全面审计报告

> **审计日期**: 2026-07-28  
> **审计范围**: 前后端全栈 8 个维度  
> **问题总数**: 70 项（P0: 22 | P1: 28 | P2: 20）

---

## 一、整体架构问题（11 项）

### P0 严重问题（6 项）

| # | 问题 | 位置 | 影响 |
|---|------|------|------|
| 1 | 三套路由机制并存 | `apps/web/src/App.tsx` | 静态路由 + DynamicRoutes + Navigate 重定向混用 |
| 2 | 双模块系统冲突 | `modules/registry/core-modules.ts` vs `routes/v2/` | Module Federation 与本地模块重复注册相同路由 |
| 3 | unified-core 是"上帝服务" | `svc/unified-core/src/main.rs` | 17 个 `expect()` 串联初始化，任一失败全崩溃 |
| 4 | 5 个 deprecated 模块仍被初始化 | `svc/unified-core/src/main.rs L148-184` | billing/communication/ticket/search/feedback 与独立服务重复建表 |
| 5 | feedback 服务 axum 0.7 不兼容 | `svc/feedback/Cargo.toml` | workspace 锁定 0.8，feedback 独立用 0.7 |
| 6 | 8 个服务缺少 RLS | feedback/integration/gis/billing/ticket/search/communication/unified-core | 租户隔离失效，跨租户数据泄露 |

### P1 高优先级（5 项）

| # | 问题 | 详情 |
|---|------|------|
| 1 | 四处服务配置不一致 | runtime.ts / vite.config.ts / service-ports.ts / moduleMapping.ts 互不同步 |
| 2 | 14 个服务手写启动未用 shared-bootstrap | 中间件应用不一致 |
| 3 | unified-core 自建中间件与 shared 库重复 | middleware/ 7 个文件与 shared-bootstrap 重复 |
| 4 | vite.config.ts 残留 4 条代理 | /comm/api、/ws/notifications 指向错误端口 |
| 5 | navigation 仅注册 9 个模块 vs 30+ 实际模块 | 大量模块导航未统一注册 |

---

## 二、前端模块缺陷/冲突/重复/冗余（13 项）

### P0 严重问题（7 项）

| # | 问题 | 详情 |
|---|------|------|
| 1 | schema/ 与 schemas/ 双目录 | 均有 admin/iam/wms 定义 |
| 2 | 30+ 组重复页面 | 5 个审计日志页、4 个供应商管理页、3 个字典管理页等 |
| 3 | api/mail 与 api/email 两套邮件 API | 字段命名冲突 |
| 4 | common/ 与 ui/ 组件同名 | DataTable、LazyImage、CommandPalette 各一份 |
| 5 | notification/ 与 notifications/ 命名混乱 | 单复数并存导致 import 歧义 |
| 6 | 远程模块端口在两份配置中完全冲突 | microfrontend/config.ts vs core-modules.ts |
| 7 | plugins.config.ts 端口与 microfrontend 冲突 | 端口 3001-3010 与远程模块重叠 |

### P1 高优先级（6 项）

| # | 问题 | 详情 |
|---|------|------|
| 1 | 9 个 CRUD hooks 功能重叠 | useCrudQueries/useCrudForm/useResourceCRUD 等 |
| 2 | 5 个 WebSocket hooks 重复 | useWebSocket/useImWebSocket/useDashboardWebSocket 等 |
| 3 | 4 套设计令牌系统并行 | theme/tokens.ts、v51-tokens.ts、cyberpunk.tokens.ts、shared-constants |
| 4 | design-system 与 common 双 UI 体系 | V51Button vs MUI Button 并存 |
| 5 | 顶层 src/asset/lowcode/oa/ 与 pages/ 重复 | 3 个目录在顶层和 pages/ 各有一份 |
| 6 | hooks/ 顶层 60+ 文件与 4 层分层空壳共存 | features/domain/ui/foundation 目录均仅 1 行 |

---

## 三、后端模块缺陷/冲突/重复/冗余（10 项）

### P0 严重问题（5 项）

| # | 问题 | 位置 |
|---|------|------|
| 1 | shared-core/crud.rs 零使用 | `lib/shared-core/src/crud.rs` 导出但全 27 服务无调用 |
| 2 | init.sql 8 张表无 RLS | `database/postgres/init.sql` 有 tenant_id 但无 ENABLE RLS |
| 3 | feedback/integration 完全无认证 | `svc/feedback/src/main.rs` 无 auth_middleware |
| 4 | CRM 硬编码加密密钥回退 | `svc/crm/src/main.rs L172-175` unwrap_or_else 返回已知弱密钥 |
| 5 | 3 个 deprecated 业务模块未删除 | scm/supplier.rs、erp/supplier.rs、unified-core/routes/communication.rs |

### P1 高优先级（5 项）

| # | 问题 | 详情 |
|---|------|------|
| 1 | 8 服务重复实现 InMemoryCache | srm/scm/crm/ehs/hrm/wms/erp/lims 各有一份相同代码 |
| 2 | 68 处 panic!/expect() 在 main.rs | unified-core 17 个、ERP 5 个 lazy_static expect |
| 3 | 26 处潜在 N+1 查询 | finance/voucher.rs 4 处、scm/purchase_contract.rs 2 处 |
| 4 | 无集中式迁移目录 | 迁移散落各服务 init_database() 函数 |
| 5 | shared-db NPlusOneDetector 零使用 | 导出但无服务接入 |

---

## 四、前后端对齐问题（9 项）

### P0 严重问题（3 项）

| # | 问题 | 影响 |
|---|------|------|
| 1 | Finance 凭证 API 12 处路径错配 | 前端调 /vouchers/batch 后端无此路由 → 404 |
| 2 | Finance 会计科目子端点不存在 | /accounts/{id}/children-batch → 404 |
| 3 | HRM Employee 字段序列化不对齐 | 后端 employee_number 前端 employee_no → 字段 undefined |

### P1 高优先级（4 项）

| # | 问题 | 影响 |
|---|------|------|
| 1 | Notification 批量操作方法不一致 | 前端 PUT vs 后端 POST，路径 /bulk vs /bulk-delete |
| 2 | WMS 响应结构不匹配 | 后端 {warehouses:[]} 前端期望 {items:[]} |
| 3 | 默认 WebSocket URL /ws 无后端对应 | 默认连 /ws → 失败 |
| 4 | service-ports.ts 缺 5 个服务 | communication/search/billing/ticket/feedback 未列出 |

### P2 技术债（2 项）

| # | 问题 |
|---|------|
| 1 | unified-core deprecated 通信路由未清理 |
| 2 | Portal GraphQL WS 路径不符合 /ws/{module}/{feature} 规范 |

---

## 五、UI 优化空间（7 项）

### P0（3 项）
| # | 问题 | 数据 |
|---|------|------|
| 1 | sx 中硬编码颜色 | 695 处 hex + 974 处 rgba，集中在 AI 面板 |
| 2 | a11y 覆盖率极低 | 仅 39 文件含 aria-*（<5%） |
| 3 | ListPageTemplate 4199 行 | 严重违反单一职责 |

### P1（4 项）
| # | 问题 | 详情 |
|---|------|------|
| 1 | 暗色模式不完整 | theme.ts 强制 mode: 'light' |
| 2 | 3 套响应式 hook 并存 | useIsMobile(768px) vs useResponsive vs useMediaQuery(sm) |
| 3 | 5 套 Table 实现 | DataTable/ListPageTemplate内部/BffDataTable/MobileDataTable/DataGrid |
| 4 | 加载/错误/空状态 118 处手写 | 未复用 EmptyState/ErrorEmptyState |

---

## 六、公共部分/组件/常量优化（6 项）

### P0（2 项）
| # | 问题 | 详情 |
|---|------|------|
| 1 | biStore 用 Zustand 管理服务端状态 | 手写 loading/error/cache，应迁 React Query |
| 2 | CRUD hooks 9 个功能重叠 | 应合并为 useCrud + 配置参数 |

### P1（4 项）
| # | 问题 | 详情 |
|---|------|------|
| 1 | 缺少 src/constants/ 目录 | 分页大小 26+ 处硬编码 10，setTimeout 30+ 处魔法值 |
| 2 | PageContainer 未被模板复用 | 所有 templates/* 自行实现 PageHeader |
| 3 | moduleLoadingStore/pluginStore 未迁 React Query | ARCHITECTURE.md 自己标注但未完成 |
| 4 | useMemo/useCallback 严重不足 | 200+ 页面仅约 15 处使用 |

---

## 七、硬编码问题（7 项）

| 类型 | 数量 | 严重程度 |
|------|------|----------|
| sx 硬编码颜色 | 695 hex + 974 rgba | P0 |
| 硬编码中文（schema title） | 25+ 文件 | P1 |
| 魔法数字 setTimeout | 30+ 处 | P2 |
| 硬编码服务端口 | 4 份配置互不一致 | P1 |
| 硬编码 WS URL | ws://localhost:8080/ws | P1 |
| 硬编码 Prometheus/Grafana URL | localhost:9090/3000 | P2 |
| 硬编码加密密钥 | CRM fallback key | P0 |

---

## 八、补充优化方面（7 项）

### 安全（P0）
- CRM 硬编码加密密钥回退值
- feedback/integration 无认证
- init.sql 8 张表无 RLS

### 性能（P1）
- 26 处 N+1 查询
- 390 处 SELECT *
- useMemo/useCallback 不足
- portal 连接池仅 5

### 可维护性（P1）
- 无集中式迁移工具
- shared-core/crud.rs 死代码
- ListPageTemplate 4199 行

### 架构一致性（P2）
- proto/ 根级文件与版本化 proto 重复
- shared-core/hrm.rs 命名误导
- 2 个服务将 OpenAPI 写 /tmp

---

## 优先修复路线图

### 第一阶段：P0 安全与阻断修复（立即）
1. CRM 移除硬编码密钥 → panic!
2. feedback/integration 添加 auth + RLS
3. init.sql 8 张表启用 RLS
4. feedback axum 0.7 → 0.8
5. HRM Employee 字段 serde rename 对齐
6. Finance 凭证 12 处路径错配修复
7. unified-core 移除 5 个 deprecated 模块初始化

### 第二阶段：P0 架构清理（本周）
1. 合并 schema/ 与 schemas/
2. 删除 30+ 重复页面
3. 合并 api/mail 与 api/email
4. 统一 service-ports.ts 为单一真相源
5. 废弃 modules/registry/，统一 routes/v2/

### 第三阶段：P1 治理（下个迭代）
1. 14 服务迁移 shared-bootstrap
2. 提取 InMemoryCache 到 shared 库
3. 拆分 ListPageTemplate（4199 行 → <300 行）
4. biStore 迁移 React Query
5. 9 个 CRUD hooks 合并
6. 695 处硬编码颜色替换为 design token
7. 补齐 src/constants/ 目录

### 第四阶段：P2 长期优化
1. 接入 NPlusOneDetector
2. 390 处 SELECT * 替换
3. 推广 shared-core/crud.rs 或删除
4. 统一迁移工具（sqlx-cli）
5. a11y 覆盖率提升
6. 暗色模式完善
