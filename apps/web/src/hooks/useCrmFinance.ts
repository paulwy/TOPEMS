/**
 * CRM客户关系财务Hooks
 * 封装CRM模块财务数据获取和操作的React Query hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNotification } from './useNotification';
import { crmFinanceApi } from '../api/crm-finance';
import type { CustomerFinanceInfo, SalesInvoice, CollectionRecord } from '../api/crm-finance';

// ============================================
// 一、客户财务信息Hooks
// ============================================

/**
 * 获取客户财务信息
 */
export function useCustomerFinanceInfo(customerId: string) {
  return useQuery({
    queryKey: ['crm-customer-finance', customerId],
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
      queryClient.invalidateQueries({ queryKey: ['crm-customer-finance'] });
      success('客户财务信息更新成功');
    },
    onError: (err) => {
      error(err.message || '客户财务信息更新失败');
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
  page_size?: number;
}) {
  return useQuery({
    queryKey: ['crm-sales-invoices', params],
    queryFn: () => crmFinanceApi.getSalesInvoices(params),
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * 获取销售发票详情
 */
export function useSalesInvoice(invoiceId: string) {
  return useQuery({
    queryKey: ['crm-sales-invoice', invoiceId],
    queryFn: () => crmFinanceApi.getSalesInvoice(invoiceId),
    enabled: !!invoiceId,
  });
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
      queryClient.invalidateQueries({ queryKey: ['crm-sales-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['crm-customer-finance'] });
      success('销售发票创建成功');
    },
    onError: (err) => {
      error(err.message || '销售发票创建失败');
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
      queryClient.invalidateQueries({ queryKey: ['crm-sales-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['crm-customer-finance'] });
      success('销售发票更新成功');
    },
    onError: (err) => {
      error(err.message || '销售发票更新失败');
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
      queryClient.invalidateQueries({ queryKey: ['crm-sales-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['crm-customer-finance'] });
      success('销售发票删除成功');
    },
    onError: (err) => {
      error(err.message || '销售发票删除失败');
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
      queryClient.invalidateQueries({ queryKey: ['crm-sales-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['crm-customer-finance'] });
      success('发票开具成功');
    },
    onError: (err) => {
      error(err.message || '发票开具失败');
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
      queryClient.invalidateQueries({ queryKey: ['crm-sales-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['crm-customer-finance'] });
      success('发票已作废');
    },
    onError: (err) => {
      error(err.message || '发票作废失败');
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
      queryClient.invalidateQueries({ queryKey: ['crm-sales-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['crm-customer-finance'] });
      success('发票已红冲');
    },
    onError: (err) => {
      error(err.message || '发票红冲失败');
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
  page_size?: number;
}) {
  return useQuery({
    queryKey: ['crm-collection-records', params],
    queryFn: () => crmFinanceApi.getCollectionRecords(params),
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * 获取收款记录详情
 */
export function useCollectionRecord(recordId: string) {
  return useQuery({
    queryKey: ['crm-collection-record', recordId],
    queryFn: () => crmFinanceApi.getCollectionRecord(recordId),
    enabled: !!recordId,
  });
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
        queryKey: ['crm-collection-records'],
      });
      queryClient.invalidateQueries({
        queryKey: ['crm-sales-invoices'],
      });
      queryClient.invalidateQueries({ queryKey: ['crm-customer-finance'] });
      success('收款记录创建成功');
    },
    onError: (err) => {
      error(err.message || '收款记录创建失败');
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
        queryKey: ['crm-collection-records'],
      });
      queryClient.invalidateQueries({
        queryKey: ['crm-sales-invoices'],
      });
      queryClient.invalidateQueries({ queryKey: ['crm-customer-finance'] });
      success('收款已确认');
    },
    onError: (err) => {
      error(err.message || '收款确认失败');
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
        queryKey: ['crm-collection-records'],
      });
      queryClient.invalidateQueries({
        queryKey: ['crm-sales-invoices'],
      });
      queryClient.invalidateQueries({ queryKey: ['crm-customer-finance'] });
      const successCount = result?.data?.success || 0;
      const failedCount = result?.data?.failed || 0;
      if (failedCount > 0) {
        showError(`成功确认 ${successCount} 条，失败 ${failedCount} 条`);
      } else {
        success(`成功确认 ${successCount} 条`);
      }
    },
    onError: (err) => {
      showError(err.message || '批量确认失败');
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
    queryKey: ['crm-receivable-aging', params],
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
    queryKey: ['crm-receivable-summary', customerId],
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
  page_size?: number;
}) {
  return useQuery({
    queryKey: ['crm-overdue-receivables', params],
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
      success('销售发票已导出');
    },
    onError: (err) => {
      error(err.message || '导出失败');
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
      success('收款记录已导出');
    },
    onError: (err) => {
      error(err.message || '导出失败');
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
      success('应收账龄分析已导出');
    },
    onError: (err) => {
      error(err.message || '导出失败');
    },
  });
}
