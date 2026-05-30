# TOPEMS UI 设计方案

**版本**: v1.0  
**日期**: 2026-05-30  
**状态**: 正式发布  

---

## 目录

1. [设计理念](#1-设计理念)
2. [设计原则](#2-设计原则)
3. [视觉规范](#3-视觉规范)
4. [组件库](#4-组件库)
5. [布局系统](#5-布局系统)
6. [交互规范](#6-交互规范)
7. [响应式设计](#7-响应式设计)
8. [可访问性](#8-可访问性)

---

## 1. 设计理念

### 1.1 核心理念

**"科技·专业·高效"**

TOPEMS 作为化工新材料企业的数字化平台，UI设计需要传达：
- **科技感**: 现代、先进的技术形象
- **专业性**: 严谨、可靠的企业级品质
- **高效性**: 简洁、直观的操作体验

### 1.2 设计关键词

| 关键词 | 描述 |
|--------|------|
| 清晰 | 信息层次分明，易于理解 |
| 专业 | 配色沉稳，布局规整 |
| 敏捷 | 操作流畅，响应及时 |
| 安全 | 视觉上传递可靠感 |

---

## 2. 设计原则

### 2.1 用户体验原则

| 原则 | 说明 | 示例 |
|------|------|------|
| 一致性 | 相似功能使用相同交互模式 | 按钮、表单风格统一 |
| 反馈 | 操作结果及时反馈 | 加载状态、成功提示 |
| 容错 | 防止错误，提供恢复机制 | 表单验证、撤销功能 |
| 效率 | 支持快捷操作 | 批量操作、快捷键 |

### 2.2 视觉原则

```
层级清晰 → 信息优先级明确
留白适度 → 减少认知负担
对齐规范 → 增强结构感
色彩克制 → 突出内容本身
```

---

## 3. 视觉规范

### 3.1 色彩系统

#### 主色调

```css
:root {
  /* 主色 - 深蓝色（科技、专业） */
  --color-primary: #2563EB;        /* 主色调 */
  --color-primary-light: #3B82F6;  /* 浅色 */
  --color-primary-dark: #1D4ED8;   /* 深色 */
  --color-primary-50: #EFF6FF;     /* 背景色 */
  --color-primary-100: #DBEAFE;    /* 浅背景 */

  /* 成功色 */
  --color-success: #10B981;         /* 成功状态 */
  --color-success-light: #34D399;
  --color-success-dark: #059669;

  /* 警告色 */
  --color-warning: #F59E0B;        /* 警告状态 */
  --color-warning-light: #FBBF24;
  --color-warning-dark: #D97706;

  /* 错误色 */
  --color-error: #EF4444;          /* 错误状态 */
  --color-error-light: #F87171;
  --color-error-dark: #DC2626;

  /* 信息色 */
  --color-info: #3B82F6;           /* 信息提示 */
  --color-info-light: #60A5FA;
  --color-info-dark: #2563EB;
}
```

#### 中性色

```css
:root {
  /* 文本色 */
  --text-primary: #111827;         /* 主要文本 */
  --text-secondary: #4B5563;       /* 次要文本 */
  --text-tertiary: #9CA3AF;         /* 占位符 */
  --text-disabled: #D1D5DB;         /* 禁用文本 */

  /* 背景色 */
  --bg-primary: #FFFFFF;           /* 主要背景 */
  --bg-secondary: #F9FAFB;          /* 次要背景 */
  --bg-tertiary: #F3F4F6;          /* 卡片背景 */
  --bg-hover: #F3F4F6;             /* 悬停背景 */

  /* 边框色 */
  --border-light: #E5E7EB;          /* 浅边框 */
  --border-default: #D1D5DB;        /* 默认边框 */
  --border-dark: #9CA3AF;           /* 深边框 */
}
```

#### 语义色

| 语义 | 颜色 | 用途 |
|------|------|------|
| 主要操作 | #2563EB | 按钮、链接 |
| 成功状态 | #10B981 | 完成、正常 |
| 警告状态 | #F59E0B | 注意、待处理 |
| 错误状态 | #EF4444 | 失败、危险 |
| 信息提示 | #3B82F6 | 信息展示 |

### 3.2 字体系统

#### 字体家族

```css
:root {
  /* 中文优先 */
  --font-family-base: "Inter", "Noto Sans SC", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;

  /* 代码字体 */
  --font-family-mono: "JetBrains Mono", "Fira Code", "Source Code Pro", monospace;
}
```

#### 字体规范

```css
:root {
  /* 字号 */
  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.875rem;    /* 14px */
  --text-base: 1rem;      /* 16px */
  --text-lg: 1.125rem;    /* 18px */
  --text-xl: 1.25rem;     /* 20px */
  --text-2xl: 1.5rem;     /* 24px */
  --text-3xl: 1.875rem;   /* 30px */

  /* 行高 */
  --leading-tight: 1.25;   /* 紧凑 */
  --leading-normal: 1.5;    /* 正常 */
  --leading-relaxed: 1.75;  /* 宽松 */

  /* 字重 */
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
}
```

#### 字体使用规范

| 场景 | 字号 | 字重 | 行高 |
|------|------|------|------|
| 页面标题 | 24px | 600 | 1.2 |
| 卡片标题 | 18px | 600 | 1.3 |
| 正文 | 14px | 400 | 1.5 |
| 辅助文字 | 12px | 400 | 1.4 |
| 按钮文字 | 14px | 500 | 1 |

### 3.3 间距系统

```css
:root {
  /* 基础间距单位 */
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;       /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */
}
```

#### 间距使用规范

| 场景 | 间距 | 说明 |
|------|------|------|
| 元素间距 | 8px / 16px | 同类元素 |
| 组间距 | 24px / 32px | 不同组 |
| 区块间距 | 48px / 64px | 页面区块 |
| 内边距 | 16px / 24px | 容器内边距 |

### 3.4 圆角系统

```css
:root {
  --radius-none: 0;
  --radius-sm: 0.25rem;     /* 4px */
  --radius-base: 0.375rem;   /* 6px */
  --radius-md: 0.5rem;       /* 8px */
  --radius-lg: 0.75rem;      /* 12px */
  --radius-xl: 1rem;          /* 16px */
  --radius-full: 9999px;     /* 圆形 */
}
```

#### 圆角使用规范

| 组件 | 圆角 | 说明 |
|------|------|------|
| 按钮 | 6px | 默认 |
| 输入框 | 6px | 输入框 |
| 卡片 | 8px | 卡片容器 |
| 模态框 | 12px | 弹窗 |
| 头像 | 50% | 圆形 |

### 3.5 阴影系统

```css
:root {
  /* 阴影 */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-base: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
}
```

#### 阴影使用规范

| 场景 | 阴影 | 说明 |
|------|------|------|
| 卡片 | shadow-sm | 轻微凸起 |
| 下拉菜单 | shadow-md | 菜单弹层 |
| 模态框 | shadow-lg | 弹窗 |
| 弹窗提示 | shadow-xl | Toast |

---

## 4. 组件库

### 4.1 按钮 (Button)

#### 按钮变体

```css
/* 主要按钮 */
.btn-primary {
  background: #2563EB;
  color: white;
  border: none;
}

/* 次要按钮 */
.btn-secondary {
  background: white;
  color: #374151;
  border: 1px solid #D1D5DB;
}

/* 文字按钮 */
.btn-text {
  background: transparent;
  color: #2563EB;
  border: none;
}
```

#### 按钮尺寸

| 尺寸 | 高度 | 内边距 | 字号 |
|------|------|--------|------|
| 小 | 32px | 12px 16px | 12px |
| 中 | 40px | 12px 20px | 14px |
| 大 | 48px | 16px 24px | 16px |

#### 按钮状态

```css
/* 悬停状态 */
.btn:hover {
  opacity: 0.9;
}

/* 按下状态 */
.btn:active {
  opacity: 0.8;
  transform: scale(0.98);
}

/* 禁用状态 */
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

### 4.2 输入框 (Input)

#### 样式规范

```css
.input {
  height: 40px;
  padding: 0 12px;
  border: 1px solid #D1D5DB;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.input:focus {
  border-color: #2563EB;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  outline: none;
}
```

#### 状态样式

| 状态 | 边框色 | 背景色 | 说明 |
|------|--------|--------|------|
| 默认 | #D1D5DB | white | 正常状态 |
| 悬停 | #9CA3AF | white | 鼠标悬停 |
| 聚焦 | #2563EB | white | 输入中 |
| 禁用 | #E5E7EB | #F9FAFB | 不可编辑 |
| 错误 | #EF4444 | #FEF2F2 | 验证失败 |

### 4.3 卡片 (Card)

#### 卡片结构

```css
.card {
  background: white;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.card-header {
  padding-bottom: 16px;
  margin-bottom: 16px;
  border-bottom: 1px solid #E5E7EB;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.card-body {
  color: #374151;
  font-size: 14px;
  line-height: 1.5;
}
```

### 4.4 表格 (Table)

#### 表格样式

```css
.table {
  width: 100%;
  border-collapse: collapse;
}

.table th {
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  font-size: 12px;
  color: #6B7280;
  background: #F9FAFB;
  border-bottom: 1px solid #E5E7EB;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.table td {
  padding: 16px;
  border-bottom: 1px solid #E5E7EB;
  font-size: 14px;
  color: #374151;
}

.table tr:hover td {
  background: #F9FAFB;
}
```

### 4.5 标签 (Tag)

#### 标签变体

```css
/* 默认标签 */
.tag-default {
  background: #F3F4F6;
  color: #374151;
}

/* 成功标签 */
.tag-success {
  background: #D1FAE5;
  color: #065F46;
}

/* 警告标签 */
.tag-warning {
  background: #FEF3C7;
  color: #92400E;
}

/* 错误标签 */
.tag-error {
  background: #FEE2E2;
  color: #991B1B;
}
```

---

## 5. 布局系统

### 5.1 页面布局

#### 标准页面结构

```
┌────────────────────────────────────────────────────┐
│                    Header (64px)                    │
├──────────┬─────────────────────────────────────────┤
│          │                                         │
│  Sidebar │              Main Content               │
│  (240px) │                                         │
│          │  ┌─────────────────────────────────┐  │
│          │  │        Page Header              │  │
│          │  │        (Breadcrumb + Title)    │  │
│          │  ├─────────────────────────────────┤  │
│          │  │                                 │  │
│          │  │        Content Area             │  │
│          │  │                                 │  │
│          │  │                                 │  │
│          │  └─────────────────────────────────┘  │
│          │                                         │
└──────────┴─────────────────────────────────────────┘
```

#### 布局尺寸规范

| 区域 | 尺寸 | 说明 |
|------|------|------|
| Header | 64px | 顶部导航 |
| Sidebar | 240px | 侧边菜单 |
| Content Padding | 24px | 内容区内边距 |
| Card Gap | 16px | 卡片间距 |

### 5.2 栅格系统

#### 响应式栅格

```css
/* 12列栅格 */
.grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
.grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.grid-cols-6 { grid-template-columns: repeat(6, minmax(0, 1fr)); }
.grid-cols-12 { grid-template-columns: repeat(12, minmax(0, 1fr)); }

/* 栅格间距 */
.gap-1 { gap: 0.25rem; }
.gap-2 { gap: 0.5rem; }
.gap-3 { gap: 0.75rem; }
.gap-4 { gap: 1rem; }
.gap-6 { gap: 1.5rem; }
.gap-8 { gap: 2rem; }
```

### 5.3 容器规范

```css
/* 最大宽度 */
.container-sm { max-width: 640px; }
.container-md { max-width: 768px; }
.container-lg { max-width: 1024px; }
.container-xl { max-width: 1280px; }
.container-2xl { max-width: 1536px; }

/* 居中 */
.container {
  width: 100%;
  margin-left: auto;
  margin-right: auto;
  padding-left: 16px;
  padding-right: 16px;
}
```

---

## 6. 交互规范

### 6.1 过渡动画

#### 时间规范

```css
:root {
  /* 动画时长 */
  --duration-fast: 150ms;     /* 微交互 */
  --duration-base: 200ms;    /* 默认 */
  --duration-slow: 300ms;     /* 页面过渡 */
  --duration-slower: 500ms;   /* 复杂动画 */

  /* 缓动函数 */
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
```

#### 应用场景

| 场景 | 时长 | 缓动 | 示例 |
|------|------|------|------|
| 颜色变化 | 150ms | ease | 按钮悬停 |
| 位移 | 200ms | ease-out | 下拉展开 |
| 缩放 | 200ms | ease | 弹窗出现 |
| 页面切换 | 300ms | ease-in-out | 路由切换 |

### 6.2 加载状态

#### 骨架屏

```css
.skeleton {
  background: linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
}

@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

#### 加载指示器

| 类型 | 尺寸 | 说明 |
|------|------|------|
| Spinner | 16px / 24px / 32px | 旋转加载 |
| Progress Bar | 4px 高 | 进度条 |
| Skeleton | 高度随内容 | 骨架屏 |

### 6.3 反馈提示

#### Toast 提示

```css
.toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  padding: 16px 24px;
  border-radius: 8px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  animation: toast-slide-in 0.3s ease;
  z-index: 1000;
}

.toast-success { background: #10B981; color: white; }
.toast-error { background: #EF4444; color: white; }
.toast-warning { background: #F59E0B; color: white; }
.toast-info { background: #3B82F6; color: white; }
```

#### 提示时长

| 类型 | 时长 | 说明 |
|------|------|------|
| 成功 | 3秒 | 自动消失 |
| 警告 | 5秒 | 自动消失 |
| 错误 | 8秒 | 需要确认 |
| 确认 | 手动 | 需要操作 |

---

## 7. 响应式设计

### 7.1 断点规范

```css
/* 移动端优先断点 */
/* 默认: 移动端 < 640px */
@media (min-width: 640px) {
  /* 小屏幕 */
}

@media (min-width: 768px) {
  /* 中等屏幕 */
}

@media (min-width: 1024px) {
  /* 大屏幕 */
}

@media (min-width: 1280px) {
  /* 超大屏幕 */
}
```

### 7.2 响应式策略

| 断点 | 设备 | 布局调整 |
|------|------|----------|
| < 640px | 手机 | 单列布局，隐藏侧边栏 |
| 640-1023px | 平板 | 双列布局，折叠侧边栏 |
| 1024-1279px | 桌面 | 完整布局，侧边栏展开 |
| >= 1280px | 大屏 | 宽屏优化，最大宽度限制 |

### 7.3 组件响应式

#### 表格响应式

```css
/* 移动端表格转卡片 */
@media (max-width: 768px) {
  .table-container {
    overflow-x: auto;
  }

  .table-responsive {
    display: block;
  }

  .table-responsive tr {
    display: block;
    margin-bottom: 16px;
    border: 1px solid #E5E7EB;
    border-radius: 8px;
  }

  .table-responsive td {
    display: block;
    padding: 12px;
  }
}
```

---

## 8. 可访问性

### 8.1 颜色对比度

```css
/* AAA 标准: 7:1 */
.text-primary {
  color: #111827; /* 在白色背景上 */
}

/* AA 标准: 4.5:1 */
.text-secondary {
  color: #4B5563; /* 在白色背景上 */
}
```

#### 对比度要求

| 文本类型 | 最小对比度 | 适用标准 |
|----------|-----------|----------|
| 正文文本 | 4.5:1 | WCAG AA |
| 大文本 | 3:1 | WCAG AA |
| UI组件 | 3:1 | WCAG AA |
| 装饰性 | 无要求 | - |

### 8.2 焦点管理

```css
/* 焦点环样式 */
:focus-visible {
  outline: 2px solid #2563EB;
  outline-offset: 2px;
}

/* 隐藏默认焦点环 */
:focus:not(:focus-visible) {
  outline: none;
}
```

### 8.3 语义化标记

#### ARIA 规范

```html
<!-- 按钮 -->
<button type="button" aria-label="关闭">
  <span aria-hidden="true">×</span>
</button>

<!-- 模态框 -->
<div role="dialog" aria-modal="true" aria-labelledby="modal-title">
  <h2 id="modal-title">标题</h2>
</div>

<!-- 加载状态 -->
<div aria-busy="true" aria-label="加载中">
  <div class="spinner"></div>
</div>
```

### 8.4 键盘导航

| 键 | 功能 |
|----|------|
| Tab | 切换焦点 |
| Enter | 确认/执行 |
| Escape | 取消/关闭 |
| Arrow Up/Down | 导航选项 |
| Space | 选中/取消 |

---

## 附录

### A. 图标库

**推荐图标库**: Lucide React

```bash
npm install lucide-react
```

**使用示例**:

```tsx
import { Search, Plus, Settings } from 'lucide-react';

const IconButton = () => (
  <button>
    <Search size={20} />
  </button>
);
```

### B. 设计资源

| 资源 | 链接 |
|------|------|
| 设计系统 | Figma 组件库 |
| 图标库 | Lucide Icons |
| 字体 | Inter, Noto Sans SC |
| 配色 | Tailwind CSS 默认色板 |

---

**文档版本**: v1.0  
**最后更新**: 2026-05-30  
**文档状态**: 正式发布  
**存档位置**: `docs/UI_DESIGN_SPEC.md`
