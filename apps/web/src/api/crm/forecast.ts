import { apiClient } from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';
import type {
  SalesForecast,
  CreateSalesForecastRequest,
  SalesForecastQueryParams,
  ForecastConfig,
  ForecastResult,
  ForecastMethodInfo,
  ForecastEvaluation,
} from './types';

export const salesForecastApi = {
  list: async (
    params?: SalesForecastQueryParams
  ): Promise<ApiResponse<PaginatedResponse<SalesForecast>>> => {
    return apiClient.crm.get('/sales-forecast', { params });
  },

  get: async (id: string): Promise<ApiResponse<SalesForecast>> => {
    return apiClient.crm.get(`/sales-forecast/${id}`);
  },

  create: async (data: CreateSalesForecastRequest): Promise<ApiResponse<SalesForecast>> => {
    return apiClient.crm.post('/sales-forecast', data);
  },

  update: async (id: string, data: Partial<SalesForecast>): Promise<ApiResponse<SalesForecast>> => {
    return apiClient.crm.put(`/sales-forecast/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.crm.delete(`/sales-forecast/${id}`);
  },

  generate: async (data: CreateSalesForecastRequest): Promise<ApiResponse<SalesForecast>> => {
    return apiClient.crm.post('/sales-forecast/generate', data);
  },
};

/** 销售预测算法 API（移动平均 / 指数平滑 / 线性回归） */
export const forecastApi = {
  /** 执行预测（POST /forecast/predict） */
  predict: async (config: ForecastConfig): Promise<ApiResponse<ForecastResult>> => {
    return apiClient.crm.post('/forecast/predict', config);
  },

  /** 获取支持的预测方法列表（GET /forecast/methods） */
  getMethods: async (): Promise<ApiResponse<ForecastMethodInfo[]>> => {
    return apiClient.crm.get('/forecast/methods');
  },

  /** 评估多个方法的预测效果（POST /forecast/evaluate） */
  evaluate: async (config: ForecastConfig): Promise<ApiResponse<ForecastEvaluation>> => {
    return apiClient.crm.post('/forecast/evaluate', config);
  },
};

export default salesForecastApi;
