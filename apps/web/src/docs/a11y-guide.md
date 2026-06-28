# TOPEMS 无障碍开发指南 | Accessibility Development Guide

> 本指南为 TOPEMS 项目提供 WCAG AA 合规性开发规范。所有团队成员在开发新功能或修改现有代码时应遵循本文档的要求。
>
> This guide provides WCAG AA compliance requirements for the TOPEMS project. All team members should follow these requirements when building new features or modifying existing code.

---

## 目录 | Table of Contents

1. [概述 | Overview](#1-概述--overview)
2. [语义化 HTML | Semantic HTML](#2-语义化-html--semantic-html)
3. [键盘导航 | Keyboard Navigation](#3-键盘导航--keyboard-navigation)
4. [颜色对比度 | Color Contrast](#4-颜色对比度--color-contrast)
5. [ARIA 标签 | ARIA Labels](#5-aria-标签--aria-labels)
6. [表单无障碍 | Form Accessibility](#6-表单无障碍--form-accessibility)
7. [焦点管理 | Focus Management](#7-焦点管理--focus-management)
8. [动画与运动 | Motion & Animation](#8-动画与运动--motion--animation)
9. [屏幕阅读器测试清单 | Screen Reader Testing Checklist](#9-屏幕阅读器测试清单--screen-reader-testing-checklist)
10. [工具 | Tooling](#10-工具--tooling)

---

## 1. 概述 | Overview

### 目标

TOPEMS 项目的无障碍目标是达到 **WCAG 2.2 AA 级别**合规，确保所有用户——包括使用辅助技术（屏幕阅读器、键盘导航、高对比度模式等）的用户——都能正常使用系统。

### 当前状态

| 阶段 | 内容 | 状态 |
|------|------|------|
| Phase A | 基础语义化 HTML（landmark、roles） | ✅ 已完成 |
| Phase B | 焦点管理、SkipToContent、ARIA 基础 | ✅ 已完成 |
| Phase C | 键盘导航完整审计 | 🔲 待完成 |
| Phase D | 颜色对比度完整审计与修复 | 🔲 待完成 |
| Phase E | 屏幕阅读器全面测试 | 🔲 待完成 |

### MUI 的优势

TOPEMS 使用 Material UI (MUI) 作为组件库。MUI 内置了完善的 ARIA 支持，包括：

- 自动设置正确的 `role` 属性
- 内置焦点管理（Dialog 的焦点陷阱、Drawer 的焦点恢复）
- 自动关联 label 与表单控件
- 默认可见的焦点指示器

**核心原则**：优先使用 MUI 组件而非原生 HTML 元素。MUI 已经为你处理了大部分无障碍工作。

```tsx
// ✅ 正确：使用 MUI 组件
import Button from '@mui/material/Button';
<Button variant="contained">提交</Button>

// ❌ 错误：使用 div 模拟按钮
<div className="submit-btn" onClick={handleSubmit}>提交</div>
```

---

## 2. 语义化 HTML | Semantic HTML

### 说明

语义化 HTML 是无障碍的基石。使用正确的 HTML 元素和 ARIA role 可以让辅助技术正确理解页面结构和内容层级。MUI 组件内部已经使用了语义化标记，我们应优先使用它们。

### 核心规范

**优先使用 MUI 组件：**

| 用途 | MUI 组件 | 对应 HTML |
|------|----------|-----------|
| 按钮 | `Button` / `IconButton` | `<button>` |
| 链接 | `Link` / `ButtonBase` with href | `<a>` |
| 输入框 | `TextField` | `<input>` |
| 下拉选择 | `Select` / `Autocomplete` | `<select>` |
| 导航 | `List` + `ListItemButton` | `<nav>` |
| 对话框 | `Dialog` | `<dialog>` |
| 选项卡 | `Tabs` + `TabPanel` | `[role="tablist"]` |
| 表单分组 | `FormGroup` + `FormLabel` | `<fieldset>` + `<legend>` |

**必须手动添加 role 的场景：**

当无法使用 MUI 组件而必须使用原生 HTML 时，需要手动添加适当的 ARIA role：

```tsx
// 导航区域
<nav role="navigation" aria-label="主导航">
  {/* ... */}
</nav>

// 选项卡面板
<div role="tabpanel" id="panel-1" aria-labelledby="tab-1">
  {/* ... */}
</div>

// 对话框（如果未使用 MUI Dialog）
<div role="dialog" aria-modal="true" aria-labelledby="dialog-title">
  {/* ... */}
</div>

// 状态消息
<div role="status" aria-live="polite">
  数据已保存
</div>
```

### 已完成项目

- [x] `GlobalLayout` 组件包含 `SkipToContent` 跳转链接
- [x] `AppSidebar` 设置了 `role="navigation"` 和 `aria-label`
- [x] `TabPanel` 组件设置了 `role="tabpanel"`
- [x] `FormFieldGroup` 组件使用 `fieldset` + `legend` 结构

### 待完成项目

- [ ] 审计所有自定义组件的 ARIA role 覆盖率
- [ ] 确保所有数据表格使用正确的表格语义（`<table>`、`<th scope>`）
- [ ] 图表容器添加 `role="img"` 和 `aria-label`

---

## 3. 键盘导航 | Keyboard Navigation

### 说明

许多用户依赖键盘（而非鼠标）来导航网页。所有交互元素都必须可以通过键盘操作，Tab 顺序应与视觉顺序一致。

### 核心规范

**所有交互元素必须可聚焦：**

```tsx
// ✅ 正确：MUI Button 自动获得焦点
import Button from '@mui/material/Button';
<Button onClick={handleAction}>操作</Button>

// ✅ 正确：使用 IconButton + aria-label
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
<IconButton aria-label="删除记录" onClick={handleDelete}>
  <DeleteIcon />
</IconButton>

// ❌ 错误：div + onClick 无法通过键盘触发
<div className="clickable" onClick={handleAction}>操作</div>

// ❌ 错误：span + onClick
<span onClick={handleClick}>点击这里</span>
```

**如果必须使非交互元素可点击，添加键盘支持：**

```tsx
// 极不推荐，仅在没有 MUI 替代方案时使用
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }}
>
  操作
</div>
```

**键盘交互规范：**

| 按键 | 行为 |
|------|------|
| `Tab` | 移动到下一个可聚焦元素 |
| `Shift + Tab` | 移动到上一个可聚焦元素 |
| `Enter` / `Space` | 激活按钮、链接 |
| `Escape` | 关闭弹窗、下拉菜单、抽屉 |
| `Arrow Keys` | 在单选组、标签页、菜单中导航 |
| `Home` / `End` | 跳转到首项/末项（列表、下拉框） |

**焦点陷阱（Focus Trap）：**

模态对话框打开时，焦点应限制在对话框内。MUI Dialog 自动处理此行为：

```tsx
import Dialog from '@mui/material/Dialog';

<Dialog open={isOpen} onClose={handleClose}>
  <DialogTitle>确认删除</DialogTitle>
  <DialogContent>确定要删除这条记录吗？</DialogContent>
  <DialogActions>
    <Button onClick={handleClose}>取消</Button>
    <Button onClick={handleConfirm} variant="contained">确认</Button>
  </DialogActions>
</Dialog>
// Dialog 自动：焦点陷阱、Escape 关闭、焦点移至对话框
```

**自定义键盘快捷键：**

```tsx
import { useEffect } from 'react';

// 已实现：CommandPalette 支持 Ctrl+K 打开
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      openCommandPalette();
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

### 已完成项目

- [x] `AppSidebar` 导航项使用 `component="button"` 确保可聚焦
- [x] `CommandPalette` 支持 `Ctrl+K` 快捷键
- [x] MUI Dialog 提供内置焦点陷阱
- [x] `SkipToContent` 链接可通过 Tab 键到达

### 待完成项目

- [ ] 完整键盘导航审计：逐页测试所有交互路径
- [ ] 确保所有下拉菜单支持 Arrow Keys 导航
- [ ] 测试复杂表单的 Tab 顺序是否符合视觉顺序
- [ ] 为自定义表格行交互添加键盘支持（如行选择）
- [ ] 确保 Popover/Tooltip 在 Escape 时正确关闭

---

## 4. 颜色对比度 | Color Contrast

### 说明

WCAG AA 要求文本与背景之间有足够的对比度，确保视力不佳的用户也能阅读内容。这是最常见的无障碍问题之一。

### 对比度要求

| 元素类型 | 最低对比度 |
|----------|-----------|
| 普通文本（< 18px） | **4.5 : 1** |
| 大号文本（≥ 18px 粗体 或 ≥ 24px） | **3.0 : 1** |
| UI 组件与图形（图标、边框、焦点环） | **3.0 : 1** |

### 当前 Design Token 审计

| Token 组合 | 对比度 | 状态 |
|-----------|--------|------|
| `text.primary` (#1e293b) on `background.paper` (#ffffff) | 12.63 : 1 | ✅ 通过 |
| `text.secondary` (#64748b) on `background.paper` (#ffffff) | 4.62 : 1 | ✅ 通过 |
| `text.muted` (#94a3b8) on `background.paper` (#ffffff) | **2.87 : 1** | ❌ 不通过 |

**关键发现：`text.muted` 不满足 WCAG AA 文本对比度要求。**

### `text.muted` 使用规范

`text.muted` 只能用于以下非关键场景：

```tsx
// ✅ 允许：装饰性文本（不传达重要信息）
<Typography variant="caption" sx={{ color: 'text.muted' }}>
  最后更新于 2025-01-01
</Typography>

// ✅ 允许：已有关联 label 的辅助说明（label 本身满足对比度）
<FormControl>
  <FormLabel>用户名</FormLabel>
  <TextField />
  <FormHelperText sx={{ color: 'text.muted' }}>4-20 个字符</FormHelperText>
</FormControl>

// ❌ 禁止：独立的操作指引或重要信息
<Typography sx={{ color: 'text.muted' }}>
  请先保存当前修改后再离开此页面
</Typography>

// ❌ 禁止：表单 label 使用 text.muted
<FormControlLabel
  label={<Typography sx={{ color: 'text.muted' }}>启用通知</Typography>}
/>
```

### 实际代码示例

```tsx
// ✅ 正确：使用满足对比度的 token
<Typography variant="body2" sx={{ color: 'text.secondary' }}>
  这是一条重要提示信息
</Typography>

// ✅ 正确：关键状态使用高对比度
<Chip
  label="已逾期"
  color="error"
  // MUI error 色已满足对比度
/>

// ✅ 正确：禁用状态通过 opacity 而非低对比度颜色
<Box sx={{ opacity: 0.5 }}>
  <Typography>禁用的内容</Typography>
</Box>
```

### 已完成项目

- [x] `text.primary` 和 `text.secondary` token 对比度达标
- [x] MUI 组件默认颜色方案满足对比度

### 待完成项目

- [ ] 审计代码中所有 `text.muted` 使用，分类为「可接受」与「需修复」
- [ ] 将关键信息从 `text.muted` 改为 `text.secondary`
- [ ] 暗色模式下全量对比度审计
- [ ] 自定义主题覆盖色的对比度检查
- [ ] 确保所有状态指示色（success/warning/error）满足对比度

---

## 5. ARIA 标签 | ARIA Labels

### 说明

ARIA 标签为辅助技术提供额外的上下文信息。当交互元素没有可见文本标签时，必须通过 `aria-label` 或 `aria-labelledby` 提供可访问的名称。

### 核心规范

**图标按钮必须有 aria-label：**

```tsx
// ✅ 正确
<IconButton aria-label="搜索" onClick={handleSearch}>
  <SearchIcon />
</IconButton>

<IconButton aria-label="关闭对话框" onClick={handleClose}>
  <CloseIcon />
</IconButton>

<IconButton aria-label="添加新记录" onClick={handleAdd}>
  <AddIcon />
</IconButton>

// ❌ 错误：无 aria-label，屏幕阅读器无法描述
<IconButton onClick={handleDelete}>
  <DeleteIcon />
</IconButton>
```

**通过 aria-labelledby 关联已有文本：**

```tsx
// ✅ 关联可见的标题文本
<Dialog>
  <DialogTitle id="confirm-dialog-title">确认操作</DialogTitle>
  <DialogContent aria-labelledby="confirm-dialog-title">
    确定要执行此操作吗？
  </DialogContent>
</Dialog>

// ✅ 关联 label 文本
<div>
  <span id="amount-label">金额</span>
  <span aria-labelledby="amount-label" role="textbox" tabIndex={0}>
    $1,000.00
  </span>
</div>
```

**图表和可视化需要描述性标签：**

```tsx
// ✅ 图表容器
<Box
  role="img"
  aria-label="2024年月度销售趋势柱状图，显示从1月的12万到12月的28万的增长趋势"
>
  <BarChart data={salesData} />
</Box>

// ✅ 数据表格
<Table aria-label="项目列表，共15条记录">
  <TableHead>
    <TableRow>
      <TableCell scope="col">项目名称</TableCell>
      <TableCell scope="col">状态</TableCell>
    </TableRow>
  </TableHead>
</Table>
```

**动态消息使用 aria-live：**

```tsx
// ✅ 非紧急消息（如保存成功提示）
<Snackbar severity="success">
  <Alert aria-live="polite">数据已保存</Alert>
</Snackbar>

// ✅ 紧急消息（如表单验证错误）
<Alert severity="error" aria-live="assertive">
  请修正表单中的错误后重新提交
</Alert>

// ✅ 加载状态
<Box role="status" aria-live="polite">
  <CircularProgress size={20} />
  <Typography>正在加载数据...</Typography>
</Box>
```

### 已完成项目

- [x] MUI 组件的默认 ARIA 属性已就位

### 待完成项目

- [ ] 审计所有 `IconButton` 的 `aria-label` 覆盖率
- [ ] 为所有图表组件添加 `role="img"` + `aria-label`
- [ ] 确保所有 Snackbar/Alert 配置了 `aria-live`
- [ ] 为自定义可视化组件添加无障碍描述

---

## 6. 表单无障碍 | Form Accessibility

### 说明

表单是 TOPEMS 的核心交互。每个输入控件都必须有关联的标签，错误信息必须能被辅助技术感知。

### 核心规范

**每个输入必须有 label：**

```tsx
// ✅ 方式一：使用 MUI TextField 的 label 属性
<TextField
  label="电子邮箱"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  fullWidth
/>

// ✅ 方式二：使用 FormControl + FormLabel
<FormControl fullWidth>
  <FormLabel id="role-label">角色</FormLabel>
  <Select aria-labelledby="role-label" value={role}>
    <MenuItem value="admin">管理员</MenuItem>
    <MenuItem value="user">普通用户</MenuItem>
  </Select>
</FormControl>

// ✅ 方式三：使用 htmlFor/id 关联
<label htmlFor="username-input">用户名</label>
<input id="username-input" type="text" />

// ❌ 错误：仅用 placeholder 代替 label
<input placeholder="请输入用户名" />
```

**错误消息必须关联到输入控件：**

```tsx
import { useState } from 'react';
import TextField from '@mui/material/TextField';

function EmailField() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const validate = (value: string) => {
    if (!value) return '邮箱地址不能为空';
    if (!/\S+@\S+\.\S+/.test(value)) return '请输入有效的邮箱地址';
    return '';
  };

  return (
    <TextField
      label="电子邮箱"
      value={email}
      onChange={(e) => {
        setEmail(e.target.value);
        setError(validate(e.target.value));
      }}
      error={!!error}
      helperText={error}
      // MUI TextField 自动通过 aria-describedby 关联 helperText
      required
      aria-required="true"
    />
  );
}
// MUI TextField 自动将 helperText 的 id 设置为 aria-describedby
// 屏幕阅读器会先播报 label，然后播报错误信息
```

**必填字段的标记：**

```tsx
// ✅ MUI TextField 的 required 属性
<TextField label="项目名称" required />
// 自动添加 aria-required="true" 并在 label 后显示星号

// ✅ 使用 FormControlLabel 的 required
<FormControlLabel
  control={<Checkbox />}
  label="我已阅读并同意服务条款"
  required
/>

// ❌ 错误：仅用红色星号标记，没有 aria-required
<div>
  <span className="required">*</span> 项目名称
  <input />
</div>
```

**使用 FormFieldGroup 分组相关字段：**

```tsx
import FormFieldGroup from '@/components/common/FormFieldGroup';

// ✅ 使用已有的 FormFieldGroup 组件
<FormFieldGroup legend="联系信息">
  <TextField label="手机号码" fullWidth />
  <TextField label="电子邮箱" fullWidth />
  <TextField label="通讯地址" fullWidth />
</FormFieldGroup>
// 内部使用 fieldset + legend 语义化结构
```

**完整的表单示例：**

```tsx
function ProjectForm() {
  return (
    <form onSubmit={handleSubmit}>
      <Typography variant="h5" id="form-title">创建新项目</Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
        {/* 基本信息 */}
        <FormFieldGroup legend="基本信息">
          <TextField
            label="项目名称"
            required
            fullWidth
            id="project-name"
          />
          <TextField
            label="项目描述"
            multiline
            rows={3}
            fullWidth
            id="project-desc"
          />
        </FormFieldGroup>

        {/* 时间设置 */}
        <FormFieldGroup legend="时间设置">
          <TextField
            label="开始日期"
            type="date"
            required
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="结束日期"
            type="date"
            required
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
        </FormFieldGroup>

        {/* 提交 */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button type="submit" variant="contained">创建项目</Button>
          <Button type="button" variant="outlined" onClick={handleCancel}>
            取消
          </Button>
        </Box>
      </Box>
    </form>
  );
}
```

### 已完成项目

- [x] `FormFieldGroup` 组件使用 `fieldset` + `legend` 结构
- [x] MUI `TextField` 自动关联 label 和 helperText

### 待完成项目

- [ ] 审计所有表单页面的 label 覆盖率
- [ ] 确保 placeholder 文本未替代 label
- [ ] 测试表单错误消息在屏幕阅读器中的播报
- [ ] 确保 `required` 字段在所有表单中正确标记

---

## 7. 焦点管理 | Focus Management

### 说明

当页面内容动态变化时（如打开对话框、切换页面），焦点需要被正确管理，以确保用户知道发生了什么变化，并能立即与新内容交互。

### 核心规范

**对话框的焦点管理（MUI 自动处理）：**

```tsx
// MUI Dialog 自动完成以下操作：
// 1. 打开时：焦点移到对话框内第一个可聚焦元素
// 2. 打开时：焦点陷阱生效，Tab 不会离开对话框
// 3. 关闭时：焦点恢复到触发元素
<Dialog open={isOpen} onClose={handleClose}>
  <DialogTitle>编辑记录</DialogTitle>
  <DialogContent>
    <TextField label="名称" autoFocus /> {/* autoFocus 控制初始焦点 */}
  </DialogContent>
</Dialog>
```

**页面导航的焦点管理：**

```tsx
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

function PageWithHeading() {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    // 路由切换后将焦点移到页面标题
    // 这样屏幕阅读器用户能立即知道当前在哪个页面
    headingRef.current?.focus();
  }, []);

  return (
    <div>
      <Typography
        ref={headingRef}
        variant="h4"
        tabIndex={-1}
        // tabIndex={-1} 使元素可编程聚焦但不参与 Tab 导航
      >
        项目管理
      </Typography>
      {/* 页面内容 */}
    </div>
  );
}
```

**Toast/Snackbar 不应抢占焦点：**

```tsx
// ✅ 正确：使用 aria-live 而非焦点抢占
<Snackbar open={showNotification} autoHideDuration={4000}>
  <Alert severity="success" aria-live="polite">
    操作已成功完成
  </Alert>
</Snackbar>

// ❌ 错误：Snackbar 抢占焦点会打断用户当前操作
// MUI Snackbar 默认不抢占焦点，这是正确的行为
```

**保持可见的焦点指示器：**

```tsx
// ✅ MUI 默认提供 focus-visible 样式，不要移除
// 如果你需要自定义焦点样式，使用 :focus-visible 而非 :focus

// 全局 CSS 中保持（index.css 已配置）：
// .Mui-focusVisible {
//   outline: 2px solid #1976d2 !important;
//   outline-offset: 2px;
// }

// ❌ 禁止移除焦点指示器
// *:focus {
//   outline: none !important;  // 绝对不要这样做！
// }
```

**自定义组件的焦点环：**

```tsx
// ✅ 自定义可交互卡片
import { Box, styled } from '@mui/material';

const InteractiveCard = styled(Box)(({ theme }) => ({
  cursor: 'pointer',
  borderRadius: theme.shape.borderRadius,
  '&:focus-visible': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 2,
  },
}));

<InteractiveCard
  tabIndex={0}
  role="button"
  aria-label="打开项目详情"
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }}
>
  {/* 卡片内容 */}
</InteractiveCard>
```

### 已完成项目

- [x] `GlobalLayout` 包含 `SkipToContent`，支持快速跳到主内容区
- [x] MUI Dialog 内置焦点陷阱和焦点恢复
- [x] `index.css` 配置了 `prefers-reduced-motion` 和焦点样式

### 待完成项目

- [ ] 为每个页面路由添加标题元素聚焦（`tabIndex={-1}`）
- [ ] 确保所有自定义可交互组件有可见焦点环
- [ ] 审计并移除所有 `outline: none` 的 CSS 规则
- [ ] 测试 Drawer 关闭后焦点是否正确恢复

---

## 8. 动画与运动 | Motion & Animation

### 说明

动画可能对某些用户造成不适或干扰，特别是前庭功能障碍的用户。WCAG 要求尊重用户的动画偏好设置。

### 核心规范

**尊重 prefers-reduced-motion（已实现）：**

TOPEMS 的 `index.css` 已包含以下媒体查询：

```css
/* 已存在于 index.css */
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

当用户的系统设置中启用了「减少动态效果」时，所有动画和过渡将被最小化。

**使用 motion token 控制动画：**

```tsx
// ✅ 使用 design token 中的 motion duration
import { alpha, styled } from '@mui/material';

const AnimatedPanel = styled(Box)(({ theme }) => ({
  transition: theme.transitions.create(['opacity', 'transform'], {
    duration: theme.transitions.duration.standard, // 使用 token
  }),
}));

// ✅ 在 JS 中检测减少动画偏好
import { useMediaQuery, useTheme } from '@mui/material';

function AnimatedComponent() {
  const theme = useTheme();
  const prefersReducedMotion = useMediaQuery(
    theme.breakpoints.down('md') // 示例：也可以检测 reduced motion
  );

  // 更精确的方式：
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  if (reducedMotion) {
    return <StaticVersion />;
  }
  return <AnimatedVersion />;
}
```

**自动播放动画的处理：**

```tsx
// ✅ 自动轮播/动画提供暂停控制
function BannerCarousel() {
  const [isPlaying, setIsPlaying] = useState(true);

  return (
    <Box>
      <Box role="img" aria-label="项目公告轮播" aria-live="off">
        {/* 轮播内容 */}
      </Box>
      <IconButton
        aria-label={isPlaying ? '暂停轮播' : '播放轮播'}
        onClick={() => setIsPlaying(!isPlaying)}
      >
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </IconButton>
    </Box>
  );
}

// ❌ 错误：没有暂停控制的自动轮播
```

**动态内容的无障碍通知：**

```tsx
// ✅ 动态更新的列表使用 aria-live 区域
<Box aria-live="polite" aria-relevant="additions">
  {notifications.map((n) => (
    <NotificationItem key={n.id} notification={n} />
  ))}
</Box>
// 当新通知添加时，屏幕阅读器会播报新内容
```

### 已完成项目

- [x] `index.css` 包含 `prefers-reduced-motion: reduce` 全局规则
- [x] Design token 中定义了 `motion.duration` 相关 token
- [x] MUI `theme.transitions` 提供标准化的过渡时长

### 待完成项目

- [ ] 审计所有自动播放动画，确保提供暂停机制
- [ ] 确保数据刷新时的 aria-live 区域正确配置
- [ ] 测试在 `prefers-reduced-motion: reduce` 下的用户体验

---

## 9. 屏幕阅读器测试清单 | Screen Reader Testing Checklist

### 说明

即使代码遵循了所有无障碍规范，仍需要使用实际的屏幕阅读器进行测试，因为辅助技术的行为可能与预期不同。

### 测试工具

| 工具 | 平台 | 说明 |
|------|------|------|
| VoiceOver | macOS / iOS | 系统内置，按 `Cmd + F5` 开启 |
| NVDA | Windows | 免费开源，需单独安装 |
| JAWS | Windows | 商业软件 |
| TalkBack | Android | 系统内置 |

### 每页测试清单

每个核心页面都应通过以下检查项：

#### 页面基础

- [ ] **页面标题正确播报**：浏览到新页面时，屏幕阅读器播报了正确的页面标题
- [ ] **导航 landmark 存在**：能通过 landmark 快捷键跳转到主导航区域（VoiceOver: `Cmd + Option + U`）
- [ ] **主内容区域可识别**：能跳转到 `main` landmark
- [ ] **语言正确**：页面语言设置正确（`<html lang="zh-CN">`）

#### 交互元素

- [ ] **所有交互元素可达**：通过 Tab 键可以到达所有可交互元素
- [ ] **元素功能可理解**：每个可聚焦元素的 role 和名称被正确播报
- [ ] **按钮有名称**：所有按钮（包括图标按钮）都有可理解的名称
- [ ] **链接有目的地**：链接文本清楚表明目标（避免「点击这里」）
- [ ] **状态可感知**：开关、复选框等的状态（选中/未选中）被正确播报

#### 表单

- [ ] **标签关联正确**：每个输入控件的标签被正确播报
- [ ] **必填项被提示**：必填字段在聚焦时屏幕阅读器提示「必填」
- [ ] **错误消息被播报**：提交表单后，错误消息被自动播报
- [ ] **错误关联到字段**：焦点移到错误字段时，对应的错误信息被播报
- [ ] **成功状态可感知**：表单提交成功后有适当的反馈

#### 动态内容

- [ ] **新内容变化被播报**：动态出现的内容（如 toast、新数据行）被播报
- [ ] **弹窗被识别**：对话框打开时屏幕阅读器进入对话框模式
- [ ] **弹窗关闭后焦点恢复**：关闭弹窗后焦点回到触发元素
- [ ] **加载状态被播报**：异步加载时用户知道正在等待

### 优先测试页面

1. **登录页**：表单 + 错误处理
2. **仪表盘**：数据展示 + 导航
3. **项目列表**：表格交互 + 筛选
4. **项目详情**：选项卡 + 动态内容
5. **创建/编辑表单**：复杂表单 + 验证
6. **通知中心**：动态列表 + 状态变化

### 测试记录模板

```
页面：[页面名称]
测试日期：[日期]
测试工具：[VoiceOver / NVDA / 其他]
测试人：[姓名]

✅ 通过项：
- [具体通过项]

❌ 未通过项：
- [具体问题描述] → [严重程度：高/中/低] → [修复建议]
```

---

## 10. 工具 | Tooling

### 说明

使用自动化工具可以在开发过程中尽早发现无障碍问题。以下是推荐的工具栈。

### 开发时检查

**eslint-plugin-jsx-a11y（计划集成）：**

```bash
npm install --save-dev eslint-plugin-jsx-a11y
```

```js
// .eslintrc.js 配置
module.exports = {
  plugins: ['jsx-a11y'],
  extends: ['plugin:jsx-a11y/recommended'],
  rules: {
    // 可根据项目需求调整规则
    'jsx-a11y/anchor-is-valid': 'error',
    'jsx-a11y/alt-text': 'error',
    'jsx-a11y/aria-props': 'error',
    'jsx-a11y/role-has-required-aria-props': 'error',
  },
};
```

常见可检测的问题：

| 规则 | 检测内容 |
|------|----------|
| `alt-text` | `<img>` 缺少 alt 属性 |
| `anchor-is-valid` | `<a>` 缺少 href 或使用错误 |
| `aria-props` | 无效的 ARIA 属性值 |
| `click-events-have-key-events` | onClick 但无键盘事件 |
| `no-static-element-interactions` | 非交互元素有交互处理器 |
| `role-has-required-aria-props` | role 缺少必需的 ARIA 属性 |

### 浏览器扩展

**axe DevTools：**

1. 安装 axe DevTools 浏览器扩展
2. 打开 TOPEMS 页面
3. 点击扩展图标，运行扫描
4. 查看报告：违反项、需改进项、通过项
5. 重点关注「严重」和「中等」级别的违反项

### 自动化测试（计划集成）

**@axe-core/react：**

```tsx
// 计划集成到测试套件
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('Dashboard should have no accessibility violations', async () => {
  const { container } = render(<Dashboard />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});

// 仅检查特定组件
test('ProjectForm should have no accessibility violations', async () => {
  const { container } = render(<ProjectForm />);
  const results = await axe(container, {
    rules: {
      'color-contrast': { enabled: false }, // 如需排除特定规则
    },
  });
  expect(results).toHaveNoViolations();
});
```

### CI/CD 集成

**Lighthouse CI：**

```json
// lighthouserc.js 配置示例
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run start',
      url: ['http://localhost:3000/'],
    },
    assert: {
      assertions: {
        'categories:accessibility': ['error', { minScore: 0.9 }],
      },
    },
  },
};
```

**axe-core 在 Playwright 中：**

```ts
// Playwright 无障碍测试（未来集成）
import AxeBuilder from '@axe-core/playwright';

test('Dashboard accessibility', async ({ page }) => {
  await page.goto('/dashboard');
  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
  expect(accessibilityScanResults.violations).toEqual([]);
});
```

### 工具使用优先级

| 优先级 | 工具 | 使用场景 |
|--------|------|----------|
| 1（必须） | eslint-plugin-jsx-a11y | 日常开发，PR 检查 |
| 2（必须） | axe DevTools | 手动审计，深度检查 |
| 3（推荐） | @axe-core/react | 组件单元测试 |
| 4（推荐） | Lighthouse | 定期全站审计 |
| 5（可选） | axe-core + Playwright | E2E 无障碍测试 |

---

## 附录 | Appendix

### 快速参考卡片

**最常犯的无障碍错误及修复：**

| 错误 | 修复 |
|------|------|
| `<div onClick>` | 改用 `<Button>` 或添加 `role="button"` + `tabIndex={0}` + 键盘事件 |
| `<IconButton>` 无 `aria-label` | 添加 `aria-label` 描述性文字 |
| `<input placeholder="...">` 无 label | 添加 `<label>` 或使用 `TextField` |
| 颜色是唯一的信息传达方式 | 添加文字/图标作为辅助 |
| `text.muted` 用于关键信息 | 改用 `text.secondary` |
| 自定义焦点样式移除 outline | 保持 `:focus-visible` 的 outline |

**WCAG AA 合规速查：**

| 要求 | 标准 | 检查方式 |
|------|------|----------|
| 文本对比度 | ≥ 4.5:1 | axe DevTools / 手动计算 |
| 大号文本对比度 | ≥ 3:1 | axe DevTools / 手动计算 |
| 键盘可访问性 | 所有功能可键盘操作 | 手动 Tab 测试 |
| 焦点可见 | 清晰的焦点指示器 | 视觉检查 |
| 表单标签 | 每个 input 有 label | 代码审查 / axe |
| 页面标题 | 每页有描述性标题 | 浏览器标签检查 |
| 跳转链接 | 提供 SkipToContent | Tab 首次按键 |

### 相关资源

- [WCAG 2.2 官方文档](https://www.w3.org/TR/WCAG22/)
- [MUI Accessibility 文档](https://mui.com/material-ui/accessibility/)
- [axe Accessibility 规则集](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)
- [WebAIM 对比度检查器](https://webaim.org/resources/contrastchecker/)
- [ARIA Practices 设计模式](https://www.w3.org/WAI/ARIA/apg/)

---

*最后更新：2026-06-28*
*维护团队：TOPEMS Frontend Team*
