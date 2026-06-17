import type { ApiResponse } from "./client";
export interface Supplier {
    id: string;
    supplier_no: string;
    name: string;
    legal_name?: string;
    category: string;
    status: string;
    tax_id?: string;
    address?: string;
    contact_person?: string;
    phone?: string;
    email?: string;
    website?: string;
    credit_rating?: string;
    risk_level: string;
    created_at: string;
    updated_at: string;
}
export interface CreateSupplierRequest {
    supplier_no: string;
    name: string;
    legal_name?: string;
    category: string;
    status: string;
    tax_id?: string;
    address?: string;
    contact_person?: string;
    phone?: string;
    email?: string;
    website?: string;
    credit_rating?: string;
    risk_level: string;
}
export interface SupplierEvaluation {
    id: string;
    supplier_id: string;
    evaluation_no: string;
    evaluation_date: string;
    evaluator?: string;
    overall_score?: number;
    quality_score?: number;
    delivery_score?: number;
    service_score?: number;
    price_score?: number;
    comments?: string;
    status: string;
    created_at: string;
    updated_at: string;
}
export interface CreateSupplierEvaluationRequest {
    supplier_id: string;
    evaluation_no: string;
    evaluator?: string;
    overall_score?: number;
    quality_score?: number;
    delivery_score?: number;
    service_score?: number;
    price_score?: number;
    comments?: string;
    status: string;
}
export interface PurchaseOrder {
    id: string;
    po_no: string;
    supplier_id: string;
    order_date: string;
    expected_date?: string;
    actual_date?: string;
    total_amount?: number;
    currency: string;
    status: string;
    remarks?: string;
    created_at: string;
    updated_at: string;
}
export interface CreatePurchaseOrderRequest {
    po_no: string;
    supplier_id: string;
    expected_date?: string;
    total_amount?: number;
    currency: string;
    status: string;
    remarks?: string;
}
export interface SupplierContract {
    id: string;
    contract_no: string;
    supplier_id: string;
    supplier_name?: string;
    title: string;
    contract_type: string;
    total_amount?: number;
    currency: string;
    sign_date?: string;
    start_date?: string;
    end_date?: string;
    status: string;
    remarks?: string;
    created_at: string;
    updated_at: string;
}
export interface CreateSupplierContractRequest {
    contract_no: string;
    supplier_id: string;
    supplier_name?: string;
    title: string;
    contract_type: string;
    total_amount?: number;
    currency: string;
    sign_date?: string;
    start_date?: string;
    end_date?: string;
    status: string;
    remarks?: string;
}
export interface SrmStatistics {
    total_suppliers: number;
    active_suppliers: number;
    total_evaluations: number;
    avg_score: number;
    total_orders: number;
    total_order_amount: number;
    pending_orders: number;
    completed_orders: number;
    total_contracts: number;
    active_contracts: number;
}
export interface SupplierWithStats {
    supplier: Supplier;
    total_orders: number;
    total_amount: number;
    avg_evaluation_score?: number;
    last_order_date?: string;
}
export interface CategoryCount {
    category: string;
    count: number;
}
export interface StatusCount {
    status: string;
    count: number;
}
export interface ScoreDistribution {
    range: string;
    count: number;
}
export interface MonthlyOrderTrend {
    month: string;
    order_count: number;
    total_amount: number;
}
export interface SrmDetailedStatistics {
    basic: SrmStatistics;
    supplier_by_category: CategoryCount[];
    supplier_by_status: StatusCount[];
    order_by_status: StatusCount[];
    evaluation_score_distribution: ScoreDistribution[];
    monthly_order_trend: MonthlyOrderTrend[];
    contract_by_status: StatusCount[];
}
export declare const srmApi: {
    listSuppliers: () => Promise<ApiResponse<Supplier[]>>;
    getSupplier: (id: string) => Promise<ApiResponse<Supplier>>;
    createSupplier: (data: CreateSupplierRequest) => Promise<ApiResponse<Supplier>>;
    updateSupplier: (id: string, data: CreateSupplierRequest) => Promise<ApiResponse<Supplier>>;
    deleteSupplier: (id: string) => Promise<ApiResponse<boolean>>;
    listEvaluations: () => Promise<ApiResponse<SupplierEvaluation[]>>;
    getEvaluation: (id: string) => Promise<ApiResponse<SupplierEvaluation>>;
    createEvaluation: (data: CreateSupplierEvaluationRequest) => Promise<ApiResponse<SupplierEvaluation>>;
    updateEvaluation: (id: string, data: CreateSupplierEvaluationRequest) => Promise<ApiResponse<SupplierEvaluation>>;
    deleteEvaluation: (id: string) => Promise<ApiResponse<boolean>>;
    listPurchaseOrders: () => Promise<ApiResponse<PurchaseOrder[]>>;
    getPurchaseOrder: (id: string) => Promise<ApiResponse<PurchaseOrder>>;
    createPurchaseOrder: (data: CreatePurchaseOrderRequest) => Promise<ApiResponse<PurchaseOrder>>;
    updatePurchaseOrder: (id: string, data: CreatePurchaseOrderRequest) => Promise<ApiResponse<PurchaseOrder>>;
    deletePurchaseOrder: (id: string) => Promise<ApiResponse<boolean>>;
    listContracts: () => Promise<ApiResponse<SupplierContract[]>>;
    getContract: (id: string) => Promise<ApiResponse<SupplierContract>>;
    createContract: (data: CreateSupplierContractRequest) => Promise<ApiResponse<SupplierContract>>;
    updateContract: (id: string, data: CreateSupplierContractRequest) => Promise<ApiResponse<SupplierContract>>;
    deleteContract: (id: string) => Promise<ApiResponse<boolean>>;
    getStatistics: () => Promise<ApiResponse<SrmStatistics>>;
    getDetailedStatistics: () => Promise<ApiResponse<SrmDetailedStatistics>>;
    getSuppliersWithStats: () => Promise<ApiResponse<SupplierWithStats[]>>;
    health: () => Promise<ApiResponse<string>>;
};
