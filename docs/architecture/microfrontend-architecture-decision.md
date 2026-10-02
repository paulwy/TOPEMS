# apps/web/src/microfrontend/ 目录架构决策（2026-08-01）

> 📐 **2026-10-02 决策目标态校准（对齐 [D4](./decision-d4-frontend-mf-strategy.md)，阶段 1 快赢任务 T2）**
> - **目标态：MF 已移除、回归模块化单体 SPA（单 bundle + 本地动态路由）。** 代码改造由 **T1 并行执行**，本文档记录决策目标态，不等待 T1 完成、不复核 T1 代码改动。
> - **撤销原文错误陈述**：下文及 P35-3 所称「`@module-federation/vite` 已删除」**与事实相反**——对齐代码现状 2026-10-02 实测，`@module-federation/vite ^1.23.0` 与 `@module-federation/runtime ^2.8.0` 仍是 `apps/web/package.json:69-70` 的 **dependencies 硬依赖**，并催生了 `vite.config.ts:528-1380` 约 850 行构建 workaround。T1 将把这两个依赖从 package.json 移除。
> - **MF 是空壳（零运行时价值）**：`src/microfrontend/config.ts:89-260` 声明 19 个 `topems_*` remote，但 `apps/` 下仅 web/desktop/mobile、**无任何 remote app 实现、无 remoteEntry 产物**；默认 `DEPLOYMENT_MODE='static'`（`vite.config.ts:201-202`）下 `buildRemotes()` 返回空、federation 插件整体跳过；`RemoteLoader`/`MicroAppRouter` 运行时加载代码**未被 `App.tsx` 引用**（仅被 index.ts re-export）。即「配置与代码齐备、运行时零生效」的占位实现。
> - **`src/microfrontend/` 100+ 文件的处置**：按 D4 选项 B，`config.ts` REMOTE_MODULES、RemoteLoader、MicroAppRouter、registry/marketplace/sandbox 等运行时文件移入 `_archive/`（保留 git 历史）；**保留扩展点**用 Vite 原生 dynamic import / 路由级懒加载实现按需加载，不引入 MF 协议与 remoteEntry 分发机制。
> - 下文（2026-08-01 P35 时期）的「正式落地，不归档」结论**已被 D4 推翻**，仅作历史记录保留。

---

## 【历史记录，已被 D4 推翻】原结论（2026-08-01 P35-4）：~~正式落地，不归档~~

> ⚠️ 以下为 2026-08-01 历史结论，其「@module-federation/vite 已删除」「生产引用多处」均已被 D4 与 2026-10-02 实测推翻，保留仅作溯源。

`src/microfrontend/`（14 子目录 100+ 文件）曾被定为 TOPEMS 的 **平台治理内核代码**，与 P35-3 移除的 `@module-federation/vite`（webpack 5 联邦插件）**完全无关**。两者仅名称相似但作用域不同：

| 维度 | @module-federation/vite（原文称已删除，实测仍在） | src/microfrontend/（原文称保留，实测运行时零生效） |
|------|----------------------------------|---------------------------|
| 依赖 | 原文称需安装 NPM 包（移除）——**实测仍是硬依赖 `apps/web/package.json:69-70`** | 纯 TS/TSX |
| 作用 | 跨仓库/跨构建时的 JS 运行时模块热插拔 | 单仓内：插件市场、可观测面板、沙箱、AI 运维、模块注册表 |
| 生产引用 | 原文称 0——**实测 default static 跳过 federation 插件** | 原文称多处——**实测 RemoteLoader/MicroAppRouter 未被 App.tsx 引用，19 remote 零实现** |
| 架构风险 | 空模块占位 | D4 判定为零运行时价值的占位实现，T1 归档 |

## 保留清单（14 子目录，后续作为"模块治理平台 V1"核心交付物）

| 子目录 | 文件数 | 核心类/组件 | 作用 |
|--------|--------|------------|------|
| `registry/` | 3 | RegistryPanel / module-registry / registry-api | 模块元数据检索面板 |
| `runtime/` | 7 | RuntimeDashboard / dynamic-loader / design-system / module-lifecycle / cross-framework | 运行时加载与性能监控 |
| `marketplace/` | 5 | ModuleMarketplace / module-market / plugin-index / plugin-market | 插件市场 UI（对接 P36-3 插件市场 V1） |
| `security/` | 6 | SecurityCenter / csp-manager / module-signer / runtime-protection / security-scanner | 模块沙箱 & 安全评分 |
| `sandbox/` | 7 | SandboxedRemoteLoader / conflict-detector / style-isolation / event-isolation / js-sandbox / sandbox-manager | iframe + ShadowDOM 隔离沙箱 |
| `observability/` | 6 | ObservabilityDashboard / ObservabilityPanel / module-performance-metrics / error-tracker / user-behavior-analytics | 全链路性能与错误面板（P35-6 OTel 对接入口） |
| `platform/` | 2 | unified-dev-platform / index | 开发者工作台入口 |
| `governance/` | 3 | DependencyGovernance / dependency-governor / index | 依赖版本 & 许可证治理 |
| `ai-ops` / `ai-ops-v2` / `ai-driven` | 14 | AIOpsPanel / anomaly-detector / auto-scaler / predictor / smart-alerting / root-cause-analyzer | AI 运维内核 |
| `devex/` | 5 | microfrontend/module-name / devtools-panel / code-completion / performance-analyzer / smart-debugger | DX 工具链（本地开发辅助） |
| `lowcode/` | 2 | builder / index | 低代码（CrudPage 基础上扩展拖拽） |
| `version-platform/` | 3 | VersionPanel / rollout-manager / version-platform | 灰度发布 & 回滚 |
| `serverless/` | 4 | edge-renderer / function-as-module / on-demand-loader | 边缘渲染 & FaaS 模块 |
| 根文件 | 9 | MicroAppRouter / RemoteLoader / config / canary-release / performance / registry / version-manager / index / module-name | 聚合导出层 |

## 下一阶段工作（非本 P35-4 范围，后续 P36-5 或 P37+ 计划）
1. `microfrontend/marketplace/` 与 svc/plugin marketplace API 双向打通（P36-3 插件市场 V1）
2. `observability/` 与 P35-6 OTel trace-id 传递端到端贯通
3. `sandbox/js-sandbox.ts` 使用 Realm + SES 加固（当前 iframe 模式）
4. 与 `apps/web/src/modules/registry/core-modules.ts` lazyFallback 打通（目前 67 占位指向）

## 本决策说明
- 本文件由 P35-3 遗留边界项 + P34-5 + P35-4 四路突袭一并处理
- 标记 @public，归档在 docs/architecture/microfrontend-architecture-decision.md 以供后续查阅
