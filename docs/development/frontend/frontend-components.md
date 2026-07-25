# 前端组件规范

本文档定义 TOPEMS 前端组件的开发规范和最佳实践。

## 目录

- [项目结构](#项目结构)
- [组件分类](#组件分类)
- [组件开发规范](#组件开发规范)
- [状态管理](#状态管理)
- [样式规范](#样式规范)
- [最佳实践](#最佳实践)

---

## 项目结构

### 1. 目录组织

```
apps/web/
├── src/
│   ├── components/           # 组件目录
│   │   ├── common/           # 通用组件
│   │   │   ├── TreeView/
│   │   │   ├── ProgressBar/
│   │   │   ├── Stepper/
│   │   │   └── DataTable/
│   │   ├── layout/           # 布局组件
│   │   │   ├── PageHeader/
│   │   │   ├── PageBreadcrumb/
│   │   │   └── ServiceMonitor/
│   │   ├── form/             # 表单组件
│   │   │   ├── FormInput/
│   │   │   ├── FormSelect/
│   │   │   └── FormDatePicker/
│   │   ├── dashboard/        # 仪表盘组件
│   │   └── templates/        # 页面模板
│   ├── pages/                # 页面组件
│   ├── api/                  # API 客户端
│   ├── hooks/                # 自定义 Hooks
│   ├── store/                # 状态管理
│   ├── utils/                # 工具函数
│   ├── styles/               # 全局样式
│   ├── routes/               # 路由配置
│   ├── types/                # 类型定义
│   └── App.tsx
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### 2. 组件文件结构

```
components/
└── UserCard/
    ├── index.tsx           # 导出组件
    ├── UserCard.tsx        # 组件实现
    ├── UserCard.types.ts   # 类型定义
    ├── UserCard.scss       # 样式文件
    └── UserCard.stories.tsx # Storybook 故事（可选）
```

---

## 组件分类

### 1. 通用组件 (Common)

在 `components/common/` 目录下定义，可复用于多个模块。

| 组件 | 用途 |
|------|------|
| TreeView | 树状目录展示 |
| ProgressBar | 进度条展示 |
| Stepper | 步骤指示器 |
| HelpButton | 帮助按钮 |
| DataTable | 数据表格 |
| Modal | 模态框 |
| Drawer | 抽屉组件 |
| Toast | 轻提示 |

### 2. 布局组件 (Layout)

在 `components/layout/` 目录下定义，用于页面布局。

| 组件 | 用途 |
|------|------|
| PageHeader | 页面头部 |
| PageBreadcrumb | 面包屑导航 |
| ServiceMonitor | 服务状态监测 |
| Sidebar | 侧边栏 |
| Header | 顶部导航 |

### 3. 业务组件

在对应模块目录下定义，如 `hrm/components/`、`crm/components/`。

---

## 组件开发规范

### 1. 组件模板

```tsx
// UserCard.tsx
import React from 'react';
import type { User } from '@/types';
import './UserCard.scss';

interface UserCardProps {
  user: User;
  onEdit?: (user: User) => void;
  onDelete?: (user: User) => void;
  className?: string;
}

export function UserCard({ user, onEdit, onDelete, className }: UserCardProps) {
  const handleEdit = () => {
    onEdit?.(user);
  };

  const handleDelete = () => {
    onDelete?.(user);
  };

  return (
    <div className={`user-card ${className || ''}`}>
      <div className="user-card__avatar">
        {user.full_name.charAt(0)}
      </div>
      <div className="user-card__info">
        <h3 className="user-card__name">{user.full_name}</h3>
        <p className="user-card__email">{user.email}</p>
      </div>
      <div className="user-card__actions">
        {onEdit && <button onClick={handleEdit}>编辑</button>}
        {onDelete && <button onClick={handleDelete}>删除</button>}
      </div>
    </div>
  );
}
```

### 2. 组件类型定义

```typescript
// UserCard.types.ts

// Props 类型
export interface UserCardProps {
  user: User;
  onEdit?: (user: User) => void;
  onDelete?: (user: User) => void;
  className?: string;
}

// 组件暴露的方法（使用 ref 时）
export interface UserCardRef {
  focus: () => void;
  reset: () => void;
}
```

### 3. Props 规范

```typescript
// 1. 必填 props 放在前面，可选 props 放在后面
interface ComponentProps {
  // 必填
  data: DataItem[];
  onConfirm: () => void;
  
  // 可选
  title?: string;
  className?: string;
  style?: React.CSSProperties;
}

// 2. 使用 children 时，使用 React.ReactNode 类型
interface ContainerProps {
  children: React.ReactNode;
}

// 3. 回调函数类型定义
type OnChange = (value: string) => void;
type OnSubmit = (data: FormData) => Promise<void>;
```

### 4. 样式规范

使用 SCSS 编写组件样式：

```scss
// UserCard.scss

// 使用 BEM 命名规范
.user-card {
  display: flex;
  align-items: center;
  padding: 16px;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  &__avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    font-weight: 500;
  }

  &__info {
    flex: 1;
    margin-left: 16px;
  }

  &__name {
    font-size: 16px;
    font-weight: 500;
    color: #333;
    margin: 0;
  }

  &__email {
    font-size: 14px;
    color: #666;
    margin: 4px 0 0;
  }

  &__actions {
    display: flex;
    gap: 8px;
  }

  // 状态变体
  &--disabled {
    opacity: 0.6;
    pointer-events: none;
  }

  &--active {
    border: 2px solid #3b82f6;
  }
}
```

---

## 状态管理

### 1. Hooks 使用规范

```typescript
// 1. 自定义 Hook 必须以 use 开头
// 2. 返回状态和相关操作
// 3. 使用泛型定义返回类型

interface UseUserListReturn {
  users: User[];
  loading: boolean;
  error: string | null;
  fetchUsers: (page: number) => Promise<void>;
  deleteUser: (id: string) => Promise<boolean>;
}

export function useUserList(): UseUserListReturn {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async (page: number) => {
    setLoading(true);
    try {
      const response = await apiClient.get<PaginatedResponse<User>>(
        `/v1/users?page=${page}&page_size=20`
      );
      if (response.code === 200) {
        setUsers(response.data.items);
      }
    } catch (err) {
      setError('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (id: string): Promise<boolean> => {
    try {
      const response = await apiClient.delete(`/v1/users/${id}`);
      return response.code === 200;
    } catch {
      return false;
    }
  };

  return { users, loading, error, fetchUsers, deleteUser };
}
```

### 2. Context 使用规范

```typescript
// 1. Context 用于深层传递的状态
// 2. 提供 Provider 组件
// 3. 使用 useContext 获取值

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  
  const login = async (username: string, password: string): Promise<boolean> => {
    // 登录逻辑
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
}
```

---

## 样式规范

### 1. 样式变量

```scss
// styles/variables.scss

// 颜色
$primary-color: #3b82f6;
$success-color: #22c55e;
$warning-color: #f59e0b;
$error-color: #ef4444;

// 字体
$font-size-base: 14px;
$font-size-lg: 16px;
$font-size-xl: 20px;

// 间距
$spacing-xs: 4px;
$spacing-sm: 8px;
$spacing-md: 16px;
$spacing-lg: 24px;
$spacing-xl: 32px;

// 圆角
$border-radius-sm: 4px;
$border-radius-md: 8px;
$border-radius-lg: 12px;

// 阴影
$box-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
$box-shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
$box-shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
```

### 2. 主题渐变

```scss
// styles/gradients.scss

$gradients: (
  primary: linear-gradient(135deg, #3b82f6, #2563eb),
  secondary: linear-gradient(135deg, #8b5cf6, #7c3aed),
  success: linear-gradient(135deg, #22c55e, #16a34a),
  warning: linear-gradient(135deg, #f59e0b, #d97706),
  error: linear-gradient(135deg, #ef4444, #dc2626),
);

// 模块专属渐变
$module-gradients: (
  hrm: linear-gradient(135deg, #3b82f6, #60a5fa),
  crm: linear-gradient(135deg, #22c55e, #4ade80),
  pm: linear-gradient(135deg, #f59e0b, #fbbf24),
  pm: linear-gradient(135deg, #8b5cf6, #a78bfa),
);
```

### 3. 响应式断点

```scss
// styles/breakpoints.scss

$breakpoints: (
  sm: 640px,
  md: 768px,
  lg: 1024px,
  xl: 1280px,
  xxl: 1536px,
);

// 使用示例
.user-card {
  display: flex;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
}
```

---

## 最佳实践

### 1. 组件组合

```tsx
// 正确：使用组合而非继承
function FormPage({ children }: { children: React.ReactNode }) {
  return <div className="form-page">{children}</div>;
}

function UserForm() {
  return (
    <FormPage>
      <FormInput label="用户名" />
      <FormInput label="邮箱" />
      <FormActions>
        <Button type="submit">提交</Button>
      </FormActions>
    </FormPage>
  );
}
```

### 2. 性能优化

```tsx
// 1. 使用 React.memo 避免不必要的重渲染
export const UserCard = React.memo(function UserCard({ user }: { user: User }) {
  return <div>{user.full_name}</div>;
});

// 2. 使用 useMemo 缓存计算结果
const sortedUsers = useMemo(() => {
  return [...users].sort((a, b) => a.name.localeCompare(b.name));
}, [users]);

// 3. 使用 useCallback 缓存回调函数
const handleEdit = useCallback((user: User) => {
  setEditingUser(user);
}, []);
```

### 3. 错误边界

```tsx
class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return <div>页面出错了</div>;
    }
    return this.props.children;
  }
}
```

### 4. 导入规范

```tsx
// 1. 按顺序导入
// React
import React, { useState, useEffect } from 'react';

// 第三方
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';

// 内部 - 别名路径
import { apiClient } from '@/api/client';
import { useAuth } from '@/hooks/useAuth';
import { UserCard } from '@/components/UserCard';

// 类型导入
import type { User, UserRole } from '@/types';

// 2. 导入后立即导出
export { useAuth } from './useAuth';
export { UserCard } from './UserCard';
```

---

**文档版本**: v1.0
**最后更新**: 2026-06-24
