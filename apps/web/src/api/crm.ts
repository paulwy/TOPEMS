/**
 * CRM (Customer Relationship Management) API Client
 * 客户关系管理 API 客户端
 */

import type {
  ApiResponse,
  PaginationParams,
  PaginatedResponse,
} from "./client";
import { apiClient } from "./client";

// ==================== Types ====================

/**
 * 客户
 */
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
  created_at: string;
  updated_at: string;
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

/**
 * 联系人
 */
export interface Contact {
  id: string;
  customer_id?: string;
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  position?: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateContactRequest {
  customer_id?: string;
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  position?: string;
  notes?: string;
}

export interface UpdateContactRequest {
  customer_id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  position?: string;
  status?: string;
  notes?: string;
}

export interface ContactQueryParams extends PaginationParams {
  customer_id?: string;
}

/**
 * 商机
 */
export interface Opportunity {
  id: string;
  name: string;
  customer_id?: string;
  value?: number;
  stage: string;
  probability?: number;
  close_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateOpportunityRequest {
  name: string;
  customer_id?: string;
  value?: number;
  probability?: number;
  close_date?: string;
  notes?: string;
}

export interface UpdateOpportunityRequest {
  name?: string;
  customer_id?: string;
  value?: number;
  stage?: string;
  probability?: number;
  close_date?: string;
  notes?: string;
}

export interface OpportunityQueryParams extends PaginationParams {
  stage?: string;
  customer_id?: string;
}

/**
 * 交互记录
 */
export interface Interaction {
  id: string;
  customer_id?: string;
  contact_id?: string;
  type: string;
  subject?: string;
  content?: string;
  scheduled_at?: string;
  completed_at?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateInteractionRequest {
  customer_id?: string;
  contact_id?: string;
  type: string;
  subject?: string;
  content?: string;
  scheduled_at?: string;
  notes?: string;
}

export interface UpdateInteractionRequest {
  customer_id?: string;
  contact_id?: string;
  type?: string;
  subject?: string;
  content?: string;
  scheduled_at?: string;
  completed_at?: string;
  status?: string;
}

export interface InteractionQueryParams extends PaginationParams {
  customer_id?: string;
  contact_id?: string;
}

// ==================== Customer API ====================

const customerApi = {
  /**
   * 获取客户列表
   */
  list: async (
    params?: PaginationParams,
  ): Promise<ApiResponse<PaginatedResponse<Customer>>> => {
    return apiClient.crm.get("/api/v1/customers", { params });
  },

  /**
   * 创建客户
   */
  create: async (
    data: CreateCustomerRequest,
  ): Promise<ApiResponse<Customer>> => {
    return apiClient.crm.post("/api/v1/customers", data);
  },

  /**
   * 获取客户详情
   */
  get: async (id: string): Promise<ApiResponse<Customer>> => {
    return apiClient.crm.get(`/api/v1/customers/${id}`);
  },

  /**
   * 更新客户
   */
  update: async (
    id: string,
    data: UpdateCustomerRequest,
  ): Promise<ApiResponse<Customer>> => {
    return apiClient.crm.put(`/api/v1/customers/${id}`, data);
  },

  /**
   * 删除客户
   */
  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.crm.delete(`/api/v1/customers/${id}`);
  },

  /**
   * 批量删除客户
   */
  batchDelete: async (ids: string[]): Promise<ApiResponse<void>> => {
    return apiClient.crm.post("/api/v1/customers/batch-delete", { ids });
  },
};

// ==================== Contact API ====================

const contactApi = {
  /**
   * 获取联系人列表
   */
  list: async (
    params?: ContactQueryParams,
  ): Promise<ApiResponse<PaginatedResponse<Contact>>> => {
    return apiClient.crm.get("/api/v1/contacts", { params });
  },

  /**
   * 创建联系人
   */
  create: async (data: CreateContactRequest): Promise<ApiResponse<Contact>> => {
    return apiClient.crm.post("/api/v1/contacts", data);
  },

  /**
   * 获取联系人详情
   */
  get: async (id: string): Promise<ApiResponse<Contact>> => {
    return apiClient.crm.get(`/api/v1/contacts/${id}`);
  },

  /**
   * 更新联系人
   */
  update: async (
    id: string,
    data: UpdateContactRequest,
  ): Promise<ApiResponse<Contact>> => {
    return apiClient.crm.put(`/api/v1/contacts/${id}`, data);
  },

  /**
   * 删除联系人
   */
  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.crm.delete(`/api/v1/contacts/${id}`);
  },

  /**
   * 批量删除联系人
   */
  batchDelete: async (ids: string[]): Promise<ApiResponse<void>> => {
    return apiClient.crm.post("/api/v1/contacts/batch-delete", { ids });
  },
};

// ==================== Opportunity API ====================

const opportunityApi = {
  /**
   * 获取商机列表
   */
  list: async (
    params?: OpportunityQueryParams,
  ): Promise<ApiResponse<PaginatedResponse<Opportunity>>> => {
    return apiClient.crm.get("/api/v1/opportunities", { params });
  },

  /**
   * 创建商机
   */
  create: async (
    data: CreateOpportunityRequest,
  ): Promise<ApiResponse<Opportunity>> => {
    return apiClient.crm.post("/api/v1/opportunities", data);
  },

  /**
   * 获取商机详情
   */
  get: async (id: string): Promise<ApiResponse<Opportunity>> => {
    return apiClient.crm.get(`/api/v1/opportunities/${id}`);
  },

  /**
   * 更新商机
   */
  update: async (
    id: string,
    data: UpdateOpportunityRequest,
  ): Promise<ApiResponse<Opportunity>> => {
    return apiClient.crm.put(`/api/v1/opportunities/${id}`, data);
  },

  /**
   * 删除商机
   */
  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.crm.delete(`/api/v1/opportunities/${id}`);
  },

  /**
   * 批量删除商机
   */
  batchDelete: async (ids: string[]): Promise<ApiResponse<void>> => {
    return apiClient.crm.post("/api/v1/opportunities/batch-delete", { ids });
  },
};

// ==================== Interaction API ====================

const interactionApi = {
  /**
   * 获取交互记录列表
   */
  list: async (
    params?: InteractionQueryParams,
  ): Promise<ApiResponse<PaginatedResponse<Interaction>>> => {
    return apiClient.crm.get("/api/v1/interactions", { params });
  },

  /**
   * 创建交互记录
   */
  create: async (
    data: CreateInteractionRequest,
  ): Promise<ApiResponse<Interaction>> => {
    return apiClient.crm.post("/api/v1/interactions", data);
  },

  /**
   * 获取交互记录详情
   */
  get: async (id: string): Promise<ApiResponse<Interaction>> => {
    return apiClient.crm.get(`/api/v1/interactions/${id}`);
  },

  /**
   * 更新交互记录
   */
  update: async (
    id: string,
    data: UpdateInteractionRequest,
  ): Promise<ApiResponse<Interaction>> => {
    return apiClient.crm.put(`/api/v1/interactions/${id}`, data);
  },

  /**
   * 删除交互记录
   */
  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.crm.delete(`/api/v1/interactions/${id}`);
  },

  /**
   * 批量删除交互记录
   */
  batchDelete: async (ids: string[]): Promise<ApiResponse<void>> => {
    return apiClient.crm.post("/api/v1/interactions/batch-delete", { ids });
  },
};

// ==================== CRM API Export ====================

/**
 * CRM API 统一导出
 */
export const crmApi = {
  customers: customerApi,
  contacts: contactApi,
  opportunities: opportunityApi,
  interactions: interactionApi,

  /**
   * 健康检查
   */
  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.crm.get("/health");
  },
};

// 导出独立的 API 对象供直接使用
export { customerApi, contactApi, opportunityApi, interactionApi };
