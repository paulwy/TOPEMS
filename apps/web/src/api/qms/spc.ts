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
  adaptSpcDataPointToBackend,
  adaptControlLimitsToFrontend,
} from './adapters';

export const spcApi = {
  listSpcCharts: async (): Promise<ApiResponse<SpcChart[]>> => {
    // 后端 /spc/charts 直接返回数组；兼容旧版 { charts: [...] } 包裹结构
    const response = await apiClient.qms.get<{ charts?: SpcChartBackend[] } | SpcChartBackend[]>(
      '/spc/charts'
    );
    const raw = response.data;
    const list = Array.isArray(raw) ? raw : raw?.charts || [];
    const adaptedData = list.map(adaptSpcChartToFrontend);
    return { ...response, data: adaptedData };
  },

  getSpcChart: async (id: string): Promise<ApiResponse<SpcChart | undefined>> => {
    const response = await apiClient.qms.get<SpcChartBackend>(`/spc/charts/${id}`);
    return {
      ...response,
      data: response.data ? adaptSpcChartToFrontend(response.data) : ({} as SpcChart),
    };
  },

  createSpcChart: async (
    data: CreateSpcChartRequest
  ): Promise<ApiResponse<SpcChart | undefined>> => {
    const backendData = adaptSpcChartToBackend(data);
    const response = await apiClient.qms.post<SpcChartBackend>('/spc/charts', backendData);
    if (!response.data || !response.data.id || !data.dataPoints?.length) {
      return {
        ...response,
        data: response.data ? adaptSpcChartToFrontend(response.data) : ({} as SpcChart),
      };
    }
    // 创建成功后串联写入数据点子表（向导第 2 步录入的原始数据点）
    const chartId = response.data.id;
    for (const dp of data.dataPoints) {
      const pointBackend = adaptSpcDataPointToBackend(chartId, dp);
      await apiClient.qms.post('/spc/data-points', pointBackend);
    }
    const refreshed = await apiClient.qms.get<SpcChartBackend>(`/spc/charts/${chartId}`);
    return {
      ...response,
      data: refreshed.data ? adaptSpcChartToFrontend(refreshed.data) : ({} as SpcChart),
    };
  },

  updateSpcChart: async (
    id: string,
    data: Partial<CreateSpcChartRequest>
  ): Promise<ApiResponse<SpcChart | undefined>> => {
    const backendData: UpdateSpcChartRequestBackend = {
      chart_type: data.chartType,
      parameter_name: data.characteristic,
      chart_name: data.chartName,
      process_name: data.processName,
      unit: data.unit,
      usl: data.usl,
      lsl: data.lsl,
      target: data.target,
      sample_size: data.sampleSize,
      sampling_frequency: data.samplingFrequency,
      description: data.description,
      ucl: data.ucl,
      cl: data.cl,
      lcl: data.lcl,
      status: data.status,
    };
    const response = await apiClient.qms.put<SpcChartBackend>(`/spc/charts/${id}`, backendData);
    return {
      ...response,
      data: response.data ? adaptSpcChartToFrontend(response.data) : ({} as SpcChart),
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
    const backendData = adaptSpcDataPointToBackend(chartId, {
      sampleNo: data.sampleNo,
      sampleTime: data.sampleTime,
      values: data.values,
      operator: data.operator,
      remark: data.remark,
    });
    const response = await apiClient.qms.post<SpcDataPointBackend>('/spc/data-points', backendData);
    return {
      ...response,
      data: response.data ? adaptSpcDataPointToFrontend(response.data) : ({} as SpcDataPoint),
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
      data: response.data
        ? adaptControlLimitsToFrontend(response.data)
        : ({ ucl: 0, lcl: 0, cl: 0, dataPointsCount: 0 } as ControlLimitsResult),
    };
  },
};
