import { apiClient } from './client';
import type { ApiResponse } from '@/types';

export interface BarcodeScanRequest {
  barcode: string;
  location_lat?: number;
  location_lng?: number;
  scan_type?: string;
}

export interface BarcodeScanResponse {
  barcode: string;
  decoded_data: string;
  scan_type: string;
  matched_item?: {
    item_code: string;
    item_name: string;
    item_type: string;
  };
  timestamp: string;
}

export interface QrCodeScanRequest {
  qr_data: string;
  location_lat?: number;
  location_lng?: number;
}

export interface QrCodeScanResponse {
  qr_data: string;
  decoded_url?: string;
  decoded_text: string;
  data_type: string;
  timestamp: string;
}

export interface ScanRecord {
  id: string;
  scan_type: string;
  scan_data: string;
  result_data?: Record<string, unknown>;
  location_lat?: number;
  location_lng?: number;
  created_at: string;
}

export const scanApi = {
  scanBarcode: async (data: BarcodeScanRequest): Promise<ApiResponse<BarcodeScanResponse>> => {
    return apiClient.post('/scan/barcode', data);
  },

  scanQrcode: async (data: QrCodeScanRequest): Promise<ApiResponse<QrCodeScanResponse>> => {
    return apiClient.post('/scan/qrcode', data);
  },

  getScanHistory: async (params?: {
    page?: number;
    pageSize?: number;
    scan_type?: string;
  }): Promise<ApiResponse<{ items: ScanRecord[]; total: number }>> => {
    return apiClient.get('/barcode/history', { params });
  },

  getScanById: async (id: string): Promise<ApiResponse<ScanRecord>> => {
    return apiClient.get(`/barcode/history/${id}`);
  },

  deleteScanRecord: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.delete(`/barcode/history/${id}`);
  },

  getSupportedBarcodeTypes: async (): Promise<
    ApiResponse<
      Array<{
        code: string;
        name: string;
        description: string;
      }>
    >
  > => {
    return apiClient.get('/barcode/types');
  },
};
