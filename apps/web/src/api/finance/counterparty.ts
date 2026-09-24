import { apiClient } from '../client';
import type {
  Customer,
  Supplier,
  CounterpartyFinanceInfo,
  PaginatedResult,
  ApiResponse,
} from '../../types/finance';

export const counterpartyFinanceApi = {
  getCustomerFinance: (customerId: string): Promise<ApiResponse<CounterpartyFinanceInfo>> => {
    return apiClient.finance.get(`/counterparty/customers/${customerId}`);
  },

  updateCustomerFinance: (
    customerId: string,
    data: Partial<CounterpartyFinanceInfo>
  ): Promise<ApiResponse<CounterpartyFinanceInfo>> => {
    return apiClient.finance.put(`/counterparty/customers/${customerId}`, data);
  },

  getSupplierFinance: (supplierId: string): Promise<ApiResponse<CounterpartyFinanceInfo>> => {
    return apiClient.finance.get(`/counterparty/suppliers/${supplierId}`);
  },

  updateSupplierFinance: (
    supplierId: string,
    data: Partial<CounterpartyFinanceInfo>
  ): Promise<ApiResponse<CounterpartyFinanceInfo>> => {
    return apiClient.finance.put(`/counterparty/suppliers/${supplierId}`, data);
  },

  listCustomersWithFinance: (params?: {
    status?: string;
    page?: number;
    page_size?: number;
  }): Promise<
    ApiResponse<PaginatedResult<Customer & { finance_info?: CounterpartyFinanceInfo }>>
  > => {
    return apiClient.finance.get('/counterparty/customers', {
      params,
    });
  },

  listSuppliersWithFinance: (params?: {
    status?: string;
    page?: number;
    page_size?: number;
  }): Promise<
    ApiResponse<PaginatedResult<Supplier & { finance_info?: CounterpartyFinanceInfo }>>
  > => {
    return apiClient.finance.get('/counterparty/suppliers', {
      params,
    });
  },
};

export default counterpartyFinanceApi;
