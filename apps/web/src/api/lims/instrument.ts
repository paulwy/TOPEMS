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
  ...createCrudApi<Instrument>('/instruments'),

  listInstruments: (params?: ListParams) => createCrudApi<Instrument>('/instruments').list(params),

  getInstrument: (id: string) => createCrudApi<Instrument>('/instruments').get(id),

  createInstrument: (data: CreateInstrumentRequest) =>
    createCrudApi<Instrument>('/instruments').create(data),

  updateInstrument: (id: string, data: Partial<CreateInstrumentRequest>) =>
    createCrudApi<Instrument>('/instruments').update(id, data),

  deleteInstrument: (id: string) => createCrudApi<Instrument>('/instruments').delete(id),

  calibrate: async (
    id: string,
    data: CreateCalibrationRequest
  ): Promise<ApiResponse<CalibrationRecord>> => {
    return apiClient.lims.post(`/instruments/${id}/calibration`, data);
  },

  listCalibrationRecords: async (
    instrumentId: string
  ): Promise<ApiResponse<CalibrationRecord[]>> => {
    return apiClient.lims.get(`/instruments/${instrumentId}/calibrations`);
  },
};

export const maintenanceApi = {
  listByInstrument: async (instrumentId: string): Promise<ApiResponse<MaintenanceRecord[]>> => {
    return apiClient.lims.get(`/instruments/${instrumentId}/maintenance`);
  },

  create: async (data: CreateMaintenanceRecordRequest): Promise<ApiResponse<MaintenanceRecord>> => {
    return apiClient.lims.post('/maintenance', data);
  },

  update: async (
    id: string,
    data: Partial<CreateMaintenanceRecordRequest>
  ): Promise<ApiResponse<MaintenanceRecord>> => {
    return apiClient.lims.put(`/maintenance/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.lims.delete(`/maintenance/${id}`);
  },
};

export const instrumentDataApi = {
  listInstrumentData: async (params?: ListParams): Promise<ApiResponse<InstrumentData[]>> => {
    return apiClient.lims.get('/instrument-data', { params });
  },

  getInstrumentData: async (id: string): Promise<ApiResponse<InstrumentData>> => {
    return apiClient.lims.get(`/instrument-data/${id}`);
  },

  createInstrumentData: async (
    data: CreateInstrumentDataRequest
  ): Promise<ApiResponse<InstrumentData>> => {
    return apiClient.lims.post('/instrument-data', data);
  },

  updateInstrumentData: async (
    id: string,
    data: UpdateInstrumentDataRequest
  ): Promise<ApiResponse<InstrumentData>> => {
    return apiClient.lims.put(`/instrument-data/${id}`, data);
  },

  deleteInstrumentData: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.lims.delete(`/instrument-data/${id}`);
  },

  parseInstrumentData: async (id: string): Promise<ApiResponse<InstrumentData>> => {
    return apiClient.lims.post(`/instrument-data/${id}/parse`);
  },

  testParseData: async (data: ParseDataRequest): Promise<ApiResponse<ParseResult>> => {
    return apiClient.lims.post('/instrument-data/parse/test', data);
  },

  getStatistics: async (): Promise<ApiResponse<InstrumentDataStatistics>> => {
    return apiClient.lims.get('/instrument-data/statistics');
  },
};
