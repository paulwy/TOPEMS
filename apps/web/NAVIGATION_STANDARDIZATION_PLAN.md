# 全栈导航与页面标准化实施方案（修订版 V64.0）

> 审计基准日期：2026-08-05 | 对应版本：V63.9 → V64.0+
> 上一版（历史快照）文档编号 V0，本版为 V1（基于真实代码库重新审计后全面重写）

> **实施进度（2026-08-05 更新）**
> - ✅ 阶段零：收尾完成（asset/oa moduleMapping 补全 + docs 重名清理）
> - ✅ 阶段一：lowcode API 补全完成（10 文件 + 10 页面接入 + vite proxy + tsc 0 error）
> - ✅ 阶段二：automation 新模块落地完成（5 页面 + API + 模块注册 + 类型检查通过）
> - ✅ 阶段三：页面标准化完成（8 大模块典范页 + 3 个 CI 审计脚本 + pre-commit 集成）
> - ✅ 阶段四：API 映射治理收尾完成（plugin API 去 /v1/ 前缀 + apiPath.ts 同步 moduleMapping + 测试修复）
> - ✅ 阶段五：图标统一收尾完成（iconMapping 补全 9 + 14 = 23 个缺失图标 + check-icons.cjs 门禁 + tsc 0 error）
> - ✅ 阶段五补充：admin 8 个核心 CRUD 页 schema 化验证完成（User/Role/Permission/Account/BankAccount/Dictionary/Plugin/Migration 已用 CrudPage）

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

### 阶段三：页面标准化（增量策略，中优先级，5 天）

#### 3.1 策略大调整：**放弃全量标准化 → Schema 驱动 + 增量治理**

| 原则 | 说明 |
|------|------|
| **存量不强制重写** | 420 个自定义页面只要能用、没 Bug，不因为「标准化」单独改。标准化率目标从 100% 调到 **40%（约 208 页）即可** |
| **增量强制模板** | 从 V64.0 起：所有**新建**的 CRUD 页面必须使用 ListPageTemplate + CrudPage + schema 定义，不允许手写自定义列表。CI 加检查。 |
| **触达重写（在该的页面强制）** | 只要修改某页面逻辑，**顺手**改为标准模板（不在 Bug 修复外的单开 PR） |
| **Schema 优先** | 对**一个模块 8 页以上的大模块**（admin / crm / erp / finance / hrm / mes / wms / qms / lims / rd），优先抽 schema 注册表，用一张 schema + 一个 CrudPage 自动生成 6-8 个 CRUD 页，代替 6-8 个独立 tsx |

#### 3.2 5 天分批实施清单（只做 10% 高 ROI 页面）

**第一批（Day 1-2，schema 化模板）：**
- **admin 模块（28 页抽出 schema）**：当前 28 页都是独立页，可抽 15 个独立 schema（UserSchema/RoleSchema/PermissionSchema/TenantSchema/DictSchema/MonitorSchema 等），用标准 CrudPage 渲染。**减少 13 个重复文件**
- **iam 模块 schema 对齐 admin**：iam 4 页已存在但 admin 也有同功能，合并 schema 源

**第二批（Day 3-4，8 大模块各挑 1 页做标准化典范）：**
- crm: CustomerManagementPage → CrudPage
- erp: SupplierManagementPage → CrudPage
- finance: FinancePaymentPage → CrudPage
- hrm: HrmAttendancePage → CrudPage
- mes: EquipmentManagementPage → CrudPage
- wms: WarehouseManagementPage → CrudPage
- qms: QmsInspectionPage → CrudPage
- rd: RsExperimentListPage → CrudPage

**第三批（Day 5，CI 门禁 + 审计脚本升级）：**
- 升级 `page-audit.py`：额外扫描 pages/* 是否 import 了 `ListPageTemplate/CrudPage`，对**新建未超 30 天但没用模板**的页面发告警
- pre-commit 增加脚本：`git diff --name-only` 中包含 `pages/**/*.tsx` 新建文件时，检查模板使用

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

## 三、实施顺序与时间估算（总 11.5 天，原方案 15.5 天 → 节省 4 天）

| 阶段 | 工作内容 | 工作量 | 优先级 |
|------|---------|--------|--------|
| **阶段零** | 遗留小修收尾（asset/oa 映射 + docs 重名） | **0.5 天** | 中 |
| **阶段一** | **🚀 lowcode API 补全（10 文件 × CRUD + 10 页面接入）** | **2 天** | 🔴 最高 |
| **阶段二** | **🚀 automation 新模块落地 + 家族四兄弟联动** | **2.5 天** | 🔴 最高 |
| **阶段三** | 页面标准化（schema 化 admin/iam + 8 大模块典范页 + CI 门禁） | **5 天** | 🟡 中 |
| **阶段四** | API 映射治理收尾 | **1 天** | 🟡 中 |
| **阶段五** | 图标统一收尾 + 门禁 | **0.5 天** | 🟢 低 |
| **合计** | | **11.5 天** | |

节省 4 天来自：撤销 asset/oa 独立 API（2 天）、撤销页面标准化 60 页全量重写（约 10 天？不，是改用 schema 策略实际上 5 天就能做完典范和门禁，上一版写 12 天有水分，真实缩减约 6-8 天。但我们多了 automation 新模块 2.5 天，净节省约 4 天）。

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
