import type { ApiResponse } from "./client";
export interface ProductionProcess {
    id: string;
    process_no: string;
    name: string;
    description?: string;
    version: string;
    status: string;
    created_at: string;
    updated_at: string;
}
export interface CreateProductionProcessRequest {
    process_no: string;
    name: string;
    description?: string;
    version: string;
    status: string;
}
export interface ProductionStep {
    id: string;
    process_id: string;
    step_no: string;
    name: string;
    description?: string;
    duration_hours?: number;
    equipment_required?: string;
    sort_order: number;
    status?: string;
    duration?: number;
    created_at: string;
}
export interface UpdateProductionStepRequest {
    step_no?: string;
    name?: string;
    description?: string;
    duration_hours?: number;
    equipment_required?: string;
    sort_order?: number;
}
export interface CreateProductionStepRequest {
    process_id: string;
    step_no: string;
    name: string;
    description?: string;
    duration_hours?: number;
    equipment_required?: string;
    sort_order: number;
}
export interface ProductionFormula {
    id: string;
    formula_no: string;
    name: string;
    description?: string;
    version: string;
    process_id?: string;
    status: string;
    created_at: string;
    updated_at: string;
}
export interface CreateProductionFormulaRequest {
    formula_no: string;
    name: string;
    description?: string;
    version: string;
    process_id?: string;
    status: string;
}
export interface ProductionBatch {
    id: string;
    batch_no: string;
    product_name: string;
    formula_id?: string;
    process_id?: string;
    planned_quantity?: number;
    actual_quantity?: number;
    unit?: string;
    start_date?: string;
    end_date?: string;
    status: string;
    operator?: string;
    remarks?: string;
    created_at: string;
    updated_at: string;
}
export interface CreateProductionBatchRequest {
    batch_no: string;
    product_name: string;
    formula_id?: string;
    process_id?: string;
    planned_quantity?: number;
    unit?: string;
    status: string;
    operator?: string;
    remarks?: string;
}
export interface ProductionStatistics {
    id: string;
    batch_id?: string;
    stat_date: string;
    output_quantity?: number;
    reject_quantity?: number;
    pass_rate?: number;
    cycle_time_hours?: number;
    energy_consumption?: number;
    remarks?: string;
    created_at: string;
}
export interface PdmStatistics {
    total_processes: number;
    active_processes: number;
    total_formulas: number;
    active_formulas: number;
    total_batches: number;
    planning_batches: number;
    in_progress_batches: number;
    completed_batches: number;
    cancelled_batches: number;
    total_steps: number;
    total_output_quantity: number;
    total_reject_quantity: number;
    average_pass_rate: number;
}
export declare const pdmApi: {
    listProcesses: () => Promise<ApiResponse<ProductionProcess[]>>;
    getProcess: (id: string) => Promise<ApiResponse<ProductionProcess>>;
    createProcess: (data: CreateProductionProcessRequest) => Promise<ApiResponse<ProductionProcess>>;
    updateProcess: (id: string, data: CreateProductionProcessRequest) => Promise<ApiResponse<ProductionProcess>>;
    deleteProcess: (id: string) => Promise<ApiResponse<boolean>>;
    listSteps: () => Promise<ApiResponse<ProductionStep[]>>;
    getStep: (id: string) => Promise<ApiResponse<ProductionStep>>;
    createStep: (data: CreateProductionStepRequest) => Promise<ApiResponse<ProductionStep>>;
    updateStep: (id: string, data: UpdateProductionStepRequest) => Promise<ApiResponse<ProductionStep>>;
    deleteStep: (id: string) => Promise<ApiResponse<boolean>>;
    listFormulas: () => Promise<ApiResponse<ProductionFormula[]>>;
    getFormula: (id: string) => Promise<ApiResponse<ProductionFormula>>;
    createFormula: (data: CreateProductionFormulaRequest) => Promise<ApiResponse<ProductionFormula>>;
    updateFormula: (id: string, data: CreateProductionFormulaRequest) => Promise<ApiResponse<ProductionFormula>>;
    deleteFormula: (id: string) => Promise<ApiResponse<boolean>>;
    listBatches: () => Promise<ApiResponse<ProductionBatch[]>>;
    getBatch: (id: string) => Promise<ApiResponse<ProductionBatch>>;
    createBatch: (data: CreateProductionBatchRequest) => Promise<ApiResponse<ProductionBatch>>;
    updateBatch: (id: string, data: CreateProductionBatchRequest) => Promise<ApiResponse<ProductionBatch>>;
    deleteBatch: (id: string) => Promise<ApiResponse<boolean>>;
    listStatistics: () => Promise<ApiResponse<ProductionStatistics[]>>;
    getStatistics: () => Promise<ApiResponse<PdmStatistics>>;
    health: () => Promise<ApiResponse<string>>;
    importData: (type: string, file: File) => Promise<ApiResponse<any>>;
};
