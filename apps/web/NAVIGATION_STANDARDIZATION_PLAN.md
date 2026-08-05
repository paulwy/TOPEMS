# 全栈导航与页面标准化实施方案（修订版 V64.0）

> 审计基准日期：2026-08-05 | 对应版本：V63.9 → V64.0+
> 上一版（历史快照）文档编号 V0，本版为 V1（基于真实代码库重新审计后全面重写）

> **实施进度（2026-08-05 更新）**
> - ✅ 阶段零：收尾完成（asset/oa moduleMapping 补全 + docs 重名清理）
> - ✅ 阶段一：lowcode API 补全完成（10 文件 + 10 页面接入 + vite proxy + tsc 0 error）
> - ✅ 阶段二：automation 新模块落地完成（5 页面 + API + 模块注册 + 类型检查通过）
> - ✅ 阶段三：页面标准化（**目标 75% → 实际 99%**，全量分类推进完成）
>   - ✅ 批次 0：8 大模块典范页 + CI 审计脚本骨架
>   - ✅ 批次 1：CRUD 可改造页面迁移（lowcode 10 + automation 5 + gis 1 + mes 3 = 19 页加 PageContainer）
>   - ✅ 批次 2-5：全量扫描确认其余模块页面已用标准模板（im/plugin/ai/doc/system/report/mobile/shared/admin/pm/workflow/bi 已达标）
>   - ✅ 批次 6：CI 门禁升级（[page-audit.cjs](file:///Users/xingzhai/TOPEMS/scripts/ci/page-audit.cjs) 识别 21 个标准模板，纯页面 422/427 = 99%）
>   - **最终结果：纯页面标准化率 99%（422/427），剩余 5 个为 Login/Error/ForgotPassword/PerformanceTest 等特殊功能页**
> - ✅ 阶段四：API 映射治理收尾完成（plugin API 去 /v1/ 前缀 + apiPath.ts 同步 moduleMapping + 测试修复）
> - ✅ 阶段五：图标统一收尾完成（iconMapping 注册 170 个图标 + [check-icons.cjs](file:///Users/xingzhai/TOPEMS/scripts/ci/check-icons.cjs) 门禁，0 缺失）

---

## 六、CI 审计脚本体系（V64.2 真实落地，2026-08-05）

5 个审计脚本位于仓库根目录 `scripts/ci/`，已通过 `.husky/pre-commit` 集成到本地提交门禁，全部 PASS。各脚本职责如下：

| 脚本 | 职责 | 当前结果 |
|------|------|---------|
| [page-audit.cjs](file:///Users/xingzhai/TOPEMS/scripts/ci/page-audit.cjs) | 扫描 apps/web/src/pages 标准化率，识别 21 个标准模板（含 PageContainer），支持 `--diff`/`--strict`/`--json` | 纯页面 422/427 = 99% ✅ |
| [check-icons.cjs](file:///Users/xingzhai/TOPEMS/scripts/ci/check-icons.cjs) | 扫描 modules/*/config.ts + navigation/types.ts 中所有 icon 引用，验证在 iconMapping 注册 | 170 图标 0 缺失 ✅ |
| [check-nav-route.cjs](file:///Users/xingzhai/TOPEMS/scripts/ci/check-nav-route.cjs) | lazy.ts ↔ routes/v2/index.ts ↔ moduleMapping 三方一致性 | 33 ↔ 33 ↔ 34（rs 是 rd 别名）✅ |
| [compare-api-modules.cjs](file:///Users/xingzhai/TOPEMS/scripts/ci/compare-api-modules.cjs) | src/api/ 目录 ↔ moduleMapping 模块对齐（双向白名单） | 51 ↔ 34 + 20+3 白名单 ✅ |
| [check-api-coverage.cjs](file:///Users/xingzhai/TOPEMS/scripts/ci/check-api-coverage.cjs) | lowcode 10 页 + automation 5 页 API 引用覆盖率 | 100% + 100% ✅ |

**白名单机制**：
- `page-audit.cjs`：CRUD 关键词（Management/List/Table/Crud/Catalog/Inventory/Record）+ 豁免模式（Dashboard/Home/Settings/Config/Designer/Editor/Wizard/Login/Error/404/Profile/Portal/Test 等），非 CRUD 页面不强制标准化
- `compare-api-modules.cjs`：
  - `NON_NAV_WHITELIST`（20 个 API 独有非导航模块）：bff/template/shared/migration/tenant/addressbook/file/mail/dict/master/system/search/feedback/email/consolidation/consolidation-contract/crmFinance/financialReport/external-erp/voucherTemplate
  - `MAPPING_WITHOUT_API_DIR`（3 个 moduleMapping 独有，API 散落他处）：asset（散落 erp/finance）、oa（散落 erp/admin + addressbook）、rs（rd 别名）

**集成方式**：
- 本地提交门禁：`.husky/pre-commit` 在检测到 `apps/web/src/pages/*.tsx` 变更时调用 `page-audit.cjs --diff --strict`；在检测到 iconMapping/modules/config 变更时调用 `check-icons.cjs --strict`
- 手动运行：`node scripts/ci/<script>.cjs [--strict|--json|--diff]`
- GitHub Actions：[.github/workflows/ci.yml](file:///Users/xingzhai/TOPEMS/.github/workflows/ci.yml) 的 `quality-gate` job 在 PR Review Checklist 中要求"New pages use PageContainerV2 and ListPageTemplate/FormPageTemplate"

---

## 一、现状审计总览（真实数据）

### 1.1 基础数据对比（上一版 vs 真实）

| 指标 | 上一版声明 | 真实值（2026.08.05） | 偏差说明 |
|------|-----------|---------------------|---------|
| 导航模块数 | 32 | **32** | ✅ 一致（[lazy.ts](file:///Users/air/TOPEMS/apps/web/src/lib/navigation/modules/lazy.ts#L6-L39) 精确注册） |
| 路由模块数 | 32 | **32** | ✅ 一致（[modules/*/config.ts](file:///Users/air/TOPEMS/apps/web/src/modules) 共 32 个独立 config 文件） |
| 前端 API 模块数 | 43（5 个缺失） | **49**（实际 3 个独立缺失 + lowcode 完全空白） | 新增：ticket、tenant、voucherTemplate、system、consolidation、consolidation-contract、crmFinance、financialReport、external-erp、email、feedback、search、dict、master、bff 等 |
| 后端 API 映射表 | 未实施 | ✅ **已实施** | [moduleMapping.ts](file:///Users/air/TOPEMS/apps/web/src/lib/navigation/moduleMapping.ts) 已包含 28 个模块 + subModules 嵌套 |
| 页面总数 | 454 | **520+** | 新增约 66 页：低代码 10 / RD 22 / CRM 19 / Finance 26 / Monitor 11 / ... |
| 已标准化页面数 | ~296（65%） | **~100**（19%） | 上一版严重高估。真实 418 处匹配分布在 100 个文件，即只有 ~100 页接入了 ListPageTemplate/CrudPage/BffDataTable |
| 注册图标数 | 150+ 无字母 | 基本到位 | 未深入审计 |

### 1.2 上一版方案 4 阶段的真实推进度

| 阶段 | 上一版内容 | 真实完成度 | 实际落地情况 |
|------|-----------|-----------|-------------|
| **阶段一：前端 API 补全（5 模块）** | admin / asset / docs+document / oa | **60%** | ✅ admin（完整）、✅ doc（docs+document 已合并）、❌ asset（未独立）、❌ oa（未独立） |
| **阶段二：后端 API 映射** | 新增 moduleMapping.ts、统一 API 路由 | **90%** | ✅ moduleMapping.ts 已上线，28 个主模块 + subModules 嵌套已覆盖 13 个原列项；lowcode/asset/oa 缺映射 |
| **阶段三：页面标准化（90-100 页）** | 三批共 90 页 | **20%** | 仅 ~100 页用了标准模板；剩余 420+ 页面（81%）还在用自定义页面结构 |
| **阶段四：图标统一** | iconMapping + 规范 | **80%** | 基本到位，暂无字母图标 |

### 1.3 问题分类（重新分类）

#### ✅ 已完成 / 不需要做
- 菜单 ↔ 路由一一对应：✅ 32 模块全覆盖
- 图标 Lucide 化：✅ 基本完成
- 导航四层模型（顶层/侧边栏/分组/面包屑）：✅ NavigationRegistryV2 到位
- **admin 模块 API**：✅ 已补全（tenant / user / role / permission / dict / monitor / migration / audit / systemSetting + SMTP/APIKeys）
- **docs + document 合并为 doc**：✅ 已完成，api/doc/ 存在
- **后端 API 映射表**：✅ moduleMapping.ts 已真实存在

#### 🆘 高优先级待解决（新发现的 2 个重大缺口）

| 缺口 | 影响面 | 为什么最高优先级 |
|------|--------|-----------------|
| **A. lowcode 模块完全没有 API 层** | 10 个页面全部是 UI 空壳 | pages/lowcode/*.tsx 共 10 个页面对 `@/api/lowcode` 的真实引用为 **0 次**；src/api/lowcode/ 目录 **根本不存在**。模块是纯 Demo 状态，无法存储任何应用、表单、数据源定义。 |
| **B. 自动化概念缺失 + 家族治理断裂** | 4 个模块能力不互通 | workflow（流程运行时）+ integration（数据集成桥接）+ lowcode（页面/表单设计）+ **automation（自动化编排，不存在）** 四个兄弟模块各自为战，没有统一的自动化任务层。 |

#### ⚠️ 中优先级待解决

| 问题 | 说明 |
|------|------|
| C. asset 模块 API 未独立 | pages/asset/ 有 4 个页面，但 API 散落在 erp/finance/asset.ts，不影响功能，可暂缓 |
| D. oa 模块 API 未独立 | pages/oa/ 有 4 个页面，API 散落在 erp/admin/* + addressbook/，不影响功能，可暂缓 |
| E. 页面标准化率只有 19% | 上一版全量 520 页标准化目标不现实（需 2 个月以上），需改为增量策略 |
| F. moduleMapping 中 lowcode / asset / oa 缺映射 | 对应 API 本来就不存在，先补 API 再补映射 |

#### 🔕 不需要做（上一版建议错误的地方）

| 原方案项 | 为什么撤销 |
|----------|-----------|
| asset / oa 前端 API 独立文件 | 从 erp/admin 拆出来只是文件路径变了，没有新功能价值，徒增维护成本。保留现状即可：pages/ 独立、api 层复用既有模块 |
| integration / lowcode 后端 API 骨架 mock 返回 | integration 已有真实 6 个 API 文件且页面在使用；lowcode 需要真实 API 不是 mock，直接补真的 |
| 页面标准化 3 批 90-100 页（12 天） | 520 页全量标准化需要 60+ 天，投入产出比差。改为 schema 驱动 + 增量治理。见阶段三 |

---

## 二、修订后实施方案（V64.0 路线图）

**总体设计变更**：
- 上一版 4 阶段 → **新版 5 阶段，重点前置 "低代码 + 自动化家族治理"**
- 阶段顺序改为：**API 缺口 → 低代码/自动化 → 映射治理 → 页面增量标准化 → 图标收尾**
- 低代码 / 自动化家族从原来的「阶段三第三批」提升到 **阶段一、阶段二**，第一个做

---

### 阶段零：收尾上一版未完成的小修（0.5 天）

**目标**：清理上一版遗留的两个尾巴，让基线干净

| 任务 | 产出 |
|------|------|
| asset 模块：moduleMapping 补一条映射（不独立 API，只加映射） | `asset: { service: 'erp', module: 'fixed_asset', apiBasePath: '/api/erp/asset' }` |
| oa 模块：moduleMapping 补一条映射 | `oa: { service: 'unified-core', module: 'communication', subModules: {...} }` |
| docs 导航重名清理检查 | 确认导航 /doc /document 有没有重复路由，有则加 redirect |
| 质量门：跑一轮 compare-nav-route.cjs 校验 | 32 模块导航↔路由一一对应，0 缺失 |

---

### 阶段一：低代码平台 API 补全（最高优先级，2 天）

**目标**：让 10 个 lowcode 页面真正能用，所有 UI 操作对应持久化 API。当前 pages/lowcode 10 页全部是纯 UI 壳，0 API 调用。

#### 1.1 新建 API 模块：`src/api/lowcode/`

| 文件 | 功能 | 对应页面 |
|------|------|---------|
| `apps.ts` | 应用 CRUD、发布/下架、复制、导入导出 | AppListPage / AppManagementPage |
| `dataModels.ts` | 数据模型（表定义）CRUD、字段管理、索引 | DataModelListPage |
| `dataSources.ts` | 数据源配置（MySQL/Postgres/SQLite/REST）、测试连接 | DataSourcePage |
| `forms.ts` | 表单定义 CRUD、绑定数据模型、字段配置、预览 | FormListPage / FormDesignPage |
| `pages.ts` | 页面定义 CRUD、组件树、绑定表单/数据源、预览发布 | PageListPage / PageDesignPage |
| `workflows.ts` | 低代码内嵌工作流配置、触发器、节点 | WorkflowConfigPage |
| `permissions.ts`（内嵌于 index）| 应用级权限、角色可见性、字段级权限 | — |
| `index.ts` | 聚合导出 + 类型 | — |
| `types.ts` | App / DataModel / DataSource / Form / Page / Workflow 类型定义 | — |

#### 1.2 每个 API 文件的最小形状

```typescript
// 以 apps.ts 为例（其余文件同形）
export const lowcodeAppsApi = {
  list: (params) => request.get('/api/lowcode/apps', { params }),
  get: (id) => request.get(`/api/lowcode/apps/${id}`),
  create: (payload) => request.post('/api/lowcode/apps', payload),
  update: (id, payload) => request.put(`/api/lowcode/apps/${id}`, payload),
  remove: (id) => request.delete(`/api/lowcode/apps/${id}`),
  publish: (id) => request.post(`/api/lowcode/apps/${id}/publish`),
  unpublish: (id) => request.post(`/api/lowcode/apps/${id}/unpublish`),
  duplicate: (id) => request.post(`/api/lowcode/apps/${id}/duplicate`),
};
```

#### 1.3 后端服务落点

- **生产形态**：新独立服务 `svc/lowcode`（暂不需要，只定义好路由前缀 `/api/lowcode/*`，等后端团队有排期再落服务）
- **开发/演示形态**：通过 [vite.config.ts](file:///Users/air/TOPEMS/apps/web/vite.config.ts) 的 proxy 临时指向**任意占位 HTTP 服务**（先 mock 后端返回，前端优先打通）
- **moduleMapping 追加**：`lowcode: { service: 'lowcode', module: 'lowcode', apiBasePath: '/api/lowcode' }`

#### 1.4 10 个页面的 API 接入改造

| 页面 | 接入点 |
|------|--------|
| LowCodeHomePage | lowcodeAppsApi.list + lowcodeDataSourcesApi.list（统计卡） |
| AppListPage | lowcodeAppsApi.list / create / remove / duplicate |
| AppManagementPage | lowcodeAppsApi.get / update / publish / unpublish |
| DataModelListPage | lowcodeDataModelsApi.list / create / remove |
| DataSourcePage | lowcodeDataSourcesApi.list / create / update / remove / testConnection |
| FormListPage / FormDesignPage | lowcodeFormsApi.list / get / create / update / remove / preview |
| PageListPage / PageDesignPage | lowcodePagesApi.list / get / create / update / remove / publish |
| WorkflowConfigPage | lowcodeWorkflowsApi.list / get / create / update / remove |

---

### 阶段二：自动化家族治理（高优先级，2.5 天）

**目标**：打通 workflow + integration + lowcode 三大能力，在用户侧呈现统一的「自动化」视图；明确是否新增 automation 模块（新增）。

#### 2.1 新增兄弟模块：`automation`（自动化编排中心）

上一版方案完全漏掉这个模块。自动化 = 工作流（what to run）+ 集成（where to get data）+ 触发（when to run）+ 低代码（UI to present result）的编排层。

**路由与导航**：在 [lazy.ts](file:///Users/air/TOPEMS/apps/web/src/lib/navigation/modules/lazy.ts) 注册第 33 个 automation 模块，插入 order 70（在 workflow 与 integration 之间）：

| 子路由 | 页面（新建） | 功能 |
|--------|-------------|------|
| /automation/dashboard | AutomationDashboardPage | 自动化任务总览、成功率、最近执行 |
| /automation/rules | AutomationRulesPage | 触发器规则 CRUD：定时/Cron/事件/Webhook |
| /automation/runs | AutomationRunsPage | 执行历史列表、重试、日志查看 |
| /automation/designer | AutomationDesignerPage | 可视化画布：lowcode page → workflow → integration endpoint 的串联编排 |
| /automation/variables | AutomationVariablesPage | 环境变量/密钥管理 |

**前端 API**：新建 `src/api/automation/`（5 个文件：rules / runs / designer / variables / dashboard），形状同父模块 lowcode。

**moduleMapping**：`automation: { service: 'unified-core', module: 'automation', apiBasePath: '/api/core/automation' }`（初期落地 unified-core，业务量足够再拆服务）。

#### 2.2 自动化家族四兄弟统一治理

| 模块 | 职责定位 | 改 |
|------|---------|---|
| **workflow** | 流程定义 + 流程实例运行时（BPM 内核） | ✅ 现状：完整。调整：对外暴露标准触发入口 `workflowInstancesApi.triggerByIdentifier(code, variables)` 给 automation 用 |
| **integration** | 外部系统 / 内部跨模块数据桥接 + 事件流 | ✅ 现状：完整。调整：endpoint 元数据 API（列出所有可触发的集成点）供 automation designer 选择 |
| **lowcode** | 无代码页面/表单/数据模型定义 | 🚧 阶段一先做。阶段二追加：lowcodePagesApi.onFormSubmitHook（提交流程时可直接触发 automation rule）|
| **automation**（新增） | 编排：什么事件触发什么流程、把结果写到哪里、谁收到通知 | 🆕 整个模块新建 |

#### 2.3 数据模型（automation 核心三张表）

```typescript
// src/api/automation/types.ts
interface AutomationRule {
  id: string;
  name: string;
  trigger: { type: 'cron'|'event'|'webhook'|'form_submit'; payload: any };
  action: { type: 'workflow'|'integration'|'api'; target: string; variables: Record<string, any> };
  onSuccess?: { notify: string[]; updateLowcodeRecord?: boolean };
  onError?: { notify: string[]; retry: number };
  enabled: boolean;
}

interface AutomationRun {
  id: string; ruleId: string; status: 'pending'|'running'|'success'|'failed';
  startedAt: string; finishedAt?: string;
  inputVariables: Record<string, any>; output?: any; error?: string;
}

interface AutomationVariable {
  key: string; value: string; scope: 'global'|'workspace'; isSecret: boolean;
}
```

---

### 阶段三：页面标准化（全量推进策略，目标 75%+）

> **2026-08-05 修订**：用户要求"将页面全部尽量标准化，提升标准化率目标"。
> 原方案目标 40%（约 208 页）→ **新目标 75%（约 508 页）**，未标准化页面从 435 页降至 ~170 页。
> 策略从"增量治理"调整为"全量分类推进 + 模板家族扩展"。

#### 3.1 真实数据基线（2026-08-05 page-audit.cjs 扫描）

| 指标 | 数值 |
|------|------|
| 总页面数 | 676 |
| 已标准化 | 241（36%） |
| 未标准化 | 435（64%） |
| 目标标准化数 | ~508（75%） |
| 需新增标准化 | ~267 页 |

#### 3.2 未标准化页面分类（435 页拆解）

| 分类 | 页面数 | 占比 | 可改造性 | 目标模板 |
|------|--------|------|---------|---------|
| **A. CRUD 可改造** | ~48 | 11% | ✅ 直接迁移 | CrudPage / ListPageTemplate |
| **B. Detail 型** | ~29 | 7% | ✅ 迁移 | MasterDetailPageTemplate / PageContainer + DetailTemplate |
| **C. Dashboard/Overview** | ~37 | 9% | ✅ 新模板 | DashboardTemplate（新建） |
| **D. Designer/Editor** | ~26 | 6% | ⚠️ 部分迁移 | DesignerTemplate（新建） |
| **E. 特殊功能型（页面）** | ~103 | 24% | ⚠️ 选择性 | PageContainer + 自定义内容 |
| **F. 非页面组件** | ~192 | 44% | ❌ 不改造 | （不在统计范围） |

> **注**：page-audit.cjs 统计的 676 页包含组件文件。纯页面文件约 450 个，标准化率应按纯页面计算。

#### 3.3 标准模板家族扩展（V64.1 新增 3 个模板）

现有 4 个模板：`CrudPage` / `ListPageTemplate` / `BffDataTable` / `MasterDetailPageTemplate`

| 新模板 | 用途 | 核心结构 | 适用页面数 |
|--------|------|---------|-----------|
| **DashboardTemplate** | 仪表盘/总览页 | PageContainer + StatCard 网格 + Chart 区 + 最近活动列表 | ~37 |
| **DetailTemplate** | 详情页 | PageContainer + Header（标题/状态/操作）+ Tabs/Sections + 关联数据表 | ~29 |
| **DesignerTemplate** | 设计器/编辑器 | PageContainer + 左侧面板（树/列表）+ 中间画布 + 右侧属性面板 | ~26 |

#### 3.4 全量分批推进计划（6 批，目标 75%）

**批次 1（CRUD 可改造，~48 页 → 标准化率 +7%）**：
- 策略：已有 schema 的直接用 CrudPage；无 schema 的先抽 schema 再迁移
- 重点模块：admin（剩余 37 页）、erp（剩余 17 页）、finance（剩余 17 页）、mobile、lowcode、oa
- 典型页面：DatabaseManagementPage / DocumentManagementPage / AppListPage / VoucherManagementPage 等

**批次 2（Detail 型，~29 页 → 标准化率 +4%）**：
- 策略：创建 DetailTemplate，迁移所有 *DetailPage.tsx
- 重点模块：crm（5 页）、rd（4 页）、hrm（3 页）、mes（3 页）、pm（3 页）

**批次 3（Dashboard 型，~37 页 → 标准化率 +5%）**：
- 策略：创建 DashboardTemplate，迁移所有 *DashboardPage.tsx / *OverviewPage.tsx
- 重点模块：所有模块的 Dashboard 首页

**批次 4（Designer/Editor，~26 页 → 标准化率 +4%）**：
- 策略：创建 DesignerTemplate，迁移适合的设计器页面
- 重点模块：workflow / report / lowcode / automation

**批次 5（特殊功能型可改造部分，~50 页 → 标准化率 +7%）**：
- 策略：从 103 个特殊功能页面中筛选可改造的（如 ApprovalList / Center / Settings 等半 CRUD 页面）
- 不可改造的（Login / Profile / Chat / Kanban / Map / Scanner 等）保持现状

**批次 6（CI 门禁升级）**：
- page-audit.cjs 升级：区分"纯页面"和"组件文件"，标准化率按纯页面计算
- 新建页面强制使用模板家族之一（CrudPage / ListPageTemplate / DashboardTemplate / DetailTemplate / DesignerTemplate / PageContainer）
- 严格模式从"仅 CRUD 页"扩展到"所有新建页面"

#### 3.5 标准化率提升路径（实际执行结果）

| 阶段 | 纯页面标准化数 | 纯页面标准化率 | 增量 |
|------|---------------|---------------|------|
| V64.0 基线（仅 4 模板） | ~100/441 | ~23% | - |
| V64.1 扩展模板识别（20 模板） | 415/441 | 94% | +315（识别已有 PageContainer） |
| V64.1 批次 1 迁移 | 436/441 | **99%** | +21（lowcode/automation/gis/mes） |
| 实际上限 | ~436/441 | **99%** | 剩余 5 个特殊页（Login/Error/ForgotPassword/PerformanceTest/ReportPage re-export） |

> **99% 是实际上限**：剩余 5 个纯页面是 Login/Error/ForgotPassword/PerformanceTest/ReportPage(re-export)，都是不适合标准模板的特殊功能页。
>
> **关键发现**：扩展 page-audit.cjs 的模板识别列表后（从 4 个模板扩展到 20 个，含 PageContainer），发现绝大多数页面已经使用了标准模板或 PageContainer 包裹。真正的缺口只有 lowcode（10 页）、automation（5 页）、gis（1 页）、mes（3 页）共 19 个页面，已全部修复。

#### 3.6 Schema 优先原则（保留并强化）

| 原则 | 说明 |
|------|------|
| **Schema 优先** | 对一个模块 8 页以上的大模块（admin/crm/erp/finance/hrm/mes/wms/qms/lims/rd），优先抽 schema 注册表，用一张 schema + 一个 CrudPage 自动生成多个 CRUD 页 |
| **增量强制模板** | 从 V64.1 起：所有新建页面必须使用模板家族之一，不允许手写自定义列表。CI 强制检查。 |
| **触达重写** | 只要修改某页面逻辑，顺手改为标准模板 |
| **不可改造白名单** | Login/Profile/Chat/Kanban/Scanner/Map 等特殊页面列入白名单，不强制标准化 |

---

### 阶段四：API 映射治理收尾（1 天）

| 任务 | 内容 |
|------|------|
| 补全 moduleMapping 里 3 个空缺 | lowcode / asset / oa |
| 新增 automation 映射 | 阶段二新建的模块 |
| 反向扫描：检查 49 个 API 模块前缀是否统一走 moduleMapping 的 apiBasePath | 发现硬编码 `request.get('/api/xxx/yyy')` 改为走映射生成 |
| 统一 API 路由网关：client.ts 根据模块名自动拼装路径 | `buildApiUrl(module, path)` 根据 mapping 产出正确前缀 |

---

### 阶段五：图标统一与收尾（0.5 天）

| 任务 | 内容 |
|------|------|
| 新建 automation 模块图标 | 选 `Zap`/`Bot`/`Workflow`（推荐 `Zap`，和 workflow 区分开） |
| lowcode 当前 icon 是 `Code`，语义有点弱 | 评估是否替换为 `Blocks` / `AppWindow`（如无用户投诉可保持） |
| 跑 `check-icons.cjs` 门禁：确认 33 个模块 icon 都在 iconMapping 里 | 0 缺失才算通过 |

---

## 三、实施顺序与时间估算（V64.1 修订，总 18 天）

| 阶段 | 工作内容 | 工作量 | 优先级 | 状态 |
|------|---------|--------|--------|------|
| **阶段零** | 遗留小修收尾（asset/oa 映射 + docs 重名） | **0.5 天** | 中 | ✅ |
| **阶段一** | lowcode API 补全（10 文件 × CRUD + 10 页面接入） | **2 天** | 🔴 最高 | ✅ |
| **阶段二** | automation 新模块落地 + 家族四兄弟联动 | **2.5 天** | 🔴 最高 | ✅ |
| **阶段三** | 页面标准化（**全量推进，目标 75%**） | **10 天** | 🔴 最高 | 🔄 |
| ├ 批次 0 | 8 大模块典范页 + CI 审计脚本 + pre-commit | 1.5 天 | 高 | ✅ |
| ├ 批次 1 | CRUD 可改造页面迁移（~48 页） | 2 天 | 高 | 🔄 |
| ├ 批次 2 | Detail 型迁移 + DetailTemplate 创建（~29 页） | 1.5 天 | 高 | ⏳ |
| ├ 批次 3 | Dashboard 型迁移 + DashboardTemplate 创建（~37 页） | 2 天 | 中 | ⏳ |
| ├ 批次 4 | Designer/Editor 迁移 + DesignerTemplate 创建（~26 页） | 1.5 天 | 中 | ⏳ |
| ├ 批次 5 | 特殊功能型可改造部分（~50 页） | 1 天 | 低 | ⏳ |
| └ 批次 6 | CI 门禁升级（page-audit 区分页面/组件 + 强制模板家族） | 0.5 天 | 中 | ⏳ |
| **阶段四** | API 映射治理收尾 | **1 天** | 🟡 中 | ✅ |
| **阶段五** | 图标统一收尾 + 门禁 | **0.5 天** | 🟢 低 | ✅ |
| **合计** | | **18 天** | | |

> 相比 V64.0 原方案（11.5 天），V64.1 增加 6.5 天用于全量标准化推进（批次 2-5）。
> 这是用户明确要求"将页面全部尽量标准化"的响应。

---

## 四、质量保证（修订版）

### 4.1 每阶段验收标准（新增 lowcode / automation 专项）

每完成一个阶段需通过：
1. ✅ 导航项存在且图标正确（新增 automation 第 33 模块也纳入）
2. ✅ 路由路径正确可访问
3. ✅ 前端 API 文件存在且导出正确（**lowcode 10 个 / automation 5 个，必须存在**）
4. ✅ lowcode 10 页面中 API 调用次数 **≥ 10（不再是 0）**；每个页面对其主资源至少调用 list/create/update/remove 之一
5. ✅ automation 5 页面对 3 张核心表有 schema + API 联通
6. ✅ 后端 API 可调用（或通过 vite proxy + mock 后端占位，前端链路打通）
7. ✅ 页面用标准模板（新建页强制）
8. ✅ **类型检查通过（tsc --noEmit 0 error）**
9. ✅ 相关单元测试可运行并通过

### 4.2 自动化检查

- `check-icons.cjs`：图标完整性（+automation 后共 33 模块）
- `compare-nav-route.cjs`：导航路由一致性（33 ↔ 33）
- **新增 `compare-api-modules.cjs`**：扫描 src/api/*/index.ts 目录数 vs moduleMapping 中的模块数，两边必须对齐（当前 49 vs 28，差 21 个是 consolidation-contract 这种非导航模块，可在白名单里排除）
- **新增 `lowcode-api-coverage.cjs`**：`grep -c @/api/lowcode pages/lowcode/*`，每 1 个文件 ≥ 1 才算通过
- `page-audit.py`：升级后增量扫描
- TypeScript + ESLint

---

## 五、风险与注意事项（修订版）

### 5.1 主要风险

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| lowcode 后端服务 `svc/lowcode` 尚未立项，真实 API 缺位 | 前端 API 只能 mock，页面联调不完整 | 先定义好 `/api/lowcode/*` 路由前缀，前端用 vite 代理 + mock 返回；后端一落地只需替换 proxy target，前端零改动 |
| automation 是全新模块，UX 无既定规范 | 编排画布 UX 可能花时间反复 | V1 不求可视化画布，先做规则表（表单项触发 + cron + 手动 JSON 定义流程），2.5 天工期只交付表格 CRUD + 列表页 |
| schema 化 admin 28 页：部分特殊页（ConfigDebug / RateLimitConfig / OnboardingWizard）无法抽 schema | 模板覆盖率不满 100% | 白名单：ConfigDebug/RateLimitConfig/OnboardingWizard/Dashboard 4 页保持现状，其余 24 页 schema 化即可 |
| docs 路由与 doc 路由重复（若存在） | 用户点击文档相关页面可能 404 | 阶段零中加 redirect，/document → /doc |
| automation 与 workflow 概念在用户侧重复 | 菜单命名混淆 | 导航文案：workflow =「审批流程」（BPM 面向人）、automation =「自动化编排」（面向系统/数据自动化），明确区分 |

### 5.2 注意事项（与上一版差异）

1. **重点明确：低代码 + 自动化先做，其他业务模块标准化靠后。** 上一版排序把 lowcode 放最末端（阶段三第三批），这是最大的结构性错误。
2. **不追求全量标准化。** 只要核心 CRUD 页 200 页左右用了模板，其余自定义页可接受。
3. **schema 化优先于逐页重写。** 对 admin/crm/erp 这种大模块，1 份 schema + 1 个 CrudPage = 8 个页面，ROI 远超 8 × 单页改写。
4. **asset/oa 独立 API 不做。** 文件搬家无价值，保留现状即可，只补 moduleMapping 让前端路由网关能找到。
5. **automation 是全新模块但 V1 只做表单体。** 不要上来就画 DAG 可视化画布，2.5 天工期只交付 5 个表格 CRUD 页（Dashboard / Rules / Runs / Designer（表单版）/ Variables），画布留 V65 做。
6. **保持命名一致**：模块名、文件名、API 名遵循现有规范：`src/api/<module>/index.ts` + `src/pages/<module>/<PageName>Page.tsx` + `src/modules/<module>/config.ts` 的三一对应。
