import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Permission = string;

export type Role = 'admin' | 'manager' | 'editor' | 'viewer';

export interface User {
  id: string;
  name: string;
  roles: Role[];
  permissions: Permission[];
}

interface AuthContextType {
  user: User | null;
  login: (credentials: { username: string; password: string }) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: Permission) => boolean;
  hasRole: (role: Role) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const rolePermissions: Record<Role, Permission[]> = {
  admin: ['*'],
  manager: [
    'project:view', 'project:create', 'project:edit', 'project:delete',
    'experiment:view', 'experiment:create', 'experiment:edit', 'experiment:delete',
    'task:view', 'task:create', 'task:edit', 'task:delete',
    'report:view', 'report:create', 'report:edit',
    'user:view',
  ],
  editor: [
    'project:view', 'project:create', 'project:edit',
    'experiment:view', 'experiment:create', 'experiment:edit',
    'task:view', 'task:create', 'task:edit',
    'report:view', 'report:create',
  ],
  viewer: [
    'project:view',
    'experiment:view',
    'task:view',
    'report:view',
  ],
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('user');
      }
    }
  }, []);

  const login = async (credentials: { username: string; password: string }) => {
    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });
      
      if (!response.ok) {
        throw new Error('用户名或密码错误');
      }
      
      const data = await response.json();
      if (data.success && data.data) {
        setUser(data.data);
        localStorage.setItem('user', JSON.stringify(data.data));
      } else {
        throw new Error(data.message || '登录失败');
      }
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : '网络错误');
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const hasPermission = (permission: Permission) => {
    if (!user) return false;
    if (user.permissions.includes('*')) return true;
    return user.permissions.includes(permission);
  };

  const hasRole = (role: Role) => {
    if (!user) return false;
    return user.roles.includes(role);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, hasPermission, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export interface RequireAuthProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export const RequireAuth: React.FC<RequireAuthProps> = ({ children, fallback }) => {
  const { user } = useAuth();
  
  if (!user) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">请先登录</p>
      </div>
    );
  }
  
  return <>{children}</>;
};

export interface RequirePermissionProps {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
}

export const RequirePermission: React.FC<RequirePermissionProps> = ({
  permission,
  children,
  fallback,
}) => {
  const { hasPermission } = useAuth();
  
  if (!hasPermission(permission)) {
    return fallback || (
      <div className="flex items-center justify-center py-8">
        <p className="text-gray-500">您没有权限访问此内容</p>
      </div>
    );
  }
  
  return <>{children}</>;
};

export interface RequireRoleProps {
  role: Role;
  children: ReactNode;
  fallback?: ReactNode;
}

export const RequireRole: React.FC<RequireRoleProps> = ({ role, children, fallback }) => {
  const { hasRole } = useAuth();
  
  if (!hasRole(role)) {
    return fallback || (
      <div className="flex items-center justify-center py-8">
        <p className="text-gray-500">您的角色权限不足</p>
      </div>
    );
  }
  
  return <>{children}</>;
};

export interface PermissionButtonProps {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
  [key: string]: unknown;
}

export const PermissionButton: React.FC<PermissionButtonProps> = ({
  permission,
  children,
  fallback,
  ...props
}) => {
  const { hasPermission } = useAuth();
  
  if (!hasPermission(permission)) {
    return fallback || null;
  }
  
  return (
    <button {...props}>
      {children}
    </button>
  );
};

export const AuthStatus: React.FC = () => {
  const { user, logout } = useAuth();
  
  if (!user) {
    return (
      <span className="text-sm text-gray-500">未登录</span>
    );
  }
  
  return (
    <div className="flex items-center space-x-3">
      <span className="text-sm text-gray-700">{user.name}</span>
      <span className="text-xs text-gray-400">
        {user.roles.join(', ')}
      </span>
      <button
        onClick={logout}
        className="text-sm text-primary-600 hover:text-primary-700"
      >
        退出
      </button>
    </div>
  );
};

export default AuthProvider;
