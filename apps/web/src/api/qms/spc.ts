import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  SpcChart,
  CreateSpcChartRequest,
  SpcChartBackend,
  UpdateSpcChartRequestBackend,
  SpcDataPoint,
  SpcDataPointBackend,
  CreateSpcDataPointRequestBackend,
  ControlLimitsResult,
  ControlLimitsResultBackend,
} from './types';
import {
  adaptSpcChartToFrontend,
  adaptSpcChartToBackend,
  adaptSpcDataPointToFrontend,
  adaptControlLimitsToFrontend,
} from './adapters';

export const spcApi = {
  listSpcCharts: async (): Promise<ApiResponse<SpcChart[]>> => {
    const response = await apiClient.qms.get<{ charts?: SpcChartBackend[] }>('/spc/charts');
    const adaptedData = (response.data?.charts || []).map(adaptSpcChartToFrontend);
    return { ...response, data: adaptedData };
  },

  getSpcChart: async (id: string): Promise<ApiResponse<SpcChart | undefined>> => {
    const response = await apiClient.qms.get<SpcChartBackend>(`/spc/charts/${id}`);
    return {
      ...response,
      data: response.data ? adaptSpcChartToFrontend(response.data) : undefined,
    };
  },

  createSpcChart: async (
    data: CreateSpcChartRequest
  ): Promise<ApiResponse<SpcChart | undefined>> => {
    const backendData = adaptSpcChartToBackend(data);
    const response = await apiClient.qms.post<SpcChartBackend>('/spc/charts', backendData);
    return {
      ...response,
      data: response.data ? adaptSpcChartToFrontend(response.data) : undefined,
    };
  },

  updateSpcChart: async (
    id: string,
    data: Partial<CreateSpcChartRequest>
  ): Promise<ApiResponse<SpcChart | undefined>> => {
    const backendData: UpdateSpcChartRequestBackend = {
      chart_name: data.chartName,
      chart_type: data.chartType,
      product_id: data.productId,
      product_name: data.productName,
      process_id: data.processId,
      process_name: data.processName,
      characteristic: data.characteristic,
      unit: data.unit,
      usl: data.usl,
      lsl: data.lsl,
      target: data.target,
      samplesize: data.sampleSize,
      sampling_frequency: data.samplingFrequency,
      status: data.status,
      description: data.description,
    };
    const response = await apiClient.qms.put<SpcChartBackend>(`/spc/charts/${id}`, backendData);
    return {
      ...response,
      data: response.data ? adaptSpcChartToFrontend(response.data) : undefined,
    };
  },

  deleteSpcChart: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.qms.delete<boolean>(`/spc/charts/${id}`);
  },

  getSpcDataPoints: async (chartId: string): Promise<ApiResponse<SpcDataPoint[]>> => {
    const response = await apiClient.qms.get<{ data_points?: SpcDataPointBackend[] }>(
      `/spc/charts/${chartId}/data-points`
    );
    const adaptedData = (response.data?.data_points || []).map(adaptSpcDataPointToFrontend);
    return { ...response, data: adaptedData };
  },

  addSpcDataPoint: async (
    chartId: string,
    data: Omit<
      SpcDataPoint,
      | 'id'
      | 'chartId'
      | 'createdAt'
      | 'mean'
      | 'range'
      | 'stdDev'
      | 'isOutOfControl'
      | 'violationRules'
    >
  ): Promise<ApiResponse<SpcDataPoint | undefined>> => {
    const backendData: CreateSpcDataPointRequestBackend = {
      chart_id: chartId,
      sample_no: data.sampleNo,
      sample_time: data.sampleTime,
      values: data.values,
      operator: data.operator,
      remark: data.remark,
    };
    const response = await apiClient.qms.post<SpcDataPointBackend>('/spc/data-points', backendData);
    return {
      ...response,
      data: response.data ? adaptSpcDataPointToFrontend(response.data) : undefined,
    };
  },

  calculateControlLimits: async (
    chartId: string
  ): Promise<ApiResponse<ControlLimitsResult | undefined>> => {
    const response = await apiClient.qms.post<ControlLimitsResultBackend>(
      `/spc/charts/${chartId}/calculate`,
      {}
    );
    return {
      ...response,
      data: response.data ? adaptControlLimitsToFrontend(response.data) : undefined,
    };
  },
};
