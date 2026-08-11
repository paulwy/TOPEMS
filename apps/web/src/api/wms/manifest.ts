/**
 * WMS · 发运清单 (Manifest) API 绑定
 *
 * 后端: svc/wms/src/modules/manifest.rs
 * 路由:
 *   GET    /manifests
 *   POST   /manifests
 *   GET    /manifests/{id}
 *   PUT    /manifests/{id}
 *   DELETE /manifests/{id}
 *   GET    /manifests/{id}/items
 *   POST   /manifests/{id}/items
 *   DELETE /manifests/{id}/items/{item_id}
 *   POST   /manifests/{id}/confirm
 *   POST   /manifests/{id}/ship
 *   POST   /manifests/{id}/cancel
 *   POST   /manifests/{id}/print
 *   POST   /manifests/batch-create
 *   GET    /manifests/{id}/labels
 *   POST   /manifests/{id}/labels/reprint
 *   GET    /manifests/carriers
 *   POST   /manifests/carriers
 *   GET    /manifests/statistics
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

export type ManifestStatus = 'draft' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
export type CarrierType = 'express' | 'freight' | 'air' | 'sea' | 'rail';
export type LabelStatus = 'pending' | 'printed' | 'void';

export interface Manifest {
  id: string;
  tenant_id: string;
  manifest_no: string;
  warehouse_id: string;
  warehouse_name?: string;
  carrier_id?: string;
  carrier_name?: string;
  carrier_type?: CarrierType;
  tracking_no?: string;
  status: ManifestStatus;
  total_items: number;
  total_quantity: number;
  total_weight?: number;
  total_volume?: number;
  outbound_order_ids: string[];
  destination_address?: {
    country: string;
    state?: string;
    city: string;
    postal_code: string;
    address_line1: string;
    address_line2?: string;
  };
  recipient_name?: string;
  recipient_phone?: string;
  shipping_notes?: string;
  shipped_at?: string;
  delivered_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ManifestItem {
  id: string;
  manifest_id: string;
  outbound_order_id: string;
  outbound_order_no: string;
  material_id?: string;
  material_code: string;
  material_name: string;
  batch_no?: string;
  serial_no?: string;
  quantity: number;
  unit: string;
  weight?: number;
  package_no?: string;
  label_status: LabelStatus;
  label_url?: string;
}

export interface Carrier {
  id: string;
  tenant_id: string;
  name: string;
  code: string;
  carrier_type: CarrierType;
  is_active: boolean;
  api_endpoint?: string;
  account_no?: string;
  created_at: string;
}

export interface ManifestLabel {
  id: string;
  manifest_id: string;
  item_id: string;
  label_no: string;
  label_url: string;
  status: LabelStatus;
  printed_at?: string;
}

export interface ManifestStatistics {
  period: string;
  total_manifests: number;
  shipped_manifests: number;
  total_items: number;
  total_quantity: number;
  total_weight: number;
  by_carrier: Array<{
    carrier_id: string;
    carrier_name: string;
    manifest_count: number;
  }>;
  by_status: Array<{
    status: ManifestStatus;
    count: number;
  }>;
  by_warehouse: Array<{
    warehouse_id: string;
    warehouse_name: string;
    manifest_count: number;
  }>;
}

export interface CreateManifestRequest {
  warehouse_id: string;
  outbound_order_ids: string[];
  carrier_id?: string;
  carrier_type?: CarrierType;
  recipient_name?: string;
  recipient_phone?: string;
  destination_address?: Manifest['destination_address'];
  shipping_notes?: string;
  auto_confirm?: boolean;
}

export interface UpdateManifestRequest {
  carrier_id?: string;
  carrier_type?: CarrierType;
  recipient_name?: string;
  recipient_phone?: string;
  destination_address?: Manifest['destination_address'];
  shipping_notes?: string;
}

export interface AddManifestItemRequest {
  outbound_order_id: string;
}

export interface BatchCreateManifestRequest {
  warehouse_id: string;
  outbound_order_ids: string[];
  group_by?: 'carrier' | 'destination' | 'date';
  carrier_id?: string;
  carrier_type?: CarrierType;
}

export interface CreateCarrierRequest {
  name: string;
  code: string;
  carrier_type: CarrierType;
  api_endpoint?: string;
  account_no?: string;
}

export const manifestApi = {
  listManifests: async (params?: {
    status?: ManifestStatus;
    carrier_id?: string;
    warehouse_id?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<{ items: Manifest[]; total: number }>> => {
    return apiClient.wms.get('/manifests', { params });
  },

  getManifest: async (id: string): Promise<ApiResponse<Manifest>> => {
    return apiClient.wms.get(`/manifests/${id}`);
  },

  createManifest: async (data: CreateManifestRequest): Promise<ApiResponse<Manifest>> => {
    return apiClient.wms.post('/manifests', data);
  },

  updateManifest: async (
    id: string,
    data: UpdateManifestRequest
  ): Promise<ApiResponse<Manifest>> => {
    return apiClient.wms.put(`/manifests/${id}`, data);
  },

  deleteManifest: async (id: string): Promise<ApiResponse<{ deleted: boolean }>> => {
    return apiClient.wms.delete(`/manifests/${id}`);
  },

  listManifestItems: async (manifestId: string): Promise<ApiResponse<ManifestItem[]>> => {
    return apiClient.wms.get(`/manifests/${manifestId}/items`);
  },

  addManifestItem: async (
    manifestId: string,
    data: AddManifestItemRequest
  ): Promise<ApiResponse<ManifestItem>> => {
    return apiClient.wms.post(`/manifests/${manifestId}/items`, data);
  },

  removeManifestItem: async (
    manifestId: string,
    itemId: string
  ): Promise<ApiResponse<{ deleted: boolean }>> => {
    return apiClient.wms.delete(`/manifests/${manifestId}/items/${itemId}`);
  },

  confirmManifest: async (id: string): Promise<ApiResponse<Manifest>> => {
    return apiClient.wms.post(`/manifests/${id}/confirm`);
  },

  shipManifest: async (
    id: string,
    data?: { tracking_no?: string; shipped_at?: string }
  ): Promise<ApiResponse<Manifest>> => {
    return apiClient.wms.post(`/manifests/${id}/ship`, data || {});
  },

  cancelManifest: async (id: string, reason?: string): Promise<ApiResponse<Manifest>> => {
    return apiClient.wms.post(`/manifests/${id}/cancel`, { reason });
  },

  printManifest: async (
    id: string,
    data?: { format?: 'pdf' | 'zpl' | 'thermal'; copies?: number }
  ): Promise<ApiResponse<{ download_url: string }>> => {
    return apiClient.wms.post(`/manifests/${id}/print`, data || {});
  },

  batchCreate: async (
    data: BatchCreateManifestRequest
  ): Promise<ApiResponse<{ manifests: Manifest[]; count: number }>> => {
    return apiClient.wms.post('/manifests/batch-create', data);
  },

  listLabels: async (manifestId: string): Promise<ApiResponse<ManifestLabel[]>> => {
    return apiClient.wms.get(`/manifests/${manifestId}/labels`);
  },

  reprintLabels: async (
    manifestId: string,
    data?: { item_ids?: string[]; format?: 'pdf' | 'zpl' | 'thermal' }
  ): Promise<ApiResponse<{ download_url: string }>> => {
    return apiClient.wms.post(`/manifests/${manifestId}/labels/reprint`, data || {});
  },

  listCarriers: async (carrierType?: CarrierType): Promise<ApiResponse<Carrier[]>> => {
    return apiClient.wms.get('/manifests/carriers', {
      params: { carrier_type: carrierType },
    });
  },

  createCarrier: async (data: CreateCarrierRequest): Promise<ApiResponse<Carrier>> => {
    return apiClient.wms.post('/manifests/carriers', data);
  },

  getStatistics: async (params?: {
    period?: 'day' | 'week' | 'month';
    warehouse_id?: string;
    carrier_id?: string;
  }): Promise<ApiResponse<ManifestStatistics>> => {
    return apiClient.wms.get('/manifests/statistics', { params });
  },
};

export default manifestApi;
