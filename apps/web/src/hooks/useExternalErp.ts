/**
 * 外部ERP适配器Hooks
 * 封装外部ERP系统集成的React Query hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNotification } from './useNotification';
import { externalErpApi } from '../api/external-erp';
import { QUERY_KEYS, queryClient } from '@/lib/reactQuery';

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
} from '../types/external-erp';
import i18n from '@/i18n';

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
  pagesize?: number;
}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.EXTERNAL_ERP_CONNECTIONS_BASE, params],
    queryFn: () => externalErpApi.getConnections(params),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 获取连接详情
 */
export function useErpConnection(connectionId: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.EXTERNAL_ERP_CONNECTION_BASE, connectionId],
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
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.EXTERNAL_ERP_CONNECTIONS_BASE,
        exact: false,
        refetchType: 'active',
      });
      success(i18n.t('shared.use_external_erp.erp_0'));
    },
    onError: (err) => {
      error(err.message || i18n.t('shared.use_external_erp.erp_1'));
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
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.EXTERNAL_ERP_CONNECTIONS_BASE,
        exact: false,
        refetchType: 'active',
      });
      success(i18n.t('shared.use_external_erp.erp_2'));
    },
    onError: (err) => {
      error(err.message || i18n.t('shared.use_external_erp.erp_3'));
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
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.EXTERNAL_ERP_CONNECTIONS_BASE,
        exact: false,
        refetchType: 'active',
      });
      success(i18n.t('shared.use_external_erp.erp_4'));
    },
    onError: (err) => {
      error(err.message || i18n.t('shared.use_external_erp.erp_5'));
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
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.EXTERNAL_ERP_CONNECTIONS_BASE,
        exact: false,
        refetchType: 'active',
      });
      if (result.success) {
        success(i18n.t('shared.use_external_erp.k0'));
      } else {
        error(result.data?.error_message || i18n.t('shared.use_external_erp.k1'));
      }
    },
    onError: (err) => {
      error(err.message || i18n.t('shared.use_external_erp.k2'));
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
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.EXTERNAL_ERP_CONNECTIONS_BASE,
        exact: false,
        refetchType: 'active',
      });
      success(i18n.t('shared.use_external_erp.k3'));
    },
    onError: (err) => {
      error(err.message || i18n.t('shared.use_external_erp.k4'));
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
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.EXTERNAL_ERP_SYNC_LOGS_BASE,
        exact: false,
        refetchType: 'active',
      });
      success(
        `${i18n.t('shared.use_external_erp.k6')}${result.data.created_count + result.data.updated_count}${i18n.t('shared.use_external_erp.k7')}`
      );
    },
    onError: (err) => {
      error(err.message || i18n.t('shared.use_external_erp.k5'));
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
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.EXTERNAL_ERP_SYNC_LOGS_BASE,
        exact: false,
        refetchType: 'active',
      });
      success(
        `${i18n.t('shared.use_external_erp.k8')}${result.data.created_count + result.data.updated_count}${i18n.t('shared.use_external_erp.k9')}`
      );
    },
    onError: (err) => {
      error(err.message || i18n.t('shared.use_external_erp.k6'));
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
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.EXTERNAL_ERP_SYNC_LOGS_BASE,
        exact: false,
        refetchType: 'active',
      });
      success(
        `${i18n.t('shared.use_external_erp.k10')}${result.data.created_count + result.data.updated_count}${i18n.t('shared.use_external_erp.k11')}`
      );
    },
    onError: (err) => {
      error(err.message || i18n.t('shared.use_external_erp.k7'));
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
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.EXTERNAL_ERP_SYNC_LOGS_BASE,
        exact: false,
        refetchType: 'active',
      });
      if (result.data.failed_count > 0) {
        error(
          `${i18n.t('shared.use_external_erp.k12')}${result.data.synced_count}${i18n.t('shared.use_external_erp.k13')}${result.data.failed_count}${i18n.t('shared.use_external_erp.k14')}`
        );
      } else {
        success(
          `${i18n.t('shared.use_external_erp.k15')}${result.data.synced_count}${i18n.t('shared.use_external_erp.k16')}`
        );
      }
    },
    onError: (err) => {
      error(err.message || i18n.t('shared.use_external_erp.k8'));
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
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.EXTERNAL_ERP_SYNC_LOGS_BASE,
        exact: false,
        refetchType: 'active',
      });
      success(i18n.t('shared.use_external_erp.k9'));
    },
    onError: (err) => {
      error(err.message || i18n.t('shared.use_external_erp.k10'));
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
  pagesize?: number;
}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.EXTERNAL_ERP_SYNC_LOGS_BASE, params],
    queryFn: () => externalErpApi.getSyncLogs(params),
    staleTime: 1 * 60 * 1000,
  });
}

/**
 * 获取同步日志详情
 */
export function useSyncLogDetail(logId: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.EXTERNAL_ERP_SYNC_LOG_BASE, logId],
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
    queryKey: [...QUERY_KEYS.AD_HOC.EXTERNAL_ERP_SYNC_STATISTICS_BASE, connectionId, params],
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
    pagesize?: number;
  }
) {
  return useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.EXTERNAL_ERP_ACCOUNT_MAPPINGS_BASE, connectionId, params],
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
        queryKey: QUERY_KEYS.AD_HOC.EXTERNAL_ERP_ACCOUNT_MAPPINGS_BASE,

        exact: false,
        refetchType: 'active',
      });
      success(i18n.t('shared.use_external_erp.k11'));
    },
    onError: (err) => {
      error(err.message || i18n.t('shared.use_external_erp.k12'));
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
        queryKey: QUERY_KEYS.AD_HOC.EXTERNAL_ERP_ACCOUNT_MAPPINGS_BASE,

        exact: false,
        refetchType: 'active',
      });
      success(i18n.t('shared.use_external_erp.k13'));
    },
    onError: (err) => {
      error(err.message || i18n.t('shared.use_external_erp.k14'));
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
        queryKey: QUERY_KEYS.AD_HOC.EXTERNAL_ERP_ACCOUNT_MAPPINGS_BASE,

        exact: false,
        refetchType: 'active',
      });
      success(i18n.t('shared.use_external_erp.k15'));
    },
    onError: (err) => {
      error(err.message || i18n.t('shared.use_external_erp.k16'));
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
    pagesize?: number;
  }
) {
  return useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.EXTERNAL_ERP_CUSTOMER_MAPPINGS_BASE, connectionId, params],
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
        queryKey: QUERY_KEYS.AD_HOC.EXTERNAL_ERP_CUSTOMER_MAPPINGS_BASE,

        exact: false,
        refetchType: 'active',
      });
      success(i18n.t('shared.use_external_erp.k17'));
    },
    onError: (err) => {
      error(err.message || i18n.t('shared.use_external_erp.k18'));
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
        queryKey: QUERY_KEYS.AD_HOC.EXTERNAL_ERP_CUSTOMER_MAPPINGS_BASE,

        exact: false,
        refetchType: 'active',
      });
      success(i18n.t('shared.use_external_erp.k19'));
    },
    onError: (err) => {
      error(err.message || i18n.t('shared.use_external_erp.k20'));
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
    pagesize?: number;
  }
) {
  return useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.EXTERNAL_ERP_SUPPLIER_MAPPINGS_BASE, connectionId, params],
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
        queryKey: QUERY_KEYS.AD_HOC.EXTERNAL_ERP_SUPPLIER_MAPPINGS_BASE,

        exact: false,
        refetchType: 'active',
      });
      success(i18n.t('shared.use_external_erp.k21'));
    },
    onError: (err) => {
      error(err.message || i18n.t('shared.use_external_erp.k22'));
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
        queryKey: QUERY_KEYS.AD_HOC.EXTERNAL_ERP_SUPPLIER_MAPPINGS_BASE,

        exact: false,
        refetchType: 'active',
      });
      success(i18n.t('shared.use_external_erp.k23'));
    },
    onError: (err) => {
      error(err.message || i18n.t('shared.use_external_erp.k24'));
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
    pagesize?: number;
  }
) {
  return useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.EXTERNAL_ERP_PREVIEW_ACCOUNTS_BASE, connectionId, params],
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
    pagesize?: number;
  }
) {
  return useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.EXTERNAL_ERP_PREVIEW_CUSTOMERS_BASE, connectionId, params],
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
    pagesize?: number;
  }
) {
  return useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.EXTERNAL_ERP_PREVIEW_SUPPLIERS_BASE, connectionId, params],
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
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.EXTERNAL_ERP_CONNECTIONS_BASE,
        exact: false,
        refetchType: 'active',
      });
      success(i18n.t('shared.use_external_erp.k25'));
    },
    onError: (err) => {
      error(err.message || i18n.t('shared.use_external_erp.k26'));
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
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.EXTERNAL_ERP_CONNECTIONS_BASE,
        exact: false,
        refetchType: 'active',
      });
      success(i18n.t('shared.use_external_erp.k27'));
    },
    onError: (err) => {
      error(err.message || i18n.t('shared.use_external_erp.k28'));
    },
  });
}
