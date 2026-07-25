# TOPEMS 整合实施方案：短板修复与产品上线一体化推进

> **版本**: v1.0 | **日期**: 2026-07-24 | **目标**: 4-6 周内完成基本成熟产品上线
> **首要任务**: 认证闭环 · 登录可用 · 功能提供 · 业务实现
> **策略**: 多任务并行 · 修复即交付 · 每 Sprint 可演示
> **配套文档**: [SHORTCOMINGS-ANALYSIS-REPORT.md](file:///Users/xingzhai/TOPEMS/docs/SHORTCOMINGS-ANALYSIS-REPORT.md) · [CODE_WIKI.md](file:///Users/xingzhai/TOPEMS/docs/CODE_WIKI.md)

---

## 目录

1. [方案总览与核心策略](#1-方案总览与核心策略)
2. [现状基线与缺口全景](#2-现状基线与缺口全景)
3. [Sprint 0：安全止血 + 认证闭环（第 1 周）](#3-sprint-0安全止血--认证闭环第-1-周)
4. [Sprint 1：核心业务跑通 + 多租户（第 2 周）](#4-sprint-1核心业务跑通--多租户第-2-周)
5. [Sprint 2：BFF 联调 + 类型同步 + 路由收敛（第 3-4 周）](#5-sprint-2bff-联调--类型同步--路由收敛第-3-4-周)
6. [Sprint 3：上线就绪 + 监控 + E2E（第 5-6 周）](#6-sprint-3上线就绪--监控--e2e第-5-6-周)
7. [并行任务依赖图](#7-并行任务依赖图)
8. [风险管控与回滚预案](#8-风险管控与回滚预案)
9. [上线验收 Checklist](#9-上线验收-checklist)

---

## 1. 方案总览与核心策略

### 1.1 核心策略：修复即交付

不再单独做"安全修复"或"架构治理"，而是把每个短板修复**绑定到一个用户可感知的功能交付**上：

| 短板修复 | 绑定的功能交付 | 用户感知 |
|---------|--------------|---------|
| BI SQL 注入 | BI 自助分析上线 | 用户可安全创建图表 |
| JWT 默认密钥 | 生产环境部署 | 部署即可用，无需额外配置 |
| 忘记密码端点不匹配 | 密码找回流程 | 用户可自助找回密码 |
| 注册 Tab 禁用 | 用户注册流程 | 管理员可开放注册 |
| 多租户 Claims 缺失 | 多租户登录 | 用户可选择租户登录 |
| 路由守卫漏洞 | 安全路由全覆盖 | 所有页面受保护 |
| App.tsx 膨胀 | 维护性提升 | 后续迭代更快 |
| 前后端类型不同步 | OpenAPI 契约 | API 漂移自动检测 |

### 1.2 多任务并行原则

每个 Sprint 内部划分为 **4 条并行工作流**，互不阻塞：

```
┌─────────────────────────────────────────────────────────────┐
│  工作流 A: 后端安全与认证 (Rust)                              │
│  - IAM/认证/JWT/中间件                                        │
├─────────────────────────────────────────────────────────────┤
│  工作流 B: 前端认证与 UI (React)                              │
│  - 登录页/路由守卫/状态管理/布局                               │
├─────────────────────────────────────────────────────────────┤
│  工作流 C: 业务联调与 BFF (Rust + React)                      │
│  - Portal BFF/业务模块/Mock 清理                              │
├─────────────────────────────────────────────────────────────┤
│  工作流 D: 部署与可观测 (DevOps)                              │
│  - CI/CD/监控/测试/文档                                       │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 "一步到位"的定义

**不是**一次性写完所有功能，**而是**：
- 每个 Sprint 结束都有**可演示的端到端用户旅程**
- 不留技术债尾巴（每个修复都有测试与文档）
- 上线即可用（部署脚本、监控、回滚预案齐全）
- 4 个 Sprint 后产品达到"基本成熟"：核心认证、主要业务、安全合规、可观测、可部署

### 1.4 整体时间线

```
Week 1   | Sprint 0: 安全止血 + 认证闭环
Week 2   | Sprint 1: 核心业务跑通 + 多租户
Week 3-4 | Sprint 2: BFF 联调 + 类型同步 + 路由收敛
Week 5-6 | Sprint 3: 上线就绪 + 监控 + E2E
         |
         ▼
         基本成熟产品上线 (MVP 1.0)
```

---

## 2. 现状基线与缺口全景

### 2.1 已就绪部分（不要重做）

| 领域 | 现状 | 证据 |
|------|------|------|
| 后端业务服务 | 17 个服务全部真实实现，无空骨架 | ERP 434 路由、Portal 439 路由、Finance 393 路由 |
| 前端业务页面 | 350+ 页面，仅 1 处 mock | 仅 [WorkflowMonitorPage.tsx#L75](file:///Users/xingzhai/TOPEMS/apps/web/src/pages/workflow/WorkflowMonitorPage.tsx#L75) 有 MOCK_DATA |
| Portal BFF | 36 模块全部真实代理/聚合 | [tickets.rs](file:///Users/xingzhai/TOPEMS/svc/portal/src/modules/tickets.rs)、[dashboard.rs](file:///Users/xingzhai/TOPEMS/svc/portal/src/modules/dashboard.rs) 真实 HTTP 转发 |
| 登录主流程 | 用户名+密码→JWT→跳转可用 | [auth.rs#L64](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/modules/iam/auth.rs#L64) + [LoginPage.tsx](file:///Users/xingzhai/TOPEMS/apps/web/src/pages/shared/LoginPage.tsx) |
| Token 刷新 | 5 分钟定时刷新可用 | [useAuth.tsx](file:///Users/xingzhai/TOPEMS/apps/web/src/hooks/useAuth.tsx) |
| 路由守卫主体 | ProtectedRoute 覆盖业务路由 | [ProtectedRoute.tsx](file:///Users/xingzhai/TOPEMS/apps/web/src/components/auth/ProtectedRoute.tsx) |
| API 客户端 | 35+ 服务实例、401 智能处理 | [client.ts](file:///Users/xingzhai/TOPEMS/apps/web/src/api/client.ts) |
| React Query | 完整 QueryClient + QUERY_KEYS | [reactQuery.ts](file:///Users/xingzhai/TOPEMS/apps/web/src/lib/reactQuery.ts) |
| 微前端 | 19 远程模块清单 + Federation shared | [microfrontend/config.ts](file:///Users/xingzhai/TOPEMS/apps/web/src/microfrontend/config.ts) |

### 2.2 阻断上线的缺口（必须修复）

| # | 缺口 | 风险 | 影响面 | 修复 Sprint |
|---|------|------|--------|------------|
| G1 | BI 模块 SQL 注入 | 🔴 全租户数据泄露 | BI 服务 | S0 |
| G2 | JWT 默认密钥回退 | 🟠 生产无认证 | 所有服务 | S0 |
| G3 | 插件 token 默认放行 | 🟡 恶意插件注册 | unified-core | S0 |
| G4 | DEVELOPMENT_MODE 绕过认证 | 🟠 生产误开即无认证 | unified-core | S0 |
| G5 | 忘记密码端点不匹配 | 🔴 密码找回完全不可用 | 登录流程 | S0 |
| G6 | 重置密码字段名不匹配 | 🔴 密码重置完全不可用 | 登录流程 | S0 |
| G7 | 注册 Tab 被禁用 | 🟡 无法自助注册 | 用户管理 | S0 |
| G8 | 双认证体系并存 | 🟡 状态漂移 | 全前端 | S0 |
| G9 | 多租户登录未实现 | 🟡 多租户场景不可用 | 企业客户 | S1 |
| G10 | 路由守卫漏洞（/performance 等） | 🟡 未认证可访问 | 安全 | S1 |
| G11 | WorkflowMonitorPage mock | 🟢 异常监控不可用 | 工作流 | S1 |
| G12 | App.tsx 1984 行膨胀 | 🟢 维护性差 | 工程效能 | S2 |
| G13 | 前后端类型不同步 | 🟡 API 漂移 | 工程效能 | S2 |
| G14 | 路由废弃路径 | 🟢 文档与 proxy 膨胀 | 工程效能 | S2 |
| G15 | 无监控告警接入 | 🟠 故障不可见 | 运维 | S3 |
| G16 | 无 E2E 测试 | 🟡 回归风险 | 质量 | S3 |

---

## 3. Sprint 0：安全止血 + 认证闭环（第 1 周）

**Sprint 目标**: 消除所有阻断上线的安全漏洞，完成认证登录全流程闭环，任何人可注册→登录→找回密码→登出。

**可演示成果**: 完整的认证用户旅程（注册 → 登录 → 仪表盘 → 忘记密码 → 重置 → 重新登录 → 登出），生产环境部署无安全风险。

### 工作流 A：后端安全与认证（Rust）

#### A1. 修复 BI 模块 SQL 注入（P0，绑定 BI 自助分析上线）

**文件**: [svc/analytics/src/modules/bi/chart_service.rs](file:///Users/xingzhai/TOPEMS/svc/analytics/src/modules/bi/chart_service.rs#L103) · [multidimensional_analysis.rs](file:///Users/xingzhai/TOPEMS/svc/analytics/src/modules/bi/multidimensional_analysis.rs#L332)

**改动**:
1. 新建 `bi_datasets` 元数据表（`id, tenant_id, table_name, allowed_columns JSONB`）
2. 在 `ChartService` 入口增加 `validate_dataset(data_source, columns)` 白名单校验
3. `generate_line_chart`/`generate_bar_chart`/`generate_pie_chart` 改用 `sqlx::query_as_with`，标识符走 `quote_identifier`
4. 增加注入攻击 payload 单测（`'; DROP TABLE`、`UNION SELECT`、`pg_read_file`）

**验收**: 注入单测全过；CI 增加 `grep -rn "format!(\"SELECT"` 静态扫描卡点

#### A2. 移除 JWT 默认密钥回退（P1 止血，绑定生产部署可用）

**文件**: [lib/src/auth.rs#L94-L117](file:///Users/xingzhai/TOPEMS/lib/src/auth.rs#L94-L117)

**改动**:
```rust
// 修改前：未配置 JWT_SECRET 时回退到硬编码默认值
let default_jwt_secret = "topems-jwt-secret-key-...";
let jwt_secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| default_jwt_secret.to_string());

// 修改后：PROFILE=prod 时强制要求，否则 panic
let jwt_secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| {
    if std::env::var("PROFILE").unwrap_or_default() == "prod" {
        panic!("JWT_SECRET must be set in production environment");
    }
    tracing::warn!("JWT_SECRET not set, using dev default (DO NOT use in production)");
    "topems-jwt-secret-key-must-be-at-least-32-characters-long-for-hs256".to_string()
});
```

**验收**: `PROFILE=prod` 无 `JWT_SECRET` 启动失败；dev 环境不受影响

#### A3. 插件注册令牌生产强制校验（P1，绑定插件市场安全基础）

**文件**: [svc/unified-core/src/modules/plugin/handlers/runtime.rs#L14-L23](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/modules/plugin/handlers/runtime.rs#L14-L23)

**改动**: `PROFILE=prod` 且 `PLUGIN_REGISTRATION_TOKEN` 未配置时返回 `false` 并 `error!`

**验收**: prod 未配 token 拒绝注册；dev 未配 token 放行

#### A4. 关闭 DEVELOPMENT_MODE 生产风险（P1，绑定认证安全）

**文件**: [lib/src/auth.rs#L613-L639](file:///Users/xingzhai/TOPEMS/lib/src/auth.rs#L613-L639)

**改动**: `DEVELOPMENT_MODE=true` 仅在 `PROFILE != prod` 时生效；prod 环境强制忽略该环境变量

**验收**: prod 环境即使误设 `DEVELOPMENT_MODE=true` 也无法绕过认证

#### A5. 统一后端 User 模型（P2，绑定认证数据一致性）

**文件**: [svc/unified-core/src/modules/iam/auth.rs#L28-L40](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/modules/iam/auth.rs#L28-L40) · [iam/user/models.rs#L65-L74](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/modules/iam/user/models.rs#L65-L74)

**改动**:
1. 统一 `UserRow` 字段（`is_active` vs `status` 二选一，推荐 `status` 兼容前端）
2. 统一数据库表（`iam.users` vs `core_users` 二选一，推荐 `iam.users`）
3. 登录 SQL 增加 `tenant_id` 查询与返回

**验收**: 登录返回的 Claims 包含 `tenant_id`；用户管理模块与认证模块数据一致

### 工作流 B：前端认证与 UI（React）

#### B1. 修复忘记密码端点不匹配（P0，绑定密码找回可用）

**文件**: [apps/web/src/api/iam/auth.ts#L57-L63](file:///Users/xingzhai/TOPEMS/apps/web/src/api/iam/auth.ts#L57-L63)

**改动**:
```typescript
// 修改前
requestPasswordReset: (data) => iam.post('/auth/reset-password', data),
confirmPasswordReset: (data) => iam.post('/auth/set-new-password', data),

// 修改后（对齐后端 routes/mod.rs L99-104）
requestPasswordReset: (data: { email: string }) => 
    iam.post('/auth/forgot-password', data),
confirmPasswordReset: (data: { reset_token: string; new_password: string }) => 
    iam.post('/auth/reset-password', data),
```

同步修改 [ForgotPasswordPage.tsx](file:///Users/xingzhai/TOPEMS/apps/web/src/pages/shared/ForgotPasswordPage.tsx) 中的字段名（`token` → `reset_token`、`new_password` 保持）

**验收**: 忘记密码 → 收到邮件 → 重置密码 → 用新密码登录成功

#### B2. 启用注册 Tab（P2，绑定用户注册流程）

**文件**: [apps/web/src/pages/shared/LoginPage.tsx#L101-L109](file:///Users/xingzhai/TOPEMS/apps/web/src/pages/shared/LoginPage.tsx#L101-L109)

**改动**:
```typescript
// 修改前：硬编码禁用
if (isRegister) {
    showNotification('注册功能已关闭，请联系管理员获取账号', 'warning');
    return;
}

// 修改后：调用后端 register API
if (isRegister) {
    await authModuleApi.register({
        username: values.username,
        email: values.email,
        password: values.password,
    });
    showNotification('注册成功，请登录', 'success');
    setIsRegister(false);
    return;
}
```

**验收**: 注册 Tab 可用，注册后可登录

#### B3. 统一认证状态管理（P2，绑定前端状态一致性）

**文件**: [apps/web/src/store/authStore.ts](file:///Users/xingzhai/TOPEMS/apps/web/src/store/authStore.ts) · [hooks/useAuth.tsx](file:///Users/xingzhai/TOPEMS/apps/web/src/hooks/useAuth.tsx)

**改动**:
1. **保留** `hooks/useAuth.tsx`（Context 版，App.tsx 实际使用）
2. **废弃** `store/authStore.ts` 的 `useAuth` 导出，改为内部使用
3. `hooks/useAuth.tsx` 的 `hasPermission` 改为读取 Context state 而非 localStorage 直读
4. 移除 `store/index.ts` 对 `authStore` 的导出（或标记 `@internal`）

**验收**: 全局仅一处 `useAuth` 导出；权限检查数据源单一

#### B4. 前端登出调用后端 API（P2，绑定会话安全）

**文件**: [apps/web/src/hooks/useAuth.tsx#L320-L338](file:///Users/xingzhai/TOPEMS/apps/web/src/hooks/useAuth.tsx#L320-L338)

**改动**: `logout` 先调用 `authApi.logout`（吊销 refresh token），再清 localStorage

**验收**: 登出后旧 refresh token 无法刷新

### 工作流 C：业务联调与 BFF（Rust + React）

#### C1. 端到端验证登录→Dashboard 流程

**任务**: 启动 unified-core + portal + web，手动验证：
1. 访问 `/login` → 输入 `admin/admin123` → 跳转 `/dashboard`
2. Dashboard 数据加载（Portal BFF 聚合通知/审批/任务）
3. 顶部导航菜单渲染正确
4. 点击任一业务模块进入页面

**验收**: 全流程无 401/404/500

### 工作流 D：部署与可观测（DevOps）

#### D1. CI 集成 cargo-audit

**文件**: [.github/workflows/ci.yml](file:///Users/xingzhai/TOPEMS/.github/workflows/ci.yml)

**改动**: 增加 `cargo audit` 步骤，发现 RLSA 失败构建

**验收**: CI 自动扫描 Rust 依赖漏洞

#### D2. 生成生产环境 .env 模板

**文件**: 新建 `config/.env.production.template`

**内容**:
```bash
# 必须配置（生产环境未配置将导致启动失败）
PROFILE=prod
JWT_SECRET=<请生成 64 字符随机字符串>
JWT_REFRESH_SECRET=<请生成 64 字符随机字符串>
PLUGIN_REGISTRATION_TOKEN=<请生成 32 字符随机字符串>
ENCRYPTION_KEY=<HRM 字段加密密钥，32 字符>

# 数据库
DATABASE_URL=postgresql://user:pass@localhost:5432/topems
REDIS_URL=redis://localhost:6379

# 服务发现
UNIFIED_CORE_URL=http://localhost:8000
```

**验收**: 按 template 配置即可启动生产环境

---

## 4. Sprint 1：核心业务跑通 + 多租户（第 2 周）

**Sprint 目标**: 完成多租户登录、路由守卫全覆盖、所有业务模块端到端可访问、清理唯一 mock。

**可演示成果**: 多租户用户登录 → 切换租户 → 访问任一业务模块（ERP/CRM/MES/HRM 等）→ 数据按租户隔离。

### 工作流 A：后端多租户认证

#### A1. 登录注入 tenant_id（P1，绑定多租户登录）

**文件**: [svc/unified-core/src/modules/iam/auth.rs#L236](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/modules/iam/auth.rs#L236)

**改动**:
1. 登录 SQL 增加 `tenant_id` 字段查询
2. Claims 构造时填入 `tenant_id`
3. `refresh_token` 同步注入 `tenant_id`
4. 若用户属于多租户，返回租户列表，前端选择后切换

**验收**: JWT payload 包含 `tenant_id`；RLS 中间件可读取

#### A2. 实现 /tenant/switch 接口

**文件**: [svc/unified-core/src/routes/iam.rs](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/routes/iam.rs)

**改动**: 新增 `POST /iam/tenant/switch` 端点，校验用户是否属于目标租户，重新签发带新 `tenant_id` 的 token

**验收**: 前端调用 `tenantApi.switchTenant` 返回新 token

### 工作流 B：前端多租户与路由

#### B1. 建立租户 Store（P1，绑定多租户切换）

**文件**: 新建 `apps/web/src/store/tenantStore.ts`

**内容**:
```typescript
interface TenantState {
  currentTenantId: string | null;
  tenants: Tenant[];
  setCurrentTenant: (id: string) => Promise<void>;
  loadTenants: () => Promise<void>;
}
```

**验收**: 全局可获取当前租户；切换租户后 API 请求自动携带新 `X-Tenant-ID`

#### B2. 修复路由守卫漏洞（P1，绑定安全路由全覆盖）

**文件**: [apps/web/src/App.tsx#L351-L358](file:///Users/xingzhai/TOPEMS/apps/web/src/App.tsx#L351-L358) · [L473-L476](file:///Users/xingzhai/TOPEMS/apps/web/src/App.tsx#L473-L476)

**改动**:
1. `/performance` 路由用 `ProtectedRoute` 包裹
2. `/template-demo` 路由用 `ProtectedRoute` 包裹或移除
3. 重定向路由（`/departments` 等）确认无需保护

**验收**: 未登录访问 `/performance` 跳转登录页

#### B3. 完善 GuestRoute（P2，绑定登录体验）

**文件**: [apps/web/src/components/auth/ProtectedRoute.tsx#L262-L264](file:///Users/xingzhai/TOPEMS/apps/web/src/components/auth/ProtectedRoute.tsx#L262-L264)

**改动**: 已登录用户访问 `/login` 自动跳转 `/dashboard`

**验收**: 登录后访问 `/login` 不停留在登录页

### 工作流 C：业务联调

#### C1. 清理 WorkflowMonitorPage mock（P2，绑定工作流异常监控）

**文件**: [apps/web/src/pages/workflow/WorkflowMonitorPage.tsx#L75](file:///Users/xingzhai/TOPEMS/apps/web/src/pages/workflow/WorkflowMonitorPage.tsx#L75)

**改动**:
1. 后端 unified-core 工作流模块增加异常监控 API（若未实现）
2. 前端替换 `MOCK_DATA` 为 `useQuery` 调用真实 API

**验收**: 工作流异常监控页显示真实数据

#### C2. 业务模块端到端验证

**任务**: 逐模块验证 CRUD 闭环：
- IAM（用户/角色/权限）
- 工单（创建/SLA/升级）
- ERP（凭证/订单）
- HRM（员工/考勤）
- CRM（客户/商机）
- MES（工单/看板）
- 其他模块抽样验证

**验收**: 每模块至少一个 CRUD 操作成功

### 工作流 D：测试与文档

#### D1. 认证端到端测试

**文件**: [tests/e2e/](file:///Users/xingzhai/TOPEMS/tests/e2e/)

**改动**: 新增 `auth.e2e.spec.ts` 覆盖：注册→登录→忘记密码→重置→重新登录→登出

**验收**: E2E 测试自动通过

---

## 5. Sprint 2：BFF 联调 + 类型同步 + 路由收敛（第 3-4 周）

**Sprint 目标**: 完成前后端类型契约、路由废弃路径下线、App.tsx 拆分、Portal BFF 全量联调。

**可演示成果**: 前后端 API 漂移自动检测；路由文档清晰；代码可维护性显著提升。

### 工作流 A：后端 OpenAPI 输出

#### A1. 补全 utoipa 注解

**文件**: [svc/unified-core/src/modules/iam/](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/modules/iam/) · [ticket/](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/modules/ticket/)

**改动**: 核心模块（IAM/Ticket/Flow）补全 `#[derive(ToSchema)]` 与 `#[utoipa::path]`

**验收**: `cargo run -- openapi` 生成完整 `openapi.yaml`

### 工作流 B：前端类型同步

#### B1. OpenAPI 驱动类型生成（P2，绑定 API 契约）

**文件**: 新建 `apps/web/scripts/generate-types.ts`

**改动**:
1. CI 步骤：后端构建后导出 `openapi.yaml` 至 `packages/shared-types/openapi.yaml`
2. 前端 CI 用 `openapi-typescript` 生成 `packages/shared-types/src/generated.ts`
3. 与手写类型对比，差异时 CI 失败

**验收**: 后端改字段 → CI 检测到类型漂移 → 构建失败

#### B2. 拆分 App.tsx（P2，绑定维护性）

**文件**: [apps/web/src/App.tsx](file:///Users/xingzhai/TOPEMS/apps/web/src/App.tsx)

**改动**:
1. 将 L491-L1952 的 `MicroFrontendDevTools` 拆分到 `apps/web/src/dev-tools/MicroFrontendDevTools.tsx`
2. 仅在 `IS_DEV` 时 lazy import
3. App.tsx 精简至 < 300 行

**验收**: App.tsx 行数 < 300；dev 工具功能不变

### 工作流 C：路由与 BFF

#### C1. 路由废弃路径下线（P2，绑定 API 治理）

**文件**: [svc/unified-core/src/routes/mod.rs](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/routes/mod.rs) · [apps/web/vite.config.ts](file:///Users/xingzhai/TOPEMS/apps/web/vite.config.ts)

**改动**:
1. 旧路径响应头增加 `Deprecation: true` + `Sunset: 2026-12-31`
2. 前端 `runtime.ts` 删除 `@deprecated` 别名
3. Vite proxy 移除旧路径规则

**验收**: 旧路径返回 `Deprecation` header；前端仅用新路径

#### C2. Portal BFF 全量联调

**任务**: 验证 Portal BFF 36 模块全部代理可达：
- dashboard / tickets / todos / user / search / services / settings / navigation / quick_actions / announcements / notifications / monitoring / aggregation
- GraphQL 端点（查询/变更/订阅）

**验收**: 无 404/502；聚合接口降级正常

### 工作流 D：质量保障

#### D1. 契约测试

**文件**: 新建 `tests/contract/`

**改动**: 使用 `schemathesis` 对核心路径（IAM/Ticket/Flow）运行契约测试

**验收**: 契约测试自动通过

---

## 6. Sprint 3：上线就绪 + 监控 + E2E（第 5-6 周）

**Sprint 目标**: 完成监控告警接入、E2E 测试覆盖、部署文档、上线 checklist。

**可演示成果**: 一键部署、监控大盘可见、关键用户旅程 E2E 自动化、回滚预案完备。

### 工作流 A：监控告警

#### A1. Prometheus 指标验证

**文件**: [svc/unified-core/](file:///Users/xingzhai/TOPEMS/svc/unified-core/)（monitor 模块）

**改动**:
1. 验证各服务 `/metrics` 端点可访问
2. 配置 Prometheus scrape 配置
3. Grafana 大盘模板（服务健康、SLA 违约率、API 延迟）

**验收**: Grafana 可查看所有服务指标

#### A2. Alertmanager 接入

**任务**: 配置 Alertmanager webhook 接收端，告警通知到飞书/钉钉

**验收**: 服务宕机 → 1 分钟内告警通知

### 工作流 B：E2E 测试

#### B1. 关键用户旅程 E2E

**文件**: [tests/e2e/](file:///Users/xingzhai/TOPEMS/tests/e2e/)

**改动**: 覆盖以下旅程：
1. 认证旅程（注册→登录→登出）
2. 工单旅程（创建→SLA→升级→解决）
3. ERP 旅程（凭证创建→审核→过账）
4. 多租户旅程（登录→切换租户→数据隔离验证）

**验收**: E2E 测试在 CI 自动通过

### 工作流 C：部署与文档

#### C1. 一键部署脚本

**文件**: [scripts/deploy.sh](file:///Users/xingzhai/TOPEMS/scripts/)

**改动**: 支持以下命令：
```bash
./scripts/deploy.sh dev      # 开发环境
./scripts/deploy.sh staging  # 预发布
./scripts/deploy.sh prod     # 生产（含健康检查与回滚）
```

**验收**: 一条命令完成部署

#### C2. 上线文档

**文件**: 新建 `docs/deployment-runbook.md`

**内容**: 部署步骤、回滚预案、故障排查、值班联系

**验收**: 新人按文档可独立部署

### 工作流 D：上线 Checklist

#### D1. 安全 Checklist

- [ ] `PROFILE=prod` 所有环境变量已配置
- [ ] JWT_SECRET 长度 ≥ 64 字符
- [ ] PLUGIN_REGISTRATION_TOKEN 已配置
- [ ] DEVELOPMENT_MODE 未设置或为 false
- [ ] cargo-audit 无高危项
- [ ] BI SQL 注入单测全过
- [ ] HTTPS 证书有效
- [ ] CORS 配置正确（非 `*`）

#### D2. 功能 Checklist

- [ ] 注册→登录→登出闭环
- [ ] 忘记密码→重置密码闭环
- [ ] 多租户登录与切换
- [ ] 所有业务模块可访问
- [ ] Portal BFF 聚合接口正常
- [ ] WebSocket 实时通知正常

#### D3. 可观测 Checklist

- [ ] Prometheus 指标可查
- [ ] Grafana 大盘可访问
- [ ] Alertmanager 告警通道畅通
- [ ] Jaeger 链路追踪可查
- [ ] 日志聚合可查（ELK/Loki）

---

## 7. 并行任务依赖图

```
Sprint 0 (Week 1)
├── A1 BI SQL注入 ─┐
├── A2 JWT默认密钥 ─┤
├── A3 插件token ──┤── D1 cargo-audit CI
├── A4 DEV_MODE ───┤── D2 .env模板
├── A5 统一User ───┤
├── B1 忘记密码 ────┤── C1 端到端验证
├── B2 注册Tab ─────┤
├── B3 统一认证 ────┤
└── B4 登出API ─────┘

Sprint 1 (Week 2) - 依赖 S0 完成
├── A1 tenant_id ────┐
├── A2 /tenant/switch ┤── B1 租户Store ──── C1 业务联调
├── B2 路由守卫 ──────┤── B3 GuestRoute ─── C2 CRUD验证
└── C1 Workflow mock ─┘────────────────── D1 E2E认证测试

Sprint 2 (Week 3-4) - 依赖 S1 完成
├── A1 utoipa注解 ──── B1 类型生成 ──── D1 契约测试
├── B2 App.tsx拆分 ──────────────────── C1 路由下线
└── C2 BFF联调 ──────────────────────── ─

Sprint 3 (Week 5-6) - 依赖 S2 完成
├── A1 Prometheus ──── A2 Alertmanager
├── B1 E2E测试 ──────── ─
├── C1 部署脚本 ─────── C2 上线文档
└── D1 上线Checklist ── ─
```

**关键依赖**:
- S0 必须先完成（安全止血阻断一切）
- S1 的多租户依赖 S0 的 User 模型统一
- S2 的类型同步依赖 S1 的 API 稳定
- S3 的 E2E 依赖 S2 的功能完整

**可并行点**:
- S0 内 4 条工作流完全独立
- S1 的后端多租户与前端路由守卫可并行
- S2 的 App.tsx 拆分与 BFF 联调可并行
- S3 的监控与 E2E 可并行

---

## 8. 风险管控与回滚预案

### 8.1 风险矩阵

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| JWT 改造导致旧 token 失效 | 中 | 高 | 保留 HS256 过渡期 30 天，双算法验签 |
| BI 白名单迁移影响存量看板 | 中 | 中 | 灰度：先校验告警，再拒绝，最后切参数化 |
| 多租户改造影响单租户客户 | 低 | 高 | `tenant_id` 为空时回退默认租户 |
| 路由下线影响第三方集成 | 中 | 中 | 6 个月过渡期 + Sunset header 预警 |
| App.tsx 拆分引入回归 | 低 | 中 | 拆分前后 E2E 测试对比 |

### 8.2 回滚预案

每个 Sprint 部署前准备回滚：
1. **Git tag**: `pre-sprint-N-YYYYMMDD`
2. **Docker image tag**: 保留前一个稳定版本
3. **数据库迁移**: 所有 migration 支持回滚（`drop table` / `drop column`）
4. **配置回滚**: `.env` 保留前一版本，一键切换
5. **流量切换**: K8s 滚动更新，异常时一键回滚

### 8.3 灰度发布策略

```
内部 dev (1天) → staging (1天) → 10% canary (1天) → 100% prod
```

每个阶段验证：
- dev: 功能正确性
- staging: 性能与集成
- canary: 真实用户错误率
- prod: 全量监控

---

## 9. 上线验收 Checklist

### 9.1 安全验收

- [ ] `PROFILE=prod` 启动校验生效（无 JWT_SECRET/PLUGIN_TOKEN 则失败）
- [ ] DEVELOPMENT_MODE 在 prod 无法绕过认证
- [ ] BI 模块拒绝所有 SQL 注入 payload
- [ ] cargo-audit CI 通过
- [ ] HTTPS 强制，CORS 限定域名

### 9.2 认证验收

- [ ] 注册流程可用（后端 + 前端）
- [ ] 登录流程可用（用户名+密码）
- [ ] 忘记密码 → 邮件 → 重置密码 全流程可用
- [ ] Token 5 分钟自动刷新
- [ ] 登出后 refresh token 失效
- [ ] 多租户登录与切换
- [ ] 所有路由受 ProtectedRoute 保护

### 9.3 业务验收

- [ ] 17 个业务服务全部可访问
- [ ] Portal BFF 36 模块全部可达
- [ ] 无 mock 数据残留（WorkflowMonitorPage 已清理）
- [ ] 主要业务 CRUD 闭环（IAM/工单/ERP/HRM/CRM/MES 抽样）

### 9.4 工程验收

- [ ] App.tsx < 300 行
- [ ] OpenAPI 类型同步 CI 通过
- [ ] 废弃路径返回 Sunset header
- [ ] E2E 测试覆盖关键旅程
- [ ] cargo-audit + 前端 lint CI 通过

### 9.5 运维验收

- [ ] 一键部署脚本可用
- [ ] Prometheus + Grafana 大盘可访问
- [ ] Alertmanager 告警通道畅通
- [ ] Jaeger 链路追踪可查
- [ ] 部署文档与回滚预案完备

---

## 附录：任务责任人建议

| 工作流 | 建议责任人 | 技能要求 |
|--------|----------|---------|
| A 后端安全与认证 | Rust 工程师 | Axum/SQLx/JWT |
| B 前端认证与 UI | React 工程师 | React 19/Zustand/React Router |
| C 业务联调与 BFF | 全栈工程师 | Rust + React |
| D 部署与可观测 | DevOps 工程师 | CI/CD/Prometheus/K8s |

**并行节奏**: 每日 standup 同步依赖，每周 sprint review 演示成果。

---

*本方案由 TOPEMS 架构分析生成，最后更新于 2026-07-24*
