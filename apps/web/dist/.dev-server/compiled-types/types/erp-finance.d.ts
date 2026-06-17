/**
 * ERP财务核心类型定义
 * 包含科目、凭证、财务报表、往来单位等核心实体类型
 */
/**
 * 科目类别
 */
export type AccountCategory = "asset" | "liability" | "equity" | "cost" | "expense" | "income";
/**
 * 余额方向
 */
export type BalanceDirection = "debit" | "credit";
/**
 * 辅助核算维度
 */
export type AccountingDimension = "company" | "department" | "project" | "customer" | "supplier" | "employee" | "product" | "bank";
/**
 * 会计科目
 */
export interface Account {
    id: string;
    code: string;
    name: string;
    name_en?: string;
    full_name?: string;
    category: AccountCategory;
    balance_direction: BalanceDirection;
    type?: string;
    parent_id?: string;
    parent_code?: string;
    level: number;
    has_children: boolean;
    children?: Account[];
    dimensions: AccountingDimension[];
    is_cash_flow: boolean;
    enable_quantity: boolean;
    unit?: string;
    enable_foreign_currency: boolean;
    default_currency?: string;
    status: "active" | "disabled";
    is_active?: boolean;
    is_detail?: boolean;
    description?: string;
    created_at: string;
    updated_at: string;
    created_by?: string;
    updated_by?: string;
}
/**
 * 科目期初余额
 */
export interface AccountOpeningBalance {
    id: string;
    account_id: string;
    account_code: string;
    account_name: string;
    company_id?: string;
    department_id?: string;
    project_id?: string;
    customer_id?: string;
    supplier_id?: string;
    employee_id?: string;
    debit_balance: number;
    credit_balance: number;
    quantity?: number;
    period: string;
    year: number;
    month: number;
    created_at: string;
    updated_at: string;
}
/**
 * 科目余额（实时）
 */
export interface AccountBalance {
    account_id: string;
    account_code: string;
    account_name: string;
    category: AccountCategory;
    balance_direction: BalanceDirection;
    company_id?: string;
    department_id?: string;
    project_id?: string;
    customer_id?: string;
    supplier_id?: string;
    debit_balance: number;
    credit_balance: number;
    quantity?: number;
    period: string;
    period_debit: number;
    period_credit: number;
    year_debit: number;
    year_credit: number;
}
/**
 * 凭证状态
 */
export type VoucherStatus = "draft" | "submitted" | "approved" | "posted" | "reversed";
/**
 * 凭证类型
 */
export type VoucherType = "general" | "payment" | "receipt" | "transfer";
/**
 * 凭证分录
 */
export interface VoucherEntry {
    id: string;
    line_no: number;
    account_id: string;
    account_code: string;
    account_name: string;
    debit_amount: number;
    credit_amount: number;
    quantity?: number;
    unit_price?: number;
    currency_code?: string;
    exchange_rate?: number;
    foreign_amount?: number;
    company_id?: string;
    company_code?: string;
    company_name?: string;
    department_id?: string;
    department_code?: string;
    department_name?: string;
    project_id?: string;
    project_code?: string;
    project_name?: string;
    customer_id?: string;
    customer_code?: string;
    customer_name?: string;
    supplier_id?: string;
    supplier_code?: string;
    supplier_name?: string;
    employee_id?: string;
    employee_code?: string;
    employee_name?: string;
    bank_account_id?: string;
    bank_account_no?: string;
    bank_name?: string;
    summary?: string;
    voucher_id?: string;
}
/**
 * 凭证
 */
export interface Voucher {
    id: string;
    voucher_no: string;
    voucher_type: VoucherType;
    period: string;
    year: number;
    month: number;
    voucher_date: string;
    created_at: string;
    total_amount: number;
    total_debit: number;
    total_credit: number;
    currency_code: string;
    entries: VoucherEntry[];
    status: VoucherStatus;
    submitter_id?: string;
    submitter_name?: string;
    submitted_at?: string;
    approver_id?: string;
    approver_name?: string;
    approved_at?: string;
    poster_id?: string;
    poster_name?: string;
    posted_at?: string;
    is_reversed: boolean;
    reverse_voucher_id?: string;
    reversed_at?: string;
    attachment_count: number;
    summary?: string;
    source_module?: string;
    source_id?: string;
    created_by?: string;
    updated_by?: string;
    updated_at?: string;
}
/**
 * 创建凭证请求
 */
export interface CreateVoucherRequest {
    voucher_type?: VoucherType;
    voucher_date: string;
    period: string;
    summary?: string;
    entries: CreateVoucherEntryRequest[];
    source_module?: string;
    source_id?: string;
}
/**
 * 创建凭证分录请求
 */
export interface CreateVoucherEntryRequest {
    account_id: string;
    debit_amount?: number;
    credit_amount?: number;
    quantity?: number;
    unit_price?: number;
    currency_code?: string;
    exchange_rate?: number;
    foreign_amount?: number;
    company_id?: string;
    department_id?: string;
    project_id?: string;
    customer_id?: string;
    supplier_id?: string;
    employee_id?: string;
    bank_account_id?: string;
    summary?: string;
}
/**
 * 往来单位类型
 */
export type CounterpartyType = "customer" | "supplier" | "both";
/**
 * 银行账户信息
 */
export interface BankAccount {
    bank_name: string;
    account_number: string;
    account_name: string;
    bank_code?: string;
    is_default: boolean;
}
/**
 * 客户/供应商财务信息
 */
export interface CounterpartyFinanceInfo {
    id: string;
    counterparty_id: string;
    bank_accounts: BankAccount[];
    tax_number?: string;
    invoice_title?: string;
    invoice_type: "normal" | "special";
    credit_limit: number;
    credit_term_days: number;
    payment_terms?: string;
    accounts_receivable: number;
    accounts_payable: number;
    overdue_receivable: number;
    overdue_payable: number;
    total_sales?: number;
    total_purchases?: number;
    total_received?: number;
    total_paid?: number;
    status: "normal" | "blocked" | "inactive";
    block_reason?: string;
    created_at: string;
    updated_at: string;
}
/**
 * 客户信息
 */
export interface Customer {
    id: string;
    code: string;
    name: string;
    short_name?: string;
    contact_person?: string;
    contact_phone?: string;
    contact_email?: string;
    address?: string;
    province?: string;
    city?: string;
    district?: string;
    industry?: string;
    business_scope?: string;
    finance_info?: CounterpartyFinanceInfo;
    status: "active" | "inactive" | "blocked";
    created_at: string;
    updated_at: string;
}
/**
 * 供应商信息
 */
export interface Supplier {
    id: string;
    code: string;
    name: string;
    short_name?: string;
    contact_person?: string;
    contact_phone?: string;
    contact_email?: string;
    address?: string;
    province?: string;
    city?: string;
    industry?: string;
    finance_info?: CounterpartyFinanceInfo;
    status: "active" | "inactive" | "blocked";
    created_at: string;
    updated_at: string;
}
/**
 * 发票状态
 */
export type InvoiceStatus = "draft" | "approved" | "invoiced" | "partial_received" | "received" | "overdue";
/**
 * 销售发票（应收）
 */
export interface SalesInvoice {
    id: string;
    invoice_no: string;
    customer_id: string;
    customer_code: string;
    customer_name: string;
    opportunity_id?: string;
    project_id?: string;
    contract_id?: string;
    voucher_id?: string;
    amount: number;
    tax_amount: number;
    total_amount: number;
    received_amount: number;
    pending_amount: number;
    invoice_date: string;
    due_date: string;
    invoice_type: "normal" | "special";
    status: InvoiceStatus;
    overdue_days?: number;
    created_at: string;
    created_by?: string;
}
/**
 * 采购发票（应付）
 */
export interface PurchaseInvoice {
    id: string;
    invoice_no: string;
    supplier_id: string;
    supplier_code: string;
    supplier_name: string;
    order_id?: string;
    receive_id?: string;
    project_id?: string;
    voucher_id?: string;
    amount: number;
    tax_amount: number;
    total_amount: number;
    paid_amount: number;
    pending_amount: number;
    invoice_date: string;
    due_date: string;
    invoice_type: "normal" | "special";
    status: InvoiceStatus;
    overdue_days?: number;
    created_at: string;
    created_by?: string;
}
/**
 * 收款记录
 */
export interface CollectionRecord {
    id: string;
    collection_no: string;
    customer_id: string;
    customer_name: string;
    amount: number;
    collection_date: string;
    invoice_ids: string[];
    invoice_amounts?: {
        invoice_id: string;
        amount: number;
    }[];
    bank_account_id: string;
    bank_account_no: string;
    bank_name: string;
    voucher_id?: string;
    voucher_no?: string;
    status: "recorded" | "matched" | "cancelled";
    created_at: string;
    created_by?: string;
}
/**
 * 付款记录
 */
export interface PaymentRecord {
    id: string;
    payment_no: string;
    supplier_id: string;
    supplier_name: string;
    amount: number;
    payment_date: string;
    invoice_ids: string[];
    invoice_amounts?: {
        invoice_id: string;
        amount: number;
    }[];
    bank_account_id: string;
    bank_account_no: string;
    bank_name: string;
    voucher_id?: string;
    voucher_no?: string;
    status: "recorded" | "matched" | "cancelled";
    created_at: string;
    created_by?: string;
}
/**
 * 资产负债表项目
 */
export interface BalanceSheetItem {
    account_code: string;
    account_name: string;
    amount: number;
    quantity?: number;
    company_id?: string;
    department_id?: string;
    project_id?: string;
}
/**
 * 资产负债表段落
 */
export interface BalanceSheetSection {
    title: string;
    items: BalanceSheetItem[];
    total: number;
}
/**
 * 资产负债表
 */
export interface BalanceSheet {
    id: string;
    report_no?: string;
    company_id: string;
    company_name: string;
    period: string;
    year: number;
    month: number;
    currency_code: string;
    currency_name: string;
    assets: {
        current: BalanceSheetSection;
        non_current: BalanceSheetSection;
        total: number;
    };
    liabilities: {
        current: BalanceSheetSection;
        non_current: BalanceSheetSection;
        total: number;
    };
    equity: {
        paid_in: BalanceSheetSection;
        reserves: BalanceSheetSection;
        retained_earnings: BalanceSheetSection;
        total: number;
    };
    total_liabilities_equity: number;
    balance_check: boolean;
    prepared_by?: string;
    prepared_at?: string;
    reviewed_by?: string;
    reviewed_at?: string;
    approved_by?: string;
    approved_at?: string;
}
/**
 * 利润表项目
 */
export interface IncomeStatementItem {
    account_code: string;
    account_name: string;
    amount: number;
    percentage?: number;
}
/**
 * 利润表段落
 */
export interface IncomeStatementSection {
    title: string;
    items: IncomeStatementItem[];
    total: number;
}
/**
 * 利润表
 */
export interface IncomeStatement {
    id: string;
    report_no?: string;
    company_id: string;
    company_name: string;
    period: string;
    year: number;
    month: number;
    currency_code: string;
    revenue: {
        main_revenue: IncomeStatementSection;
        other_revenue: IncomeStatementSection;
        total: number;
    };
    cost_of_sales: {
        main_cost: IncomeStatementSection;
        other_cost: IncomeStatementSection;
        total: number;
    };
    gross_profit: number;
    gross_margin: number;
    operating_expenses: {
        selling_expense: IncomeStatementSection;
        administrative_expense: IncomeStatementSection;
        rd_expense: IncomeStatementSection;
        financial_expense: IncomeStatementSection;
        total: number;
    };
    operating_profit: number;
    operating_margin: number;
    non_operating: {
        income: IncomeStatementSection;
        expenses: IncomeStatementSection;
        total: number;
    };
    total_profit: number;
    income_tax: number;
    net_profit: number;
    net_margin: number;
    eps: number;
    prepared_by?: string;
    prepared_at?: string;
    reviewed_by?: string;
    approved_by?: string;
}
/**
 * 现金流量表项目
 */
export interface CashFlowItem {
    description: string;
    amount: number;
    detail?: CashFlowItem[];
}
/**
 * 现金流量表段落
 */
export interface CashFlowSection {
    title: string;
    items: CashFlowItem[];
    total: number;
}
/**
 * 现金流量表
 */
export interface CashFlowStatement {
    id: string;
    report_no?: string;
    company_id: string;
    company_name: string;
    period: string;
    year: number;
    month: number;
    currency_code: string;
    operating: {
        inflows: CashFlowSection;
        outflows: CashFlowSection;
        net_flow: number;
    };
    investing: {
        inflows: CashFlowSection;
        outflows: CashFlowSection;
        net_flow: number;
    };
    financing: {
        inflows: CashFlowSection;
        outflows: CashFlowSection;
        net_flow: number;
    };
    net_cash_flow: number;
    beginning_cash: number;
    ending_cash: number;
    cash_equivalent_change: number;
    prepared_by?: string;
    prepared_at?: string;
    reviewed_by?: string;
    approved_by?: string;
}
/**
 * 凭证模板类型
 */
export type VoucherTemplateType = "payroll" | "sales_invoice" | "purchase_invoice" | "collection" | "payment" | "depreciation" | "expense" | "cost_allocation";
/**
 * 凭证模板分录规则
 */
export interface VoucherTemplateEntry {
    id: string;
    line_no: number;
    account_rule_type: "fixed" | "dynamic";
    account_id?: string;
    account_code?: string;
    account_name?: string;
    account_expression?: string;
    amount_rule_type: "fixed" | "field" | "expression";
    fixed_amount?: number;
    amount_field?: string;
    amount_expression?: string;
    direction_rule_type: "fixed" | "expression";
    fixed_direction?: "debit" | "credit";
    direction_expression?: string;
    dimension_rules?: {
        dimension: AccountingDimension;
        source_type: "fixed" | "field" | "expression";
        fixed_value?: string;
        field?: string;
        expression?: string;
    }[];
    summary_rule_type: "fixed" | "field" | "expression";
    fixed_summary?: string;
    summary_field?: string;
    summary_expression?: string;
    condition?: string;
}
/**
 * 凭证模板
 */
export interface VoucherTemplate {
    id: string;
    code: string;
    name: string;
    type: VoucherTemplateType;
    description?: string;
    applicable_modules?: string[];
    applicable_companies?: string[];
    condition?: string;
    entries: VoucherTemplateEntry[];
    status: "active" | "inactive";
    is_default: boolean;
    created_at: string;
    updated_at: string;
    created_by?: string;
}
/**
 * 分页请求参数
 */
export interface PaginationParams {
    page?: number;
    page_size?: number;
}
/**
 * 分页结果
 */
export interface PaginatedResult<T> {
    items: T[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}
/**
 * 查询参数基础接口
 */
export interface QueryParams extends PaginationParams {
    keyword?: string;
    status?: string | string[];
    start_date?: string;
    end_date?: string;
    company_id?: string;
    department_id?: string;
}
/**
 * 凭证查询参数
 */
export interface VoucherQueryParams extends QueryParams {
    voucher_type?: VoucherType | VoucherType[];
    period?: string | string[];
    account_id?: string;
    department_id?: string;
    project_id?: string;
    customer_id?: string;
    supplier_id?: string;
    amount_min?: number;
    amount_max?: number;
}
/**
 * 报表查询参数
 */
export interface ReportQueryParams {
    company_id: string;
    period: string;
    year?: number;
    month?: number;
    compare_period?: string;
    currency_code?: string;
    include_detail?: boolean;
}
/**
 * API统一响应
 */
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: any;
    };
    timestamp: string;
}
/**
 * 批量操作结果
 */
export interface BatchOperationResult {
    total: number;
    success: number;
    failed: number;
    errors: {
        id: string;
        error: string;
    }[];
}
/**
 * 凭证操作结果
 */
export interface VoucherOperationResult {
    success: boolean;
    voucher_id?: string;
    voucher_no?: string;
    message?: string;
}
