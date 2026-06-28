# TOPEMS 设计令牌指南

## 1. 概述

### 什么是设计令牌？

设计令牌（Design Tokens）是设计系统中最基础的构建块，它们是视觉设计决策的抽象表示——如颜色、间距、字体大小、阴影等——以键值对的形式存储在代码中。TOPEMS 的设计令牌统一定义在 `src/theme/tokens.ts` 文件中。

### 为什么使用设计令牌？

- **一致性**：确保整个应用使用统一的视觉规范，避免硬编码颜色值
- **可维护性**：修改一处即可全局生效，降低维护成本
- **主题支持**：为亮色/暗色模式切换提供基础
- **跨平台复用**：同一套令牌可服务于 Web、移动端等不同平台
- **设计-开发协作**：令牌作为设计与开发之间的共同语言

### 令牌结构总览

```typescript
import { designTokens } from '@/theme/tokens';

// 完整令牌对象包含以下分类：
designTokens.colors    // 颜色
designTokens.spacing  // 间距
designTokens.borderRadius // 圆角
designTokens.shadows  // 阴影
designTokens.darkShadows // 暗色模式阴影
designTokens.motion   // 动效
designTokens.typography // 排版
designTokens.zIndex   // 层级
designTokens.transitions // 过渡
designTokens.breakpoints // 断点
```

---

## 2. 令牌分类详解

### 2.1 颜色（Colors）

TOPEMS 的颜色系统包含语义色、中性色、背景色、文字色、边框色和操作色。

#### 语义色 - 主色

| 令牌 | 值 | 用途 |
|------|------|------|
| `primary.main` | `#3b82f6` | 主要按钮、链接、选中态 |
| `primary.light` | `#60a5fa` | 悬停背景、柔和高亮 |
| `primary.dark` | `#2563eb` | 按压态、深色强调 |
| `primary.contrastText` | `#ffffff` | 主色上的文字色 |
| `primary.50` ~ `primary.900` | 渐变色阶 | 各种透明度需求 |

完整色阶：

```
50:  #eff6ff   100: #dbeafe   200: #bfdbfe
300: #93c5fd   400: #60a5fa   500: #3b82f6 (main)
600: #2563eb   700: #1d4ed8   800: #1e40af
900: #1e3a8a
```

#### 语义色 - 次要色（Secondary）

```
main:  #8b5cf6   light: #a78bfa   dark: #7c3aed
50:  #f5f3ff   100: #ede9fe   200: #ddd6fe   300: #c4b5fd
400: #a78bfa   500: #8b5cf6   600: #7c3aed   700: #6d28d9
800: #5b21b6   900: #4c1d95
```

#### 语义色 - 成功色（Success）

```
main:  #22c55e   light: #86efac   dark: #16a34a
50:  #f0fdf4   100: #dcfce7   200: #bbf7d0   300: #86efac
400: #4ade80   500: #22c55e   600: #16a34a   700: #15803d
800: #166534   900: #14532d
```

#### 语义色 - 警告色（Warning）

```
main:  #f59e0b   light: #fde68a   dark: #d97706
50:  #fffbeb   100: #fef3c7   200: #fde68a   300: #fcd34d
400: #fbbf24   500: #f59e0b   600: #d97706   700: #b45309
800: #92400e   900: #78350f
```

#### 语义色 - 错误色（Error）

```
main:  #ef4444   light: #fca5a5   dark: #dc2626
50:  #fef2f2   100: #fee2e2   200: #fecaca   300: #fca5a5
400: #f87171   500: #ef4444   600: #dc2626   700: #b91c1c
800: #991b1b   900: #7f1d1d
```

#### 语义色 - 信息色（Info）

```
main:  #0ea5e9   light: #7dd3fc   dark: #0284c7
50:  #f0f9ff   100: #e0f2fe   200: #bae6fd   300: #7dd3fc
400: #38bdf8   500: #0ea5e9   600: #0284c7   700: #0369a1
800: #075985   900: #0c4a6e
```

#### 中性色（Grey）

```
50:  #f9fafb   100: #f3f4f6   200: #e5e7eb   300: #d1d5db
400: #9ca3af   500: #6b7280   600: #4b5563   700: #374151
800: #1f2937   900: #111827   950: #030712
```

#### 背景色（Background）

| 令牌 | 值 | 用途 |
|------|------|------|
| `background.default` | `#f8fafc` | 页面默认背景 |
| `background.paper` | `#ffffff` | 卡片/面板背景 |
| `background.elevated` | `#ffffff` | 浮层/弹窗背景 |

#### 文字色（Text）

| 令牌 | 值 | 用途 |
|------|------|------|
| `text.primary` | `#1e293b` | 主文字，用于标题和正文 |
| `text.secondary` | `#64748b` | 次要文字，用于描述和辅助信息 |
| `text.muted` | `#94a3b8` | 弱化文字，用于占位符 |
| `text.disabled` | `#cbd5e1` | 禁用态文字 |

#### 边框色（Border）

| 令牌 | 值 | 用途 |
|------|------|------|
| `border.default` | `#e2e8f0` | 默认边框 |
| `border.light` | `#f1f5f9` | 轻边框，分割线 |
| `border.dark` | `#cbd5e1` | 强调边框 |

#### 操作色（Action）

| 令牌 | 值 | 用途 |
|------|------|------|
| `action.hover` | `#f1f5f9` | 悬停态背景 |
| `action.active` | `#e2e8f0` | 按压/激活态背景 |
| `action.selected` | `#dbeafe` | 选中态背景 |
| `action.disabled` | `#f1f5f9` | 禁用态背景 |
| `action.disabledBackground` | `#f8fafc` | 禁用态整体背景 |
| `action.focus` | `#dbeafe` | 焦点态边框/背景 |

#### Surface 色

```
50:  #fafafa   100: #f5f5f5   200: #e5e5e5
300: #d4d4d4   400: #a3a3a3   500: #737373
```

---

### 2.2 排版（Typography）

#### 字体族

```
fontFamily: "Inter", "Noto Sans SC", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
```

优先使用 Inter（英文），回退到 Noto Sans SC（中文），最终回退到系统字体。

#### 字号

| 令牌 | 值 | 对应 rem | 用途 |
|------|------|----------|------|
| `fontSize.xs` | `0.75rem` | 12px | 辅助说明、标签 |
| `fontSize.sm` | `0.875rem` | 14px | 正文小号、表格内容 |
| `fontSize.base` | `1rem` | 16px | 默认正文 |
| `fontSize.lg` | `1.125rem` | 18px | 小标题 |
| `fontSize.xl` | `1.25rem` | 20px | 卡片标题 |
| `fontSize.2xl` | `1.5rem` | 24px | 区块标题 |
| `fontSize.3xl` | `1.875rem` | 30px | 页面标题 |
| `fontSize.4xl` | `2.25rem` | 36px | 大标题 |
| `fontSize.5xl` | `3rem` | 48px | 展示标题 |
| `fontSize.6xl` | `3.75rem` | 60px | 超大标题 |

#### 字重

| 令牌 | 值 | 用途 |
|------|------|------|
| `fontWeight.light` | 300 | 装饰性文本 |
| `fontWeight.normal` | 400 | 正文 |
| `fontWeight.medium` | 500 | 按钮、强调文本 |
| `fontWeight.semibold` | 600 | 小标题、导航 |
| `fontWeight.bold` | 700 | 标题 |
| `fontWeight.extrabold` | 800 | 大标题展示 |

#### 预设排版组合

| 令牌 | 字号 | 字重 | 行高 | 用途 |
|------|------|------|------|------|
| `h1` | 2.5rem | 700 | 1.2 | 页面主标题 |
| `h2` | 2rem | 600 | 1.3 | 区块标题 |
| `h3` | 1.5rem | 600 | 1.4 | 子区块标题 |
| `h4` | 1.25rem | 600 | 1.4 | 卡片标题 |
| `h5` | 1rem | 600 | 1.5 | 小标题 |
| `h6` | 0.875rem | 600 | 1.5 | 标签标题 |
| `body1` | 1rem | 400 | 1.5 | 正文 |
| `body2` | 0.875rem | 400 | 1.5 | 小号正文 |
| `caption` | 0.75rem | 400 | 1.5 | 辅助文本 |
| `button` | 0.875rem | 500 | 1.5 | 按钮文字 |
| `overline` | 0.75rem | 600 | 1.5 | 大写标签文字 |

#### 行高

| 令牌 | 值 | 用途 |
|------|------|------|
| `lineHeight.tight` | 1.25 | 标题 |
| `lineHeight.normal` | 1.5 | 正文 |
| `lineHeight.relaxed` | 1.75 | 宽松阅读 |

#### 字间距

| 令牌 | 值 | 用途 |
|------|------|------|
| `letterSpacing.tighter` | `-0.05em` | 大标题 |
| `letterSpacing.tight` | `-0.025em` | 标题 |
| `letterSpacing.normal` | `0em` | 正文 |
| `letterSpacing.wide` | `0.025em` | 按钮、说明 |
| `letterSpacing.wider` | `0.05em` | 标签 |

---

### 2.3 间距（Spacing）

间距令牌采用 4px 基准倍数系统：

| 令牌 | 值 | 等价 px | 典型用途 |
|------|------|---------|---------|
| `spacing.none` | 0 | 0px | 无间距 |
| `spacing.xs` | 4 | 4px | 图标与文字间距 |
| `spacing.sm` | 8 | 8px | 紧凑元素间距 |
| `spacing.md` | 16 | 16px | 标准间距 |
| `spacing.lg` | 24 | 24px | 区块内间距 |
| `spacing.xl` | 32 | 32px | 区块间间距 |
| `spacing.2xl` | 48 | 48px | 大区块间距 |
| `spacing.3xl` | 64 | 64px | 页面级间距 |

---

### 2.4 阴影（Shadows）

#### 亮色模式阴影

| 令牌 | 值 | 用途 |
|------|------|------|
| `shadows.none` | `none` | 无阴影 |
| `shadows.xs` | `0 1px 2px 0 rgb(0 0 0 / 0.03)` | 微弱阴影 |
| `shadows.sm` | `0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.02)` | 卡片 |
| `shadows.md` | `0 4px 6px -1px rgb(0 0 0 / 0.04), 0 2px 4px -1px rgb(0 0 0 / 0.02)` | 中等层级 |
| `shadows.lg` | `0 10px 15px -3px rgb(0 0 0 / 0.05)` | 浮层 |
| `shadows.xl` | `0 20px 25px -5px rgb(0 0 0 / 0.08)` | 弹窗 |
| `shadows.2xl` | `0 25px 50px -12px rgb(0 0 0 / 0.15)` | 模态框 |
| `shadows.float` | `0 25px 50px -12px rgb(0 0 0 / 0.15)` | 浮动面板 |
| `shadows.3xl` | `0 35px 60px -15px rgb(0 0 0 / 0.2)` | 高层级浮层 |
| `shadows.inner` | `inset 0 2px 4px 0 rgb(0 0 0 / 0.05)` | 内阴影 |

#### 暗色模式阴影（darkShadows）

暗色模式使用更高的 alpha 值，以确保在深色背景上清晰可见：

| 令牌 | Alpha 范围 | 说明 |
|------|------------|------|
| `darkShadows.xs` | 0.2 | 微弱阴影 |
| `darkShadows.sm` | 0.25 | 小阴影 |
| `darkShadows.md` | 0.25 | 中等阴影 |
| `darkShadows.lg` | 0.3 | 大阴影 |
| `darkShadows.xl` | 0.35 | 超大阴影 |
| `darkShadows.2xl` | 0.4 | 模态框阴影 |
| `darkShadows.3xl` | 0.45 | 最高层级 |
| `darkShadows.inner` | 0.15 | 内阴影 |

---

### 2.5 动效（Motion）

#### 持续时间（Duration）

| 令牌 | 值 | 用途 |
|------|------|------|
| `motion.duration.instant` | `0ms` | 无延迟，即时响应 |
| `motion.duration.fast` | `100ms` | 微交互（开关、hover） |
| `motion.duration.normal` | `200ms` | 标准过渡（展开/折叠） |
| `motion.duration.slow` | `300ms` | 较慢过渡（页面切换） |
| `motion.duration.deliberate` | `500ms` | 有意识的动画（弹窗出现） |
| `motion.duration.skeleton` | `2000ms` | 骨架屏闪烁 |

#### 缓动函数（Easing）

| 令牌 | 值 | 用途 |
|------|------|------|
| `motion.easing.default` | `cubic-bezier(0.4, 0, 0.2, 1)` | Material 标准缓动 |
| `motion.easing.decelerate` | `cubic-bezier(0, 0, 0.2, 1)` | 入场动画（减速） |
| `motion.easing.accelerate` | `cubic-bezier(0.4, 0, 1, 1)` | 退场动画（加速） |
| `motion.easing.sharp` | `cubic-bezier(0.4, 0, 0.6, 1)` | 共享轴过渡 |

---

### 2.6 层级（Z-Index）

| 令牌 | 值 | 用途 |
|------|------|------|
| `zIndex.mobileStepper` | 1000 | 移动端步骤条 |
| `zIndex.snackbar` | 1100 | 消息条 |
| `zIndex.tooltip` | 1200 | 工具提示 |
| `zIndex.appBar` | 1300 | 顶部导航栏 |
| `zIndex.drawer` | 1400 | 抽屉 |
| `zIndex.modal` | 1500 | 模态框 |
| `zIndex.popover` | 1600 | 弹出层 |
| `zIndex.snackbarContent` | 1700 | 消息条内容 |
| `zIndex.tooltipContent` | 1800 | 工具提示内容 |

---

### 2.7 过渡（Transitions）

#### 持续时间

| 令牌 | 值 | 用途 |
|------|------|------|
| `transitions.duration.shortest` | 150 | 极短 |
| `transitions.duration.shorter` | 200 | 较短 |
| `transitions.duration.short` | 250 | 短 |
| `transitions.duration.standard` | 300 | 标准 |
| `transitions.duration.complex` | 375 | 复杂 |
| `transitions.duration.enteringScreen` | 225 | 入场 |
| `transitions.duration.leavingScreen` | 195 | 退场 |

---

### 2.8 圆角（Border Radius）

| 令牌 | 值 | 用途 |
|------|------|------|
| `borderRadius.none` | 0 | 无圆角 |
| `borderRadius.xs` | 4 | 小元素（Badge） |
| `borderRadius.sm` | 6 | 按钮 |
| `borderRadius.md` | 8 | 输入框、卡片 |
| `borderRadius.lg` | 12 | 大卡片 |
| `borderRadius.xl` | 16 | 浮层 |
| `borderRadius.2xl` | 20 | 弹窗 |
| `borderRadius.3xl` | 24 | 大弹窗 |
| `borderRadius.full` | 9999 | 圆形 |

---

### 2.9 断点（Breakpoints）

| 令牌 | 值 | 范围 |
|------|------|------|
| `breakpoints.values.xs` | 0 | 0px 起 |
| `breakpoints.values.sm` | 600 | >= 600px |
| `breakpoints.values.md` | 900 | >= 900px |
| `breakpoints.values.lg` | 1200 | >= 1200px |
| `breakpoints.values.xl` | 1536 | >= 1536px |

```tsx
// MUI 主题断点用法
const theme = useTheme();
const isMobile = useMediaQuery(theme.breakpoints.down('md'));
const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg'));
const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
```

---

## 3. 使用指南

### 在代码中引用令牌

#### 直接引用 tokens 对象

```typescript
import { designTokens } from '@/theme/tokens';

// 引用颜色
const primaryColor = designTokens.colors.primary.main; // '#3b82f6'

// 引用间距
const gap = designTokens.spacing.md; // 16

// 引用阴影
const shadow = designTokens.shadows.md;
```

#### 在 MUI sx 属性中使用

```tsx
import { designTokens } from '@/theme/tokens';

<Box sx={{
  color: designTokens.colors.text.primary,
  p: designTokens.spacing.md,
  borderRadius: designTokens.borderRadius.md,
  boxShadow: designTokens.shadows.sm,
  transition: `all ${designTokens.motion.duration.normal} ${designTokens.motion.easing.default}`,
}}>
  内容
</Box>
```

#### 在 MUI 主题中配置

令牌已被集成到 MUI 主题中，可直接通过 `theme.palette`、`theme.spacing` 等引用：

```tsx
import { useTheme } from '@mui/material';

function MyComponent() {
  const theme = useTheme();

  return (
    <Box sx={{
      color: theme.palette.primary.main,
      p: theme.spacing(2),
      boxShadow: theme.shadows[1],
    }}>
      内容
    </Box>
  );
}
```

---

## 4. CSS 变量映射（index.css）

TOPEMS 在 `index.css` 中定义了全局 CSS 变量，与设计令牌对应。以下是主要映射关系：

| CSS 变量 | 对应令牌 |
|----------|---------|
| `--color-primary` | `colors.primary.main` |
| `--color-primary-light` | `colors.primary.light` |
| `--color-primary-dark` | `colors.primary.dark` |
| `--color-success` | `colors.success.main` |
| `--color-warning` | `colors.warning.main` |
| `--color-error` | `colors.error.main` |
| `--color-info` | `colors.info.main` |
| `--color-bg` | `colors.background.default` |
| `--color-paper` | `colors.background.paper` |
| `--color-text-primary` | `colors.text.primary` |
| `--color-text-secondary` | `colors.text.secondary` |
| `--color-border` | `colors.border.default` |

```css
/* 在 CSS 中使用 */
.my-component {
  color: var(--color-primary);
  background-color: var(--color-paper);
  border: 1px solid var(--color-border);
  padding: var(--spacing-md, 16px);
}
```

> **注意**：优先使用 MUI 主题对象或 tokens 直接引用，CSS 变量主要用于非 React 环境（如纯 CSS 动画、第三方库覆盖等场景）。

---

## 附录：令牌类型定义

```typescript
export type DesignTokens = typeof designTokens;
```

完整的 TypeScript 类型定义可通过 `import type { DesignTokens } from '@/theme/tokens'` 获取，支持 IDE 自动补全和类型检查。
