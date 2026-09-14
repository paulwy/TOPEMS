import { apiClient } from '../client';
import type {
  AccountMappingRule,
  CustomerMappingRule,
  SupplierMappingRule,
  ProjectMappingRule,
  DepartmentMappingRule,
  EmployeeMappingRule,
} from './types';

export const mappingApi = {
  getAccountMappings: (
    configId: string,
    params?: {
      page?: number;
      pagesize?: number;
    }
  ) =>
    apiClient.integration.get(`/external-erp/connections/${configId}/mappings/account`, { params }),

  importAccountMappings: (configId: string, data: Partial<AccountMappingRule>[]) =>
    apiClient.integration.post(`/external-erp/connections/${configId}/mappings/account/batch`, {
      mappings: data,
    }),

  updateAccountMapping: (configId: string, mappingId: string, data: Partial<AccountMappingRule>) =>
    apiClient.integration.put(
      `/external-erp/connections/${configId}/mappings/account/${mappingId}`,
      data
    ),

  deleteAccountMapping: (configId: string, mappingId: string) =>
    apiClient.integration.delete(
      `/external-erp/connections/${configId}/mappings/account/${mappingId}`
    ),

  autoMatchAccountMappings: (configId: string) =>
    apiClient.integration.post(
      `/external-erp/connections/${configId}/mappings/account/auto-match`,
      {}
    ),

  getCustomerMappings: (
    configId: string,
    params?: {
      page?: number;
      pagesize?: number;
    }
  ) =>
    apiClient.integration.get(`/external-erp/connections/${configId}/mappings/customer`, {
      params,
    }),

  importCustomerMappings: (configId: string, data: Partial<CustomerMappingRule>[]) =>
    apiClient.integration.post(`/external-erp/connections/${configId}/mappings/customer/batch`, {
      mappings: data,
    }),

  updateCustomerMapping: (
    configId: string,
    mappingId: string,
    data: Partial<CustomerMappingRule>
  ) =>
    apiClient.integration.put(
      `/external-erp/connections/${configId}/mappings/customer/${mappingId}`,
      data
    ),

  deleteCustomerMapping: (configId: string, mappingId: string) =>
    apiClient.integration.delete(
      `/external-erp/connections/${configId}/mappings/customer/${mappingId}`
    ),

  getSupplierMappings: (
    configId: string,
    params?: {
      page?: number;
      pagesize?: number;
    }
  ) =>
    apiClient.integration.get(`/external-erp/connections/${configId}/mappings/supplier`, {
      params,
    }),

  importSupplierMappings: (configId: string, data: Partial<SupplierMappingRule>[]) =>
    apiClient.integration.post(`/external-erp/connections/${configId}/mappings/supplier/batch`, {
      mappings: data,
    }),

  updateSupplierMapping: (
    configId: string,
    mappingId: string,
    data: Partial<SupplierMappingRule>
  ) =>
    apiClient.integration.put(
      `/external-erp/connections/${configId}/mappings/supplier/${mappingId}`,
      data
    ),

  deleteSupplierMapping: (configId: string, mappingId: string) =>
    apiClient.integration.delete(
      `/external-erp/connections/${configId}/mappings/supplier/${mappingId}`
    ),

  getProjectMappings: (
    configId: string,
    params?: {
      page?: number;
      pagesize?: number;
    }
  ) =>
    apiClient.integration.get(`/external-erp/connections/${configId}/mappings/project`, { params }),

  importProjectMappings: (configId: string, data: Partial<ProjectMappingRule>[]) =>
    apiClient.integration.post(`/external-erp/connections/${configId}/mappings/project/batch`, {
      mappings: data,
    }),

  updateProjectMapping: (configId: string, mappingId: string, data: Partial<ProjectMappingRule>) =>
    apiClient.integration.put(
      `/external-erp/connections/${configId}/mappings/project/${mappingId}`,
      data
    ),

  deleteProjectMapping: (configId: string, mappingId: string) =>
    apiClient.integration.delete(
      `/external-erp/connections/${configId}/mappings/project/${mappingId}`
    ),

  getDepartmentMappings: (
    configId: string,
    params?: {
      page?: number;
      pagesize?: number;
    }
  ) =>
    apiClient.integration.get(`/external-erp/connections/${configId}/mappings/department`, {
      params,
    }),

  importDepartmentMappings: (configId: string, data: Partial<DepartmentMappingRule>[]) =>
    apiClient.integration.post(`/external-erp/connections/${configId}/mappings/department/batch`, {
      mappings: data,
    }),

  updateDepartmentMapping: (
    configId: string,
    mappingId: string,
    data: Partial<DepartmentMappingRule>
  ) =>
    apiClient.integration.put(
      `/external-erp/connections/${configId}/mappings/department/${mappingId}`,
      data
    ),

  deleteDepartmentMapping: (configId: string, mappingId: string) =>
    apiClient.integration.delete(
      `/external-erp/connections/${configId}/mappings/department/${mappingId}`
    ),

  getEmployeeMappings: (
    configId: string,
    params?: {
      page?: number;
      pagesize?: number;
    }
  ) =>
    apiClient.integration.get(`/external-erp/connections/${configId}/mappings/employee`, {
      params,
    }),

  importEmployeeMappings: (configId: string, data: Partial<EmployeeMappingRule>[]) =>
    apiClient.integration.post(`/external-erp/connections/${configId}/mappings/employee/batch`, {
      mappings: data,
    }),

  updateEmployeeMapping: (
    configId: string,
    mappingId: string,
    data: Partial<EmployeeMappingRule>
  ) =>
    apiClient.integration.put(
      `/external-erp/connections/${configId}/mappings/employee/${mappingId}`,
      data
    ),

  deleteEmployeeMapping: (configId: string, mappingId: string) =>
    apiClient.integration.delete(
      `/external-erp/connections/${configId}/mappings/employee/${mappingId}`
    ),
};

export default mappingApi;
