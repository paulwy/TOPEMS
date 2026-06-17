/**
 * CRM财务整合API和类型定义
 * 包含客户信用、应收款、销售发票等与财务相关的接口
 */
/**
 * 客户财务信息
 */
export interface CustomerFinanceInfo {
    customer_id: string;
    bank_name?: string;
    bank_account?: string;
    account_name?: string;
    tax_number?: string;
    invoice_title?: string;
    invoice_type: "normal" | "special";
    credit_limit: number;
    credit_term_days: number;
    payment_terms?: string;
    accounts_receivable: number;
    overdue_receivable: number;
    avg_collection_days: number;
    total_sales: number;
    total_received: number;
    last_transaction_date?: string;
    status: "normal" | "blocked" | "inactive";
    created_at: string;
    updated_at: string;
}
/**
 * 销售发票
 */
export interface SalesInvoice {
    id: string;
    invoice_no: string;
    customer_id: string;
    customer_name?: string;
    amount: number;
    tax_amount: number;
    total_amount: number;
    paid_amount: number;
    pending_amount: number;
    invoice_date: string;
    due_date: string;
    invoice_type: "normal" | "special";
    status: "draft" | "approved" | "issued" | "partially_received" | "received" | "cancelled";
    voucher_id?: string;
    voucher_no?: string;
    remark?: string;
    created_at: string;
}
/**
 * 收款记录
 */
export interface CollectionRecord {
    id: string;
    collection_no: string;
    customer_id: string;
    customer_name?: string;
    amount: number;
    collection_date: string;
    invoice_ids: string[];
    invoice_details?: {
        invoice_id: string;
        invoice_no: string;
        invoice_amount: number;
        allocated_amount: number;
    }[];
    payment_method: "bank_transfer" | "cash" | "credit" | "other";
    bank_account_id?: string;
    voucher_id?: string;
    voucher_no?: string;
    status: "recorded" | "matched" | "cancelled";
    remark?: string;
    created_at: string;
    created_by?: string;
}
/**
 * 收款计划
 */
export interface CollectionPlan {
    id: string;
    plan_no: string;
    customer_id: string;
    customer_name?: string;
    planned_amount: number;
    planned_date: string;
    actual_amount?: number;
    actual_date?: string;
    status: "pending" | "completed" | "overdue" | "cancelled";
    source_type: "increase" | "decrease" | "set";
    source_id?: string;
    source_no?: string;
    remark?: string;
    created_at: string;
    updated_at: string;
}
/**
 * 应收账龄分析
 */
export interface ReceivableAging {
    customer_id: string;
    customer_name: string;
    total: number;
    current: number;
    over_30: number;
    over_60: number;
    over_90: number;
    over_180: number;
    current_ratio: number;
    overdue_ratio: number;
    risk_level: "low" | "medium" | "high" | "critical";
}
export declare const crmFinanceApi: {
    /**
     * 获取客户财务信息
     */
    getCustomerFinanceInfo: (customerId: string) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 更新客户财务信息
     */
    updateCustomerFinanceInfo: (customerId: string, data: Partial<CustomerFinanceInfo>) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 获取客户列表（带财务信息）
     */
    listCustomersWithFinance: (params?: {
        status?: string;
        page?: number;
        page_size?: number;
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 申请信用调整
     */
    applyCreditAdjustment: (data: {
        customer_id: string;
        adjustment_type: "increase" | "decrease" | "set";
        amount: number;
        reason: string;
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 审批信用调整
     */
    approveCreditAdjustment: (id: string, approved: boolean, remark?: string) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 获取信用调整记录
     */
    getCreditAdjustments: (params?: {
        customer_id?: string;
        status?: string;
        page?: number;
        page_size?: number;
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 获取销售发票列表
     */
    getSalesInvoices: (params?: {
        customer_id?: string;
        status?: string;
        start_date?: string;
        end_date?: string;
        page?: number;
        page_size?: number;
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 获取销售发票详情
     */
    getSalesInvoice: (id: string) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 创建销售发票
     */
    createSalesInvoice: (data: Partial<SalesInvoice>) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 更新销售发票
     */
    updateSalesInvoice: (id: string, data: Partial<SalesInvoice>) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 删除销售发票
     */
    deleteSalesInvoice: (id: string) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 审核销售发票
     */
    approveSalesInvoice: (id: string) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 开具发票
     */
    issueSalesInvoice: (id: string) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 作废发票
     */
    cancelSalesInvoice: (id: string, reason: string) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 红冲发票
     */
    redFlushSalesInvoice: (id: string, reason?: string) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 获取收款记录列表
     */
    getCollectionRecords: (params?: {
        customer_id?: string;
        start_date?: string;
        end_date?: string;
        status?: string;
        page?: number;
        page_size?: number;
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 获取收款记录详情
     */
    getCollectionRecord: (id: string) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 创建收款记录
     */
    createCollectionRecord: (data: Partial<CollectionRecord>) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 确认收款
     */
    confirmCollection: (id: string) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 批量确认收款
     */
    batchConfirmCollections: (ids: string[]) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 核销发票
     */
    reconcileInvoices: (data: {
        collection_id: string;
        invoice_ids: string[];
        amounts: number[];
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 获取收款计划列表
     */
    getCollectionPlans: (params?: {
        customer_id?: string;
        status?: string;
        start_date?: string;
        end_date?: string;
        page?: number;
        page_size?: number;
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 创建收款计划
     */
    createCollectionPlan: (data: Partial<CollectionPlan>) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 更新收款计划
     */
    updateCollectionPlan: (id: string, data: Partial<CollectionPlan>) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 完成收款计划
     */
    completeCollectionPlan: (id: string, actual_amount: number, actual_date: string) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 获取应收账龄分析
     */
    getReceivableAging: (params: {
        company_id?: string;
        customer_ids?: string[];
        as_of_date: string;
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 获取逾期应收账款列表
     */
    getOverdueReceivables: (params?: {
        company_id?: string;
        customer_id?: string;
        min_overdue_days?: number;
        page?: number;
        page_size?: number;
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 获取应收账款汇总
     */
    getReceivableSummary: (customerId?: string) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 获取收款统计
     */
    getCollectionStatistics: (params: {
        start_date: string;
        end_date: string;
        group_by: "customer" | "salesperson" | "month";
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 导出销售发票
     */
    exportSalesInvoices: (params: {
        customer_id?: string;
        status?: string;
        start_date?: string;
        end_date?: string;
        format: "csv" | "xlsx";
    }) => Promise<Blob>;
    /**
     * 导出收款记录
     */
    exportCollectionRecords: (params: {
        customer_id?: string;
        start_date?: string;
        end_date?: string;
        format: "csv" | "xlsx";
    }) => Promise<Blob>;
    /**
     * 导出应收账龄分析
     */
    exportReceivableAging: (params: {
        company_id?: string;
        customer_ids?: string[];
        as_of_date: string;
        format: "csv" | "xlsx";
    }) => Promise<Blob>;
};
