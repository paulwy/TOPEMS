/**
 * 财务报表API
 * 提供资产负债表、利润表、现金流量表等财务报表的生成和查询功能
 */
export declare const financialReportApi: {
    /**
     * 生成资产负债表
     */
    generateBalanceSheet: (params: {
        company_id: string;
        period: string;
        compare_period?: string;
        currency_code?: string;
        include_disabled_accounts?: boolean;
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 获取资产负债表
     */
    getBalanceSheet: (params: {
        company_id: string;
        period: string;
        currency_code?: string;
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 获取资产负债表历史列表
     */
    getBalanceSheetHistory: (params: {
        company_id: string;
        start_period: string;
        end_period: string;
        currency_code?: string;
        page?: number;
        page_size?: number;
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 生成利润表
     */
    generateIncomeStatement: (params: {
        company_id: string;
        period: string;
        compare_period?: string;
        currency_code?: string;
        include_detail?: boolean;
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 获取利润表
     */
    getIncomeStatement: (params: {
        company_id: string;
        period: string;
        currency_code?: string;
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 获取利润表历史列表
     */
    getIncomeStatementHistory: (params: {
        company_id: string;
        start_period: string;
        end_period: string;
        currency_code?: string;
        page?: number;
        page_size?: number;
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 生成现金流量表
     */
    generateCashFlowStatement: (params: {
        company_id: string;
        period: string;
        compare_period?: string;
        currency_code?: string;
        method?: "direct" | "indirect";
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 获取现金流量表
     */
    getCashFlowStatement: (params: {
        company_id: string;
        period: string;
        currency_code?: string;
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 获取现金流量表历史列表
     */
    getCashFlowStatementHistory: (params: {
        company_id: string;
        start_period: string;
        end_period: string;
        currency_code?: string;
        page?: number;
        page_size?: number;
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 提交报表审批
     */
    submitReportForApproval: (data: {
        report_type: "balance_sheet" | "income_statement" | "cash_flow";
        report_id: string;
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 审批报表
     */
    approveReport: (data: {
        report_type: "balance_sheet" | "income_statement" | "cash_flow";
        report_id: string;
        comment?: string;
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 驳回报表
     */
    rejectReport: (data: {
        report_type: "balance_sheet" | "income_statement" | "cash_flow";
        report_id: string;
        reason: string;
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 锁定报表（禁止修改）
     */
    lockReport: (data: {
        report_type: "balance_sheet" | "income_statement" | "cash_flow";
        report_id: string;
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 解锁报表
     */
    unlockReport: (data: {
        report_type: "balance_sheet" | "income_statement" | "cash_flow";
        report_id: string;
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 获取报表项目明细
     */
    getReportItemDetails: (params: {
        report_type: "balance_sheet" | "income_statement" | "cash_flow";
        report_id: string;
        account_code: string;
        period?: string;
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 获取报表项目凭证列表
     */
    getReportItemVouchers: (params: {
        report_type: "balance_sheet" | "income_statement" | "cash_flow";
        report_id: string;
        account_code: string;
        period?: string;
        page?: number;
        page_size?: number;
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 获取报表对比分析
     */
    getReportComparison: (params: {
        report_type: "balance_sheet" | "income_statement" | "cash_flow";
        company_id: string;
        period_from: string;
        period_to: string;
        currency_code?: string;
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 获取报表趋势分析
     */
    getReportTrend: (params: {
        report_type: "balance_sheet" | "income_statement" | "cash_flow";
        company_id: string;
        period_from: string;
        period_to: string;
        account_codes?: string[];
        currency_code?: string;
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 获取报表同比分析
     */
    getReportYearOverYear: (params: {
        report_type: "balance_sheet" | "income_statement" | "cash_flow";
        company_id: string;
        current_period: string;
        previous_year_period: string;
        currency_code?: string;
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 获取报表环比分析
     */
    getReportPeriodOverPeriod: (params: {
        report_type: "balance_sheet" | "income_statement" | "cash_flow";
        company_id: string;
        current_period: string;
        previous_period: string;
        currency_code?: string;
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 生成合并报表
     */
    generateConsolidatedReport: (params: {
        consolidation_id: string;
        report_type: "balance_sheet" | "income_statement" | "cash_flow";
        period: string;
        currency_code?: string;
        eliminate_intercompany?: boolean;
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 获取合并报表
     */
    getConsolidatedReport: (consolidationId: string, params: {
        report_type: "balance_sheet" | "income_statement" | "cash_flow";
        period: string;
        currency_code?: string;
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 获取合并主体列表
     */
    getConsolidationEntities: (params?: {
        parent_id?: string;
        include_disabled?: boolean;
        page?: number;
        page_size?: number;
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 创建合并主体
     */
    createConsolidationEntity: (data: {
        name: string;
        code: string;
        parent_id?: string;
        entity_type: "holding" | "subsidiary" | "associate" | "joint_venture";
        ownership_percentage: number;
        currency_code?: string;
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 更新合并主体
     */
    updateConsolidationEntity: (entityId: string, data: any) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 删除合并主体
     */
    deleteConsolidationEntity: (entityId: string) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 获取内部交易抵消明细
     */
    getIntercompanyEliminations: (params: {
        consolidation_id: string;
        period: string;
        page?: number;
        page_size?: number;
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 手动添加内部交易抵消
     */
    addIntercompanyElimination: (data: {
        consolidation_id: string;
        period: string;
        description: string;
        debit_account_code: string;
        credit_account_code: string;
        amount: number;
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 导出财务报表
     */
    exportReport: (params: {
        report_type: "balance_sheet" | "income_statement" | "cash_flow";
        report_id?: string;
        company_id: string;
        period: string;
        currency_code?: string;
        format: "pdf" | "xlsx" | "csv";
        include_notes?: boolean;
        include_comparison?: boolean;
    }) => Promise<Blob>;
    /**
     * 批量导出报表
     */
    batchExportReports: (params: {
        report_type: "balance_sheet" | "income_statement" | "cash_flow";
        company_ids: string[];
        periods: string[];
        currency_code?: string;
        format: "pdf" | "xlsx";
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 导出合并报表
     */
    exportConsolidatedReport: (params: {
        consolidation_id: string;
        report_type: "balance_sheet" | "income_statement" | "cash_flow";
        period: string;
        currency_code?: string;
        format: "pdf" | "xlsx";
    }) => Promise<Blob>;
    /**
     * 获取报表订阅列表
     */
    getReportSubscriptions: (params?: {
        report_type?: string;
        is_active?: boolean;
        page?: number;
        page_size?: number;
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 创建报表订阅
     */
    createReportSubscription: (data: {
        name: string;
        report_type: "balance_sheet" | "income_statement" | "cash_flow";
        company_ids: string[];
        periods: string[];
        frequency: "monthly" | "quarterly" | "yearly";
        recipients: {
            user_id?: string;
            email?: string;
        }[];
        format: "pdf" | "xlsx";
        is_active?: boolean;
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 更新报表订阅
     */
    updateReportSubscription: (subscriptionId: string, data: any) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 删除报表订阅
     */
    deleteReportSubscription: (subscriptionId: string) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 立即发送报表
     */
    sendReportNow: (subscriptionId: string) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 获取订阅发送历史
     */
    getSubscriptionHistory: (subscriptionId: string, params?: {
        page?: number;
        page_size?: number;
    }) => Promise<import("./client").ApiResponse<any>>;
};
export default financialReportApi;
