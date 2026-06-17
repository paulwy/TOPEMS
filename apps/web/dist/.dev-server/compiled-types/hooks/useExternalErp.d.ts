/**
 * 外部ERP适配器Hooks
 * 封装外部ERP系统集成的React Query hooks
 */
import type { ErpConnectionConfig, CompanyMapping, AccountMappingRule, CustomerMappingRule, SupplierMappingRule, ConnectionTestRequest } from "../types/external-erp";
/**
 * 获取ERP连接列表
 */
export declare function useErpConnections(params?: {
    type?: string;
    status?: string;
    page?: number;
    page_size?: number;
}): import("@tanstack/react-query").UseQueryResult<NoInfer<import("../api/client").ApiResponse<any>>, Error>;
/**
 * 获取连接详情
 */
export declare function useErpConnection(connectionId: string): import("@tanstack/react-query").UseQueryResult<NoInfer<import("../api/client").ApiResponse<any>>, Error>;
/**
 * 创建连接配置
 */
export declare function useCreateErpConnection(): import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<any>, any, {
    type: "kingdee" | "yonyou" | "sap";
    name: string;
    api_url: string;
    app_key?: string;
    app_secret?: string;
    sync_direction?: "import" | "export" | "bidirectional";
    sync_mode?: "realtime" | "scheduled" | "manual";
    company_mappings?: CompanyMapping[];
}, unknown>;
/**
 * 更新连接配置
 */
export declare function useUpdateErpConnection(): import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<any>, any, {
    connectionId: string;
    data: Partial<ErpConnectionConfig>;
}, unknown>;
/**
 * 删除连接配置
 */
export declare function useDeleteErpConnection(): import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<any>, any, string, unknown>;
/**
 * 测试连接
 */
export declare function useTestErpConnection(): import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<any>, any, ConnectionTestRequest, unknown>;
/**
 * 启用/禁用连接
 */
export declare function useToggleErpConnection(): import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<any>, any, {
    connectionId: string;
    enabled: boolean;
}, unknown>;
/**
 * 同步科目
 */
export declare function useSyncAccounts(): import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<any>, any, {
    config_id: string;
    account_ids?: string[];
    include_disabled?: boolean;
    company_id?: string;
    force_sync?: boolean;
}, unknown>;
/**
 * 同步客户
 */
export declare function useSyncCustomers(): import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<any>, any, {
    config_id: string;
    customer_ids?: string[];
    include_inactive?: boolean;
    company_id?: string;
    force_sync?: boolean;
}, unknown>;
/**
 * 同步供应商
 */
export declare function useSyncSuppliers(): import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<any>, any, {
    config_id: string;
    supplier_ids?: string[];
    include_inactive?: boolean;
    company_id?: string;
    force_sync?: boolean;
}, unknown>;
/**
 * 同步凭证
 */
export declare function useSyncVouchers(): import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<any>, any, {
    config_id: string;
    voucher_ids?: string[];
    period_from?: string;
    period_to?: string;
    status?: string[];
    company_id?: string;
    force_sync?: boolean;
}, unknown>;
/**
 * 全量同步
 */
export declare function useFullSync(): import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<any>, any, {
    config_id: string;
    company_id?: string;
    sync_modules?: string[];
}, unknown>;
/**
 * 获取同步日志列表
 */
export declare function useSyncLogs(params?: {
    config_id?: string;
    type?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    page_size?: number;
}): import("@tanstack/react-query").UseQueryResult<NoInfer<import("../api/client").ApiResponse<any>>, Error>;
/**
 * 获取同步日志详情
 */
export declare function useSyncLogDetail(logId: string): import("@tanstack/react-query").UseQueryResult<NoInfer<import("../api/client").ApiResponse<any>>, Error>;
/**
 * 获取同步统计
 */
export declare function useSyncStatistics(connectionId: string, params?: {
    start_date?: string;
    end_date?: string;
}): import("@tanstack/react-query").UseQueryResult<NoInfer<import("../api/client").ApiResponse<any>>, Error>;
/**
 * 获取科目映射列表
 */
export declare function useAccountMappings(connectionId: string, params?: {
    page?: number;
    page_size?: number;
}): import("@tanstack/react-query").UseQueryResult<NoInfer<import("../api/client").ApiResponse<any>>, Error>;
/**
 * 批量导入科目映射
 */
export declare function useImportAccountMappings(): import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<any>, any, {
    connectionId: string;
    mappings: Partial<AccountMappingRule>[];
}, unknown>;
/**
 * 自动匹配科目映射
 */
export declare function useAutoMatchAccountMappings(): import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<any>, any, string, unknown>;
/**
 * 获取客户映射列表
 */
export declare function useCustomerMappings(connectionId: string, params?: {
    page?: number;
    page_size?: number;
}): import("@tanstack/react-query").UseQueryResult<NoInfer<import("../api/client").ApiResponse<any>>, Error>;
/**
 * 批量导入客户映射
 */
export declare function useImportCustomerMappings(): import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<any>, any, {
    connectionId: string;
    mappings: Partial<CustomerMappingRule>[];
}, unknown>;
/**
 * 获取供应商映射列表
 */
export declare function useSupplierMappings(connectionId: string, params?: {
    page?: number;
    page_size?: number;
}): import("@tanstack/react-query").UseQueryResult<NoInfer<import("../api/client").ApiResponse<any>>, Error>;
/**
 * 批量导入供应商映射
 */
export declare function useImportSupplierMappings(): import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<any>, any, {
    connectionId: string;
    mappings: Partial<SupplierMappingRule>[];
}, unknown>;
/**
 * 预览外部ERP科目
 */
export declare function usePreviewExternalAccounts(connectionId: string, params?: {
    keyword?: string;
    page?: number;
    page_size?: number;
}): import("@tanstack/react-query").UseQueryResult<NoInfer<import("../api/client").ApiResponse<any>>, Error>;
/**
 * 预览外部ERP客户
 */
export declare function usePreviewExternalCustomers(connectionId: string, params?: {
    keyword?: string;
    page?: number;
    page_size?: number;
}): import("@tanstack/react-query").UseQueryResult<NoInfer<import("../api/client").ApiResponse<any>>, Error>;
/**
 * 预览外部ERP供应商
 */
export declare function usePreviewExternalSuppliers(connectionId: string, params?: {
    keyword?: string;
    page?: number;
    page_size?: number;
}): import("@tanstack/react-query").UseQueryResult<NoInfer<import("../api/client").ApiResponse<any>>, Error>;
/**
 * 导出同步日志
 */
export declare function useExportSyncLogs(): import("@tanstack/react-query").UseMutationResult<Blob, any, {
    config_id?: string;
    type?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    format: "csv" | "xlsx";
}, unknown>;
/**
 * 导出映射规则
 */
export declare function useExportMappingRules(): import("@tanstack/react-query").UseMutationResult<Blob, any, {
    config_id: string;
    mapping_type: "account" | "customer" | "supplier" | "project" | "department" | "employee";
    format: "csv" | "xlsx";
}, unknown>;
