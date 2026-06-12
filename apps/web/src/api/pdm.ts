import apiClient from "./client";
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

export const pdmApi = {
  // Production Processes
  listProcesses: async (): Promise<ApiResponse<ProductionProcess[]>> => {
    return apiClient.pdm.get<ProductionProcess[]>(
      "/api/v1/production-processes",
    );
  },
  getProcess: async (id: string): Promise<ApiResponse<ProductionProcess>> => {
    return apiClient.pdm.get<ProductionProcess>(
      `/api/v1/production-processes/${id}`,
    );
  },
  createProcess: async (
    data: CreateProductionProcessRequest,
  ): Promise<ApiResponse<ProductionProcess>> => {
    return apiClient.pdm.post<ProductionProcess>(
      "/api/v1/production-processes",
      data,
    );
  },
  updateProcess: async (
    id: string,
    data: CreateProductionProcessRequest,
  ): Promise<ApiResponse<ProductionProcess>> => {
    return apiClient.pdm.put<ProductionProcess>(
      `/api/v1/production-processes/${id}`,
      data,
    );
  },
  deleteProcess: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.pdm.delete<boolean>(`/api/v1/production-processes/${id}`);
  },

  // Production Steps
  listSteps: async (): Promise<ApiResponse<ProductionStep[]>> => {
    return apiClient.pdm.get<ProductionStep[]>("/api/v1/production-steps");
  },
  getStep: async (id: string): Promise<ApiResponse<ProductionStep>> => {
    return apiClient.pdm.get<ProductionStep>(`/api/v1/production-steps/${id}`);
  },
  createStep: async (
    data: CreateProductionStepRequest,
  ): Promise<ApiResponse<ProductionStep>> => {
    return apiClient.pdm.post<ProductionStep>("/api/v1/production-steps", data);
  },
  updateStep: async (
    id: string,
    data: UpdateProductionStepRequest,
  ): Promise<ApiResponse<ProductionStep>> => {
    return apiClient.pdm.put<ProductionStep>(
      `/api/v1/production-steps/${id}`,
      data,
    );
  },
  deleteStep: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.pdm.delete<boolean>(`/api/v1/production-steps/${id}`);
  },

  // Production Formulas
  listFormulas: async (): Promise<ApiResponse<ProductionFormula[]>> => {
    return apiClient.pdm.get<ProductionFormula[]>(
      "/api/v1/production-formulas",
    );
  },
  getFormula: async (id: string): Promise<ApiResponse<ProductionFormula>> => {
    return apiClient.pdm.get<ProductionFormula>(
      `/api/v1/production-formulas/${id}`,
    );
  },
  createFormula: async (
    data: CreateProductionFormulaRequest,
  ): Promise<ApiResponse<ProductionFormula>> => {
    return apiClient.pdm.post<ProductionFormula>(
      "/api/v1/production-formulas",
      data,
    );
  },
  updateFormula: async (
    id: string,
    data: CreateProductionFormulaRequest,
  ): Promise<ApiResponse<ProductionFormula>> => {
    return apiClient.pdm.put<ProductionFormula>(
      `/api/v1/production-formulas/${id}`,
      data,
    );
  },
  deleteFormula: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.pdm.delete<boolean>(`/api/v1/production-formulas/${id}`);
  },

  // Production Batches
  listBatches: async (): Promise<ApiResponse<ProductionBatch[]>> => {
    return apiClient.pdm.get<ProductionBatch[]>("/api/v1/production-batches");
  },
  getBatch: async (id: string): Promise<ApiResponse<ProductionBatch>> => {
    return apiClient.pdm.get<ProductionBatch>(
      `/api/v1/production-batches/${id}`,
    );
  },
  createBatch: async (
    data: CreateProductionBatchRequest,
  ): Promise<ApiResponse<ProductionBatch>> => {
    return apiClient.pdm.post<ProductionBatch>(
      "/api/v1/production-batches",
      data,
    );
  },
  updateBatch: async (
    id: string,
    data: CreateProductionBatchRequest,
  ): Promise<ApiResponse<ProductionBatch>> => {
    return apiClient.pdm.put<ProductionBatch>(
      `/api/v1/production-batches/${id}`,
      data,
    );
  },
  deleteBatch: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.pdm.delete<boolean>(`/api/v1/production-batches/${id}`);
  },

  // Production Statistics
  listStatistics: async (): Promise<ApiResponse<ProductionStatistics[]>> => {
    return apiClient.pdm.get<ProductionStatistics[]>(
      "/api/v1/production-statistics",
    );
  },

  getStatistics: async (): Promise<ApiResponse<PdmStatistics>> => {
    return apiClient.pdm.get<PdmStatistics>("/api/v1/statistics");
  },

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.pdm.get<string>("/health");
  },

  importData: async (type: string, file: File): Promise<ApiResponse<any>> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);
    return apiClient.pdm.post<any>("/api/v1/import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};
