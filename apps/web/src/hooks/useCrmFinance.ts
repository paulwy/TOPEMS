/**
 * CRM客户关系财务Hooks
 * 封装CRM模块财务数据获取和操作的React Query hooks
 */

import { useQuery } from '@tanstack/react-query';
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
export type { SalesInvoice, CollectionRecord };
