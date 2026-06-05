import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8023';
const API_BASE = `${API_BASE_URL}/api/v1`;

export interface ProductionProcess {
  id: string;
  process_no: string;
  name: string;
  description: string | null;
  version: string;
  status: string;
  created_by: string | null;
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

export interface UpdateProductionProcessRequest {
  process_no?: string;
  name?: string;
  description?: string;
  version?: string;
  status?: string;
}

export interface ProductionStep {
  id: string;
  process_id: string;
  step_no: string;
  name: string;
  description: string | null;
  duration: number | null;
  equipment_required: string | null;
  sort_order: number;
  created_at: string;
}

export interface CreateProductionStepRequest {
  process_id: string;
  step_no: string;
  name: string;
  description?: string;
  duration?: number;
  equipment_required?: string;
  sort_order: number;
}

export interface ProductionFormula {
  id: string;
  formula_no: string;
  name: string;
  description: string | null;
  version: string;
  process_id: string | null;
  status: string;
  created_by: string | null;
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

export interface UpdateProductionFormulaRequest {
  formula_no?: string;
  name?: string;
  description?: string;
  version?: string;
  process_id?: string;
  status?: string;
}

export interface FormulaIngredient {
  id: string;
  formula_id: string;
  material_name: string;
  quantity: number;
  unit: string;
  percentage: number | null;
  sort_order: number;
  created_at: string;
}

export interface CreateFormulaIngredientRequest {
  formula_id: string;
  material_name: string;
  quantity: number;
  unit: string;
  percentage?: number;
  sort_order: number;
}

export interface ProductionBatch {
  id: string;
  batch_no: string;
  product_name: string;
  formula_id: string | null;
  process_id: string | null;
  planned_quantity: number | null;
  actual_quantity: number | null;
  unit: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  operator: string | null;
  remarks: string | null;
  created_by: string | null;
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

export interface UpdateProductionBatchRequest {
  batch_no?: string;
  product_name?: string;
  formula_id?: string;
  process_id?: string;
  planned_quantity?: number;
  actual_quantity?: number;
  unit?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  operator?: string;
  remarks?: string;
}

export interface ProductionStatistics {
  id: string;
  batch_id: string | null;
  stat_date: string;
  output_quantity: number | null;
  reject_quantity: number | null;
  pass_rate: number | null;
  cycle_time: number | null;
  energy_consumption: number | null;
  remarks: string | null;
  created_at: string;
}

export interface CreateProductionStatisticsRequest {
  batch_id?: string;
  stat_date: string;
  output_quantity?: number;
  reject_quantity?: number;
  pass_rate?: number;
  cycle_time?: number;
  energy_consumption?: number;
  remarks?: string;
}

export interface ApiResponse<T> {
  code: number;
  success: boolean;
  data: T | null;
  message: string;
  timestamp: string;
}

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Production Processes
export const getProcesses = async (): Promise<ProductionProcess[]> => {
  const response = await api.get<ApiResponse<ProductionProcess[]>>('/production-processes');
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data!;
};

export const createProcess = async (data: CreateProductionProcessRequest): Promise<ProductionProcess> => {
  const response = await api.post<ApiResponse<ProductionProcess>>('/production-processes', data);
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data!;
};

export const updateProcess = async (id: string, data: UpdateProductionProcessRequest): Promise<ProductionProcess> => {
  const response = await api.put<ApiResponse<ProductionProcess>>(`/production-processes/${id}`, data);
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data!;
};

export const deleteProcess = async (id: string): Promise<boolean> => {
  const response = await api.delete<ApiResponse<boolean>>(`/production-processes/${id}`);
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data!;
};

// Production Steps
export const getSteps = async (): Promise<ProductionStep[]> => {
  const response = await api.get<ApiResponse<ProductionStep[]>>('/production-steps');
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data!;
};

export const createStep = async (data: CreateProductionStepRequest): Promise<ProductionStep> => {
  const response = await api.post<ApiResponse<ProductionStep>>('/production-steps', data);
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data!;
};

export const deleteStep = async (id: string): Promise<boolean> => {
  const response = await api.delete<ApiResponse<boolean>>(`/production-steps/${id}`);
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data!;
};

// Production Formulas
export const getFormulas = async (): Promise<ProductionFormula[]> => {
  const response = await api.get<ApiResponse<ProductionFormula[]>>('/production-formulas');
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data!;
};

export const createFormula = async (data: CreateProductionFormulaRequest): Promise<ProductionFormula> => {
  const response = await api.post<ApiResponse<ProductionFormula>>('/production-formulas', data);
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data!;
};

export const updateFormula = async (id: string, data: UpdateProductionFormulaRequest): Promise<ProductionFormula> => {
  const response = await api.put<ApiResponse<ProductionFormula>>(`/production-formulas/${id}`, data);
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data!;
};

export const deleteFormula = async (id: string): Promise<boolean> => {
  const response = await api.delete<ApiResponse<boolean>>(`/production-formulas/${id}`);
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data!;
};

// Formula Ingredients
export const createIngredient = async (data: CreateFormulaIngredientRequest): Promise<FormulaIngredient> => {
  const response = await api.post<ApiResponse<FormulaIngredient>>('/formula-ingredients', data);
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data!;
};

export const deleteIngredient = async (id: string): Promise<boolean> => {
  const response = await api.delete<ApiResponse<boolean>>(`/formula-ingredients/${id}`);
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data!;
};

// Production Batches
export const getBatches = async (): Promise<ProductionBatch[]> => {
  const response = await api.get<ApiResponse<ProductionBatch[]>>('/production-batches');
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data!;
};

export const createBatch = async (data: CreateProductionBatchRequest): Promise<ProductionBatch> => {
  const response = await api.post<ApiResponse<ProductionBatch>>('/production-batches', data);
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data!;
};

export const updateBatch = async (id: string, data: UpdateProductionBatchRequest): Promise<ProductionBatch> => {
  const response = await api.put<ApiResponse<ProductionBatch>>(`/production-batches/${id}`, data);
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data!;
};

export const deleteBatch = async (id: string): Promise<boolean> => {
  const response = await api.delete<ApiResponse<boolean>>(`/production-batches/${id}`);
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data!;
};

// Production Statistics
export const getStatistics = async (): Promise<ProductionStatistics[]> => {
  const response = await api.get<ApiResponse<ProductionStatistics[]>>('/production-statistics');
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data!;
};

export const createStatistics = async (data: CreateProductionStatisticsRequest): Promise<ProductionStatistics> => {
  const response = await api.post<ApiResponse<ProductionStatistics>>('/production-statistics', data);
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data!;
};
