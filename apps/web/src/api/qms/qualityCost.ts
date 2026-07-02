import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  QualityCost,
  CreateQualityCostRequest,
  QualityCostBackend,
  UpdateQualityCostRequestBackend,
  CostStatistics,
  CostStatisticsBackend,
  CostTrendItem,
  CostTrendItemBackend,
} from './types';
import {
  adaptQualityCostToFrontend,
  adaptQualityCostToBackend,
  adaptCostStatisticsToFrontend,
  adaptCostTrendItemToFrontend,
} from './adapters';

export const qualityCostApi = {
  listQualityCosts: async (): Promise<ApiResponse<QualityCost[]>> => {
    const response = await apiClient.qms.get<{ costs?: QualityCostBackend[] }>('/quality-costs');
    const adaptedData = (response.data?.costs || []).map(adaptQualityCostToFrontend);
    return { ...response, data: adaptedData };
  },

  getQualityCost: async (id: string): Promise<ApiResponse<QualityCost>> => {
    const response = await apiClient.qms.get<QualityCostBackend>(`/quality-costs/${id}`);
    return {
      ...response,
      data: response.data ? adaptQualityCostToFrontend(response.data) : undefined,
    };
  },

  createQualityCost: async (data: CreateQualityCostRequest): Promise<ApiResponse<QualityCost>> => {
    const backendData = adaptQualityCostToBackend(data);
    const response = await apiClient.qms.post<QualityCostBackend>('/quality-costs', backendData);
    return {
      ...response,
      data: response.data ? adaptQualityCostToFrontend(response.data) : undefined,
    };
  },

  updateQualityCost: async (
    id: string,
    data: Partial<CreateQualityCostRequest>
  ): Promise<ApiResponse<QualityCost>> => {
    const backendData: UpdateQualityCostRequestBackend = {
      cost_type: data.costType,
      cost_category: data.costCategory,
      amount: data.amount,
      currency: data.currency,
      occurrence_date: data.occurrenceDate,
      department: data.department,
      related_order_no: data.relatedOrderNo,
      description: data.description,
      responsible_person: data.responsiblePerson,
      status: data.status,
    };
    const response = await apiClient.qms.put<QualityCostBackend>(
      `/quality-costs/${id}`,
      backendData
    );
    return {
      ...response,
      data: response.data ? adaptQualityCostToFrontend(response.data) : undefined,
    };
  },

  deleteQualityCost: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.qms.delete<boolean>(`/quality-costs/${id}`);
  },

  getCostStatistics: async (params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<CostStatistics>> => {
    const response = await apiClient.qms.get<CostStatisticsBackend>('/quality-costs/statistics', {
      params: {
        start_date: params?.startDate,
        end_date: params?.endDate,
      },
    });
    return {
      ...response,
      data: response.data ? adaptCostStatisticsToFrontend(response.data) : undefined,
    };
  },

  getCostTrend: async (params?: {
    startDate?: string;
    endDate?: string;
    period?: string;
  }): Promise<ApiResponse<CostTrendItem[]>> => {
    const response = await apiClient.qms.get<{ trend?: CostTrendItemBackend[] }>(
      '/quality-costs/trend',
      {
        params: {
          start_date: params?.startDate,
          end_date: params?.endDate,
          period: params?.period,
        },
      }
    );
    const adaptedData = (response.data?.trend || []).map(adaptCostTrendItemToFrontend);
    return { ...response, data: adaptedData };
  },
};
