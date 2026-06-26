import { apiClient } from '../client';

export const previewApi = {
  previewExternalAccounts: (
    configId: string,
    params?: {
      keyword?: string;
      page?: number;
      page_size?: number;
    }
  ) =>
    apiClient.integration.get(
      `/api/integration/external-erp/connections/${configId}/preview/accounts`,
      { params }
    ),

  previewExternalCustomers: (
    configId: string,
    params?: {
      keyword?: string;
      page?: number;
      page_size?: number;
    }
  ) =>
    apiClient.integration.get(
      `/api/integration/external-erp/connections/${configId}/preview/customers`,
      { params }
    ),

  previewExternalSuppliers: (
    configId: string,
    params?: {
      keyword?: string;
      page?: number;
      page_size?: number;
    }
  ) =>
    apiClient.integration.get(
      `/api/integration/external-erp/connections/${configId}/preview/suppliers`,
      { params }
    ),

  previewExternalVouchers: (
    configId: string,
    params?: {
      period_from?: string;
      period_to?: string;
      page?: number;
      page_size?: number;
    }
  ) =>
    apiClient.integration.get(
      `/api/integration/external-erp/connections/${configId}/preview/vouchers`,
      { params }
    ),
};

export default previewApi;
