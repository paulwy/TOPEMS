# TOPEMS 设计实践指南 — Do's & Don'ts

> 本文档汇总了 TOPEMS 设计系统的最佳实践与常见错误，帮助团队在日常开发中保持一致的设计质量。每个章节都包含 **原因说明**、**错误示例** 和 **正确示例**，请务必对照参考。

---

## 1. 设计令牌使用 / Design Tokens

### 为什么重要？

设计令牌是 TOPEMS 视觉体系的唯一事实来源（Single Source of Truth）。所有颜色、间距、字体、阴影等视觉属性均定义在 `src/theme/tokens.ts` 中。使用令牌可以确保全局一致性，并让亮色/暗色模式切换、主题定制成为可能。硬编码值会导致维护困难和视觉不一致。

### ✅ 正确做法

```tsx
import { semanticTokens } from '@/theme/tokens';
import { designTokens } from '@/theme/tokens';

// 使用语义令牌设置组件内部间距
<Box sx={{ p: semanticTokens.space.card.padding }}>
  <Typography sx={{ color: semanticTokens.text.body.secondary.color }}>
    辅助说明文字
  </Typography>
</Box>

// 创建自定义主题时使用 designTokens
const customTheme = createTheme({
  palette: {
    primary: {
      main: designTokens.colors.primary.main,
      light: designTokens.colors.primary.light,
      dark: designTokens.colors.primary.dark,
    },
  },
});
```

### ❌ 错误做法

```tsx
// 硬编码十六进制颜色
<Box sx={{ backgroundColor: '#3b82f6' }}>
  蓝色背景
</Box>

// 硬编码 px 值
<Box sx={{ padding: '16px', gap: '23px' }}>
  内容
</Box>

// 在多个文件中重复相同的颜色值
// 文件 A
const bgColor = '#f8fafc';
// 文件 B
const bgColor = '#f8fafc'; // 应统一使用 semanticTokens.background.page
```

### 核心原则

| 规则 | 说明 |
|------|------|
| 唯一来源 | 所有令牌从 `@/theme/tokens` 导入，不要在其他文件中重新定义 |
| 语义优先 | 组件样式使用 `semanticTokens`，主题创建使用 `designTokens` |
| 禁止硬编码 | `sx` 和 `style` 中不出现 `#xxxxxx`、`'XXpx'`（8px 基数除外） |
| 禁止复制 | 相同的令牌值只引用一次，不跨文件重复 |

---

## 2. 组件 API 使用 / Component API

### 为什么重要？

统一的组件 API 能大幅降低学习成本和集成难度。TOPEMS 在 `tokens.ts` 中定义了标准接口模式（`ComponentSize`、`StandardSxProp`），所有自定义组件都应遵循此规范，确保一致的 Developer Experience（DX）。

### ✅ 正确做法

```tsx
import type { SxProps, Theme } from '@mui/material/styles';
import type { ComponentSize } from '@/theme/tokens';

interface MyCardProps {
  /** 内容 */
  children: React.ReactNode;
  /** 尺寸 */
  size?: ComponentSize; // 'sm' | 'md' | 'lg'
  /** 禁用状态 */
  disabled?: boolean;
  /** 加载中 */
  loading?: boolean;
  /** 点击回调 — 语义化签名 */
  onClick?: (id: string) => void;
  /** 样式扩展 */
  sx?: SxProps<Theme>;
}

// 使用 sx 进行样式定制
<MyCard
  size="md"
  disabled={false}
  onClick={(id) => handleSelect(id)}
  sx={{
    borderRadius: semanticTokens.radius.card,
    boxShadow: semanticTokens.elevation.card,
  }}
>
  <Typography>卡片内容</Typography>
</MyCard>

// LoadingSpinner 已迁移至 sx API
import { LoadingSpinner } from '@/components/common';
<LoadingSpinner size="md" sx={{ color: 'primary.main' }} />
```

### ❌ 错误做法

```tsx
// 使用 style 而非 sx（MUI 组件应使用 sx）
<Button style={{ backgroundColor: '#3b82f6', padding: '10px' }}>
  提交
</Button>

// 使用 className 进行样式定制
<div className="my-custom-card" onClick={() => {}}>

// 自定义非标准尺寸
interface BadProps {
  size?: 'tiny' | 'normal' | 'big' | 'extra-large'; // 不在 ComponentSize 枚举中
}

// 暴露原始 DOM 事件
interface BadProps {
  onClick?: React.MouseEvent<HTMLDivElement>; // 应使用语义化签名
  onMouseEnter?: React.MouseEvent<HTMLDivElement>; // 消费者不需要知道 DOM 细节
}
```

### 核心原则

| 规则 | 说明 |
|------|------|
| `sx` 优先 | MUI 组件使用 `sx?: SxProps<Theme>`，不使用 `style` 或 `className` |
| 统一尺寸 | 使用 `ComponentSize`（`'sm' \| 'md' \| 'lg'`），不自创尺寸值 |
| 语义回调 | 事件签名为 `(value: T) => void`，不暴露 `React.MouseEvent` |
| 标准属性 | 可交互组件提供 `disabled`，数据组件提供 `loading` |

---

## 3. 颜色使用 / Color Usage

### 为什么重要？

颜色是 UI 中传递状态和层次最直接的手段。TOPEMS 采用三层颜色结构（基础色板、模块主题色、功能色），每层都有明确的职责。正确使用颜色可以建立清晰的视觉层次，同时确保无障碍可访问性（WCAG AA 对比度 4.5:1）。

### ✅ 正确做法

```tsx
import { alpha, useTheme } from '@mui/material/styles';
import { semanticTokens } from '@/theme/tokens';

// 使用 MUI palette 引用
<Button color="primary" variant="contained">提交</Button>
<Chip label="已完成" color="success" />
<Alert severity="warning">库存不足</Alert>

// 使用语义令牌
<Box sx={{
  backgroundColor: semanticTokens.background.card,
  border: semanticTokens.border.default,
}}>
  <Typography sx={{ color: semanticTokens.text.body.secondary.color }}>
    描述信息
  </Typography>
</Box>

// 使用模块主题色
import { getModuleTheme } from '@/lib/moduleThemes';

function ModuleHeader({ moduleCode }: { moduleCode: string }) {
  const moduleTheme = getModuleTheme(moduleCode);
  return (
    <Box sx={{ background: moduleTheme.gradient }}>
      <Typography sx={{ color: '#fff' }}>{moduleTheme.name}</Typography>
    </Box>
  );
}

// 颜色 + 图标/文字双重传达含义
<Chip
  icon={<CheckCircleOutline />}
  label="已完成"
  color="success"
/>
```

### ❌ 错误做法

```tsx
// 硬编码 rgba 值
<Box sx={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
// 应使用：alpha(theme.palette.primary.main, 0.1)

// 仅用颜色传达含义（无文字/图标辅助）
<Box sx={{ backgroundColor: 'success.main' }} /> // 用户无法判断这代表什么

// 低对比度组合（违反 WCAG AA 4.5:1）
<Typography sx={{ color: '#94a3b8', backgroundColor: '#e2e8f0' }}>
  这行文字对比度不足，难以阅读
</Typography>

// 硬编码颜色字符串
<Box sx={{ borderColor: '#e2e8f0' }}> // 应使用 palette 或 semanticTokens
```

### 核心原则

| 规则 | 说明 |
|------|------|
| Palette 优先 | 优先使用 `palette.primary.main`、`palette.success.light` 等 |
| 语义令牌 | 背景/边框使用 `semanticTokens.background.card`、`semanticTokens.border.default` |
| 模块色 | 通过 `getModuleTheme()` 获取，不硬编码模块颜色 |
| 双重编码 | 颜色必须配合图标或文字一起使用，不能单独依赖颜色传达含义 |
| 对比度 | 确保 WCAG AA 4.5:1 对比度，正文字号建议至少 4.5:1 |

---

## 4. 间距与布局 / Spacing & Layout

### 为什么重要？

一致的间距系统让 UI 看起来整洁有序。TOPEMS 的间距体系分为两个层次：语义层（`semanticTokens.space`）用于组件内部，MUI spacing shorthand（数字）用于快速布局。混用或硬编码会导致页面节奏混乱。

### ✅ 正确做法

```tsx
import { semanticTokens } from '@/theme/tokens';
import { Box, Stack, Grid } from '@mui/material';

// 页面级布局使用语义令牌
<Box sx={{ p: semanticTokens.space.page.horizontal }}>
  <Stack gap={semanticTokens.space.page.sectionGap}>
    {/* 区域 1 */}
    <Section />
    {/* 区域 2 */}
    <Section />
  </Stack>
</Box>

// 组件内部使用语义令牌
<Card sx={{ p: semanticTokens.space.card.padding }}>
  <Stack gap={semanticTokens.space.card.gap}>
    <Typography sx={semanticTokens.text.heading['3']}>标题</Typography>
    <Typography sx={semanticTokens.text.body.secondary}>描述</Typography>
  </Stack>
</Card>

// 快速布局使用 MUI spacing shorthand（1 = 8px）
<Stack direction="row" spacing={2} alignItems="center">
  {/* spacing={2} = 16px */}
</Stack>

// 响应式布局使用 Grid
<Grid container spacing={3}>
  <Grid item xs={12} md={6} lg={4}>
    <Card />
  </Grid>
</Grid>
```

### ❌ 错误做法

```tsx
// 使用任意 px 值
<Box sx={{ padding: '23px', margin: '17px', gap: '11px' }}>
  间距完全不规则
</Box>

// 混用数字和 px 字符串
<Stack spacing={2}>          // 16px
  <Box sx={{ p: '20px' }}>   // 20px — 为什么不是 16 或 24？
  </Box>
</Stack>

// 使用负边距修复布局
<Box sx={{ mt: '-8px', ml: '-4px' }}>
  负边距通常是布局设计有问题的信号
</Box>

// 硬编码像素间距
<div style={{ display: 'flex', gap: '15px' }}>
```

### 核心原则

| 规则 | 说明 |
|------|------|
| 语义层 | 组件内间距使用 `semanticTokens.space.card`、`form`、`list` 等 |
| 8px 网格 | MUI spacing 遵循 8px 基数（`p={2}` = 16px, `gap={3}` = 24px） |
| 页面级 | 使用 `semanticTokens.space.page.horizontal/vertical/sectionGap` |
| 禁止负边距 | 负边距是布局 hack，应通过正确的 Flexbox/Grid 实现 |

---

## 5. 排版 / Typography

### 为什么重要？

排版层级直接影响信息可读性和页面节奏。TOPEMS 在 `semanticTokens.text` 中定义了完整的排版层级（heading 1-6、body、caption 等），与设计令牌的字体族、字号、字重严格对应。使用预设排版组合可以保证视觉一致性，避免出现过多字号导致的页面杂乱。

### ✅ 正确做法

```tsx
import { Typography } from '@mui/material';
import { semanticTokens } from '@/theme/tokens';

// 使用语义令牌的排版组合
<Typography sx={semanticTokens.text.heading['1']}>页面主标题</Typography>
<Typography sx={semanticTokens.text.heading['3']}>卡片标题</Typography>
<Typography sx={semanticTokens.text.body.default}>正文内容</Typography>
<Typography sx={semanticTokens.text.body.secondary}>辅助描述</Typography>
<Typography sx={semanticTokens.text.caption}>标签文字</Typography>

// 使用 MUI Typography 的 variant prop
<Typography variant="h1">页面主标题</Typography>
<Typography variant="h6">小节标题</Typography>
<Typography variant="body1">正文</Typography>
<Typography variant="body2">次要正文</Typography>
<Typography variant="caption">标签</Typography>
```

### ❌ 错误做法

```tsx
// 硬编码字号和字重
<Typography sx={{ fontSize: '24px', fontWeight: 700, lineHeight: 1.3 }}>
  手动设置的标题
</Typography>

// 直接使用 HTML 标签
<h1 style={{ fontSize: '30px', fontWeight: 'bold' }}>页面标题</h1>
<h3 style={{ fontSize: '16px' }}>跳过了 h2</h3>

// 单个页面使用超过 3 种字号
<Typography sx={{ fontSize: '12px' }}>标签</Typography>
<Typography sx={{ fontSize: '14px' }}>正文</Typography>
<Typography sx={{ fontSize: '16px' }}>强调</Typography>
<Typography sx={{ fontSize: '18px' }}>副标题</Typography>
<Typography sx={{ fontSize: '20px' }}>卡片标题</Typography>
<Typography sx={{ fontSize: '24px' }}>区块标题</Typography>

// 硬编码字体族
<Box sx={{ fontFamily: '"Inter", "Noto Sans SC", sans-serif' }}>
```

### 核心原则

| 规则 | 说明 |
|------|------|
| 语义令牌 | 使用 `semanticTokens.text.heading['1']`~`['6']` |
| 正文层级 | `body.default`、`body.secondary`、`caption` 三级足够 |
| MUI Typography | 优先使用 `variant` prop，不直接使用 HTML h1-h6 |
| 字号克制 | 单个页面不超过 3 种字号 |
| 禁止硬编码 | 不在 sx 中直接设置 fontSize/fontWeight/fontFamily |

---

## 6. 交互状态 / Interactive States

### 为什么重要？

交互状态（hover、focus、active、disabled、loading）是用户体验的基础。MUI 组件已内置完整的交互状态处理，自定义组件也应遵循统一的模式。正确的交互反馈能让用户明确知道"当前可以做什么"，减少误操作和困惑。

### ✅ 正确做法

```tsx
import { Button, IconButton, Tooltip } from '@mui/material';
import { Trash2 } from 'lucide-react';
import { Button } from '@mui/material';
// Use: <Button loading>...</Button>

// MUI 内置的 hover/focus/active 状态 — 无需额外处理
<Button variant="contained" color="primary">
  保存
</Button>

// 使用 disabled 属性统一管理禁用态
<Button disabled={!isValid} onClick={handleSubmit}>
  提交
</Button>

// 使用 loading 属性处理异步操作
<Button
  loading={isSubmitting}
  variant="contained"
  onClick={handleSubmit}
>
  保存
</Button>

// 图标按钮提供 Tooltip
<Tooltip title="删除">
  <IconButton color="error" onClick={handleDelete}>
    <Trash2 />
  </IconButton>
</Tooltip>

// 自定义组件也应支持 disabled + loading
interface ActionCardProps {
  disabled?: boolean;
  loading?: boolean;
  onClick?: (id: string) => void;
}
```

### ❌ 错误做法

```tsx
// 用原始 CSS 创建自定义 hover 效果
<Box
  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
>
  悬停效果
</Box>

// 禁用了 hover 但未禁用点击
<Box sx={{ '&:hover': { backgroundColor: 'transparent' } }}
  onClick={handleClick} // 仍然可以点击！
>
  点击我
</Box>

// 忘记处理 focus 样式
<Button
  sx={{
    '&:focus': { outline: 'none' }, // 移除了 focus 样式！
  }}
>
  提交
</Button>

// 缺少 loading 状态反馈
<Button onClick={async () => {
  await saveData(); // 没有任何 loading 指示，用户不知道是否在处理
}}>
  保存
</Button>
```

### 核心原则

| 规则 | 说明 |
|------|------|
| MUI 内置 | hover/focus/active 由 MUI 组件自动处理，不手动实现 |
| disabled 一致 | 所有可交互组件提供 `disabled` prop |
| loading 反馈 | 异步操作提供 `loading` 状态（LoadingButton 或 LoadingSpinner） |
| 完整反馈 | 任何可点击元素都必须有 hover 和 focus 的视觉反馈 |
| 同步禁用 | 禁用视觉样式和点击行为必须同步 |

---

## 7. 暗色模式 / Dark Mode

### 为什么重要？

TOPEMS 支持亮色和暗色两种主题模式。暗色模式不是简单的颜色反转，而是需要重新调整对比度、阴影和半透明效果。使用 palette 引用和语义令牌可以让组件自动适配两种模式，而硬编码的值往往只在一种模式下正确。

### ✅ 正确做法

```tsx
import { alpha, useTheme } from '@mui/material/styles';
import { semanticTokens } from '@/theme/tokens';

// 使用 palette 引用 — 自动适配亮色/暗色
function StatusCard() {
  const theme = useTheme();

  return (
    <Box sx={{
      backgroundColor: theme.palette.background.paper,  // 亮色:#fff / 暗色:#1e293b
      color: theme.palette.text.primary,                  // 自动适配
      borderColor: theme.palette.divider,                // 自动适配
    }}>
      <Typography>内容</Typography>
    </Box>
  );
}

// 使用 alpha() 处理半透明效果
<Box sx={{
  backgroundColor: alpha(theme.palette.primary.main, 0.1),
  // 亮色模式：蓝色 10% 透明度
  // 暗色模式：同样逻辑，但基于暗色主色
}}>
  高亮区域
</Box>

// 语义令牌引用主题感知值
<Box sx={{
  background: semanticTokens.background.card,
  border: semanticTokens.border.default,
}}>
  卡片内容
</Box>
```

### ❌ 错误做法

```tsx
// 硬编码只在亮色模式下正确的颜色
<Box sx={{ backgroundColor: '#ffffff', color: '#1e293b' }}>
  暗色模式下变成白底深色字，可能与暗色背景产生割裂感
</Box>

// 直接使用 white / black
<Typography sx={{ color: 'white' }}>     // 暗色模式下看不见
  标题文字
</Typography>
<Box sx={{ backgroundColor: 'black' }}>  // 亮色模式下太突兀
  侧边栏
</Box>

// 忽略暗色模式下的对比度检查
<Typography sx={{ color: '#94a3b8' }}>
  暗色模式下 #94a3b8 在深色背景上对比度不足
</Typography>

// 硬编码阴影（暗色模式需要不同阴影策略）
<Box sx={{ boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }}>
  // 暗色模式下阴影几乎不可见
</Box>
```

### 核心原则

| 规则 | 说明 |
|------|------|
| Palette 引用 | `theme.palette.xxx` 自动适配两种模式 |
| 语义令牌 | `semanticTokens` 引用的值是主题感知的 |
| 禁止 white/black | 使用 `palette.text.primary` 和 `palette.background.paper` |
| alpha() 工具 | 半透明效果使用 MUI 的 `alpha()` 函数 |
| 暗色对比度 | 暗色模式需要 **更高** 对比度，不是更低；务必检查 |

---

## 8. 无障碍 / Accessibility

### 为什么重要？

无障碍（Accessibility / a11y）不是可选项，而是产品质量的基本要求。TOPEMS 的目标用户包括使用键盘导航、屏幕阅读器和辅助技术的用户。MUI 组件内置了 ARIA 支持，我们需要在此基础上正确使用语义化 HTML、关联标签，并确保键盘导航的完整性。

### ✅ 正确做法

```tsx
import { Button, IconButton, Tooltip, TextField, InputLabel } from '@mui/material';
import { Trash2 } from 'lucide-react';
import { SkipToContent } from '@/components/layout/GlobalLayout';

// 使用语义化 HTML — Button 而非 div
<Button variant="contained" onClick={handleSubmit}>
  提交表单
</Button>

// 图标按钮必须添加 aria-label
<Tooltip title="删除记录">
  <IconButton
    aria-label="删除记录"
    color="error"
    onClick={handleDelete}
  >
    <Trash2 />
  </IconButton>
</Tooltip>

// 标签与输入框关联
<InputLabel htmlFor="employee-name">员工姓名</InputLabel>
<TextField id="employee-name" label="员工姓名" />

// 使用 SkipToContent（已在 GlobalLayout 中集成）
// 键盘用户可以直接跳过导航栏到主内容区

// 确保键盘导航完整
// Tab — 移动焦点到下一个可交互元素
// Enter / Space — 激活按钮/链接
// Escape — 关闭弹窗/下拉
```

### ❌ 错误做法

```tsx
// 用 div onClick 模拟按钮 — 缺少键盘支持和无障碍属性
<div onClick={handleClick} style={{ cursor: 'pointer' }}>
  点击我
</div>

// 虽然添加了 role 和 tabIndex，但仍不如使用语义化组件
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter') handleClick();
  }}
>
  手动实现的按钮
</div>
// 正确做法：<Button onClick={handleClick}>点击我</Button>

// 仅靠颜色区分状态
<span style={{ color: 'red' }}>必填</span>
// 正确做法：<span style={{ color: 'red' }} aria-label="必填字段">*</span>

// 跳过标题层级
<h1>页面标题</h1>
<h3>卡片标题</h3>  // 缺少 h2！屏幕阅读器用户会困惑

// 自动播放动画且不尊重 prefers-reduced-motion
<Box sx={{
  '@keyframes': { spin: { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } } },
  animation: 'spin 1s linear infinite',
}}>
  旋转动画
</Box>
// 应添加：@media (prefers-reduced-motion: reduce) { animation: none; }
```

### 核心原则

| 规则 | 说明 |
|------|------|
| 语义化 HTML | `<button>` 用于操作，`<a>` 用于导航，`<input>` 用于数据输入 |
| aria-label | 所有纯图标按钮必须添加 `aria-label` |
| 标签关联 | `<label htmlFor>` + `<input id>` 成对使用 |
| 键盘导航 | Tab / Enter / Space / Escape 必须全部可用 |
| heading 层级 | 不跳级（h1 > h2 > h3），GlobalLayout 中已有 SkipToContent |
| 减弱动画 | 尊重 `prefers-reduced-motion` 媒体查询 |

---

## 快速检查清单 / Quick Checklist

开发完一个新组件后，请逐项检查：

- [ ] 是否使用了 `semanticTokens` 而非硬编码颜色/间距？
- [ ] 组件是否提供了 `sx?: SxProps<Theme>` prop？
- [ ] 可交互组件是否提供了 `disabled` 和 `loading` prop？
- [ ] 是否使用了 `ComponentSize`（`'sm' | 'md' | 'lg'`）而非自定义尺寸？
- [ ] 颜色是否通过 `palette` 或 `semanticTokens` 引用？
- [ ] 是否有颜色 + 图标/文字的双重编码？
- [ ] 是否在亮色和暗色模式下都进行了视觉验证？
- [ ] 是否使用了语义化 HTML（Button 而非 div onClick）？
- [ ] 图标按钮是否添加了 `aria-label`？
- [ ] 是否尊重了 `prefers-reduced-motion`？
- [ ] 是否遵循了 8px 间距网格？
- [ ] 排版是否使用了语义令牌的预设组合？

---

> 如有疑问，请参考以下文档：
> - [设计令牌指南](./design-tokens-guide.md)
> - [颜色使用指南](./color-usage-guide.md)
> - [组件 API 参考](./component-api-reference.md)
