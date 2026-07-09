import axios from 'axios';
import type {
  Customer,
  Supplier,
  CounterpartyFinanceInfo,
  PaginatedResult,
  ApiResponse,
} from '../../types/finance';

const createApiClient = () => {
  const client = axios.create({
    baseURL: '/api',
    timeout: 60000,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  client.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  });

  return client;
};

export const counterpartyFinanceApi = {
  getCustomerFinance: (customerId: string): Promise<ApiResponse<CounterpartyFinanceInfo>> => {
    return createApiClient().get(`/erp/finance/counterparty/customers/${customerId}`);
  },

  updateCustomerFinance: (
    customerId: string,
    data: Partial<CounterpartyFinanceInfo>
  ): Promise<ApiResponse<CounterpartyFinanceInfo>> => {
    return createApiClient().put(`/erp/finance/counterparty/customers/${customerId}`, data);
  },

  getSupplierFinance: (supplierId: string): Promise<ApiResponse<CounterpartyFinanceInfo>> => {
    return createApiClient().get(`/erp/finance/counterparty/suppliers/${supplierId}`);
  },

  updateSupplierFinance: (
    supplierId: string,
    data: Partial<CounterpartyFinanceInfo>
  ): Promise<ApiResponse<CounterpartyFinanceInfo>> => {
    return createApiClient().put(`/erp/finance/counterparty/suppliers/${supplierId}`, data);
  },

  listCustomersWithFinance: (params?: {
    status?: string;
    page?: number;
    pagesize?: number;
  }): Promise<
    ApiResponse<PaginatedResult<Customer & { finance_info?: CounterpartyFinanceInfo }>>
  > => {
    return createApiClient().get('/erp/finance/counterparty/customers', {
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
    return createApiClient().get('/erp/finance/counterparty/suppliers', {
      params,
    });
  },
};

export default counterpartyFinanceApi;
