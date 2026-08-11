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
    return apiClient.mobile.get('/mobile/customers', { params });
  },

  getCustomer: async (id: string): Promise<ApiResponse<Customer>> => {
    return apiClient.mobile.get(`/mobile/customers/${id}`);
  },

  createCustomer: async (data: CreateCustomerRequest): Promise<ApiResponse<Customer>> => {
    return apiClient.mobile.post('/mobile/customers', data);
  },

  updateCustomer: async (
    id: string,
    data: Partial<CreateCustomerRequest>
  ): Promise<ApiResponse<Customer>> => {
    return apiClient.mobile.put(`/mobile/customers/${id}`, data);
  },

  deleteCustomer: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.mobile.delete(`/mobile/customers/${id}`);
  },

  assignCustomer: async (id: string, assigneeId: string): Promise<ApiResponse<Customer>> => {
    return apiClient.mobile.post(`/mobile/customers/${id}/assign`, {
      assigned_to: assigneeId,
    });
  },

  // ==================== 联系人管理 ====================

  listContacts: async (customerId: string): Promise<ApiResponse<CustomerContact[]>> => {
    return apiClient.mobile.get(`/mobile/customers/${customerId}/contacts`);
  },

  createContact: async (
    customerId: string,
    data: CreateContactRequest
  ): Promise<ApiResponse<CustomerContact>> => {
    return apiClient.mobile.post(`/mobile/customers/${customerId}/contacts`, data);
  },

  // ==================== 跟进记录 ====================

  listFollowUps: async (customerId: string): Promise<ApiResponse<FollowUpRecord[]>> => {
    return apiClient.mobile.get(`/mobile/customers/${customerId}/follow-ups`);
  },

  createFollowUp: async (
    customerId: string,
    data: CreateFollowUpRequest
  ): Promise<ApiResponse<FollowUpRecord>> => {
    return apiClient.mobile.post(`/mobile/customers/${customerId}/follow-ups`, data);
  },

  // ==================== 线索管理 ====================

  listLeads: async (params?: {
    status?: LeadStatus;
    source?: string;
    assigned_to?: string;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResponse<Lead>>> => {
    return apiClient.mobile.get('/mobile/leads', { params });
  },

  createLead: async (data: CreateLeadRequest): Promise<ApiResponse<Lead>> => {
    return apiClient.mobile.post('/mobile/leads', data);
  },

  convertLead: async (
    id: string,
    customerData?: Partial<CreateCustomerRequest>
  ): Promise<ApiResponse<Customer>> => {
    return apiClient.mobile.put(`/mobile/leads/${id}/convert`, customerData);
  },
};

export default customerApi;
