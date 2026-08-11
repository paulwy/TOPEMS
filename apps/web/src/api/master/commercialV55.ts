import apiClient from '../client';
import type { ApiResponse } from '../client';

// ============ Types ============

export type ProductTier = 'free' | 'basic' | 'professional' | 'enterprise' | 'unlimited';
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'pending';
export type BillingStatus = 'pending' | 'invoiced' | 'paid' | 'overdue';
export type SLAMetric = 'availability' | 'latency' | 'error_rate';
export type SLAIncidentType = 'downtime' | 'degraded_performance' | 'data_loss' | 'security_breach';
export type IncidentStatus = 'open' | 'investigating' | 'resolved' | 'closed';
export type ImpactSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface APIProduct {
  id: string;
  name: string;
  tier: ProductTier;
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
  tier: ProductTier;
  starts_at: string;
  expires_at: string;
  status: SubscriptionStatus;
}

export interface UsageRecord {
  id: string;
  tenant_id: string;
  api_product_id: string;
  endpoint: string;
  requests: number;
  errors: number;
  data_transferred: number;
  recorded_at: string;
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
  tier: ProductTier;
  usage_summary: UsageSummary;
  total_amount: number;
  status: BillingStatus;
}

export interface RateCard {
  id: string;
  tier: ProductTier;
  cost_per_request: number;
  cost_per_mb: number;
  overage_multiplier: number;
  currency: string;
}

export interface SLAConfig {
  id: string;
  metric: SLAMetric;
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
  incident_type: SLAIncidentType;
  duration_min: number;
  impact_severity: ImpactSeverity;
  compensation_amount: number;
  status: IncidentStatus;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface SLAStatusInfo {
  config_id: string;
  metric: string;
  target_value: number;
  unit: string;
  measurements_count: number;
  met_count: number;
  pass_rate: number;
  current_status: string;
}

export interface SLAReport {
  report_id: string;
  generated_at: string;
  tenant_id: string;
  period: {
    start: string;
    end: string;
  };
  config_summaries: Array<{
    config_id: string;
    metric: string;
    target_value: number;
    unit: string;
    measurements_count: number;
    met_count: number;
    pass_rate: number;
    incidents_count: number;
    total_duration_min: number;
  }>;
  total_breaches: number;
  total_compensation: number;
  overall_status: string;
}

// ============ Request Types ============

export interface CreateAPIProductRequest {
  name: string;
  tier?: ProductTier;
  rate_limit_per_min?: number;
  rate_limit_per_day?: number;
  features?: string[];
  price_monthly?: number;
}

export interface SubscribeTenantRequest {
  api_product_id: string;
  tenant_id: string;
  tier?: ProductTier;
}

export interface UpdateSubscriptionRequest {
  tier?: ProductTier;
}

export interface RecordUsageRequest {
  tenant_id: string;
  api_product_id: string;
  endpoint: string;
  requests: number;
  errors?: number;
  data_transferred?: number;
}

export interface GenerateBillRequest {
  tenant_id: string;
  period_start?: string;
  period_end?: string;
}

export interface CreateRateCardRequest {
  tier: ProductTier;
  cost_per_request: number;
  cost_per_mb: number;
  overage_multiplier?: number;
  currency?: string;
}

export interface ConfigureSLARequest {
  metric: SLAMetric;
  target_value: number;
  unit?: string;
  penalty_per_min?: number;
  measurement_window?: number;
}

export interface MeasureSLARequest {
  config_id: string;
  tenant_id: string;
  measured_value: number;
}

export interface CreateSLAIncidentRequest {
  config_id: string;
  tenant_id: string;
  incident_type: SLAIncidentType;
  duration_min: number;
  impact_severity?: ImpactSeverity;
}

// ============ API ============

export const commercialApiV55 = {
  // ===== API 商业化 - 产品管理 =====
  async createAPIProduct(data: CreateAPIProductRequest): Promise<ApiResponse<APIProduct>> {
    return apiClient.master.post<APIProduct>('/mdm-v55/products', data);
  },

  async listAPIProducts(): Promise<ApiResponse<APIProduct[]>> {
    return apiClient.master.get<APIProduct[]>('/mdm-v55/products');
  },

  async getAPIProduct(id: string): Promise<ApiResponse<APIProduct>> {
    return apiClient.master.get<APIProduct>(`/mdm-v55/products/${id}`);
  },

  // ===== API 商业化 - 订阅管理 =====
  async subscribeTenant(data: SubscribeTenantRequest): Promise<ApiResponse<Subscription>> {
    return apiClient.master.post<Subscription>('/mdm-v55/subscribe', data);
  },

  async listSubscriptions(params?: {
    tenant_id?: string;
    api_product_id?: string;
  }): Promise<ApiResponse<Subscription[]>> {
    const qs = new URLSearchParams();
    if (params?.tenant_id) qs.set('tenant_id', params.tenant_id);
    if (params?.api_product_id) qs.set('api_product_id', params.api_product_id);
    const s = qs.toString();
    return apiClient.master.get<Subscription[]>(`/mdm-v55/subscriptions${s ? `?${s}` : ''}`);
  },

  async getSubscription(id: string): Promise<ApiResponse<Subscription>> {
    return apiClient.master.get<Subscription>(`/mdm-v55/subscriptions/${id}`);
  },

  async cancelSubscription(id: string): Promise<ApiResponse<Subscription>> {
    return apiClient.master.put<Subscription>(`/mdm-v55/subscriptions/${id}/cancel`, {});
  },

  async upgradeTier(id: string, data?: UpdateSubscriptionRequest): Promise<ApiResponse<Subscription>> {
    return apiClient.master.put<Subscription>(`/mdm-v55/subscriptions/${id}/upgrade`, data || {});
  },

  // ===== 计量计费 - 使用记录 =====
  async recordUsage(data: RecordUsageRequest): Promise<ApiResponse<UsageRecord>> {
    return apiClient.master.post<UsageRecord>('/mdm-v55/usage/record', data);
  },

  async getUsageSummary(params?: {
    tenant_id?: string;
    api_product_id?: string;
    start_time?: string;
    end_time?: string;
  }): Promise<ApiResponse<UsageSummary>> {
    const qs = new URLSearchParams();
    if (params?.tenant_id) qs.set('tenant_id', params.tenant_id);
    if (params?.api_product_id) qs.set('api_product_id', params.api_product_id);
    if (params?.start_time) qs.set('start_time', params.start_time);
    if (params?.end_time) qs.set('end_time', params.end_time);
    const s = qs.toString();
    return apiClient.master.get<UsageSummary>(`/mdm-v55/usage/summary${s ? `?${s}` : ''}`);
  },

  // ===== 计量计费 - 账单管理 =====
  async generateBill(data: GenerateBillRequest): Promise<ApiResponse<BillingRecord>> {
    return apiClient.master.post<BillingRecord>('/mdm-v55/bill/generate', data);
  },

  async getBillingHistory(params?: {
    tenant_id?: string;
    status?: BillingStatus;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<PaginatedResponse<BillingRecord>>> {
    const qs = new URLSearchParams();
    if (params?.tenant_id) qs.set('tenant_id', params.tenant_id);
    if (params?.status) qs.set('status', params.status);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('page_size', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<PaginatedResponse<BillingRecord>>(`/mdm-v55/billing${s ? `?${s}` : ''}`);
  },

  async markBillPaid(id: string): Promise<ApiResponse<BillingRecord>> {
    return apiClient.master.put<BillingRecord>(`/mdm-v55/billing/${id}/mark-paid`, {});
  },

  // ===== 计量计费 - 费率卡 =====
  async createRateCard(data: CreateRateCardRequest): Promise<ApiResponse<RateCard>> {
    return apiClient.master.post<RateCard>('/mdm-v55/rate-cards', data);
  },

  async getRateCards(): Promise<ApiResponse<RateCard[]>> {
    return apiClient.master.get<RateCard[]>('/mdm-v55/rate-cards');
  },

  async updateRateCard(id: string, data: CreateRateCardRequest): Promise<ApiResponse<RateCard>> {
    return apiClient.master.put<RateCard>(`/mdm-v55/rate-cards/${id}`, data);
  },

  async deleteRateCard(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiClient.master.delete<{ deleted: boolean }>(`/mdm-v55/rate-cards/${id}`);
  },

  // ===== SLA 保障 - 配置与度量 =====
  async configureSLA(data: ConfigureSLARequest): Promise<ApiResponse<SLAConfig>> {
    return apiClient.master.post<SLAConfig>('/mdm-v55/sla/configure', data);
  },

  async measureSLA(data: MeasureSLARequest): Promise<ApiResponse<SLAMeasurement>> {
    return apiClient.master.post<SLAMeasurement>('/mdm-v55/sla/measure', data);
  },

  async getSLAStatus(params?: {
    tenant_id?: string;
    config_id?: string;
  }): Promise<ApiResponse<{ sla_statuses: SLAStatusInfo[] }>> {
    const qs = new URLSearchParams();
    if (params?.tenant_id) qs.set('tenant_id', params.tenant_id);
    if (params?.config_id) qs.set('config_id', params.config_id);
    const s = qs.toString();
    return apiClient.master.get<{ sla_statuses: SLAStatusInfo[] }>(`/mdm-v55/sla/status${s ? `?${s}` : ''}`);
  },

  async getSLAHistory(params?: {
    tenant_id?: string;
    config_id?: string;
    start_time?: string;
    end_time?: string;
  }): Promise<ApiResponse<SLAMeasurement[]>> {
    const qs = new URLSearchParams();
    if (params?.tenant_id) qs.set('tenant_id', params.tenant_id);
    if (params?.config_id) qs.set('config_id', params.config_id);
    if (params?.start_time) qs.set('start_time', params.start_time);
    if (params?.end_time) qs.set('end_time', params.end_time);
    const s = qs.toString();
    return apiClient.master.get<SLAMeasurement[]>(`/mdm-v55/sla/history${s ? `?${s}` : ''}`);
  },

  async calculatePenalty(configId: string, tenantId: string): Promise<ApiResponse<{
    config_id: string;
    tenant_id: string;
    breach_count: number;
    penalty_per_min: number;
    total_penalty: number;
    currency: string;
  }>> {
    const qs = new URLSearchParams();
    qs.set('config_id', configId);
    qs.set('tenant_id', tenantId);
    return apiClient.master.get<{
      config_id: string;
      tenant_id: string;
      breach_count: number;
      penalty_per_min: number;
      total_penalty: number;
      currency: string;
    }>(`/mdm-v55/sla/penalty?${qs.toString()}`);
  },

  // ===== SLA 保障 - 事故管理 =====
  async createIncident(data: CreateSLAIncidentRequest): Promise<ApiResponse<SLAIncident>> {
    return apiClient.master.post<SLAIncident>('/mdm-v55/sla/incident', data);
  },

  async getIncidents(params?: {
    tenant_id?: string;
    status?: IncidentStatus;
  }): Promise<ApiResponse<SLAIncident[]>> {
    const qs = new URLSearchParams();
    if (params?.tenant_id) qs.set('tenant_id', params.tenant_id);
    if (params?.status) qs.set('status', params.status);
    const s = qs.toString();
    return apiClient.master.get<SLAIncident[]>(`/mdm-v55/sla/incidents${s ? `?${s}` : ''}`);
  },

  async generateSLAReport(params?: {
    tenant_id?: string;
    period_start?: string;
    period_end?: string;
  }): Promise<ApiResponse<SLAReport>> {
    const qs = new URLSearchParams();
    if (params?.tenant_id) qs.set('tenant_id', params.tenant_id);
    if (params?.period_start) qs.set('period_start', params.period_start);
    if (params?.period_end) qs.set('period_end', params.period_end);
    const s = qs.toString();
    return apiClient.master.get<SLAReport>(`/mdm-v55/sla/report${s ? `?${s}` : ''}`);
  },

  async getIncident(id: string): Promise<ApiResponse<SLAIncident>> {
    return apiClient.master.get<SLAIncident>(`/mdm-v55/sla/incidents/${id}`);
  },

  async updateIncident(id: string, data: { status?: IncidentStatus }): Promise<ApiResponse<SLAIncident>> {
    return apiClient.master.put<SLAIncident>(`/mdm-v55/sla/incidents/${id}`, data);
  },

  async getSLADashboard(params?: {
    tenant_id?: string;
  }): Promise<ApiResponse<{
    total_configs: number;
    active_incidents: number;
    pass_rate_avg: number;
    compensation_total: number;
  }>> {
    const qs = new URLSearchParams();
    if (params?.tenant_id) qs.set('tenant_id', params.tenant_id);
    const s = qs.toString();
    return apiClient.master.get<{
      total_configs: number;
      active_incidents: number;
      pass_rate_avg: number;
      compensation_total: number;
    }>(`/mdm-v55/sla/dashboard${s ? `?${s}` : ''}`);
  },

  async listAPIProductsPaginated(params?: {
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<PaginatedResponse<APIProduct>>> {
    const qs = new URLSearchParams();
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('page_size', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<PaginatedResponse<APIProduct>>(`/mdm-v55/products/paginated${s ? `?${s}` : ''}`);
  },

  async updateAPIProduct(id: string, data: Partial<CreateAPIProductRequest>): Promise<ApiResponse<APIProduct>> {
    return apiClient.master.put<APIProduct>(`/mdm-v55/products/${id}`, data);
  },

  async deleteAPIProduct(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiClient.master.delete<{ deleted: boolean }>(`/mdm-v55/products/${id}`);
  },

  async listUsageRecords(params?: {
    tenant_id?: string;
    api_product_id?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<PaginatedResponse<UsageRecord>>> {
    const qs = new URLSearchParams();
    if (params?.tenant_id) qs.set('tenant_id', params.tenant_id);
    if (params?.api_product_id) qs.set('api_product_id', params.api_product_id);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('page_size', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<PaginatedResponse<UsageRecord>>(`/mdm-v55/usage/records${s ? `?${s}` : ''}`);
  },

  async updateSubscription(id: string, data: Partial<UpdateSubscriptionRequest>): Promise<ApiResponse<Subscription>> {
    return apiClient.master.put<Subscription>(`/mdm-v55/subscriptions/${id}`, data);
  },

  async getBilling(id: string): Promise<ApiResponse<BillingRecord>> {
    return apiClient.master.get<BillingRecord>(`/mdm-v55/billing/${id}`);
  },
};

export default commercialApiV55;
