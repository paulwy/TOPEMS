/**
 * 财务模块React Query Hooks
 */
import type { Account } from "@/types/erp-finance";
/**
 * 获取科目列表
 */
export declare const useAccounts: (params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    type?: string;
    company_id?: string;
    is_detail?: boolean;
}) => import("@tanstack/react-query").UseQueryResult<NoInfer<import("@/types/erp-finance").ApiResponse<import("@/types/erp-finance").PaginatedResult<Account>>>, Error>;
/**
 * 获取科目树
 */
export declare const useAccountTree: (params?: {
    category?: string;
    status?: string;
    include_disabled?: boolean;
}) => import("@tanstack/react-query").UseQueryResult<NoInfer<import("@/types/erp-finance").ApiResponse<Account[]>>, Error>;
/**
 * 获取科目详情
 */
export declare const useAccount: (id: string) => import("@tanstack/react-query").UseQueryResult<NoInfer<import("@/types/erp-finance").ApiResponse<Account>>, Error>;
/**
 * 获取科目余额
 */
export declare const useAccountBalances: (params: {
    account_ids?: string[];
    period: string;
    company_id?: string;
    department_id?: string;
    project_id?: string;
}) => import("@tanstack/react-query").UseQueryResult<NoInfer<import("@/types/erp-finance").ApiResponse<import("@/types/erp-finance").AccountBalance[]>>, Error>;
/**
 * 获取科目期初余额
 */
export declare const useOpeningBalances: (params: {
    period: string;
    account_ids?: string[];
    company_id?: string;
}) => import("@tanstack/react-query").UseQueryResult<NoInfer<import("@/types/erp-finance").ApiResponse<import("@/types/erp-finance").AccountOpeningBalance[]>>, Error>;
/**
 * 创建科目
 */
export declare const useCreateAccount: () => import("@tanstack/react-query").UseMutationResult<import("@/types/erp-finance").ApiResponse<Account>, any, Partial<Account>, unknown>;
/**
 * 更新科目
 */
export declare const useUpdateAccount: () => import("@tanstack/react-query").UseMutationResult<import("@/types/erp-finance").ApiResponse<Account>, any, {
    id: string;
    data: Partial<Account>;
}, unknown>;
/**
 * 删除科目
 */
export declare const useDeleteAccount: () => import("@tanstack/react-query").UseMutationResult<import("@/types/erp-finance").ApiResponse<void>, any, string, unknown>;
/**
 * 设置期初余额
 */
export declare const useSetOpeningBalance: () => import("@tanstack/react-query").UseMutationResult<import("@/types/erp-finance").ApiResponse<import("@/types/erp-finance").AccountOpeningBalance>, any, {
    accountId: string;
    data: Partial<{
        debit_balance: number;
        credit_balance: number;
        quantity?: number;
        period: string;
    }>;
}, unknown>;
/**
 * 结转期初余额
 */
export declare const useCarryForwardOpeningBalance: () => import("@tanstack/react-query").UseMutationResult<import("@/types/erp-finance").ApiResponse<void>, any, {
    from_period: string;
    to_period: string;
    company_id?: string;
}, unknown>;
