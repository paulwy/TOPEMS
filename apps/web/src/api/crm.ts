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
    return apiClient.crm.get(`/api/plugins/crm/api/crm/customers/${id}`);
  },

  /**
   * 更新客户
   */
  update: async (
    id: string,
    data: UpdateCustomerRequest,
  ): Promise<ApiResponse<Customer>> => {
    return apiClient.crm.put(`/api/plugins/crm/api/crm/customers/${id}`, data);
  },

  /**
   * 删除客户
   */
  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.crm.delete(`/api/plugins/crm/api/crm/customers/${id}`);
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
    return apiClient.crm.get(`/api/plugins/crm/api/crm/contacts/${id}`);
  },

  /**
   * 更新联系人
   */
  update: async (
    id: string,
    data: UpdateContactRequest,
  ): Promise<ApiResponse<Contact>> => {
    return apiClient.crm.put(`/api/plugins/crm/api/crm/contacts/${id}`, data);
  },

  /**
   * 删除联系人
   */
  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.crm.delete(`/api/plugins/crm/api/crm/contacts/${id}`);
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
    return apiClient.crm.get(`/api/plugins/crm/api/crm/opportunities/${id}`);
  },

  /**
   * 更新商机
   */
  update: async (
    id: string,
    data: UpdateOpportunityRequest,
  ): Promise<ApiResponse<Opportunity>> => {
    return apiClient.crm.put(`/api/plugins/crm/api/crm/opportunities/${id}`, data);
  },

  /**
   * 删除商机
   */
  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.crm.delete(`/api/plugins/crm/api/crm/opportunities/${id}`);
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
    return apiClient.crm.get(`/api/plugins/crm/api/crm/interactions/${id}`);
  },

  /**
   * 更新交互记录
   */
  update: async (
    id: string,
    data: UpdateInteractionRequest,
  ): Promise<ApiResponse<Interaction>> => {
    return apiClient.crm.put(`/api/plugins/crm/api/crm/interactions/${id}`, data);
  },

  /**
   * 删除交互记录
   */
  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.crm.delete(`/api/plugins/crm/api/crm/interactions/${id}`);
  },

  /**
   * 批量删除交互记录
   */
  batchDelete: async (ids: string[]): Promise<ApiResponse<void>> => {
    return apiClient.crm.post("/api/v1/interactions/batch-delete", { ids });
  },
};

// ==================== Customer Scoring API ====================

export interface CustomerScore {
  id: string;
  customer_id: string;
  customer_name: string;
  score: number;
  score_level: string;
  scoring_date: string;
  factors: ScoreFactor[];
  trend: "up" | "down" | "stable";
  last_score?: number;
  created_at: string;
  updated_at: string;
}

export interface ScoreFactor {
  name: string;
  weight: number;
  score: number;
  max_score: number;
}

export interface CreateCustomerScoreRequest {
  customer_id: string;
  score?: number;
  score_level?: string;
}

export interface CustomerScoringQueryParams extends PaginationParams {
  customer_id?: string;
  score_level?: string;
}

const customerScoringApi = {
  /**
   * 获取客户评分列表
   */
  list: async (
    params?: CustomerScoringQueryParams,
  ): Promise<ApiResponse<PaginatedResponse<CustomerScore>>> => {
    return apiClient.crm.get("/api/v1/customer-scoring", { params });
  },

  /**
   * 获取客户评分详情
   */
  get: async (id: string): Promise<ApiResponse<CustomerScore>> => {
    return apiClient.crm.get(`/api/plugins/crm/api/crm/customer-scoring/${id}`);
  },

  /**
   * 创建客户评分
   */
  create: async (
    data: CreateCustomerScoreRequest,
  ): Promise<ApiResponse<CustomerScore>> => {
    return apiClient.crm.post("/api/v1/customer-scoring", data);
  },

  /**
   * 更新客户评分
   */
  update: async (
    id: string,
    data: Partial<CreateCustomerScoreRequest>,
  ): Promise<ApiResponse<CustomerScore>> => {
    return apiClient.crm.put(`/api/plugins/crm/api/crm/customer-scoring/${id}`, data);
  },

  /**
   * 删除客户评分
   */
  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.crm.delete(`/api/plugins/crm/api/crm/customer-scoring/${id}`);
  },

  /**
   * 批量计算客户评分
   */
  calculateBatch: async (
    customerIds: string[],
  ): Promise<ApiResponse<CustomerScore[]>> => {
    return apiClient.crm.post("/api/v1/customer-scoring/calculate", {
      customer_ids: customerIds,
    });
  },
};

// ==================== Sales Forecast API ====================

export interface SalesForecast {
  id: string;
  period_type: "monthly" | "quarterly" | "yearly";
  period: string;
  predicted_amount: number;
  actual_amount?: number;
  accuracy?: number;
  trend: "up" | "down" | "stable";
  confidence_level: number;
  factors: ForecastFactor[];
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ForecastFactor {
  name: string;
  impact: number;
  description?: string;
}

export interface CreateSalesForecastRequest {
  period_type: "monthly" | "quarterly" | "yearly";
  period: string;
}

export interface SalesForecastQueryParams extends PaginationParams {
  period_type?: string;
  status?: string;
}

const salesForecastApi = {
  /**
   * 获取销售预测列表
   */
  list: async (
    params?: SalesForecastQueryParams,
  ): Promise<ApiResponse<PaginatedResponse<SalesForecast>>> => {
    return apiClient.crm.get("/api/v1/sales-forecast", { params });
  },

  /**
   * 获取销售预测详情
   */
  get: async (id: string): Promise<ApiResponse<SalesForecast>> => {
    return apiClient.crm.get(`/api/plugins/crm/api/crm/sales-forecast/${id}`);
  },

  /**
   * 创建销售预测
   */
  create: async (
    data: CreateSalesForecastRequest,
  ): Promise<ApiResponse<SalesForecast>> => {
    return apiClient.crm.post("/api/v1/sales-forecast", data);
  },

  /**
   * 更新销售预测
   */
  update: async (
    id: string,
    data: Partial<SalesForecast>,
  ): Promise<ApiResponse<SalesForecast>> => {
    return apiClient.crm.put(`/api/plugins/crm/api/crm/sales-forecast/${id}`, data);
  },

  /**
   * 删除销售预测
   */
  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.crm.delete(`/api/plugins/crm/api/crm/sales-forecast/${id}`);
  },

  /**
   * 生成预测
   */
  generate: async (
    data: CreateSalesForecastRequest,
  ): Promise<ApiResponse<SalesForecast>> => {
    return apiClient.crm.post("/api/v1/sales-forecast/generate", data);
  },
};

// ==================== Billing API ====================

export interface BillingRecord {
  id: string;
  customer_id: string;
  customer_name: string;
  invoice_no: string;
  amount: number;
  currency: string;
  status: "pending" | "paid" | "overdue" | "cancelled";
  due_date: string;
  paid_at?: string;
  items: BillingItem[];
  created_at: string;
  updated_at: string;
}

export interface BillingItem {
  id?: string;
  name: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface CreateBillingRequest {
  customer_id: string;
  invoice_no?: string;
  amount: number;
  currency?: string;
  due_date: string;
  items: BillingItem[];
}

export interface BillingQueryParams extends PaginationParams {
  customer_id?: string;
  status?: string;
}

const billingApi = {
  /**
   * 获取账单列表
   */
  list: async (
    params?: BillingQueryParams,
  ): Promise<ApiResponse<PaginatedResponse<BillingRecord>>> => {
    return apiClient.crm.get("/api/v1/billing", { params });
  },

  /**
   * 获取账单详情
   */
  get: async (id: string): Promise<ApiResponse<BillingRecord>> => {
    return apiClient.crm.get(`/api/plugins/crm/api/crm/billing/${id}`);
  },

  /**
   * 创建账单
   */
  create: async (
    data: CreateBillingRequest,
  ): Promise<ApiResponse<BillingRecord>> => {
    return apiClient.crm.post("/api/v1/billing", data);
  },

  /**
   * 更新账单
   */
  update: async (
    id: string,
    data: Partial<BillingRecord>,
  ): Promise<ApiResponse<BillingRecord>> => {
    return apiClient.crm.put(`/api/plugins/crm/api/crm/billing/${id}`, data);
  },

  /**
   * 删除账单
   */
  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.crm.delete(`/api/plugins/crm/api/crm/billing/${id}`);
  },

  /**
   * 标记账单已支付
   */
  markPaid: async (id: string): Promise<ApiResponse<BillingRecord>> => {
    return apiClient.crm.post(`/api/plugins/crm/api/crm/billing/${id}/paid`);
  },

  /**
   * 发送账单通知
   */
  sendNotification: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.crm.post(`/api/plugins/crm/api/crm/billing/${id}/notify`);
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
  customerScoring: customerScoringApi,
  salesForecast: salesForecastApi,
  billing: billingApi,

  /**
   * 健康检查
   */
  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.crm.get("/health");
  },
};

// 导出独立的 API 对象供直接使用
export {
  customerApi,
  contactApi,
  opportunityApi,
  interactionApi,
  customerScoringApi,
  salesForecastApi,
  billingApi,
};
