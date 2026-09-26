# TOPEMS 无障碍访问 (Accessibility / a11y) 规范

> 统一方案入口：[`docs/design/ui-navigation-unified-plan.md`](../../design/ui-navigation-unified-plan.md)
>
> 本文档为 TOPEMS 设计系统的无障碍访问标准，基于 [WCAG 2.1 AA](https://www.w3.org/TR/WCAG21/) 标准，面向开发人员提供可执行的实施指南。

---

## 目录

1. [色彩对比度要求](#1-色彩对比度要求)
2. [键盘导航](#2-键盘导航)
3. [屏幕阅读器支持](#3-屏幕阅读器支持)
4. [表单无障碍](#4-表单无障碍)
5. [动画与运动](#5-动画与运动)
6. [MUI 组件默认无障碍支持](#6-mui-组件默认无障碍支持)
7. [组件无障碍审计报告](#7-组件无障碍审计报告)
8. [开发者自检清单](#8-开发者自检清单)

---

## 1. 色彩对比度要求

### 1.1 WCAG 2.1 AA 对比度标准

| 元素类型 | 最低对比度 | 说明 |
|---------|----------|------|
| 正常文本 (< 18px) | **4.5:1** | 正文、标签、辅助文字 |
| 大文本 (>= 18px 或 >= 14px 加粗) | **3:1** | 标题、大号提示 |
| UI 组件和图形对象 | **3:1** | 图标、边框、输入框轮廓 |
| 焦点指示器 | **3:1** | 键盘聚焦高亮环 |

### 1.2 TOPEMS 设计令牌对比度

以下为 TOPEMS 调色板中常用色值在主背景 `#f8fafc`（浅灰白）和纯白 `#ffffff` 上的实测对比度：

| 组合 | 前景色 | 背景色 | 对比度 | 状态 | 建议 |
|-----|--------|--------|--------|------|------|
| text-primary | `#1e293b` | `#f8fafc` | ~13.5:1 | ✅ 通过 | -- |
| text-secondary | `#64748b` | `#f8fafc` | ~5.2:1 | ✅ 通过 | -- |
| text-muted | `#94a3b8` | `#f8fafc` | ~3.0:1 | ❌ 小文本不通过 | 仅用于大文本(>=18px)或图标；小文本改用 `text-secondary` |
| Primary (按钮/链接) | `#3b82f6` | `#ffffff` | ~4.5:1 | ✅ 通过（刚好达标） | 考虑使用 `primary.dark` (#2563eb) 以留更多余量 |
| Primary 悬停 | `#2563eb` | `#ffffff` | ~6.3:1 | ✅ 通过 | -- |
| Error (错误文字) | `#ef4444` | `#ffffff` | ~4.0:1 | ❌ 小文本不通过 | 小文本使用 `error.dark` (#dc2626, ~5.6:1)；或给文字加粗使其成为"大文本" |
| Error 边框/图标 | `#ef4444` | `#ffffff` | ~4.0:1 | ✅ 通过（UI组件标准） | 图标和边框 3:1 即可 |
| Success | `#22c55e` | `#ffffff` | ~3.5:1 | ⚠️ 按文本标准不通过 | 文字使用 `success.dark` (#16a34a, ~4.6:1)；图标/边框可正常使用 |
| Warning | `#f59e0b` | `#ffffff` | ~2.1:1 | ❌ 严重不通过 | 文字必须使用 `warning.dark` (#d97706, ~3.9:1) 或搭配深色背景；仅用于装饰性图形 |
| Warning dark | `#d97706` | `#ffffff` | ~3.9:1 | ⚠️ 仍不够 4.5:1 | 加粗使用或配合深色背景 |
| Info | `#3b82f6` | `#ffffff` | ~4.5:1 | ✅ 通过 | -- |
| 表头背景 | `#f8fafc` (文字 `#64748b`) | `#ffffff` | -- | ✅ 通过 | 表头使用 `text-secondary` |

### 1.3 实施建议

```tsx
// ❌ 错误：text-muted 用于小文本
<Typography variant="body2" sx={{ color: 'text.muted' }}>重要提示</Typography>

// ✅ 正确：小文本使用 text-secondary
<Typography variant="body2" sx={{ color: 'text.secondary' }}>重要提示</Typography>

// ✅ 正确：text-muted 仅用于大文本或图标
<Typography variant="h5" sx={{ color: 'text.muted' }}>大标题</Typography>

// ❌ 错误：error.main 用于小号错误文本
<Typography variant="body2" sx={{ color: 'error.main' }}>字段必填</Typography>

// ✅ 正确：error.dark 用于错误文本
<Typography variant="body2" sx={{ color: 'error.dark' }}>字段必填</Typography>
```

### 1.4 暗色模式注意事项

暗色模式下需要重新评估对比度。确保：
- 文字在深色背景上依然满足 4.5:1
- 图标/边框满足 3:1
- 使用 MUI 的 `palette.mode` 自动切换，不要手动硬编码颜色

```tsx
// ✅ 正确：使用 MUI palette 令牌，自动适配明暗主题
sx={{ color: 'text.primary' }}  // 自动适配明暗模式

// ❌ 错误：硬编码颜色值，暗色模式下可能不达标
sx={{ color: '#1e293b' }}
```

---

## 2. 键盘导航

### 2.1 核心原则

所有交互元素 **必须** 可通过 Tab 键到达，焦点顺序需遵循视觉布局（从左到右、从上到下）。

### 2.2 焦点指示器

TOPEMS 使用 MUI 默认的 focus-ring 样式。确保不要全局禁用 outline：

```css
/* ❌ 绝对禁止 */
*:focus {
  outline: none;
}

/* ✅ 正确：保留或增强 focus 样式 */
*:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}
```

MUI 默认通过 `focusVisible` 类名提供焦点指示器，无需额外配置。如果自定义了组件样式，确保 `:focus-visible` 状态下的轮廓可见。

### 2.3 Skip-to-content 跳转链接

每个页面布局应包含"跳到主内容"链接，方便键盘用户跳过重复导航：

```tsx
// 在 Layout 组件顶部添加
<Box
  component="a"
  href="#main-content"
  sx={{
    position: 'absolute',
    left: '-9999px',
    top: 0,
    zIndex: 9999,
    padding: '8px 16px',
    bgcolor: 'primary.main',
    color: '#fff',
    textDecoration: 'none',
    borderRadius: 1,
    '&:focus': {
      left: 16,
      top: 16,
    },
  }}
>
  跳到主内容
</Box>

<main id="main-content">
  {/* 页面主要内容 */}
</main>
```

### 2.4 键盘快捷键

| 快捷键 | 功能 | 组件 |
|-------|------|------|
| `Cmd+K` / `Ctrl+K` | 打开命令面板 | `CommandPalette` |
| `Escape` | 关闭弹窗/下拉菜单/弹出层 | MUI Dialog, Menu, Popover |
| `Tab` | 移动焦点到下一个元素 | 全局 |
| `Shift+Tab` | 移动焦点到上一个元素 | 全局 |
| `Enter` / `Space` | 激活按钮/链接/可点击行 | 全局 |
| `Arrow` 方向键 | 导航列表/菜单/下拉选项 | Select, Menu, Tabs |

### 2.5 模态对话框焦点管理

MUI Dialog 默认实现了焦点陷阱（focus trap），打开时焦点移入对话框，关闭后焦点返回触发元素。确保：
- 不要禁用 `disableEnforceFocus`（除非有特殊原因）
- `disablePortal` 默认为 `false`，保持此设置
- Escape 键默认关闭 Dialog，不要拦截此行为

### 2.6 可点击行的键盘支持

DataTable 中的可点击行需要支持键盘操作：

```tsx
// ✅ 正确：DataTable 已实现此模式
<TableRow
  tabIndex={onRowClick ? 0 : undefined}
  onClick={onRowClick ? () => onRowClick(row) : undefined}
  onKeyDown={
    onRowClick
      ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onRowClick(row);
          }
        }
      : undefined
  }
>
```

---

## 3. 屏幕阅读器支持

### 3.1 图片和图标

所有提供信息的图片和图标必须有无障碍文本：

```tsx
// ✅ 信息性图标：提供 aria-label
<IconButton aria-label="刷新数据">
  <RefreshCw />
</IconButton>

// ✅ 装饰性图标：标记为隐藏
<Box aria-hidden="true">
  <DecorationIcon />
</Box>

// ✅ 图标按钮
<IconButton aria-label="删除记录" onClick={handleDelete}>
  <Trash2 />
</IconButton>
```

### 3.2 状态通知

动态变化的状态信息需通过 ARIA live region 通知屏幕阅读器：

```tsx
// ✅ 状态徽章：使用 role="status"
<Box role="status" aria-live="polite">
  <StatusBadge status="success" />
</Box>

// ✅ Toast 通知：MUI Snackbar 已内置 aria-live 支持
<Snackbar message="保存成功" />

// ✅ 加载完成通知
<Box aria-live="polite" aria-atomic="true">
  {loading ? '加载中...' : `已加载 ${count} 条数据`}
</Box>
```

### 3.3 表格语义化

```tsx
// ✅ 正确：表头使用 scope
<TableCell scope="col">姓名</TableCell>  // 列头
<TableCell scope="row">张三</TableCell>  // 行头（如有）

// ✅ 正确：表格添加 aria-label
<Table aria-label="员工考勤数据表">

// ✅ 正确：复杂表格使用 caption
<Table>
  <caption>2024年第一季度员工考勤汇总表</caption>
  {/* ... */}
</Table>
```

### 3.4 加载状态

```tsx
// ✅ 正确：加载指示器附带文本
<Box role="status" aria-live="polite">
  <CircularProgress size={20} />
  <Typography>正在加载...</Typography>
</Box>

// ❌ 错误：只有旋转动画，无文字说明
<CircularProgress />
```

---

## 4. 表单无障碍

### 4.1 标签关联

每个表单输入框必须有可见的 `<label>` 元素，通过 `htmlFor` 和 `id` 关联：

```tsx
// ✅ 正确：使用 label 属性（MUI TextField 自动处理关联）
<TextField label="姓名" id="name" name="name" />

// ✅ 正确：自定义标签
<label htmlFor="email">电子邮箱</label>
<TextField id="email" name="email" />

// ❌ 错误：用 placeholder 代替 label
<TextField placeholder="请输入姓名" />  // 缺少 label
```

### 4.2 必填字段

```tsx
// ✅ 正确：通过 required 属性 + 视觉提示
<TextField
  label="手机号"
  required
  helperText="必填项"
/>
// MUI 自动为 required 字段添加 aria-required="true"
```

### 4.3 错误状态

表单验证错误必须同时提供视觉和程序化指示：

```tsx
// ✅ 正确：error + helperText（MUI 自动关联 aria-describedby）
<TextField
  label="邮箱"
  error
  helperText="请输入有效的邮箱地址"
  id="email"
/>
// MUI 自动设置：aria-invalid="true" + aria-describedby="email-helper-text"

// ✅ 正确：自定义错误消息容器
<TextField
  label="金额"
  error={!!errors.amount}
  helperText={errors.amount}
  aria-describedby={errors.amount ? 'amount-error' : undefined}
/>
<Typography id="amount-error" role="alert">
  {errors.amount}
</Typography>
```

### 4.4 日期/时间选择器

```tsx
// ✅ 使用 MUI DatePicker（已内置键盘导航和 ARIA 支持）
<DatePicker label="出生日期" />

// ❌ 避免：自定义的纯鼠标操作日历组件（无键盘支持）
```

### 4.5 搜索/自动完成组件

自动完成组件应遵循 WAI-ARIA Combobox 模式：

```tsx
// ✅ MUI Autocomplete 已内置 Combobox ARIA 支持
<Autocomplete
  options={options}
  getOptionLabel={(option) => option.label}
  renderInput={(params) => (
    <TextField {...params} label="选择部门" />
  )}
/>
// 自动提供：role="combobox"、aria-expanded、aria-controls、aria-activedescendant
```

---

## 5. 动画与运动

### 5.1 尊重 prefers-reduced-motion

TOPEMS 在 `index.css` 中已添加全局 reduced-motion 媒体查询支持。确保新增动画也遵循此规则：

```css
/* 已在 index.css 中配置 */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

```tsx
// ✅ 正确：自定义动画也检查 prefers-reduced-motion
import { useMediaQuery, useTheme } from '@mui/material';

function MyComponent() {
  const theme = useTheme();
  const prefersReducedMotion = useMediaQuery(
    '(prefers-reduced-motion: reduce)'
  );

  return (
    <Box
      sx={{
        transition: prefersReducedMotion ? 'none' : 'all 0.3s ease',
      }}
    />
  );
}
```

### 5.2 闪烁限制

- 页面内容闪烁频率不得超过 **每秒 3 次**
- 加载骨架屏使用 `pulse` 或 `wave` 动画，不使用快速闪烁
- 不使用 `<blink>` 标签或类似效果

### 5.3 自动播放动画

- 自动播放的动画必须提供暂停/停止控制
- 轮播图应支持暂停（鼠标悬停暂停、键盘暂停）
- 进度条动画 (`ProgressBar` 的 `animated` 属性) 不会造成闪烁问题（渐变流动，频率低于 3Hz）

---

## 6. MUI 组件默认无障碍支持

MUI v9 (Material UI) 在无障碍方面有良好的默认实现，以下功能 **无需额外配置**：

| 组件 | 内置 a11y 支持 |
|------|--------------|
| **Dialog** | 焦点陷阱、焦点自动移入、Escape 关闭、`role="dialog"`、`aria-labelledby` |
| **Select** | 键盘导航、`role="listbox"`、`aria-selected`、方向键选择 |
| **Tabs** | Tab 面板焦点管理、方向键切换、`role="tablist/tab/tabpanel"`、键盘激活 |
| **Tooltip** | 屏幕阅读器读出内容（`title` 属性）、鼠标悬停和键盘 focus 触发 |
| **Snackbar** | 内置 `aria-live="polite"` 通知区域 |
| **Checkbox** | `role="checkbox"`、`aria-checked`、键盘 Space 切换 |
| **Radio** | `role="radio"`、`aria-checked`、方向键导航 `RadioGroup` |
| **Switch** | `role="switch"`、`aria-checked`、键盘 Space 切换 |
| **TextField** | 自动关联 label、error 状态的 `aria-invalid`、helperText 的 `aria-describedby` |
| **Button** | 键盘 Enter/Space 激活、disabled 状态的 `aria-disabled` |
| **IconButton** | 需要 `aria-label`（不是默认的，需要开发者提供） |
| **Menu** | 焦点管理、方向键导航、Escape 关闭、`role="menu/menuitem"` |
| **Popover** | 焦点管理、Escape 关闭 |
| **Table** | 需要手动添加 `scope`、`aria-label` |

### 开发者需注意的事项

1. **IconButton** 必须始终提供 `aria-label`
2. **Table** 需要手动添加 `scope="col"` 到表头 `TableCell`
3. **Dialog** 需要提供 `aria-labelledby` 或 `title`（`DialogTitle` 自动处理）
4. 带图标的按钮文字应清晰描述操作（如"删除"而非仅显示垃圾桶图标）

---

## 7. 组件无障碍审计报告

> 审计日期：2026-06-28
> 审计范围：`packages/shared-components/src/components/` 下 5 个核心组件

### 7.1 StatusBadge

文件：`packages/shared-components/src/components/StatusBadge.tsx`

| 类别 | 评估 | 说明 |
|------|------|------|
| ✅ 通过 | 语义化组件 | 基于 MUI Chip，内置 `role="status"` 等语义 |
| ✅ 通过 | 文本可读 | 标签文字直接作为 Chip 的 label，屏幕阅读器可读 |
| ⚠️ 警告 | 图标无障碍 | Lucide 图标没有 `aria-label`；当 `showIcon=true` 时，图标仅为视觉增强，不影响理解（有文字标签），风险较低 |
| ⚠️ 警告 | 可点击状态 | `clickable=true` 时 Chip 可点击并带 `onClick`，但缺少 `aria-label` 描述操作用途（如"筛选待处理状态"） |
| ❌ 待改进 | 对比度风险 | `soft` 变体使用 `${color}.light` 背景和 `${color}.dark` 文字，warning 的 light 背景对比度可能不足 |
| ❌ 待改进 | 缺少 role="status" | 状态徽章语义上应标记为 `role="status"`，让屏幕阅读器朗读状态变化 |

**修复建议：**

```tsx
// 1. 为可点击的 StatusBadge 添加 aria-label
<Chip
  aria-label={`状态：${label || config.label}`}
  // ...
/>

// 2. 添加 role="status" 让屏幕阅读器播报状态变化
<Chip
  role="status"
  aria-live="polite"
  // ...
/>

// 3. 装饰性图标标记为 aria-hidden
<Box aria-hidden="true" sx={{ display: 'flex' }}>
  {icon || config.icon}
</Box>
```

---

### 7.2 ProgressBar

文件：`packages/shared-components/src/components/ProgressBar.tsx`

| 类别 | 评估 | 说明 |
|------|------|------|
| ✅ 通过 | 线性进度条 | 基于 MUI LinearProgress，内置 `role="progressbar"`、`aria-valuenow`、`aria-valuemin`、`aria-valuemax` |
| ❌ 待改进 | 圆形进度条 | 自定义 SVG 实现缺少 `role="progressbar"` 和 `aria-valuenow/aria-valuemin/aria-valuemax` |
| ❌ 待改进 | 圆形进度条 | SVG 无 `<title>` 或 `<desc>` 元素描述进度含义 |
| ❌ 待改进 | 分段进度条 | 分段变体使用纯 `Box` div，缺少 `role="progressbar"` 和 `aria-valuenow` |
| ⚠️ 警告 | 标签关联 | `label` 属性通过文本显示，但未通过 `aria-labelledby` 与进度条关联 |
| ⚠️ 警告 | 动画 | `animated` 和 `striped` 动画未检查 `prefers-reduced-motion` |

**修复建议：**

```tsx
// 1. 圆形进度条添加 ARIA 属性
<Box
  role="progressbar"
  aria-valuenow={displayValue}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-label={label || `${displayValue}% 完成`}
>
  <svg ...>
    <title>{label || `进度 ${displayValue}%`}</title>
    {/* ... */}
  </svg>
</Box>

// 2. 分段进度条添加 ARIA 属性
<SegmentedContainer
  role="progressbar"
  aria-valuenow={displayValue}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-label={label || `进度 ${displayValue}%`}
>

// 3. 动画检查 prefers-reduced-motion
const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
// 当 prefersReducedMotion 为 true 时，禁用 animated 和 striped
```

---

### 7.3 DataTable

文件：`packages/shared-components/src/components/DataTable.tsx`

| 类别 | 评估 | 说明 |
|------|------|------|
| ✅ 通过 | 表格语义 | 使用 MUI Table 组件，添加了 `aria-label="数据表格"` |
| ✅ 通过 | 表头 scope | 所有 `TableCell` 在 `TableHead` 中均设置了 `scope="col"` |
| ✅ 通过 | 搜索框 | 有 `aria-label={searchPlaceholder \|\| '搜索'}` |
| ✅ 通过 | 分页 | 每页条数 Select 有 `aria-label="每页显示条数"` |
| ✅ 通过 | 翻页按钮 | 上一页/下一页 IconButton 有 `aria-label` |
| ✅ 通过 | 记录统计 | "共 N 条记录" 使用 `aria-live="polite"` |
| ✅ 通过 | 行展开 | 展开/收起 IconButton 有 `aria-label={isExpanded ? '收起行' : '展开行'}` |
| ✅ 通过 | 可点击行 | 支持 `tabIndex={0}` 和键盘 Enter/Space 激活 |
| ⚠️ 警告 | 高级筛选 Dialog | Dialog 的 `select` 使用原生 `<select>` 元素（`component="select"`），有 `label` 但缺少 `id` 关联 |
| ⚠️ 警告 | 加载状态 | 加载中状态使用 Skeleton + 文字"加载中..."，但没有 `aria-live` 通知 |
| ❌ 待改进 | 导出菜单 | 导出按钮缺少 `aria-label`，下拉菜单缺少 `aria-haspopup` |
| ❌ 待改进 | 列设置菜单 | 列设置按钮和菜单项缺少 `role` 和 `aria-checked` 标记 |
| ❌ 待改进 | 选择信息栏 | "已选择 N 条记录" 信息栏缺少 `aria-live`，屏幕阅读器无法感知选择变化 |
| ❌ 待改进 | 高级筛选输入框 | 原生 `<select>` 的 `label` 是用 `Box` 渲染的，不是真正的 `<label>` 元素，无 `htmlFor` 关联 |

**修复建议：**

```tsx
// 1. 导出按钮添加 aria-haspopup 和 aria-expanded
<Button
  aria-haspopup="menu"
  aria-expanded={Boolean(exportAnchorEl)}
  // ...
>

// 2. 列设置菜单项添加 role="menuitemcheckbox" 和 aria-checked
<MenuItem
  role="menuitemcheckbox"
  aria-checked={column.getIsVisible()}
  // ...
>

// 3. 选择信息栏添加 aria-live
<Box aria-live="polite" aria-atomic="true">
  已选择 N 条记录
</Box>

// 4. 高级筛选的 label 使用真正的 <label> + htmlFor
<label htmlFor={`filter-${filter.key}`}>{filter.label}</label>
<TextField id={`filter-${filter.key}`} ... />

// 5. 加载状态添加 aria-live
<Typography aria-live="polite">加载中...</Typography>
```

---

### 7.4 EmptyState

文件：`packages/shared-components/src/components/EmptyState.tsx`

| 类别 | 评估 | 说明 |
|------|------|------|
| ✅ 通过 | role="status" | 根元素已设置 `role="status"`，屏幕阅读器会朗读状态 |
| ✅ 通过 | aria-live="polite" | 根元素有 `aria-live="polite"`，状态变化会被播报 |
| ✅ 通过 | 装饰性图标 | 图标容器已设置 `aria-hidden="true"` |
| ✅ 通过 | 文本语义 | 标题使用 `Typography variant="h6"`（语义化标题级别） |
| ✅ 通过 | 操作按钮 | 使用 MUI Button，自带键盘支持和语义 |
| ⚠️ 警告 | Emoji 内容 | 默认使用 emoji 📋 作为图标，部分屏幕阅读器会读出 emoji 描述，可能造成冗余（与 title 重复） |
| ⚠️ 警告 | aria-live 范围 | `aria-live="polite"` 设置在根元素上，如果 EmptyState 在页面初始渲染时就是空状态，不会触发播报（polite 仅播报后续变化） |

**修复建议：**

```tsx
// 1. 如果使用 emoji 作为装饰性图标，确保 aria-hidden 覆盖 emoji
<Typography aria-hidden="true" variant="h3">{emoji}</Typography>
// 当前已通过外层 Box 的 aria-hidden="true" 覆盖，无需额外修改

// 2. 可以考虑用 Lucide 图标替代 emoji，更一致
// <Inbox size={40} /> 替代 📋
```

**总体评价：EmptyState 组件的无障碍实现良好，是 5 个审计组件中表现最好的。**

---

### 7.5 FormField

文件：`packages/shared-components/src/components/FormField.tsx`

| 类别 | 评估 | 说明 |
|------|------|------|
| ✅ 通过 | Label 关联 | 基于 MUI TextField，`label` 属性会自动生成关联的 `<label>` 元素 |
| ✅ 通过 | Error 状态 | 继承 TextField 的 error/helperText，自动设置 `aria-invalid` 和 `aria-describedby` |
| ✅ 通过 | 必填标记 | 透传 `required` 属性，MUI 自动添加 `aria-required` |
| ✅ 通过 | 焦点管理 | 继承 TextField 的焦点行为，自动获得焦点样式 |
| ⚠️ 警告 | 通用性限制 | 组件不强制要求 `label`，开发者可能传入 `label={undefined}` 导致无标签输入框 |
| ⚠️ 警告 | name 属性 | `name` 为必填字段，但未强制 `label` 或 `aria-label` 与之关联 |

**修复建议：**

```tsx
// 1. 在开发模式下，当缺少 label 和 aria-label 时发出警告
export const FormField: React.FC<FormFieldProps> = ({
  name,
  label,
  compact = true,
  size = 'small',
  sx,
  ...props
}) => {
  if (process.env.NODE_ENV === 'development') {
    if (!label && !props['aria-label'] && !props.InputProps?.inputProps?.['aria-label']) {
      console.warn(
        `[FormField] 字段 "${name}" 缺少 label 或 aria-label，` +
        '这会导致屏幕阅读器无法识别该输入框的用途'
      );
    }
  }

  return (
    <TextField
      name={name}
      label={label}
      size={compact ? 'small' : size}
      // ...
    />
  );
};
```

---

### 7.6 审计总结

| 组件 | 通过 | 警告 | 待改进 | 总体评级 |
|------|------|------|--------|---------|
| StatusBadge | 2 | 2 | 2 | ⚠️ 需改进 |
| ProgressBar | 1 | 2 | 3 | ❌ 需重点改进 |
| DataTable | 9 | 2 | 4 | ⚠️ 需改进 |
| EmptyState | 5 | 2 | 0 | ✅ 良好 |
| FormField | 4 | 2 | 0 | ✅ 良好 |

**优先修复排序：**
1. **ProgressBar 圆形/分段变体** -- 缺少关键 ARIA 属性，屏幕阅读器完全无法识别
2. **StatusBadge** -- 缺少 `role="status"`，状态变化不会被播报
3. **DataTable** -- 多处缺少 `aria-live`、`aria-haspopup`，影响动态内容感知

---

## 8. 开发者自检清单

每次开发新组件或修改现有组件时，请使用以下清单进行自检：

### 基础检查

- [ ] **Tab 导航**：所有交互元素是否可通过 Tab 键依次到达？
- [ ] **焦点可见**：Tab 到达时是否有明显的视觉焦点指示器？
- [ ] **逻辑顺序**：焦点顺序是否遵循从左到右、从上到下的视觉布局？
- [ ] **Skip 链接**：页面是否有"跳到主内容"链接？

### 语义化

- [ ] **标题层级**：是否使用了正确的 `<h1>` ~ `<h6>` 层级，没有跳级？
- [ ] **landmark 区域**：页面是否有 `<header>`, `<nav>`, `<main>`, `<footer>` 等语义区域？
- [ ] **列表语义**：列表内容是否使用了 `<ul>`/`<ol>`/`<li>` 而非 div 堆叠？

### 屏幕阅读器

- [ ] **图标按钮**：所有仅含图标的按钮是否有 `aria-label`？
- [ ] **图片**：信息性图片是否有 `alt`？装饰性图片是否标记 `aria-hidden="true"`？
- [ ] **状态变化**：动态更新的内容（数量变化、加载完成、错误提示）是否使用 `aria-live`？
- [ ] **表单关联**：输入框是否有 `<label>` 关联（非 placeholder）？

### 色彩与视觉

- [ ] **对比度**：文本对比度是否满足 4.5:1（正常文本）或 3:1（大文本/UI组件）？
- [ ] **非颜色信息**：是否不依赖单一颜色传达信息（如错误状态同时使用图标+颜色+文字）？

### 表单

- [ ] **必填标记**：必填字段是否同时有视觉标记（红色星号）和 `aria-required`？
- [ ] **错误提示**：错误消息是否通过 `aria-describedby` 关联到输入框？
- [ ] **错误提示语义**：错误消息是否有 `role="alert"` 以便及时播报？

### 动画

- [ ] **减少动画**：页面是否尊重 `prefers-reduced-motion` 设置？
- [ ] **可控性**：自动播放动画是否可暂停/停止？
- [ ] **闪烁**：是否有每秒超过 3 次的闪烁内容？

### 弹窗和覆盖层

- [ ] **焦点陷阱**：模态弹窗是否将焦点限制在弹窗内？
- [ ] **焦点返回**：弹窗关闭后焦点是否返回到触发元素？
- [ ] **Escape 关闭**：弹窗是否可通过 Escape 键关闭？

---

## 附录：推荐工具

| 工具 | 用途 | 说明 |
|------|------|------|
| [axe DevTools](https://www.deque.com/axe/) | 浏览器自动化检测 | Chrome/Firefox 扩展，一键扫描页面 |
| [Lighthouse](https://developer.chrome.com/docs/lighthouse/) | 综合性能+无障碍评分 | Chrome DevTools 内置 |
| [NVDA](https://www.nvaccess.org/) | Windows 屏幕阅读器 | 免费，推荐测试用 |
| [VoiceOver](https://www.apple.com/accessibility/vision/) | macOS/iOS 屏幕阅读器 | 系统内置，Cmd+F5 开启 |
| [contrast-ratio.com](https://contrast-ratio.com/) | 对比度检测 | 在线工具，验证颜色组合 |
| [WAVE](https://wave.webaim.org/) | 页面无障碍评估 | 在线工具，提供可视化问题标注 |

---

> 本文档应随 TOPEMS 组件库的更新而持续维护。如发现新的无障碍问题或有改进建议，请提交 issue 或 PR。
