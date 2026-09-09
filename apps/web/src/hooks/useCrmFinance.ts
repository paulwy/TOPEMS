/**
 * CRM客户关系财务Hooks
 * 封装CRM模块财务数据获取和操作的React Query hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { crmFinanceApi } from '../api/crmFinance';
import type { SalesInvoice, CollectionRecord } from '../api/crmFinance';

import { QUERY_KEYS } from '@/lib/reactQuery';

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

// 以下为占位类型导出，保持原文件对 SalesInvoice / CollectionRecord 的类型引用依赖兼容
// ============================================
// 四、销售发票 Mutations
// ============================================

function invalidateCrmFinance(queryClient: { invalidateQueries: (o: object) => void }) {
  queryClient.invalidateQueries({
    queryKey: QUERY_KEYS.AD_HOC.CRM_SALES_INVOICES_BASE,
    exact: false,
    refetchType: 'active',
  });
  queryClient.invalidateQueries({
    queryKey: QUERY_KEYS.AD_HOC.CRM_COLLECTION_RECORDS_BASE,
    exact: false,
    refetchType: 'active',
  });
  queryClient.invalidateQueries({
    queryKey: QUERY_KEYS.AD_HOC.CRM_CUSTOMER_FINANCE_BASE,
    exact: false,
    refetchType: 'active',
  });
}

/**
 * 创建销售发票
 */
export function useCreateSalesInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<SalesInvoice>) => crmFinanceApi.createSalesInvoice(data),
    onSuccess: () => invalidateCrmFinance(queryClient),
  });
}

/**
 * 开具销售发票
 */
export function useIssueSalesInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: string) => crmFinanceApi.issueSalesInvoice(invoiceId),
    onSuccess: () => invalidateCrmFinance(queryClient),
  });
}

/**
 * 取消销售发票
 */
export function useCancelSalesInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, reason }: { invoiceId: string; reason: string }) =>
      crmFinanceApi.cancelSalesInvoice(invoiceId, reason),
    onSuccess: () => invalidateCrmFinance(queryClient),
  });
}

/**
 * 红冲销售发票
 */
export function useRedFlushSalesInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, reason }: { invoiceId: string; reason?: string }) =>
      crmFinanceApi.redFlushSalesInvoice(invoiceId, reason),
    onSuccess: () => invalidateCrmFinance(queryClient),
  });
}

/**
 * 删除销售发票（仅 draft）
 */
export function useDeleteSalesInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: string) => crmFinanceApi.deleteSalesInvoice(invoiceId),
    onSuccess: () => invalidateCrmFinance(queryClient),
  });
}

// ============================================
// 五、收款记录 Mutations
// ============================================

/**
 * 创建收款记录
 */
export function useCreateCollectionRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CollectionRecord>) => crmFinanceApi.createCollectionRecord(data),
    onSuccess: () => invalidateCrmFinance(queryClient),
  });
}

/**
 * 确认收款
 */
export function useConfirmCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (recordId: string) => crmFinanceApi.confirmCollection(recordId),
    onSuccess: () => invalidateCrmFinance(queryClient),
  });
}

/**
 * 批量确认收款
 */
export function useBatchConfirmCollections() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (recordIds: string[]) => crmFinanceApi.batchConfirmCollections(recordIds),
    onSuccess: () => invalidateCrmFinance(queryClient),
  });
}

// ============================================
// 六、应收报表 Hooks
// ============================================

/**
 * 客户应收账款汇总
 */
export function useReceivableSummary(customerId?: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.CRM_CUSTOMER_FINANCE_BASE, 'summary', customerId],
    queryFn: () => crmFinanceApi.getReceivableSummary(customerId),
    enabled: true,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * 销售发票导出（blob 下载）
 */
export function useExportSalesInvoices() {
  return useMutation({
    mutationFn: (params: {
      customer_id?: string;
      invoice_type?: string;
      status?: string;
      start_date?: string;
      end_date?: string;
      format: 'csv' | 'xlsx';
    }) => crmFinanceApi.exportSalesInvoices(params),
  });
}

/**
 * 收款记录导出（blob 下载）
 */
export function useExportCollectionRecords() {
  return useMutation({
    mutationFn: (params: {
      customer_id?: string;
      start_date?: string;
      end_date?: string;
      format: 'csv' | 'xlsx';
    }) => crmFinanceApi.exportCollectionRecords(params),
  });
}

export type { SalesInvoice, CollectionRecord };
