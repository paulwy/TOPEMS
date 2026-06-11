# TOPEMS 前端优化方案与设计标准

---

## 文档信息

| 项目 | 内容 |
|------|------|
| **文档版本** | v2.0.0 |
| **创建日期** | 2026-06-11 |
| **适用阶段** | 前端迭代优化 |
| **状态** | 待实施 |

---

## 目录

1. [代码组织优化](#1-代码组织优化)
2. [性能优化方案](#2-性能优化方案)
3. [UI设计标准](#3-ui设计标准)
4. [组件规范](#4-组件规范)
5. [状态管理优化](#5-状态管理优化)
6. [错误处理规范](#6-错误处理规范)
7. [可访问性标准](#7-可访问性标准)
8. [实施路线图](#8-实施路线图)

---

## 1. 代码组织优化

### 1.1 当前问题分析

**路由配置问题**：`App.tsx` 中路由配置超过 1000 行，维护困难
**组件分类不清晰**：UI组件、业务组件、布局组件混在一起
**缺少统一出口**：各模块没有统一的导出文件

### 1.2 目录结构优化

**推荐结构**：
```
src/
├── components/           # 组件目录
│   ├── ui/              # 基础UI组件（Button, Input等）
│   │   └── index.ts     # 统一导出
│   ├── layout/          # 布局组件（Header, Sidebar等）
│   │   └── index.ts
│   ├── common/          # 通用业务组件（DataTable, FormBuilder等）
│   │   └── index.ts
│   └── [module]/        # 模块专用组件（hrm/, crm/, etc.）
│       └── index.ts
├── pages/               # 页面组件
│   ├── [module]/        # 按模块组织
│   └── index.ts         # 页面导出
├── routes/              # 路由配置（新增）
│   ├── auth.ts          # 认证路由
│   ├── dashboard.ts     # 仪表盘路由
│   ├── hrm.ts           # HRM路由
│   ├── crm.ts           # CRM路由
│   └── index.ts         # 路由汇总
├── api/                 # API客户端
│   ├── [module].ts      # 按模块组织API
│   └── client.ts        # 统一客户端配置
├── store/               # 状态管理
│   ├── [module].ts      # 按模块组织store
│   └── index.ts         # store组合
├── types/               # 类型定义
│   └── index.ts         # 全局类型
├── utils/               # 工具函数
│   ├── format.ts        # 格式化工具
│   ├── validation.ts    # 验证工具
│   └── errors.ts        # 错误处理
├── config/              # 配置文件
│   └── index.ts         # 应用配置
├── hooks/               # 自定义Hooks
│   └── index.ts         # Hooks导出
├── App.tsx              # 主应用组件
├── main.tsx             # 入口文件
└── index.css            # 全局样式
```

### 1.3 路由模块化重构

**优化后的路由结构**：
```typescript
// src/routes/hrm.ts
import { lazy } from 'react';

const HrmEmployeePage = lazy(() => import('../pages/HrmEmployeePage'));
const HrmDepartmentPage = lazy(() => import('../pages/HrmDepartmentPage'));
const HrmAttendancePage = lazy(() => import('../pages/HrmAttendancePage'));

export const hrmRoutes = [
{ path: '/hrm/employees', element: <HrmEmployeePage /> },
{ path: '/hrm/departments', element: <HrmDepartmentPage /> },
{ path: '/hrm/attendance', element: <HrmAttendancePage /> },
];
```

```typescript
// src/routes/index.ts
export { authRoutes } from './auth';
export { dashboardRoutes } from './dashboard';
export { hrmRoutes } from './hrm';
export { crmRoutes } from './crm';
export { erpRoutes } from './erp';
```

```typescript
// src/App.tsx (优化后)
import { authRoutes, dashboardRoutes, hrmRoutes, crmRoutes, erpRoutes } from './routes';

const AppContent: React.FC = () => {
return (
    <BrowserRouter>
    <Suspense fallback={<PageLoader />}>
        <Routes>
        {authRoutes.map((route) => (
            <Route key={route.path} path={route.path} element={route.element} />
        ))}
        {dashboardRoutes.map((route) => (
            <Route key={route.path} path={route.path} element={route.element} />
        ))}
        {hrmRoutes.map((route) => (
            <Route key={route.path} path={route.path} element={route.element} />
        ))}
        </Routes>
    </Suspense>
    </BrowserRouter>
);
};
```

---

## 2. 性能优化方案

### 2.1 代码分割优化

**当前状态**：已使用 `React.lazy` 进行路由懒加载

**优化建议**：添加加载状态和错误处理
```typescript
// src/routes/utils.ts
export const lazyWithRetry = <T extends React.ComponentType<any>>(
factory: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> => {
return React.lazy(async () => {
    try {
    return await factory();
    } catch (error) {
    console.error('Failed to load component:', error);
    return { default: ErrorPage };
    }
});
};
```

### 2.2 资源优化

**图片优化**：
```typescript
// 使用loading="lazy"延迟加载
<img 
src={imageUrl} 
alt="描述" 
loading="lazy" 
className="w-full h-auto"
/>

// 使用WebP格式
<picture>
<source srcSet="image.webp" type="image/webp" />
<img src="image.jpg" alt="描述" />
</picture>
```

**字体优化**：
```css
@font-face {
font-family: 'Inter';
src: url('fonts/inter-regular.woff2') format('woff2');
font-weight: 400;
font-display: swap;
}
```

### 2.3 缓存策略

**使用React Query进行数据缓存**：
```typescript
// src/hooks/useUsers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/iam';

export const useGetUsers = () => {
return useQuery({
    queryKey: ['users'],
    queryFn: () => authApi.listUsers(),
    staleTime: 5 * 60 * 1000, // 5分钟缓存
    cacheTime: 10 * 60 * 1000, // 10分钟后从缓存删除
});
};

export const useCreateUser = () => {
const queryClient = useQueryClient();
return useMutation({
    mutationFn: (userData) => authApi.createUser(userData),
    onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['users'] });
    },
});
};
```

### 2.4 组件性能优化

**React.memo优化**：
```typescript
interface UserCardProps {
user: User;
onClick: () => void;
}

const UserCard: React.FC<UserCardProps> = React.memo(({ user, onClick }) => {
return (
    <div onClick={onClick} className="p-4 bg-white rounded-lg">
    <h3>{user.name}</h3>
    <p>{user.email}</p>
    </div>
);
});
```

**useMemo/useCallback优化**：
```typescript
const filteredUsers = useMemo(() => {
return users.filter(user => user.department === selectedDepartment);
}, [users, selectedDepartment]);

const handleClick = useCallback((id: string) => {
setSelectedId(id);
}, []);
```

### 2.5 性能指标监控

**核心指标**：
| 指标 | 目标值 |
|------|--------|
| LCP (Largest Contentful Paint) | < 2.5s |
| FID (First Input Delay) | < 100ms |
| CLS (Cumulative Layout Shift) | < 0.1 |
| TTI (Time to Interactive) | < 3.8s |

---

## 3. UI设计标准

### 3.1 设计原则

| 原则 | 说明 |
|------|------|
| **一致性** | 统一的视觉风格和交互模式 |
| **简洁性** | 清晰的信息层级，减少视觉噪音 |
| **可用性** | 直观的操作流程，降低学习成本 |
| **响应式** | 适配不同屏幕尺寸 |
| **无障碍** | 支持键盘导航和屏幕阅读器 |

### 3.2 颜色系统

**主题色板**：
| 颜色类型 | 色值 | 用途 |
|----------|------|------|
| **主色** | `#3B82F6` | 品牌色、主要按钮、链接 |
| **主色Hover** | `#2563EB` | 按钮悬停状态 |
| **主色Active** | `#1D4ED8` | 按钮按下状态 |
| **成功** | `#10B981` | 成功状态、确认按钮 |
| **警告** | `#F59E0B` | 警告提示、待处理状态 |
| **错误** | `#EF4444` | 错误状态、删除按钮 |
| **信息** | `#0EA5E9` | 信息提示、帮助文本 |
| **背景** | `#F8FAFC` | 页面背景 |
| **卡片** | `#FFFFFF` | 卡片背景 |
| **文字** | `#1E293B` | 主文字 |
| **次要文字** | `#64748B` | 次要文字 |
| **边框** | `#E2E8F0` | 分隔线、输入框边框 |

**Tailwind配置**：
```typescript
// tailwind.config.js
module.exports = {
theme: {
    extend: {
    colors: {
        primary: {
        50: '#EFF6FF',
        100: '#DBEAFE',
        500: '#3B82F6',
        600: '#2563EB',
        700: '#1D4ED8',
        },
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#0EA5E9',
    },
    },
},
};
```

### 3.3 字体系统

| 字体类型 | 字号 | 字重 | 行高 | 用途 |
|----------|------|------|------|------|
| **标题1** | 2rem (32px) | 700 | 1.2 | 页面标题 |
| **标题2** | 1.5rem (24px) | 600 | 1.3 | 区块标题 |
| **标题3** | 1.25rem (20px) | 600 | 1.4 | 卡片标题 |
| **标题4** | 1.125rem (18px) | 500 | 1.5 | 小标题 |
| **正文** | 1rem (16px) | 400 | 1.6 | 正文内容 |
| **小文字** | 0.875rem (14px) | 400 | 1.5 | 辅助文字 |
| **标签** | 0.75rem (12px) | 500 | 1.4 | 标签、状态 |

### 3.4 间距系统

| 间距 | 值 | 用途 |
|------|------|------|
| xs | 0.25rem (4px) | 元素内微小间距 |
| sm | 0.5rem (8px) | 小间距（按钮内边距等） |
| md | 1rem (16px) | 中等间距（卡片内边距等） |
| lg | 1.5rem (24px) | 大间距（区块间距等） |
| xl | 2rem (32px) | 超大间距（页面间距等） |
| 2xl | 3rem (48px) | 极大间距 |

### 3.5 圆角系统

| 圆角 | 值 | 用途 |
|------|------|------|
| none | 0 | 直角 |
| sm | 0.25rem (4px) | 微小圆角 |
| md | 0.375rem (6px) | 中等圆角（按钮等） |
| lg | 0.5rem (8px) | 大圆角（卡片等） |
| xl | 0.75rem (12px) | 超大圆角 |
| full | 9999px | 圆形 |

---

## 4. 组件规范

### 4.1 Button组件

**Props定义**：
```typescript
interface ButtonProps {
variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
size?: 'sm' | 'md' | 'lg';
disabled?: boolean;
loading?: boolean;
onClick?: () => void;
children: React.ReactNode;
className?: string;
type?: 'button' | 'submit' | 'reset';
}
```

**实现示例**：
```tsx
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

const Button: React.FC<ButtonProps> = ({
variant = 'primary',
size = 'md',
disabled = false,
loading = false,
onClick,
children,
className,
type = 'button',
}) => {
const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

const variants = {
    primary: 'bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500',
    outline: 'border-2 border-primary-500 text-primary-500 hover:bg-primary-50 focus:ring-primary-500',
    ghost: 'text-gray-600 hover:bg-gray-100 focus:ring-gray-500',
    destructive: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500',
};

const sizes = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2',
};

return (
    <button
    type={type}
    className={clsx(baseStyles, variants[variant], sizes[size], className)}
    disabled={disabled || loading}
    onClick={onClick}
    >
    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
    {children}
    </button>
);
};
```

### 4.2 Input组件

**Props定义**：
```typescript
interface InputProps {
type?: 'text' | 'email' | 'password' | 'number' | 'tel';
label?: string;
placeholder?: string;
value?: string;
onChange?: (value: string) => void;
error?: string;
disabled?: boolean;
required?: boolean;
className?: string;
}
```

**实现示例**：
```tsx
import { clsx } from 'clsx';

const Input: React.FC<InputProps> = ({
type = 'text',
label,
placeholder,
value,
onChange,
error,
disabled = false,
required = false,
className,
}) => {
return (
    <div className="space-y-1">
    {label && (
        <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
        </label>
    )}
    <input
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={clsx(
        'w-full px-4 py-2 rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500',
        error 
            ? 'border-red-500 focus:ring-red-500' 
            : 'border-gray-300 focus:border-transparent',
        disabled && 'bg-gray-100 cursor-not-allowed',
        className
        )}
    />
    {error && (
        <p className="text-sm text-red-500">{error}</p>
    )}
    </div>
);
};
```

### 4.3 Card组件

**Props定义**：
```typescript
interface CardProps {
className?: string;
header?: React.ReactNode;
footer?: React.ReactNode;
children: React.ReactNode;
hoverable?: boolean;
}
```

**实现示例**：
```tsx
import { clsx } from 'clsx';

const Card: React.FC<CardProps> = ({
className,
header,
footer,
children,
hoverable = false,
}) => {
return (
    <div
    className={clsx(
        'bg-white rounded-xl shadow-sm border border-gray-200',
        hoverable && 'transition-all duration-200 hover:shadow-md hover:-translate-y-1 cursor-pointer',
        className
    )}
    >
    {header && (
        <div className="px-6 py-4 border-b border-gray-200">
        {header}
        </div>
    )}
    <div className="p-6">
        {children}
    </div>
    {footer && (
        <div className="px-6 py-4 border-t border-gray-200">
        {footer}
        </div>
    )}
    </div>
);
};
```

---

## 5. 状态管理优化

### 5.1 Zustand最佳实践

**Store组织**：
```typescript
// src/store/userStore.ts
import { create } from 'zustand';

interface UserState {
user: User | null;
loading: boolean;
error: string | null;
login: (credentials: LoginCredentials) => Promise<void>;
logout: () => void;
fetchUser: () => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
user: null,
loading: false,
error: null,

login: async (credentials) => {
    set({ loading: true, error: null });
    try {
    const response = await api.login(credentials);
    set({ user: response.data, loading: false });
    } catch (error) {
    set({ error: error.message, loading: false });
    throw error;
    }
},

logout: () => {
    set({ user: null });
    api.logout();
},

fetchUser: async () => {
    const { user } = get();
    if (user) return;
    
    set({ loading: true, error: null });
    try {
    const response = await api.getUser();
    set({ user: response.data, loading: false });
    } catch (error) {
    set({ error: null, loading: false });
    }
},
}));
```

**使用模式**：
```typescript
// 组件中使用
const { user, loading, login } = useUserStore();

// 选择式订阅（只订阅需要的状态）
const userName = useUserStore((state) => state.user?.name);
```

---

## 6. 错误处理规范

### 6.1 全局错误边界

**ErrorBoundary实现**：
```tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
children: ReactNode;
fallback?: ReactNode;
}

interface State {
hasError: boolean;
error: Error | null;
errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
};

static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
}

componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('Error Boundary caught:', error, errorInfo);
}

handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
};

render() {
    if (this.state.hasError) {
    return this.props.fallback || (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-800 mb-2">页面加载失败</h2>
        <p className="text-gray-600 mb-4">
            {this.state.error?.message || '发生未知错误'}
        </p>
        <button 
        onClick={this.handleRetry}
        className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
        >
            重试
        </button>
        </div>
    );
    }

    return this.props.children;
}
}
```

### 6.2 Toast通知系统

**Toast类型**：
```typescript
interface Toast {
id: string;
type: 'success' | 'error' | 'warning' | 'info';
message: string;
action?: {
    label: string;
    onClick: () => void;
};
duration?: number;
}

interface ToastContextType {
toasts: Toast[];
addToast: (toast: Omit<Toast, 'id'>) => void;
removeToast: (id: string) => void;
}
```

---

## 7. 可访问性标准

### 7.1 ARIA标签支持

**按钮组件**：
```tsx
<button
aria-label="提交表单"
aria-disabled={isLoading}
aria-describedby="submit-error"
>
提交
</button>
```

**表单输入**：
```tsx
<input
aria-required="true"
aria-invalid={hasError}
aria-describedby="email-error"
/>
<div id="email-error" role="alert">邮箱格式不正确</div>
```

### 7.2 键盘导航支持

**模态框**：
```tsx
useEffect(() => {
const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
    onClose();
    }
};

document.addEventListener('keydown', handleEscape);
return () => document.removeEventListener('keydown', handleEscape);
}, [onClose]);
```

**可点击元素**：
```tsx
<div
role="button"
tabIndex={0}
onClick={handleClick}
onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
    handleClick();
    }
}}
>
点击我
</div>
```

### 7.3 颜色对比度

**最小对比度要求**：
- 正常文字：4.5:1
- 大文字（18pt+）：3:1
- 图标和UI元素：3:1

---

## 8. 实施路线图

### 8.1 阶段划分

| 阶段 | 时间 | 目标 | 交付物 |
|------|------|------|--------|
| **Phase 1** | 第1周 | 代码组织重构 | 路由模块化、组件目录重组 |
| **Phase 2** | 第2周 | 性能优化 | 懒加载、缓存策略、组件优化 |
| **Phase 3** | 第3周 | UI设计统一 | 设计系统落地、组件规范 |
| **Phase 4** | 第4周 | 可访问性提升 | ARIA标签、键盘导航、对比度优化 |

### 8.2 Phase 1: 代码组织重构

```
Week 1: 代码组织重构
├─ 创建 src/routes/ 目录
├─ 将路由配置按模块拆分
├─ 更新组件导出方式
├─ 创建模块导出文件
└─ 更新 App.tsx 使用新路由结构
```

### 8.3 Phase 2: 性能优化

```
Week 2: 性能优化
├─ 实现路由懒加载错误处理
├─ 引入React Query进行数据缓存
├─ 应用React.memo优化组件
├─ 添加性能监控指标
└─ 优化图片加载
```

### 8.4 Phase 3: UI设计统一

```
Week 3: UI设计统一
├─ 更新Tailwind配置（颜色、字体、间距）
├─ 重构Button/Input/Card等基础组件
├─ 统一表单验证样式
└─ 实现Toast通知系统
```

### 8.5 Phase 4: 可访问性提升

```
Week 4: 可访问性提升
├─ 添加ARIA标签
├─ 实现键盘导航
├─ 检查颜色对比度
└─ 添加焦点管理
```

---

## 附录

### A. 依赖版本

| 依赖 | 版本 |
|------|------|
| React | 18.3+ |
| TypeScript | 5.4+ |
| Vite | 6.2+ |
| Tailwind CSS | 3.4+ |
| Zustand | 4.5+ |
| React Router | 6.22+ |
| clsx | 2.0+ |
| lucide-react | 0.352+ |

### B. 工具链

| 工具 | 用途 |
|------|------|
| ESLint | 代码检查 |
| Prettier | 代码格式化 |
| Vitest | 单元测试 |
| Playwright | 端到端测试 |

---

**文档审批**

| 角色 | 签名 | 日期 |
|------|------|------|
| 前端负责人 | - | - |
| UI设计师 | - | - |
| QA负责人 | - | - |

---

*本文档由TOPEMS前端团队维护*
*版本: v2.0.0*
*最后更新: 2026-06-11*