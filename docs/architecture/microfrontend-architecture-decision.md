# apps/web/src/microfrontend/ 目录架构决策（2026-08-01）

## 结论：**正式落地，不归档**

`src/microfrontend/`（14 子目录 100+ 文件）是 TOPEMS 的 **平台治理内核代码**，与 P35-3 移除的 `@module-federation/vite`（webpack 5 联邦插件）**完全无关**。两者仅名称相似但作用域不同：

| 维度 | @module-federation/vite（已删除） | src/microfrontend/（保留） |
|------|----------------------------------|---------------------------|
| 依赖 | 需安装 NPM 包（移除） | 纯 TS/TSX 无额外依赖 |
| 作用 | 跨仓库/跨构建时的 JS 运行时模块热插拔 | **单仓内**平台治理：插件市场、可观测面板、沙箱、AI 运维、模块注册表 |
| 生产引用 | 0（已拆）| 多处（App.tsx / microfrontend/index.ts / governance / security） |
| 架构风险 | 空模块占位 67→tsc 静态可达性问题 | 已全部 import resolve，运行可用 |

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
