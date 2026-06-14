# TOPEMS 设计系统文档

## 概述

TOPEMS 采用 **MUI (Material UI) + Tailwind CSS** 作为主要 UI 方案。本文档定义了统一的设计规范和组件使用指南。

## UI 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| MUI | v9.x | 主 UI 组件库 |
| Tailwind CSS | v4.x | 辅助样式 |
| Emotion | v11.x | MUI 内置 CSS-in-JS |
| Lucide React | v1.x | 图标库 |
| shadcn/ui | latest | 辅助组件库（逐步迁移中） |

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
// MUI 组件从 @mui/material 导入
import { Button, TextField, Card, Dialog, Chip, Typography } from "@mui/material";

// shadcn/ui 组件从 @/components/ui/ 导入
import { Button, Input, Card, Dialog, Label } from "@/components/ui";
```

### 2. 样式方案

```tsx
// ✅ 推荐：MUI sx prop 用于组件样式
<Button sx={{ mr: 2, borderRadius: 2 }}>按钮</Button>

// ✅ 推荐：Tailwind 用于布局
<Box className="flex items-center gap-4 p-4">
  <Button>按钮1</Button>
  <Button>按钮2</Button>
</Box>

// ❌ 避免：混用两套样式系统
<Button className="mr-2 rounded-lg" sx={{ marginRight: 2 }}>
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

截至当前，前端项目已完成以下迁移工作：
- ✅ 所有 MUI v9 API 兼容性问题已修复
- ✅ 所有 Button 组件 variant/size 属性已统一
- ✅ 所有 Chip 组件 label 属性问题已修复
- ✅ 前端构建成功通过
- ✅ HRM 模块：HrmDepartmentPage, HrmPositionPage, HrmCompanyPage, HrmOrganizationPage, HrmAttendancePage, HrmLeavePage, HrmReportsPage, HrmEmployeeDetailPage, EmployeeManagementPage, DepartmentManagementPage 等已完成迁移
- ✅ Finance 模块：FinanceVoucherPage, VoucherTemplatePage, ConsolidationScopePage 等已完成迁移
- ✅ CRM 模块：CustomerManagementPage, PermissionManagementPage 等已完成迁移
- ✅ Flow 模块：WorkflowDesignerPage, FlowInstanceDetailPage, FlowStatisticsPage 等已完成迁移
- ✅ 运营管理模块：AssetManagementPage, EquipmentManagementPage, VehicleManagementPage, WarehouseManagementPage, MeetingRoomManagementPage, SupplierManagementPage 等已完成迁移
- ⚠️ 少量 shadcn/ui 组件仍在使用中（主要是 Button、Card、Table 等基础组件），需继续迁移

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

### Tailwind 颜色
```tsx
// 使用 Tailwind 颜色类
<Box className="bg-blue-500 text-white">
<Box className="border-gray-200">
```

## 间距系统

### MUI spacing
```tsx
// 使用 theme.spacing (默认 8px 单位)
<Box sx={{ p: 2, m: 1, gap: 2 }}>
// p: 2 = 16px, m: 1 = 8px, gap: 2 = 16px
```

### Tailwind spacing
```tsx
// 使用 Tailwind 间距类
<Box className="p-4 m-2 gap-4">
// p-4 = 16px, m-2 = 8px, gap-4 = 16px
```

## 图标使用

```tsx
// ✅ 推荐：Lucide React 图标
import { Search, Plus, Edit, Trash2 } from "lucide-react";

// 使用方式
<Search size={20} />
<Plus style={{ width: 20, height: 20 }} />

// ❌ 避免：Lucide 图标不支持 sx prop
<Search sx={{ width: 20 }} />
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

### 新代码规范
1. 所有新组件使用 MUI
2. 样式优先使用 `sx` prop
3. 布局使用 Tailwind CSS 类

### 旧代码迁移
1. 优先迁移高频使用的组件
2. 保持功能不变，仅替换组件
3. 迁移后运行测试验证

## 文件结构

```
src/
├── components/
│   ├── ui/              # shadcn/ui 组件（逐步迁移）
│   ├── common/          # 公共业务组件
│   ├── charts/          # 图表组件
│   └── [module]/        # 模块组件
├── pages/               # 页面组件
└── themes/              # 主题配置
```

## 参考资料

- [MUI 官方文档](https://mui.com/)
- [MUI v9 迁移指南](https://mui.com/material-ui/migration/migration-grid-v2/)
- [Tailwind CSS 文档](https://tailwindcss.com/)
- [Lucide 图标库](https://lucide.dev/)
