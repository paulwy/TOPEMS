import apiClient from '../client';
import type { ApiResponse } from '../client';
import { createCrudApi } from './utils';
import type {
  Barcode,
  CreateBarcodeRequest,
  UpdateBarcodeRequest,
  BarcodeType,
  PrintBarcodeRequest,
  ScanBarcodeResult,
  SampleTraceability,
  RfidTag,
  CreateRfidTagRequest,
  AssignRfidTagRequest,
  PrintConfig,
  ListParams,
  PaginatedResult,
} from './types';

export const barcodeApi = {
  ...createCrudApi<Barcode>('/api/lims/barcodes'),

  listBarcodes: (params?: ListParams) => createCrudApi<Barcode>('/api/lims/barcodes').list(params),

  getBarcode: (id: string) => createCrudApi<Barcode>('/api/lims/barcodes').get(id),

  generateBarcode: async (data: CreateBarcodeRequest): Promise<ApiResponse<Barcode[]>> => {
    return apiClient.lims.post('/api/lims/barcodes/generate', data);
  },

  updateBarcode: (id: string, data: UpdateBarcodeRequest) =>
    createCrudApi<Barcode>('/api/lims/barcodes').update(id, data),

  deleteBarcode: (id: string) => createCrudApi<Barcode>('/api/lims/barcodes').delete(id),

  printBarcode: async (data: PrintBarcodeRequest): Promise<ApiResponse<boolean>> => {
    return apiClient.lims.post('/api/lims/barcodes/print', data);
  },

  scanBarcode: async (barcode: string): Promise<ApiResponse<ScanBarcodeResult>> => {
    return apiClient.lims.get(`/api/lims/barcodes/scan/${barcode}`);
  },

  getBarcodeTypes: async (): Promise<ApiResponse<BarcodeType[]>> => {
    return apiClient.lims.get('/api/lims/barcodes/types');
  },

  traceSampleByBarcode: async (barcode: string): Promise<ApiResponse<SampleTraceability>> => {
    return apiClient.lims.get(`/api/lims/barcodes/${barcode}/trace`);
  },
};

export const rfidTagApi = {
  listRfidTags: async (params?: ListParams): Promise<ApiResponse<PaginatedResult<RfidTag>>> => {
    return apiClient.lims.get('/api/lims/rfid-tags', { params });
  },

  createRfidTag: async (data: CreateRfidTagRequest): Promise<ApiResponse<RfidTag>> => {
    return apiClient.lims.post('/api/lims/rfid-tags', data);
  },

  deleteRfidTag: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.lims.delete(`/api/lims/rfid-tags/${id}`);
  },

  assignRfidTag: async (data: AssignRfidTagRequest): Promise<ApiResponse<RfidTag>> => {
    return apiClient.lims.post('/api/lims/rfid-tags/assign', data);
  },

  unassignRfidTag: async (tagId: string): Promise<ApiResponse<RfidTag>> => {
    return apiClient.lims.post(`/api/lims/rfid-tags/${tagId}/unassign`);
  },
};

export const printConfigApi = {
  listPrintConfigs: async (): Promise<ApiResponse<PrintConfig[]>> => {
    return apiClient.lims.get('/api/lims/print-config');
  },

  getDefaultPrintConfig: async (): Promise<ApiResponse<PrintConfig>> => {
    return apiClient.lims.get('/api/lims/print-config/default');
  },
};
