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

export const useAuthUser = () => useAuthStore((state) => state.user);
export const useAuthToken = () => useAuthStore((state) => state.token);
export const useAuthPermissions = () => useAuthStore((state) => state.permissions);
export const useAuthRoles = () => useAuthStore((state) => state.roles);

export const useAuthDisplayName = () => {
  const user = useAuthStore((state) => state.user);
  return user?.realName || user?.full_name || user?.fullName || user?.username || '';
};

export const useAuthAvatarUrl = () => {
  const user = useAuthStore((state) => state.user);
  return user?.avatar_url || user?.avatar || '';
};

export const useIsAuthenticated = () => {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  return !!user && !!token;
};

export const useIsSuperuser = () => {
  const user = useAuthStore((state) => state.user);
  return !!(user?.is_superuser || user?.isSuperuser);
};

export const useAuthUserRole = () => {
  const user = useAuthStore((state) => state.user);
  const roles = useAuthStore((state) => state.roles);
  return user?.role || (roles && roles.length > 0 ? roles[0] : '');
};

export const useAuthActions = () =>
  useAuthStore((state) => ({
    setUser: state.setUser,
    setToken: state.setToken,
    setPermissions: state.setPermissions,
    setRoles: state.setRoles,
    clearAuth: state.clearAuth,
    updateUser: state.updateUser,
    hasPermission: state.hasPermission,
    hasAnyPermission: state.hasAnyPermission,
    hasAllPermissions: state.hasAllPermissions,
    hasRole: state.hasRole,
    hasAnyRole: state.hasAnyRole,
  }));

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

  return {
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
  };
};

export const useHasPermission = (permission: string) => {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  return (perm: string) => hasPermission(perm);
};

export const useHasAnyPermission = (permissions: string[]) => {
  const hasAnyPermission = useAuthStore((state) => state.hasAnyPermission);
  return (perms: string[]) => hasAnyPermission(perms);
};

export const useHasRole = (role: string) => {
  const hasRole = useAuthStore((state) => state.hasRole);
  return (r: string) => hasRole(r);
};

export default useAuthStore;
