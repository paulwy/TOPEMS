/**
 * CRM (Customer Relationship Management) API Client
 * 客户关系管理 API 客户端
 */

import { createRequest } from '@topems/shared-utils';
import type { PaginatedResponse } from '@topems/shared-types';

const api = createRequest('/api/crm');

const unwrap = <T,>(response: unknown): T => response as T;

const requestList = async <T,>(path: string, params?: Record<string, unknown>): Promise<PaginatedResponse<T>> => {
  const response = await api.get(path, { params });
  return unwrap<PaginatedResponse<T>>(response);
};

const requestItem = async <T,>(path: string): Promise<T> => {
  const response = await api.get(path);
  return unwrap<T>(response);
};

const requestVoid = async (path: string): Promise<void> => {
  await api.delete(path);
};

// ==================== Types ====================

export interface Customer {
  id: string;
  name: string;
  code?: string;
  industry?: string;
  company_size?: string;
  website?: string;
  email?: string;
  phone?: string;
  fax?: string;
  address?: string;
  city?: string;
  province?: string;
  country?: string;
  postal_code?: string;
  status: string;
  customer_type?: string;
  source?: string;
  rating?: string;
  revenue?: number;
  employee_count?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomerRequest {
  name: string;
  code?: string;
  industry?: string;
  company_size?: string;
  website?: string;
  email?: string;
  phone?: string;
  fax?: string;
  address?: string;
  city?: string;
  province?: string;
  country?: string;
  postal_code?: string;
  customer_type?: string;
  source?: string;
  rating?: string;
  revenue?: number;
  employee_count?: number;
  notes?: string;
}

export interface UpdateCustomerRequest {
  name?: string;
  code?: string;
  industry?: string;
  company_size?: string;
  website?: string;
  email?: string;
  phone?: string;
  fax?: string;
  address?: string;
  city?: string;
  province?: string;
  country?: string;
  postal_code?: string;
  status?: string;
  customer_type?: string;
  source?: string;
  rating?: string;
  revenue?: number;
  employee_count?: number;
  notes?: string;
}

export interface CustomerQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  customer_type?: string;
  rating?: string;
  industry?: string;
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

export interface ContactQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  customer_id?: string;
}

/**
 * 销售机会
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

export interface OpportunityQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  stage?: string;
  customer_id?: string;
}

export interface FunnelStage {
  stage: string;
  stage_label: string;
  count: number;
  total_value?: number;
  avg_probability?: number;
}

export interface OpportunityStats {
  total_count: number;
  total_value?: number;
  weighted_value?: number;
  won_count: number;
  won_value?: number;
  lost_count: number;
  lost_value?: number;
}

export interface OpportunityForecast {
  forecast_month: string;
  forecast_value: number;
  opportunity_count: number;
  avg_probability: number;
}

/**
 * 客户评分
 */
export interface CustomerScore {
  id: string;
  customer_id: string;
  customer_name: string;
  score: number;
  score_level: string;
  scoring_date: string;
  factors: ScoreFactor[];
  trend: 'up' | 'down' | 'stable';
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

export interface CustomerScoringQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  customer_id?: string;
  score_level?: string;
}

/**
 * 销售预测
 */
export interface SalesForecast {
  id: string;
  period_type: 'monthly' | 'quarterly' | 'yearly';
  period: string;
  predicted_amount: number;
  actual_amount?: number;
  accuracy?: number;
  trend: 'up' | 'down' | 'stable';
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
  period_type: 'monthly' | 'quarterly' | 'yearly';
  period: string;
}

export interface SalesForecastQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  period_type?: string;
  status?: string;
}

/**
 * 互动记录
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

export interface InteractionQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  customer_id?: string;
  contact_id?: string;
}

/**
 * 计费
 */
export interface BillingRecord {
  id: string;
  customer_id: string;
  customer_name: string;
  invoice_no: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
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

export interface BillingQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  customer_id?: string;
  status?: string;
}

/**
 * 仪表盘汇总
 */
export interface DashboardSummary {
  total_customers: number;
  active_customers: number;
  total_opportunities: number;
  total_pipeline_value: number;
  total_revenue: number;
  pending_billing: number;
  overdue_billing: number;
  recent_interactions: number;
  top_customers: Customer[];
  upcoming_interactions: Interaction[];
}

// ==================== Customer API ====================

const customerApi = {
  list: (params?: CustomerQueryParams) => requestList<Customer>('/customers', params as Record<string, unknown>),
  get: (id: string) => requestItem<Customer>(`/customers/${id}`),
  create: async (data: CreateCustomerRequest): Promise<Customer> => {
    const response = await api.post('/customers', data);
    return unwrap<Customer>(response);
  },
  update: async (id: string, data: UpdateCustomerRequest): Promise<Customer> => {
    const response = await api.put(`/customers/${id}`, data);
    return unwrap<Customer>(response);
  },
  delete: (id: string) => requestVoid(`/customers/${id}`),
  batchDelete: async (ids: string[]): Promise<void> => {
    await api.post('/customers/batch-delete', { ids });
  },
};

// ==================== Contact API ====================

const contactApi = {
  list: (params?: ContactQueryParams) => requestList<Contact>('/contacts', params as Record<string, unknown>),
  get: (id: string) => requestItem<Contact>(`/contacts/${id}`),
  create: async (data: CreateContactRequest): Promise<Contact> => {
    const response = await api.post('/contacts', data);
    return unwrap<Contact>(response);
  },
  update: async (id: string, data: UpdateContactRequest): Promise<Contact> => {
    const response = await api.put(`/contacts/${id}`, data);
    return unwrap<Contact>(response);
  },
  delete: (id: string) => requestVoid(`/contacts/${id}`),
  batchDelete: async (ids: string[]): Promise<void> => {
    await api.post('/contacts/batch-delete', { ids });
  },
};

// ==================== Opportunity API ====================

const opportunityApi = {
  list: (params?: OpportunityQueryParams) =>
    requestList<Opportunity>('/opportunities', params as Record<string, unknown>),
  get: (id: string) => requestItem<Opportunity>(`/opportunities/${id}`),
  create: async (data: CreateOpportunityRequest): Promise<Opportunity> => {
    const response = await api.post('/opportunities', data);
    return unwrap<Opportunity>(response);
  },
  update: async (id: string, data: UpdateOpportunityRequest): Promise<Opportunity> => {
    const response = await api.put(`/opportunities/${id}`, data);
    return unwrap<Opportunity>(response);
  },
  delete: (id: string) => requestVoid(`/opportunities/${id}`),
  batchDelete: async (ids: string[]): Promise<void> => {
    await api.post('/opportunities/batch-delete', { ids });
  },
  getFunnel: () => requestItem<FunnelStage[]>('/opportunities/funnel'),
  getStats: () => requestItem<OpportunityStats>('/opportunities/stats'),
  getForecast: async (params?: { months?: number }): Promise<OpportunityForecast[]> => {
    const response = await api.get('/opportunities/forecast', { params });
    return unwrap<OpportunityForecast[]>(response);
  },
};

// ==================== Customer Scoring API ====================

const customerScoringApi = {
  list: (params?: CustomerScoringQueryParams) =>
    requestList<CustomerScore>('/customer-scoring', params as Record<string, unknown>),
  get: (id: string) => requestItem<CustomerScore>(`/customer-scoring/${id}`),
  create: async (data: CreateCustomerScoreRequest): Promise<CustomerScore> => {
    const response = await api.post('/customer-scoring', data);
    return unwrap<CustomerScore>(response);
  },
  update: async (id: string, data: Partial<CreateCustomerScoreRequest>): Promise<CustomerScore> => {
    const response = await api.put(`/customer-scoring/${id}`, data);
    return unwrap<CustomerScore>(response);
  },
  delete: (id: string) => requestVoid(`/customer-scoring/${id}`),
  calculateBatch: async (customerIds: string[]): Promise<CustomerScore[]> => {
    const response = await api.post('/customer-scoring/calculate', {
      customer_ids: customerIds,
    });
    return unwrap<CustomerScore[]>(response);
  },
};

// ==================== Sales Forecast API ====================

const salesForecastApi = {
  list: (params?: SalesForecastQueryParams) =>
    requestList<SalesForecast>('/sales-forecast', params as Record<string, unknown>),
  get: (id: string) => requestItem<SalesForecast>(`/sales-forecast/${id}`),
  create: async (data: CreateSalesForecastRequest): Promise<SalesForecast> => {
    const response = await api.post('/sales-forecast', data);
    return unwrap<SalesForecast>(response);
  },
  update: async (id: string, data: Partial<SalesForecast>): Promise<SalesForecast> => {
    const response = await api.put(`/sales-forecast/${id}`, data);
    return unwrap<SalesForecast>(response);
  },
  delete: (id: string) => requestVoid(`/sales-forecast/${id}`),
  generate: async (data: CreateSalesForecastRequest): Promise<SalesForecast> => {
    const response = await api.post('/sales-forecast/generate', data);
    return unwrap<SalesForecast>(response);
  },
};

// ==================== Interaction API ====================

const interactionApi = {
  list: (params?: InteractionQueryParams) =>
    requestList<Interaction>('/interactions', params as Record<string, unknown>),
  get: (id: string) => requestItem<Interaction>(`/interactions/${id}`),
  create: async (data: CreateInteractionRequest): Promise<Interaction> => {
    const response = await api.post('/interactions', data);
    return unwrap<Interaction>(response);
  },
  update: async (id: string, data: UpdateInteractionRequest): Promise<Interaction> => {
    const response = await api.put(`/interactions/${id}`, data);
    return unwrap<Interaction>(response);
  },
  delete: (id: string) => requestVoid(`/interactions/${id}`),
  batchDelete: async (ids: string[]): Promise<void> => {
    await api.post('/interactions/batch-delete', { ids });
  },
};

// ==================== Billing API ====================

const billingApi = {
  list: (params?: BillingQueryParams) =>
    requestList<BillingRecord>('/billing', params as Record<string, unknown>),
  get: (id: string) => requestItem<BillingRecord>(`/billing/${id}`),
  create: async (data: CreateBillingRequest): Promise<BillingRecord> => {
    const response = await api.post('/billing', data);
    return unwrap<BillingRecord>(response);
  },
  update: async (id: string, data: Partial<BillingRecord>): Promise<BillingRecord> => {
    const response = await api.put(`/billing/${id}`, data);
    return unwrap<BillingRecord>(response);
  },
  delete: (id: string) => requestVoid(`/billing/${id}`),
  markPaid: async (id: string): Promise<BillingRecord> => {
    const response = await api.post(`/billing/${id}/paid`);
    return unwrap<BillingRecord>(response);
  },
  sendNotification: async (id: string): Promise<void> => {
    await api.post(`/billing/${id}/notify`);
  },
};

// ==================== Dashboard API ====================

const dashboardApi = {
  summary: () => requestItem<DashboardSummary>('/dashboard/summary'),
  recentActivity: () => requestItem<Interaction[]>('/dashboard/recent-activity'),
  pipeline: () => requestItem<FunnelStage[]>('/dashboard/pipeline'),
};

// ==================== CRM API Export ====================

/**
 * CRM API 统一导出
 */
export const crmApi = {
  customers: customerApi,
  contacts: contactApi,
  opportunities: opportunityApi,
  customerScoring: customerScoringApi,
  salesForecast: salesForecastApi,
  interactions: interactionApi,
  billing: billingApi,
  dashboard: dashboardApi,

  /**
   * 健康检查
   */
  health: async (): Promise<string> => {
    const response = await api.get('/health');
    return unwrap<string>(response);
  },
};

// 导出独立的 API 对象供直接使用
export {
  customerApi,
  contactApi,
  opportunityApi,
  customerScoringApi,
  salesForecastApi,
  interactionApi,
  billingApi,
  dashboardApi,
};
