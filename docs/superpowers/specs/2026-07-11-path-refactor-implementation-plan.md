# 路径重构实施方案

| 项目 | 内容 |
|------|------|
| **文档版本** | v1.0.0 |
| **创建日期** | 2026-07-11 |
| **状态** | 待实施（hrm 试点已完成） |
| **关联设计** | [2026-07-11-unified-route-nav-design.md](./2026-07-11-unified-route-nav-design.md) |
| **关联 TODO** | [docs/TODO.md](../../TODO.md) V5.8 阶段 |

---

## 一、背景与目标

### 1.1 问题根因

死链的根因是路径在 3 处重复定义，导致修改一处时其他两处不同步：

1. `apps/web/src/routes/v2/*.ts` — 路由配置（30 个文件）
2. `apps/web/src/lib/navigation/modules/*.nav.ts` — 导航配置（30 个文件）
3. 组件中硬编码路径字符串（约 200 处）

此外，`apps/web/src/routes/compatibility.tsx`（2276 行、233 条重定向规则）在新系统未部署的场景下纯属冗余。

### 1.2 目标

- **消除路径重复定义**：每个模块一个 `config.ts`，路径常量作为唯一真相源
- **消除硬编码路径**：组件中 100% 引用路径常量
- **删除 compatibility.tsx**：全部模块迁移完成后删除
- **死链归零**：通过路径常量机制从根本上避免死链
- **命名统一**：列表页复数、详情页 `/:id`、创建页 `/create`、编辑页 `/:id/edit`

### 1.3 试点验证结果

hrm 模块已完成试点迁移，验证了方案的可行性：

- 创建 [modules/hrm/config.ts](../../../apps/web/src/modules/hrm/config.ts)（合并原 `routes/v2/hrm.ts` + `lib/navigation/modules/hrm.nav.ts`）
- 定义 `HRM_PATHS` 路径常量（21 个路径）
- 更新 6 个 hrm 页面组件引用路径常量
- 删除原 `routes/v2/hrm.ts`（294 行）和 `lib/navigation/modules/hrm.nav.ts`（180 行）
- TypeScript 编译通过

---

## 二、技术规范

### 2.1 目录结构规范

```
apps/web/src/modules/{module}/
├── config.ts          # 统一配置（路径常量 + 路由配置 + 导航配置）
├── pages/             # （可选）模块私有页面
└── components/        # （可选）模块私有组件
```

> 路由配置文件 `routes/v2/*.ts` 和导航配置文件 `lib/navigation/modules/*.nav.ts` 合并为 `modules/{module}/config.ts`，原文件迁移完成后删除。

### 2.2 config.ts 文件规范

每个模块的 `config.ts` 必须包含三部分，顺序固定：

```typescript
import { lazyWithRetry } from '@/routes/utils';
import type { RouteModuleConfig } from '@/routes/v2/types';
import type { ModuleNavConfig } from '@/lib/navigation/types';

// ---- 第一部分：路径常量（唯一真相源） ----
export const {MODULE}_PATHS = {
  root: '/{module}',
  dashboard: '/{module}/dashboard',
  {plural}: '/{module}/{plural}',
  {singular}Create: '/{module}/{plural}/create',
  {singular}Detail: '/{module}/{plural}/:id',
  {singular}Edit: '/{module}/{plural}/:id/edit',
  // ...
} as const;

// ---- 第二部分：路由配置（供路由系统使用） ----
export const {module}ModuleConfig: RouteModuleConfig = {
  code: '{module}',
  name: '{模块名}',
  icon: '{IconName}',
  path: {MODULE}_PATHS.root,
  source: 'core' | 'plugin',
  suite: '{suite}' | undefined,
  status: 'online',
  order: {n},
  description: '{描述}',
  permission: '{module}:read',
  routes: [
    {
      path: {MODULE}_PATHS.dashboard,
      element: lazyWithRetry(() => import('@/pages/{module}/XxxPage'), 'XxxPage'),
      module: '{module}',
      code: '{module}-dashboard',
      title: '仪表盘',
      template: 'dashboard',
      group: 'overview',
      requiredPermissions: ['{module}:read'],
    },
    // 详情页/创建页/编辑页 不需要出现在导航中，但仍需注册路由
    // ...
  ],
};

// ---- 第三部分：导航配置（供导航注册表使用） ----
export const {module}NavConfig: ModuleNavConfig = {
  code: '{module}',
  name: '{模块名}',
  icon: '{IconName}',
  path: {MODULE}_PATHS.root,
  permission: '{module}:read',
  source: 'core' | 'plugin',
  suite: '{suite}' | undefined,
  status: 'online',
  order: {n},
  description: '{描述}',
  navItems: [
    {
      code: '{module}-dashboard',
      label: '仪表盘',
      icon: 'LayoutDashboard',
      path: {MODULE}_PATHS.dashboard,
      permission: '{module}:read',
      order: 0,
      group: 'overview',
      showInTabs: true,
      description: '{描述}',
    },
    // 仅需要在导航中展示的页面才出现在 navItems 中
    // 详情页/创建页/编辑页 通常不出现在 navItems 中
  ],
};
```

### 2.3 路径命名规范

| 场景 | 规则 | 示例 |
|------|------|------|
| 模块根 | `/{module}` | `/hrm` |
| 仪表盘 | `/{module}/dashboard` | `/hrm/dashboard` |
| 概览页 | `/{module}/overview` | `/hrm/overview` |
| 列表页 | `/{module}/{plural}` | `/hrm/employees` |
| 详情页 | `/{module}/{plural}/:id` | `/hrm/employees/:id` |
| 创建页 | `/{module}/{plural}/create` | `/hrm/employees/create` |
| 编辑页 | `/{module}/{plural}/:id/edit` | `/hrm/employees/:id/edit` |
| 子资源列表 | `/{module}/{plural}/:id/{subPlural}` | `/hrm/employees/:id/contracts` |
| 设置页 | `/{module}/settings` | `/hrm/settings` |
| 报表页 | `/{module}/reports` | `/hrm/reports` |

**命名原则：**

- 列表页资源名用**复数**（`employees` 而非 `employee`）
- 动态参数用 `:id`（React Router v6 语法）
- 创建页用 `create`（不是 `new`）
- 编辑页用 `/:id/edit`
- 路径全小写，多词用连字符（`salary-adjustment` 而非 `salaryAdjustment`）

### 2.4 路径常量命名规范

```typescript
export const {MODULE}_PATHS = {
  root:              '/{module}',                    // 模块根
  dashboard:         '/{module}/dashboard',           // 仪表盘
  overview:          '/{module}/overview',            // 概览
  {plural}:          '/{module}/{plural}',            // 列表页（复数）
  {singular}Create:  '/{module}/{plural}/create',     // 创建页（单数 + Create）
  {singular}Detail:  '/{module}/{plural}/:id',        // 详情页（单数 + Detail）
  {singular}Edit:    '/{module}/{plural}/:id/edit',   // 编辑页（单数 + Edit）
  reports:           '/{module}/reports',             // 报表
  settings:          '/{module}/settings',            // 设置
} as const;
```

**命名原则：**

- 常量名用**大驼峰**（`employeeDetail` 而非 `EMPLOYEE_DETAIL`）
- 列表页用复数名词（`employees`）
- 详情/创建/编辑用单数 + 后缀（`employeeDetail`、`employeeCreate`、`employeeEdit`）
- 必须以 `as const` 断言，确保类型为字面量类型

### 2.5 组件引用规范

```typescript
// ✅ 正确：引用路径常量
import { HRM_PATHS } from '@/modules/hrm/config';

// 列表页跳转
navigate(HRM_PATHS.employees);

// 动态参数替换
navigate(HRM_PATHS.employeeDetail.replace(':id', id));

// backHref
<PageContainerV2 backHref={HRM_PATHS.employees} />

// ❌ 错误：硬编码路径
navigate('/hrm/employees');
navigate(`/hrm/employees/${id}`);
backHref='/hrm/employees'
```

**动态参数替换辅助函数（可选）：**

如果模块中动态参数较多，可在 `config.ts` 中添加辅助函数：

```typescript
export const buildHrmPath = {
  employeeDetail: (id: string) => HRM_PATHS.employeeDetail.replace(':id', id),
  employeeEdit: (id: string) => HRM_PATHS.employeeEdit.replace(':id', id),
  contractDetail: (id: string) => HRM_PATHS.contractDetail.replace(':id', id),
};
```

### 2.6 路由加载器集成规范

迁移后的模块需要在以下 3 处更新导入路径：

**1. `routes/v2/index.ts`**（模块加载入口）：

```typescript
const moduleImports: Record<string, () => Promise<{ [key: string]: RouteModuleConfig }>> = {
  // ...
  {module}: () => import('@/modules/{module}/config').then(m => ({ {module}ModuleConfig: m.{module}ModuleConfig })),
  // ...
};
```

**2. `routes/v2/dynamic.ts`**（动态路由）：

```typescript
{module}: () => import('@/modules/{module}/config').then(m => ({ {module}ModuleConfig: m.{module}ModuleConfig })),
```

**3. `routes/v2/lazyLoader.ts`**（懒加载器）：

```typescript
{module}: () => import('@/modules/{module}/config').then(m => ({ {module}ModuleConfig: m.{module}ModuleConfig })),
```

**4. `lib/navigation/modules/index.ts`**（导航注册表）：

```typescript
import { {module}NavConfig } from '@/modules/{module}/config';

export const coreModuleNavConfigs: ModuleNavConfig[] = [
  // ...
  {module}NavConfig,
  // ...
];
```

---

## 三、迁移计划

### 3.1 模块清单与分批策略

共 31 个模块（hrm 已完成试点，剩余 30 个），按依赖关系和复杂度分 5 个 Wave：

#### Wave 1：核心基础模块（5 个）

| 序号 | 模块 | 路由文件行数 | 导航文件行数 | 说明 |
|------|------|-------------|-------------|------|
| 1 | iam | ~250 | ~150 | 身份认证，被所有模块依赖 |
| 2 | admin | ~300 | ~180 | 系统管理 |
| 3 | workflow | ~200 | ~120 | 工作流引擎 |
| 4 | notification | ~100 | ~80 | 通知中心 |
| 5 | doc | ~150 | ~100 | 文档服务 |

#### Wave 2：核心扩展模块（5 个）

| 序号 | 模块 | 路由文件行数 | 导航文件行数 | 说明 |
|------|------|-------------|-------------|------|
| 6 | monitor | ~120 | ~80 | 监控中心 |
| 7 | integration | ~100 | ~60 | 集成服务 |
| 8 | ai | ~150 | ~90 | AI 助手 |
| 9 | mobile | ~200 | ~130 | 移动端 |
| 10 | report | ~130 | ~80 | 报表中心 |

#### Wave 3：业务模块-标准（7 个）

| 序号 | 模块 | 路由文件行数 | 导航文件行数 | 说明 |
|------|------|-------------|-------------|------|
| 11 | crm | ~280 | ~160 | 客户管理 |
| 12 | scm | ~250 | ~140 | 供应链管理 |
| 13 | wms | ~220 | ~130 | 仓储管理 |
| 14 | pm | ~300 | ~170 | 项目管理 |
| 15 | pdm | ~200 | ~120 | 产品数据管理 |
| 16 | srm | ~180 | ~100 | 供应商管理 |
| 17 | rs | ~200 | ~110 | 研发管理 |

#### Wave 4：业务模块-复杂（7 个）

| 序号 | 模块 | 路由文件行数 | 导航文件行数 | 说明 |
|------|------|-------------|-------------|------|
| 18 | erp | ~350 | ~200 | 企业资源计划（最大） |
| 19 | mes | ~280 | ~160 | 制造执行系统 |
| 20 | finance | ~320 | ~180 | 财务管理 |
| 21 | qms | ~240 | ~140 | 质量管理 |
| 22 | lims | ~220 | ~130 | 实验室管理 |
| 23 | ehs | ~200 | ~120 | 环境健康安全 |
| 24 | gis | ~260 | ~150 | 地理信息系统 |

#### Wave 5：辅助模块（6 个）

| 序号 | 模块 | 路由文件行数 | 导航文件行数 | 说明 |
|------|------|-------------|-------------|------|
| 25 | oa | ~180 | ~100 | 办公自动化 |
| 26 | lowcode | ~150 | ~90 | 低代码平台 |
| 27 | asset | ~160 | ~95 | 资产管理 |
| 28 | bi | ~140 | ~85 | 商业智能 |
| 29 | im | ~120 | ~70 | 即时通讯 |
| 30 | plugin | ~100 | ~60 | 插件管理 |

### 3.2 单模块迁移 SOP

每个模块的迁移严格按以下步骤执行：

```
Step 1: 创建 modules/{module}/config.ts
  ├─ 从 routes/v2/{module}.ts 提取路由配置
  ├─ 从 lib/navigation/modules/{module}.nav.ts 提取导航配置
  ├─ 提取所有路径为 {MODULE}_PATHS 常量
  └─ 路由配置和导航配置中的 path 字段引用常量

Step 2: 更新路由加载器（3 处）
  ├─ routes/v2/index.ts: 导入指向 @/modules/{module}/config
  ├─ routes/v2/dynamic.ts: 导入指向 @/modules/{module}/config
  └─ routes/v2/lazyLoader.ts: 导入指向 @/modules/{module}/config

Step 3: 更新导航注册表
  └─ lib/navigation/modules/index.ts: 导入指向 @/modules/{module}/config

Step 4: 更新页面组件引用路径常量
  ├─ 搜索 pages/{module}/*.tsx 中所有硬编码路径
  ├─ 替换为 {MODULE}_PATHS.xxx
  ├─ 动态参数用 .replace(':id', id)
  └─ backHref 也替换为常量引用

Step 5: 删除旧文件
  ├─ 删除 routes/v2/{module}.ts
  └─ 删除 lib/navigation/modules/{module}.nav.ts

Step 6: 验证
  ├─ TypeScript 编译通过 (pnpm tsc --noEmit)
  ├─ 死链检测脚本通过 (python scripts/check-route-paths.py)
  └─ 前端构建通过 (pnpm build)
```

### 3.3 compatibility.tsx 删除计划

> ✅ **已完成**：`compatibility.tsx` 已在 V5.8 阶段删除。以下为历史记录。

`compatibility.tsx`（2276 行、233 条重定向）的删除时机：

1. **全部 30 个模块迁移完成后**，执行删除
2. 删除前确认 `App.tsx` 中不再引用 compatibility 路由
3. 运行死链检测脚本，确认无路径依赖 compatibility 重定向
4. 删除后再次运行全量验证

---

## 四、验收标准

### 4.1 单模块验收标准

每个模块迁移完成后，必须满足以下全部条件：

| 序号 | 验收项 | 验收标准 | 验证方法 |
|------|--------|---------|---------|
| 1 | TypeScript 编译 | 0 错误 | `cd apps/web && pnpm tsc --noEmit` |
| 2 | 死链检测 | 0 死链 | `python scripts/check-route-paths.py` |
| 3 | 路径常量覆盖率 | 100%（组件中无硬编码路径） | Grep 搜索 `'/\{module\}/` 字面量 |
| 4 | config.ts 结构 | 包含 PATHS + ModuleConfig + NavConfig | 人工审查 |
| 5 | 旧文件删除 | routes/v2/{module}.ts 和 .nav.ts 已删除 | 文件不存在 |
| 6 | 导入路径更新 | index.ts/dynamic.ts/lazyLoader.ts/nav index.ts 已更新 | Grep 验证 |

### 4.2 整体验收标准

全部模块迁移完成后，必须满足以下条件：

| 序号 | 验收项 | 验收标准 | 验证方法 |
|------|--------|---------|---------|
| 1 | 模块迁移完成数 | 31/31（含 hrm 试点） | 文件计数 |
| 2 | compatibility.tsx | 已删除 | 文件不存在 |
| 3 | routes/v2/*.ts | 仅剩 index.ts/dynamic.ts/lazyLoader.ts/types.ts | Glob 验证 |
| 4 | lib/navigation/modules/*.nav.ts | 0 个文件 | Glob 验证 |
| 5 | 硬编码路径数 | 0 处（组件中） | `python scripts/check-route-paths.py --hardcoded` |
| 6 | 死链数 | 0 | `python scripts/check-route-paths.py` |
| 7 | TypeScript 编译 | 0 错误 | `pnpm tsc --noEmit` |
| 8 | 前端构建 | 成功 | `pnpm build` |
| 9 | 路径命名规范 | 100% 符合 | `python scripts/check-route-paths.py --naming` |
| 10 | 路径常量覆盖率 | 100% | `python scripts/check-route-paths.py --coverage` |

### 4.3 CI 集成验收

路径校验脚本已集成到 CI pipeline，每次提交自动运行：

```yaml
# .github/workflows/frontend.yml（示例片段）
- name: Route path validation
  run: python scripts/check-route-paths.py --ci
```

CI 校验失败将阻止合并。

---

## 五、风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 动态参数替换遗漏 | 运行时 404 | 路径校验脚本检测 `:id` 残留 |
| 导入路径更新遗漏 | 编译失败 | TypeScript 编译会立即报错 |
| 导航配置遗漏 | 侧边栏菜单缺失 | 运行时人工验证 + 校验脚本 |
| compatibility.tsx 提前删除 | 旧路径 404 | 必须全部模块迁移完成后才删除 |
| 路径命名冲突 | 路由匹配异常 | 校验脚本检测重复路径 |

---

## 六、回滚方案

如果迁移出现问题，回滚步骤：

1. **单模块回滚**：从 git 恢复 `routes/v2/{module}.ts` 和 `lib/navigation/modules/{module}.nav.ts`，恢复导入路径
2. **整体回滚**：`git revert` 迁移 commit，恢复 `compatibility.tsx`

每个 Wave 完成后创建一个 git commit，便于按 Wave 粒度回滚。

---

## 七、附录

### 7.1 hrm 试点参考文件

- 配置文件：[modules/hrm/config.ts](../../../apps/web/src/modules/hrm/config.ts)
- 页面示例：[pages/hrm/HrmEmployeeDetailPage.tsx](../../../apps/web/src/pages/hrm/HrmEmployeeDetailPage.tsx)

### 7.2 校验脚本

- 路径校验脚本：[scripts/check-route-paths.py](../../../scripts/check-route-paths.py)

### 7.3 相关文档

- 设计文档：[2026-07-11-unified-route-nav-design.md](./2026-07-11-unified-route-nav-design.md)
- 代码规范：[docs/guides/development/code-standards.md](../../guides/development/code-standards.md)（新增"路径规范"章节）
- 导航设计：[docs/guides/ui/ui-navigation-design.md](../../guides/ui/ui-navigation-design.md)（新增"统一配置"章节）
