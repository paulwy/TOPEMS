import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8012';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

export interface ApiResponse<T> {
  code: number;
  success: boolean;
  data?: T;
  message: string;
  timestamp: string;
}

export const customerApi = {
  getCustomers: (params?: { page?: number; pageSize?: number; search?: string; status?: string }) =>
    api.get<ApiResponse<any>>('/api/v1/customers', { params }),
  createCustomer: (data: CreateCustomerRequest) =>
    api.post<ApiResponse<Customer>>('/api/v1/customers', data),
  getCustomer: (id: string) =>
    api.get<ApiResponse<Customer>>(`/api/v1/customers/${id}`),
  updateCustomer: (id: string, data: Partial<CreateCustomerRequest> & { status?: string }) =>
    api.put<ApiResponse<Customer>>(`/api/v1/customers/${id}`, data),
  deleteCustomer: (id: string) =>
    api.delete<ApiResponse<string>>(`/api/v1/customers/${id}`),
};

export const contactApi = {
  getContacts: (params?: { page?: number; pageSize?: number; search?: string; status?: string; customerId?: string }) =>
    api.get<ApiResponse<any>>('/api/v1/contacts', { params }),
  createContact: (data: CreateContactRequest) =>
    api.post<ApiResponse<Contact>>('/api/v1/contacts', data),
  getContact: (id: string) =>
    api.get<ApiResponse<Contact>>(`/api/v1/contacts/${id}`),
  updateContact: (id: string, data: any) =>
    api.put<ApiResponse<Contact>>(`/api/v1/contacts/${id}`, data),
  deleteContact: (id: string) =>
    api.delete<ApiResponse<string>>(`/api/v1/contacts/${id}`),
};

export const opportunityApi = {
  getOpportunities: (params?: { page?: number; pageSize?: number; search?: string; stage?: string; customerId?: string }) =>
    api.get<ApiResponse<any>>('/api/v1/opportunities', { params }),
  createOpportunity: (data: CreateOpportunityRequest) =>
    api.post<ApiResponse<Opportunity>>('/api/v1/opportunities', data),
  getOpportunity: (id: string) =>
    api.get<ApiResponse<Opportunity>>(`/api/v1/opportunities/${id}`),
  updateOpportunity: (id: string, data: any) =>
    api.put<ApiResponse<Opportunity>>(`/api/v1/opportunities/${id}`, data),
  deleteOpportunity: (id: string) =>
    api.delete<ApiResponse<string>>(`/api/v1/opportunities/${id}`),
};

export const interactionApi = {
  getInteractions: (params?: { page?: number; pageSize?: number; search?: string; status?: string; customerId?: string; contactId?: string }) =>
    api.get<ApiResponse<any>>('/api/v1/interactions', { params }),
  createInteraction: (data: CreateInteractionRequest) =>
    api.post<ApiResponse<Interaction>>('/api/v1/interactions', data),
  getInteraction: (id: string) =>
    api.get<ApiResponse<Interaction>>(`/api/v1/interactions/${id}`),
  updateInteraction: (id: string, data: any) =>
    api.put<ApiResponse<Interaction>>(`/api/v1/interactions/${id}`, data),
  deleteInteraction: (id: string) =>
    api.delete<ApiResponse<string>>(`/api/v1/interactions/${id}`),
};

export default api;
