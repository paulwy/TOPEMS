/**
 * 外部ERP适配器API
 * 提供与金蝶、用友、SAP等外部ERP系统的集成接口
 */

import { apiClient, downloadBlob } from './client';
import config from '../config/runtime';
import type {
  KingdeeConnectionConfig,
  YonyouConnectionConfig,
  SapConnectionConfig,
  CompanyMapping,
  AccountMappingRule,
  CustomerMappingRule,
  SupplierMappingRule,
  ProjectMappingRule,
  DepartmentMappingRule,
  EmployeeMappingRule,
  AccountSyncRequest,
  CustomerSyncRequest,
  SupplierSyncRequest,
  VoucherSyncRequest,
  InvoiceSyncRequest,
  ConnectionTestRequest,
} from '../types/external-erp';

// ============================================
// 一、连接配置管理
// ============================================

export const externalErpApi = {
  // -------- 连接配置 --------

  /**
   * 获取ERP连接列表
   */
  getConnections: (params?: {
    type?: string;
    status?: string;
    page?: number;
    page_size?: number;
  }) =>
    apiClient.integration.get('/api/integration/external-erp/connections', {
      params,
    }),

  /**
   * 获取连接详情
   */
  getConnection: (id: string) =>
    apiClient.integration.get(`/api/integration/external-erp/connections/${id}`),

  /**
   * 创建连接配置
   */
  createConnection: (data: {
    type: 'kingdee' | 'yonyou' | 'sap';
    name: string;
    api_url: string;
    app_key?: string;
    app_secret?: string;
    sync_direction?: 'import' | 'export' | 'bidirectional';
    sync_mode?: 'realtime' | 'scheduled' | 'manual';
    company_mappings?: CompanyMapping[];
  }) => apiClient.integration.post('/api/integration/external-erp/connections', data),

  /**
   * 更新连接配置
   */
  updateConnection: (
    id: string,
    data: Partial<KingdeeConnectionConfig | YonyouConnectionConfig | SapConnectionConfig>
  ) => apiClient.integration.put(`/api/integration/external-erp/connections/${id}`, data),

  /**
   * 删除连接配置
   */
  deleteConnection: (id: string) =>
    apiClient.integration.delete(`/api/integration/external-erp/connections/${id}`),

  /**
   * 启用/禁用连接
   */
  toggleConnection: (id: string, enabled: boolean) =>
    apiClient.integration.put(`/api/integration/external-erp/connections/${id}/toggle`, {
      enabled,
    }),

  /**
   * 测试连接
   */
  testConnection: (data: ConnectionTestRequest) =>
    apiClient.integration.post('/api/integration/external-erp/connections/test', data),

  /**
   * 同步连接状态
   */
  syncConnectionStatus: (id: string) =>
    apiClient.integration.post(`/api/integration/external-erp/connections/${id}/sync-status`, {}),

  // -------- 公司映射 --------

  /**
   * 获取公司映射列表
   */
  getCompanyMappings: (configId: string) =>
    apiClient.integration.get(
      `/api/integration/external-erp/connections/${configId}/company-mappings`
    ),

  /**
   * 添加公司映射
   */
  addCompanyMapping: (configId: string, mapping: CompanyMapping) =>
    apiClient.integration.post(
      `/api/integration/external-erp/connections/${configId}/company-mappings`,
      mapping
    ),

  /**
   * 更新公司映射
   */
  updateCompanyMapping: (configId: string, mappingId: string, mapping: Partial<CompanyMapping>) =>
    apiClient.integration.put(
      `/api/integration/external-erp/connections/${configId}/company-mappings/${mappingId}`,
      mapping
    ),

  /**
   * 删除公司映射
   */
  deleteCompanyMapping: (configId: string, mappingId: string) =>
    apiClient.integration.delete(
      `/api/integration/external-erp/connections/${configId}/company-mappings/${mappingId}`
    ),

  // -------- 科目映射 --------

  /**
   * 获取科目映射列表
   */
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

  /**
   * 批量导入科目映射
   */
  importAccountMappings: (configId: string, data: Partial<AccountMappingRule>[]) =>
    apiClient.integration.post(
      `/api/integration/external-erp/connections/${configId}/account-mappings/batch`,
      { mappings: data }
    ),

  /**
   * 更新科目映射
   */
  updateAccountMapping: (configId: string, mappingId: string, data: Partial<AccountMappingRule>) =>
    apiClient.integration.put(
      `/api/integration/external-erp/connections/${configId}/account-mappings/${mappingId}`,
      data
    ),

  /**
   * 删除科目映射
   */
  deleteAccountMapping: (configId: string, mappingId: string) =>
    apiClient.integration.delete(
      `/api/integration/external-erp/connections/${configId}/account-mappings/${mappingId}`
    ),

  /**
   * 自动匹配科目映射
   */
  autoMatchAccountMappings: (configId: string) =>
    apiClient.integration.post(
      `/api/integration/external-erp/connections/${configId}/account-mappings/auto-match`,
      {}
    ),

  // -------- 客户映射 --------

  /**
   * 获取客户映射列表
   */
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

  /**
   * 批量导入客户映射
   */
  importCustomerMappings: (configId: string, data: Partial<CustomerMappingRule>[]) =>
    apiClient.integration.post(
      `/api/integration/external-erp/connections/${configId}/customer-mappings/batch`,
      { mappings: data }
    ),

  /**
   * 更新客户映射
   */
  updateCustomerMapping: (
    configId: string,
    mappingId: string,
    data: Partial<CustomerMappingRule>
  ) =>
    apiClient.integration.put(
      `/api/integration/external-erp/connections/${configId}/customer-mappings/${mappingId}`,
      data
    ),

  /**
   * 删除客户映射
   */
  deleteCustomerMapping: (configId: string, mappingId: string) =>
    apiClient.integration.delete(
      `/api/integration/external-erp/connections/${configId}/customer-mappings/${mappingId}`
    ),

  // -------- 供应商映射 --------

  /**
   * 获取供应商映射列表
   */
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

  /**
   * 批量导入供应商映射
   */
  importSupplierMappings: (configId: string, data: Partial<SupplierMappingRule>[]) =>
    apiClient.integration.post(
      `/api/integration/external-erp/connections/${configId}/supplier-mappings/batch`,
      { mappings: data }
    ),

  /**
   * 更新供应商映射
   */
  updateSupplierMapping: (
    configId: string,
    mappingId: string,
    data: Partial<SupplierMappingRule>
  ) =>
    apiClient.integration.put(
      `/api/integration/external-erp/connections/${configId}/supplier-mappings/${mappingId}`,
      data
    ),

  /**
   * 删除供应商映射
   */
  deleteSupplierMapping: (configId: string, mappingId: string) =>
    apiClient.integration.delete(
      `/api/integration/external-erp/connections/${configId}/supplier-mappings/${mappingId}`
    ),

  // -------- 项目映射 --------

  /**
   * 获取项目映射列表
   */
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

  /**
   * 批量导入项目映射
   */
  importProjectMappings: (configId: string, data: Partial<ProjectMappingRule>[]) =>
    apiClient.integration.post(
      `/api/integration/external-erp/connections/${configId}/project-mappings/batch`,
      { mappings: data }
    ),

  /**
   * 更新项目映射
   */
  updateProjectMapping: (configId: string, mappingId: string, data: Partial<ProjectMappingRule>) =>
    apiClient.integration.put(
      `/api/integration/external-erp/connections/${configId}/project-mappings/${mappingId}`,
      data
    ),

  /**
   * 删除项目映射
   */
  deleteProjectMapping: (configId: string, mappingId: string) =>
    apiClient.integration.delete(
      `/api/integration/external-erp/connections/${configId}/project-mappings/${mappingId}`
    ),

  // -------- 部门映射 --------

  /**
   * 获取部门映射列表
   */
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

  /**
   * 批量导入部门映射
   */
  importDepartmentMappings: (configId: string, data: Partial<DepartmentMappingRule>[]) =>
    apiClient.integration.post(
      `/api/integration/external-erp/connections/${configId}/department-mappings/batch`,
      { mappings: data }
    ),

  /**
   * 更新部门映射
   */
  updateDepartmentMapping: (
    configId: string,
    mappingId: string,
    data: Partial<DepartmentMappingRule>
  ) =>
    apiClient.integration.put(
      `/api/integration/external-erp/connections/${configId}/department-mappings/${mappingId}`,
      data
    ),

  /**
   * 删除部门映射
   */
  deleteDepartmentMapping: (configId: string, mappingId: string) =>
    apiClient.integration.delete(
      `/api/integration/external-erp/connections/${configId}/department-mappings/${mappingId}`
    ),

  // -------- 员工映射 --------

  /**
   * 获取员工映射列表
   */
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

  /**
   * 批量导入员工映射
   */
  importEmployeeMappings: (configId: string, data: Partial<EmployeeMappingRule>[]) =>
    apiClient.integration.post(
      `/api/integration/external-erp/connections/${configId}/employee-mappings/batch`,
      { mappings: data }
    ),

  /**
   * 更新员工映射
   */
  updateEmployeeMapping: (
    configId: string,
    mappingId: string,
    data: Partial<EmployeeMappingRule>
  ) =>
    apiClient.integration.put(
      `/api/integration/external-erp/connections/${configId}/employee-mappings/${mappingId}`,
      data
    ),

  /**
   * 删除员工映射
   */
  deleteEmployeeMapping: (configId: string, mappingId: string) =>
    apiClient.integration.delete(
      `/api/integration/external-erp/connections/${configId}/employee-mappings/${mappingId}`
    ),

  // ============================================
  // 二、数据同步
  // ============================================

  /**
   * 同步科目
   */
  syncAccounts: (data: AccountSyncRequest) =>
    apiClient.integration.post('/api/integration/external-erp/sync/accounts', data),

  /**
   * 同步客户
   */
  syncCustomers: (data: CustomerSyncRequest) =>
    apiClient.integration.post('/api/integration/external-erp/sync/customers', data),

  /**
   * 同步供应商
   */
  syncSuppliers: (data: SupplierSyncRequest) =>
    apiClient.integration.post('/api/integration/external-erp/sync/suppliers', data),

  /**
   * 同步供应商
   */
  syncProjects: (data: {
    config_id: string;
    project_ids?: string[];
    company_id?: string;
    force_sync?: boolean;
  }) => apiClient.integration.post('/api/integration/external-erp/sync/projects', data),

  /**
   * 同步部门
   */
  syncDepartments: (data: {
    config_id: string;
    department_ids?: string[];
    company_id?: string;
    force_sync?: boolean;
  }) => apiClient.integration.post('/api/integration/external-erp/sync/departments', data),

  /**
   * 同步员工
   */
  syncEmployees: (data: {
    config_id: string;
    employee_ids?: string[];
    company_id?: string;
    force_sync?: boolean;
  }) => apiClient.integration.post('/api/integration/external-erp/sync/employees', data),

  /**
   * 同步凭证
   */
  syncVouchers: (data: VoucherSyncRequest) =>
    apiClient.integration.post('/api/integration/external-erp/sync/vouchers', data),

  /**
   * 同步发票
   */
  syncInvoices: (data: InvoiceSyncRequest) =>
    apiClient.integration.post('/api/integration/external-erp/sync/invoices', data),

  /**
   * 全量同步
   */
  fullSync: (data: { config_id: string; company_id?: string; sync_modules?: string[] }) =>
    apiClient.integration.post('/api/integration/external-erp/sync/full', data),

  /**
   * 取消同步
   */
  cancelSync: (logId: string) =>
    apiClient.integration.post(`/api/integration/external-erp/sync/${logId}/cancel`, {}),

  // ============================================
  // 三、同步日志
  // ============================================

  /**
   * 获取同步日志列表
   */
  getSyncLogs: (params?: {
    config_id?: string;
    type?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    page_size?: number;
  }) =>
    apiClient.integration.get('/api/integration/external-erp/sync-logs', {
      params,
    }),

  /**
   * 获取同步日志详情
   */
  getSyncLog: (logId: string) =>
    apiClient.integration.get(`/api/integration/external-erp/sync-logs/${logId}`),

  /**
   * 获取同步统计
   */
  getSyncStatistics: (
    configId: string,
    params?: {
      start_date?: string;
      end_date?: string;
    }
  ) =>
    apiClient.integration.get(
      `/api/integration/external-erp/connections/${configId}/sync-statistics`,
      { params }
    ),

  // ============================================
  // 四、数据预览（从外部ERP拉取）
  // ============================================

  /**
   * 预览外部ERP科目
   */
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

  /**
   * 预览外部ERP客户
   */
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

  /**
   * 预览外部ERP供应商
   */
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

  /**
   * 预览外部ERP凭证
   */
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

  // ============================================
  // 五、导出
  // ============================================

  /**
   * 导出同步日志
   */
  exportSyncLogs: async (params: {
    config_id?: string;
    type?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    format: 'csv' | 'xlsx';
  }): Promise<Blob> => {
    const baseURL = (apiClient.integration as any).defaults?.baseURL || config.services.integration;
    return downloadBlob(baseURL, '/api/integration/external-erp/export/sync-logs', { params });
  },

  /**
   * 导出映射规则
   */
  exportMappingRules: async (params: {
    config_id: string;
    mapping_type: 'account' | 'customer' | 'supplier' | 'project' | 'department' | 'employee';
    format: 'csv' | 'xlsx';
  }): Promise<Blob> => {
    const baseURL = (apiClient.integration as any).defaults?.baseURL || config.services.integration;
    return downloadBlob(baseURL, '/api/integration/external-erp/export/mappings', { params });
  },
};

export default externalErpApi;
