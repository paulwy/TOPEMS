import apiClient from '../client';
import type { ApiResponse } from '../client';
import type { PdmDocument } from './document';

import { pdmDashboardApi } from './dashboard';
import { bomApi } from './bom';
import { documentApi } from './document';
import { documentApprovalApi } from './documentApproval';
import { changeNoticeActionApi } from './changeNoticeAction';
import { workflowApi } from './workflow';
import { pdmVersionApi } from './pdmVersion';
import { pdmMaterialApi } from './pdmMaterial';
import { pdmProductApi } from './pdmProduct';

export * from './bom';
export * from './project';
export * from './document';
export * from './pdmMaterial';
export * from './pdmProduct';

export { pdmDashboardApi } from './dashboard';
export { documentApprovalApi } from './documentApproval';
export { changeNoticeActionApi } from './changeNoticeAction';
export { workflowApi } from './workflow';

export type Document = PdmDocument;

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

interface UpdateProductionStepRequest {
  step_no?: string;
  name?: string;
  description?: string;
  duration_hours?: number;
  equipment_required?: string;
  sort_order?: number;
}

interface CreateProductionStepRequest {
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

interface CreateProductionFormulaRequest {
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
  plannedQuantity?: number;
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

interface CreateProductionBatchRequest {
  batch_no: string;
  product_name: string;
  formula_id?: string;
  process_id?: string;
  plannedQuantity?: number;
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

interface PdmStatistics {
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

export interface Product {
  id: string;
  name: string;
  code: string;
  version: string;
  status: string;
  description?: string;
  category?: string;
  unit?: string;
  created_at: string;
  updated_at?: string;
}

export interface CreateProductRequest {
  name: string;
  code: string;
  version: string;
  status: string;
  description?: string;
  category?: string;
  unit?: string;
}

export interface UpdateProductRequest {
  name?: string;
  code?: string;
  version?: string;
  status?: string;
  description?: string;
  category?: string;
  unit?: string;
}

export interface Material {
  id: string;
  code: string;
  name: string;
  category: string;
  specification?: string;
  unit: string;
  unit_price: number;
  supplier?: string;
  status: string;
  inventory_quantity?: number;
  safety_stock?: number;
  created_at: string;
  updated_at?: string;
}

export interface CreateMaterialRequest {
  code: string;
  name: string;
  category: string;
  specification?: string;
  unit: string;
  unit_price: number;
  supplier?: string;
  status: string;
  inventory_quantity?: number;
  safety_stock?: number;
}

export interface UpdateMaterialRequest {
  code?: string;
  name?: string;
  category?: string;
  specification?: string;
  unit?: string;
  unit_price?: number;
  supplier?: string;
  status?: string;
  inventory_quantity?: number;
  safety_stock?: number;
}

export interface ChangeOrder {
  id: string;
  change_no: string;
  title: string;
  type: string;
  priority: string;
  status: string;
  applicant: string;
  applicant_name?: string;
  apply_date: string;
  approved_by?: string;
  approved_date?: string;
  implemented_by?: string;
  implemented_date?: string;
  description: string;
  reason: string;
  impact_analysis?: string;
  affecteditems?: string[];
  remarks?: string;
  created_at: string;
  updated_at?: string;
}

export interface CreateChangeOrderRequest {
  change_no: string;
  title: string;
  type: string;
  priority: string;
  status: string;
  applicant: string;
  apply_date: string;
  description: string;
  reason: string;
  impact_analysis?: string;
  affecteditems?: string[];
  remarks?: string;
}

interface UpdateChangeOrderRequest {
  title?: string;
  type?: string;
  priority?: string;
  status?: string;
  approved_by?: string;
  approved_date?: string;
  implemented_by?: string;
  implemented_date?: string;
  description?: string;
  reason?: string;
  impact_analysis?: string;
  affecteditems?: string[];
  remarks?: string;
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

interface CreateProductConfigRequest {
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

export const pdmApi = {
  dashboard: pdmDashboardApi,
  ...bomApi,
  ...documentApi,

  // Production Processes
  listProcesses: async (): Promise<ApiResponse<ProductionProcess[]>> => {
    return apiClient.pdm.get<ProductionProcess[]>('/production-processes');
  },
  getProcess: async (id: string): Promise<ApiResponse<ProductionProcess>> => {
    return apiClient.pdm.get<ProductionProcess>(`/production-processes/${id}`);
  },
  createProcess: async (
    data: CreateProductionProcessRequest
  ): Promise<ApiResponse<ProductionProcess>> => {
    return apiClient.pdm.post<ProductionProcess>('/production-processes', data);
  },
  updateProcess: async (
    id: string,
    data: CreateProductionProcessRequest
  ): Promise<ApiResponse<ProductionProcess>> => {
    return apiClient.pdm.put<ProductionProcess>(`/production-processes/${id}`, data);
  },
  deleteProcess: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.pdm.delete<boolean>(`/production-processes/${id}`);
  },

  // Production Steps
  listSteps: async (): Promise<ApiResponse<ProductionStep[]>> => {
    return apiClient.pdm.get<ProductionStep[]>('/production-steps');
  },
  getStep: async (id: string): Promise<ApiResponse<ProductionStep>> => {
    return apiClient.pdm.get<ProductionStep>(`/production-steps/${id}`);
  },
  createStep: async (data: CreateProductionStepRequest): Promise<ApiResponse<ProductionStep>> => {
    return apiClient.pdm.post<ProductionStep>('/production-steps', data);
  },
  updateStep: async (
    id: string,
    data: UpdateProductionStepRequest
  ): Promise<ApiResponse<ProductionStep>> => {
    return apiClient.pdm.put<ProductionStep>(`/production-steps/${id}`, data);
  },
  deleteStep: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.pdm.delete<boolean>(`/production-steps/${id}`);
  },

  // Production Formulas
  listFormulas: async (): Promise<ApiResponse<ProductionFormula[]>> => {
    return apiClient.pdm.get<ProductionFormula[]>('/production-formulas');
  },
  getFormula: async (id: string): Promise<ApiResponse<ProductionFormula>> => {
    return apiClient.pdm.get<ProductionFormula>(`/production-formulas/${id}`);
  },
  createFormula: async (
    data: CreateProductionFormulaRequest
  ): Promise<ApiResponse<ProductionFormula>> => {
    return apiClient.pdm.post<ProductionFormula>('/production-formulas', data);
  },
  updateFormula: async (
    id: string,
    data: CreateProductionFormulaRequest
  ): Promise<ApiResponse<ProductionFormula>> => {
    return apiClient.pdm.put<ProductionFormula>(`/production-formulas/${id}`, data);
  },
  deleteFormula: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.pdm.delete<boolean>(`/production-formulas/${id}`);
  },

  // Production Batches
  listBatches: async (): Promise<ApiResponse<ProductionBatch[]>> => {
    return apiClient.pdm.get<ProductionBatch[]>('/production-batches');
  },
  getBatch: async (id: string): Promise<ApiResponse<ProductionBatch>> => {
    return apiClient.pdm.get<ProductionBatch>(`/production-batches/${id}`);
  },
  createBatch: async (
    data: CreateProductionBatchRequest
  ): Promise<ApiResponse<ProductionBatch>> => {
    return apiClient.pdm.post<ProductionBatch>('/production-batches', data);
  },
  updateBatch: async (
    id: string,
    data: CreateProductionBatchRequest
  ): Promise<ApiResponse<ProductionBatch>> => {
    return apiClient.pdm.put<ProductionBatch>(`/production-batches/${id}`, data);
  },
  deleteBatch: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.pdm.delete<boolean>(`/production-batches/${id}`);
  },

  // Production Statistics
  listStatistics: async (): Promise<ApiResponse<ProductionStatistics[]>> => {
    return apiClient.pdm.get<ProductionStatistics[]>('/production-statistics');
  },

  getStatistics: async (): Promise<ApiResponse<PdmStatistics>> => {
    return apiClient.pdm.get<PdmStatistics>('/statistics');
  },

  // Products
  listProducts: async (): Promise<ApiResponse<Product[]>> => {
    return apiClient.pdm.get<Product[]>('/products');
  },
  getProduct: async (id: string): Promise<ApiResponse<Product>> => {
    return apiClient.pdm.get<Product>(`/products/${id}`);
  },
  createProduct: async (data: CreateProductRequest): Promise<ApiResponse<Product>> => {
    return apiClient.pdm.post<Product>('/products', data);
  },
  updateProduct: async (id: string, data: UpdateProductRequest): Promise<ApiResponse<Product>> => {
    return apiClient.pdm.put<Product>(`/products/${id}`, data);
  },
  deleteProduct: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.pdm.delete<boolean>(`/products/${id}`);
  },

  // Materials
  listMaterials: async (): Promise<ApiResponse<Material[]>> => {
    return apiClient.pdm.get<Material[]>('/materials');
  },
  getMaterial: async (id: string): Promise<ApiResponse<Material>> => {
    return apiClient.pdm.get<Material>(`/materials/${id}`);
  },
  createMaterial: async (data: CreateMaterialRequest): Promise<ApiResponse<Material>> => {
    return apiClient.pdm.post<Material>('/materials', data);
  },
  updateMaterial: async (
    id: string,
    data: UpdateMaterialRequest
  ): Promise<ApiResponse<Material>> => {
    return apiClient.pdm.put<Material>(`/materials/${id}`, data);
  },
  deleteMaterial: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.pdm.delete<boolean>(`/materials/${id}`);
  },

  // Change Orders
  listChangeOrders: async (): Promise<ApiResponse<ChangeOrder[]>> => {
    return apiClient.pdm.get<ChangeOrder[]>('/change-notices');
  },
  getChangeOrder: async (id: string): Promise<ApiResponse<ChangeOrder>> => {
    return apiClient.pdm.get<ChangeOrder>(`/change-notices/${id}`);
  },
  createChangeOrder: async (data: CreateChangeOrderRequest): Promise<ApiResponse<ChangeOrder>> => {
    return apiClient.pdm.post<ChangeOrder>('/change-notices', data);
  },
  updateChangeOrder: async (
    id: string,
    data: UpdateChangeOrderRequest
  ): Promise<ApiResponse<ChangeOrder>> => {
    return apiClient.pdm.put<ChangeOrder>(`/change-notices/${id}`, data);
  },
  deleteChangeOrder: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.pdm.delete<boolean>(`/change-notices/${id}`);
  },

  // Product Configurations
  listProductConfigs: async (): Promise<ApiResponse<ProductConfig[]>> => {
    return apiClient.pdm.get<ProductConfig[]>('/configurations');
  },
  getProductConfig: async (id: string): Promise<ApiResponse<ProductConfig>> => {
    return apiClient.pdm.get<ProductConfig>(`/configurations/${id}`);
  },
  createProductConfig: async (
    data: CreateProductConfigRequest
  ): Promise<ApiResponse<ProductConfig>> => {
    return apiClient.pdm.post<ProductConfig>('/configurations', data);
  },
  updateProductConfig: async (
    id: string,
    data: Partial<CreateProductConfigRequest>
  ): Promise<ApiResponse<ProductConfig>> => {
    return apiClient.pdm.put<ProductConfig>(`/configurations/${id}`, data);
  },
  deleteProductConfig: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.pdm.delete<boolean>(`/configurations/${id}`);
  },

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.pdm.get<string>('/health');
  },

  importData: async (type: string, file: File): Promise<ApiResponse<any>> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    return apiClient.pdm.post<any>('/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Document Approval
  ...documentApprovalApi,

  // Change Notice Actions
  ...changeNoticeActionApi,

  // Workflows
  ...workflowApi,

  // Versions
  ...pdmVersionApi,
};

export default pdmApi;
