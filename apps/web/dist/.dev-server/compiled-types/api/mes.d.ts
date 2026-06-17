import type { ApiResponse } from "./client";
export interface ProductionOrder {
    id: string;
    order_number: string;
    product_name: string;
    product_code?: string;
    quantity: number;
    unit?: string;
    scheduled_start_date?: string;
    scheduled_end_date?: string;
    actual_start_date?: string;
    actual_end_date?: string;
    status: string;
    priority?: string;
    created_at: string;
    updated_at: string;
}
export interface CreateProductionOrderRequest {
    order_number: string;
    product_name: string;
    product_code?: string;
    quantity: number;
    unit?: string;
    scheduled_start_date?: string;
    scheduled_end_date?: string;
    priority?: string;
}
export interface UpdateProductionOrderRequest {
    product_name?: string;
    product_code?: string;
    quantity?: number;
    unit?: string;
    scheduled_start_date?: string;
    scheduled_end_date?: string;
    actual_start_date?: string;
    actual_end_date?: string;
    status?: string;
    priority?: string;
}
export interface ProductionProcess {
    id: string;
    name: string;
    code?: string;
    description?: string;
    sequence: number;
    standard_time?: number;
    work_station_id?: string;
    status: string;
    created_at: string;
    updated_at: string;
}
export interface CreateProductionProcessRequest {
    name: string;
    code?: string;
    description?: string;
    sequence: number;
    standard_time?: number;
    work_station_id?: string;
}
export interface UpdateProductionProcessRequest {
    name?: string;
    code?: string;
    description?: string;
    sequence?: number;
    standard_time?: number;
    work_station_id?: string;
    status?: string;
}
export interface WorkStation {
    id: string;
    name: string;
    code?: string;
    location?: string;
    capacity?: number;
    status: string;
    supervisor?: string;
    created_at: string;
    updated_at: string;
}
export interface CreateWorkStationRequest {
    name: string;
    code: string;
    location?: string;
    capacity?: number;
    supervisor?: string;
}
export interface UpdateWorkStationRequest {
    name?: string;
    code?: string;
    location?: string;
    capacity?: number;
    status?: string;
    supervisor?: string;
}
export interface ProductionRecord {
    id: string;
    order_id: string;
    process_id?: string;
    work_station_id?: string;
    operator: string;
    quantity_completed: number;
    quantity_rejected?: number;
    start_time: string;
    end_time?: string;
    status: string;
    notes?: string;
    created_at: string;
    updated_at: string;
}
export interface CreateProductionRecordRequest {
    order_id: string;
    process_id?: string;
    work_station_id?: string;
    operator: string;
    quantity_completed: number;
    quantity_rejected?: number;
    start_time: string;
}
export interface UpdateProductionRecordRequest {
    quantity_completed?: number;
    quantity_rejected?: number;
    end_time?: string;
    status?: string;
    notes?: string;
}
export interface InspectionRecord {
    id: string;
    equipment_id: string;
    equipment_code: string;
    equipment_name: string;
    inspector: string;
    inspection_date: string;
    location?: string;
    temperature?: number;
    vibration?: number;
    noise_level?: number;
    status: string;
    items?: any;
    abnormalities?: string;
    remarks?: string;
    created_at: string;
}
export interface CreateInspectionRecord {
    equipment_id: string;
    inspector: string;
    inspection_date: string;
    location?: string;
    temperature?: number;
    vibration?: number;
    noise_level?: number;
    status: string;
    items?: any;
    abnormalities?: string;
    remarks?: string;
}
export interface MaintenanceRecord {
    id: string;
    equipment_id: string;
    equipment_code: string;
    equipment_name: string;
    maintenance_type: string;
    description: string;
    maintainer: string;
    start_time: string;
    end_time?: string;
    cost?: number;
    parts_replaced?: any;
    result?: string;
    status: string;
    remarks?: string;
    created_at: string;
}
export interface CreateMaintenanceRecord {
    equipment_id: string;
    maintenance_type: string;
    description: string;
    maintainer: string;
    start_time: string;
    end_time?: string;
    cost?: number;
    parts_replaced?: any;
    result?: string;
    status?: string;
    remarks?: string;
}
export interface UpdateMaintenanceStatus {
    status: string;
    result?: string;
}
export interface EquipmentStatistics {
    total: number;
    in_use: number;
    idle: number;
    maintenance: number;
    scrapped: number;
    total_value: number;
    monthly_inspections: number;
    monthly_maintenances: number;
    pending_repairs: number;
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
export declare const productionOrderApi: {
    list(params?: PaginationParams): Promise<ApiResponse<{
        orders: ProductionOrder[];
        total: number;
        page: number;
        page_size: number;
    }>>;
    get(id: string): Promise<ApiResponse<ProductionOrder>>;
    create(data: CreateProductionOrderRequest): Promise<ApiResponse<ProductionOrder>>;
    update(id: string, data: UpdateProductionOrderRequest): Promise<ApiResponse<ProductionOrder>>;
    delete(id: string): Promise<ApiResponse<string>>;
};
export declare const productionProcessApi: {
    list(params?: PaginationParams): Promise<ApiResponse<{
        processes: ProductionProcess[];
        total: number;
        page: number;
        page_size: number;
    }>>;
    get(id: string): Promise<ApiResponse<ProductionProcess>>;
    create(data: CreateProductionProcessRequest): Promise<ApiResponse<ProductionProcess>>;
    update(id: string, data: UpdateProductionProcessRequest): Promise<ApiResponse<ProductionProcess>>;
};
export declare const workStationApi: {
    list(params?: PaginationParams): Promise<ApiResponse<{
        workstations: WorkStation[];
        total: number;
        page: number;
        page_size: number;
    }>>;
    get(id: string): Promise<ApiResponse<WorkStation>>;
    create(data: CreateWorkStationRequest): Promise<ApiResponse<WorkStation>>;
    update(id: string, data: UpdateWorkStationRequest): Promise<ApiResponse<WorkStation>>;
};
export declare const productionRecordApi: {
    list(params?: PaginationParams): Promise<ApiResponse<{
        records: ProductionRecord[];
        total: number;
        page: number;
        page_size: number;
    }>>;
    get(id: string): Promise<ApiResponse<ProductionRecord>>;
    create(data: CreateProductionRecordRequest): Promise<ApiResponse<ProductionRecord>>;
    update(id: string, data: UpdateProductionRecordRequest): Promise<ApiResponse<ProductionRecord>>;
};
export declare const mesEquipmentApi: {
    getStatistics(): Promise<ApiResponse<EquipmentStatistics>>;
    listInspections(params?: PaginationParams & {
        equipment_id?: string;
    }): Promise<ApiResponse<PaginatedResult<InspectionRecord>>>;
    createInspection(data: CreateInspectionRecord): Promise<ApiResponse<InspectionRecord>>;
    listMaintenances(params?: PaginationParams & {
        equipment_id?: string;
    }): Promise<ApiResponse<PaginatedResult<MaintenanceRecord>>>;
    createMaintenance(data: CreateMaintenanceRecord): Promise<ApiResponse<MaintenanceRecord>>;
    updateMaintenanceStatus(id: string, data: UpdateMaintenanceStatus): Promise<ApiResponse<MaintenanceRecord>>;
};
export declare const mesApi: {
    orders: {
        list(params?: PaginationParams): Promise<ApiResponse<{
            orders: ProductionOrder[];
            total: number;
            page: number;
            page_size: number;
        }>>;
        get(id: string): Promise<ApiResponse<ProductionOrder>>;
        create(data: CreateProductionOrderRequest): Promise<ApiResponse<ProductionOrder>>;
        update(id: string, data: UpdateProductionOrderRequest): Promise<ApiResponse<ProductionOrder>>;
        delete(id: string): Promise<ApiResponse<string>>;
    };
    processes: {
        list(params?: PaginationParams): Promise<ApiResponse<{
            processes: ProductionProcess[];
            total: number;
            page: number;
            page_size: number;
        }>>;
        get(id: string): Promise<ApiResponse<ProductionProcess>>;
        create(data: CreateProductionProcessRequest): Promise<ApiResponse<ProductionProcess>>;
        update(id: string, data: UpdateProductionProcessRequest): Promise<ApiResponse<ProductionProcess>>;
    };
    workstations: {
        list(params?: PaginationParams): Promise<ApiResponse<{
            workstations: WorkStation[];
            total: number;
            page: number;
            page_size: number;
        }>>;
        get(id: string): Promise<ApiResponse<WorkStation>>;
        create(data: CreateWorkStationRequest): Promise<ApiResponse<WorkStation>>;
        update(id: string, data: UpdateWorkStationRequest): Promise<ApiResponse<WorkStation>>;
    };
    records: {
        list(params?: PaginationParams): Promise<ApiResponse<{
            records: ProductionRecord[];
            total: number;
            page: number;
            page_size: number;
        }>>;
        get(id: string): Promise<ApiResponse<ProductionRecord>>;
        create(data: CreateProductionRecordRequest): Promise<ApiResponse<ProductionRecord>>;
        update(id: string, data: UpdateProductionRecordRequest): Promise<ApiResponse<ProductionRecord>>;
    };
    equipment: {
        getStatistics(): Promise<ApiResponse<EquipmentStatistics>>;
        listInspections(params?: PaginationParams & {
            equipment_id?: string;
        }): Promise<ApiResponse<PaginatedResult<InspectionRecord>>>;
        createInspection(data: CreateInspectionRecord): Promise<ApiResponse<InspectionRecord>>;
        listMaintenances(params?: PaginationParams & {
            equipment_id?: string;
        }): Promise<ApiResponse<PaginatedResult<MaintenanceRecord>>>;
        createMaintenance(data: CreateMaintenanceRecord): Promise<ApiResponse<MaintenanceRecord>>;
        updateMaintenanceStatus(id: string, data: UpdateMaintenanceStatus): Promise<ApiResponse<MaintenanceRecord>>;
    };
    health: () => Promise<ApiResponse<string>>;
};
export default mesApi;
