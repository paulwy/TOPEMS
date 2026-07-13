import type { ApiResponse } from '../client';
import type {
  Tenant,
  TenantUser,
  TenantStats,
  UsageMetrics,
  TenantBillingInfo,
  TenantInvoice,
  CreateTenantRequest,
  UpdateTenantRequest,
  InviteMemberRequest,
  UpdateMemberRoleRequest,
  TenantContext,
} from './types';
import {
  mockTenants,
  generateMockTenantUsers,
  generateMockTenantStats,
  generateMockUsageMetrics,
  generateMockBillingInfo,
  generateMockInvoices,
} from './mockData';

const tenantsCache = [...mockTenants];
const tenantUsersCache = new Map<string, TenantUser[]>();

const delay = <T>(data: T, ms = 300): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(data), ms));

const wrapResponse = <T>(data: T, success = true, message = 'Success'): ApiResponse<T> => ({
  code: success ? 0 : 1,
  success,
  data,
  message,
  timestamp: Date.now(),
});

export const tenantApi = {
  listTenants: async (params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
    plan?: string;
  }): Promise<ApiResponse<{ items: Tenant[]; total: number; page: number; pageSize: number }>> => {
    let filtered = [...tenantsCache];

    if (params?.search) {
      const searchLower = params.search.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(searchLower) || t.slug.toLowerCase().includes(searchLower)
      );
    }

    if (params?.status) {
      filtered = filtered.filter((t) => t.status === params.status);
    }

    if (params?.plan) {
      filtered = filtered.filter((t) => t.plan === params.plan);
    }

    const page = params?.page || 1;
    const pageSize = params?.pageSize || 10;
    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);

    return delay(
      wrapResponse({
        items,
        total,
        page,
        pageSize,
      })
    );
  },

  getTenant: async (tenantId: string): Promise<ApiResponse<Tenant>> => {
    const tenant = tenantsCache.find((t) => t.id === tenantId);
    if (!tenant) {
      return delay(wrapResponse({} as Tenant, false, 'Tenant not found'), 300);
    }
    return delay(wrapResponse(tenant));
  },

  getTenantBySlug: async (slug: string): Promise<ApiResponse<Tenant>> => {
    const tenant = tenantsCache.find((t) => t.slug === slug);
    if (!tenant) {
      return delay(wrapResponse({} as Tenant, false, 'Tenant not found'), 300);
    }
    return delay(wrapResponse(tenant));
  },

  createTenant: async (data: CreateTenantRequest): Promise<ApiResponse<Tenant>> => {
    const newTenant: Tenant = {
      id: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }),
      name: data.name,
      slug: data.slug,
      status: 'trial',
      plan: data.plan,
      settings: {
        max_users:
          data.plan === 'enterprise'
            ? 9999
            : data.plan === 'professional'
              ? 100
              : data.plan === 'basic'
                ? 25
                : 5,
        max_storage_gb:
          data.plan === 'enterprise'
            ? 9999
            : data.plan === 'professional'
              ? 200
              : data.plan === 'basic'
                ? 50
                : 5,
        max_api_requests_per_day:
          data.plan === 'enterprise'
            ? 9999999
            : data.plan === 'professional'
              ? 200000
              : data.plan === 'basic'
                ? 50000
                : 1000,
        features: {},
        branding: {
          primary_color: 'primary.main',
          secondary_color: 'grey.500',
        },
        security: {
          sso_enabled: false,
          two_factor_required: false,
          ip_whitelist_enabled: false,
          allowed_ip_ranges: [],
          session_timeout_minutes: 60,
        },
        ...data.settings,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: {},
    };
    tenantsCache.unshift(newTenant);
    return delay(wrapResponse(newTenant));
  },

  updateTenant: async (
    tenantId: string,
    data: UpdateTenantRequest
  ): Promise<ApiResponse<Tenant>> => {
    const index = tenantsCache.findIndex((t) => t.id === tenantId);
    if (index === -1) {
      return delay(wrapResponse({} as Tenant, false, 'Tenant not found'), 300);
    }

    const updatedTenant: Tenant = {
      ...tenantsCache[index],
      ...data,
      settings: data.settings
        ? {
            ...tenantsCache[index].settings,
            ...data.settings,
            branding: {
              ...tenantsCache[index].settings.branding,
              ...(data.settings.branding || {}),
            },
            security: {
              ...tenantsCache[index].settings.security,
              ...(data.settings.security || {}),
            },
            features: {
              ...tenantsCache[index].settings.features,
              ...(data.settings.features || {}),
            },
          }
        : tenantsCache[index].settings,
      updated_at: new Date().toISOString(),
    };

    tenantsCache[index] = updatedTenant;

    return delay(wrapResponse(updatedTenant));
  },

  deleteTenant: async (tenantId: string): Promise<ApiResponse<string>> => {
    const index = tenantsCache.findIndex((t) => t.id === tenantId);
    if (index === -1) {
      return delay(wrapResponse('', false, 'Tenant not found'), 300);
    }
    tenantsCache.splice(index, 1);
    tenantUsersCache.delete(tenantId);
    return delay(wrapResponse('Tenant deleted successfully'));
  },

  activateTenant: async (tenantId: string): Promise<ApiResponse<Tenant>> => {
    return tenantApi.updateTenant(tenantId, { status: 'active' });
  },

  suspendTenant: async (tenantId: string): Promise<ApiResponse<Tenant>> => {
    return tenantApi.updateTenant(tenantId, { status: 'suspended' });
  },

  getTenantUsers: async (
    tenantId: string,
    params?: {
      page?: number;
      pageSize?: number;
      search?: string;
      role?: string;
      status?: string;
    }
  ): Promise<
    ApiResponse<{ items: TenantUser[]; total: number; page: number; pageSize: number }>
  > => {
    if (!tenantUsersCache.has(tenantId)) {
      tenantUsersCache.set(tenantId, generateMockTenantUsers(tenantId));
    }

    let users = [...(tenantUsersCache.get(tenantId) || [])];

    if (params?.search) {
      const searchLower = params.search.toLowerCase();
      users = users.filter((u) => u.email.toLowerCase().includes(searchLower));
    }

    if (params?.role) {
      users = users.filter((u) => u.role === params.role);
    }

    if (params?.status) {
      users = users.filter((u) => u.status === params.status);
    }

    const page = params?.page || 1;
    const pageSize = params?.pageSize || 10;
    const total = users.length;
    const start = (page - 1) * pageSize;
    const items = users.slice(start, start + pageSize);

    return delay(
      wrapResponse({
        items,
        total,
        page,
        pageSize,
      })
    );
  },

  inviteMember: async (
    tenantId: string,
    data: InviteMemberRequest
  ): Promise<ApiResponse<TenantUser>> => {
    if (!tenantUsersCache.has(tenantId)) {
      tenantUsersCache.set(tenantId, generateMockTenantUsers(tenantId));
    }

    const newMember: TenantUser = {
      id: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }),
      tenant_id: tenantId,
      user_id: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }),
      email: data.email,
      role: data.role,
      status: 'invited',
      created_at: new Date().toISOString(),
      last_login: undefined,
    };

    tenantUsersCache.get(tenantId)?.unshift(newMember);
    return delay(wrapResponse(newMember));
  },

  removeMember: async (tenantId: string, userId: string): Promise<ApiResponse<string>> => {
    const users = tenantUsersCache.get(tenantId);
    if (!users) {
      return delay(wrapResponse('', false, 'Tenant not found'), 300);
    }

    const index = users.findIndex((u) => u.id === userId || u.user_id === userId);
    if (index === -1) {
      return delay(wrapResponse('', false, 'Member not found'), 300);
    }

    users.splice(index, 1);
    return delay(wrapResponse('Member removed successfully'));
  },

  updateMemberRole: async (
    tenantId: string,
    userId: string,
    data: UpdateMemberRoleRequest
  ): Promise<ApiResponse<TenantUser>> => {
    const users = tenantUsersCache.get(tenantId);
    if (!users) {
      return delay(wrapResponse({} as TenantUser, false, 'Tenant not found'), 300);
    }

    const user = users.find((u) => u.id === userId || u.user_id === userId);
    if (!user) {
      return delay(wrapResponse({} as TenantUser, false, 'Member not found'), 300);
    }

    user.role = data.role;
    return delay(wrapResponse(user));
  },

  getTenantStats: async (tenantId: string): Promise<ApiResponse<TenantStats>> => {
    return delay(wrapResponse(generateMockTenantStats(tenantId)));
  },

  getUsageMetrics: async (tenantId: string): Promise<ApiResponse<UsageMetrics>> => {
    return delay(wrapResponse(generateMockUsageMetrics(tenantId)));
  },

  getBillingInfo: async (tenantId: string): Promise<ApiResponse<TenantBillingInfo>> => {
    const tenant = tenantsCache.find((t) => t.id === tenantId);
    if (!tenant) {
      return delay(wrapResponse({} as TenantBillingInfo, false, 'Tenant not found'), 300);
    }
    return delay(wrapResponse(generateMockBillingInfo(tenant.plan)));
  },

  getInvoices: async (tenantId: string): Promise<ApiResponse<TenantInvoice[]>> => {
    return delay(wrapResponse(generateMockInvoices()));
  },

  getCurrentTenantContext: async (): Promise<ApiResponse<TenantContext>> => {
    const tenant = tenantsCache[0];
    return delay(
      wrapResponse({
        tenant_id: tenant.id,
        user_id: 'current-user-id',
        role: 'owner',
        permissions: [
          'tenant:manage',
          'tenant:settings',
          'tenant:users',
          'tenant:billing',
          'data:read',
          'data:write',
          'data:delete',
        ],
      })
    );
  },

  getMyTenants: async (): Promise<ApiResponse<Tenant[]>> => {
    return delay(wrapResponse(tenantsCache.slice(0, 2)));
  },

  switchTenant: async (_tenantId: string): Promise<ApiResponse<TenantContext>> => {
    return tenantApi.getCurrentTenantContext();
  },
};

export default tenantApi;
