import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 to_bind 补绑（2026-10-29，P2）──
export const addressBookApi = {
  exportContacts: async (): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.erp.get('/addressbook/export');
  },

  batchDeleteContacts: async (
    data: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.erp.post('/addressbook/batch/delete', data);
  },
};
