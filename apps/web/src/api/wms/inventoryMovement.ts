/**
 * WMS · 库存移动 API 绑定
 *
 * 后端: svc/wms/src/modules/inventory_movement.rs
 * 路由:
 *   GET    /wms/inventory-movements
 *   POST   /wms/inventory-movements
 *   GET    /wms/inventory-movements/{id}
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

type MovementType = 'putaway' | 'pick' | 'transfer' | 'adjustment' | 'return' | 'scrap' | 'count';

type MovementStatus = 'pending' | 'completed' | 'cancelled';

export interface InventoryMovement {
  id: string;
  movement_no: string;
  tenant_id: string;
  movement_type: MovementType;
  reference_id?: string;
  reference_type?: string;
  material_id?: string;
  material_code: string;
  material_name: string;
  quantity: number;
  from_location_id?: string;
  to_location_id?: string;
  from_warehouse_id?: string;
  to_warehouse_id?: string;
  status: MovementStatus;
  performed_by?: string;
  performed_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateInventoryMovementRequest {
  movement_type: MovementType;
  reference_id?: string;
  reference_type?: string;
  material_id?: string;
  material_code: string;
  material_name: string;
  quantity: number;
  from_location_id?: string;
  to_location_id?: string;
  from_warehouse_id?: string;
  to_warehouse_id?: string;
  notes?: string;
}

export interface InventoryMovementQueryParams {
  page?: number;
  page_size?: number;
  movement_type?: MovementType;
  status?: MovementStatus;
  ref_id?: string;
  ref_type?: string;
  reference_id?: string;
  reference_type?: string;
  material_id?: string;
  start_date?: string;
  end_date?: string;
}

interface InventoryMovementListResponse {
  items: InventoryMovement[];
  total: number;
  page: number;
  page_size: number;
}

export const inventoryMovementApi = {
  listMovements: async (
    params?: InventoryMovementQueryParams
  ): Promise<ApiResponse<InventoryMovementListResponse>> => {
    return apiClient.wms.get('/inventory-movements', { params });
  },

  createMovement: async (
    data: CreateInventoryMovementRequest
  ): Promise<ApiResponse<InventoryMovement>> => {
    return apiClient.wms.post('/inventory-movements', data);
  },

  getMovement: async (id: string): Promise<ApiResponse<InventoryMovement>> => {
    return apiClient.wms.get(`/inventory-movements/${id}`);
  },

  listByMaterial: async (
    materialId: string,
    params?: Omit<InventoryMovementQueryParams, 'material_id'>
  ): Promise<ApiResponse<InventoryMovementListResponse>> => {
    return apiClient.wms.get('/inventory-movements', {
      params: { ...params, material_id: materialId },
    });
  },

  listByType: async (
    movementType: MovementType,
    params?: Omit<InventoryMovementQueryParams, 'movement_type'>
  ): Promise<ApiResponse<InventoryMovementListResponse>> => {
    return apiClient.wms.get('/inventory-movements', {
      params: { ...params, movement_type: movementType },
    });
  },

  listByReference: async (
    referenceId: string,
    referenceType?: string
  ): Promise<ApiResponse<InventoryMovementListResponse>> => {
    const params: Record<string, string> = { ref_id: referenceId };
    if (referenceType) params.ref_type = referenceType;
    return apiClient.wms.get('/inventory-movements', { params });
  },
};

export default inventoryMovementApi;
