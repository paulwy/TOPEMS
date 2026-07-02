import { apiClient } from '../client';
import type {
  AccountSyncRequest,
  CustomerSyncRequest,
  SupplierSyncRequest,
  VoucherSyncRequest,
  InvoiceSyncRequest,
} from './types';

export const syncApi = {
  syncAccounts: (data: AccountSyncRequest) =>
    apiClient.integration.post('/external-erp/sync/accounts', data),

  syncCustomers: (data: CustomerSyncRequest) =>
    apiClient.integration.post('/external-erp/sync/customers', data),

  syncSuppliers: (data: SupplierSyncRequest) =>
    apiClient.integration.post('/external-erp/sync/suppliers', data),

  syncProjects: (data: {
    config_id: string;
    project_ids?: string[];
    company_id?: string;
    force_sync?: boolean;
  }) => apiClient.integration.post('/external-erp/sync/projects', data),

  syncDepartments: (data: {
    config_id: string;
    department_ids?: string[];
    company_id?: string;
    force_sync?: boolean;
  }) => apiClient.integration.post('/external-erp/sync/departments', data),

  syncEmployees: (data: {
    config_id: string;
    employee_ids?: string[];
    company_id?: string;
    force_sync?: boolean;
  }) => apiClient.integration.post('/external-erp/sync/employees', data),

  syncVouchers: (data: VoucherSyncRequest) =>
    apiClient.integration.post('/external-erp/sync/vouchers', data),

  syncInvoices: (data: InvoiceSyncRequest) =>
    apiClient.integration.post('/external-erp/sync/invoices', data),

  fullSync: (data: { config_id: string; company_id?: string; sync_modules?: string[] }) =>
    apiClient.integration.post('/external-erp/sync/full', data),

  cancelSync: (logId: string) =>
    apiClient.integration.post(`/external-erp/sync/${logId}/cancel`, {}),
};

export default syncApi;
