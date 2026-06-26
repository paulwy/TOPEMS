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
      page_size?: number;
    }
  ) =>
    apiClient.integration.get(
      `/api/integration/external-erp/connections/${configId}/account-mappings`,
      { params }
    ),

  importAccountMappings: (configId: string, data: Partial<AccountMappingRule>[]) =>
    apiClient.integration.post(
      `/api/integration/external-erp/connections/${configId}/account-mappings/batch`,
      { mappings: data }
    ),

  updateAccountMapping: (configId: string, mappingId: string, data: Partial<AccountMappingRule>) =>
    apiClient.integration.put(
      `/api/integration/external-erp/connections/${configId}/account-mappings/${mappingId}`,
      data
    ),

  deleteAccountMapping: (configId: string, mappingId: string) =>
    apiClient.integration.delete(
      `/api/integration/external-erp/connections/${configId}/account-mappings/${mappingId}`
    ),

  autoMatchAccountMappings: (configId: string) =>
    apiClient.integration.post(
      `/api/integration/external-erp/connections/${configId}/account-mappings/auto-match`,
      {}
    ),

  getCustomerMappings: (
    configId: string,
    params?: {
      page?: number;
      page_size?: number;
    }
  ) =>
    apiClient.integration.get(
      `/api/integration/external-erp/connections/${configId}/customer-mappings`,
      { params }
    ),

  importCustomerMappings: (configId: string, data: Partial<CustomerMappingRule>[]) =>
    apiClient.integration.post(
      `/api/integration/external-erp/connections/${configId}/customer-mappings/batch`,
      { mappings: data }
    ),

  updateCustomerMapping: (
    configId: string,
    mappingId: string,
    data: Partial<CustomerMappingRule>
  ) =>
    apiClient.integration.put(
      `/api/integration/external-erp/connections/${configId}/customer-mappings/${mappingId}`,
      data
    ),

  deleteCustomerMapping: (configId: string, mappingId: string) =>
    apiClient.integration.delete(
      `/api/integration/external-erp/connections/${configId}/customer-mappings/${mappingId}`
    ),

  getSupplierMappings: (
    configId: string,
    params?: {
      page?: number;
      page_size?: number;
    }
  ) =>
    apiClient.integration.get(
      `/api/integration/external-erp/connections/${configId}/supplier-mappings`,
      { params }
    ),

  importSupplierMappings: (configId: string, data: Partial<SupplierMappingRule>[]) =>
    apiClient.integration.post(
      `/api/integration/external-erp/connections/${configId}/supplier-mappings/batch`,
      { mappings: data }
    ),

  updateSupplierMapping: (
    configId: string,
    mappingId: string,
    data: Partial<SupplierMappingRule>
  ) =>
    apiClient.integration.put(
      `/api/integration/external-erp/connections/${configId}/supplier-mappings/${mappingId}`,
      data
    ),

  deleteSupplierMapping: (configId: string, mappingId: string) =>
    apiClient.integration.delete(
      `/api/integration/external-erp/connections/${configId}/supplier-mappings/${mappingId}`
    ),

  getProjectMappings: (
    configId: string,
    params?: {
      page?: number;
      page_size?: number;
    }
  ) =>
    apiClient.integration.get(
      `/api/integration/external-erp/connections/${configId}/project-mappings`,
      { params }
    ),

  importProjectMappings: (configId: string, data: Partial<ProjectMappingRule>[]) =>
    apiClient.integration.post(
      `/api/integration/external-erp/connections/${configId}/project-mappings/batch`,
      { mappings: data }
    ),

  updateProjectMapping: (configId: string, mappingId: string, data: Partial<ProjectMappingRule>) =>
    apiClient.integration.put(
      `/api/integration/external-erp/connections/${configId}/project-mappings/${mappingId}`,
      data
    ),

  deleteProjectMapping: (configId: string, mappingId: string) =>
    apiClient.integration.delete(
      `/api/integration/external-erp/connections/${configId}/project-mappings/${mappingId}`
    ),

  getDepartmentMappings: (
    configId: string,
    params?: {
      page?: number;
      page_size?: number;
    }
  ) =>
    apiClient.integration.get(
      `/api/integration/external-erp/connections/${configId}/department-mappings`,
      { params }
    ),

  importDepartmentMappings: (configId: string, data: Partial<DepartmentMappingRule>[]) =>
    apiClient.integration.post(
      `/api/integration/external-erp/connections/${configId}/department-mappings/batch`,
      { mappings: data }
    ),

  updateDepartmentMapping: (
    configId: string,
    mappingId: string,
    data: Partial<DepartmentMappingRule>
  ) =>
    apiClient.integration.put(
      `/api/integration/external-erp/connections/${configId}/department-mappings/${mappingId}`,
      data
    ),

  deleteDepartmentMapping: (configId: string, mappingId: string) =>
    apiClient.integration.delete(
      `/api/integration/external-erp/connections/${configId}/department-mappings/${mappingId}`
    ),

  getEmployeeMappings: (
    configId: string,
    params?: {
      page?: number;
      page_size?: number;
    }
  ) =>
    apiClient.integration.get(
      `/api/integration/external-erp/connections/${configId}/employee-mappings`,
      { params }
    ),

  importEmployeeMappings: (configId: string, data: Partial<EmployeeMappingRule>[]) =>
    apiClient.integration.post(
      `/api/integration/external-erp/connections/${configId}/employee-mappings/batch`,
      { mappings: data }
    ),

  updateEmployeeMapping: (
    configId: string,
    mappingId: string,
    data: Partial<EmployeeMappingRule>
  ) =>
    apiClient.integration.put(
      `/api/integration/external-erp/connections/${configId}/employee-mappings/${mappingId}`,
      data
    ),

  deleteEmployeeMapping: (configId: string, mappingId: string) =>
    apiClient.integration.delete(
      `/api/integration/external-erp/connections/${configId}/employee-mappings/${mappingId}`
    ),
};

export default mappingApi;
