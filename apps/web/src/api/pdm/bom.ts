import apiClient from '../client';
import type { ApiResponse } from '../client';

export interface BomVersion {
  id: string;
  bom_no: string;
  name: string;
  product_id: string;
  product_name?: string;
  product_code?: string;
  version: string;
  status: 'draft' | 'active' | 'archived' | 'superseded';
  effective_date?: string;
  expiry_date?: string;
  description?: string;
  created_by?: string;
  created_at: string;
  updated_at?: string;
}

export interface CreateBomVersionRequest {
  bom_no: string;
  name: string;
  product_id: string;
  version: string;
  status?: string;
  effective_date?: string;
  expiry_date?: string;
  description?: string;
}

export interface BomItem {
  id: string;
  bom_version_id: string;
  product_id?: string;
  parentId?: string;
  level: number;
  item_no: string;
  part_number: string;
  part_name: string;
  quantity: number;
  unit: string;
  unit_price?: number;
  total_price?: number;
  is_alternative?: boolean;
  remarks?: string;
  created_at: string;
  updated_at?: string;
}

export interface CreateBomItemRequest {
  bom_version_id: string;
  parentId?: string;
  level: number;
  item_no: string;
  part_number: string;
  part_name: string;
  quantity: number;
  unit: string;
  unit_price?: number;
  is_alternative?: boolean;
  remarks?: string;
}

interface BomComparison {
  id: string;
  name: string;
  bom_version_a_id: string;
  bom_version_b_id: string;
  bom_version_a?: BomVersion;
  bom_version_b?: BomVersion;
  differences: {
    addeditems: BomItem[];
    removeditems: BomItem[];
    modifieditems: Array<{
      item: BomItem;
      field: string;
      old_value: unknown;
      new_value: unknown;
    }>;
  };
  created_by?: string;
  created_at: string;
}

export const bomApi = {
  // BOM Versions
  listVersions: async (): Promise<ApiResponse<BomVersion[]>> => {
    return apiClient.pdm.get<BomVersion[]>('/bom-versions');
  },
  listBomItems: async (bomVersionId?: string): Promise<ApiResponse<BomItem[]>> => {
    return bomApi.listItems(bomVersionId);
  },
  createBomItem: async (data: CreateBomItemRequest): Promise<ApiResponse<BomItem>> => {
    return bomApi.createItem(data);
  },
  updateBomItem: async (
    id: string,
    data: Partial<CreateBomItemRequest>
  ): Promise<ApiResponse<BomItem>> => {
    return bomApi.updateItem(id, data);
  },
  deleteBomItem: async (id: string): Promise<ApiResponse<boolean>> => {
    return bomApi.deleteItem(id);
  },
  getVersion: async (id: string): Promise<ApiResponse<BomVersion>> => {
    return apiClient.pdm.get<BomVersion>(`/bom-versions/${id}`);
  },
  createVersion: async (data: CreateBomVersionRequest): Promise<ApiResponse<BomVersion>> => {
    return apiClient.pdm.post<BomVersion>('/bom-versions', data);
  },
  updateVersion: async (
    id: string,
    data: Partial<CreateBomVersionRequest>
  ): Promise<ApiResponse<BomVersion>> => {
    return apiClient.pdm.put<BomVersion>(`/bom-versions/${id}`, data);
  },
  deleteVersion: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.pdm.delete<boolean>(`/bom-versions/${id}`);
  },
  activateVersion: async (id: string): Promise<ApiResponse<BomVersion>> => {
    return apiClient.pdm.post<BomVersion>(`/bom-versions/${id}/activate`, {});
  },
  archiveVersion: async (id: string): Promise<ApiResponse<BomVersion>> => {
    return apiClient.pdm.post<BomVersion>(`/bom-versions/${id}/archive`, {});
  },

  // BOM Items
  listItems: async (bomVersionId?: string): Promise<ApiResponse<BomItem[]>> => {
    const params = bomVersionId ? `?bom_version_id=${bomVersionId}` : '';
    return apiClient.pdm.get<BomItem[]>(`/bom-items${params}`);
  },
  getItem: async (id: string): Promise<ApiResponse<BomItem>> => {
    return apiClient.pdm.get<BomItem>(`/bom-items/${id}`);
  },
  createItem: async (data: CreateBomItemRequest): Promise<ApiResponse<BomItem>> => {
    return apiClient.pdm.post<BomItem>('/bom-items', data);
  },
  updateItem: async (
    id: string,
    data: Partial<CreateBomItemRequest>
  ): Promise<ApiResponse<BomItem>> => {
    return apiClient.pdm.put<BomItem>(`/bom-items/${id}`, data);
  },
  deleteItem: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.pdm.delete<boolean>(`/bom-items/${id}`);
  },
  batchCreateItems: async (
    bomVersionId: string,
    items: CreateBomItemRequest[]
  ): Promise<ApiResponse<BomItem[]>> => {
    return apiClient.pdm.post<BomItem[]>(`/bom-versions/${bomVersionId}/items/batch`, {
      items,
    });
  },

  // BOM Comparison
  compareVersions: async (
    bomVersionAId: string,
    bomVersionBId: string
  ): Promise<ApiResponse<BomComparison>> => {
    return apiClient.pdm.post<BomComparison>('/bom-compare', {
      bom_version_a_id: bomVersionAId,
      bom_version_b_id: bomVersionBId,
    });
  },
  getComparison: async (id: string): Promise<ApiResponse<BomComparison>> => {
    return apiClient.pdm.get<BomComparison>(`/bom-compare/${id}`);
  },
  listComparisons: async (): Promise<ApiResponse<BomComparison[]>> => {
    return apiClient.pdm.get<BomComparison[]>('/bom-compare');
  },
};
