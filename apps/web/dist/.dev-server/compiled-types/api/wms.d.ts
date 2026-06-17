/**
 * WMS (Warehouse Management System) API Client
 * 仓储管理 API 客户端
 */
import type { ApiResponse } from "./client";
/**
 * 分页参数
 */
export interface PaginationParams {
    page?: number;
    page_size?: number;
    sort_by?: string;
    sort_order?: "asc" | "desc";
}
/**
 * 分页响应
 */
export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}
/**
 * 仓库
 */
export interface Warehouse {
    id: string;
    name: string;
    code?: string;
    address?: string;
    manager?: string;
    phone?: string;
    status: string;
    created_at: string;
    updated_at: string;
}
export interface CreateWarehouseRequest {
    name: string;
    code?: string;
    address?: string;
    manager?: string;
    phone?: string;
}
export interface UpdateWarehouseRequest {
    name?: string;
    code?: string;
    address?: string;
    manager?: string;
    phone?: string;
    status?: string;
}
/**
 * 库存项
 */
export interface InventoryItem {
    id: string;
    sku: string;
    name: string;
    specification?: string;
    unit?: string;
    quantity: number;
    location_id?: string;
    warehouse_id?: string;
    min_quantity?: number;
    max_quantity?: number;
    status: string;
    created_at: string;
    updated_at: string;
}
export interface CreateInventoryItemRequest {
    sku: string;
    name: string;
    specification?: string;
    unit?: string;
    quantity: number;
    location_id?: string;
    warehouse_id?: string;
    min_quantity?: number;
    max_quantity?: number;
}
export interface UpdateInventoryItemRequest {
    sku?: string;
    name?: string;
    specification?: string;
    unit?: string;
    quantity?: number;
    location_id?: string;
    warehouse_id?: string;
    min_quantity?: number;
    max_quantity?: number;
    status?: string;
}
export interface InventoryQueryParams extends PaginationParams {
    warehouse_id?: string;
}
/**
 * 入库订单
 */
export interface InboundOrder {
    id: string;
    order_number: string;
    warehouse_id?: string;
    supplier_id?: string;
    order_date: string;
    expected_arrival?: string;
    actual_arrival?: string;
    total_amount?: number;
    status: string;
    remarks?: string;
    created_at: string;
    updated_at: string;
}
export interface CreateInboundOrderRequest {
    order_number: string;
    warehouse_id?: string;
    supplier_id?: string;
    order_date: string;
    expected_arrival?: string;
    total_amount?: number;
    remarks?: string;
}
export interface UpdateInboundOrderRequest {
    warehouse_id?: string;
    supplier_id?: string;
    expected_arrival?: string;
    actual_arrival?: string;
    total_amount?: number;
    status?: string;
    remarks?: string;
}
/**
 * 出库订单
 */
export interface OutboundOrder {
    id: string;
    order_number: string;
    warehouse_id?: string;
    customer_id?: string;
    order_date: string;
    expected_delivery?: string;
    actual_delivery?: string;
    total_amount?: number;
    status: string;
    remarks?: string;
    created_at: string;
    updated_at: string;
}
export interface CreateOutboundOrderRequest {
    order_number: string;
    warehouse_id?: string;
    customer_id?: string;
    order_date: string;
    expected_delivery?: string;
    total_amount?: number;
    remarks?: string;
}
export interface UpdateOutboundOrderRequest {
    warehouse_id?: string;
    customer_id?: string;
    expected_delivery?: string;
    actual_delivery?: string;
    total_amount?: number;
    status?: string;
    remarks?: string;
}
/**
 * WMS API 统一导出
 */
export declare const wmsApi: {
    warehouses: {
        /**
         * 获取仓库列表
         */
        list: (params?: PaginationParams) => Promise<ApiResponse<PaginatedResponse<Warehouse>>>;
        /**
         * 创建仓库
         */
        create: (data: CreateWarehouseRequest) => Promise<ApiResponse<Warehouse>>;
        /**
         * 获取仓库详情
         */
        get: (id: string) => Promise<ApiResponse<Warehouse>>;
        /**
         * 更新仓库
         */
        update: (id: string, data: UpdateWarehouseRequest) => Promise<ApiResponse<Warehouse>>;
        /**
         * 删除仓库
         */
        delete: (id: string) => Promise<ApiResponse<string>>;
    };
    inventory: {
        /**
         * 获取库存列表
         */
        list: (params?: InventoryQueryParams) => Promise<ApiResponse<PaginatedResponse<InventoryItem>>>;
        /**
         * 创建库存项
         */
        create: (data: CreateInventoryItemRequest) => Promise<ApiResponse<InventoryItem>>;
        /**
         * 获取库存项详情
         */
        get: (id: string) => Promise<ApiResponse<InventoryItem>>;
        /**
         * 更新库存项
         */
        update: (id: string, data: UpdateInventoryItemRequest) => Promise<ApiResponse<InventoryItem>>;
        /**
         * 删除库存项
         */
        delete: (id: string) => Promise<ApiResponse<string>>;
    };
    inboundOrders: {
        /**
         * 获取入库订单列表
         */
        list: (params?: PaginationParams) => Promise<ApiResponse<PaginatedResponse<InboundOrder>>>;
        /**
         * 创建入库订单
         */
        create: (data: CreateInboundOrderRequest) => Promise<ApiResponse<InboundOrder>>;
        /**
         * 获取入库订单详情
         */
        get: (id: string) => Promise<ApiResponse<InboundOrder>>;
        /**
         * 更新入库订单
         */
        update: (id: string, data: UpdateInboundOrderRequest) => Promise<ApiResponse<InboundOrder>>;
        /**
         * 删除入库订单
         */
        delete: (id: string) => Promise<ApiResponse<string>>;
    };
    outboundOrders: {
        /**
         * 获取出库订单列表
         */
        list: (params?: PaginationParams) => Promise<ApiResponse<PaginatedResponse<OutboundOrder>>>;
        /**
         * 创建出库订单
         */
        create: (data: CreateOutboundOrderRequest) => Promise<ApiResponse<OutboundOrder>>;
        /**
         * 获取出库订单详情
         */
        get: (id: string) => Promise<ApiResponse<OutboundOrder>>;
        /**
         * 更新出库订单
         */
        update: (id: string, data: UpdateOutboundOrderRequest) => Promise<ApiResponse<OutboundOrder>>;
        /**
         * 删除出库订单
         */
        delete: (id: string) => Promise<ApiResponse<string>>;
    };
    /**
     * 健康检查
     */
    health: () => Promise<ApiResponse<string>>;
};
