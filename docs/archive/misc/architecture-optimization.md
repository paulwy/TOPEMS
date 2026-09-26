# TOPEMS 架构与 UI 全面优化方案

> 分析日期: 2026-06-29 | 基于 UI-DESIGN-ASSESSMENT.md 深度扩展

---

## 一、系统架构总览

### 技术栈概要

| 层级 | 技术选型 | 规模 |
|------|---------|------|
| 前端主机 | React 19 + MUI v9 + Vite 8 | 1 个主应用 (apps/web) |
| 前端子应用 | React + Module Federation | 8 个 (core/hrm/crm/finance/pm/mes/scm/bi) |
| 移动端 | React Native (Expo SDK 50) | 1 个 (apps/mobile) |
| 后端 | Rust + Axum + SQLx | 20+ 微服务 (svc/*) |
| 共享库 | lib/topems-shared (Rust) + packages/* (TS) | 5 TS 包 + 1 Rust crate |
| 基础设施 | PostgreSQL + Redis + RabbitMQ + Consul + Jaeger + Prometheus | Docker Compose |

---

## 二、前端架构问题分析

### 2.1 包管理器混用 (P0 - 严重)

**现状：** 根 `package.json` 声明 `"packageManager": "yarn@4.5.0"`，但实际工作区使用 `pnpm-workspace.yaml`，且存在 `yarn.lock` 和 `pnpm-lock.yaml` 两个锁文件。

**风险：**
- 不同开发者可能使用不同包管理器，导致依赖解析不一致
- CI/CD 构建结果不可复现
- `pnpm` 的 workspace 协议 `workspace:*` 与 `yarn` 不兼容

**优化方案：**
- 统一为 `pnpm`（推荐，已有 workspace 配置和 pnpm-lock.yaml）
- 删除 `yarn.lock`、`.yarn/` 目录
- 根 `package.json` 移除 `packageManager: yarn@4.5.0`
- 在 `.npmrc` 添加 `package-manager-strict=true` 防止混用
- CI 脚本强制检查锁文件一致性

### 2.2 Module Federation 架构不完整 (P0 - 严重)

**现状：**
- `vite.config.ts` 定义了 8 个远程模块 (core/hrm/crm/finance/pm/mes/scm/bi)
- 实际只有 `apps/core` 有独立 `vite.config.ts`，其余 7 个子应用的 Module Federation 配置未验证
- 存在 `VITE_DEPLOYMENT_MODE=static` 的降级模式，此时所有远程模块返回空对象 `{}`

**风险：**
- 静态模式下 core 模块完全不可用，用户看到 "核心模块在静态模式下不可用" 的占位页
- Module Federation 的 shared 依赖版本锁定严格 (`strictVersion: true`)，子应用版本不匹配会导致运行时崩溃
- `react-transition-group` 的 alias 配置和 `ssr.noExternal` 暗示存在 SSR 相关的兼容性问题

**优化方案：**

1. **统一部署模式**：确定主部署策略
   - 如以单体部署为主：移除 Module Federation，将所有路由整合到 `apps/web`，减少架构复杂度
   - 如需微前端：完善所有 8 个子应用的 federation 配置，并建立 CI 验证

2. **shared 依赖治理：**
   ```typescript
   // 当前 strictVersion: true 过于严格，建议改为 eager + requiredVersion
   'react': { singleton: true, eager: true, requiredVersion: '^19.0.0' },
   ```

3. **降级策略改进：** 静态模式不应返回空对象，应通过代码分割 + 动态 import 实现按需加载

### 2.3 Vite Proxy 配置膨胀 (P1 - 高优)

**现状：** `vite.config.ts` 中有 **100+ 条** proxy 规则，包括 20+ 个服务的 API 代理和 20+ 个独立的 `plugin-health` 代理。

**风险：**
- 维护成本极高：每新增一个服务需要修改 4-5 处 proxy 配置
- 端口硬编码散布在 `vite.config.ts`、`services.yaml`、`docker-compose.yml`、`ports.env` 多处
- `plugin-health` 代理完全可以通过通配符或循环生成

**优化方案：**
```typescript
// 1. 从 services.yaml 或一个统一的 port registry 自动生成 proxy
import { servicePorts } from './config/service-ports';

const proxyConfig = Object.entries(servicePorts).reduce((acc, [name, port]) => {
  acc[`/${name}/api`] = createServiceProxyConfig(name, `http://localhost:${port}`);
  acc[`/${name}/health`] = createServiceProxyConfig(name, `http://localhost:${port}`);
  return acc;
}, {} as Record<string, any>);
```

### 2.4 TypeScript 配置分散 (P1 - 高优)

**现状：**
- `tsconfig.base.json` 仅定义 paths alias，无严格模式继承链
- 各 app 的 `tsconfig.json` 独立配置，可能存在规则不一致
- `apps/core/package.json` 中 `typescript: ^5.0.0`，而 `apps/web` 使用 `typescript: ^6.0.3` — 版本不一致

**优化方案：**
- 建立统一的 `tsconfig.presets/base.json`，所有 app 继承
- `apps/core` 升级 TypeScript 到 `^6.0.3` 与 web 保持一致
- 添加 `@typescript-eslint/no-explicit-any` 等 stricter 规则

### 2.5 依赖重复与版本不一致 (P1 - 高优)

| 依赖 | web 版本 | core 版本 | 问题 |
|------|---------|----------|------|
| typescript | ^6.0.3 | ^5.0.0 | 版本分裂 |
| vite | ^8.0.16 | ^5.4.0 | 大版本分裂 |
| @vitejs/plugin-react | ^6.0.2 | ^4.0.0 | 不兼容 |
| @types/react | ^19.2.17 | ^19.2.3 | 小版本不一致 |
| @types/react-dom | ^19.2.3 | ^19.2.3 | 一致 |
| date-fns + dayjs | 同时存在 | 仅 dayjs | web 端日期库冗余 |

**优化方案：**
- `apps/core` 的 vite/typescript 等工具链依赖升级到与 web 一致
- web 端统一使用 `date-fns` 或 `dayjs`（推荐 `date-fns`，tree-shaking 更好），移除另一个
- 通过 `pnpm overrides` 强制统一关键依赖版本

### 2.6 移动端完全独立 (P2 - 中优)

**现状：** `apps/mobile` 是 Expo React Native 应用（React 18.2），与主站 (React 19) 完全独立。
- 使用 `react-native-paper` 而非 MUI
- 无代码复用（hooks、API 层、类型定义）
- React 版本落后主站两个大版本

**优化方案：**
- 短期：共享 `packages/shared-types` 和 `packages/shared-utils`（纯 JS/TS 可跨平台）
- 中期：通过 monorepo workspace 让 mobile 依赖 shared 包
- 长期：评估 React Native Web 或 Expo Router for Web 实现组件层复用

---

## 三、后端架构问题分析

### 3.1 微服务粒度过细 (P1 - 高优)

**现状：** 20+ 独立 Rust 微服务，每个服务一个 Docker 容器，共享同一个 PostgreSQL 实例。

**问题矩阵：**

| 问题 | 影响 | 严重度 |
|------|------|--------|
| 每个服务独立进程，内存开销大（Rust binary 约 10-30MB/服务，20 服务 = 200-600MB） | 资源浪费 | 中 |
| 服务间通过 HTTP 调用，同一机器上网络延迟不必要 | 性能 | 低 |
| 所有服务共享 `topems` 数据库，schema 隔离不彻底 | 数据安全 | 高 |
| Consul 服务发现配置复杂度高 | 运维 | 中 |
| 每个服务独立的 Dockerfile，构建时间长 | CI/CD | 中 |
| Portal 服务的 Todo/Notification/Monitoring 数据为硬编码 mock | 功能完整性 | 高 |

**优化方案：**

1. **分域聚合（推荐）：** 将相关服务合并为 "域服务"
   - `mes + pdm` → 制造域（已拆分，建议合并回或共享进程）
   - `qms + lims + ehs` → 质量域（同上）
   - `scm + wms + srm` → 供应链域
   - `hrm + crm + pm` → 协同办公域
   - 保留 `unified-core`、`portal`、`ai`、`gis`、`mobile` 独立

2. **数据库 schema 隔离：** 各域使用独立 PostgreSQL schema 或独立数据库

3. **Mock 数据清理：** Portal 服务的 get_todos、get_notifications、get_monitoring_services 等全部返回硬编码数据，需要接入真实数据源

### 3.2 unified-core 承载过重 (P1 - 高优)

**现状：** `unified-core` 作为一个进程承载 IAM + Doc + Flow + File + Communication (Mail/IM/Notification) + AI 多个子系统。

**风险：**
- 单点故障影响全局（IAM 挂掉 → 所有服务不可用）
- 部署耦合：修复 IM 的 bug 需要重新部署整个 core（含 IAM）
- 代码膨胀：单个 crate 包含认证、文档、工作流、文件、通讯等完全不同的业务逻辑

**优化方案：**
- 短期：保持进程合并但模块化路由（已有 URL 路径区分），增加模块级健康检查
- 中期：考虑将非核心模块（IM、Mail、Notification）拆分为独立服务或 Sidecar
- 长期：基于 Axum 的 tower layer 机制实现真正的模块级独立部署

### 3.3 共享库 lib/topems-shared 膨胀 (P2 - 中优)

**现状：** `lib/src/lib.rs` 导出 40+ 模块（auth、database、cache、migration、embedding、vector_store、ai_client 等）。

**风险：**
- 任何共享库的修改都会触发所有服务的重新编译
- 不同服务可能只需要其中一部分功能（如 GIS 服务不需要 `embedding` 和 `ai_client`）
- 功能聚合粒度过粗

**优化方案：**
- 将 `topems-shared` 拆分为 feature-gated 子 crate：
  - `topems-core` (auth, database, cache, api 基础)
  - `topems-ai` (ai_client, embedding, vector_store)
  - `topems-infra` (monitoring, telemetry, tracing)
  - `topems-comm` (messaging, notification)
- 各服务按需引入，减少编译依赖链

### 3.4 后端数据层缺乏统一抽象 (P2 - 中优)

**现状：**
- `sqlx` 宏 `query!`/`query_as!` 编译时检查分散在各服务
- `sqlx-data.json` 仅在 hrm/mes 中出现，其余服务可能使用运行时查询
- 缺少统一的 Repository trait 或 DAO 层

**优化方案：**
- 在 shared 中定义 `Repository<T>` trait
- 各服务实现具体的 Repository
- 统一分页、过滤、排序的查询模式

---

## 四、前后端协作问题

### 4.1 API 路由不一致 (P1 - 高优)

**现状：** Vite proxy 中前端 API 路径与后端实际路径存在大量 rewrite 规则：

```typescript
// 前端调用路径          → 实际后端路径
'/iam/api/iam/auth/'    → '/api/v1/auth/'
'/iam/api/iam/'         → '/api/core/iam/'
'/hrm/api/hrm/'         → '/api/hrm/'
'/mes'                  → '/'（直接删除前缀）
```

**问题：** 前端使用的 API 路径格式不统一，有的带模块前缀 (`/hrm/api/hrm/`)，有的直接转发。这种不一致增加了开发者的认知负担。

**优化方案：**
- 确立统一的 API 路由规范：`/api/{version}/{service}/{resource}`
- 例如：`/api/v1/hrm/employees`，`/api/v1/mes/work-orders`
- 在 Nginx 网关层统一路由，Vite dev proxy 仅做简单转发
- 前端 API client 层统一封装路径生成

### 4.2 前端 API 层与后端耦合 (P2 - 中优)

**现状：** `apps/web/src/api/` 目录有 30+ 个子目录和 60+ 个 API 文件，大量重复的 client 实例化。

**优化方案：**
- 统一使用 `@tanstack/react-query` 的 mutation/query 封装
- 建立代码生成器：从后端 OpenAPI spec 自动生成前端 API client（已有 `utoipa` + `openapi.yaml`）
- 消除手工维护 API URL 的风险

### 4.3 类型安全断层 (P2 - 中优)

**现状：**
- 前端 `packages/shared-types` 定义 TS 类型
- 后端 Rust struct 定义 serde 序列化类型
- 两端类型独立维护，无自动同步机制

**优化方案：**
- 利用 `utoipa` 生成的 OpenAPI spec，通过 `openapi-typescript` 自动生成前端类型
- 或建立 CI 步骤：Rust 类型变更时自动同步 TS 类型

---

## 五、UI 问题深度分析（扩展 UI-DESIGN-ASSESSMENT）

### 5.1 CSS Variables 体系断裂 (P0 - 严重)

**现状：** `App.tsx` 中出现 `var(--color-background)` 和 `var(--color-text-secondary)`，但 MUI ThemeProvider 未启用 `cssVars: true`。这些 CSS 变量在 MUI 主题未设置时不会自动生成。

**影响：**
- 亮色/暗色切换时使用 CSS 变量的组件不跟随主题
- 非 MUI 组件与 MUI 组件之间的颜色不协调
- `index.css` 中的自定义 CSS 和 MUI sx prop 之间可能存在颜色冲突

**优化方案：**
```typescript
// theme.ts 中启用 CSS Variables
const theme = createTheme({
  cssVars: true,  // 关键：启用 CSS 变量
  palette: { ... },
  ...
});
```

### 5.2 日期处理库冗余 (P1 - 高优)

**现状：** `date-fns` (v4) 和 `dayjs` (v1) 同时作为依赖存在。MUI X DatePicker 使用 `dayjs` 适配器。

**优化方案：**
- MUI X DatePicker 需 `dayjs` → 保留 `dayjs` 作为唯一日期库
- 将 5 处 `date-fns` 引用迁移到 `dayjs`
- 从 `package.json` 移除 `date-fns`，减少 bundle 约 20-40KB

### 5.3 路由结构扁平化 (P2 - 中优)

**现状：** `App.tsx` 直接导入 25 个路由模块，全部在顶层渲染。没有路由懒加载的分组策略。

**影响：**
- 初始加载时所有路由模块（即使未访问）的 import 语句都会被解析
- `ProtectedRouteWrapper` 的嵌套层级深（最多 5 层 Provider 嵌套）
- `modulesWithOwnLayout` 硬编码在 App.tsx 中

**优化方案：**
- 使用 React Router v7 的 `lazy` 属性实现路由级代码分割
- 将 `modulesWithOwnLayout` 配置移到路由定义中 (`RouteConfig` 类型扩展)
- 减少 Provider 嵌套（合并 `PluginProvider` 和 `NotificationProvider` 为单一 `AppProvider`）

### 5.4 重型依赖未按需加载 (P2 - 中优)

**现状：** `package.json` 中包含 `three.js`、`@react-three/fiber`、`leaflet`、`xlsx`、`docx-preview` 等大型库，但 `manualChunks` 仅做了粗粒度分割。

**优化方案：**
- `three.js` 相关组件仅在 GIS 3D 页面按需加载
- `xlsx` 仅在导入/导出功能触发时加载
- `leaflet` 仅在 GIS 模块激活时加载
- 使用 `React.lazy()` + `Suspense` 实现组件级懒加载

### 5.5 样式范式迁移不彻底 (P2 - 中优)

**现状：** `packages/shared-components` 中 `Stepper.tsx` 和 `ProgressBar.tsx` 仍使用 `styled()` API，而其余组件使用 `sx` prop。

**优化方案：** 迁移到 `sx` prop 或组件级 `styleOverrides`，与评估报告 Phase 2.1 一致。

### 5.6 组件重复定义 (P2 - 中优)

**现状：** `apps/web/src/components/` 和 `packages/shared-components/src/components/` 都有 `DataTable`、`StatusBadge`、`PageContainer` 等同名组件。

**风险：** 开发者可能修改了 web 中的版本而遗漏 shared 中的版本，或反之。

**优化方案：**
- 明确 `packages/shared-components` 为唯一真实来源
- `apps/web/src/components/` 中的同名组件改为从 shared 导入或标记为 "web-specific extension"
- 建立 ESLint 规则禁止在 web 中重新定义已有 shared 组件

---

## 六、优化路线图

### Phase 1: 紧急修复 (1-2 周)

| # | 任务 | 优先级 | 预期效果 |
|---|------|--------|---------|
| 1.1 | 统一包管理器为 pnpm，清理 yarn 残留 | P0 | 消除依赖解析不确定性 |
| 1.2 | 启用 MUI CSS Variables 主题 (`cssVars: true`) | P0 | 暗色模式零延迟切换 |
| 1.3 | Token 源去重（与评估报告一致） | P0 | 消除 4 处重复定义 |
| 1.4 | 清理 date-fns/dayjs 冗余 | P1 | 减少 bundle 20-40KB |
| 1.5 | 统一 TypeScript 版本到 ^6.0.3 | P1 | 消除类型编译不一致 |

### Phase 2: 架构优化 (2-4 周)

| # | 任务 | 优先级 | 预期效果 |
|---|------|--------|---------|
| 2.1 | 确定 Module Federation 策略（完整实现或回退单体） | P0 | 消除架构不确定性 |
| 2.2 | Vite proxy 配置自动化（从 service registry 生成） | P1 | 减少 80% 配置代码 |
| 2.3 | 统一 API 路由规范 + Nginx 网关路由 | P1 | 简化前后端对接 |
| 2.4 | 组件重复清理（web vs shared） | P1 | 消除维护歧义 |
| 2.5 | styled() → sx 迁移 | P2 | 统一样式范式 |
| 2.6 | Portal 服务 mock 数据清理 | P1 | 功能完整性 |

### Phase 3: 架构演进 (4-8 周)

| # | 任务 | 优先级 | 预期效果 |
|---|------|--------|---------|
| 3.1 | 后端服务分域聚合（20 → 8-10 个） | P1 | 降低运维复杂度 50% |
| 3.2 | topems-shared feature-gated 拆分 | P2 | 加速编译 30%+ |
| 3.3 | OpenAPI → 前端类型自动生成 | P2 | 消除类型断层 |
| 3.4 | 路由级代码分割 (React.lazy) | P2 | 首屏加载提速 |
| 3.5 | 重型依赖按需加载 (three/xlsx/leaflet) | P2 | 按需减少 500KB+ |
| 3.6 | 移动端 shared 包复用 | P2 | 减少 mobile 端代码重复 |

### Phase 4: 长期演进 (8-12 周)

| # | 任务 | 优先级 | 预期效果 |
|---|------|--------|---------|
| 4.1 | unified-core 模块解耦（IAM 与通讯分离） | P2 | 消除单点故障风险 |
| 4.2 | 数据库 schema 隔离 | P2 | 数据安全合规 |
| 4.3 | 统一 Repository trait 层 | P3 | 数据访问模式标准化 |
| 4.4 | Storybook + 视觉回归测试 | P2 | 设计系统质量保障 |
| 4.5 | 设计系统文档站 | P3 | 团队协作效率 |

---

## 七、优先级总结

### 必须立即修复 (P0)

1. **包管理器统一** — 当前 yarn/pnpm 混用是系统性风险
2. **MUI CSS Variables 启用** — 这是 MUI v9 最核心特性，当前完全未用
3. **Module Federation 策略确定** — 架构层面的根本性问题

### 尽快修复 (P1)

4. Token 去重（评估报告已明确）
5. Vite proxy 自动化
6. API 路由统一
7. 组件重复清理
8. Portal mock 数据清理
9. 后端服务聚合
10. 日期库统一

### 计划修复 (P2)

11. 样式范式统一
12. 路由代码分割
13. 重型依赖懒加载
14. shared 库 feature-gated 拆分
15. 前后端类型自动同步
16. 移动端复用

### 长期规划 (P3)

17. unified-core 解耦
18. 数据库隔离
19. Repository 层
20. Storybook + 文档站

---

## 八、整体成熟度评估

| 维度 | 当前评分 | 优化后预期 | 关键瓶颈 |
|------|---------|-----------|---------|
| 前端架构 | 6/10 | 8/10 | Module Federation 策略未确定 |
| 后端架构 | 7/10 | 8.5/10 | 服务粒度过细、mock 数据 |
| 设计系统 | 7.5/10 | 8.5/10 | CSS Variables 未启用 |
| 工程化 | 5/10 | 8/10 | 包管理器混用、proxy 膨胀 |
| 前后端协作 | 6/10 | 8/10 | API 路由不一致、类型断层 |
| **综合** | **6.3/10** | **8.2/10** | P0 问题修复后可快速提升 |

---

*分析人: SOLO Design | 2026-06-29*
