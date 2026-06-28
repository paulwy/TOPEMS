# TOPEMS 主题定制指南 / Theming Customization Guide

> 本指南详细介绍 TOPEMS 项目的主题系统架构、Token 层级、颜色定制、模块主题、暗色模式以及最佳实践。适用于前端开发者、设计师以及需要扩展或自定义主题系统的团队成员。

---

## 目录

1. [主题架构概览 / Theme Architecture Overview](#1-主题架构概览--theme-architecture-overview)
2. [Token 层级说明 / Token Layers Explained](#2-token-层级说明--token-layers-explained)
3. [自定义颜色 / Customizing Colors](#3-自定义颜色--customizing-colors)
4. [模块主题 / Module Themes](#4-模块主题--module-themes)
5. [暗色模式 / Dark Mode](#5-暗色模式--dark-mode)
6. [创建完整自定义主题 / Creating a Complete Custom Theme](#6-创建完整自定义主题--creating-a-complete-custom-theme)
7. [在组件中使用 Token / Using Tokens in Components](#7-在组件中使用-token--using-tokens-in-components)
8. [CSS 变量导出 / CSS Variables Export](#8-css-变量导出--css-variables-export)
9. [最佳实践 / Best Practices](#9-最佳实践--best-practices)

---

## 1. 主题架构概览 / Theme Architecture Overview

TOPEMS 主题系统采用 **三层 Token 架构**，从原始设计值到语义化命名，再到组件级别覆盖，逐层构建出一套可维护、可扩展的主题体系。

### 架构图

```
┌─────────────────────────────────────────────────────┐
│              Component Layer (组件层)                │
│         theme.ts — MUI 组件覆盖 (overrides)           │
├─────────────────────────────────────────────────────┤
│           Semantic Layer (语义层)                     │
│       semanticTokens — 按用途命名的 Token             │
├─────────────────────────────────────────────────────┤
│             Base Layer (基础层)                        │
│       designTokens — 原始设计值                       │
└─────────────────────────────────────────────────────┘
```

### 核心文件说明

| 文件 | 职责 |
|------|------|
| `tokens.ts` | 定义 `designTokens`（基础层）和 `semanticTokens`（语义层） |
| `theme.ts` | 通过 `createCustomTheme(mode)` 将 Token 转化为 MUI 主题对象 |
| `moduleThemes.ts` | 定义 25 个模块各自的专属颜色主题 |
| `gradients.ts` | 基于模块主题生成渐变色方案 |
| `App.tsx` | 通过 `<ThemeProvider>` 将主题注入到整个应用 |

### 主题注入流程

```tsx
// App.tsx 中的主题注入
import { createCustomTheme } from './theme';
import { ThemeProvider } from '@mui/material/styles';

function App() {
  const [mode, setMode] = useState<'light' | 'dark'>('light');

  const theme = useMemo(() => createCustomTheme(mode), [mode]);

  return (
    <ThemeProvider theme={theme}>
      {/* 应用内容 */}
    </ThemeProvider>
  );
}
```

切换暗色模式只需改变 `mode` 参数：

```tsx
const toggleDarkMode = () => {
  setMode(prev => prev === 'light' ? 'dark' : 'light');
  localStorage.setItem('theme-mode', mode === 'light' ? 'dark' : 'light');
};
```

---

## 2. Token 层级说明 / Token Layers Explained

### Base Tokens (基础层 / designTokens)

基础层包含所有原始设计值——颜色、间距、阴影、字体、动效等。它们是整个主题系统的"原子"，不包含任何语义信息。

```ts
// tokens.ts — designTokens 片段
export const designTokens = {
  colors: {
    primary: {
      50:  '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
      main: '#3b82f6',
    },
    // ...更多颜色
  },
  shadows: {
    sm:  '0 1px 2px rgba(0,0,0,0.05)',
    md:  '0 4px 6px rgba(0,0,0,0.07)',
    lg:  '0 10px 15px rgba(0,0,0,0.1)',
    xl:  '0 20px 25px rgba(0,0,0,0.12)',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  radius: {
    sm: 6,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  typography: {
    fontFamily: "'Inter', 'Noto Sans SC', sans-serif",
    h1: { fontSize: '2.25rem', fontWeight: 800 },
    h2: { fontSize: '1.875rem', fontWeight: 700 },
    body: { fontSize: '1rem', fontWeight: 400 },
  },
  motion: {
    durationFast: '150ms',
    durationNormal: '250ms',
    durationSlow: '350ms',
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
};
```

**修改基础 Token 的场景**：当你需要改变设计的"根"值时，比如品牌色从蓝色换为绿色、间距体系从 8px 基准换为 4px 基准。

### Semantic Tokens (语义层 / semanticTokens)

语义层通过有意义的名称将基础 Token 映射到具体 UI 场景。组件层只引用语义 Token，不直接使用基础 Token。

```ts
// tokens.ts — semanticTokens 片段
export const semanticTokens = {
  background: {
    default: designTokens.colors.neutral[50],    // 页面背景
    card:     designTokens.colors.neutral.white,  // 卡片背景
    elevated: designTokens.colors.neutral.white,  // 浮层背景
    sunken:   designTokens.colors.neutral[100],   // 凹陷区域背景
    brandGradient: `linear-gradient(135deg, ${designTokens.colors.primary.main}, ${designTokens.colors.secondary.main})`,
  },
  elevation: {
    card:    designTokens.shadows.sm,
    modal:   designTokens.shadows.lg,
    popover: designTokens.shadows.md,
    tooltip: designTokens.shadows.md,
  },
  radius: {
    card:    `${designTokens.radius.md}px`,
    button:  `${designTokens.radius.md}px`,
    input:   `${designTokens.radius.sm}px`,
    modal:   `${designTokens.radius.lg}px`,
    chip:    `${designTokens.radius.full}px`,
  },
  border: {
    card:    `1px solid ${designTokens.colors.neutral[200]}`,
    input:   `1px solid ${designTokens.colors.neutral[300]}`,
    divider: `1px solid ${designTokens.colors.neutral[100]}`,
  },
  text: {
    primary:   designTokens.colors.neutral[900],
    secondary: designTokens.colors.neutral[500],
    disabled:  designTokens.colors.neutral[400],
    onBrand:   '#ffffff',
  },
  state: {
    error:     designTokens.colors.error[500],
    success:   designTokens.colors.success[500],
    warning:   designTokens.colors.warning[500],
    info:      designTokens.colors.info[500],
  },
};
```

**核心优势**：修改一处语义映射即可影响所有引用该语义的组件。例如，把所有卡片的阴影从 `sm` 改为 `md`，只需修改 `semanticTokens.elevation.card`。

### Component Layer (组件层 / theme.ts)

组件层使用 MUI 的 `components.overrides` 将语义 Token 应用到具体组件上。

```ts
// theme.ts — MUI 组件覆盖片段
export function createCustomTheme(mode: 'light' | 'dark') {
  return createTheme({
    palette: { mode },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: semanticTokens.radius.card,
            boxShadow: semanticTokens.elevation.card,
            border: semanticTokens.border.card,
            background: semanticTokens.background.card,
            transition: `box-shadow ${designTokens.motion.durationNormal} ${designTokens.motion.easing}`,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: semanticTokens.radius.button,
            fontWeight: 600,
            textTransform: 'none',
          },
          containedPrimary: {
            background: designTokens.colors.primary.main,
            boxShadow: `0 2px 4px ${designTokens.colors.primary[500]}40`,
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: semanticTokens.radius.input,
            },
          },
        },
      },
    },
  });
}
```

---

## 3. 自定义颜色 / Customizing Colors

### 更换主色调（Primary Color）

假设需要将品牌主色从蓝色替换为翡翠绿（Emerald Green）：

```ts
// 步骤 1: 在 tokens.ts 中修改 designTokens.colors.primary
export const designTokens = {
  colors: {
    primary: {
      50:  '#ecfdf5',
      100: '#d1fae5',
      200: '#a7f3d0',
      300: '#6ee7b7',
      400: '#34d399',
      500: '#10b981',  // emerald-500 — 新主色
      600: '#059669',
      700: '#047857',
      800: '#065f46',
      900: '#064e3b',
      main: '#10b981',  // ← 更新 main
    },
    // ...
  },
};
```

> **注意**：如果语义层中硬编码了颜色值而非引用 `designTokens`，也需要同步更新。推荐始终通过 Token 引用来避免硬编码。

### 添加全新的语义颜色

```ts
// 在 semanticTokens 中添加新语义
export const semanticTokens = {
  // ...已有 Token
  background: {
    // ...已有映射
    // 新增：品牌渐变背景
    brandGradient: `linear-gradient(135deg, ${designTokens.colors.primary.main}, ${designTokens.colors.secondary.main})`,
    // 新增：深色卡片背景（用于暗色模式强调区域）
    cardEmphasis: designTokens.colors.primary[50],
  },
  // 新增：状态指示相关语义
  indicator: {
    online:  designTokens.colors.success[500],
    offline: designTokens.colors.neutral[400],
    busy:    designTokens.colors.warning[500],
    error:   designTokens.colors.error[500],
  },
};
```

在组件中使用新语义 Token：

```tsx
const StatusBadge = ({ status }: { status: 'online' | 'offline' | 'busy' }) => (
  <Box
    sx={{
      width: 10,
      height: 10,
      borderRadius: '50%',
      backgroundColor: semanticTokens.indicator[status],
    }}
  />
);
```

### 使用 Tailwind/工具生成色阶

推荐使用 [Tailwind CSS 色阶生成器](https://www.tailwindshades.com/) 或 [UIColors.app](https://uicolors.app/) 来生成完整的 50-900 色阶，确保色阶过渡平滑自然。

---

## 4. 模块主题 / Module Themes

TOPEMS 系统包含 25 个业务模块，每个模块拥有独立的颜色标识。模块主题定义在 `moduleThemes.ts` 中。

### 模块主题结构

```ts
// moduleThemes.ts
export const moduleThemes = {
  dashboard: {
    name: '仪表盘',
    main:        '#6366f1',  // indigo — 模块主色
    light:       '#e0e7ff',  // 浅色变体
    dark:        '#4338ca',  // 深色变体
    contrastText: '#ffffff', // 主色上的文字颜色
  },
  production: {
    name: '生产管理',
    main:        '#f59e0b',  // amber
    light:       '#fef3c7',
    dark:        '#d97706',
    contrastText: '#ffffff',
  },
  quality: {
    name: '质量管理',
    main:        '#10b981',  // emerald
    light:       '#d1fae5',
    dark:        '#059669',
    contrastText: '#ffffff',
  },
  equipment: {
    name: '设备管理',
    main:        '#8b5cf6',  // violet
    light:       '#ede9fe',
    dark:        '#7c3aed',
    contrastText: '#ffffff',
  },
  // ...共 25 个模块
};
```

### 模块渐变色（gradients.ts）

每个模块的主题色可生成渐变，用于页面顶部 Banner、侧边栏高亮等场景：

```ts
// gradients.ts
export function getModuleGradient(moduleKey: keyof typeof moduleThemes) {
  const theme = moduleThemes[moduleKey];
  return {
    primary: `linear-gradient(135deg, ${theme.main}, ${theme.dark})`,
    light:   `linear-gradient(135deg, ${theme.light}, ${theme.main}20)`,
    subtle:  `linear-gradient(180deg, ${theme.main}08, transparent)`,
  };
}
```

在组件中使用：

```tsx
function ModuleHeader({ moduleKey }: { moduleKey: string }) {
  const gradient = getModuleGradient(moduleKey);
  return (
    <Box
      sx={{
        background: gradient.primary,
        color: moduleThemes[moduleKey].contrastText,
        py: 3,
        px: 4,
        borderRadius: semanticTokens.radius.card,
      }}
    >
      <Typography variant="h5">{moduleThemes[moduleKey].name}</Typography>
    </Box>
  );
}
```

### 添加新模块主题

```ts
// 在 moduleThemes.ts 中添加新条目
export const moduleThemes = {
  // ...已有模块
  newModule: {
    name: '新模块',
    main:        '#ec4899',  // pink — 选择一个未使用的颜色
    light:       '#fce7f3',
    dark:        '#db2777',
    contrastText: '#ffffff',
  },
};

// 如果需要渐变效果，gradients.ts 中的 getModuleGradient 会自动支持新模块
```

> **色彩选择建议**：25 个模块的色彩应避免相邻色过于接近。推荐使用 HSL 色环均匀分布，明度和饱和度保持一致。

---

## 5. 暗色模式 / Dark Mode

### 切换机制

暗色模式通过 `localStorage` 持久化用户偏好：

```ts
// 获取当前模式
const getStoredMode = (): 'light' | 'dark' => {
  const stored = localStorage.getItem('theme-mode');
  return (stored === 'dark' ? 'dark' : 'light');
};

// 切换并保存
const toggleThemeMode = () => {
  const newMode = getStoredMode() === 'light' ? 'dark' : 'light';
  localStorage.setItem('theme-mode', newMode);
  // 触发 React 重渲染或页面刷新
};
```

### 暗色模式的 Token 调整

`createCustomTheme('dark')` 会自动调整以下内容：

```ts
export function createCustomTheme(mode: 'light' | 'dark') {
  const isDark = mode === 'dark';

  // 暗色模式下的基础 Token 覆盖
  const darkOverrides = isDark
    ? {
        background: {
          default:  designTokens.colors.neutral[900],
          card:     designTokens.colors.neutral[800],
          elevated: designTokens.colors.neutral[800],
          sunken:   designTokens.colors.neutral[950],
        },
        elevation: {
          // 暗色模式下阴影需要更柔和
          card:    '0 1px 3px rgba(0,0,0,0.3)',
          modal:   '0 10px 25px rgba(0,0,0,0.5)',
          popover: '0 4px 10px rgba(0,0,0,0.4)',
        },
        border: {
          card:    `1px solid ${designTokens.colors.neutral[700]}`,
          input:   `1px solid ${designTokens.colors.neutral[600]}`,
          divider: `1px solid ${designTokens.colors.neutral[700]}`,
        },
        text: {
          primary:   designTokens.colors.neutral[100],
          secondary: designTokens.colors.neutral[400],
          disabled:  designTokens.colors.neutral[600],
          onBrand:   '#ffffff',
        },
      }
    : {};

  // 合并语义 Token
  const resolvedSemantic = merge(semanticTokens, darkOverrides);

  return createTheme({
    palette: {
      mode,
      // ... 将 resolvedSemantic 映射到 MUI palette
    },
    components: {
      // ...
    },
  });
}
```

### TableHeader 暗色模式修复

MUI 的 TableHead 组件在暗色模式下需要特殊处理：

```ts
// theme.ts 中的暗色模式修复
MuiTableHead: {
  styleOverrides: {
    root: isDark
      ? {
          background: designTokens.colors.neutral[800],
          '& .MuiTableCell-head': {
            color: designTokens.colors.neutral[300],
            borderBottom: `1px solid ${designTokens.colors.neutral[700]}`,
          },
        }
      : {
          background: designTokens.colors.neutral[50],
          '& .MuiTableCell-head': {
            color: designTokens.colors.neutral[700],
            borderBottom: `1px solid ${designTokens.colors.neutral[200]}`,
          },
        },
  },
},
```

### 暗色模式测试清单

- [ ] 所有页面在暗色模式下可正常阅读
- [ ] 卡片边框和阴影在暗色背景上清晰可见
- [ ] 主色调按钮和链接保持足够对比度（WCAG AA 标准: >= 4.5:1）
- [ ] 表格、表单、对话框等复杂组件表现正确
- [ ] 模块主题色在暗色背景下正常显示
- [ ] 图标和 SVG 在暗色模式下没有丢失或反转

---

## 6. 创建完整自定义主题 / Creating a Complete Custom Theme

如果需要为特定客户或场景创建一套完全独立的主题（而非修改默认主题），按照以下步骤操作：

### 步骤 1: 复制基础 Token

```bash
cp src/theme/tokens.ts src/theme/tokens.custom.ts
```

### 步骤 2: 修改基础值

```ts
// tokens.custom.ts
export const customDesignTokens = {
  colors: {
    primary: {
      50:  '#fdf4ff',
      100: '#fae8ff',
      200: '#f5d0fe',
      300: '#f0abfc',
      400: '#e879f9',
      500: '#d946ef',  // fuchsia-500 — 自定义品牌色
      600: '#c026d3',
      700: '#a21caf',
      800: '#86198f',
      900: '#701a75',
      main: '#d946ef',
    },
    secondary: {
      // ...
    },
    // ...
  },
  // 可调整间距、圆角、阴影等
  radius: {
    sm: 4,   // 比默认更小
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
};
```

### 步骤 3: 更新语义映射

```ts
// tokens.custom.ts
export const customSemanticTokens = {
  background: {
    default:  customDesignTokens.colors.neutral[50],
    card:     customDesignTokens.colors.neutral.white,
    // ...
  },
  // ...
};
```

### 步骤 4: 构建主题

```ts
// theme.custom.ts
import { createTheme } from '@mui/material/styles';
import { customDesignTokens, customSemanticTokens } from './tokens.custom';

export function createCustomBrandedTheme(mode: 'light' | 'dark') {
  const isDark = mode === 'dark';
  // ... 与 createCustomTheme 类似的逻辑，但使用 custom* Token
  return createTheme({ /* ... */ });
}
```

### 步骤 5: 在应用中切换

```tsx
// App.tsx
import { createCustomBrandedTheme } from './theme.custom';

function App() {
  const themeVariant = useThemeVariant(); // 'default' | 'custom'
  const mode = useThemeMode();            // 'light' | 'dark'

  const theme = useMemo(() => {
    return themeVariant === 'custom'
      ? createCustomBrandedTheme(mode)
      : createCustomTheme(mode);
  }, [themeVariant, mode]);

  return (
    <ThemeProvider theme={theme}>
      {/* ... */}
    </ThemeProvider>
  );
}
```

---

## 7. 在组件中使用 Token / Using Tokens in Components

### 方式一: 在 `sx` prop 中引用语义 Token

```tsx
import { semanticTokens } from '@/theme/tokens';

function DashboardCard({ title, children }) {
  return (
    <Box
      sx={{
        background: semanticTokens.background.card,
        boxShadow: semanticTokens.elevation.card,
        borderRadius: semanticTokens.radius.card,
        border: semanticTokens.border.card,
        p: 3, // MUI spacing — 24px
        transition: `all ${designTokens.motion.durationNormal} ${designTokens.motion.easing}`,
        '&:hover': {
          boxShadow: semanticTokens.elevation.modal, // 悬浮提升
        },
      }}
    >
      <Typography variant="h6" sx={{ color: semanticTokens.text.primary, mb: 1 }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}
```

### 方式二: 在自定义 MUI 组件覆盖中使用

```ts
// theme.ts 中的组件覆盖
MuiButton: {
  styleOverrides: {
    root: {
      borderRadius: semanticTokens.radius.button,
      fontWeight: 600,
      textTransform: 'none' as const,
      transition: `all ${designTokens.motion.durationFast} ${designTokens.motion.easing}`,
    },
    contained: {
      boxShadow: semanticTokens.elevation.card,
      '&:hover': {
        boxShadow: semanticTokens.elevation.popover,
      },
    },
    outlined: {
      borderColor: semanticTokens.border.input,
    },
  },
},

MuiPaper: {
  styleOverrides: {
    root: {
      backgroundImage: 'none', // 消除 MUI 默认渐变
      borderRadius: semanticTokens.radius.card,
      border: semanticTokens.border.card,
    },
    elevation1: {
      boxShadow: semanticTokens.elevation.card,
    },
  },
},

MuiChip: {
  styleOverrides: {
    root: {
      borderRadius: semanticTokens.radius.chip,
      fontWeight: 500,
    },
    colorPrimary: {
      backgroundColor: designTokens.colors.primary[100],
      color: designTokens.colors.primary[800],
    },
  },
},
```

### 方式三: 通过 `useTheme` 访问 MUI 主题值

```tsx
import { useTheme } from '@mui/material/styles';

function ThemedComponent() {
  const theme = useTheme();

  return (
    <Box
      sx={{
        color: theme.palette.text.primary,
        background: theme.palette.background.paper,
        borderColor: theme.palette.divider,
      }}
    />
  );
}
```

> **推荐**：优先使用语义 Token（方式一、二），它们在暗色模式下自动适配。`useTheme` 获取的是 MUI palette 值，仅在需要 MUI 内置值时使用。

### Token 使用决策树

```
需要设置样式值
├─ 是 MUI 组件覆盖？ → 在 theme.ts 中使用语义 Token
├─ 是页面级布局？ → 在 sx 中使用语义 Token 或 MUI spacing
├─ 是组件内细节？ → 在 sx 中使用语义 Token
└─ 是动效/变换？ → 使用 designTokens.motion
```

---

## 8. CSS 变量导出 / CSS Variables Export

TOPEMS 的 `@topems/tokens` 包可将 Token 导出为 CSS 自定义属性，供非 React 环境使用（如邮件模板、嵌入式 iframe、第三方集成等）。

### 导出格式

```css
/* tokens.css — 由 @topems/tokens 自动生成 */
:root {
  /* 颜色 */
  --t-color-primary-500: #3b82f6;
  --t-color-primary-main: #3b82f6;
  --t-color-secondary-main: #8b5cf6;
  --t-color-error-500: #ef4444;
  --t-color-success-500: #10b981;

  /* 语义背景 */
  --t-bg-default: #f9fafb;
  --t-bg-card: #ffffff;
  --t-bg-elevated: #ffffff;

  /* 语义阴影 */
  --t-elevation-card: 0 1px 2px rgba(0,0,0,0.05);
  --t-elevation-modal: 0 10px 15px rgba(0,0,0,0.1);

  /* 语义圆角 */
  --t-radius-card: 12px;
  --t-radius-button: 12px;
  --t-radius-input: 6px;

  /* 间距 */
  --t-spacing-xs: 4px;
  --t-spacing-sm: 8px;
  --t-spacing-md: 16px;
  --t-spacing-lg: 24px;
  --t-spacing-xl: 32px;

  /* 动效 */
  --t-motion-duration-fast: 150ms;
  --t-motion-duration-normal: 250ms;
  --t-motion-easing: cubic-bezier(0.4, 0, 0.2, 1);
}

/* 暗色模式 */
[data-theme="dark"] {
  --t-bg-default: #111827;
  --t-bg-card: #1f2937;
  --t-bg-elevated: #1f2937;
  --t-elevation-card: 0 1px 3px rgba(0,0,0,0.3);
  /* ... */
}
```

### 在非 React 环境中使用

```html
<!-- 邮件模板示例 -->
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="https://cdn.example.com/topems/tokens.css">
</head>
<body>
  <div style="
    background: var(--t-bg-card);
    border: 1px solid var(--t-color-neutral-200);
    border-radius: var(--t-radius-card);
    box-shadow: var(--t-elevation-card);
    padding: var(--t-spacing-lg);
  ">
    <h2 style="color: var(--t-color-primary-main);">通知标题</h2>
    <p style="color: var(--t-text-secondary);">通知内容</p>
  </div>
</body>
</html>
```

### 在 React 项目中引入

```ts
// 在入口文件中引入（确保在组件渲染前加载）
import '@topems/tokens/css';
```

> **注意**：CSS 变量是静态导出，不会随 `mode` 参数动态切换。暗色模式需通过 `[data-theme="dark"]` 选择器或手动切换 `document.documentElement.dataset.theme`。

---

## 9. 最佳实践 / Best Practices

### 1. 始终优先使用语义 Token

```tsx
// 推荐
<Box sx={{ background: semanticTokens.background.card }} />

// 不推荐 — 直接引用基础 Token
<Box sx={{ background: designTokens.colors.neutral.white }} />

// 禁止 — 硬编码颜色值
<Box sx={{ background: '#ffffff' }} />
```

### 2. 新增 UI 模式时，先添加语义 Token

当你引入一种新的 UI 模式（如"悬浮通知栏"）时，按以下顺序操作：

1. 在 `designTokens` 中添加原始值（如果没有已有的基础值可用）
2. 在 `semanticTokens` 中添加语义映射
3. 在组件或 `theme.ts` 中引用语义 Token

```ts
// 步骤 1: 基础值可能已存在，跳过

// 步骤 2: 添加语义
export const semanticTokens = {
  // ...
  notification: {
    background: designTokens.colors.info[50],
    border:     `1px solid ${designTokens.colors.info[200]}`,
    text:       designTokens.colors.info[900],
    icon:       designTokens.colors.info[600],
  },
};

// 步骤 3: 使用
<Box sx={{
  background: semanticTokens.notification.background,
  border: semanticTokens.notification.border,
  color: semanticTokens.notification.text,
}} />
```

### 3. 暗色模式必须手动测试

`createCustomTheme('dark')` 只能自动处理已知的语义 Token。如果你的组件中存在以下情况，需要手动检查：

- 新增的语义 Token 缺少暗色模式覆盖
- 组件直接使用了 `designTokens` 中的颜色值
- SVG 图标使用了硬编码填充色
- 外部图片或第三方组件不受主题控制

### 4. 模块色彩保持 50-900 色阶一致

每个模块主题都应包含 `main`、`light`、`dark`、`contrastText` 四个属性，并建议同时维护 50-900 完整色阶（供 hover、active、disabled 等状态使用）：

```ts
production: {
  name: '生产管理',
  50:  '#fffbeb',
  100: '#fef3c7',
  200: '#fde68a',
  300: '#fcd34d',
  400: '#fbbf24',
  500: '#f59e0b',  // main
  600: '#d97706',  // dark
  700: '#b45309',
  800: '#92400e',
  900: '#78350f',
  main:        '#f59e0b',
  light:       '#fef3c7',
  dark:        '#d97706',
  contrastText: '#ffffff',
},
```

### 5. 间距使用规范

- **组件内部间距**：使用 MUI `sx` 的数字简写（基于 MUI 的 spacing 单位，默认 8px）
  ```tsx
  <Box sx={{ p: 2, gap: 1, m: 1 }}>  // 16px, 8px, 8px
  ```
- **页面级布局间距**：使用语义 Token
  ```tsx
  <Box sx={{ padding: designTokens.spacing.xl }}>  // 32px，语义明确
  ```
- **避免混用**：同一组件内不要同时使用两种间距体系。

### 6. Token 命名规范

| 层级 | 命名模式 | 示例 |
|------|---------|------|
| Base — 颜色 | `{family}.{shade}` | `primary.500`, `neutral[100]` |
| Base — 通用 | `{category}.{variant}` | `shadows.sm`, `radius.md`, `motion.easing` |
| Semantic — 背景级 | `background.{scenario}` | `background.card`, `background.sunken` |
| Semantic — 视觉级 | `{visual}.{scenario}` | `elevation.card`, `border.input` |
| Semantic — 文本级 | `text.{role}` | `text.primary`, `text.secondary` |
| Semantic — 状态级 | `state.{type}` | `state.error`, `state.success` |

### 7. 版本兼容性

修改基础 Token 时注意以下兼容性原则：

- **新增 Token**：无兼容性风险，可直接添加
- **删除 Token**：先全局搜索引用，确保无遗漏后再删除
- **修改 Token 值**：修改色阶或间距后，需全面测试所有引用该 Token 的组件
- **发布流程**：Token 变更应在 CHANGELOG 中标注，并通知相关团队

---

> 如有任何关于主题系统的问题或建议，请联系前端架构组。
