/**
 * CRM客户关系财务Hooks
 * 封装CRM模块财务数据获取和操作的React Query hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNotification } from './useNotification';
import { crmFinanceApi } from '../api/crmFinance';
import type { CustomerFinanceInfo, SalesInvoice, CollectionRecord } from '../api/crmFinance';

import { CACHE_DURATIONS, QUERY_KEYS, queryClient } from '@/lib/reactQuery';
import i18n from '@/i18n';

// ============================================
// 一、客户财务信息Hooks
// ============================================

/**
 * 获取客户财务信息
 */
export function useCustomerFinanceInfo(customerId: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.CRM_CUSTOMER_FINANCE_BASE, customerId],
    queryFn: () => crmFinanceApi.getCustomerFinanceInfo(customerId),
    enabled: !!customerId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 更新客户财务信息
 */
export function useUpdateCustomerFinanceInfo() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: ({
      customerId,
      data,
    }: {
      customerId: string;
      data: Partial<CustomerFinanceInfo>;
    }) => crmFinanceApi.updateCustomerFinanceInfo(customerId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.CRM_CUSTOMER_FINANCE_BASE ,
  exact: false,
  refetchType: 'active',
});
      success(i18n.t('shared.use_crm_finance.k0'));
    },
    onError: (err) => {
      error(err.message || i18n.t('shared.use_crm_finance.k1'));
    },
  });
}

// ============================================
// 二、销售发票Hooks
// ============================================

/**
 * 获取销售发票列表
 */
export function useSalesInvoices(params?: {
  customer_id?: string;
  invoice_type?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  pagesize?: number;
}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.CRM_SALES_INVOICES_BASE, params],
    queryFn: () => crmFinanceApi.getSalesInvoices(params),
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * 获取销售发票详情
 */
export function useSalesInvoice(invoiceId: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.CRM_SALES_INVOICE_BASE, invoiceId],
    queryFn: () => crmFinanceApi.getSalesInvoice(invoiceId),
    enabled: !!invoiceId,
  
      staleTime: CACHE_DURATIONS.MEDIUM,});
}

/**
 * 创建销售发票
 */
export function useCreateSalesInvoice() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: (data: Partial<SalesInvoice>) => crmFinanceApi.createSalesInvoice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.CRM_SALES_INVOICES_BASE ,
  exact: false,
  refetchType: 'active',
});
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.CRM_CUSTOMER_FINANCE_BASE ,
  exact: false,
  refetchType: 'active',
});
      success(i18n.t('shared.use_crm_finance.k2'));
    },
    onError: (err) => {
      error(err.message || i18n.t('shared.use_crm_finance.k3'));
    },
  });
}

/**
 * 更新销售发票
 */
export function useUpdateSalesInvoice() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: ({ invoiceId, data }: { invoiceId: string; data: Partial<SalesInvoice> }) =>
      crmFinanceApi.updateSalesInvoice(invoiceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.CRM_SALES_INVOICES_BASE ,
  exact: false,
  refetchType: 'active',
});
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.CRM_CUSTOMER_FINANCE_BASE ,
  exact: false,
  refetchType: 'active',
});
      success(i18n.t('shared.use_crm_finance.k4'));
    },
    onError: (err) => {
      error(err.message || i18n.t('shared.use_crm_finance.k5'));
    },
  });
}

/**
 * 删除销售发票
 */
export function useDeleteSalesInvoice() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: (invoiceId: string) => crmFinanceApi.deleteSalesInvoice(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.CRM_SALES_INVOICES_BASE ,
  exact: false,
  refetchType: 'active',
});
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.CRM_CUSTOMER_FINANCE_BASE ,
  exact: false,
  refetchType: 'active',
});
      success(i18n.t('shared.use_crm_finance.k6'));
    },
    onError: (err) => {
      error(err.message || i18n.t('shared.use_crm_finance.k7'));
    },
  });
}

/**
 * 开具发票
 */
export function useIssueSalesInvoice() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: (invoiceId: string) => crmFinanceApi.issueSalesInvoice(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.CRM_SALES_INVOICES_BASE ,
  exact: false,
  refetchType: 'active',
});
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.CRM_CUSTOMER_FINANCE_BASE ,
  exact: false,
  refetchType: 'active',
});
      success(i18n.t('shared.use_crm_finance.k8'));
    },
    onError: (err) => {
      error(err.message || i18n.t('shared.use_crm_finance.k9'));
    },
  });
}

/**
 * 作废发票
 */
export function useVoidSalesInvoice() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: ({ invoiceId, reason }: { invoiceId: string; reason?: string }) =>
      crmFinanceApi.cancelSalesInvoice(invoiceId, reason || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.CRM_SALES_INVOICES_BASE ,
  exact: false,
  refetchType: 'active',
});
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.CRM_CUSTOMER_FINANCE_BASE ,
  exact: false,
  refetchType: 'active',
});
      success(i18n.t('shared.use_crm_finance.k10'));
    },
    onError: (err) => {
      error(err.message || i18n.t('shared.use_crm_finance.k11'));
    },
  });
}

/**
 * 红冲发票
 */
export function useRedFlushSalesInvoice() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: ({ invoiceId, reason }: { invoiceId: string; reason?: string }) =>
      crmFinanceApi.redFlushSalesInvoice(invoiceId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.CRM_SALES_INVOICES_BASE ,
  exact: false,
  refetchType: 'active',
});
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.CRM_CUSTOMER_FINANCE_BASE ,
  exact: false,
  refetchType: 'active',
});
      success(i18n.t('shared.use_crm_finance.k12'));
    },
    onError: (err) => {
      error(err.message || i18n.t('shared.use_crm_finance.k13'));
    },
  });
}

// ============================================
// 三、收款记录Hooks
// ============================================

/**
 * 获取收款记录列表
 */
export function useCollectionRecords(params?: {
  customer_id?: string;
  start_date?: string;
  end_date?: string;
  payment_method?: string;
  page?: number;
  pagesize?: number;
}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.CRM_COLLECTION_RECORDS_BASE, params],
    queryFn: () => crmFinanceApi.getCollectionRecords(params),
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * 获取收款记录详情
 */
export function useCollectionRecord(recordId: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.CRM_COLLECTION_RECORD_BASE, recordId],
    queryFn: () => crmFinanceApi.getCollectionRecord(recordId),
    enabled: !!recordId,
  
      staleTime: CACHE_DURATIONS.MEDIUM,});
}

/**
 * 创建收款记录
 */
export function useCreateCollectionRecord() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: (data: Partial<CollectionRecord>) => crmFinanceApi.createCollectionRecord(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.CRM_COLLECTION_RECORDS_BASE,
      
  exact: false,
  refetchType: 'active',
});
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.CRM_SALES_INVOICES_BASE,
      
  exact: false,
  refetchType: 'active',
});
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.CRM_CUSTOMER_FINANCE_BASE ,
  exact: false,
  refetchType: 'active',
});
      success(i18n.t('shared.use_crm_finance.k14'));
    },
    onError: (err) => {
      error(err.message || i18n.t('shared.use_crm_finance.k15'));
    },
  });
}

/**
 * 确认收款
 */
export function useConfirmCollection() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: (recordId: string) => crmFinanceApi.confirmCollection(recordId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.CRM_COLLECTION_RECORDS_BASE,
      
  exact: false,
  refetchType: 'active',
});
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.CRM_SALES_INVOICES_BASE,
      
  exact: false,
  refetchType: 'active',
});
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.CRM_CUSTOMER_FINANCE_BASE ,
  exact: false,
  refetchType: 'active',
});
      success(i18n.t('shared.use_crm_finance.k16'));
    },
    onError: (err) => {
      error(err.message || i18n.t('shared.use_crm_finance.k17'));
    },
  });
}

/**
 * 批量确认收款
 */
export function useBatchConfirmCollections() {
  const queryClient = useQueryClient();
  const { success, error: showError } = useNotification();

  return useMutation({
    mutationFn: (recordIds: string[]) => crmFinanceApi.batchConfirmCollections(recordIds),
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.CRM_COLLECTION_RECORDS_BASE,
      
  exact: false,
  refetchType: 'active',
});
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.CRM_SALES_INVOICES_BASE,
      
  exact: false,
  refetchType: 'active',
});
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.CRM_CUSTOMER_FINANCE_BASE ,
  exact: false,
  refetchType: 'active',
});
      const successCount = result?.data?.success || 0;
      const failedCount = result?.data?.failed || 0;
      if (failedCount > 0) {
        showError(`${i18n.t('shared.use_crm_finance.k0')}${successCount}${i18n.t('shared.use_crm_finance.k1')}${failedCount}${i18n.t('shared.use_crm_finance.k2')}`);
      } else {
        success(`${i18n.t('shared.use_crm_finance.k3')}${successCount}${i18n.t('shared.use_crm_finance.k4')}`);
      }
    },
    onError: (err) => {
      showError(err.message || i18n.t('shared.use_crm_finance.k18'));
    },
  });
}

// ============================================
// 四、应收账龄分析Hooks
// ============================================

/**
 * 获取应收账龄分析
 */
export function useReceivableAging(params: {
  company_id?: string;
  customer_ids?: string[];
  as_of_date: string;
}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.CRM_RECEIVABLE_AGING_BASE, params],
    queryFn: () => crmFinanceApi.getReceivableAging(params),
    enabled: !!params.as_of_date,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 获取客户应收账款汇总
 */
export function useCustomerReceivableSummary(customerId?: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.CRM_RECEIVABLE_SUMMARY_BASE, customerId],
    queryFn: () => crmFinanceApi.getReceivableSummary(customerId),
    enabled: !!customerId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 获取逾期应收账款列表
 */
export function useOverdueReceivables(params?: {
  company_id?: string;
  customer_id?: string;
  min_overdue_days?: number;
  page?: number;
  pagesize?: number;
}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.CRM_OVERDUE_RECEIVABLES_BASE, params],
    queryFn: () => crmFinanceApi.getOverdueReceivables(params),
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================
// 五、导出Hooks
// ============================================

/**
 * 导出销售发票
 */
export function useExportSalesInvoices() {
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: async (params: {
      customer_id?: string;
      invoice_type?: string;
      status?: string;
      start_date?: string;
      end_date?: string;
      format: 'csv' | 'xlsx';
    }) => {
      const blob = await crmFinanceApi.exportSalesInvoices(params);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sales-invoices.${params.format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      return blob;
    },
    onSuccess: () => {
      
      queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.AD_HOC.CRM_CUSTOMER_FINANCE_BASE,
          exact: false,
          refetchType: 'active',
        });
      success(i18n.t('shared.use_crm_finance.k19'));
    },
    onError: (err) => {
      error(err.message || i18n.t('shared.use_crm_finance.k20'));
    },
  });
}

/**
 * 导出收款记录
 */
export function useExportCollectionRecords() {
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: async (params: {
      customer_id?: string;
      start_date?: string;
      end_date?: string;
      format: 'csv' | 'xlsx';
    }) => {
      const blob = await crmFinanceApi.exportCollectionRecords(params);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `collection-records.${params.format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      return blob;
    },
    onSuccess: () => {
      
      queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.AD_HOC.CRM_CUSTOMER_FINANCE_BASE,
          exact: false,
          refetchType: 'active',
        });
      success(i18n.t('shared.use_crm_finance.k21'));
    },
    onError: (err) => {
      error(err.message || i18n.t('shared.use_crm_finance.k22'));
    },
  });
}

/**
 * 导出应收账龄分析
 */
export function useExportReceivableAging() {
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: async (params: {
      company_id?: string;
      customer_ids?: string[];
      as_of_date: string;
      format: 'csv' | 'xlsx';
    }) => {
      const blob = await crmFinanceApi.exportReceivableAging(params);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `receivable-aging.${params.format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      return blob;
    },
    onSuccess: () => {
      
      queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.AD_HOC.CRM_CUSTOMER_FINANCE_BASE,
          exact: false,
          refetchType: 'active',
        });
      success(i18n.t('shared.use_crm_finance.k23'));
    },
    onError: (err) => {
      error(err.message || i18n.t('shared.use_crm_finance.k24'));
    },
  });
}
