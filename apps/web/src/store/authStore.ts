import { useMemo } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface User {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  fullName?: string;
  realName?: string;
  role?: string;
  roles?: string[];
  permissions?: string[];
  isActive: boolean;
  is_superuser?: boolean;
  isSuperuser?: boolean;
  avatar?: string;
  avatar_url?: string;
  department?: string;
  department_id?: string;
  position?: string;
  phone?: string;
  tenant_id?: string;
  company?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  permissions: string[];
  roles: string[];
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setPermissions: (permissions: string[]) => void;
  setRoles: (roles: string[]) => void;
  clearAuth: () => void;
  updateUser: (partialUser: Partial<User>) => void;

  isAuthenticated: () => boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  isSuperuser: () => boolean;
  getDisplayName: () => string;
  getAvatarUrl: () => string;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      permissions: [],
      roles: [],

      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      setPermissions: (permissions) => set({ permissions }),
      setRoles: (roles) => set({ roles }),

      clearAuth: () => set({ user: null, token: null, permissions: [], roles: [] }),

      updateUser: (partialUser) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partialUser } : null,
        })),

      isAuthenticated: () => !!get().user && !!get().token,

      hasPermission: (permission) => {
        const state = get();
        if (state.isSuperuser()) return true;
        return state.permissions.includes(permission);
      },

      hasAnyPermission: (perms) => {
        const state = get();
        if (state.isSuperuser()) return true;
        return perms.some((p) => state.permissions.includes(p));
      },

      hasAllPermissions: (perms) => {
        const state = get();
        if (state.isSuperuser()) return true;
        return perms.every((p) => state.permissions.includes(p));
      },

      hasRole: (role) => {
        const state = get();
        return state.roles.includes(role);
      },

      hasAnyRole: (roleList) => {
        const state = get();
        return roleList.some((r) => state.roles.includes(r));
      },

      isSuperuser: () => {
        const user = get().user;
        return !!(user?.is_superuser || user?.isSuperuser);
      },

      getDisplayName: () => {
        const user = get().user;
        if (!user) return '';
        return user.realName || user.full_name || user.fullName || user.username || '';
      },

      getAvatarUrl: () => {
        const user = get().user;
        if (!user) return '';
        return user.avatar_url || user.avatar || '';
      },
    }),
    {
      name: 'topems-auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        permissions: state.permissions,
        roles: state.roles,
      }),
    }
  )
);

const useAuthUser = () => useAuthStore((state) => state.user);
export const useAuthToken = () => useAuthStore((state) => state.token);
const useAuthPermissions = () => useAuthStore((state) => state.permissions);
const useAuthRoles = () => useAuthStore((state) => state.roles);

export const useAuthDisplayName = () => {
  const user = useAuthStore((state) => state.user);
  return user?.realName || user?.full_name || user?.fullName || user?.username || '';
};

export const useAuthAvatarUrl = () => {
  const user = useAuthStore((state) => state.user);
  return user?.avatar_url || user?.avatar || '';
};

const useIsAuthenticated = () => {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  return !!user && !!token;
};

const useIsSuperuser = () => {
  const user = useAuthStore((state) => state.user);
  return !!(user?.is_superuser || user?.isSuperuser);
};

export const useAuthUserRole = () => {
  const user = useAuthStore((state) => state.user);
  const roles = useAuthStore((state) => state.roles);
  return user?.role || (roles && roles.length > 0 ? roles[0] : '');
};

const useAuthActions = () => {
  // 使用单独选择器选择每个动作，避免在任何 store state 变化时都创建新的对象
  // zustand 中动作函数引用本身是稳定的，单独选择它们能确保仅当函数引用本身变化时才触发更新
  const setUser = useAuthStore((s) => s.setUser);
  const setToken = useAuthStore((s) => s.setToken);
  const setPermissions = useAuthStore((s) => s.setPermissions);
  const setRoles = useAuthStore((s) => s.setRoles);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const updateUser = useAuthStore((s) => s.updateUser);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const hasAnyPermission = useAuthStore((s) => s.hasAnyPermission);
  const hasAllPermissions = useAuthStore((s) => s.hasAllPermissions);
  const hasRole = useAuthStore((s) => s.hasRole);
  const hasAnyRole = useAuthStore((s) => s.hasAnyRole);

  // 再用 useMemo 保证 bundle 对象引用的稳定
  return useMemo(
    () => ({
      setUser,
      setToken,
      setPermissions,
      setRoles,
      clearAuth,
      updateUser,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      hasRole,
      hasAnyRole,
    }),
    [
      setUser,
      setToken,
      setPermissions,
      setRoles,
      clearAuth,
      updateUser,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      hasRole,
      hasAnyRole,
    ]
  );
};

/**
 * @deprecated Use `useAuth` from `@/hooks/useAuth` instead.
 * The Context-based useAuth in hooks/useAuth.tsx is the single source of auth state.
 * This Zustand-based useAuth is kept only for backward compatibility and should not be used directly.
 */
export const useAuth = () => {
  const user = useAuthUser();
  const token = useAuthToken();
  const permissions = useAuthPermissions();
  const roles = useAuthRoles();
  const displayName = useAuthDisplayName();
  const avatarUrl = useAuthAvatarUrl();
  const isAuthenticated = useIsAuthenticated();
  const isSuperuser = useIsSuperuser();
  const userRole = useAuthUserRole();
  const actions = useAuthActions();

  return useMemo(
    () => ({
      user,
      token,
      permissions,
      roles,
      displayName,
      avatarUrl,
      isAuthenticated,
      isSuperuser,
      userRole,
      ...actions,
    }),
    [
      user,
      token,
      permissions,
      roles,
      displayName,
      avatarUrl,
      isAuthenticated,
      isSuperuser,
      userRole,
      actions,
    ]
  );
};

export default useAuthStore;
