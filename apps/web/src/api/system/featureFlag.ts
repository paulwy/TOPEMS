import apiClient from '../client';
import type { ApiResponse } from '../client';

export type FeatureState = 'Disabled' | 'Enabled' | 'Conditional';

export interface FeatureCondition {
  type: string;
  value?: unknown;
}

export interface FeatureFlag {
  key: string;
  name: string;
  description?: string;
  state: FeatureState;
  conditions: FeatureCondition[];
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface UpdateFeatureFlagRequest {
  enabled: boolean;
}

export const featureFlagApi = {
  async list(): Promise<ApiResponse<FeatureFlag[]>> {
    return apiClient.core.get('/system/feature-flags');
  },

  async get(key: string): Promise<ApiResponse<FeatureFlag>> {
    return apiClient.core.get(`/system/feature-flags/${key}`);
  },

  async update(key: string, data: UpdateFeatureFlagRequest): Promise<ApiResponse<FeatureFlag>> {
    return apiClient.core.put(`/system/feature-flags/${key}`, data);
  },

  async refresh(key: string): Promise<ApiResponse<{ key: string; refreshed: boolean; existed: boolean }>> {
    return apiClient.core.post(`/system/feature-flags/${key}/refresh`);
  },
};

export default featureFlagApi;
