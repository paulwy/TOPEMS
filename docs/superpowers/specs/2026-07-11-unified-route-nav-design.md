# 统一路由导航配置设计

## 目标

将路由配置、导航配置、路径常量合并为每个模块一个配置文件，消除路径重复定义，删除 compatibility.tsx（2276 行），从根源上避免死链。

## 当前问题

1. **路径定义在 3 处重复**：routes/v2/*.ts、lib/navigation/modules/*.nav.ts、组件中硬编码
2. **compatibility.tsx 2276 行、233 条重定向**：系统未部署，纯冗余
3. **路径命名不一致**：单复数混用、详情页格式不统一
4. **RouteModuleConfig 和 ModuleNavConfig 8 个字段重复**

## 设计

### 统一配置文件

每个模块一个 `config.ts`，包含路径常量和统一配置：

```typescript
// modules/hrm/config.ts
export const HRM_PATHS = {
  root: '/hrm',
  dashboard: '/hrm/dashboard',
  employees: '/hrm/employees',
  employeeCreate: '/hrm/employees/create',
  employeeDetail: '/hrm/employees/:id',
  employeeEdit: '/hrm/employees/:id/edit',
  // ...
} as const;

export const hrmModule: ModuleConfig = {
  code: 'hrm', name: '人力资源', icon: 'Users', path: HRM_PATHS.root,
  // ...
  routes: [
    {
      path: HRM_PATHS.employees,
      element: lazyWithRetry(...),
      title: '员工管理', icon: 'User', template: 'list', group: 'business',
      permission: 'hrm:employee:read',
      nav: { showInTabs: true, showInSidebar: true, order: 1 },
    },
    // 详情页不显示在导航中
    {
      path: HRM_PATHS.employeeDetail,
      element: lazyWithRetry(...),
      title: '员工详情', template: 'detail',
      nav: { showInSidebar: false, showInBreadcrumb: true },
    },
  ],
};
```

### 组件引用路径常量

```typescript
// 之前
navigate('/hrm/employees');
navigate(`/hrm/employees/${id}`);
backHref='/hrm/employees'

// 之后
import { HRM_PATHS } from '@/modules/hrm/config';
navigate(HRM_PATHS.employees);
navigate(HRM_PATHS.employeeDetail.replace(':id', id));
backHref={HRM_PATHS.employees}
```

### 路径命名规范

| 场景 | 规则 | 示例 |
|------|------|------|
| 模块根 | `/{module}` | `/hrm` |
| 仪表盘 | `/{module}/dashboard` | `/hrm/dashboard` |
| 列表页 | `/{module}/{plural}` | `/hrm/employees` |
| 详情页 | `/{module}/{plural}/:id` | `/hrm/employees/:id` |
| 创建页 | `/{module}/{plural}/create` | `/hrm/employees/create` |
| 编辑页 | `/{module}/{plural}/:id/edit` | `/hrm/employees/:id/edit` |

### 试点范围（hrm 模块）

1. 创建 `modules/hrm/config.ts`（合并 routes/v2/hrm.ts + lib/navigation/modules/hrm.nav.ts）
2. 创建 `config/paths.ts`（聚合所有模块路径常量）
3. 更新路由加载器导入 hrm 配置
4. 更新导航注册表导入 hrm 配置
5. 更新 hrm 相关页面组件引用路径常量
6. 删除旧的 routes/v2/hrm.ts 和 lib/navigation/modules/hrm.nav.ts

### 消除的内容

- routes/compatibility.tsx（2276 行）
- lib/navigation/modules/*.nav.ts（29 个文件，合并后删除）
- routes/v2/*.ts（37 个文件，合并后删除）
- 组件中硬编码路径字符串（~200 处）

## 后续推广

hrm 试点验证后，逐模块迁移其余 30 个模块，最终删除 compatibility.tsx。

> 详细实施方案见 [2026-07-11-path-refactor-implementation-plan.md](./2026-07-11-path-refactor-implementation-plan.md)

## 验收标准

| 维度 | 指标 | 目标值 |
|------|------|--------|
| 模块迁移完成数 | 31/31 | 100% |
| compatibility.tsx | 已删除 | ✅ |
| 硬编码路径数 | 组件中 | 0 |
| 死链数 | 全项目 | 0 |
| 路径常量覆盖率 | 已迁移模块 | 100% |
| TypeScript 编译 | 0 错误 | ✅ |
| CI 集成 | check-route-paths.py | ✅ |

## 技术规范摘要

- **路径常量**：`{MODULE}_PATHS as const`，唯一真相源
- **命名**：列表页复数、详情页 `/:id`、创建页 `/create`、编辑页 `/:id/edit`
- **组件引用**：`import { HRM_PATHS } from '@/modules/hrm/config'`，禁止硬编码
- **校验脚本**：`python scripts/check-route-paths.py --ci`
