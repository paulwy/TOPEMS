import { apiClient } from '../client';
import type { ApiResponse } from '../client';

export interface FunnelStage {
  stage: string;
  count: number;
  total_value: number;
  avg_value: number;
  probability?: number;
}

export interface FunnelMetrics {
  total_opportunities: number;
  total_value: number;
  avg_value: number;
  conversion_rate: number;
  weighted_value: number;
}

export interface FunnelConversion {
  from_stage: string;
  to_stage: string;
  conversion_count: number;
  conversion_rate: number;
}

export interface FunnelTrend {
  period: string;
  stage: string;
  count: number;
  value: number;
}

export interface FunnelQueryParams {
  page?: number;
  page_size?: number;
  stage?: string;
  period_type?: string;
  start_date?: string;
  end_date?: string;
}

export const salesFunnelApi = {
  async getFunnelData(params?: FunnelQueryParams): Promise<ApiResponse<FunnelStage[]>> {
    const qs = new URLSearchParams();
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.page_size !== undefined) qs.set('page_size', String(params.page_size));
    if (params?.stage) qs.set('stage', params.stage);
    if (params?.period_type) qs.set('period_type', params.period_type);
    if (params?.start_date) qs.set('start_date', params.start_date);
    if (params?.end_date) qs.set('end_date', params.end_date);
    const s = qs.toString();
    return apiClient.crm.get<FunnelStage[]>(`/sales-funnel${s ? `?${s}` : ''}`);
  },

  async getFunnelMetrics(params?: FunnelQueryParams): Promise<ApiResponse<FunnelMetrics>> {
    const qs = new URLSearchParams();
    if (params?.period_type) qs.set('period_type', params.period_type);
    if (params?.start_date) qs.set('start_date', params.start_date);
    if (params?.end_date) qs.set('end_date', params.end_date);
    const s = qs.toString();
    return apiClient.crm.get<FunnelMetrics>(`/sales-funnel/metrics${s ? `?${s}` : ''}`);
  },

  async getFunnelConversion(params?: FunnelQueryParams): Promise<ApiResponse<FunnelConversion[]>> {
    const qs = new URLSearchParams();
    if (params?.period_type) qs.set('period_type', params.period_type);
    if (params?.start_date) qs.set('start_date', params.start_date);
    if (params?.end_date) qs.set('end_date', params.end_date);
    const s = qs.toString();
    return apiClient.crm.get<FunnelConversion[]>(`/sales-funnel/conversion${s ? `?${s}` : ''}`);
  },

  async getFunnelTrend(params?: FunnelQueryParams): Promise<ApiResponse<FunnelTrend[]>> {
    const qs = new URLSearchParams();
    if (params?.period_type) qs.set('period_type', params.period_type);
    if (params?.start_date) qs.set('start_date', params.start_date);
    if (params?.end_date) qs.set('end_date', params.end_date);
    const s = qs.toString();
    return apiClient.crm.get<FunnelTrend[]>(`/sales-funnel/trend${s ? `?${s}` : ''}`);
  },

  async getStageOpportunities(stage: string, params?: FunnelQueryParams): Promise<ApiResponse<unknown[]>> {
    const qs = new URLSearchParams();
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.page_size !== undefined) qs.set('page_size', String(params.page_size));
    if (params?.start_date) qs.set('start_date', params.start_date);
    if (params?.end_date) qs.set('end_date', params.end_date);
    const s = qs.toString();
    return apiClient.crm.get<unknown[]>(`/sales-funnel/stage/${stage}${s ? `?${s}` : ''}`);
  },
};
