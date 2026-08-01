import apiClient from '../client';
import type { ApiResponse } from '../client';

export interface SmtpConfig {
  enabled: boolean;
  host: string;
  port: number;
  user: string;
  /** Masked (`********`) when read back from the server. */
  password: string;
  tls: string;
  from_email: string;
  from_name: string;
}

export interface TestEmailResult {
  sent: boolean;
  to: string;
}

export const smtpSettingsApi = {
  get: async (): Promise<ApiResponse<SmtpConfig>> => {
    return apiClient.core.get<SmtpConfig>('/system/settings/smtp');
  },

  update: async (data: SmtpConfig): Promise<ApiResponse<SmtpConfig>> => {
    return apiClient.core.put<SmtpConfig>('/system/settings/smtp', data);
  },

  test: async (payload: {
    to: string;
    config?: SmtpConfig;
  }): Promise<ApiResponse<TestEmailResult>> => {
    return apiClient.core.post<TestEmailResult>('/system/settings/smtp/test', payload);
  },
};

export default smtpSettingsApi;
