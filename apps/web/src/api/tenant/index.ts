import apiClient from '../client';
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

export const tenantApi = {
  listTenants: async (params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
    plan?: string;
  }): Promise<ApiResponse<{ items: Tenant[]; total: number; page: number; pageSize: number }>> => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.pageSize) query.set('page_size', String(params.pageSize));
    if (params?.search) query.set('search', params.search);
    if (params?.status) query.set('status', params.status);
    if (params?.plan) query.set('plan', params.plan);
    const qs = query.toString();
    return apiClient.core.get(`/tenant/tenants${qs ? `?${qs}` : ''}`);
  },

  getTenant: async (tenantId: string): Promise<ApiResponse<Tenant>> => {
    return apiClient.core.get(`/tenant/tenants/${tenantId}`);
  },

  getTenantBySlug: async (slug: string): Promise<ApiResponse<Tenant>> => {
    return apiClient.core.get(`/tenant/slug/${slug}`);
  },

  createTenant: async (data: CreateTenantRequest): Promise<ApiResponse<Tenant>> => {
    return apiClient.core.post('/tenant/tenants', data);
  },

  updateTenant: async (
    tenantId: string,
    data: UpdateTenantRequest
  ): Promise<ApiResponse<Tenant>> => {
    return apiClient.core.put(`/tenant/tenants/${tenantId}`, data);
  },

  deleteTenant: async (tenantId: string): Promise<ApiResponse<string>> => {
    return apiClient.core.delete(`/tenant/tenants/${tenantId}`);
  },

  activateTenant: async (tenantId: string): Promise<ApiResponse<Tenant>> => {
    return apiClient.core.post(`/tenant/tenants/${tenantId}/activate`);
  },

  suspendTenant: async (tenantId: string): Promise<ApiResponse<Tenant>> => {
    return apiClient.core.post(`/tenant/tenants/${tenantId}/suspend`);
  },

  getTenantUsers: async (
    tenantId: string,
    params?: { page?: number; pageSize?: number; search?: string; role?: string }
  ): Promise<ApiResponse<{ items: TenantUser[]; total: number; page: number; pageSize: number }>> => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.pageSize) query.set('page_size', String(params.pageSize));
    if (params?.search) query.set('search', params.search);
    if (params?.role) query.set('role', params.role);
    const qs = query.toString();
    return apiClient.core.get(`/tenant/${tenantId}/users${qs ? `?${qs}` : ''}`);
  },

  inviteMember: async (
    tenantId: string,
    data: InviteMemberRequest
  ): Promise<ApiResponse<TenantUser>> => {
    return apiClient.core.post(`/tenant/${tenantId}/users/invite`, data);
  },

  removeMember: async (tenantId: string, userId: string): Promise<ApiResponse<string>> => {
    return apiClient.core.delete(`/tenant/${tenantId}/users/${userId}`);
  },

  updateMemberRole: async (
    tenantId: string,
    userId: string,
    data: UpdateMemberRoleRequest
  ): Promise<ApiResponse<TenantUser>> => {
    return apiClient.core.put(`/tenant/${tenantId}/users/${userId}/role`, data);
  },

  getTenantStats: async (tenantId: string): Promise<ApiResponse<TenantStats>> => {
    return apiClient.core.get(`/tenant/${tenantId}/stats`);
  },

  getUsageMetrics: async (tenantId: string): Promise<ApiResponse<UsageMetrics>> => {
    return apiClient.core.get(`/tenant/${tenantId}/metrics`);
  },

  getBillingInfo: async (tenantId: string): Promise<ApiResponse<TenantBillingInfo>> => {
    return apiClient.core.get(`/tenant/${tenantId}/billing`);
  },

  getInvoices: async (tenantId: string): Promise<ApiResponse<TenantInvoice[]>> => {
    return apiClient.core.get(`/tenant/${tenantId}/invoices`);
  },

  getCurrentTenantContext: async (): Promise<ApiResponse<TenantContext>> => {
    return apiClient.core.get('/tenant/context');
  },

  getMyTenants: async (): Promise<ApiResponse<Tenant[]>> => {
    return apiClient.core.get('/tenant/my');
  },

  switchTenant: async (tenantId: string): Promise<ApiResponse<TenantContext>> => {
    return apiClient.core.post('/tenant/switch', { tenant_id: tenantId });
  },
};
