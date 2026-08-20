import apiClient from '../client';
import type { ApiResponse } from '../client';

export interface Tenant {
  id: string;
  name: string;
  slug?: string;
  status?: 'active' | 'suspended' | 'pending';
  plan?: 'free' | 'basic' | 'pro' | 'enterprise';
  max_users?: number;
  current_users?: number;
  created_at?: string;
  updated_at?: string;
  settings?: Record<string, unknown>;
  branding?: {
    logo_url?: string;
    primary_color?: string;
    site_name?: string;
  };
}

interface TenantBilling {
  tenant_id: string;
  plan: string;
  status: string;
  next_billing_date?: string;
  amount?: number;
  currency?: string;
}

export interface TenantInvoice {
  id: string;
  invoice_no?: string;
  amount?: number;
  currency?: string;
  status?: 'pending' | 'paid' | 'overdue' | 'cancelled';
  date?: string;
  due_date?: string;
}

export interface TenantStats {
  total_users: number;
  active_users: number;
  total_storage_bytes: number;
  total_requests_this_month: number;
  api_usage_per_day?: Array<{ date: string; requests: number }>;
}

interface TenantUsage {
  storage_bytes: number;
  requests_this_month: number;
  active_users: number;
  plan_limits?: {
    max_users: number;
    max_storage: number;
    max_requests: number;
  };
}

export interface TenantUser {
  id: string;
  email: string;
  name: string;
  role: string;
  status?: 'active' | 'invited' | 'disabled';
  created_at?: string;
}

export const tenantApi = {
  getContext: (): Promise<ApiResponse<Tenant>> => {
    return apiClient.core.get('/api/core/tenant/context');
  },

  create: (data: { name: string; slug?: string; plan?: string }): Promise<ApiResponse<Tenant>> => {
    return apiClient.core.post('/api/core/tenant/create', data);
  },

  list: (): Promise<ApiResponse<Tenant[]>> => {
    return apiClient.core.get('/api/core/tenant/list');
  },

  getMy: (): Promise<ApiResponse<Tenant>> => {
    return apiClient.core.get('/api/core/tenant/my');
  },

  getBySlug: (slug: string): Promise<ApiResponse<Tenant>> => {
    return apiClient.core.get(`/api/core/tenant/slug/${slug}`);
  },

  switch: (tenantId: string): Promise<ApiResponse<{ success: boolean }>> => {
    return apiClient.core.post('/api/core/tenant/switch', { tenant_id: tenantId });
  },

  get: (tenantId: string): Promise<ApiResponse<Tenant>> => {
    return apiClient.core.get(`/api/core/tenant/${tenantId}`);
  },

  update: (tenantId: string, data: Partial<Tenant>): Promise<ApiResponse<Tenant>> => {
    return apiClient.core.put(`/api/core/tenant/${tenantId}`, data);
  },

  remove: (tenantId: string): Promise<ApiResponse<void>> => {
    return apiClient.core.delete(`/api/core/tenant/${tenantId}`);
  },

  activate: (tenantId: string): Promise<ApiResponse<Tenant>> => {
    return apiClient.core.post(`/api/core/tenant/${tenantId}/activate`, {});
  },

  getBilling: (tenantId: string): Promise<ApiResponse<TenantBilling>> => {
    return apiClient.core.get(`/api/core/tenant/${tenantId}/billing`);
  },

  listInvoices: (tenantId: string): Promise<ApiResponse<TenantInvoice[]>> => {
    return apiClient.core.get(`/api/core/tenant/${tenantId}/invoices`);
  },

  getStats: (tenantId: string): Promise<ApiResponse<TenantStats>> => {
    return apiClient.core.get(`/api/core/tenant/${tenantId}/stats`);
  },

  suspend: (tenantId: string): Promise<ApiResponse<Tenant>> => {
    return apiClient.core.post(`/api/core/tenant/${tenantId}/suspend`, {});
  },

  getUsage: (tenantId: string): Promise<ApiResponse<TenantUsage>> => {
    return apiClient.core.get(`/api/core/tenant/${tenantId}/usage`);
  },

  listUsers: (tenantId: string): Promise<ApiResponse<TenantUser[]>> => {
    return apiClient.core.get(`/api/core/tenant/${tenantId}/users`);
  },

  inviteUser: (
    tenantId: string,
    data: { email: string; role?: string }
  ): Promise<ApiResponse<TenantUser>> => {
    return apiClient.core.post(`/api/core/tenant/${tenantId}/users/invite`, data);
  },

  removeUser: (tenantId: string, userId: string): Promise<ApiResponse<void>> => {
    return apiClient.core.delete(`/api/core/tenant/${tenantId}/users/${userId}`);
  },

  updateUserRole: (
    tenantId: string,
    userId: string,
    role: string
  ): Promise<ApiResponse<TenantUser>> => {
    return apiClient.core.put(`/api/core/tenant/${tenantId}/users/${userId}/role`, { role });
  },
};

export default tenantApi;
