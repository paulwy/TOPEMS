/**
 * SRM供应商管理财务Hooks
 * 封装SRM模块财务数据获取和操作的React Query hooks
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNotification } from "./useNotification";
import { srmFinanceApi } from "../api/srm-finance";
import type {
  SupplierFinanceInfo,
  PurchaseInvoice,
  PaymentRequest,
} from "../api/srm-finance";

// ============================================
// 一、供应商财务信息Hooks
// ============================================

/**
 * 获取供应商财务信息
 */
export function useSupplierFinanceInfo(supplierId: string) {
  return useQuery({
    queryKey: ["srm-supplier-finance", supplierId],
    queryFn: () => srmFinanceApi.getSupplierFinanceInfo(supplierId),
    enabled: !!supplierId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 更新供应商财务信息
 */
export function useUpdateSupplierFinanceInfo() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: ({
      supplierId,
      data,
    }: {
      supplierId: string;
      data: Partial<SupplierFinanceInfo>;
    }) => srmFinanceApi.updateSupplierFinanceInfo(supplierId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["srm-supplier-finance"] });
      success("供应商财务信息更新成功");
    },
    onError: (err: any) => {
      error(err.message || "供应商财务信息更新失败");
    },
  });
}

// ============================================
// 二、采购发票Hooks
// ============================================

/**
 * 获取采购发票列表
 */
export function usePurchaseInvoices(params?: {
  supplier_id?: string;
  invoice_type?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
}) {
  return useQuery({
    queryKey: ["srm-purchase-invoices", params],
    queryFn: () => srmFinanceApi.getPurchaseInvoices(params),
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * 获取采购发票详情
 */
export function usePurchaseInvoice(invoiceId: string) {
  return useQuery({
    queryKey: ["srm-purchase-invoice", invoiceId],
    queryFn: () => srmFinanceApi.getPurchaseInvoice(invoiceId),
    enabled: !!invoiceId,
  });
}

/**
 * 创建采购发票
 */
export function useCreatePurchaseInvoice() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: (data: Partial<PurchaseInvoice>) =>
      srmFinanceApi.createPurchaseInvoice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["srm-purchase-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["srm-supplier-finance"] });
      success("采购发票创建成功");
    },
    onError: (err: any) => {
      error(err.message || "采购发票创建失败");
    },
  });
}

/**
 * 更新采购发票
 */
export function useUpdatePurchaseInvoice() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: ({
      invoiceId,
      data,
    }: {
      invoiceId: string;
      data: Partial<PurchaseInvoice>;
    }) => srmFinanceApi.updatePurchaseInvoice(invoiceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["srm-purchase-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["srm-supplier-finance"] });
      success("采购发票更新成功");
    },
    onError: (err: any) => {
      error(err.message || "采购发票更新失败");
    },
  });
}

/**
 * 删除采购发票
 */
export function useDeletePurchaseInvoice() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: (invoiceId: string) =>
      srmFinanceApi.deletePurchaseInvoice(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["srm-purchase-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["srm-supplier-finance"] });
      success("采购发票删除成功");
    },
    onError: (err: any) => {
      error(err.message || "采购发票删除失败");
    },
  });
}

/**
 * 确认收到发票
 */
export function useConfirmPurchaseInvoice() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: (invoiceId: string) =>
      srmFinanceApi.confirmPurchaseInvoice(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["srm-purchase-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["srm-supplier-finance"] });
      success("发票已确认");
    },
    onError: (err: any) => {
      error(err.message || "发票确认失败");
    },
  });
}

/**
 * 验证发票
 */
export function useVerifyPurchaseInvoice() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: (invoiceId: string) =>
      srmFinanceApi.verifyPurchaseInvoice(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["srm-purchase-invoices"] });
      success("发票验证通过");
    },
    onError: (err: any) => {
      error(err.message || "发票验证失败");
    },
  });
}

// ============================================
// 三、付款申请Hooks
// ============================================

/**
 * 获取付款申请列表
 */
export function usePaymentRequests(params?: {
  supplier_id?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
}) {
  return useQuery({
    queryKey: ["srm-payment-requests", params],
    queryFn: () => srmFinanceApi.getPaymentRequests(params),
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * 获取付款申请详情
 */
export function usePaymentRequest(requestId: string) {
  return useQuery({
    queryKey: ["srm-payment-request", requestId],
    queryFn: () => srmFinanceApi.getPaymentRequest(requestId),
    enabled: !!requestId,
  });
}

/**
 * 创建付款申请
 */
export function useCreatePaymentRequest() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: (data: Partial<PaymentRequest>) =>
      srmFinanceApi.createPaymentRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["srm-payment-requests"] });
      success("付款申请创建成功");
    },
    onError: (err: any) => {
      error(err.message || "付款申请创建失败");
    },
  });
}

/**
 * 更新付款申请
 */
export function useUpdatePaymentRequest() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: ({
      requestId,
      data,
    }: {
      requestId: string;
      data: Partial<PaymentRequest>;
    }) => srmFinanceApi.updatePaymentRequest(requestId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["srm-payment-requests"] });
      success("付款申请更新成功");
    },
    onError: (err: any) => {
      error(err.message || "付款申请更新失败");
    },
  });
}

/**
 * 删除付款申请
 */
export function useDeletePaymentRequest() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: (requestId: string) =>
      srmFinanceApi.deletePaymentRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["srm-payment-requests"] });
      success("付款申请删除成功");
    },
    onError: (err: any) => {
      error(err.message || "付款申请删除失败");
    },
  });
}

/**
 * 提交付款申请
 */
export function useSubmitPaymentRequest() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: (requestId: string) =>
      srmFinanceApi.submitPaymentRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["srm-payment-requests"] });
      success("付款申请已提交");
    },
    onError: (err: any) => {
      error(err.message || "付款申请提交失败");
    },
  });
}

/**
 * 审批付款申请
 */
export function useApprovePaymentRequest() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: ({
      requestId,
      approved,
      comment,
    }: {
      requestId: string;
      approved: boolean;
      comment?: string;
    }) => srmFinanceApi.approvePaymentRequest(requestId, approved, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["srm-payment-requests"] });
      success("付款申请审批完成");
    },
    onError: (err: any) => {
      error(err.message || "付款申请审批失败");
    },
  });
}

/**
 * 支付确认
 */
export function useConfirmPayment() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: ({
      requestId,
      bank_transaction_id,
    }: {
      requestId: string;
      bank_transaction_id?: string;
    }) => srmFinanceApi.confirmPayment(requestId, bank_transaction_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["srm-payment-requests"] });
      queryClient.invalidateQueries({ queryKey: ["srm-purchase-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["srm-supplier-finance"] });
      success("付款确认成功");
    },
    onError: (err: any) => {
      error(err.message || "付款确认失败");
    },
  });
}

// ============================================
// 四、应付账龄分析Hooks
// ============================================

/**
 * 获取应付账龄分析
 */
export function usePayableAging(params: {
  company_id?: string;
  supplier_ids?: string[];
  as_of_date: string;
}) {
  return useQuery({
    queryKey: ["srm-payable-aging", params],
    queryFn: () => srmFinanceApi.getPayableAging(params),
    enabled: !!params.as_of_date,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 获取供应商应付汇总
 */
export function useSupplierPayableSummary(supplierId?: string) {
  return useQuery({
    queryKey: ["srm-payable-summary", supplierId],
    queryFn: () =>
      srmFinanceApi.getPayableSummary(
        supplierId ? { supplier_ids: [supplierId] } : undefined,
      ),
    enabled: true,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 获取到期应付列表
 */
export function useDuePayables(params?: {
  company_id?: string;
  supplier_id?: string;
  due_within_days?: number;
  page?: number;
  page_size?: number;
}) {
  return useQuery({
    queryKey: ["srm-due-payables", params],
    queryFn: () => srmFinanceApi.getDuePayables(params),
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================
// 五、导出Hooks
// ============================================

/**
 * 导出采购发票
 */
export function useExportPurchaseInvoices() {
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: async (params: {
      supplier_id?: string;
      invoice_type?: string;
      status?: string;
      start_date?: string;
      end_date?: string;
      format: "csv" | "xlsx";
    }) => {
      const response = await srmFinanceApi.exportPurchaseInvoices(params);
      const blob = response.data as Blob;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `purchase-invoices.${params.format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      return blob;
    },
    onSuccess: () => {
      success("采购发票已导出");
    },
    onError: (err: any) => {
      error(err.message || "导出失败");
    },
  });
}

/**
 * 导出付款申请
 */
export function useExportPaymentRequests() {
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: async (params: {
      supplier_id?: string;
      status?: string;
      start_date?: string;
      end_date?: string;
      format: "csv" | "xlsx";
    }) => {
      const response = await srmFinanceApi.exportPaymentRequests(params);
      const blob = response.data as Blob;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `payment-requests.${params.format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      return blob;
    },
    onSuccess: () => {
      success("付款申请已导出");
    },
    onError: (err: any) => {
      error(err.message || "导出失败");
    },
  });
}

/**
 * 导出应付账龄分析
 */
export function useExportPayableAging() {
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: async (params: {
      company_id?: string;
      supplier_ids?: string[];
      as_of_date: string;
      format: "csv" | "xlsx";
    }) => {
      const response = await srmFinanceApi.exportPayableAging(params);
      const blob = response.data as Blob;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `payable-aging.${params.format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      return blob;
    },
    onSuccess: () => {
      success("应付账龄分析已导出");
    },
    onError: (err: any) => {
      error(err.message || "导出失败");
    },
  });
}
