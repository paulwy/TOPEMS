/**
 * 财务报表Hooks
 * 封装财务报表生成和查询的React Query hooks
 */
/**
 * 生成资产负债表
 */
export declare function useGenerateBalanceSheet(): import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<any>, any, {
    company_id: string;
    period: string;
    compare_period?: string;
    currency_code?: string;
    include_disabled_accounts?: boolean;
}, unknown>;
/**
 * 获取资产负债表
 */
export declare function useBalanceSheet(params: {
    company_id: string;
    period: string;
    currency_code?: string;
}): import("@tanstack/react-query").UseQueryResult<NoInfer<import("../api/client").ApiResponse<any>>, Error>;
/**
 * 获取资产负债表历史
 */
export declare function useBalanceSheetHistory(params: {
    company_id: string;
    start_period: string;
    end_period: string;
    currency_code?: string;
    page?: number;
    page_size?: number;
}): import("@tanstack/react-query").UseQueryResult<NoInfer<import("../api/client").ApiResponse<any>>, Error>;
/**
 * 生成利润表
 */
export declare function useGenerateIncomeStatement(): import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<any>, any, {
    company_id: string;
    period: string;
    compare_period?: string;
    currency_code?: string;
    include_detail?: boolean;
}, unknown>;
/**
 * 获取利润表
 */
export declare function useIncomeStatement(params: {
    company_id: string;
    period: string;
    currency_code?: string;
}): import("@tanstack/react-query").UseQueryResult<NoInfer<import("../api/client").ApiResponse<any>>, Error>;
/**
 * 获取利润表历史
 */
export declare function useIncomeStatementHistory(params: {
    company_id: string;
    start_period: string;
    end_period: string;
    currency_code?: string;
    page?: number;
    page_size?: number;
}): import("@tanstack/react-query").UseQueryResult<NoInfer<import("../api/client").ApiResponse<any>>, Error>;
/**
 * 生成现金流量表
 */
export declare function useGenerateCashFlowStatement(): import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<any>, any, {
    company_id: string;
    period: string;
    compare_period?: string;
    currency_code?: string;
    method?: "direct" | "indirect";
}, unknown>;
/**
 * 获取现金流量表
 */
export declare function useCashFlowStatement(params: {
    company_id: string;
    period: string;
    currency_code?: string;
}): import("@tanstack/react-query").UseQueryResult<NoInfer<import("../api/client").ApiResponse<any>>, Error>;
/**
 * 获取现金流量表历史
 */
export declare function useCashFlowStatementHistory(params: {
    company_id: string;
    start_period: string;
    end_period: string;
    currency_code?: string;
    page?: number;
    page_size?: number;
}): import("@tanstack/react-query").UseQueryResult<NoInfer<import("../api/client").ApiResponse<any>>, Error>;
/**
 * 提交报表审批
 */
export declare function useSubmitReportForApproval(): import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<any>, any, {
    report_type: "balance_sheet" | "income_statement" | "cash_flow";
    report_id: string;
}, unknown>;
/**
 * 审批报表
 */
export declare function useApproveReport(): import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<any>, any, {
    report_type: "balance_sheet" | "income_statement" | "cash_flow";
    report_id: string;
    comment?: string;
}, unknown>;
/**
 * 驳回报表
 */
export declare function useRejectReport(): import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<any>, any, {
    report_type: "balance_sheet" | "income_statement" | "cash_flow";
    report_id: string;
    reason: string;
}, unknown>;
/**
 * 锁定报表
 */
export declare function useLockReport(): import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<any>, any, {
    report_type: "balance_sheet" | "income_statement" | "cash_flow";
    report_id: string;
}, unknown>;
/**
 * 解锁报表
 */
export declare function useUnlockReport(): import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<any>, any, {
    report_type: "balance_sheet" | "income_statement" | "cash_flow";
    report_id: string;
}, unknown>;
/**
 * 获取报表对比分析
 */
export declare function useReportComparison(params: {
    report_type: "balance_sheet" | "income_statement" | "cash_flow";
    company_id: string;
    period_from: string;
    period_to: string;
    currency_code?: string;
}): import("@tanstack/react-query").UseQueryResult<NoInfer<import("../api/client").ApiResponse<any>>, Error>;
/**
 * 获取报表趋势分析
 */
export declare function useReportTrend(params: {
    report_type: "balance_sheet" | "income_statement" | "cash_flow";
    company_id: string;
    period_from: string;
    period_to: string;
    account_codes?: string[];
    currency_code?: string;
}): import("@tanstack/react-query").UseQueryResult<NoInfer<import("../api/client").ApiResponse<any>>, Error>;
/**
 * 获取报表同比分析
 */
export declare function useReportYearOverYear(params: {
    report_type: "balance_sheet" | "income_statement" | "cash_flow";
    company_id: string;
    current_period: string;
    previous_year_period: string;
    currency_code?: string;
}): import("@tanstack/react-query").UseQueryResult<NoInfer<import("../api/client").ApiResponse<any>>, Error>;
/**
 * 获取报表环比分析
 */
export declare function useReportPeriodOverPeriod(params: {
    report_type: "balance_sheet" | "income_statement" | "cash_flow";
    company_id: string;
    current_period: string;
    previous_period: string;
    currency_code?: string;
}): import("@tanstack/react-query").UseQueryResult<NoInfer<import("../api/client").ApiResponse<any>>, Error>;
/**
 * 生成合并报表
 */
export declare function useGenerateConsolidatedReport(): import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<any>, any, {
    consolidation_id: string;
    report_type: "balance_sheet" | "income_statement" | "cash_flow";
    period: string;
    currency_code?: string;
    eliminate_intercompany?: boolean;
}, unknown>;
/**
 * 获取合并报表
 */
export declare function useConsolidatedReport(consolidationId: string, params: {
    report_type: "balance_sheet" | "income_statement" | "cash_flow";
    period: string;
    currency_code?: string;
}): import("@tanstack/react-query").UseQueryResult<NoInfer<import("../api/client").ApiResponse<any>>, Error>;
/**
 * 获取合并主体列表
 */
export declare function useConsolidationEntities(params?: {
    parent_id?: string;
    include_disabled?: boolean;
    page?: number;
    page_size?: number;
}): import("@tanstack/react-query").UseQueryResult<NoInfer<import("../api/client").ApiResponse<any>>, Error>;
/**
 * 创建合并主体
 */
export declare function useCreateConsolidationEntity(): import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<any>, any, {
    name: string;
    code: string;
    parent_id?: string;
    entity_type: "holding" | "subsidiary" | "associate" | "joint_venture";
    ownership_percentage: number;
    currency_code?: string;
}, unknown>;
/**
 * 更新合并主体
 */
export declare function useUpdateConsolidationEntity(): import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<any>, any, {
    entityId: string;
    data: any;
}, unknown>;
/**
 * 删除合并主体
 */
export declare function useDeleteConsolidationEntity(): import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<any>, any, string, unknown>;
/**
 * 导出财务报表
 */
export declare function useExportFinancialReport(): import("@tanstack/react-query").UseMutationResult<Blob, any, {
    report_type: "balance_sheet" | "income_statement" | "cash_flow";
    report_id?: string;
    company_id: string;
    period: string;
    currency_code?: string;
    format: "pdf" | "xlsx" | "csv";
    include_notes?: boolean;
    include_comparison?: boolean;
}, unknown>;
/**
 * 导出合并报表
 */
export declare function useExportConsolidatedReport(): import("@tanstack/react-query").UseMutationResult<Blob, any, {
    consolidation_id: string;
    report_type: "balance_sheet" | "income_statement" | "cash_flow";
    period: string;
    currency_code?: string;
    format: "pdf" | "xlsx";
}, unknown>;
