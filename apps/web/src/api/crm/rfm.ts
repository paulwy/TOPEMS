import { apiClient } from '../client';
import type { ApiResponse } from '../client';
import type { RfmConfig, RfmRecord, SegmentStats } from './types';

export const rfmApi = {
  /** 执行 RFM 分析（POST /rfm/analyze） */
  analyze: async (config: RfmConfig): Promise<ApiResponse<RfmRecord[]>> => {
    return apiClient.crm.post('/rfm/analyze', config);
  },

  /** 获取所有分群及统计（GET /rfm/segments） */
  getSegments: async (): Promise<ApiResponse<SegmentStats[]>> => {
    return apiClient.crm.get('/rfm/segments');
  },

  /** 获取单个客户的 RFM 记录（GET /rfm/customer/:id） */
  getCustomerRfm: async (id: string): Promise<ApiResponse<RfmRecord>> => {
    return apiClient.crm.get(`/rfm/customer/${id}`);
  },
};

export default rfmApi;
