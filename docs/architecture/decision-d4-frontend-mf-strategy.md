# 前端 Module Federation 策略决策（D4 架构优化实施）

> 状态：✅ 决策已出（2026-10-02）· 归属：TODO.md「🚧 架构优化实施（2026-10-02）」阶段 0 · 关联：[D1 unified-core 目标形态决策](./decision-d1-unified-core-architecture.md)、[微前端架构决策](./microfrontend-architecture-decision.md)、[架构总览](./overview.md)
> 依据：架构分析报告 `TOPEMS-架构分析报告-2026-10-02.md`（F-02/F-13 等）+ `docs/audit/arch-analysis/FRONT.md`（FRONT-01/02/03/10/14）。本文档所有路径与行号为 2026-10-02 实测。

## 1. 背景与决策问题

前端存在两类相互叠加的问题：

1. **MF 空壳**：`apps/web/src/microfrontend/config.ts:89-260` 声明了 **19 个 `topems_*` remote**，但 `apps/` 下仅 web/mobile/desktop 三个应用、无任何 remote app 实现；默认 `DEPLOYMENT_MODE='static'`（`vite.config.ts:201-202`）下 `buildRemotes()` 返回空、federation 插件整体跳过；运行时加载代码（RemoteLoader/MicroAppRouter）存在但**未被 `App.tsx` 引用**——MF 是"配置与代码齐备、运行时零生效"的占位实现。而文档（`overview.md:44,382`、`microfrontend-architecture-decision.md`）以"微前端"为主叙事，且 decision.md 声称 `@module-federation/vite` 已删除——实际仍是 `apps/web/package.json:69-70` 的硬依赖，并催生了约 850 行构建 workaround（FRONT-10）。
2. **构建链断裂**：根 `package.json:21` `"build:core": "pnpm --filter topems-core build"` 引用的 `topems-core` **包不存在**（apps/ 下无 core 目录），`:26` 根 `build` 串联 `build:core`——根 `pnpm run build` 必然失败（FRONT-01）。

**决策问题**：前端 MF 的目标形态是什么——真落地 Module Federation（补 19 个 remote 实现）、移除 remote 声明回归单体 SPA（归档 MF 死代码）、还是渐进（先修构建链、MF 后续再定）？该决策决定 TODO.md 阶段 1 T1（构建链修复）的修复形态与阶段 2 前端改造任务的拆解。

## 2. 现状盘点（2026-10-02 实测）

### 2.1 MF 配置层（19 个 remote 完整清单）

`apps/web/src/microfrontend/config.ts:89-260` 的 `REMOTE_MODULES` 声明 **19 个 remote**（实测 grep 全部命中）：`topems_ai / bi / core / crm / doc / ehs / erp / finance / gis / hrm / lims / mes / monitor / pdm / pm / qms / scm / srm / wms`。

| 事实 | 证据（实测） |
|---|---|
| 默认部署模式 `static`：`DEPLOYMENT_MODE = env || 'static'`；static 下 `getRemoteEntry` 返回空串（`config.ts:50-51` 注释"static 模式返回空（不加载）"）、`buildRemotes()` 返回 `{}`、federation 插件跳过 | `apps/web/vite.config.ts:201-202`、`apps/web/src/microfrontend/config.ts:50-51` |
| 运行时加载代码**存在但未被引用**：`RemoteLoader.tsx:193,281-283`（`await import(/* @vite-ignore */ ${moduleName}/${component})`）与 MicroAppRouter 均未在 `App.tsx`/`main.tsx` 中引用（grep 零命中）；仅被 `index.ts` re-export | `apps/web/src/microfrontend/RemoteLoader.tsx:193,283`、`apps/web/src/App.tsx` |
| **无 remoteEntry 产物**：`apps/web/dist` 不存在（未构建）；`config.ts:48` 的 `/remote/${name}/remoteEntry.js` 路径约定无产出物 | `apps/web/dist` 缺失 |
| MF/hybrid 模式下仅 `topems_core` 1 个编译期 remote（`vite.config.ts:264-271`），19 个运行时声明在 static 下全部空 entry | `apps/web/vite.config.ts:264-271` |
| 36 个业务域全部本地打包：`apps/web/src/modules/` 下 36 个子目录（FRONT-02：2863 文件单 bundle），路由走本地 `DynamicRoutes` | `apps/web/src/routes/appRoutes.tsx:113` |

### 2.2 构建链现状

| 事实 | 证据（实测） |
|---|---|
| 根 `build:core` 引用不存在的 `topems-core` 包（`pnpm --filter topems-core build`）；根 `build` 串联 `build:shared-types && build:shared-utils && build:core && build:host`——在 `build:core` 处必然失败 | `package.json:21,26` |
| **`apps/core` 目录不存在**：`apps/` 下仅 desktop/mobile/web | `ls apps/` 实测 |
| `@module-federation/vite ^1.23.0` 与 `@module-federation/runtime ^2.8.0` 是 **apps/web/package.json:69-70 的 dependencies 硬依赖**；decision.md 声称"已删除"（FRONT-03） | `apps/web/package.json:69-70`、`microfrontend-architecture-decision.md:5,7` |
| 为兼容 Vite 8 + MF 插件写了约 850 行 workaround（`vite.config.ts:528-1380`，FRONT-10） | `apps/web/vite.config.ts:528-1380` |

### 2.3 前端契约与三端 packages

| 事实 | 证据（实测） |
|---|---|
| 平台能力走 `/api/core/{iam,flow,file,doc,automation,…}`（默认值定义于 `apps/web/src/config/runtime.ts`）；业务域走 `/api/erp`（35 文件）、`/api/mes`（26）、`/api/crm`（11）、`/api/finance`（11）；`VITE_API_BASE_URL=/api` 同源代理 | `apps/web/.env.local:2`、`apps/web/src/config/runtime.ts`、grep 实测 |
| web 依赖 **7 个** @topems packages（api-client/app-shell/shared-components/shared-hooks/shared-types/shared-utils/tokens）；desktop 依赖 2 个（api-client/app-shell）；**mobile 依赖 0 个** | `apps/web/package.json:91-97`、`apps/desktop/package.json:26-27`、`apps/mobile/package.json` 无 @topems/ 命中 |
| BFF：async-graphql（portal :8063）为前端聚合层，同时保留 REST 路由（ENTRY §2.3），GraphQL 与 REST 并存 | ENTRY.md §2.3 |

### 2.4 bundle 预算证据

- CI 前端构建门禁（`frontend-build` 任务，实测）：`MAX_TOTAL=30M MAX_CHUNK=500K MAX_VENDOR=2500K MAX_INITIAL=1500K bash scripts/bundle-check.sh`（`apps/web` 产物校验）——官方预算为 **total ≤ 30M、chunk ≤ 500K、vendor ≤ 2500K、initial ≤ 1500K**（`.github/workflows/ci.yml:1639`）。
- 说明：FRONT 分片所记 "total < 5MB" 与任务提示的 "16.48MB" 均**未在仓库实测中找到一致出处**（`apps/web/dist` 不存在，无法实测产物体积），本文档以 `ci.yml:1639` 的 `bundle-check.sh` 参数为唯一官方预算依据。

## 3. 关键前置事实核对结论（写入决策依据）

| 核对项 | 结论（实测） |
|---|---|
| 19 个 remote 是否真实可消费 | **否**：无对应 app 实现、无 remoteEntry 产物、static 默认空 entry、运行时加载器未被 App 引用——MF 是纯配置残留（死代码） |
| 构建链是否必然失败 | **是**：`build:core` → `topems-core` 包不存在（apps/ 无 core），根 `pnpm run build` 在第二步之后必然失败 |
| @module-federation/vite 是否已删除 | **否**：仍是 apps/web 唯一硬依赖（^1.23.0），decision.md 陈述与事实相反（漂移） |
| 三端/packages 是否可独立构建 | web 自包含（7 packages）、desktop 2、mobile 0；无 MF 运行时依赖阻断 |
| 前端 API 契约是否受 D1 影响 | **不受影响**（D1 已确认：`/api/core/*` 平台能力与 `/api/{module}` 业务前缀均不指向 unified-core 业务投影；nginx 转发规则不变）。D4 仅引用 D1 §5.4 结论，无新增联动 |
| 真 MF 的投入门槛 | 从零建设 19 个独立 remote 应用 + 维护 Vite 8 与 @module-federation/vite 1.x 兼容层（现有 850 行 workaround 即其代价），收益未验证（36 业务域单 bundle 已工作） |

## 4. 决策选项分析

### 选项 A 真 Module Federation（补 19 个 remote 实现）

- **定义**：为 19 个 `topems_*` 建独立 app（或按模块拆分首个 remote），构建 remoteEntry、运行时动态加载（`loadRemoteModule` 接线 App 路由）、网关/Nginx 按 `/remote/{name}/remoteEntry.js` 分发。
- **工作量**：高。19 个独立应用（或逐步拆分）+ MF 工具链维护（Vite 8 兼容 workaround 持续演进）+ 共享依赖 singleton 治理（17 个 shared 依赖，vite.config.ts:1408 附近）+ 部署拓扑变更（每 remote 独立域名/端口）。
- **风险**：高。现有 850 行 workaround 已说明工具链成本；拆分为独立构建后共享包升级/版本对齐复杂度上升；收益未验证（当前单 bundle 36 域静态路由工作正常，无性能瓶颈证据）。
- **适用条件**：团队有明确的多团队独立部署诉求且愿意承担 MF 运维成本——当前无证据（仓库为单一团队维护形态，apps/ 仅 3 端）。

### 选项 B 移除 remote 声明，回归模块化单体 SPA（推荐）

- **定义**：删除/归档 MF 死代码（`config.ts` 19 个 REMOTE_MODULES、RemoteLoader、MicroAppRouter、registry/marketplace/sandbox 100+ 文件 → `_archive/`）；移除 `@module-federation/vite`/`@module-federation/runtime` 依赖；`vite.config.ts` 850 行 workaround 收敛为标准 vite build（保留**按需加载用原生 dynamic import**，无需 MF 协议）；文档改口"模块化单体前端，MF 为预留扩展点"。
- **工作量**：中（T1 修复构建链先行 + 归档清理 + 构建链简化 + 文档）。
- **风险**：低。MF 当前零运行时价值，删除不影响任何功能；移除 MF runtime 还减小 bundle（无 runtime 开销）。
- **收益**：消除 FRONT-01/02/03/10/14 五条高危/中危（构建链断裂、MF 空壳、决策文档漂移、850 行 workaround、死代码）；构建链从"必失败 + 850 行兼容层"变为"标准 vite build + 预算门禁"；团队不再维护未使用的 MF 工具链。

### 选项 C 渐进（先修构建链，MF 形态后定）

- **定义**：T1 立即修 `build:core`（移除或改指真实包），MF 配置暂不动，后续再决策。
- **工作量**：低（T1 本身）。
- **风险**：中（作为**终态**时）。850 行 workaround 与 19 个空 remote 继续存在，文档漂移持续，维护成本持续——仅作**过渡**，不是终态。
- **注**：C 的 T1 部分是 B 的必经第一步，两者不互斥；C 与 B 的区别只在"MF 残留是否清理"。

## 5. 推荐与理由

**推荐：选项 B 为主（回归模块化单体 SPA + 归档 MF），T1 构建链修复是第一步（兼容选项 C 的立即动作）**。

理由：
1. **MF 是零运行时价值的占位实现**（19 remote 无实现、无 remoteEntry、运行时加载器未被引用、static 默认跳过）——移除无功能损失，且消除"文档以微前端为主叙事"的系统性漂移（FRONT-02）。
2. **构建链断裂是 P0 阻塞**（`build:core` → 不存在的 topems-core），无论 MF 走向都必须先修（T1）；B 把 T1 与归档清理合并为一条完整路径，避免"修了链条、留着空壳"的中间态。
3. **真 MF（A）投入产出不成立**：从零建设 19 个独立应用 + Vite 8 兼容层持续维护（现有 850 行 workaround 即证据），而当前 36 业务域单 bundle + 原生 dynamic import 已满足按需加载诉求，无性能/组织拆分证据支撑 MF 成本。
4. **bundle 预算受益**：移除 MF runtime 减小产物（CI 预算 total ≤ 30M / chunk ≤ 500K / vendor ≤ 2500K / initial ≤ 1500K，`ci.yml:1639` 保持即可达标；实测产物体积因无 dist 无法测量，不作为验收依赖）。
5. **与 D1 正交**：前端 API 契约（/api/core/* 与 /api/{module}）不受 D1 下架影响（D1 §5.4），D4 可独立实施；三端 packages 依赖（web 7/desktop 2/mobile 0）无需变动。

**保留的扩展点**：若未来确有独立部署诉求，用 Vite 原生 dynamic import / 路由级懒加载即可实现"按需加载"，无需引入 MF 协议与 remoteEntry 分发机制——在文档中明确此扩展路径，替代"已删除 @module-federation/vite"的错误陈述。

## 6. 实施路径与验收标准（对应 TODO.md 阶段 1 T1 + 阶段 2 前端改造）

### T1 构建链修复（阶段 1，立即开工，不依赖 D4 之外的决策）

| 步骤 | 内容 | 入口 |
|---|---|---|
| T1.1 | 移除 `build:core`（`package.json:21`），根 `build` 改为 `build:shared-types && build:shared-utils && build:host`（若 shared-utils 构建链亦验证） | `package.json:21,26` |
| T1.2 | 核验 `build:shared-utils` 是否依赖 topems-core（无依赖则直接移除 build:core；有则改指真实包） | `packages/shared-utils/package.json` |
| T1.3 | 根 `pnpm run build` 本地跑通（产出 web dist） | — |

### 阶段 2 前端改造（依赖 D4）

| 步骤 | 内容 | 入口 |
|---|---|---|
| D4-1 | MF 死代码归档：`config.ts` REMOTE_MODULES、RemoteLoader、MicroAppRouter、registry/marketplace/sandbox 等 100+ 文件移入 `_archive/`（保留 git 历史，不删除） | `apps/web/src/microfrontend/`、`apps/web/src/routes/appRoutes.tsx:132-165` |
| D4-2 | 移除依赖：`@module-federation/vite`、`@module-federation/runtime` 从 `apps/web/package.json:69-70` 移除 | `apps/web/package.json:69-70` |
| D4-3 | 构建链简化：`vite.config.ts` 删除 MF 插件与 workaround（528-1380 行收敛），保留 bundle 预算门禁（以 `ci.yml:1639` 参数为准：total ≤ 30M / chunk ≤ 500K / vendor ≤ 2500K / initial ≤ 1500K） | `apps/web/vite.config.ts:528-1380`、`.github/workflows/ci.yml:1639` |
| D4-4 | 文档对齐：`overview.md` 前端技术栈与"微前端"叙事改"模块化单体前端，MF 为预留扩展点（原生 dynamic import 路径）"；`microfrontend-architecture-decision.md` 更新状态（撤销"已删除"错误陈述） | `overview.md:380-433`、`microfrontend-architecture-decision.md:5,7` |

**验收标准（可测量）**：

1. **根 `pnpm run build` 成功产出**：`build:core` 移除后命令全程 0 错误，`apps/web/dist/` 生成。
2. **构建链三绿**：`vite build`、`tsc --noEmit`、`vitest run` 全绿（web/desktop/mobile 三端分别验证）。
3. **MF 依赖归零**：`grep "@module-federation" apps/web/package.json` = 0（package.json 无命中）；`pnpm why @module-federation/vite` 无依赖树节点。
4. **MF 死代码归档**：`apps/web/src/microfrontend/` 下运行时文件（RemoteLoader/MicroAppRouter/REMOTE_MODULES）无 `apps/web/src/App.tsx` 引用残留；appRoutes `/core/*` 占位页移除或改为静态提示。
5. **构建链简化达成**：`vite.config.ts` 行数显著下降（850 行 workaround 收敛，抽样 grep federation 插件 = 0）；bundle 预算门禁绿（CI `frontend-build` 通过）。
6. **回归**：36 业务域路由冒烟 e2e 全绿（DynamicRoutes 静态路由不受影响）；三端（web/desktop/mobile）构建成功。
7. **文档对齐**：`overview.md` 与 `microfrontend-architecture-decision.md` 与代码一致（无"已删除/微前端已启用"失实陈述）。

## 7. 风险与回退

| 风险 | 缓解 |
|---|---|
| 移除 MF 依赖后某隐藏引用（如 registry/marketplace/sandbox 被其他模块引用） | D4-1 归档前 grep 全仓引用（apps/web/src 内引用清单）；发现引用则保留该文件并登记 |
| 构建链简化引入构建行为变化（chunk 拆分策略 973 chunks 变少） | D4-3 以 bundle 预算门禁为硬约束（total < 5MB），不追求 chunk 数量不变；回归冒烟覆盖 |
| 文档改写后未来团队误用"MF 已删除"表述 | D4-4 明确"预留扩展点（原生 dynamic import）"替代路径，避免反复 |
| 16.48MB/5MB 预算口径无实证导致验收争议 | 验收统一以 `ci.yml:1639` 实测参数（total ≤ 30M 等）为准（§2.4 已注明无出处数值不采用） |

**回退路径**：T1.1 单行 revert 即可恢复 build:core；D4-1 归档移动不删除（git 历史 + 原路径可恢复）；D4-2/3 依赖与配置改动单 commit 可 revert；全程无数据迁移。

---

## 8. 实施状态（2026-10-03）

> 本节为 R3「文档与实现对齐闭环」追加，记录 D4 去 MF 化落地的最终 commit 与 R1 实测；不改动上文决策内容。

- **方案要点**：选项 B——移除 remote 声明、回归模块化单体 SPA，归档 MF 死代码（RemoteLoader/MicroAppRouter/registry），移除 `@module-federation/vite` workaround 插件，保留原生 dynamic import 扩展点。
- **实施 commit**：
  - `f994a5075` T1：移除失效 `topems-core` 构建链 + 归档 MF 运行时空壳（build:core 移除、@module-federation 归零）；
  - `2a71563ef` T2：系统性文档漂移修订（overview 前端技术栈表、microfrontend-architecture-decision.md 重写）。
- **验证结果（R1 前端基线 `f7c3d687d`）**：
  - `@module-federation` grep = 0 + 依赖树空（runtime/vite 均无节点）；
  - `build:host`（tsc && vite build）exit 0，141s，6411 modules；
  - `typecheck`（tsc --noEmit）exit 0，96s；
  - vitest：6528 passed / 3 failed（既有基线 = GisMapTemplate × react-leaflet mock 缺 `useMapEvents`，与 MF 移除无关）；
  - bundle 门禁：TOTAL 16.43MB / 预算 30M，全 chunk 预算内。
- **偏差/残留**：
  - F-15（decision.md 称 @module-federation/vite 已删而实为硬依赖）随依赖移除 + T2 重写 decision.md 消除；
  - F-46（850 行 workaround 插件）/ F-73（MicroAppRouter/RemoteLoader 死代码）随 MF 空壳归档消除；
  - `build:shared-types` DTS 步既有 TS2688（dompurify 类型）环境问题复现，与 MF 无关（web 走源码 alias 不受影响）；
  - mobile/desktop 三端需原生工具链，R1 范围不跑，留待补测。
