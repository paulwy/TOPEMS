import apiClient from './client';
import type { ApiResponse } from './client';

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

export interface BomItem {
  id: string;
  product_id: string;
  part_number: string;
  part_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  level: number;
  parent_id?: string;
  status?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateBomItemRequest {
  product_id: string;
  part_number: string;
  part_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  level: number;
  parent_id?: string;
}

export interface Product {
  id: string;
  name: string;
  code: string;
  version: string;
  status: string;
  created_at: string;
}

export interface ProductConfig {
  id: string;
  name: string;
  code: string;
  status: string;
  attributes: {
    color: string;
    size: string;
    material: string;
    grade: string;
  };
  options: string[];
  created_at: string;
}

export interface CreateProductConfigRequest {
  name: string;
  code: string;
  status: string;
  attributes: {
    color: string;
    size: string;
    material: string;
    grade: string;
  };
  options: string[];
}

export interface DocumentVersion {
  id: string;
  version_number: string;
  title: string;
  description: string;
  status: string;
  type: string;
  document_id: string;
  created_by: string;
  changes: string[];
  created_at: string;
}

export interface Document {
  id: string;
  name: string;
  type: string;
  current_version: string;
  version_count: number;
  status: string;
}

export interface CreateVersionRequest {
  document_id: string;
  title: string;
  description: string;
  type: string;
  changes: string[];
}

export const pdmApi = {
  // Production Processes
  listProcesses: async (): Promise<ApiResponse<ProductionProcess[]>> => {
    return apiClient.pdm.get<ProductionProcess[]>('/api/pdm/production-processes');
  },
  getProcess: async (id: string): Promise<ApiResponse<ProductionProcess>> => {
    return apiClient.pdm.get<ProductionProcess>(`/api/pdm/production-processes/${id}`);
  },
  createProcess: async (
    data: CreateProductionProcessRequest
  ): Promise<ApiResponse<ProductionProcess>> => {
    return apiClient.pdm.post<ProductionProcess>('/api/pdm/production-processes', data);
  },
  updateProcess: async (
    id: string,
    data: CreateProductionProcessRequest
  ): Promise<ApiResponse<ProductionProcess>> => {
    return apiClient.pdm.put<ProductionProcess>(`/api/pdm/production-processes/${id}`, data);
  },
  deleteProcess: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.pdm.delete<boolean>(`/api/pdm/production-processes/${id}`);
  },

  // Production Steps
  listSteps: async (): Promise<ApiResponse<ProductionStep[]>> => {
    return apiClient.pdm.get<ProductionStep[]>('/api/pdm/production-steps');
  },
  getStep: async (id: string): Promise<ApiResponse<ProductionStep>> => {
    return apiClient.pdm.get<ProductionStep>(`/api/pdm/production-steps/${id}`);
  },
  createStep: async (data: CreateProductionStepRequest): Promise<ApiResponse<ProductionStep>> => {
    return apiClient.pdm.post<ProductionStep>('/api/pdm/production-steps', data);
  },
  updateStep: async (
    id: string,
    data: UpdateProductionStepRequest
  ): Promise<ApiResponse<ProductionStep>> => {
    return apiClient.pdm.put<ProductionStep>(`/api/pdm/production-steps/${id}`, data);
  },
  deleteStep: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.pdm.delete<boolean>(`/api/pdm/production-steps/${id}`);
  },

  // Production Formulas
  listFormulas: async (): Promise<ApiResponse<ProductionFormula[]>> => {
    return apiClient.pdm.get<ProductionFormula[]>('/api/pdm/production-formulas');
  },
  getFormula: async (id: string): Promise<ApiResponse<ProductionFormula>> => {
    return apiClient.pdm.get<ProductionFormula>(`/api/pdm/production-formulas/${id}`);
  },
  createFormula: async (
    data: CreateProductionFormulaRequest
  ): Promise<ApiResponse<ProductionFormula>> => {
    return apiClient.pdm.post<ProductionFormula>('/api/pdm/production-formulas', data);
  },
  updateFormula: async (
    id: string,
    data: CreateProductionFormulaRequest
  ): Promise<ApiResponse<ProductionFormula>> => {
    return apiClient.pdm.put<ProductionFormula>(`/api/pdm/production-formulas/${id}`, data);
  },
  deleteFormula: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.pdm.delete<boolean>(`/api/pdm/production-formulas/${id}`);
  },

  // Production Batches
  listBatches: async (): Promise<ApiResponse<ProductionBatch[]>> => {
    return apiClient.pdm.get<ProductionBatch[]>('/api/pdm/production-batches');
  },
  getBatch: async (id: string): Promise<ApiResponse<ProductionBatch>> => {
    return apiClient.pdm.get<ProductionBatch>(`/api/pdm/production-batches/${id}`);
  },
  createBatch: async (
    data: CreateProductionBatchRequest
  ): Promise<ApiResponse<ProductionBatch>> => {
    return apiClient.pdm.post<ProductionBatch>('/api/pdm/production-batches', data);
  },
  updateBatch: async (
    id: string,
    data: CreateProductionBatchRequest
  ): Promise<ApiResponse<ProductionBatch>> => {
    return apiClient.pdm.put<ProductionBatch>(`/api/pdm/production-batches/${id}`, data);
  },
  deleteBatch: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.pdm.delete<boolean>(`/api/pdm/production-batches/${id}`);
  },

  // Production Statistics
  listStatistics: async (): Promise<ApiResponse<ProductionStatistics[]>> => {
    return apiClient.pdm.get<ProductionStatistics[]>('/api/pdm/production-statistics');
  },

  getStatistics: async (): Promise<ApiResponse<PdmStatistics>> => {
    return apiClient.pdm.get<PdmStatistics>('/api/pdm/statistics');
  },

  // Products
  listProducts: async (): Promise<ApiResponse<Product[]>> => {
    return apiClient.pdm.get<Product[]>('/api/pdm/products');
  },
  getProduct: async (id: string): Promise<ApiResponse<Product>> => {
    return apiClient.pdm.get<Product>(`/api/pdm/products/${id}`);
  },

  // BOM Items
  listBomItems: async (): Promise<ApiResponse<BomItem[]>> => {
    return apiClient.pdm.get<BomItem[]>('/api/pdm/bom-items');
  },
  getBomItem: async (id: string): Promise<ApiResponse<BomItem>> => {
    return apiClient.pdm.get<BomItem>(`/api/pdm/bom-items/${id}`);
  },
  createBomItem: async (
    data: CreateBomItemRequest
  ): Promise<ApiResponse<BomItem>> => {
    return apiClient.pdm.post<BomItem>('/api/pdm/bom-items', data);
  },
  updateBomItem: async (
    id: string,
    data: Partial<CreateBomItemRequest>
  ): Promise<ApiResponse<BomItem>> => {
    return apiClient.pdm.put<BomItem>(`/api/pdm/bom-items/${id}`, data);
  },
  deleteBomItem: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.pdm.delete<boolean>(`/api/pdm/bom-items/${id}`);
  },

  // Product Configurations
  listProductConfigs: async (): Promise<ApiResponse<ProductConfig[]>> => {
    return apiClient.pdm.get<ProductConfig[]>('/api/pdm/product-configs');
  },
  getProductConfig: async (id: string): Promise<ApiResponse<ProductConfig>> => {
    return apiClient.pdm.get<ProductConfig>(`/api/pdm/product-configs/${id}`);
  },
  createProductConfig: async (
    data: CreateProductConfigRequest
  ): Promise<ApiResponse<ProductConfig>> => {
    return apiClient.pdm.post<ProductConfig>('/api/pdm/product-configs', data);
  },
  updateProductConfig: async (
    id: string,
    data: Partial<CreateProductConfigRequest>
  ): Promise<ApiResponse<ProductConfig>> => {
    return apiClient.pdm.put<ProductConfig>(`/api/pdm/product-configs/${id}`, data);
  },
  deleteProductConfig: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.pdm.delete<boolean>(`/api/pdm/product-configs/${id}`);
  },

  // Documents
  listDocuments: async (): Promise<ApiResponse<Document[]>> => {
    return apiClient.pdm.get<Document[]>('/api/pdm/documents');
  },
  getDocument: async (id: string): Promise<ApiResponse<Document>> => {
    return apiClient.pdm.get<Document>(`/api/pdm/documents/${id}`);
  },

  // Document Versions
  listVersions: async (): Promise<ApiResponse<DocumentVersion[]>> => {
    return apiClient.pdm.get<DocumentVersion[]>('/api/pdm/versions');
  },
  getVersion: async (id: string): Promise<ApiResponse<DocumentVersion>> => {
    return apiClient.pdm.get<DocumentVersion>(`/api/pdm/versions/${id}`);
  },
  createVersion: async (
    data: CreateVersionRequest
  ): Promise<ApiResponse<DocumentVersion>> => {
    return apiClient.pdm.post<DocumentVersion>('/api/pdm/versions', data);
  },
  updateVersion: async (
    id: string,
    data: Partial<CreateVersionRequest>
  ): Promise<ApiResponse<DocumentVersion>> => {
    return apiClient.pdm.put<DocumentVersion>(`/api/pdm/versions/${id}`, data);
  },
  deleteVersion: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.pdm.delete<boolean>(`/api/pdm/versions/${id}`);
  },

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.pdm.get<string>('/health');
  },

  importData: async (type: string, file: File): Promise<ApiResponse<any>> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    return apiClient.pdm.post<any>('/api/pdm/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
