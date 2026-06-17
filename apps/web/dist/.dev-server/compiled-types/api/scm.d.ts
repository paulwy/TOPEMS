/**
 * SCM (Supply Chain Management) API Client
 * 供应链管理 API 客户端
 */
import type { ApiResponse, PaginationParams, PaginatedResponse } from "./client";
/**
 * 供应商
 */
export interface Supplier {
    id: string;
    name: string;
    short_name?: string;
    contact_name?: string;
    contact_phone?: string;
    email?: string;
    address?: string;
    bank_account?: string;
    tax_number?: string;
    status: string;
    created_at: string;
    updated_at: string;
}
export interface CreateSupplierRequest {
    name: string;
    short_name?: string;
    contact_name?: string;
    contact_phone?: string;
    email?: string;
    address?: string;
    bank_account?: string;
    tax_number?: string;
}
export interface UpdateSupplierRequest {
    name?: string;
    short_name?: string;
    contact_name?: string;
    contact_phone?: string;
    email?: string;
    address?: string;
    bank_account?: string;
    tax_number?: string;
    status?: string;
}
/**
 * 采购订单
 */
export interface PurchaseOrder {
    id: string;
    order_number: string;
    supplier_id?: string;
    order_date: string;
    delivery_date?: string;
    total_amount?: number;
    status: string;
    remarks?: string;
    created_at: string;
    updated_at: string;
}
export interface CreatePurchaseOrderRequest {
    order_number: string;
    supplier_id?: string;
    order_date: string;
    delivery_date?: string;
    total_amount?: number;
    remarks?: string;
}
export interface UpdatePurchaseOrderRequest {
    supplier_id?: string;
    delivery_date?: string;
    total_amount?: number;
    status?: string;
    remarks?: string;
}
/**
 * 采购明细
 */
export interface PurchaseItem {
    id: string;
    order_id: string;
    product_code?: string;
    product_name: string;
    specification?: string;
    unit?: string;
    quantity: number;
    unit_price?: number;
    amount?: number;
    created_at: string;
    updated_at: string;
}
export interface CreatePurchaseItemRequest {
    order_id: string;
    product_code?: string;
    product_name: string;
    specification?: string;
    unit?: string;
    quantity: number;
    unit_price?: number;
    amount?: number;
}
export interface UpdatePurchaseItemRequest {
    product_code?: string;
    product_name?: string;
    specification?: string;
    unit?: string;
    quantity?: number;
    unit_price?: number;
    amount?: number;
}
export interface PurchaseItemQueryParams extends PaginationParams {
    order_id?: string;
}
/**
 * 供应商评估
 */
export interface SupplierEvaluation {
    id: string;
    supplier_id: string;
    evaluation_date: string;
    quality_score?: number;
    delivery_score?: number;
    service_score?: number;
    price_score?: number;
    overall_score?: number;
    comments?: string;
    evaluator?: string;
    created_at: string;
    updated_at: string;
}
export interface CreateSupplierEvaluationRequest {
    supplier_id: string;
    evaluation_date: string;
    quality_score?: number;
    delivery_score?: number;
    service_score?: number;
    price_score?: number;
    overall_score?: number;
    comments?: string;
    evaluator?: string;
}
export interface UpdateSupplierEvaluationRequest {
    quality_score?: number;
    delivery_score?: number;
    service_score?: number;
    price_score?: number;
    overall_score?: number;
    comments?: string;
    evaluator?: string;
}
export interface SupplierEvaluationQueryParams extends PaginationParams {
    supplier_id?: string;
}
/**
 * SCM API 统一导出
 */
export declare const scmApi: {
    suppliers: {
        /**
         * 获取供应商列表
         */
        list: (params?: PaginationParams) => Promise<ApiResponse<PaginatedResponse<Supplier>>>;
        /**
         * 创建供应商
         */
        create: (data: CreateSupplierRequest) => Promise<ApiResponse<Supplier>>;
        /**
         * 获取供应商详情
         */
        get: (id: string) => Promise<ApiResponse<Supplier>>;
        /**
         * 更新供应商
         */
        update: (id: string, data: UpdateSupplierRequest) => Promise<ApiResponse<Supplier>>;
        /**
         * 删除供应商
         */
        delete: (id: string) => Promise<ApiResponse<string>>;
    };
    purchaseOrders: {
        /**
         * 获取采购订单列表
         */
        list: (params?: PaginationParams) => Promise<ApiResponse<PaginatedResponse<PurchaseOrder>>>;
        /**
         * 创建采购订单
         */
        create: (data: CreatePurchaseOrderRequest) => Promise<ApiResponse<PurchaseOrder>>;
        /**
         * 获取采购订单详情
         */
        get: (id: string) => Promise<ApiResponse<PurchaseOrder>>;
        /**
         * 更新采购订单
         */
        update: (id: string, data: UpdatePurchaseOrderRequest) => Promise<ApiResponse<PurchaseOrder>>;
    };
    purchaseItems: {
        /**
         * 获取采购明细列表
         */
        list: (params?: PurchaseItemQueryParams) => Promise<ApiResponse<PaginatedResponse<PurchaseItem>>>;
        /**
         * 创建采购明细
         */
        create: (data: CreatePurchaseItemRequest) => Promise<ApiResponse<PurchaseItem>>;
        /**
         * 获取采购明细详情
         */
        get: (id: string) => Promise<ApiResponse<PurchaseItem>>;
        /**
         * 更新采购明细
         */
        update: (id: string, data: UpdatePurchaseItemRequest) => Promise<ApiResponse<PurchaseItem>>;
    };
    evaluations: {
        /**
         * 获取供应商评估列表
         */
        list: (params?: SupplierEvaluationQueryParams) => Promise<ApiResponse<PaginatedResponse<SupplierEvaluation>>>;
        /**
         * 创建供应商评估
         */
        create: (data: CreateSupplierEvaluationRequest) => Promise<ApiResponse<SupplierEvaluation>>;
        /**
         * 获取供应商评估详情
         */
        get: (id: string) => Promise<ApiResponse<SupplierEvaluation>>;
        /**
         * 更新供应商评估
         */
        update: (id: string, data: UpdateSupplierEvaluationRequest) => Promise<ApiResponse<SupplierEvaluation>>;
    };
    /**
     * 健康检查
     */
    health: () => Promise<ApiResponse<string>>;
};
