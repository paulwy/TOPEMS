# 前端架构分析

> 分片范围：`apps/web`、`apps/mobile`、`apps/desktop`、`packages/` 全部 8 个共享包、根 `package.json` / `pnpm-workspace.yaml` / `vite` / `vitest` / `tsconfig`、`.github` CI 前端构建部分。
> 分析日期：2026-10-02。所有证据路径均相对项目根 `/Users/xingzhai/TOPEMS/`，行号为本次实测 `grep -n` / `sed -n` 结果。

---

## 1. 分片架构现状（代码实证）

### 1.1 Monorepo 物理结构

- **apps/ 3 个应用**：
  - `apps/web`（`package.json` name=`topems-portal`，v5.15.0）—— 主门户，Vite 8 + React 19 + MUI 9，源码 2 863 个 `.ts/.tsx` 文件（实测 `find apps/web/src -type f \( -name "*.ts" -o -name "*.tsx" \) | wc -l`）。
  - `apps/desktop`（`package.json` name=`topems-desktop`，v5.14.0）—— Tauri 2 桌面壳，独立 Vite 入口（`apps/desktop/index.html` + `apps/desktop/src/main.tsx`），仅 40 个 `.ts/.tsx` 文件。
  - `apps/mobile`（`package.json` name=`topems-mobile`，v5.14.0）—— Expo / React Native 0.73 应用，React **18.2**（与 web/desktop 的 React 19 不一致），48 个 `.ts/.tsx` 文件。
- **packages/ 8 个共享包**：`api-client`、`app-shell`、`business-tools-sdk`、`shared-components`、`shared-hooks`、`shared-types`、`shared-utils`、`tokens`（`ls packages/` 实测）。
- **workspace 定义**：`pnpm-workspace.yaml:2-4` 声明 `apps/*`、`packages/*`、`tests/integration`。
- **根 `package.json`** name=`topems` v5.15.0，`packageManager=pnpm@9.15.9`，`engines.node=^22.0.0`（`package.json:5-12`）。

### 1.2 Module Federation 实际拓扑

- **构建工具**：Vite 8（`apps/web/package.json:169` `vite: ^8.1.5`），不是 Webpack。MF 插件为官方 `@module-federation/vite`（`apps/web/package.json:60` `^1.23.0` + `@module-federation/runtime: ^2.8.0`），非 `@originjs/vite-plugin-federation`。
- **host 配置**：`apps/web/vite.config.ts:4` `import { federation } from '@module-federation/vite'`；`apps/web/vite.config.ts:1407-1408` `federation({ name: 'topems_portal', ... })`。
- **默认部署模式 = static**：`apps/web/vite.config.ts:201-202` `DEPLOYMENT_MODE = process.env.VITE_DEPLOYMENT_MODE || process.env.VITEDeploymentMode || 'static'`。
- **buildRemotes() 在 static 下返回空对象**：`apps/web/vite.config.ts:264-267`
  ```
  const buildRemotes = (): Record<string, string> => {
    if (DEPLOYMENT_MODE === 'static') {
      return {};
  ```
  即默认构建 **不声明任何 remote**，federation 插件在 static 模式下被整体跳过（`apps/web/vite.config.ts:1398` `...(DEPLOYMENT_MODE !== 'static' ? [federation({...})] : [])`）。
- **唯一编译期声明的 remote**：仅 `topems_core`（`apps/web/vite.config.ts:268-271`），且只在 `module-federation` / `hybrid` 模式下生效。
- **shared 依赖清单**（`apps/web/vite.config.ts:1434-1560`）：`react`、`react-dom`、`react-router-dom`、`@tanstack/react-query`、`@mui/material`、`@emotion/react`、`@emotion/styled`、`react-is`、`prop-types`、`zustand`、`i18next`、`react-i18next`、`axios`、`dayjs`、`react-hook-form`、`zod`、`@tanstack/react-table`，全部 `singleton: true`。其中 `react`/`react-dom`/`@mui/material`/`@emotion/*`/`react-is`/`prop-types` 强制 `eager: true`。
- **没有 expose 字段**：host 不向 remote 暴露任何模块（`apps/web/vite.config.ts:1407-1560` 完整 federation() 配置中无 `expose` 键）。
- **REMOTE_MODULES 声明了 19 个业务域 remote**：`apps/web/src/microfrontend/config.ts:96-260` 列出 `topems_core / topems_erp / topems_hrm / topems_crm / topems_mes / topems_scm / topems_wms / topems_srm / topems_pm / topems_finance / topems_pdm / topems_qms / topems_lims / topems_ehs / topems_bi / topems_monitor / topems_ai / topems_gis / topems_doc`（实测 `grep -c "name: 'topems_" apps/web/src/microfrontend/config.ts` = 19）。
- **但这 19 个 remote 在仓库内没有对应 app 实现**：`ls apps/` 仅 `desktop / mobile / web`；`find apps packages -maxdepth 2 -name package.json -exec grep -l topems-core {} \;` 空结果。`MF_PORTS`（`apps/web/src/config/ports.ts:101-122`）为 19 个 remote 预留了 3001-3019 端口，但没有任何独立 Vite dev server 占用它们。
- **RemoteLoader 加载机制**：`apps/web/src/microfrontend/RemoteLoader.tsx:283` `const module = await import(/* @vite-ignore */ \`${moduleName}/${component}\`)` —— 动态字符串 import，在 static 模式下 entry 为空字符串（`apps/web/src/microfrontend/config.ts:60-63`），运行时必然 reject。
- **MicroAppRouter 未被 App.tsx 实际使用**：`grep -rn "MicroAppRouter" apps/web/src/` 仅命中 `apps/web/src/microfrontend/MicroAppRouter.tsx:18`（自身定义）和 `apps/web/src/microfrontend/index.ts:141`（re-export），`App.tsx` / `routes/appRoutes.tsx` 均未 import 它。
- **static 模式下 `/core/*` 渲染占位页**：`apps/web/src/routes/appRoutes.tsx:132-165`，明确渲染 "Module Federation 未启用" 的静态 HTML + 三个本地链接。
- **实际业务路由全部走本地静态 + 动态路由表**：`apps/web/src/routes/appRoutes.tsx:113` `<Route path='*' element={<DynamicRoutes />} />`；`apps/web/src/modules/` 下 36 个业务域子目录（实测 `ls -d apps/web/src/modules/*/ | wc -l`），全部本地打包进 web bundle。

### 1.3 packages 依赖关系

实测各 `package.json` 的 `dependencies`：

| package | 自身 workspace 依赖 | 外部依赖 |
|---|---|---|
| `@topems/api-client` | 无 | `axios@^1.7.0` |
| `@topems/app-shell` | `@topems/shared-types` | 无运行时依赖（仅类型） |
| `@topems/business-tools-sdk` | **无** | **无**（连 axios 都未声明，6 个源文件自实现 transport） |
| `@topems/shared-components` | `shared-hooks`、`shared-types`、`shared-utils` | `@tanstack/react-table`、`react-window` |
| `@topems/shared-hooks` | 无 | peer: `axios`、`react` |
| `@topems/shared-types` | 无 | peer: `@tanstack/react-query`、`react` |
| `@topems/shared-utils` | `shared-types` | `axios@^1.6.8` |
| `@topems/tokens` | 无 | peer: `@mui/material` |

apps 对 packages 的依赖（实测 `grep "@topems/" apps/*/package.json`）：

| app | 依赖的 @topems/* 包 |
|---|---|
| `apps/web` | `api-client`、`app-shell`、`shared-components`、`shared-hooks`、`shared-types`、`shared-utils`、`tokens`（7 个，**缺 `business-tools-sdk`**） |
| `apps/desktop` | `api-client`、`app-shell`（仅 2 个；`vite.config.ts` alias 配了另外 6 个但 `package.json` 未声明依赖） |
| `apps/mobile` | **无任何 @topems/\* 包** |

- **无循环依赖**：`shared-utils → shared-types`、`shared-components → shared-hooks/shared-types/shared-utils`、`app-shell → shared-types`，依赖方向单向向下。
- **`business-tools-sdk` 是死代码**：`grep -rln "business-tools-sdk" apps/ packages/ --include="*.ts*"` 仅命中 `packages/business-tools-sdk/package.json` 自身；6 个源文件（`clients/permissions.ts`、`clients/retention.ts`、`clients/audit-logs.ts`、`types.ts`、`transport.ts`、`index.ts`）无任何外部 import。
- **`app-shell` 是纯类型包**：`packages/app-shell/src/` 仅 4 个文件（`index.ts`、`module-types.ts`、`navigation-types.ts`、`permissions-types.ts`），`index.ts` 仅 `export * from './navigation-types'` 等三行 re-export，无运行时逻辑。
- **复用率实测**（`grep -rln` 计数）：
  - `@topems/tokens`：306 个 web 源文件引用（最高）
  - `@topems/shared-components`：83 个 web 文件引用；desktop 0 个
  - `@topems/shared-types`：34 个 web 文件引用
  - `@topems/shared-hooks`：仅 6 个文件引用（7 个源文件）
  - `@topems/shared-utils`：仅 3 个文件引用（25 个源文件）
- **本地组件库 vs shared-components 严重不对称**：`apps/web/src/components/` 586 个 `.ts/.tsx` 文件、37 个一级子目录；`packages/shared-components` 仅 38 个 named export。绝大多数业务组件沉淀在 web 内部，未提升到共享包。

### 1.4 BFF / API 客户端层

- **`packages/api-client` 工厂**：`packages/api-client/src/factory.ts:59-86` 提供 `createApiClient({ baseURL, getToken, onUnauthorized, ... })`，仅做 axios 实例创建 + Bearer token 注入（L74-79）+ 401 回调（L82-86）+ params 序列化。无 GraphQL、无重试、无缓存、无错误归一化。
- **三端网络层分裂**：
  - `apps/desktop/src/api/client.ts:1` `import { createApiClient } from '@topems/api-client'`，L12-16 **真正使用** `createApiClient`，再叠加 GET 离线缓存拦截器。
  - `apps/web/src/api/client.ts:8` `import axios from 'axios'` 自建实例，仅从 `@topems/api-client` 导入 `serializeParams`（L22），**未使用 `createApiClient`**；自实现 retry（`MAX_RETRIES=2` 指数退避，L96-120）、CSRF、OTel trace 注入。
  - `apps/mobile/src/api/client.ts:1-7` 自建 axios 实例，基于 `@/utils/api-url`、`NetworkService`、`OfflineService`，**完全不依赖 `@topems/api-client`**，自实现 TTL 缓存 + cancelToken。
- **BFF GraphQL**：`apps/web/src/api/bff/index.ts:1-10` 注释明确「REST 聚合 + GraphQL 双模式」，对接后端 `svc/portal`（GraphQL BFF，async-graphql 7）；`apps/web/vite.config.ts:171-174` 配置 `{ name: 'portal', apiPrefix: '/api/portal' }` 代理到 8063。
- **baseURL 与服务清单**：`apps/web/vite.config.ts:42-180` 硬编码 30+ 个后端服务代理（unified-core/iam/doc/flow/file/communication/search/ticket/feedback/erp/finance/ai/hrm/pm/crm/mes/pdm/scm/wms/srm/qms/lims/ehs/rd/bi/monitor/portal/master-data/server/mobile/gis/integration/tms/automation/plugin-registry），与 `config/services.yaml` 对齐；`scripts/ci/check-config-sources.cjs` 在 CI 强制校验 services.yaml ↔ ports.env ↔ ports.ts ↔ vite.config.ts 四方一致（`.github/workflows/ci.yml:286-293`）。

### 1.5 状态管理与数据流

- **Zustand 5**（`apps/web/package.json:130` `zustand: ^5.0.14`）：`apps/web/src/store/` 下 12 个 root store 文件（`authStore.ts`、`biStore.ts`、`featureFlagStore.ts`、`moduleLoadingStore.ts`、`notificationBadgeStore.ts`、`notificationSettingsStore.ts`、`notificationStore.ts`、`pluginStore.ts`、`shortcutsStore.ts`、`themeStore.ts`、`uiStore.ts`、`index.ts`）。
- **三层分层**（`apps/web/src/store/index.ts:1-11`）：`server/`（待迁移 React Query）→ `domain/` → `ui/`，依赖方向 `ui → domain → server`；`store/server/index.ts:1-15` 明确标注 `biStore / moduleLoadingStore / pluginStore` 为待迁移 Server State。
- **React Query 5**（`apps/web/package.json:63` `@tanstack/react-query: ^5.101.0`）：实测 `grep -rln "useQuery|useMutation|QueryClient" apps/web/src/ | wc -l` = **394 个文件**，已是服务端状态主力。
- **共享依赖中 `@tanstack/react-query` singleton**（`apps/web/vite.config.ts:1446-1449`），保证 host/remote 共享同一 QueryClient。

### 1.6 路由与导航

- **路由入口**：`apps/web/src/App.tsx:3` `import AppRoutes from './routes/appRoutes'`。
- **路由分层**（`apps/web/src/routes/`）：`auth.ts`、`dashboard.ts`、`common.ts`、`v2/`（`RouteModuleConfig`）、`DynamicRoutes.tsx` 兜底 `path='*'`。
- **四级导航**：overview.md L386-391 声称 Header / 二级分组 / 三级页面 / 模块 Tab；代码中 `apps/web/src/components/layout/AppLayout` + `apps/web/src/lib/navigation/` 实现，CI 有 `scripts/ci/check-nav-route.cjs --strict` 门禁（`.github/workflows/ci.yml:811`）。
- **动态导航对接后端**：`apps/web/src/components/DynamicRoutes.tsx:4` `loadModuleConfig`（来自 `routes/v2`），从本地 `modules/*/config.ts` 加载，再由 `useServiceStatus` / 权限码过滤；并非运行时从后端 navigation-config API 拉取整棵树。

### 1.7 构建链路与质量门禁

- **根 scripts**（`package.json:14-58`）：
  - `build`：`build:shared-types && build:shared-utils && build:core && build:host`（L26）
  - `build:core` = `pnpm --filter topems-core build`（L21）—— **该包在 workspace 中不存在**（实测 `find apps packages -maxdepth 2 -name package.json -exec grep -l topems-core {} \;` 为空）
  - `build:host` = `pnpm --filter topems-portal build`（L19）
  - `test` / `typecheck` 均仅 `--filter topems-portal`（L28-29），**不覆盖 desktop / mobile / packages**。
- **web 构建命令**（`apps/web/package.json:11`）：`node --stack-size=8192 --max-old-space-size=8192 tsc && vite build`。
- **CI 前端门禁**（`.github/workflows/ci.yml` 实测）：
  - `frontend-lint`（L699）：ESLint + a11y + dependency-audit + api-boundary
  - `design-system-check`（L734）：tokens build + deviation check
  - `frontend-audit`（L770）：7 个 strict 脚本（page/icon/nav-route/api-modules/api-coverage/a11y/i18n）
  - `i18n-quality-gate`（L855 附近）：fake-en / key-alignment / mixed-structure / glossary
  - `frontend-typecheck`（L1332）：web `tsc --noEmit` + 遍历 packages/ 全量 tsc（L1367-1386）
  - `frontend-test`（L1391）：6 路 matrix（unit + shard 1/5）
  - `frontend-coverage`（L1444）
  - `frontend-build`（L1558）：`vite build` + bundle 预算（total < 5MB、chunk < 500KB、vendor < 2500KB，L1600-1626）
  - `lighthouse`（L1649）
  - `desktop-build`（L1881）：三平台矩阵 ubuntu/windows/macos，Node 20 + Rust，产出 Tauri bundle
- **构建 workaround 密度极高**：`apps/web/vite.config.ts` 内含 5 个自研插件修补 Vite 8 / Rolldown 兼容问题：
  - `fixLocalSharedImportMapNullBytePlugin`（L528-620）—— MF 虚模块 `\0` null-byte 归一化
  - `fixMfVirtualModulesDevServerPlugin`（L622-720）—— dev server `/@id/__x00__virtual:mf:...` 中间件兜底
  - `fix-react-19-named-exports`（L985-1140）—— React 19 CJS→ESM named exports 缺失
  - `fix-dayjs-umd-default`（L1142-1185）—— dayjs/plugin UMD default export
  - `fix-cjs-named-exports-general`（L1187-1380）—— 通用 node_modules CJS→ESM
- **桌面端形态**：`apps/desktop` 是独立 Vite + Tauri 2 壳，`package.json` scripts `dev=tauri dev`、`build=tauri build`；`apps/desktop/src-tauri/` 目录存在（根 `Cargo.toml` exclude 它，按任务说明）。

### 1.8 可观测性与性能

- **OpenTelemetry**：`apps/web/src/utils/telemetry.ts:5-11` import `WebTracerProvider`、`OTLPTraceExporter`、`registerInstrumentations`；L68 `initTelemetry()`，L96 创建 `WebTracerProvider`，L118 注册 instrumentation（fetch / xhr）。`apps/web/package.json:65-78` 引入 8 个 `@opentelemetry/*` 包。
- **微前端可观测面板**：`apps/web/src/microfrontend/observability/`（`error-tracker`、`module-performance-metrics`、`user-behavior-analytics`、`ObservabilityDashboard`），仅 DEV 模式挂载（`App.tsx:14-19` `import.meta.env.DEV ? lazy(...) : null`）。
- **首屏优化**：
  - 路由级 `createSafeLazy`（`apps/web/src/routes/appRoutes.tsx:13`）+ `PageErrorBoundary` 包裹 Suspense（L46-58）。
  - vendor 分包 16 组（react/mui-core/mui-icons/mui-x/r3f/leaflet/amap/exceljs/office/markdown/data/otel/i18n/form/dayjs/lucide）（`apps/web/vite.config.ts:1233-1268`）。
  - recharts 细粒度拆 9 组（polar/cartesian/...）（L1270-1295）。
  - brotli quality=6 + gzip 双压缩（L880-960）。
  - i18n JSON 按语言 lazy import.meta.glob 拆分（L1080-1085 注释）。
  - CI bundle 预算 total < 5MB / chunk < 500KB / vendor < 2500KB。

---

## 2. 文档声称 vs 代码实证对照表

| 主题 | 文档声称（路径 + 章节） | 代码实际（路径 + 行号） | 结论 |
|---|---|---|---|
| MF 构建器 | `docs/architecture/overview.md:380` "采用 Webpack Module Federation 实现微前端" | `apps/web/vite.config.ts:4` `import { federation } from '@module-federation/vite'`；`apps/web/package.json:60` `@module-federation/vite: ^1.23.0`；无 webpack 依赖 | **漂移**（Webpack → Vite MF） |
| 共享 UI 库 | `overview.md:384` "共享依赖: React、React Router、Zustand、Ant Design 等"；`overview.md:429` "UI 组件库: Ant Design 5+" | `apps/web/package.json:66-70` 依赖 `@mui/material@^9.4.0`、`@mui/x-*`；`grep -rln "from 'antd'" apps/web/src/` 空结果；`grep -rln "@mui/material" apps/web/src/` = 948 文件 | **漂移**（Ant Design → MUI 9） |
| 原子化 CSS | `overview.md:72` "React + TypeScript + Vite + Tailwind"；`overview.md:428` "UI 框架: Tailwind CSS 3+" | `apps/web/postcss.config.js` `export default { plugins: {} }`；`find apps/web -maxdepth 2 -name "tailwind*"` 空结果；无 tailwind 依赖 | **漂移**（Tailwind 未使用，实际 MUI sx/emotion） |
| 源码根路径 | `overview.md:397-402` 表格路径列 `frontend/src/`、`frontend/src/plugins/`、`frontend/src/utils/eventBus.ts` 等 | 实际源码在 `apps/web/src/`；`ls apps/web/src/plugins` 不存在（插件系统在 `apps/web/src/lib/plugin-loader/`） | **漂移**（路径前缀 `frontend/` → `apps/web/`，且子路径名也不符） |
| Zustand 版本 | `overview.md:430` "Zustand 4+" | `apps/web/package.json:130` `zustand: ^5.0.14` | **漂移**（主版本已升 5） |
| React Router 版本 | `overview.md:431` "React Router 6+" | `apps/web/package.json:121` `react-router-dom: ^7.18.3`；根 `package.json:80` pnpm override `react-router: 7.18.3` | **漂移**（已升 7） |
| Vite 版本 | `overview.md:427` "Vite 5+" | `apps/web/package.json:169` `vite: ^8.1.5` | **漂移**（已升 8） |
| TypeScript 版本 | `overview.md:425` "TypeScript 5+" | `apps/web/package.json:173` `typescript: ^6.0.3` | **漂移**（已升 6） |
| 图表库 | `overview.md:433` "ECharts / Recharts" | `apps/web/package.json:124` 仅 `recharts: ^3.8.1`；无 `echarts` 依赖 | **漂移**（ECharts 不存在） |
| @module-federation/vite 状态 | `docs/architecture/microfrontend-architecture-decision.md:5` "P35-3 移除的 `@module-federation/vite`（webpack 5 联邦插件）"；L7 表格 "@module-federation/vite（已删除）" | `apps/web/package.json:59-60` 仍声明 `@module-federation/runtime: ^2.8.0` + `@module-federation/vite: ^1.23.0`；`apps/web/vite.config.ts:4` 仍 import federation；`node_modules/.pnpm/` 实测存在 `@module-federation+vite@*` 与 `@module-federation+runtime@2.8.0/2.9.1` | **严重漂移**（决策文档声称已删除，实际仍是构建依赖） |
| Remote 模块数 | `apps/web/src/microfrontend/config.ts:96-260` 声明 19 个 remote；`vite.config.ts:264-271` 编译期仅 `topems_core` 一个 | `apps/` 下仅 web/mobile/desktop，无 `topems-core`/`topems-erp`/... 任何 remote app；`pnpm --filter topems-core` 无匹配包 | **漂移**（19 个 remote 仅为配置占位，无对应实现） |
| 默认 MF 启用 | `overview.md:44` "采用插件化架构和微前端设计理念，支持按需加载业务模块"；`overview.md:382` "Remote 模块: 各业务模块独立开发、独立部署" | `vite.config.ts:201-202` 默认 `DEPLOYMENT_MODE='static'`；`buildRemotes()` static 返回 `{}`；`appRoutes.tsx:132-165` `/core/*` 渲染"MF 未启用"占位页 | **漂移**（默认部署形态为单 bundle，MF 是可选开关） |
| 构建入口 `topems-core` | `package.json:15` `dev:core=pnpm --filter topems-core dev`；L21 `build:core=pnpm --filter topems-core build`；L26 `build` 串联 `build:core` | `find apps packages -maxdepth 2 -name package.json -exec grep -l "topems-core" {} \;` 空；`ls apps/` 无 core | **漂移**（根 build 脚本引用了不存在的包，`pnpm run build` 会在 `build:core` 步骤失败） |
| business-tools-sdk | `docs/architecture/business-tools-sdk-design.md:1` "V0.1 Draft"；`packages/business-tools-sdk/package.json:4` "V0.1" | 6 个源文件已落地，但 `grep -rln "business-tools-sdk" apps/ packages/ --include="*.ts*"` 仅命中自身 package.json；web/desktop/mobile 均未依赖 | **漂移**（SDK 已写但无消费方，设计稿"待 V476+ 评估"状态未更新） |
| 前端入口路径 | `overview.md:400` "Event Bus: `frontend/src/utils/eventBus.ts`" | `apps/web/src/utils/` 下无 `eventBus.ts`；事件总线实现为 `eventemitter3` 直接 import（`apps/web/package.json:85`） | **漂移** |
| 前端状态目录 | `overview.md:402` "Global State: `frontend/src/stores/`" | 实际目录为 `apps/web/src/store/`（单数，无 s） | **漂移** |
| 四端共享 | `packages/api-client/src/factory.ts:3-5` 注释"三端（web/desktop/mobile）共有的 client 基础层" | web `api/client.ts:8` 自建 axios 仅 import serializeParams；mobile `api/client.ts` 完全自建；仅 desktop 真正使用 `createApiClient` | **漂移**（api-client 工厂实际只有 desktop 一个消费方） |

---

## 3. 发现项

| ID | 标题 | 严重级 | 类别 | 证据（路径:行号） | 影响 | 修复建议 |
|---|---|---|---|---|---|---|
| FRONT-01 | 根 `pnpm run build` 引用不存在的 `topems-core` 包，构建链必然失败 | 高危 | 构建链路 | `package.json:21` `build:core=pnpm --filter topems-core build`；`package.json:26` `build` 串联 `build:shared-types && build:shared-utils && build:core && build:host`；`find apps packages -maxdepth 2 -name package.json -exec grep -l topems-core {} \;` 空 | 任何开发者按根 README 跑 `pnpm run build` 都会在第三步 `ERR_PNPM_NO_PACKAGE_NAME` 失败；CI 实际走 `frontend-build` job 单独 `pnpm --filter topems-portal build`（ci.yml:1595）绕过了此脚本，掩盖了问题 | 删除 `build:core` 脚本，或将 `build` 改为 `pnpm --filter topems-portal build`；同时清理 `dev:core` / `build:core` 两个死脚本 |
| FRONT-02 | MF 架构是"声明了 19 个 remote 但零实现"的空壳，文档却以"微前端"为主叙事 | 高危 | 文档漂移 / 设计缺陷 | `apps/web/src/microfrontend/config.ts:96-260` 19 个 `topems_*` remote；`apps/web/vite.config.ts:264-271` 仅 `topems_core` 且 static 返回 `{}`；`apps/` 下无对应 remote app；`appRoutes.tsx:132-165` static 渲染占位页；`microfrontend-architecture-decision.md:5,7` 又声称 @module-federation/vite 已删除 | 新读者按 overview.md / decision.md 会误以为系统已拆成 19 个独立部署的微前端；实际是 2863 文件单 bundle。MF 相关配置（19 个端口、REMOTE_MODULES、RemoteLoader、MicroAppRouter、registry/marketplace/sandbox 等 100+ 文件）是无运行时价值的占位代码 | 二选一：(a) 正式归档 MF 相关目录到 `_archive/`，overview.md 改为"模块化单体前端，MF 为预留扩展点"；(b) 若计划落地，明确首个 remote 的拆分切片（建议从 `modules/bi` 或 `modules/automation` 开始）并删除 decision.md 中"已删除"的错误陈述 |
| FRONT-03 | `microfrontend-architecture-decision.md` 与现实严重不符：声称 @module-federation/vite 已删除，实际仍是构建硬依赖 | 高危 | 文档漂移 | `docs/architecture/microfrontend-architecture-decision.md:5,7`；`apps/web/package.json:59-60`；`apps/web/vite.config.ts:4`；`node_modules/.pnpm/` 实测存在 `@module-federation+vite@1.23.x` | 决策文档误导后续维护者；且 vite.config.ts 为兼容该插件写了 5 个自研 workaround 插件（L528-1380，约 850 行），这些 workaround 的存在本身证明插件仍在深度影响构建 | 重写 decision.md：明确"`@module-federation/vite` 仍在依赖中，static 模式下被条件跳过；src/microfrontend/ 目录是平台治理 UI 面板，不是 MF remote 加载器"；并评估能否在 static 默认场景下彻底移除该依赖以消掉 5 个 workaround |
| FRONT-04 | overview.md 技术栈表整列错误（Ant Design / Tailwind / Webpack / 版本号） | 高危 | 文档漂移 | `docs/architecture/overview.md:380,384,397-402,425-433`；实际 `apps/web/package.json:60-130`（MUI 9、Vite 8、TS 6、RR 7、Zustand 5、recharts only）；`apps/web/postcss.config.js` plugins={} | 对外架构文档与实际栈差距巨大（AntD→MUI、Tailwind→无、Webpack→Vite、版本全部过期），影响新成员 onboarding 和对外沟通 | 重写 overview.md §前端技术栈表：UI 库 MUI 9、CSS-in-JS Emotion、构建 Vite 8、路由 RR 7、状态 Zustand 5 + TanStack Query 5、图表 Recharts 3；路径前缀 `frontend/src/` → `apps/web/src/` |
| FRONT-05 | `packages/business-tools-sdk` 落地为死代码（6 源文件、0 消费方） | 中危 | 耦合 / 部署 | `packages/business-tools-sdk/src/{index,transport,types}.ts` + `clients/*.ts`；`grep -rln "business-tools-sdk" apps/ packages/ --include="*.ts*"` 仅命中自身 package.json | 包已写入但 web/desktop/mobile 都不引用；设计文档 `business-tools-sdk-design.md:1` 仍标"草稿/待 V476+ 评估"，与代码已落地矛盾 | 要么在 `apps/web/src/api/` 中替换现有手写 `permission/audit-log/retention` 调用为 SDK，要么把整个包移到 `_archive/business-tools-sdk-v0.1-draft/` 并从 pnpm-workspace 移除 |
| FRONT-06 | `@topems/api-client` 工厂三端分裂：web/mobile 都未使用，仅 desktop 真正消费 | 中危 | 耦合 / 数据架构 | `packages/api-client/src/factory.ts:59`；`apps/web/src/api/client.ts:8` 自建 axios；`apps/mobile/src/api/client.ts:1-7` 自建 axios；`apps/desktop/src/api/client.ts:1` 唯一调用 `createApiClient` | "三端共享"的设计目标落空；token 注入 / 401 处理逻辑在 web 和 mobile 各写一份，行为易漂移（如 mobile 的 TTL 缓存、web 的 retry、desktop 的离线缓存互不对齐） | 把 web 的 retry/CSRF/trace 拦截器下沉为 `api-client` 的可选 presets（`withRetry()` / `withCsrf()` / `withTrace()`），web/mobile 改为 `createApiClient({...}).use(withRetry())`；或在决策文档中明确"api-client 仅 desktop 使用，web/mobile 各自演进" |
| FRONT-07 | `@topems/shared-utils`（25 源文件）仅 3 处引用、`shared-hooks`（7 文件）仅 6 处引用，共享包沉淀不足 | 中危 | 耦合 | `find packages/shared-utils/src -name "*.ts" | wc -l` = 25；`grep -rln "@topems/shared-utils" apps/web/src | wc -l` = 3；`packages/shared-hooks/src` 7 文件 / 6 处引用 | 包存在但没人用，说明 web 内部 utils/hooks 已经在 `apps/web/src/utils/`、`apps/web/src/hooks/` 重复沉淀；desktop/mobile 也不消费这些包，"跨端共享"目标未达成 | 做一次复用审计：把 web `src/utils/` 中确实被 desktop/mobile 需要的函数（如日期格式化、错误分类）提升到 shared-utils；无人用的包标记 deprecated 或合并到 shared-types |
| FRONT-08 | `apps/desktop` 是 40 文件的"影子应用"，与 web（2863 文件）业务面严重不对等，且 package.json 依赖与 vite alias 不一致 | 中危 | 设计缺陷 | `apps/desktop/src/` 40 文件 vs `apps/web/src/` 2863 文件；`apps/desktop/package.json:20-31` 只声明 api-client/app-shell 两个 @topems 包；`apps/desktop/vite.config.ts:9-17` alias 了 shared-components/shared-hooks/shared-types/shared-utils/tokens 5 个包但 package.json 未声明依赖 | desktop 仅覆盖 Login/Dashboard/HR/CRM/ERP/Reports/Settings/AuditLog 8 个占位页面，不具备真实业务能力；vite alias 与 package.json 不一致会让后续 import 类型/运行时都踩坑 | 二选一：(a) 明确 desktop 定位为"轻量壳 + 加载 web build"，删除 `apps/desktop/src/pages/*` 改为 iframe/webview 加载 `../web/dist`；(b) 在 package.json 中补齐 vite alias 对应的 workspace 依赖，避免裸 import 解析失败 |
| FRONT-09 | 三端 React 版本分裂（web/desktop 19.2.7、mobile 18.2.0），tsconfig.base.json 用 alias 硬指向 mobile 的 @types/react | 中危 | 耦合 / 部署 | `apps/web/package.json:115` `react: ^19.2.7`；`apps/mobile/package.json:35` `react: 18.2.0`；`tsconfig.base.json:44` `"react": ["./apps/mobile/node_modules/@types/react"]` | mobile 用 React Native 0.73（生态锁定 RN0.73 对应 React 18），但根 tsconfig 全局把 react 类型 alias 到 mobile 的 @types/react 18，会让 web/desktop 的 React 19 类型检查被错误地用 React 18 类型推断 | 把这条 alias 从 tsconfig.base.json 移到 `apps/mobile/tsconfig.json` 专属配置；根 paths 只保留 @topems/* 映射；web/desktop 各自使用自己 node_modules 里的 @types/react@19 |
| FRONT-10 | 构建链路为兼容 Vite 8 + @module-federation/vite 写了 ~850 行 workaround 插件（CJS→ESM / null-byte / dayjs UMD / React 19 named exports） | 中危 | 可靠性 / 性能 | `apps/web/vite.config.ts:528-1380` 五个自研插件；构建注释自承"Vite 8 偶发把 /@id/__x00__virtual:mf:... 直接传入 resolveId"、"Rolldown 预打包其他依赖时顺带把 React 系列的 CJS bundle 合成到 .vite/deps/*.js" | 构建脆弱、升级 Vite/Rolldown 任一版本都可能让这些 workaround 失效；CI 中 `NODE_OPTIONS=--max-old-space-size=8192` + `--stack-size=8192`（apps/web/package.json:11）也说明构建内存压力大 | 跟踪 Rolldown / @module-federation/vite release notes，逐版本评估能否删除对应 workaround；优先在非 MF static 模式下尝试移除 federation 插件依赖，一并消掉 `fixLocalSharedImportMapNullBytePlugin` 和 `fixMfVirtualModulesDevServerPlugin` |
| FRONT-11 | 动态导航运行时并未从后端 navigation-config API 拉取整棵菜单树，而是本地 `modules/*/config.ts` + 权限过滤 | 低危 | 数据架构 | `apps/web/src/components/DynamicRoutes.tsx:4` `loadModuleConfig` 来自 `routes/v2`；`ls apps/web/src/modules/*/config.ts` 36 个；CI `check-nav-route.cjs` 校验本地一致性 | 与 overview.md:238 "后端导航配置 API + 前端动态获取" 的描述有出入；实际后端导航 API 存在但前端只用作权限/菜单增量，不决定路由表 | 在 overview.md 中明确"路由表本地静态声明 + 后端权限码过滤 + 菜单元数据远程下发"三段式；不要把路由注册和菜单下发混为一谈 |
| FRONT-12 | `app-shell` 包名误导：实为纯类型包（4 文件），不含任何 shell 运行时代码 | 低危 | 文档漂移 | `packages/app-shell/src/` 仅 `index.ts` + 3 个 `*-types.ts`；`index.ts` 仅 3 行 `export *`；`apps/web/package.json:62` 依赖它 | 新开发者会以为 app-shell 提供布局/壳组件，实际布局全在 `apps/web/src/components/layout/`；包名与内容不符 | 重命名为 `@topems/app-types` 或 `@topems/shell-types`；或真正承担 shell 布局后再保留现名 |
| FRONT-13 | 根 `test` / `typecheck` / `lint` scripts 仅覆盖 topems-portal，desktop/mobile/packages 靠 CI 单独遍历 | 低危 | 可靠性 | `package.json:28-29` `"test": "pnpm --filter topems-portal test"`、`"typecheck": "pnpm --filter topems-portal typecheck"`；CI `ci.yml:1367-1386` 用脚本遍历 packages tsc | 本地一键 `pnpm typecheck` 不会发现 mobile/desktop 类型错误；CI 中 packages tsc 是动态 mapfile 遍历，开发者本地复现成本高 | 把根 typecheck 改为 `pnpm -r --parallel typecheck`，或加 `pnpm typecheck:all` 串联 web + desktop + mobile + packages |
| FRONT-14 | `MicroAppRouter` / `RemoteLoader` / 19 个 REMOTE_MODULES 在 static 默认模式下是死代码，但保留了完整的 error boundary / retry / version-manager / canary-release 链路 | 低危 | 性能 / 可维护性 | `apps/web/src/microfrontend/MicroAppRouter.tsx:18` 仅被 `index.ts:141` re-export；`RemoteLoader.tsx:283` 动态 import 在 static 下必 reject；`config.ts:96-260` 19 项 entry 全为空字符串 | 死代码增加 bundle 体积（虽 DEV-only 面板已 tree-shake，但 RemoteLoader 在路由兜底路径仍会被打包）；后续维护者需要持续同步这套无人调用的版本管理/灰度逻辑 | 在 `VITEDeploymentMode() === 'static'` 下用 `import.meta.env` 编译期门控，把 MicroAppRouter/RemoteLoader/REMOTE_MODULES 整体 tree-shake 掉 |

---

## 4. 优点与亮点（客观，带证据）

1. **配置单一信源 + CI 守门**：`apps/web/src/config/ports.ts` 为前端端口 SSOT，`scripts/ci/check-config-sources.cjs` 在 CI 强制校验 `config/services.yaml ↔ ports.env ↔ Cargo.toml ↔ ports.ts ↔ vite.config.ts` 五方一致（`ci.yml:286-293`），从制度上避免了历史上"README API 路径规范与代码不一致"类问题复发。
2. **CI 前端门禁分层完整**：`ci.yml` 拆出 `frontend-lint / design-system-check / frontend-audit / i18n-quality-gate / frontend-typecheck / frontend-test(6 shards) / frontend-coverage / frontend-build / lighthouse / desktop-build(3 平台)` 10 个独立 job，失败面收敛、并行度高；bundle 预算（total<5MB / chunk<500KB / vendor<2500KB）硬门禁（`ci.yml:1600-1626`）。
3. **vendor 分包与性能预算精细**：`apps/web/vite.config.ts:1233-1295` 按生态拆 16 组 vendor + 9 组 recharts 细粒度 chunk；brotli quality 从 11 降到 6 换 3-5x 压缩速度（L899-903 注释）；i18n JSON 按语言 lazy 拆分（L1080-1085）。
4. **状态分层清晰**：`apps/web/src/store/index.ts:1-11` 明确 server/domain/ui 三层与依赖方向，`server/index.ts:1-15` 主动标注待迁移到 React Query 的 store；TanStack Query 已在 394 个文件落地，方向正确。
5. **OTel 全链路 trace**：`apps/web/src/utils/telemetry.ts:68-118` 真接入 `WebTracerProvider + OTLPTraceExporter + fetch/xhr instrumentation`，并在 `api/client.ts:23` 通过 `injectTraceContext` 把 trace-id 注入业务请求头。
6. **路由级错误隔离**：`apps/web/src/routes/appRoutes.tsx:46-58` 每个 `<Route>` 都被 `PageErrorBoundary + Suspense + ProtectedRouteWrapper` 包裹，单页崩溃不冒泡到全局布局。
7. **token 体系高度复用**：`@topems/tokens` 被 306 个 web 文件引用，配合 `check:design-tokens` CI 脚本和 `design-system-check` job，设计变量门禁完整。
8. **desktop Tauri 三平台 CI**：`ci.yml:1881-1916` 矩阵 ubuntu/windows/macos 构建 Tauri bundle，覆盖桌面端发布基本盘。

---

## 5. 可视化数据

### 5.1 前端 MF / 依赖图

```json
[
  {"from": "app:web", "to": "pkg:api-client", "kind": "dep", "note": "仅 import serializeParams，未使用 createApiClient；apps/web/src/api/client.ts:8,22"},
  {"from": "app:web", "to": "pkg:app-shell", "kind": "dep", "note": "纯类型依赖（navigation/permissions/module types）"},
  {"from": "app:web", "to": "pkg:shared-components", "kind": "dep", "note": "83 文件引用；vs 本地 components 586 文件"},
  {"from": "app:web", "to": "pkg:shared-hooks", "kind": "dep", "note": "仅 6 文件引用"},
  {"from": "app:web", "to": "pkg:shared-types", "kind": "dep", "note": "34 文件引用"},
  {"from": "app:web", "to": "pkg:shared-utils", "kind": "dep", "note": "仅 3 文件引用（25 源文件沉淀不足）"},
  {"from": "app:web", "to": "pkg:tokens", "kind": "dep", "note": "306 文件引用，最高复用"},
  {"from": "app:web", "to": "pkg:business-tools-sdk", "kind": "none", "note": "未依赖，SDK 为死代码"},
  {"from": "app:desktop", "to": "pkg:api-client", "kind": "dep", "note": "唯一真正调用 createApiClient 的端"},
  {"from": "app:desktop", "to": "pkg:app-shell", "kind": "dep", "note": "纯类型"},
  {"from": "app:desktop", "to": "pkg:shared-components|hooks|types|utils|tokens", "kind": "alias-only", "note": "vite.config.ts alias 配了但 package.json 未声明、源码 0 引用"},
  {"from": "app:mobile", "to": "pkg:*", "kind": "none", "note": "完全不依赖任何 @topems 包；自建 axios + RN 栈"},
  {"from": "pkg:app-shell", "to": "pkg:shared-types", "kind": "dep", "note": "workspace:*"},
  {"from": "pkg:shared-components", "to": "pkg:shared-hooks", "kind": "dep", "note": "workspace:*"},
  {"from": "pkg:shared-components", "to": "pkg:shared-types", "kind": "dep", "note": "workspace:*"},
  {"from": "pkg:shared-components", "to": "pkg:shared-utils", "kind": "dep", "note": "workspace:*"},
  {"from": "pkg:shared-utils", "to": "pkg:shared-types", "kind": "dep", "note": "workspace:*"},
  {"from": "pkg:business-tools-sdk", "to": "pkg:*", "kind": "none", "note": "无任何 workspace 依赖，6 源文件孤立"},
  {"from": "pkg:shared-hooks", "to": "pkg:*", "kind": "none", "note": "仅 peer: axios/react"},
  {"from": "pkg:shared-types", "to": "pkg:*", "kind": "none", "note": "仅 peer: react-query/react"},
  {"from": "pkg:tokens", "to": "pkg:*", "kind": "none", "note": "仅 peer: @mui/material"},
  {"from": "pkg:api-client", "to": "pkg:*", "kind": "none", "note": "仅依赖 axios"},
  {"from": "mf:host:topems_portal", "to": "mf:remote:topems_core", "kind": "mf", "note": "vite.config.ts:268-271；static 默认模式下 buildRemotes() 返回 {}，不生效"},
  {"from": "mf:host:topems_portal", "to": "mf:remote:topems_{erp,hrm,crm,mes,scm,wms,srm,pm,finance,pdm,qms,lims,ehs,bi,monitor,ai,gis,doc}", "kind": "mf-declared-only", "note": "config.ts 声明 18 个业务域 remote，但无对应 app 实现、未在 vite federation remotes 中编译期声明、static 下 entry 全为空字符串"},
  {"from": "mf:host:topems_portal", "to": "shared:{react,react-dom,react-router-dom,@tanstack/react-query,@mui/material,@emotion/*,react-is,prop-types,zustand,i18next,axios,dayjs,react-hook-form,zod,@tanstack/react-table}", "kind": "mf-shared", "note": "vite.config.ts:1434-1560 singleton，仅在 DEPLOYMENT_MODE!=static 时生效"}
]
```

### 5.2 统计数字（全部实测）

| 指标 | 数值 | 测量命令 / 证据 |
|---|---|---|
| apps 总数 | 3（web / desktop / mobile） | `ls apps/` |
| packages 总数 | 8 | `ls packages/` |
| web 源文件数 | 2 863 个 `.ts/.tsx` | `find apps/web/src -type f \( -name "*.ts" -o -name "*.tsx" \) \| wc -l` |
| desktop 源文件数 | 40 个 | 同上，`apps/desktop/src` |
| mobile 源文件数 | 48 个 | 同上，`apps/mobile/src` |
| web 业务域模块数（`src/modules/*/`） | 36 | `ls -d apps/web/src/modules/*/ \| wc -l` |
| web `src/pages/` 一级目录数 / 文件数 | 42 / 921 | `find apps/web/src/pages -maxdepth 1 -type d \| wc -l`；文件数同 |
| web `src/components/` 一级子目录 / 文件数 | 37 / 586 | 同上 |
| MF 声明的 remote 数（config.ts） | 19 | `grep -c "name: 'topems_" apps/web/src/microfrontend/config.ts` |
| 实际存在的 remote app 数 | 0 | `ls apps/`；`find apps packages -maxdepth 2 -name package.json -exec grep -l topems-core {} \;` 空 |
| vite federation 编译期声明的 remote 数 | 0（static）/ 1（MF 模式 topems_core） | `vite.config.ts:264-271` |
| MF shared 依赖数 | 17 | `vite.config.ts:1434-1560` 逐个数 |
| MF host 对 remote 的 expose 数 | 0 | federation() 配置中无 `expose` 键 |
| packages → packages workspace 依赖边 | 5 条 | app-shell→shared-types；shared-components→{shared-hooks,shared-types,shared-utils}；shared-utils→shared-types |
| apps → packages 依赖边 | 9 条 | web→7；desktop→2；mobile→0 |
| business-tools-sdk 外部消费方数 | 0 | `grep -rln "business-tools-sdk" apps/ packages/` 仅命中自身 |
| shared-utils 复用文件数 / 自身源文件数 | 3 / 25 | grep + find 实测 |
| shared-hooks 复用文件数 / 自身源文件数 | 6 / 7 | 同上 |
| tokens 复用文件数 | 306 | `grep -rln "@topems/tokens" apps/web/src \| wc -l` |
| zustand store 文件数 | 12（root）+ 11 文件 import from 'zustand' | `ls apps/web/src/store/*.ts`；grep 实测 |
| react-query 消费文件数 | 394 | `grep -rln "useQuery\|useMutation\|QueryClient" apps/web/src/ \| wc -l` |
| 后端服务代理条目数（vite.config SERVICES） | 30 | 数 `vite.config.ts:42-180` 中 `{ name: ... }` 块 |
| MF 预留 dev 端口数（MF_PORTS 3001-3019） | 19 | `apps/web/src/config/ports.ts:101-122` |
| CI 前端相关 job 数 | 10 | `ci.yml` 中 `frontend-* / design-system-check / i18n-quality-gate / lighthouse / desktop-build` |
| 根 package.json scripts 总数 | 33 | `package.json:14-58` 逐行数 |
| 根 scripts 中覆盖 topems-portal 之外的脚本数 | 0（test/typecheck/lint 都只 filter portal） | `package.json:27-29` |
| web vite.config.ts 中自研 workaround 插件数 | 5（fixLocalSharedImportMapNullByte / fixMfVirtualModulesDevServer / fix-react-19-named-exports / fix-dayjs-umd-default / fix-cjs-named-exports-general） | `vite.config.ts:528/622/985/1142/1187` |
| 三端 React 版本 | web/desktop 19.2.7；mobile 18.2.0 | `apps/web/package.json:115`；`apps/mobile/package.json:35` |
