import { apiClient, ApiResponse, PaginatedResponse } from './client';

export interface Instrument {
  id: string;
  name: string;
  code: string;
  model: string;
  manufacturer: string;
  serial_number: string;
  status: string;
  location: string;
  purchase_date: string;
  calibration_date: string;
  next_calibration_date: string;
  maintenance_history: Record<string, unknown>[];
  responsible_person: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface CalibrationRecord {
  id: string;
  instrument_id: string;
  instrument_name: string;
  calibration_date: string;
  calibrated_by: string;
  calibration_results: Record<string, unknown>;
  notes: string;
  created_at: string;
}

export interface InstrumentCreateRequest {
  name: string;
  code: string;
  model?: string;
  manufacturer?: string;
  serial_number?: string;
  location?: string;
  purchase_date?: string;
  responsible_person?: string;
  description?: string;
}

export interface CalibrationCreateRequest {
  instrument_id: string;
  calibration_date: string;
  calibrated_by: string;
  calibration_results: Record<string, unknown>;
  notes?: string;
}

export interface InstrumentListParams {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
}

export const instrumentApi = {
  list: async (params: InstrumentListParams = {}): Promise<ApiResponse<PaginatedResponse<Instrument>>> => {
    const response = await apiClient.get('/api/instruments', { params });
    return response.data;
  },

  get: async (id: string): Promise<ApiResponse<Instrument>> => {
    const response = await apiClient.get(`/api/instruments/${id}`);
    return response.data;
  },

  create: async (data: InstrumentCreateRequest): Promise<ApiResponse<Instrument>> => {
    const response = await apiClient.post('/api/instruments', data);
    return response.data;
  },

  update: async (id: string, data: Partial<InstrumentCreateRequest>): Promise<ApiResponse<Instrument>> => {
    const response = await apiClient.put(`/api/instruments/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete(`/api/instruments/${id}`);
    return response.data;
  },

  calibrate: async (data: CalibrationCreateRequest): Promise<ApiResponse<CalibrationRecord>> => {
    const response = await apiClient.post('/api/instruments/calibrate', data);
    return response.data;
  },

  getCalibrations: async (instrumentId: string): Promise<ApiResponse<CalibrationRecord[]>> => {
    const response = await apiClient.get(`/api/instruments/${instrumentId}/calibrations`);
    return response.data;
  },
};