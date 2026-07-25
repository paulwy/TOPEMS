# TOPEMS 组件迁移指南

> 本文档记录从旧组件迁移到新组件的规范，确保全平台组件使用一致性。

| 项目 | 内容 |
|------|------|
| **文档版本** | v1.0.0 |
| **创建日期** | 2026-06-24 |
| **适用范围** | apps/web/src/components/ |
| **状态** | ✅ 已完成 |

---

## 一、废弃组件清单

### 1.1 已废弃组件

| 组件路径 | 废弃时间 | 替代方案 | 迁移难度 |
|----------|----------|----------|----------|
| `components/ui/shadcn.tsx` | 2026-06-24 | 直接使用 `@mui/material` 组件 | ⭐ 简单 |
| `components/ui/Button.tsx` | 2026-06-24 | 直接使用 `@mui/material/Button` | ⭐ 简单 |
| `apps/web/src/config/navigation-v2.ts` | 2026-06-24 | `NavigationRegistry` | ⭐⭐ 中等 |

---

## 二、shadcn.tsx 迁移指南

### 2.1 组件对照表

| shadcn 组件 | MUI 替代方案 | 备注 |
|-------------|--------------|------|
| `Table` | `<Table>` + `TableBody` 等 | 直接使用 MUI 表格组件 |
| `TableBody` | `<TableBody>` | |
| `TableCell` | `<TableCell>` | |
| `TableHead` | `<TableHead>` | |
| `TableRow` | `<TableRow>` | |
| `TableHeader` | `<TableHead>` | |
| `Card` | `<Card>` | |
| `CardContent` | `<CardContent>` | |
| `CardHeader` | `<CardHeader>` | |
| `CardTitle` | `<Typography variant="h6">` | |
| `Badge` | `<Badge>` (MUI Badge) | |
| `Dialog` | `<Dialog>` | |
| `DialogContent` | `<DialogContent>` | |
| `DialogTitle` | `<DialogTitle>` | |
| `DialogActions` | `<DialogActions>` | |
| `DialogHeader` | `<Box sx={{ mb: 2 }}>` | |
| `DialogFooter` | `<Box>` | |
| `Select` | `<Select>` | |
| `SelectContent` | （移除） | 由 MUI Select 内部管理 |
| `SelectItem` | `<MenuItem>` | |
| `SelectTrigger` | `<Select>` 本身 | |
| `SelectValue` | （移除） | 由 Select 内部管理 |
| `Tabs` | `<Tabs>` | |
| `TabsList` | `<Tabs>` 内部 | |
| `TabsTrigger` | `<Tab>` | |
| `TabsContent` | `<TabPanel>` 或条件渲染 | |
| `Tooltip` | `<Tooltip>` | |
| `Label` | `<FormLabel>` | |
| `Input` | `<TextField>` 或 `<Input>` | |
| `Progress` | `<LinearProgress>` | |

### 2.2 迁移示例

#### 表格迁移

```tsx
// ❌ 旧写法
import { Table, TableBody, TableCell, TableHead, TableRow } from '@/components/ui/shadcn';

<Table>
  <TableHead>
    <TableRow>
      <TableCell>列1</TableCell>
    </TableRow>
  </TableHead>
  <TableBody>
    <TableRow>
      <TableCell>数据1</TableCell>
    </TableRow>
  </TableBody>
</Table>

// ✅ 新写法
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableRow 
} from '@mui/material';

<Table>
  <TableHead>
    <TableRow>
      <TableCell>列1</TableCell>
    </TableRow>
  </TableHead>
  <TableBody>
    <TableRow>
      <TableCell>数据1</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

#### 卡片迁移

```tsx
// ❌ 旧写法
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/shadcn';

<Card>
  <CardHeader>
    <CardTitle>标题</CardTitle>
  </CardHeader>
  <CardContent>内容</CardContent>
</Card>

// ✅ 新写法
import { Card, CardHeader, CardContent, Typography } from '@mui/material';

<Card>
  <CardHeader
    title={<Typography variant="h6">标题</Typography>}
  />
  <CardContent>内容</CardContent>
</Card>
```

#### 按钮迁移

```tsx
// ❌ 旧写法
import { Button } from '@/components/ui/Button';

<Button variant="contained">点击</Button>

// ✅ 新写法
import { Button } from '@mui/material';

<Button variant="contained">点击</Button>
```

---

## 三、导航配置迁移指南

### 3.1 从 navigation-v2.ts 迁移到 NavigationRegistry

| 旧 API | 新 API |
|--------|--------|
| `topNavItems` 静态导入 | `navigationRegistry.getTopNavItems()` 动态获取 |
| `pluginNavigation` 静态配置 | `navigationRegistry.register()` 动态注册 |
| `NavigationItem` 类型 | `NavItem` 类型 |
| `title` 字段 | `label` 字段 |
| `isGroup` 字段 | （已移除）多列平铺自动处理 |

### 3.2 迁移示例

```tsx
// ❌ 旧写法
import { topNavItems } from '@/config/navigation-v2';

const items = topNavItems;

// ✅ 新写法
import { useEffect, useState } from 'react';
import { navigationRegistry, NavItem } from '@/lib/NavigationRegistry';

const [items, setItems] = useState<NavItem[]>([]);

useEffect(() => {
  const updateItems = () => setItems(navigationRegistry.getTopNavItems());
  updateItems();
  navigationRegistry.emitter.on('navigationUpdated', updateItems);
  return function cleanup() {
    navigationRegistry.emitter.off('navigationUpdated', updateItems);
  };
}, []);
```

---

## 四、组件使用规范

### 4.1 图标使用

| 用途 | 规范 |
|------|------|
| 推荐 | `lucide-react` 图标 |
| 废弃 | `@mui/icons-material` |
| 废弃 | 自定义 SVG 图标 |

### 4.2 样式编写

| 推荐 | 不推荐 |
|------|--------|
| MUI `sx` prop | Tailwind CSS |
| Styled Components | inline style |
| 主题变量 | 硬编码颜色值 |

### 4.3 类型导入

```tsx
// ✅ 推荐
import type { NavItem } from '@/lib/NavigationRegistry';
import type { ModuleCardConfig } from '@/lib/NavigationRegistry';

// ❌ 避免
import { NavItem } from '@/lib/NavigationRegistry';  // 仅在需要默认值时
```

---

## 五、迁移检查清单

### 5.1 代码检查

- [x] 无 `components/ui/shadcn.tsx` 引用 ✅
- [x] 无 `components/ui/Button.tsx` 引用 ✅
- [x] 无 `navigation-v2.ts` 引用 ✅
- [x] 所有图标从 `lucide-react` 导入 ✅
- [x] 所有样式使用 `sx` 或 styled ✅
- [x] 所有颜色使用主题变量 ✅

### 5.2 TypeScript 检查

- [x] 无 `any` 类型滥用 ✅
- [x] 所有导航相关类型使用 `NavItem` / `ModuleCardConfig` ✅
- [x] 事件监听器正确清理 ✅

### 5.3 功能检查

- [x] TopNav 动态响应导航更新 ✅
- [x] Sidebar 按模块正确过滤 ✅
- [x] 移动端导航正常工作 ✅
- [x] 面包屑导航正确生成 ✅
- [x] 权限过滤正常工作 ✅

---

## 六、常见问题

### Q1: 为什么要废弃 shadcn.tsx？

**A**: shadcn.tsx 是一组 shadcn/ui 风格的封装组件，但实际是基于 MUI 实现的简单包装。这层包装：
1. 增加了维护成本
2. 与 MUI 原生组件存在 API 差异
3. 容易导致文档/实际不一致
4. 阻碍 MUI 版本升级

直接使用 `@mui/material` 组件可以：
- 减少学习成本（一个组件库）
- 更快升级 MUI 版本
- 减少抽象层，提升性能

### Q2: NavigationRegistry 与 navigation-v2.ts 的关系？

**A**: 
- **navigation-v2.ts**: 静态配置文件，硬编码在代码中
- **NavigationRegistry**: 动态注册中心，支持插件运行时注册

所有静态配置应逐步迁移到 `NavigationRegistry`，实现：
- 插件动态注册
- 事件驱动更新
- 统一权限过滤

### Q3: 插件如何注册导航？

**A**: 使用 `PluginLifecycleManager`：

```typescript
import { pluginLifecycleManager } from '@/lib/PluginLifecycleManager';

await pluginLifecycleManager.loadPlugin('my-plugin', {
  code: 'my-plugin',
  name: '我的插件',
  version: '1.0.0',
  navConfig: {
    top_nav: [
      { code: 'my-plugin', label: '我的插件', icon: 'Box', path: '/my-plugin', order: 10 }
    ],
    sidebar_nav: [
      { code: 'my-plugin-home', label: '首页', icon: 'Home', path: '/my-plugin' }
    ],
    module_card: {
      code: 'my-plugin',
      name: '我的插件',
      icon: 'Box',
      path: '/my-plugin',
      status: 'online',
    },
  },
});
```

---

## 七、迁移路线图

### 阶段一：标记废弃（已完成 ✅）

- [x] 标记 `shadcn.tsx` 为 `@deprecated`
- [x] 标记 `Button.tsx` 为 `@deprecated`
- [x] 标记 `navigation-v2.ts` 为 `@deprecated`
- [x] 编写迁移指南

### 阶段二：迁移核心组件（已完成 ✅）

- [x] 迁移 `MobileHeader` ✅
- [x] 迁移 `ExportButton` ✅
- [x] 迁移 `MobileNav` ✅
- [x] 迁移其他使用废弃组件的代码 ✅

### 阶段三：删除废弃文件（已完成 ✅）

- [x] 确认无引用后删除 `shadcn.tsx`
- [x] 确认无引用后删除 `Button.tsx`
- [x] 确认无引用后删除 `navigation-v2.ts`（已在前期删除）

---

## 相关文档

- [UI 设计规范](../ui-design-spec.md)
- [导航设计文档](../ui-navigation-design.md)
- [TODO.md](../../../TODO.md)
