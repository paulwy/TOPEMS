import axios from 'axios';
import { ApiResponse } from './client';

const API_BASE_URL = import.meta.env.VITE_CRM_API_URL || 'http://localhost:8021';

const crmApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 添加请求拦截器,自动添加认证token
crmApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 客户相关接口
export interface Customer {
  id: string;
  name: string;
  code?: string;
  industry?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  status: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerRequest {
  name: string;
  code?: string;
  industry?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

export interface UpdateCustomerRequest {
  name?: string;
  code?: string;
  industry?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  status?: string;
  notes?: string;
}

// 联系人相关接口
export interface Contact {
  id: string;
  customerId?: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  position?: string;
  status: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContactRequest {
  customerId?: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  position?: string;
  notes?: string;
}

export interface UpdateContactRequest {
  customerId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  position?: string;
  status?: string;
  notes?: string;
}

// 商机相关接口
export interface Opportunity {
  id: string;
  name: string;
  customerId?: string;
  value?: number;
  stage: string;
  probability?: number;
  closeDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOpportunityRequest {
  name: string;
  customerId?: string;
  value?: number;
  probability?: number;
  closeDate?: string;
  notes?: string;
}

export interface UpdateOpportunityRequest {
  name?: string;
  customerId?: string;
  value?: number;
  stage?: string;
  probability?: number;
  closeDate?: string;
  notes?: string;
}

// 交互记录相关接口
export interface Interaction {
  id: string;
  customerId?: string;
  contactId?: string;
  type: string;
  subject?: string;
  content?: string;
  scheduledAt?: string;
  completedAt?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInteractionRequest {
  customerId?: string;
  contactId?: string;
  type: string;
  subject?: string;
  content?: string;
  scheduledAt?: string;
  notes?: string;
}

export interface UpdateInteractionRequest {
  customerId?: string;
  contactId?: string;
  type?: string;
  subject?: string;
  content?: string;
  scheduledAt?: string;
  completedAt?: string;
  status?: string;
}

// 分页响应
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// API 方法
export const customerApi = {
  getCustomers: (params?: { page?: number; pageSize?: number; search?: string; status?: string }) =>
    crmApi.get<ApiResponse<PaginatedResponse<Customer>>>('/api/v1/customers', { params }),

  createCustomer: (data: CreateCustomerRequest) => crmApi.post<ApiResponse<Customer>>('/api/v1/customers', data),

  getCustomer: (id: string) => crmApi.get<ApiResponse<Customer>>(`/api/v1/customers/${id}`),

  updateCustomer: (id: string, data: UpdateCustomerRequest) =>
    crmApi.put<ApiResponse<Customer>>(`/api/v1/customers/${id}`, data),

  deleteCustomer: (id: string) => crmApi.delete<ApiResponse<void>>(`/api/v1/customers/${id}`),

  batchDelete: (ids: string[]) => crmApi.post<ApiResponse<void>>('/api/v1/customers/batch-delete', { ids }),
};

export const contactApi = {
  getContacts: (params?: { page?: number; pageSize?: number; search?: string; status?: string; customerId?: string }) =>
    crmApi.get<ApiResponse<PaginatedResponse<Contact>>>('/api/v1/contacts', { params }),

  createContact: (data: CreateContactRequest) => crmApi.post<ApiResponse<Contact>>('/api/v1/contacts', data),

  getContact: (id: string) => crmApi.get<ApiResponse<Contact>>(`/api/v1/contacts/${id}`),

  updateContact: (id: string, data: UpdateContactRequest) =>
    crmApi.put<ApiResponse<Contact>>(`/api/v1/contacts/${id}`, data),

  deleteContact: (id: string) => crmApi.delete<ApiResponse<void>>(`/api/v1/contacts/${id}`),

  batchDelete: (ids: string[]) => crmApi.post<ApiResponse<void>>('/api/v1/contacts/batch-delete', { ids }),
};

export const opportunityApi = {
  getOpportunities: (params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    stage?: string;
    customerId?: string;
  }) => crmApi.get<ApiResponse<PaginatedResponse<Opportunity>>>('/api/v1/opportunities', { params }),

  createOpportunity: (data: CreateOpportunityRequest) =>
    crmApi.post<ApiResponse<Opportunity>>('/api/v1/opportunities', data),

  getOpportunity: (id: string) => crmApi.get<ApiResponse<Opportunity>>(`/api/v1/opportunities/${id}`),

  updateOpportunity: (id: string, data: UpdateOpportunityRequest) =>
    crmApi.put<ApiResponse<Opportunity>>(`/api/v1/opportunities/${id}`, data),

  deleteOpportunity: (id: string) => crmApi.delete<ApiResponse<void>>(`/api/v1/opportunities/${id}`),

  batchDelete: (ids: string[]) => crmApi.post<ApiResponse<void>>('/api/v1/opportunities/batch-delete', { ids }),
};

export const interactionApi = {
  getInteractions: (params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
    customerId?: string;
    contactId?: string;
  }) => crmApi.get<ApiResponse<PaginatedResponse<Interaction>>>('/api/v1/interactions', { params }),

  createInteraction: (data: CreateInteractionRequest) =>
    crmApi.post<ApiResponse<Interaction>>('/api/v1/interactions', data),

  getInteraction: (id: string) => crmApi.get<ApiResponse<Interaction>>(`/api/v1/interactions/${id}`),

  updateInteraction: (id: string, data: UpdateInteractionRequest) =>
    crmApi.put<ApiResponse<Interaction>>(`/api/v1/interactions/${id}`, data),

  deleteInteraction: (id: string) => crmApi.delete<ApiResponse<void>>(`/api/v1/interactions/${id}`),

  batchDelete: (ids: string[]) => crmApi.post<ApiResponse<void>>('/api/v1/interactions/batch-delete', { ids }),
};

export default crmApi;
