/**
 * CRM客户关系财务Hooks
 * 封装CRM模块财务数据获取和操作的React Query hooks
 */
import type { CustomerFinanceInfo, SalesInvoice, CollectionRecord } from "../api/crm-finance";
/**
 * 获取客户财务信息
 */
export declare function useCustomerFinanceInfo(customerId: string): import("@tanstack/react-query").UseQueryResult<NoInfer<import("../api/client").ApiResponse<any>>, Error>;
/**
 * 更新客户财务信息
 */
export declare function useUpdateCustomerFinanceInfo(): import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<any>, any, {
    customerId: string;
    data: Partial<CustomerFinanceInfo>;
}, unknown>;
/**
 * 获取销售发票列表
 */
export declare function useSalesInvoices(params?: {
    customer_id?: string;
    invoice_type?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    page_size?: number;
}): import("@tanstack/react-query").UseQueryResult<NoInfer<import("../api/client").ApiResponse<any>>, Error>;
/**
 * 获取销售发票详情
 */
export declare function useSalesInvoice(invoiceId: string): import("@tanstack/react-query").UseQueryResult<NoInfer<import("../api/client").ApiResponse<any>>, Error>;
/**
 * 创建销售发票
 */
export declare function useCreateSalesInvoice(): import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<any>, any, Partial<SalesInvoice>, unknown>;
/**
 * 更新销售发票
 */
export declare function useUpdateSalesInvoice(): import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<any>, any, {
    invoiceId: string;
    data: Partial<SalesInvoice>;
}, unknown>;
/**
 * 删除销售发票
 */
export declare function useDeleteSalesInvoice(): import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<any>, any, string, unknown>;
/**
 * 开具发票
 */
export declare function useIssueSalesInvoice(): import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<any>, any, string, unknown>;
/**
 * 作废发票
 */
export declare function useVoidSalesInvoice(): import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<any>, any, {
    invoiceId: string;
    reason?: string;
}, unknown>;
/**
 * 红冲发票
 */
export declare function useRedFlushSalesInvoice(): import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<any>, any, {
    invoiceId: string;
    reason?: string;
}, unknown>;
/**
 * 获取收款记录列表
 */
export declare function useCollectionRecords(params?: {
    customer_id?: string;
    start_date?: string;
    end_date?: string;
    payment_method?: string;
    page?: number;
    page_size?: number;
}): import("@tanstack/react-query").UseQueryResult<NoInfer<import("../api/client").ApiResponse<any>>, Error>;
/**
 * 获取收款记录详情
 */
export declare function useCollectionRecord(recordId: string): import("@tanstack/react-query").UseQueryResult<NoInfer<import("../api/client").ApiResponse<any>>, Error>;
/**
 * 创建收款记录
 */
export declare function useCreateCollectionRecord(): import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<any>, any, Partial<CollectionRecord>, unknown>;
/**
 * 确认收款
 */
export declare function useConfirmCollection(): import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<any>, any, string, unknown>;
/**
 * 批量确认收款
 */
export declare function useBatchConfirmCollections(): import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<any>, any, string[], unknown>;
/**
 * 获取应收账龄分析
 */
export declare function useReceivableAging(params: {
    company_id?: string;
    customer_ids?: string[];
    as_of_date: string;
}): import("@tanstack/react-query").UseQueryResult<NoInfer<import("../api/client").ApiResponse<any>>, Error>;
/**
 * 获取客户应收账款汇总
 */
export declare function useCustomerReceivableSummary(customerId?: string): import("@tanstack/react-query").UseQueryResult<NoInfer<import("../api/client").ApiResponse<any>>, Error>;
/**
 * 获取逾期应收账款列表
 */
export declare function useOverdueReceivables(params?: {
    company_id?: string;
    customer_id?: string;
    min_overdue_days?: number;
    page?: number;
    page_size?: number;
}): import("@tanstack/react-query").UseQueryResult<NoInfer<import("../api/client").ApiResponse<any>>, Error>;
/**
 * 导出销售发票
 */
export declare function useExportSalesInvoices(): import("@tanstack/react-query").UseMutationResult<Blob, any, {
    customer_id?: string;
    invoice_type?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    format: "csv" | "xlsx";
}, unknown>;
/**
 * 导出收款记录
 */
export declare function useExportCollectionRecords(): import("@tanstack/react-query").UseMutationResult<Blob, any, {
    customer_id?: string;
    start_date?: string;
    end_date?: string;
    format: "csv" | "xlsx";
}, unknown>;
/**
 * 导出应收账龄分析
 */
export declare function useExportReceivableAging(): import("@tanstack/react-query").UseMutationResult<Blob, any, {
    company_id?: string;
    customer_ids?: string[];
    as_of_date: string;
    format: "csv" | "xlsx";
}, unknown>;
