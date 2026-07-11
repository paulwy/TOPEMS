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
    return apiClient.erp.get(`/finance/counterparty/customers/${customerId}`);
  },

  updateCustomerFinance: (
    customerId: string,
    data: Partial<CounterpartyFinanceInfo>
  ): Promise<ApiResponse<CounterpartyFinanceInfo>> => {
    return apiClient.erp.put(`/finance/counterparty/customers/${customerId}`, data);
  },

  getSupplierFinance: (supplierId: string): Promise<ApiResponse<CounterpartyFinanceInfo>> => {
    return apiClient.erp.get(`/finance/counterparty/suppliers/${supplierId}`);
  },

  updateSupplierFinance: (
    supplierId: string,
    data: Partial<CounterpartyFinanceInfo>
  ): Promise<ApiResponse<CounterpartyFinanceInfo>> => {
    return apiClient.erp.put(`/finance/counterparty/suppliers/${supplierId}`, data);
  },

  listCustomersWithFinance: (params?: {
    status?: string;
    page?: number;
    pagesize?: number;
  }): Promise<
    ApiResponse<PaginatedResult<Customer & { finance_info?: CounterpartyFinanceInfo }>>
  > => {
    return apiClient.erp.get('/finance/counterparty/customers', {
      params,
    });
  },

  listSuppliersWithFinance: (params?: {
    status?: string;
    page?: number;
    pagesize?: number;
  }): Promise<
    ApiResponse<PaginatedResult<Supplier & { finance_info?: CounterpartyFinanceInfo }>>
  > => {
    return apiClient.erp.get('/finance/counterparty/suppliers', {
      params,
    });
  },
};

export default counterpartyFinanceApi;
