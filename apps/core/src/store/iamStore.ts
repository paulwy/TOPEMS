import { create } from 'zustand';
import type { User, Role, Permission } from '@topems/shared-types';
import { iamApi } from '../api/iam';

interface IamStore {
  users: User[];
  roles: Role[];
  permissions: Permission[];
  usersTotal: number;
  usersPage: number;
  usersPageSize: number;
  loading: boolean;
  error: string | null;

  loadUsers: (params?: { page?: number; pageSize?: number; keyword?: string; status?: string }) => Promise<void>;
  loadRoles: () => Promise<void>;
  loadPermissions: () => Promise<void>;

  addUser: (user: User) => void;
  updateUser: (user: User) => void;
  deleteUser: (id: string) => void;

  addRole: (role: Role) => void;
  updateRole: (role: Role) => void;
  deleteRole: (id: string) => void;

  addPermission: (permission: Permission) => void;
  deletePermission: (id: string) => void;

  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useIamStore = create<IamStore>((set) => ({
  users: [],
  roles: [],
  permissions: [],
  usersTotal: 0,
  usersPage: 1,
  usersPageSize: 10,
  loading: false,
  error: null,

  loadUsers: async (params) => {
    set({ loading: true, error: null });
    try {
      const response = await iamApi.listUsers(params);
      set({
        users: response.items,
        usersTotal: response.total,
        usersPage: response.page,
        usersPageSize: response.pageSize,
      });
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : '加载用户列表失败' });
    } finally {
      set({ loading: false });
    }
  },

  loadRoles: async () => {
    set({ loading: true, error: null });
    try {
      const roles = await iamApi.listRoles();
      set({ roles });
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : '加载角色列表失败' });
    } finally {
      set({ loading: false });
    }
  },

  loadPermissions: async () => {
    set({ loading: true, error: null });
    try {
      const permissions = await iamApi.listPermissions();
      set({ permissions });
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : '加载权限列表失败' });
    } finally {
      set({ loading: false });
    }
  },

  addUser: (user) =>
    set((state) => ({
      users: [user, ...state.users],
      usersTotal: state.usersTotal + 1,
    })),

  updateUser: (user) =>
    set((state) => ({
      users: state.users.map((u) => (u.id === user.id ? user : u)),
    })),

  deleteUser: (id) =>
    set((state) => ({
      users: state.users.filter((u) => u.id !== id),
      usersTotal: state.usersTotal - 1,
    })),

  addRole: (role) =>
    set((state) => ({
      roles: [role, ...state.roles],
    })),

  updateRole: (role) =>
    set((state) => ({
      roles: state.roles.map((r) => (r.id === role.id ? role : r)),
    })),

  deleteRole: (id) =>
    set((state) => ({
      roles: state.roles.filter((r) => r.id !== id),
    })),

  addPermission: (permission) =>
    set((state) => ({
      permissions: [permission, ...state.permissions],
    })),

  deletePermission: (id) =>
    set((state) => ({
      permissions: state.permissions.filter((p) => p.id !== id),
    })),

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
