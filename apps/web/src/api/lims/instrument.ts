import apiClient from '../client';
import type { ApiResponse } from '../client';
import { createCrudApi } from './utils';
import type {
  Instrument,
  CreateInstrumentRequest,
  MaintenanceRecord,
  CreateMaintenanceRecordRequest,
  CalibrationRecord,
  CreateCalibrationRequest,
  InstrumentData,
  CreateInstrumentDataRequest,
  UpdateInstrumentDataRequest,
  ParseResult,
  ParseDataRequest,
  InstrumentDataStatistics,
  ListParams,
} from './types';

export const instrumentApi = {
  ...createCrudApi<Instrument>('/api/lims/instruments'),

  listInstruments: (params?: ListParams) =>
    createCrudApi<Instrument>('/api/lims/instruments').list(params),

  getInstrument: (id: string) => createCrudApi<Instrument>('/api/lims/instruments').get(id),

  createInstrument: (data: CreateInstrumentRequest) =>
    createCrudApi<Instrument>('/api/lims/instruments').create(data),

  updateInstrument: (id: string, data: Partial<CreateInstrumentRequest>) =>
    createCrudApi<Instrument>('/api/lims/instruments').update(id, data),

  deleteInstrument: (id: string) => createCrudApi<Instrument>('/api/lims/instruments').delete(id),

  calibrate: async (
    id: string,
    data: CreateCalibrationRequest
  ): Promise<ApiResponse<CalibrationRecord>> => {
    return apiClient.lims.post(`/api/lims/instruments/${id}/calibrate`, data);
  },

  listCalibrationRecords: async (
    instrumentId: string
  ): Promise<ApiResponse<CalibrationRecord[]>> => {
    return apiClient.lims.get(`/api/lims/instruments/${instrumentId}/calibrations`);
  },
};

export const maintenanceApi = {
  listByInstrument: async (instrumentId: string): Promise<ApiResponse<MaintenanceRecord[]>> => {
    return apiClient.lims.get(`/api/lims/instruments/${instrumentId}/maintenance`);
  },

  create: async (data: CreateMaintenanceRecordRequest): Promise<ApiResponse<MaintenanceRecord>> => {
    return apiClient.lims.post('/api/lims/maintenance', data);
  },

  update: async (
    id: string,
    data: Partial<CreateMaintenanceRecordRequest>
  ): Promise<ApiResponse<MaintenanceRecord>> => {
    return apiClient.lims.put(`/api/lims/maintenance/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.lims.delete(`/api/lims/maintenance/${id}`);
  },
};

export const instrumentDataApi = {
  listInstrumentData: async (
    params?: ListParams
  ): Promise<ApiResponse<InstrumentData[]>> => {
    return apiClient.lims.get('/api/lims/instrument-data', { params });
  },

  getInstrumentData: async (id: string): Promise<ApiResponse<InstrumentData>> => {
    return apiClient.lims.get(`/api/lims/instrument-data/${id}`);
  },

  createInstrumentData: async (
    data: CreateInstrumentDataRequest
  ): Promise<ApiResponse<InstrumentData>> => {
    return apiClient.lims.post('/api/lims/instrument-data', data);
  },

  updateInstrumentData: async (
    id: string,
    data: UpdateInstrumentDataRequest
  ): Promise<ApiResponse<InstrumentData>> => {
    return apiClient.lims.put(`/api/lims/instrument-data/${id}`, data);
  },

  deleteInstrumentData: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.lims.delete(`/api/lims/instrument-data/${id}`);
  },

  parseInstrumentData: async (id: string): Promise<ApiResponse<InstrumentData>> => {
    return apiClient.lims.post(`/api/lims/instrument-data/${id}/parse`);
  },

  testParseData: async (data: ParseDataRequest): Promise<ApiResponse<ParseResult>> => {
    return apiClient.lims.post('/api/lims/instrument-data/parse/test', data);
  },

  getStatistics: async (): Promise<ApiResponse<InstrumentDataStatistics>> => {
    return apiClient.lims.get('/api/lims/instrument-data/statistics');
  },
};
