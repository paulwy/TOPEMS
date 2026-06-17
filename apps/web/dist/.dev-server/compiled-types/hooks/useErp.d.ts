import { type Asset, type Expense, type Budget, type Receivable, type Payable, type AccountingSubject, type FinancialVoucher, type OfficeSupply, type MeetingRoom, type MeetingBooking, type Vehicle, type VehicleRequest, type Announcement } from "@/api/erp";
export interface UseErpResult<T> {
    data: T[];
    loading: boolean;
    error: string | null;
    fetch: (params?: Record<string, any>) => Promise<T[]>;
    get: (id: string) => Promise<T | null>;
    create: (item: Partial<T>) => Promise<T | null>;
    update: (id: string, item: Partial<T>) => Promise<T | null>;
    delete: (id: string) => Promise<void>;
    bulkDelete: (ids: string[]) => Promise<void>;
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        setPage: (page: number) => void;
        setPageSize: (size: number) => void;
    };
    refresh: () => void;
}
export declare function useAssets(): UseErpResult<Asset>;
export declare function useExpenses(): UseErpResult<Expense>;
export declare function useBudgets(): UseErpResult<Budget>;
export declare function useReceivables(): UseErpResult<Receivable>;
export declare function usePayables(): UseErpResult<Payable>;
export declare function useAccountingSubjects(): UseErpResult<AccountingSubject>;
export declare function useVouchers(): UseErpResult<FinancialVoucher>;
export declare function useOfficeSupplies(): UseErpResult<OfficeSupply>;
export declare function useMeetingRooms(): UseErpResult<MeetingRoom>;
export declare function useMeetingBookings(): UseErpResult<MeetingBooking>;
export declare function useVehicles(): UseErpResult<Vehicle>;
export declare function useVehicleRequests(): UseErpResult<VehicleRequest>;
export declare function useAnnouncements(): UseErpResult<Announcement>;
export declare function useFinanceReports(): {
    loading: boolean;
    error: string | null;
    getBalanceSheet: (params?: {
        period?: string;
    }) => Promise<import("@/api/erp").BalanceSheet | null | undefined>;
    getIncomeStatement: (params?: {
        period?: string;
    }) => Promise<import("@/api/erp").IncomeStatement | null | undefined>;
    getCashFlowStatement: (params?: {
        period?: string;
    }) => Promise<import("@/api/erp").CashFlowStatement | null | undefined>;
    getBusinessOverview: (params?: {
        period?: string;
    }) => Promise<import("@/api/erp").BusinessOverview | null | undefined>;
    getProjectSummary: (params?: {
        project_id?: string;
    }) => Promise<import("@/api/erp").ProjectFinancialSummary[] | null | undefined>;
    getMonthlyTrend: () => Promise<import("@/api/erp").MonthlyTrend[] | null | undefined>;
    getDepartmentSummary: (params?: {
        department_id?: string;
    }) => Promise<import("@/api/erp").DepartmentFinancialSummary[] | null | undefined>;
    getAgingAnalysis: () => Promise<import("@/api/erp").AgingAnalysis[] | null | undefined>;
    getCashFlowAnalysis: (params?: {
        period?: string;
    }) => Promise<import("@/api/erp").CashFlowAnalysis | null | undefined>;
    getExpenseAnalysis: (params?: {
        period?: string;
    }) => Promise<import("@/api/erp").ExpenseAnalysis | null | undefined>;
    getProfitAnalysis: (params?: {
        period?: string;
    }) => Promise<import("@/api/erp").ProfitAnalysis | null | undefined>;
    getFinancialOverview: (params?: {
        period?: string;
    }) => Promise<import("@/api/erp").FinancialOverview | null | undefined>;
};
