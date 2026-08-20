import apiClient from '../client';
import type { ApiResponse } from '../client';

export type ApiKeyType = 'feishu' | 'dingtalk' | 'wecom' | 'smtp' | 'other';

export interface ApiKeyEntry {
  id: string;
  name: string;
  key_type: ApiKeyType;
  /** Masked to the last 4 characters when read back from the server. */
  secret: string;
  created_at: string;
  last_used: string | null;
}

export interface CreateApiKeyRequest {
  name: string;
  key_type: ApiKeyType;
  secret: string;
}

const apiKeysApi = {
  list: async (): Promise<ApiResponse<ApiKeyEntry[]>> => {
    return apiClient.core.get<ApiKeyEntry[]>('/system/api-keys');
  },

  create: async (data: CreateApiKeyRequest): Promise<ApiResponse<ApiKeyEntry>> => {
    return apiClient.core.post<ApiKeyEntry>('/system/api-keys', data);
  },

  remove: async (id: string): Promise<ApiResponse<{ id: string }>> => {
    return apiClient.core.delete<{ id: string }>(`/system/api-keys/${id}`);
  },
};

export default apiKeysApi;
