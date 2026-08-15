# TOPEMS UI 设计规范与标准

| 项目 | 内容 |
|------|------|
| **文档版本** | v5.0.0 |
| **创建日期** | 2026-06-18 |
| **适用阶段** | 插件化架构 UI 重构 |
| **状态** | 实施中 |
| **维护团队** | TOPEMS 前端团队 |
| **架构适配** | 支持插件化架构、Module Federation 微前端 |

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
9. [插件化 UI 规范](#九插件化-ui-规范)
10. [性能优化](#十性能优化)
11. [可访问性标准](#十一可访问性标准)
12. [实施检查清单](#十二实施检查清单)

---

## 一、设计原则

### 1.1 核心原则

| 原则 | 说明 | 优先级 |
|------|------|--------|
| **一致性** | 统一的视觉风格和交互模式，插件必须遵循平台设计规范 | P0 |
| **可扩展性** | 支持插件动态注册、主题定制、导航扩展 | P0 |
| **简洁性** | 清晰的信息层级，减少视觉噪音 | P0 |
| **可用性** | 直观的操作流程，降低学习成本 | P0 |
| **响应式** | 适配不同屏幕尺寸 | P0 |
| **模块化** | 组件可独立开发、测试、部署，支持微前端架构 | P0 |
| **无障碍** | 支持键盘导航和屏幕阅读器 | P1 |
| **性能优先** | 首屏加载快，交互流畅，按需加载插件 | P0 |

### 1.2 UI 决策原则

```
1. 功能性 > 美观性：确保功能完整后再优化视觉
2. 一致性 > 个性化：平台提供统一设计系统，插件可适度定制主题色
3. 渐进增强 > 一步到位：分阶段迭代优化
4. 用户测试 > 设计直觉：用数据验证设计决策
5. 模块化 > 一体化：每个插件独立开发，通过设计系统保证统一体验
6. 按需加载 > 全量打包：插件采用懒加载，提升首屏性能
```

### 1.3 首页布局模式

**采用混合模式（仪表盘 + 模块入口 + 服务监控）：**

| 布局区域 | 功能 | 优先级 |
|----------|------|--------|
| 顶部栏 | Logo、搜索、通知、主题切换、用户头像 | P0 |
| 欢迎语区 | 动态问候语、用户名 | P1 |
| 统计卡片区 | 待审批、待处理、在线用户、文件数量 | P0 |
| 服务监控区 | 实时健康状态、请求数、异常服务 | P0 |
| 模块入口区 | 已安装插件的大图标卡片网格 | P0 |
| 待办事项区 | 审批任务、待处理任务列表 | P1 |

---

## 二、技术栈规范

### 2.1 核心技术栈

| 技术 | 版本 | 用途 | 状态 |
|------|------|------|------|
| **React** | 19.0+ | UI 框架 | ✅ 标准 |
| **TypeScript** | 5.4+ | 类型系统 | ✅ 标准 |
| **MUI (Material UI)** | 6.x → **9.x** (升级中) | 主 UI 组件库 | ⚠️ 升级中 |
| **Vite** | 6.2+ | 构建工具 | ✅ 标准 |
| **@module-federation/vite** | 1.0+ | 微前端模块联邦 | ✅ 标准 |
| **React Router** | 7.0+ | 路由管理 | ✅ 标准 |
| **React Hook Form** | 7.x | 表单处理 | ✅ 标准 |
| **Zod** | 3.x | 数据验证 | ✅ 标准 |
| **Lucide React** | 1.x | 图标库 | ✅ 标准 |
| **Emotion** | v11.x | CSS-in-JS (MUI内置) | ✅ 标准 |
| **React Query** | 5.x | 数据缓存 | ✅ 推荐 |
| **Zustand** | 4.5+ | 状态管理 | ✅ 推荐 |

### 2.2 MUI 版本升级说明

| 阶段 | 版本 | 说明 | 状态 |
|------|------|------|------|
| 当前 | 6.x | 现有生产版本 | ✅ 运行中 |
| 目标 | 9.x | 最新稳定版 | ⚠️ 升级中 |
| 变更点 | - | Grid v2 API、样式系统优化 | 需迁移 |

### 2.3 微前端架构说明

采用 **Module Federation** 实现前端模块化：

| 角色 | 说明 | 端口 |
|------|------|------|
| **Host (Portal)** | 主应用 Shell，提供布局、导航、主题 | 3000 |
| **Remote (Core)** | 核心平台模块（IAM、Doc、Flow等） | 3001 |
| **Remote (Plugins)** | 业务插件模块（ERP、HRM、CRM等） | 3002+ |

**部署模式：**

| 模式 | 说明 | 适用场景 |
|------|------|----------|
| **Module Federation** | 动态加载，按需拉取插件 | SaaS 多租户 |
| **静态打包** | 一次性打包所有模块 | 本地安装版 |
| **混合模式** | 核心静态 + 插件动态 | 私有化定制 |

### 2.4 已移除技术栈

| 技术 | 原用途 | 移除原因 | 完成时间 |
|------|--------|----------|----------|
| Tailwind CSS | 辅助样式 | 统一使用 MUI sx | 2026-06 |
| shadcn/ui | 组件库 | 统一使用 MUI | 2026-06 |
| @mui/icons-material | 图标库 | 统一使用 lucide-react | 2026-06 |

### 2.5 组件导入规范

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

### 2.6 组件库统一规范

| 组件类型 | 存放位置 | 说明 |
|----------|----------|------|
| **MUI 封装组件** | `components/mui/` | 基于 MUI 的业务组件 |
| **通用业务组件** | `components/common/` | 与框架无关的通用组件 |
| **页面模板组件** | `components/templates/` | 页面级模板 |
| **业务模块组件** | `components/{module}/` | 按模块划分的组件 |

**废弃组件清单：**

| 组件 | 废弃时间 | 替代方案 |
|------|----------|----------|
| `components/ui/shadcn.tsx` | 2026-06 | 使用 `components/mui/` |
| `components/ui/Button.tsx` | 2026-06 | 使用 `@mui/material/Button` |

---

## 三、设计 Token 系统

> **重要**：所有设计 Token 必须从 `theme/tokens.ts` 和 `theme/gradients.ts` 导入使用，禁止硬编码颜色值。

### 3.1 设计 Token 文件结构

```
apps/web/src/theme/
├── tokens.ts      # 设计变量（颜色、字体、间距、阴影等）
├── gradients.ts   # 渐变变量（模块渐变、状态渐变等）
└── theme.ts      # MUI 主题配置
```

### 3.2 颜色系统

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

> **重要**：导航系统统一使用 `NavigationRegistry` 作为唯一事实来源，禁止在组件中硬编码导航配置。

### 7.1 导航架构设计

采用 **动态注册 + 三级导航 + 插件化架构**：

```
┌─────────────────────────────────────────────────────────┐
│                    导航架构                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────┐                       │
│  │  NavigationRegistry          │ ← 导航注册中心（唯一数据源）│
│  │  - 插件导航注册               │                       │
│  │  - 事件通知机制               │                       │
│  │  - 权限过滤                   │                       │
│  └──────────────┬────────────────┘                       │
│                 │                                        │
│                 ▼                                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │           三级导航渲染                           │   │
│  │                                                 │   │
│  │  L1: Header全局导航 ← TopNav (动态读取Registry) │   │
│  │  L2: 侧边栏导航 ← Sidebar (按模块渲染)          │   │
│  │  L3: 页面内部导航 ← 页面组件内部实现            │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 7.2 导航数据模型

```typescript
// types/navigation.ts
export interface NavItem {
  code: string;           // 唯一标识
  label: string;          // 显示文本
  icon?: string;          // Lucide 图标名称
  path?: string;          // 路由路径
  permission?: string;    // 权限码
  order?: number;         // 排序
  children?: NavItem[];   // 子导航项
  badge?: number | string; // 徽章
  badgeColor?: 'primary' | 'success' | 'warning' | 'error';
}

export interface ModuleCardConfig {
  code: string;
  name: string;
  icon: string;
  path: string;
  permission?: string;
  status?: 'online' | 'beta' | 'plan' | 'new';
  order?: number;
}

export interface PluginNavConfig {
  top_nav?: NavItem[];       // Header 导航项
  sidebar_nav?: NavItem[];   // 侧边栏导航项
  module_tabs?: NavItem[];   // 模块 Tab
  module_card?: ModuleCardConfig;  // 首页模块卡片
}
```

### 7.3 NavigationRegistry API

```typescript
// lib/NavigationRegistry.ts
class NavigationRegistry {
  // 单例获取
  static getInstance(): NavigationRegistry;

  // 注册插件导航
  register(pluginCode: string, config: PluginNavConfig): void;

  // 注销插件导航
  unregister(pluginCode: string): void;

  // 获取 Header 导航项
  getTopNavItems(): NavItem[];

  // 获取侧边栏导航项
  getSidebarNavItems(pluginCode: string): NavItem[];

  // 获取模块 Tab
  getModuleTabs(pluginCode: string): NavItem[];

  // 获取首页模块卡片
  getModuleCards(): ModuleCardConfig[];

  // 按权限过滤导航项
  getNavItemsByPermission(hasPermission: (perm: string) => boolean): NavItem[];

  // 更新插件状态
  updateModuleStatus(pluginCode: string, status: 'online' | 'beta' | 'plan' | 'new'): void;

  // 事件发射器（导航更新通知）
  emitter: EventEmitter;
}
```

### 7.4 插件导航注册流程

```typescript
// 插件入口文件
import { navigationRegistry } from '@topems/shared';

export const pluginManifest = {
  pluginCode: 'hrm',
  name: '人力资源',
  version: '1.0.0',
  navigation: {
    top_nav: [
      { code: 'hrm', label: '人力资源', icon: 'Users', path: '/hrm', order: 1, permission: 'hrm:read' }
    ],
    sidebar_nav: [
      { code: 'hrm-employee', label: '员工管理', icon: 'Users', path: '/hrm/employees' },
      { code: 'hrm-department', label: '部门管理', icon: 'Building', path: '/hrm/departments' }
    ],
    module_tabs: [
      { code: 'hrm-dashboard', label: '仪表盘', path: '/hrm/dashboard', pinned: true },
      { code: 'hrm-employee', label: '员工', path: '/hrm/employees' },
      { code: 'hrm-attendance', label: '考勤', path: '/hrm/attendance' }
    ],
    module_card: {
      code: 'hrm',
      name: '人力资源管理',
      icon: 'Users',
      path: '/hrm',
      status: 'online',
      order: 1
    }
  }
};

// 初始化时注册
navigationRegistry.register('hrm', pluginManifest.navigation);
```

### 7.5 Header 导航组件

```tsx
// components/layout/TopNav.tsx
export const TopNav: React.FC = observer(() => {
  const registry = NavigationRegistry.getInstance();
  const [topNavItems, setTopNavItems] = useState<NavItem[]>([]);

  useEffect(() => {
    const updateNav = () => setTopNavItems(registry.getTopNavItems());
    registry.emitter.on('navigationUpdated', updateNav);
    updateNav();
    return () => registry.emitter.off('navigationUpdated', updateNav);
  }, []);

  return (
    <AppBar position="sticky">
      {/* Logo */}
      <Box>TOPEMS</Box>
      {/* 动态导航 */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        {topNavItems.map(item => (
          <NavMenuItem key={item.code} item={item} />
        ))}
      </Box>
    </AppBar>
  );
});
```

### 7.6 核心模块导航配置

| 顶部菜单 | 路径 | 图标 | 权限 | 排序 |
|---------|------|------|------|------|
| **首页** | `/dashboard` | Home | - | 0 |
| **人力** | `/hrm` | Users | hrm:access | 1 |
| **客户** | `/crm` | Users2 | crm:access | 2 |
| **项目** | `/pm` | FolderKanban | pm:access | 3 |
| **工作流** | `/flow` | GitBranch | flow:access | 4 |
| **协作** | `/im` | MessageCircle | im:access | 5 |
| **系统** | `/iam` | Settings | iam:access | 99 |

### 7.7 面包屑导航

```tsx
// components/layout/PageBreadcrumb.tsx
< Breadcrumbs>
  <Link href="/" underline="hover" color="inherit">
    <Home style={{ width: 16, height: 16 }} />
  </Link>
  <Link href="/hrm" underline="hover" color="inherit">
    人力
  </Link>
  <Typography color="text.primary">员工列表</Typography>
</Breadcrumbs>
```

### 7.8 侧边栏导航组件

```tsx
// components/layout/Sidebar.tsx
interface SidebarProps {
  pluginCode: string;
  activePath: string;
}

export const Sidebar: React.FC<SidebarProps> = observer(({ pluginCode, activePath }) => {
  const registry = NavigationRegistry.getInstance();
  const sidebarItems = registry.getSidebarNavItems(pluginCode);

  if (!sidebarItems.length) return null;

  return (
    <Box sx={{ width: 220, borderRight: 1, borderColor: 'divider', p: 1 }}>
      {sidebarItems.map(item => (
        <SidebarNavItem key={item.code} item={item} activePath={activePath} />
      ))}
    </Box>
  );
});
```

### 7.9 模块 Tab 导航

```tsx
// components/layout/ModuleTabs.tsx
interface ModuleTabsProps {
  pluginCode: string;
  activePath: string;
  onTabChange: (path: string) => void;
}

export const ModuleTabs: React.FC<ModuleTabsProps> = observer(({ 
  pluginCode, 
  activePath, 
  onTabChange 
}) => {
  const registry = NavigationRegistry.getInstance();
  const tabs = registry.getModuleTabs(pluginCode) || [];

  return (
    <Tabs 
      value={activePath}
      onChange={(e, value) => onTabChange(value as string)}
      sx={{ borderBottom: 1, borderColor: 'divider' }}
    >
      {tabs.map(tab => (
        <Tab key={tab.code} label={tab.label} value={tab.path} />
      ))}
    </Tabs>
  );
});
```

### 7.10 导航权限过滤

```typescript
// 权限检查 Hook
const useNavPermission = () => {
  const { permissions } = useUser();

  const hasPermission = useCallback((permission?: string) => {
    if (!permission) return true;
    return permissions.includes(permission);
  }, [permissions]);

  return { hasPermission };
};

// 获取过滤后的导航
const filteredNav = registry.getNavItemsByPermission(hasPermission);
```

### 7.11 旧导航配置迁移

| 旧配置 | 新配置 | 说明 |
|--------|--------|------|
| `navigation-v2.ts` | `NavigationRegistry` | 合并到注册中心 |
| `topNavItems` | `registry.getTopNavItems()` | 动态获取 |
| `pluginNavigation` | `registry.register()` | 动态注册 |
| `suiteNavigation` | `registry.register()` | 按套件分组注册 |
| `moduleTabsConfig` | `registry.getModuleTabs()` | 按模块获取 |

### 7.12 模块布局组件 (ModuleLayout)

为了统一插件模块页面的布局，平台提供 `ModuleLayout` 组件，自动组合 `Sidebar`、`ModuleTabs`、`PageBreadcrumb`、`PageHeader`。

**文件**：`apps/web/src/components/layout/ModuleLayout.tsx`

**核心特性**：

| 特性 | 说明 |
|------|------|
| **自动导航获取** | 从 `NavigationRegistry` 自动获取侧边栏和 Tab |
| **动态面包屑** | 根据 URL 路径自动生成面包屑 |
| **响应式适配** | 移动端自动隐藏侧边栏 |
| **pluginCode 解析** | 支持显式 prop 或 URL 参数自动解析 |

**使用示例**：

```tsx
import { ModuleLayout } from '@/components/layout/ModuleLayout';

// 方式 1：显式指定 pluginCode
<ModuleLayout pluginCode="erp">
  <Outlet />
</ModuleLayout>

// 方式 2：从 URL 参数自动解析
<Route 
  path="/:pluginCode/*" 
  element={
    <ModuleLayout>
      <Outlet />
    </ModuleLayout>
  } 
/>
```

**布局结构**：

```
┌─────────────────────────────────────────────────┐
│ Header (TopNav)                                  │
├──────────┬──────────────────────────────────────┤
│          │ ModuleTabs                            │
│ Sidebar  ├──────────────────────────────────────┤
│ (L2)     │ Breadcrumb                            │
│          │ PageHeader                            │
│          ├──────────────────────────────────────┤
│          │                                      │
│          │ Page Content                          │
│          │                                      │
└──────────┴──────────────────────────────────────┘
```

### 7.13 插件生命周期管理 (PluginLifecycleManager)

为了支持插件动态加载/卸载时自动注册/清理导航，平台提供 `PluginLifecycleManager` 单例。

**文件**：`apps/web/src/lib/PluginLifecycleManager.ts`

**核心 API**：

| 方法 | 说明 |
|------|------|
| `loadPlugin(code, config)` | 加载插件并注册导航 |
| `unloadPlugin(code)` | 卸载插件并清理导航 |
| `loadAllPlugins(plugins)` | 批量加载插件 |
| `unloadAllPlugins()` | 批量卸载所有插件 |
| `updatePluginNavConfig(code, config)` | 动态更新插件导航 |
| `getLoadedPlugins()` | 获取已加载插件列表 |
| `emitter` | 事件发射器 |

**事件列表**：

| 事件 | 触发时机 | 参数 |
|------|----------|------|
| `pluginLoaded` | 插件加载完成 | `(code, info)` |
| `pluginUnloaded` | 插件卸载完成 | `(code)` |
| `pluginError` | 加载/卸载错误 | `(code, info)` |
| `pluginNavUpdated` | 导航配置更新 | `(code, navConfig)` |

**使用示例**：

```typescript
import { pluginLifecycleManager } from '@/lib/PluginLifecycleManager';

// 加载单个插件
await pluginLifecycleManager.loadPlugin('erp', {
  code: 'erp',
  name: '企业资源管理',
  version: '1.0.0',
  navConfig: {
    top_nav: [...],
    sidebar_nav: [...],
    module_tabs: [...],
    module_card: {...},
  },
});

// 批量加载
await pluginLifecycleManager.loadAllPlugins([erpConfig, crmConfig, hrmConfig]);

// 监听事件
pluginLifecycleManager.emitter.on('pluginLoaded', (code, info) => {
  console.log(`Plugin ${code} loaded`, info);
});

// 卸载插件
await pluginLifecycleManager.unloadPlugin('erp');
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

### 8.4 插件主题定制

插件可以通过 `plugin.yaml` 声明主题定制：

```yaml
theme:
  primary: '#10b981'       # 插件专属主色调（可选）
  accent: '#059669'        # 插件强调色（可选）
  dark_mode: true          # 是否支持深色模式
```

**主题继承规则：**

| 优先级 | 来源 | 说明 |
|--------|------|------|
| 1 | 插件定制 | 插件可覆盖主色调 |
| 2 | 租户配置 | 租户级主题定制 |
| 3 | 平台默认 | 平台统一主题 |

---

## 九、插件化 UI 规范

### 9.1 插件 UI 架构

```
┌─────────────────────────────────────────────────────────┐
│                    Host Shell (Portal)                   │
│  ┌─────────────────────────────────────────────────┐   │
│  │  布局容器、主题系统、导航框架、公共组件           │   │
│  └─────────────────────────────────────────────────┘   │
│                          │                              │
│          ┌───────────────┼───────────────┐              │
│          ▼               ▼               ▼              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │
│  │ Remote Core │ │ Remote ERP  │ │ Remote HRM  │        │
│  │ (统一核心)   │ │ (业务插件)   │ │ (业务插件)   │        │
│  └─────────────┘ └─────────────┘ └─────────────┘        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 9.2 插件 UI 开发规范

#### 9.2.1 目录结构

```
plugin-erp/
├── src/
│   ├── api/              # API 层
│   ├── components/       # 插件专属组件
│   ├── pages/            # 页面组件
│   ├── store/            # 状态管理
│   ├── types/            # 类型定义
│   ├── utils/            # 工具函数
│   └── index.ts          # 导出入口
├── vite.config.ts        # Module Federation 配置
├── plugin.yaml           # 插件元数据
└── package.json
```

#### 9.2.2 模块联邦配置

```typescript
// vite.config.ts
import { federation } from '@module-federation/vite';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'topems_erp',
      filename: 'remoteEntry.js',
      exposes: {
        './pages/Dashboard': './src/pages/Dashboard',
        './pages/AssetList': './src/pages/AssetList',
        './pages/FinanceList': './src/pages/FinanceList',
        './store/erpStore': './src/store/erpStore.ts',
        './navigation': './src/navigation.ts',
      },
      shared: {
        'react': { singleton: true, requiredVersion: '^19.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^19.0.0' },
        'react-router-dom': { singleton: true, requiredVersion: '^7.0.0' },
        '@mui/material': { singleton: true, requiredVersion: '^9.0.0' },
        'zustand': { singleton: true },
      },
    }),
  ],
});
```

#### 9.2.3 导航导出

```typescript
// src/navigation.ts
export const erpNavConfig: PluginNavConfig = {
  top_nav: [
    { code: 'erp', label: '企业资源', icon: 'Building2', path: '/erp', permission: 'erp:access', order: 6 },
  ],
  module_tabs: [
    { label: '概览', path: '/erp', icon: 'LayoutDashboard' },
    { label: '资产', path: '/erp/assets', icon: 'Package', permission: 'erp:asset:read' },
    { label: '财务', path: '/erp/finance', icon: 'DollarSign', permission: 'erp:finance:read' },
    { label: '预算', path: '/erp/budget', icon: 'PieChart', permission: 'erp:budget:read' },
  ],
};
```

### 9.3 插件 UI 约束

| 约束项 | 要求 | 说明 |
|--------|------|------|
| **组件库** | 必须使用 `@mui/material` | 确保视觉一致性 |
| **图标** | 必须使用 `lucide-react` | 统一图标风格 |
| **主题** | 使用平台 ThemeProvider | 继承平台主题 |
| **路由** | 使用 `react-router-dom` | 统一路由管理 |
| **状态** | 使用 `zustand` | 统一状态管理 |
| **样式** | 使用 MUI sx | 统一样式方案 |

### 9.4 插件独立部署

插件支持独立部署为单独产品：

```typescript
// 独立部署模式
if (process.env.VITE_STANDALONE === 'true') {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <ThemeProvider theme={createCustomTheme('light')}>
      <BrowserRouter>
        <ERPApp />
      </BrowserRouter>
    </ThemeProvider>
  );
}
```

### 9.5 统一设计体系保障

| 保障措施 | 说明 |
|----------|------|
| **共享组件库** | `@topems/shared-components` 提供公共组件 |
| **共享设计 Token** | `@topems/design-tokens` 提供设计变量 |
| **共享工具函数** | `@topems/shared-utils` 提供通用工具 |
| **共享类型定义** | `@topems/shared-types` 提供类型定义 |
| **设计系统文档** | 统一的设计规范和组件文档 |
| **Code Review** | 插件代码必须通过设计规范审查 |

---

## 十、性能优化

### 10.1 组件性能

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

### 10.2 插件按需加载

```tsx
// 插件模块懒加载（Module Federation）
const loadPluginModule = async (pluginCode: string, modulePath: string) => {
  const remote = await import(/* @mf-ignore */ `${pluginCode}/${modulePath}`);
  return remote.default;
};

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

### 10.3 性能指标

| 指标 | 目标值 | 说明 |
|------|--------|------|
| LCP | < 2.5s | 最大内容绘制 |
| FID | < 100ms | 首次输入延迟 |
| CLS | < 0.1 | 累积布局偏移 |
| TTI | < 3.8s | 可交互时间 |

---

## 十一、可访问性标准

### 11.1 ARIA 标签

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

### 11.2 键盘导航

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

### 11.3 颜色对比度

| 内容类型 | 最小对比度 | WCAG 级别 |
|----------|-----------|-----------|
| 正常文字 | 4.5:1 | AA |
| 大文字 (18pt+) | 3:1 | AA |
| 图标和 UI 元素 | 3:1 | AA |

---

## 十二、实施检查清单

### 12.1 代码检查

- [ ] 所有组件从 `@mui/material` 导入
- [ ] 所有图标从 `lucide-react` 导入
- [ ] 无 `className` 混合使用 Tailwind
- [ ] 无 `shadcn/ui` 组件引用
- [ ] TypeScript 类型完整，无 `any`
- [ ] ESLint 检查通过
- [ ] 响应式布局适配完成

### 12.2 样式检查

- [ ] 使用 `sx` prop 或 styled 组件
- [ ] 颜色使用主题变量（如 `primary.main`）
- [ ] 间距使用 8px 基准
- [ ] 圆角使用设计系统 token
- [ ] 阴影使用设计系统 token

### 12.3 功能检查

- [ ] 表单验证正常工作
- [ ] 搜索和筛选功能正常
- [ ] 分页功能正常
- [ ] 排序功能正常
- [ ] 主题切换功能正常
- [ ] 暗黑模式显示正确

### 12.4 性能检查

- [ ] 首屏加载时间 < 2s
- [ ] 无控制台错误
- [ ] 无内存泄漏
- [ ] 图片正确懒加载

### 12.5 插件化检查

- [ ] 插件通过 NavigationRegistry 注册导航
- [ ] 插件使用共享依赖（singleton）
- [ ] 插件遵循设计系统约束
- [ ] 插件支持独立部署模式
- [ ] 插件导航权限过滤正常

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
| UI 重构设计方案 | UI 重构设计（已归档） |
| UI 系统重构实施方案 | 实施计划（已归档） |
| 前端优化标准 | 性能与标准（已归档） |
| GIS 模块设计 | 特殊模块设计（已归档） |

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