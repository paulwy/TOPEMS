import type { ApiResponse } from '../client';
import apiClient from '../client';
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

const API_BASE = '/api/core/tenant';

export const tenantApi = {
  listTenants: async (params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
    plan?: string;
  }): Promise<ApiResponse<{ items: Tenant[]; total: number; page: number; pageSize: number }>> => {
    return apiClient.core.get(`${API_BASE}/list`, { params });
  },

  getTenant: async (tenantId: string): Promise<ApiResponse<Tenant>> => {
    return apiClient.core.get(`${API_BASE}/${tenantId}`);
  },

  getTenantBySlug: async (slug: string): Promise<ApiResponse<Tenant>> => {
    return apiClient.core.get(`${API_BASE}/slug/${slug}`);
  },

  createTenant: async (data: CreateTenantRequest): Promise<ApiResponse<Tenant>> => {
    return apiClient.core.post(`${API_BASE}/create`, data);
  },

  updateTenant: async (
    tenantId: string,
    data: UpdateTenantRequest
  ): Promise<ApiResponse<Tenant>> => {
    return apiClient.core.put(`${API_BASE}/${tenantId}`, data);
  },

  deleteTenant: async (tenantId: string): Promise<ApiResponse<string>> => {
    return apiClient.core.delete(`${API_BASE}/${tenantId}`);
  },

  activateTenant: async (tenantId: string): Promise<ApiResponse<Tenant>> => {
    return apiClient.core.post(`${API_BASE}/${tenantId}/activate`);
  },

  suspendTenant: async (tenantId: string): Promise<ApiResponse<Tenant>> => {
    return apiClient.core.post(`${API_BASE}/${tenantId}/suspend`);
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
    return apiClient.core.get(`${API_BASE}/${tenantId}/users`, { params });
  },

  inviteMember: async (
    tenantId: string,
    data: InviteMemberRequest
  ): Promise<ApiResponse<TenantUser>> => {
    return apiClient.core.post(`${API_BASE}/${tenantId}/users/invite`, data);
  },

  removeMember: async (tenantId: string, userId: string): Promise<ApiResponse<string>> => {
    return apiClient.core.delete(`${API_BASE}/${tenantId}/users/${userId}`);
  },

  updateMemberRole: async (
    tenantId: string,
    userId: string,
    data: UpdateMemberRoleRequest
  ): Promise<ApiResponse<TenantUser>> => {
    return apiClient.core.put(`${API_BASE}/${tenantId}/users/${userId}/role`, data);
  },

  getTenantStats: async (tenantId: string): Promise<ApiResponse<TenantStats>> => {
    return apiClient.core.get(`${API_BASE}/${tenantId}/stats`);
  },

  getUsageMetrics: async (tenantId: string): Promise<ApiResponse<UsageMetrics>> => {
    return apiClient.core.get(`${API_BASE}/${tenantId}/usage`);
  },

  getBillingInfo: async (tenantId: string): Promise<ApiResponse<TenantBillingInfo>> => {
    return apiClient.core.get(`${API_BASE}/${tenantId}/billing`);
  },

  getInvoices: async (tenantId: string): Promise<ApiResponse<TenantInvoice[]>> => {
    return apiClient.core.get(`${API_BASE}/${tenantId}/invoices`);
  },

  getCurrentTenantContext: async (): Promise<ApiResponse<TenantContext>> => {
    return apiClient.core.get(`${API_BASE}/context`);
  },

  getMyTenants: async (): Promise<ApiResponse<Tenant[]>> => {
    return apiClient.core.get(`${API_BASE}/my`);
  },

  switchTenant: async (tenantId: string): Promise<ApiResponse<TenantContext>> => {
    return apiClient.core.post(`${API_BASE}/switch`, { tenant_id: tenantId });
  },
};

export default tenantApi;
