# TOPEMS 设计系统文档

## 概述

TOPEMS 采用 **MUI (Material UI)** 作为唯一的 UI 方案。本文档定义了统一的设计规范和组件使用指南。

## 🎉 样式系统迁移完成

**2026年6月21日** - 项目已完成从 Tailwind CSS + MUI 混合使用到纯 MUI 样式系统的迁移。

### 迁移概要

| 项目 | 迁移前 | 迁移后 |
|------|--------|--------|
| UI 方案 | MUI + Tailwind CSS | MUI (唯一) |
| 样式定义 | Tailwind className + sx prop | 统一的 sx prop |
| 布局方案 | Tailwind 工具类 | MUI Box + sx |
| 组件库 | 混合使用 | MUI 统一 |
| 维护性 | 需要维护两套样式系统 | 统一维护 |

### 迁移范围

已迁移 **39 个核心文件**，包括：

**核心组件：**
- ✅ App.tsx - 页面加载器
- ✅ Sidebar.tsx - 侧边栏导航
- ✅ HeroSection.tsx - 仪表盘 Hero 区域

**GIS 地图组件（15 个）：**
- ✅ MapView.tsx - 主地图组件
- ✅ Map3DView.tsx - 3D 地图视图
- ✅ HeatmapLayer.tsx - 热力图层
- ✅ DeviceTrackPanel.tsx - 设备轨迹面板
- ✅ 其他 MapModule、TrackModule、EvidenceModule 组件

**Dashboard 和 UI 组件（5 个）：**
- ✅ Loading.tsx - 加载组件
- ✅ LazyImage.tsx - 图片懒加载
- ✅ ModuleStatsCard.tsx - 统计卡片
- ✅ DashboardHeader.tsx - 仪表盘头部
- ✅ MobileMenu.tsx - 移动端菜单

**业务组件（15 个）：**
- ✅ ExportModal.tsx - 导出弹窗
- ✅ EnhancedExportModal.tsx - 增强导出
- ✅ WorkflowDesigner.tsx - 工作流设计器
- ✅ ToastProvider.tsx - 提示提供者
- ✅ Chart 组件、Template 组件、HRM 组件、PM 组件等

## UI 技术栈

| 技术 | 版本 | 用途 | 状态 |
|------|------|------|------|
| MUI | v9.1.1 | 主 UI 组件库（全应用统一） | ✅ 唯一使用 |
| Emotion | v11.x | CSS-in-JS (MUI 内置) | ✅ 使用中 |
| Lucide React | v1.x | 图标库（全应用统一） | ✅ 使用中 |

## Token Architecture（设计令牌架构）

TOPEMS 采用三层令牌架构，确保设计值的单一数据源和跨平台一致性。

```
Layer 1 (Single Source of Truth)
  apps/web/src/theme/tokens.ts        ← TypeScript 令牌定义（唯一真实来源）
      │
      ├── scripts/generate-tokens.ts   ← 自动同步脚本
      │
      ├──→ Layer 2
      │    apps/web/src/index.css       ← CSS 自定义属性（由 generate-tokens.ts 从 tokens.ts 生成）
      │
      └──→ Layer 3
           packages/shared-constants/src/colors.ts  ← TS 常量（由 generate-tokens.ts 从 tokens.ts 生成）
```

### 各层职责

| 层级 | 文件 | 格式 | 消费者 |
|------|------|------|--------|
| Layer 1 | `apps/web/src/theme/tokens.ts` | TypeScript 对象 | Layer 2、Layer 3 的生成来源 |
| Layer 2 | `apps/web/src/index.css` | CSS `:root` 自定义属性 | 前端组件（`var(--xxx)`） |
| Layer 3 | `packages/shared-constants/src/colors.ts` | TypeScript `const` | 后端/跨应用运行时使用 |

### 自动同步

修改令牌时，只需编辑 `apps/web/src/theme/tokens.ts`，然后运行：

```bash
pnpm run generate-tokens
# 或直接执行
npx tsx scripts/generate-tokens.ts
```

该脚本会自动同步 Layer 2（CSS 变量）和 Layer 3（TS 常量），确保三层始终一致。

## 组件使用规范

### 1. 优先使用 MUI 组件

```tsx
// ✅ 推荐
import { Button, TextField, Card, Dialog, Chip } from "@mui/material";

// ⚠️ 迁移中：部分页面仍在使用 shadcn/ui
import { Button } from "@/components/ui/button";
```

### 1.1 组件属性映射

| 属性 | MUI 值 | shadcn/ui 值 |
|------|--------|-------------|
| variant (Button) | "text", "outlined", "contained" | "ghost", "outline", "default", "secondary", "destructive", "link" |
| size (Button) | "small", "medium", "large" | "sm", "default", "lg", "icon" |
| variant (Chip) | "filled", "outlined" | "default", "outline", "secondary", "destructive" |
| size (Chip) | "small", "medium" | "sm", "default", "lg" |

### 1.2 组件导入统一

```tsx
// MUI 组件从 @mui/material 导入（唯一来源）
import { Button, TextField, Card, Dialog, Chip, Typography, Box, Paper, IconButton, Grid, Stack } from "@mui/material";

// ❌ 避免：从多个来源导入相似组件
// 不再从 @/components/ui/ 导入基础组件
```

### 2. 样式方案（统一）

```tsx
// ✅ 推荐：所有样式使用 MUI sx prop
<Box
  sx={{
    display: "flex",
    alignItems: "center",
    gap: 2,
    p: 2,
    bgcolor: "var(--color-background)",
    borderRadius: 1,
  }}
>
  <Button sx={{ mr: 2 }}>按钮1</Button>
  <Button>按钮2</Button>
</Box>

// ❌ 避免：混用 className
// 不再使用 Tailwind className 或 @apply
```

### 3. MUI v9 API 变更

#### Stack 组件
```tsx
// ❌ 旧 API
<Stack direction="row" alignItems="center" justifyContent="space-between">

// ✅ 新 API
<Stack sx={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
```

#### Grid 组件
```tsx
// ❌ 旧 API
<Grid item xs={12} md={6}>

// ✅ 新 API
<Grid size={{ xs: 12, md: 6 }}>
```

#### Typography 组件
```tsx
// ❌ 旧 API
<Typography fontWeight="bold" color="primary">

// ✅ 新 API
<Typography sx={{ fontWeight: "bold", color: "primary.main" }}>
```

#### TextField 组件
```tsx
// ❌ 旧 API
<TextField InputProps={{ startAdornment: <Icon /> }} InputLabelProps={{ shrink: true }}>

// ✅ 新 API
<TextField slotProps={{ input: { startAdornment: <Icon /> }, inputLabel: { shrink: true } }}>
```

#### Dialog 组件
```tsx
// ❌ 旧 API
<Dialog PaperProps={{ sx: { width: 400 } }}>

// ✅ 新 API
<Dialog slotProps={{ paper: { sx: { width: 400 } } }}>
```

## 组件映射表

| shadcn/ui | MUI 替代 | 说明 | 状态 |
|-----------|----------|------|------|
| Button | Button | variant="outline" → "outlined", "ghost" → "text", "filled" → "contained" | 迁移中 |
| Input | TextField | size="small" fullWidth, 使用 slotProps | 迁移中 |
| Textarea | TextField | multiline rows={4} | 迁移中 |
| Label | FormLabel / InputLabel | - | 迁移中 |
| Badge | Chip | size="small", 使用 label 属性而非 children | 迁移中 |
| Card | Card | - | 迁移中 |
| Dialog | Dialog | 使用 slotProps | 迁移中 |
| Select | Select + MenuItem | 需要 FormControl + InputLabel | 迁移中 |
| Tabs | Tabs + Tab | - | 迁移中 |
| Checkbox | Checkbox | - | 迁移中 |
| Table | Table | - | 迁移中 |
| Tooltip | Tooltip | - | 迁移中 |
| Switch | Switch | - | 迁移中 |
| Progress | LinearProgress / CircularProgress | - | 迁移中 |
| Skeleton | Skeleton | - | 迁移中 |
| Avatar | Avatar | - | 迁移中 |
| Pagination | TablePagination | - | 迁移中 |
| DropdownMenu | Menu | - | 迁移中 |
| AlertDialog | Dialog | - | 迁移中 |
| Sheet | Drawer | - | 迁移中 |
| ScrollArea | Box sx={{ overflow: "auto" }} | - | 迁移中 |

### 迁移状态说明

截至 **2026年6月21日**，前端项目已完成以下迁移工作：

**样式系统迁移：**
- ✅ **完全迁移**：所有 Tailwind CSS 类名已替换为 MUI sx prop
- ✅ **39 个核心文件**：所有主要组件已迁移
- ✅ **样式统一**：整个项目使用统一的 MUI 样式系统
- ✅ **TypeScript 类型检查**：通过，无类型错误
- ✅ **ESLint 检查**：通过，无 lint 错误

**MUI v9 API 兼容：**
- ✅ 所有 MUI v9 API 兼容性问题已修复
- ✅ 所有 Button 组件 variant/size 属性已统一
- ✅ 所有 Chip 组件 label 属性问题已修复
- ✅ 前端构建成功通过

**业务模块迁移：**
- ✅ HRM 模块：所有页面已完成迁移
- ✅ Finance 模块：所有页面已完成迁移
- ✅ CRM 模块：所有页面已完成迁移
- ✅ Flow 模块：所有页面已完成迁移
- ✅ GIS 模块：所有地图组件已完成迁移
- ✅ Dashboard 模块：所有组件已完成迁移
- ✅ 运营管理模块：所有页面已完成迁移

### 常见迁移问题

#### 1. Button 组件属性错误
```tsx
// ❌ 错误：混用 MUI 组件和 shadcn/ui 属性
import { Button } from "@mui/material";
<Button variant="ghost" size="sm">按钮</Button>  // 错误！

// ✅ 正确：MUI Button 使用 MUI 属性
import { Button } from "@mui/material";
<Button variant="text" size="small">按钮</Button>

// ✅ 正确：shadcn/ui Button 使用 shadcn/ui 属性
import { Button } from "@/components/ui/button";
<Button variant="ghost" size="sm">按钮</Button>
```

#### 2. Chip 组件 children 错误
```tsx
// ❌ 错误：MUI Chip 不支持 children
import { Chip } from "@mui/material";
<Chip>标签内容</Chip>  // 错误！

// ✅ 正确：使用 label 属性
import { Chip } from "@mui/material";
<Chip label="标签内容" />
```

#### 3. TextField readOnly 属性
```tsx
// ❌ 错误：旧 API
<TextField InputProps={{ readOnly: true }} />

// ✅ 正确：MUI v9 新 API
<TextField slotProps={{ input: { readOnly: true } }} />
```

## 颜色系统

### 主题色
```tsx
// 使用 MUI 主题色
<Button color="primary">主色</Button>
<Button color="secondary">次色</Button>
<Button color="success">成功</Button>
<Button color="warning">警告</Button>
<Button color="error">错误</Button>
```

### CSS 变量颜色
```tsx
// 使用项目定义的 CSS 变量
<Box sx={{ bgcolor: "var(--color-background)" }}>
  <Typography sx={{ color: "var(--color-text-primary)" }}>
    主文本
  </Typography>
</Box>

// 可用的 CSS 变量（在 src/index.css 中定义）
// --color-primary: 主色
// --color-secondary: 次色
// --color-accent: 强调色
// --color-success: 成功色
// --color-warning: 警告色
// --color-error: 错误色
// --color-background: 背景色
// --color-surface: 表面色
// --color-text-primary: 主文本色
// --color-text-secondary: 次文本色
// --color-border: 边框色
```

### 直接颜色值
```tsx
// 也可以使用直接的颜色值
<Box sx={{ bgcolor: "#3b82f6" }}>
  <Typography sx={{ color: "#ffffff" }}>
    直接颜色
  </Typography>
</Box>
```

### 模块配色系统

每个业务模块拥有统一的渐变色标识，用于卡片、统计图、导航等视觉元素。

| 模块 | 主色 | 渐变终点 | 用途 |
|------|------|---------|------|
| HRM（人力资源） | `#22C55E` (green) | `#15803D` | HRM 模块卡片、统计图 |
| CRM（客户关系） | `#3B82F6` (blue) | `#1D4ED8` | CRM 模块卡片、统计图 |
| PM（项目管理） | `#8B5CF6` (violet) | `#7C3AED` | PM 模块卡片、统计图 |
| Finance（财务） | `#10B981` (emerald) | `#059669` | Finance 模块卡片、统计图 |
| MES（制造执行） | `#EF4444` (red) | `#B91C1C` | MES 模块卡片、统计图 |
| SCM（供应链） | `#F59E0B` (amber) | `#D97706` | SCM 模块卡片、统计图 |
| BI（商业智能） | `#6366F1` (indigo) | `#4F46E5` | BI 模块卡片、统计图 |
| IM（即时通讯） | `#10B981` (emerald) | `#059669` | IM 模块卡片、统计图 |

```tsx
// 使用模块渐变色
<Box
  sx={{
    background: "linear-gradient(135deg, #22C55E, #15803D)",
    borderRadius: 2,
    p: 2,
  }}
>
  <Typography sx={{ color: "white" }}>HRM 模块</Typography>
</Box>
```

## 间距系统

### MUI spacing
```tsx
// 使用 theme.spacing (默认 8px 单位)
// MUI spacing 使用 8 的倍数
<Box sx={{ p: 2, m: 1, gap: 2 }}>
// p: 2 = 16px, m: 1 = 8px, gap: 2 = 16px

// 常用间距值
// 0.5 = 4px
// 1 = 8px
// 2 = 16px
// 3 = 24px
// 4 = 32px
// 8 = 64px
```

### CSS 变量间距
```tsx
// 使用 CSS 变量间距（在 src/index.css 中定义）
<Box sx={{ p: "var(--spacing-md)" }}>
// var(--spacing-xs) = 0.25rem (4px)
// var(--spacing-sm) = 0.5rem (8px)
// var(--spacing-md) = 1rem (16px)
// var(--spacing-lg) = 1.5rem (24px)
// var(--spacing-xl) = 2rem (32px)
```

## 图标系统

所有图标统一使用 `lucide-react`，不再使用 `@mui/icons-material`。

### 基本使用

```tsx
import { Search, Plus, Edit, Trash2 } from "lucide-react";

// 使用 size prop 控制尺寸（单位为 px）
<Search size={20} />
<Plus size={16} />
```

### 与 MUI 的区别

| 特性 | MUI Icons | Lucide React |
|------|-----------|-------------|
| 导入路径 | `@mui/icons-material` | `lucide-react` |
| 尺寸控制 | `fontSize="small"` | `size={20}` |
| 样式控制 | 支持 `sx` prop | **不支持** `sx` prop，使用 `style` |
| 颜色控制 | `color="primary"` | `style={{ color: "#3B82F6" }}` |

### 重要：不支持 sx prop

```tsx
// ❌ 错误：Lucide 图标不支持 MUI sx prop
<Search sx={{ width: 20, color: "primary.main" }} />

// ✅ 正确：使用 style 属性
<Search style={{ width: 20, height: 20, color: "#3B82F6" }} />

// ✅ 正确：使用 size prop 控制尺寸
<Search size={20} />
```

### 动态图标渲染

当需要根据配置动态渲染图标时，使用别名模式：

```tsx
import { Search, Plus, Edit, Trash2, Settings, type LucideIcon } from "lucide-react";

// 图标映射表
const iconMap: Record<string, LucideIcon> = {
  search: Search,
  add: Plus,
  edit: Edit,
  delete: Trash2,
  settings: Settings,
};

// 使用别名模式动态渲染
const DynamicIcon = iconMap[iconName];
if (DynamicIcon) {
  return <DynamicIcon size={20} />;
}
```

### 在 MUI IconButton 中使用

```tsx
import { IconButton } from "@mui/material";
import { Edit, Trash2 } from "lucide-react";

<IconButton onClick={handleEdit}>
  <Edit size={18} />
</IconButton>
<IconButton onClick={handleDelete}>
  <Trash2 size={18} />
</IconButton>
```

## 共享组件库（@topems/shared-components）

跨应用复用的业务组件库，从 `@topems/shared-components` 导入。

### 已有组件（16 个）

| 组件 | 用途 | 说明 |
|------|------|------|
| OrgTree | 组织架构树 | 支持懒加载、搜索、选择 |
| UserSelect | 用户选择器 | 支持多选、搜索、部门筛选 |
| NumberField | 数字输入框 | 支持精度、步长、范围限制 |
| CurrencyField | 金额输入框 | 支持千分位、货币符号、精度 |
| PercentField | 百分比输入框 | 支持精度、范围限制 |
| StatusBadge | 状态标签 | 配色方案与模块主题联动 |
| LoadingSpinner | 加载指示器 | 支持尺寸、颜色自定义 |
| EmptyState | 空状态占位 | 支持图标、标题、描述、操作按钮 |
| ActionButton | 操作按钮 | 封装常用按钮模式（新增、编辑、删除等） |
| FormField | 表单字段容器 | 统一标签、校验、错误提示 |
| FormSelect | 表单下拉选择 | 封装 FormControl + Select |
| FilterBar | 筛选栏 | 支持多条件组合筛选 |
| ProgressBar | 进度条 | 支持百分比、颜色、动画 |
| Stepper | 步骤条 | 支持水平/垂直、状态指示 |
| Pagination | 分页控件 | 支持页码、每页数量、总数 |
| RelativeTime | 相对时间显示 | 自动格式化为"刚刚"、"5分钟前"等 |

### 即将推出

- BackButton - 返回导航按钮
- ConfirmDialog - 确认弹窗

### 使用示例

```tsx
import {
  StatusBadge,
  EmptyState,
  LoadingSpinner,
  UserSelect,
} from "@topems/shared-components";

// 状态标签
<StatusBadge status="active" />

// 空状态
<EmptyState
  title="暂无数据"
  description="请先创建一条记录"
  action={<Button>立即创建</Button>}
/>

// 用户选择
<UserSelect
  value={selectedUserId}
  onChange={setSelectedUserId}
  multiple
/>
```

## 表单处理

```tsx
// 使用 react-hook-form + MUI
import { Controller } from "react-hook-form";
import { TextField } from "@mui/material";

<Controller
  name="fieldName"
  control={control}
  render={({ field, fieldState }) => (
    <TextField
      {...field}
      label="字段标签"
      error={!!fieldState.error}
      helperText={fieldState.error?.message}
      size="small"
      fullWidth
    />
  )}
/>
```

## 迁移指南

### Tailwind CSS 到 MUI 迁移对照表

#### 1. 布局类

| Tailwind | MUI sx prop | 说明 |
|----------|-------------|------|
| `flex` | `display: "flex"` | 弹性布局 |
| `grid` | `display: "grid"` | 网格布局 |
| `items-center` | `alignItems: "center"` | 垂直居中 |
| `justify-center` | `justifyContent: "center"` | 水平居中 |
| `justify-between` | `justifyContent: "space-between"` | 两端对齐 |
| `gap-2` | `gap: 2` | 间距 (16px) |
| `gap-4` | `gap: 4` | 间距 (32px) |

#### 2. 尺寸类

| Tailwind | MUI sx prop | 说明 |
|----------|-------------|------|
| `w-full` | `width: "100%"` | 全宽 |
| `h-full` | `height: "100%"` | 全高 |
| `min-h-screen` | `minHeight: "100vh"` | 最小高度 |
| `w-64` | `width: "16rem"` | 固定宽度 |
| `h-64` | `height: "16rem"` | 固定高度 |

#### 3. 间距类

| Tailwind | MUI sx prop | 说明 |
|----------|-------------|------|
| `p-2` | `p: 1` | 内边距 (8px) |
| `p-4` | `p: 2` | 内边距 (16px) |
| `px-4` | `px: 2` | 水平内边距 |
| `py-2` | `py: 1` | 垂直内边距 |
| `m-2` | `m: 1` | 外边距 (8px) |
| `mt-2` | `mt: 1` | 上外边距 |
| `mb-2` | `mb: 1` | 下外边距 |

#### 4. 文本类

| Tailwind | MUI sx prop | 说明 |
|----------|-------------|------|
| `text-sm` | `fontSize: "0.875rem"` | 小号字体 |
| `text-lg` | `fontSize: "1.125rem"` | 大号字体 |
| `font-medium` | `fontWeight: 500` | 中等字重 |
| `font-bold` | `fontWeight: 700` | 粗体 |
| `text-center` | `textAlign: "center"` | 居中 |
| `text-gray-700` | `color: "rgb(55, 65, 81)"` | 灰色文本 |
| `text-white` | `color: "white"` | 白色文本 |

#### 5. 背景和边框类

| Tailwind | MUI sx prop | 说明 |
|----------|-------------|------|
| `bg-white` | `bgcolor: "white"` | 白色背景 |
| `bg-gray-50` | `bgcolor: "rgb(249, 250, 251)"` | 浅灰背景 |
| `bg-blue-500` | `bgcolor: "rgb(59, 130, 246)"` | 蓝色背景 |
| `rounded` | `borderRadius: 1` | 圆角 |
| `rounded-lg` | `borderRadius: 2` | 大圆角 |
| `border` | `border: "1px solid"` | 边框 |
| `shadow-md` | `boxShadow: 1` | 阴影 |

#### 6. 交互类

| Tailwind | MUI sx prop | 说明 |
|----------|-------------|------|
| `hover:bg-gray-100` | `"&:hover": { bgcolor: "rgb(243, 244, 246)" }` | 悬停效果 |
| `transition` | `transition: "all 0.2s"` | 过渡动画 |
| `opacity-50` | `opacity: 0.5` | 透明度 |
| `cursor-pointer` | `cursor: "pointer"` | 鼠标指针 |

### 新代码规范

1. **所有新组件使用 MUI**
   ```tsx
   import { Box, Button, Typography } from "@mui/material";
   ```

2. **样式优先使用 sx prop**
   ```tsx
   <Box
     sx={{
       display: "flex",
       gap: 2,
       p: 2,
     }}
   >
     <Button>按钮</Button>
   </Box>
   ```

3. **布局使用 MUI Box + sx**
   ```tsx
   // ✅ 推荐
   <Box
     sx={{
       display: "flex",
       alignItems: "center",
       gap: 1,
     }}
   >
     <Button>按钮1</Button>
     <Button>按钮2</Button>
   </Box>

   // ❌ 避免
   <Box className="flex items-center gap-2">
     <Button>按钮1</Button>
     <Button>按钮2</Button>
   </Box>
   ```

4. **使用 CSS 变量保持一致性**
   ```tsx
   <Box
     sx={{
       bgcolor: "var(--color-background)",
       color: "var(--color-text-primary)",
       p: "var(--spacing-md)",
     }}
   >
     内容
   </Box>
   ```

### 迁移示例

#### 示例 1: 布局组件

**迁移前 (Tailwind):**
```tsx
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-md">
  <div className="flex items-center gap-2">
    <span className="text-gray-700 font-medium">标题</span>
  </div>
  <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
    操作
  </button>
</div>
```

**迁移后 (MUI):**
```tsx
<Box
  sx={{
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    p: 2,
    bgcolor: "white",
    borderRadius: 1,
    boxShadow: 1,
  }}
>
  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
    <Typography sx={{ color: "rgb(55, 65, 81)", fontWeight: 500 }}>
      标题
    </Typography>
  </Box>
  <Button
    sx={{
      px: 2,
      py: 1,
      bgcolor: "rgb(59, 130, 246)",
      color: "white",
      borderRadius: 1,
      "&:hover": {
        bgcolor: "rgb(37, 99, 235)",
      },
    }}
  >
    操作
  </Button>
</Box>
```

#### 示例 2: 卡片组件

**迁移前 (Tailwind):**
```tsx
<div className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
  <h3 className="text-lg font-semibold text-gray-900 mb-2">标题</h3>
  <p className="text-gray-600">内容描述</p>
  <button className="mt-4 w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
    按钮
  </button>
</div>
```

**迁移后 (MUI):**
```tsx
<Paper
  sx={{
    p: 3,
    bgcolor: "white",
    borderRadius: 2,
    boxShadow: 2,
    transition: "box-shadow 0.2s",
    "&:hover": {
      boxShadow: 3,
    },
  }}
>
  <Typography sx={{ fontSize: "1.125rem", fontWeight: 600, color: "rgb(17, 24, 39)", mb: 1 }}>
    标题
  </Typography>
  <Typography sx={{ color: "rgb(75, 85, 99)" }}>
    内容描述
  </Typography>
  <Button
    fullWidth
    sx={{
      mt: 2,
      py: 1,
      bgcolor: "rgb(59, 130, 246)",
      color: "white",
      borderRadius: 1,
      transition: "background-color 0.2s",
      "&:hover": {
        bgcolor: "rgb(37, 99, 235)",
      },
    }}
  >
    按钮
  </Button>
</Paper>
```

### 旧代码迁移检查清单

在迁移旧代码时，请检查：

1. ✅ **导入语句**
   - 是否从 @mui/material 导入所有组件
   - 是否移除了 Tailwind 相关的导入

2. ✅ **HTML 元素替换**
   - `<div>` → `<Box>` 或 `<Paper>`
   - `<span>` → `<Typography>` 或 `<Box>`
   - `<button>` → `<Button>`
   - `<aside>` → `<Paper component="aside">`

3. ✅ **样式转换**
   - 所有 className → sx prop
   - Tailwind 类名 → sx 对象属性
   - 使用 CSS 变量或直接颜色值

4. ✅ **功能保持**
   - 所有事件处理保持不变
   - 所有状态管理保持不变
   - 所有交互逻辑保持不变

5. ✅ **测试验证**
   - 运行 TypeScript 类型检查
   - 运行 ESLint 检查
   - 手动测试功能

## 文件结构

```
src/
├── components/
│   ├── ui/              # MUI 基础组件
│   ├── common/          # 公共业务组件
│   ├── charts/          # 图表组件
│   ├── dashboard/       # 仪表盘组件
│   └── [module]/        # 模块组件 (hrm, crm, finance 等)
├── pages/               # 页面组件
├── themes/              # 主题配置
└── index.css            # 全局样式和 CSS 变量定义
```

## MUI 最佳实践

### 1. Box 组件使用

```tsx
// ✅ 使用 Box 作为通用容器
<Box
  sx={{
    display: "flex",
    flexDirection: "column",
    gap: 2,
  }}
>
  内容
</Box>

// ✅ Box 支持 sx prop
// ✅ Box 可以作为任何 HTML 元素的包装器
// ✅ Box 默认渲染为 div 元素
```

### 2. Paper 组件使用

```tsx
// ✅ 使用 Paper 作为卡片容器
<Paper
  sx={{
    p: 3,
    borderRadius: 2,
    boxShadow: 2,
  }}
>
  卡片内容
</Paper>

// ✅ Paper 提供背景和阴影
// ✅ 适合作为卡片、面板等容器
```

### 3. Typography 组件使用

```tsx
// ✅ 使用 Typography 处理文本
<Typography
  variant="h4"
  sx={{ fontWeight: 600, color: "text.primary" }}
>
  标题
</Typography>

// ✅ 支持 variant 属性定义预定义样式
// ✅ 支持 sx prop 自定义样式
```

### 4. 响应式样式

```tsx
// ✅ 使用响应式断点
<Box
  sx={{
    // 默认样式（移动端）
    display: "flex",
    flexDirection: "column",
    p: 2,

    // 平板及以上
    "@media (min-width: 900px)": {
      flexDirection: "row",
      p: 4,
    },

    // 桌面及以上
    "@media (min-width: 1200px)": {
      gap: 4,
    },
  }}
>
  内容
</Box>
```

### 5. 主题值访问

```tsx
import { useTheme } from "@mui/material";

// ✅ 在组件中访问主题
const theme = useTheme();
<Box sx={{ color: theme.palette.primary.main }}>
  内容
</Box>

// ✅ 使用 CSS 变量（推荐）
<Box sx={{ bgcolor: "var(--color-background)" }}>
  内容
</Box>
```

## 常见问题

### Q: 何时使用 Box vs Paper？

**Box:**
- 需要灵活布局和样式
- 作为通用容器
- 需要自定义背景、边框等

**Paper:**
- 卡片、面板等容器
- 需要预定义的背景和阴影
- 固定的内容区域

### Q: 如何保持样式一致性？

**使用 CSS 变量:**
```tsx
<Box sx={{ bgcolor: "var(--color-surface)" }}>
  <Typography sx={{ color: "var(--color-text-primary)" }}>
    内容
  </Typography>
</Box>
```

**使用主题:**
```tsx
<Button color="primary">按钮</Button>
<Button sx={{ color: "error.main" }}>错误按钮</Button>
```

### Q: 如何处理复杂布局？

**使用 Grid:**
```tsx
<Grid container spacing={2}>
  <Grid item size={{ xs: 12, md: 6 }}>
    左栏
  </Grid>
  <Grid item size={{ xs: 12, md: 6 }}>
    右栏
  </Grid>
</Grid>
```

**使用 Stack:**
```tsx
<Stack direction="row" spacing={2}>
  <Box>项1</Box>
  <Box>项2</Box>
</Stack>
```

## 参考资料

- [MUI 官方文档](https://mui.com/)
- [MUI v9 迁移指南](https://mui.com/material-ui/migration/migration-grid-v2/)
- [MUI sx prop 文档](https://mui.com/system/the-sx-prop/)
- [Lucide 图标库](https://lucide.dev/)
- [Emotion CSS-in-JS](https://emotion.sh/)

## 更新日志

### 2026-06-28
- 新增 Token Architecture 三层令牌架构文档（tokens.ts -> index.css -> colors.ts）
- 图标系统全面更新为 lucide-react，新增动态图标渲染、sx prop 限制说明
- 新增共享组件库 @topems/shared-components 文档（16 个组件）
- 新增模块配色系统文档（8 个模块的统一渐变色映射）
- MUI 版本更新为 v9.1.1（全应用统一）

### 2026-06-21
- ✅ 完成从 Tailwind CSS + MUI 混合使用到纯 MUI 样式系统的迁移
- ✅ 更新设计系统文档，移除 Tailwind 相关内容
- ✅ 添加完整的 Tailwind 到 MUI 迁移对照表
- ✅ 添加 MUI 最佳实践和常见问题解决方案
- ✅ 添加样式迁移检查清单和示例代码
- ✅ **硬编码修复第二轮**：修复了约 **150+ 处 console 调用**，分布在 **100+ 个文件**
- ✅ **plugin.ts 超时硬编码修复**：将 `timeout: 5000` 和 `timeout: 30000` 替换为 `PLUGIN_TIMEOUT.DEFAULT` 和 `PLUGIN_TIMEOUT.LONG`
- ✅ **统一日志系统**：所有业务代码现在使用 `logger`、`apiLogger`、`authLogger`、`errorLogger`
- ✅ **TypeScript 类型检查通过**：所有修改无类型错误

### 历史版本

## 🎯 硬编码修复指南

**2026年6月21日** - 项目已完成第一轮硬编码修复工作，建立了统一的常量管理系统。

### 硬编码问题概述

前端项目存在以下主要类型的硬编码问题：

| 类型 | 严重程度 | 数量 | 影响范围 |
|------|---------|------|----------|
| 颜色值硬编码 | 🔴 高 | 100+ 处 | 所有组件 |
| API 地址硬编码 | 🔴 高 | 20+ 处 | 地图、测试等 |
| 超时时间硬编码 | 🟡 中 | 15+ 处 | API 客户端 |
| 魔法数字 | 🟡 中 | 30+ 处 | 各模块 |
| 中文字符串 | 🟡 中 | 50+ 处 | 页面和组件 |
| console.log 硬编码 | 🟢 低 | 20+ 处 | 各页面 |

### 已创建的统一常量文件

#### 1. 颜色常量 - `src/constants/colors.ts`

```tsx
// 导入方式
import { COLORS, STATUS_COLORS, GRADIENTS, SIDEBAR, getStatusColorConfig } from "@/constants/colors";

// 使用示例
<Box sx={{ bgcolor: COLORS.primary.DEFAULT }}>
  内容
</Box>

// 状态颜色
const statusStyle = getStatusColorConfig("进行中");
<Chip sx={{ bgcolor: statusStyle.bgcolor, color: statusStyle.color }}>
  进行中
</Chip>

// 渐变色
<Box sx={{ background: GRADIENTS.primary }}>
  内容
</Box>
```

#### 2. 数字常量 - `src/constants/numbers.ts`

```tsx
// 导入方式
import { EARTH, REFRESH_INTERVAL, PAGINATION, MAP } from "@/constants/numbers";

// 使用示例
// 地球相关
const distance = EARTH.RADIUS_METERS; // 6371000
const km = meters / EARTH.METERS_PER_KILOMETER; // 1000

// 时间间隔
const interval = REFRESH_INTERVAL.MINUTE; // 60000ms
const fiveMinutes = REFRESH_INTERVAL.MINUTE_5; // 300000ms

// 地图配置
const zoom = MAP.DEFAULT_ZOOM; // 13
const center = MAP.DEFAULT_CENTER; // { lat: 39.9042, lng: 116.4074 }
```

#### 3. 超时常量 - `src/constants/timeouts.ts`

```tsx
// 导入方式
import { API_TIMEOUT, PLUGIN_TIMEOUT, WS_TIMEOUT, withTimeout } from "@/constants/timeouts";

// 使用示例
// API 超时
const timeout = API_TIMEOUT.DEFAULT; // 60000ms
const aiTimeout = API_TIMEOUT.AI; // 120000ms

// 带超时的请求
const result = await withTimeout(
  fetchData(),
  API_TIMEOUT.UPLOAD,
  "上传超时"
);
```

#### 4. 标签常量 - `src/constants/labels.ts`

```tsx
// 导入方式
import { LABELS, MODULE_LABELS, MESSAGES } from "@/constants/labels";

// 使用示例
// 通用标签
<Typography>{LABELS.STATUS}</Typography>
<Button>{LABELS.ADD}</Button>

// 模块标签
<Typography>{MODULE_LABELS.HRM}</Typography>
<Typography>{MODULE_LABELS.GIS}</Typography>

// 消息
<Alert>{MESSAGES.SUCCESS.DELETE}</Alert>
<Alert severity="error">{MESSAGES.ERROR.SAVE}</Alert>
```

#### 5. 日志系统 - `src/utils/logger.ts`

```tsx
// 导入方式
import logger, { apiLogger, authLogger, errorLogger } from "@/utils/logger";

// 使用示例
// 默认日志器
logger.debug("调试信息");
logger.info("普通信息");
logger.warn("警告信息");
logger.error("错误信息");

// 专用日志器
apiLogger.info("API 请求", { url, method });
authLogger.error("认证失败", { userId, error });
errorLogger.error("未捕获错误", { error: err, stack });

// 创建子日志器
const pageLogger = logger.child({ prefix: "PAGE" });
pageLogger.info("页面加载完成");
```

### 已修复的文件

#### 1. LimsTaskPage.tsx - 状态颜色硬编码 ✅

**修复前：**
```tsx
const getStatusColor = (status: string) => {
  if (!status) return { bgcolor: "#f1f5f9", color: "#475569" };
  switch (status) {
    case "进行中":
      return { bgcolor: "#dbeafe", color: "#1d4ed8" };
    case "已完成":
      return { bgcolor: "#dcfce7", color: "#15803d" };
    // ...
  }
};
```

**修复后：**
```tsx
import { STATUS_COLORS } from "@/constants/colors";

const getStatusColor = (status: string) => {
  if (!status) return STATUS_COLORS.pending;
  switch (status) {
    case "进行中":
      return STATUS_COLORS.inProgress;
    case "已完成":
      return STATUS_COLORS.completed;
    // ...
  }
};
```

#### 2. Sidebar.tsx - 侧边栏颜色硬编码 ✅

**修复前：**
```tsx
sx={{
  color: "rgb(96, 165, 250)",
  bgcolor: "rgb(17, 24, 39)",
  "&:hover": {
    color: "rgb(243, 244, 246)",
    bgcolor: "rgba(255, 255, 255, 0.05)",
  },
}}
```

**修复后：**
```tsx
import { SIDEBAR, COLORS } from "@/constants/colors";

sx={{
  color: COLORS.primary.rgb,
  bgcolor: SIDEBAR.default.bgcolor,
  "&:hover": {
    color: SIDEBAR.default.hover.color,
    bgcolor: SIDEBAR.default.hover.bgcolor,
  },
}}
```

#### 3. MapView.tsx - 魔法数字硬编码 ✅

**修复前：**
```tsx
const R = 6371000;
const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${meters.toFixed(2)} 米`;
  }
  return `${(meters / 1000).toFixed(2)} 公里`;
};
```

**修复后：**
```tsx
import { EARTH } from "@/constants/numbers";

const R = EARTH.RADIUS_METERS;
const formatDistance = (meters: number): string => {
  if (meters < EARTH.METERS_PER_KILOMETER) {
    return `${meters.toFixed(2)} 米`;
  }
  return `${(meters / EARTH.METERS_PER_KILOMETER).toFixed(2)} 公里`;
};
```

### 修复检查清单

在修复硬编码时，请检查：

#### 1. 颜色值
- ✅ 是否使用了 `COLORS` 常量
- ✅ 是否使用了 `STATUS_COLORS` 状态颜色
- ✅ 是否使用了 `GRADIENTS` 渐变色
- ✅ 是否使用了 `SIDEBAR` 侧边栏颜色

#### 2. 数字常量
- ✅ 是否使用了 `EARTH` 地球常量
- ✅ 是否使用了 `REFRESH_INTERVAL` 时间间隔
- ✅ 是否使用了 `PAGINATION` 分页常量
- ✅ 是否使用了 `MAP` 地图配置

#### 3. 超时配置
- ✅ 是否使用了 `API_TIMEOUT` API 超时
- ✅ 是否使用了 `PLUGIN_TIMEOUT` 插件超时
- ✅ 是否使用了 `WS_TIMEOUT` WebSocket 超时

#### 4. 标签常量
- ✅ 是否使用了 `LABELS` 通用标签
- ✅ 是否使用了 `MODULE_LABELS` 模块标签
- ✅ 是否使用了 `MESSAGES` 消息常量

#### 5. 日志系统
- ✅ 是否使用了 `logger` 日志系统
- ✅ 是否移除了 `console.log`
- ✅ 是否移除了 `console.error`
- ✅ 是否移除了 `console.warn`

### 后续修复计划

#### 第二优先级（建议修复）
- [x] 修复 `client.ts` 中的 API 超时配置
- [x] 修复 `useAuth.tsx` 中的超时常量
- [x] 修复 `useServiceStatus.ts` 中的刷新间隔
- [x] 修复各页面的 console.log 调试代码 ✅ 已完成

#### 第三优先级（可选修复）
- [ ] 集成 i18n 系统处理中文硬编码
- [ ] 创建统一的 API 配置管理
- [ ] 添加 ESLint 规则检测硬编码

### 最佳实践

1. **优先使用常量**：所有硬编码值都应该提取为常量
2. **语义化命名**：常量名称应该清晰表达其用途
3. **分组管理**：按功能模块分组常量文件
4. **文档注释**：为常量添加 JSDoc 注释说明用途
5. **类型安全**：使用 TypeScript 的 `as const` 确保类型安全

### 相关文件路径

```
src/
├── constants/
│   ├── index.ts           # 统一导出
│   ├── colors.ts          # 颜色常量
│   ├── numbers.ts         # 数字常量
│   ├── timeouts.ts        # 超时常量
│   └── labels.ts          # 标签常量
└── utils/
    └── logger.ts          # 日志系统
```

### 参考资料

- [TypeScript const 断言](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#literal-types)
- [MUI sx prop 文档](https://mui.com/system/the-sx-prop/)
- [Emotion CSS-in-JS](https://emotion.sh/)
- [React 日志最佳实践](https://react.dev/learn/you-might-not-need-an-effect)

- 2026-06-13: 添加 shadcn/ui 迁移指南
- 2026-06-11: 初始文档创建
