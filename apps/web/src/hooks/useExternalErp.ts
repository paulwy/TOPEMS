/**
 * 外部ERP适配器Hooks
 * 封装外部ERP系统集成的React Query hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNotification } from './useNotification';
import { externalErpApi } from '../api/externalErp';
import type {
  // 连接配置
  ErpConnectionConfig,
  CompanyMapping,

  // 映射规则
  AccountMappingRule,
  CustomerMappingRule,
  SupplierMappingRule,

  // 连接测试
  ConnectionTestRequest,
} from '../types/externalErp';

// ============================================
// 一、连接配置管理
// ============================================

/**
 * 获取ERP连接列表
 */
export function useErpConnections(params?: {
  type?: string;
  status?: string;
  page?: number;
  page_size?: number;
}) {
  return useQuery({
    queryKey: ['external-erp-connections', params],
    queryFn: () => externalErpApi.getConnections(params),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 获取连接详情
 */
export function useErpConnection(connectionId: string) {
  return useQuery({
    queryKey: ['external-erp-connection', connectionId],
    queryFn: () => externalErpApi.getConnection(connectionId),
    enabled: !!connectionId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 创建连接配置
 */
export function useCreateErpConnection() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: (data: {
      type: 'kingdee' | 'yonyou' | 'sap';
      name: string;
      api_url: string;
      app_key?: string;
      app_secret?: string;
      sync_direction?: 'import' | 'export' | 'bidirectional';
      sync_mode?: 'realtime' | 'scheduled' | 'manual';
      company_mappings?: CompanyMapping[];
    }) => externalErpApi.createConnection(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-erp-connections'] });
      success('ERP连接创建成功');
    },
    onError: (err) => {
      error(err.message || 'ERP连接创建失败');
    },
  });
}

/**
 * 更新连接配置
 */
export function useUpdateErpConnection() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: ({
      connectionId,
      data,
    }: {
      connectionId: string;
      data: Partial<ErpConnectionConfig>;
    }) => externalErpApi.updateConnection(connectionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-erp-connections'] });
      success('ERP连接更新成功');
    },
    onError: (err) => {
      error(err.message || 'ERP连接更新失败');
    },
  });
}

/**
 * 删除连接配置
 */
export function useDeleteErpConnection() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: (connectionId: string) => externalErpApi.deleteConnection(connectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-erp-connections'] });
      success('ERP连接删除成功');
    },
    onError: (err) => {
      error(err.message || 'ERP连接删除失败');
    },
  });
}

/**
 * 测试连接
 */
export function useTestErpConnection() {
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: (data: ConnectionTestRequest) => externalErpApi.testConnection(data),
    onSuccess: (result) => {
      if (result.success) {
        success('连接测试成功');
      } else {
        error(result.data?.error_message || '连接测试失败');
      }
    },
    onError: (err) => {
      error(err.message || '连接测试失败');
    },
  });
}

/**
 * 启用/禁用连接
 */
export function useToggleErpConnection() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: ({ connectionId, enabled }: { connectionId: string; enabled: boolean }) =>
      externalErpApi.toggleConnection(connectionId, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-erp-connections'] });
      success('连接状态更新成功');
    },
    onError: (err) => {
      error(err.message || '连接状态更新失败');
    },
  });
}

// ============================================
// 二、数据同步
// ============================================

/**
 * 同步科目
 */
export function useSyncAccounts() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: (data: {
      config_id: string;
      account_ids?: string[];
      include_disabled?: boolean;
      company_id?: string;
      force_sync?: boolean;
    }) => externalErpApi.syncAccounts(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['external-erp-sync-logs'] });
      success(`成功同步 ${result.data.created_count + result.data.updated_count} 个科目`);
    },
    onError: (err) => {
      error(err.message || '科目同步失败');
    },
  });
}

/**
 * 同步客户
 */
export function useSyncCustomers() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: (data: {
      config_id: string;
      customer_ids?: string[];
      include_inactive?: boolean;
      company_id?: string;
      force_sync?: boolean;
    }) => externalErpApi.syncCustomers(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['external-erp-sync-logs'] });
      success(`成功同步 ${result.data.created_count + result.data.updated_count} 个客户`);
    },
    onError: (err) => {
      error(err.message || '客户同步失败');
    },
  });
}

/**
 * 同步供应商
 */
export function useSyncSuppliers() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: (data: {
      config_id: string;
      supplier_ids?: string[];
      include_inactive?: boolean;
      company_id?: string;
      force_sync?: boolean;
    }) => externalErpApi.syncSuppliers(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['external-erp-sync-logs'] });
      success(`成功同步 ${result.data.created_count + result.data.updated_count} 个供应商`);
    },
    onError: (err) => {
      error(err.message || '供应商同步失败');
    },
  });
}

/**
 * 同步凭证
 */
export function useSyncVouchers() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: (data: {
      config_id: string;
      voucher_ids?: string[];
      period_from?: string;
      period_to?: string;
      status?: string[];
      company_id?: string;
      force_sync?: boolean;
    }) => externalErpApi.syncVouchers(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['external-erp-sync-logs'] });
      if (result.data.failed_count > 0) {
        error(`成功同步 ${result.data.synced_count} 个，失败 ${result.data.failed_count} 个`);
      } else {
        success(`成功同步 ${result.data.synced_count} 个凭证`);
      }
    },
    onError: (err) => {
      error(err.message || '凭证同步失败');
    },
  });
}

/**
 * 全量同步
 */
export function useFullSync() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: (data: { config_id: string; company_id?: string; sync_modules?: string[] }) =>
      externalErpApi.fullSync(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-erp-sync-logs'] });
      success('全量同步任务已启动');
    },
    onError: (err) => {
      error(err.message || '全量同步失败');
    },
  });
}

// ============================================
// 三、同步日志
// ============================================

/**
 * 获取同步日志列表
 */
export function useSyncLogs(params?: {
  config_id?: string;
  type?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
}) {
  return useQuery({
    queryKey: ['external-erp-sync-logs', params],
    queryFn: () => externalErpApi.getSyncLogs(params),
    staleTime: 1 * 60 * 1000,
  });
}

/**
 * 获取同步日志详情
 */
export function useSyncLogDetail(logId: string) {
  return useQuery({
    queryKey: ['external-erp-sync-log', logId],
    queryFn: () => externalErpApi.getSyncLog(logId),
    enabled: !!logId,
    staleTime: 1 * 60 * 1000,
  });
}

/**
 * 获取同步统计
 */
export function useSyncStatistics(
  connectionId: string,
  params?: {
    start_date?: string;
    end_date?: string;
  }
) {
  return useQuery({
    queryKey: ['external-erp-sync-statistics', connectionId, params],
    queryFn: () => externalErpApi.getSyncStatistics(connectionId, params),
    enabled: !!connectionId,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================
// 四、科目映射管理
// ============================================

/**
 * 获取科目映射列表
 */
export function useAccountMappings(
  connectionId: string,
  params?: {
    page?: number;
    page_size?: number;
  }
) {
  return useQuery({
    queryKey: ['external-erp-account-mappings', connectionId, params],
    queryFn: () => externalErpApi.getAccountMappings(connectionId, params),
    enabled: !!connectionId,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * 批量导入科目映射
 */
export function useImportAccountMappings() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: ({
      connectionId,
      mappings,
    }: {
      connectionId: string;
      mappings: Partial<AccountMappingRule>[];
    }) => externalErpApi.importAccountMappings(connectionId, mappings),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['external-erp-account-mappings'],
      });
      success('科目映射导入成功');
    },
    onError: (err) => {
      error(err.message || '科目映射导入失败');
    },
  });
}

/**
 * 自动匹配科目映射
 */
export function useAutoMatchAccountMappings() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: (connectionId: string) => externalErpApi.autoMatchAccountMappings(connectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['external-erp-account-mappings'],
      });
      success('科目映射自动匹配完成');
    },
    onError: (err) => {
      error(err.message || '科目映射自动匹配失败');
    },
  });
}

/**
 * 更新科目映射
 */
export function useUpdateAccountMapping() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: ({
      connectionId,
      mappingId,
      data,
    }: {
      connectionId: string;
      mappingId: string;
      data: Partial<AccountMappingRule>;
    }) => externalErpApi.updateAccountMapping(connectionId, mappingId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['external-erp-account-mappings'],
      });
      success('科目映射更新成功');
    },
    onError: (err) => {
      error(err.message || '科目映射更新失败');
    },
  });
}

// ============================================
// 五、客户映射管理
// ============================================

/**
 * 获取客户映射列表
 */
export function useCustomerMappings(
  connectionId: string,
  params?: {
    page?: number;
    page_size?: number;
  }
) {
  return useQuery({
    queryKey: ['external-erp-customer-mappings', connectionId, params],
    queryFn: () => externalErpApi.getCustomerMappings(connectionId, params),
    enabled: !!connectionId,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * 批量导入客户映射
 */
export function useImportCustomerMappings() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: ({
      connectionId,
      mappings,
    }: {
      connectionId: string;
      mappings: Partial<CustomerMappingRule>[];
    }) => externalErpApi.importCustomerMappings(connectionId, mappings),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['external-erp-customer-mappings'],
      });
      success('客户映射导入成功');
    },
    onError: (err) => {
      error(err.message || '客户映射导入失败');
    },
  });
}

/**
 * 更新客户映射
 */
export function useUpdateCustomerMapping() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: ({
      connectionId,
      mappingId,
      data,
    }: {
      connectionId: string;
      mappingId: string;
      data: Partial<CustomerMappingRule>;
    }) => externalErpApi.updateCustomerMapping(connectionId, mappingId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['external-erp-customer-mappings'],
      });
      success('客户映射更新成功');
    },
    onError: (err) => {
      error(err.message || '客户映射更新失败');
    },
  });
}

// ============================================
// 六、供应商映射管理
// ============================================

/**
 * 获取供应商映射列表
 */
export function useSupplierMappings(
  connectionId: string,
  params?: {
    page?: number;
    page_size?: number;
  }
) {
  return useQuery({
    queryKey: ['external-erp-supplier-mappings', connectionId, params],
    queryFn: () => externalErpApi.getSupplierMappings(connectionId, params),
    enabled: !!connectionId,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * 批量导入供应商映射
 */
export function useImportSupplierMappings() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: ({
      connectionId,
      mappings,
    }: {
      connectionId: string;
      mappings: Partial<SupplierMappingRule>[];
    }) => externalErpApi.importSupplierMappings(connectionId, mappings),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['external-erp-supplier-mappings'],
      });
      success('供应商映射导入成功');
    },
    onError: (err) => {
      error(err.message || '供应商映射导入失败');
    },
  });
}

/**
 * 更新供应商映射
 */
export function useUpdateSupplierMapping() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: ({
      connectionId,
      mappingId,
      data,
    }: {
      connectionId: string;
      mappingId: string;
      data: Partial<SupplierMappingRule>;
    }) => externalErpApi.updateSupplierMapping(connectionId, mappingId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['external-erp-supplier-mappings'],
      });
      success('供应商映射更新成功');
    },
    onError: (err) => {
      error(err.message || '供应商映射更新失败');
    },
  });
}

// ============================================
// 七、数据预览
// ============================================

/**
 * 预览外部ERP科目
 */
export function usePreviewExternalAccounts(
  connectionId: string,
  params?: {
    keyword?: string;
    page?: number;
    page_size?: number;
  }
) {
  return useQuery({
    queryKey: ['external-erp-preview-accounts', connectionId, params],
    queryFn: () => externalErpApi.previewExternalAccounts(connectionId, params),
    enabled: !!connectionId,
    staleTime: 1 * 60 * 1000,
  });
}

/**
 * 预览外部ERP客户
 */
export function usePreviewExternalCustomers(
  connectionId: string,
  params?: {
    keyword?: string;
    page?: number;
    page_size?: number;
  }
) {
  return useQuery({
    queryKey: ['external-erp-preview-customers', connectionId, params],
    queryFn: () => externalErpApi.previewExternalCustomers(connectionId, params),
    enabled: !!connectionId,
    staleTime: 1 * 60 * 1000,
  });
}

/**
 * 预览外部ERP供应商
 */
export function usePreviewExternalSuppliers(
  connectionId: string,
  params?: {
    keyword?: string;
    page?: number;
    page_size?: number;
  }
) {
  return useQuery({
    queryKey: ['external-erp-preview-suppliers', connectionId, params],
    queryFn: () => externalErpApi.previewExternalSuppliers(connectionId, params),
    enabled: !!connectionId,
    staleTime: 1 * 60 * 1000,
  });
}

// ============================================
// 八、导出
// ============================================

/**
 * 导出同步日志
 */
export function useExportSyncLogs() {
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: async (params: {
      config_id?: string;
      type?: string;
      status?: string;
      start_date?: string;
      end_date?: string;
      format: 'csv' | 'xlsx';
    }) => {
      const blob = await externalErpApi.exportSyncLogs(params);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sync-logs.${params.format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      return blob;
    },
    onSuccess: () => {
      success('同步日志导出成功');
    },
    onError: (err) => {
      error(err.message || '导出失败');
    },
  });
}

/**
 * 导出映射规则
 */
export function useExportMappingRules() {
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: async (params: {
      config_id: string;
      mapping_type: 'account' | 'customer' | 'supplier' | 'project' | 'department' | 'employee';
      format: 'csv' | 'xlsx';
    }) => {
      const blob = await externalErpApi.exportMappingRules(params);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mappings-${params.mapping_type}.${params.format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      return blob;
    },
    onSuccess: () => {
      success('映射规则导出成功');
    },
    onError: (err) => {
      error(err.message || '导出失败');
    },
  });
}
