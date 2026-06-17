import type { ApiResponse } from "./client";
export interface Asset {
    id: string;
    asset_number: string;
    name: string;
    category?: string;
    brand?: string;
    model?: string;
    purchase_date?: string;
    purchase_amount?: number;
    location?: string;
    responsible_id?: string;
    status: string;
    created_at: string;
    updated_at: string;
    serial_number?: string;
    manufacturer?: string;
    rated_power?: number;
    rated_voltage?: number;
    rated_current?: number;
    specifications?: any;
    image_url?: string;
    department?: string;
}
export interface Expense {
    id: string;
    expense_number: string;
    applicant_name?: string;
    department_id?: string;
    expense_type: string;
    amount: number;
    description?: string;
    expense_date?: string;
    receipt_count?: number;
    status: string;
    approver_id?: string;
    approved_at?: string;
    reimbursed_at?: string;
    created_at: string;
    updated_at: string;
}
export interface Budget {
    id: string;
    department_id?: string;
    budget_type?: string;
    fiscal_year?: string;
    total_budget: number;
    used_amount?: number;
    remaining_amount?: number;
    usage_rate?: number;
    status: string;
    created_at: string;
    updated_at: string;
}
export interface Receivable {
    id: string;
    invoice_number: string;
    customer_name?: string;
    supplier_name?: string;
    project_name?: string;
    category?: string;
    amount: number;
    invoice_date?: string;
    due_date?: string;
    status: string;
    received_amount?: number;
    paid_amount?: number;
    created_at: string;
    updated_at: string;
}
export interface Payable {
    id: string;
    invoice_number: string;
    supplier_name?: string;
    category?: string;
    amount: number;
    invoice_date?: string;
    due_date?: string;
    status: string;
    paid_amount?: number;
    created_at: string;
    updated_at: string;
}
export interface AccountingSubject {
    id: string;
    code: string;
    name: string;
    category?: string;
    level: number;
    parent_code?: string;
    description?: string;
    is_cash_flow: boolean;
    status: string;
    created_at: string;
    updated_at: string;
}
export interface FinancialVoucher {
    id: string;
    voucher_number: string;
    voucher_date: string;
    period: string;
    attachment_count?: number;
    summary?: string;
    maker_id?: string;
    maker_name?: string;
    checker_id?: string;
    checker_name?: string;
    bookkeeper_id?: string;
    bookkeeper_name?: string;
    status: string;
    total_debit: number;
    total_credit: number;
    source_system?: string;
    source_id?: string;
    project_id?: string;
    contract_id?: string;
    created_at: string;
    updated_at: string;
}
export interface VoucherItem {
    id: string;
    voucher_id: string;
    line_number: number;
    subject_code: string;
    subject_name: string;
    summary?: string;
    debit_amount: number;
    credit_amount: number;
    quantity?: number;
    unit?: string;
    price?: number;
    department_id?: string;
    project_id?: string;
    contract_id?: string;
    created_at: string;
    updated_at: string;
}
export interface VoucherItemRequest {
    line_number: number;
    subject_code: string;
    subject_name?: string;
    summary?: string;
    debit_amount: number;
    credit_amount: number;
    quantity?: number;
    unit?: string;
    price?: number;
    department_id?: string;
    project_id?: string;
    contract_id?: string;
}
export interface CreateFinancialVoucherRequest {
    voucher_number: string;
    voucher_date: string;
    period: string;
    attachment_count?: number;
    summary?: string;
    maker_id?: string;
    maker_name?: string;
    project_id?: string;
    contract_id?: string;
    items: VoucherItemRequest[];
}
export interface VoucherImportResult {
    success_count: number;
    failed_count: number;
    errors: string[];
    imported_vouchers: FinancialVoucher[];
}
export interface BalanceItem {
    code: string;
    name: string;
    amount: number;
    percentage: number;
}
export interface BalanceSheet {
    assets: BalanceItem[];
    liabilities: BalanceItem[];
    equity: BalanceItem[];
    total_assets: number;
    total_liabilities: number;
    total_equity: number;
    period: string;
}
export interface IncomeItem {
    code: string;
    name: string;
    amount: number;
    percentage: number;
}
export interface IncomeStatement {
    revenues: IncomeItem[];
    expenses: IncomeItem[];
    gross_profit: number;
    operating_profit: number;
    net_profit: number;
    period: string;
}
export interface CashFlowItem {
    code: string;
    name: string;
    amount: number;
}
export interface CashFlowStatement {
    operating_activities: CashFlowItem[];
    investing_activities: CashFlowItem[];
    financing_activities: CashFlowItem[];
    net_cash_flow: number;
    period: string;
}
export interface ProjectFinancialSummary {
    project_id: string;
    project_name: string;
    contract_amount: number;
    received_amount: number;
    payable_amount: number;
    paid_amount: number;
    profit: number;
    margin: number;
    status: string;
}
export interface KeyRatios {
    current_ratio: number;
    debt_ratio: number;
    return_on_equity: number;
    profit_margin: number;
    return_on_assets: number;
    earnings_per_share: number;
}
export interface BusinessOverview {
    total_assets: number;
    total_liabilities: number;
    total_equity: number;
    total_revenue: number;
    total_expenses: number;
    net_profit: number;
    cash_flow: number;
    period: string;
    key_ratios: KeyRatios;
    receivable_turnover: number;
    inventory_turnover: number;
    asset_turnover: number;
}
export interface MonthlyTrend {
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
    cash_flow: number;
    profit_margin: number;
}
export interface DepartmentFinancialSummary {
    department_id?: string;
    department_name: string;
    total_expenses: number;
    budget_amount: number;
    budget_usage: number;
    expense_count: number;
}
export interface AgingAnalysis {
    category: string;
    days_0_30: number;
    days_31_60: number;
    days_61_90: number;
    days_91_180: number;
    days_181: number;
    total: number;
}
export interface CashFlowAnalysis {
    period: string;
    operating_cash_flow: number;
    investing_cash_flow: number;
    financing_cash_flow: number;
    net_cash_flow: number;
    cash_flow_ratio: number;
    operating_cash_flow_to_revenue: number;
}
export interface ExpenseAnalysis {
    period: string;
    total_expenses: number;
    department_expenses: DepartmentExpense[];
    category_expenses: CategoryExpense[];
    monthly_trend: MonthlyExpense[];
}
export interface DepartmentExpense {
    department_id?: string;
    department_name: string;
    amount: number;
    percentage: number;
}
export interface CategoryExpense {
    category: string;
    amount: number;
    percentage: number;
}
export interface MonthlyExpense {
    month: string;
    amount: number;
    growth_rate: number;
}
export interface ProfitAnalysis {
    period: string;
    gross_profit: number;
    operating_profit: number;
    net_profit: number;
    gross_margin: number;
    operating_margin: number;
    net_margin: number;
    profit_trend: MonthlyProfit[];
}
export interface MonthlyProfit {
    month: string;
    gross_profit: number;
    operating_profit: number;
    net_profit: number;
}
export interface FinancialOverview {
    total_assets: number;
    total_liabilities: number;
    total_equity: number;
    total_revenue: number;
    total_expenses: number;
    net_profit: number;
    operating_cash_flow: number;
    key_ratios: KeyRatios;
    profit_margin: number;
    return_on_assets: number;
    return_on_equity: number;
    debt_ratio: number;
    current_ratio: number;
}
export interface OfficeSupply {
    id: string;
    name: string;
    category?: string;
    quantity: number;
    unit?: string;
    price?: number;
    location?: string;
    status: string;
    created_at: string;
    updated_at: string;
}
export interface MeetingRoom {
    id: string;
    name: string;
    capacity: number;
    location?: string;
    facilities?: string[];
    status: string;
    created_at: string;
    updated_at: string;
}
export interface MeetingBooking {
    id: string;
    room_id: string;
    room_name: string;
    title: string;
    organizer: string;
    start_time: string;
    end_time: string;
    status: string;
    created_at: string;
    updated_at: string;
}
export interface Vehicle {
    id: string;
    plate_number: string;
    brand?: string;
    model?: string;
    vehicle_type?: string;
    status: string;
    driver?: string;
    last_service?: string;
    mileage?: number;
    fuel_type?: string;
    created_at: string;
    updated_at: string;
}
export interface VehicleRequest {
    id: string;
    vehicle_id: string;
    vehicle_plate: string;
    requester: string;
    purpose: string;
    start_time: string;
    end_time: string;
    driver_required: boolean;
    status: string;
    approved_by?: string;
    approved_at?: string;
    rejected_reason?: string;
    created_at: string;
    updated_at: string;
}
export interface OpeningBalance {
    id: string;
    company_id: string;
    subject_code: string;
    subject_name: string;
    period: string;
    debit_balance: number;
    credit_balance: number;
    created_at: string;
    updated_at: string;
}
export interface CreateOpeningBalanceRequest {
    company_id: string;
    subject_code: string;
    subject_name: string;
    period: string;
    debit_balance: number;
    credit_balance: number;
}
export interface CarryForwardRequest {
    from_period: string;
    to_period: string;
}
export interface FixedAsset {
    id: string;
    asset_code: string;
    asset_name: string;
    asset_type: string;
    asset_category?: string;
    purchase_date: string;
    original_value: number;
    accumulated_depreciation: number;
    net_value: number;
    depreciation_method: string;
    expected_life: number;
    salvage_value: number;
    monthly_depreciation: number;
    location?: string;
    responsible_id?: string;
    department_id?: string;
    status: string;
    created_at: string;
    updated_at: string;
}
export interface DepreciateRequest {
    period: string;
    asset_ids?: string[];
}
export interface DepreciationResult {
    depreciated_count: number;
    errors: string[];
    period: string;
}
export interface BankAccount {
    id: string;
    company_id: string;
    bank_name: string;
    branch_name?: string;
    account_name: string;
    account_number: string;
    account_type: string;
    balance: number;
    currency: string;
    status: string;
    created_at: string;
    updated_at: string;
}
export interface BankTransaction {
    id: string;
    account_id: string;
    transaction_date: string;
    transaction_type: string;
    amount: number;
    balance_after: number;
    description?: string;
    counterparty_account?: string;
    counterparty_name?: string;
    voucher_id?: string;
    created_at: string;
}
export interface CreateBankTransactionRequest {
    account_id: string;
    transaction_date: string;
    transaction_type: string;
    amount: number;
    description?: string;
    counterparty_account?: string;
    counterparty_name?: string;
    voucher_id?: string;
}
export interface Announcement {
    id: string;
    title: string;
    content?: string;
    author: string;
    status: string;
    priority?: string;
    publish_at?: string;
    expire_at?: string;
    created_at: string;
    updated_at: string;
}
export interface PaginationParams {
    page?: number;
    page_size?: number;
    search?: string;
    status?: string;
}
export interface PaginatedResult<T> {
    items: T[];
    total: number;
    page: number;
    page_size: number;
}
export declare const assetApi: {
    list(params?: PaginationParams): Promise<ApiResponse<PaginatedResult<Asset>>>;
    get(id: string): Promise<ApiResponse<Asset>>;
    create(data: Partial<Asset>): Promise<ApiResponse<Asset>>;
    update(id: string, data: Partial<Asset>): Promise<ApiResponse<Asset>>;
    delete(id: string): Promise<ApiResponse<string>>;
};
export declare const erpApi: {
    health(): Promise<ApiResponse<string>>;
};
export declare const expenseApi: {
    list(params?: PaginationParams): Promise<ApiResponse<PaginatedResult<Expense>>>;
    get(id: string): Promise<ApiResponse<Expense>>;
    create(data: Partial<Expense>): Promise<ApiResponse<Expense>>;
    update(id: string, data: Partial<Expense>): Promise<ApiResponse<Expense>>;
    delete(id: string): Promise<ApiResponse<string>>;
};
export declare const budgetApi: {
    list(params?: PaginationParams): Promise<ApiResponse<PaginatedResult<Budget>>>;
    get(id: string): Promise<ApiResponse<Budget>>;
    create(data: Partial<Budget>): Promise<ApiResponse<Budget>>;
    update(id: string, data: Partial<Budget>): Promise<ApiResponse<Budget>>;
    delete(id: string): Promise<ApiResponse<string>>;
};
export declare const receivableApi: {
    list(params?: PaginationParams): Promise<ApiResponse<PaginatedResult<Receivable>>>;
    get(id: string): Promise<ApiResponse<Receivable>>;
    create(data: Partial<Receivable>): Promise<ApiResponse<Receivable>>;
    update(id: string, data: Partial<Receivable>): Promise<ApiResponse<Receivable>>;
    delete(id: string): Promise<ApiResponse<string>>;
};
export declare const payableApi: {
    list(params?: PaginationParams): Promise<ApiResponse<PaginatedResult<Payable>>>;
    get(id: string): Promise<ApiResponse<Payable>>;
    create(data: Partial<Payable>): Promise<ApiResponse<Payable>>;
    update(id: string, data: Partial<Payable>): Promise<ApiResponse<Payable>>;
    delete(id: string): Promise<ApiResponse<string>>;
};
export declare const accountingSubjectApi: {
    list(params?: PaginationParams): Promise<ApiResponse<PaginatedResult<AccountingSubject>>>;
    get(id: string): Promise<ApiResponse<AccountingSubject>>;
    create(data: Partial<AccountingSubject>): Promise<ApiResponse<AccountingSubject>>;
    update(id: string, data: Partial<AccountingSubject>): Promise<ApiResponse<AccountingSubject>>;
    delete(id: string): Promise<ApiResponse<string>>;
};
export declare const voucherApi: {
    list(params?: PaginationParams & {
        period?: string;
    }): Promise<ApiResponse<PaginatedResult<FinancialVoucher>>>;
    get(id: string): Promise<ApiResponse<FinancialVoucher>>;
    getItems(id: string): Promise<ApiResponse<VoucherItem[]>>;
    create(data: CreateFinancialVoucherRequest): Promise<ApiResponse<FinancialVoucher>>;
    update(id: string, data: Partial<FinancialVoucher>): Promise<ApiResponse<FinancialVoucher>>;
    delete(id: string): Promise<ApiResponse<string>>;
    importU8(data: {
        file_name: string;
        file_content: string;
        import_mode: string;
    }): Promise<ApiResponse<VoucherImportResult>>;
};
export declare const financeReportApi: {
    balanceSheet(params?: {
        period?: string;
    }): Promise<ApiResponse<BalanceSheet>>;
    incomeStatement(params?: {
        period?: string;
    }): Promise<ApiResponse<IncomeStatement>>;
    cashFlowStatement(params?: {
        period?: string;
    }): Promise<ApiResponse<CashFlowStatement>>;
    businessOverview(params?: {
        period?: string;
    }): Promise<ApiResponse<BusinessOverview>>;
    projectSummary(params?: {
        project_id?: string;
    }): Promise<ApiResponse<ProjectFinancialSummary[]>>;
    monthlyTrend(): Promise<ApiResponse<MonthlyTrend[]>>;
    departmentSummary(params?: {
        department_id?: string;
    }): Promise<ApiResponse<DepartmentFinancialSummary[]>>;
    agingAnalysis(): Promise<ApiResponse<AgingAnalysis[]>>;
    voucherStatistics(params?: {
        period?: string;
    }): Promise<ApiResponse<Record<string, any>>>;
    cashFlowAnalysis(params?: {
        period?: string;
    }): Promise<ApiResponse<CashFlowAnalysis>>;
    expenseAnalysis(params?: {
        period?: string;
    }): Promise<ApiResponse<ExpenseAnalysis>>;
    profitAnalysis(params?: {
        period?: string;
    }): Promise<ApiResponse<ProfitAnalysis>>;
    financialOverview(params?: {
        period?: string;
    }): Promise<ApiResponse<FinancialOverview>>;
};
export declare const officeSupplyApi: {
    list(params?: PaginationParams & {
        category?: string;
    }): Promise<ApiResponse<PaginatedResult<OfficeSupply>>>;
    get(id: string): Promise<ApiResponse<OfficeSupply>>;
    create(data: Partial<OfficeSupply>): Promise<ApiResponse<OfficeSupply>>;
    update(id: string, data: Partial<OfficeSupply>): Promise<ApiResponse<OfficeSupply>>;
    delete(id: string): Promise<ApiResponse<string>>;
};
export declare const meetingRoomApi: {
    list(params?: PaginationParams): Promise<ApiResponse<PaginatedResult<MeetingRoom>>>;
    get(id: string): Promise<ApiResponse<MeetingRoom>>;
    create(data: Partial<MeetingRoom>): Promise<ApiResponse<MeetingRoom>>;
    update(id: string, data: Partial<MeetingRoom>): Promise<ApiResponse<MeetingRoom>>;
    delete(id: string): Promise<ApiResponse<string>>;
    getBookings(id: string): Promise<ApiResponse<MeetingBooking[]>>;
};
export declare const meetingBookingApi: {
    list(params?: PaginationParams): Promise<ApiResponse<PaginatedResult<MeetingBooking>>>;
    get(id: string): Promise<ApiResponse<MeetingBooking>>;
    create(data: Partial<MeetingBooking>): Promise<ApiResponse<MeetingBooking>>;
    update(id: string, data: Partial<MeetingBooking>): Promise<ApiResponse<MeetingBooking>>;
    delete(id: string): Promise<ApiResponse<string>>;
};
export declare const vehicleApi: {
    list(params?: PaginationParams & {
        vehicle_type?: string;
    }): Promise<ApiResponse<PaginatedResult<Vehicle>>>;
    get(id: string): Promise<ApiResponse<Vehicle>>;
    create(data: Partial<Vehicle>): Promise<ApiResponse<Vehicle>>;
    update(id: string, data: Partial<Vehicle>): Promise<ApiResponse<Vehicle>>;
    delete(id: string): Promise<ApiResponse<string>>;
    getRequests(id: string): Promise<ApiResponse<VehicleRequest[]>>;
};
export declare const vehicleRequestApi: {
    list(params?: PaginationParams): Promise<ApiResponse<PaginatedResult<VehicleRequest>>>;
    get(id: string): Promise<ApiResponse<VehicleRequest>>;
    create(data: Partial<VehicleRequest>): Promise<ApiResponse<VehicleRequest>>;
    update(id: string, data: Partial<VehicleRequest>): Promise<ApiResponse<VehicleRequest>>;
    delete(id: string): Promise<ApiResponse<string>>;
};
export declare const announcementApi: {
    list(params?: PaginationParams & {
        priority?: string;
    }): Promise<ApiResponse<PaginatedResult<Announcement>>>;
    get(id: string): Promise<ApiResponse<Announcement>>;
    create(data: Partial<Announcement>): Promise<ApiResponse<Announcement>>;
    update(id: string, data: Partial<Announcement>): Promise<ApiResponse<Announcement>>;
    delete(id: string): Promise<ApiResponse<string>>;
    publish(id: string): Promise<ApiResponse<Announcement>>;
    unpublish(id: string): Promise<ApiResponse<Announcement>>;
};
export declare const openingBalanceApi: {
    list(params?: PaginationParams & {
        period?: string;
        company_id?: string;
    }): Promise<ApiResponse<PaginatedResult<OpeningBalance>>>;
    get(id: string): Promise<ApiResponse<OpeningBalance>>;
    create(data: CreateOpeningBalanceRequest): Promise<ApiResponse<OpeningBalance>>;
    update(id: string, data: Partial<OpeningBalance>): Promise<ApiResponse<OpeningBalance>>;
    delete(id: string): Promise<ApiResponse<string>>;
    batchImport(data: CreateOpeningBalanceRequest[]): Promise<ApiResponse<Record<string, any>>>;
    carryForward(data: CarryForwardRequest): Promise<ApiResponse<Record<string, any>>>;
};
export declare const fixedAssetApi: {
    list(params?: PaginationParams & {
        department_id?: string;
        status?: string;
    }): Promise<ApiResponse<PaginatedResult<FixedAsset>>>;
    get(id: string): Promise<ApiResponse<FixedAsset>>;
    create(data: Partial<FixedAsset>): Promise<ApiResponse<FixedAsset>>;
    update(id: string, data: Partial<FixedAsset>): Promise<ApiResponse<FixedAsset>>;
    delete(id: string): Promise<ApiResponse<string>>;
    depreciate(data: DepreciateRequest): Promise<ApiResponse<DepreciationResult>>;
};
export declare const bankAccountApi: {
    list(params?: PaginationParams & {
        company_id?: string;
        status?: string;
    }): Promise<ApiResponse<PaginatedResult<BankAccount>>>;
    get(id: string): Promise<ApiResponse<BankAccount>>;
    create(data: Partial<BankAccount>): Promise<ApiResponse<BankAccount>>;
    update(id: string, data: Partial<BankAccount>): Promise<ApiResponse<BankAccount>>;
    delete(id: string): Promise<ApiResponse<string>>;
};
export declare const bankTransactionApi: {
    list(params?: PaginationParams & {
        account_id?: string;
        transaction_date?: string;
    }): Promise<ApiResponse<PaginatedResult<BankTransaction>>>;
    get(id: string): Promise<ApiResponse<BankTransaction>>;
    create(data: CreateBankTransactionRequest): Promise<ApiResponse<BankTransaction>>;
    delete(id: string): Promise<ApiResponse<string>>;
};
