import apiClient from '../client';
import type { ApiResponse } from '../client';

/**
 * Mdm V55 API 商业化 / 计量计费 / SLA
 * 契约（svc/master-data/src/modules/commercial_v55.rs）：
 * /mdm-v55 下 23 端点；前端经 apiClient.master（/api/master-data）访问
 */

export interface APIProduct {
  id: string;
  name: string;
  tier: string;
  rate_limit_per_min: number;
  rate_limit_per_day: number;
  features: string[];
  price_monthly: number;
  active: boolean;
}

export interface Subscription {
  id: string;
  api_product_id: string;
  tenant_id: string;
  tier: string;
  starts_at: string;
  expires_at: string;
  status: string;
}

export interface UsageSummary {
  total_requests: number;
  total_errors: number;
  total_data_mb: number;
  error_rate: number;
}

export interface BillingRecord {
  id: string;
  tenant_id: string;
  period_start: string;
  period_end: string;
  tier: string;
  usage_summary: UsageSummary;
  total_amount: number;
  status: 'pending' | 'invoiced' | 'paid' | 'overdue';
}

export interface RateCard {
  id: string;
  tier: string;
  cost_per_request: number;
  cost_per_mb: number;
  overage_multiplier?: number;
  currency?: string;
}

export interface SLAConfig {
  id: string;
  metric: string;
  target_value: number;
  unit: string;
  penalty_per_min: number;
  measurement_window: number;
}

export interface SLAMeasurement {
  id: string;
  config_id: string;
  tenant_id: string;
  measured_value: number;
  target_value: number;
  met: boolean;
  measured_at: string;
  window_start: string;
  window_end: string;
}

export interface SLAIncident {
  id: string;
  config_id: string;
  tenant_id: string;
  incident_type: string;
  duration_min: number;
  impact_severity: string;
  compensation_amount: number;
  status: string;
}

export const commercialApi = {
  // ===== 产品 =====
  createProduct: async (data: {
    name: string;
    tier?: string;
    rate_limit_per_min?: number;
    rate_limit_per_day?: number;
    features?: string[];
    price_monthly?: number;
  }): Promise<ApiResponse<APIProduct>> => {
    return apiClient.master.post('/mdm-v55/products', data);
  },

  listProducts: async (): Promise<ApiResponse<APIProduct[]>> => {
    return apiClient.master.get('/mdm-v55/products');
  },

  getProduct: async (id: string): Promise<ApiResponse<APIProduct>> => {
    return apiClient.master.get(`/mdm-v55/products/${id}`);
  },

  // ===== 订阅 =====
  subscribe: async (data: {
    api_product_id: string;
    tenant_id: string;
    tier?: string;
  }): Promise<ApiResponse<Subscription>> => {
    return apiClient.master.post('/mdm-v55/subscribe', data);
  },

  listSubscriptions: async (): Promise<ApiResponse<Subscription[]>> => {
    return apiClient.master.get('/mdm-v55/subscriptions');
  },

  getSubscription: async (id: string): Promise<ApiResponse<Subscription>> => {
    return apiClient.master.get(`/mdm-v55/subscriptions/${id}`);
  },

  cancelSubscription: async (id: string): Promise<ApiResponse<{ cancelled: boolean }>> => {
    return apiClient.master.put(`/mdm-v55/subscriptions/${id}/cancel`);
  },

  upgradeSubscription: async (
    id: string,
    tier?: string
  ): Promise<ApiResponse<{ upgraded: boolean }>> => {
    return apiClient.master.put(`/mdm-v55/subscriptions/${id}/upgrade`, tier ? { tier } : {});
  },

  // ===== 用量 =====
  recordUsage: async (data: {
    tenant_id: string;
    api_product_id: string;
    endpoint: string;
    requests: number;
    errors?: number;
    data_transferred?: number;
  }): Promise<ApiResponse<UsageRecordLike>> => {
    return apiClient.master.post('/mdm-v55/usage/record', data);
  },

  getUsageSummary: async (params?: {
    tenant_id?: string;
    api_product_id?: string;
    start_time?: string;
    end_time?: string;
  }): Promise<ApiResponse<UsageSummary>> => {
    return apiClient.master.get('/mdm-v55/usage/summary', { params });
  },

  // ===== 计费 =====
  generateBill: async (data: {
    tenant_id: string;
    period_start?: string;
    period_end?: string;
  }): Promise<ApiResponse<BillingRecord>> => {
    return apiClient.master.post('/mdm-v55/bill/generate', data);
  },

  getBillingHistory: async (params?: {
    tenant_id?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<BillingRecord[]>> => {
    return apiClient.master.get('/mdm-v55/billing', { params });
  },

  createRateCard: async (data: {
    tier: string;
    cost_per_request: number;
    cost_per_mb: number;
    overage_multiplier?: number;
    currency?: string;
  }): Promise<ApiResponse<RateCard>> => {
    return apiClient.master.post('/mdm-v55/rate-cards', data);
  },

  getRateCards: async (): Promise<ApiResponse<RateCard[]>> => {
    return apiClient.master.get('/mdm-v55/rate-cards');
  },

  markBillPaid: async (billId: string): Promise<ApiResponse<{ marked: boolean }>> => {
    return apiClient.master.put(`/mdm-v55/billing/${billId}/mark-paid`);
  },

  // ===== SLA =====
  configureSla: async (data: {
    metric: string;
    target_value: number;
    unit?: string;
    penalty_per_min?: number;
    measurement_window?: number;
  }): Promise<ApiResponse<SLAConfig>> => {
    return apiClient.master.post('/mdm-v55/sla/configure', data);
  },

  measureSla: async (data: {
    config_id: string;
    tenant_id: string;
    measured_value: number;
  }): Promise<ApiResponse<SLAMeasurement>> => {
    return apiClient.master.post('/mdm-v55/sla/measure', data);
  },

  getSlaStatus: async (params?: {
    tenant_id?: string;
    config_id?: string;
  }): Promise<ApiResponse<SLAMeasurement[]>> => {
    return apiClient.master.get('/mdm-v55/sla/status', { params });
  },

  getSlaHistory: async (params?: {
    tenant_id?: string;
    config_id?: string;
    start_time?: string;
    end_time?: string;
  }): Promise<ApiResponse<SLAMeasurement[]>> => {
    return apiClient.master.get('/mdm-v55/sla/history', { params });
  },

  getSlaPenalty: async (
    configId: string,
    tenantId: string
  ): Promise<ApiResponse<{ penalty: number }>> => {
    return apiClient.master.get('/mdm-v55/sla/penalty', {
      params: { config_id: configId, tenant_id: tenantId },
    });
  },

  createIncident: async (data: {
    config_id: string;
    tenant_id: string;
    incident_type: string;
    duration_min: number;
    impact_severity?: string;
  }): Promise<ApiResponse<SLAIncident>> => {
    return apiClient.master.post('/mdm-v55/sla/incident', data);
  },

  getIncidents: async (params?: {
    tenant_id?: string;
    status?: string;
  }): Promise<ApiResponse<SLAIncident[]>> => {
    return apiClient.master.get('/mdm-v55/sla/incidents', { params });
  },

  generateSlaReport: async (params?: {
    tenant_id?: string;
    period_start?: string;
    period_end?: string;
  }): Promise<ApiResponse<{ report: unknown }>> => {
    return apiClient.master.get('/mdm-v55/sla/report', { params });
  },
};

interface UsageRecordLike {
  id: string;
  tenant_id: string;
  api_product_id: string;
  endpoint: string;
  requests: number;
  errors: number;
  data_transferred: number;
  recorded_at: string;
}

export default commercialApi;
