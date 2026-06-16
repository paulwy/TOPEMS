# TOPEMS UI 设计规范与标准

| 项目 | 内容 |
|------|------|
| **文档版本** | v3.0.0 |
| **创建日期** | 2026-06-15 |
| **适用阶段** | 前端 UI 重构与迭代 |
| **状态** | 正式发布 |
| **维护团队** | TOPEMS 前端团队 |

---

## 目录

1. [设计原则](#一设计原则)
2. [技术栈规范](#二技术栈规范)
3. [设计 Token 系统](#三设计-token-系统)
4. [页面类型分类](#四页面类型分类)
5. [组件规范](#五组件规范)
6. [布局规范](#六布局规范)
7. [导航系统](#七导航系统)
8. [主题系统](#八主题系统)
9. [性能优化](#九性能优化)
10. [可访问性标准](#十可访问性标准)
11. [实施检查清单](#十一实施检查清单)

---

## 一、设计原则

### 1.1 核心原则

| 原则 | 说明 | 优先级 |
|------|------|--------|
| **一致性** | 统一的视觉风格和交互模式 | P0 |
| **简洁性** | 清晰的信息层级，减少视觉噪音 | P0 |
| **可用性** | 直观的操作流程，降低学习成本 | P0 |
| **响应式** | 适配不同屏幕尺寸 | P0 |
| **无障碍** | 支持键盘导航和屏幕阅读器 | P1 |
| **性能优先** | 首屏加载快，交互流畅 | P0 |

### 1.2 UI 决策原则

```
1. 功能性 > 美观性：确保功能完整后再优化视觉
2. 一致性 > 个性化：模块内保持风格统一
3. 渐进增强 > 一步到位：分阶段迭代优化
4. 用户测试 > 设计直觉：用数据验证设计决策
```

---

## 二、技术栈规范

### 2.1 核心技术栈

| 技术 | 版本 | 用途 | 状态 |
|------|------|------|------|
| **React** | 18.3+ | UI 框架 | ✅ 标准 |
| **TypeScript** | 5.4+ | 类型系统 | ✅ 标准 |
| **MUI (Material UI)** | v9.x | 主 UI 组件库 | ✅ 标准 |
| **Vite** | 6.2+ | 构建工具 | ✅ 标准 |
| **React Router** | 6.22+ | 路由管理 | ✅ 标准 |
| **React Hook Form** | 7.x | 表单处理 | ✅ 标准 |
| **Zod** | 3.x | 数据验证 | ✅ 标准 |
| **Lucide React** | 1.x | 图标库 | ✅ 标准 |
| **Emotion** | v11.x | CSS-in-JS (MUI内置) | ✅ 标准 |
| **React Query** | 5.x | 数据缓存 | ✅ 推荐 |
| **Zustand** | 4.5+ | 状态管理 | ✅ 推荐 |

### 2.2 已移除技术栈

| 技术 | 原用途 | 移除原因 | 完成时间 |
|------|--------|----------|----------|
| Tailwind CSS | 辅助样式 | 统一使用 MUI sx | 2026-06 |
| shadcn/ui | 组件库 | 统一使用 MUI | 2026-06 |
| @mui/icons-material | 图标库 | 统一使用 lucide-react | 2026-06 |

### 2.3 组件导入规范

```tsx
// ✅ 推荐：从 @mui/material 导入所有 MUI 组件
import { 
  Button, 
  TextField, 
  Card, 
  Dialog, 
  Chip,
  Typography,
  Box,
  Grid,
  Paper,
  Avatar,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  Switch,
  Tooltip,
  Skeleton,
  Alert,
  Breadcrumbs,
  Link,
  Divider,
  IconButton,
  InputAdornment,
  LinearProgress,
  CircularProgress,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";

// ✅ 推荐：使用 lucide-react 图标
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Download,
  Upload,
  Settings,
  User,
  Bell,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Home,
  RefreshCw,
  Filter,
  MoreHorizontal,
  Eye,
  Save,
  ArrowLeft,
  Check,
  AlertTriangle,
  Info,
  AlertCircle,
} from "lucide-react";

// ❌ 禁止：从 @/components/ui 导入 shadcn/ui 组件
import { Button, Card } from "@/components/ui";
```

---

## 三、设计 Token 系统

### 3.1 颜色系统

#### 主题色

| 颜色名称 | 主值 | 用途 | CSS变量 |
|----------|------|------|---------|
| **Primary** | `#3b82f6` | 品牌色、主要按钮、链接 | `--color-primary` |
| **Secondary** | `#8b5cf6` | 次要操作、详情页强调 | `--color-secondary` |
| **Success** | `#22c55e` | 成功状态、确认操作 | `--color-success` |
| **Warning** | `#f59e0b` | 警告提示、待处理状态 | `--color-warning` |
| **Error** | `#ef4444` | 错误状态、危险操作 | `--color-error` |
| **Info** | `#0ea5e9` | 信息提示、帮助文本 | `--color-info` |

#### 灰色系统

| Token | 色值 | 用途 |
|-------|------|------|
| `grey.50` | `#f9fafb` | 表格头部背景 |
| `grey.100` | `#f3f4f6` | 卡片悬停背景 |
| `grey.200` | `#e5e7eb` | 边框、分隔线 |
| `grey.300` | `#d1d5db` | 禁用边框 |
| `grey.400` | `#9ca3af` | 占位符文字 |
| `grey.500` | `#6b7280` | 次要文字 |
| `grey.600` | `#4b5563` | 图标颜色 |
| `grey.700` | `#374151` | 深色模式边框 |
| `grey.800` | `#1f2937` | 深色模式背景 |
| `grey.900` | `#111827` | 深色模式文字 |
| `grey.950` | `#030712` | 深色模式背景 |

#### 状态颜色

| 状态 | 背景色 | 文字色 | 使用场景 |
|------|--------|--------|----------|
| **成功** | `#f0fdf4` | `#166534` | 成功提示 |
| **警告** | `#fffbeb` | `#92400e` | 警告提示 |
| **错误** | `#fef2f2` | `#991b1b` | 错误提示 |
| **信息** | `#f0f9ff` | `#0c4a6e` | 信息提示 |

### 3.2 间距系统

| Token | 值 | px值 | 使用场景 |
|-------|-----|------|----------|
| `spacing.xs` | 0.5 | 4px | 元素内微小间距 |
| `spacing.sm` | 1 | 8px | 小间距（按钮内边距等） |
| `spacing.md` | 2 | 16px | 中等间距（卡片内边距等） |
| `spacing.lg` | 3 | 24px | 大间距（区块间距等） |
| `spacing.xl` | 4 | 32px | 超大间距（页面间距等） |
| `spacing.2xl` | 6 | 48px | 极大间距 |

### 3.3 圆角系统

| Token | 值 | 使用场景 |
|-------|-----|----------|
| `borderRadius.none` | 0 | 无圆角（分隔线等） |
| `borderRadius.xs` | 4px | 微小圆角（标签等） |
| `borderRadius.sm` | 6px | 小圆角（输入框等） |
| `borderRadius.md` | 8px | 中等圆角（按钮等） |
| `borderRadius.lg` | 12px | 大圆角（卡片等） |
| `borderRadius.xl` | 16px | 超大圆角（对话框等） |
| `borderRadius.full` | 9999px | 圆形（头像等） |

### 3.4 阴影系统

| Token | 值 | 使用场景 |
|-------|-----|----------|
| `shadows.none` | none | 无阴影 |
| `shadows.xs` | `0 1px 2px 0 rgb(0 0 0 / 0.05)` | 微小阴影 |
| `shadows.sm` | `0 1px 3px 0 rgb(0 0 0 / 0.1)` | 小阴影 |
| `shadows.md` | `0 4px 6px -1px rgb(0 0 0 / 0.1)` | 中等阴影 |
| `shadows.lg` | `0 10px 15px -3px rgb(0 0 0 / 0.1)` | 大阴影 |
| `shadows.xl` | `0 20px 25px -5px rgb(0 0 0 / 0.1)` | 超大阴影 |
| `shadows.inner` | `inset 0 2px 4px 0 rgb(0 0 0 / 0.05)` | 内阴影 |

### 3.5 字体系统

| 类型 | 字号 | 字重 | 行高 | 用途 |
|------|------|------|------|------|
| **h1** | 2.5rem (40px) | 700 | 1.2 | 页面标题 |
| **h2** | 2rem (32px) | 600 | 1.3 | 区块标题 |
| **h3** | 1.5rem (24px) | 600 | 1.4 | 卡片标题 |
| **h4** | 1.25rem (20px) | 600 | 1.4 | 小标题 |
| **h5** | 1rem (16px) | 600 | 1.5 | 标签文字 |
| **h6** | 0.875rem (14px) | 600 | 1.5 | 辅助标题 |
| **body1** | 1rem (16px) | 400 | 1.5 | 正文内容 |
| **body2** | 0.875rem (14px) | 400 | 1.5 | 辅助文字 |
| **caption** | 0.75rem (12px) | 400 | 1.5 | 标签、状态 |
| **button** | 0.875rem (14px) | 500 | 1.5 | 按钮文字 |

### 3.6 过渡动画

| Token | 值 | 使用场景 |
|-------|-----|----------|
| `duration.shortest` | 150ms | 微小交互（hover等） |
| `duration.shorter` | 200ms | 小交互（checkbox等） |
| `duration.short` | 250ms | 中交互（展开/折叠） |
| `duration.standard` | 300ms | 标准交互（按钮等） |
| `easing.easeInOut` | `cubic-bezier(0.4, 0, 0.2, 1)` | 标准缓动 |

---

## 四、页面类型分类

### 4.1 类型分类总览

根据内容展示形式，将所有页面分为 **5大类型**，每种类型有独特的视觉风格：

| 类型 | 图标 | 主色调 | 风格特点 | 适用模块 |
|------|------|--------|----------|----------|
| **列表数据型** | 📋 | `#3b82f6` (蓝色) | 清爽简洁，数据密集 | HRM、CRM、PM、Finance、Flow |
| **详情展示型** | 📄 | `#8b5cf6` (紫色) | 优雅精致，信息丰富 | 各模块详情页 |
| **表单录入型** | 📝 | `#22c55e` (绿色) | 专业高效，引导明确 | 创建/编辑表单 |
| **数据可视化型** | 📊 | `#f59e0b` (橙色) | 活力动感，数据驱动 | BI、Dashboard |
| **特殊交互型** | ⚡ | `#ef4444` (红色) | 个性鲜明，交互丰富 | GIS、IM、Workflow |

### 4.2 列表数据型页面（蓝色主题）

**适用页面：**
- HrmEmployeePage - 员工列表
- CustomerManagementPage - 客户列表
- PmProjectListPage - 项目列表
- FinanceBudgetPage - 预算列表
- FlowApprovalPage - 审批列表

**布局规范：**

```
┌─────────────────────────────────────────────────────┐
│ 搜索框 │ 筛选器 │ 操作按钮                           │
├─────────────────────────────────────────────────────┤
│ 表格头部（排序）                                    │
├─────────────────────────────────────────────────────┤
│ 数据行...                                          │
├─────────────────────────────────────────────────────┤
│ 分页器                                             │
└─────────────────────────────────────────────────────┘
```

**组件使用：**

| 组件 | MUI 组件 | 样式规范 |
|------|----------|----------|
| 表格容器 | `TableContainer` + `Paper` | `borderRadius: 2` |
| 表格头部 | `TableHead` | `bgcolor: 'grey.50'` |
| 表格行 | `TableRow` | `hover: { bgcolor: 'action.hover' }` |
| 操作按钮 | `IconButton` + `Tooltip` | `size="small"` |

### 4.3 详情展示型页面（紫色主题）

**适用页面：**
- HrmEmployeeDetailPage - 员工详情
- CustomerDetailPage - 客户详情
- PmProjectDetailPage - 项目详情

**布局规范：**

```
┌─────────────────────────────────────────────────────┐
│ 返回 │ 标题 / 副标题 │ 操作按钮                      │
├─────────────────────────────────────────────────────┤
│ Tab1 │ Tab2 │ Tab3 │ Tab4 │                        │
├─────────────────────────────────────────────────────┤
│ 主内容区                              │ 侧边栏      │
└─────────────────────────────────────────────────────┘
```

**组件使用：**

| 组件 | MUI 组件 | 样式规范 |
|------|----------|----------|
| 信息卡片 | `Paper` | 渐变背景：`linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)` |
| 标签页 | `Tabs` | 指示器：`height: 3`, `borderRadius: 2` |
| 侧边栏 | `Paper` | `position: 'sticky'`, `top: 80` |

### 4.4 表单录入型页面（绿色主题）

**适用页面：**
- CreateEmployeeForm - 创建员工
- PmProjectCreatePage - 创建项目
- FinanceVoucherPage - 凭证录入

**布局规范：**

```
┌─────────────────────────────────────────────────────┐
│ 返回 │ 表单标题                                     │
├─────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────┐│
│ │ 分组标题                                        ││
│ │ 字段1    字段2    字段3                         ││
│ └─────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────┤
│                     取消  保存                      │
└─────────────────────────────────────────────────────┘
```

**组件使用：**

| 组件 | MUI 组件 | 样式规范 |
|------|----------|----------|
| 提交按钮 | `Button` | `bgcolor: '#22c55e'`, `&:hover: { bgcolor: '#16a34a' }` |
| 必填标记 | `span` | `color: 'error.main'`, `fontWeight: 'bold'` |
| 字段布局 | `Grid` | `xs={12} sm={6} md={4}` |
| 底部栏 | `Paper` | `position: 'sticky'`, `bottom: 0` |

### 4.5 数据可视化型页面（橙色主题）

**适用页面：**
- BIDashboardPage - BI仪表盘
- PmDashboardPage - 项目仪表盘
- CRMDashboardPage - CRM仪表盘

**布局规范：**

```
┌─────────────────────────────────────────────────────┐
│ 页面标题 │ 时间筛选 │ 导出按钮                       │
├─────────────────────────────────────────────────────┤
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                    │
│ │统计1│ │统计2│ │统计3│ │统计4│                    │
│ └─────┘ └─────┘ └─────┘ └─────┘                    │
├─────────────────────────────────────────────────────┤
│ ┌───────────────────┐ ┌───────────────────┐        │
│ │     图表1         │ │     图表2         │        │
│ └───────────────────┘ └───────────────────┘        │
└─────────────────────────────────────────────────────┘
```

**组件使用：**

| 组件 | MUI 组件 | 样式规范 |
|------|----------|----------|
| 统计卡片 | `Card` + `CardContent` | `transition: 'transform 0.2s'` |
| 图表容器 | `Paper` | `borderLeft: '4px solid #f59e0b'` |
| 趋势指示 | `TrendingUp` / `TrendingDown` | 绿涨红跌 |

### 4.6 特殊交互型页面（红色主题）

**适用页面：**
- Gispage - GIS地图
- ChatInterface - 即时通讯
- WorkflowDesignerPage - 流程设计

**设计要点：**
- 个性化交互设计
- 状态实时更新
- 高效操作反馈
- 特殊组件定制

---

## 五、组件规范

### 5.1 基础组件

#### Button 按钮

```tsx
// 变体
<Button variant="contained">主要操作</Button>
<Button variant="outlined">次要操作</Button>
<Button variant="text">文字按钮</Button>

// 尺寸
<Button size="small">小按钮</Button>
<Button size="medium">中按钮</Button>

// 状态
<Button disabled>禁用</Button>
<Button loading>加载中</Button>

// 图标
<Button startIcon={<Plus />}>新建</Button>
<Button endIcon={<ArrowRight />}>下一步</Button>
```

#### TextField 输入框

```tsx
// 标准输入
<TextField
  label="用户名"
  placeholder="请输入用户名"
  size="small"
  fullWidth
/>

// 带前缀
<TextField
  slotProps={{
    input: {
      startAdornment: <Search />,
    }
  }}
  placeholder="搜索..."
/>

// 带后缀
<TextField
  type="password"
  label="密码"
  slotProps={{
    input: {
      endAdornment: <VisibilityIcon />,
    }
  }}
/>

// 错误状态
<TextField
  label="邮箱"
  error
  helperText="请输入有效的邮箱地址"
/>

// 只读
<TextField
  label="订单号"
  value="ORD-2024-001"
  slotProps={{ input: { readOnly: true } }}
/>
```

#### Select 下拉选择

```tsx
<FormControl fullWidth size="small">
  <InputLabel>部门</InputLabel>
  <Select label="部门">
    <MenuItem value="tech">技术部</MenuItem>
    <MenuItem value="sales">销售部</MenuItem>
    <MenuItem value="hr">人力资源部</MenuItem>
  </Select>
</FormControl>
```

#### Chip 标签

```tsx
// 状态标签
<Chip label="在职" sx={{ bgcolor: '#eff6ff', color: '#1d4ed8' }} />
<Chip label="离职" sx={{ bgcolor: '#fef2f2', color: '#dc2626' }} />
<Chip label="待审核" sx={{ bgcolor: '#fffbeb', color: '#92400e' }} />

// 可删除
<Chip label="标签" onDelete={handleDelete} />

// 可点击
<Chip label="点击" onClick={handleClick} />
```

#### Card 卡片

```tsx
// 标准卡片
<Card>
  <CardContent>
    <Typography variant="h6">卡片标题</Typography>
    <Typography variant="body2">卡片内容</Typography>
  </CardContent>
</Card>

// 可悬停卡片
<Card sx={{ 
  cursor: 'pointer',
  transition: 'transform 0.2s, box-shadow 0.2s',
  '&:hover': { transform: 'translateY(-4px)' }
}}>
  <CardContent>...</CardContent>
</Card>
```

#### Table 表格

```tsx
<TableContainer component={Paper} sx={{ borderRadius: 2 }}>
  <Table>
    <TableHead sx={{ bgcolor: 'grey.50' }}>
      <TableRow>
        <TableCell>列1</TableCell>
        <TableCell>列2</TableCell>
        <TableCell align="right">操作</TableCell>
      </TableRow>
    </TableHead>
    <TableBody>
      <TableRow hover>
        <TableCell>数据1</TableCell>
        <TableCell>数据2</TableCell>
        <TableCell align="right">
          <IconButton size="small"><Edit /></IconButton>
        </TableCell>
      </TableRow>
    </TableBody>
  </Table>
</TableContainer>
```

### 5.2 复合组件

#### Dialog 对话框

```tsx
<Dialog 
  open={open} 
  onClose={handleClose}
  maxWidth="sm"
  fullWidth
>
  <DialogTitle>标题</DialogTitle>
  <DialogContent>内容</DialogContent>
  <DialogActions>
    <Button onClick={handleClose}>取消</Button>
    <Button variant="contained" onClick={handleConfirm}>确认</Button>
  </DialogActions>
</Dialog>
```

#### Tabs 标签页

```tsx
<Tabs 
  value={value} 
  onChange={handleChange}
  sx={{
    '& .MuiTabs-indicator': {
      backgroundColor: 'primary.main',
      height: 3,
      borderRadius: 2,
    }
  }}
>
  <Tab label="标签1" />
  <Tab label="标签2" />
  <Tab label="标签3" disabled />
</Tabs>
```

#### Tooltip 提示

```tsx
<Tooltip title="查看详情" placement="top">
  <IconButton>
    <Eye />
  </IconButton>
</Tooltip>
```

#### Skeleton 加载骨架

```tsx
<Skeleton variant="rectangular" width={200} height={120} />
<Skeleton variant="text" width="80%" />
<Skeleton variant="circular" width={40} height={40} />
```

### 5.3 组件样式规范

| 组件 | 默认圆角 | 悬停效果 | 禁用透明度 |
|------|----------|----------|-----------|
| Button | `borderRadius: 1` | `boxShadow` 增强 | `opacity: 0.5` |
| Card | `borderRadius: 2` | `transform: translateY(-2px)` | - |
| TextField | `borderRadius: 1` | 边框高亮 | `bgcolor: action.disabled` |
| Chip | `borderRadius: 1` | 背景加深 | `opacity: 0.5` |
| Paper | `borderRadius: 1` | - | - |
| Dialog | `borderRadius: 2` | - | - |

---

## 六、布局规范

### 6.1 页面布局

```tsx
// 标准页面容器
<Box 
  sx={{ 
    maxWidth: 'xl',
    mx: 'auto',
    p: 3,
  }}
>
  {/* 页面内容 */}
</Box>
```

### 6.2 响应式断点

| 断点 | 宽度 | 用途 |
|------|------|------|
| `xs` | 0-599px | 手机 |
| `sm` | 600-899px | 平板竖屏 |
| `md` | 900-1199px | 平板横屏 |
| `lg` | 1200-1535px | 桌面 |
| `xl` | 1536px+ | 大桌面 |

### 6.3 Grid 布局

```tsx
// 两列布局
<Grid container spacing={3}>
  <Grid size={{ xs: 12, md: 6 }}>左列</Grid>
  <Grid size={{ xs: 12, md: 6 }}>右列</Grid>
</Grid>

// 三列布局
<Grid container spacing={3}>
  <Grid size={{ xs: 12, sm: 6, md: 4 }}>第一</Grid>
  <Grid size={{ xs: 12, sm: 6, md: 4 }}>第二</Grid>
  <Grid size={{ xs: 12, sm: 12, md: 4 }}>第三</Grid>
</Grid>

// 四列布局（统计卡片）
<Grid container spacing={2}>
  <Grid size={{ xs: 6, sm: 3 }}>卡片1</Grid>
  <Grid size={{ xs: 6, sm: 3 }}>卡片2</Grid>
  <Grid size={{ xs: 6, sm: 3 }}>卡片3</Grid>
  <Grid size={{ xs: 6, sm: 3 }}>卡片4</Grid>
</Grid>
```

### 6.4 Stack 布局

```tsx
// 垂直间距
<Stack spacing={2}>
  <Item>1</Item>
  <Item>2</Item>
  <Item>3</Item>
</Stack>

// 水平间距
<Stack direction="row" spacing={2}>
  <Button>取消</Button>
  <Button variant="contained">确认</Button>
</Stack>

// 居中对齐
<Stack 
  direction="row" 
  justifyContent="center" 
  alignItems="center"
>
  内容
</Stack>
```

---

## 七、导航系统

### 7.1 顶部导航 TopNav

```tsx
<AppBar 
  position="sticky"
  sx={{
    top: 0,
    zIndex: 1300,
    borderBottom: 1,
    borderColor: 'divider',
    bgcolor: 'background.paper',
    boxShadow: 'none',
  }}
>
  <Container maxWidth="xl">
    <Box display="flex" alignItems="center" justifyContent="space-between">
      {/* Logo */}
      <Box display="flex" alignItems="center" gap={2}>
        <Box sx={{ width: 36, height: 36, bgcolor: 'primary.main', borderRadius: 1 }}>
          <Building sx={{ color: 'white', width: 20, height: 20 }} />
        </Box>
        <Typography variant="h6" fontWeight={700}>TOPEMS</Typography>
      </Box>

      {/* 导航菜单 */}
      <Box display="flex" gap={1}>
        {navItems.map((item) => (
          <Button
            key={item.id}
            onClick={() => handleNavigate(item.path)}
          >
            {item.label}
          </Button>
        ))}
      </Box>

      {/* 右侧操作 */}
      <Box display="flex" alignItems="center" gap={2}>
        <IconButton onClick={toggleTheme}>
          {mode === 'dark' ? <Sun /> : <Moon />}
        </IconButton>
        <IconButton><Bell /></IconButton>
        <Avatar sx={{ bgcolor: 'secondary.main' }}><User /></Avatar>
      </Box>
    </Box>
  </Container>
</AppBar>
```

### 7.2 导航分组配置

| 顶部菜单 | 下拉子模块 |
|---------|-----------|
| **首页** | 仪表盘、最近访问、快捷入口、待办事项 |
| **人力** | 员工、部门、考勤、薪酬、绩效、招聘、培训、合同 |
| **客户** | 客户、商机、联系人、交互、评分、预测 |
| **项目** | 项目列表、新建项目、合同管理、模板库、项目报表 |
| **数据** | 分析仪表盘、报表中心、数据源管理、可视化编辑器 |
| **运营** | 资产台账、设备管理、行政综合、办公用品、车辆、会议室 |
| **工作流** | 审批中心、实例监控、版本管理、流程统计 |
| **协作** | 即时通讯、邮件、文件管理、AI助手 |
| **更多 ▾** | 研发创新(LIMS/RS/PDM)、质量安全(QMS/EHS)、供应链(SRM)、地理信息(GIS)、系统管理、帮助 |

### 7.3 面包屑导航

```tsx
<Breadcrumbs>
  <Link href="/" underline="hover" color="inherit">
    <Home style={{ width: 16, height: 16 }} />
  </Link>
  <Link href="/hrm" underline="hover" color="inherit">
    人力
  </Link>
  <Typography color="text.primary">员工列表</Typography>
</Breadcrumbs>
```

### 7.4 Tab 标签页

```tsx
<Tabs 
  variant="scrollable"
  scrollButtons="auto"
  sx={{ borderBottom: 1, borderColor: 'divider' }}
>
  <Tab label="基本信息" />
  <Tab label="考勤记录" />
  <Tab label="薪酬档案" />
</Tabs>
```

---

## 八、主题系统

### 8.1 主题配置

```typescript
// src/theme/theme.ts
export const createCustomTheme = (mode: PaletteMode): Theme => {
  return createTheme({
    palette: {
      mode,
      primary: designTokens.colors.primary,
      secondary: designTokens.colors.secondary,
      success: designTokens.colors.success,
      warning: designTokens.colors.warning,
      error: designTokens.colors.error,
      info: designTokens.colors.info,
      grey: designTokens.colors.grey,
      background: {
        default: mode === 'dark' ? '#111827' : '#f8fafc',
        paper: mode === 'dark' ? '#1f2937' : '#ffffff',
      },
      text: {
        primary: mode === 'dark' ? '#f9fafb' : '#1e293b',
        secondary: mode === 'dark' ? '#9ca3af' : '#64748b',
      },
      divider: mode === 'dark' ? '#374151' : '#e2e8f0',
    },
    typography: designTokens.typography,
    shape: { borderRadius: designTokens.borderRadius.md },
    spacing: (factor: number) => `${factor * 8}px`,
    breakpoints: designTokens.breakpoints,
    components: {
      // 组件样式覆盖
    },
  });
};
```

### 8.2 主题切换 Hook

```typescript
// src/hooks/useAppTheme.ts
export const useAppTheme = () => {
  const [mode, setMode] = useState<PaletteMode>(() => {
    const saved = localStorage.getItem('themeMode');
    return (saved as PaletteMode) || 'light';
  });

  const theme = useMemo(() => createCustomTheme(mode), [mode]);

  const toggleTheme = useCallback(() => {
    const newMode: PaletteMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    localStorage.setItem('themeMode', newMode);
  }, [mode]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
  }, [mode]);

  return { theme, mode, toggleTheme };
};
```

### 8.3 深色模式颜色映射

| 元素 | 浅色模式 | 深色模式 |
|------|----------|----------|
| 页面背景 | `#f8fafc` | `#111827` |
| 卡片背景 | `#ffffff` | `#1f2937` |
| 文字主色 | `#1e293b` | `#f9fafb` |
| 文字次色 | `#64748b` | `#9ca3af` |
| 边框 | `#e2e8f0` | `#374151` |
| 悬停背景 | `#f3f4f6` | `#374151` |

---

## 九、性能优化

### 9.1 组件性能

```tsx
// React.memo 优化纯展示组件
const UserAvatar = React.memo<{ user: User }>(({ user }) => (
  <Avatar src={user.avatar}>{user.name[0]}</Avatar>
));

// useMemo 优化计算
const sortedData = useMemo(() => {
  return [...data].sort((a, b) => a.name.localeCompare(b.name));
}, [data]);

// useCallback 优化回调
const handleClick = useCallback((id: string) => {
  setSelectedId(id);
}, []);
```

### 9.2 路由懒加载

```tsx
// 路由懒加载
const HrmEmployeePage = lazy(() => import('../pages/HrmEmployeePage'));

// 带错误处理的懒加载
const lazyWithRetry = <T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) => {
  return lazy(async () => {
    try {
      return await factory();
    } catch (error) {
      console.error('Failed to load component:', error);
      return { default: ErrorPage as any };
    }
  });
};
```

### 9.3 性能指标

| 指标 | 目标值 | 说明 |
|------|--------|------|
| LCP | < 2.5s | 最大内容绘制 |
| FID | < 100ms | 首次输入延迟 |
| CLS | < 0.1 | 累积布局偏移 |
| TTI | < 3.8s | 可交互时间 |

---

## 十、可访问性标准

### 10.1 ARIA 标签

```tsx
// 按钮
<IconButton aria-label="删除" onClick={handleDelete}>
  <Trash2 />
</IconButton>

// 输入框
<TextField
  label="邮箱"
  required
  slotProps={{
    input: {
      'aria-describedby': 'email-helper',
    }
  }}
/>
<div id="email-helper" className="helper">
  请输入有效的邮箱地址
</div>

// 表格
<table role="table" aria-label="员工列表">
  <thead>
    <tr>
      <th scope="col">姓名</th>
      <th scope="col">部门</th>
    </tr>
  </thead>
</table>
```

### 10.2 键盘导航

```tsx
// 对话框关闭
useEffect(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };
  document.addEventListener('keydown', handleEscape);
  return () => document.removeEventListener('keydown', handleEscape);
}, [onClose]);

// 可点击元素
<Box
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') handleClick();
  }}
>
  点击我
</Box>
```

### 10.3 颜色对比度

| 内容类型 | 最小对比度 | WCAG 级别 |
|----------|-----------|-----------|
| 正常文字 | 4.5:1 | AA |
| 大文字 (18pt+) | 3:1 | AA |
| 图标和 UI 元素 | 3:1 | AA |

---

## 十一、实施检查清单

### 11.1 代码检查

- [ ] 所有组件从 `@mui/material` 导入
- [ ] 所有图标从 `lucide-react` 导入
- [ ] 无 `className` 混合使用 Tailwind
- [ ] 无 `shadcn/ui` 组件引用
- [ ] TypeScript 类型完整，无 `any`
- [ ] ESLint 检查通过
- [ ] 响应式布局适配完成

### 11.2 样式检查

- [ ] 使用 `sx` prop 或 styled 组件
- [ ] 颜色使用主题变量（如 `primary.main`）
- [ ] 间距使用 8px 基准
- [ ] 圆角使用设计系统 token
- [ ] 阴影使用设计系统 token

### 11.3 功能检查

- [ ] 表单验证正常工作
- [ ] 搜索和筛选功能正常
- [ ] 分页功能正常
- [ ] 排序功能正常
- [ ] 主题切换功能正常
- [ ] 暗黑模式显示正确

### 11.4 性能检查

- [ ] 首屏加载时间 < 2s
- [ ] 无控制台错误
- [ ] 无内存泄漏
- [ ] 图片正确懒加载

---

## 附录

### A. 常用样式映射

| Tailwind | MUI sx |
|----------|--------|
| `p-4` | `p: 2` |
| `m-4` | `m: 2` |
| `gap-4` | `gap: 2` |
| `flex` | `display: 'flex'` |
| `flex-col` | `flexDirection: 'column'` |
| `items-center` | `alignItems: 'center'` |
| `justify-between` | `justifyContent: 'space-between'` |
| `w-full` | `width: '100%'` |
| `h-screen` | `height: '100vh'` |
| `rounded-lg` | `borderRadius: 2` |
| `shadow-md` | `boxShadow: 2` |
| `text-sm` | `fontSize: '0.875rem'` |
| `font-bold` | `fontWeight: 700` |

### B. 相关文档

| 文档 | 说明 |
|------|------|
| [UI 重构设计方案](./ui-redesign-design.md) | UI 重构设计 |
| [UI 系统重构实施方案](./ui-system-redesign.md) | 实施计划 |
| [前端优化标准](./FRONTEND_OPTIMIZATION_STANDARD.md) | 性能与标准 |
| [GIS 模块设计](./superpowers/specs/2026-06-13-gis-module-redesign-design.md) | 特殊模块设计 |

### C. 参考资源

- [MUI 官方文档](https://mui.com/)
- [Material Design 3](https://m3.material.io/)
- [React Hook Form](https://react-hook-form.com/)
- [Lucide 图标库](https://lucide.dev/)

---

**文档审批**

| 角色 | 签名 | 日期 |
|------|------|------|
| 前端负责人 | - | 2026-06-15 |
| UI设计师 | - | - |
| QA负责人 | - | - |

---

*本文档由 TOPEMS 前端团队维护*
*版本: v3.0.0*
*最后更新: 2026-06-15*