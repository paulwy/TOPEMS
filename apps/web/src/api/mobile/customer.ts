/**
 * Mobile · 移动端 CRM 客户管理 API 绑定
 *
 * 后端: svc/mobile/src/main.rs (通过 HRM/CRM 服务客户端)
 * 路由:
 *   GET    /mobile/customers
 *   GET    /mobile/customers/{id}
 *   POST   /mobile/customers
 *   PUT    /mobile/customers/{id}
 *   DELETE /mobile/customers/{id}
 *   GET    /mobile/customers/{id}/contacts
 *   POST   /mobile/customers/{id}/contacts
 *   GET    /mobile/customers/{id}/follow-ups
 *   POST   /mobile/customers/{id}/follow-ups
 *   POST   /mobile/customers/{id}/assign
 *   GET    /mobile/leads
 *   POST   /mobile/leads
 *   PUT    /mobile/leads/{id}/convert
 */

import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

export type CustomerStatus = 'potential' | 'active' | 'inactive' | 'won' | 'lost';
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
export type FollowUpType = 'call' | 'visit' | 'email' | 'meeting' | 'other';

export interface Customer {
  id: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  industry?: string;
  status: CustomerStatus;
  level?: 'A' | 'B' | 'C';
  assigned_to?: string;
  last_follow_up?: string;
  total_contacts?: number;
  created_at: string;
  updated_at: string;
}

export interface CustomerContact {
  id: string;
  customer_id: string;
  name: string;
  title?: string;
  phone?: string;
  email?: string;
  is_primary: boolean;
  created_at: string;
}

export interface FollowUpRecord {
  id: string;
  customer_id: string;
  type: FollowUpType;
  content: string;
  result?: string;
  next_date?: string;
  created_by: string;
  created_at: string;
}

export interface Lead {
  id: string;
  name: string;
  company?: string;
  phone?: string;
  email?: string;
  source?: string;
  status: LeadStatus;
  assigned_to?: string;
  converted_customer_id?: string;
  created_at: string;
}

export interface CreateCustomerRequest {
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  industry?: string;
  level?: 'A' | 'B' | 'C';
}

export interface CreateContactRequest {
  name: string;
  title?: string;
  phone?: string;
  email?: string;
  is_primary?: boolean;
}

export interface CreateFollowUpRequest {
  type: FollowUpType;
  content: string;
  result?: string;
  next_date?: string;
}

export interface CreateLeadRequest {
  name: string;
  company?: string;
  phone?: string;
  email?: string;
  source?: string;
}

export const customerApi = {
  // ==================== 客户管理 ====================

  listCustomers: async (params?: {
    keyword?: string;
    status?: CustomerStatus;
    level?: 'A' | 'B' | 'C';
    assigned_to?: string;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResponse<Customer>>> => {
    return apiClient.mobile.get('customers', { params });
  },

  getCustomer: async (id: string): Promise<ApiResponse<Customer>> => {
    return apiClient.mobile.get(`customers/${id}`);
  },

  createCustomer: async (data: CreateCustomerRequest): Promise<ApiResponse<Customer>> => {
    return apiClient.mobile.post('customers', data);
  },

  updateCustomer: async (
    id: string,
    data: Partial<CreateCustomerRequest>
  ): Promise<ApiResponse<Customer>> => {
    return apiClient.mobile.put(`customers/${id}`, data);
  },

  deleteCustomer: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.mobile.delete(`customers/${id}`);
  },

  // ==================== 批 37 删除说明 ====================
  // assign / contacts / follow-ups 五条（assignCustomer、listContacts、createContact、
  // listFollowUps、createFollowUp）原为 contract_fallback 占位端点：批 36 曾把后端
  // 改为 503「未接入」，但批 37 四路取证确认前端**零真实调用**（页面走真实 CRM 通道，
  // 或用 `@/api/communication` 的同名方法），属 B 类"仅声明从不调用"。
  // 故按双向删原则一并移除前端封装与后端占位路由，避免长期假成功与死封装并存。

  // ==================== 线索管理（批 37 g3：/leads、/leads/{id}/convert 为占位，前端零引用，死封装已删除）====================
};

export default customerApi;
