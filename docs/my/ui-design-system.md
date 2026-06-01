# POMP 企业管理系统 - UI 设计系统

> 版本: 2.0.0
> 更新日期: 2026-05-20
> 状态: 🟢 正式版 - 持续迭代中

---

## 📋 目录

1. [设计理念](#1-设计理念)
2. [配色系统](#2-配色系统)
3. [字体系统](#3-字体系统)
4. [间距系统](#4-间距系统)
5. [圆角与阴影](#5-圆角与阴影)
6. [动画系统](#6-动画系统)
7. [组件规范](#7-组件规范)
8. [图表规范](#8-图表规范)
9. [页面模板](#9-页面模板)
10. [交互模式](#10-交互模式)
11. [响应式设计](#11-响应式设计)
12. [无障碍设计](#12-无障碍设计)
13. [设计令牌](#13-设计令牌)

---

## 1. 设计理念

### 1.1 品牌核心价值

```text
精准高效 | 专业可靠 | 智慧洞察 | 现代美学
```

### 1.2 设计原则

| 原则 | 说明 | 独特性体现 |
|------|------|-----------|
| **精准性** | 数据呈现清晰无误 | 精密的数据可视化，多层次信息架构 |
| **层次感** | 通过视觉层级引导用户 | 动态阴影、渐变层次、微动画反馈 |
| **智能感** | AI辅助的智能化体验 | 智能搜索、自动填充、预测建议 |
| **现代感** | 简洁而不简单 | 玻璃拟态、流畅动画、精致细节 |
| **个性表达** | 在专业中注入个性 | 渐变色彩、独特图标、动态交互 |

### 1.3 设计风格定位

```text
┌──────────────────────────────────────────────────────┐
│              POMP Design Philosophy                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │   Modern    │  │   Intelligent│  │   Elegant   │ │
│  │   Clean     │  │   Adaptive   │  │   Dynamic   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘ │
└──────────────────────────────────────────────────────┘
```

### 1.4 设计隐喻

> **"数据是企业的血液，界面是血管系统"**
>
> - 流畅的数据流动 = 高效的业务运转
> - 清晰的视觉层级 = 顺畅的决策路径
> - 智能的交互体验 = 智能的业务辅助

---

## 2. 配色系统

### 2.1 主色调体系

基于 **科技蓝** 为主色调，搭配 **活力橙** 作为强调色，形成专业而不失活力的配色方案。

```css
:root {
  /* ============ 主色调 ============ */
  --primary: 210 82% 56%;           /* #1E88E5 - 科技蓝 */
  --primary-light: 210 82% 65%;      /* #42A5F5 */
  --primary-dark: 210 82% 45%;       /* #1565C0 */
  
  /* ============ 强调色 ============ */
  --accent: 25 97% 53%;             /* #FF9800 - 活力橙 */
  --accent-light: 25 97% 62%;        /* #FFAB40 */
  --accent-dark: 25 97% 43%;         /* #F57C00 */
  
  /* ============ 功能色 ============ */
  --success: 145 63% 42%;           /* #2E7D32 - 森林绿 */
  --success-light: 145 63% 52%;      /* #43A047 */
  
  --warning: 45 97% 50%;            /* #FFC107 - 琥珀金 */
  --warning-light: 45 97% 60%;       /* #FFCA28 */
  
  --danger: 0 84% 60%;              /* #EF4444 - 警示红 */
  --danger-light: 0 84% 70%;         /* #F87171 */
  
  --info: 200 89% 48%;              /* #03A9F4 - 天空蓝 */
  --info-light: 200 89% 58%;         /* #29B6F6 */
}
```

### 2.2 中性色阶

采用 **温暖灰色** 体系，避免冷硬感，提升阅读舒适度：

```css
:root {
  /* 背景层次 */
  --background: 0 0% 98%;           /* #FAFAFA - 暖白背景 */
  --surface: 0 0% 100%;             /* #FFFFFF - 纯白表面 */
  --surface-elevated: 0 0% 100%;     /* 悬浮层 */
  
  /* 文字层次 */
  --foreground: 220 14% 12%;        /* #1A1A2E - 深邃黑 */
  --foreground-secondary: 220 14% 28%;/* #4A4A68 - 中深灰 */
  --foreground-muted: 220 14% 45%;   /* #707086 - 浅灰 */
  --foreground-subtle: 220 14% 60%;  /* #9696A8 - 微灰 */
  
  /* 边框层次 */
  --border: 210 18% 92%;            /* #E8E8F0 - 极浅灰 */
  --border-subtle: 210 18% 88%;      /* #F0F0F6 - 微边框 */
  --border-focus: 210 82% 56%;       /* #1E88E5 - 焦点蓝 */
  
  /* 阴影层次 */
  --shadow-color: 220 14% 12%;       /* 阴影基色 */
}
```

### 2.3 渐变色组合

精心设计的渐变方案，用于图表、按钮、卡片等场景：

```css
:root {
  /* 主渐变 */
  --gradient-primary: linear-gradient(135deg, #1E88E5 0%, #42A5F5 50%, #64B5F6 100%);
  --gradient-accent: linear-gradient(135deg, #FF9800 0%, #FFAB40 50%, #FFC107 100%);
  
  /* 状态渐变 */
  --gradient-success: linear-gradient(135deg, #2E7D32 0%, #43A047 100%);
  --gradient-warning: linear-gradient(135deg, #FFC107 0%, #FF9800 100%);
  --gradient-danger: linear-gradient(135deg, #EF4444 0%, #F87171 100%);
  
  /* 背景渐变 */
  --gradient-bg-soft: linear-gradient(180deg, #FAFAFA 0%, #F5F5F8 100%);
  --gradient-card: linear-gradient(145deg, #FFFFFF 0%, #FDFDFD 100%);
  
  /* 玻璃拟态 */
  --glass-bg: rgba(255, 255, 255, 0.85);
  --glass-border: rgba(255, 255, 255, 0.5);
  --glass-blur: blur(20px);
}
```

### 2.4 暗色主题

精心设计的暗色模式，保护用户眼睛：

```css
[data-theme="dark"] {
  /* 背景 */
  --background: 220 14% 8%;          /* #0D0D14 */
  --surface: 220 14% 12%;            /* #1A1A2E */
  --surface-elevated: 220 14% 16%;   /* #252538 */
  
  /* 文字 */
  --foreground: 210 20% 98%;         /* #F8F9FC */
  --foreground-secondary: 210 20% 82%;/* #C8CAD4 */
  --foreground-muted: 210 20% 65%;   /* #989AB0 */
  --foreground-subtle: 210 20% 50%;  /* #707280 */
  
  /* 边框 */
  --border: 220 14% 20%;             /* #2D2D3F */
  --border-subtle: 220 14% 18%;      /* #282838 */
  --border-focus: 210 82% 65%;       /* #42A5F5 */
  
  /* 渐变 */
  --gradient-bg-soft: linear-gradient(180deg, #0D0D14 0%, #12121A 100%);
  --gradient-card: linear-gradient(145deg, #1A1A2E 0%, #202032 100%);
  
  /* 玻璃拟态 */
  --glass-bg: rgba(26, 26, 46, 0.85);
  --glass-border: rgba(45, 45, 63, 0.5);
}
```

### 2.5 配色使用规范

| 场景 | 颜色选择 | 说明 |
|------|---------|------|
| 主按钮 | `--gradient-primary` | 悬停时亮度提升 |
| 次要按钮 | `--surface` + `--border` | 透明背景 |
| 危险操作 | `--danger` | 红色系 |
| 成功状态 | `--success` | 绿色系 |
| 警告提示 | `--warning` | 橙色系 |
| 信息提示 | `--info` | 蓝色系 |
| 文字 | `--foreground` | 主文字 |
| 辅助文字 | `--foreground-muted` | 说明文字 |

---

## 3. 字体系统

### 3.1 字体族选择

```css
/* 主字体 - 现代无衬线 */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;

/* 等宽字体 - 代码/数字 */
font-family: 'JetBrains Mono', "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, monospace;
```

### 3.2 字体大小阶梯

```css
/* 基础字号 - 移动端优先 */
--text-xs: 0.75rem;     /* 12px - 标签、状态 */
--text-sm: 0.875rem;    /* 14px - 辅助文字 */
--text-base: 1rem;      /* 16px - 正文 */
--text-lg: 1.125rem;    /* 18px - 卡片标题 */
--text-xl: 1.25rem;     /* 20px - 区块标题 */
--text-2xl: 1.5rem;     /* 24px - 页面标题 */
--text-3xl: 1.875rem;   /* 30px - 大标题 */
--text-4xl: 2.25rem;    /* 36px - 超大标题 */
--text-5xl: 3rem;       /* 48px - 英雄标题 */

/* 行高系统 */
--leading-tight: 1.3;   /* 标题 */
--leading-normal: 1.5;  /* 正文 */
--leading-relaxed: 1.7; /* 长文本 */
```

### 3.3 字体粗细层级

```css
--font-thin: 300;       /* 极细 - 装饰性文字 */
--font-normal: 400;     /* 正常 - 正文 */
--font-medium: 500;     /* 中等 - 强调文字 */
--font-semibold: 600;   /* 半粗 - 标题 */
--font-bold: 700;       /* 粗体 - 重要标题 */
```

### 3.4 字体使用规范

| 场景 | 大小 | 粗细 | 行高 | 颜色 |
|------|------|------|------|------|
| 页面标题 | text-3xl (30px) | 700 | 1.3 | foreground |
| 区块标题 | text-xl (20px) | 600 | 1.3 | foreground |
| 卡片标题 | text-lg (18px) | 600 | 1.4 | foreground |
| 表单标签 | text-sm (14px) | 500 | 1.5 | foreground-secondary |
| 正文 | text-base (16px) | 400 | 1.5 | foreground |
| 辅助说明 | text-sm (14px) | 400 | 1.5 | foreground-muted |
| 状态标签 | text-xs (12px) | 500 | 1.4 | 功能色 |

---

## 4. 间距系统

### 4.1 基础间距单位

基于 **8px 网格系统**，确保布局一致性：

```css
--space-0: 0;
--space-1: 0.25rem;    /* 4px */
--space-2: 0.5rem;     /* 8px */
--space-3: 0.75rem;    /* 12px */
--space-4: 1rem;       /* 16px */
--space-5: 1.25rem;    /* 20px */
--space-6: 1.5rem;     /* 24px */
--space-8: 2rem;       /* 32px */
--space-10: 2.5rem;    /* 40px */
--space-12: 3rem;      /* 48px */
--space-16: 4rem;      /* 64px */
--space-20: 5rem;      /* 80px */
--space-24: 6rem;      /* 96px */
```

### 4.2 组件内间距

| 组件 | padding | 说明 |
|------|---------|------|
| 按钮 | 8px 16px | 基础按钮 |
| 输入框 | 10px 14px | 舒适输入 |
| 卡片 | 24px | 内容区域 |
| 模态框 | 28px | 舒适阅读 |
| 表格单元格 | 14px 16px | 数据展示 |
| 标签页 | 12px 20px | 切换区域 |

### 4.3 布局间距

```css
/* 页面布局 */
--page-padding-x: 24px;         /* 页面水平内边距 */
--page-padding-y: 32px;         /* 页面垂直内边距 */
--content-max-width: 1440px;    /* 内容最大宽度 */

/* 区块间距 */
--section-gap: 40px;            /* 区块之间 */
--card-gap: 24px;              /* 卡片之间 */
--form-gap: 20px;              /* 表单元素之间 */
--input-gap: 12px;             /* 输入框与标签之间 */
```

### 4.4 负间距

用于特殊场景的重叠效果：

```css
--space-negative-1: -4px;
--space-negative-2: -8px;
--space-negative-4: -16px;
--space-negative-6: -24px;
```

---

## 5. 圆角与阴影

### 5.1 圆角系统

```css
/* 基础圆角 */
--radius-sm: 0.25rem;        /* 4px - 小元素 */
--radius-md: 0.375rem;       /* 6px - 按钮、输入框 */
--radius-lg: 0.5rem;         /* 8px - 卡片 */
--radius-xl: 0.75rem;        /* 12px - 模态框 */
--radius-2xl: 1rem;          /* 16px - 大容器 */
--radius-full: 9999px;       /* 完全圆角 */

/* 特殊圆角 */
--radius-pill: 24px;         /* 胶囊形状 */
--radius-bubble: 20px;       /* 气泡形状 */
```

### 5.2 阴影系统

精心设计的阴影层次，营造立体感：

```css
/* 基础阴影 */
--shadow-none: none;
--shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.03);
--shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.05);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.05);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.08), 0 8px 10px -6px rgb(0 0 0 / 0.05);
--shadow-2xl: 0 25px 50px -12px rgb(0 0 0 / 0.15);

/* 彩色阴影 - 增强视觉层次 */
--shadow-primary: 0 10px 30px -10px rgba(30, 136, 229, 0.3);
--shadow-accent: 0 10px 30px -10px rgba(255, 152, 0, 0.3);
--shadow-glow: 0 0 40px -10px rgba(30, 136, 229, 0.2);

/* 玻璃阴影 */
--shadow-glass: 0 8px 32px rgba(0, 0, 0, 0.08);
```

### 5.3 使用规范

| 组件 | 圆角 | 阴影 | 悬停效果 |
|------|------|------|----------|
| 按钮 | radius-md | shadow-none | shadow-sm |
| 输入框 | radius-md | shadow-sm | shadow-md + border-focus |
| 卡片 | radius-lg | shadow-sm | shadow-md + translateY(-2px) |
| 模态框 | radius-xl | shadow-2xl | - |
| 下拉菜单 | radius-lg | shadow-lg | - |
| 徽章 | radius-full | shadow-xs | - |

---

## 6. 动画系统

### 6.1 动画原则

```text
流畅自然 | 快速响应 | 意图明确 | 性能优先
```

### 6.2 时间系统

```css
--duration-instant: 75ms;     /* 即时反馈 */
--duration-fast: 150ms;       /* 快速过渡 */
--duration-normal: 200ms;     /* 标准过渡 */
--duration-slow: 300ms;       /* 复杂过渡 */
--duration-slower: 500ms;     /* 页面过渡 */
--duration-hero: 800ms;       /* 英雄动画 */
```

### 6.3 缓动函数

```css
/* 基础缓动 */
--ease-linear: linear;
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);

/* 特色缓动 */
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
--ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
--ease-smooth: cubic-bezier(0.25, 0.46, 0.45, 0.94);
```

### 6.4 微交互动画

| 场景 | 动画效果 | 时长 | 缓动 |
|------|---------|------|------|
| 按钮悬停 | scale(1.02) + shadow-md | 150ms | ease-out |
| 按钮点击 | scale(0.98) | 100ms | ease-in |
| 卡片悬停 | translateY(-3px) + shadow-lg | 200ms | ease-out |
| 输入框聚焦 | border-color + box-shadow | 150ms | ease-out |
| 标签页切换 | opacity + translateX | 200ms | ease-out |
| 下拉菜单展开 | opacity + scaleY | 200ms | ease-out |

### 6.5 页面过渡

```typescript
const pageTransition = {
  duration: 300,
  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  enter: {
    opacity: 0,
    y: 20,
    scale: 0.98,
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.98,
  },
};
```

### 6.6 加载状态

```typescript
// Skeleton 骨架屏
const skeleton = {
  animation: 'skeleton-wave 1.5s ease-in-out infinite',
  background: 'linear-gradient(90deg, var(--border) 25%, var(--surface) 50%, var(--border) 75%)',
  backgroundSize: '200% 100%',
};

// 脉冲动画
const pulse = {
  animation: 'pulse-ring 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite',
};

// 旋转加载
const spin = {
  animation: 'spin 1s linear infinite',
};
```

---

## 7. 组件规范

### 7.1 按钮

```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link';
  size: 'sm' | 'default' | 'lg' | 'icon';
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
}

// 尺寸配置
const buttonSizes = {
  sm: { height: '32px', padding: '6px 12px', fontSize: '12px' },
  default: { height: '40px', padding: '10px 20px', fontSize: '14px' },
  lg: { height: '48px', padding: '12px 28px', fontSize: '16px' },
  icon: { height: '40px', width: '40px', padding: '8px' },
};

// 变体样式
const buttonVariants = {
  primary: {
    background: 'var(--gradient-primary)',
    color: 'white',
    hover: { shadow: 'var(--shadow-primary)' },
  },
  secondary: {
    background: 'var(--surface)',
    color: 'var(--foreground)',
    border: '1px solid var(--border)',
  },
  outline: {
    background: 'transparent',
    color: 'var(--primary)',
    border: '1px solid var(--primary)',
    hover: { background: 'rgba(30, 136, 229, 0.05)' },
  },
  ghost: {
    background: 'transparent',
    color: 'var(--foreground-secondary)',
    hover: { background: 'var(--border-subtle)' },
  },
  destructive: {
    background: 'var(--danger)',
    color: 'white',
    hover: { background: 'var(--danger-light)' },
  },
};
```

### 7.2 卡片

```typescript
interface CardProps {
  variant?: 'default' | 'elevated' | 'glass';
  padding?: 'none' | 'sm' | 'default' | 'lg';
  hoverable?: boolean;
  bordered?: boolean;
}

const cardSpec = {
  default: {
    background: 'var(--surface)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border)',
    shadow: 'var(--shadow-sm)',
    padding: '24px',
  },
  elevated: {
    background: 'var(--surface)',
    borderRadius: 'var(--radius-xl)',
    border: 'none',
    shadow: 'var(--shadow-lg)',
    padding: '28px',
  },
  glass: {
    background: 'var(--glass-bg)',
    backdropFilter: 'var(--glass-blur)',
    borderRadius: 'var(--radius-xl)',
    border: '1px solid var(--glass-border)',
    shadow: 'var(--shadow-glass)',
    padding: '24px',
  },
};
```

### 7.3 输入框

```typescript
interface InputProps {
  type?: 'text' | 'password' | 'email' | 'number' | 'textarea';
  size?: 'sm' | 'default' | 'lg';
  error?: string;
  success?: boolean;
  disabled?: boolean;
  prefix?: ReactNode;
  suffix?: ReactNode;
}

const inputSpec = {
  default: {
    height: '44px',
    padding: '10px 14px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)',
    fontSize: '14px',
    transition: 'all 150ms ease-out',
  },
  states: {
    focus: {
      borderColor: 'var(--border-focus)',
      shadow: '0 0 0 3px rgba(30, 136, 229, 0.1)',
    },
    error: {
      borderColor: 'var(--danger)',
      shadow: '0 0 0 3px rgba(239, 68, 68, 0.1)',
    },
    success: {
      borderColor: 'var(--success)',
      shadow: '0 0 0 3px rgba(46, 125, 50, 0.1)',
    },
    disabled: {
      opacity: 0.5,
      cursor: 'not-allowed',
      backgroundColor: 'var(--border-subtle)',
    },
  },
};
```

### 7.4 表格

```typescript
interface TableProps {
  variant?: 'default' | 'striped' | 'compact';
  hoverable?: boolean;
  bordered?: boolean;
}

const tableSpec = {
  header: {
    backgroundColor: 'var(--border-subtle)',
    fontWeight: 600,
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'var(--foreground-secondary)',
    padding: '14px 16px',
  },
  body: {
    fontSize: '14px',
    padding: '14px 16px',
    borderBottom: '1px solid var(--border-subtle)',
  },
  row: {
    hover: { backgroundColor: 'var(--border-subtle)' },
    striped: {
      even: { backgroundColor: 'transparent' },
      odd: { backgroundColor: 'var(--border-subtle)' },
    },
  },
};
```

### 7.5 标签页

```typescript
interface TabsProps {
  variant?: 'default' | 'underline' | 'pills';
  size?: 'sm' | 'default';
}

const tabsSpec = {
  default: {
    padding: '12px 20px',
    borderRadius: 'var(--radius-md)',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 150ms ease-out',
    active: {
      backgroundColor: 'var(--primary)',
      color: 'white',
    },
    inactive: {
      backgroundColor: 'transparent',
      color: 'var(--foreground-muted)',
      hover: { color: 'var(--foreground)' },
    },
  },
  underline: {
    padding: '12px 20px',
    borderRadius: '0',
    borderBottom: '2px solid transparent',
    fontSize: '14px',
    fontWeight: 500,
    active: {
      borderBottomColor: 'var(--primary)',
      color: 'var(--primary)',
    },
    inactive: {
      color: 'var(--foreground-muted)',
      hover: { color: 'var(--foreground)' },
    },
  },
};
```

---

## 8. 图表规范

### 8.1 配色方案

```typescript
const chartColors = {
  // 主色系
  primary: 'hsl(210, 82%, 56%)',      // #1E88E5
  secondary: 'hsl(280, 70%, 50%)',    // #9C27B0
  tertiary: 'hsl(170, 60%, 50%)',     // #4DB6AC
  
  // 功能色系
  success: 'hsl(145, 63%, 42%)',       // #2E7D32
  warning: 'hsl(45, 97%, 50%)',        // #FFC107
  danger: 'hsl(0, 84%, 60%)',          // #EF4444
  
  // 中性色系
  gray: 'hsl(220, 14%, 45%)',          // #707086
  grayLight: 'hsl(220, 14%, 60%)',      // #9696A8
  grayLighter: 'hsl(210, 18%, 92%)',    // #E8E8F0
  
  // 渐变组合
  gradients: {
    blue: ['hsl(210, 82%, 65%)', 'hsl(210, 82%, 56%)'],
    purple: ['hsl(280, 70%, 60%)', 'hsl(280, 70%, 50%)'],
    green: ['hsl(145, 63%, 52%)', 'hsl(145, 63%, 42%)'],
    orange: ['hsl(45, 97%, 60%)', 'hsl(45, 97%, 50%)'],
  },
};
```

### 8.2 图表组件

```typescript
// 统计卡片
interface StatCardProps {
  title: string;
  value: string | number;
  trend?: {
    value: number;
    direction: 'up' | 'down';
    label?: string;
  };
  icon?: ReactNode;
  variant?: 'default' | 'gradient';
}

// 图表容器
interface ChartContainerProps {
  title: string;
  subtitle?: string;
  height?: number;
  actions?: ReactNode;
  children: ReactNode;
}

// 图表工具提示
const tooltipStyle = {
  backgroundColor: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  padding: '12px 16px',
  boxShadow: 'var(--shadow-lg)',
};
```

### 8.3 图表类型

| 图表类型 | 使用场景 | 配色建议 |
|----------|----------|----------|
| 折线图 | 趋势变化 | primary + secondary |
| 柱状图 | 对比分析 | primary + tertiary |
| 面积图 | 累计数据 | primary 渐变 |
| 饼图 | 占比分析 | primary + secondary + tertiary |
| 散点图 | 相关性分析 | primary |
| 雷达图 | 多维对比 | 功能色系 |

---

## 9. 页面模板

### 9.1 布局结构

```typescript
interface PageLayoutProps {
  header?: ReactNode;
  sidebar?: ReactNode;
  content: ReactNode;
  footer?: ReactNode;
  variant?: 'default' | 'dashboard' | 'minimal';
}

const pageLayouts = {
  default: {
    header: true,
    sidebar: true,
    footer: true,
    contentPadding: '24px',
  },
  dashboard: {
    header: true,
    sidebar: true,
    footer: false,
    contentPadding: '32px',
  },
  minimal: {
    header: false,
    sidebar: false,
    footer: false,
    contentPadding: '24px',
  },
};
```

### 9.2 页面类型

#### 9.2.1 仪表盘页面

```typescript
interface DashboardPageProps {
  widgets: Array<{
    id: string;
    type: 'stat' | 'chart' | 'list' | 'activity';
    title: string;
    data: unknown;
    span?: 1 | 2 | 3 | 4;
  }>;
}
```

#### 9.2.2 列表页面

```typescript
interface ListPageProps {
  title: string;
  actions?: ReactNode;
  filters?: ReactNode;
  table: ReactNode;
  pagination?: ReactNode;
}
```

#### 9.2.3 详情页面

```typescript
interface DetailPageProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  sections: Array<{
    title: string;
    content: ReactNode;
  }>;
}
```

#### 9.2.4 表单页面

```typescript
interface FormPageProps {
  title: string;
  subtitle?: string;
  form: ReactNode;
  actions?: ReactNode;
}
```

### 9.3 页面模板规范

| 页面类型 | 布局 | 组件 | 说明 |
|----------|------|------|------|
| 仪表盘 | 网格布局 | StatCard, ChartContainer | 数据可视化 |
| 列表 | 卡片/表格 | Table, Filter, Pagination | 数据展示 |
| 详情 | 单页布局 | Card, Section | 信息展示 |
| 表单 | 单页布局 | Form, Input, Button | 数据录入 |
| 登录 | 居中布局 | Card, Form | 用户认证 |

---

## 10. 交互模式

### 10.1 导航模式

```typescript
interface NavigationProps {
  variant: 'sidebar' | 'top' | 'hybrid';
  collapsed?: boolean;
  items: Array<{
    id: string;
    label: string;
    icon: ReactNode;
    path: string;
    badge?: number | string;
    children?: Array<NavigationItem>;
  }>;
}
```

### 10.2 搜索模式

```typescript
interface SearchProps {
  type?: 'inline' | 'modal' | 'dropdown';
  placeholder?: string;
  suggestions?: Array<{
    type: 'result' | 'category' | 'recent';
    title: string;
    subtitle?: string;
    icon?: ReactNode;
  }>;
}
```

### 10.3 通知模式

```typescript
interface NotificationProps {
  type: 'success' | 'warning' | 'error' | 'info';
  message: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
  dismissible?: boolean;
}
```

### 10.4 操作反馈

```typescript
interface ActionFeedbackProps {
  type: 'success' | 'error' | 'loading' | 'confirm';
  message: string;
  icon?: ReactNode;
}
```

---

## 11. 响应式设计

### 11.1 断点系统

```css
--screen-xs: 360px;     /* 超小屏 */
--screen-sm: 640px;     /* 小屏 */
--screen-md: 768px;     /* 中屏 */
--screen-lg: 1024px;    /* 大屏 */
--screen-xl: 1280px;    /* 超大屏 */
--screen-2xl: 1536px;   /* 极大屏 */
```

### 11.2 栅格系统

```css
/* 12列栅格 */
.grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
.grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.grid-cols-6 { grid-template-columns: repeat(6, minmax(0, 1fr)); }
.grid-cols-12 { grid-template-columns: repeat(12, minmax(0, 1fr)); }

/* 响应式列数 */
@media (min-width: 640px) {
  .sm\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (min-width: 768px) {
  .md\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .md\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

@media (min-width: 1024px) {
  .lg\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
```

### 11.3 布局适配

| 屏幕尺寸 | 布局策略 | 组件调整 |
|----------|----------|----------|
| < 640px | 单列布局 | 隐藏侧边栏，使用底部导航 |
| 640-768px | 紧凑布局 | 侧边栏收起为图标 |
| 768-1024px | 标准布局 | 正常显示所有元素 |
| > 1024px | 扩展布局 | 增加内容宽度 |

---

## 12. 无障碍设计

### 12.1 对比度标准

```css
/* WCAG AA 标准 */
--contrast-min: 4.5;       /* 正常文本 */
--contrast-large: 3.0;     /* 大文本 */

/* 确保符合标准 */
.text-primary { color: var(--foreground); }     /* ✓ 对比足够 */
.text-muted { color: var(--foreground-muted); } /* ✓ 对比足够 */
```

### 12.2 焦点管理

```css
/* 焦点样式 */
:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: 2px;
  border-radius: var(--radius-md);
}

/* 跳过链接 */
.skip-link {
  position: absolute;
  top: -100%;
  left: 0;
  padding: 10px 20px;
  background: var(--primary);
  color: white;
  z-index: 9999;
  transition: top 0.2s ease;
}

.skip-link:focus {
  top: 0;
}
```

### 12.3 ARIA 规范

```typescript
// 按钮
<button 
  aria-label="关闭对话框" 
  aria-expanded={isOpen}
  aria-controls="dialog-content"
>
  <XIcon aria-hidden="true" />
</button>

// 对话框
<Dialog 
  aria-modal="true" 
  aria-labelledby="dialog-title"
  aria-describedby="dialog-description"
>
  <h2 id="dialog-title">确认删除</h2>
  <p id="dialog-description">确定要删除此项目吗？</p>
</Dialog>

// 表单
<input
  aria-invalid={hasError}
  aria-describedby={`${id}-error`}
  aria-required={required}
/>
{hasError && <span id={`${id}-error`} role="alert">{error}</span>}
```

---

## 13. 设计令牌

### 13.1 令牌分类

```css
:root {
  /* ============ 颜色令牌 ============ */
  --color-primary: hsl(210, 82%, 56%);
  --color-primary-light: hsl(210, 82%, 65%);
  --color-primary-dark: hsl(210, 82%, 45%);
  
  --color-accent: hsl(25, 97%, 53%);
  --color-accent-light: hsl(25, 97%, 62%);
  
  --color-success: hsl(145, 63%, 42%);
  --color-warning: hsl(45, 97%, 50%);
  --color-danger: hsl(0, 84%, 60%);
  --color-info: hsl(200, 89%, 48%);
  
  --color-background: hsl(0, 0%, 98%);
  --color-surface: hsl(0, 0%, 100%);
  --color-foreground: hsl(220, 14%, 12%);
  --color-foreground-secondary: hsl(220, 14%, 28%);
  --color-foreground-muted: hsl(220, 14%, 45%);
  --color-border: hsl(210, 18%, 92%);
  
  /* ============ 尺寸令牌 ============ */
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;
  --radius-full: 9999px;
  
  /* ============ 间距令牌 ============ */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  
  /* ============ 字体令牌 ============ */
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
  
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  
  /* ============ 动画令牌 ============ */
  --duration-fast: 150ms;
  --duration-normal: 200ms;
  --duration-slow: 300ms;
  
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
}
```

### 13.2 组件令牌

```css
/* 按钮令牌 */
--button-height: 40px;
--button-padding: 10px 20px;
--button-radius: var(--radius-md);

/* 输入框令牌 */
--input-height: 44px;
--input-padding: 10px 14px;
--input-radius: var(--radius-md);

/* 卡片令牌 */
--card-padding: 24px;
--card-radius: var(--radius-lg);
--card-shadow: var(--shadow-sm);

/* 表格令牌 */
--table-cell-padding: 14px 16px;
--table-header-bg: var(--border-subtle);
```

---

## 📝 附录

### A. 组件清单

| 组件 | 状态 | 版本 |
|------|------|------|
| Button | ✅ | 2.0 |
| Card | ✅ | 2.0 |
| Input | ✅ | 2.0 |
| Dialog | ✅ | 2.0 |
| Table | ✅ | 2.0 |
| Tabs | ✅ | 2.0 |
| Badge | ✅ | 2.0 |
| Avatar | ✅ | 2.0 |
| Select | ✅ | 2.0 |
| Checkbox | ✅ | 2.0 |
| Switch | ✅ | 2.0 |
| Slider | ✅ | 2.0 |
| Progress | ✅ | 2.0 |
| Toast | ✅ | 2.0 |
| Tooltip | ✅ | 2.0 |
| DatePicker | 🟡 | 开发中 |
| Chart | 🟡 | 开发中 |

### B. 设计工具

- **设计工具**: Figma
- **原型工具**: Figma / Framer
- **图标库**: Lucide React
- **图表库**: Recharts / Chart.js
- **构建工具**: Vite
- **样式方案**: Tailwind CSS 3 + Custom Properties

### C. 维护计划

| 阶段 | 时间 | 目标 |
|------|------|------|
| v2.0 | 2026-Q2 | 完善基础组件 |
| v2.1 | 2026-Q3 | 添加图表组件 |
| v2.2 | 2026-Q4 | 完善暗色主题 |
| v3.0 | 2027-Q1 | 设计系统成熟 |

---

**文档版本**: 2.0.0  
**创建日期**: 2026-05-20  
**下次审查**: 2026-06-20  
**维护人**: 前端设计团队